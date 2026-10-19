/**
 * Test-only pool admission. Solver tests that need a card puzzles cut
 * (CRACK as the inert card, CLIFFRUNNER as a second ESCAPE card with its
 * own id) add it to `HAZARD_PUZZLE_CARD_POOL` before each test in the
 * calling suite and take it off again after each test. The shipped pool is
 * unchanged.
 */

import { afterEach, beforeEach } from 'vitest';

import { HAZARD_PUZZLE_CARD_POOL } from '../hazard-puzzle.tuning';

export function useHazardPuzzlePoolCards(cardIds: readonly string[]): void {
    const added: string[] = [];
    beforeEach(() => {
        for (const id of cardIds) {
            if (HAZARD_PUZZLE_CARD_POOL.includes(id)) continue;
            HAZARD_PUZZLE_CARD_POOL.push(id);
            added.push(id);
        }
    });
    afterEach(() => {
        for (const id of added.splice(0)) {
            const i = HAZARD_PUZZLE_CARD_POOL.indexOf(id);
            if (i !== -1) HAZARD_PUZZLE_CARD_POOL.splice(i, 1);
        }
    });
}
