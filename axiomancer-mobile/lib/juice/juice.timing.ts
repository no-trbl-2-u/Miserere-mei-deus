/**
 * The central juice/animation layer's tunable timing/easing constants for
 * every primitive, isolated like `dice-roll-ritual.timing.ts`: tune the feel
 * HERE without touching a line of choreography.
 */

export type ShakeIntensity = 'low' | 'medium' | 'high';

export interface JuiceTiming {
    shake: {
        /** Peak offset in px per intensity tier. */
        amplitudePx: Record<ShakeIntensity, number>;
        /** Duration of each alternating decay step. */
        stepMs: number;
        /** Number of alternating steps before the final settle-to-0 step. */
        steps: number;
    };
    flash: {
        inMs: number;
        outMs: number;
        /** Opacity at intensity 1. */
        peakOpacity: number;
    };
    pulse: {
        /** Scale at intensity 1. */
        peakScale: number;
        inMs: number;
        outMs: number;
    };
    numberPop: {
        riseDistancePx: number;
        fadeDelayMs: number;
        fadeDurationMs: number;
        riseDurationMs: number;
    };
    /**
     * The looping "this thing is alive" idle — a breath swell plus a slower
     * vertical float. Two ends of a weight axis (a scurrying vermin vs a
     * boss the size of a house); `idleBreathProfile` interpolates between
     * them. The two periods are deliberately NOT harmonic so the swell and
     * the float drift out of phase and the loop never reads as a metronome.
     */
    idle: {
        breathMs: { light: number; heavy: number };
        breathScale: { light: number; heavy: number };
        floatMs: { light: number; heavy: number };
        floatPx: { light: number; heavy: number };
    };
}

export const JUICE_TIMING: JuiceTiming = {
    shake: { amplitudePx: { low: 3, medium: 6, high: 10 }, stepMs: 45, steps: 4 },
    flash: { inMs: 90, outMs: 260, peakOpacity: 0.4 },
    pulse: { peakScale: 1.12, inMs: 90, outMs: 220 },
    // A full read: opaque for 700 ms, then fading over 900 ms while it rises
    // over the whole 1.6 s. Every combat float shares it, so they keep one tempo.
    numberPop: { riseDistancePx: 40, fadeDelayMs: 700, fadeDurationMs: 900, riseDurationMs: 1600 },
    idle: {
        breathMs: { light: 1500, heavy: 2600 },
        breathScale: { light: 1.014, heavy: 1.032 },
        floatMs: { light: 2100, heavy: 3300 },
        floatPx: { light: 2.5, heavy: 6 },
    },
};
