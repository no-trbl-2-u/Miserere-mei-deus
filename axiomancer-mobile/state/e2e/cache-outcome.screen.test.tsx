/**
 * Hermetic screen e2e — `/cache` picture first (plan 174, A4-A6).
 *
 * Begins a real cache from a pinned seed, takes each choice on the screen and
 * checks the outcome shows what was rolled (the card in the one card face, or
 * the goods rows and the shillings), the purse in the bar reads the take paid,
 * and MOVE ON pays it. Hermetic = self-contained + deterministic + isolated.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import type { GameState } from '@mechanics';

import CacheScreen from '@/app/cache/index';
import { createAppActions } from '@/state/actions';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => true,
    }),
}));

afterEach(() => {
    delete (globalThis as { __AXM_CACHE_SEED__?: number }).__AXM_CACHE_SEED__;
});

const CURRENCY = 6;

function openCache(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    createAppActions(store).beginLootCacheChoice({ tier: 'modest', currency: CURRENCY, seed: 626262, description: 'A niche.' });
    return store;
}

function renderCache(store: AppStore) {
    return render(
        <GameStoreProvider store={store}>
            <CacheScreen />
        </GameStoreProvider>,
    );
}

const purseOf = (store: AppStore) => (store.getState() as unknown as GameState).player.currency ?? 0;

describe('/cache outcomes show what was rolled and MOVE ON pays it', () => {
    it('the choice shows the chest band and the purse as it stands', () => {
        const store = openCache();
        renderCache(store);
        expect(screen.getByTestId('cache-band-choice')).toBeTruthy();
        expect(screen.getByTestId('cache-purse').props.children).toBe(`${purseOf(store)} shillings`);
        expect(screen.queryByTestId('cache-outcome')).toBeNull();
    });

    it('TAKE A CARD: the card band, the rolled card in its face, the purse unchanged; MOVE ON deals it', () => {
        const store = openCache();
        const rolled = store.getState().cache!.session!.cardCandidate;
        const before = (store.getState() as unknown as GameState).player.combatRewardCards ?? [];
        const purse = purseOf(store);
        renderCache(store);
        fireEvent.press(screen.getByTestId('cache-choice-offer-card'));

        expect(screen.getByTestId('cache-band-card')).toBeTruthy();
        expect(screen.getByText('TAKE A CARD')).toBeTruthy();
        expect(screen.getByTestId('cache-outcome-card')).toBeTruthy();
        expect(screen.getByTestId('cache-purse').props.children).toBe(`${purse} shillings`);
        const outcome = store.getState().cache!.session!.outcome!;
        expect(outcome.rewardCardId).toBe(rolled);

        fireEvent.press(screen.getByTestId('cache-claim'));
        const after = store.getState() as unknown as GameState;
        expect(after.player.combatRewardCards).toEqual([...before, outcome.rewardCardId]);
        expect(purseOf(store)).toBe(purse);
    });

    it('TAKE THE GOODS: the gold band, a row per good, the shillings, the purse after; MOVE ON pays them', () => {
        const store = openCache();
        const purse = purseOf(store);
        renderCache(store);
        fireEvent.press(screen.getByTestId('cache-choice-offer-item'));

        expect(screen.getByTestId('cache-band-goods')).toBeTruthy();
        expect(screen.getByText('TAKE THE GOODS')).toBeTruthy();
        const outcome = store.getState().cache!.session!.outcome!;
        expect(outcome.items.length).toBeGreaterThan(0);
        expect(screen.getAllByTestId(/^cache-good-/)).toHaveLength(outcome.items.length);
        expect(screen.getByText(`+${CURRENCY} SHILLINGS`)).toBeTruthy();
        expect(screen.getByTestId('cache-purse').props.children).toBe(`${purse + CURRENCY} shillings`);
        expect(screen.queryByTestId('cache-outcome-card')).toBeNull();

        fireEvent.press(screen.getByTestId('cache-claim'));
        expect(purseOf(store)).toBe(purse + CURRENCY);
    });
});
