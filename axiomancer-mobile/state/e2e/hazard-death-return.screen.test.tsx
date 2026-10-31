/**
 * Hermetic screen test -- a lethal crossing reaches the return moment
 * (phase DY1c, A12).
 *
 * Mounts the real `/hazard` screen, plays a rigged failing crossing and
 * confirms the rewards ledger. A first death hands off to `/death-return`
 * (armed, by `replace`, with no pop of its own); a death while dying, and a
 * survived crossing, do not.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import HazardScreen from '@/app/hazard/index';
import { deckEventPoster } from '@/lib/deckEvents';
import { createAppActions, type AppActions } from '@/state/actions';
import { clearDeathReturn, isDeathReturnArmed } from '@/state/death-return';
import type { AppStore } from '@/state/store';
import { HAZARD_CRACK_CARD } from '@mechanics';
import type { GameState, HazardHandEntry } from '@mechanics';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { withAllProviders } from '@/test-utils/withAllProviders';

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: mockReplace,
        back: mockBack,
        push: jest.fn(),
        canGoBack: () => true,
    }),
}));

beforeEach(() => {
    clearDeathReturn();
});

afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
});

function mountHazard(): { store: AppStore; actions: AppActions } {
    const slots = createMemorySlotStore();
    slots.selectSlot(3);
    const { tree, store } = withAllProviders(<HazardScreen />, { slots });
    render(tree);
    return { store, actions: createAppActions(store) };
}

function setHealth(store: AppStore, health: number, maxHealth: number): void {
    const p = (store.getState() as unknown as GameState).player;
    store.setState({ player: { ...p, health, maxHealth } } as never);
}

/** Plays a failing `cracked-cliff` / risk crossing (-20 VITAE) up to the rewards ledger. */
function toFailedRewards(store: AppStore, actions: AppActions): void {
    act(() => {
        actions.beginHazard({ seed: 9, hazardId: 'cracked-cliff' });
        actions.selectHazardRoute('risk');
        actions.finishHazardRolling();
    });
    for (let r = 0; r < 3; r++) {
        act(() => {
            const s = store.getState().hazard.session!;
            const hand: HazardHandEntry[] = [{ uid: `t${s.round}-0`, cardId: HAZARD_CRACK_CARD.id, dieId: null }];
            store.setState({ hazard: { session: { ...s, hand, play: [] } } });
            for (const h of store.getState().hazard.session!.hand.slice()) actions.stageHazardCard(h.uid);
            actions.resolveHazardRound();
            actions.continueHazardAfterResolve();
        });
    }
    act(() => {
        actions.acknowledgeHazardOutcome();
    });
}

describe('hazard screen -- a lethal crossing', () => {
    it('a first death arms the return moment and replaces the screen with it', () => {
        const { store, actions } = mountHazard();
        act(() => {
            actions.moveTo('bw-w2');
            setHealth(store, 15, 15);
        });
        toFailedRewards(store, actions);

        mockBack.mockClear();
        fireEvent.press(screen.getByTestId('hazard-rewards-confirm'));

        expect((store.getState() as unknown as GameState).dying).toBe(true);
        expect(isDeathReturnArmed()).toBe(true);
        expect(mockReplace).toHaveBeenCalledWith('/death-return');
        // The return moment owns the way back: the hazard screen does not pop.
        expect(mockBack).not.toHaveBeenCalled();
    });

    it('a death while dying ends the run and does not show the return moment', () => {
        const { store, actions } = mountHazard();
        act(() => {
            actions.moveTo('bw-w2');
            setHealth(store, 15, 15);
            actions.playerDied('hazard');
            actions.moveTo('bw-w2');
        });
        toFailedRewards(store, actions);

        const post = jest.spyOn(deckEventPoster, 'post').mockResolvedValue(undefined as never);
        mockBack.mockClear();
        fireEvent.press(screen.getByTestId('hazard-rewards-confirm'));

        // The run over goes through the app's death verb: the play log gets its run-end.
        expect(post).toHaveBeenCalledWith(expect.objectContaining({ kind: 'run-end' }));
        expect((store.getState() as unknown as GameState).dying).toBeUndefined();
        expect(isDeathReturnArmed()).toBe(false);
        expect((store.getState() as unknown as GameState).runOver).toBe(true);
        expect(mockReplace).toHaveBeenCalledWith('/game-over?slot=3');
        expect(mockBack).not.toHaveBeenCalled();
    });

    it('a survived crossing leaves the screen as before', () => {
        const { store, actions } = mountHazard();
        act(() => {
            setHealth(store, 40, 40);
        });
        toFailedRewards(store, actions);

        mockBack.mockClear();
        fireEvent.press(screen.getByTestId('hazard-rewards-confirm'));

        expect(isDeathReturnArmed()).toBe(false);
        expect(mockReplace).not.toHaveBeenCalled();
        expect(mockBack).toHaveBeenCalled();
    });
});
