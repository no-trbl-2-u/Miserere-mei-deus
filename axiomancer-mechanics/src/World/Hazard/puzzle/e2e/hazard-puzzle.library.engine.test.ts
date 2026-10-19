/**
 * Hazard puzzle library check (A7): every layout, on both routes, with no
 * unlocks, is solvable, sits in its declared band, stays inside the
 * solver budget, and its winning line replays to a cleared resolve.
 * A10: every subset of its stat unlocks keeps it solvable with at least as
 * many winning outcomes as no unlock.
 * A13: the three demos, one per band on the risk route, the safe route in
 * the same band or easier, and at least one demo that cannot be cleared
 * without a reserve DRAW card.
 * HP1 A12: no card is unused in every layout that holds it, and no pool
 * card beats a library card in every layout that holds it.
 */

import { describe, expect, it } from 'vitest';

import { getHazardCardDef, getHazardDef } from '../../hazard.content';
import { hazardPuzzleDominatedCards, hazardPuzzleUnusedCards } from '../hazard-puzzle.dominance';
import { auditHazardPuzzleLayout, auditHazardPuzzleUnlocks } from '../hazard-puzzle.band';
import { getHazardPuzzleLayout, HAZARD_PUZZLE_LIBRARY } from '../hazard-puzzle.library';
import { solveHazardPuzzle } from '../hazard-puzzle.solver';
import type { HazardPuzzleBand, HazardPuzzleLayout } from '../hazard-puzzle.types';
import { validateHazardPuzzleLayout } from '../hazard-puzzle.validate';

const LIBRARY: readonly HazardPuzzleLayout[] = HAZARD_PUZZLE_LIBRARY;

const BAND_RANK: Record<HazardPuzzleBand, number> = { easy: 0, medium: 1, hard: 2 };

/** True when neither route can be cleared once the reserve is emptied. */
function needsReserveDraw(layout: HazardPuzzleLayout): boolean {
    const noReserve = { ...layout, reserve: [] };
    return (['safe', 'risk'] as const).every((route) => solveHazardPuzzle(noReserve, route).winningOutcomes === 0);
}

describe('the demo puzzles (A13)', () => {
    it('are three, one per band on the risk route, easy to hard', () => {
        expect(LIBRARY.map((l) => l.bands.risk)).toEqual(['easy', 'medium', 'hard']);
    });

    it('put the safe route in the same band as the risk route or an easier one', () => {
        for (const l of LIBRARY) expect(BAND_RANK[l.bands.safe], l.id).toBeLessThanOrEqual(BAND_RANK[l.bands.risk]);
    });

    it('use only existing hazard cards, none of them RE-CAST', () => {
        for (const l of LIBRARY) {
            const ids = [...l.hand, ...l.reserve, ...l.unlocks.flatMap((u) => (u.kind === 'extraCard' ? [u.cardId] : []))];
            for (const id of ids) expect(getHazardCardDef(id).effect, `${l.id} ${id}`).not.toBe('recast');
        }
    });

    it('reuse a live hazard title and sit in an Act 1 region', () => {
        for (const l of LIBRARY) {
            expect(l.title).toBe(getHazardDef(l.hazardId).title);
            expect(l.act).toBe(1);
        }
    });

    it('include at least one demo whose every solution needs a reserve DRAW card', () => {
        const needing = LIBRARY.filter(needsReserveDraw).map((l) => l.id);
        expect(needing).toContain('demo-undercroft-hard');
        expect(needing).toContain('demo-ashfall-medium');
    });

    it('look up by id, and an unknown id throws', () => {
        expect(getHazardPuzzleLayout('demo-cliff-easy').hazardId).toBe('cracked-cliff');
        expect(() => getHazardPuzzleLayout('nope')).toThrow(/Unknown hazard puzzle/);
    });
});

describe('hazard puzzle library: solvable and in band (A7)', () => {
    it('has layouts to check', () => {
        expect(LIBRARY.length).toBeGreaterThan(0);
    });

    it('every layout id is unique', () => {
        const ids = LIBRARY.map((l) => l.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    for (const layout of LIBRARY) {
        it(`${layout.id} is a valid layout`, () => {
            expect(validateHazardPuzzleLayout(layout)).toEqual({ ok: true, reasons: [] });
        });

        for (const audit of auditHazardPuzzleLayout(layout)) {
            const { route, declared, solution } = audit;
            it(`${layout.id} ${route}: ${declared}, ${solution.winningOutcomes} outcomes, best surplus ${solution.bestSurplus}`, () => {
                expect(audit.problems).toEqual([]);
                expect(solution.overBudget).toBe(false);
                expect(solution.winningOutcomes).toBeGreaterThan(0);
                expect(audit.measured).toBe(declared);
                expect(audit.replayCleared).toBe(true);
            });
        }
    }
});

describe('hazard puzzle library: no unlock makes a puzzle harder (A10)', () => {
    for (const layout of LIBRARY) {
        it(`${layout.id} declares at least one stat unlock`, () => {
            expect(layout.unlocks.length).toBeGreaterThan(0);
        });

        for (const audit of auditHazardPuzzleUnlocks(layout)) {
            const label = audit.unlocks.map((u) => `${u.stat} ${u.kind}`).join(' + ');
            it(`${layout.id} ${audit.route} with ${label}: ${audit.winningOutcomes} outcomes (none: ${audit.baseOutcomes})`, () => {
                expect(audit.problems).toEqual([]);
                expect(audit.winningOutcomes).toBeGreaterThanOrEqual(audit.baseOutcomes);
                expect(audit.winningOutcomes).toBeGreaterThan(0);
            });
        }
    }
});

describe('hazard puzzle library: no worse copy (HP1 A12)', () => {
    it('no library card is unused in every layout that holds it', () => {
        expect(hazardPuzzleUnusedCards(HAZARD_PUZZLE_LIBRARY)).toEqual([]);
    });

    it('no library card is dominated by a pool card', () => {
        expect(hazardPuzzleDominatedCards(HAZARD_PUZZLE_LIBRARY)).toEqual([]);
    });
});
