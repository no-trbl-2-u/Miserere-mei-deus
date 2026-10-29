/**
 * Hermetic screen test — the rest and settlement screens hold their rows
 * in one centred column (CRITIQUE pass 71).
 *
 * At 1280 wide the REST / THE CUT offers and every stall row ran the full
 * window, a ware's name at the left edge and its price ~1200px away at the
 * right. The main menu (MENU_COLUMN_MAX_WIDTH) and the combat preview
 * (REVEAL_COLUMN_MAX_WIDTH) had the same fault and the same cure.
 *
 * The loot cache had the same fault (CRITIQUE pass 108): both offers ran as
 * 1250px bars with the card face crowded at the left edge.
 *
 * Contract asserted here: each screen's content sits in a column capped at
 * a reading width and centred, at full width below the cap so a phone
 * still fills it; the settlement's pinned exit shares the cap, so TAKE THE
 * ROAD stays under the stalls rather than spanning the screen.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { render, within } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { createLootCacheChoiceSession, createRestChoiceSession } from '@mechanics';

import CacheScreen, { CACHE_COLUMN_MAX_WIDTH } from '@/app/cache/index';
import RestScreen, { REST_COLUMN_MAX_WIDTH } from '@/app/rest/index';
import VillageScreen, { VILLAGE_COLUMN_MAX_WIDTH } from '@/app/village/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { FONTS } from '@/theme/axm';

// Hoisted above the imports by babel-plugin-jest-hoist: both screens pop the
// route the moment their slice empties, so the router must be stubbed.
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => true,
    }),
}));

/** A store seated on a camp's rest offer. */
function restStore(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    store.setState({
        rest: {
            session: createRestChoiceSession(71, {
                shelter: 'camp',
                maxHealth: 160,
                health: 90,
                currency: 40,
                deckCardIds: [],
            }),
        },
    });
    return store;
}

/** A store seated on a loot cache's two offers. */
function cacheStore(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    store.setState({
        cache: {
            session: createLootCacheChoiceSession(108, {
                cardCandidate: 'grey-ward',
                itemCandidates: [],
                currencyCandidate: 8,
            }),
        },
    });
    return store;
}

/** A store seated on a village with its rest and card-shop counters. */
function villageStore(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const state = store.getState();
    store.setState({
        player: { ...state.player, currency: 999 },
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: {
                state: undefined as never,
                event: {
                    kind: 'village',
                    villageName: 'Saltmarsh',
                    merchants: [],
                    rest: { price: 6 },
                    cardShop: { cardIds: ['grey-strike', 'grey-ward', 'grey-word'], price: 6 },
                } as never,
            },
        },
    });
    return store;
}

/**
 * Assert a column is capped at `cap`, centred, and full width below it.
 *
 * Input: the rendered column element and the screen's exported cap.
 * Output: none (throws on a failed expectation).
 */
function expectReadingColumn(column: { props: { style: unknown } }, cap: number) {
    const style = StyleSheet.flatten(column.props.style as never) as Record<string, unknown>;
    expect(style.maxWidth).toBe(cap);
    expect(cap).toBeGreaterThanOrEqual(480);
    expect(cap).toBeLessThanOrEqual(560);
    expect(style.alignSelf).toBe('center');
    expect(style.width).toBe('100%');
}

describe('rest and settlement screens hold one centred column (critique pass 71)', () => {
    it('rest: the purse and both offers sit in the capped column', () => {
        const r = render(
            <GameStoreProvider store={restStore()}>
                <RestScreen />
            </GameStoreProvider>,
        );
        const column = r.getByTestId('rest-column');
        expectReadingColumn(column, REST_COLUMN_MAX_WIDTH);
        expect(column).toContainElement(r.getByTestId('rest-purse'));
        expect(column).toContainElement(r.getByTestId('rest-choice-offer-rest'));
        expect(column).toContainElement(r.getByTestId('rest-choice-offer-upgrade'));
    });

    it('rest: the purse figure prints in the open-zero face, so 0 never reads as 8 (critique pass 104)', () => {
        const r = render(
            <GameStoreProvider store={restStore()}>
                <RestScreen />
            </GameStoreProvider>,
        );
        const figure = within(r.getByTestId('rest-purse')).getByText(/^\d+$/);
        expect(StyleSheet.flatten(figure.props.style).fontFamily).toBe(FONTS.sans);
    });

    it('village: the counters sit in the capped column, and the exit shares the cap', () => {
        const r = render(
            <GameStoreProvider store={villageStore()}>
                <VillageScreen />
            </GameStoreProvider>,
        );
        const column = r.getByTestId('village-column');
        expectReadingColumn(column, VILLAGE_COLUMN_MAX_WIDTH);
        expect(column).toContainElement(r.getByTestId('village-rest'));
        expect(column).toContainElement(r.getByTestId('village-card-shop'));

        const exit = r.getByTestId('village-exit-column');
        expectReadingColumn(exit, VILLAGE_COLUMN_MAX_WIDTH);
        expect(exit).toContainElement(r.getByTestId('village-leave'));
    });

    it('cache: the title and both offers sit in the capped column (critique pass 108)', () => {
        const r = render(
            <GameStoreProvider store={cacheStore()}>
                <CacheScreen />
            </GameStoreProvider>,
        );
        const column = r.getByTestId('cache-column');
        expectReadingColumn(column, CACHE_COLUMN_MAX_WIDTH);
        expect(column).toContainElement(r.getByTestId('cache-choice-offer-card'));
        expect(column).toContainElement(r.getByTestId('cache-choice-offer-item'));
    });
});
