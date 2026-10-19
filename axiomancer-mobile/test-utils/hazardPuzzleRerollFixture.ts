/**
 * Test-only reroll and gained-die cards, and a puzzle that holds them. Not
 * deck content: no card or keyword is added to the game. No shipped card
 * rerolls or gains a die yet, so the HP3b tests register these for a test
 * and take them off again after it.
 *
 *  - fx-reroll: purple, 0/0, reroll 1 die (3 powered) to the layout's set faces;
 *  - fx-gain-die: purple, 0/0, +1 purple die (+2 powered).
 *
 * The puzzle is the hard demo's board with these two cards leading the hand
 * and `rerollFaces` gold, gold, red.
 */

import {
    getHazardPuzzleLayout,
    HAZARD_DECK,
    HAZARD_PUZZLE_CARD_POOL,
    HAZARD_PUZZLE_LIBRARY,
    type HazardCardDef,
    type HazardPuzzleLayout,
} from '@mechanics';

function fixture(over: Partial<HazardCardDef> & Pick<HazardCardDef, 'id' | 'kind'>): HazardCardDef {
    return { name: over.id.toUpperCase(), rarity: 'common', weight: 0, f: 0, e: 0, flavor: '', keywords: [], ...over };
}

export const FX_REROLL = fixture({ id: 'fx-reroll', kind: 'purple', effect: 'reroll', rerollBase: 1, rerollPowered: 3 });
export const FX_GAIN_DIE = fixture({
    id: 'fx-gain-die', kind: 'purple', effect: 'gainDie', gainDieBase: 1, gainDiePowered: 2, gainDieKind: 'purple',
});

const CARDS: readonly HazardCardDef[] = [FX_REROLL, FX_GAIN_DIE];

export const REROLL_PUZZLE_ID = 'fx-reroll-puzzle';

function rerollPuzzle(): HazardPuzzleLayout {
    const hard = getHazardPuzzleLayout('demo-undercroft-hard');
    return {
        ...hard,
        id: REROLL_PUZZLE_ID,
        hand: [FX_REROLL.id, FX_GAIN_DIE.id, ...hard.hand],
        rerollFaces: ['gold', 'gold', 'red'],
        unlocks: [],
    };
}

const library = HAZARD_PUZZLE_LIBRARY as HazardPuzzleLayout[];

/** Registers the cards and the puzzle; returns the puzzle. */
export function addRerollFixture(): HazardPuzzleLayout {
    HAZARD_DECK.push(...CARDS);
    HAZARD_PUZZLE_CARD_POOL.push(...CARDS.map((c) => c.id));
    const layout = rerollPuzzle();
    library.push(layout);
    return layout;
}

/** Takes the cards and the puzzle off again. */
export function removeRerollFixture(): void {
    for (const card of CARDS) {
        const d = HAZARD_DECK.indexOf(card);
        if (d !== -1) HAZARD_DECK.splice(d, 1);
        const p = HAZARD_PUZZLE_CARD_POOL.indexOf(card.id);
        if (p !== -1) HAZARD_PUZZLE_CARD_POOL.splice(p, 1);
    }
    const i = library.findIndex((l) => l.id === REROLL_PUZZLE_ID);
    if (i !== -1) library.splice(i, 1);
}
