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

    it('fires on the beat itself — a flinch is not delayed to the impact offset', () => {
        const { beat } = renderProbe();
        act(() => { beat({ struckBeat: 1 }); });
        expect(readClip()).toBe(`${STRUCK_CLIP}:1:false:true`);
    });

    it('returns to idle when its own length has run', () => {
        const { beat } = renderProbe();
        act(() => { beat({ struckBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(clipDurationMs(STRUCK) - 1); });
        expect(readClip()).toBe(`${STRUCK_CLIP}:1:false:true`);
        act(() => { jest.advanceTimersByTime(1); });
        expect(readClip()).toBe('idle:1:false:false');
    });

    it('restarts on a second blow rather than treating it as the same one', () => {
        const { beat } = renderProbe();
        act(() => { beat({ struckBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(20); });
        act(() => { beat({ struckBeat: 2 }); });
        expect(readClip()).toBe(`${STRUCK_CLIP}:2:false:true`);
    });

    it('selects nothing when the caller\'s ref says motion is reduced', () => {
        const paneRef = { current: true };
        const { beat } = renderProbe({ reducedMotion: paneRef });
        act(() => { beat({ struckBeat: 1 }); });
        act(() => { jest.advanceTimersByTime(clipDurationMs(STRUCK) * 4); });
        expect(readClip()).toBe('idle:0:false:false');
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
