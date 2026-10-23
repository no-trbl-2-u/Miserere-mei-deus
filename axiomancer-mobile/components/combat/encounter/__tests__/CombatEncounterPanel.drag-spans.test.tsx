/**
 * CombatEncounterPanel — one Sentry drag span per drag (phase PF3, A4).
 *
 * `startDragSpan` is mocked: each call records its kind and the outcomes its
 * end function received. Every drag must start exactly one span and end it
 * exactly once, whichever way it exits: a drop, a gesture cancel, or the
 * interrupt recovery's finalize. The recovery hook is mocked so the test
 * holds its `finalize` and can fire it as a dead pointer stream would.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import type { CombatBoardProps } from '@/components/combat/encounter/CombatBoard';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

const mockSpans: { kind: string; ends: string[] }[] = [];
let mockFinalize: (() => void) | null = null;

jest.mock('@/lib/monitoring', () => ({
    startDragSpan: (kind: string) => {
        const span = { kind, ends: [] as string[] };
        mockSpans.push(span);
        return (outcome: string) => { span.ends.push(outcome); };
    },
}));
jest.mock('@/components/combat/encounter/useDragInterruptRecovery', () => ({
    useDragInterruptRecovery: (active: boolean, finalize: () => void) => { mockFinalize = active ? finalize : null; },
}));

const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'];

function mountLiveBoard() {
    const { store, enemy } = startRealFight(REAL_FIGHT_FIXTURE, {
        player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 160, maxHealth: 160 },
    });
    const bootstrapPlayer = store.getState().player;
    const { tree } = withAllProviders(
        <CombatEncounterPanel enemy={enemy} bootstrapPlayer={bootstrapPlayer} deck={CARDS} seed={7} onExit={() => undefined} />,
        { store },
    );
    const view = render(tree);
    act(() => { fireEvent.press(screen.getByTestId('combat-enter')); });
    act(() => { jest.advanceTimersByTime(5000); });
    return { view, board: (): CombatBoardProps => findBoard() };
}

function findBoard(): CombatBoardProps {
    const hit = screen.UNSAFE_root.findAll(
        (n: { props: unknown }) => !!(n.props as Partial<CombatBoardProps>).drag && !!(n.props as Partial<CombatBoardProps>).stagedUids,
    )[0];
    return hit.props as CombatBoardProps;
}

describe('CombatEncounterPanel — drag spans', () => {
    beforeEach(() => { jest.useFakeTimers(); mockSpans.length = 0; mockFinalize = null; });
    afterEach(() => { jest.useRealTimers(); });

    it('a cancelled hand-card drag opens hand-to-play and ends it once as cancelled', () => {
        const { board } = mountLiveBoard();
        const card = board().vm.hand[0];
        act(() => { board().drag.begin({ type: 'card', from: 'hand', uid: card.uid, card }, 100, 600); });
        act(() => { board().drag.end(-1, -1); });
        act(() => { board().drag.end(-1, -1); });
        expect(mockSpans).toEqual([{ kind: 'hand-to-play', ends: ['cancelled'] }]);
    });

    it('a released drag ends as dropped, whatever the drop resolves to', () => {
        const { board } = mountLiveBoard();
        const card = board().vm.hand[0];
        act(() => { board().drag.begin({ type: 'card', from: 'hand', uid: card.uid, card }, 100, 600); });
        act(() => { board().drag.end(5, 5); });
        expect(mockSpans).toEqual([{ kind: 'hand-to-play', ends: ['dropped'] }]);
    });

    it('a die drag finalized by the interrupt recovery ends as interrupted, once', () => {
        const { board } = mountLiveBoard();
        const die = board().vm.dice.find((d) => d.draggable)!;
        act(() => { board().drag.begin({ type: 'die', dieId: die.id, die }, 100, 600); });
        expect(mockFinalize).not.toBeNull();
        const finalize = mockFinalize!;
        act(() => { finalize(); });
        act(() => { finalize(); });
        expect(mockSpans).toEqual([{ kind: 'die-to-card', ends: ['interrupted'] }]);
    });

    it('a card dragged from play is play-to-hand', () => {
        const { board } = mountLiveBoard();
        const card = board().vm.hand[0];
        act(() => { board().onStage(card.uid); });
        act(() => { board().drag.begin({ type: 'card', from: 'play', uid: card.uid, card }, 100, 600); });
        act(() => { board().drag.end(-1, -1); });
        expect(mockSpans).toEqual([{ kind: 'play-to-hand', ends: ['cancelled'] }]);
    });

    it('unmounting mid-drag closes the open span', () => {
        const { view, board } = mountLiveBoard();
        const card = board().vm.hand[0];
        act(() => { board().drag.begin({ type: 'card', from: 'hand', uid: card.uid, card }, 100, 600); });
        view.unmount();
        expect(mockSpans).toEqual([{ kind: 'hand-to-play', ends: ['interrupted'] }]);
    });
});
