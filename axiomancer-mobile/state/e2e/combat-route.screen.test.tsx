/**
 * Hermetic E2E — the live `/combat-encounter` route (phase CR1a).
 *
 * The panel is stubbed to buttons that fire its `onExit(outcome)` and
 * `onWithdraw`, so each way out of a fight is pinned on the route's own
 * wiring: the panel's fight rules are covered by its own suites. Pins:
 * the staged foe reaches the panel; every exit lowers the combat flag and
 * leaves; defeat resets the run; WITHDRAW ends the staged fight; a boss
 * seals WITHDRAW; an empty route leaves at once (back, else the map); the
 * combat flag the route raises holds Android back. The route's
 * `gestureEnabled: false` registration is pinned in
 * `route-registration.engine.test.ts`.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { BackHandler, Platform } from 'react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ back: mockBack, replace: mockReplace, push: jest.fn(), canGoBack: () => mockCanGoBack }),
}));

type StubProps = {
    enemy: { id: string };
    onExit: (outcome: string | null) => void;
    onWithdraw?: () => void;
};
jest.mock('@/components/combat/encounter/CombatEncounterPanel', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ReactMock = require('react');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text, View } = require('react-native');
    function StubPanel({ enemy, onExit, onWithdraw }: StubProps) {
        return ReactMock.createElement(View, { testID: `stub-panel-${enemy.id}` }, [
            ...['victory', 'defeat', 'friendship'].map((o: string) => ReactMock.createElement(
                Text, { key: o, testID: `stub-exit-${o}`, onPress: () => onExit(o) }, o,
            )),
            onWithdraw
                ? ReactMock.createElement(Text, { key: 'w', testID: 'stub-withdraw', onPress: onWithdraw }, 'withdraw')
                : null,
        ]);
    }
    return { CombatEncounterPanel: StubPanel };
});

import CombatEncounterScreen from '@/app/combat-encounter/index';
import { HardwareBackHandler } from '@/components/HardwareBackHandler';
import { CombatModeProvider, useCombatMode } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { REAL_BOSS_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import type { FixtureRef } from '@/test-utils/fixtureStore';

let combat: ReturnType<typeof useCombatMode>;
function Probe() {
    combat = useCombatMode();
    return null;
}

beforeEach(() => {
    mockCanGoBack = true;
});

afterEach(() => {
    jest.clearAllMocks();
});

function stagedStore(ref?: FixtureRef): AppStore {
    return startRealFight(ref).store;
}

function mount(store: AppStore, extra?: React.ReactNode) {
    return render(
        <CombatModeProvider>
            <GameStoreProvider store={store}>
                <Probe />
                {extra}
                <CombatEncounterScreen />
            </GameStoreProvider>
        </CombatModeProvider>,
    );
}

describe('the live combat route', () => {
    it('hands the staged foe to the panel and raises the combat flag', () => {
        const { store, enemy } = startRealFight();
        const tree = mount(store);

        expect(tree.queryByTestId('combat-encounter-live')).not.toBeNull();
        expect(tree.queryByTestId(`stub-panel-${enemy.id}`)).not.toBeNull();
        expect(combat.inCombat).toBe(true);
    });

    it.each(['victory', 'friendship'])('%s: lowers the combat flag and leaves', (outcome) => {
        const store = stagedStore();
        const runId = store.getState().runId;
        const tree = mount(store);

        fireEvent.press(tree.getByTestId(`stub-exit-${outcome}`));

        expect(combat.inCombat).toBe(false);
        expect(mockBack).toHaveBeenCalledTimes(1);
        expect(store.getState().runId).toBe(runId);
    });

    it('defeat: resets the run, keeping the character, then leaves', () => {
        const store = stagedStore();
        const runId = store.getState().runId;
        const name = store.getState().player.name;
        const tree = mount(store);

        fireEvent.press(tree.getByTestId('stub-exit-defeat'));

        expect(store.getState().runId).not.toBe(runId);
        expect(store.getState().player.name).toBe(name);
        expect(combat.inCombat).toBe(false);
        expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('WITHDRAW: narrates the retreat, ends the staged fight and leaves', () => {
        const store = stagedStore();
        const tree = mount(store);

        fireEvent.press(tree.getByTestId('stub-withdraw'));

        expect(store.getState().currentEncounter ?? null).toBeNull();
        expect(store.getState().notifications?.toast?.text ?? '').toContain('you fled the encounter');
        expect(combat.inCombat).toBe(false);
        expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('a boss seals WITHDRAW', () => {
        const tree = mount(stagedStore(REAL_BOSS_FIGHT_FIXTURE));

        expect(tree.queryByTestId('stub-withdraw')).toBeNull();
    });

    it('keeps the foe after the store settles the fight, so the summary stays up', () => {
        const { store, enemy } = startRealFight();
        const tree = mount(store);

        act(() => { store.getState().endCombat('victory'); });

        expect(tree.queryByTestId(`stub-panel-${enemy.id}`)).not.toBeNull();
        expect(mockBack).not.toHaveBeenCalled();
    });

    it('with no staged fight, leaves at once: back when it can', () => {
        const tree = mount(createAppStore({ adapter: createMemoryAdapter() }));

        expect(tree.queryByTestId('combat-encounter-empty')).not.toBeNull();
        expect(mockBack).toHaveBeenCalledTimes(1);
        expect(combat.inCombat).toBe(false);
    });

    it('with no staged fight and nothing to go back to (a cold web load), replaces to the map', () => {
        mockCanGoBack = false;
        mount(createAppStore({ adapter: createMemoryAdapter() }));

        expect(mockReplace).toHaveBeenCalledWith('/exploration');
    });

    it('holds Android hardware back while the fight is up', () => {
        const actions: Array<() => boolean> = [];
        const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, action) => {
            actions.push(action as () => boolean);
            return { remove: jest.fn() } as ReturnType<typeof BackHandler.addEventListener>;
        });
        const os = Platform.OS;
        (Platform as { OS: string }).OS = 'android';
        try {
            mount(stagedStore(), <HardwareBackHandler />);
            expect(actions.length).toBeGreaterThan(0);
            expect(actions[actions.length - 1]()).toBe(true);
        } finally {
            (Platform as { OS: string }).OS = os;
            spy.mockRestore();
        }
    });
});
