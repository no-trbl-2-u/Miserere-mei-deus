/**
 * DebugSkipEvent -- the dev SKIP EVENT button (phase DY1c).
 *
 * A skipped crossing that kills a healthy pilgrim revives them behind the
 * return moment: the button sends the player to `/death-return` (which
 * consumes the armed flag) instead of the map. A survived skip still goes
 * to the map.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { DebugSkipEvent } from '@/components/DebugSkipEvent';
import { createAppActions, type AppActions } from '@/state/actions';
import { clearDeathReturn, isDeathReturnArmed } from '@/state/death-return';
import type { AppStore } from '@/state/store';
import { HAZARD_CRACK_CARD } from '@mechanics';
import type { GameState } from '@mechanics';
import { withAllProviders } from '@/test-utils/withAllProviders';

const mockPush = jest.fn();
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));
jest.mock('@/lib/buildProfile', () => ({
    ...(jest.requireActual('@/lib/buildProfile') as object),
    isDevToolsEnabled: () => true,
}));

beforeEach(() => {
    clearDeathReturn();
});

afterEach(() => {
    clearDeathReturn();
    jest.clearAllMocks();
});

/** Leaves a lost cracked-cliff crossing (-20 VITAE) on its rewards ledger. */
function stageLostCrossing(store: AppStore, actions: AppActions, health: number): void {
    actions.moveTo('bw-2');
    const p = (store.getState() as unknown as GameState).player;
    store.setState({ player: { ...p, health, maxHealth: Math.max(health, 15) } } as never);
    actions.beginHazard({ seed: 9, hazardId: 'cracked-cliff' });
    actions.selectHazardRoute('risk');
    actions.finishHazardRolling();
    for (let r = 0; r < 3; r++) {
        const sess = store.getState().hazard.session!;
        const uid = `t${sess.round}-0`;
        store.setState({
            hazard: { session: { ...sess, hand: [{ uid, cardId: HAZARD_CRACK_CARD.id, dieId: null }], play: [] } },
        });
        actions.stageHazardCard(uid);
        actions.resolveHazardRound();
        actions.continueHazardAfterResolve();
    }
    actions.acknowledgeHazardOutcome();
}

function mount(): { store: AppStore; actions: AppActions } {
    const { tree, store } = withAllProviders(<DebugSkipEvent />);
    render(tree);
    return { store, actions: createAppActions(store) };
}

describe('DebugSkipEvent', () => {
    it('a lethal skipped crossing goes to the return moment, which owns the armed flag', () => {
        const { store, actions } = mount();
        stageLostCrossing(store, actions, 15);

        fireEvent.press(screen.getByTestId('debug-skip-event-button'));

        expect(isDeathReturnArmed()).toBe(true);
        expect(mockPush).toHaveBeenCalledWith('/death-return');
        expect(mockPush).not.toHaveBeenCalledWith('/(tabs)/exploration');
    });

    it('a survived skipped crossing goes to the map and arms nothing', () => {
        const { store, actions } = mount();
        stageLostCrossing(store, actions, 40);

        fireEvent.press(screen.getByTestId('debug-skip-event-button'));

        expect(isDeathReturnArmed()).toBe(false);
        expect(mockPush).toHaveBeenCalledWith('/(tabs)/exploration');
    });
});
