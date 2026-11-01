/**
 * Objective function v2 — the RAW COUNTERS.
 *
 * This module owns the *measurement*; `combat.objective.ts` owns the *score*.
 * Splitting them is deliberate: the counters are engine-shaped (they read the
 * combat event transcript and the enemy-HP series) and change when the engine
 * changes; the score is pure arithmetic over those counters and is the thing a
 * balance pass argues about. Keeping the arithmetic free of engine imports is
 * what makes the score unit-testable without running a fight.
 *
 * Every counter here is additive across encounters, so a stage/preset rollup
 * MERGES telemetry and RE-SCORES it (`mergeObjectiveTelemetry` →
 * `scoreCombatObjective`) instead of averaging per-cell scores. Averaging
 * scores of nonlinear terms is wrong; pooling the counters is not.
 *
 * LOCKED MECHANICS (bearings § "LOCKED MECHANICS"):
 * Conviction, the Surge meter and the Dice system are permanent. The three
 * blocks below are their first-class measurement surface — they are read from
 * the systems' OWN events, so a card library that routes around a system
 * produces zeroes in that system's block and cannot score them back. That cuts
 * both ways and is the standing hazard here (audit 3.8): a sink the fold does
 * not read scores as evasion even when the fight PLAYED the system hard, so
 * every new Conviction/Surge/Dice verb has to be folded in when it ships.
 *
 * Pure + hermetic: no RNG, no I/O, no clock. Reads only the transcript it is
 * handed.
 */

import type { CombatEvent } from './combat.encounter.types';
import { SURGE_DIE_PREFIX } from './combat.upgradeable-dice';

/**
 * Dice-system verbs whose PRESENCE (not volume) proves the dice economy was
 * actually PLAYED rather than merely rolled: banking, ripening, forging,
 * converting, floating, refreshing, cracking and overflowing. A deck that only rolls-and-spends touches none
 * of them — that is the failure mode the breadth term exists to catch.
 *
 * Order is stable so the derived breadth count is deterministic.
 */
export const DICE_ECONOMY_VERBS = Object.freeze([
    'die-banked', 'die-ripened', 'die-forged', 'die-converted', 'die-floated',
    'die-refreshed', 'die-cracked', 'die-overflowed',
] as const);

const DICE_ECONOMY_VERB_SET: ReadonlySet<string> = new Set<string>(DICE_ECONOMY_VERBS);

/**
 * Raw, mergeable counters behind `combatQualityIndex`. Flat numbers plus two
 * keyed records (both merged key-wise) so the whole struct survives a JSON
 * round trip through the playtest report and the stamped baseline.
 */
export interface CombatObjectiveTelemetry {
    /** Encounters folded into these counters. */
    runs: number;
    /** Total rounds across those encounters (the per-round denominators). */
    rounds: number;

    // ── LOCKED MECHANIC 1 — CONVICTION ───────────────────────────────────────
    /** Σ `conviction-gained`.amount — every income source (BOON, yield,
     *  overflow, scrap, card effects). */
    convictionGained: number;
    /** Σ `signature-cast`.cost — Conviction actually CONVERTED into a play
     *  by the sink the powered sim can reach.
     *  KNOWN GAP (audit 3.8, filed rather than fixed here): `omen-declared`
     *  .ante is a second live sink — two shipped trial cards carry
     *  `anteConviction` — and is not folded yet, so a deck that antes omens
     *  still under-reports its spend. */
    convictionSpent: number;
    /** `signature-cast` count. */
    signatureCasts: number;
    /** `special-fired` count: the worn weapon's special paying on use (Conviction, DEAL, HEAL, GUARD, INFERNO or VULNERABLE). */
    specialsFired: number;

    // ── LOCKED MECHANIC 2 — THE SURGE METER ──────────────────────────────────
    /** Chain steps that advanced without completing: `momentum-advanced`. */
    momentumAdvances: number;
    /** `momentum-broken` — a chain thrown away by an off-successor stance. */
    momentumBreaks: number;
    /** Completed chains: `momentum-surged` +
     *  `die-overflowed` with source `'surge'` (a surge the table had no room
     *  for still COMPLETED — crediting it keeps a full table from reading as
     *  chain failure). */
    surges: number;
    /** Surge dice actually spent to power a line (`die-spent` /
     *  `floating-die-spent` on a `SURGE_DIE_PREFIX` id) — the surge REALIZED,
     *  not merely minted. Reported; not scored (a surge banked for the next
     *  round is legitimate play). */
    surgeDiceSpent: number;

    // ── LOCKED MECHANIC 3 — THE DICE SYSTEM ──────────────────────────────────
    /** Σ dice in `dice-rolled` + `turn-dice-rolled` — the tray's gross supply. */
    diceRolled: number;
    /** `die-spent` + `floating-die-spent` — dice converted into paid lines. */
    diceSpent: number;
    /** Per-verb counts over `DICE_ECONOMY_VERBS`; the score reads the number of
     *  DISTINCT verbs touched (breadth), the raw counts ride along for reports. */
    diceEconomyVerbs: Record<string, number>;

    // ── ARC ──────────────────────────────────────────────────────────────────
    /** Runs that produced a usable damage centroid (≥2 rounds and nonzero
     *  enemy-HP loss). The arc denominator — never `runs`. */
    arcRuns: number;
    /** Σ per-run normalized damage centroid (see `damageCentroid`). */
    arcCentroidSum: number;

    // ── DECISION WIDTH ───────────────────────────────────────────────────────
    /** Powered-play decision points observed (one per die the driver actually
     *  spent a card on). */
    decisionPoints: number;
    /** Σ LEGAL card options at those decision points (hand entries whose
     *  stance matches the powering die and that have not already fizzled). */
    liveOptions: number;

    // ── DECK IDENTITY ────────────────────────────────────────────────────────
    /** Attributed enemy-HP damage per card id (`dotDamage + damageDealt`, the
     *  same ledger the `dominantCardShare` witness reads). */
    damageByCard: Record<string, number>;
}

/** A zeroed accumulator. */
export function emptyObjectiveTelemetry(): CombatObjectiveTelemetry {
    return {
        runs: 0,
        rounds: 0,
        convictionGained: 0,
        convictionSpent: 0,
        signatureCasts: 0,
        specialsFired: 0,
        momentumAdvances: 0,
        momentumBreaks: 0,
        surges: 0,
        surgeDiceSpent: 0,
        diceRolled: 0,
        diceSpent: 0,
        diceEconomyVerbs: {},
        arcRuns: 0,
        arcCentroidSum: 0,
        decisionPoints: 0,
        liveOptions: 0,
        damageByCard: {},
    };
}

/** Adds `from` into `into` IN PLACE (the hot path used per run / per cell). */
export function addObjectiveTelemetry(
    into: CombatObjectiveTelemetry,
    from: CombatObjectiveTelemetry,
): CombatObjectiveTelemetry {
    into.runs += from.runs;
    into.rounds += from.rounds;
    into.convictionGained += from.convictionGained;
    into.convictionSpent += from.convictionSpent;
    into.signatureCasts += from.signatureCasts;
    into.specialsFired += from.specialsFired;
    into.momentumAdvances += from.momentumAdvances;
    into.momentumBreaks += from.momentumBreaks;
    into.surges += from.surges;
    into.surgeDiceSpent += from.surgeDiceSpent;
    into.diceRolled += from.diceRolled;
    into.diceSpent += from.diceSpent;
    into.arcRuns += from.arcRuns;
    into.arcCentroidSum += from.arcCentroidSum;
    into.decisionPoints += from.decisionPoints;
    into.liveOptions += from.liveOptions;
    for (const [verb, n] of Object.entries(from.diceEconomyVerbs)) {
        into.diceEconomyVerbs[verb] = (into.diceEconomyVerbs[verb] ?? 0) + n;
    }
    for (const [cardId, dmg] of Object.entries(from.damageByCard)) {
        into.damageByCard[cardId] = (into.damageByCard[cardId] ?? 0) + dmg;
    }
    return into;
}

/** Pure merge — `a + b` as a fresh struct (stage/preset rollups). */
export function mergeObjectiveTelemetry(
    a: CombatObjectiveTelemetry,
    b: CombatObjectiveTelemetry,
): CombatObjectiveTelemetry {
    const out = emptyObjectiveTelemetry();
    addObjectiveTelemetry(out, a);
    addObjectiveTelemetry(out, b);
    return out;
}

/** Pooled telemetry for a whole collection (stage summaries, preset rows). */
export function poolObjectiveTelemetry(
    parts: Iterable<CombatObjectiveTelemetry>,
): CombatObjectiveTelemetry {
    const out = emptyObjectiveTelemetry();
    for (const part of parts) addObjectiveTelemetry(out, part);
    return out;
}

/**
 * The normalized time-centroid of the enemy's HP loss across one encounter —
 * the ARC reading.
 *
 * `hpSamples` is the enemy's HP sampled at every round boundary, oldest first,
 * with the post-fight value last (so `n = hpSamples.length - 1` intervals).
 * Interval `i` is placed at normalized time `(i + 0.5) / n` and weighted by the
 * HP it removed; the centroid is their weighted mean.
 *
 *   - uniform damage every round            → 0.50
 *   - a linear setup→payoff ramp            → ~0.67
 *   - everything in round one, then coasting→ →0
 *
 * Returns `null` when the fight is too short to have an arc (fewer than two
 * intervals) or removed no HP at all — those runs are excluded from the arc
 * denominator rather than scored as a flat 0.5.
 */
export function damageCentroid(hpSamples: readonly number[]): number | null {
    const intervals = hpSamples.length - 1;
    if (intervals < 2) return null;
    let weighted = 0;
    let total = 0;
    for (let i = 0; i < intervals; i++) {
        const loss = Math.max(0, hpSamples[i] - hpSamples[i + 1]);
        if (loss <= 0) continue;
        weighted += loss * ((i + 0.5) / intervals);
        total += loss;
    }
    if (total <= 0) return null;
    return weighted / total;
}

/**
 * Folds one encounter's transcript into `into` (in place). Reads ONLY the
 * locked-mechanic events — everything else in the score comes from the caller
 * (rounds, arc samples, decision width, the attribution ledger).
 */
export function foldObjectiveEvents(
    events: readonly CombatEvent[],
    into: CombatObjectiveTelemetry,
): CombatObjectiveTelemetry {
    for (const ev of events) {
        // ── Conviction ──────────────────────────────────────────────────────
        if (ev.kind === 'conviction-gained') into.convictionGained += ev.amount;
        else if (ev.kind === 'signature-cast') {
            into.convictionSpent += ev.cost;
            into.signatureCasts++;
        } else if (ev.kind === 'special-fired') into.specialsFired++;

        // ── Surge / momentum (both dice models) ─────────────────────────────
        if (ev.kind === 'momentum-advanced') into.momentumAdvances++;
        else if (ev.kind === 'momentum-broken') into.momentumBreaks++;
        else if (ev.kind === 'momentum-surged') into.surges++;
        else if (ev.kind === 'die-overflowed' && ev.source === 'surge') into.surges++;

        // ── Dice ────────────────────────────────────────────────────────────
        if (ev.kind === 'dice-rolled' || ev.kind === 'turn-dice-rolled') {
            into.diceRolled += ev.dice.length;
        } else if (ev.kind === 'die-spent' || ev.kind === 'floating-die-spent') {
            into.diceSpent++;
            if (ev.dieId.startsWith(SURGE_DIE_PREFIX)) into.surgeDiceSpent++;
        }
        if (DICE_ECONOMY_VERB_SET.has(ev.kind)) {
            into.diceEconomyVerbs[ev.kind] = (into.diceEconomyVerbs[ev.kind] ?? 0) + 1;
        }
    }
    return into;
}

/** Distinct `DICE_ECONOMY_VERBS` the telemetry actually observed (0–9). */
export function diceEconomyBreadth(telemetry: CombatObjectiveTelemetry): number {
    let n = 0;
    for (const verb of DICE_ECONOMY_VERBS) {
        if ((telemetry.diceEconomyVerbs[verb] ?? 0) > 0) n++;
    }
    return n;
}
