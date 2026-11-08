/**
 * DECK — the fifth tab, rendered as a reader (DR1a).
 *
 * The presenter is pinned separately in
 * `state/presenters/__tests__/deck.engine.test.ts`. What this file pins:
 *
 *   · no header block, no stat row, no rarity or colour tally;
 *   · one card is open at the top, its name and both play lines on screen;
 *   · tapping a thumbnail opens that card above;
 *   · the empty run says so instead of rendering a bare screen.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { getCardById } from '@mechanics';

import DeckScreen from '@/app/(tabs)/deck/index';
import { OPEN_CARD_HEIGHT } from '@/components/deck/DeckOpenCard';
import { FREE_LINE_LABEL } from '@/state/presenters/deck.engine';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { withAllProviders } from '@/test-utils/withAllProviders';

// The grey office is the whole library.
const BLOW = 'grey-strike';
const WARD = 'grey-ward';
const WORD = 'grey-word';

function seed(store: AppStore, knownCards: readonly string[]): void {
    const player = store.getState().player;
    store.setState({
        player: { ...player, knownCards: [...knownCards], combatRewardCards: [] },
    } as never);
}

function mount(knownCards: readonly string[]) {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    seed(store, knownCards);
    const { tree } = withAllProviders(<DeckScreen />, { store });
    return { store, ...render(tree) };
}

describe('DeckScreen: the reader', () => {
    it('has no header, stat row or tallies', () => {
        mount([BLOW, WARD, WORD]);

        expect(screen.queryByTestId('deck-stats')).toBeNull();
        expect(screen.queryByTestId('deck-rarity-common')).toBeNull();
        expect(screen.queryByTestId('deck-stance-any')).toBeNull();
        expect(screen.queryByText('THE DECK YOU CARRY')).toBeNull();
    });

    it('opens the first card, its name and both play lines on screen', () => {
        mount([BLOW, WARD]);

        const open = screen.getByTestId('deck-open-card');
        expect(open).toBeTruthy();
        expect(screen.getByTestId('deck-open-card-name').props.children).toBe(getCardById(BLOW)!.name);
        expect(screen.getByText(FREE_LINE_LABEL)).toBeTruthy();
        expect(screen.getByTestId('deck-open-card-art')).toBeTruthy();
    });

    it('opens another card above when its row is tapped', () => {
        mount([BLOW, WARD]);
        fireEvent.press(screen.getByTestId('deck-tab-skill'));
        fireEvent.press(screen.getByTestId(`deck-card-${WARD}`));

        expect(screen.getByTestId('deck-open-card-name').props.children).toBe(getCardById(WARD)!.name);
    });

    it('dims every thumbnail but the open one, and moves the full light on a tap', () => {
        mount([BLOW, WARD]);
        const opacity = (id: string) =>
            StyleSheet.flatten(screen.getByTestId(`deck-card-${id}`).props.style).opacity;
        expect(opacity(BLOW)).toBe(1);
        fireEvent.press(screen.getByTestId('deck-tab-skill'));
        expect(opacity(WARD)).toBeLessThan(1);
        fireEvent.press(screen.getByTestId(`deck-card-${WARD}`));
        expect(opacity(WARD)).toBe(1);
        fireEvent.press(screen.getByTestId('deck-tab-attack'));
        expect(opacity(BLOW)).toBeLessThan(1);
    });

    it('shows no flavour and no keyword ledger', () => {
        mount([BLOW, WORD]);

        expect(screen.queryByTestId('deck-card-detail')).toBeNull();
        expect(screen.queryByTestId('deck-card-detail-flavor')).toBeNull();
        expect(screen.queryByTestId('card-keyword-ledger')).toBeNull();
    });

    it('draws a printed keyword as a pressable word in the open card, not in a ledger', () => {
        mount([BLOW, WARD]);
        fireEvent.press(screen.getByTestId('deck-tab-skill'));
        fireEvent.press(screen.getByTestId(`deck-card-${WARD}`));

        // The free and the paid line both press the same word.
        const guards = screen.getAllByTestId('deck-keyword-Guard');
        expect(guards.length).toBe(2);
        expect(guards[0].props.accessibilityLabel).toBe('GUARD');
        expect(screen.queryByTestId('card-keyword-ledger')).toBeNull();
    });
});

describe('DeckScreen: the list', () => {
    it('lists a thumbnail per card in the run deck', () => {
        mount([BLOW, BLOW, WARD, WORD]);

        expect(screen.getByTestId(`deck-card-${BLOW}`)).toBeTruthy();
        fireEvent.press(screen.getByTestId('deck-tab-skill'));
        expect(screen.getByTestId(`deck-card-${WARD}`)).toBeTruthy();
        fireEvent.press(screen.getByTestId('deck-tab-spell'));
        expect(screen.getByTestId(`deck-card-${WORD}`)).toBeTruthy();
    });

    it('marks the copy count only where there is more than one copy', () => {
        mount([BLOW, BLOW, WARD]);

        expect(screen.getByTestId(`deck-card-count-${BLOW}`)).toBeTruthy();
        expect(screen.queryByTestId(`deck-card-count-${WARD}`)).toBeNull();
    });

    it('shows only the active type grid', () => {
        mount([BLOW, WORD]);

        expect(screen.getByTestId('deck-group-attack')).toBeTruthy();
        expect(screen.queryByTestId('deck-group-spell')).toBeNull();
        expect(screen.queryByTestId('deck-group-skill')).toBeNull();
    });
});

describe('DeckScreen: type tabs', () => {
    it('has one tab per type the deck holds, no counts, the first selected', () => {
        mount([BLOW, BLOW, WARD, WORD]);

        for (const key of ['attack', 'skill', 'spell']) {
            expect(screen.getByTestId(`deck-tab-${key}`)).toBeTruthy();
        }
        expect(screen.queryByTestId('deck-tab-global')).toBeNull();
        expect(screen.getByTestId('deck-tab-attack').props.accessibilityState.selected).toBe(true);
        expect(screen.getByTestId('deck-tab-spell').props.accessibilityState.selected).toBe(false);
        expect(screen.getByTestId('deck-tab-attack').props.accessibilityLabel).toBeTruthy();
        expect(within(screen.getByTestId('deck-tab-attack')).queryByText(/\d/)).toBeNull();
    });

    it('swaps the grid when a tab is pressed', () => {
        mount([BLOW, WARD, WORD]);
        expect(screen.getByTestId(`deck-card-${BLOW}`)).toBeTruthy();
        expect(screen.queryByTestId(`deck-card-${WORD}`)).toBeNull();

        fireEvent.press(screen.getByTestId('deck-tab-spell'));
        expect(screen.getByTestId(`deck-card-${WORD}`)).toBeTruthy();
        expect(screen.queryByTestId(`deck-card-${BLOW}`)).toBeNull();
        expect(screen.getByTestId('deck-tab-spell').props.accessibilityState.selected).toBe(true);
    });

    it('leaves the tab where it is when a card opens', () => {
        mount([BLOW, WARD, WORD]);
        fireEvent.press(screen.getByTestId('deck-tab-spell'));
        fireEvent.press(screen.getByTestId(`deck-card-${WORD}`));

        expect(screen.getByTestId('deck-open-card-name').props.children).toBe(getCardById(WORD)!.name);
        expect(screen.getByTestId('deck-tab-spell').props.accessibilityState.selected).toBe(true);
        expect(screen.getByTestId(`deck-group-spell`)).toBeTruthy();
    });

    it('pins the tab row offset across two different open cards', () => {
        mount([BLOW, WARD, WORD]);
        // The tab row sits at the open block's height plus its margin; both are
        // fixed, so the row's offset is the same whichever card is open.
        const offset = () => {
            const style = StyleSheet.flatten(screen.getByTestId('deck-open-card').props.style);
            return (style.height as number) + (style.marginBottom as number);
        };
        const first = offset();
        expect(first).toBe(OPEN_CARD_HEIGHT + 14);
        fireEvent.press(screen.getByTestId('deck-tab-skill'));
        fireEvent.press(screen.getByTestId(`deck-card-${WARD}`));
        expect(offset()).toBe(first);
        fireEvent.press(screen.getByTestId('deck-tab-spell'));
        fireEvent.press(screen.getByTestId(`deck-card-${WORD}`));
        expect(offset()).toBe(first);
    });
});

describe('DeckScreen: empty run', () => {
    it('says the deck is not dealt yet instead of rendering a bare screen', () => {
        mount([]);

        expect(screen.getByTestId('deck-empty')).toBeTruthy();
        expect(screen.queryByTestId('deck-stats')).toBeNull();
    });
});
