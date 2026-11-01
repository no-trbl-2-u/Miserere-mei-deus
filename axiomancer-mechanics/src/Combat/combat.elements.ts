/**
 * THE WEATHER — the Elementalist's elements (Phase EL1a).
 *
 * The weather the Elementalist trial set puts on the foe, on T's rulings of
 * 2026-10-24 (`plan/card-ledger/rehearsal-elementalist.md`, "The weather";
 * `plan/README.md`):
 *
 *   INFERNO n   both sides burn. At the start of each foe turn the foe loses
 *               its INFERNO in VITAE; at the start of each of your turns you
 *               lose half of the both-sides INFERNO, rounded down. Plain loss
 *               (not a DEAL); yours can kill you. A "foe only" line burns only
 *               the foe; a "you take INFERNO" line burns only you (in full).
 *   BLIZZARD n  each of the foe's attacks deals n less. FROZEN: when the foe
 *               is about to attack and its every hit is at most the BLIZZARD,
 *               the foe is FROZEN; the next DEAL it takes is doubled, then
 *               FROZEN ends (the BLIZZARD stays). It can re-trigger every foe
 *               turn.
 *   STORM n     at the start of the foe's turn the foe loses n VITAE (plain
 *               loss), then the STORM grows by 1 (plus each STORM-growth
 *               Global in play).
 *
 * All three last the whole combat and stack by adding. BLIZZARD and INFERNO
 * drop by 1 at every round boundary after the round they were applied in
 * (a stack that was already up when the round began drops by 1 when the
 * round ends). An element at 0 is gone. All three are unscaled.
 *
 * Your INFERNO is not a separate stack: it is half the both-sides INFERNO
 * plus any INFERNO on you alone. "Remove your INFERNO" turns the both-sides
 * stack into a foe-only stack (the foe keeps burning, you stop).
 *
 * The weather lives on the combat's program ledger only; it is never saved
 * between fights.
 */

import type { CombatEvent, WeatherElement } from './combat.encounter.types';

/** The elements on the foe, and the INFERNO on you. */
export interface ElementState {
    /** INFERNO that burns both sides (the foe in full, you by half). */
    infShared: number;
    /** INFERNO on the foe alone. */
    infFoe: number;
    /** INFERNO on you alone (you lose it in full). */
    infSelf: number;
    blizzard: number;
    storm: number;
    frozen: boolean;
    /** Up when the current round began (so it drifts down when the round ends). */
    upShared: boolean;
    upFoe: boolean;
    upSelf: boolean;
    upBlizzard: boolean;
    /** Counter for the hand uids of cards drawn mid-turn. */
    drawUid: number;
}

export function initElementState(): ElementState {
    return {
        infShared: 0, infFoe: 0, infSelf: 0, blizzard: 0, storm: 0, frozen: false,
        upShared: false, upFoe: false, upSelf: false, upBlizzard: false, drawUid: 0,
    };
}

/** The foe's INFERNO (what it loses at the start of its turn). */
export function foeInferno(el: ElementState): number {
    return el.infShared + el.infFoe;
}

/** Your INFERNO (what you lose at the start of your turn). */
export function yourInferno(el: ElementState): number {
    return Math.floor(el.infShared / 2) + el.infSelf;
}

/** Different elements on the foe: 0 to 3. */
export function elementsOnFoe(el: ElementState): number {
    return (foeInferno(el) > 0 ? 1 : 0) + (el.blizzard > 0 ? 1 : 0) + (el.storm > 0 ? 1 : 0);
}

/** True when any element is up (so the hooks have work to do). */
export function anyElement(el: ElementState | undefined): el is ElementState {
    return !!el && (el.infShared > 0 || el.infFoe > 0 || el.infSelf > 0 || el.blizzard > 0 || el.storm > 0 || el.frozen);
}

/**
 * The round boundary: each INFERNO stack and the BLIZZARD that was up when
 * the round began drops by 1; then "up when the round began" is re-read for
 * the next round. STORM never drifts.
 */
export function driftElements(el: ElementState): ElementState {
    const drop = (v: number, up: boolean): number => (up ? Math.max(0, v - 1) : v);
    const next: ElementState = {
        ...el,
        infShared: drop(el.infShared, el.upShared),
        infFoe: drop(el.infFoe, el.upFoe),
        infSelf: drop(el.infSelf, el.upSelf),
        blizzard: drop(el.blizzard, el.upBlizzard),
    };
    next.upShared = next.infShared > 0;
    next.upFoe = next.infFoe > 0;
    next.upSelf = next.infSelf > 0;
    next.upBlizzard = next.blizzard > 0;
    return next;
}

/** The numbers the board shows, one per element (FROZEN as 0 or 1). */
export function weatherReading(el: ElementState): Record<WeatherElement, number> {
    return {
        'foe-inferno': foeInferno(el),
        'your-inferno': yourInferno(el),
        blizzard: el.blizzard,
        storm: el.storm,
        frozen: el.frozen ? 1 : 0,
    };
}

const WEATHER_ELEMENTS: readonly WeatherElement[] = ['foe-inferno', 'your-inferno', 'blizzard', 'storm', 'frozen'];

/** One `weather-changed` event per element whose number moved from `before` to `after`. */
export function weatherEvents(before: ElementState | undefined, after: ElementState | undefined): CombatEvent[] {
    const a = weatherReading(before ?? initElementState());
    const b = weatherReading(after ?? initElementState());
    return WEATHER_ELEMENTS
        .filter(e => a[e] !== b[e])
        .map(element => ({ kind: 'weather-changed' as const, element, from: a[element], to: b[element] }));
}
