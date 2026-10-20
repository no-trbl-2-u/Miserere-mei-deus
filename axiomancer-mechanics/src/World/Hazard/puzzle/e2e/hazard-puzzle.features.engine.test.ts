/**
 * Hazard puzzle difficulty features (HP2 A3) — every number worked out by
 * hand on small layouts.
 *
 * Card numbers used below (free / powered): DEAD-MAN HAUL red 3/6 force;
 * IRON GRIP red 5/9 force; SCRAMBLE blue 3/6 escape; SURE FOOTING purple
 * 2/2 both meters, DRAW 1. A gold die powers any colour. A puzzle has no
 * bin, so a hand card is staged or held.
 *
 * A first placement is a hand card staged with its die left open, or
 * powered by one die kind that can power it. The walk never undoes a move,
 * so a placed die stays on its card.
 */

import { describe, expect, it } from 'vitest';

import { formatHazardPuzzleCardReport, formatHazardPuzzleFeatures, hazardPuzzleCardReport } from '../hazard-puzzle.report';
import { solveHazardPuzzle } from '../hazard-puzzle.solver';
import { DRAW_ONLY_LAYOUT, MIXED_LAYOUT, testLayout } from './hazard-puzzle.layouts.mock';

/** HAUL in {held 0, staged 3, powered 6}, one red die. */
const ONE_CARD = testLayout({ id: 'one-card', hand: ['haul'], dice: ['red'], goals: { safe: 3, risk: [3, 1] } });

/** GRIP in {0, 5, 9 with gold}; SCRAMBLE in {0, 3, 6 with gold}; one gold die. */
const DIE_CHOICE = testLayout({
    id: 'die-choice',
    hand: ['grip', 'scram'],
    dice: ['gold'],
    goals: { safe: 12, risk: [9, 3] },
});

/**
 * HAUL 3 force; FOOTING 2/2 and draws SCRAMBLE (3 escape). Six outcomes:
 * none (0/0), HAUL (3/0), FOOTING (2/2), FOOTING + SCRAMBLE (2/5),
 * HAUL + FOOTING (5/2), all three (5/5). FOOTING staged and left for
 * confirm reads the same as FOOTING applied with SCRAMBLE held.
 */
const DRAW_SHARE = testLayout({
    id: 'draw-share',
    hand: ['haul', 'footing'],
    reserve: ['scram'],
    goals: { safe: 3, risk: [3, 3] },
});

describe('the five features on hand-worked layouts (A3)', () => {
    it('one card: safe 3 wins from either placement in one move', () => {
        // Wins: staged (3), powered (6). Placements: open, red: both win.
        // The one loss (held, 0) is 3 short.
        expect(solveHazardPuzzle(ONE_CARD, 'safe').features).toEqual({
            winningLines: 2,
            openingShare: 1,
            nearMisses: 0,
            shortestWin: 1,
            drawDependence: 0,
        });
    });

    it('one card: risk [3, 1] never wins, and two losses are one escape short', () => {
        // Staged (3, 0) and powered (6, 0) are each min(force - 3, 0 - 1) = -1 short.
        expect(solveHazardPuzzle(ONE_CARD, 'risk').features).toEqual({
            winningLines: 0,
            openingShare: 0,
            nearMisses: 2,
            shortestWin: null,
            drawDependence: 0,
        });
    });

    it('a die on the wrong card closes every line: three of four placements win', () => {
        // Safe 12: only GRIP 9 (gold) + SCRAMBLE 3 clears, in three moves. Placements:
        // GRIP open, GRIP gold, SCRAMBLE open win; SCRAMBLE gold caps at 5 + 6 = 11,
        // which is the one near miss.
        expect(solveHazardPuzzle(DIE_CHOICE, 'safe').features).toEqual({
            winningLines: 1,
            openingShare: 0.75,
            nearMisses: 1,
            shortestWin: 3,
            drawDependence: 0,
        });
        // Risk [9, 3]: the same one way through. GRIP 9 with SCRAMBLE held is 3 escape
        // short, GRIP 5 is 4 force short: no near miss.
        expect(solveHazardPuzzle(DIE_CHOICE, 'risk').features).toEqual({
            winningLines: 1,
            openingShare: 0.75,
            nearMisses: 0,
            shortestWin: 3,
            drawDependence: 0,
        });
    });

    it('draw dependence: four of the five safe wins stage FOOTING', () => {
        // Safe 3 clears every outcome but none: HAUL alone is the one win with no DRAW.
        expect(solveHazardPuzzle(DRAW_SHARE, 'safe').features).toEqual({
            winningLines: 5,
            openingShare: 1,
            nearMisses: 0,
            shortestWin: 1,
            drawDependence: 0.8,
        });
    });

    it('risk [3, 3]: one win in four moves, and three losses one short', () => {
        // Only all three (5/5) clears: stage HAUL, stage FOOTING, apply it, stage SCRAMBLE.
        // FOOTING (2/2), FOOTING + SCRAMBLE (2/5) and HAUL + FOOTING (5/2) are each 1 short.
        expect(solveHazardPuzzle(DRAW_SHARE, 'risk').features).toEqual({
            winningLines: 1,
            openingShare: 1,
            nearMisses: 3,
            shortestWin: 4,
            drawDependence: 1,
        });
    });

    it('the draw-only layout: the one win applies the DRAW, in three moves', () => {
        const { features } = solveHazardPuzzle(DRAW_ONLY_LAYOUT, 'safe');
        expect(features.shortestWin).toBe(3);
        expect(features.drawDependence).toBe(1);
    });
});

describe('the features and the count agree', () => {
    it('winning lines is the winning-outcome count on every route', () => {
        for (const layout of [ONE_CARD, DIE_CHOICE, DRAW_SHARE, DRAW_ONLY_LAYOUT, MIXED_LAYOUT]) {
            for (const route of ['safe', 'risk'] as const) {
                const solution = solveHazardPuzzle(layout, route);
                expect(solution.features.winningLines, `${layout.id} ${route}`).toBe(solution.winningOutcomes);
            }
        }
    });

    it('the shortest win is no longer than the best-surplus line', () => {
        for (const route of ['safe', 'risk'] as const) {
            const solution = solveHazardPuzzle(MIXED_LAYOUT, route);
            expect(solution.features.shortestWin).not.toBeNull();
            expect(solution.features.shortestWin!).toBeLessThanOrEqual(solution.winningLine!.length);
        }
    });

    it('the shares stay in [0, 1] on the mixed layout', () => {
        for (const route of ['safe', 'risk'] as const) {
            const { openingShare, drawDependence } = solveHazardPuzzle(MIXED_LAYOUT, route).features;
            for (const n of [openingShare, drawDependence]) {
                expect(n).toBeGreaterThanOrEqual(0);
                expect(n).toBeLessThanOrEqual(1);
            }
        }
    });

    it('still reports features when the walk stops at the budget', () => {
        const solution = solveHazardPuzzle(MIXED_LAYOUT, 'safe', [], { budget: 50 });
        expect(solution.overBudget).toBe(true);
        expect(solution.boardsExplored).toBe(50);
        expect(solution.features.winningLines).toBe(solution.winningOutcomes);
    });
});

describe('the report carries the features', () => {
    it('rides on the card report and prints as one line', () => {
        const report = hazardPuzzleCardReport(DIE_CHOICE, 'safe');
        expect(report.features).toEqual(solveHazardPuzzle(DIE_CHOICE, 'safe').features);
        expect(report.overBudget).toBe(false);
        expect(formatHazardPuzzleFeatures(report.features)).toBe(
            'winning lines 1 · opening share 75% · near misses 1 · shortest win 3 · draw dependence 0%',
        );
        expect(formatHazardPuzzleCardReport(report)).toContain('| grip |');
    });

    it('marks a partial solve and prints a dash for no win', () => {
        const none = solveHazardPuzzle(ONE_CARD, 'risk').features;
        expect(formatHazardPuzzleFeatures(none, true)).toBe(
            'winning lines 0 · opening share 0% · near misses 2 · shortest win - · draw dependence 0% (partial: over budget)',
        );
    });
});
