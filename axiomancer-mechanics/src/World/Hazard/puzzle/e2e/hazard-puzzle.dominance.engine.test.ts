/**
 * Hazard puzzle worse-copy check (HP1 A12): a library card no win uses, or
 * one another card beats in every layout that holds it, fails the library.
 *
 * Card numbers used below (free / powered): IRON GRIP red 5/9 force;
 * SCRAMBLE and CLIFFRUNNER blue 3/6 escape (they differ only in salvage,
 * which a puzzle never reads); CRACK dead, 0/0 and never powerable.
 * GRIP-TOLL is a test-only IRON GRIP with a 1 ESCAPE toll on its free line.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { validateHazardCardDef } from '../../hazard.card-validate';
import { getHazardCardDef, HAZARD_DECK } from '../../hazard.content';
import type { HazardCardDef } from '../../hazard.types';
import {
    hazardPuzzleDominatedCards,
    hazardPuzzleLibraryCells,
    hazardPuzzleUnusedCards,
    swapHazardPuzzleCard,
} from '../hazard-puzzle.dominance';
import type { HazardPuzzleUnlock } from '../hazard-puzzle.types';
import { testLayout } from './hazard-puzzle.layouts.mock';
import { useHazardPuzzlePoolCards } from './hazard-puzzle.pool.mock';

const GRIP_TOLL: HazardCardDef = { ...getHazardCardDef('grip'), id: 'fx-grip-toll', name: 'GRIP-TOLL', e: -1, ep: 0 };

beforeEach(() => {
    HAZARD_DECK.push(GRIP_TOLL);
});
afterEach(() => {
    HAZARD_DECK.splice(HAZARD_DECK.indexOf(GRIP_TOLL), 1);
});

useHazardPuzzlePoolCards(['runner', 'crack', 'fx-grip-toll']);

/**
 * Safe 7: GRIP-TOLL 5/-1 + SCRAMBLE 3 reaches 7, so does GRIP 5 + SCRAMBLE 3
 * (8): one win each. Risk [5, 3]: GRIP-TOLL + SCRAMBLE stops at (5, 2), no
 * win; GRIP + SCRAMBLE reaches (5, 3), one win.
 */
const TOLL_LAYOUT = testLayout({ id: 'dom-toll', hand: ['fx-grip-toll', 'scram'], goals: { safe: 7, risk: [5, 3] } });

/** CLIFFRUNNER or SCRAMBLE with GRIP: the same wins either way. */
const RUNNER_LAYOUT = testLayout({ id: 'dom-runner', hand: ['grip', 'runner'], goals: { safe: 8, risk: [5, 3] } });

describe('the worse-copy check on fixture libraries (A12)', () => {
    it('the toll card is a real cost card', () => {
        expect(validateHazardCardDef(GRIP_TOLL)).toEqual({ ok: true, reasons: [] });
    });

    it('flags a card that is an existing card plus a cost, naming both and the cell it loses', () => {
        expect(hazardPuzzleDominatedCards([TOLL_LAYOUT], ['grip'])).toEqual([
            { cardId: 'fx-grip-toll', by: 'grip', gains: [{ cell: 'dom-toll risk', outcomes: 0, swapped: 1 }] },
        ]);
        // It still wins on safe, so it is not unused: the dominance check is what catches it.
        expect(hazardPuzzleUnusedCards([TOLL_LAYOUT])).toEqual([]);
    });

    it('does not flag two cards with equal results, either way round', () => {
        expect(hazardPuzzleDominatedCards([RUNNER_LAYOUT], ['scram'])).toEqual([]);
        const scramLayout = { ...RUNNER_LAYOUT, id: 'dom-scram', hand: ['grip', 'scram'] };
        expect(hazardPuzzleDominatedCards([scramLayout], ['runner'])).toEqual([]);
    });

    it('does not flag a card that is better in one layout and worse in another', () => {
        // SCRAMBLE alone reaches 3 of safe 5; GRIP in its place wins. With GRIP in hand, risk [5, 3] needs
        // SCRAMBLE's escape; a second GRIP in its place never reaches it.
        const layout = testLayout({ id: 'dom-split', hand: ['scram'], goals: { safe: 5, risk: [1, 1] } });
        const other = testLayout({ id: 'dom-split-2', hand: ['grip', 'scram'], goals: { safe: 8, risk: [5, 3] } });
        expect(hazardPuzzleDominatedCards([layout], ['grip'])).toHaveLength(1);
        expect(hazardPuzzleDominatedCards([layout, other], ['grip']).filter((d) => d.cardId === 'scram')).toEqual([]);
    });

    it('flags a card no win stages anywhere it is held', () => {
        const layout = testLayout({ id: 'dom-crack', hand: ['grip', 'crack'], goals: { safe: 5, risk: [5, 1] } });
        expect(hazardPuzzleUnusedCards([layout])).toEqual(['crack']);
    });

    it('swaps a card in the hand, the reserve and a granted unlock', () => {
        const unlock: HazardPuzzleUnlock = { stat: 'mind', min: 3, kind: 'extraCard', cardId: 'scram' };
        const layout = testLayout({ id: 'dom-swap', hand: ['scram'], reserve: ['scram'], unlocks: [unlock] });
        const swapped = swapHazardPuzzleCard({ layout, route: 'safe', unlocks: [unlock] }, 'scram', 'runner');
        expect(swapped.layout.hand).toEqual(['runner']);
        expect(swapped.layout.reserve).toEqual(['runner']);
        expect(swapped.layout.unlocks).toEqual([{ ...unlock, cardId: 'runner' }]);
        expect(swapped.unlocks).toEqual([{ ...unlock, cardId: 'runner' }]);
    });

    it('reads each layout on both routes, with no unlock and with every declared unlock', () => {
        const unlock: HazardPuzzleUnlock = { stat: 'mind', min: 3, kind: 'extraDie' };
        const cells = hazardPuzzleLibraryCells([TOLL_LAYOUT, { ...RUNNER_LAYOUT, unlocks: [unlock] }]);
        expect(cells.map((c) => `${c.layout.id} ${c.route} ${c.unlocks.length}`)).toEqual([
            'dom-toll safe 0',
            'dom-toll risk 0',
            'dom-runner safe 0',
            'dom-runner safe 1',
            'dom-runner risk 0',
            'dom-runner risk 1',
        ]);
    });
});
