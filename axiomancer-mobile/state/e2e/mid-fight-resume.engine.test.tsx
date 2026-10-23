/**
 * Trim-the-fat Tier 0 item 6 — a chronicle continued mid-fight.
 *
 * The live fight's dice, hand and HP live in the combat panel's local state,
 * so a restart keeps only the engine's `currentEncounter` (the foe). Continue
 * lands on the map, and `<CombatGate>` routes the still-staged fight to
 * `/combat-encounter`, which restarts it against the saved foe.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: mockPush, back: jest.fn(), canGoBack: () => false }),
}));

import { CombatModeProvider } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { startRealFight } from '@/test-utils/realFight';
import ExplorationScreen from '@/app/(tabs)/exploration';
import { CombatGate } from '@/components/CombatGate';

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

/** A store whose player owns a real deck, as `beginHazardEncounter` guarantees. */
function makeStore(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const p = store.getState().player;
    store.setState({
        player: {
            ...p,
            knownCards: Array.from(new Set([
                ...(p.knownCards ?? []),
                'slippery-slope', 'recurring-symptom', 'brace-for-impact',
            ])),
        },
    });
    return store;
}

function mountExploration(store: AppStore) {
    const tree = render(
        <CombatModeProvider>
            <GameStoreProvider store={store}>
                <ExplorationScreen />
                <CombatGate />
            </GameStoreProvider>
        </CombatModeProvider>,
    );
    act(() => { jest.advanceTimersByTime(1); });
    return tree;
}

describe('continuing a chronicle saved mid-fight', () => {
    it('the gate routes the saved fight to /combat-encounter', () => {
        const { store } = startRealFight();

        const tree = mountExploration(store);

        expect(mockPush).toHaveBeenCalledWith('/combat-encounter');
        // The map is the map; the fight is drawn on its own route.
        expect(tree.queryByTestId('combat-reveal')).toBeNull();
        // The restarted fight is the real, persisted one — the encounter the
        // save carried is still the one on the books.
        expect(store.getState().currentEncounter).toBeDefined();
    });

    it('a chronicle saved outside a fight opens on the plain map', () => {
        const store = makeStore();

        const tree = mountExploration(store);

        expect(mockPush).not.toHaveBeenCalled();
        expect(tree.queryByTestId('map-canvas-wrapper')).not.toBeNull();
    });
});
