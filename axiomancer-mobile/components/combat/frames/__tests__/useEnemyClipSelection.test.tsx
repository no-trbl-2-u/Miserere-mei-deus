/**
 * Phase AN1c — three states, and the engine choosing between them.
 *
 * One test per state, because the three fail in different ways: idle is wrong
 * by never ending, struck is wrong by never starting (its signal is a
 * different one from the swing's), and attacking is wrong by starting on the
 * frame the events arrived rather than on the beat. The last two describes are
 * the ones that only exist because there are now three: what happens when a
 * single resolution is both the player's blow and the enemy's swing, and what
 * happens to a set that names fewer than three clips.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { EnemyFrameSet, FrameClip } from '@/assets/images/enemies/frames';

import { ATTACK_CLIP, ENEMY_ATTACK_IMPACT_MS } from '../enemyAttackBeat';
import { STRUCK_CLIP, struckClipOf } from '../enemyStruckBeat';
import { useEnemyClipSelection } from '../useEnemyClipSelection';
import { SYNTHETIC_FRAME_SET } from '../syntheticFrameSet';
import { clipDurationMs, frameIndexAt } from '../framePlayback';
import {
    CARD_ENTER_MS, CARD_LAYOUT_MS, CARD_MOTION_SETTLE_MS,
} from '@/components/combat/encounter/cardMotion';
import { FAN_CARD_ENTERING, FAN_CARD_LAYOUT } from '@/components/combat/encounter/CombatBoard';

const IDLE = SYNTHETIC_FRAME_SET.manifest.clips.idle;
const ATTACK = SYNTHETIC_FRAME_SET.manifest.clips[ATTACK_CLIP];
const STRUCK = SYNTHETIC_FRAME_SET.manifest.clips[STRUCK_CLIP];

/** A copy of the fixture with one clip removed — the manifest is readonly. */
function withoutClip(name: string): EnemyFrameSet {
    const clips: Record<string, FrameClip> = { ...SYNTHETIC_FRAME_SET.manifest.clips };
    delete clips[name];
    return {
        ...SYNTHETIC_FRAME_SET,
        manifest: { ...SYNTHETIC_FRAME_SET.manifest, clips },
    };
}

// A probe component, so the hook is exercised through React's own scheduling
// rather than called as a function.
function Probe(props: Parameters<typeof useEnemyClipSelection>[0]) {
    const { clipName, startKey, attacking, struck } = useEnemyClipSelection(props);
    return <Text testID="clip">{`${clipName}:${startKey}:${attacking}:${struck}`}</Text>;
}

const readClip = () => screen.getByTestId('clip').props.children as string;

function renderProbe(props: Partial<Parameters<typeof useEnemyClipSelection>[0]> = {}) {
    const full = { frameSet: SYNTHETIC_FRAME_SET, attackBeat: 0, struckBeat: 0, ...props };
    const utils = render(<Probe {...full} />);
    return {
        ...utils,
        beat: (next: Partial<typeof full>) => utils.rerender(<Probe {...full} {...next} />),
    };
}

describe('idle — the resting loop', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    it('is what the enemy sits on before anything has happened', () => {
        renderProbe();
        expect(readClip()).toBe('idle:0:false:false');
    });

    it('never ends on its own, however long nothing happens', () => {
        renderProbe();
        act(() => { jest.advanceTimersByTime(clipDurationMs(IDLE) * 20); });
        expect(readClip()).toBe('idle:0:false:false');
    });

    it('is declared a loop, and wraps rather than holding its last cell', () => {
        expect(IDLE.loop).toBe(true);
        // One cell past the end of the clip is the first cell again. A
        // one-shot would answer `frames - 1` here forever.
        expect(frameIndexAt(IDLE, clipDurationMs(IDLE))).toBe(0);
        expect(frameIndexAt(IDLE, clipDurationMs(IDLE) * 3)).toBe(0);
    });
});

describe('struck — the one-shot on damage taken', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    it('is a one-shot, not a loop', () => {
        expect(STRUCK.loop).toBe(false);
    });

    it('waits for the board\'s card motion to settle before it is selected', () => {
        const { beat } = renderProbe();
        act(() => { beat({ struckBeat: 1 }); });
        // The played card is still leaving the battlefield: not yet.
        expect(readClip()).toBe('idle:0:false:false');
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS - 1); });
        expect(readClip()).toBe('idle:0:false:false');
        act(() => { jest.advanceTimersByTime(1); });
        expect(readClip()).toBe(`${STRUCK_CLIP}:1:false:true`);
    });

    it('returns to idle when its own length has run, counted from when it started', () => {
        const { beat } = renderProbe();
        act(() => { beat({ struckBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS); });
        // The wait is spent before the clip, not out of it: the full length
        // still plays.
        act(() => { jest.advanceTimersByTime(clipDurationMs(STRUCK) - 1); });
        expect(readClip()).toBe(`${STRUCK_CLIP}:1:false:true`);
        act(() => { jest.advanceTimersByTime(1); });
        expect(readClip()).toBe('idle:1:false:false');
    });

    it('restarts on a second blow rather than treating it as the same one', () => {
        const { beat } = renderProbe();
        act(() => { beat({ struckBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS + 20); });
        act(() => { beat({ struckBeat: 2 }); });
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS); });
        expect(readClip()).toBe(`${STRUCK_CLIP}:2:false:true`);
        act(() => { jest.advanceTimersByTime(clipDurationMs(STRUCK)); });
        expect(readClip()).toBe('idle:2:false:false');
    });

    it('two blows inside the wait play one flinch and still return to idle', () => {
        const { beat } = renderProbe();
        act(() => { beat({ struckBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS / 2); });
        act(() => { beat({ struckBeat: 2 }); });
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS); });
        expect(readClip()).toBe(`${STRUCK_CLIP}:1:false:true`);
        act(() => { jest.advanceTimersByTime(clipDurationMs(STRUCK) * 4); });
        expect(readClip()).toBe('idle:1:false:false');
    });

    it('a blow mid-flinch is not left holding the first flinch\'s last cell', () => {
        // The second beat's cleanup drops the first flinch's return timer;
        // the second flinch's own return is what must hand the enemy back.
        const { beat } = renderProbe();
        act(() => { beat({ struckBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS + 10); });
        act(() => { beat({ struckBeat: 2 }); });
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS + clipDurationMs(STRUCK) * 2); });
        expect(readClip()).toBe('idle:2:false:false');
    });

    it('hands the enemy back to rest when motion turns reduced mid-flinch', () => {
        const paneRef = { current: false };
        const { beat } = renderProbe({ reducedMotion: paneRef });
        act(() => { beat({ struckBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS + 10); });
        expect(readClip()).toBe(`${STRUCK_CLIP}:1:false:true`);
        paneRef.current = true;
        act(() => { beat({ struckBeat: 2 }); });
        act(() => { jest.advanceTimersByTime(clipDurationMs(STRUCK) * 4); });
        expect(readClip()).toBe('idle:1:false:false');
    });

    it('reads the preference when the wait ends, not when the events arrived', () => {
        const paneRef = { current: false };
        const { beat } = renderProbe({ reducedMotion: paneRef });
        act(() => { beat({ struckBeat: 1 }); });
        paneRef.current = true;
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS * 4); });
        expect(readClip()).toBe('idle:0:false:false');
    });

    it('selects nothing when the caller\'s ref says motion is reduced', () => {
        const paneRef = { current: true };
        const { beat } = renderProbe({ reducedMotion: paneRef });
        act(() => { beat({ struckBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(clipDurationMs(STRUCK) * 4); });
        expect(readClip()).toBe('idle:0:false:false');
    });
});

describe('the flinch\'s wait is the board\'s own motion, not a copy of it', () => {
    it('is the longest of the board\'s card durations', () => {
        expect(CARD_MOTION_SETTLE_MS).toBe(Math.max(CARD_ENTER_MS, CARD_LAYOUT_MS));
    });

    it('is the duration the board\'s card builders were handed', () => {
        // Reanimated builders keep the duration they were given; reading it
        // back proves the board and the wait share one number.
        const durationOf = (b: unknown) => (b as { durationV: number }).durationV;
        expect(durationOf(FAN_CARD_ENTERING)).toBe(CARD_ENTER_MS);
        expect(durationOf(FAN_CARD_LAYOUT)).toBe(CARD_LAYOUT_MS);
    });
});

describe('attacking — the one-shot on the enemy\'s beat', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    it('is a one-shot, not a loop', () => {
        expect(ATTACK.loop).toBe(false);
    });

    it('starts at the pane\'s impact offset, not on the trigger frame', () => {
        const { beat } = renderProbe();
        act(() => { beat({ attackBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS - 1); });
        expect(readClip()).toBe('idle:0:false:false');
        act(() => { jest.advanceTimersByTime(1); });
        expect(readClip()).toBe(`${ATTACK_CLIP}:1:true:false`);
    });

    it('returns to idle when its own length has run', () => {
        const { beat } = renderProbe();
        act(() => { beat({ attackBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
        act(() => { jest.advanceTimersByTime(clipDurationMs(ATTACK)); });
        expect(readClip()).toBe('idle:1:false:false');
    });

    it('restarts the clip on a second beat rather than treating it as the same swing', () => {
        const { beat } = renderProbe();
        act(() => { beat({ attackBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
        act(() => { beat({ attackBeat: 2 }); });
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
        expect(readClip()).toBe(`${ATTACK_CLIP}:2:true:false`);
    });

    it('is never selected by a resolution that was not the enemy\'s beat', () => {
        // The gate that matters once a non-attack intent exists: a resolution
        // the pane did not call the enemy's beat bumps no attack counter, so
        // whatever else happens the enemy does not mime a swing. It may still
        // flinch — that is a different beat and a different clip.
        const { beat } = renderProbe();
        act(() => { beat({ struckBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 10); });
        expect(readClip()).not.toContain(ATTACK_CLIP);
        expect(readClip()).toBe('idle:1:false:false');
    });

    it('selects nothing when the caller\'s ref says motion is reduced', () => {
        const paneRef = { current: true };
        const { beat } = renderProbe({ reducedMotion: paneRef });
        act(() => { beat({ attackBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 10); });
        expect(readClip()).toBe('idle:0:false:false');
    });

    it('reads the preference at the impact beat, not when the events arrived', () => {
        // The ref is live: the platform can answer, or the player can change
        // their mind, inside the 100ms the swing is waiting out. The answer
        // that matters is the one at the moment the clip would start.
        const paneRef = { current: false };
        const { beat } = renderProbe({ reducedMotion: paneRef });
        act(() => { beat({ attackBeat: 1 }); });
        paneRef.current = true;
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 4); });
        expect(readClip()).toBe('idle:0:false:false');
    });
});

describe('a resolution that is both — the player strikes and the enemy swings', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    it('flinches first, then swings on the beat, and the flinch does not cut the swing short', () => {
        const { beat } = renderProbe();
        act(() => { beat({ attackBeat: 1, struckBeat: 1 }); });
        // The blow has already landed, so the flinch is on screen immediately.
        expect(readClip()).toBe(`${STRUCK_CLIP}:1:false:true`);
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
        expect(readClip()).toBe(`${ATTACK_CLIP}:2:true:false`);
        // The flinch's own return-to-rest timer is still pending and expires
        // mid-swing. It must not drop the enemy back to idle: whoever started
        // last owns the return.
        act(() => { jest.advanceTimersByTime(clipDurationMs(STRUCK)); });
        expect(readClip()).toBe(`${ATTACK_CLIP}:2:true:false`);
        // And the swing still ends on its own schedule.
        act(() => { jest.advanceTimersByTime(clipDurationMs(ATTACK)); });
        expect(readClip()).toBe('idle:2:false:false');
    });
});

describe('a set that cannot show a state', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    it('spends an enemy with no frame set on nothing', () => {
        const { beat } = renderProbe({ frameSet: null });
        act(() => { beat({ attackBeat: 1, struckBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 10); });
        expect(readClip()).toBe('idle:0:false:false');
    });

    it('stays resting when the set names no struck clip', () => {
        const noStruck = withoutClip(STRUCK_CLIP);
        expect(struckClipOf(noStruck)).toBeNull();
        const { beat } = renderProbe({ frameSet: noStruck });
        act(() => { beat({ struckBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(clipDurationMs(STRUCK) * 4); });
        // Such a set fails `validateFrameSet` and the player refuses to draw
        // it; the selector's job is simply not to name a clip that is not
        // there, which would render as nothing at all.
        expect(readClip()).toBe('idle:0:false:false');
    });
});
