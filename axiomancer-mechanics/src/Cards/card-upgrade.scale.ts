/**
 * THE UPGRADE SCALE (Phase UP1b) — how a payoff number grows per upgrade.
 *
 * Pure and import-free on purpose: card data files build their upgraded
 * programs from it, and `card-upgrades.ts` (which reads the library) uses
 * the same two steps for plain cards, so nothing here may import the library.
 *
 * Two steps, each applied once per upgrade, each upgrade on top of the last:
 *
 *   MAGNITUDE  n -> n + max(2, round(n * 0.40))     (+40%, at least +2)
 *     DEAL, GUARD, HEAL, VULNERABLE %, "the foe loses n", and the caps on
 *     those payoffs.
 *   INTENSITY  n -> n + 1
 *     LEECH and Conviction: small counters where +40% rounds to nothing.
 *
 * Costs (SACRIFICE, TETHER, EXILE) never pass through either step.
 */

/** MAGNITUDE bucket: +40%, at least +2. */
export const UPGRADE_MAGNITUDE_PCT = 0.4;
export const UPGRADE_MAGNITUDE_MIN = 2;
/** INTENSITY bucket: +1 per upgrade. */
export const UPGRADE_INTENSITY_STEP = 1;

/** One MAGNITUDE step. Zero and negatives stay where they are. */
export function magnitudeStep(n: number): number {
    if (!(n > 0)) return n;
    return n + Math.max(UPGRADE_MAGNITUDE_MIN, Math.round(n * UPGRADE_MAGNITUDE_PCT));
}

/** The scale a program is built at: `level` upgrades on top of the base card. */
export interface UpgradeScale {
    /** 0 for the base card, 1 for `<id>+`, 2 for `<id>++`, 3 for `<id>+++`. */
    readonly level: number;
    /** A MAGNITUDE payoff (or a cap on one) at this level. */
    m(n: number): number;
    /** An INTENSITY payoff (LEECH, Conviction) at this level. */
    i(n: number): number;
    /** The flat bonus a Global adds to its trigger's `n` at this level ("GUARD n+2"). */
    readonly plus: number;
}

/** The scale at `level` upgrades. Level 0 returns every number unchanged. */
export function upgradeScale(level: number): UpgradeScale {
    const k = Math.max(0, Math.floor(level));
    return {
        level: k,
        m(n) {
            let out = n;
            for (let s = 0; s < k; s++) out = magnitudeStep(out);
            return out;
        },
        i(n) {
            return n > 0 ? n + k * UPGRADE_INTENSITY_STEP : n;
        },
        plus: k * UPGRADE_MAGNITUDE_MIN,
    };
}

/**
 * THE SPELL STEP — a Spell's PAID line EXILEs, so it pays one more step than
 * the card would as a plain discard card (T, 2026-10-24). Built on top of the
 * card's own upgrade level, so an upgraded Spell stays a step ahead.
 */
export interface SpellPaidScale {
    /** A MAGNITUDE payoff (or a cap on one), one step past `u.m`. */
    m(n: number): number;
    /** An INTENSITY payoff (LEECH, Conviction, DRAW), one past `u.i`. */
    i(n: number): number;
    /** A weather number (INFERNO, BLIZZARD, STORM): upgrades grow it by
     *  INTENSITY, and the Spell step adds a MAGNITUDE step on top. */
    w(n: number): number;
}

/** The PAID-line scale of a Spell at upgrade scale `u`. */
export function spellPaidScale(u: UpgradeScale): SpellPaidScale {
    return {
        m: n => magnitudeStep(u.m(n)),
        i: n => (n > 0 ? u.i(n) + UPGRADE_INTENSITY_STEP : n),
        w: n => magnitudeStep(u.i(n)),
    };
}
