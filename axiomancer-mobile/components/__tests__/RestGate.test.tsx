/**
 * Hermetic component tests — RestGate.
 *
 * RestGate is a side-effect-only component (returns null) that
 * pushes the user into the full-screen `/rest` route whenever
 * `selectHasActiveRest` flips true.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import React from 'react';
import type { RestChoiceSession } from '@mechanics';

import { RestGate } from '@/components/RestGate';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import {
    EMPTY_REST_SLICE,
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
    // Return a stable reference so the RestGate useEffect's
    // [hasRest, router] dep array doesn't fire on every
    // re-render (matches expo-router's production behavior).
    useRouter: () => mockRouter,
}));

afterEach(() => {
    mockPush.mockClear();
});

function makeStore(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter() });
}

function setActiveRestSession(store: AppStore, session: RestChoiceSession | null) {
    store.setState({
        rest: {
            ...EMPTY_REST_SLICE,
            session,
        },
    });
}

function withProvider(store: AppStore, child: React.ReactNode) {
    return <GameStoreProvider store={store}>{child}</GameStoreProvider>;
}

function makeActiveRestSession(): RestChoiceSession {
    return {
        phase: 'offer',
        shelter: 'camp',
        maxHealth: 20,
        health: 12,
        currency: 5,
        deckCardIds: [],
        upgradableCardIds: [],
        removals: 0,
        offers: [],
        description: null,
        outcome: null,
        seed: 12345,
    };
}

describe('RestGate: active rest sessions route to /rest', () => {
    it('does not push when there is no active rest session (fresh store)', () => {
        const store = makeStore();
        render(withProvider(store, <RestGate />));
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('pushes /rest when a rest session is active at mount', () => {
        const store = makeStore();
        setActiveRestSession(store, makeActiveRestSession());
        render(withProvider(store, <RestGate />));
        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/rest');
    });

    it('pushes /rest when the state flips from no-session to active', () => {
        const store = makeStore();
        render(withProvider(store, <RestGate />));
        expect(mockPush).not.toHaveBeenCalled();

        act(() => {
            setActiveRestSession(store, makeActiveRestSession());
        });
        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/rest');
    });

    it('does not re-push when the rest session stays active across re-renders', () => {
        const store = makeStore();
        setActiveRestSession(store, makeActiveRestSession());
        const tree = render(withProvider(store, <RestGate />));
        expect(mockPush).toHaveBeenCalledTimes(1);

        // Force a re-render of the gate without changing the selector value.
        act(() => {
            tree.rerender(withProvider(store, <RestGate />));
        });
        // The useEffect dep is the boolean from the selector, which is
        // stable across this re-render — no additional push.
        expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it('renders nothing (side-effect-only)', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <RestGate />));
        expect(tree.toJSON()).toBeNull();
    });
});