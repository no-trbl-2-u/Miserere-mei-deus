/**
 * Hermetic screen test — `/cache` shows the card it offers before the pick
 * (phase RW1b, A8; CRITIQUE RC2 walk item 11).
 *
 * Contract asserted here: in the offer phase the TAKE A CARD button renders
 * the rolled card's face and names the card in its accessibility label; TAKE
 * THE GOODS renders no face; choosing the card still settles to the outcome
 * ledger naming the same card.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { createLootCacheChoiceSession, getCardById } from '@mechanics';

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

function cacheStore(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    store.setState({
        cache: {
            session: createLootCacheChoiceSession(11, {
                cardCandidate: CARD_ID,
                itemCandidates: [],
                currencyCandidate: 8,
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

describe('/cache — the card offer shows its card', () => {
    it('TAKE A CARD renders the rolled card face and names it in its label', () => {
        renderCache(cacheStore());
        const name = getCardById(CARD_ID)!.name;
        expect(screen.getByTestId(`cache-choice-card-face-${CARD_ID}`)).toBeTruthy();
        expect(screen.getAllByText(name.toUpperCase()).length).toBeGreaterThan(0);
        const label = screen.getByTestId('cache-choice-offer-card').props.accessibilityLabel as string;
        expect(label).toContain('TAKE A CARD');
        expect(label).toContain(name);
    });

    it('TAKE THE GOODS renders no face and keeps its label', () => {
        renderCache(cacheStore());
        const goods = screen.getByTestId('cache-choice-offer-item');
        expect(goods.props.accessibilityLabel).toBe("TAKE THE GOODS. Whatever's inside, plus what it's worth.");
        expect(screen.queryAllByTestId(/^cache-choice-card-face-/).length).toBe(1);
    });

    it('choosing the card settles to the ledger naming the same card', () => {
        const store = cacheStore();
        renderCache(store);
        fireEvent.press(screen.getByTestId('cache-choice-offer-card'));
        expect(screen.getByTestId('cache-outcome')).toBeTruthy();
        expect(screen.getByText(`+ ${getCardById(CARD_ID)!.name.toUpperCase()}`)).toBeTruthy();
    });
});
