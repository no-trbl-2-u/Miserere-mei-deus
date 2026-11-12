/**
 * Hermetic component tests - QuestGate (phase QL1c).
 *
 * A side-effect-only component that pushes `/quest` once per open quest node
 * (or waiting card pick), and again only after the slice has emptied, even
 * when the router object changes identity between renders.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import React from 'react';

import { QuestGate } from '@/components/QuestGate';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { EMPTY_QUEST_SLICE, createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const mockPush = jest.fn();

jest.mock('@/lib/platform/router', () => ({
    // A NEW router object on every render: the latch must still push once.
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

afterEach(() => { mockPush.mockClear(); });

function makeStore(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter() });
}

const open = { questline: 'fixture-line', node: 1 };

describe('QuestGate', () => {
    it('does not push with nothing open', () => {
        render(<GameStoreProvider store={makeStore()}><QuestGate /></GameStoreProvider>);
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('pushes /quest once when a quest node is open, however often it re-renders', () => {
        const store = makeStore();
        store.setState({ quest: { ...EMPTY_QUEST_SLICE, open } });
        const view = render(<GameStoreProvider store={store}><QuestGate /></GameStoreProvider>);
        view.rerender(<GameStoreProvider store={store}><QuestGate /></GameStoreProvider>);
        act(() => { store.setState({ quest: { ...EMPTY_QUEST_SLICE, open: { ...open } } }); });
        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/quest');
    });

    it('pushes for a card pick waiting with no node open', () => {
        const store = makeStore();
        store.setState({ quest: { ...EMPTY_QUEST_SLICE, cardOffers: ['grey-ward'] } });
        render(<GameStoreProvider store={store}><QuestGate /></GameStoreProvider>);
        expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it('pushes again for the next open after the slice emptied', () => {
        const store = makeStore();
        render(<GameStoreProvider store={store}><QuestGate /></GameStoreProvider>);
        act(() => { store.setState({ quest: { ...EMPTY_QUEST_SLICE, open } }); });
        act(() => { store.setState({ quest: EMPTY_QUEST_SLICE }); });
        act(() => { store.setState({ quest: { ...EMPTY_QUEST_SLICE, open } }); });
        expect(mockPush).toHaveBeenCalledTimes(2);
    });
});
