import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { isDevToolsEnabled } from '@/lib/buildProfile';
import { configureGameAudio, createLoopingPlayer, type LoopingPlayer } from '@/lib/platform/audio';
import { useCombatMode } from '@/state/combat-mode';
import { useGameState } from '@/state/GameStoreProvider';
import { selectHasActiveHazard } from '@/state/presenters/hazard.engine';
import {
    FADE_IN_MS,
    FADE_OUT_MS,
    FADE_TICK_MS,
    decideMusic,
    fadeSteps,
    fadeVolume,
    type MusicTrackId,
} from '@/state/presenters/music.engine';
import { useSetting } from '@/state/settings';
import { selectIsInCombat } from '@mechanics';

/** Track id to bundled file; `MUSIC_TRACKS` (music.engine) says which context plays which. */
const TRACK_ASSETS: Readonly<Record<MusicTrackId, number>> = {
    theme: require('@/assets/audio/miserere-theme.mp3') as number,
};

/** A function, not an inline `!==`, so the check survives a table with one track (TS narrows it to `never`). */
const isOtherTrack = (a: MusicTrackId, b: MusicTrackId): boolean => a !== b;

/**
 * `active` is true while the OS has not sent the app to the background; `wake`
 * counts every app-state event, so the player's real status is rechecked on a
 * return to the foreground even when `active` did not change.
 */
function useAppActive(): { active: boolean; wake: number } {
    const [active, setActive] = useState(
        AppState.currentState !== 'background' && AppState.currentState !== 'inactive',
    );
    const [wake, setWake] = useState(0);
    useEffect(() => {
        const sub = AppState.addEventListener('change', (next) => {
            setActive(next === 'active');
            setWake((n) => n + 1);
        });
        return () => sub.remove();
    }, []);
    return { active, wake };
}

const GESTURE_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;

/**
 * Native can always play. A browser blocks sound until the player has touched
 * the page, so on web this stays false until the first tap or key press; the
 * music is never asked to start before then, so no autoplay refusal is raised.
 */
function useAudioUnlocked(): boolean {
    const [unlocked, setUnlocked] = useState(() => {
        if (Platform.OS !== 'web') return true;
        const activation = (globalThis.navigator as { userActivation?: { hasBeenActive?: boolean } } | undefined)
            ?.userActivation;
        return activation?.hasBeenActive === true;
    });
    useEffect(() => {
        if (unlocked || typeof document === 'undefined') return undefined;
        const unlock = (): void => setUnlocked(true);
        for (const evt of GESTURE_EVENTS) document.addEventListener(evt, unlock, { capture: true, once: true });
        return () => {
            for (const evt of GESTURE_EVENTS) document.removeEventListener(evt, unlock, { capture: true });
        };
    }, [unlocked]);
    return unlocked;
}

/**
 * T's theme, looping under the whole game (phase MU1). Side-effect-only,
 * mounted once in the root layout beside the gates.
 *
 * One long-lived player per track, so a route change or re-render can never
 * start a second copy or seek it. The context comes from game state and the
 * fight screen's flag (`decideMusic`), not routes: a fight (through its
 * summary, until the player leaves the screen) or a hazard fades the music
 * out over half a second and pauses in place; when it ends the same player
 * resumes from where it stopped and fades in over two seconds. If the OS
 * stops the player behind our back, the next foreground or context change
 * starts it again.
 */
export function BackgroundMusic() {
    const inCombat = useGameState(selectIsInCombat);
    const { inCombat: onCombatScreen } = useCombatMode();
    const hasHazard = useGameState(selectHasActiveHazard);
    const musicVolume = useSetting('musicVolume');
    const musicOn = useSetting('musicOn');
    const { active: appActive, wake } = useAppActive();
    const unlocked = useAudioUnlocked();

    const directive = decideMusic({ inCombat, onCombatScreen, hasHazard, musicVolume, musicOn, appActive });

    const playersRef = useRef<Partial<Record<MusicTrackId, LoopingPlayer>>>({});
    /** The track whose player is sounding or fading, if any. */
    const activeRef = useRef<MusicTrackId | null>(null);
    const volumeRef = useRef(0);
    const targetRef = useRef(directive.targetVolume);
    const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
    targetRef.current = directive.targetVolume;

    useEffect(() => {
        configureGameAudio();
    }, []);

    const getPlayer = (track: MusicTrackId): LoopingPlayer => {
        let player = playersRef.current[track];
        if (!player) {
            player = createLoopingPlayer(TRACK_ASSETS[track]);
            playersRef.current[track] = player;
        }
        return player;
    };

    const stopFade = (): void => {
        if (fadeRef.current !== null) clearInterval(fadeRef.current);
        fadeRef.current = null;
    };

    const setVolume = (volume: number): void => {
        volumeRef.current = volume;
        if (activeRef.current) getPlayer(activeRef.current).setVolume(volume);
    };

    /** Step the volume to `to()` over `durationMs`; `to` is read live so a Settings change mid-fade is honoured. */
    const fadeTo = (to: () => number, durationMs: number, onDone?: () => void): void => {
        stopFade();
        const from = volumeRef.current;
        const steps = fadeSteps(durationMs);
        let step = 0;
        fadeRef.current = setInterval(() => {
            step += 1;
            setVolume(fadeVolume(from, to(), step, steps));
            if (step >= steps) {
                stopFade();
                onDone?.();
            }
        }, FADE_TICK_MS);
    };

    const wantPlaying = directive.state === 'playing' && unlocked;
    const wantTrack = wantPlaying ? directive.track : null;
    useEffect(() => {
        const current = activeRef.current;
        if (wantTrack) {
            if (current && isOtherTrack(current, wantTrack)) {
                stopFade();
                playersRef.current[current]?.pause();
                activeRef.current = null;
            }
            const player = getPlayer(wantTrack);
            if (activeRef.current !== wantTrack) {
                activeRef.current = wantTrack;
                setVolume(0);
            }
            player.play();
            fadeTo(() => targetRef.current, FADE_IN_MS);
        } else if (current) {
            fadeTo(() => 0, FADE_OUT_MS, () => {
                playersRef.current[current]?.pause();
                activeRef.current = null;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the helpers only touch refs
    }, [wantTrack]);

    // A volume change while the music is steady applies at once, without a restart.
    useEffect(() => {
        if (wantTrack && activeRef.current && fadeRef.current === null) setVolume(directive.targetVolume);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the helpers only touch refs
    }, [directive.targetVolume]);

    // The player may have been stopped behind our back (an Android focus loss,
    // an OS pause): when the theme is wanted and steady but the native player
    // says it is not playing, start it again on a foreground or context change.
    useEffect(() => {
        if (!wantTrack || activeRef.current !== wantTrack || fadeRef.current !== null) return;
        const player = playersRef.current[wantTrack];
        if (player && !player.isPlaying()) player.play();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the helpers only touch refs
    }, [directive.context, wake]);

    // Dev builds publish what the director decided, for the browser drives.
    useEffect(() => {
        if (!isDevToolsEnabled()) return;
        (globalThis as { __AXM_MUSIC__?: unknown }).__AXM_MUSIC__ = {
            context: directive.context,
            playing: wantTrack !== null,
        };
    }, [directive.context, wantTrack]);

    useEffect(
        () => () => {
            stopFade();
            for (const player of Object.values(playersRef.current)) player?.release();
            playersRef.current = {};
            activeRef.current = null;
        },
        [],
    );

    return null;
}
