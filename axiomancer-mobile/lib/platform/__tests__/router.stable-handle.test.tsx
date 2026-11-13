/**
 * Router — `useRouter()` keeps one identity across renders.
 *
 * The gates list `router` in their effect deps (`[hasCache, router]`), so a
 * fresh handle per render re-ran the push every time the root layout
 * re-rendered while a session was still open. On the web the secondary fonts
 * settle after the fixture's cache session opens, the layout re-renders, and
 * a second `/cache` was stacked over the first: the smoke harness's
 * `getByTestId(...).first()` then waited on the hidden copy (`load-failed`).
 *
 * These cases use the real router (no mock), with the container's dispatch
 * spied, so they fail if the handle goes back to being rebuilt per render.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, renderHook } from '@testing-library/react-native';
import React from 'react';
import type { LootCacheChoiceSession } from '@mechanics';

import { CacheGate } from '@/components/CacheGate';
import { RestGate } from '@/components/RestGate';
import { navigationRef, useRouter, __resetPendingNavigationForTests } from '@/lib/platform/router';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { EMPTY_CACHE_SLICE, createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const SESSION: LootCacheChoiceSession = {
    phase: 'offer',
    cardCandidate: 'spoiled-poultice',
    itemCandidates: [],
    currencyCandidate: 0,
    description: null,
    actions: { card: '[content]', item: '[content]' },
    outcome: null,
    seed: 1,
};

function storeWithCache(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    store.setState({ cache: { ...EMPTY_CACHE_SLICE, session: SESSION } });
    return store;
}

/** The gates under a parent that re-renders, standing in for the root layout. */
function Layout({ store }: { store: AppStore }) {
    return (
        <GameStoreProvider store={store}>
            <CacheGate />
            <RestGate />
        </GameStoreProvider>
    );
}

describe('useRouter returns one handle', () => {
    let dispatch: jest.SpiedFunction<typeof navigationRef.dispatch>;

    beforeEach(() => {
        __resetPendingNavigationForTests();
        jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
        dispatch = jest.spyOn(navigationRef, 'dispatch').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        __resetPendingNavigationForTests();
    });

    it('is the same object on every render', () => {
        const hook = renderHook(() => useRouter());
        const first = hook.result.current;
        hook.rerender(undefined);
        expect(hook.result.current).toBe(first);
        expect(renderHook(() => useRouter()).result.current).toBe(first);
    });

    it('a gate whose session stays open pushes its screen once, however often the layout re-renders', () => {
        const store = storeWithCache();
        const tree = render(<Layout store={store} />);
        expect(dispatch).toHaveBeenCalledTimes(1);
        act(() => tree.rerender(<Layout store={store} />));
        act(() => tree.rerender(<Layout store={store} />));
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch.mock.calls[0][0]).toMatchObject({ type: 'PUSH', payload: { name: 'cache/index' } });
    });
});
