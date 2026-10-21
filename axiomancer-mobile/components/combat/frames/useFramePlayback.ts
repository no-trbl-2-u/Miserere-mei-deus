/**
 * The frame driver. One Reanimated shared value walks monotonically from 0 to
 * `clip.frames` over the clip's own duration; the integer part of that value is
 * the cell on screen. Reanimated is the library the combat pane already uses,
 * so the enemy's frames tick on the same clock as its recoil — and this hook
 * owns a shared value of its very own, so it can never touch the pane's
 * recoil / flash / squash / contact values.
 *
 * STILLNESS IS NOT A DEGRADED MODE. When the player has asked for reduced
 * motion, or the seeded e2e harness has set the instant escape hatch, the hook
 * starts no animation at all and reports the clip's RESTING frame. The enemy is
 * a picture again, exactly as it is today — not a frozen first cell, and never
 * a blank.
 */
import { useCallback, useEffect, useState } from 'react';
import {
    Easing, cancelAnimation, runOnJS, useAnimatedReaction, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';

import type { FrameClip } from '@/assets/images/enemies/frames';
import { resolveJuiceMode } from '@/lib/juice';

import { clipDurationMs } from './framePlayback';

/**
 * Reduced motion as the caller already holds it. The combat pane keeps the
 * answer in a ref it maintains itself; the dev harness holds a plain boolean.
 * Both are accepted so that nothing has to grow a SECOND source of truth for
 * the same preference — two mechanisms drift, and one of them will be wrong.
 */
export type ReducedMotionLike = boolean | { readonly current: boolean } | null | undefined;

export function readReducedMotion(input: ReducedMotionLike): boolean {
    if (typeof input === 'boolean') return input;
    return input?.current === true;
}

export interface FramePlaybackInput {
    clip: FrameClip;
    /** False pauses on the current frame — the dev harness's step mode. */
    playing?: boolean;
    reducedMotion?: ReducedMotionLike;
    /** A per-call instant override, beside the global e2e escape hatch. */
    instant?: boolean;
    /** Bump to restart the clip from its first frame. */
    startKey?: number;
}

export interface FramePlayback {
    /** The clip-relative frame to show. */
    index: number;
    /** True when nothing is animating and `index` is the resting frame. */
    still: boolean;
    /** Move the frame by hand. Only meaningful while paused. */
    step: (delta?: number) => void;
}

export function useFramePlayback({
    clip, playing = true, reducedMotion, instant, startKey = 0,
}: FramePlaybackInput): FramePlayback {
    const still = resolveJuiceMode({
        reducedMotion: readReducedMotion(reducedMotion),
        instant,
    }) === 'instant';

    const [index, setIndex] = useState(clip.rest);
    const progress = useSharedValue(clip.rest);

    const { frames, loop, fps, rest } = clip;

    useEffect(() => {
        if (still) {
            cancelAnimation(progress);
            progress.value = rest;
            setIndex(rest);
            return;
        }
        if (!playing) {
            cancelAnimation(progress);
            return;
        }
        const duration = clipDurationMs({ frames, loop, fps, rest, row: 0 });
        progress.value = 0;
        setIndex(0);
        const pass = withTiming(frames, { duration, easing: Easing.linear });
        progress.value = loop ? withRepeat(pass, -1, false) : pass;
        return () => cancelAnimation(progress);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [still, playing, frames, loop, fps, rest, startKey]);

    // The worklet below captures PRIMITIVES, never a helper from another module
    // and never a JS-thread reader — the same discipline EnemyActionCard keeps.
    useAnimatedReaction(
        () => {
            const raw = Math.floor(Math.max(0, progress.value));
            if (frames <= 1) return 0;
            return loop ? raw % frames : Math.min(raw, frames - 1);
        },
        (next, prev) => {
            if (next !== prev) runOnJS(setIndex)(next);
        },
        [frames, loop],
    );

    const step = useCallback((delta = 1) => {
        setIndex((current) => {
            const next = ((current + delta) % frames + frames) % frames;
            progress.value = next;
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [frames]);

    return { index, still, step };
}
