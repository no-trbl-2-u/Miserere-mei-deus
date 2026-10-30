/**
 * MERCY on the foe, and YIELDING — the Merciful's foe-side status (Phase MF1a).
 *
 * On T's rulings of 2026-10-29 and 2026-10-30 (`plan/card-ledger/rehearsal-merciful.md`,
 * "Rulings after the vote" and "Revisions"; `plan/phases/phase_MF1_merciful_trial_set.md`):
 *
 *   MERCY N   heal the foe N (heart-scaled, as LEECH), stopping at its max
 *             VITAE, and add N to its MERCY total whatever the heal restored
 *             (a foe at full VITAE still gains N). The first MERCY starts a
 *             3-turn clock; a new MERCY adds to the total and never resets
 *             the clock. When the clock runs out, at the start of the foe's
 *             turn, the MERCY bursts: a DEAL of twice the total. Then the
 *             total clears to 0 and the next MERCY starts a fresh clock.
 *   YIELDING  while the foe is YIELDING you can befriend it whatever its
 *             VITAE: its befriend gate reads open.
 *
 * The clock counts the foe-turn starts left until the burst, the coming one
 * included: a MERCY played on your turn with no clock sets it to 3, and it
 * bursts at the start of the third foe turn from then. "1 turn left" means the
 * very next foe turn.
 *
 * MERCY lives on the combat's program ledger only; it is never saved between
 * fights.
 */

import type { CombatEvent } from './combat.encounter.types';

/** A fresh MERCY clock: foe-turn starts until the burst. */
export const MERCY_CLOCK_TURNS = 3;

/** The burst's multiple of the MERCY total. */
export const MERCY_BURST_MULT = 2;

/** MERCY on the foe. */
export interface MercyState {
    /** The foe's MERCY total (0 = no MERCY). */
    total: number;
    /** Foe-turn starts left until the burst, the coming one included (0 = no clock). */
    clock: number;
    /** The foe is YIELDING: its befriend gate reads open whatever its VITAE. */
    yielding: boolean;
}

export function initMercyState(): MercyState {
    return { total: 0, clock: 0, yielding: false };
}

/**
 * MERCY +n (already scaled): adds n to the total; the first MERCY (no clock
 * running) starts a fresh {@link MERCY_CLOCK_TURNS}-turn clock, a later one
 * leaves the clock where it is.
 */
export function addMercy(m: MercyState, n: number): MercyState {
    if (n <= 0) return m;
    return { ...m, total: m.total + n, clock: m.clock > 0 ? m.clock : MERCY_CLOCK_TURNS };
}

/**
 * The start of the foe's turn: the clock ticks down 1. When it runs out the
 * total bursts (`burst` is the total that bursts; the DEAL is
 * {@link MERCY_BURST_MULT} times it) and clears. No clock, no change.
 */
export function tickMercyClock(m: MercyState): { next: MercyState; burst: number } {
    if (m.clock <= 0) return { next: m, burst: 0 };
    const clock = m.clock - 1;
    if (clock > 0) return { next: { ...m, clock }, burst: 0 };
    return { next: { ...m, total: 0, clock: 0 }, burst: m.total };
}

/** True when the foe is YIELDING (its befriend gate reads open). */
export function mercyYielding(m: MercyState | undefined): boolean {
    return m?.yielding === true;
}

/** The numbers the board shows: the foe's MERCY total and the clock's turns left. */
export function mercyReading(m: MercyState | undefined): { mercy: number; 'mercy-turns': number; yielding: boolean } {
    const s = m ?? initMercyState();
    return { mercy: s.total, 'mercy-turns': s.clock, yielding: s.yielding };
}

/** The `mercy-ticked` event for a clock tick that did not burst (null when nothing ticked or it burst). */
export function mercyTickEvent(before: MercyState, after: MercyState): CombatEvent | null {
    if (before.clock <= 0 || after.clock <= 0 || after.clock === before.clock) return null;
    return { kind: 'mercy-ticked', total: after.total, turnsLeft: after.clock };
}
