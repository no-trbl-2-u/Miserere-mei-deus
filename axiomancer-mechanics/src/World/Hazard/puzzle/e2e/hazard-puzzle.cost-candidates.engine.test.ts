/**
 * The twenty cost-card candidates (HP5 A6, A7): `cand-cost-medium-01..10`
 * and `cand-cost-hard-01..10`. Each holds one of the five cost cards, passes
 * the candidate check, wins only exactly on its goal (best surplus 0) and
 * cannot be won by staging the whole opening hand. Across the twenty each
 * cost card sits in four or more layouts, is staged in a win somewhere and
 * is a trap (in hand, staged in no win) somewhere else; three or more
 * layouts follow `cand-hard-06`'s pattern, a card that looks like a die sink
 * whose unpowered line is required.
 */

import { describe, expect, it } from 'vitest';

import { getHazardCardDef } from '../../hazard.content';
import { dieCanPowerCard } from '../../hazard.engine';
import { auditHazardPuzzleCandidate } from '../hazard-puzzle.candidate-audit';
import { getHazardPuzzleCandidate, HAZARD_PUZZLE_CANDIDATES } from '../hazard-puzzle.candidates';
import { hazardPuzzleCardReport } from '../hazard-puzzle.report';
import { createHazardPuzzleSession, playHazardPuzzleMoves } from '../hazard-puzzle.session';
import { solveHazardPuzzle, solveHazardPuzzleSession } from '../hazard-puzzle.solver';
import type { HazardPuzzleCandidate } from '../hazard-puzzle.types';

const COST_CARDS = ['tithe', 'stones', 'pawn', 'breakneck', 'headlong'] as const;

const pad = (i: number): string => String(i + 1).padStart(2, '0');
const MEDIUM_IDS = Array.from({ length: 10 }, (_, i) => `cand-cost-medium-${pad(i)}`);
const HARD_IDS = Array.from({ length: 10 }, (_, i) => `cand-cost-hard-${pad(i)}`);
const COST_CANDIDATES = HAZARD_PUZZLE_CANDIDATES.filter((c) => c.id.startsWith('cand-cost-'));

/**
 * The `cand-hard-06` pattern: the card a die on the board could power, that
 * every win stages, and that every win leaves unpowered.
 */
const DIE_SINK_DECOYS: readonly [string, string][] = [
    ['cand-cost-medium-02', 'footing'],
    ['cand-cost-medium-04', 'breakneck'],
    ['cand-cost-medium-06', 'tithe'],
    ['cand-cost-hard-02', 'pawn'],
    ['cand-cost-hard-04', 'headlong'],
    ['cand-cost-hard-06', 'headlong'],
    ['cand-cost-hard-08', 'breakneck'],
    ['cand-cost-hard-09', 'stones'],
    ['cand-cost-hard-10', 'headlong'],
];

/** True when `staged` holds every card of `hand`, copies counted. */
function stagesWholeHand(staged: readonly string[], hand: readonly string[]): boolean {
    const left = staged.slice();
    for (const id of hand) {
        const at = left.indexOf(id);
        if (at < 0) return false;
        left.splice(at, 1);
    }
    return true;
}

/** The candidate's opening session with `cardId` staged and powered by the first die of each kind that fits. */
function poweredOpenings(c: HazardPuzzleCandidate, cardId: string) {
    const start = createHazardPuzzleSession(c, c.route);
    const entry = start.board.hand.find((h) => h.cardId === cardId);
    if (!entry) throw new Error(`${c.id}: ${cardId} is not in the opening hand`);
    const def = getHazardCardDef(cardId);
    const firstOfKind = start.board.dice.filter((d, i, all) => all.findIndex((o) => o.kind === d.kind) === i);
    return firstOfKind
        .filter((d) => dieCanPowerCard(d.kind, def))
        .map((d) =>
            playHazardPuzzleMoves(start, [
                { type: 'stage', uid: entry.uid },
                { type: 'power', uid: entry.uid, dieId: d.id },
            ]),
        );
}

describe('the twenty cost-card candidates (A6)', () => {
    it('are ten medium and ten hard, under their ids and bands, after the ten hard', () => {
        expect(COST_CANDIDATES.map((c) => c.id)).toEqual([...MEDIUM_IDS, ...HARD_IDS]);
        for (const c of COST_CANDIDATES) {
            expect(c.intendedBand).toBe(c.id.startsWith('cand-cost-medium-') ? 'medium' : 'hard');
        }
        expect(HAZARD_PUZZLE_CANDIDATES.slice(0, 10).every((c) => c.id.startsWith('cand-hard-'))).toBe(true);
    });

    it('nominate the risk route on four or more of each band', () => {
        for (const band of ['medium', 'hard'] as const) {
            const risk = COST_CANDIDATES.filter((c) => c.intendedBand === band && c.route === 'risk');
            expect(risk.length).toBeGreaterThanOrEqual(4);
        }
    });

    for (const c of COST_CANDIDATES) {
        describe(`${c.id} (${c.intendedBand}, ${c.route}): "${c.label}"`, () => {
            const solution = solveHazardPuzzle(c, c.route);

            it('passes the candidate check and holds a cost card in its opening hand', () => {
                expect(auditHazardPuzzleCandidate(c).problems).toEqual([]);
                expect(c.hand.some((id) => (COST_CARDS as readonly string[]).includes(id))).toBe(true);
            });

            it('wins only exactly on its goal, inside the budget', () => {
                expect(solution.overBudget).toBe(false);
                expect(solution.winningOutcomes).toBeGreaterThan(0);
                expect(solution.bestSurplus).toBe(0);
            });

            it('cannot be won by staging the whole opening hand', () => {
                for (const staged of solution.winningStaged) expect(stagesWholeHand(staged, c.hand)).toBe(false);
            });
        });
    }
});

describe('each cost card across the twenty (A7)', () => {
    const reports = COST_CANDIDATES.map((c) => ({ c, report: hazardPuzzleCardReport(c, c.route) }));

    for (const cardId of COST_CARDS) {
        it(`${cardId} sits in four or more layouts, is staged in a win in one and a trap in another`, () => {
            const holding = reports.filter(({ report }) => report.cards.some((u) => u.cardId === cardId));
            expect(holding.length).toBeGreaterThanOrEqual(4);
            const use = (r: (typeof reports)[number]) => r.report.cards.find((u) => u.cardId === cardId)!;
            const stagedIn = holding.filter((r) => use(r).staged > 0);
            const trapIn = holding.filter((r) => use(r).unused && use(r).sources.includes('hand'));
            expect(stagedIn.length).toBeGreaterThanOrEqual(1);
            expect(trapIn.length).toBeGreaterThanOrEqual(1);
        });
    }

    it('follows the cand-hard-06 pattern in three or more layouts', () => {
        expect(new Set(DIE_SINK_DECOYS.map(([id]) => id)).size).toBeGreaterThanOrEqual(3);
    });

    for (const [id, cardId] of DIE_SINK_DECOYS) {
        it(`${id}: ${cardId} looks like a die sink, but every win stages it unpowered`, () => {
            const c = getHazardPuzzleCandidate(id);
            const report = reports.find((r) => r.c.id === id)!.report;
            expect(report.cards.find((u) => u.cardId === cardId)?.required).toBe(true);
            const powered = poweredOpenings(c, cardId);
            expect(powered.length).toBeGreaterThan(0);
            for (const s of powered) expect(solveHazardPuzzleSession(s).winningOutcomes).toBe(0);
        });
    }
});
