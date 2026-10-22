/**
 * Phase AN3b, A6/A7 — THE ACT 1 ELITE ANIMATES IN A REAL ENCOUNTER.
 *
 * The beholder's encounter suite is the pattern, and this follows it: nothing
 * is mocked at the registry. The live combat pane is rendered for the
 * `green-jelly` key the engine's elite carries, through the real registry,
 * over the 24 cells that ship.
 *
 * The opaque layer among the player's children is the absolute sheet cell on
 * screen (row * columns + frame), so asserting its row asserts which drawing
 * of the jelly the player sees: idle row 0, struck row 1, attacking row 2.
 *
 * The jelly is the first set on a `foot-line` anchor, and that has one visible
 * consequence in the pane: every cell is pinned to the bottom of its box, so
 * the jelly sits on the floor of the band rather than floating in its middle.
 * That the foot line holds still across the frames themselves is pinned
 * against the master's pixels in the art department's own suite
 * (`tests/test_jelly_foot_line.py`).
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

const JELLY = ENEMY_FRAME_SETS['green-jelly'];

function eliteVM(): CombatEnemyPaneVM {
    return {
        name: 'The Green Jelly', artKey: 'green-jelly', isBoss: false, artNonce: 3,
        hp: 110, maxHp: 120, hpPct: 0.92, effects: [],
        intent: {
            type: 'attack', icon: 'blade', label: 'surges', damage: 9, branch: null, next: null,
            wallMath: { projectedDamage: 9, netDamage: 9, willDeny: false, guard: 0, barrier: 0 },
        } as unknown as CombatEnemyPaneVM['intent'],
        stagesEntered: 0, pendingDot: 0, roundsToKill: null, isLethalInFlight: false,
    };
}

const PLAYER: CombatPlayerPaneVM = {
    name: 'Pilgrim', hp: 40, maxHp: 50, hpPct: 0.8, guard: 0, effects: [],
};

const ELITE_BEAT: CombatEvent[] = [
    { kind: 'threat-fired' },
    { kind: 'damage-dealt', target: 'self', amount: 9 },
] as unknown as CombatEvent[];

const PLAYER_BLOW: CombatEvent[] = [
    { kind: 'damage-dealt', target: 'enemy', amount: 9 },
] as unknown as CombatEvent[];

function renderPane(fx?: CombatFx) {
    const { tree } = withAllProviders(
        <CombatCombatantPane enemy={eliteVM()} player={PLAYER} fx={fx} region="the Breakwater" />,
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
    return Math.floor(cell / JELLY.manifest.columns);
}

describe('the green jelly animates in a live encounter (phase AN3b, A6)', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
            .mockResolvedValue(false as unknown as boolean);
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('is registered against the key the engine gives the Act 1 elite', () => {
        // The pane looks the set up by the roster's portraitAsset; a rename on
        // either side would silently return the elite to a still painting.
        const elite = EnemyLibrary.find((e) => e.id === 'enemy-green-jelly');
        expect(elite?.portraitAsset).toBe('green-jelly');
        expect(getEnemyFrameSet('green-jelly')).toBe(JELLY);
    });

    it('mounts the frame player, one layer per shipped cell, instead of the painting', () => {
        const view = renderPane();
        const root = view.getByTestId('combat-enemy-frames');
        expect(root.children).toHaveLength(24);
        expect(view.queryByTestId('combat-enemy-frames-invalid')).toBeNull();
        expect(rowOf(liveCell(view))).toBe(JELLY.manifest.clips.idle.row);
    });

    it('stands on the floor of its box: every cell is pinned to the bottom (A7)', () => {
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
        const view = renderPane({ seq: 1, events: ELITE_BEAT });
        const resting = liveCell(view);
        expect(rowOf(resting)).toBe(JELLY.manifest.clips.idle.row);

        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
        const swinging = liveCell(view);
        expect(rowOf(swinging)).toBe(JELLY.manifest.clips.attacking.row);
        expect(swinging).not.toBe(resting);

        // The clip advances: a later cell of the same row, not one held frame.
        act(() => { jest.advanceTimersByTime(1000 / JELLY.manifest.clips.attacking.fps * 4); });
        const later = liveCell(view);
        expect(rowOf(later)).toBe(JELLY.manifest.clips.attacking.row);
        expect(later).toBeGreaterThan(swinging);

        act(() => { jest.advanceTimersByTime(clipDurationMs(JELLY.manifest.clips.attacking)); });
        expect(rowOf(liveCell(view))).toBe(JELLY.manifest.clips.idle.row);
    });

    it('flinches through its STRUCK row when the player\'s blow lands', () => {
        const view = renderPane({ seq: 1, events: PLAYER_BLOW });
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS); });        expect(rowOf(liveCell(view))).toBe(JELLY.manifest.clips.struck.row);
        act(() => { jest.advanceTimersByTime(clipDurationMs(JELLY.manifest.clips.struck)); });
        expect(rowOf(liveCell(view))).toBe(JELLY.manifest.clips.idle.row);
    });

    it('holds a single resting cell when motion is reduced', async () => {
        (AccessibilityInfo.isReduceMotionEnabled as jest.Mock)
            .mockResolvedValue(true as unknown as never);
        const view = renderPane();
        await act(async () => { await Promise.resolve(); });
        view.rerender(
            withAllProviders(
                <CombatCombatantPane
                    enemy={eliteVM()} player={PLAYER} fx={{ seq: 2, events: ELITE_BEAT }}
                    region="the Breakwater"
                />,
            ).tree,
        );
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 10); });
        expect(view.getByTestId('combat-enemy-frames-still')).toBeTruthy();
        const idle = JELLY.manifest.clips.idle;
        expect(liveCell(view)).toBe(idle.row * JELLY.manifest.columns + idle.rest);
    });
});
