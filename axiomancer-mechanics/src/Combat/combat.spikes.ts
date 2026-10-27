/**
 * THE SPIKES — the Defender's THORNS and REFLECT (Phase DF1a).
 *
 * On T's rulings of 2026-10-26 (`plan/card-ledger/rehearsal-defender.md`,
 * Session 0 and the revisions; `plan/phases/phase_DF1_defender_trial_set.md`):
 *
 *   THORNS n    each foe strike deals n back to the foe, per strike. A DEAL:
 *               VULNERABLE applies and a FROZEN foe takes it doubled. Heart-
 *               scaled (repeating, as LEECH) when applied. Drops by 1 at every
 *               round boundary after the round it was applied in (BLIZZARD's
 *               drift). Stacks by adding.
 *   REFLECT n%  each foe strike sends n% of the strike's damage before GUARD
 *               back as a DEAL. It never reduces the damage you take (T: "10
 *               dmg vs. 100% reflect means both entities take 10 dmg"). Lasts
 *               2 turns; a new REFLECT adds its % and refreshes to 2 turns;
 *               no cap. Unscaled.
 *
 * A "turn" of REFLECT is one round: the foe turn of the round it was applied
 * in, then the next. It loses a turn at each round boundary and is gone at 0.
 *
 * The spikes live on the combat's program ledger only; they are never saved
 * between fights.
 */

import type { CombatEvent, SpikeReading } from './combat.encounter.types';

/** A new REFLECT lasts this many rounds (and a later one refreshes to it). */
export const REFLECT_TURNS = 2;

/** THORNS and REFLECT on the player. */
export interface SpikeState {
    thorns: number;
    /** THORNS was up when the current round began (so it drifts when the round ends). */
    upThorns: boolean;
    /** REFLECT, in percent. */
    reflect: number;
    /** Rounds REFLECT has left (0 = none). */
    reflectTurns: number;
}

export function initSpikeState(): SpikeState {
    return { thorns: 0, upThorns: false, reflect: 0, reflectTurns: 0 };
}

/** True when THORNS or REFLECT is up (so a foe strike has work to do). */
export function anySpikes(sp: SpikeState | undefined): sp is SpikeState {
    return !!sp && (sp.thorns > 0 || sp.reflect > 0);
}

/** THORNS +n (already scaled): stacks by adding. */
export function addThorns(sp: SpikeState, n: number): SpikeState {
    return n > 0 ? { ...sp, thorns: sp.thorns + n } : sp;
}

/** REFLECT +pct%: adds its % and refreshes to {@link REFLECT_TURNS}. */
export function addReflect(sp: SpikeState, pct: number): SpikeState {
    return pct > 0 ? { ...sp, reflect: sp.reflect + pct, reflectTurns: REFLECT_TURNS } : sp;
}

/** What one foe strike sends back before VULNERABLE and FROZEN: THORNS, then REFLECT's share of the pre-GUARD hit. */
export function spikeReturns(sp: SpikeState, preGuard: number): { spike: 'thorns' | 'reflect'; amount: number }[] {
    const out: { spike: 'thorns' | 'reflect'; amount: number }[] = [];
    if (sp.thorns > 0) out.push({ spike: 'thorns', amount: sp.thorns });
    const share = sp.reflect > 0 ? Math.round(Math.max(0, preGuard) * sp.reflect / 100) : 0;
    if (share > 0) out.push({ spike: 'reflect', amount: share });
    return out;
}

/**
 * The round boundary: THORNS that was up when the round began drops by 1,
 * then "up" is re-read for the next round; REFLECT loses a turn and is gone
 * at 0.
 */
export function driftSpikes(sp: SpikeState): SpikeState {
    const thorns = sp.upThorns ? Math.max(0, sp.thorns - 1) : sp.thorns;
    const reflectTurns = Math.max(0, sp.reflectTurns - 1);
    return {
        thorns,
        upThorns: thorns > 0,
        reflect: reflectTurns > 0 ? sp.reflect : 0,
        reflectTurns,
    };
}

/** The numbers the board shows: THORNS, REFLECT's % and its turns left. */
export function spikeReading(sp: SpikeState): Record<SpikeReading, number> {
    return { thorns: sp.thorns, reflect: sp.reflect, 'reflect-turns': sp.reflectTurns };
}

const SPIKE_READINGS: readonly SpikeReading[] = ['thorns', 'reflect', 'reflect-turns'];

/** One `spikes-changed` event per number that moved from `before` to `after` (a rise, a drop, an expiry). */
export function spikeEvents(before: SpikeState | undefined, after: SpikeState | undefined): CombatEvent[] {
    const a = spikeReading(before ?? initSpikeState());
    const b = spikeReading(after ?? initSpikeState());
    return SPIKE_READINGS
        .filter(r => a[r] !== b[r])
        .map(spike => ({ kind: 'spikes-changed' as const, spike, from: a[spike], to: b[spike] }));
}
