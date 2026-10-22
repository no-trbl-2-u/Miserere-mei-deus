/**
 * Phase AN4b, A7 — THE ACT 1 BOSS ANIMATES IN A REAL ENCOUNTER.
 *
 * The float-eye's encounter suite is the pattern, and this follows it: nothing
 * is mocked at the registry. The live combat pane is rendered for the
 * `death-beholder` key the engine's boss carries, as a boss, through the real
 * registry, over the 24 cells that ship.
 *
 * The opaque layer among the player's children is the absolute sheet cell on
 * screen (row * columns + frame), so asserting its row asserts which drawing
 * of the beholder the player sees: idle row 0, struck row 1, attacking row 2.
 *
 * What makes the attack READ — the coil to 0.80 and the swell to 1.14 on the
 * next frame — is pinned against the master's pixels in the art department's
 * own suite (`tests/test_beholder_attack.py`). Here the claim is the other
 * half: the pane actually plays those frames on the boss's beat.
 */
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render, type RenderResult } from '@testing-library/react-native';

import { CombatCombatantPane, type CombatFx } from '@/components/combat/encounter/CombatCombatantPane';
import { ENEMY_ATTACK_IMPACT_MS, clipDurationMs } from '@/components/combat/frames';
import { ENEMY_FRAME_SETS, getEnemyFrameSet } from '@/assets/images/enemies/frames';
import type { CombatEnemyPaneVM, CombatPlayerPaneVM } from '@/state/presenters/combat-encounter.engine';
import { EnemyLibrary, type CombatEvent } from '@mechanics';
import { withAllProviders } from '@/test-utils/withAllProviders';
import { CARD_MOTION_SETTLE_MS } from '@/components/combat/encounter/cardMotion';

const BEHOLDER = ENEMY_FRAME_SETS['death-beholder'];

function bossVM(): CombatEnemyPaneVM {
    return {
        name: 'The Death Beholder', artKey: 'death-beholder', isBoss: true, artNonce: 3,
        hp: 300, maxHp: 320, hpPct: 0.94, effects: [],
        intent: {
            type: 'attack', icon: 'blade', label: 'stares', damage: 9, branch: null, next: null,
            wallMath: { projectedDamage: 9, netDamage: 9, willDeny: false, guard: 0, barrier: 0 },
        } as unknown as CombatEnemyPaneVM['intent'],
        stagesEntered: 0, pendingDot: 0, roundsToKill: null, isLethalInFlight: false,
    };
}

const PLAYER: CombatPlayerPaneVM = {
    name: 'Pilgrim', hp: 40, maxHp: 50, hpPct: 0.8, guard: 0, effects: [],
};

const BOSS_BEAT: CombatEvent[] = [
    { kind: 'threat-fired' },
    { kind: 'damage-dealt', target: 'self', amount: 9 },
] as unknown as CombatEvent[];

const PLAYER_BLOW: CombatEvent[] = [
    { kind: 'damage-dealt', target: 'enemy', amount: 9 },
] as unknown as CombatEvent[];

function renderPane(fx?: CombatFx) {
    const { tree } = withAllProviders(
        <CombatCombatantPane enemy={bossVM()} player={PLAYER} fx={fx} region="the Lantern Deep" />,
    );
    return render(tree);
}

function liveCell(view: RenderResult): number {
    const root = view.getByTestId('combat-enemy-frames');
    return root.children.findIndex((child: unknown) => {
        const style = (child as { props?: { style?: unknown } }).props?.style;
        return JSON.stringify(style ?? '').includes('"opacity":1');
    });
}

function rowOf(cell: number): number {
    return Math.floor(cell / BEHOLDER.manifest.columns);
}

describe('the death-beholder animates in a live encounter (phase AN4b, A7)', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
            .mockResolvedValue(false as unknown as boolean);
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('is registered against the key the engine gives the Act 1 boss', () => {
        // The pane looks the set up by the roster's portraitAsset; a rename on
        // either side would silently return the boss to a still painting.
        const boss = EnemyLibrary.find((e) => e.id === 'enemy-death-beholder');
        expect(boss?.portraitAsset).toBe('death-beholder');
        expect(getEnemyFrameSet('death-beholder')).toBe(BEHOLDER);
    });

    it('mounts the frame player, one layer per shipped cell, instead of the painting', () => {
        const view = renderPane();
        const root = view.getByTestId('combat-enemy-frames');
        expect(root.children).toHaveLength(24);
        expect(view.queryByTestId('combat-enemy-frames-invalid')).toBeNull();
        expect(rowOf(liveCell(view))).toBe(BEHOLDER.manifest.clips.idle.row);
    });

    it('swings through its ATTACKING row on its own beat, then returns to idle', () => {
        const view = renderPane({ seq: 1, events: BOSS_BEAT });
        const resting = liveCell(view);
        expect(rowOf(resting)).toBe(BEHOLDER.manifest.clips.idle.row);

        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
        const swinging = liveCell(view);
        expect(rowOf(swinging)).toBe(BEHOLDER.manifest.clips.attacking.row);
        expect(swinging).not.toBe(resting);

        // The clip advances: a later cell of the same row, not one held frame.
        act(() => { jest.advanceTimersByTime(1000 / BEHOLDER.manifest.clips.attacking.fps * 4); });
        const later = liveCell(view);
        expect(rowOf(later)).toBe(BEHOLDER.manifest.clips.attacking.row);
        expect(later).toBeGreaterThan(swinging);

        act(() => { jest.advanceTimersByTime(clipDurationMs(BEHOLDER.manifest.clips.attacking)); });
        expect(rowOf(liveCell(view))).toBe(BEHOLDER.manifest.clips.idle.row);
    });

    it('flinches through its STRUCK row when the player\'s blow lands', () => {
        const view = renderPane({ seq: 1, events: PLAYER_BLOW });
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS); });        expect(rowOf(liveCell(view))).toBe(BEHOLDER.manifest.clips.struck.row);
        act(() => { jest.advanceTimersByTime(clipDurationMs(BEHOLDER.manifest.clips.struck)); });
        expect(rowOf(liveCell(view))).toBe(BEHOLDER.manifest.clips.idle.row);
    });

    it('holds a single resting cell when motion is reduced', async () => {
        (AccessibilityInfo.isReduceMotionEnabled as jest.Mock)
            .mockResolvedValue(true as unknown as never);
        const view = renderPane();
        await act(async () => { await Promise.resolve(); });
        view.rerender(
            withAllProviders(
                <CombatCombatantPane
                    enemy={bossVM()} player={PLAYER} fx={{ seq: 2, events: BOSS_BEAT }}
                    region="the Lantern Deep"
                />,
            ).tree,
        );
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 10); });
        expect(view.getByTestId('combat-enemy-frames-still')).toBeTruthy();
        const idle = BEHOLDER.manifest.clips.idle;
        expect(liveCell(view)).toBe(idle.row * BEHOLDER.manifest.columns + idle.rest);
    });
});
