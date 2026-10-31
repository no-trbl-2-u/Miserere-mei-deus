/**
 * Phase AN5a, A3/A5 — THE GALLOWS CROW ANIMATES IN A REAL ENCOUNTER.
 *
 * The green jelly's encounter suite is the model, and this follows it: nothing
 * is mocked at the registry. The live combat pane is rendered for the
 * `gallows-crow` key the engine's Chapter 1 normal carries, through the real
 * registry, over the 24 cells that ship.
 *
 * The opaque layer among the player's children is the absolute sheet cell on
 * screen (row * columns + frame), so asserting its row asserts which drawing
 * of the crow the player sees: idle row 0, struck row 1, attacking row 2.
 *
 * The crow is the first set cut from an image-model sheet. Its anchor kind was
 * measured by the cleanup tool (the idle foot line holds, so it stands on its
 * perch: `foot-line`), and like the jelly every cell is pinned to the bottom
 * of its box. That its idle holds still across the frames is pinned against
 * the master in the art department's own suite (`tests/test_clean_ai_sheet.py`).
 */
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render, type RenderResult } from '@testing-library/react-native';

import { CombatCombatantPane, type CombatFx } from '@/components/combat/encounter/CombatCombatantPane';
import { ENEMY_ATTACK_IMPACT_MS, clipDurationMs } from '@/components/combat/frames';
import { ENEMY_FRAME_SETS, getEnemyFrameSet, validateFrameSet } from '@/assets/images/enemies/frames';
import type { CombatEnemyPaneVM, CombatPlayerPaneVM } from '@/state/presenters/combat-encounter.engine';
import { EnemyLibrary, type CombatEvent } from '@mechanics';
import { withAllProviders } from '@/test-utils/withAllProviders';
import { CARD_MOTION_SETTLE_MS } from '@/components/combat/encounter/cardMotion';

const CROW = ENEMY_FRAME_SETS['gallows-crow'];

function crowVM(): CombatEnemyPaneVM {
    return {
        name: 'Gallows Crow', artKey: 'gallows-crow', isBoss: false, artNonce: 3,
        hp: 30, maxHp: 34, hpPct: 0.88, effects: [],
        intent: {
            type: 'attack', icon: 'blade', label: 'pecks the debt', damage: 6, branch: null, next: null,
            wallMath: { projectedDamage: 6, netDamage: 6, willDeny: false, guard: 0, barrier: 0 },
        } as unknown as CombatEnemyPaneVM['intent'],
        stagesEntered: 0, pendingDot: 0, roundsToKill: null, isLethalInFlight: false,
    };
}

const PLAYER: CombatPlayerPaneVM = {
    name: 'Pilgrim', hp: 40, maxHp: 50, hpPct: 0.8, guard: 0, effects: [],
};

const CROW_BEAT: CombatEvent[] = [
    { kind: 'threat-fired' },
    { kind: 'damage-dealt', target: 'self', amount: 6 },
] as unknown as CombatEvent[];

const PLAYER_BLOW: CombatEvent[] = [
    { kind: 'damage-dealt', target: 'enemy', amount: 9 },
] as unknown as CombatEvent[];

function renderPane(fx?: CombatFx) {
    const { tree } = withAllProviders(
        <CombatCombatantPane enemy={crowVM()} player={PLAYER} fx={fx} region="the Breakwater" />,
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
    return Math.floor(cell / CROW.manifest.columns);
}

describe('the gallows crow animates in a live encounter (phase AN5a, A5)', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
            .mockResolvedValue(false as unknown as boolean);
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('is registered against the key the engine gives the Gallows Crow, and is valid', () => {
        // The pane looks the set up by the roster's portraitAsset; a rename on
        // either side would silently return the crow to a still painting.
        const crow = EnemyLibrary.find((e) => e.id === 'enemy-gallows-crow');
        expect(crow?.portraitAsset).toBe('gallows-crow');
        expect(getEnemyFrameSet('gallows-crow')).toBe(CROW);
        expect(validateFrameSet('gallows-crow', CROW)).toEqual([]);
        // A4: drawn from a colour stand-in, so never graded.
        expect(CROW.manifest.graded).toBe(false);
    });

    it('mounts the frame player, one layer per shipped cell, instead of the painting', () => {
        const view = renderPane();
        const root = view.getByTestId('combat-enemy-frames');
        expect(root.children).toHaveLength(24);
        expect(view.queryByTestId('combat-enemy-frames-invalid')).toBeNull();
        expect(rowOf(liveCell(view))).toBe(CROW.manifest.clips.idle.row);
    });

    it('advances through its idle loop while nothing happens', () => {
        const view = renderPane();
        const first = liveCell(view);
        act(() => { jest.advanceTimersByTime(1000 / CROW.manifest.clips.idle.fps * 3); });
        const later = liveCell(view);
        expect(rowOf(later)).toBe(CROW.manifest.clips.idle.row);
        expect(later).not.toBe(first);
    });

    it('stands on its perch: every cell is pinned to the bottom of its box', () => {
        const view = renderPane();
        const root = view.getByTestId('combat-enemy-frames');
        type Node = { props?: { contentPosition?: unknown } };
        const cells: Node[] = root.findAll((node: Node) => node.props?.contentPosition !== undefined);
        expect(cells.length).toBeGreaterThanOrEqual(24);
        // expo-image passes 'bottom center' down normalised to its object form,
        // so each cell shows up in both; neither may be the centred floater's.
        const positions = new Set(cells.map((node) => JSON.stringify(node.props?.contentPosition)));
        expect([...positions].sort()).toEqual(
            [JSON.stringify('bottom center'), JSON.stringify({ bottom: 0, left: '50%' })].sort(),
        );
    });

    it('swings through its ATTACKING row on its own beat, then returns to idle', () => {
        const view = renderPane({ seq: 1, events: CROW_BEAT });
        const resting = liveCell(view);
        expect(rowOf(resting)).toBe(CROW.manifest.clips.idle.row);

        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
        const swinging = liveCell(view);
        expect(rowOf(swinging)).toBe(CROW.manifest.clips.attacking.row);
        expect(swinging).not.toBe(resting);

        // The clip advances: a later cell of the same row, not one held frame.
        act(() => { jest.advanceTimersByTime(1000 / CROW.manifest.clips.attacking.fps * 4); });
        const later = liveCell(view);
        expect(rowOf(later)).toBe(CROW.manifest.clips.attacking.row);
        expect(later).toBeGreaterThan(swinging);

        act(() => { jest.advanceTimersByTime(clipDurationMs(CROW.manifest.clips.attacking)); });
        expect(rowOf(liveCell(view))).toBe(CROW.manifest.clips.idle.row);
    });

    it('flinches through its STRUCK row when the player\'s blow lands', () => {
        const view = renderPane({ seq: 1, events: PLAYER_BLOW });
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS); });
        expect(rowOf(liveCell(view))).toBe(CROW.manifest.clips.struck.row);
        act(() => { jest.advanceTimersByTime(clipDurationMs(CROW.manifest.clips.struck)); });
        expect(rowOf(liveCell(view))).toBe(CROW.manifest.clips.idle.row);
    });

    it('holds a single resting cell when motion is reduced', async () => {
        (AccessibilityInfo.isReduceMotionEnabled as jest.Mock)
            .mockResolvedValue(true as unknown as never);
        const view = renderPane();
        await act(async () => { await Promise.resolve(); });
        view.rerender(
            withAllProviders(
                <CombatCombatantPane
                    enemy={crowVM()} player={PLAYER} fx={{ seq: 2, events: CROW_BEAT }}
                    region="the Breakwater"
                />,
            ).tree,
        );
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 10); });
        expect(view.getByTestId('combat-enemy-frames-still')).toBeTruthy();
        const idle = CROW.manifest.clips.idle;
        expect(liveCell(view)).toBe(idle.row * CROW.manifest.columns + idle.rest);
    });
});
