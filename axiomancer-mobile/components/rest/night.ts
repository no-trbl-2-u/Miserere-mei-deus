/**
 * The night a rest runs through between the pick and the outcome (Phase ET1c):
 * dusk, night, dawn, about two seconds in all. Pure timing; the component
 * and its test read it so neither guesses the other's clock.
 */

export type NightStage = 'dusk' | 'night' | 'dawn';

/** How long each stage holds, in ms. The sum stays near two seconds. */
export const NIGHT_TIMING = Object.freeze({ duskMs: 600, nightMs: 900, dawnMs: 500 });

export const NIGHT_TOTAL_MS = NIGHT_TIMING.duskMs + NIGHT_TIMING.nightMs + NIGHT_TIMING.dawnMs;

/** The stage `elapsedMs` into the night; `null` once the night is over. */
export function nightStageAt(elapsedMs: number): NightStage | null {
    if (elapsedMs < NIGHT_TIMING.duskMs) return 'dusk';
    if (elapsedMs < NIGHT_TIMING.duskMs + NIGHT_TIMING.nightMs) return 'night';
    if (elapsedMs < NIGHT_TOTAL_MS) return 'dawn';
    return null;
}
