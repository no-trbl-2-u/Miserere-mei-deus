/**
 * Phases AN1b and AN1c — the enemy's states, in the pane itself.
 *
 * Two claims, and the second is the one that keeps the first honest:
 *   1. the pane selects a clip per state off ONE walk of `fx.events`: the
 *      ATTACK clip on the enemy's beat at the same impact offset the recoil
 *      already uses, the STRUCK clip when the damage was the enemy's own, and
 *      idle when the resolution was neither; an enemy with no frame set
 *      renders its single painting through none of it;
 *   2. the pane's EXISTING feedback — the damage-scaled shake and the impact
 *      flash — is handed exactly the same arguments whether the enemy has
 *      frames or not. The frame engine is additive or it is a regression.
 *
 * The registry ships empty (A2), so the frame set here is injected at
 * `getEnemyFrameSet` rather than registered: the selection logic is what this
 * phase ships, and it must be provable before any enemy is installed.
 */
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import * as Juice from '@/lib/juice';
import { CombatCombatantPane, type CombatFx } from '@/components/combat/encounter/CombatCombatantPane';
import { ENEMY_ATTACK_IMPACT_MS, clipDurationMs } from '@/components/combat/frames';
import { SYNTHETIC_FRAME_SET } from '@/components/combat/frames/syntheticFrameSet';
import type { CombatEnemyPaneVM, CombatPlayerPaneVM } from '@/state/presenters/combat-encounter.engine';
import type { CombatEvent } from '@mechanics';
import { withAllProviders } from '@/test-utils/withAllProviders';

const mockFramePlayerProps: Record<string, unknown>[] = [];

jest.mock('@/assets/images/enemies/frames', () => {
    const actual = jest.requireActual('@/assets/images/enemies/frames') as Record<string, unknown>;
    return { ...actual, getEnemyFrameSet: jest.fn(() => null) };
});

jest.mock('@/components/combat/frames', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const react = require('react');
    const actual = jest.requireActual('@/components/combat/frames') as Record<string, unknown>;
    const Real = actual.EnemyFramePlayer;
    return {
        ...actual,
        EnemyFramePlayer: (props: Record<string, unknown>) => {
            mockFramePlayerProps.push(props);
            return react.createElement(Real, props);
        },
    };
});

jest.mock('@/lib/juice', () => {
    const actual = jest.requireActual('@/lib/juice') as typeof Juice;
    return {
        ...actual,
        useJuiceShake: jest.fn(actual.useJuiceShake),
        useJuiceFlash: jest.fn(actual.useJuiceFlash),
    };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const frames = require('@/assets/images/enemies/frames') as { getEnemyFrameSet: jest.Mock };

const ENEMY: CombatEnemyPaneVM = {
    name: 'The Float-Eye', artKey: 'float-eye', isBoss: false, artNonce: 3,
    hp: 20, maxHp: 30, hpPct: 0.66, effects: [],
    intent: {
        type: 'attack', icon: 'blade', label: 'strikes', damage: 6, branch: null, next: null,
        wallMath: { projectedDamage: 6, netDamage: 6, willDeny: false, guard: 0, barrier: 0 },
    } as unknown as CombatEnemyPaneVM['intent'],
    stagesEntered: 0, pendingDot: 0, roundsToKill: null, isLethalInFlight: false,
};

const PLAYER: CombatPlayerPaneVM = {
    name: 'Pilgrim', hp: 40, maxHp: 50, hpPct: 0.8, guard: 0, effects: [],
};

/** The enemy's beat: a threat fired and the player took the hit. */
const ENEMY_BEAT: CombatEvent[] = [
    { kind: 'threat-fired' },
    { kind: 'damage-dealt', target: 'self', amount: 6 },
] as unknown as CombatEvent[];

function renderPane(fx?: CombatFx, enemy: CombatEnemyPaneVM = ENEMY) {
    const { tree } = withAllProviders(
        <CombatCombatantPane enemy={enemy} player={PLAYER} fx={fx} region="the Drowned Parish" />,
    );
    return render(tree);
}

/** The same foe, telegraphing something that is not an attack. */
const MENDING_ENEMY: CombatEnemyPaneVM = {
    ...ENEMY,
    intent: {
        ...ENEMY.intent, type: 'mend', label: 'knits itself', damage: 0,
    } as unknown as CombatEnemyPaneVM['intent'],
};

/** A threat that fired and dealt the player nothing. */
const THREAT_ONLY: CombatEvent[] = [{ kind: 'threat-fired' }] as unknown as CombatEvent[];

/**
 * The DISTINCT argument tuples each juice hook was handed, in order. Render
 * count is not the contract — a clip change re-renders the pane, and a hook
 * called a second time with identical arguments has animated nothing twice.
 * What must not move is the arguments themselves.
 */
function distinctCalls(fn: jest.Mock): unknown[][] {
    const seen: string[] = [];
    const out: unknown[][] = [];
    for (const call of fn.mock.calls as unknown[][]) {
        const key = JSON.stringify(call);
        if (seen.includes(key)) continue;
        seen.push(key);
        out.push(call);
    }
    return out;
}

function juiceCalls() {
    return {
        shake: distinctCalls(Juice.useJuiceShake as jest.Mock),
        flash: distinctCalls(Juice.useJuiceFlash as jest.Mock),
    };
}

function resetSpies() {
    mockFramePlayerProps.length = 0;
    (Juice.useJuiceShake as jest.Mock).mockClear();
    (Juice.useJuiceFlash as jest.Mock).mockClear();
}

describe('CombatCombatantPane — the enemy\'s states animate (phases AN1b, AN1c)', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        resetSpies();
        frames.getEnemyFrameSet.mockReturnValue(null);
        jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
            .mockResolvedValue(false as unknown as boolean);
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('renders the single painting, and mounts no frame player, for an enemy with no frame set', () => {
        const view = renderPane({ seq: 1, events: ENEMY_BEAT });
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 4); });
        expect(view.queryByTestId('combat-enemy-frames')).toBeNull();
        expect(view.getByTestId('combat-enemy-figure')).toBeTruthy();
        expect(mockFramePlayerProps).toHaveLength(0);
    });

    it('selects the attack clip on the enemy\'s beat, at the existing impact offset', () => {
        frames.getEnemyFrameSet.mockReturnValue(SYNTHETIC_FRAME_SET);
        const view = renderPane({ seq: 1, events: ENEMY_BEAT });
        expect(view.getByTestId('combat-enemy-frames')).toBeTruthy();
        // Before the impact beat the enemy is still resting — the swing lands
        // with the recoil, not on the frame the events arrived.
        expect(mockFramePlayerProps.at(-1)?.clipName).toBe('idle');
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
        expect(mockFramePlayerProps.at(-1)?.clipName).toBe('attacking');
        expect(mockFramePlayerProps.at(-1)?.startKey).toBe(1);
    });

    it('does not swing when the threat that fired was never an attack', () => {
        // The PANE's wiring of `enemy.intent.damage` into the beat, not the
        // pure function in isolation: a mending or buffing foe takes its turn
        // without miming a blow it never telegraphed.
        frames.getEnemyFrameSet.mockReturnValue(SYNTHETIC_FRAME_SET);
        renderPane({ seq: 1, events: THREAT_ONLY }, MENDING_ENEMY);
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 4); });
        expect(mockFramePlayerProps.length).toBeGreaterThan(0);
        expect(mockFramePlayerProps.at(-1)?.clipName).toBe('idle');
        expect(mockFramePlayerProps.at(-1)?.startKey).toBe(0);
    });

    it('does swing when the same threat-only resolution came from an attack intent', () => {
        // The other side of that gate, so "never swings" cannot pass by
        // accident: an attack the player guarded is still a swing.
        frames.getEnemyFrameSet.mockReturnValue(SYNTHETIC_FRAME_SET);
        renderPane({ seq: 1, events: THREAT_ONLY });
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
        expect(mockFramePlayerProps.at(-1)?.clipName).toBe('attacking');
    });

    it('selects the struck clip when the ENEMY took the damage, and never the attack clip (AN1c)', () => {
        frames.getEnemyFrameSet.mockReturnValue(SYNTHETIC_FRAME_SET);
        // No threat fired and the player took nothing: this resolution was the
        // player's own blow landing. It is the shape a non-attack intent will
        // have the day one exists, and the enemy must not mime a swing on it.
        const playerHit = [
            { kind: 'damage-dealt', target: 'enemy', amount: 9 },
        ] as unknown as CombatEvent[];
        renderPane({ seq: 1, events: playerHit });
        expect(mockFramePlayerProps.at(-1)?.clipName).toBe('struck');
        const struck = SYNTHETIC_FRAME_SET.manifest.clips.struck;
        act(() => { jest.advanceTimersByTime(clipDurationMs(struck)); });
        expect(mockFramePlayerProps.at(-1)?.clipName).toBe('idle');
        // Not once, at any point in the resolution, was the swing selected.
        expect(mockFramePlayerProps.map((p) => p.clipName)).not.toContain('attacking');
    });

    it('selects the struck clip for a damage-over-time tick on the enemy', () => {
        frames.getEnemyFrameSet.mockReturnValue(SYNTHETIC_FRAME_SET);
        const poison = [
            { kind: 'dot-tick', target: 'enemy', amount: 3 },
        ] as unknown as CombatEvent[];
        renderPane({ seq: 1, events: poison });
        expect(mockFramePlayerProps.at(-1)?.clipName).toBe('struck');
    });

    it('leaves the enemy resting on a resolution in which nobody took damage', () => {
        frames.getEnemyFrameSet.mockReturnValue(SYNTHETIC_FRAME_SET);
        const buffOnly = [
            { kind: 'effect-landed', target: 'enemy', effectId: 'guard', effectKind: 'guard' },
        ] as unknown as CombatEvent[];
        renderPane({ seq: 1, events: buffOnly });
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 4); });
        expect(mockFramePlayerProps.at(-1)?.clipName).toBe('idle');
    });

    it('hands the frame player the pane\'s own reduced-motion ref, not a second mechanism', () => {
        frames.getEnemyFrameSet.mockReturnValue(SYNTHETIC_FRAME_SET);
        renderPane({ seq: 1, events: ENEMY_BEAT });
        const passed = mockFramePlayerProps.map((p) => p.reducedMotion);
        // A ref object, and the SAME ref object every render — a boolean or a
        // fresh object would mean the engine had grown an answer of its own.
        expect(passed.length).toBeGreaterThan(0);
        expect(passed.every((r) => typeof r === 'object' && r !== null && 'current' in r)).toBe(true);
        expect(new Set(passed).size).toBe(1);
    });

    it('plays nothing when that ref says motion is reduced', async () => {
        frames.getEnemyFrameSet.mockReturnValue(SYNTHETIC_FRAME_SET);
        (AccessibilityInfo.isReduceMotionEnabled as jest.Mock)
            .mockResolvedValue(true as unknown as never);
        const view = renderPane();
        // Let the pane's own ref settle from the platform before the beat.
        await act(async () => { await Promise.resolve(); });
        view.rerender(
            withAllProviders(
                <CombatCombatantPane enemy={ENEMY} player={PLAYER} fx={{ seq: 2, events: ENEMY_BEAT }} region="the Drowned Parish" />,
            ).tree,
        );
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 10); });
        expect(mockFramePlayerProps.at(-1)?.clipName).toBe('idle');
        expect(mockFramePlayerProps.at(-1)?.startKey).toBe(0);
    });

    it('leaves the existing shake and flash beats byte-for-byte unchanged (A3)', () => {
        frames.getEnemyFrameSet.mockReturnValue(null);
        renderPane({ seq: 1, events: ENEMY_BEAT });
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 4); });
        const staticEnemy = juiceCalls();

        resetSpies();
        frames.getEnemyFrameSet.mockReturnValue(SYNTHETIC_FRAME_SET);
        renderPane({ seq: 1, events: ENEMY_BEAT });
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 4); });
        const framedEnemy = juiceCalls();

        // The comparison below is only a guard if the frame engine actually
        // ran on this second render — otherwise an enemy that never wires in
        // `getEnemyFrameSet` at all would "preserve" shake/flash trivially.
        expect(mockFramePlayerProps.length).toBeGreaterThan(0);

        // Same keys, same severities, same 100ms delay: the frame engine added
        // an animation, it did not retune one.
        expect(framedEnemy.shake).toEqual(staticEnemy.shake);
        expect(framedEnemy.flash).toEqual(staticEnemy.flash);
        // And the hit still registered at all, so the comparison is not two
        // sets of nothing.
        expect(staticEnemy.shake.some(([key]) => (key as number) > 0)).toBe(true);
        expect(staticEnemy.flash.some(([, norm]) => (norm as number) > 0)).toBe(true);
    });

    it('leaves them unchanged on a resolution that now also plays the STRUCK clip (A3, AN1c)', () => {
        // The same comparison as above, on the resolution AN1c added a clip
        // to. A new state selected in the middle of the pane's feedback is
        // exactly where a retune would slip in unnoticed.
        const trade = [
            { kind: 'threat-fired' },
            { kind: 'damage-dealt', target: 'self', amount: 6 },
            { kind: 'damage-dealt', target: 'enemy', amount: 9 },
        ] as unknown as CombatEvent[];

        frames.getEnemyFrameSet.mockReturnValue(null);
        const staticView = renderPane({ seq: 1, events: trade });
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 8); });
        const staticEnemy = juiceCalls();
        // Unmounted before the registry answer changes: a pane left mounted
        // picks the frame set up on its next render and starts a second
        // enemy's clips inside this one's timeline.
        staticView.unmount();

        resetSpies();
        frames.getEnemyFrameSet.mockReturnValue(SYNTHETIC_FRAME_SET);
        renderPane({ seq: 1, events: trade });
        // Both new states really were exercised on this resolution, or the
        // comparison below is proving nothing about either of them. Advanced
        // one beat at a time: a single long jump batches every pending timer
        // into one render and only the last clip is ever observed.
        expect(mockFramePlayerProps.map((p) => p.clipName)).toContain('struck');
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
        expect(mockFramePlayerProps.at(-1)?.clipName).toBe('attacking');
        act(() => { jest.advanceTimersByTime(clipDurationMs(SYNTHETIC_FRAME_SET.manifest.clips.attacking)); });
        expect(mockFramePlayerProps.at(-1)?.clipName).toBe('idle');
        const framedEnemy = juiceCalls();

        expect(framedEnemy.shake).toEqual(staticEnemy.shake);
        expect(framedEnemy.flash).toEqual(staticEnemy.flash);
        expect(staticEnemy.shake.some(([key]) => (key as number) > 0)).toBe(true);
        expect(staticEnemy.flash.some(([, norm]) => (norm as number) > 0)).toBe(true);
    });
});
