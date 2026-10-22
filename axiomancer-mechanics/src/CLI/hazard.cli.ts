#!/usr/bin/env node

/**
 * Hazard Minigame CLI — standalone driver for the hazard mini-game (v2).
 *
 * Reachable as a SUBCOMMAND of the game CLI:
 *
 *   npm run game -- hazard [flags]
 *   npm run hazard -- [flags]            (convenience alias)
 *
 * It reuses the shared `io.ts` layer (tty inquirer / `--script` JSON /
 * `--stdin`, plus `--json-events` and `--state-log`) so a person, a replay
 * file, or an agent can all drive it through the same surface as game.cli.ts.
 *
 *   • `--hazard <id>`   pick a hazard (`cracked-cliff`…); prompts from the
 *                       library when omitted.
 *   • `--route top|bottom`  top = safe route, bottom = risk route.
 *   • `--auto`          a greedy heuristic stages/powers cards each round;
 *                       otherwise the player drives the round by hand.
 *   • `--seed <n|str>`  seeds the engine's embedded RNG so a run is fully
 *                       reproducible.
 *   • `--runs <n>`      play N hazards back-to-back (default 5).
 *
 * The v2 engine is a pure, self-seeded state machine: every transition takes a
 * session and returns a NEW session, returning the SAME reference when the
 * action is illegal. The CLI exploits that — a no-op return is logged as an
 * `illegalHazardAction` with a full state snapshot. Logic stays in the engine;
 * this file only parses flags, prompts, dispatches engine verbs, and formats.
 */

import {
    prompt, emit, log, logState,
    setIoMode, setOutputMode, setStateLogPath,
} from './io';
import {
    createHazardSession,
    selectHazardRoute,
    finishHazardRolling,
    stageHazardCard,
    powerHazardCard,
    discardHazardCard,
    resolveHazardRound,
    continueHazardAfterResolve,
    acknowledgeHazardOutcome,
    claimHazardRewards,
    hazardCardValue,
    hazardProjectedProgress,
    getHazardCardDef,
    getHazardDef,
    hazardStarterBag,
    hazardLiveDeck,
    HAZARD_LIBRARY,
} from '../World/Hazard';
import type {
    HazardDef,
    HazardRouteKey,
    HazardSessionState,
} from '../World/Hazard';
import { minigameRunSeed } from '../World/seed';

// ─── Flags ──────────────────────────────────────────────────────────────────

export interface HazardCliFlags {
    hazardId?: string;
    route?: 'top' | 'bottom';
    auto: boolean;
    seed?: string;
    runs: number;
    /** Card ids appended to the starter bag (the "acquired" deck). */
    deck?: string[];
    /** Path to a JSON array of card ids that REPLACES the whole draw bag. */
    bagFile?: string;
    // Shared io flags (parity with game.cli.ts).
    scriptPath?: string;
    stdin: boolean;
    jsonEvents: boolean;
    stateLogPath?: string;
}

const USAGE =
    'Usage: npm run game -- hazard ' +
    '[--hazard <id>] [--route top|bottom] [--auto] [--seed <n>] [--runs <n>] ' +
    '[--deck <id,id,...>] [--bag-file <path>] ' +
    '[--script <path>] [--stdin] [--json-events] [--state-log <path>]';

/**
 * Every card id a live hazard run may hold — the validation allow-list.
 * Excludes the puzzle-only cost cards (`hazardLiveDeck`): this CLI only ever
 * stages a real `createHazardSession` run, so `--deck`/`--bag-file` must not
 * be able to smuggle a puzzle-only card into one.
 */
const KNOWN_CARD_IDS: ReadonlySet<string> = new Set(hazardLiveDeck().map((c) => c.id));

/** Throws on any id not in the live deck, naming the offender and source. */
function validateCardIds(ids: readonly string[], source: string): void {
    for (const id of ids) {
        if (!KNOWN_CARD_IDS.has(id)) {
            throw new Error(
                `Unknown hazard card id '${id}' in ${source}. ` +
                `Known ids: ${hazardLiveDeck().map((c) => c.id).join(', ')}.`,
            );
        }
    }
}

/**
 * Builds the hazard draw bag for a run:
 *   - `--bag-file` ids, when present, REPLACE the whole bag (a pinned bag for
 *     deterministic harness A/B);
 *   - otherwise the starter bag, with `--deck` ids appended as the "acquired"
 *     deck (mirrors `appendAcquiredCard` / `hazardDeckBag`).
 * Ids are assumed pre-validated against the live deck (`hazardLiveDeck`).
 */
export function composeHazardBag(deck?: readonly string[], bagFileIds?: readonly string[]): string[] {
    if (bagFileIds && bagFileIds.length > 0) return [...bagFileIds];
    return [...hazardStarterBag(), ...(deck ?? [])];
}

/** Pull `--flag value` or `--flag=value`; returns [value, nextIndex]. */
function takeValue(args: string[], i: number, flag: string): [string, number] {
    const arg = args[i]!;
    const eq = `${flag}=`;
    if (arg.startsWith(eq)) return [arg.slice(eq.length), i + 1];
    const next = args[i + 1];
    if (next === undefined || next.startsWith('--')) {
        throw new Error(`${flag} requires a value argument.\n${USAGE}`);
    }
    return [next, i + 2];
}

export function parseHazardArgv(args: string[]): HazardCliFlags {
    const flags: HazardCliFlags = { auto: false, runs: 5, stdin: false, jsonEvents: false };
    let i = 0;
    while (i < args.length) {
        const arg = args[i]!;
        const base = arg.split('=', 1)[0]!;
        switch (base) {
            case '--auto':         flags.auto = true; i++; break;
            case '--stdin':        flags.stdin = true; i++; break;
            case '--json-events':  flags.jsonEvents = true; i++; break;
            case '--hazard':       [flags.hazardId, i] = takeValue(args, i, '--hazard'); break;
            case '--seed':         [flags.seed, i] = takeValue(args, i, '--seed'); break;
            case '--script':       [flags.scriptPath, i] = takeValue(args, i, '--script'); break;
            case '--state-log':    [flags.stateLogPath, i] = takeValue(args, i, '--state-log'); break;
            case '--bag-file':     [flags.bagFile, i] = takeValue(args, i, '--bag-file'); break;
            case '--deck': {
                let value: string;
                [value, i] = takeValue(args, i, '--deck');
                const ids = value.split(',').map((s) => s.trim()).filter(Boolean);
                if (ids.length === 0) {
                    throw new Error(`--deck needs at least one card id.\n${USAGE}`);
                }
                validateCardIds(ids, '--deck');
                flags.deck = ids;
                break;
            }
            case '--route': {
                let value: string;
                [value, i] = takeValue(args, i, '--route');
                if (value !== 'top' && value !== 'bottom') {
                    throw new Error(`--route must be 'top' or 'bottom', got '${value}'.\n${USAGE}`);
                }
                flags.route = value;
                break;
            }
            case '--runs': {
                let value: string;
                [value, i] = takeValue(args, i, '--runs');
                const n = Number(value);
                if (!Number.isInteger(n) || n < 1) {
                    throw new Error(`--runs must be a positive integer, got '${value}'.\n${USAGE}`);
                }
                flags.runs = n;
                break;
            }
            default:
                throw new Error(`Unknown hazard CLI flag: '${arg}'.\n${USAGE}`);
        }
    }
    return flags;
}

/** Derive a stable uint32 engine seed from the `--seed` flag (numeric or string). */
function seedToNumber(seed: string | undefined, runIndex: number): number {
    const seedInput = seed !== undefined && seed.trim() !== '' && Number.isFinite(Number(seed))
        ? Number(seed)
        : (seed ?? 0x9e3779b9);
    return minigameRunSeed(seedInput, runIndex);
}

// ─── Greedy auto policy (ported from the mobile balance sim) ──────────────────

interface RoundNeed {
    needF: number;
    needE: number;
    combined: boolean;
}

function roundNeed(s: HazardSessionState): RoundNeed {
    const def = getHazardDef(s.hazardId);
    if (s.route === 'risk') {
        const [needF, needE] = def.risk.thresholds[s.round - 1];
        return { needF, needE, combined: false };
    }
    return { needF: def.safe.thresholds[s.round - 1], needE: 0, combined: true };
}

function shortfall(s: HazardSessionState): number {
    const need = roundNeed(s);
    const p = hazardProjectedProgress(s);
    if (need.combined) return Math.max(0, need.needF - (p.force + p.escape));
    return Math.max(0, need.needF - p.force) + Math.max(0, need.needE - p.escape);
}

function freeValueToward(s: HazardSessionState, cardId: string): number {
    const def = getHazardCardDef(cardId);
    if (def.dead) return 0;
    const need = roundNeed(s);
    const p = hazardProjectedProgress(s);
    if (need.combined) return def.f + def.e;
    const fGap = Math.max(0, need.needF - p.force);
    const eGap = Math.max(0, need.needE - p.escape);
    return Math.min(def.f, fGap + 2) + Math.min(def.e, eGap + 2);
}

function autoPlayRound(s: HazardSessionState, bag: readonly string[]): HazardSessionState {
    // 1. Fire free draw utilities first — more options.
    for (const h of s.hand.slice()) {
        const def = getHazardCardDef(h.cardId);
        if (def.effect === 'draw') s = stageHazardCard(s, h.uid, bag);
    }
    // 2. Convert hex dice when present and we hold cards of that colour.
    const hexCount = s.dice.filter((d) => d.kind === 'hex' && d.state === 'available').length;
    if (hexCount > 0) {
        for (const h of s.hand.slice()) {
            const def = getHazardCardDef(h.cardId);
            if (def.effect === 'convert') {
                const holdsColour = s.hand.some((x) => {
                    const d = getHazardCardDef(x.cardId);
                    return !d.effect && !d.dead && d.kind === def.kind;
                });
                if (holdsColour) s = stageHazardCard(s, h.uid, bag);
            }
        }
    }
    // 3. Stage value cards, best contribution first (uncapped play area).
    let guard = 0;
    while (guard++ < 20) {
        const candidates = s.hand
            .map((h) => ({ h, v: freeValueToward(s, h.cardId) }))
            .filter((c) => c.v > 0)
            .sort((a, b) => b.v - a.v);
        if (candidates.length === 0) break;
        s = stageHazardCard(s, candidates[0].h.uid, bag);
    }
    // 4. Scrap dead weight for salvage.
    const anyHex = s.dice.some((d) => d.kind === 'hex');
    for (const h of s.hand.slice()) {
        const def = getHazardCardDef(h.cardId);
        const worthless = def.dead || (!def.effect && freeValueToward(s, h.cardId) === 0);
        const staleUtility = (def.effect === 'convert' && !anyHex) || def.effect === 'recast';
        if (worthless || staleUtility) s = discardHazardCard(s, h.uid);
    }
    // 5. Spend matching dice while still short. Best powered delta first.
    guard = 0;
    while (shortfall(s) > 0 && guard++ < 12) {
        const need = roundNeed(s);
        const p = hazardProjectedProgress(s);
        let best: { uid: string; dieId: string; delta: number } | null = null;
        for (const e of s.play) {
            if (e.dieId) continue;
            const def = getHazardCardDef(e.cardId);
            if (def.dead) continue;
            const die =
                s.dice.find((d) => d.kind === def.kind && d.state === 'available') ??
                s.dice.find((d) => d.kind === 'gold' && d.state === 'available');
            if (!die) continue;
            const free = hazardCardValue(e);
            const powered = { force: def.fp ?? def.f, escape: def.ep ?? def.e };
            let delta: number;
            if (need.combined) {
                delta = powered.force + powered.escape - (free.force + free.escape);
            } else {
                const fGap = Math.max(0, need.needF - p.force);
                const eGap = Math.max(0, need.needE - p.escape);
                delta =
                    Math.min(powered.force - free.force, fGap) +
                    Math.min(powered.escape - free.escape, eGap);
            }
            if (delta > 0 && (!best || delta > best.delta)) {
                best = { uid: e.uid, dieId: die.id, delta };
            }
        }
        if (!best) break;
        s = powerHazardCard(s, best.uid, best.dieId, bag);
    }
    // Stage at least one card so the engine can judge the round.
    if (s.play.length === 0 && s.hand.length > 0) {
        s = stageHazardCard(s, s.hand[0].uid, bag);
    }
    return s;
}

// ─── Manual round driver (script / stdin / tty) ───────────────────────────────

/** Applies a transition, logging an `illegalHazardAction` when it no-ops. */
function step(
    action: string,
    state: HazardSessionState,
    next: HazardSessionState,
    meta: Record<string, unknown>,
): HazardSessionState {
    if (next === state) {
        log(`  ⚠ illegal action skipped: ${action} — ${JSON.stringify(meta)}`);
        logState('illegalHazardAction', state, state, { attempted: { action, ...meta }, hazardState: state });
        return state;
    }
    logState(action, state, next, meta);
    return next;
}

async function manualPlayRound(state: HazardSessionState, bag: readonly string[]): Promise<HazardSessionState> {
    while (state.phase === 'playing') {
        const p = hazardProjectedProgress(state);
        const need = roundNeed(state);
        log(
            `\n  Round ${state.round}/${state.totalRounds} — ` +
            (need.combined
                ? `need combined ≥ ${need.needF}, have ${p.force + p.escape}.`
                : `need force ≥ ${need.needF} & escape ≥ ${need.needE}, have ${p.force}/${p.escape}.`),
        );
        const dice = state.dice.filter((d) => d.state === 'available').map((d) => d.kind).join(', ') || '(none)';
        log(`  Dice available: ${dice}`);

        const choices: Array<{ name: string; value: string }> = [];
        for (const h of state.hand) {
            const def = getHazardCardDef(h.cardId);
            choices.push({ name: `stage ${def.name} [${def.f}F/${def.e}E]`, value: `stage:${h.uid}` });
            choices.push({ name: `discard ${def.name}`, value: `discard:${h.uid}` });
        }
        for (const e of state.play) {
            if (e.dieId || e.applied) continue;
            for (const d of state.dice.filter((x) => x.state === 'available')) {
                const def = getHazardCardDef(e.cardId);
                choices.push({ name: `power ${def.name} with ${d.kind}`, value: `power:${e.uid}:${d.id}` });
            }
        }
        choices.push({ name: 'Resolve round', value: 'resolve' });

        const { pick } = await prompt<{ pick: string }>([{
            type: 'rawlist', name: 'pick', message: 'Action?', choices,
        }]);
        if (pick === 'resolve') return state;

        const [verb, a, b] = pick.split(':');
        if (verb === 'stage') {
            state = step('stageHazardCard', state, stageHazardCard(state, a!, bag), { uid: a });
        } else if (verb === 'discard') {
            state = step('discardHazardCard', state, discardHazardCard(state, a!), { uid: a });
        } else if (verb === 'power') {
            state = step('powerHazardCard', state, powerHazardCard(state, a!, b!, bag), { uid: a, dieId: b });
        }
    }
    return state;
}

// ─── A single encounter ───────────────────────────────────────────────────────

interface EncounterResult {
    hazardId: string;
    route: HazardRouteKey;
    marks: string;
    tier: string;
    wins: number;
}

async function pickHazard(flags: HazardCliFlags): Promise<HazardDef> {
    if (flags.hazardId) {
        const def = HAZARD_LIBRARY.find((h) => h.id === flags.hazardId);
        if (!def) {
            const known = HAZARD_LIBRARY.map((c) => c.id).join(', ');
            throw new Error(`Unknown hazard id '${flags.hazardId}'. Known: ${known}.`);
        }
        return def;
    }
    const { id } = await prompt<{ id: string }>([{
        type: 'rawlist', name: 'id', message: 'Which hazard?',
        choices: HAZARD_LIBRARY.map((c) => ({ name: `${c.id} — ${c.title} (${c.rounds} rounds)`, value: c.id })),
    }]);
    return getHazardDef(id);
}

async function pickRoute(def: HazardDef, flags: HazardCliFlags): Promise<HazardRouteKey> {
    if (flags.route) return flags.route === 'bottom' ? 'risk' : 'safe';
    const { route } = await prompt<{ route: 'top' | 'bottom' }>([{
        type: 'rawlist', name: 'route', message: 'Choose a route:',
        choices: [
            { name: `Top    — safe · combined [${def.safe.thresholds.join(', ')}]`, value: 'top' },
            { name: `Bottom — risk · [${def.risk.thresholds.map((t) => t.join('/')).join(', ')}]`, value: 'bottom' },
        ],
    }]);
    return route === 'bottom' ? 'risk' : 'safe';
}

async function playEncounter(flags: HazardCliFlags, bag: readonly string[], runIndex: number): Promise<EncounterResult> {
    const def = await pickHazard(flags);
    const route = await pickRoute(def, flags);
    const seed = seedToNumber(flags.seed, runIndex);

    log(`\n═══ Run ${runIndex} — ${def.id}: ${def.title} (${def.rounds} rounds, ${route}) ═══`);
    log(`  ${def.scenario}`);

    let state = createHazardSession(seed, bag, def.id);
    logState('createHazardSession', null, state, { hazardId: def.id, seed, runIndex });

    state = selectHazardRoute(state, route, bag);
    state = finishHazardRolling(state);
    logState('selectHazardRoute', null, state, { route, dice: state.dice.map((d) => d.kind) });

    while (state.phase === 'playing') {
        const before = state;
        state = flags.auto ? autoPlayRound(state, bag) : await manualPlayRound(state, bag);
        const resolved = resolveHazardRound(state, bag);
        if (resolved === state) {
            // Nothing was staged (and none could be) — bail to avoid a stall.
            log('  Nothing to resolve; ending encounter.');
            break;
        }
        const info = resolved.resolveInfo!;
        log(`  Round ${info.round} → ${info.cleared ? 'O' : 'X'} (F ${info.force} / E ${info.escape})`);
        logState('resolveHazardRound', before, resolved, info);
        state = continueHazardAfterResolve(resolved, bag);
    }

    let wins = state.marks.filter((m) => m === 'O').length;
    let tier = 'incomplete';
    if (state.phase === 'outcome' && state.outcome) {
        const outcome = state.outcome;
        tier = outcome.tier;
        wins = outcome.wins;
        state = acknowledgeHazardOutcome(state);
        const offer = outcome.offerCards;
        const pick = outcome.canSkip ? null : (offer[0]?.id ?? null);
        state = claimHazardRewards(state, pick);
        logState('claimHazardRewards', null, state, { tier, wins, picked: state.pickedRewardCardId });
    }

    const marks = state.marks.map((m) => (m === 'pending' ? '·' : m)).join('');
    const result: EncounterResult = { hazardId: def.id, route, marks, tier, wins };
    log(`  Result: [${marks}]  tier ${tier}  wins ${wins}  (route: ${route})`);
    emit({ type: 'hazard:complete', payload: result });
    return result;
}

// ─── Entry point ────────────────────────────────────────────────────────────────

export async function runHazardCli(argv: string[]): Promise<void> {
    const flags = parseHazardArgv(argv);

    if (flags.jsonEvents) setOutputMode('json');
    if (flags.scriptPath) {
        const fs = await import('fs');
        const answers = JSON.parse(fs.readFileSync(flags.scriptPath, 'utf-8'));
        if (!Array.isArray(answers)) {
            throw new Error('--script JSON must be a top-level array of answer objects.');
        }
        setIoMode({ kind: 'script', answers });
    } else if (flags.stdin) {
        setIoMode({ kind: 'stdin' });
    }
    if (flags.stateLogPath) setStateLogPath(flags.stateLogPath);

    let bagFileIds: string[] | undefined;
    if (flags.bagFile) {
        const fs = await import('fs');
        const parsed = JSON.parse(fs.readFileSync(flags.bagFile, 'utf-8'));
        if (!Array.isArray(parsed) || parsed.some((x) => typeof x !== 'string')) {
            throw new Error('--bag-file JSON must be a top-level array of card-id strings.');
        }
        validateCardIds(parsed, `--bag-file ${flags.bagFile}`);
        bagFileIds = parsed;
    }
    const bag = composeHazardBag(flags.deck, bagFileIds);

    log('Miserere Mei, Deus — hazard mini-game (v2).');
    log(`Mode: ${flags.auto ? 'auto' : 'manual'}  ·  runs: ${flags.runs}` +
        (flags.seed !== undefined ? `  ·  seed: ${flags.seed}` : '') +
        (flags.bagFile ? `  ·  bag-file (${bag.length} cards)` : flags.deck ? `  ·  +deck [${flags.deck.join(', ')}]` : ''));

    const results: EncounterResult[] = [];
    for (let run = 1; run <= flags.runs; run++) {
        results.push(await playEncounter(flags, bag, run));
    }

    const totalWins = results.reduce((sum, r) => sum + r.wins, 0);
    const cleared = results.filter((r) => r.tier === 'perfect' || r.tier === 'complete').length;
    log('\n═══ Summary ═══');
    for (const r of results) {
        log(`  ${r.hazardId} (${r.route}): [${r.marks}] → ${r.tier} (${r.wins} wins)`);
    }
    log(`  ${cleared}/${results.length} encounters cleared at least one round · total wins ${totalWins}`);
    emit({ type: 'hazard:summary', payload: { results, totalWins, cleared } });
}

// Allow direct execution: `ts-node src/CLI/hazard.cli.ts [flags]`.
if (require.main === module) {
    runHazardCli(process.argv.slice(2)).catch((err) => {
        emit({ type: 'cli:exit', payload: { reason: 'error', message: String(err) } });
        process.exitCode = 1;
        log(String(err));
    });
}
