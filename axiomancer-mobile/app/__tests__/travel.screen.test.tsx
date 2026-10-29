/**
 * /travel - the travel screen (phase NK1d). One screen: the node's art, its
 * flavor text and "Move to {destination}?", with YES (moves) and NO (stays).
 * A shut way says so and offers no YES. Nothing on the map names where a
 * passage leads; only this screen does.
 */

import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { createStartingWorld, moveToNode, type GameState } from '@mechanics';
import { PASSAGE_MAP, registerTravelPassageFixture } from '@mechanics/Game/fixtures';

import TravelScreen from '@/app/travel/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppActions } from '@/state/actions';
import { createAppStore, type AppStore } from '@/state/store';
import { createFixtureStore } from '@/test-utils/fixtureStore';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

beforeAll(() => { registerTravelPassageFixture(); });

function mount(store: AppStore) {
    render(
        <GameStoreProvider store={store}>
            <TravelScreen />
        </GameStoreProvider>,
    );
}

function onTheBridge() {
    const handle = createFixtureStore({
        id: 'nk1d-bridge', seed: 'nk1d-bridge',
        world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-18' },
    });
    handle.actions.resolveCurrentMapEvent('travel');
    mount(handle.store);
    return handle;
}

function onPassageNode(nodeId: 'ward' | 'trail') {
    const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld(PASSAGE_MAP) } });
    const actions = createAppActions(store);
    const world = (store.getState() as unknown as GameState).world;
    store.setState({ world: moveToNode(world, nodeId) } as never);
    actions.resolveCurrentMapEvent();
    mount(store);
    return { store, actions };
}

describe('/travel - "Move to X?"', () => {
    it('shows the art, the flavor text and the question', () => {
        onTheBridge();
        expect(screen.getByTestId('travel-art')).toBeTruthy();
        expect(screen.getByTestId('travel-prompt').props.children).toMatch(/toll-house/);
        expect(screen.getByTestId('travel-question').props.children).toBe('Move to The Charcoal Wood?');
        expect(screen.getByTestId('travel-yes')).toBeTruthy();
        expect(screen.getByTestId('travel-no')).toBeTruthy();
    });

    it('YES moves the player', () => {
        const { store } = onTheBridge();
        fireEvent.press(screen.getByTestId('travel-yes'));
        expect(store.getState().world.currentMap.name).toBe('charcoal-wood');
        expect(store.getState().travel.open).toBeNull();
    });

    it('NO keeps the player on the node', () => {
        const { store } = onTheBridge();
        fireEvent.press(screen.getByTestId('travel-no'));
        expect(store.getState().world.currentMap.name).toBe('breakwater');
        expect(store.getState().world.currentMap.currentNode).toBe('bw-18');
        expect(store.getState().travel.open).toBeNull();
    });

    it('a shut way says so and offers no YES', () => {
        onPassageNode('ward');
        expect(screen.getByTestId('travel-shut').props.children).toBe('The way is shut.');
        expect(screen.queryByTestId('travel-yes')).toBeNull();
        expect(screen.getByTestId('travel-no')).toBeTruthy();
    });
});
