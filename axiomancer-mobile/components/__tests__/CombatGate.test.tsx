/**
 * Hermetic component tests — CombatGate.
 *
 * Side-effect-only: engages a `combat-prelude` event (stages the foe as
 * `currentEncounter`, raises the combat flag) and pushes `/combat-encounter`
 * once per staged fight, re-arming when the fight is settled.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

import { CombatGate } from '@/components/CombatGate';
import { CombatModeProvider, useCombatMode } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { arriveAtRealFight, startRealFight } from '@/test-utils/realFight';

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

let combat: { inCombat: boolean } = { inCombat: false };
function Probe() {
    combat = useCombatMode();
    return null;
}

function mount(store: AppStore) {
    const tree = render(
        <CombatModeProvider>
            <GameStoreProvider store={store}>
                <CombatGate />
                <Probe />
            </GameStoreProvider>
        </CombatModeProvider>,
    );
    act(() => { jest.advanceTimersByTime(1); });
    return tree;
}

function makeStore(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter() });
}

describe('CombatGate', () => {
    it('does nothing with no event and no fight', () => {
        const store = makeStore();
        mount(store);
        expect(mockPush).not.toHaveBeenCalled();
        expect(combat.inCombat).toBe(false);
    });

    it('engages a combat-prelude: stages the foe, clears the event, raises the combat flag', () => {
        const { store, nodeEnemy } = arriveAtRealFight();
        mount(store);

        expect(store.getState().event.pending).toBeNull();
        expect(store.getState().currentEncounter?.enemies[0]?.id).toBe(nodeEnemy.id);
        expect(combat.inCombat).toBe(true);
    });

    it('pushes /combat-encounter once while a fight is staged', () => {
        const { store } = arriveAtRealFight();
        mount(store);
        // An unrelated store change re-renders the gate; the latch holds.
        act(() => { store.setState({ _devSkipSeq: 0 } as never); });
        act(() => { jest.advanceTimersByTime(1); });

        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/combat-encounter');
    });

    it('re-arms when the fight is settled, so the next fight routes too', () => {
        const { store, enemy } = startRealFight();
        mount(store);
        expect(mockPush).toHaveBeenCalledTimes(1);

        act(() => { store.getState().endCombat('flee'); });
        expect(store.getState().currentEncounter ?? null).toBeNull();
        act(() => { store.getState().startCombat(enemy); });
        act(() => { jest.advanceTimersByTime(1); });

        expect(mockPush).toHaveBeenCalledTimes(2);
    });

    it('routes a fight already staged at mount (continued in memory) without engaging again', () => {
        const { store } = startRealFight();
        mount(store);

        expect(mockPush).toHaveBeenCalledWith('/combat-encounter');
        // The route raises the flag on mount for this path, not the gate.
        expect(combat.inCombat).toBe(false);
    });
});
