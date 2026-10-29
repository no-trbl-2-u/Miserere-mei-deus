/**
 * Hermetic tests: a stall prices in SHILLINGS, as the purse does (critique
 * pass 84).
 *
 * The purse read "240 SHILLINGS" and the rest screen priced THE CUT at
 * "5 SHILLINGS", but each stall row printed "12s". The bare "s" was the one
 * place the currency was abbreviated, met before any key to it.
 *
 * Contract asserted here: every village counter (NK1c: the rest, the card
 * shop's cards and card removal; the item stalls are gone) prints its price
 * with the same unit word the purse header uses.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import VillageScreen from '@/app/village/index';
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

/** A village with all its counters, and a hurt player with a full purse. */
function villageStore(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const state = store.getState();
    store.setState({
        player: {
            ...state.player,
            currency: 240,
            health: 10,
        } as never,
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

function flatText(children: unknown): string {
    return Array.isArray(children) ? children.join('') : String(children);
}

describe('stall prices name the currency (critique pass 84)', () => {
    it('the purse and every counter say SHILLINGS', () => {
        const r = render(
            <GameStoreProvider store={villageStore()}>
                <VillageScreen />
            </GameStoreProvider>,
        );

        expect(flatText(r.getByTestId('village-purse').props.children)).toMatch(/^240 SHILLINGS/);
        expect(flatText(r.getByTestId('village-rest-price').props.children)).toBe('6 SHILLINGS');
        expect(flatText(r.getByTestId('village-card-grey-ward-price').props.children)).toBe('BUY · 6 SHILLINGS');
        expect(flatText(r.getByTestId('village-remove-price').props.children)).toBe('5 SHILLINGS');
    });
});
