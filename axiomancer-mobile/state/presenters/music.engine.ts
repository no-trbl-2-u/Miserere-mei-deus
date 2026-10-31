/**
 * Background music director (phase MU1). Pure: no audio, no React.
 *
 * `<BackgroundMusic>` feeds it the app state and applies the answer. The
 * theme plays under everything except a staged fight or a live hazard; it is
 * silent at volume 0 and while the app is in the background.
 */

export interface MusicInputs {
    /** `selectIsInCombat`: a fight is staged. */
    readonly inCombat: boolean;
    /** `selectHasActiveHazard`: a hazard session is live. */
    readonly hasHazard: boolean;
    /** The Settings music volume, 0 to 100. */
    readonly musicVolume: number;
    /** The Settings music switch (master mute). Absent reads as on. */
    readonly musicOn?: boolean;
    /** False while the OS has sent the app to the background. */
    readonly appActive: boolean;
}

export interface MusicDirective {
    readonly state: 'playing' | 'paused';
    /** 0 to 1, linear in `musicVolume`. */
    readonly targetVolume: number;
}

/** Fade in over this long when the music starts or resumes. */
export const FADE_IN_MS = 2000;
/** Fade out over this long on the way into a pause. */
export const FADE_OUT_MS = 500;
/** Volume steps are applied this often during a fade. */
export const FADE_TICK_MS = 50;

export function decideMusic(inputs: MusicInputs): MusicDirective {
    const targetVolume = Math.min(1, Math.max(0, inputs.musicVolume / 100));
    const quiet = inputs.inCombat || inputs.hasHazard || !inputs.appActive || targetVolume === 0 ||
        inputs.musicOn === false;
    return { state: quiet ? 'paused' : 'playing', targetVolume };
}

/** The volume `step` of `steps` into a linear fade from `from` to `to`. */
export function fadeVolume(from: number, to: number, step: number, steps: number): number {
    if (steps <= 0 || step >= steps) return to;
    return from + (to - from) * (step / steps);
}

/** How many ticks a fade of `durationMs` takes. */
export function fadeSteps(durationMs: number): number {
    return Math.max(1, Math.ceil(durationMs / FADE_TICK_MS));
}
