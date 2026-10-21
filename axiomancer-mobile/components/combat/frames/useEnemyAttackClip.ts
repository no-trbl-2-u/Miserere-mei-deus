/**
 * WHICH CLIP IS PLAYING — the stateful half of the combat wiring.
 *
 * Given the beat counter the pane bumps when the enemy acts, this hook says
 * which named clip the frame player should be on and when to restart it. The
 * attack starts at the pane's existing impact offset, so the enemy's swing
 * lands with the recoil, the shake and the flash rather than ahead of them;
 * when the one-shot has run its length the enemy returns to resting.
 *
 * It owns nothing but its own state. The pane's recoil / flash / squash /
 * contact shared values are not read here and not written here — this hook
 * cannot touch them, which is the point of it being a hook of its own.
 *
 * REDUCED MOTION comes in as the caller holds it (A4). The combat pane keeps
 * the answer in a ref it already maintains from `AccessibilityInfo`, and that
 * ref is what it passes; nothing here subscribes to anything. When it says
 * motion is reduced, no attack is ever selected, so the enemy stays on its
 * resting frame instead of holding the attack clip's rest frame — stillness
 * means the picture it was, not a different picture held still.
 */
import { useEffect, useState } from 'react';

import { RESTING_CLIP, type EnemyFrameSet } from '@/assets/images/enemies/frames';

import { clipDurationMs } from './framePlayback';
import { readReducedMotion, type ReducedMotionLike } from './useFramePlayback';
import { ATTACK_CLIP, ENEMY_ATTACK_IMPACT_MS, attackClipOf } from './enemyAttackBeat';

export interface EnemyAttackClipInput {
    /** The enemy's frame set, or null when it is a static painting. */
    frameSet: EnemyFrameSet | null;
    /**
     * A counter the pane bumps once per enemy beat. 0 means the enemy has not
     * acted yet; a counter rather than a boolean so two beats in a row are two
     * beats rather than one.
     */
    beat: number;
    /** The caller's own answer — the combat pane passes its existing ref. */
    reducedMotion?: ReducedMotionLike;
    /** Overridable only so a test need not wait out the real offset. */
    impactMs?: number;
}

export interface EnemyAttackClipState {
    /** The clip name to hand the player. */
    clipName: string;
    /** Bumped when a clip starts, so the player restarts from frame 0. */
    startKey: number;
    /** True while the attack clip is the selected one. */
    attacking: boolean;
}

export function useEnemyAttackClip({
    frameSet, beat, reducedMotion, impactMs = ENEMY_ATTACK_IMPACT_MS,
}: EnemyAttackClipInput): EnemyAttackClipState {
    const [state, setState] = useState<{ clipName: string; startKey: number }>({
        clipName: RESTING_CLIP, startKey: 0,
    });

    const attackClip = attackClipOf(frameSet);

    useEffect(() => {
        // Beat 0 is "the enemy has not acted"; a set with no attack clip has
        // nothing to select; reduced motion selects nothing at all.
        if (beat === 0 || !attackClip) return undefined;
        if (readReducedMotion(reducedMotion)) return undefined;

        const timers: ReturnType<typeof setTimeout>[] = [];
        timers.push(setTimeout(() => {
            setState((prev) => ({ clipName: ATTACK_CLIP, startKey: prev.startKey + 1 }));
            // A one-shot holds its last cell rather than snapping back, so the
            // return to resting is this timer's job, not the player's.
            timers.push(setTimeout(() => {
                setState((prev) => ({ ...prev, clipName: RESTING_CLIP }));
            }, clipDurationMs(attackClip)));
        }, impactMs));

        return () => { timers.forEach(clearTimeout); };
    }, [beat, attackClip, reducedMotion, impactMs]);

    return { clipName: state.clipName, startKey: state.startKey, attacking: state.clipName === ATTACK_CLIP };
}
