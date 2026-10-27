/**
 * THE DEFENDER'S SPIKES (branch sandbox/defender-sims only; never merged).
 *
 * Lane-creator step 6 for the Defender (`plan/card-ledger/rehearsal-defender.md`):
 * the state THORNS and REFLECT need, on T's rulings and the provisional
 * defaults of the sims brief (`plan/card-ledger/defender-sims.md`):
 *
 *   THORNS n    each foe strike deals n back to the foe, per strike. A DEAL:
 *               VULNERABLE applies and a FROZEN foe takes it doubled. Heart-
 *               scaled (repeating) when applied (D110). Drops by 1 at every
 *               round boundary after the round it was applied in (BLIZZARD's
 *               drift). Stacks by adding.
 *   REFLECT n%  each foe strike sends n% of the strike's damage before GUARD
 *               back as a DEAL. It never reduces the damage you take (T,
 *               2026-10-26). Lasts 2 turns; a new REFLECT adds its % and
 *               refreshes to 2 turns; no cap. Unscaled.
 *
 * Plus the riders the kept cards need: P-08's doubled THORNS while GUARD holds,
 * P-09 PAID's REFLECT before the first strike, M-04 PAID's GUARD held through
 * one foe turn, and the damage your DEALs did this turn (P-06).
 *
 * `DEFENDER_TELEMETRY` is the sim's own counter set (module-level, reset by
 * the harness per cell); it never changes play.
 */

/** The reason a PAID line that discards cannot be paid (fewer other cards in hand than it discards). */
export const DISCARD_WHY = 'not enough other cards in hand to discard';

/** The harness's switch: the Defender value witness (on) or the plain greedy hand order (off). */
export const DEFENDER_WITNESS = { on: true };

/** The Defender's state on the program ledger. */
export interface DefenderState {
    thorns: number;
    /** THORNS was up when the current round began (so it drifts at round end). */
    upThorns: boolean;
    /** REFLECT, percent. */
    reflect: number;
    /** Foe turns REFLECT has left (0 = none). */
    reflectTurns: number;
    /** P-08: the round whose foe turn doubles THORNS while unhurt (0 = none). */
    thornsDoubleRound: number;
    /** P-09 PAID: REFLECT % that lands as the foe attacks in `reflectOnAttackRound`. */
    reflectOnAttack: number;
    reflectOnAttackRound: number;
    /** M-04 PAID: the round whose foe turn does not take your GUARD away (0 = none). */
    guardHoldRound: number;
    /** VITAE your DEALs took off the foe this turn. */
    dealtThisTurn: number;
}

export function initDefenderState(): DefenderState {
    return {
        thorns: 0, upThorns: false, reflect: 0, reflectTurns: 0,
        thornsDoubleRound: 0, reflectOnAttack: 0, reflectOnAttackRound: 0, guardHoldRound: 0,
        dealtThisTurn: 0,
    };
}

/** A new REFLECT: adds its % and refreshes to 2 turns. */
export function addReflect(df: DefenderState, pct: number): void {
    if (pct <= 0) return;
    df.reflect += pct;
    df.reflectTurns = 2;
    noteReflect(df.reflect);
}

/** The round boundary: THORNS that was up drops by 1; REFLECT loses a turn. */
export function driftDefender(df: DefenderState): DefenderState {
    const next: DefenderState = { ...df };
    if (df.upThorns) next.thorns = Math.max(0, df.thorns - 1);
    next.upThorns = next.thorns > 0;
    if (df.reflectTurns > 0) {
        next.reflectTurns = df.reflectTurns - 1;
        if (next.reflectTurns === 0) next.reflect = 0;
    }
    return next;
}

// ── Sim telemetry ───────────────────────────────────────────────────────────

export interface DefenderTelemetry {
    /** Foe VITAE from THORNS, REFLECT and your cards' DEALs (Globals included). */
    thornsDamage: number;
    reflectDamage: number;
    dealDamage: number;
    /** Of the three above, what VULNERABLE added. */
    vulnExtra: number;
    /** VITAE lost to E-09's self-loss. */
    selfLoss: number;
    /** Foe strikes that met THORNS / REFLECT, and all foe strikes. */
    thornsTriggers: number;
    reflectTriggers: number;
    strikes: number;
    /** P-08 doubled triggers. */
    thornsDoubled: number;
    /** Each fight's highest THORNS and REFLECT. */
    thornsPeaks: number[];
    reflectPeaks: number[];
    /** Discard PAID lines: chances (a die of the card's colour in hand) and the unpayable ones. */
    discardChances: number;
    discardUnpayable: number;
    /** The same, read once per card at the start of each turn. */
    discardTurnStartChecks: number;
    discardTurnStartUnpayable: number;
    cardsDiscarded: number;
    m09Triggers: number;
    retrieves: number;
    unexiles: number;
}

function emptyTelemetry(): DefenderTelemetry {
    return {
        thornsDamage: 0, reflectDamage: 0, dealDamage: 0, vulnExtra: 0, selfLoss: 0,
        thornsTriggers: 0, reflectTriggers: 0, strikes: 0, thornsDoubled: 0,
        thornsPeaks: [], reflectPeaks: [],
        discardChances: 0, discardUnpayable: 0, discardTurnStartChecks: 0, discardTurnStartUnpayable: 0,
        cardsDiscarded: 0, m09Triggers: 0, retrieves: 0, unexiles: 0,
    };
}

export const DEFENDER_TELEMETRY: DefenderTelemetry = emptyTelemetry();

let fightThornsPeak = 0;
let fightReflectPeak = 0;

export function resetDefenderTelemetry(): void {
    Object.assign(DEFENDER_TELEMETRY, emptyTelemetry());
    fightThornsPeak = 0;
    fightReflectPeak = 0;
}

export function noteThorns(v: number): void { if (v > fightThornsPeak) fightThornsPeak = v; }
export function noteReflect(v: number): void { if (v > fightReflectPeak) fightReflectPeak = v; }

/** Closes one fight's peaks (the sim calls it once per run). */
export function endDefenderFight(): void {
    DEFENDER_TELEMETRY.thornsPeaks.push(fightThornsPeak);
    DEFENDER_TELEMETRY.reflectPeaks.push(fightReflectPeak);
    fightThornsPeak = 0;
    fightReflectPeak = 0;
}
