/**
 * The beat wiring, away from the pane: what counts as the enemy acting, and
 * what the frame player is told to play once it has.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import {
    ATTACK_CLIP, ENEMY_ATTACK_IMPACT_MS, attackClipOf, isEnemyAttackBeat,
} from '../enemyAttackBeat';
import { useEnemyAttackClip } from '../useEnemyAttackClip';
import { SYNTHETIC_FRAME_SET } from '../syntheticFrameSet';
import { clipDurationMs } from '../framePlayback';

describe('isEnemyAttackBeat', () => {
    it('is the beat when the enemy damaged the player', () => {
        expect(isEnemyAttackBeat({ playerDamage: 7, threatFired: false })).toBe(true);
    });

    it('is the beat when the threat fired and was denied — the swing still happened', () => {
        expect(isEnemyAttackBeat({ playerDamage: 0, threatFired: true })).toBe(true);
    });

    it('is not the beat when the resolution was the player\'s own', () => {
        expect(isEnemyAttackBeat({ playerDamage: 0, threatFired: false })).toBe(false);
    });
});

describe('attackClipOf', () => {
    it('finds the attack clip of a set that names one', () => {
        expect(attackClipOf(SYNTHETIC_FRAME_SET)).toBe(SYNTHETIC_FRAME_SET.manifest.clips[ATTACK_CLIP]);
    });

    it('is null for a static enemy, which is every enemy while the registry is empty', () => {
        expect(attackClipOf(null)).toBeNull();
    });
});

// A probe component, so the hook is exercised through React's own scheduling
// rather than called as a function.
function Probe(props: Parameters<typeof useEnemyAttackClip>[0]) {
    const { clipName, startKey, attacking } = useEnemyAttackClip(props);
    return <Text testID="clip">{`${clipName}:${startKey}:${attacking}`}</Text>;
}

const readClip = () => screen.getByTestId('clip').props.children as string;

describe('useEnemyAttackClip', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    it('rests until the enemy acts', () => {
        render(<Probe frameSet={SYNTHETIC_FRAME_SET} beat={0} />);
        expect(readClip()).toBe('idle:0:false');
    });

    it('selects the attack clip at the pane\'s impact offset, not on the trigger frame', () => {
        const { rerender } = render(<Probe frameSet={SYNTHETIC_FRAME_SET} beat={0} />);
        rerender(<Probe frameSet={SYNTHETIC_FRAME_SET} beat={1} />);
        // One tick short of impact the enemy is still resting.
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS - 1); });
        expect(readClip()).toBe('idle:0:false');
        act(() => { jest.advanceTimersByTime(1); });
        expect(readClip()).toBe(`${ATTACK_CLIP}:1:true`);
    });

    it('returns to resting when the one-shot has run its own length', () => {
        const { rerender } = render(<Probe frameSet={SYNTHETIC_FRAME_SET} beat={0} />);
        rerender(<Probe frameSet={SYNTHETIC_FRAME_SET} beat={1} />);
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
        const clip = SYNTHETIC_FRAME_SET.manifest.clips[ATTACK_CLIP];
        act(() => { jest.advanceTimersByTime(clipDurationMs(clip)); });
        expect(readClip()).toBe('idle:1:false');
    });

    it('restarts the clip on a second beat rather than treating it as the same swing', () => {
        const { rerender } = render(<Probe frameSet={SYNTHETIC_FRAME_SET} beat={0} />);
        rerender(<Probe frameSet={SYNTHETIC_FRAME_SET} beat={1} />);
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
        rerender(<Probe frameSet={SYNTHETIC_FRAME_SET} beat={2} />);
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
        expect(readClip()).toBe(`${ATTACK_CLIP}:2:true`);
    });

    it('selects nothing at all when the caller\'s ref says motion is reduced', () => {
        const paneRef = { current: true };
        const { rerender } = render(<Probe frameSet={SYNTHETIC_FRAME_SET} beat={0} reducedMotion={paneRef} />);
        rerender(<Probe frameSet={SYNTHETIC_FRAME_SET} beat={1} reducedMotion={paneRef} />);
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 10); });
        // The RESTING clip, not the attack clip held still: an enemy whose
        // motion is reduced is the picture it was.
        expect(readClip()).toBe('idle:0:false');
    });

    it('spends an enemy with no frame set on nothing', () => {
        const { rerender } = render(<Probe frameSet={null} beat={0} />);
        rerender(<Probe frameSet={null} beat={1} />);
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 10); });
        expect(readClip()).toBe('idle:0:false');
    });
});
