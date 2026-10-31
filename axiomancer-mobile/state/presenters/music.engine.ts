/**
 * Background music director (phases MU1, CX1a). Pure: no audio, no React.
 *
 * `<BackgroundMusic>` feeds it the app state and applies the answer. The
 * answer is a CONTEXT (exploration, combat, hazard) and the track table says
 * which bundled track, if any, that context plays. Today only exploration has
 * one (T's theme); a context with no track pauses the exploration track in
 * place, so it resumes from the same spot. A combat track T supplies later is
 * one entry in `MUSIC_TRACKS`.
 */

export type MusicContext = 'exploration' | 'combat' | 'hazard';

/** A bundled track, by id; `<BackgroundMusic>` maps ids to assets. */
export type MusicTrackId = 'theme';

/** The one place a context is wired to a track. `null` means silence. */
export const MUSIC_TRACKS: Readonly<Record<MusicContext, MusicTrackId | null>> = {
    exploration: 'theme',
    combat: null,
    hazard: null,
};

export interface MusicInputs {
    /** `selectIsInCombat`: a fight is staged. */
    readonly inCombat: boolean;
    /**
     * The fight screen's own flag (`useCombatMode().inCombat`). It stays up
     * through the victory or defeat summary, after the engine has cleared the
     * staged fight, and drops when the player leaves the screen.
     */
    readonly onCombatScreen: boolean;
    /** `selectHasActiveHazard`: a hazard session is live. */
    readonly hasHazard: boolean;
    /** The Settings music volume, 0 to 100. */
    readonly musicVolume: number;
    /** False while the OS has sent the app to the background. */
    readonly appActive: boolean;
    /** A master mute (the Settings MUSIC switch, phase ST1a); absent means on. */
    readonly musicOn?: boolean;
}

export interface MusicDirective {
    readonly context: MusicContext;
    /** The track this context plays, or `null` for none. */
    readonly track: MusicTrackId | null;
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

/** Which context the app is in: a fight (staged or on its screen) outranks a hazard. */
export function musicContext(
    inputs: Pick<MusicInputs, 'inCombat' | 'onCombatScreen' | 'hasHazard'>,
): MusicContext {
    if (inputs.inCombat || inputs.onCombatScreen) return 'combat';
    if (inputs.hasHazard) return 'hazard';
    return 'exploration';
}

export function decideMusic(inputs: MusicInputs): MusicDirective {
    const targetVolume = Math.min(1, Math.max(0, inputs.musicVolume / 100));
    const context = musicContext(inputs);
    const track = MUSIC_TRACKS[context];
    const quiet = track === null || !inputs.appActive || targetVolume === 0 || inputs.musicOn === false;
    return { context, track, state: quiet ? 'paused' : 'playing', targetVolume };
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
