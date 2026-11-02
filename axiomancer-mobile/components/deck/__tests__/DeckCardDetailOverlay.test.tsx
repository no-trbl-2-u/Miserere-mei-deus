/**
 * The opened card on the DECK screen carries no meta strip (T, 2026-11-01):
 * the grey `STANCE · RANK · RARITY · TYPE` line under the name is gone for every
 * card. The rarity mark stays, and the NO DIE / +DIE lines are untouched.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { cardLibrary, createNewGameState, type Character } from '@mechanics';
import { DeckCardDetailOverlay } from '@/components/deck/DeckCardDetailOverlay';
import { selectDeckViewModel, type DeckCardVM } from '@/state/presenters/deck.engine';
import { withAllProviders } from '@/test-utils/withAllProviders';

const GLOBAL_ID = cardLibrary.find((c) => c.program?.global)!.id;

function deckCard(cardId: string): DeckCardVM {
    const player = createNewGameState().player as Character;
    const state = { player: { ...player, knownCards: [cardId], combatRewardCards: [] }, flags: [] } as never;
    const found = selectDeckViewModel(state).groups.flatMap((g) => g.cards).find((c) => c.cardId === cardId);
    if (!found) throw new Error(`${cardId} not in the deck view`);
    return found;
}

describe('DeckCardDetailOverlay: no meta strip', () => {
    for (const [label, id] of [['a plain card', 'grey-strike'], ['a Global', GLOBAL_ID]] as const) {
        it(`${label} shows its name, rarity and both lines but not the meta strip`, () => {
            const card = deckCard(id);
            expect(card.metaChip.length).toBeGreaterThan(0);
            const { unmount } = render(withAllProviders(<DeckCardDetailOverlay card={card} onClose={() => {}} />).tree);
            expect(screen.queryByText(card.metaChip)).toBeNull();
            expect(screen.getByText(card.name)).toBeTruthy();
            expect(screen.getByTestId('deck-card-detail-rarity')).toBeTruthy();
            expect(screen.getByTestId('deck-card-detail-free')).toBeTruthy();
            unmount();
        });
    }
});
