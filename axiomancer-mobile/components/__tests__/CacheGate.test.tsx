/**
 * Hermetic component tests — CacheGate.
 *
 * CacheGate is a side-effect-only component (returns null) that
 * pushes the user into the full-screen `/cache` route whenever
 * a Reliquary session starts (`selectHasActiveCache` flips true).
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import React from 'react';
import type { LootCacheChoiceSession } from '@mechanics';

import { CacheGate } from '@/components/CacheGate';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import {
    EMPTY_CACHE_SLICE,
    createAppStore,
    type AppStore,
} from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const mockPush = jest.fn();
const mockRouter = {
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
};

jest.mock('@/lib/platform/router', () => ({
    // Return a stable reference so the CacheGate useEffect's
    // [hasCache, router] dep array doesn't fire on every
    // re-render (matches expo-router's production behavior).
    useRouter: () => mockRouter,
}));

afterEach(() => {
    mockPush.mockClear();
});

function makeStore(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter() });
}

function setActiveSession(store: AppStore) {
    // Create a minimal mock session to trigger the gate
    const mockSession: LootCacheChoiceSession = {
        phase: 'offer',
        cardCandidate: 'spoiled-poultice',
        itemCandidates: [],
        currencyCandidate: 0,
        description: null,
        actions: { card: '[content]', item: '[content]' },
        outcome: null,
        seed: 1,
    };

    store.setState({
        cache: {
            ...EMPTY_CACHE_SLICE,
            session: mockSession,
        },
    });
}

function withProvider(store: AppStore, child: React.ReactNode) {
    return <GameStoreProvider store={store}>{child}</GameStoreProvider>;
}

describe('CacheGate: active cache sessions route to /cache', () => {
    it('does not push when there is no active cache session (fresh store)', () => {
        const store = makeStore();
        render(withProvider(store, <CacheGate />));
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('pushes /cache when a session is active at mount', () => {
        const store = makeStore();
        setActiveSession(store);
        render(withProvider(store, <CacheGate />));
        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/cache');
    });

    it('pushes /cache when the state flips from no-session to active', () => {
        const store = makeStore();
        render(withProvider(store, <CacheGate />));
        expect(mockPush).not.toHaveBeenCalled();

        act(() => {
            setActiveSession(store);
        });
        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/cache');
    });

    it('does not re-push when the session stays active across re-renders', () => {
        const store = makeStore();
        setActiveSession(store);
        const tree = render(withProvider(store, <CacheGate />));
        expect(mockPush).toHaveBeenCalledTimes(1);

        // Force a re-render of the gate without changing the selector value.
        act(() => {
            tree.rerender(withProvider(store, <CacheGate />));
        });
        // The useEffect dep is the boolean from the selector, which is
        // stable across this re-render — no additional push.
        expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it('renders nothing (side-effect-only)', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <CacheGate />));
        expect(tree.toJSON()).toBeNull();
    });

    it('does not push when session becomes null after being active', () => {
        const store = makeStore();
        setActiveSession(store);
        render(withProvider(store, <CacheGate />));
        expect(mockPush).toHaveBeenCalledTimes(1);
        mockPush.mockClear();

        // Clear the session
        act(() => {
            store.setState({
                cache: EMPTY_CACHE_SLICE,
            });
        });
        
        // Should not push again when going from active to inactive
        expect(mockPush).not.toHaveBeenCalled();
    });
});