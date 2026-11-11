/**
 * Hermetic screen test, VL1d (168 A3): the Shop, one card at a time.
 *
 * Drives the real `/village/shop` screen over a real store and the real action
 * layer: five cards step through one at a time with a "n of 5" counter (a tap
 * on a peeking neighbour moves, as a swipe does); a buy takes 6 and the card
 * reads SOLD; a short purse dims BUY and names its reason; a separate
 * CARDS / GEAR button switches to the weapons and armor, each side with its own
 * position, counter and BUY; a village with no gear shows no toggle; REMOVE A
 * CARD still thins the deck. A swipe is the same step as the peek tap: the
 * carousel's pan responder calls the same `onIndex`, covered in the browser
 * run by the PR's screenshots, not here (the test renderer sends no touches).
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import {
    EQUIPMENT_DROP_TUNING,
    STARTING_CARD_IDS,
    VILLAGE_TUNING,
    buildCombatDeck,
    createNewGameState,
    villageEquipmentShopFor,
    type GameState,
} from '@mechanics';
import VillageShopScreen from '@/app/village/shop';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => true,
    }),
}));

/** Five distinct cards, as the shop offers (`cardShopSize`). */
const FIVE = ['grey-strike', 'grey-ward', 'grey-word', 'bp-e-03d', 'bp-p-10c'];

function makeStore(currency: number, opts: { gear?: boolean } = {}): AppStore {
    const base = createNewGameState({ characterId: 'the-chosen' });
    const player = {
        ...base.player,
        currency,
        cardRemovals: 0,
        knownCards: [...STARTING_CARD_IDS],
        combatRewardCards: ['grey-ward'],
    };
    const store = createAppStore({ adapter: createMemoryAdapter() });
    store.setState({
        player,
        flags: [],
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: {
                state: undefined as never,
                event: {
                    kind: 'village',
                    villageName: 'The Fishing Hamlet',
                    merchants: [],
                    cardShop: { cardIds: FIVE, price: 6 },
                    ...(opts.gear ? { equipmentShop: villageEquipmentShopFor({ ...base, player }, 'bw-t4') } : {}),
                } as never,
            },
        },
    } as never);
    return store;
}

function renderShop(store: AppStore) {
    return render(
        <GameStoreProvider store={store}>
            <VillageShopScreen />
        </GameStoreProvider>,
    );
}

const playerOf = (store: AppStore) => (store.getState() as unknown as GameState).player;
const deckOf = (store: AppStore) => buildCombatDeck(playerOf(store), (store.getState() as unknown as GameState).flags);
const counter = () => screen.getByTestId('village-shop-counter').props.children;
const next = () => fireEvent.press(screen.getByTestId('village-shop-peek-next'));

describe('the Shop, one card at a time (168 A3)', () => {
    it('shows the offer is five, one card large in the middle with the counter', () => {
        expect(VILLAGE_TUNING.cardShopSize).toBe(FIVE.length);
        renderShop(makeStore(20));
        expect(counter()).toBe('1 of 5');
        expect(screen.getByTestId('village-card-grey-strike')).toBeTruthy();
        // Only the middle card carries a BUY plate and testID; its neighbour peeks.
        expect(screen.queryByTestId('village-card-grey-ward')).toBeNull();
        expect(screen.queryByTestId('village-shop-peek-prev')).toBeNull();
        expect(screen.getByTestId('village-shop-peek-next')).toBeTruthy();
    });

    it('steps through all five with the neighbours, forward and back', () => {
        renderShop(makeStore(20));
        FIVE.forEach((id, i) => {
            expect(counter()).toBe(`${i + 1} of 5`);
            expect(screen.getByTestId(`village-card-${id}`)).toBeTruthy();
            if (i < FIVE.length - 1) next();
        });
        expect(screen.queryByTestId('village-shop-peek-next')).toBeNull();
        fireEvent.press(screen.getByTestId('village-shop-peek-prev'));
        expect(counter()).toBe('4 of 5');
    });

    it('buys the card in the middle for 6 and reads SOLD', () => {
        const store = makeStore(20);
        renderShop(store);
        next();
        const before = deckOf(store).length;
        expect(screen.getByTestId('village-card-grey-ward-price').props.children).toBe('6 SHILLINGS');
        fireEvent.press(screen.getByTestId('village-card-grey-ward-buy'));
        expect(playerOf(store).currency).toBe(14);
        expect(deckOf(store)).toHaveLength(before + 1);
        expect(screen.getByText('SOLD')).toBeTruthy();
        expect(screen.getByTestId('village-card-grey-ward-buy')).toHaveProp('accessibilityState', { disabled: true });
        expect(counter()).toBe('2 of 5');
    });

    it('dims BUY and names the reason when the purse is short', () => {
        const store = makeStore(4);
        renderShop(store);
        expect(screen.getByTestId('village-card-grey-strike-buy')).toHaveProp('accessibilityState', { disabled: true });
        expect(screen.getByTestId('village-card-grey-strike-refusal').props.children).toBe("you can't cover the 6 it costs");
        fireEvent.press(screen.getByTestId('village-card-grey-strike-buy'));
        expect(playerOf(store).currency).toBe(4);
    });

    it('removes a card at the rising price, beside the shopkeeper', () => {
        const store = makeStore(20);
        renderShop(store);
        expect(screen.getByTestId('village-shop-keeper')).toContainElement(screen.getByTestId('village-remove'));
        const before = deckOf(store).length;
        fireEvent.press(screen.getByTestId('village-remove'));
        expect(screen.getByTestId('village-remove-sheet')).toBeTruthy();
        fireEvent.press(screen.getByTestId('village-remove-card-grey-ward'));
        expect(deckOf(store)).toHaveLength(before - 1);
        expect(playerOf(store).currency).toBe(15);
        expect(screen.getByTestId('village-remove-price').props.children).toEqual([10, ' SHILLINGS']);
    });
});

describe('the CARDS / GEAR toggle (168 A3, T call #1)', () => {
    it('switches to the gear, each side holding its own position, and buys a piece', () => {
        const store = makeStore(100, { gear: true });
        renderShop(store);
        next();
        next();
        expect(counter()).toBe('3 of 5');

        fireEvent.press(screen.getByTestId('village-shop-toggle'));
        expect(screen.queryByTestId('village-card-shop')).toBeNull();
        expect(screen.getByTestId('village-equipment-shop')).toBeTruthy();
        expect(screen.getByTestId('village-gear-counter').props.children).toBe(`1 of ${EQUIPMENT_DROP_TUNING.shopCount}`);
        fireEvent.press(screen.getByTestId('village-gear-peek-next'));
        expect(screen.getByTestId('village-gear-counter').props.children).toBe(`2 of ${EQUIPMENT_DROP_TUNING.shopCount}`);

        // Buy the piece in the middle; its panel's testID names it.
        const panel = screen.getByTestId(/^village-equipment-.+-panel$/);
        const pieceId = String(panel.props.testID).replace('village-equipment-', '').replace('-panel', '');
        fireEvent.press(screen.getByTestId(`village-equipment-${pieceId}`));
        expect(playerOf(store).currency).toBe(100 - EQUIPMENT_DROP_TUNING.shopPrice);
        expect(playerOf(store).inventory.some(item => item.id === pieceId)).toBe(true);
        expect(screen.getByText('SOLD')).toBeTruthy();

        fireEvent.press(screen.getByTestId('village-shop-toggle'));
        expect(counter()).toBe('3 of 5');
    });

    it('shows no toggle in a village with no gear', () => {
        renderShop(makeStore(100));
        expect(screen.queryByTestId('village-shop-toggle')).toBeNull();
        expect(screen.queryByTestId('village-equipment-shop')).toBeNull();
    });
});
