/**
 * Test-only cost and utility cards. Not deck content: no card or keyword
 * is added to the game. `useHazardFixtureCards()` pushes them onto
 * `HAZARD_DECK` (so `getHazardCardDef` finds them) and their ids onto
 * `HAZARD_PUZZLE_CARD_POOL` before each test, and takes them off again
 * after each test.
 *
 * Numbers (free / powered), FORCE / ESCAPE:
 *  - fx-toll: purple, -1/-1 free, 0/0 powered, DRAW 2 (a cost on the free line);
 *  - fx-surge-cost: red, 3/0 free, 6/-2 powered, +1 blue die when powered
 *    (a cost on the powered line);
 *  - fx-greed: purple, -3/-3 on both lines, DRAW 2 (a cost on both lines);
 *  - fx-cost-convert: purple, -1/-1 both lines, CONVERT;
 *  - fx-gain-die: purple, 0/0 both lines, +1 die (+2 powered) of its colour;
 *  - fx-gold-die: gold, 0/0 free, 6/6 powered, +1 die (+2 powered), majorEffect;
 *  - fx-reroll: purple, 0/0 both lines, reroll to the layout's set faces.
 */

import { afterEach, beforeEach } from 'vitest';

import { HAZARD_DECK } from '../../hazard.content';
import { HAZARD_PUZZLE_CARD_POOL } from '../hazard-puzzle.tuning';
import type { HazardCardDef } from '../../hazard.types';

function fixture(over: Partial<HazardCardDef> & Pick<HazardCardDef, 'id' | 'kind'>): HazardCardDef {
    return { name: over.id.toUpperCase(), rarity: 'common', weight: 0, f: 0, e: 0, flavor: '', keywords: [], ...over };
}

export const FX_TOLL = fixture({ id: 'fx-toll', kind: 'purple', f: -1, e: -1, fp: 0, ep: 0, effect: 'draw', drawBase: 2, drawPowered: 2 });
export const FX_SURGE_COST = fixture({
    id: 'fx-surge-cost', kind: 'red', f: 3, e: 0, fp: 6, ep: -2,
    effect: 'gainDie', gainDieBase: 0, gainDiePowered: 1, gainDieKind: 'blue',
});
export const FX_GREED = fixture({ id: 'fx-greed', kind: 'purple', f: -3, e: -3, fp: -3, ep: -3, effect: 'draw', drawBase: 2, drawPowered: 2 });
export const FX_COST_CONVERT = fixture({ id: 'fx-cost-convert', kind: 'purple', f: -1, e: -1, fp: -1, ep: -1, effect: 'convert' });
export const FX_GAIN_DIE = fixture({ id: 'fx-gain-die', kind: 'purple', effect: 'gainDie', gainDieBase: 1, gainDiePowered: 2 });
export const FX_GOLD_DIE = fixture({
    id: 'fx-gold-die', kind: 'gold', f: 0, e: 0, fp: 6, ep: 6,
    effect: 'gainDie', majorEffect: true, gainDieBase: 1, gainDiePowered: 2,
});
export const FX_REROLL = fixture({ id: 'fx-reroll', kind: 'purple', effect: 'reroll' });

export const FIXTURE_CARDS: readonly HazardCardDef[] = [
    FX_TOLL, FX_SURGE_COST, FX_GREED, FX_COST_CONVERT, FX_GAIN_DIE, FX_GOLD_DIE, FX_REROLL,
];

function removeFixtureCards(): void {
    for (const card of FIXTURE_CARDS) {
        const i = HAZARD_DECK.indexOf(card);
        if (i !== -1) HAZARD_DECK.splice(i, 1);
        const p = HAZARD_PUZZLE_CARD_POOL.indexOf(card.id);
        if (p !== -1) HAZARD_PUZZLE_CARD_POOL.splice(p, 1);
    }
}

/** Registers the fixture cards for each test in the calling suite and removes them after. */
export function useHazardFixtureCards(): void {
    beforeEach(() => {
        HAZARD_DECK.push(...FIXTURE_CARDS);
        HAZARD_PUZZLE_CARD_POOL.push(...FIXTURE_CARDS.map((c) => c.id));
    });
    afterEach(removeFixtureCards);
}
