/**
 * Hermetic screen test — the rest site's "upgrade a card" (Phase UP1d, A6, A7).
 *
 * Drives the real rest screen on a real store: the player reaches a rest
 * site, picks UPGRADE A CARD, turns the shared upgrade screen's wheel to a
 * card (the string of beads, UP1i), sees the card as it is beside the card
 * after the upgrade, holds HOLD until the ring closes, and moves on. The deck then holds `<id>+` in place of one
 * copy, the other copies stay, and the night healed nothing.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, within } from '@testing-library/react-native';
import React from 'react';

import { buildCombatDeck, cardLibrary, getCardById, upgradeLimit } from '@mechanics';

import RestScreen from '@/app/rest/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { beginRestAction } from '@/state/rest/store-actions';
import { createAppStore, type AppStore } from '@/state/store';
import { bringToCentre, centreBeadLabel, holdToUpgrade, isOnWheel } from '@/test-utils/cardUpgrade';
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

// The night between the pick and the dawn is ET1c's; its own suite plays it.
beforeAll(() => { (globalThis as { __AXM_JUICE_INSTANT__?: unknown }).__AXM_JUICE_INSTANT__ = true; });
afterAll(() => { delete (globalThis as { __AXM_JUICE_INSTANT__?: unknown }).__AXM_JUICE_INSTANT__; });

describe('rest site: upgrade a card (Phase UP1d)', () => {
    it('offers the upgrade beside rest, and no cut (removal is at the village, NK1c)', () => {
        const r = render(
            <GameStoreProvider store={restStore()}>
                <RestScreen />
            </GameStoreProvider>,
        );
        expect(r.getByTestId('rest-choice-offer-rest')).toBeTruthy();
        expect(r.getByTestId('rest-choice-offer-upgrade')).toBeTruthy();
        expect(r.queryByTestId('rest-choice-offer-cut')).toBeNull();
    });

    it('previews the upgrade on the centre bead, a full hold commits it, and the deck then holds <id>+', () => {
        jest.useFakeTimers();
        const store = restStore();
        const r = render(
            <GameStoreProvider store={store}>
                <RestScreen />
            </GameStoreProvider>,
        );

        fireEvent.press(r.getByTestId('rest-choice-offer-upgrade'));
        expect(r.getByTestId('card-upgrade-sheet')).toBeTruthy();
        const before = getCardById('grey-strike')!;
        const after = getCardById('grey-strike+')!;
        // Each distinct card once, and only the ones that can take an upgrade.
        expect(isOnWheel('grey-strike', before.name, r)).toBe(true);
        expect(isOnWheel(RARE, getCardById(RARE)!.name, r)).toBe(true);
        expect(isOnWheel('grey-strike+', after.name, r)).toBe(false);

        bringToCentre('grey-strike', r);
        expect(centreBeadLabel(r).startsWith(before.name)).toBe(true);
        expect(within(r.getByTestId('card-upgrade-now')).getByTestId('combat-card-face-name')).toHaveTextContent(before.name);
        expect(within(r.getByTestId('card-upgrade-after')).getByTestId('combat-card-face-name')).toHaveTextContent(after.name);
        // The new face prints different numbers, and the change line names them.
        const nowLine = within(r.getByTestId('card-upgrade-now')).getByTestId('combat-card-face-paid-line').props.accessibilityLabel;
        const afterLine = within(r.getByTestId('card-upgrade-after')).getByTestId('combat-card-face-paid-line').props.accessibilityLabel;
        expect(afterLine).not.toEqual(nowLine);
        expect(r.getByTestId('card-upgrade-change')).toHaveTextContent(/→/);

        holdToUpgrade(r);
        jest.useRealTimers();
        expect(String(r.getByTestId('rest-outcome-upgraded').props.children)).toBe(`${before.name} upgraded`);

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
