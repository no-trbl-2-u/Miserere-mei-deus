/**
 * Every node wears its kind (phase BW1c, A8 and A9 of the BW1 brief).
 *
 * A8: a node shows its kind token (an opaque disc in its kind's colour with
 * the kind's glyph) when it is the node underfoot or an offered move, when it
 * is one road from an offered move, and always when it is a quest node; every
 * other node shows only its state mark. A9: an elite node wears the elite
 * mark, a travel node the door, the map's start node the start mark.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import React from 'react';

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
        useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => false }),
        Tabs: mockTabsComponent,
    };
});

import {
    createNewGameState, getMapDefinition, getNodePrimaryEventKind, isEliteNode, placeOnNode,
    type GameState, type MapName,
} from '@mechanics';
import { CombatModeProvider } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import {
    ACTION_ICON_BY_TYPE, NODE_KIND_LABEL, kindTokenNodes, selectExplorationViewModel,
    type ExplorationViewModel, type NodeType,
} from '@/state/presenters/exploration.engine';
import { isAxmIconName } from '@/components/icons';
import ExplorationScreen from '@/app/(tabs)/exploration';

const CONTINENT = 'coastal-continent';
const MAP = 'breakwater';

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

function storeOn(overrides: Partial<GameState>): AppStore {
    return createAppStore({ adapter: createMemoryAdapter(), overrides });
}

function freshBreakwater(): AppStore {
    return storeOn(createNewGameState({ startMap: MAP }));
}

/** A fresh Breakwater game placed on `nodeId`. */
function standingOn(nodeId: string): AppStore {
    const fresh = createNewGameState({ startMap: MAP });
    return storeOn({ ...fresh, world: placeOnNode(fresh.world, nodeId) });
}

/** A8, read independently of the presenter: the ids that should wear a token. */
function expectedTokens(vm: ExplorationViewModel): string[] {
    const def = getMapDefinition(CONTINENT, MAP);
    const offered = new Set(vm.nodes.filter((n) => n.kind === 'available' || n.actsAgain === true).map((n) => n.id));
    const roads = def.nodes.flatMap((n) => n.connectedNodes.map((m) => [n.id, m] as const));
    const nextToOffered = (id: string) =>
        roads.some(([a, b]) => (a === id && offered.has(b)) || (b === id && offered.has(a)));
    return vm.nodes
        .filter((n) => n.id === vm.currentNodeId || offered.has(n.id) || nextToOffered(n.id) || n.type === 'quest')
        .map((n) => n.id)
        .sort();
}

function shownTokens(vm: ExplorationViewModel): string[] {
    return vm.nodes.filter((n) => n.showKind === true).map((n) => n.id).sort();
}

describe('A8: which nodes wear their kind token', () => {
    it('on a fresh Breakwater: the start, its offered moves, the nodes beyond them and every quest node', () => {
        const vm = selectExplorationViewModel(freshBreakwater().getState());
        const shown = shownTokens(vm);
        expect(shown).toEqual(expectedTokens(vm));
        // The rule is not vacuous: some nodes wear a token, and most of the map does not.
        expect(shown).toContain(vm.currentNodeId);
        expect(shown.length).toBeLessThan(vm.nodes.length);
        expect(vm.nodes.filter((n) => n.showKind !== true).length).toBeGreaterThan(0);
    });

    it('a quest node wears its token even sealed and far from any offered move', () => {
        const vm = selectExplorationViewModel(freshBreakwater().getState());
        const quests = vm.nodes.filter((n) => n.type === 'quest');
        expect(quests.length).toBeGreaterThan(0);
        for (const q of quests) expect(q.showKind).toBe(true);
        expect(quests.some((q) => q.kind === 'locked')).toBe(true);
    });

    it.each(['bw-5', 'bw-10', 'bw-17'])('standing on %s, the tokens follow the player', (nodeId) => {
        const vm = selectExplorationViewModel(standingOn(nodeId).getState());
        expect(vm.currentNodeId).toBe(nodeId);
        expect(shownTokens(vm)).toEqual(expectedTokens(vm));
    });

    it('the map screen draws a token on exactly those nodes', () => {
        const store = freshBreakwater();
        const vm = selectExplorationViewModel(store.getState());
        const tree = render(
            <CombatModeProvider>
                <GameStoreProvider store={store}>
                    <ExplorationScreen />
                </GameStoreProvider>
            </CombatModeProvider>,
        );
        act(() => { jest.advanceTimersByTime(1); });
        const drawn = vm.nodes.filter((n) => tree.queryByTestId(`node-${n.id}-kind`) !== null).map((n) => n.id).sort();
        expect(drawn).toEqual(shownTokens(vm));
    });
});

describe('kindTokenNodes', () => {
    // a - b - c - d, with q a quest node off d.
    const nodes: { id: string; type: NodeType }[] = [
        { id: 'a', type: 'start' },
        { id: 'b', type: 'encounter' },
        { id: 'c', type: 'rest' },
        { id: 'd', type: 'hazard' },
        { id: 'q', type: 'quest' },
    ];
    const roads: Record<string, string[]> = { a: ['b'], b: ['a', 'c'], c: ['b', 'd'], d: ['c', 'q'], q: ['d'] };
    const neighbours = (id: string) => roads[id] ?? [];

    it('shows the node underfoot, the offered moves, their neighbours and quest nodes, and nothing else', () => {
        expect([...kindTokenNodes(nodes, 'a', new Set(['b']), neighbours)].sort()).toEqual(['a', 'b', 'c', 'q']);
    });

    it('a node one road from an offered move shows; two roads away does not', () => {
        const shown = kindTokenNodes(nodes, 'a', new Set(['b']), neighbours);
        expect(shown.has('c')).toBe(true);
        expect(shown.has('d')).toBe(false);
    });

    it('with nothing offered, only the node underfoot and the quest nodes show', () => {
        expect([...kindTokenNodes(nodes, 'c', new Set(), neighbours)].sort()).toEqual(['c', 'q']);
    });
});

describe('A9: the new marks', () => {
    it('every elite node on the Breakwater reads ELITE and wears the horned helm', () => {
        const vm = selectExplorationViewModel(freshBreakwater().getState());
        const def = getMapDefinition(CONTINENT, MAP);
        const elites = def.nodes.filter((n) => isEliteNode(CONTINENT, MAP, n.id)).map((n) => n.id);
        expect(elites.length).toBeGreaterThan(0);
        for (const id of elites) expect(vm.nodes.find((n) => n.id === id)?.type).toBe('elite');
        // An encounter that is not elite stays a plain fight.
        const plain = def.nodes.filter(
            (n) => getNodePrimaryEventKind(CONTINENT, MAP, n.id) === 'encounter'
                && !isEliteNode(CONTINENT, MAP, n.id)
                && vm.nodes.find((v) => v.id === n.id)?.type !== 'boss',
        );
        expect(plain.length).toBeGreaterThan(0);
        for (const n of plain) expect(vm.nodes.find((v) => v.id === n.id)?.type).toBe('encounter');
        expect(ACTION_ICON_BY_TYPE.elite).toBe('elite');
        expect(NODE_KIND_LABEL.elite).toBe('ELITE · BATTLE');
    });

    it.each<MapName>(['breakwater', 'charcoal-wood', 'beacon-crags', 'lantern-deep'])('%s: an elite node offered as a move commits combat and wears its token', (map) => {
        const fresh = createNewGameState({ startMap: map });
        const continent = fresh.world.currentMap!.continent;
        const def = getMapDefinition(continent, map);
        const elites = def.nodes.filter((n) => isEliteNode(continent, map, n.id)).map((n) => n.id);
        expect(elites.length).toBeGreaterThan(0);
        // Stand on each node a road leads from, and keep the ones whose road is open.
        const offeredFrom = def.nodes
            .filter((n) => n.connectedNodes.some((m) => elites.includes(m)))
            .flatMap((n) => {
                const vm = selectExplorationViewModel(storeOn({ ...fresh, world: placeOnNode(fresh.world, n.id) }).getState());
                return vm.nodes.filter((v) => elites.includes(v.id) && v.kind === 'available');
            });
        // A quest pocket may hold a map's elite behind its giver, so not every map offers one this way.
        if (map === 'charcoal-wood') expect(offeredFrom.length).toBeGreaterThan(0);
        for (const node of offeredFrom) {
            expect(node.type).toBe('elite');
            expect(node.triggersCombat).toBe(true);
            expect(node.showKind).toBe(true);
        }
    });

    it('the map\'s start node is START and wears the windmill', () => {
        const vm = selectExplorationViewModel(freshBreakwater().getState());
        const start = getMapDefinition(CONTINENT, MAP).startingNode.id;
        expect(vm.nodes.filter((n) => n.type === 'start').map((n) => n.id)).toEqual([start]);
        expect(ACTION_ICON_BY_TYPE.start).toBe('start');
    });

    it('a travel node wears the door, no longer the borrowed scroll', () => {
        expect(ACTION_ICON_BY_TYPE.door).toBe('door');
        expect(ACTION_ICON_BY_TYPE.door).not.toBe(ACTION_ICON_BY_TYPE.quest);
        const vm = selectExplorationViewModel(freshBreakwater().getState());
        const doors = getMapDefinition(CONTINENT, MAP).nodes
            .filter((n) => getNodePrimaryEventKind(CONTINENT, MAP, n.id) === 'travel')
            .map((n) => n.id);
        expect(doors.length).toBeGreaterThan(0);
        for (const id of doors) expect(vm.nodes.find((n) => n.id === id)?.type).toBe('door');
    });

    it.each(Object.entries(ACTION_ICON_BY_TYPE))('the %s kind draws a registered glyph (%s)', (_type, icon) => {
        expect(isAxmIconName(`action-${icon}`)).toBe(true);
    });
});
