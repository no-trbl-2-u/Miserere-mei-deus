/**
 * Phase AN6a - THE ENEMY'S ACTION CLIP ALWAYS PLAYS, WITH ANY FLINCH AFTER IT.
 *
 * Every event stream here comes out of the real engine. The check this phase
 * replaced stayed green for as long as it did because the pane's fixtures
 * hand-wrote a `damage-dealt` the engine never emits, so nothing below writes a
 * combat event by hand. A turn is what `onEndPhase` does (`endTurn`, then
 * `resolveThreatPhase`, the two event lists joined), and a tick or a thorn comes
 * from playing the real card that leaves it.
 *
 * The rendered half reads the live cell the way the Crane-Hook's suite does: the
 * opaque layer among the player's children is the absolute sheet cell on screen,
 * so its row is the drawing the player sees.
 */
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render, type RenderResult } from '@testing-library/react-native';

import { CombatCombatantPane } from '@/components/combat/encounter/CombatCombatantPane';
import { CARD_MOTION_SETTLE_MS } from '@/components/combat/encounter/cardMotion';
import { ENEMY_ATTACK_IMPACT_MS, clipDurationMs, isEnemyActionBeat } from '@/components/combat/frames';
import { ENEMY_FRAME_SETS, type EnemyFrameSet } from '@/assets/images/enemies/frames';
import {
    CRANE_HOOK, FRAMED, PLAYER, afterPlaying, cardIdNamed, enemyTurn, enemyVM, fight, stunned,
} from '@/test-utils/enemyTurnStreams';
import { withAllProviders } from '@/test-utils/withAllProviders';
import type { CombatEvent, Enemy } from '@mechanics';

const TURNS = 24;

/**
 * Frame sets installed before any enemy in the library wears their portrait
 * (the six Breakwater foes of the portrait swap). They have no enemy to take a
 * turn, so the roster sweep below cannot cover them yet.
 */
const STAGED_SETS = [
    'bilge-stalker', 'coralback', 'quay-crab', 'saint-beneath', 'saltwick-swarm', 'wreckmaster',
]

/** Sear the Frozen's free line: a DEAL now, and INFERNO on the foe for its turn start. */
const SEAR = cardIdNamed('Sear the Frozen');
/** Thornwall's free line: THORNS, for the foe's strikes to meet. */
const THORNWALL = cardIdNamed('Thornwall');

const fired = (events: readonly CombatEvent[]) => events.some((e) => e.kind === 'threat-fired');
const ticked = (events: readonly CombatEvent[]) =>
    events.some((e) => e.kind === 'dot-tick' && e.target === 'enemy');
const spiked = (events: readonly CombatEvent[]) => events.some((e) => e.kind === 'spike-struck');

// ── Rendering ────────────────────────────────────────────────────────────────

function paneTree(enemy: Enemy, seq: number, events: CombatEvent[]) {
    return withAllProviders(
        <CombatCombatantPane enemy={enemyVM(enemy)} player={PLAYER} fx={{ seq, events }} region="the Breakwater" />,
    ).tree;
}

function liveCell(view: RenderResult): number {
    const root = view.getByTestId('combat-enemy-frames');
    return root.children.findIndex((child: unknown) => {
        const style = (child as { props?: { style?: unknown } }).props?.style;
        return JSON.stringify(style ?? '').includes('"opacity":1');
    });
}

const rowOf = (view: RenderResult, set: EnemyFrameSet) => Math.floor(liveCell(view) / set.manifest.columns);

const setOf = (enemy: Enemy) => ENEMY_FRAME_SETS[enemy.portraitAsset as string];

/** Steps the pane through the rows a turn with both clips must show, on their exact edges. */
function expectActionThenFlinch(view: RenderResult, set: EnemyFrameSet) {
    const { idle, attacking, struck } = set.manifest.clips;
    expect(rowOf(view, set)).toBe(idle.row);
    act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS - 1); });
    expect(rowOf(view, set)).toBe(idle.row);
    act(() => { jest.advanceTimersByTime(1); });
    expect(rowOf(view, set)).toBe(attacking.row);
    act(() => { jest.advanceTimersByTime(clipDurationMs(attacking) - 1); });
    expect(rowOf(view, set)).toBe(attacking.row);
    act(() => { jest.advanceTimersByTime(1); });
    expect(rowOf(view, set)).toBe(struck.row);
    act(() => { jest.advanceTimersByTime(clipDurationMs(struck) - 1); });
    expect(rowOf(view, set)).toBe(struck.row);
    act(() => { jest.advanceTimersByTime(1); });
    expect(rowOf(view, set)).toBe(idle.row);
}

// ── The roster, turn by turn ─────────────────────────────────────────────────

describe('every framed enemy acts on every turn it fires (A1)', () => {
    it('finds the whole framed roster in the library', () => {
        // The guard against a vacuous table: one enemy per installed set, bar the
        // Breakwater portraits whose sets are installed ahead of their enemies.
        const unseated = Object.keys(ENEMY_FRAME_SETS).filter((key) => !STAGED_SETS.includes(key));
        expect(FRAMED.map((e) => e.portraitAsset).sort()).toEqual(unseated.sort());
    });

    it('lists as staged only sets whose portrait no library enemy wears yet', () => {
        // A stale entry fails here: once an enemy wears one of these, drop it from
        // STAGED_SETS so the turn sweep below covers that enemy.
        for (const key of STAGED_SETS) {
            expect(Object.keys(ENEMY_FRAME_SETS)).toContain(key);
            expect(FRAMED.map((e) => e.portraitAsset)).not.toContain(key);
        }
    });

    it('counts an action beat on every fired turn, across the roster', () => {
        let turns = 0;
        let beats = 0;
        for (const enemy of FRAMED) {
            let state = fight(enemy);
            for (let turn = 0; turn < TURNS; turn += 1) {
                const t = enemyTurn(state);
                state = t.state;
                turns += 1;
                expect(fired(t.events)).toBe(true);
                if (isEnemyActionBeat({ threatFired: fired(t.events) })) beats += 1;
            }
        }
        expect(turns).toBe(FRAMED.length * TURNS);
        expect(beats).toBe(turns);
    });
});

describe('the action clip, through the live pane, on real engine events', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
            .mockResolvedValue(false as unknown as boolean);
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it.each(FRAMED.map((e) => [e.portraitAsset as string, e] as const))(
        '%s plays its attacking row on its first turns',
        (_key, enemy) => {
            const set = setOf(enemy);
            const { idle, attacking } = set.manifest.clips;
            let state = fight(enemy);
            const first = enemyTurn(state);
            state = first.state;
            const view = render(paneTree(enemy, 1, first.events));
            for (let turn = 1; turn <= 3; turn += 1) {
                act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS); });
                expect(rowOf(view, set)).toBe(attacking.row);
                act(() => { jest.advanceTimersByTime(clipDurationMs(attacking)); });
                expect(rowOf(view, set)).toBe(idle.row);
                const t = enemyTurn(state);
                state = t.state;
                view.rerender(paneTree(enemy, turn + 1, t.events));
            }
            view.unmount();
        },
    );

    it('a hindered turn selects no action clip (A2)', () => {
        const set = setOf(CRANE_HOOK);
        const t = enemyTurn(stunned(fight(CRANE_HOOK)));
        expect(fired(t.events)).toBe(false);

        const view = render(paneTree(CRANE_HOOK, 1, t.events));
        const { idle, attacking } = set.manifest.clips;
        for (let ms = 0; ms < clipDurationMs(attacking) + ENEMY_ATTACK_IMPACT_MS; ms += 20) {
            act(() => { jest.advanceTimersByTime(20); });
            expect(rowOf(view, set)).not.toBe(attacking.row);
        }
        expect(rowOf(view, set)).toBe(idle.row);
    });

    it('a stunned turn with a tick flinches alone, on the board\'s wait', () => {
        const set = setOf(CRANE_HOOK);
        const t = enemyTurn(stunned(afterPlaying(CRANE_HOOK, [SEAR]).state));
        expect(fired(t.events)).toBe(false);
        expect(ticked(t.events)).toBe(true);

        const view = render(paneTree(CRANE_HOOK, 1, t.events));
        const { idle, struck } = set.manifest.clips;
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS - 1); });
        expect(rowOf(view, set)).toBe(idle.row);
        act(() => { jest.advanceTimersByTime(1); });
        expect(rowOf(view, set)).toBe(struck.row);
        act(() => { jest.advanceTimersByTime(clipDurationMs(struck)); });
        expect(rowOf(view, set)).toBe(idle.row);
    });

    it('a tick and a fired move run the whole action, and the flinch only after it (A3)', () => {
        const t = enemyTurn(afterPlaying(CRANE_HOOK, [SEAR]).state);
        expect(fired(t.events)).toBe(true);
        expect(ticked(t.events)).toBe(true);
        expect(spiked(t.events)).toBe(false);
        expectActionThenFlinch(render(paneTree(CRANE_HOOK, 1, t.events)), setOf(CRANE_HOOK));
    });

    it('thorns on the move follow the same order (A4)', () => {
        const t = enemyTurn(afterPlaying(CRANE_HOOK, [THORNWALL]).state);
        expect(fired(t.events)).toBe(true);
        expect(spiked(t.events)).toBe(true);
        expect(ticked(t.events)).toBe(false);
        expectActionThenFlinch(render(paneTree(CRANE_HOOK, 1, t.events)), setOf(CRANE_HOOK));
    });

    it('a tick and thorns on one turn give one flinch after the action (A4)', () => {
        const t = enemyTurn(afterPlaying(CRANE_HOOK, [SEAR, THORNWALL]).state);
        expect(fired(t.events)).toBe(true);
        expect(ticked(t.events)).toBe(true);
        expect(spiked(t.events)).toBe(true);
        // The exact edges include the return to idle at one flinch's length, so a
        // second flinch would fail the last row. The wait past it is the proof no
        // later one starts.
        const set = setOf(CRANE_HOOK);
        const view = render(paneTree(CRANE_HOOK, 1, t.events));
        expectActionThenFlinch(view, set);
        act(() => { jest.advanceTimersByTime(clipDurationMs(set.manifest.clips.struck) * 4); });
        expect(rowOf(view, set)).toBe(set.manifest.clips.idle.row);
    });

    it('a flinch on the player\'s own card keeps the board\'s wait (A5)', () => {
        const set = setOf(CRANE_HOOK);
        const played = afterPlaying(CRANE_HOOK, [SEAR]).events;
        expect(fired(played)).toBe(false);
        expect(played.some((e) => e.kind === 'damage-dealt' && e.target === 'enemy')).toBe(true);

        const view = render(paneTree(CRANE_HOOK, 1, played));
        const { idle, struck } = set.manifest.clips;
        act(() => { jest.advanceTimersByTime(CARD_MOTION_SETTLE_MS - 1); });
        expect(rowOf(view, set)).toBe(idle.row);
        act(() => { jest.advanceTimersByTime(1); });
        expect(rowOf(view, set)).toBe(struck.row);
        act(() => { jest.advanceTimersByTime(clipDurationMs(struck)); });
        expect(rowOf(view, set)).toBe(idle.row);
    });

    it('selects no clip at all when motion is reduced (A5)', async () => {
        (AccessibilityInfo.isReduceMotionEnabled as jest.Mock)
            .mockResolvedValue(true as unknown as never);
        const set = setOf(CRANE_HOOK);
        const t = enemyTurn(afterPlaying(CRANE_HOOK, [SEAR, THORNWALL]).state);
        const view = render(paneTree(CRANE_HOOK, 0, []));
        await act(async () => { await Promise.resolve(); });
        view.rerender(paneTree(CRANE_HOOK, 1, t.events));

        const { idle, attacking, struck } = set.manifest.clips;
        const rest = idle.row * set.manifest.columns + idle.rest;
        for (let ms = 0; ms < ENEMY_ATTACK_IMPACT_MS + clipDurationMs(attacking) + clipDurationMs(struck); ms += 50) {
            act(() => { jest.advanceTimersByTime(50); });
            expect(liveCell(view)).toBe(rest);
        }
    });
});
