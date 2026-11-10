/**
 * Hermetic screen test — the settlement's way out is never half-drawn
 * (14-village).
 *
 * Stating what every ware DOES (S5-talk-C04), at the size the inn prints
 * its descriptions (S5-talk-C17), added some 150pt to the stall list. TAKE
 * THE ROAD was the last child of the scrolling column, so on a 375x812
 * phone it came to rest across the bottom edge with only the upper half of
 * its letters on screen.
 *
 * Contract asserted here: the screen owns exactly ONE scroller, that
 * scroller is sized to the space the exit leaves it, and the exit is
 * rendered OUTSIDE it — whole however long the stalls run, at 375x812 and
 * at 1280x800 alike — while the stalls themselves, effect lines and all,
 * still scroll inside it.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { render, within } from '@testing-library/react-native';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import VillageScreen from '@/app/village/index';
import VillageRestScreen from '@/app/village/rest';
import VillageShopScreen from '@/app/village/shop';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

// Hoisted above the imports by babel-plugin-jest-hoist: this screen pops the
// route the moment its slice empties, so the router must be stubbed.
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => true,
    }),
}));

/** The card shop's three cards (NK1c: the item stalls became counters). */
const CARDS = ['grey-strike', 'grey-ward', 'grey-word'];

/**
 * Seat a village with every counter, with coin enough for all of them.
 *
 * Input: none. Output: a fresh `AppStore` on a memory adapter, its event
 * slice holding the market. Resolves: 14-village — pins the stall count
 * whose copy ran past the bottom of the phone.
 */
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
                    cardShop: { cardIds: CARDS, price: 6 },
                    anvil: {},
                } as never,
            },
        },
    });
    return store;
}

/**
 * Render the settlement screen over a seated store.
 *
 * Input: none. Output: the `@testing-library/react-native` render result.
 * Resolves: 14-village — one mount helper for every assertion below.
 */
function mountVillage() {
    return render(
        <GameStoreProvider store={villageStore()}>
            <VillageScreen />
        </GameStoreProvider>,
    );
}

/**
 * Collapse a React Native `style` prop (object, array, or nested array)
 * into one plain object.
 *
 * Input: the raw `style` prop of a rendered element. Output: a flat record
 * of resolved declarations. Resolves: 14-village — lets the assertions read
 * layout rules off the tree without a layout engine.
 */
function flattenStyle(style: unknown): Record<string, unknown> {
    return (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
}

describe('village exit is pinned below the stalls (14-village)', () => {
    it('renders the exit outside the scrolling column', () => {
        const r = mountVillage();

        expect(r.getByTestId('village-leave')).toBeTruthy();
        expect(within(r.getByTestId('village-scroll')).queryByTestId('village-leave')).toBeNull();
    });

    it('gives the screen exactly one scroller, sized to what the exit leaves', () => {
        const r = mountVillage();

        expect(r.UNSAFE_getAllByType(ScrollView)).toHaveLength(1);
        expect(flattenStyle(r.getByTestId('village-scroll').props.style).flex).toBe(1);
    });

    // 168.3: the hub holds one button per counter; each counter's wares
    // moved to its own screen, which keeps the same shape.
    it('keeps every counter button inside the scroller', () => {
        const r = mountVillage();
        const scroll = within(r.getByTestId('village-scroll'));

        expect(scroll.getByTestId('village-open-rest')).toBeTruthy();
        expect(scroll.getByTestId('village-open-shop')).toBeTruthy();
        expect(scroll.getByTestId('village-anvil')).toBeTruthy();
    });

    it('pins the way back on each counter screen below its one scroller, wares inside it', () => {
        const rest = render(
            <GameStoreProvider store={villageStore()}>
                <VillageRestScreen />
            </GameStoreProvider>,
        );
        expect(rest.UNSAFE_getAllByType(ScrollView)).toHaveLength(1);
        expect(within(rest.getByTestId('village-rest-screen-scroll')).getByTestId('village-rest-effect')).toBeTruthy();
        expect(within(rest.getByTestId('village-rest-screen-scroll')).queryByTestId('village-rest-screen-back')).toBeNull();
        expect(rest.getByTestId('village-rest-screen-back')).toBeTruthy();
        rest.unmount();

        const shop = render(
            <GameStoreProvider store={villageStore()}>
                <VillageShopScreen />
            </GameStoreProvider>,
        );
        expect(shop.UNSAFE_getAllByType(ScrollView)).toHaveLength(1);
        const scroll = within(shop.getByTestId('village-shop-scroll'));
        for (const id of CARDS) expect(scroll.getByTestId(`village-card-${id}-buy`)).toBeTruthy();
        expect(scroll.getByTestId('village-remove')).toBeTruthy();
        expect(scroll.queryByTestId('village-shop-back')).toBeNull();
        expect(shop.getByTestId('village-shop-back')).toBeTruthy();
    });
});
