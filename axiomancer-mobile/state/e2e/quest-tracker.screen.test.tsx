/**
 * The quest tracker and the shut road on the exploration screen (phase MQ1c,
 * A9 and A10).
 *
 * A9: two active quests show as two rows, each with its next unmet objective
 * and count; at most three rows then `+n more`; a tap opens the memoir; an
 * empty log draws no tracker; a `carry` objective reads `Bring: <item>`.
 * A10: a tap on a node behind a shut road shows the road's reason and the
 * quest holding it on the node confirm panel, with no TRAVEL button.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('@/lib/platform/router', () => {
    const ReactLib = require('react');
    const { View } = require('react-native');
    const mockTabsScreenComponent = jest.fn((props: { name: string }) =>
        ReactLib.createElement(View, { testID: `mock-tab-screen-${props.name}` }),
    );
    const mockTabsComponent = Object.assign(
        jest.fn((props: { children?: unknown }) =>
            ReactLib.createElement(View, { testID: 'mock-tabs' }, props.children as React.ReactNode),
        ),
        { Screen: mockTabsScreenComponent },
    );
    return {
        useRouter: () => ({ replace: jest.fn(), push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), canGoBack: () => false }),
        Tabs: mockTabsComponent,
    };
});

import {
    createStartingWorld,
    emptyQuestLog,
    getMapDefinition,
    giveQuestStep,
    startQuest,
    type GameState,
    type Quest,
    type QuestLog,
} from '@mechanics';
import {
    CASTLE_KEY, LONG_MAIN_LINE, LONG_SIDE_LINE, LONG_STEP_1, LONG_STEP_2, LONG_STEP_3, registerLongChainFixture,
} from '@mechanics/Game/fixtures';
import { CombatModeProvider } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { selectQuestTrackerVM } from '@/state/presenters/quest-tracker.engine';
import { selectExplorationViewModel } from '@/state/presenters/exploration.engine';
import ExplorationScreen from '@/app/(tabs)/exploration';

beforeEach(() => {
    jest.useFakeTimers();
    registerLongChainFixture();
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

/**
 * A new Breakwater with the windmill's arrival already played, so mounting
 * the map does not fire it (its cutscene gives the chain's first quest, which
 * would add a row of its own).
 */
function newStore(): AppStore {
    const w = createStartingWorld('breakwater');
    const map = { ...w.currentMap, pendingArrival: null, consumedNodes: [...w.currentMap.consumedNodes, 'bw-w1'] };
    return createAppStore({
        adapter: createMemoryAdapter(),
        overrides: { world: { ...w, currentMap: map } },
    });
}

function mount(store: AppStore) {
    const tree = render(
        <CombatModeProvider>
            <GameStoreProvider store={store}>
                <ExplorationScreen />
            </GameStoreProvider>
        </CombatModeProvider>,
    );
    act(() => { jest.advanceTimersByTime(1); });
    return tree;
}

/** The store's log, with the long chain's step 1 and the side quest both given. */
function giveTwo(store: AppStore): void {
    let state = store.getState() as unknown as GameState;
    state = giveQuestStep(state, LONG_MAIN_LINE, 1);
    state = giveQuestStep(state, LONG_SIDE_LINE, 1);
    store.setState({ quests: state.quests } as never);
}

function filler(n: number): Quest {
    return {
        name: `Errand ${n}`, description: 'x', mapName: 'breakwater', reward: 'quest', status: 'available',
        objectives: [{ id: 'goal', type: 'kill', description: 'foes', requiredCount: 3, currentCount: 2 }],
    } as Quest;
}

describe('A9: the quest tracker', () => {
    it('shows two active quests, each with its next unmet objective and count', () => {
        const store = newStore();
        giveTwo(store);
        const tree = mount(store);
        expect(tree.getByTestId('quest-tracker')).toBeTruthy();
        expect(tree.getByTestId('quest-tracker-row-mq1-long-1')).toBeTruthy();
        expect(tree.getByTestId('quest-tracker-row-mq1-long-side-1')).toBeTruthy();
        expect(tree.getAllByText('0/1')).toHaveLength(2);
        expect(tree.queryByTestId('quest-tracker-more')).toBeNull();
    });

    it('draws three rows then "+n more"', () => {
        const store = newStore();
        let log: QuestLog = emptyQuestLog();
        for (let n = 1; n <= 5; n += 1) log = startQuest(log, filler(n));
        store.setState({ quests: log } as never);
        const vm = selectQuestTrackerVM({ quests: log });
        expect(vm.rows.map(r => r.name)).toEqual(['Errand 1', 'Errand 2', 'Errand 3']);
        expect(vm.rows[0]).toMatchObject({ objective: 'foes', progress: '2/3' });
        const tree = mount(store);
        expect(tree.getByTestId('quest-tracker-more').props.children).toBe('+2 more');
        expect(tree.queryByTestId('quest-tracker-row-Errand 4')).toBeNull();
    });

    it('a tap opens the memoir quest list', () => {
        const store = newStore();
        giveTwo(store);
        const tree = mount(store);
        fireEvent.press(tree.getByTestId('quest-tracker'));
        expect(mockPush).toHaveBeenCalledWith('/(tabs)/memoir');
    });

    it('an empty log draws no tracker', () => {
        const tree = mount(newStore());
        expect(tree.queryByTestId('quest-tracker')).toBeNull();
    });

    it('a carry objective reads "Bring: <item>" and the count follows the satchel', () => {
        const store = newStore();
        let state = store.getState() as unknown as GameState;
        const log: QuestLog = { ...state.quests, completed: [LONG_STEP_1, LONG_STEP_2] };
        state = giveQuestStep({ ...state, quests: log }, LONG_MAIN_LINE, 3);
        store.setState({ quests: state.quests } as never);
        const vm = selectQuestTrackerVM({ quests: state.quests });
        expect(vm.rows).toEqual([
            { id: LONG_STEP_3, name: LONG_STEP_3, objective: `Bring: ${CASTLE_KEY.name}`, progress: '0/1' },
        ]);
    });
});

describe('A10: a shut road says why on the node panel', () => {
    const reasonOf = () => getMapDefinition('coastal-continent', 'breakwater')
        .initialBlockedRoutes!.find((r) => r.to === 'bw-k2')!.reason;

    /** On the keep gate (bw-k1), the keep gate to the sea keep (bw-k2) still shut. */
    function atTheKeepGate(): AppStore {
        const w = createStartingWorld('breakwater');
        const map = {
            ...w.currentMap,
            currentNode: 'bw-k1',
            pendingArrival: null,
            completedNodes: ['bw-w2', 'bw-w4', 'bw-w5'],
            consumedNodes: ['bw-w1', 'bw-w2', 'bw-w4', 'bw-w5'],
        };
        return createAppStore({ adapter: createMemoryAdapter(), overrides: { world: { ...w, currentMap: map } } });
    }

    it('names the node, the road\'s reason and the quest that holds it, with no TRAVEL button', () => {
        const store = atTheKeepGate();
        const node = selectExplorationViewModel(store.getState()).nodes.find((n) => n.id === 'bw-k2')!;
        expect(node.blockedBy).toBeTruthy();
        const tree = mount(store);
        act(() => { fireEvent.press(tree.getByTestId('node-bw-k2')); });
        expect(tree.getByTestId('node-confirm-panel')).toBeTruthy();
        expect(tree.getByTestId('node-confirm-shut-reason').props.children).toBe(reasonOf());
        expect(tree.getByTestId('node-confirm-shut-quest').props.children).toBe(`Held by: ${node.blockedBy}`);
        expect(tree.queryByTestId('node-confirm-go')).toBeNull();
        fireEvent.press(tree.getByTestId('node-confirm-cancel'));
        expect(tree.queryByTestId('node-confirm-shut-reason')).toBeNull();
    });

    it('a locked node with no blocked road still just toasts', () => {
        const store = atTheKeepGate();
        const tree = mount(store);
        act(() => { fireEvent.press(tree.getByTestId('node-bw-h1')); });
        expect(tree.queryByTestId('node-confirm-shut-reason')).toBeNull();
        expect(tree.getByTestId('exploration-node-toast')).toBeTruthy();
    });
});
