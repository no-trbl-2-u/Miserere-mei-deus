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
 * THE ORDER OF THE TWO is the action, then the flinch, and a flinch never
 * interrupts the action. The action clip starts at the pane's existing impact
 * offset and runs its whole length. A struck beat in the same resolution, or
 * one that arrives while an action clip is pending or playing, is held, and the
 * flinch starts in the same callback that ends the action, so no idle frame
 * falls between them. However many beats were held, one flinch plays. With no
 * action to wait behind (a stunned turn's tick, the player's own card) the
 * flinch keeps the board's wait above. Whoever started last owns the return to
 * rest: that is what the play token below is for, so an earlier clip's expiry
 * cannot drop a later clip back to idle halfway through.
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
     * A counter the pane bumps once per enemy ACTION beat, any move it fired.
     * 0 means the enemy has not acted yet; a counter rather than a boolean so
     * two beats in a row are two beats rather than one.
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

    // True from the action beat until its clip has run; a struck beat seen in
    // that span raises `flinchOwed` instead of starting anything.
    const actionInFlight = useRef(false);
    const flinchOwed = useRef(false);

    /**
     * Start a one-shot and schedule what follows it: the return to rest, or
     * `then` in its place. Returns the timer so the caller's effect cleanup can
     * drop it on unmount; the token check means a surviving timer still cannot
     * clobber a newer clip.
     */
    const play = useCallback((clipName: string, durationMs: number, then?: () => void) => {
        const token = (playToken.current += 1);
        setState((prev) => ({ clipName, startKey: prev.startKey + 1 }));
        // A one-shot holds its last cell rather than snapping back, so the
        // return to resting is this timer's job, not the player's.
        return setTimeout(() => {
            if (playToken.current !== token) return;
            if (then) then();
            else setState((prev) => ({ ...prev, clipName: RESTING_CLIP }));
        }, durationMs);
    }, []);

    /**
     * Back to the resting clip now, outranking any return still pending. The
     * token bump means an action cut here never reaches its end, so what that
     * end would have settled is settled here.
     */
    const rest = useCallback(() => {
        playToken.current += 1;
        actionInFlight.current = false;
        flinchOwed.current = false;
        setState((prev) => (prev.clipName === RESTING_CLIP ? prev : { ...prev, clipName: RESTING_CLIP }));
    }, []);

    // THE ACTION. Delayed to the pane's impact offset so it lands with the
    // recoil, the shake and the flash rather than ahead of them. Declared before
    // the flinch: effects run in declaration order, so in the commit that bumped
    // both counters the flinch below already sees this one in flight.
    useEffect(() => {
        // Beat 0 is "the enemy has not acted"; a set with no attack clip has
        // nothing to select. Reduced motion selects nothing either, but it is
        // asked at the impact beat below rather than here.
        if (attackBeat === 0 || !attackClip) return undefined;

        actionInFlight.current = true;
        const timers: ReturnType<typeof setTimeout>[] = [];
        timers.push(setTimeout(() => {
            // Sampled HERE, not when the effect ran: the preference is read at
            // the moment the action would start, so a toggle inside the impact
            // window is honoured rather than a stale answer from the beat.
            if (readReducedMotion(reducedMotion)) { rest(); return; }
            timers.push(play(ATTACK_CLIP, clipDurationMs(attackClip), () => {
                const owed = flinchOwed.current;
                if (owed && struckClip && !readReducedMotion(reducedMotion)) {
                    actionInFlight.current = false;
                    flinchOwed.current = false;
                    timers.push(play(STRUCK_CLIP, clipDurationMs(struckClip)));
                } else {
                    rest();
                }
            }));
        }, impactMs));

        return () => {
            timers.forEach(clearTimeout);
            actionInFlight.current = false;
        };
    }, [attackBeat, attackClip, struckClip, reducedMotion, impactMs, play, rest]);

    // THE FLINCH. Owed to the action's end when one is in flight, and otherwise
    // held for the board's card motion.
    useEffect(() => {
        if (struckBeat === 0 || !struckClip) return undefined;
        // This beat's cleanup dropped the previous flinch's return timer, so
        // a beat that selects nothing hands the enemy back to rest itself.
        if (readReducedMotion(reducedMotion)) { rest(); return undefined; }
        if (actionInFlight.current) { flinchOwed.current = true; return undefined; }

        const timers: ReturnType<typeof setTimeout>[] = [];
        timers.push(setTimeout(() => {
            // Sampled at the moment the flinch would start, like the action.
            if (readReducedMotion(reducedMotion)) { rest(); return; }
            // An action beat arrived during the wait: go behind it, not through it.
            if (actionInFlight.current) { flinchOwed.current = true; return; }
            timers.push(play(STRUCK_CLIP, clipDurationMs(struckClip)));
        }, struckDelayMs));
        return () => { timers.forEach(clearTimeout); };
    }, [struckBeat, struckClip, reducedMotion, play, struckDelayMs, rest]);

    return {
        clipName: state.clipName,
        startKey: state.startKey,
        attacking: state.clipName === ATTACK_CLIP,
        struck: state.clipName === STRUCK_CLIP,
    };
}
