/**
 * Hermetic screen test, 168.3 (VL1c): the village hub and the paid rest's own
 * screen.
 *
 * Drives the real `/village` hub, `/village/rest` and `/village/shop` screens
 * over a real store and the real action layer, with the router stubbed so each
 * navigation is observed:
 *  - A1: the hub shows the name, the purse, the host's portrait and line, and
 *    one brass button per counter the village carries with that keeper at its
 *    right end; a counter the village lacks has no button; TAKE THE ROAD is
 *    pinned outside the scroller.
 *  - A2: each button opens its counter's screen; leaving a counter returns to
 *    the hub; TAKE THE ROAD ends the village.
 *  - A5: the paid rest is its own keeper screen with the innkeeper, the price
 *    and what it restores; it is refused when VITAE is full, naming the reason.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import React from 'react';

import { STARTING_CARD_IDS, type GameState } from '@mechanics';
import VillageScreen from '@/app/village/index';
import VillageRestScreen from '@/app/village/rest';
import VillageShopScreen from '@/app/village/shop';
import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { KEEPER_LABEL_INSET, KEEPER_RIGHT, KEEPER_W } from '@/components/village/KeeperButton';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { selectHasActiveBlacksmith } from '@/state/presenters/blacksmith.engine';
import { VILLAGE_HOST_LINE } from '@/state/presenters/village.copy';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: mockReplace,
        push: mockPush,
        back: mockBack,
        canGoBack: () => mockCanGoBack,
    }),
}));

beforeEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
});

const CARDS = ['grey-strike', 'grey-ward', 'grey-word'];

interface Counters {
    rest?: boolean;
    cardShop?: boolean;
    anvil?: boolean;
}

/** A player standing in a village carrying the given counters. */
function makeStore(counters: Counters, health = 20, currency = 20): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const { player } = store.getState() as unknown as GameState;
    store.setState({
        player: {
            ...player,
            currency,
            health,
            maxHealth: 100,
            cardRemovals: 0,
            knownCards: [...STARTING_CARD_IDS],
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
                    ...(counters.rest ? { rest: { price: 6 } } : {}),
                    ...(counters.cardShop ? { cardShop: { cardIds: CARDS, price: 6 } } : {}),
                    ...(counters.anvil ? { anvil: {} } : {}),
                },
            },
        },
    } as never);
    return store;
}

const ALL: Counters = { rest: true, cardShop: true, anvil: true };

function mount(store: AppStore, Screen: React.ComponentType) {
    return render(
        <GameStoreProvider store={store}>
            <Screen />
        </GameStoreProvider>,
    );
}

const playerOf = (store: AppStore) => (store.getState() as unknown as GameState).player;

describe('the village hub (168 A1)', () => {
    it('shows the name, the purse, the host and one keeper button per counter', () => {
        mount(makeStore(ALL), VillageScreen);
        expect(screen.getByText('THE FISHING HAMLET')).toBeTruthy();
        expect(screen.getByTestId('village-purse').props.children).toBe('20 SHILLINGS · VITAE 20/100');
        expect(screen.getByTestId('village-host')).toBeTruthy();
        expect(screen.getByTestId('village-host-line').props.children).toEqual(['“', VILLAGE_HOST_LINE, '”']);
        const counters = within(screen.getByTestId('village-counters'));
        for (const id of ['village-open-rest', 'village-open-shop', 'village-anvil']) {
            expect(counters.getByTestId(id)).toBeTruthy();
            expect(counters.getByTestId(`${id}-keeper`)).toBeTruthy();
        }
    });

    it('draws each counter button, and the exit, on the brass action plate', () => {
        mount(makeStore(ALL), VillageScreen);
        for (const id of ['village-open-rest', 'village-open-shop', 'village-anvil', 'village-leave']) {
            const plate = within(screen.getByTestId(id)).UNSAFE_getByType(KitBackdrop);
            expect(plate.props.piece).toBe('action-button-idle');
        }
    });

    it('keeps each label clear of the keeper standing at its right end', () => {
        // The label's right inset, plus the plate's own 30 pt end padding,
        // covers the keeper's box from the plate's right edge.
        expect(KEEPER_LABEL_INSET + 30).toBeGreaterThanOrEqual(KEEPER_RIGHT + KEEPER_W);
    });

    it('has no button for a counter the village lacks', () => {
        mount(makeStore({ anvil: true }), VillageScreen);
        expect(screen.queryByTestId('village-open-rest')).toBeNull();
        expect(screen.queryByTestId('village-open-shop')).toBeNull();
        expect(screen.getByTestId('village-anvil')).toBeTruthy();
    });

    it('pins TAKE THE ROAD outside the scroller', () => {
        mount(makeStore(ALL), VillageScreen);
        expect(within(screen.getByTestId('village-scroll')).queryByTestId('village-leave')).toBeNull();
        expect(within(screen.getByTestId('village-exit-bar')).getByTestId('village-leave')).toBeTruthy();
    });
});

describe('hub navigation (168 A2)', () => {
    it('REST opens the paid rest, SHOP opens the Shop', () => {
        mount(makeStore(ALL), VillageScreen);
        fireEvent.press(screen.getByTestId('village-open-rest'));
        expect(mockPush).toHaveBeenLastCalledWith('/village/rest');
        fireEvent.press(screen.getByTestId('village-open-shop'));
        expect(mockPush).toHaveBeenLastCalledWith('/village/shop');
    });

    it('BLACKSMITH opens the Anvil, with the village still pending beneath it', () => {
        const store = makeStore(ALL);
        mount(store, VillageScreen);
        fireEvent.press(screen.getByTestId('village-anvil'));
        expect(selectHasActiveBlacksmith(store.getState())).toBe(true);
        expect(store.getState().event.pending?.event.kind).toBe('village');
    });

    it('leaving a counter screen returns to the hub', () => {
        for (const [Screen, back] of [
            [VillageRestScreen, 'village-rest-screen-back'],
            [VillageShopScreen, 'village-shop-back'],
        ] as const) {
            const store = makeStore(ALL);
            const r = mount(store, Screen);
            fireEvent.press(r.getByTestId(back));
            expect(mockBack).toHaveBeenCalledTimes(1);
            expect(store.getState().event.pending?.event.kind).toBe('village');
            mockBack.mockClear();
            r.unmount();
        }
    });

    it('a counter opened with nothing beneath it replaces itself with the hub', () => {
        mockCanGoBack = false;
        mount(makeStore(ALL), VillageShopScreen);
        fireEvent.press(screen.getByTestId('village-shop-back'));
        expect(mockReplace).toHaveBeenCalledWith('/village');
    });

    it('TAKE THE ROAD ends the village', () => {
        const store = makeStore(ALL);
        mount(store, VillageScreen);
        fireEvent.press(screen.getByTestId('village-leave'));
        expect(store.getState().event.pending).toBeNull();
    });

    it('the Shop keeps every ware the old page sold: the cards, BUY and REMOVE A CARD', () => {
        mount(makeStore(ALL), VillageShopScreen);
        for (const id of CARDS) expect(screen.getByTestId(`village-card-${id}-buy`)).toBeTruthy();
        expect(screen.getByTestId('village-remove')).toBeTruthy();
        expect(screen.getByTestId('village-shop-keeper')).toBeTruthy();
    });
});

describe('the paid rest, its own keeper screen (168 A5)', () => {
    it('shows the innkeeper, the price and what it restores, and pays', () => {
        const store = makeStore(ALL);
        mount(store, VillageRestScreen);
        expect(screen.getByTestId('village-rest-screen-keeper')).toBeTruthy();
        expect(screen.getByTestId('village-rest-price').props.children).toBe('6 SHILLINGS');
        expect(screen.getByTestId('village-rest-effect').props.children).toBe('restores 25 VITAE');
        fireEvent.press(screen.getByTestId('village-rest'));
        expect(playerOf(store).health).toBe(45);
        expect(playerOf(store).currency).toBe(14);
        expect(screen.getByTestId('village-note').props.children).toBe('Rested for 6 shillings.');
        expect(store.getState().event.pending?.event.kind).toBe('village');
    });

    it('is refused when VITAE is full, naming the reason, on the disabled plate', () => {
        const store = makeStore(ALL, 100);
        mount(store, VillageRestScreen);
        const rest = screen.getByTestId('village-rest');
        expect(rest.props.accessibilityState).toEqual({ disabled: true });
        expect(screen.getByTestId('village-rest-refusal').props.children).toBe('your VITAE is already full');
        expect(within(rest).UNSAFE_getByType(KitBackdrop).props.piece).toBe('action-button-disabled');
        fireEvent.press(rest);
        expect(playerOf(store).currency).toBe(20);
    });

    it('shows no offer for a village that lets no bed', () => {
        mount(makeStore({ cardShop: true }), VillageRestScreen);
        expect(screen.queryByTestId('village-rest')).toBeNull();
        expect(screen.getByTestId('village-rest-screen-back')).toBeTruthy();
    });
});
