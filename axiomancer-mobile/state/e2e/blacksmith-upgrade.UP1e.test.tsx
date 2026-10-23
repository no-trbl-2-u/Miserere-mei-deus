/**
 * Hermetic screen test — the blacksmith's card upgrade (Phase UP1e, A8).
 *
 * Drives the real anvil screen on a real store: the player sets their dice
 * on the anvil, picks UPGRADE A CARD beside HONE, TEMPER and SWAP, taps a
 * card on the shared upgrade screen, confirms, and pays. The deck then holds
 * `<id>+` in place of one copy, the purse is 5 shillings lighter, and a
 * second upgrade in the same visit is refused. A purse short of 5, or a deck
 * with nothing left to upgrade, greys the offer and names why.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { ANVIL_VERB_PRICING, buildCombatDeck, getCardById } from '@mechanics';

import BlacksmithScreen from '@/app/blacksmith/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { beginBlacksmithAction } from '@/state/blacksmith/store-actions';
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

const KNOWN = [
    'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike',
    'grey-ward', 'grey-ward', 'grey-ward', 'grey-word', 'grey-word',
];

/** A store at the anvil with the grey starting deck and `currency` shillings. */
function anvilStore(currency: number, knownCards: readonly string[] = KNOWN): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const { player } = store.getState();
    store.setState({
        player: { ...player, currency, knownCards: [...knownCards], combatRewardCards: [] },
        flags: [],
    } as never);
    expect(beginBlacksmithAction(store, { seed: 7 })).toBe(true);
    return store;
}

function renderAnvil(store: AppStore) {
    const r = render(
        <GameStoreProvider store={store}>
            <BlacksmithScreen />
        </GameStoreProvider>,
    );
    fireEvent.press(r.getByTestId('blacksmith-begin'));
    return r;
}

function count(ids: readonly string[], id: string): number {
    return ids.filter((x) => x === id).length;
}

describe('blacksmith: upgrade a card (Phase UP1e)', () => {
    it('offers the card upgrade for 5 shillings beside HONE, TEMPER and SWAP', () => {
        const r = renderAnvil(anvilStore(40));
        expect(r.getByTestId('blacksmith-offer-hone:heart')).toBeTruthy();
        expect(r.getByTestId('blacksmith-offer-temper:heart')).toBeTruthy();
        expect(r.getByTestId('blacksmith-offer-upgrade')).toBeTruthy();
        expect(ANVIL_VERB_PRICING.upgrade).toBe(5);
        expect(r.getByTestId('blacksmith-offer-upgrade-price')).toHaveTextContent('5 SHILLINGS');
    });

    it('upgrades the picked card for 5 shillings, once a visit, and the deck holds <id>+', () => {
        const store = anvilStore(40);
        const r = renderAnvil(store);

        fireEvent.press(r.getByTestId('blacksmith-offer-upgrade'));
        expect(r.getByTestId('card-upgrade-sheet')).toBeTruthy();
        expect(r.getByTestId('card-upgrade-price')).toHaveTextContent(/5 shillings/);
        fireEvent.press(r.getByTestId('card-upgrade-row-grey-strike'));
        expect(r.getByTestId('card-upgrade-locked')).toHaveTextContent(/\?\?\?/);
        fireEvent.press(r.getByTestId('card-upgrade-confirm'));

        const after = getCardById('grey-strike+')!;
        expect(r.getByTestId('blacksmith-card-cost')).toHaveTextContent('−5 SHILLINGS');
        expect(String(r.getByTestId('blacksmith-card-upgraded').props.children)).toContain(after.name);
        fireEvent.press(r.getByTestId('blacksmith-continue'));

        // Once a visit: the offer is greyed and says why.
        expect(r.getByTestId('blacksmith-offer-upgrade-reason')).toHaveTextContent(/one card a visit/);

        fireEvent.press(r.getByTestId('blacksmith-leave'));
        fireEvent.press(r.getByTestId('blacksmith-claim'));

        const { player, flags } = store.getState() as unknown as {
            player: { currency: number; knownCards: string[]; combatRewardCards?: string[] };
            flags: string[];
        };
        const deck = buildCombatDeck(player as never, flags);
        expect(count(deck, 'grey-strike+')).toBe(1);
        expect(count(deck, 'grey-strike')).toBe(4);
        expect(deck).toHaveLength(KNOWN.length);
        expect(player.currency).toBe(35);
        expect(store.getState().blacksmith.session).toBeNull();
    });

    it('backing out of the picker charges nothing', () => {
        const store = anvilStore(40);
        const r = renderAnvil(store);
        fireEvent.press(r.getByTestId('blacksmith-offer-upgrade'));
        fireEvent.press(r.getByTestId('blacksmith-upgrade-back'));
        expect(r.getByTestId('blacksmith-budget')).toHaveTextContent('40 SHILLINGS');
        expect(r.getByTestId('blacksmith-offer-upgrade')).toBeTruthy();
    });

    it('is refused when the player cannot afford it', () => {
        const r = renderAnvil(anvilStore(4));
        expect(r.getByTestId('blacksmith-offer-upgrade').props.accessibilityState).toEqual({ disabled: true });
        expect(r.getByTestId('blacksmith-offer-upgrade-reason')).toHaveTextContent(/can't cover the 5/);
    });

    it('is refused when nothing can take another upgrade', () => {
        const r = renderAnvil(anvilStore(40, ['grey-strike+', 'grey-ward+', 'grey-word+']));
        expect(r.getByTestId('blacksmith-offer-upgrade').props.accessibilityState).toEqual({ disabled: true });
        expect(r.getByTestId('blacksmith-offer-upgrade-reason')).toHaveTextContent(/nothing you carry/);
    });
});
