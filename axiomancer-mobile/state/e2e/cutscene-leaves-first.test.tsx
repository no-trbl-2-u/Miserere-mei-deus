/**
 * A node's before-scene leaves the stack before the node's own event resolves.
 *
 * The node's screen (rest, quest, cache, a reward) is pushed by its gate the
 * moment the store resolves it. A push made while the scene is still on the
 * stack is popped by the scene screen's own back-out, leaving a dead shell. So
 * the scene backs out first, once, and only then continues to the node.
 *
 * Hermetic = self-contained + deterministic + isolated. See docs/testing.md.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { createStartingWorld, type ResolveMapEventResult } from '@mechanics';

const mockBack = jest.fn();
let mockCanGoBack = true;

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack, canGoBack: () => mockCanGoBack }),
}));
jest.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

import CutsceneScreen from '@/app/cutscene';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const LINES = ['The tide goes out and does not come back.', 'Something on the shingle is still breathing.'] as const;

function scene(slot: 'before' | undefined): ResolveMapEventResult {
    return {
        state: undefined as never,
        event: { kind: 'cutscene', lines: LINES, scene: 'windmill-headland', ...(slot ? { slot } : {}) } as never,
    };
}

function makeStore(slot: 'before' | undefined): AppStore {
    // The windmill's own scene is seen and the node spent, so continuing to the node resolves nothing.
    const world = createStartingWorld('breakwater');
    const currentMap = { ...world.currentMap, seenScenes: ['bw-w1'], consumedNodes: ['bw-w1'] };
    const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: { ...world, currentMap } } });
    store.setState({ event: { ...EMPTY_EVENT_SLICE, pending: scene(slot) } });
    return store;
}

function mount(store: AppStore) {
    return render(
        <GameStoreProvider store={store}>
            <CutsceneScreen />
        </GameStoreProvider>,
    );
}

/** What the pending event was each time the screen backed out. */
let pendingAtBack: Array<ResolveMapEventResult | null> = [];

beforeEach(() => {
    jest.useFakeTimers();
    mockCanGoBack = true;
    pendingAtBack = [];
    mockBack.mockReset();
});
afterEach(() => { jest.useRealTimers(); });

function watchBack(store: AppStore) {
    mockBack.mockImplementation(() => { pendingAtBack.push(store.getState().event.pending); });
}

describe('a node\'s before-scene', () => {
    it('backs out once, while the scene is still pending, then continues to the node', () => {
        const store = makeStore('before');
        watchBack(store);
        const tree = mount(store);

        act(() => { fireEvent.press(tree.getByTestId('cutscene-skip')); });

        expect(mockBack).toHaveBeenCalledTimes(1);
        // The back came before the node's own event: the scene was still the pending event.
        expect(pendingAtBack[0]?.event).toMatchObject({ kind: 'cutscene', slot: 'before' });
        // ...and the node was then continued to: the scene is gone from the slice (the node has no event of its own).
        expect(store.getState().event.pending?.event).toEqual({ kind: 'none' });
    });

    it('does not back out a second time when the screen goes inactive', () => {
        const store = makeStore('before');
        watchBack(store);
        const tree = mount(store);

        act(() => { fireEvent.press(tree.getByTestId('cutscene-skip')); });
        act(() => { jest.advanceTimersByTime(1000); });

        expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('the last tap leaves the same way as SKIP', () => {
        const store = makeStore('before');
        watchBack(store);
        const tree = mount(store);

        for (let k = 0; k < LINES.length; k++) {
            act(() => { fireEvent.press(tree.getByTestId('cutscene-advance')); });
            act(() => { jest.advanceTimersByTime(1000); });
        }

        expect(mockBack).toHaveBeenCalledTimes(1);
        expect(pendingAtBack[0]?.event).toMatchObject({ slot: 'before' });
    });

    it('with nowhere to go back to, still continues to the node and never backs out', () => {
        mockCanGoBack = false;
        const store = makeStore('before');
        const tree = mount(store);

        act(() => { fireEvent.press(tree.getByTestId('cutscene-skip')); });

        expect(mockBack).not.toHaveBeenCalled();
        expect(store.getState().event.pending?.event).toEqual({ kind: 'none' });
    });
});

describe('any other cutscene', () => {
    it('is dismissed and the screen backs out of itself once it is inactive', () => {
        const store = makeStore(undefined);
        const tree = mount(store);
        expect(mockBack).not.toHaveBeenCalled();

        act(() => { fireEvent.press(tree.getByTestId('cutscene-skip')); });

        expect(store.getState().event.pending).toBeNull();
        expect(mockBack).toHaveBeenCalledTimes(1);
    });
});
