/**
 * WHICH CLIP IS PLAYING — the stateful half of the combat wiring.
 *
 * Given the two beat counters the pane bumps — the enemy acting, and the enemy
 * being hit — this hook says which named clip the frame player should be on and
 * when to restart it. `idle` is where it sits: a loop, not a held frame, so a
 * resting enemy is alive rather than paused. `struck` and `attacking` are
 * one-shots laid over it, and when one has run its own length the enemy is
 * handed back to `idle`.
 *
 * THE FLINCH WAITS FOR THE BOARD. A blow the player lands comes from a card
 * they have just played over the battlefield, and the board's card motion from
 * that commit is still running over the enemy when the events arrive. So the
 * flinch is held until that motion has settled (`CARD_MOTION_SETTLE_MS`, the
 * board's own card durations, not a copy of them) and plays on a clear board.
 *
 * THE ORDER OF THE TWO is not arbitrated by a priority table, because the
 * timing already arbitrates it. The swing starts at the pane's existing impact
 * offset. When a single resolution contains both (the enemy's threat fires and
 * it also took damage, a damage-over-time tick say) the flinch keeps its place
 * on the beat itself, ahead of the swing, and the swing takes over from it at
 * the beat it was always going to land on; a flinch held past the impact would
 * cut the swing off instead. Whoever started last owns the return to rest —
 * that is what the play token below is for, so an earlier clip's expiry cannot
 * drop a later clip back to idle halfway through.
 *
 * It owns nothing but its own state. The pane's recoil / flash / squash /
 * contact shared values are not read here and not written here — this hook
 * cannot touch them, which is the point of it being a hook of its own.
 *
 * REDUCED MOTION comes in as the caller holds it (A4). The combat pane keeps
 * the answer in a ref it already maintains from the platform, and that ref is
 * what it passes; nothing here subscribes to anything. When it says motion is
 * reduced, no clip is ever selected, so the enemy stays on its resting frame
 * instead of holding some other clip's rest frame — stillness means the picture
 * it was, not a different picture held still.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { RESTING_CLIP, type EnemyFrameSet } from '@/assets/images/enemies/frames';
import { CARD_MOTION_SETTLE_MS } from '@/components/combat/encounter/cardMotion';

import { clipDurationMs } from './framePlayback';
import { readReducedMotion, type ReducedMotionLike } from './useFramePlayback';
import { ATTACK_CLIP, ENEMY_ATTACK_IMPACT_MS, attackClipOf } from './enemyAttackBeat';
import { STRUCK_CLIP, struckClipOf } from './enemyStruckBeat';

export interface EnemyClipSelectionInput {
    /** The enemy's frame set, or null when it is a static painting. */
    frameSet: EnemyFrameSet | null;
    /**
     * A counter the pane bumps once per enemy ATTACK beat. 0 means the enemy
     * has not acted yet; a counter rather than a boolean so two beats in a row
     * are two beats rather than one.
     */
    attackBeat: number;
    /** The same, for the resolutions in which the enemy TOOK damage. */
    struckBeat: number;
    /** The caller's own answer — the combat pane passes its existing ref. */
    reducedMotion?: ReducedMotionLike;
    /** Overridable only so a test need not wait out the real offset. */
    impactMs?: number;
    /** The same, for the flinch's wait on the board's card motion. */
    struckDelayMs?: number;
}

export interface EnemyClipSelectionState {
    /** The clip name to hand the player. */
    clipName: string;
    /** Bumped when a clip starts, so the player restarts from frame 0. */
    startKey: number;
    /** True while the attack clip is the selected one. */
    attacking: boolean;
    /** True while the struck clip is the selected one. */
    struck: boolean;
}

export function useEnemyClipSelection({
    frameSet, attackBeat, struckBeat, reducedMotion, impactMs = ENEMY_ATTACK_IMPACT_MS,
    struckDelayMs = CARD_MOTION_SETTLE_MS,
}: EnemyClipSelectionInput): EnemyClipSelectionState {
    const [state, setState] = useState<{ clipName: string; startKey: number }>({
        clipName: RESTING_CLIP, startKey: 0,
    });

    const attackClip = attackClipOf(frameSet);
    const struckClip = struckClipOf(frameSet);

    // Monotonic: every started clip takes the next token, and only the clip
    // holding the current token is allowed to hand the enemy back to rest.
    const playToken = useRef(0);

    /**
     * Start a one-shot and schedule the return to rest. Returns the timer so
     * the caller's effect cleanup can drop it on unmount; the token check means
     * a surviving timer still cannot clobber a newer clip.
     */
    const play = useCallback((clipName: string, durationMs: number) => {
        const token = (playToken.current += 1);
        setState((prev) => ({ clipName, startKey: prev.startKey + 1 }));
        // A one-shot holds its last cell rather than snapping back, so the
        // return to resting is this timer's job, not the player's.
        return setTimeout(() => {
            if (playToken.current !== token) return;
            setState((prev) => ({ ...prev, clipName: RESTING_CLIP }));
        }, durationMs);
    }, []);

    /** Back to the resting clip now, outranking any return still pending. */
    const rest = useCallback(() => {
        playToken.current += 1;
        setState((prev) => (prev.clipName === RESTING_CLIP ? prev : { ...prev, clipName: RESTING_CLIP }));
    }, []);

    // THE SWING. Delayed to the pane's impact offset so it lands with the
    // recoil, the shake and the flash rather than ahead of them.
    useEffect(() => {
        // Beat 0 is "the enemy has not acted"; a set with no attack clip has
        // nothing to select. Reduced motion selects nothing either, but it is
        // asked at the impact beat below rather than here.
        if (attackBeat === 0 || !attackClip) return undefined;

        const timers: ReturnType<typeof setTimeout>[] = [];
        timers.push(setTimeout(() => {
            // Sampled HERE, not when the effect ran: the preference is read at
            // the moment the swing would start, so a toggle inside the impact
            // window is honoured rather than a stale answer from 100ms ago.
            if (readReducedMotion(reducedMotion)) return;
            timers.push(play(ATTACK_CLIP, clipDurationMs(attackClip)));
        }, impactMs));

        return () => { timers.forEach(clearTimeout); };
    }, [attackBeat, attackClip, reducedMotion, impactMs, play]);

    // The attack beat as of the last commit, written by the effect declared
    // last below. Effects run in declaration order, so the flinch's effect
    // still sees the previous value in the commit that bumped both counters,
    // and that is how it knows the swing is from its own resolution.
    const seenAttackBeat = useRef(attackBeat);

    // THE FLINCH. Held for the board's card motion, unless a swing from the
    // same resolution is due at the impact offset: then it plays now, ahead of
    // the swing, as it always did.
    useEffect(() => {
        if (struckBeat === 0 || !struckClip) return undefined;
        // This beat's cleanup dropped the previous flinch's return timer, so
        // a beat that selects nothing hands the enemy back to rest itself.
        if (readReducedMotion(reducedMotion)) { rest(); return undefined; }

        const swingToo = !!attackClip && attackBeat !== seenAttackBeat.current;
        const timers: ReturnType<typeof setTimeout>[] = [];
        if (swingToo) {
            timers.push(play(STRUCK_CLIP, clipDurationMs(struckClip)));
        } else {
            timers.push(setTimeout(() => {
                // Sampled at the moment the flinch would start, like the swing.
                if (readReducedMotion(reducedMotion)) { rest(); return; }
                timers.push(play(STRUCK_CLIP, clipDurationMs(struckClip)));
            }, struckDelayMs));
        }
        return () => { timers.forEach(clearTimeout); };
        // attackBeat and attackClip are read, not watched: a swing on its own
        // is the effect above's business and must not replay a flinch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [struckBeat, struckClip, reducedMotion, play, struckDelayMs, rest]);

    useEffect(() => { seenAttackBeat.current = attackBeat; }, [attackBeat]);

    return {
        clipName: state.clipName,
        startKey: state.startKey,
        attacking: state.clipName === ATTACK_CLIP,
        struck: state.clipName === STRUCK_CLIP,
    };
}
