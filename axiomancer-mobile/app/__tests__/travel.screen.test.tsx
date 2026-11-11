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
        world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-b2' },
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
    it('shows the picture, the question, the scene line and MOVE and STAY', () => {
        onTheBridge();
        expect(screen.getByTestId('travel-art')).toBeTruthy();
        expect(screen.getByTestId('travel-image')).toBeTruthy();
        expect(screen.getByTestId('travel-prompt').props.children).toMatch(/toll-house/);
        expect(screen.getByTestId('travel-question').props.children).toBe('Move to The Charcoal Wood?');
        expect(screen.getByText('MOVE')).toBeTruthy();
        expect(screen.getByText('STAY')).toBeTruthy();
    });

    it('writes no eyebrow, no YES or NO', () => {
        onTheBridge();
        expect(screen.queryByText('THE WAY ON')).toBeNull();
        expect(screen.queryByText(/YES|NO ·/)).toBeNull();
    });

    it('MOVE moves the player', () => {
        const { store } = onTheBridge();
        fireEvent.press(screen.getByTestId('travel-move'));
        expect(store.getState().world.currentMap.name).toBe('charcoal-wood');
        expect(store.getState().travel.open).toBeNull();
    });

    it('STAY keeps the player on the node', () => {
        const { store } = onTheBridge();
        fireEvent.press(screen.getByTestId('travel-stay'));
        expect(store.getState().world.currentMap.name).toBe('breakwater');
        expect(store.getState().world.currentMap.currentNode).toBe('bw-b2');
        expect(store.getState().travel.open).toBeNull();
    });

    it('a shut way shows the shut line and MOVE disabled; pressing MOVE does nothing', () => {
        const { store } = onPassageNode('ward');
        expect(screen.getByTestId('travel-shut').props.children).toBe('The way is shut.');
        const move = screen.getByTestId('travel-move');
        expect(move.props.accessibilityState.disabled).toBe(true);
        fireEvent.press(move);
        expect(store.getState().travel.open).not.toBeNull();
        expect(screen.getByTestId('travel-shut')).toBeTruthy();
        expect(screen.getByTestId('travel-stay')).toBeTruthy();
    });

    it('a node with no entry shows the dark ground alone', () => {
        onPassageNode('ward');
        expect(screen.getByTestId('travel-art')).toBeTruthy();
        expect(screen.queryByTestId('travel-image')).toBeNull();
        expect(screen.queryByTestId('travel-crop')).toBeNull();
    });
});
