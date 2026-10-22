/**
 * Phase AN1e, A9 — THE FLOAT-EYE ANIMATES IN A REAL ENCOUNTER.
 *
 * Every other suite in this directory injects a frame set at
 * `getEnemyFrameSet`, because the engine had to be provable before anything
 * was installed. This one mocks NOTHING. It renders the live combat pane for
 * `float-eye`, through the real registry, over the 24 cells that actually ship
 * — and then renders the same pane for an enemy with no entry and asserts the
 * single painting.
 *
 * That pairing is the whole point. "The registry has an entry" and "the enemy
 * animates" are two different claims, and a phase that only proved the first
 * could ship a green build in which the eye is as still as it was. Here they
 * are one test: the installed enemy mounts the player AND the picture on
 * screen changes with its state, while the unregistered one does neither.
 *
 * WHAT "THE PICTURE CHANGED" MEANS HERE. The player mounts one layer per cell
 * and makes exactly one of them opaque, so the index of the opaque layer IS
 * the absolute cell of the sheet — row * columns + frame. Idle is row 0 (cells
 * 0-7), struck row 1 (8-15), attacking row 2 (16-23). Asserting the row the
 * live cell falls in is therefore asserting which drawing of the eye the
 * player is looking at, not merely which string a prop holds.
 */
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render, type RenderResult } from '@testing-library/react-native';

import { CombatCombatantPane, type CombatFx } from '@/components/combat/encounter/CombatCombatantPane';
import { ENEMY_ATTACK_IMPACT_MS, clipDurationMs } from '@/components/combat/frames';
import { ENEMY_FRAME_SETS, getEnemyFrameSet } from '@/assets/images/enemies/frames';
import type { CombatEnemyPaneVM, CombatPlayerPaneVM } from '@/state/presenters/combat-encounter.engine';
import type { CombatEvent } from '@mechanics';
import { withAllProviders } from '@/test-utils/withAllProviders';
import { CARD_MOTION_SETTLE_MS } from '@/components/combat/encounter/cardMotion';

const FLOAT_EYE = ENEMY_FRAME_SETS['float-eye'];

function enemyVM(artKey: string, name: string): CombatEnemyPaneVM {
    return {
        name, artKey, isBoss: false, artNonce: 3,
        hp: 20, maxHp: 30, hpPct: 0.66, effects: [],
        intent: {
            type: 'attack', icon: 'blade', label: 'strikes', damage: 6, branch: null, next: null,
            wallMath: { projectedDamage: 6, netDamage: 6, willDeny: false, guard: 0, barrier: 0 },
        } as unknown as CombatEnemyPaneVM['intent'],
        stagesEntered: 0, pendingDot: 0, roundsToKill: null, isLethalInFlight: false,
    };
}

const PLAYER: CombatPlayerPaneVM = {
    name: 'Pilgrim', hp: 40, maxHp: 50, hpPct: 0.8, guard: 0, effects: [],
};

/** The enemy's own beat: its threat fired and the player took the hit. */
const ENEMY_BEAT: CombatEvent[] = [
    { kind: 'threat-fired' },
    { kind: 'damage-dealt', target: 'self', amount: 6 },
] as unknown as CombatEvent[];

/** The player's blow landing on the enemy, with no threat of its own. */
const PLAYER_BLOW: CombatEvent[] = [
    { kind: 'damage-dealt', target: 'enemy', amount: 9 },
] as unknown as CombatEvent[];

function renderPane(artKey: string, name: string, fx?: CombatFx) {
    const { tree } = withAllProviders(
        <CombatCombatantPane enemy={enemyVM(artKey, name)} player={PLAYER} fx={fx} region="the Drowned Parish" />,
    );
    return render(tree);
}

/**
 * The absolute sheet cell currently on screen: the index of the one opaque
 * layer among the player's children. -1 when nothing is opaque, which is a
 * blank enemy and must never happen.
 */
function liveCell(view: RenderResult): number {
    const root = view.getByTestId('combat-enemy-frames');
    return root.children.findIndex((child: unknown) => {
        const style = (child as { props?: { style?: unknown } }).props?.style;
        return JSON.stringify(style ?? '').includes('"opacity":1');
    });
}

/** Which clip's row a sheet cell belongs to. */
function rowOf(cell: number): number {
    return Math.floor(cell / FLOAT_EYE.manifest.columns);
}

describe('the float-eye animates in a live encounter (phase AN1e, A9)', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
            .mockResolvedValue(false as unknown as boolean);
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('is registered against the key the engine gives it', () => {
        // `enemy-float-eye` carries `portraitAsset: 'float-eye'` in the engine
        // roster, and this is the key the pane looks the set up by. A rename
        // on either side silently un-animates the enemy, so it is pinned.
        expect(getEnemyFrameSet('float-eye')).toBe(FLOAT_EYE);
    });

    it('mounts the frame player, one layer per shipped cell, instead of the painting', () => {
        const view = renderPane('float-eye', 'Float-Eye');
        const root = view.getByTestId('combat-enemy-frames');
        expect(root).toBeTruthy();
        expect(root.children).toHaveLength(24);
        // Not the "refused an invalid set" placeholder: the real set validates
        // and the real cells are mounted.
        expect(view.queryByTestId('combat-enemy-frames-invalid')).toBeNull();
        expect(liveCell(view)).toBeGreaterThanOrEqual(0);
    });

    it('rests inside its idle row, so the enemy is alive rather than paused', () => {
        const view = renderPane('float-eye', 'Float-Eye');
        expect(rowOf(liveCell(view))).toBe(FLOAT_EYE.manifest.clips.idle.row);
    });

    it('moves to a cell of the ATTACKING row on the enemy\'s beat, and back to idle', () => {
        const view = renderPane('float-eye', 'Float-Eye', { seq: 1, events: ENEMY_BEAT });
        const resting = liveCell(view);
        expect(rowOf(resting)).toBe(FLOAT_EYE.manifest.clips.idle.row);

        // The swing lands with the recoil, not on the frame the events arrived.
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
        const swinging = liveCell(view);
        expect(rowOf(swinging)).toBe(FLOAT_EYE.manifest.clips.attacking.row);
        // The literal claim the phase exists to make: the drawing on screen is
        // a different drawing than it was a beat ago.
        expect(swinging).not.toBe(resting);

        act(() => { jest.advanceTimersByTime(clipDurationMs(FLOAT_EYE.manifest.clips.attacking)); });
        expect(rowOf(liveCell(view))).toBe(FLOAT_EYE.manifest.clips.idle.row);
    });

    it('moves to a cell of the STRUCK row when the player\'s blow lands on it', () => {
        const view = renderPane('float-eye', 'Float-Eye', { seq: 1, events: PLAYER_BLOW });
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS); });        expect(rowOf(liveCell(view))).toBe(FLOAT_EYE.manifest.clips.struck.row);
        act(() => { jest.advanceTimersByTime(clipDurationMs(FLOAT_EYE.manifest.clips.struck)); });
        expect(rowOf(liveCell(view))).toBe(FLOAT_EYE.manifest.clips.idle.row);
    });

    it('holds a single resting cell, and plays nothing, when motion is reduced', async () => {
        (AccessibilityInfo.isReduceMotionEnabled as jest.Mock)
            .mockResolvedValue(true as unknown as never);
        const view = renderPane('float-eye', 'Float-Eye');
        await act(async () => { await Promise.resolve(); });
        view.rerender(
            withAllProviders(
                <CombatCombatantPane
                    enemy={enemyVM('float-eye', 'Float-Eye')}
                    player={PLAYER}
                    fx={{ seq: 2, events: ENEMY_BEAT }}
                    region="the Drowned Parish"
                />,
            ).tree,
        );
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 10); });
        expect(view.getByTestId('combat-enemy-frames-still')).toBeTruthy();
        const idle = FLOAT_EYE.manifest.clips.idle;
        expect(liveCell(view)).toBe(idle.row * FLOAT_EYE.manifest.columns + idle.rest);
    });

    // THE OTHER HALF OF A9. Without this, "the pane animates" could be true of
    // every enemy, and the static path would have been quietly deleted. Since
    // AN3b every roster key animates, so the static path is driven with keys
    // that have no set: an unregistered one and a retired one.
    it.each(['no-such-enemy', 'hag'])(
        '%s has no frame set, and still renders its single painting',
        (artKey) => {
            expect(getEnemyFrameSet(artKey)).toBeNull();
            const view = renderPane(artKey, 'Someone Else', { seq: 1, events: ENEMY_BEAT });
            act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS * 4); });
            expect(view.queryByTestId('combat-enemy-frames')).toBeNull();
            expect(view.getByTestId('combat-enemy-figure')).toBeTruthy();
        },
    );
});
