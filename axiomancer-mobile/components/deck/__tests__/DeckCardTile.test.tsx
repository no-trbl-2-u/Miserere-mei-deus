/**
 * A deck list tile prints no grey meta line (T, 2026-11-02): the `STANCE ·
 * RANK · RARITY · TYPE` strip is gone, as it is from every opened card. The
 * name, what the card does, its rarity mark and its copies stay.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { cardLibrary, createNewGameState, type Character } from '@mechanics';
import { DeckCardTile } from '@/components/deck/DeckCardTile';
import { selectDeckViewModel } from '@/state/presenters/deck.engine';
import { withAllProviders } from '@/test-utils/withAllProviders';

const GLOBAL_ID = cardLibrary.find((c) => c.program?.global)!.id;

describe('DeckCardTile: no meta strip', () => {
    for (const id of ['grey-strike', GLOBAL_ID]) {
        it(`${id} shows name and outcome but no stance, rank, rarity and type line`, () => {
            const player = createNewGameState().player as Character;
            const state = { player: { ...player, knownCards: [id], combatRewardCards: [] }, flags: [] } as never;
            const card = selectDeckViewModel(state).groups.flatMap((g) => g.cards).find((c) => c.cardId === id)!;
            expect(card).not.toHaveProperty('metaChip');
            const { unmount } = render(withAllProviders(<DeckCardTile card={card} onPress={() => {}} />).tree);
            expect(screen.getByText(card.name)).toBeTruthy();
            expect(screen.queryByText(/· (ASH|COMMON)/)).toBeNull();
            expect(screen.queryByText(/^[A-Z]+ · [A-Z]+ ·/)).toBeNull();
            unmount();
        });
    }
});
