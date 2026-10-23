/**
 * CombatEncounterPanel — commit budget of a drag.
 *
 * Every React commit during a drag is JS-thread work the finger is waiting
 * on: the ghost only shows once the pickup commit lands, and a drop's result
 * only paints once its commit does. This pins the budget the drag-perf work
 * set (docs/perf/combat-drag-baseline.md): a drag begin or end costs ONE
 * commit, and staging a card costs ONE (the board used to prune its pending
 * die picks into a fresh object in an effect, which scheduled a second).
 *
 * A pickup is split by priority: the FIRST commit reveals the ghost and must
 * not carry the board (whose `drag` still reads idle); the board's re-render
 * follows as a transition. So the ghost never waits on the board.
 *
 * The drag is driven through the panel's own `DragController` (the board's
 * `drag` prop), the same calls the gesture worklets make via `runOnJS`.
 */

import React, { Profiler } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import { clearPending, prunePending, type CombatBoardProps } from '@/components/combat/encounter/CombatBoard';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'];

/** Mount the panel under a Profiler, enter the fight, and let the roll settle. */
function mountLiveBoard() {
    // Per commit: is the ghost mounted, and does the board's `drag` read live?
    const commits = { n: 0, log: [] as { ghost: 'card' | 'die' | 'none'; boardLive: boolean }[] };
    const { store, enemy } = startRealFight(REAL_FIGHT_FIXTURE, {
        player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 160, maxHealth: 160 },
    });
    const bootstrapPlayer = store.getState().player;
    const { tree } = withAllProviders(
        <Profiler id="combat-panel" onRender={() => {
            commits.n += 1;
            // `screen` is unset during the very first render.
            try {
                commits.log.push({
                    // Which payload the ghost carries: a die ghost renders its
                    // own die face, a card ghost a card face (hidden from a11y,
                    // so the query must include hidden elements).
                    ghost: screen.queryByTestId('combat-drag-ghost-die', { includeHiddenElements: true }) ? 'die'
                        : screen.queryByTestId('combat-drag-ghost', { includeHiddenElements: true }) ? 'card' : 'none',
                    boardLive: !!findBoard()?.drag.active,
                });
            } catch { /* not mounted yet */ }
        }}>
            <CombatEncounterPanel enemy={enemy} bootstrapPlayer={bootstrapPlayer} deck={CARDS} seed={7} onExit={() => undefined} />
        </Profiler>,
        { store },
    );
    render(tree);
    act(() => { fireEvent.press(screen.getByTestId('combat-enter')); });
    act(() => { jest.advanceTimersByTime(5000); });
    const board = (): CombatBoardProps => findBoard()!;
    return { commits, board };
}

/** The board's props, read fresh each time (the panel re-creates `drag`
 *  whenever the active payload changes); null before the first mount. */
function findBoard(): CombatBoardProps | null {
    try {
        const hit = screen.UNSAFE_root.findAll(
            (n: { props: unknown }) => !!(n.props as Partial<CombatBoardProps>).drag && !!(n.props as Partial<CombatBoardProps>).stagedUids,
        )[0];
        return hit ? (hit.props as CombatBoardProps) : null;
    } catch {
        return null;
    }
}

/** Commits caused by `fn`. */
function commitsOf(commits: { n: number }, fn: () => void): number {
    const before = commits.n;
    act(fn);
    return commits.n - before;
}

describe('CombatEncounterPanel — drag commit budget', () => {
    it('a pickup reveals the ghost before the board re-renders; end, stage and unstage cost one commit', () => {
        jest.useFakeTimers();
        try {
            const { commits, board } = mountLiveBoard();
            const card = board().vm.hand[0];
            commits.log.length = 0;
            // Pickup: the ghost commit first (board still idle), then the
            // board's transition. At most three commits (React may re-check
            // the board's external stores after the transition, a no-op).
            const pickup = commitsOf(commits, () => board().drag.begin({ type: 'card', from: 'hand', uid: card.uid, card }, 100, 600));
            expect(pickup).toBeLessThanOrEqual(3);
            expect(commits.log[0]).toEqual({ ghost: 'card', boardLive: false });
            expect(commits.log.at(-1)?.boardLive).toBe(true);
            expect(commitsOf(commits, () => board().drag.end(-1, -1))).toBe(1);
            expect(commitsOf(commits, () => board().onStage(card.uid))).toBe(1);
            // A die drag over the staged card: begin and end, one each.
            const die = board().vm.dice.find((d) => d.draggable)!;
            commits.log.length = 0;
            expect(commitsOf(commits, () => board().drag.begin({ type: 'die', dieId: die.id, die }, 100, 600))).toBeLessThanOrEqual(3);
            expect(commits.log[0]).toEqual({ ghost: 'die', boardLive: false });
            expect(commitsOf(commits, () => board().drag.end(-1, -1))).toBe(1);
            // Unstaging is one commit too.
            expect(commitsOf(commits, () => board().onUnstage(card.uid))).toBe(1);
        } finally {
            jest.useRealTimers();
        }
    });
});

describe('prunePending / clearPending — identity-stable when nothing changes', () => {
    it('returns the same object when every pick is still staged', () => {
        const prev = { a: 'd1', b: 'd2' };
        expect(prunePending(prev, ['a', 'b', 'c'])).toBe(prev);
    });

    it('drops picks for cards no longer staged', () => {
        expect(prunePending({ a: 'd1', b: 'd2' }, ['b'])).toEqual({ b: 'd2' });
    });

    it('clearPending keeps an empty object and empties a full one', () => {
        const empty = {};
        expect(clearPending(empty)).toBe(empty);
        expect(clearPending({ a: 'd1' })).toEqual({});
    });
});
