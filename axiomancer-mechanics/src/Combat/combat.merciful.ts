/**
 * THE MERCIFUL, SANDBOX (branch sandbox/merciful-sims only; never merged).
 *
 * Lane-creator step 6 for the Merciful (`plan/card-ledger/rehearsal-merciful.md`,
 * Session 0 and "Rulings after the vote", T, 2026-10-29). The state the
 * Merciful's sandbox verbs keep on the program ledger, the MERCY clock and its
 * burst, and the sim telemetry the harness reads.
 *
 *   RADIANCE N  HEAL N (heart-scaled, repeating), then DEAL what that heal
 *               actually restored (0 at full VITAE). The hit is a DEAL:
 *               VULNERABLE, FROZEN and a pending "+n to your next DEAL" apply.
 *   MERCY N     heal the foe N (heart-scaled), capped at its max VITAE; the
 *               excess past its max adds to its MERCY total. Then N adds to
 *               the total. The first MERCY starts a 3-turn clock; a new MERCY
 *               adds and leaves the clock where it is. When the clock runs
 *               out, at the start of the foe's turn, MERCY bursts: the foe
 *               takes a DEAL of twice the total. The total clears; the next
 *               MERCY starts a fresh clock.
 *
 * The clock counts the foe-turn starts left until the burst, the coming one
 * included: a MERCY played on your turn with no clock sets it to 3, and it
 * bursts at the start of the third foe turn from then (T's "1 turn left" means
 * the very next foe turn). A tick that takes it to 0 runs it out now.
 */

/** A fresh MERCY clock: foe-turn starts until the burst. */
export const MERCY_CLOCK_TURNS = 3;

/** The burst's multiple of the MERCY total. */
export const MERCY_BURST_MULT = 2;

/** The Merciful's state on the program ledger. */
export interface MercifulState {
    /** The foe's MERCY total (0 = no MERCY). */
    mercy: number;
    /** Foe-turn starts left until the burst (0 = no clock). */
    clock: number;
    /** VITAE you healed this turn (HEAL and RADIANCE, the turn-start Globals included). */
    healedThisTurn: number;
    /** E-03b: added to each of your heals this turn (unscaled). */
    healPlus: number;
    /** E-03b PAID: each of your heals this turn is multiplied by this. */
    healTimes: number;
    /** E-06a FREE: the next HEAL this turn is RADIANCE instead. */
    nextHealRadiance: number;
    /** E-06a PAID: every HEAL this turn is RADIANCE, and every RADIANCE deals double. */
    allHealsRadianceDouble: boolean;
    /** M-08a: the foe's next attack deals this much less. */
    nextAttackLess: number;
    /** MERCY cards played this combat, oldest first (M-09c returns from the end). */
    mercyCardsPlayed: string[];
    /** MERCY applications made by the line being resolved (the play hook reads it). */
    mercyApps: number;
    /** Sim only: which card's turn modifier (E-03b, E-06a) is live, for the runaway table. */
    healModSource?: string | null;
    radianceModSource?: string | null;
}

export function initMercifulState(): MercifulState {
    return {
        mercy: 0, clock: 0, healedThisTurn: 0, healPlus: 0, healTimes: 1,
        nextHealRadiance: 0, allHealsRadianceDouble: false, nextAttackLess: 0,
        mercyCardsPlayed: [], mercyApps: 0, healModSource: null, radianceModSource: null,
    };
}

export function cloneMerciful(m: MercifulState | undefined): MercifulState {
    const s = m ?? initMercifulState();
    return { ...s, mercyCardsPlayed: s.mercyCardsPlayed.slice() };
}

/** The turn's modifiers reset as your turn starts (before the ⟳ Globals fire). */
export function mercifulTurnReset(m: MercifulState): MercifulState {
    flushTurnRunaways();
    return {
        ...m, healedThisTurn: 0, healPlus: 0, healTimes: 1, nextHealRadiance: 0,
        allHealsRadianceDouble: false, healModSource: null, radianceModSource: null,
    };
}

// ── Sim telemetry (the harness resets it per cell) ─────────────────────────────

export interface MercifulTelemetry {
    /** Foe VITAE taken by each source (what actually came off it). */
    dealPlain: number;
    radianceDeal: number;
    burstDeal: number;
    leech: number;
    /** Every other foe VITAE loss (signatures, the foe's own DoT), from the fight totals. */
    other: number;
    /** VITAE MERCY healed the foe (the cost of MERCY). */
    foeHealedByMercy: number;
    /** MERCY added past the foe's max (overheal into the total). */
    overhealToMercy: number;
    /** Part of the DEAL / RADIANCE / burst damage VULNERABLE made. */
    vulnExtra: number;
    /** RADIANCE resolutions, the heal they tried (after scaling), what they restored, and whiffs (restored 0). */
    radianceCount: number;
    radianceTried: number;
    radianceHealed: number;
    radianceWhiffs: number;
    /** HEALs turned into RADIANCE by E-06a. */
    convertedHeals: number;
    /** Every burst: its DEAL before the foe's VITAE cap, and the MERCY total that burst. */
    burstSizes: number[];
    burstTotals: number[];
    /** Bursts: on the clock (the foe's turn start) and early (P-03b / P-05a / a tick to 0). */
    burstsOnClock: number;
    burstsEarly: number;
    /** Fights where MERCY was ever applied, and of those the ones that ended before any burst. */
    fightsWithMercy: number;
    fightsEndedBeforeBurst: number;
    /** Fights that ended with MERCY still on the foe (a total unburst). */
    fightsEndedWithMercyOn: number;
    /** Each fight's highest MERCY total. */
    mercyPeaks: number[];
    /** Self VITAE lost to SACRIFICE (E-04b). */
    sacrificed: number;
    /** VITAE you healed (all sources), and what the turn-start Globals healed. */
    healed: number;
    /** M-08a: damage the foe's attacks lost. */
    attackLessened: number;
    /** M-09c: cards returned. */
    returned: number;
    /** M-04b: debuffs cleared. */
    debuffsCleared: number;
    /** Max VITAE added (M-05c). */
    maxVitaeAdded: number;
    /** Runaway lines: one number per resolution, by key (see the harness). */
    runaways: Record<string, number[]>;
    /** Foe VITAE taken in total (start VITAE + every heal on it − end VITAE), summed over fights. */
    foeTaken: number;
}

function emptyTelemetry(): MercifulTelemetry {
    return {
        dealPlain: 0, radianceDeal: 0, burstDeal: 0, leech: 0, other: 0,
        foeHealedByMercy: 0, overhealToMercy: 0, vulnExtra: 0,
        radianceCount: 0, radianceTried: 0, radianceHealed: 0, radianceWhiffs: 0, convertedHeals: 0,
        burstSizes: [], burstTotals: [], burstsOnClock: 0, burstsEarly: 0,
        fightsWithMercy: 0, fightsEndedBeforeBurst: 0, fightsEndedWithMercyOn: 0, mercyPeaks: [],
        sacrificed: 0, healed: 0, attackLessened: 0, returned: 0, debuffsCleared: 0, maxVitaeAdded: 0,
        runaways: {}, foeTaken: 0,
    };
}

export const MERCIFUL_TELEMETRY: MercifulTelemetry = emptyTelemetry();

/** The value witness for the Merciful cards (ids `mc-`); off = the plain hand-order witness. */
export const MERCIFUL_WITNESS = { on: false };

export function resetMercifulTelemetry(): void {
    Object.assign(MERCIFUL_TELEMETRY, emptyTelemetry());
    fight = freshFight();
}

/** The fight in progress (the sim runs one fight at a time). */
interface FightTrack {
    mercyApplied: boolean;
    bursts: number;
    peak: number;
    mercyHealed: number;
    /** Turn-scoped runaway accumulators: key to amount, flushed at the next turn start and the fight's end. */
    turn: Record<string, number>;
}
const freshFight = (): FightTrack => ({ mercyApplied: false, bursts: 0, peak: 0, mercyHealed: 0, turn: {} });
let fight: FightTrack = freshFight();

export function noteMercyApplied(total: number, healed: number): void {
    fight.mercyApplied = true;
    fight.mercyHealed += healed;
    fight.peak = Math.max(fight.peak, total);
}

export function noteBurst(dealBeforeCap: number, total: number, onClock: boolean): void {
    fight.bursts += 1;
    MERCIFUL_TELEMETRY.burstSizes.push(dealBeforeCap);
    MERCIFUL_TELEMETRY.burstTotals.push(total);
    if (onClock) MERCIFUL_TELEMETRY.burstsOnClock += 1;
    else MERCIFUL_TELEMETRY.burstsEarly += 1;
}

export function noteRunaway(key: string, value: number): void {
    (MERCIFUL_TELEMETRY.runaways[key] ??= []).push(value);
}

/** Adds to a turn-scoped runaway (E-03b, E-06a): one number per turn it was live. */
export function noteTurnRunaway(key: string, value: number): void {
    fight.turn[key] = (fight.turn[key] ?? 0) + value;
}

function flushTurnRunaways(): void {
    for (const [k, v] of Object.entries(fight.turn)) noteRunaway(k, v);
    fight.turn = {};
}

/** The fight is over: fold its tallies in. The foe's VITAE taken is its start
 *  VITAE, plus every heal on it (MERCY's and its own), less its end VITAE. */
export function endMercifulFight(endMercy: number, foeStart: number, foeEnd: number, foeSelfHeals: number): void {
    flushTurnRunaways();
    const t = MERCIFUL_TELEMETRY;
    t.foeTaken += foeStart + fight.mercyHealed + foeSelfHeals - Math.max(0, foeEnd);
    if (fight.mercyApplied) {
        t.fightsWithMercy += 1;
        if (fight.bursts === 0) t.fightsEndedBeforeBurst += 1;
        if (endMercy > 0) t.fightsEndedWithMercyOn += 1;
    }
    t.mercyPeaks.push(fight.peak);
    fight = freshFight();
}
