#!/usr/bin/env node

/**
 * Hazard-style Combat CLI — agentic playthrough driver.
 *
 * Reachable as a SUBCOMMAND of the game CLI:
 *
 *   npm run game -- combat [flags]
 *   npm run combat -- [flags]          (convenience alias, new combat)
 *
 * COMBAT ROUTES:
 *   `npm run combat`        → this CLI, Hazard-style card/dice engine
 *   `npm run combat-sim`    → Monte-Carlo balance witness (not player-facing)
 *
 * Combat flags:
 *   --enemy <slug>       enemy from the registry (default float-eye)
 *   --preset <id>        character preset id (default apprentice)
 *   --seed <n>           deterministic RNG seed
 *   --auto               run a bot policy (no TTY required)
 *   --policy naive|safe|aggressive|status
 *                        bot policy for --auto (default status)
 *   --max-turns <n>      stop auto play after this many phases (default 8)
 *   --stage <id>         playtest stage profile (early|mid|late);
 *                        builds the stage player when no explicit --preset is
 *                        given, and defaults the enemy to the stage's roster when no
 *                        explicit --enemy is given (seed-deterministic pick)
 *   --deck <selection>   grey | cards:a,b,c
 *   --script <path>      JSON answer array (shared io.ts layer). Play steps
 *                        answer the card prompt as `top:<uid>` or `bot:<uid>`;
 *                        a chosen-X card (WS7.2 `recoil_x`) takes an optional
 *                        X argument: `bot:<uid>:<X>` (engine-clamped to
 *                        [min, affordable])
 *   --stdin              JSONL answers (shared io.ts layer)
 *   --json-events        machine-clean stdout event stream; --auto runs emit
 *                        the full per-play transcript (turnStart /
 *                        signature / card / turnEnd / resolvedPhase / mercy)
 *   --state-log <path>   JSONL state mutation log
 *
 * Logic stays in the engine modules. This file only parses flags, prompts,
 * dispatches engine verbs, and formats output.
 */

import {
    prompt, emit, log, logState,
    setIoMode, setOutputMode, setStateLogPath, attachCliLogSinks,
} from './io';
import {
    initializeCombatEncounter,
    rollEncounterDice,
    startTurn,
    endTurn,
    playCombatCard,
    playSignatureSkill,
    resolveThreatPhase,
    handCards,
    firstLegalPoweringDie,
    buildCombatSummary,
    getSignatureSkill, signatureCastBlock,
} from '../Combat/combat.engine';
import type {
    CombatEncounterState,
    CombatOutcome,
} from '../Combat/combat.encounter.types';
import { ENEMY_REGISTRY } from '../Enemy/enemy.library';
import type { EnemySlug } from '../Enemy/enemy.library';
import { getPresetById, buildCharacterFromPreset } from '../Character';
import type { Character } from '../Character/types';
import type { Enemy } from '../Enemy/types';
import {
    COMBAT_STAGE_ORDER, buildStagePlayer, getStageProfile, isCombatStageId,
} from '../Combat/combat.stage-profiles';
import type { CombatStageId } from '../Combat/combat.stage-profiles';
import { grantDeckKnowledge, parseDeckSelectionArg, resolveDeckSelection } from '../Combat/combat.playtest';

// ── Types ────────────────────────────────────────────────────────────────────

export type CombatAutoPolicyId = 'naive' | 'safe' | 'aggressive' | 'status';

export interface CombatCliFlags {
    enemySlug: string;
    /** True when --enemy was passed explicitly (a --stage roster enemy only
     *  replaces the default when the enemy was NOT asked for). */
    enemyExplicit: boolean;
    presetId: string;
    /** True when --preset was passed explicitly (a --stage player only
     *  replaces the preset player when the preset was NOT asked for). */
    presetExplicit: boolean;
    seed?: number;
    auto: boolean;
    policy: CombatAutoPolicyId;
    maxTurns: number;
    /** Playtest stage profile id (--stage). */
    stage?: CombatStageId;
    /** Raw --deck selection string (parsed by `parseDeckSelectionArg`). */
    deck?: string;
    scriptPath?: string;
    stdin: boolean;
    jsonEvents: boolean;
    stateLogPath?: string;
    /** AXM Log flags (docs/logging.md), wired via `attachCliLogSinks`. */
    logLevel?: string;
    logFile?: string;
}


export interface RunHazardCombatCliOptions {
    enemy: Enemy;
    player?: Character;
    presetId?: string;
    seed?: number;
    auto?: boolean;
    policy?: CombatAutoPolicyId;
    maxTurns?: number;
    /** Explicit deck (card ids) threaded into `initializeCombatEncounter`;
     *  default: the engine builds one from the player's known cards. */
    deck?: readonly string[];
    /** Playtest stage: builds the stage player when no `player` is given. */
    stage?: CombatStageId;
}

export interface RunHazardCombatCliResult {
    state: CombatEncounterState;
    outcome: CombatOutcome | null;
    summary: ReturnType<typeof buildCombatSummary>;
}

// ── Argv parsers ─────────────────────────────────────────────────────────────

const AUTO_POLICIES: readonly CombatAutoPolicyId[] = ['naive', 'safe', 'aggressive', 'status'];

const COMBAT_USAGE =
    'Usage: npm run combat -- ' +
    '[--enemy <slug>] [--preset <id>] [--seed <n>] ' +
    '[--auto] [--policy naive|safe|aggressive|status] [--max-turns <n>] ' +
    '[--stage early|mid|late] ' +
    '[--deck grey|cards:a,b,c] ' +
    '[--script <path>] [--stdin] [--json-events] [--state-log <path>] ' +
    '[--log-level <trace|debug|info|warn|error>] [--log-file <path>]';

function takeValue(args: string[], i: number, flag: string): [string, number] {
    const arg = args[i]!;
    const eq = `${flag}=`;
    if (arg.startsWith(eq)) return [arg.slice(eq.length), i + 1];
    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
        throw new Error(`${flag} requires a value argument.\n${COMBAT_USAGE}`);
    }
    return [next, i + 2];
}

export function parseCombatArgv(args: string[]): CombatCliFlags {
    const flags: CombatCliFlags = {
        enemySlug: 'float-eye',
        enemyExplicit: false,
        presetId: 'apprentice',
        presetExplicit: false,
        auto: false,
        policy: 'status',
        maxTurns: 8,
        stdin: false,
        jsonEvents: false,
    };
    let i = 0;
    while (i < args.length) {
        const arg = args[i]!;
        if (arg === '--auto') { flags.auto = true; i++; }
        else if (arg === '--json-events') { flags.jsonEvents = true; i++; }
        else if (arg === '--stdin') { flags.stdin = true; i++; }
        else if (arg.startsWith('--enemy')) {
            const [v, ni] = takeValue(args, i, '--enemy');
            flags.enemySlug = v; flags.enemyExplicit = true; i = ni;
        } else if (arg.startsWith('--preset')) {
            const [v, ni] = takeValue(args, i, '--preset');
            flags.presetId = v; flags.presetExplicit = true; i = ni;
        } else if (arg.startsWith('--seed')) {
            const [v, ni] = takeValue(args, i, '--seed');
            const n = Number(v);
            if (isNaN(n)) throw new Error(`--seed must be a number.\n${COMBAT_USAGE}`);
            flags.seed = n; i = ni;
        } else if (arg.startsWith('--policy')) {
            const [v, ni] = takeValue(args, i, '--policy');
            if (!(AUTO_POLICIES as readonly string[]).includes(v)) {
                throw new Error(`--policy must be one of: ${AUTO_POLICIES.join('|')}.\n${COMBAT_USAGE}`);
            }
            flags.policy = v as CombatAutoPolicyId; i = ni;
        } else if (arg.startsWith('--max-turns')) {
            const [v, ni] = takeValue(args, i, '--max-turns');
            const n = Number(v);
            if (isNaN(n) || n < 1) throw new Error(`--max-turns must be a positive integer.\n${COMBAT_USAGE}`);
            flags.maxTurns = n; i = ni;
        } else if (arg.startsWith('--script')) {
            const [v, ni] = takeValue(args, i, '--script'); flags.scriptPath = v; i = ni;
        } else if (arg.startsWith('--state-log')) {
            const [v, ni] = takeValue(args, i, '--state-log'); flags.stateLogPath = v; i = ni;
        } else if (arg.startsWith('--log-level')) {
            const [v, ni] = takeValue(args, i, '--log-level'); flags.logLevel = v; i = ni;
        } else if (arg.startsWith('--log-file')) {
            const [v, ni] = takeValue(args, i, '--log-file'); flags.logFile = v; i = ni;
        } else if (arg.startsWith('--stage')) {
            const [v, ni] = takeValue(args, i, '--stage');
            if (!isCombatStageId(v)) {
                throw new Error(`--stage must be one of: ${COMBAT_STAGE_ORDER.join('|')}.\n${COMBAT_USAGE}`);
            }
            flags.stage = v; i = ni;
        } else if (arg.startsWith('--deck')) {
            const [v, ni] = takeValue(args, i, '--deck'); flags.deck = v; i = ni;
        } else {
            throw new Error(`Unknown combat CLI flag: '${arg}'.\n${COMBAT_USAGE}`);
        }
    }
    return flags;
}

// ── Auto-policy helper (reuses combat.encounter.sim logic + extends for CLI) ─

/** The hand (retreat excluded) ranked by the auto policy, best first. */
function rankedAutoCards(s: CombatEncounterState, policy: CombatAutoPolicyId) {
    const cards = handCards(s).filter(c => c.card.verbClass !== 'retreat');
    const activeIds = new Set(s.enemy.effects.map(e => e.effectId));

    return cards.sort((a, b) => {
        switch (policy) {
            case 'status': {
                const af = a.card.effectKind !== 'none' && !activeIds.has(a.card.primaryEffectId ?? '') ? 0 : a.card.effectKind !== 'none' ? 1 : 2;
                const bf = b.card.effectKind !== 'none' && !activeIds.has(b.card.primaryEffectId ?? '') ? 0 : b.card.effectKind !== 'none' ? 1 : 2;
                if (af !== bf) return af - bf;
                return b.card.bottomDamagePreview - a.card.bottomDamagePreview;
            }
            case 'aggressive':
                return b.card.bottomDamagePreview - a.card.bottomDamagePreview;
            case 'safe': {
                const at = a.card.verbClass === 'defend' || a.card.verbClass === 'buff-self' ? 0 : 1;
                const bt = b.card.verbClass === 'defend' || b.card.verbClass === 'buff-self' ? 0 : 1;
                if (at !== bt) return at - bt;
                return a.card.bottomDamagePreview - b.card.bottomDamagePreview;
            }
            default:
                return 0;
        }
    });
}


/**
 * Runs one full phase in auto mode under the ROUND-TURN LAW: ONE tray roll
 * per phase. No draft: each paid play
 * takes the policy's best-ranked card that some live die can LEGALLY power
 * (`firstLegalPoweringDie`: a colour-legal tray die, then Reserve, then
 * floating), until no card can be powered; then the leftover hand drains
 * through the FREE tops and the turn ends. The safety counter is kept but
 * never binds on legal play.
 *
 * Every engine verb `emit`s its events: auto mode
 * carries the same per-play transcript the interactive loop does, so a
 * `--json-events` run is an honest turn-by-turn audit record — no bespoke
 * harness needed.
 */
function autoPlayPhase(
    state: CombatEncounterState,
    policy: CombatAutoPolicyId,
    phaseTurnLimit: number,
): CombatEncounterState {
    let s = state;
    let safety = 0;

    // The ONE legal tray roll for this phase.
    if (s.dice.length === 0 && !s.turnTakenThisPhase) {
        const turned = startTurn(s);
        s = turned.state;
        emit({
            type: 'hazardCombat:turnStart',
            payload: { turn: s.turn, dice: s.dice.map(d => `${d.id}[${d.color}${d.face ? `:${d.face}` : ''}]`), events: turned.events },
        });
        if (s.phase !== 'phase-play') return s;
    }

    // Paid plays: each one spends one live die on a colour-legal card.
    while (s.phase === 'phase-play' && !s.finalOutcome && safety < phaseTurnLimit * 6) {
        safety++;

        const current = s;
        const pick = rankedAutoCards(current, policy)
            .map(c => ({ ...c, die: firstLegalPoweringDie(current, c.card) }))
            .find(c => c.die !== null);
        if (!pick || !pick.die) break;

        const res = playCombatCard(s, { uid: pick.uid }, true, pick.die.id);
        if (res.events.some(e => e.kind === 'effect-fizzled')) {
            // Fizzled — drain via free top.
            const free = playCombatCard(s, { uid: pick.uid }, false);
            s = free.state;
            emit({
                type: 'hazardCombat:card',
                payload: { uid: pick.uid, cardId: pick.card.id, useBottom: false, events: free.events },
            });
            continue;
        }
        s = res.state;
        emit({
            type: 'hazardCombat:card',
            payload: { uid: pick.uid, cardId: pick.card.id, useBottom: true, dieId: pick.die.id, events: res.events },
        });
    }

    // Wind-down: drain the leftover hand via the FREE tops, then end the turn.
    let drain = 0;
    while (s.phase === 'phase-play' && !s.finalOutcome && drain < 30) {
        drain++;
        const topCard = handCards(s).find(c => c.card.verbClass !== 'retreat');
        if (!topCard) break;
        const free = playCombatCard(s, { uid: topCard.uid }, false);
        s = free.state;
        emit({
            type: 'hazardCombat:card',
            payload: { uid: topCard.uid, cardId: topCard.card.id, useBottom: false, events: free.events },
        });
    }
    if (s.phase === 'phase-play' && !s.finalOutcome && s.turnTakenThisPhase) {
        const ended = endTurn(s);
        s = ended.state;
        emit({ type: 'hazardCombat:turnEnd', payload: { events: ended.events } });
    }

    return s;
}

// ── New Hazard-style combat loop (interactive) ───────────────────────────────

async function promptCardChoice(state: CombatEncounterState): Promise<{ uid: string; useBottom: boolean } | null> {
    const cards = handCards(state);
    if (cards.length === 0) return null;
    const choices = cards.flatMap(({ uid, card }) => {
        // A powered play costs exactly one live die of the card's
        // colour (gold = any); the CLI powers it with the first legal one.
        const die = firstLegalPoweringDie(state, card);
        const dieLabel = die ? `die ${die.id}` : 'no legal die';
        return [
            { name: `[top] ${card.name}  (${card.stance}, ${card.effectKind})`, value: `top:${uid}` },
            { name: `[bot] ${card.name}  (${dieLabel})  ${card.bottomActionText}`, value: `bot:${uid}` },
        ];
    });
    choices.push({ name: 'resolve phase (stop playing cards)', value: '__resolve__' });
    choices.push({ name: 'end turn', value: '__end__' });

    const { action } = await prompt<{ action: string }>([{
        type: 'rawlist', name: 'action', message: 'Play a card or resolve:', choices,
    }]);
    if (action === '__resolve__') return null;
    if (action === '__end__') return { uid: '__end__', useBottom: false };
    // Play-step grammar: `top:<uid>` | `bot:<uid>`.
    const [mode, uid] = action.split(':') as [string, string];
    return { uid, useBottom: mode === 'bot' };
}

async function promptSignatureChoice(state: CombatEncounterState): Promise<string | null> {
    const affordable = state.signatures
        .map(id => getSignatureSkill(id))
        .filter((s): s is NonNullable<ReturnType<typeof getSignatureSkill>> => s !== undefined && !signatureCastBlock(state, s));
    if (affordable.length === 0) return null;
    const { choice } = await prompt<{ choice: string }>([{
        type: 'rawlist', name: 'choice',
        message: `Use a Signature (${state.conviction} ◆)?`,
        choices: [
            ...affordable.map(s => ({ name: `${s.name} (${s.cost}◆) — ${s.description}`, value: s.id })),
            { name: 'skip', value: '__skip__' },
        ],
    }]);
    return choice === '__skip__' ? null : choice;
}

async function interactiveHazardCombatLoop(
    initial: CombatEncounterState,
    flags: CombatCliFlags,
): Promise<CombatEncounterState> {
    let s = rollEncounterDice(initial).state;
    let phaseCount = 0;

    while (s.phase !== 'complete' && !s.finalOutcome && phaseCount < flags.maxTurns) {
        phaseCount++;
        const phase = s.threatPhases[Math.min(s.currentPhaseIndex, s.threatPhases.length - 1)];
        log(`\n── Phase ${phaseCount} (round ${s.round}) ──`);
        log(`  Enemy: ${s.enemy.name}  HP ${s.enemy.health}/${s.enemy.maxHealth}`);
        log(`  Player HP ${s.player.health}/${s.player.maxHealth}  Conviction ${s.conviction}◆`);
        log(`  Enemy intent: ${phase?.intentType ?? 'unknown'}  guard: ${s.guard ?? 0}`);
        log(`  Threat: ${phase?.threatAction.description ?? '?'}`);
        const momentum = s.momentumV2 ? `${s.momentumV2.color} x${s.momentumV2.length}` : '—';
        log(`  Momentum: ${momentum}`);

        const before = s;

        // Start turn: roll dice — but only when this phase's ONE legal tray
        // roll hasn't happened yet (rollEncounterDice already rolled the first phase's;
        // an unguarded startTurn would log a false 'turn-law-blocked' event).
        if (s.dice.length === 0 && !s.turnTakenThisPhase) {
            const turned = startTurn(s);
            s = turned.state;
            logState('hazardCombat:start', before, s, { turn: s.turn, dice: s.dice.map(d => `${d.id}[${d.color}]`) });
        }
        log(`  Dice: ${s.dice.map(d => `${d.id}[${d.color}${d.face ? `:${d.face}` : ''}${d.state === 'available' ? '' : ` ${d.state}`}]`).join('  ') || '—'}`);

        // Signature opportunity (before cards).
        const sigId = await promptSignatureChoice(s);
        if (sigId) {
            const beforeSig = s;
            const cast = playSignatureSkill(s, sigId);
            s = cast.state;
            logState('hazardCombat:signature', beforeSig, s, { signatureId: sigId });
        }

        // Card play loop.
        let keepPlaying = true;
        while (keepPlaying && s.phase === 'phase-play' && !s.finalOutcome) {
            const cardChoice = await promptCardChoice(s);
            if (!cardChoice) { keepPlaying = false; break; }
            if (cardChoice.uid === '__end__') { s = endTurn(s).state; break; }

            const beforeCard = s;
            const chosen = handCards(s).find(h => h.uid === cardChoice.uid);
            const dieId = cardChoice.useBottom && chosen
                ? firstLegalPoweringDie(s, chosen.card)?.id
                : undefined;
            const res = playCombatCard(s, { uid: cardChoice.uid }, cardChoice.useBottom, dieId);
            s = res.state;
            logState('hazardCombat:playCard', beforeCard, s, {
                uid: cardChoice.uid, useBottom: cardChoice.useBottom,
                events: res.events.map(e => e.kind),
            });
            emit({ type: 'hazardCombat:card', payload: { events: res.events } });

            if (s.finalOutcome) break;
        }

        if (s.finalOutcome) break;

        // Resolve threat phase + between-phases.
        const beforeResolve = s;
        const resolved = resolveThreatPhase(s);
        s = resolved.state;
        logState('hazardCombat:resolveThreat', beforeResolve, s, {
            phaseIndex: s.currentPhaseIndex,
            events: resolved.events.map(e => e.kind),
        });
        emit({ type: 'hazardCombat:resolvedPhase', payload: { events: resolved.events } });
        log(`  After phase: player HP ${s.player.health}/${s.player.maxHealth}  enemy HP ${s.enemy.health}/${s.enemy.maxHealth}`);
    }

    return s;
}

async function autoHazardCombatLoop(
    initial: CombatEncounterState,
    flags: CombatCliFlags,
): Promise<CombatEncounterState> {
    let s = rollEncounterDice(initial).state;
    logState('hazardCombat:start', null, s, { auto: true, policy: flags.policy, seed: flags.seed });
    emit({ type: 'hazardCombat:start', payload: { enemy: s.enemy.name, preset: flags.presetId, policy: flags.policy } });

    let phaseCount = 0;
    while (s.phase !== 'complete' && !s.finalOutcome && phaseCount < flags.maxTurns) {
        phaseCount++;
        const before = s;

        s = autoPlayPhase(s, flags.policy, flags.maxTurns);
        logState('hazardCombat:autoPhase', before, s, { phaseCount, policy: flags.policy });
        // A per-phase boundary marker with
        // an HP snapshot, alongside the per-play transcript above, so an
        // auditor can see phase-level progress without diffing play events.
        emit({
            type: 'hazardCombat:autoPhase',
            payload: { phaseCount, enemyHealth: s.enemy.health, playerHealth: s.player.health },
        });

        if (s.finalOutcome) break;
        if (s.phase === 'phase-play') {
            const beforeResolve = s;
            const resolved = resolveThreatPhase(s);
            s = resolved.state;
            logState('hazardCombat:resolveThreat', beforeResolve, s, { phaseCount });
            emit({ type: 'hazardCombat:resolvedPhase', payload: { events: resolved.events } });
        }
    }
    return s;
}

// ── Main entry points ─────────────────────────────────────────────────────────

/**
 * Run a Hazard-Pattern combat encounter from an already-resolved enemy.
 * This is the reusable map/mobile handoff surface; `runCombatCli` is only an
 * argv wrapper around it.
 */
export async function runHazardCombatCliEncounter(
    options: RunHazardCombatCliOptions,
): Promise<RunHazardCombatCliResult> {
    const presetId = options.presetId ?? 'apprentice';
    const preset = getPresetById(presetId);
    const stageProfile = options.stage !== undefined ? getStageProfile(options.stage) : undefined;
    if (options.stage !== undefined && !stageProfile) {
        throw new Error(`Unknown combat stage: '${options.stage}'. Valid: ${COMBAT_STAGE_ORDER.join(', ')}`);
    }
    if (!preset && !options.player && !stageProfile) {
        throw new Error(`Unknown preset: '${presetId}'. Try: apprentice, wanderer, sage`);
    }
    // Player precedence: explicit player > stage player > preset player.
    let player = options.player
        ?? (stageProfile ? buildStagePlayer(stageProfile) : buildCharacterFromPreset(preset!));
    if (options.deck && options.deck.length > 0) {
        // The engine refuses to fire cards outside knownCards; an explicit
        // deck may reach beyond the player's learned pool. Grant on a copy so
        // a caller-supplied player is never mutated.
        player = { ...player, knownCards: [...player.knownCards] };
        grantDeckKnowledge(player, options.deck);
    }
    const playerLabel = options.player ? presetId
        : stageProfile ? `stage:${stageProfile.id}` : presetId;
    const flags: CombatCliFlags = {
        enemySlug: '',
        enemyExplicit: true, // the caller resolved the enemy already
        presetId,
        presetExplicit: options.presetId !== undefined,
        auto: options.auto ?? false,
        seed: options.seed,
        policy: options.policy ?? 'status',
        maxTurns: options.maxTurns ?? 8,
        stage: options.stage,
        stdin: false,
        jsonEvents: false,
    };

    log(`\nHazard-style Combat — new engine (Phase 165)`);
    log(`Player: ${player.name} (${playerLabel})  HP ${player.health}/${player.maxHealth}`);
    log(`Enemy:  ${options.enemy.name}  HP ${options.enemy.maxHealth}`);
    if (options.deck) log(`Deck:   ${options.deck.length} cards (explicit --deck)`);
    log(`Policy: ${flags.auto ? flags.policy : 'interactive'}  Seed: ${flags.seed ?? 'random'}\n`);

    const enc = initializeCombatEncounter(
        player, options.enemy,
        options.deck && options.deck.length > 0 ? [...options.deck] : undefined,
        flags.seed,
    );
    const final = flags.auto
        ? await autoHazardCombatLoop(enc, flags)
        : await interactiveHazardCombatLoop(enc, flags);

    const summary = buildCombatSummary(final);
    const outcomeLabel: Record<CombatOutcome, string> = {
        victory: 'Victory',
        defeat: 'Defeat',
        retreat: 'Retreated',
    };
    const label = final.finalOutcome ? outcomeLabel[final.finalOutcome] : 'In progress';

    logState('hazardCombat:end', null, final, { summary, outcome: final.finalOutcome });
    emit({ type: 'hazardCombat:end', payload: { outcome: final.finalOutcome, summary } });

    log(`\nOutcome: ${label}`);
    log(`  Player HP: ${final.player.health}/${final.player.maxHealth}`);
    log(`  Enemy HP:  ${final.enemy.health}/${final.enemy.maxHealth}`);
    log(`  Phases:    ${final.phaseResults.length}`);
    log(`  Conviction left: ${final.conviction}◆`);
    if (summary) {
        log(`  DoT damage:      ${summary.totalDotDamage}`);
        log(`  Direct damage:   ${summary.directDamage}`);
        log(`  Best card:       ${summary.bestCard || '(none)'}`);
        log('  Per-card attribution:');
        for (const row of summary.rows) {
            log(`    ${row.name}: ${row.damageDealt} dmg (${row.dotDamage} DoT) over ${row.phases} phases`);
        }
    }

    return { state: final, outcome: final.finalOutcome ?? null, summary };
}

/** Run the new Hazard-style combat CLI. */
export async function runCombatCli(rawArgs: string[]): Promise<void> {
    const flags = parseCombatArgv(rawArgs);

    if (flags.jsonEvents) setOutputMode('json');
    if (flags.scriptPath) {
        const fs = await import('fs');
        const raw = fs.readFileSync(flags.scriptPath, 'utf-8');
        const answers = JSON.parse(raw);
        if (!Array.isArray(answers)) throw new Error('--script JSON must be a top-level array.');
        setIoMode({ kind: 'script', answers });
    } else if (flags.stdin) {
        setIoMode({ kind: 'stdin' });
    }
    if (flags.stateLogPath) setStateLogPath(flags.stateLogPath);
    attachCliLogSinks(flags);

    // --stage without --enemy fights the STAGE'S roster, not the default
    // float-eye (a stage-scaled player against a 40-HP early enemy is a
    // stomp that reads as engagement). Seeded runs
    // pick deterministically from the roster; unseeded runs pick at random.
    if (flags.stage !== undefined && !flags.enemyExplicit) {
        const roster = getStageProfile(flags.stage)!.enemySlugs;
        const idx = flags.seed !== undefined
            ? Math.abs(Math.trunc(flags.seed)) % roster.length
            : Math.floor(Math.random() * roster.length);
        flags.enemySlug = roster[idx]!;
    }

    const enemyDef = ENEMY_REGISTRY[flags.enemySlug as EnemySlug];
    if (!enemyDef) {
        const valid = Object.keys(ENEMY_REGISTRY).join(', ');
        throw new Error(`Unknown enemy slug: '${flags.enemySlug}'. Valid: ${valid}`);
    }

    let deck: string[] | undefined;
    if (flags.deck !== undefined) {
        deck = resolveDeckSelection(parseDeckSelectionArg(flags.deck));
    }

    await runHazardCombatCliEncounter({
        enemy: enemyDef,
        presetId: flags.presetId,
        seed: flags.seed,
        auto: flags.auto || flags.scriptPath !== undefined || flags.stdin,
        policy: flags.policy,
        maxTurns: flags.maxTurns,
        deck,
        // A stage player only replaces the preset player when --preset was not
        // asked for explicitly.
        stage: flags.presetExplicit ? undefined : flags.stage,
    });
}
