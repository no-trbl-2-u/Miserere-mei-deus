/**
 * DECK — the fifth tab, rendered.
 *
 * The presenter is pinned separately in
 * `state/presenters/__tests__/deck.engine.test.ts`. What this file pins is the
 * screen contract the owner actually asked for:
 *
 *   · the tab renders on a fresh run and lists REAL cards, not placeholders;
 *   · tapping a card opens a detail;
 *   · that detail SHOWS FLAVOR — the prose finding 6 removed from the combat
 *     overlay has somewhere to live, which is the whole justification for
 *     deleting it there;
 *   · keyword definitions come FIRST in the detail (finding 5);
 *   · the empty run says so instead of rendering a bare screen.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { getCardById } from '@mechanics';

import DeckScreen from '@/app/(tabs)/deck/index';
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

describe('DeckScreen: the list', () => {
    it('lists a real row per card in the run deck', () => {
        mount([BLOW, BLOW, WARD, WORD]);

        expect(screen.getByTestId(`deck-card-${BLOW}`)).toBeTruthy();
        expect(screen.getByTestId(`deck-card-${WARD}`)).toBeTruthy();
        expect(screen.getByTestId(`deck-card-${WORD}`)).toBeTruthy();
        // The row prints the card's OWN name, off the engine projection.
        expect(screen.getAllByText(getCardById(BLOW)!.name).length).toBeGreaterThan(0);
    });

    it('marks the copy count only where there is more than one copy', () => {
        mount([BLOW, BLOW, WARD]);

        expect(screen.getByTestId(`deck-card-count-${BLOW}`)).toBeTruthy();
        expect(screen.queryByTestId(`deck-card-count-${WARD}`)).toBeNull();
    });

    it('sections the list by card type', () => {
        mount([BLOW, WORD]);

        // A Plain Blow is an attack, A Plain Word a spell; a type the deck
        // lacks (skill) gets no section.
        expect(screen.getByTestId('deck-group-attack')).toBeTruthy();
        expect(screen.getByTestId('deck-group-spell')).toBeTruthy();
        expect(screen.queryByTestId('deck-group-skill')).toBeNull();
    });

    it('renders the headline tallies and the rarity distribution', () => {
        mount([BLOW, WARD, WORD]);

        expect(screen.getByTestId('deck-stats')).toBeTruthy();
        expect(screen.getByTestId('deck-rarity-common')).toBeTruthy();
    });
});

describe('DeckScreen: the detail is flavor\'s new home', () => {
    it('opens a detail when a card is tapped', () => {
        mount([BLOW, WARD]);
        expect(screen.queryByTestId('deck-card-detail')).toBeNull();

        fireEvent.press(screen.getByTestId(`deck-card-${BLOW}`));

        expect(screen.getByTestId('deck-card-detail')).toBeTruthy();
    });

    it('shows the card\'s authored flavor prose, verbatim', () => {
        mount([BLOW]);
        fireEvent.press(screen.getByTestId(`deck-card-${BLOW}`));

        const flavor = screen.getByTestId('deck-card-detail-flavor');
        expect(flavor.props.children).toBe(getCardById(BLOW)!.description);
    });

    it('prints the kept ◇ NO DIE shorthand (D3 keeps the notation)', () => {
        mount([BLOW]);
        fireEvent.press(screen.getByTestId(`deck-card-${BLOW}`));

        expect(screen.getByTestId('deck-card-detail-free')).toBeTruthy();
    });

    it('puts keyword definitions ABOVE the card (finding 5)', () => {
        // A player who does not know what the keyword means cannot read the
        // line that uses it, so the glossary cannot sit underneath it. Asserted
        // on render ORDER, not on presence, because presence alone passed
        // before finding 5 was ever filed.
        mount([WORD]);
        fireEvent.press(screen.getByTestId(`deck-card-${WORD}`));

        const detail = screen.getByTestId('deck-card-detail');
        const order = collectTestIDs(detail);
        const keywords = order.indexOf('deck-card-detail-keywords');
        const free = order.indexOf('deck-card-detail-free');
        const flavor = order.indexOf('deck-card-detail-flavor');

        const cardAt = order.indexOf('deck-card-detail-card');

        expect(keywords).toBeGreaterThanOrEqual(0);
        // The shared ledger sits ahead of the card and outside its frame.
        expect(cardAt).toBeGreaterThan(keywords);
        expect(order.slice(cardAt + 1)).not.toContain('deck-card-detail-keywords');
        expect(free).toBeGreaterThan(keywords);
        // And flavour sits last — it is the reward for reading, not the lede.
        expect(flavor).toBeGreaterThan(free);
    });

    it('closes again', () => {
        mount([BLOW]);
        fireEvent.press(screen.getByTestId(`deck-card-${BLOW}`));
        fireEvent.press(screen.getByTestId('deck-card-detail-close'));

        expect(screen.queryByTestId('deck-card-detail')).toBeNull();
    });
});

describe('DeckScreen: empty run', () => {
    it('says the deck is not dealt yet instead of rendering a bare screen', () => {
        mount([]);

        expect(screen.getByTestId('deck-empty')).toBeTruthy();
        expect(screen.queryByTestId('deck-stats')).toBeNull();
    });
});

/** Depth-first `testID`s under a node, in render order. */
function collectTestIDs(node: { props?: Record<string, unknown>; children?: unknown[] }): string[] {
    const out: string[] = [];
    const walk = (n: unknown): void => {
        if (n === null || typeof n !== 'object') return;
        const el = n as { props?: Record<string, unknown>; children?: unknown[] };
        const id = el.props?.testID;
        if (typeof id === 'string') out.push(id);
        for (const child of el.children ?? []) walk(child);
    };
    walk(node);
    return out;
}
