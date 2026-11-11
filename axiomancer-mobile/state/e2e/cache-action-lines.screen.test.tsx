/**
 * Hermetic screen test — `/cache` shows what you DO, not what you get.
 *
 * Contract asserted here: the offer phase shows the title, the cache's
 * flavour line and the two choices, each with the node's own action line.
 * The eyebrow, the "node is spent" line, the card face and the goods list
 * are gone. Choosing still settles to the outcome ledger, which names the
 * reward paid — unchanged.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { createLootCacheChoiceSession, getCardById, getConsumableById } from '@mechanics';

import CacheScreen from '@/app/cache/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

// The screen pops the route the moment its slice empties.
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => true,
    }),
}));

const CARD_ID = 'grey-ward';
const FLAVOUR = 'Shillings in a niche at the cave mouth.';
const CARD_ACTION = 'Read the runes inside the cave';
const ITEM_ACTION = 'Plunder the corpses left by the previous patrons';

function cacheStore(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    store.setState({
        cache: {
            session: createLootCacheChoiceSession(11, {
                cardCandidate: CARD_ID,
                itemCandidates: [getConsumableById('healing-potion')!],
                currencyCandidate: 8,
                description: FLAVOUR,
                actions: { card: CARD_ACTION, item: ITEM_ACTION },
            }),
        },
    });
    return store;
}

function renderCache(store: AppStore) {
    return render(
        <GameStoreProvider store={store}>
            <CacheScreen />
        </GameStoreProvider>,
    );
}

describe('/cache — the choices say what you do', () => {
    it('shows the title, the purse, the flavour line, both action lines and a brass TAKE on each', () => {
        renderCache(cacheStore());
        expect(screen.getByText('TWO WAYS TO LEAVE IT')).toBeTruthy();
        expect(screen.getByTestId('cache-purse')).toBeTruthy();
        expect(screen.getByTestId('cache-band-choice')).toBeTruthy();
        expect(screen.getAllByText('TAKE')).toHaveLength(2);
        expect(screen.getByTestId('cache-choice-intro')).toBeTruthy();
        expect(screen.getByText(FLAVOUR)).toBeTruthy();
        expect(screen.getByTestId('cache-choice-action-card').props.children).toBe(CARD_ACTION);
        expect(screen.getByTestId('cache-choice-action-item').props.children).toBe(ITEM_ACTION);
    });

    it('each choice names its action in its accessibility label, never a reward', () => {
        renderCache(cacheStore());
        expect(screen.getByTestId('cache-choice-offer-card').props.accessibilityLabel)
            .toBe(`TAKE A CARD. ${CARD_ACTION}`);
        expect(screen.getByTestId('cache-choice-offer-item').props.accessibilityLabel)
            .toBe(`TAKE THE GOODS. ${ITEM_ACTION}`);
    });

    it('the eyebrow, the spent-node line, the card face and the goods list are gone', () => {
        renderCache(cacheStore());
        expect(screen.queryByText('A FIND, UNCLAIMED')).toBeNull();
        expect(screen.queryByTestId('cache-choice-intro-one-way')).toBeNull();
        expect(screen.queryAllByText(/node is spent/).length).toBe(0);
        expect(screen.queryAllByTestId(/^cache-choice-card-face-/).length).toBe(0);
        expect(screen.queryByTestId('cache-choice-goods-item')).toBeNull();
        expect(screen.queryByText('+ HEALING POTION')).toBeNull();
        expect(screen.queryByText('+8 SHILLINGS')).toBeNull();
        expect(screen.queryByText(getCardById(CARD_ID)!.name.toUpperCase())).toBeNull();
    });

    it('choosing the card settles to the same card drawn in the card face', () => {
        const store = cacheStore();
        renderCache(store);
        fireEvent.press(screen.getByTestId('cache-choice-offer-card'));
        expect(screen.getByTestId('cache-outcome')).toBeTruthy();
        expect(screen.getByTestId('cache-outcome-card')).toBeTruthy();
        expect(screen.getByText(getCardById(CARD_ID)!.name)).toBeTruthy();
    });

    it('choosing the goods settles to the haul and the shillings', () => {
        const store = cacheStore();
        renderCache(store);
        fireEvent.press(screen.getByTestId('cache-choice-offer-item'));
        expect(screen.getByTestId('cache-outcome')).toBeTruthy();
        expect(screen.getByText('+ HEALING POTION')).toBeTruthy();
        expect(screen.getByText('+8 SHILLINGS')).toBeTruthy();
    });
});
