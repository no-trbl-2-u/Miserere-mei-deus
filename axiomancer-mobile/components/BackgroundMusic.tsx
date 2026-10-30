import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { createLoopingPlayer, type LoopingPlayer } from '@/lib/platform/audio';
import { useGameState } from '@/state/GameStoreProvider';
import { selectHasActiveHazard } from '@/state/presenters/hazard.engine';
import {
    FADE_IN_MS,
    FADE_OUT_MS,
    FADE_TICK_MS,
    decideMusic,
    fadeSteps,
    fadeVolume,
} from '@/state/presenters/music.engine';
import { useSetting } from '@/state/settings';
import { selectIsInCombat } from '@mechanics';

const THEME = require('@/assets/audio/miserere-theme.mp3') as number;

/** True while the OS has not sent the app to the background. */
function useAppActive(): boolean {
    const [active, setActive] = useState(
        AppState.currentState !== 'background' && AppState.currentState !== 'inactive',
    );
    useEffect(() => {
        const sub = AppState.addEventListener('change', (next) => setActive(next === 'active'));
        return () => sub.remove();
    }, []);
    return active;
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
 * One long-lived player owns the track, so a route change or re-render can
 * never start a second copy or seek it. The pause decision comes from game
 * state (`decideMusic`), not routes: a fight or hazard fades the music out
 * over half a second and pauses in place; when it ends the same player
 * resumes from where it stopped and fades in over two seconds.
 */
export function BackgroundMusic() {
    const inCombat = useGameState(selectIsInCombat);
    const hasHazard = useGameState(selectHasActiveHazard);
    const musicVolume = useSetting('musicVolume');
    const appActive = useAppActive();
    const unlocked = useAudioUnlocked();

    const directive = decideMusic({ inCombat, hasHazard, musicVolume, appActive });

    const playerRef = useRef<LoopingPlayer | null>(null);
    const volumeRef = useRef(0);
    const targetRef = useRef(directive.targetVolume);
    const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audibleRef = useRef(false);
    targetRef.current = directive.targetVolume;

    const getPlayer = (): LoopingPlayer => {
        if (!playerRef.current) playerRef.current = createLoopingPlayer(THEME);
        return playerRef.current;
    };

    const stopFade = (): void => {
        if (fadeRef.current !== null) clearInterval(fadeRef.current);
        fadeRef.current = null;
    };

    const setVolume = (volume: number): void => {
        volumeRef.current = volume;
        getPlayer().setVolume(volume);
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
    useEffect(() => {
        if (wantPlaying) {
            const player = getPlayer();
            if (!audibleRef.current) setVolume(0);
            audibleRef.current = true;
            player.play();
            fadeTo(() => targetRef.current, FADE_IN_MS);
        } else if (audibleRef.current) {
            fadeTo(() => 0, FADE_OUT_MS, () => {
                playerRef.current?.pause();
                audibleRef.current = false;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the helpers only touch refs
    }, [wantPlaying]);

    // A volume change while the music is steady applies at once, without a restart.
    useEffect(() => {
        if (wantPlaying && audibleRef.current && fadeRef.current === null) setVolume(directive.targetVolume);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the helpers only touch refs
    }, [directive.targetVolume]);

    useEffect(
        () => () => {
            stopFade();
            playerRef.current?.release();
            playerRef.current = null;
            audibleRef.current = false;
        },
        [],
    );

    return null;
}
