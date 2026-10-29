/**
 * Hermetic screen test, NK1c: the village's paid rest and card shop.
 *
 * Drives the real `/village` screen over a real store and the real action
 * layer: the rest heals 25% of max VITAE for 6 shillings once per visit and is
 * shown refused (not hidden) when the purse is short (A8); a card shop card
 * costs 6 and joins the deck, sold for the rest of the visit (A9); removal
 * opens the deck, takes the removal price and thins the deck by one (A10); the
 * village shows no item stall and no SELL tab (A11). The village event stays
 * pending through every counter, so the hub never closes under the player.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { buildCombatDeck, STARTING_CARD_IDS, type GameState } from '@mechanics';
import VillageScreen from '@/app/village/index';
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

const CARDS = ['grey-strike', 'grey-ward', 'grey-word'];

/** A hurt player standing in a village with every counter. */
function makeStore(currency: number): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const { player } = store.getState() as unknown as GameState;
    store.setState({
        player: {
            ...player,
            currency,
            health: 20,
            maxHealth: 100,
            cardRemovals: 0,
            knownCards: [...STARTING_CARD_IDS],
            combatRewardCards: ['grey-ward'],
        },
        flags: [],
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: {
                state: undefined as never,
                event: {
                    kind: 'village',
                    villageName: 'The Fishing Hamlet',
                    merchants: [],
                    rest: { price: 6 },
                    cardShop: { cardIds: CARDS, price: 6 },
                    anvil: {},
                },
            },
        },
    } as never);
    return store;
}

function renderVillage(store: AppStore) {
    return render(
        <GameStoreProvider store={store}>
            <VillageScreen />
        </GameStoreProvider>,
    );
}

const playerOf = (store: AppStore) => (store.getState() as unknown as GameState).player;
const deckOf = (store: AppStore) => buildCombatDeck(playerOf(store), (store.getState() as unknown as GameState).flags);

describe('the village paid rest (NK1c A8)', () => {
    it('heals 25% of max VITAE for 6 shillings, once per visit', () => {
        const store = makeStore(20);
        renderVillage(store);
        fireEvent.press(screen.getByTestId('village-rest'));
        expect(playerOf(store).health).toBe(45);
        expect(playerOf(store).currency).toBe(14);
        expect(store.getState().event.pending?.event.kind).toBe('village');
        expect(screen.getByTestId('village-rest-refusal').props.children).toBe('you have rested here this visit');
        fireEvent.press(screen.getByTestId('village-rest'));
        expect(playerOf(store).health).toBe(45);
    });

    it('is shown, refused, when the purse is short', () => {
        const store = makeStore(4);
        renderVillage(store);
        expect(screen.getByTestId('village-rest')).toBeTruthy();
        expect(screen.getByTestId('village-rest').props.accessibilityState).toEqual({ disabled: true });
        expect(screen.getByTestId('village-rest-refusal').props.children).toBe("you can't cover the 6 it costs");
    });
});

describe('the village card shop (NK1c A9, A10, A11)', () => {
    it('sells one of three cards for 6; it joins the deck and is sold for the visit', () => {
        const store = makeStore(20);
        renderVillage(store);
        for (const id of CARDS) expect(screen.getByTestId(`village-card-${id}`)).toBeTruthy();
        const before = deckOf(store).length;
        fireEvent.press(screen.getByTestId('village-card-grey-word-buy'));
        expect(playerOf(store).currency).toBe(14);
        expect(deckOf(store)).toHaveLength(before + 1);
        expect(screen.getByTestId('village-card-grey-word-price').props.children).toBe('SOLD');
        fireEvent.press(screen.getByTestId('village-card-grey-word-buy'));
        expect(deckOf(store)).toHaveLength(before + 1);
    });

    it('removes a chosen card for the removal price', () => {
        const store = makeStore(20);
        renderVillage(store);
        const before = deckOf(store).length;
        fireEvent.press(screen.getByTestId('village-remove'));
        expect(screen.getByTestId('village-remove-sheet')).toBeTruthy();
        fireEvent.press(screen.getByTestId('village-remove-card-grey-ward'));
        expect(deckOf(store)).toHaveLength(before - 1);
        expect(playerOf(store).currency).toBe(15);
        expect(playerOf(store).cardRemovals).toBe(1);
        expect(screen.queryByTestId('village-remove-sheet')).toBeNull();
        expect(screen.getByTestId('village-remove-price').props.children).toEqual([10, ' SHILLINGS']);
    });

    it('shows no item stall and no SELL tab', () => {
        renderVillage(makeStore(20));
        expect(screen.queryByTestId('village-tab-sell')).toBeNull();
        expect(screen.queryByTestId('village-tab-buy')).toBeNull();
        expect(screen.queryByText('THE STALLS')).toBeNull();
    });
});
