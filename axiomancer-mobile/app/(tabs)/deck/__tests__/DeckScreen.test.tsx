/**
 * DECK — the fifth tab, rendered as a reader.
 *
 * The presenter is pinned separately in
 * `state/presenters/__tests__/deck.engine.test.ts`. What this file pins:
 *
 *   · no header block, no stat row, no rarity or colour tally;
 *   · one card is open at the top, its name and both play lines on screen;
 *   · tapping a row opens that card above;
 *   · the empty run says so instead of rendering a bare screen.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { getCardById } from '@mechanics';

import DeckScreen from '@/app/(tabs)/deck/index';
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
        fireEvent.press(screen.getByTestId(`deck-card-${WARD}`));

        expect(screen.getByTestId('deck-open-card-name').props.children).toBe(getCardById(WARD)!.name);
    });

    it('shows no flavour and no keyword ledger', () => {
        mount([BLOW, WORD]);

        expect(screen.queryByTestId('deck-card-detail')).toBeNull();
        expect(screen.queryByTestId('deck-card-detail-flavor')).toBeNull();
        expect(screen.queryByTestId('card-keyword-ledger')).toBeNull();
    });
});

describe('DeckScreen: the list', () => {
    it('lists a real row per card in the run deck', () => {
        mount([BLOW, BLOW, WARD, WORD]);

        expect(screen.getByTestId(`deck-card-${BLOW}`)).toBeTruthy();
        expect(screen.getByTestId(`deck-card-${WARD}`)).toBeTruthy();
        expect(screen.getByTestId(`deck-card-${WORD}`)).toBeTruthy();
    });

    it('marks the copy count only where there is more than one copy', () => {
        mount([BLOW, BLOW, WARD]);

        expect(screen.getByTestId(`deck-card-count-${BLOW}`)).toBeTruthy();
        expect(screen.queryByTestId(`deck-card-count-${WARD}`)).toBeNull();
    });

    it('sections the list by card type', () => {
        mount([BLOW, WORD]);

        expect(screen.getByTestId('deck-group-attack')).toBeTruthy();
        expect(screen.getByTestId('deck-group-spell')).toBeTruthy();
        expect(screen.queryByTestId('deck-group-skill')).toBeNull();
    });
});

describe('DeckScreen: empty run', () => {
    it('says the deck is not dealt yet instead of rendering a bare screen', () => {
        mount([]);

        expect(screen.getByTestId('deck-empty')).toBeTruthy();
        expect(screen.queryByTestId('deck-stats')).toBeNull();
    });
});
