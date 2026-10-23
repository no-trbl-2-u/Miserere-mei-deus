/**
 * Hermetic screen test — the rest site's "upgrade a card" (Phase UP1d, A6, A7).
 *
 * Drives the real rest screen on a real store: the player reaches a rest
 * site, picks UPGRADE A CARD, taps a card on the shared upgrade screen, sees
 * the card as it is beside the card after the upgrade and the locked "???"
 * slot, confirms, and moves on. The deck then holds `<id>+` in place of one
 * copy, the other copies stay, and the night healed nothing.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { buildCombatDeck, cardLibrary, getCardById, upgradeLimit } from '@mechanics';

import RestScreen from '@/app/rest/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { beginRestAction } from '@/state/rest/store-actions';
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

/** The library's rare (three upgrades), found by its limit rather than named. */
const RARE = cardLibrary.find((c) => upgradeLimit(c) === 3)!.id;

const KNOWN = [
    'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike',
    'grey-ward', 'grey-ward', 'grey-ward', 'grey-word', 'grey-word',
];

/** A store at a camp with the grey starting deck, the rare as a reward, and a wound. */
function restStore(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const { player } = store.getState();
    store.setState({
        player: {
            ...player,
            maxHealth: 160,
            health: 90,
            currency: 40,
            knownCards: [...KNOWN],
            combatRewardCards: [RARE],
        },
        flags: [],
    } as never);
    expect(beginRestAction(store, { seed: 7, shelter: 'camp' })).toBe(true);
    return store;
}

function count(ids: readonly string[], id: string): number {
    return ids.filter((x) => x === id).length;
}

describe('rest site: upgrade a card (Phase UP1d)', () => {
    it('offers the upgrade beside rest and cut', () => {
        const r = render(
            <GameStoreProvider store={restStore()}>
                <RestScreen />
            </GameStoreProvider>,
        );
        expect(r.getByTestId('rest-choice-offer-rest')).toBeTruthy();
        expect(r.getByTestId('rest-choice-offer-upgrade')).toBeTruthy();
        expect(r.getByTestId('rest-choice-offer-cut')).toBeTruthy();
    });

    it('previews the upgrade with a locked ??? slot, and the deck then holds <id>+', () => {
        const store = restStore();
        const r = render(
            <GameStoreProvider store={store}>
                <RestScreen />
            </GameStoreProvider>,
        );

        fireEvent.press(r.getByTestId('rest-choice-offer-upgrade'));
        expect(r.getByTestId('card-upgrade-sheet')).toBeTruthy();
        // Each distinct card once, and only the ones that can take an upgrade.
        expect(r.getByTestId('card-upgrade-row-grey-strike')).toBeTruthy();
        expect(r.getByTestId(`card-upgrade-row-${RARE}`)).toBeTruthy();
        expect(r.queryByTestId('card-upgrade-preview')).toBeNull();
        expect(r.queryByTestId('card-upgrade-confirm')).toBeNull();

        fireEvent.press(r.getByTestId('card-upgrade-row-grey-strike'));
        const before = getCardById('grey-strike')!;
        const after = getCardById('grey-strike+')!;
        expect(r.getByTestId('card-upgrade-now-name')).toHaveTextContent(before.name);
        expect(r.getByTestId('card-upgrade-after-name')).toHaveTextContent(after.name);
        // The AFTER face prints different numbers from the NOW face.
        const nowText = r.getByTestId('card-upgrade-now-free').props.children;
        const afterText = r.getByTestId('card-upgrade-after-free').props.children;
        expect(afterText).not.toEqual(nowText);
        expect(r.getByTestId('card-upgrade-locked')).toHaveTextContent(/\?\?\?/);

        fireEvent.press(r.getByTestId('card-upgrade-confirm'));
        expect(String(r.getByTestId('rest-outcome-upgraded').props.children)).toContain(after.name);

        fireEvent.press(r.getByTestId('rest-claim'));
        const { player, flags } = store.getState() as unknown as {
            player: { health: number; currency: number; knownCards: string[]; combatRewardCards?: string[] };
            flags: string[];
        };
        const deck = buildCombatDeck(player as never, flags);
        expect(count(deck, 'grey-strike+')).toBe(1);
        expect(count(deck, 'grey-strike')).toBe(4);
        expect(deck).toHaveLength(KNOWN.length + 1);
        expect(player.health).toBe(90);
        expect(player.currency).toBe(40);
        expect(store.getState().rest.session).toBeNull();
    });
});
