/**
 * Presenter — the SETTINGS screen.
 *
 * Every line the screen prints and every option list it offers lives here,
 * plus the pure view-model over `PlayerSettings`. The screen renders; it
 * does not author copy or decide option sets.
 *
 * What a NEW PLAYER can change, and why each row exists:
 *   - COLOUR THEME   the five palettes (moved here from the SELF tab);
 *   - TEXT SIZE      four steps; scales every stylesheet's type;
 *   - REDUCED MOTION follow the OS, or force on / off;
 *   - HAPTICS        the pulses on drags and dice;
 *   - MUSIC / SOUND  volumes kept for the audio build (nothing plays yet);
 *   - STORY MODE     coming soon — listed so its absence is not a mystery.
 *
 * Functions (lowest → highest abstraction):
 *   volumeStep(value, delta)         clamp a 0–100 step
 *   selectSettingsViewModel(settings, inRun)  the rows
 */

import { TEXT_SCALES, type PlayerSettings, type ReducedMotionPreference, type TextScale } from '../settings';

export const SETTINGS_COPY = Object.freeze({
    eyebrow: 'THE PILGRIM’S PREFERENCES',
    title: 'SETTINGS',
    subtitle: 'kept on this device; a new game never resets them',
    back: 'BACK',
    sections: Object.freeze({
        appearance: 'APPEARANCE',
        motion: 'MOTION & FEEL',
        sound: 'SOUND',
        story: 'STORY',
        run: 'THE RUN',
        feedback: 'FEEDBACK',
        device: 'THIS DEVICE',
    }),
    textSize: 'TEXT SIZE',
    textSizeHint: 'grows every line of type; the chrome holds',
    reducedMotion: 'REDUCED MOTION',
    reducedMotionHint: 'skip the dice ritual, fades and pops',
    haptics: 'HAPTICS',
    hapticsHint: 'the pulse on drags and dice',
    musicSwitch: 'MUSIC',
    musicSwitchHint: 'the theme under the road; the volume below is kept',
    music: 'MUSIC VOLUME',
    sfx: 'SOUND EFFECTS',
    soundNote: 'sound effects are still to come — the slider is kept for the build that brings them',
    storyMode: 'STORY MODE',
    storyModeHint: 'a gentler road through the same chronicle — coming soon',
    comingSoon: 'COMING SOON',
    returnToTitle: 'SAVE & RETURN TO TITLE',
    returnToTitleHint: 'the chronicle is written before you leave',
    resetSettings: 'RESET SETTINGS',
    resetSettingsHint: 'back to the defaults; the chronicles are untouched',
    resetSettingsTitle: 'reset every setting?',
    resetSettingsBody: 'theme, text size, motion, haptics and sound (music back on) return to their defaults. no chronicle is touched.',
    resetSettingsConfirm: 'RESET',
    cancel: 'KEEP IT',
    feedbackHint: 'tell us about a bug, or propose a change',
    on: 'ON',
    off: 'OFF',
});

export const FEEDBACK_COPY = Object.freeze({
    open: 'SEND FEEDBACK',
    title: 'SEND FEEDBACK',
    kindLabel: 'WHAT IS IT?',
    bug: 'BUG',
    proposal: 'PROPOSAL',
    placeholder: 'what happened, or what would you change?',
    submit: 'SUBMIT',
    cancel: 'CANCEL',
    thanks: 'Thanks. This build doesn\u2019t send feedback yet.',
});

/** The longest feedback text the form takes. */
export const FEEDBACK_MAX_CHARS = 1000;

export type FeedbackKind = 'bug' | 'proposal';

/** The form's one typed value. In memory only; a closed form forgets it. */
export interface FeedbackDraft {
    readonly kind: FeedbackKind;
    readonly text: string;
}

export const FEEDBACK_KIND_OPTIONS: readonly OptionVM<FeedbackKind>[] = Object.freeze([
    { value: 'bug', label: FEEDBACK_COPY.bug },
    { value: 'proposal', label: FEEDBACK_COPY.proposal },
]);

export interface FeedbackFormState {
    readonly kind: FeedbackKind | null;
    readonly text: string;
}

export const EMPTY_FEEDBACK_FORM: FeedbackFormState = Object.freeze({ kind: null, text: '' });

export interface FeedbackViewModel {
    /** The text, cut to `FEEDBACK_MAX_CHARS`. */
    readonly text: string;
    /** `12 / 1000` for the live count. */
    readonly countLabel: string;
    /** SUBMIT is live only with a kind picked and a non-blank text. */
    readonly canSubmit: boolean;
    /** The draft a submit would hand on; null while `canSubmit` is false. */
    readonly draft: FeedbackDraft | null;
}

/** The form's rows and the draft it would submit. Pure. */
export function selectFeedbackViewModel(form: FeedbackFormState): FeedbackViewModel {
    const text = form.text.slice(0, FEEDBACK_MAX_CHARS);
    const canSubmit = form.kind !== null && text.trim().length > 0;
    return {
        text,
        countLabel: `${text.length} / ${FEEDBACK_MAX_CHARS}`,
        canSubmit,
        draft: canSubmit && form.kind !== null ? { kind: form.kind, text } : null,
    };
}

export interface OptionVM<V> {
    readonly value: V;
    readonly label: string;
}

export const TEXT_SCALE_OPTIONS: readonly OptionVM<TextScale>[] = Object.freeze(
    TEXT_SCALES.map((value) => ({
        value,
        label: value === 0.9 ? 'SMALL' : value === 1 ? 'DEFAULT' : value === 1.15 ? 'LARGE' : 'LARGER',
    })),
);

export const REDUCED_MOTION_OPTIONS: readonly OptionVM<ReducedMotionPreference>[] = Object.freeze([
    { value: 'system', label: 'SYSTEM' },
    { value: 'on', label: 'ON' },
    { value: 'off', label: 'OFF' },
]);

export const TOGGLE_OPTIONS: readonly OptionVM<boolean>[] = Object.freeze([
    { value: true, label: SETTINGS_COPY.on },
    { value: false, label: SETTINGS_COPY.off },
]);

/** The volume stepper's increment. */
export const VOLUME_STEP = 10;

/** Clamp `value + delta` into 0–100. Pure. */
export function volumeStep(value: number, delta: number): number {
    return Math.max(0, Math.min(100, value + delta));
}

export interface SettingsViewModel {
    readonly textScale: TextScale;
    readonly reducedMotion: ReducedMotionPreference;
    readonly haptics: boolean;
    readonly musicOn: boolean;
    readonly musicVolume: number;
    readonly sfxVolume: number;
    /** `70%` for the stepper readout. */
    readonly musicLabel: string;
    readonly sfxLabel: string;
    /** RETURN TO TITLE only makes sense inside a run. */
    readonly inRun: boolean;
}

/** The screen's rows. Pure. */
export function selectSettingsViewModel(settings: PlayerSettings, inRun: boolean): SettingsViewModel {
    return {
        textScale: settings.textScale,
        reducedMotion: settings.reducedMotion,
        haptics: settings.haptics,
        musicOn: settings.musicOn,
        musicVolume: settings.musicVolume,
        sfxVolume: settings.sfxVolume,
        musicLabel: `${settings.musicVolume}%`,
        sfxLabel: `${settings.sfxVolume}%`,
        inRun,
    };
}
