/**
 * A deck grid tile is a thumbnail: the painting, the name, a copies badge when
 * the run carries more than one, a colour mark, and a dimmed state when it is
 * not the open card. No grey meta strip (T, 2026-11-02).
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { StyleSheet } from 'react-native';

import { cardLibrary, createNewGameState, type Character } from '@mechanics';
import { TYPE_ROLES } from '@/theme/axm';
import { DeckCardTile, DIMMED_OPACITY } from '@/components/deck/DeckCardTile';
import { selectDeckViewModel } from '@/state/presenters/deck.engine';
import { withAllProviders } from '@/test-utils/withAllProviders';

const GLOBAL_ID = cardLibrary.find((c) => c.program?.global)!.id;

function cardFor(ids: string[], id: string) {
    const player = createNewGameState().player as Character;
    const state = { player: { ...player, knownCards: ids, combatRewardCards: [] }, flags: [] } as never;
    return selectDeckViewModel(state).groups.flatMap((g) => g.cards).find((c) => c.cardId === id)!;
}

describe('DeckCardTile: thumbnail', () => {
    it('draws the name in the cardName role face at 11/13', () => {
        const card = cardFor(['grey-strike'], 'grey-strike');
        render(withAllProviders(<DeckCardTile card={card} onPress={() => {}} />).tree);
        const name = StyleSheet.flatten(screen.getByText(card.name).props.style) as Record<string, unknown>;
        expect(name.fontFamily).toBe(TYPE_ROLES.cardName.fontFamily);
        expect(name.fontFamily).toBe('Fondamento_400Regular');
        expect(name.fontSize).toBe(11);
        expect(name.lineHeight).toBe(13);
    });

    for (const id of ['grey-strike', GLOBAL_ID]) {
        it(`${id} shows its name and mark but no stance, rank, rarity and type line`, () => {
            const card = cardFor([id], id);
            expect(card).not.toHaveProperty('metaChip');
            const { unmount } = render(withAllProviders(<DeckCardTile card={card} onPress={() => {}} />).tree);
            expect(screen.getByText(card.name)).toBeTruthy();
            expect(screen.getByTestId(`deck-card-mark-${id}`)).toBeTruthy();
            expect(screen.queryByText(/· (ASH|COMMON)/)).toBeNull();
            unmount();
        });
    }

    it('carries a copies badge only with more than one copy', () => {
        const two = cardFor(['grey-strike', 'grey-strike'], 'grey-strike');
        const one = cardFor(['grey-strike'], 'grey-strike');
        const a = render(withAllProviders(<DeckCardTile card={two} onPress={() => {}} />).tree);
        expect(screen.getByTestId('deck-card-count-grey-strike')).toBeTruthy();
        a.unmount();
        render(withAllProviders(<DeckCardTile card={one} onPress={() => {}} />).tree);
        expect(screen.queryByTestId('deck-card-count-grey-strike')).toBeNull();
    });

    it('is dimmed unless open, and a press hands the card back', () => {
        const card = cardFor(['grey-strike'], 'grey-strike');
        const onPress = jest.fn();
        const a = render(withAllProviders(<DeckCardTile card={card} onPress={onPress} />).tree);
        const dim = StyleSheet.flatten(screen.getByTestId('deck-card-grey-strike').props.style);
        expect(dim.opacity).toBe(DIMMED_OPACITY);
        fireEvent.press(screen.getByTestId('deck-card-grey-strike'));
        expect(onPress).toHaveBeenCalledWith(card);
        a.unmount();
        render(withAllProviders(<DeckCardTile card={card} onPress={onPress} open />).tree);
        expect(StyleSheet.flatten(screen.getByTestId('deck-card-grey-strike').props.style).opacity).toBe(1);
    });
});
