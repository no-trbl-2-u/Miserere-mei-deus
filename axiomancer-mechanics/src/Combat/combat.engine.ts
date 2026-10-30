/**
 * Hazard-Pattern Combat: the engine.
 *
 * `resolveCombatPhase` drives the HP-model combat: the enemy's SOLE bar is HP,
 * and the player drops it to 0. Every verb is a combat card (projected from a
 * learned card); the player rolls stance dice and plays cards. Combat is
 * STATUS-FIRST — there is no auto-derived strike: enemy HP falls through a
 * printed status or its payoff (DoT ticks, affliction bursts like
 * RUPTURE/REAP, enchant-gated drips, reflect) or the authored `deal` damage
 * family. Control hinders the enemy's turn instead. This engine *drives*
 * `executeCard` / `applyEffect`; it does not reimplement them.
 *
 * Card bottom actions execute through `executeCard`: one live die
 * from the tray (or the Reserve / a GHOST die) is the card's whole
 * cost — combat cards carry no resource cost.
 * Landed `effect-applied` events drive the post-combat attribution and the
 * self-reinforcing die loop.
 *
 * Randomness flows through the seedable global RNG singleton; pass `seed` to
 * `initializeCombatEncounter` for a reproducible encounter (hermetic tests +
 * Monte-Carlo sim).
 */

import { deepClone } from '../Utils';
import { getRng, setSeed } from '../Utils/rng';
import { isLoggingEnabled, forwardCombatEventsToLog } from '../Log';
import { lookupEffect, applyEffect } from '../Effects';
import type { Effect, ActiveEffect } from '../Effects/types';
import type { Character } from '../Character/types';
import type { Enemy } from '../Enemy/types';
import { getCardById } from '../Cards/cards.library';
import { executeCard } from '../Cards/card.engine';
import type { Card, CardAspect, CardRider } from '../Cards/types';
import type { CombatState } from './types';
import { applyDamage, heal, isDefeated, erodeMaxHealth } from './health';
import {
    processRoundStartEffects, processRoundEndEffects,
    getDamageTakenMultiplier, getPendingDotTotal,
    getOutgoingDamageMult,
    computeRoundsToKill,
    fireDotTrigger, growPerEnemyActionDots,
    applyCleanse,
} from './effects';
import {
    dieHasStance,
    combatDieCanPower, availableDiceFor, spendDice, availableDieCount,
    RESERVE_MAX, ripenReserve, materializeFloatingDice,
} from './combat.dice';
import {
    rollUpgradeableDice, rollGoldLeadPair,
    crackedColorsForTurn, expireCrackedDice, advanceMomentumV2,
    isChainStance, activeDieGear, tableHasRoom,
    UPGRADEABLE_TABLE_CEILING,
    OVERHEAT_CRACK_CHANCE, SPECIAL_FIRES_ON_USE, SURGE_DIE_PREFIX, COVETED_DIE_PREFIX,
} from './combat.upgradeable-dice';
import {
    COMBAT_HAND_SIZE, buildCombatDeck, drawCombatCards, shuffleCombatDeck,
} from './combat.deck';
import {
    toCombatCard, cardStanceColor, effectImpact, riderText,
} from './combat.cards';
import { recordAttribution } from './combat.attribution';
import { scaleFor, scaleEffectIntensity, scaleCardForStats } from './stat-scaling';
import { canAct, getActiveEffectModifiers, getActiveDotTotal, ticksOnRoundClock } from './effect-modifiers';
import { getThreatSequence, commitThreatBranch, nextEnemyPhaseIndex } from './combat.threat';
import { escalationApplies, hasEnemyPhases } from '../Enemy/enemy-phases';
import { getSignatureSkill, applySignatureSkill, signatureCastBlock, playerArchetype } from './combat.signature';
import { getSignaturesForLoadout } from '../Items/relic.library';
import { statsWithWorn } from '../Character/equipment.reducer';
import {
    type ProgramKit, deckHasProgramCards, initProgramLedger, isProgramCard, isCurseCard,
    playProgramCard, programTurnStart, programFoeTurnStart, programClampDamage,
    programRecordDamage, programRollRound, programDrawFallback,
    programIllegalReason, programShortfall, programXRange, type ProgramShortfall,
    programElementFoeTurnStart, programFrozenCheck, programElementDrift,
    programSpikeStrike, programSpikeDrift, programDiscardShortfall, type DiscardShortfall,
    programSpikeAttackStart, programHoldsGuard, programOnScrap, programMercyFoeTurnStart,
} from './combat.card-program';
import { weatherEvents } from './combat.elements';
import { spikeEvents } from './combat.spikes';
import { cutGuardGain, soakDealWithWard } from './combat.enemy-words';
import {
    applyEnemyWordEffects, enemyWordsAfterPlay, enemyWordsFoeTurnStart, enemyWordsPlayerTurnStart,
    enemyWordsUndertow,
} from './combat.enemy-words.resolve';
import { BARNACLE_ID } from '../Cards/library/enemy-curses.cards';
import type {
    CombatCard, CombatDieColor, CombatEncounterState, CombatEvent, CardPlay,
    CombatManaDie, CombatPhaseResult, CombatTransition, LandedEffect,
    CombatThreatEffect,
} from './combat.encounter.types';

// ── Tunable constants (HP model) ─────────────────────────────────────────────

/** Safety cap on total phases processed — prevents a degenerate stalemate loop. */
const MAX_PHASES = 60;

/**
 * Always 1: threat scaling lives in `threatDamageBudget` (`combat.threat.ts`),
 * so a telegraph's printed number IS the number the engine applies. Exported
 * only for callers that still import it; delete once nothing references it.
 */
export const THREAT_DAMAGE_SCALE = 1;
/** Conviction is capped so a long grind can't bank a Signature spam. */
export const CONVICTION_CAP = 12;
/** How many scraps per turn PAY +1 Conviction. The hand refills to
 *  COMBAT_HAND_SIZE, so an ungated scrap would pay a full hand of ◆ per turn
 *  against the 12 cap. Beyond this many, a scrap still cycles the dead card
 *  but pays nothing. */
export const SCRAP_CONVICTION_CAP_PER_TURN = 2;
// There is no auto-derived strike: direct damage exists only as the authored
// `deal` family, scaled by `scalePlayerHit`.

// ── Threat escalation ────────────────────────────────────────────────────────

/**
 * THE CLOCK. The enemy's telegraphed hit ESCALATES the longer a fight runs: each
 * round past THREAT_ESCALATION_GRACE multiplies the incoming threat damage by
 * (1 + THREAT_ESCALATION_PER_ROUND × roundsPastGrace). A drawn-out fight turns
 * lethal — so a careless or over-cautious line loses where before combat was
 * unloseable. The counters are on-vision: race the foe down (DoT) before the ramp
 * bites, OR deny its turns (control) to skip the escalated hits. This is also what
 * gives the threat ledger teeth — every round the clock advances is a round
 * the 'overwhelmed' marks were paid for. Tuned by /combat-playtest (engine constants) and /deck-tuning.
 */
export const THREAT_ESCALATION_PER_ROUND = 0.22;
/** Rounds of grace before the clock starts — a fast clean kill is unpunished. */
export const THREAT_ESCALATION_GRACE = 1;
/** Cap on the escalation multiplier so a long grind ramps but never runs away into a
 *  one-shot — keeps the clock tense, not a hard wall. Calibrated conservatively: the
 *  optimal witness bot still wins (combat stays fair, not broken) while human-paced
 *  play feels real pressure. Sharpening the bands further is a /combat-playtest (engine constants) and /deck-tuning job that
 *  hinges on the denial/kill-speed economy (the optimal bot kills in ~2-4 rounds and
 *  barely feels the clock). */
export const THREAT_ESCALATION_MAX = 2.0;
/**
 * Boss/unique enemies escalate FASTER than normal foes — the per-round rate is
 * multiplied by this factor for `difficulty === 'boss' | 'unique'`. Implements
 * the "steeper curve for bosses" doctrine: a boss fight that drags becomes
 * qualitatively more lethal than a normal fight dragging just as long. The
 * counters (finish fast via DoT, deny turns via control) are unchanged — they
 * are simply more urgent facing a boss. Tuned by /combat-playtest (engine constants) and /deck-tuning.
 */
export const THREAT_ESCALATION_BOSS_MULT = 1.6;
/**
 * THE CLOCK also intensifies enemy-inflicted STATUS effects, not just raw
 * damage: every THREAT_EFFECT_ESCALATION_STEP of escalation growth
 * (`escalation - 1`, the SAME clock as THREAT_ESCALATION_*, already boss-
 * scaled and already capped at THREAT_ESCALATION_MAX) adds +1 intensity to
 * whatever status the enemy's telegraphed hit applies this phase. Reuses the
 * damage clock's numbers instead of a second independent tuning knob, so it
 * ramps and caps on exactly the same schedule. Tuned by /combat-playtest (engine constants) and /deck-tuning.
 */
export const THREAT_EFFECT_ESCALATION_STEP = 0.34;
// ── Fate Engine — the dice get a second read ─────────────────────────────────

/** Each pip on a spent Reserve die adds this much intensity to the status
 *  the play lands (the ripened die hits harder). Tuned by /combat-playtest (engine constants) and /deck-tuning. */
export const PIP_INTENSITY_BONUS = 2;
/** Each pip on a spent Reserve die adds this much Guard on a defend card,
 *  so a ripened die is worth banking against GUARD lines from 8 to 60. */
export const PIP_GUARD_BONUS = 5;

// ── The damage-scaler constants ──────────────────────────────────────────────

/** The most every STAGE a foe has entered can add to its later phases,
 *  combined. Stage bonuses stack on top of the escalation clock, so this is
 *  what keeps a staged boss escalating instead of detonating. */
export const STAGE_THREAT_BONUS_CAP = 0.5;


const defaultRng = (): number => getRng().random();

// ── Card / lookup adapters ──────────────────────────────────────────────────

const lookupCard = (id: string): Card | undefined => getCardById(id);
const lookupEffectDef = (id: string): Effect | undefined => lookupEffect(id);

/** Projects a card id into its card view (card or synthetic). */
export function getCard(cardId: string): CombatCard | null {
    return toCombatCard(cardId, lookupCard, lookupEffectDef);
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/** Builds the `CombatState` slice `executeCard` reads. */
function cardShim(enc: CombatEncounterState): CombatState {
    return { round: enc.round, player: enc.player, enemy: enc.enemy };
}

/** THE COLOR LAW: a die powers only a card of ITS color; WILD (gold)
 *  matches every card, and a grey 'any' card accepts every die colour. The single definition `playBottomAction` and
 *  `firstLegalPoweringDie` share. */
function dieSatisfiesColorLaw(die: CombatManaDie, cardStance: CombatDieColor | CardAspect): boolean {
    return cardStance === 'any' || die.color === 'wild' || die.color === cardStance;
}

/** Snapshot of enemy effect intensities (for the meaningful-land / refresh check). */
function intensityMap(effects: readonly ActiveEffect[]): Record<string, number> {
    const m: Record<string, number> = {};
    for (const e of effects) m[e.effectId] = Math.max(m[e.effectId] ?? 0, e.intensity);
    return m;
}

// ── Initialization ───────────────────────────────────────────────────────────

/**
 * Builds a fresh `CombatEncounterState`. Combatants are deep-cloned (mutations
 * stay inside the encounter). Dice are NOT rolled yet — the state opens in the
 * `reveal` phase with an opening hand drawn, mirroring Hazard's route-select →
 * rolling → playing flow. Call `rollEncounterDice` to advance.
 *
 * `flags` is `GameState.flags` (the curated-loadout codec, see
 * `combat.loadout.ts`) — forwarded to `buildCombatDeck` only when `playerDeck`
 * is omitted; an explicit `playerDeck` always wins. Omitted/empty `flags`
 * falls back to `player.knownCards`.
 */
export function initializeCombatEncounter(
    player: Character,
    enemy: Enemy,
    playerDeck?: string[],
    seed?: number,
    flags?: readonly string[],
): CombatEncounterState {
    if (seed !== undefined) setSeed(seed);

    const clonedPlayer = deepClone(player);
    // Worn Heart / Body / Mind lines join the fighter's stats for this fight
    // only; the fight writes back VITAE, never stats.
    clonedPlayer.baseStats = statsWithWorn(clonedPlayer);
    const clonedEnemy = deepClone(enemy);
    const deck = playerDeck && playerDeck.length > 0 ? playerDeck.slice() : buildCombatDeck(clonedPlayer, flags);

    let threatPhases = getThreatSequence(clonedEnemy);
    // A branch on the OPENING phase commits at combat
    // start (its phase START); no threat has resolved yet, so the full-block
    // ledger reads false.
    const openingBranch = commitThreatBranch(threatPhases, 0, clonedEnemy, false);
    if (openingBranch) threatPhases = openingBranch.phases;

    // Draw the opening hand (5) from a shuffled deck.
    const shuffled = shuffleCombatDeck(deck);
    const draw = drawCombatCards(shuffled, [], deck, COMBAT_HAND_SIZE);

    let uid = 0;
    const hand = draw.drawn.map(cardId => ({ uid: `c${++uid}`, cardId }));

    // The character's persistent GHOST dice arrive in the
    // opening tray (they were forged in earlier combats and never spent).
    const floatingDice = materializeFloatingDice(clonedPlayer.floatingDice ?? []);

    return {
        phase: 'reveal',
        enemy: clonedEnemy,
        player: clonedPlayer,
        dice: [],
        turn: 0,
        // Round-turn law — no tray rolled yet this phase.
        turnTakenThisPhase: false,
        conviction: 0,
        // `archetype` is the mobile portrait flavour only; signatures come
        // from the worn signet-relic loadout.
        archetype: playerArchetype(clonedPlayer),
        signatures: getSignaturesForLoadout(clonedPlayer.equipment),
        deck,
        drawPile: draw.drawPile,
        discard: draw.discard,
        hand,
        floatingDice,
        souls: 0,
        spellsPlayedThisTurn: 0,
        // The combat ledgers start empty.
        enemyDamageThisTurn: 0,
        enemyDamageLastRound: 0,
        lastThreatFullyBlocked: false,
        threatPhases,
        threatMarks: threatPhases.map(() => 'pending'),
        currentPhaseIndex: 0,
        phaseResults: [],
        round: 1,
        attribution: {},
        guard: 0,
        directDamageDealt: 0,
        log: [],
        finalOutcome: null,
        // Wild-die permanent-growth pool. Starts empty; grown
        // for the rest of the encounter by `grant_permanent_wild_die` cards.
        permanentWildDice: 0,
        permanentDeadDice: 0,
        // The character's persisted die-gear rail drives the four dice's face
        // tables + special payloads. Absent → `activeDieGear` falls back to `DEFAULT_DIE_GEAR` per
        // color. This is the SOLE engine wiring point for the rail; every roll
        // and every fired special reads it via `activeDieGear`.
        dieGear: clonedPlayer.dieGear,
        // THE PATH — the two dice progression axes:
        // act-reward dice grow the tray, die upgrades grow the share of live
        // faces in it. Both seeded once, here, from the character.
        bonusTurnDice: clonedPlayer.bonusTurnDice ?? 0,
        dieUpgradeLevel: clonedPlayer.dieUpgradeLevel ?? 0,
        seed,
        // No coveted die claimed yet this combat.
        covetedDiceClaimed: [],
        // The program ledger exists only for a deck that holds a program
        // card, so every other fight's state is unchanged.
        ...(deckHasProgramCards(deck) ? { program: initProgramLedger() } : {}),
    };
}

/**
 * Public-API shim: opens phase-play and starts the first
 * turn. The granular path is `startTurn` → play → `endTurn`.
 */
export function rollEncounterDice(
    state: CombatEncounterState,
    rng: () => number = defaultRng,
): CombatTransition {
    if (state.phase !== 'reveal' && state.phase !== 'dice-roll') {
        // Already in play — just ensure the current turn has dice.
        if (state.phase === 'phase-play' && state.dice.length === 0) return startTurn(state, rng);
        return { state, events: [] };
    }
    const opened: CombatEncounterState = { ...state, phase: 'phase-play' };
    return startTurn(opened, rng);
}

/**
 * Starts a round: rolls the four fixed dice (one per colour, from
 * each die's gear face table), plus any act-reward dice, the gold+lead pair
 * (from `permanentWildDice`, cap 1 pair) and the floating
 * (GHOST / surge) dice. OVERHEAT cracks bite here (all-miss, then consumed).
 * The 7-object table ceiling converts the overflow to +1◆ by materialization
 * priority (permanent pool → Reserve → KINDLE → surge/floating). No-op outside
 * phase-play.
 */
export function startTurn(
    state: CombatEncounterState,
    rng: () => number = defaultRng,
): CombatTransition {
    if (state.phase !== 'phase-play') return { state, events: [] };
    // The ROUND-TURN LAW: ONE tray roll per threat
    // phase. A second roll in the same phase is refused outright (state
    // untouched) with a `turn-law-blocked` event so callers and telemetry can
    // see the attempt. The law caps TRAY ROLLS, not card plays — Reserve dice
    // and floating dice still power extra plays WITHIN the one turn (the
    // ALL floats may be spent in one round).
    if (state.turnTakenThisPhase) {
        const blocked: CombatEvent[] = [
            { kind: 'turn-law-blocked', turn: state.turn, phaseIndex: state.currentPhaseIndex },
        ];
        // The tray/turn are untouched — only the log records the attempt
        // (auditor transcripts must show illegal rolls being refused).
        return { state: withLog(state, blocked), events: blocked };
    }
    const turn = state.turn + 1;
    const cracked = crackedColorsForTurn(state, turn);
    let dice = rollUpgradeableDice(turn, state, cracked, rng);
    // UNDERTOW: the die a foe named does not make it to the tray.
    const tow = enemyWordsUndertow(state, turn, dice);
    dice = tow.dice;
    if ((state.permanentWildDice ?? 0) > 0) {
        dice = [...dice, ...rollGoldLeadPair(turn, state, rng)];
    }
    if ((state.floatingDice ?? []).length > 0) {
        dice = [...dice, ...(state.floatingDice ?? []).map(d => ({ ...d, state: 'available' as const }))];
    }
    const events: CombatEvent[] = [...tow.events];
    let conviction = state.conviction;
    let reserve = state.reserve ?? [];
    let floatingDice = state.floatingDice ?? [];
    // Ceiling — refuse lowest-priority objects first: floating (surge),
    // then kindled (temporary) Reserve dice, then the newest banked die.
    while (dice.length + reserve.length > UPGRADEABLE_TABLE_CEILING) {
        const floatIdx = [...dice].reverse().findIndex(d => d.floating);
        if (floatIdx >= 0) {
            const victim = dice[dice.length - 1 - floatIdx];
            dice = dice.filter(d => d.id !== victim.id);
            floatingDice = floatingDice.filter(d => d.id !== victim.id);
        } else {
            const kindled = [...reserve].reverse().find(d => d.temporary) ?? reserve[reserve.length - 1];
            if (!kindled) break;
            reserve = reserve.filter(d => d.id !== kindled.id);
        }
        conviction = Math.min(CONVICTION_CAP, conviction + 1);
        events.push({ kind: 'die-overflowed', source: 'materialize', total: conviction });
        events.push({ kind: 'conviction-gained', amount: 1, total: conviction, reason: 'effect' });
    }
    const next: CombatEncounterState = {
        ...state, dice, reserve, floatingDice, conviction, turn,
        ...(tow.state.enemyWords ? { enemyWords: tow.state.enemyWords } : {}),
        crackedDice: expireCrackedDice(state.crackedDice, turn),
        spellsPlayedThisTurn: 0,
        // The enemy-DoT accumulator is per-round; a fresh turn zeroes it
        // so `suppurating-curse` only doubles THIS round's real DoT total.
        // The per-turn scrap-pay counter resets with the turn.
        enemyDotDamageThisRound: 0, scrapsThisTurn: 0,
        // This phase's one legal tray roll is now taken.
        turnTakenThisPhase: true,
    };
    events.push({ kind: 'turn-dice-rolled', turn, dice });
    events.push({ kind: 'dice-rolled', dice });
    let started = withLog(next, events);
    // A foe's LEECH on you ticks at the start of your turn, and can kill you.
    const leeched = enemyWordsPlayerTurnStart(started);
    if (leeched.events.length > 0) {
        started = withLog(leeched.state, leeched.events);
        events.push(...leeched.events);
        if (isDefeated(started.player)) return endCombat(started, 'defeat', events);
    }
    // Start-of-turn Globals, a delayed HEAL and the turn's SACRIFICE
    // modifiers. No ledger, no change.
    if (started.program) {
        const pt = programTurnStart(started, PROGRAM_KIT);
        started = withLog(pt.state, pt.events);
        events.push(...pt.events);
        // Your INFERNO can kill you at the start of your turn.
        if (isDefeated(started.player)) return endCombat(started, 'defeat', events);
        if (isDefeated(started.enemy)) return endCombat(started, 'victory', events);
    }
    return { state: started, events };
}

/** Ends the turn: at end of round, ONE unspent mana/special tray
 *  die banks to the Reserve (cap RESERVE_MAX), best face first (special >
 *  mana — a banked special still fires its payload when spent from the
 *  Reserve, use-triggered). Unbanked dice simply expire — misses were always
 *  worth 0◆ and unspent mana earns nothing (income is specials + yield
 *  bonuses only, never leftovers). */
export function endTurn(state: CombatEncounterState): CombatTransition {
    if (state.phase !== 'phase-play') return { state, events: [] };
    const events: CombatEvent[] = [];
    let reserve = state.reserve ?? [];
    if (reserve.length < RESERVE_MAX) {
        const candidates = state.dice.filter(d => !d.floating && d.state === 'available' && d.face !== 'miss');
        const best = candidates.find(d => d.face === 'special') ?? candidates[0];
        if (best) {
            reserve = [...reserve, { ...best, pips: 0 }];
            events.push({ kind: 'die-banked', dieId: best.id, color: best.color, pips: 0 });
        }
    }
    const next: CombatEncounterState = { ...state, dice: [], reserve };
    return { state: withLog(next, events), events };
}

/**
 * OVERHEAT: push an already-SPENT
 * tray die back to `available` so it can power a SECOND card this round. The
 * push always succeeds; the RISK is the crack — `OVERHEAT_CRACK_CHANCE` that
 * the die is all-miss NEXT round.
 * The second play is a normal paid play: it moves momentum. Any
 * die may be overheated, gold included.
 */
export function overheatSpentDie(
    state: CombatEncounterState,
    dieId: string,
    rng: () => number = defaultRng,
): CombatTransition {
    if (state.phase !== 'phase-play' || state.finalOutcome) return { state, events: [] };
    const die = state.dice.find(d => d.id === dieId && !d.floating && d.state === 'spent');
    if (!die || die.face === 'miss' || die.color === 'x') return { state, events: [] };

    const events: CombatEvent[] = [{ kind: 'die-refreshed', dieId: die.id, color: die.color }];
    let crackedDice = state.crackedDice ?? [];
    if (rng() < OVERHEAT_CRACK_CHANCE) {
        crackedDice = [...crackedDice, { color: die.color as 'heart' | 'body' | 'mind' | 'wild', turn: state.turn + 1 }];
        events.push({ kind: 'die-cracked', dieId: die.id, color: die.color });
    }
    const next: CombatEncounterState = {
        ...state, crackedDice,
        dice: state.dice.map(d => (d.id === dieId ? { ...d, state: 'available' as const } : d)),
    };
    return { state: withLog(next, events), events };
}

function withLog(state: CombatEncounterState, events: CombatEvent[]): CombatEncounterState {
    if (!events.length) return state;
    // AXM Log tap: `withLog` is the single choke point every emission site
    // routes through, so one guarded forward here mirrors the whole combat
    // event stream. One boolean read when logging is off (the sim default).
    if (isLoggingEnabled()) forwardCombatEventsToLog(events);
    // Accumulate the REAL DoT damage the enemy takes this round as its
    // ticks are logged. `withLog` is the single choke point every emission site
    // routes through, so folding here catches all enemy `dot-tick` families
    // (card-played / damage-instance / fate-tap / TICK) without threading an
    // accumulator through each. Reset at `startTurn`; consumed by
    // `suppurating-curse` in `processBetweenPhases`.
    let enemyDot = state.enemyDotDamageThisRound ?? 0;
    for (const e of events) {
        if (e.kind === 'dot-tick' && e.target === 'enemy') enemyDot += e.amount;
    }
    return { ...state, log: [...state.log, ...events], enemyDotDamageThisRound: enemyDot };
}

// ── Card play ────────────────────────────────────────────────────────────────

/**
 * Plays one card from hand. `useBottom` powers the full effect (costs the named
 * die, executes the card, drives impact + the die-refresh loop); the free top
 * action fires the card's authored FREE rider with no die.
 */
export function playCombatCard(
    state: CombatEncounterState,
    cardRef: { uid?: string; cardId?: string },
    useBottom: boolean,
    dieId?: string,
    rng: () => number = defaultRng,
    x?: number,
): CombatTransition {
    if (state.phase !== 'phase-play') return { state, events: [] };
    const held = cardRef.uid
        ? state.hand.find(h => h.uid === cardRef.uid)
        : state.hand.find(h => h.cardId === cardRef.cardId);
    const refuse = (message: string): CombatTransition => {
        const events: CombatEvent[] = [{ kind: 'effect-fizzled', cardId: held?.cardId ?? '', effectId: '', message }];
        return { state: withLog(state, events), events };
    };
    // BARNACLE: the Curse cannot be played; a body die on a card knocks it off.
    if (held?.cardId === BARNACLE_ID) return refuse('a Barnacle cannot be played, spend a body die on a card to knock it off');
    // TANGLE: while it holds, a card cannot use its FREE line.
    if (held && !useBottom && (state.enemyWords?.tangle ?? 0) > 0) {
        return refuse('tangled, the next cards cannot use their FREE line, pay with a die');
    }
    const played = playCombatCardCore(state, cardRef, useBottom, dieId, rng, x);
    const after = enemyWordsAfterPlay(state, played.state, played.events, useBottom, dieId);
    if (after.events.length === 0) return played;
    return { state: withLog(after.state, after.events), events: [...played.events, ...after.events] };
}

function playCombatCardCore(
    state: CombatEncounterState,
    cardRef: { uid?: string; cardId?: string },
    useBottom: boolean,
    dieId?: string,
    rng: () => number = defaultRng,
    x?: number,
): CombatTransition {

    const entry = cardRef.uid
        ? state.hand.find(h => h.uid === cardRef.uid)
        : state.hand.find(h => h.cardId === cardRef.cardId);
    if (!entry) return { state, events: [] };

    const card = getCard(entry.cardId);
    if (!card) return { state, events: [] };

    // A program card resolves in combat.card-program.ts; BOON and momentum
    // still run for its PAID play. `x` is the amount chosen for a
    // "SACRIFICE any amount" line.
    if (isProgramCard(card.id)) {
        const withLedger = state.program ? state : { ...state, program: initProgramLedger() };
        const pp = playProgramCard(withLedger, entry.uid, useBottom, dieId, PROGRAM_KIT, x);
        if (pp.events.length === 0) return { state, events: [] };
        const fizzled = pp.events.length === 1 && pp.events[0].kind === 'effect-fizzled';
        if (fizzled) return { state: withLog(state, pp.events), events: pp.events };
        const played = checkImmediateOutcome(withLog(pp.state, pp.events), pp.events);
        return applyBoonAndMomentumV2(state, played, card.stance, useBottom);
    }

    const transition = useBottom
        ? playBottomAction(state, entry.uid, card, dieId, rng)
        : playTopAction(state, entry.uid, card, rng);
    // The BOON payload + the null-reset momentum chain; FREE plays
    // never touch either.
    return applyBoonAndMomentumV2(state, transition, card.stance, useBottom);
}

/**
 * Post-play bookkeeping for a LANDED PAID play:
 * 1. BOON payload (use-triggered): the powering die's
 *    special face fires its gear payload (+◆) because it was USED.
 * 2. Momentum (on the card's colour): start / advance / break-to-NULL; a completed
 *    3-chain SURGES — a temporary gold die (until spent, this combat) joins
 *    the tray, ceiling permitting (overflow → +1◆) — then momentum resets.
 * FREE (top) plays and fizzles return untouched.
 */
function applyBoonAndMomentumV2(
    preState: CombatEncounterState,
    transition: CombatTransition,
    stance: CombatDieColor | CardAspect,
    useBottom: boolean,
): CombatTransition {
    if (!useBottom) return transition;
    const played = transition.events.find(e => e.kind === 'card-played');
    if (!played || played.kind !== 'card-played') return transition;
    let state = transition.state;
    if (state.phase === 'complete') return transition;
    const events: CombatEvent[] = [];

    // 1. BOON fires on USE.
    if (SPECIAL_FIRES_ON_USE && played.dieId) {
        const preDie = preState.dice.find(d => d.id === played.dieId)
            ?? (preState.reserve ?? []).find(d => d.id === played.dieId);
        if (preDie?.face === 'special' && preDie.color !== 'x') {
            const gear = activeDieGear(preState, preDie.color as 'heart' | 'body' | 'mind' | 'wild');
            const granted = gear.specialConviction;
            const conviction = Math.min(CONVICTION_CAP, state.conviction + granted);
            if (conviction > state.conviction) {
                state = { ...state, conviction };
                events.push({ kind: 'special-fired', dieId: preDie.id, conviction: granted, total: conviction });
                events.push({ kind: 'conviction-gained', amount: conviction - transition.state.conviction, total: conviction, reason: 'effect' });
            }
        }
    }

    // 2. Momentum — the three chain colours only (wild/x synthetics never
    // move it: "wilds don't shift it").
    if (isChainStance(stance)) {
        const result = advanceMomentumV2(state.momentumV2 ?? null, stance);
        state = { ...state, momentumV2: result.momentum };
        if (result.broke) {
            events.push({ kind: 'momentum-broken', by: stance });
        } else if (result.surged) {
            if (tableHasRoom(state)) {
                const dieId = `${SURGE_DIE_PREFIX}${state.turn}-${state.log.length}`;
                const die: CombatManaDie = {
                    id: dieId, color: 'wild', face: 'mana', state: 'available',
                    temporary: true, floating: true,
                };
                state = { ...state, dice: [...state.dice, die], floatingDice: [...(state.floatingDice ?? []), die] };
                events.push({ kind: 'momentum-surged', dieId });
            } else {
                const conviction = Math.min(CONVICTION_CAP, state.conviction + 1);
                state = { ...state, conviction };
                events.push({ kind: 'die-overflowed', source: 'surge', total: conviction });
                events.push({ kind: 'conviction-gained', amount: 1, total: conviction, reason: 'effect' });
            }
        } else {
            events.push({ kind: 'momentum-advanced', color: stance, length: result.momentum?.length ?? 1 });
        }
    }

    if (events.length === 0) return transition;
    return { state: withLog(state, events), events: [...transition.events, ...events] };
}

/**
 * Scrap a hand card for +1 Conviction. Turns a dead draw into resolve
 * toward a Signature Skill (the agency lever through a bad hand). Phase-play only.
 *
 * Only the first {@link SCRAP_CONVICTION_CAP_PER_TURN} scraps per turn PAY;
 * beyond the cap a scrap still cycles the dead card
 * (agency preserved) but pays nothing. The `conviction-gained` event carries
 * `reason: 'scrap'` so the gate is testable and telemetry can see it.
 */
export function discardCombatCard(state: CombatEncounterState, uid: string): CombatTransition {
    if (state.phase !== 'phase-play') return { state, events: [] };
    const entry = state.hand.find(h => h.uid === uid);
    if (!entry) return { state, events: [] };
    // A Curse cannot be scrapped: playing it is the only way out.
    if (isCurseCard(entry.cardId)) {
        const events: CombatEvent[] = [{
            kind: 'effect-fizzled', cardId: entry.cardId, effectId: '',
            message: entry.cardId === BARNACLE_ID
                ? 'a Barnacle cannot be scrapped, spend a body die on a card to knock it off'
                : 'a Curse cannot be scrapped — play it to be rid of it',
        }];
        return { state: withLog(state, events), events };
    }
    const scrapsThisTurn = state.scrapsThisTurn ?? 0;
    const pays = scrapsThisTurn < SCRAP_CONVICTION_CAP_PER_TURN;
    const conviction = pays ? Math.min(CONVICTION_CAP, state.conviction + 1) : state.conviction;
    let next: CombatEncounterState = {
        ...state,
        hand: state.hand.filter(h => h.uid !== uid),
        discard: [...state.discard, entry.cardId],
        conviction,
        scrapsThisTurn: scrapsThisTurn + 1,
    };
    const events: CombatEvent[] = pays
        ? [{ kind: 'conviction-gained', amount: 1, total: conviction, reason: 'scrap' }]
        : [];
    // "If this card is discarded" fires on the scrap as on a random discard.
    if (isProgramCard(entry.cardId)) {
        const rider = programOnScrap(next, entry.cardId, PROGRAM_KIT);
        next = rider.state;
        events.push(...rider.events);
    }
    return { state: withLog(next, events), events };
}

/** Removes a hand entry to the discard. */
function discardEntry(state: CombatEncounterState, uid: string): CombatEncounterState {
    const entry = state.hand.find(h => h.uid === uid);
    if (!entry) return state;
    return {
        ...state,
        hand: state.hand.filter(h => h.uid !== uid),
        discard: [...state.discard, entry.cardId],
    };
}

/** Removes a hand entry to the EXILE pile (a plain card's PAID play that
 *  says EXILE). The pile lives on the program ledger, opened here when the
 *  deck holds no program card. */
function exileEntry(state: CombatEncounterState, uid: string): CombatEncounterState {
    const entry = state.hand.find(h => h.uid === uid);
    if (!entry) return state;
    const ledger = state.program ?? initProgramLedger();
    return {
        ...state,
        hand: state.hand.filter(h => h.uid !== uid),
        program: { ...ledger, exiled: [...ledger.exiled, entry.cardId] },
    };
}

// ── Shared rider/state helpers ───────────────────────────────────────────────

/** The 'damage-instance' clock — the shared enemy-damage funnel: applies the
 *  hit, then advances every damage-instance-clocked DoT on the enemy (BLEED's
 *  shape). DoT-clock ticks themselves never route through here
 *  (clocks must not cascade), and the trigger's own tick damage lands via the
 *  plain `applyDamage` inside `fireDotTrigger`, so a damage-instance DoT can
 *  never re-trigger itself. Emits the clock's `dot-tick` events; callers fold
 *  `clockDamage` into their direct-damage tally and — where a Soul channel is
 *  in scope — count `washedOut` via `soulWorthyWashouts`.
 *
 *  `erode` (Harvest — REAP attacks MAXIMUM HP): when true,
 *  the initial hit is applied via `erodeMaxHealth` instead of `applyDamage`
 *  — same current-HP subtraction, plus an identical `maxHealth` reduction in
 *  the SAME call, so the damage-instance clock still fires exactly once,
 *  sourced off the already-eroded enemy (no double subtraction, no second
 *  damage instance). */
function applyEnemyDamage(
    enemy: Enemy,
    amount: number,
    round: number,
    events: CombatEvent[],
    erode = false,
): { enemy: Enemy; clockDamage: number; washedOut: ActiveEffect[] } {
    if (amount <= 0) return { enemy, clockDamage: 0, washedOut: [] };
    let next = erode ? erodeMaxHealth(enemy, amount) : applyDamage(enemy, amount);
    const clock = fireDotTrigger(next, 'damage-instance', round);
    if (clock.damage > 0) {
        next = clock.target;
        for (const t of clock.perEffect) {
            events.push({ kind: 'dot-tick', effectId: t.effectId, label: t.label, amount: t.amount, target: 'enemy' });
        }
    }
    return { enemy: next, clockDamage: clock.damage, washedOut: clock.washedOut };
}

/**
 * The scalers a single player hit picks up on its way to the foe, folded in
 * one place so every damage source (the `deal` mechanic, a FREE-line
 * `damage`) reads the same rules. The caller scales `base` by body first;
 * the only scaler applied here is VULNERABLE, the foe's incoming-damage
 * multiplier (uncapped). The die that powered the play adds nothing: a die
 * powers a card, it does not boost it.
 */
export interface PlayerHitParams {
    base: number;
    /** VULNERABLE on the foe (`getDamageTakenMultiplier`); 1 when absent. */
    vulnMult?: number;
}

export function scalePlayerHit(params: PlayerHitParams): number {
    if (params.base <= 0) return 0;
    let dmg = Math.round(params.base);
    if (params.vulnMult !== undefined && params.vulnMult !== 1) dmg = Math.round(dmg * params.vulnMult);
    return Math.max(0, dmg);
}

/** Soul economy — decay-consumed instances of NO-CALENDAR debuffs
 *  (`calendarExpiry === false`) expire BY decay: they owe the same Soul a
 *  calendar expiry would (Harvest must not starve when calendars disappear).
 *  Calendar-carrying effects do not (washout ≠ expiry). */
function soulWorthyWashouts(washedOut: readonly ActiveEffect[]): number {
    return washedOut.filter(ae => {
        const def = lookupEffectDef(ae.effectId);
        return def?.type === 'debuff' && def.payload.dotModifiers?.calendarExpiry === false;
    }).length;
}

/** SOUL gain (Harvest): bumps the bank. */
function gainSouls(
    state: CombatEncounterState,
    amount: number,
    reason: 'expiry' | 'consumed' | 'granted',
    events: CombatEvent[],
): CombatEncounterState {
    if (amount <= 0) return state;
    const souls = (state.souls ?? 0) + amount;
    events.push({ kind: 'soul-gained', amount, total: souls, reason });
    return { ...state, souls };
}

/**
 * Applies a `CardRider` against the encounter state — the executor for FREE
 * lines. Every field is a real engine unit.
 */
function applyRiderToState(
    state: CombatEncounterState,
    cardId: string,
    r: CardRider,
    events: CombatEvent[],
): CombatEncounterState {
    let player = state.player;
    let enemy = state.enemy;
    let directDamage = state.directDamageDealt;
    let guard = state.guard ?? 0;
    let souls = state.souls ?? 0;
    const washedOutHere: ActiveEffect[] = [];
    // Every number a rider prints scales by the stat of where
    // it lands: damage by body, guard by mind, a status by heart (on the foe)
    // or mind (on you). See `stat-scaling.ts`.
    const stats = player.baseStats;

    // BRINE cuts the GUARD gain.
    if (r.guard) guard += cutGuardGain(state, scaleFor(r.guard, stats, 'mind', 'one-shot'), events);
    // Attribution ledger: the FREE line records
    // provenance with the same `recordAttribution` calls as the PAID path.
    let attribution = state.attribution;
    let enemyWords = state.enemyWords;
    const cardName = lookupCard(cardId)?.name ?? cardId;
    if (r.damage) {
        // The printed number is the number, scaled by body and VULNERABLE;
        // the foe's WARD soaks the part before VULNERABLE.
        const base = scaleFor(r.damage, stats, 'body', 'one-shot');
        const warded = soakDealWithWard(state, base, scalePlayerHit({
            base, vulnMult: getDamageTakenMultiplier(enemy),
        }), events);
        enemyWords = warded.state.enemyWords;
        const dmg = warded.dealt;
        if (dmg > 0) {
            const hpBefore = enemy.health;
            const hit = applyEnemyDamage(enemy, dmg, state.round, events);
            enemy = hit.enemy;
            directDamage += dmg + hit.clockDamage;
            washedOutHere.push(...hit.washedOut);
            attribution = recordAttribution(attribution, cardId, cardName, null, dmg, hpBefore);
            events.push({ kind: 'damage-dealt', cardId, target: 'enemy', amount: dmg });
        }
    }
    if (r.applyEffect) {
        const def = lookupEffectDef(r.applyEffect.effectId);
        if (def) {
            const toSelf = r.applyEffect.to === 'self';
            const bearer = toSelf ? player : enemy;
            const applied = applyEffect(bearer.effects, def, state.round, {
                intensityDelta: scaleEffectIntensity(def, r.applyEffect.intensity ?? 1, toSelf, stats),
                uncapped: true,
                ...(r.applyEffect.duration !== undefined
                    ? { durationMode: 'additive' as const, durationDelta: r.applyEffect.duration }
                    : {}),
                sourceId: cardId,
            });
            if (toSelf) player = { ...player, effects: applied.activeEffects };
            else enemy = { ...enemy, effects: applied.activeEffects };
            const active = applied.result.activeEffect;
            if (active) {
                events.push({
                    kind: 'effect-landed', cardId, effectId: def.id, target: toSelf ? 'self' : 'enemy',
                    effectKind: def.payload.damageOverTime ? 'dot' : 'control',
                    intensity: active.intensity, effect: def,
                });
                if (!toSelf) {
                    const landed: LandedEffect = { effectId: def.id, effect: def, active, target: 'enemy' };
                    attribution = recordAttribution(attribution, cardId, cardName, landed, 0, enemy.health);
                }
            }
        }
    }

    const washSouls = soulWorthyWashouts(washedOutHere);
    if (washSouls > 0) {
        souls += washSouls;
        events.push({ kind: 'soul-gained', amount: washSouls, total: souls, reason: 'expiry' });
    }
    return {
        ...state, player, enemy, directDamageDealt: directDamage, guard, souls, attribution,
        ...(enemyWords ? { enemyWords } : {}),
    };
}

/**
 * The 'card-played' clock on the FREE line.
 *
 * The clock fires once per PLAYER-side spell play, FREE or PAID. Same rules
 * as the PAID site: the pre-play intensity map caps
 * eligibility (fresh stacks never self-tick), enemy-borne washouts earn
 * expiry Souls, player-borne ones do not.
 */
function fireFreePlayClock(
    state: CombatEncounterState,
    enemyPrePlay: Record<string, number>,
    playerPrePlay: Record<string, number>,
    events: CombatEvent[],
): CombatEncounterState {
    let next = state;
    const clock = fireDotTrigger(next.enemy, 'card-played', next.round,
        ae => Math.min(ae.intensity ?? 1, enemyPrePlay[ae.effectId] ?? 0));
    if (clock.damage > 0) {
        for (const t of clock.perEffect) {
            events.push({ kind: 'dot-tick', effectId: t.effectId, label: t.label, amount: t.amount, target: 'enemy' });
        }
        next = { ...next, enemy: clock.target, directDamageDealt: next.directDamageDealt + clock.damage };
    }
    next = gainSouls(next, soulWorthyWashouts(clock.washedOut), 'expiry', events);
    const selfClock = fireDotTrigger(next.player, 'card-played', next.round,
        ae => Math.min(ae.intensity ?? 1, playerPrePlay[ae.effectId] ?? 0));
    if (selfClock.damage > 0) {
        for (const t of selfClock.perEffect) {
            events.push({ kind: 'dot-tick', effectId: t.effectId, label: t.label, amount: t.amount, target: 'self' });
        }
        next = { ...next, player: selfClock.target };
    }
    return next;
}

/**
 * The FREE (top) action executes the card's AUTHORED free
 * rider: dieless, small, always available. There is no chip, no auto-derived
 * weak effect — what is printed is what fires.
 */
function playTopAction(
    state: CombatEncounterState,
    uid: string,
    card: CombatCard,
    _rng: () => number,
): CombatTransition {
    const sourceCard = lookupCard(card.id);
    const events: CombatEvent[] = [
        { kind: 'card-played', cardId: card.id, useBottom: false, dieId: null },
    ];
    let next = discardEntry(state, uid);
    // Pre-play stack snapshot: only stacks that existed BEFORE this
    // play are on the 'card-played' clock (a FREE line's own fresh POISON
    // never ticks itself). Taken before the rider so a free-line apply is
    // "fresh" exactly as a PAID apply is.
    const enemyPrePlay = intensityMap(state.enemy.effects);
    const playerPrePlay = intensityMap(state.player.effects);
    if (sourceCard?.free) {
        next = applyRiderToState(next, card.id, sourceCard.free, events);
    }
    next = fireFreePlayClock(next, enemyPrePlay, playerPrePlay, events);
    next = withLog(next, events);
    return checkImmediateOutcome(next, events);
}

/**
 * Powered bottom action: spends the powering die, runs the
 * full card through `executeCard`, folds landed effects into the impact
 * tracks + attribution, and refreshes a matching die when a status effect
 * meaningfully lands.
 */
function playBottomAction(
    state: CombatEncounterState,
    uid: string,
    card: CombatCard,
    dieId: string | undefined,
    _rng: () => number,
): CombatTransition {
    const sourceCard = lookupCard(card.id);
    if (!sourceCard) return { state, events: [] };

    // 1. Resolve the POWERING die — no draft, no single-die law.
    //    ANY available die (tray mana/special face, Reserve, or floating) may
    //    power a paid line; the color law below still gates it. The dieId is
    //    REQUIRED — there is no implicit default die.
    const reserveIn = state.reserve ?? [];
    let powering: CombatManaDie;
    let poweringSource: 'reserve' | 'floating' | 'tray';
    if (dieId === undefined) {
        const events: CombatEvent[] = [{ kind: 'effect-fizzled', cardId: card.id, effectId: '', message: 'choose a die to power this card' }];
        return { state: withLog(state, events), events };
    }
    const banked = reserveIn.find(d => d.id === dieId);
    const floating = state.dice.find(d => d.id === dieId && d.floating && d.state === 'available');
    const tray = state.dice.find(d => d.id === dieId && !d.floating);
    if (banked) {
        powering = banked;
        poweringSource = 'reserve';
    } else if (floating) {
        powering = floating;
        poweringSource = 'floating';
    } else if (tray && tray.state === 'available') {
        powering = tray;
        poweringSource = 'tray';
    } else {
        const events: CombatEvent[] = [{
            kind: 'effect-fizzled', cardId: card.id, effectId: '',
            message: tray?.face === 'miss'
                ? 'a miss face is dead — it powers nothing this round'
                : 'that die cannot power this card',
        }];
        return { state: withLog(state, events), events };
    }

    // 1b. THE COLOR LAW: a die can only power a
    //     card of ITS color. WILD (gold) is the sole exception — it matches
    //     every card. Applies to every power source: tray, Reserve, and
    //     floating alike. A card of aspect 'any' (the grey office)
    //     has no colour to mismatch: every die colour powers it.
    if (!dieSatisfiesColorLaw(powering, card.stance)) {
        const events: CombatEvent[] = [{
            kind: 'effect-fizzled', cardId: card.id, effectId: '',
            message: `a ${powering.color} die cannot power a ${card.stance} card — colors must match`,
        }];
        return { state: withLog(state, events), events };
    }

    // 2. Every play lands at its printed numbers: the die that powers it
    // adds nothing beyond its pips.
    const poweringPips = powering.pips ?? 0;
    // The player's stats scale this play's printed numbers
    // (`stat-scaling.ts`): DEAL by body, GUARD by mind, statuses by where
    // they land. VULNERABLE stacks on top.
    const stats = state.player.baseStats;

    const events: CombatEvent[] = [{ kind: 'card-played', cardId: card.id, useBottom: true, dieId: powering.id }];

    // 3. Execute the card (the shared effect machinery) against a shim.
    const before = intensityMap(state.enemy.effects);
    const res = executeCard(cardShim(state), sourceCard.id, lookupCard);

    let player = res.state.player as Character;
    // VULNERABLE — the foe's incoming-damage multiplier, read from state.enemy
    // BEFORE this card's own debuff lands.
    const vulnMult = getDamageTakenMultiplier(state.enemy);
    let enemy = res.state.enemy as Enemy;
    let attribution = state.attribution;
    let directDamage = state.directDamageDealt;

    // ── Fate Engine — resonance and pips ──
    // Spending the powering die feeds the TOLL tally: its own color,
    // or the card's stance for a Wild.
    let resonance = { heart: 0, body: 0, mind: 0, ...(state.resonance ?? {}) };
    const resonanceColor: 'heart' | 'body' | 'mind' | null =
        dieHasStance(powering.color) ? (powering.color as 'heart' | 'body' | 'mind')
            : powering.color === 'wild' && card.stance !== 'any' && dieHasStance(card.stance) ? (card.stance as 'heart' | 'body' | 'mind')
                : null;
    if (resonanceColor) {
        resonance = { ...resonance, [resonanceColor]: resonance[resonanceColor] + 1 };
        events.push({ kind: 'resonance-gained', color: resonanceColor, total: resonance[resonanceColor] });
    }
    // Landed-status adjustment, in REAL units: RIPENED pips add
    // PIP_INTENSITY_BONUS intensity per pip on a non-defend play. Card
    // statuses land uncapped, so the pips add on top with no clamp.
    const isDefendPlay = card.verbClass === 'defend';
    const bonusIntensity = isDefendPlay ? 0 : poweringPips * PIP_INTENSITY_BONUS;
    if (bonusIntensity > 0) {
        let touched = false;
        enemy = {
            ...enemy,
            effects: enemy.effects.map(a => {
                if ((before[a.effectId] ?? 0) >= a.intensity) return a;
                touched = true;
                return { ...a, intensity: a.intensity + bonusIntensity };
            }),
        };
        if (touched) {
            events.push({ kind: 'pips-cashed', cardId: card.id, pips: poweringPips, bonus: 'intensity', amount: poweringPips * PIP_INTENSITY_BONUS });
        }
    }

    const mechs = sourceCard.specialMechanics ?? [];
    let souls = state.souls ?? 0;
    const gainSoulsLocal = (n: number): void => {
        if (n <= 0) return;
        souls += n;
        events.push({ kind: 'soul-gained', amount: n, total: souls, reason: 'expiry' });
    };

    // DEAL — each hit folds the scalers through `scalePlayerHit`, then the
    // foe's WARD soaks the part before VULNERABLE.
    let wardState: CombatEncounterState = state;
    for (const mech of mechs) {
        if (mech.kind !== 'deal') continue;
        if (isDefeated(enemy)) break;
        const healthBefore = enemy.health;
        const base = scaleFor(mech.amount, stats, 'body', 'one-shot');
        const warded = soakDealWithWard(wardState, base, scalePlayerHit({ base, vulnMult }), events);
        wardState = warded.state;
        const dmg = warded.dealt;
        if (dmg <= 0) continue;
        const hit = applyEnemyDamage(enemy, dmg, state.round, events);
        enemy = hit.enemy;
        directDamage += dmg + hit.clockDamage;
        // Credit the CARD, so per-card telemetry sees the DEAL verb.
        attribution = recordAttribution(attribution, card.id, card.name, null, dmg, healthBefore);
        gainSoulsLocal(soulWorthyWashouts(hit.washedOut));
        events.push({ kind: 'damage-dealt', cardId: card.id, target: 'enemy', amount: dmg });
    }

    // 4. Fold the card's effect-applications: DoT + control LAND on the enemy.
    //    DoT will tick real HP each phase (the status damage engine); control gates
    //    the enemy's turn via `canAct`. Attribute projected DoT for the summary.
    for (const ev of res.events) {
        if (ev.kind !== 'effect-applied') continue;
        const def = ev.effect;
        const target: 'self' | 'enemy' = ev.appliedTo;
        const sideEffects = target === 'enemy' ? enemy.effects : player.effects;
        const active = sideEffects.find(a => a.effectId === def.id);
        if (active && target === 'enemy') {
            const landed: LandedEffect = { effectId: def.id, effect: def, active, target };
            const cls = effectImpact(def, active.intensity, active.remainingDuration).track;
            attribution = recordAttribution(attribution, card.id, card.name, landed, 0, enemy.health);
            events.push({ kind: 'effect-landed', cardId: card.id, effectId: def.id, target: 'enemy', effectKind: cls, intensity: active.intensity, effect: def });
        } else if (active) {
            events.push({ kind: 'effect-landed', cardId: card.id, effectId: def.id, target, effectKind: 'none', intensity: active.intensity, effect: def });
        }
    }

    // The 'card-played' clock — a PLAYER-side card play
    // advances every card-played-clocked DoT on the enemy. Enemy actions
    // never fire this, and only STACKS that existed BEFORE this
    // play are on the clock: a play's own fresh stacks never tick themselves.
    const clock = fireDotTrigger(enemy, 'card-played', state.round,
        ae => Math.min(ae.intensity ?? 1, Math.min(before[ae.effectId] ?? 0, ae.intensity ?? 1)));
    if (clock.damage > 0) {
        enemy = clock.target;
        directDamage += clock.damage;
        for (const t of clock.perEffect) {
            events.push({ kind: 'dot-tick', effectId: t.effectId, label: t.label, amount: t.amount, target: 'enemy' });
        }
        gainSoulsLocal(soulWorthyWashouts(clock.washedOut));
    }

    // The same clock advances card-played-clocked DoTs the PLAYER
    // bears: the clock is the player's own play, wherever the DoT sits. Same
    // pre-existing STACK cap, and player-borne washouts never earn Souls.
    const playerPrePlay = intensityMap(state.player.effects);
    const selfClock = fireDotTrigger(player, 'card-played', state.round,
        ae => Math.min(ae.intensity ?? 1, playerPrePlay[ae.effectId] ?? 0));
    if (selfClock.damage > 0) {
        player = selfClock.target as Character;
        for (const t of selfClock.perEffect) {
            events.push({ kind: 'dot-tick', effectId: t.effectId, label: t.label, amount: t.amount, target: 'self' });
        }
    }

    // 5. Die spend — the powering die's fate. A GHOST die is GONE FOREVER when
    //    spent.
    let dice = state.dice;
    let reserve = reserveIn;
    let floatingDice = state.floatingDice ?? [];
    if (poweringSource === 'floating') {
        dice = dice.filter(d => d.id !== powering.id);
        floatingDice = floatingDice.filter(d => d.id !== powering.id);
        events.push({ kind: 'floating-die-spent', dieId: powering.id, color: powering.color, poolSize: floatingDice.length });
    } else if (poweringSource === 'reserve') {
        reserve = reserve.filter(d => d.id !== powering.id);
    } else {
        dice = spendDice(dice, [powering.id]);
    }
    events.push({ kind: 'die-spent', dieId: powering.id, color: powering.color });

    // Defense card → GUARD (printed + pips). Absorbed in
    // `resolveThreatPhase`.
    const guardMech = mechs.find(m => m.kind === 'guard');
    const pipGuard = isDefendPlay ? poweringPips * PIP_GUARD_BONUS : 0;
    if (pipGuard > 0) {
        events.push({ kind: 'pips-cashed', cardId: card.id, pips: poweringPips, bonus: 'guard', amount: pipGuard });
    }
    const guardBase = guardMech ? scaleFor(Math.max(1, Math.round(guardMech.amount)), stats, 'mind', 'one-shot') : 0;
    // BRINE cuts the play's GUARD gain once, pips included.
    const guardGain = cutGuardGain(state, guardBase + pipGuard, events);

    let next: CombatEncounterState = {
        ...state, player, enemy, dice, reserve, resonance, attribution,
        ...(wardState.enemyWords ? { enemyWords: wardState.enemyWords } : {}),
        guard: (state.guard ?? 0) + guardGain,
        directDamageDealt: directDamage,
        floatingDice,
        souls,
        spellsPlayedThisTurn: (state.spellsPlayedThisTurn ?? 0) + 1,
    };
    if (sourceCard.paidExile) {
        next = exileEntry(next, uid);
        events.push({ kind: 'card-exiled', cardId: card.id });
    } else {
        next = discardEntry(next, uid);
    }
    next = withLog(next, events);
    return checkImmediateOutcome(next, events);
}


/** Checks for a global threshold crossing mid-phase (immediate outcome). */
function checkImmediateOutcome(state: CombatEncounterState, events: CombatEvent[]): CombatTransition {
    if (state.finalOutcome) return { state, events };
    // HP model: the enemy's only bar is HP. A successful Befriend opens the
    // spare/exploit mercy choice (handled via `mercyChoiceActive`), not here.
    if (isDefeated(state.enemy)) return endCombat(state, 'victory', events);
    return { state, events };
}

function endCombat(state: CombatEncounterState, outcome: CombatEncounterState['finalOutcome'], events: CombatEvent[]): CombatTransition {
    const ev: CombatEvent = { kind: 'combat-ended', outcome: outcome! };
    const ended: CombatEncounterState = { ...state, phase: 'complete', finalOutcome: outcome };
    return { state: withLog(ended, [ev]), events: [...events, ev] };
}

// ── Phase resolution + between-phases ───────────────────────────────────────

/**
 * The soak arithmetic for one flat hit: GUARD, then BARRIER. The
 * SINGLE definition of the wall arithmetic `projectIncomingThreat` shares with
 * the engine, so the on-screen wall math cannot drift from what the engine
 * actually does. Deliberately EXCLUDES riposte (a parry on the foe's own
 * swing, one-shot per phase).
 */
function soakFlatHit(
    raw: number,
    o: { guard: number; barrier: number },
): { dealt: number; guard: number; barrier: number } {
    let dmg = Math.max(0, raw);
    let guard = o.guard;
    let barrier = o.barrier;
    const g = Math.min(guard, dmg);
    guard -= g;
    dmg -= g;
    const b = Math.min(barrier, dmg);
    barrier -= b;
    dmg -= b;
    return { dealt: dmg, guard, barrier };
}

/**
 * Resolves the current threat phase (HP model): the enemy executes its
 * telegraphed threat action on the player UNLESS a control status hinders it
 * (`canAct` → skipTurn). This is how control "hinders the enemy" — it loses its
 * attack this phase. Then between-phases processing runs (DoT ticks, draw, advance).
 */
export function resolveThreatPhase(stateIn: CombatEncounterState, rng: () => number = defaultRng): CombatTransition {
    if (stateIn.phase === 'complete' || stateIn.finalOutcome) return { state: stateIn, events: [] };
    // WARD and BRINE run out at the start of the foe's turn, before anything
    // else, so nothing at its turn start meets the old WARD.
    const faded = enemyWordsFoeTurnStart(stateIn);
    let state = faded.state;
    // LEECH drains the foe at the start of its turn, before it acts.
    const leech = programFoeTurnStart(state);
    const leechEvents = [...faded.events, ...leech.events];
    if (leechEvents.length > 0) {
        state = leech.state;
        if (isDefeated(state.enemy)) return endCombat(withLog(state, leechEvents), 'victory', leechEvents);
    }
    // The weather ticks on the foe (INFERNO, then STORM, which grows).
    const weather = programElementFoeTurnStart(state);
    if (weather.events.length > 0) {
        leechEvents.push(...weather.events);
        state = weather.state;
        if (isDefeated(state.enemy)) return endCombat(withLog(state, leechEvents), 'victory', leechEvents);
    } else state = weather.state;
    // MERCY's clock ticks on the foe; when it runs out the MERCY bursts.
    const mercy = programMercyFoeTurnStart(state, PROGRAM_KIT);
    if (mercy.events.length > 0) {
        leechEvents.push(...mercy.events);
        state = mercy.state;
        if (isDefeated(state.enemy)) return endCombat(withLog(state, leechEvents), 'victory', leechEvents);
    }

    const idx = Math.min(state.currentPhaseIndex, state.threatPhases.length - 1);
    const phase = state.threatPhases[idx];
    const events: CombatEvent[] = [...leechEvents];

    // Control on the enemy hinders its turn: HARD control (skipTurn) denies it
    // outright via canAct.
    const act = canAct(state.enemy.effects as ActiveEffect[]);
    const isBossTier = state.enemy.difficulty === 'boss' || state.enemy.difficulty === 'unique';
    // THE CLOCK: the telegraphed hit escalates each round past the grace
    // window, so a drawn-out fight turns lethal. 1.0 on round ≤ grace (a fast kill is
    // unpunished).
    // Boss/unique enemies escalate FASTER: their per-round rate is multiplied by
    // THREAT_ESCALATION_BOSS_MULT so a dragging boss fight becomes more lethal than a
    // dragging normal fight — makes finishing bosses quickly (DoT/control) the clear
    // efficient path.
    const escalationRate = THREAT_ESCALATION_PER_ROUND * (isBossTier ? THREAT_ESCALATION_BOSS_MULT : 1);
    // A normal or elite foe with HP phases has no clock: its phases carry the ramp.
    const escalation = !escalationApplies(state.enemy) ? 1 : Math.min(
        THREAT_ESCALATION_MAX,
        1 + escalationRate * Math.max(0, state.round - THREAT_ESCALATION_GRACE),
    );
    // Same clock, applied to STATUS intensity instead of raw damage: the
    // longer the fight drags, the harder the enemy's telegraphed status lands
    // too. Derived from `escalation` so it shares its boss-speedup and its
    // cap — no separate ramp to keep in sync.
    const effectIntensityBonus = Math.floor((escalation - 1) / THREAT_EFFECT_ESCALATION_STEP);
    // Enemy-borne outgoing-damage statuses (QUARTER) dampen its telegraphed hit.
    const enemyOutgoingMult = getOutgoingDamageMult(state.enemy);
    const hindered = !act.canAct;

    let player = state.player;
    let enemy = state.enemy;
    // GUARD (one-shot, per-phase) absorbs first; BARRIER (persistent, stacking)
    // soaks the remainder; RIPOSTE parries and counters ONLY when
    // the attack was FULLY blocked (reflect class). All no-op when unset.
    let guard = state.guard ?? 0;
    let barrier = state.barrier ?? 0;
    const riposte = state.riposte ?? null;
    let riposteFired = false;
    let attacksLanded = 0;
    let attacksFullyBlocked = 0;
    // The raw (pre-soak) size of every attack the wall
    // (parry + guard + barrier, combined) brought all the way to 0 this
    // phase. RIPOSTE's counter scales off this, not a flat printed number —
    // "the wall IS the weapon."
    let blockedBlowTotal = 0;
    // Post-soak HP the enemy's threat lands on the player
    // this phase (the `enemyDamageThisTurn` ledger's write site).
    let enemyDamageDealt = 0;
    let directDamage = state.directDamageDealt;
    const penaltiesApplied: CombatThreatEffect[] = [];

    // An already-defeated enemy does not still hit the player this phase (the
    // victory check runs after this block).
    // BLIZZARD takes n off each hit; the FROZEN check reads the hits.
    let blizzardCut = 0;
    let blizzardSoftened = 0;
    if (!hindered && !isDefeated(enemy) && state.program) {
        const frozen = programFrozenCheck(state, threatHits(state));
        state = frozen.state;
        blizzardCut = frozen.blizzard;
        events.push(...frozen.events);
        // A REFLECT armed for the foe's attack is up before its first strike.
        if (threatHits(state).length > 0) {
            const armed = programSpikeAttackStart(state.program!, state.round);
            if (armed !== state.program) {
                events.push(...spikeEvents(state.program!.spikes, armed.spikes));
                state = { ...state, program: armed };
            }
        }
    }
    // A card made the foe's next attack deal n less: taken off its strikes in order, spent when it attacks.
    let attackLess = state.program?.attackLess ?? 0;
    if (!hindered && !isDefeated(enemy)) {
        // The enemy attacks: its telegraphed threat action fires on the player.
        const playerTakenMult = getDamageTakenMultiplier(state.player);
        if (attackLess > 0 && state.program && phase.threatAction.effects.some(e => (e.damage ?? 0) > 0)) {
            state = { ...state, program: { ...state.program, attackLess: 0 } };
        } else attackLess = 0;
        for (const eff of phase.threatAction.effects) {
            // A foe the spikes defeated mid-attack strikes no more.
            if (eff.damage && eff.damage > 0 && !isDefeated(enemy)) {
                attacksLanded += 1;
                let dmg = Math.round(
                    eff.damage * THREAT_DAMAGE_SCALE * escalation
                    * enemyOutgoingMult
                    // Every STAGE this foe has entered adds its printed weight
                    // to every later phase, CLAMPED: stage bonuses multiply on
                    // top of the escalation clock (itself up to x2, x1.6 for a
                    // boss), and unbounded they would turn a four-stage unique
                    // into a one-shot. A stage should change the shape of a fight, not end
                    // it before the deck can answer.
                    * (1 + Math.min(STAGE_THREAT_BONUS_CAP, state.stageThreatBonus ?? 0))
                    * playerTakenMult,
                );
                if (attackLess > 0) {
                    const less = Math.min(dmg, attackLess);
                    dmg -= less;
                    attackLess -= less;
                }
                if (blizzardCut > 0) {
                    const cut = Math.min(dmg, blizzardCut);
                    dmg -= cut;
                    blizzardSoftened += cut;
                }
                const preSoakDmg = dmg;
                // RIPOSTE parry reduces the incoming hit once this phase.
                if (riposte && !riposteFired && riposte.reduce > 0) {
                    const parried = Math.min(dmg, riposte.reduce);
                    dmg -= parried;
                    riposteFired = true;
                }
                // GUARD soaks first (one-shot, clamped), then BARRIER (persistent).
                const guardAbsorbed = Math.min(guard, dmg);
                guard -= guardAbsorbed;
                dmg -= guardAbsorbed;
                const barrierAbsorbed = Math.min(barrier, dmg);
                if (barrierAbsorbed > 0) {
                    barrier -= barrierAbsorbed;
                    dmg -= barrierAbsorbed;
                    events.push({ kind: 'barrier-absorbed', amount: barrierAbsorbed });
                }
                if (dmg > 0) {
                    // A death ward keeps the player at 1 VITAE this turn.
                    dmg = programClampDamage(state, player.health, dmg);
                    player = applyDamage(player, dmg);
                    enemyDamageDealt += dmg;
                    // The 'damage-instance' clock, player bearer — a threat
                    // hit that LANDS advances every damage-instance-clocked
                    // DoT the player carries (enemy threat riders land
                    // `debuff_bleed` on the player). Self-costs (RECOIL)
                    // deliberately never advance it — the blood price must
                    // not self-combo with enemy-applied BLEED.
                    const selfClock = fireDotTrigger(player, 'damage-instance', state.round);
                    if (selfClock.damage > 0) {
                        player = selfClock.target;
                        if (state.program?.deathWardRound === state.round && player.health < 1) player = { ...player, health: 1 };
                        for (const t of selfClock.perEffect) {
                            events.push({ kind: 'dot-tick', effectId: t.effectId, label: t.label, amount: t.amount, target: 'self' });
                        }
                    }
                }
                else {
                    attacksFullyBlocked += 1;
                    blockedBlowTotal += preSoakDmg;
                }
                // THORNS and REFLECT answer the strike, each a DEAL off the pre-GUARD hit.
                if (state.program) {
                    const spikes = programSpikeStrike(state.program, enemy, preSoakDmg, {
                        round: state.round, unhurt: enemyDamageDealt === 0,
                    });
                    if (spikes.hits.length > 0) {
                        events.push(...weatherEvents(state.program.el, spikes.ledger.el));
                        state = { ...state, program: spikes.ledger };
                        for (const h of spikes.hits) {
                            if (isDefeated(enemy) || h.amount <= 0) continue;
                            const hit = applyEnemyDamage(enemy, h.amount, state.round, events);
                            enemy = hit.enemy;
                            directDamage += h.amount + hit.clockDamage;
                            events.push({ kind: 'spike-struck', spike: h.spike, amount: h.amount });
                        }
                    }
                }
            }
            if (eff.effectId) {
                const def = lookupEffectDef(eff.effectId);
                if (def) {
                    const res = applyEffect(player.effects, def, state.round, {
                        intensityDelta: (eff.intensity ?? 1) + effectIntensityBonus,
                        durationMode: eff.duration ? 'additive' : 'reset',
                        durationDelta: eff.duration,
                        sourceId: enemy.id,
                    });
                    player = { ...player, effects: res.activeEffects };
                    // `mirror-of-guilt` deliberately does NOT reflect here:
                    // enemy-inflicted debuffs are not "self-debuffs your own
                    // cards land" (the face is the contract).
                }
            }
            if (eff.enemyHeal && eff.enemyHeal > 0 && !isDefeated(enemy)) {
                const healAmt = Math.round(eff.enemyHeal);
                if (healAmt > 0) {
                    const hpBefore = enemy.health;
                    enemy = heal(enemy, healAmt);
                    const healed = enemy.health - hpBefore;
                    if (healed > 0) events.push({ kind: 'enemy-healed', enemyId: enemy.id, source: 'THREAT', amount: healed });
                }
            }
            if (eff.enemyCleanse && eff.enemyCleanse > 0) {
                // Reactive cleanse — telegraphed, and it
                // sheds a FRACTION, never the last affliction. `applyCleanse`
                // names the cleansable set; only the first `enemyCleanse` of it
                // (minus the guaranteed survivor) actually leave the bearer.
                const cleansable = applyCleanse(enemy, 3).removed;
                const strip = Math.min(eff.enemyCleanse, Math.max(0, cleansable.length - 1));
                if (strip > 0) {
                    const gone = new Set(cleansable.slice(0, strip));
                    enemy = { ...enemy, effects: enemy.effects.filter(ae => !gone.has(ae)) };
                    events.push({
                        kind: 'threat-cleansed', phaseIndex: phase.index,
                        effectIds: cleansable.slice(0, strip).map(ae => ae.effectId),
                    });
                }
            }
            penaltiesApplied.push(eff);
        }
        if (blizzardSoftened > 0) events.push({ kind: 'blizzard-softened', amount: blizzardSoftened });
        // RIPOSTE counter — fires only when your Guard/Barrier FULLY blocked an
        // attack this phase (reflect class). The counter reflects the prevented
        // blow's actual size, not a flat printed number — floored at the
        // card's printed `damage` (the wall IS the weapon; bigger threats
        // become bigger paydays).
        if (riposte && attacksLanded > 0 && attacksFullyBlocked > 0 && !isDefeated(enemy)) {
            const counter = Math.round(Math.max(riposte.damage, blockedBlowTotal) * getDamageTakenMultiplier(enemy));
            if (counter > 0) {
                const hit = applyEnemyDamage(enemy, counter, state.round, events);
                enemy = hit.enemy;
                directDamage += counter + hit.clockDamage;
                events.push({ kind: 'riposte-fired', amount: counter });
            }
        }
        // The move's enemy words land after its hits, so its own WARD never
        // meets the spikes or the riposte its strikes drew.
        const words = applyEnemyWordEffects({ ...state, player, enemy }, phase.threatAction.effects);
        if (words.events.length > 0) {
            player = words.state.player;
            enemy = words.state.enemy;
            state = {
                ...state, enemyWords: words.state.enemyWords, hand: words.state.hand,
                ...(words.state.program ? { program: words.state.program } : {}),
            };
            events.push(...words.events);
        }
        events.push({ kind: 'threat-fired', phaseIndex: phase.index, description: phase.threatAction.description, effects: phase.threatAction.effects });
        // Doom growth (card-local species): enemy-borne
        // `growth: 'per-enemy-action'` DoTs deepen by 1 each time the enemy
        // actually acts — a hindered (denied) turn never feeds the Doom.
        const doomGrowth = growPerEnemyActionDots(enemy);
        if (doomGrowth.grown.length > 0) {
            enemy = doomGrowth.combatant;
            events.push({ kind: 'dots-boosted', intensity: 1, affected: doomGrowth.grown });
        }
    }

    // Mark: enemy hindered (control worked) → 'clear'; enemy acted → 'overwhelmed'.
    const mark: 'clear' | 'overwhelmed' = hindered ? 'clear' : 'overwhelmed';
    events.push({ kind: 'phase-resolved', phaseIndex: phase.index, mark });

    const result: CombatPhaseResult = {
        phaseIndex: phase.index,
        mark,
        enemyActionFired: hindered ? '' : phase.threatAction.description,
        penaltiesApplied,
    };

    const threatMarks = state.threatMarks.slice();
    if (idx < threatMarks.length) threatMarks[idx] = mark;

    let next: CombatEncounterState = {
        ...state,
        player,
        enemy,
        directDamageDealt: directDamage,
        // brace is spent on this phase's threat; resets each phase, unless a card keeps it this round
        guard: programHoldsGuard(state) ? guard : 0,
        barrier,                        // persistent soak — carries the unspent remainder across phases
        riposte: undefined,             // cleared each phase (like guard)
        // The enemy-damage ledger (rolled over between phases)
        // and the full-block verdict (persists until the NEXT threat resolves;
        // a hindered/denied threat was never blocked).
        enemyDamageThisTurn: (state.enemyDamageThisTurn ?? 0) + enemyDamageDealt,
        ...(state.program ? { program: programRecordDamage(state.program, Math.max(0, state.player.health - player.health)) } : {}),
        lastThreatFullyBlocked: !hindered && attacksLanded > 0 && attacksFullyBlocked === attacksLanded,
        phase: 'phase-resolve',
        threatMarks,
        phaseResults: [...state.phaseResults, result],
    };

    // THE COVETED DIE: a boss/unique phase authored
    // `stake: true` converts to a temp gold die the moment its telegraph is
    // fully blocked. One-time per phase index this combat
    // (`covetedDiceClaimed`) — a repeating/locked final phase can't be farmed
    // on every loop.
    if (phase.stake && !(state.covetedDiceClaimed ?? []).includes(phase.index)) {
        const method: 'block' | null =
            (attacksLanded > 0 && attacksFullyBlocked === attacksLanded) ? 'block' : null;
        if (method) {
            next = { ...next, covetedDiceClaimed: [...(next.covetedDiceClaimed ?? []), phase.index] };
            if (tableHasRoom(next)) {
                const dieId = `${COVETED_DIE_PREFIX}${next.turn}-${next.log.length}`;
                const die: CombatManaDie = {
                    id: dieId, color: 'wild', face: 'mana', state: 'available',
                    temporary: true, floating: true,
                };
                next = { ...next, dice: [...next.dice, die], floatingDice: [...(next.floatingDice ?? []), die] };
                events.push({ kind: 'coveted-die-stolen', phaseIndex: phase.index, method, dieId });
            } else {
                const conviction = Math.min(CONVICTION_CAP, next.conviction + 1);
                next = { ...next, conviction };
                events.push({ kind: 'die-overflowed', source: 'coveted', total: conviction });
                events.push({ kind: 'conviction-gained', amount: 1, total: conviction, reason: 'effect' });
                events.push({ kind: 'coveted-die-stolen', phaseIndex: phase.index, method });
            }
        }
    }

    next = withLog(next, events);

    // Outcome checks after the threat action.
    const outcome = pendingOutcome(next);
    if (outcome) return endCombat(next, outcome, events);

    // Otherwise advance to between-phases.
    return processBetweenPhases(next, rng, events);
}

/** Returns a terminal outcome if one is pending, else null (HP model). */
function pendingOutcome(state: CombatEncounterState): CombatEncounterState['finalOutcome'] {
    if (isDefeated(state.player)) return 'defeat';
    if (isDefeated(state.enemy)) return 'victory';
    return null;
}

/**
 * Between-phases processing: DoT ticks erode HP (start+end phase) on both
 * sides, effect durations tick, and the hand refills up to COMBAT_HAND_SIZE
 * (unplayed cards are KEPT — keep-hand rule). Advances the phase pointer
 * (looping the final phase so the enemy keeps attacking).
 */
export function processBetweenPhases(
    state: CombatEncounterState,
    rng: () => number = defaultRng,
    priorEvents: CombatEvent[] = [],
    bonusDraw: number = 0,
): CombatTransition {
    const events: CombatEvent[] = [];

    // 1. Per-effect DoT ticks (labeled) — computed before processing.
    //    Round-threaded so escalating DoTs (POISON ramp) tick their real value.
    const projectedEnemyDotTicks = dotTickBreakdown(state.enemy.effects, state.round);
    const projectedPlayerDotTicks = dotTickBreakdown(state.player.effects, state.round);

    // 2. Process a full round of effects on the enemy — DoT ERODES real enemy HP
    //    (the status damage engine; no track, the HP loss is the win progress).
    const enemyStart = processRoundStartEffects(state.enemy, state.round);
    const tithedExpired: ActiveEffect[] = [];
    const enemyEnd = processRoundEndEffects(enemyStart.target);
    let enemy = enemyEnd.target as Enemy;
    const enemyDotTicks = clampDotTickBreakdown(projectedEnemyDotTicks, enemyStart.dotDamage);

    // SOUL economy: every enemy affliction instance that
    // EXPIRES yields 1 Soul (consumption-side Souls are granted at the verbs).
    // Decay-consumed instances of NO-CALENDAR effects expire BY decay —
    // they owe the same Soul, so Harvest never starves when calendars go.
    const expiredAfflictions = [...enemyEnd.expired, ...tithedExpired]
        .filter(ae => lookupEffectDef(ae.effectId)?.type === 'debuff').length
        + soulWorthyWashouts(enemyStart.dotWashedOut);


    // VULNERABLE DoT surcharge: the natural tick above lands at ×1 (already
    // combo-amplified). Apply the EXTRA (mult-1) fraction the foe's vulnerability
    // adds to its DoT, as one labeled tick so the emitted dot-tick events still
    // sum to the HP that actually left the bar. No-op (and no event) when unmarked.
    const enemyVulnMult = getDamageTakenMultiplier(state.enemy);
    let vulnSurcharge = 0;
    if (enemyVulnMult > 1) {
        const mods = getActiveEffectModifiers(state.enemy.effects, state.round);
        const naturalDot = mods.dotStart;
        vulnSurcharge = Math.min(
            Math.round(naturalDot * (enemyVulnMult - 1)),
            enemy.health,
        );
        if (vulnSurcharge > 0) enemy = applyDamage(enemy, vulnSurcharge);
    }

    // 3. Process a full round of effects on the player (DoT, then expiry).
    const playerStart = processRoundStartEffects(state.player, state.round);
    const playerEnd = processRoundEndEffects(playerStart.target, 'player');
    let player = playerEnd.target as Character;
    // The death ward covers this round's DoT too, and the damage ledgers
    // roll over at the boundary.
    let ledger = state.program;
    if (ledger) {
        if (ledger.deathWardRound === state.round && player.health < 1 && state.player.health >= 1) {
            player = { ...player, health: 1 };
        }
        const dotTaken = Math.max(0, state.player.health - player.health);
        const rolled = programRollRound(programRecordDamage(ledger, dotTaken));
        ledger = programSpikeDrift(programElementDrift(rolled));
        events.push(...weatherEvents(rolled.el, ledger.el));
        events.push(...spikeEvents(rolled.spikes, ledger.spikes));
    }
    const playerDotTicks = clampDotTickBreakdown(projectedPlayerDotTicks, playerStart.dotDamage);

    for (const t of enemyDotTicks) events.push({ kind: 'dot-tick', effectId: t.effectId, label: t.label, amount: t.amount, target: 'enemy' });
    if (vulnSurcharge > 0) events.push({ kind: 'dot-tick', effectId: 'vulnerable-surcharge', label: 'Vulnerable', amount: vulnSurcharge, target: 'enemy' });
    for (const t of playerDotTicks) events.push({ kind: 'dot-tick', effectId: t.effectId, label: t.label, amount: t.amount, target: 'self' });

    // 4. Advance the phase pointer — loop the final phase so the enemy keeps acting.
    //    Rage mode: a candidate phase gated by `unlockAfterRound`
    //    isn't entered until the resolving round reaches it — the pointer
    //    holds at the current (last reachable) phase instead of advancing
    //    past it. Undefined `unlockAfterRound` is always reachable.
    const resolvedRound = state.round + 1;

    // ── STAGES resolve at the boundary ──
    // STAGES: the moment a fight becomes a different fight. Each stage fires at
    // most once; `stagesEntered` is the per-combat ledger. Authored order wins
    // ties, so a boss that crosses two thresholds in one blow enters the first
    // it authored and the second at the next boundary — the beats stay
    // legible instead of collapsing into one line of log.
    const stagesEntered = [...(state.stagesEntered ?? [])];
    let stageThreatBonus = state.stageThreatBonus ?? 0;
    // A foe with HP phases changes shape at its phase lines (below), not stages.
    if (!isDefeated(enemy) && !hasEnemyPhases(enemy)) {
        const pending = (enemy.stages ?? []).find((stage, i) => {
            if (stagesEntered.includes(i)) return false;
            const byVitae = stage.at.vitaePct !== undefined
                && enemy.maxHealth > 0
                && enemy.health <= stage.at.vitaePct * enemy.maxHealth;
            const byRound = stage.at.round !== undefined && resolvedRound >= stage.at.round;
            return byVitae || byRound;
        });
        if (pending) {
            stagesEntered.push((enemy.stages ?? []).indexOf(pending));
            events.push({ kind: 'stage-entered', enemyId: enemy.id, name: pending.name, text: pending.text });
            if (pending.cleanse) {
                // Everything the player invested in afflicting it is gone. The
                // cruellest stage effect, and the reason a DoT deck needs a
                // payoff before the threshold rather than after it.
                enemy = { ...enemy, effects: [] };
            }
            if (pending.heal !== undefined) {
                const amount = typeof pending.heal === 'number'
                    ? pending.heal
                    : Math.round(pending.heal.pct * enemy.maxHealth);
                if (amount > 0) {
                    const hpBefore = enemy.health;
                    enemy = heal(enemy, amount);
                    const healed = enemy.health - hpBefore;
                    // The stage's heal emits an event, so the bar and the
                    // ledger's "HP lost" account for it.
                    if (healed > 0) events.push({ kind: 'enemy-healed', enemyId: enemy.id, source: 'STAGE', amount: healed });
                }
            }
            if (pending.threatBonus) stageThreatBonus += pending.threatBonus;
        }
    }

    const candidateIndex = Math.min(state.currentPhaseIndex + 1, state.threatPhases.length - 1);
    const candidatePhase = state.threatPhases[candidateIndex];
    const rageGated = candidatePhase.unlockAfterRound !== undefined && resolvedRound < candidatePhase.unlockAfterRound;
    // HP PHASES: a `phases` foe walks its own loop, and on crossing a line
    // enters the next phase (one per boundary) through its DANGER. A killing
    // blow also crosses phase lines, so a defeated enemy is excluded the same
    // way the STAGES block above excludes it.
    const phasesIndex = isDefeated(enemy)
        ? null
        : nextEnemyPhaseIndex(state.threatPhases, state.currentPhaseIndex, enemy);
    const nextIndex = phasesIndex ?? (rageGated ? state.currentPhaseIndex : candidateIndex);
    if (phasesIndex !== null) {
        const from = state.threatPhases[state.currentPhaseIndex]?.enemyMove;
        const to = state.threatPhases[phasesIndex]?.enemyMove;
        if (from && to && to.phase > from.phase) {
            events.push({ kind: 'enemy-phase-entered', enemyId: enemy.id, phase: to.phase, danger: to.danger ? to.name : null });
        }
    }

    let threatPhases = state.threatPhases;
    // A branch phase commits its fork at phase START,
    // read from LIVE state (the post-tick enemy + the full-block ledger just
    // written by `resolveThreatPhase`), so the telegraph shows the taken fork
    // alongside the condition. Zero RNG. A looping final phase re-evaluates on
    // every re-entry.
    const branchCommit = commitThreatBranch(
        threatPhases, nextIndex, enemy, state.lastThreatFullyBlocked ?? false,
    );
    if (branchCommit) {
        threatPhases = branchCommit.phases;
        events.push({
            kind: 'threat-branch', phaseIndex: nextIndex,
            conditionText: branchCommit.conditionText, taken: branchCommit.taken,
        });
    }

    let omenState: CombatEncounterState = {
        ...state, player, enemy, threatPhases,
    };

    // SOULS from expiry (base law: 1 per expired enemy affliction instance).
    if (expiredAfflictions > 0) {
        omenState = gainSouls(omenState, expiredAfflictions, 'expiry', events);
    }

    // Fate Engine — RESERVE dice RIPEN: +1 pip per threat phase survived
    // (cap RESERVE_PIP_CAP). Holding a die through a telegraph is the gamble.
    let reserve = omenState.reserve ?? [];
    if (reserve.length > 0) {
        const ripened = ripenReserve(reserve);
        reserve = ripened.reserve;
        for (const id of ripened.ripenedIds) {
            events.push({ kind: 'die-ripened', dieId: id, pips: reserve.find(d => d.id === id)?.pips ?? 0 });
        }
    }

    // 5. Refill the hand up to COMBAT_HAND_SIZE (keep-hand rule):
    //    unplayed cards STAY in hand and occupy draw room, so holding a card
    //    is a real cost — a dead card clogs the hand until it is played or
    //    scrapped. `bonusDraw` lets a caller raise the refill target (no
    //    live caller does today).
    const keptHand = omenState.hand;
    const refillTarget = COMBAT_HAND_SIZE + bonusDraw;
    const draw = drawCombatCards(
        omenState.drawPile, omenState.discard, programDrawFallback(omenState),
        Math.max(0, refillTarget - keptHand.length), rng,
    );
    let uid = state.round * 100;
    const hand = [...keptHand, ...draw.drawn.map(cardId => ({ uid: `c${++uid}`, cardId }))];
    events.push({ kind: 'hand-drawn', cards: draw.drawn });

    let next: CombatEncounterState = {
        ...omenState,
        reserve,
        currentPhaseIndex: nextIndex,
        drawPile: draw.drawPile,
        discard: draw.discard,
        hand,
        phase: 'phase-play',
        round: state.round + 1,
        // The enemy-damage ledger rolls over at the turn
        // boundary: this turn's value becomes last-round's, then resets.
        enemyDamageLastRound: omenState.enemyDamageThisTurn ?? 0,
        enemyDamageThisTurn: 0,
        // New phase → fresh turn; clear the tray so the next startTurn rolls.
        dice: [],
        // Round-turn law — the phase boundary re-arms the one legal
        // tray roll for the incoming phase.
        turnTakenThisPhase: false,
        // The STAGE ledgers.
        stagesEntered,
        stageThreatBonus,
        ...(ledger ? { program: ledger } : {}),
    };
    next = withLog(next, events);
    // The round is closed: zero the enemy-DoT accumulator AFTER logging
    // (so this round's round-clock/suppuration ticks don't leak into the next
    // round's suppuration read). `startTurn` also resets it in the live game;
    // this covers back-to-back `processBetweenPhases` calls in tests.
    next = { ...next, enemyDotDamageThisRound: 0 };

    // 6. Outcome checks after ticks.
    const outcome = pendingOutcome(next);
    if (outcome) return endCombat(next, outcome, [...priorEvents, ...events]);

    // 9. Safety cap — a degenerate stalemate resolves as defeat (couldn't close).
    if (next.round > MAX_PHASES) return endCombat(next, 'defeat', [...priorEvents, ...events]);

    return { state: next, events: [...priorEvents, ...events] };
}

interface DotTick { effectId: string; label: string; amount: number; }
/**
 * Per-effect DoT amounts for the labeled `dot-tick` events. Routes through
 * `getActiveDotTotal` so each emitted amount is the COMBO-AMPLIFIED HP that
 * actually leaves the bar (poison+bleed → Hemorrhage etc.), not the raw
 * `damagePerRound × intensity`. Equal to the raw value for un-amplified integer
 * DoTs (floor(x×1) === x).
 */
function dotTickBreakdown(effects: readonly ActiveEffect[], currentRound?: number): DotTick[] {
    // Event-clocked DoTs never tick at the round boundary — drop their
    // ENTRIES (after the full-array amp/MARK pass, matching the aggregator's
    // math exactly) so the emitted round `dot-tick` events sum to the HP that
    // actually left the bar (projection-truth law).
    return getActiveDotTotal(effects as ActiveEffect[], currentRound).perEffect
        .filter(e => {
            const dot = lookupEffectDef(e.effectId)?.payload.damageOverTime;
            return !dot || ticksOnRoundClock(dot);
        })
        .map(e => ({ effectId: e.effectId, label: e.label, amount: e.amount }));
}

/** Allocate actual HP loss across labeled receipts in stable effect order. */
function clampDotTickBreakdown(ticks: readonly DotTick[], actualDamage: number): DotTick[] {
    let remaining = Math.max(0, actualDamage);
    return ticks.flatMap(tick => {
        const amount = Math.min(tick.amount, remaining);
        remaining -= amount;
        return amount > 0 ? [{ ...tick, amount }] : [];
    });
}

// ── Batch entry point (resolveCombatPhase) ───────────────────────────────────

/**
 * The first die that can LEGALLY power `card`'s paid line right now, in the
 * order a player reaches for them: a live tray die (available, not a miss
 * face, colour-law legal), then a Reserve die, then a floating (GHOST /
 * surge) die. Null when no die can power it. Used by `resolveCombatPhase`
 * for plays submitted without a `dieId`, and by the CLI auto-player.
 */
export function firstLegalPoweringDie(
    state: CombatEncounterState,
    card: Pick<CombatCard, 'stance'>,
): CombatManaDie | null {
    const tray = state.dice.find(d =>
        !d.floating && d.state === 'available' && d.face !== 'miss' && dieSatisfiesColorLaw(d, card.stance));
    if (tray) return tray;
    const banked = (state.reserve ?? []).find(d => dieSatisfiesColorLaw(d, card.stance));
    if (banked) return banked;
    return state.dice.find(d =>
        d.floating && d.state === 'available' && dieSatisfiesColorLaw(d, card.stance)) ?? null;
}

/**
 * Applies a batch of card plays then resolves the current threat phase — the
 * top-level entry point. The phase's one tray roll happens on entry (when not
 * yet taken); a bottom play submitted without a `dieId` is powered by
 * `firstLegalPoweringDie` (a colour-legal live tray die, then Reserve, then
 * floating), so callers can express a plan as a card list. Plays stop early
 * if an outcome fires mid-batch.
 */
export function resolveCombatPhase(
    state: CombatEncounterState,
    cardsPlayed: CardPlay[],
    rng: () => number = defaultRng,
): CombatTransition {
    let working = state;
    if (working.phase === 'reveal' || working.phase === 'dice-roll') {
        working = rollEncounterDice(working, rng).state;
    }
    const allEvents: CombatEvent[] = [];
    for (const play of cardsPlayed) {
        if (working.phase !== 'phase-play') break;
        let dieId = play.dieId;
        if (play.useBottom) {
            // Round-turn law — roll the phase's ONE tray only if it
            // hasn't been rolled yet; a re-roll is illegal.
            if (!working.turnTakenThisPhase) {
                const started = startTurn(working, rng);
                working = started.state; allEvents.push(...started.events);
            }
            if (dieId === undefined) {
                const card = getCard(play.cardId);
                if (card) dieId = firstLegalPoweringDie(working, card)?.id;
            }
        }
        const res = playCombatCard(
            working, { uid: play.uid, cardId: play.cardId }, play.useBottom, dieId, rng,
        );
        working = res.state;
        allEvents.push(...res.events);
        if (working.finalOutcome) return { state: working, events: allEvents };
    }
    if (working.phase !== 'phase-play') return { state: working, events: allEvents };
    const resolved = resolveThreatPhase(working, rng);
    return { state: resolved.state, events: [...allEvents, ...resolved.events] };
}

// ── Mercy choice ─────────────────────────────────────────────────────────────

/**
 * Resolves the spare/exploit mercy choice opened by a successful Befriend
 * (`checkImmediateOutcome`). `spare` confirms the friendship (mercy) end; `exploit`
 * trades the opening for a heavy strike that may finish the enemy.
 */
export function selectMercyChoice(
    state: CombatEncounterState,
    choice: 'spare' | 'exploit',
): CombatTransition {
    if (!state.mercyChoiceActive) return { state, events: [] };
    if (choice === 'spare') {
        const ended: CombatEncounterState = { ...state, phase: 'complete', finalOutcome: 'mercy', mercyChoiceActive: false };
        const ev: CombatEvent = { kind: 'combat-ended', outcome: 'mercy' };
        return { state: withLog(ended, [ev]), events: [ev] };
    }
    // Exploit — a free heavy strike. Resolve to victory if it kills.
    const strike = Math.max(10, Math.round(state.enemy.maxHealth * 0.5));
    const enemy = applyDamage(state.enemy, strike);
    const events: CombatEvent[] = [
        { kind: 'damage-dealt', cardId: 'mercy-exploit', target: 'enemy', amount: strike },
    ];
    let next: CombatEncounterState = { ...state, enemy, mercyChoiceActive: false, phase: 'phase-play' };
    if (isDefeated(enemy)) {
        return endCombat(withLog(next, events), 'victory', events);
    }
    // Survived the exploit — combat continues from phase-play.
    next = withLog(next, events);
    return { state: next, events };
}

// ── Signature Skills ─────────────────────────────────────────────────────────

/**
 * Casts a signature skill, spending Conviction (◆). Always available regardless
 * of the hand. Refused (no-op + a fizzle event, nothing spent) when
 * `signatureCastBlock` names a reason: too little Conviction, or The Open Hand
 * on a foe that can't be befriended yet.
 */
export function playSignatureSkill(
    state: CombatEncounterState,
    signatureId: string,
): CombatTransition {
    if (state.phase !== 'phase-play') return { state, events: [] };
    const skill = getSignatureSkill(signatureId);
    if (!skill) return { state, events: [] };
    const block = signatureCastBlock(state, skill);
    if (block) {
        const events: CombatEvent[] = [{ kind: 'effect-fizzled', cardId: skill.id, effectId: '', message: block }];
        return { state: withLog(state, events), events };
    }

    const spent: CombatEncounterState = { ...state, conviction: state.conviction - skill.cost };
    const applied = applySignatureSkill(spent, skill);
    const events: CombatEvent[] = [
        { kind: 'signature-cast', signatureId: skill.id, name: skill.name, cost: skill.cost },
        ...applied.events,
    ];
    const next = withLog(applied.state, events);
    return checkImmediateOutcome(next, events);
}

/** The baseline signature kit (for the presenter / UI bar). */
export {
    SIGNATURE_SKILLS, SIGNATURE_SKILL_LIST, getSignatureSkill,
    signatureCastBlock,
} from './combat.signature';

// ── Summary ──────────────────────────────────────────────────────────────────

export { buildCombatSummary } from './combat.attribution';

// ── Convenience selectors for the presenter ──────────────────────────────────

/** Cards in hand, projected to their views (for the UI hand display). */
export function handCards(state: CombatEncounterState): Array<{ uid: string; card: CombatCard }> {
    // The hand prints FINAL numbers: each card is built from its
    // stat-scaled copy (display only; play always executes the library card).
    const stats = state.player.baseStats;
    const scaledLookup = (id: string) => {
        const c = lookupCard(id);
        return c ? scaleCardForStats(c, stats) : c;
    };
    return state.hand
        .map(h => ({ uid: h.uid, card: toCombatCard(h.cardId, scaledLookup, lookupEffectDef) }))
        .filter((x): x is { uid: string; card: CombatCard } => x.card !== null);
}

/** Count of available (non-X) dice — surfaced for the dice board. */
export function availableDice(state: CombatEncounterState): number {
    return availableDieCount(state.dice);
}

// ── Presenter selectors (the engine owns truth; the UI hides) ────────────────

/**
 * UI preview: there is no immediate-strike number. `amount` is always 0; the card's honest numbers live in its
 * printed FREE/PAID text and the DoT lifetime preview. Kept for the mobile
 * presenter contract.
 */
export function projectCardImpact(
    _state: CombatEncounterState,
    card: CombatCard,
): { track: 'dot' | 'control' | 'none'; amount: number } {
    return { track: card.effectKind, amount: 0 };
}

/**
 * The floating-die colors to WRITE BACK to the character save
 * at combat end (they persist across combats until spent). Excludes
 * `temporary` floats (the momentum surge die, the coveted die): momentum
 * never survives past the fight it was earned in.
 */
export function getFloatingDiceColors(
    state: CombatEncounterState,
): ('heart' | 'body' | 'mind' | 'wild')[] {
    return (state.floatingDice ?? [])
        .filter(d => !d.temporary)
        .map(d => d.color)
        .filter((c): c is 'heart' | 'body' | 'mind' | 'wild' => c !== 'x');
}

// ── Honesty selectors (the engine owns the rule) ─────────────────────────────

/** VULNERABLE — the foe's live incoming-damage multiplier (×1 when unmarked).
 *  Mobile reads the real "+X% damage" off this; never hard-codes it. */
export function getEnemyIncomingDamageMultiplier(state: CombatEncounterState): number {
    return getDamageTakenMultiplier(state.enemy);
}

/**
 * Wall-math projection — what the CURRENTLY
 * telegraphed hit would actually deal right now, netted against live
 * guard/barrier. `IntentIcon` today shows only the raw, unscaled
 * `phase.threatAction.effects` damage sum; this selector runs that same raw
 * total through the live escalation / outgoing-damage
 * multiplier stack `resolveThreatPhase` applies, then nets guard/barrier —
 * the actual number the player is about to take, or 0 if the turn will be
 * denied outright. Approximates a phase's damage as a single hit (matching
 * `intentVM`'s existing raw-sum granularity) — a phase with more than one
 * damaging effect is summed before scaling, not scaled per-effect like the
 * real resolution; a known, documented simplification.
 *
 * KNOWN DIVERGENCES from `resolveThreatPhase`, documented rather than closed —
 * closing them moves the on-screen number for every existing foe and is its own
 * tuning change, not a side effect of adding a keyword. The boss term here
 * omits `state.stageThreatBonus`, so against a staged foe it UNDERSTATES.
 *
 * The guard / barrier soak runs through the same `soakFlatHit`
 * the engine applies.
 */
export function projectIncomingThreat(state: CombatEncounterState): {
    rawDamage: number; projectedDamage: number; willDeny: boolean; guard: number; barrier: number; netDamage: number;
    /** What BLIZZARD takes off this phase's hits, as the engine applies it (0 with none or a denied turn). */
    blizzardCut: number;
} {
    const idx = Math.min(state.currentPhaseIndex, state.threatPhases.length - 1);
    const phase = state.threatPhases[idx];
    const rawDamage = phase.threatAction.effects.reduce((s, e) => s + (e.damage ?? 0), 0);

    const act = canAct(state.enemy.effects as ActiveEffect[]);
    const isBossTier = state.enemy.difficulty === 'boss' || state.enemy.difficulty === 'unique';
    const willDeny = !act.canAct;

    const escalationRate = THREAT_ESCALATION_PER_ROUND * (isBossTier ? THREAT_ESCALATION_BOSS_MULT : 1);
    const escalation = !escalationApplies(state.enemy) ? 1
        : Math.min(THREAT_ESCALATION_MAX, 1 + escalationRate * Math.max(0, state.round - THREAT_ESCALATION_GRACE));
    const enemyOutgoingMult = getOutgoingDamageMult(state.enemy);
    const playerTakenMult = getDamageTakenMultiplier(state.player);

    const blizzard = state.program?.el?.blizzard ?? 0;
    const blizzardCut = willDeny || blizzard <= 0 ? 0
        : threatHits(state).reduce((sum, h) => sum + Math.min(h, blizzard), 0);
    const projectedDamage = willDeny ? 0 : blizzard > 0
        // BLIZZARD takes n off each hit, as the engine applies it.
        ? threatHits(state).reduce((sum, h) => sum + Math.max(0, h - blizzard), 0)
        : Math.round(rawDamage * THREAT_DAMAGE_SCALE * escalation * enemyOutgoingMult * playerTakenMult);

    const guard = state.guard ?? 0;
    const barrier = state.barrier ?? 0;
    const riposte = state.riposte ?? null;
    let remaining = projectedDamage;
    if (riposte && riposte.reduce > 0) remaining = Math.max(0, remaining - riposte.reduce);
    // The foe's hit goes through the SAME `soakFlatHit` the engine
    // applies. RIPOSTE stays outside the helper (a one-shot parry on the foe's
    // own swing), applied first as the engine does.
    remaining = soakFlatHit(remaining, { guard, barrier }).dealt;

    return {
        rawDamage, projectedDamage, willDeny, guard, barrier, netDamage: remaining, blizzardCut,
    };
}

/** The consolidated status kill-path readout:
 *  pending DoT, and whether it alone kills the foe and in how many rounds.
 *  Pure selector — no `CombatEvent`, no state mutation; call it on demand
 *  from a presenter. */
export interface CombatOutcomeProjection {
    pendingDot: number;
    roundsToKill: number | null;
    isLethalInFlight: boolean;
}

export function projectCombatOutcome(state: CombatEncounterState): CombatOutcomeProjection {
    const pendingDot = getPendingDotTotal(state.enemy, state.round).total;
    const roundsToKill = computeRoundsToKill(state.enemy, state.round);
    return { pendingDot, roundsToKill, isLethalInFlight: roundsToKill !== null };
}

/** Re-export for presenters that need to check die affordability directly. */
export { combatDieCanPower, availableDiceFor, effectImpact, cardStanceColor, riderText };

/** The engine pieces `combat.card-program.ts` needs, passed in so that
 *  module never imports the engine. */
export const PROGRAM_KIT: ProgramKit = {
    convictionCap: CONVICTION_CAP,
    incomingNet: (state: CombatEncounterState) => projectIncomingThreat(state).netDamage,
    incomingHits: (state: CombatEncounterState) => threatHits(state),
};

/**
 * The foe's hits this phase, each as the engine sizes it (the clock,
 * the outgoing and taken multipliers, the stage bonus) before BLIZZARD and
 * soak. Empty when the foe is denied its turn.
 */
export function threatHits(state: CombatEncounterState): number[] {
    const idx = Math.min(state.currentPhaseIndex, state.threatPhases.length - 1);
    const phase = state.threatPhases[idx];
    if (!canAct(state.enemy.effects as ActiveEffect[]).canAct) return [];
    const isBossTier = state.enemy.difficulty === 'boss' || state.enemy.difficulty === 'unique';
    const escalationRate = THREAT_ESCALATION_PER_ROUND * (isBossTier ? THREAT_ESCALATION_BOSS_MULT : 1);
    const escalation = !escalationApplies(state.enemy) ? 1
        : Math.min(THREAT_ESCALATION_MAX, 1 + escalationRate * Math.max(0, state.round - THREAT_ESCALATION_GRACE));
    const mult =escalation * getOutgoingDamageMult(state.enemy)
        * (1 + Math.min(STAGE_THREAT_BONUS_CAP, state.stageThreatBonus ?? 0))
        * getDamageTakenMultiplier(state.player);
    return phase.threatAction.effects
        .filter(e => (e.damage ?? 0) > 0)
        .map(e => Math.round((e.damage as number) * THREAT_DAMAGE_SCALE * mult));
}

/**
 * Why a program card's FREE (`paid` false) or PAID line cannot be played
 * right now, in the words the game says it (null = it can). The die and the
 * Color Law are not part of it. Null for a card without a program.
 *
 * @param x - The amount chosen for a "SACRIFICE any amount" line.
 * @example programLineBlock(state, 'c3', false) // 'that SACRIFICE would leave you below 1 VITAE'
 */
export function programLineBlock(state: CombatEncounterState, uid: string, paid: boolean, x?: number): string | null {
    const entry = state.hand.find(h => h.uid === uid);
    if (!entry || !isProgramCard(entry.cardId)) return null;
    return programIllegalReason(state, uid, paid, PROGRAM_KIT, x);
}

/**
 * The SACRIFICE a program card's FREE (`paid` false) or PAID line cannot pay
 * right now: `{ cost, vitae }`, non-null exactly when `programLineBlock`
 * refuses the line at the SACRIFICE floor. Null for a card without a program.
 *
 * @param x - The amount chosen for a "SACRIFICE any amount" line.
 * @example programLineShortfall(state, 'c3', true) // { cost: 4, vitae: 4 }
 */
export function programLineShortfall(
    state: CombatEncounterState, uid: string, paid: boolean, x?: number,
): ProgramShortfall | null {
    const entry = state.hand.find(h => h.uid === uid);
    if (!entry || !isProgramCard(entry.cardId)) return null;
    return programShortfall(state, uid, paid, PROGRAM_KIT, x);
}

/**
 * The random discard a program card's FREE (`paid` false) or PAID line
 * cannot pay right now: `{ discard, held }`, non-null exactly when
 * `programLineBlock` refuses the line for its discard. Null for a card
 * without a program.
 *
 * @example programLineDiscardShortfall(state, 'c3', true) // { discard: 2, held: 1 }
 */
export function programLineDiscardShortfall(
    state: CombatEncounterState, uid: string, paid: boolean,
): DiscardShortfall | null {
    const entry = state.hand.find(h => h.uid === uid);
    if (!entry || !isProgramCard(entry.cardId)) return null;
    return programDiscardShortfall(state, uid, paid, PROGRAM_KIT);
}

/** The amounts a program card's "SACRIFICE any amount" PAID line accepts
 *  right now, or null when it has none. */
export function programXChoice(state: CombatEncounterState, uid: string): { min: number; max: number } | null {
    return programXRange(state, uid, true, PROGRAM_KIT);
}
