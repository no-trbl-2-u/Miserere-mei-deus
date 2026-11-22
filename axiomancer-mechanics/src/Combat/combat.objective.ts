/**
 * OBJECTIVE FUNCTION v2 — the Combat Quality Index.
 *
 * ─── The decision ───────────────────────────────────────────────────────────
 *
 * `statusEngagement` measures how much of a fight ran on status play. It is
 * computed and reported beside this score (other suites assert on it, and it
 * is a useful warning light), but it is not what "good" means.
 *
 * What "good combat" means, in one sentence:
 *
 *   > A fight is GOOD when the deck's own engine runs — its loop assembles
 *   > across turns instead of firing at once (ARC), the player has more than
 *   > one live line at each powering die (WIDTH), a lead card carries the kill
 *   > without becoming the whole deck (IDENTITY), and all of it flows through
 *   > the three permanent systems: Conviction, the Surge meter, the Dice
 *   > (SPINE).
 *
 * That yields ONE named score, `combatQualityIndex` (CQI, 0–1), with four
 * explicitly weighted components, every one of them reported individually.
 *
 * **Win rate is deliberately NOT a term.** CQI grades HOW the fight played,
 * not WHETHER a deck should win at a stage. Folding win
 * rate in would make a good fight on the `impossible` stage unscoreable and
 * make one number pretend to be both the target and the diagnosis.
 *
 * **Rejected as standalone components:**
 *   - *Comeback frequency* — needs a lead/trail model the HP-only win condition
 *     does not provide, and the sim policies are instruments, not players, so a
 *     "comeback" would measure the driver's guard counters, not the design.
 *   - *Win-path diversity* — already first-class as `winPathCounts`, and it is
 *     a property of the LIBRARY, not of a fight's quality.
 * Both remain reported elsewhere; neither is part of the objective.
 *
 * ─── The locked-mechanics guard ─────────────────────────────────────────────
 *
 * Bearings § "LOCKED MECHANICS" requires that Conviction,
 * the Surge meter and the Dice system be first-class terms such that a deck
 * ignoring them scores WORSE, and that a later balance pass cannot tune them
 * into irrelevance. Three mechanisms enforce that here:
 *
 *   1. `SPINE` is the LARGEST single weight (0.40) — larger than the other
 *      three components combined would need to be to compensate.
 *   2. Each locked system is its own sub-term with a POSITIVE sub-weight, and
 *      each sub-term is a GEOMETRIC mean of "is it fed" × "is it used", so
 *      ignoring a system scores that system 0 rather than "average".
 *   3. `assertLockedMechanicsFirstClass` runs on EVERY score call. Dropping a
 *      locked term, zero-weighting it, or pushing the spine weight below
 *      `LOCKED_SPINE_WEIGHT_FLOOR` throws instead of quietly producing a
 *      number. Grep `LOCKED_MECHANIC_TERMS` to find the guard.
 *
 * Pure arithmetic: no engine imports, no RNG, no I/O — unit-testable without
 * running a fight.
 */

import { clamp } from '../Utils';
import {
    diceEconomyBreadth, type CombatObjectiveTelemetry,
} from './combat.objective.telemetry';

// ─── The locked systems ──────────────────────────────────────────────────────

/** The three permanently-locked combat systems, as the score's own term ids.
 *  Changing this list is a `[needs-user-call]`, not a tuning decision. */
export const LOCKED_MECHANIC_TERMS = Object.freeze(['conviction', 'surge', 'dice'] as const);

export type LockedMechanicTerm = (typeof LOCKED_MECHANIC_TERMS)[number];

/** The floor under the SPINE weight. Below this the locked systems are no
 *  longer first-class and the score refuses to compute. */
export const LOCKED_SPINE_WEIGHT_FLOOR = 0.25;

// ─── Weights ─────────────────────────────────────────────────────────────────

export interface CombatQualityWeights {
    /** Locked-mechanics utilization (Conviction + Surge + Dice). */
    spine: number;
    /** Per-turn arc shape — does the fight develop, or fire at once? */
    arc: number;
    /** Decision width — how many live lines at each powering die. */
    width: number;
    /** Deck identity — a lead card, not a monoculture and not a vacuum. */
    identity: number;
}

/**
 * THE WEIGHTS, and why.
 *
 * `spine` **0.40** — the largest term by design. Every other thing the
 * metric could anchor on (cards, keywords, theme, damage
 * model) is explicitly mutable; Conviction, Surge and Dice are the only
 * structure T locked as permanent. Anchoring the objective function on the
 * only fixed points in the game is the one choice that cannot rot. At 0.40 the
 * other three components sum to 0.60, so a spine-blind deck cannot reach a
 * passing score by excelling everywhere else — which is exactly the
 * locked-mechanics guard.
 *
 * `arc` **0.25** — the second-largest, because `statusEngagement` is
 * volume-based and arc-blind. A deck built as a setup→payoff engine shows a
 * developing damage profile; a flat one means the engine is not being played
 * as designed, and no other term sees that.
 *
 * `width` **0.20** — the other named blind spot (a metric that rewards more
 * applications without more DECISIONS is a failed metric). Ranked below arc
 * because it measures the OPPORTUNITY for a decision, not the decision: the
 * sim policies are deterministic instruments, so width bounds what a human
 * could have chosen among and cannot prove they chose well.
 *
 * `identity` **0.15** — the smallest, because it is the most confounded by
 * enemy mix and deck size. It exists to keep two measured failure modes
 * visible: single-card spam (`dominantCardShare` > 0.70, the card-tuning loop §4
 * flag) and its mirror, a fight the generic engine won while the deck watched.
 *
 * The four sum to 1.0 so the index reads as a fraction. Retuning them is a
 * legitimate balance act EXCEPT where `assertLockedMechanicsFirstClass`
 * forbids it.
 */
export const COMBAT_QUALITY_WEIGHTS: Readonly<CombatQualityWeights> = Object.freeze({
    spine: 0.40,
    arc: 0.25,
    width: 0.20,
    identity: 0.15,
});

/** The three locked systems split the SPINE weight evenly. Even by intent: no
 *  ruling ranks them, and an uneven split would be the first step toward
 *  tuning one of them out. */
export const SPINE_SUBWEIGHTS: Readonly<Record<LockedMechanicTerm, number>> = Object.freeze({
    conviction: 1 / 3,
    surge: 1 / 3,
    dice: 1 / 3,
});

// ─── Calibration constants ───────────────────────────────────────────────────

/**
 * INSTRUMENT CALIBRATION, in the spirit of `CURVE_SHAPE_TOLERANCES`: these are
 * the reference points each raw rate is scored against, chosen from the shipped
 * engine's own structure and then sanity-checked against a live matrix sweep.
 * They are a reading of the design, not doctrine — ratchet them as the library
 * is proven, but never loosen one to make a failing deck pass. That is a
 * FINDING, not a reason to move the target.
 */
export const COMBAT_QUALITY_CALIBRATION = Object.freeze({
    /** ◆ income per round that counts as "the Conviction economy is fed".
     *  Two: an unpicked-die bank plus a read win is the ordinary good round. */
    convictionIncomePerRound: 2,
    /** Share of earned ◆ that must be SPENT for the resource to count as live.
     *  Half: Conviction is a bank, so hoarding some of it is correct play —
     *  hoarding all of it means the Signature economy never fired. */
    convictionSpendShare: 0.5,
    /** Chain steps (advances + completed chains) per round that count as
     *  "the wheel is being driven". Two: `MOMENTUM_SURGE_LENGTH` is 3, so two
     *  chain-relevant paid plays per round completes a chain every ~1.5
     *  rounds — a wheel that turns without dominating the turn. */
    momentumStepsPerRound: 2,
    /** Share of rolled dice that must power a line for the tray to count as
     *  spent rather than wasted. Half: the spec-33 tray rolls four fixed dice
     *  and miss faces are real, so 100% is not a reachable target. */
    diceSpendShare: 0.5,
    /** Distinct `DICE_ECONOMY_VERBS` (of 9) that count as full breadth. Four:
     *  enough that rolling-and-spending alone cannot reach it, low enough that
     *  a deck need not carry every relic to score. */
    diceEconomyBreadth: 4,
    /** The damage centroid a healthy setup→payoff arc lands on. 0.62 sits
     *  between a flat trade (0.50) and a pure linear ramp (~0.67). */
    arcTargetCentroid: 0.62,
    /** Distance from the target at which the arc term reaches 0. At 0.35 a
     *  perfectly flat fight still scores ~0.66 (the arc is weak, not absent)
     *  while a round-one burst that then coasts scores 0. */
    arcTolerance: 0.35,
    /** Mean legal options at a powering die that counts as full width. Three:
     *  the die colour already filters the hand to one aspect, so three live
     *  matches is a real spread; one option is not a decision at all. */
    widthTargetOptions: 3,
    /** The dominant card's damage share band that reads as healthy identity —
     *  a lead card, not a monoculture. */
    identityBand: [0.15, 0.45] as readonly [number, number],
    /** The dominant share at which the deck IS one card and identity reads 0.
     *  Set above the card-tuning loop §4 spam flag (0.70) so a flagged deck
     *  already scores badly before it hits zero. */
    identityMonocultureShare: 0.85,
});

// ─── The score ───────────────────────────────────────────────────────────────

/** The three locked-system sub-scores (0–1 each), always reported. */
export interface CombatSpineComponents {
    /** Conviction: is it earned AND converted into Signature plays? */
    conviction: number;
    /** Surge meter: is the chain driven, and do chains complete rather than break? */
    surge: number;
    /** Dice system: are rolled dice spent, and is the die economy touched at all? */
    dice: number;
}

/** The four weighted components (0–1 each), always reported. */
export interface CombatQualityComponents {
    spine: number;
    arc: number;
    width: number;
    identity: number;
}

/** The readings behind the components — kept so a report can explain a score
 *  without re-deriving it. */
export interface CombatQualityReadings {
    convictionPerRound: number;
    convictionSpendShare: number;
    momentumStepsPerRound: number;
    surgeCompletionShare: number;
    diceSpendShare: number;
    diceEconomyBreadth: number;
    /** Mean per-run damage centroid; `null` when no run had a scoreable arc. */
    arcCentroid: number | null;
    meanLiveOptions: number;
    dominantCardShare: number;
}

export interface CombatQualityScore {
    /** THE objective function: 0–1, the weighted sum of `components`. */
    index: number;
    components: CombatQualityComponents;
    /** The locked-mechanics sub-scores behind `components.spine`. */
    spineComponents: CombatSpineComponents;
    readings: CombatQualityReadings;
    weights: CombatQualityWeights;
}

const clamp01 = (n: number): number => clamp(Number.isFinite(n) ? n : 0, 0, 1);

/** Geometric mean of two 0–1 factors: BOTH must be non-zero to score. Used for
 *  every locked-system sub-term so "fed but never used" (and "used but never
 *  fed") reads as failure rather than as half credit. */
const both = (a: number, b: number): number => Math.sqrt(clamp01(a) * clamp01(b));

/**
 * THE LOCKED-MECHANICS GUARD (bearings § "LOCKED MECHANICS").
 *
 * Throws unless all three locked systems are present with positive sub-weights
 * and the SPINE component carries at least `LOCKED_SPINE_WEIGHT_FLOOR` of the
 * score. `scoreCombatObjective` calls this on every invocation, so a balance
 * pass that tries to tune Conviction, the Surge meter or the Dice system out of
 * the objective function fails loudly at measurement time instead of silently
 * shipping a metric that does not defend them.
 */
export function assertLockedMechanicsFirstClass(
    weights: CombatQualityWeights = COMBAT_QUALITY_WEIGHTS,
    subWeights: Record<string, number> = SPINE_SUBWEIGHTS,
): void {
    if (!(weights.spine >= LOCKED_SPINE_WEIGHT_FLOOR)) {
        throw new Error(
            `LOCKED MECHANICS: the SPINE weight (Conviction + Surge + Dice) is ${weights.spine}, `
            + `below the floor ${LOCKED_SPINE_WEIGHT_FLOOR}. The three systems are permanent `
            + '(bearings § "LOCKED MECHANICS") — they cannot be tuned out of the objective function. '
            + 'Raise the weight or surface a [needs-user-call].',
        );
    }
    const present = Object.keys(subWeights);
    for (const term of LOCKED_MECHANIC_TERMS) {
        const w = subWeights[term];
        if (typeof w !== 'number' || !(w > 0)) {
            throw new Error(
                `LOCKED MECHANICS: sub-weight for '${term}' is ${String(w)} — every locked system `
                + `must carry a positive weight. Locked terms: ${LOCKED_MECHANIC_TERMS.join(', ')}.`,
            );
        }
    }
    for (const term of present) {
        if (!(LOCKED_MECHANIC_TERMS as readonly string[]).includes(term)) {
            throw new Error(
                `LOCKED MECHANICS: unknown spine sub-weight '${term}'. `
                + `Locked terms: ${LOCKED_MECHANIC_TERMS.join(', ')}.`,
            );
        }
    }
}

/** Conviction sub-score: earned at a healthy rate AND actually spent. */
export function scoreConvictionUse(t: CombatObjectiveTelemetry): number {
    const cal = COMBAT_QUALITY_CALIBRATION;
    const rounds = Math.max(1, t.rounds);
    const perRound = t.convictionGained / rounds;
    const spendShare = t.convictionGained > 0 ? t.convictionSpent / t.convictionGained : 0;
    return both(perRound / cal.convictionIncomePerRound, spendShare / cal.convictionSpendShare);
}

/** Surge sub-score: the chain is driven AND chains complete rather than break. */
export function scoreSurgeUse(t: CombatObjectiveTelemetry): number {
    const cal = COMBAT_QUALITY_CALIBRATION;
    const rounds = Math.max(1, t.rounds);
    const steps = (t.momentumAdvances + t.surges) / rounds;
    const outcomes = t.surges + t.momentumBreaks;
    const completion = outcomes > 0 ? t.surges / outcomes : 0;
    return both(steps / cal.momentumStepsPerRound, completion);
}

/** Dice sub-score: rolled dice become paid lines AND the die economy is played. */
export function scoreDiceUse(t: CombatObjectiveTelemetry): number {
    const cal = COMBAT_QUALITY_CALIBRATION;
    const spendShare = t.diceRolled > 0 ? t.diceSpent / t.diceRolled : 0;
    const breadth = diceEconomyBreadth(t) / cal.diceEconomyBreadth;
    return both(spendShare / cal.diceSpendShare, breadth);
}

/** Arc sub-score: peak at the target centroid, 0 at `arcTolerance` away. */
export function scoreArcShape(t: CombatObjectiveTelemetry): { score: number; centroid: number | null } {
    const cal = COMBAT_QUALITY_CALIBRATION;
    if (t.arcRuns <= 0) return { score: 0, centroid: null };
    const centroid = t.arcCentroidSum / t.arcRuns;
    const score = clamp01(1 - Math.abs(centroid - cal.arcTargetCentroid) / cal.arcTolerance);
    return { score, centroid };
}

/** Width sub-score: mean legal options at a powering die, 1 option = 0. */
export function scoreDecisionWidth(t: CombatObjectiveTelemetry): { score: number; meanOptions: number } {
    const cal = COMBAT_QUALITY_CALIBRATION;
    if (t.decisionPoints <= 0) return { score: 0, meanOptions: 0 };
    const meanOptions = t.liveOptions / t.decisionPoints;
    const score = clamp01((meanOptions - 1) / (cal.widthTargetOptions - 1));
    return { score, meanOptions };
}

/**
 * Identity sub-score: a plateau with shoulders on the dominant card's share of
 * attributed enemy-HP damage. Full marks inside the band; falling to 0 at
 * share 0 (no card did anything — the generic engine won it) and at
 * `identityMonocultureShare` (the deck IS one card).
 *
 * **Read it per DECK.** Identity is the only component that is definitionally a
 * property of one deck: pooling telemetry across DIFFERENT decks dilutes the
 * dominant share (three decks' lead cards split the denominator) and inflates
 * the term. The per-cell and per-deck rows are the meaningful readings; a
 * matrix-level identity number across decks is an artifact. The other
 * three components pool cleanly across decks.
 */
export function scoreDeckIdentity(t: CombatObjectiveTelemetry): { score: number; dominantShare: number } {
    const cal = COMBAT_QUALITY_CALIBRATION;
    const entries = Object.values(t.damageByCard);
    const total = entries.reduce((s, d) => s + d, 0);
    if (total <= 0) return { score: 0, dominantShare: 0 };
    const dominantShare = Math.max(...entries) / total;
    const [low, high] = cal.identityBand;
    if (dominantShare <= 0) return { score: 0, dominantShare: 0 };
    if (dominantShare < low) return { score: clamp01(dominantShare / low), dominantShare };
    if (dominantShare <= high) return { score: 1, dominantShare };
    const dead = cal.identityMonocultureShare;
    return { score: clamp01((dead - dominantShare) / (dead - high)), dominantShare };
}

/**
 * THE OBJECTIVE FUNCTION. Scores pooled telemetry into the Combat Quality
 * Index. Deterministic, total (never throws on degenerate telemetry — an empty
 * struct scores 0), and guarded: it refuses to run against weights that demote
 * a locked mechanic.
 */
export function scoreCombatObjective(
    telemetry: CombatObjectiveTelemetry,
    weights: CombatQualityWeights = COMBAT_QUALITY_WEIGHTS,
    subWeights: Readonly<Record<LockedMechanicTerm, number>> = SPINE_SUBWEIGHTS,
): CombatQualityScore {
    assertLockedMechanicsFirstClass(weights, subWeights);

    const spineComponents: CombatSpineComponents = {
        conviction: scoreConvictionUse(telemetry),
        surge: scoreSurgeUse(telemetry),
        dice: scoreDiceUse(telemetry),
    };
    const subTotal = subWeights.conviction + subWeights.surge + subWeights.dice;
    const spine = clamp01((
        spineComponents.conviction * subWeights.conviction
        + spineComponents.surge * subWeights.surge
        + spineComponents.dice * subWeights.dice
    ) / (subTotal > 0 ? subTotal : 1));

    const arc = scoreArcShape(telemetry);
    const width = scoreDecisionWidth(telemetry);
    const identity = scoreDeckIdentity(telemetry);

    const components: CombatQualityComponents = {
        spine,
        arc: arc.score,
        width: width.score,
        identity: identity.score,
    };
    const weightTotal = weights.spine + weights.arc + weights.width + weights.identity;
    const index = clamp01((
        components.spine * weights.spine
        + components.arc * weights.arc
        + components.width * weights.width
        + components.identity * weights.identity
    ) / (weightTotal > 0 ? weightTotal : 1));

    const rounds = Math.max(1, telemetry.rounds);
    return {
        index,
        components,
        spineComponents,
        readings: {
            convictionPerRound: telemetry.convictionGained / rounds,
            convictionSpendShare: telemetry.convictionGained > 0
                ? telemetry.convictionSpent / telemetry.convictionGained
                : 0,
            momentumStepsPerRound: (telemetry.momentumAdvances + telemetry.surges) / rounds,
            surgeCompletionShare: telemetry.surges + telemetry.momentumBreaks > 0
                ? telemetry.surges / (telemetry.surges + telemetry.momentumBreaks)
                : 0,
            diceSpendShare: telemetry.diceRolled > 0 ? telemetry.diceSpent / telemetry.diceRolled : 0,
            diceEconomyBreadth: diceEconomyBreadth(telemetry),
            arcCentroid: arc.centroid,
            meanLiveOptions: width.meanOptions,
            dominantCardShare: identity.dominantShare,
        },
        weights,
    };
}

/** One-line CQI rendering for CLI report rows: the index plus its four
 *  components plus the three locked sub-scores (which is the whole point —
 *  a spine-blind deck must be visible at a glance). */
export function formatCombatQuality(score: CombatQualityScore): string {
    const p = (n: number): string => (n * 100).toFixed(0).padStart(3);
    return `cqi=${p(score.index)}%`
        + ` [spine=${p(score.components.spine)}%`
        + ` (con=${p(score.spineComponents.conviction)}% sur=${p(score.spineComponents.surge)}%`
        + ` dic=${p(score.spineComponents.dice)}%)`
        + ` arc=${p(score.components.arc)}%`
        + ` wid=${p(score.components.width)}%`
        + ` idn=${p(score.components.identity)}%]`;
}
