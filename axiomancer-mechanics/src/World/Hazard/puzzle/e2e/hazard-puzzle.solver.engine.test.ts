/**
 * Hazard puzzle solver — counts worked out by hand on small layouts, the
 * best surplus, the winning line's replay, the budget and the band check.
 *
 * Card numbers used below (free / powered): DEAD-MAN HAUL red 3/6 force;
 * IRON GRIP red 5/9 force; SCRAMBLE blue 3/6 escape; SURE FOOTING purple
 * 2/2 both meters, DRAW 1. A gold die powers any colour. A puzzle has no
 * bin, so a hand card is staged or held.
 */

import { describe, expect, it } from 'vitest';

import { auditHazardPuzzleLayout, auditHazardPuzzleRoute, hazardPuzzleBandOf } from '../hazard-puzzle.band';
import { confirmHazardPuzzle, createHazardPuzzleSession, playHazardPuzzleMoves } from '../hazard-puzzle.session';
import { solveHazardPuzzle } from '../hazard-puzzle.solver';
import { HAZARD_PUZZLE_BANDS, HAZARD_PUZZLE_SOLVER_BUDGET } from '../hazard-puzzle.tuning';
import type { HazardPuzzleLayout } from '../hazard-puzzle.types';
import { DRAW_ONLY_LAYOUT, FIXTURE_LIBRARY, MIXED_LAYOUT, testLayout } from './hazard-puzzle.layouts.mock';

function replaysToClear(layout: HazardPuzzleLayout, route: 'safe' | 'risk'): boolean {
    const solution = solveHazardPuzzle(layout, route);
    if (!solution.winningLine) return false;
    const end = confirmHazardPuzzle(playHazardPuzzleMoves(createHazardPuzzleSession(layout, route), solution.winningLine));
    return end.result?.cleared === true;
}

describe('solveHazardPuzzle: hand-worked counts (A6)', () => {
    it('one card, one die: staged (3) and powered (6) clear 3; held does not', () => {
        // HAUL: held 0, staged 3, powered 6.
        const layout = testLayout({ id: 'one-card', hand: ['haul'], dice: ['red'], goals: { safe: 3, risk: [3, 1] } });
        const safe = solveHazardPuzzle(layout, 'safe');
        expect(safe.winningOutcomes).toBe(2);
        expect(safe.bestSurplus).toBe(3);
        expect(safe.overBudget).toBe(false);
        // Risk needs 1 escape and HAUL has none.
        const risk = solveHazardPuzzle(layout, 'risk');
        expect(risk.winningOutcomes).toBe(0);
        expect(risk.bestSurplus).toBeNull();
        expect(risk.winningLine).toBeNull();
    });

    it('two cards, no dice: three of the four end states clear 3', () => {
        // HAUL in {held 0, staged 3}; SCRAMBLE in {held 0, staged 3}.
        // Clears: HAUL staged with SCRAMBLE held or staged (2), or SCRAMBLE staged with HAUL held (1).
        const layout = testLayout({ id: 'two-cards', hand: ['haul', 'scram'], goals: { safe: 3, risk: [3, 3] } });
        const safe = solveHazardPuzzle(layout, 'safe');
        expect(safe.winningOutcomes).toBe(3);
        expect(safe.bestSurplus).toBe(3);
        // Risk [3, 3] needs both staged: one outcome, no margin.
        const risk = solveHazardPuzzle(layout, 'risk');
        expect(risk.winningOutcomes).toBe(1);
        expect(risk.bestSurplus).toBe(0);
    });

    it('one gold die between two cards: safe 8 has four ways, risk [5, 3] three', () => {
        // GRIP in {0, 5, 9 with gold}; SCRAMBLE in {0, 3, 6 with gold}; one gold die.
        // Safe >= 8: GRIP 9 with SCRAMBLE held or staged (2), GRIP 5 + SCRAMBLE 3, GRIP 5 + SCRAMBLE 6.
        // Risk needs GRIP staged and SCRAMBLE staged: (5,3), (9,3), (5,6). Best surplus on risk is
        // the weaker meter's margin, 0 in each.
        const layout = testLayout({
            id: 'one-gold',
            hand: ['grip', 'scram'],
            dice: ['gold'],
            goals: { safe: 8, risk: [5, 3] },
        });
        const safe = solveHazardPuzzle(layout, 'safe');
        expect(safe.winningOutcomes).toBe(4);
        expect(safe.bestSurplus).toBe(4); // 9 + 3 = 12 over 8
        const risk = solveHazardPuzzle(layout, 'risk');
        expect(risk.winningOutcomes).toBe(3);
        expect(risk.bestSurplus).toBe(0);
    });

    it('a reserve DRAW: the one way through applies FOOTING, then stages the drawn GRIP', () => {
        // FOOTING applied draws GRIP: holding GRIP (4) or staging it (9). Only staging clears 9.
        // Staging FOOTING without applying it reads the same as applying it and holding GRIP.
        const safe = solveHazardPuzzle(DRAW_ONLY_LAYOUT, 'safe');
        expect(safe.winningOutcomes).toBe(1);
        expect(safe.bestSurplus).toBe(0);
        expect(safe.winningLine).toEqual([
            { type: 'stage', uid: 'c1' },
            { type: 'apply', uid: 'c1' },
            { type: 'stage', uid: 'c2' },
        ]);
        expect(solveHazardPuzzle(DRAW_ONLY_LAYOUT, 'risk').winningOutcomes).toBe(1);
    });

    it('does not count move order: the count matches with the hand reversed', () => {
        const layout = testLayout({ id: 'fwd', hand: ['grip', 'scram', 'haul'], dice: ['gold', 'red'] });
        const reversed = { ...layout, id: 'rev', hand: layout.hand.slice().reverse() };
        expect(solveHazardPuzzle(reversed, 'safe').winningOutcomes).toBe(solveHazardPuzzle(layout, 'safe').winningOutcomes);
    });
});

describe('an outcome is what is played (HP1 A2)', () => {
    const withCrack = (layout: HazardPuzzleLayout): HazardPuzzleLayout => ({
        ...layout,
        id: `${layout.id}-crack`,
        hand: [...layout.hand, 'crack'],
    });
    const layouts = [
        testLayout({ id: 'two-cards', hand: ['haul', 'scram'], goals: { safe: 3, risk: [3, 3] } }),
        testLayout({ id: 'one-gold', hand: ['grip', 'scram'], dice: ['gold'], goals: { safe: 8, risk: [5, 3] } }),
        DRAW_ONLY_LAYOUT,
        MIXED_LAYOUT,
    ];

    for (const layout of layouts) {
        it(`${layout.id}: an inert card in the hand leaves the count unchanged on both routes`, () => {
            for (const route of ['safe', 'risk'] as const) {
                expect(solveHazardPuzzle(withCrack(layout), route).winningOutcomes, route).toBe(
                    solveHazardPuzzle(layout, route).winningOutcomes,
                );
            }
        });
    }

    it('lists the cards each win stages and that change the result, never a held card', () => {
        // Safe 8, one gold die: GRIP 9 alone, GRIP 9 + SCRAMBLE 3, GRIP 5 + SCRAMBLE 3, GRIP 5 + SCRAMBLE 6.
        const layout = testLayout({ id: 'one-gold', hand: ['grip', 'scram', 'crack'], dice: ['gold'], goals: { safe: 8, risk: [5, 3] } });
        const staged = solveHazardPuzzle(layout, 'safe').winningStaged.map((ids) => ids.slice().sort().join('+'));
        expect(staged.sort()).toEqual(['grip', 'grip+scram', 'grip+scram', 'grip+scram']);
    });
});

describe('the winning line (A6, A7)', () => {
    it('replays to a cleared resolve on every hand-worked layout', () => {
        const layouts = [
            testLayout({ id: 'one-card', hand: ['haul'], dice: ['red'], goals: { safe: 3, risk: [3, 1] } }),
            testLayout({ id: 'one-gold', hand: ['grip', 'scram'], dice: ['gold'], goals: { safe: 8, risk: [5, 3] } }),
            DRAW_ONLY_LAYOUT,
            MIXED_LAYOUT,
        ];
        for (const layout of layouts) expect(replaysToClear(layout, 'safe'), layout.id).toBe(true);
    });

    it('reaches the best surplus', () => {
        const solution = solveHazardPuzzle(MIXED_LAYOUT, 'safe');
        const end = confirmHazardPuzzle(
            playHazardPuzzleMoves(createHazardPuzzleSession(MIXED_LAYOUT, 'safe'), solution.winningLine ?? []),
        );
        const combined = (end.result?.force ?? 0) + (end.result?.escape ?? 0);
        expect(combined - 30).toBe(solution.bestSurplus);
    });

    it('never rolls: the solved line leaves the rng where it started', () => {
        const solution = solveHazardPuzzle(MIXED_LAYOUT, 'risk');
        const end = playHazardPuzzleMoves(createHazardPuzzleSession(MIXED_LAYOUT, 'risk'), solution.winningLine ?? []);
        expect(end.board.rng).toEqual({ s: 0 });
    });
});

describe('the solver budget', () => {
    it('defaults to the tuning budget', () => {
        expect(HAZARD_PUZZLE_SOLVER_BUDGET).toBe(20_000);
        expect(solveHazardPuzzle(MIXED_LAYOUT, 'safe').overBudget).toBe(false);
    });

    it('stops at the budget and says the count is partial', () => {
        const solution = solveHazardPuzzle(MIXED_LAYOUT, 'safe', [], { budget: 50 });
        expect(solution.overBudget).toBe(true);
        expect(solution.boardsExplored).toBe(50);
        const audit = auditHazardPuzzleRoute(MIXED_LAYOUT, 'safe', { budget: 50 });
        expect(audit.problems.join(' ')).toMatch(/too open to count/);
    });
});

describe('the bands (A8)', () => {
    it('are the tuning constants: easy 30+, medium 5-29, hard 1-4 with best surplus at most 1', () => {
        expect(HAZARD_PUZZLE_BANDS).toEqual({
            easy: { minOutcomes: 30 },
            medium: { minOutcomes: 5, maxOutcomes: 29 },
            hard: { minOutcomes: 1, maxOutcomes: 4, maxBestSurplus: 1 },
        });
    });

    it('reads counts at each edge', () => {
        expect(hazardPuzzleBandOf(30, 9)).toBe('easy');
        expect(hazardPuzzleBandOf(29, 9)).toBe('medium');
        expect(hazardPuzzleBandOf(5, 9)).toBe('medium');
        expect(hazardPuzzleBandOf(4, 1)).toBe('hard');
        expect(hazardPuzzleBandOf(1, 0)).toBe('hard');
        expect(hazardPuzzleBandOf(4, 2)).toBeNull();
        expect(hazardPuzzleBandOf(0, null)).toBeNull();
    });

    it('the audit names a layout outside its declared band', () => {
        const easy = FIXTURE_LIBRARY[0];
        const misdeclared = { ...easy, id: 'misdeclared', bands: { safe: 'hard', risk: 'easy' } as const };
        const [safe, risk] = auditHazardPuzzleLayout(misdeclared);
        expect(safe.problems).toEqual([expect.stringMatching(/declared hard, measured easy/)]);
        expect(risk.problems).toEqual([]);
    });

    it('the audit names an unsolvable route', () => {
        const layout = testLayout({ id: 'short', hand: ['haul'], goals: { safe: 4, risk: [1, 1] } });
        const [safe] = auditHazardPuzzleLayout(layout);
        expect(safe.problems).toContain('unsolvable');
        expect(safe.measured).toBeNull();
    });
});
