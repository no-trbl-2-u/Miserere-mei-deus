/**
 * Hazard puzzle bots and the curve (HP6a A1-A3): the bots play legal moves
 * only, always end in a confirm, and give the same numbers at the same seed;
 * `noisy-greedy` beats `random` on the three demos; the curve ranks easiest
 * first; and the solver, now on the shared legal-move export, keeps its
 * numbers (the counts below are the cliff's, as in the candidates test).
 */

import { describe, expect, it } from 'vitest';

import { HAZARD_PUZZLE_CANDIDATES } from '../hazard-puzzle.candidates';
import { formatHazardPuzzleCurve, hazardPuzzleCurveBar } from '../hazard-puzzle.curve-report';
import { hazardPuzzleLegalMoves } from '../hazard-puzzle.legal-moves';
import { HAZARD_PUZZLE_LIBRARY, getHazardPuzzleLayout } from '../hazard-puzzle.library';
import { createHazardPuzzleSession, playHazardPuzzleMove } from '../hazard-puzzle.session';
import {
    HAZARD_PUZZLE_BOTS,
    buildHazardPuzzleCurve,
    compareHazardPuzzleCurveRows,
    hazardPuzzleSimRng,
    playHazardPuzzleBot,
    simulateHazardPuzzle,
    type HazardPuzzleCurveRow,
} from '../hazard-puzzle.sim';
import { solveHazardPuzzle } from '../hazard-puzzle.solver';
import { HAZARD_PUZZLE_SIM } from '../hazard-puzzle.tuning';

const CLIFF = getHazardPuzzleLayout('demo-cliff-easy');

describe('hazardPuzzleLegalMoves (A2)', () => {
    it('lists one stage per distinct hand card at the opening, and nothing once resolved', () => {
        const s = createHazardPuzzleSession(CLIFF, 'safe');
        const moves = hazardPuzzleLegalMoves(s);
        expect(moves.length).toBeGreaterThan(0);
        expect(moves.every((m) => m.type === 'stage')).toBe(true);
        const resolved = playHazardPuzzleBot(s, 'random', hazardPuzzleSimRng(1));
        expect(hazardPuzzleLegalMoves(resolved)).toEqual([]);
    });

    it('lists only moves that change the board', () => {
        for (const layout of HAZARD_PUZZLE_LIBRARY) {
            let s = createHazardPuzzleSession(layout, 'risk');
            const rng = hazardPuzzleSimRng(7);
            for (let i = 0; i < 12 && s.phase === 'playing'; i += 1) {
                const moves = hazardPuzzleLegalMoves(s);
                if (moves.length === 0) break;
                for (const m of moves) expect(playHazardPuzzleMove(s, m)).not.toBe(s);
                s = playHazardPuzzleMove(s, moves[Math.floor(rng() * moves.length)]);
            }
        }
    });
});

describe('the bots (A2)', () => {
    it.each(HAZARD_PUZZLE_BOTS)('%s ends every play resolved, on legal moves only', (bot) => {
        for (const c of HAZARD_PUZZLE_CANDIDATES.slice(0, 6)) {
            const rng = hazardPuzzleSimRng(11);
            for (let i = 0; i < 20; i += 1) {
                const end = playHazardPuzzleBot(createHazardPuzzleSession(c, c.route), bot, rng);
                expect(end.phase).toBe('resolved');
                expect(end.result).not.toBeNull();
            }
        }
    });

    it('confirms at the move cap', () => {
        const end = playHazardPuzzleBot(createHazardPuzzleSession(CLIFF, 'safe'), 'random', () => 0, 0);
        expect(end.phase).toBe('resolved');
        expect(end.board.play).toHaveLength(0);
    });

    it('gives the same wins at the same seed, and others at another', () => {
        const a = simulateHazardPuzzle(CLIFF, 'safe', 'noisy-greedy', 200, 5);
        expect(simulateHazardPuzzle(CLIFF, 'safe', 'noisy-greedy', 200, 5)).toBe(a);
        const r = simulateHazardPuzzle(CLIFF, 'safe', 'random', 200, 5);
        expect(simulateHazardPuzzle(CLIFF, 'safe', 'random', 200, 5)).toBe(r);
    });

    it.each(HAZARD_PUZZLE_LIBRARY.map((l) => l.id))('noisy-greedy beats random on %s', (id) => {
        const layout = getHazardPuzzleLayout(id);
        for (const route of ['safe', 'risk'] as const) {
            const random = simulateHazardPuzzle(layout, route, 'random', 300);
            const greedy = simulateHazardPuzzle(layout, route, 'noisy-greedy', 300);
            expect(greedy, `${id} ${route}`).toBeGreaterThanOrEqual(random);
        }
    });
});

describe('buildHazardPuzzleCurve (A1, A3)', () => {
    const three = HAZARD_PUZZLE_CANDIDATES.filter((c) =>
        ['cand-hard-09', 'cand-cost-medium-08', 'cand-cost-medium-07'].includes(c.id),
    );
    const curve = buildHazardPuzzleCurve(three, { plays: 50 });

    it('is a snapshot of three candidates at 50 plays', () => {
        expect(
            curve.rows.map((r) => [r.id, r.randomWins, r.noisyGreedyWins, r.winningLines]),
        ).toEqual([
            ['cand-hard-09', 7, 48, 3],
            ['cand-cost-medium-08', 0, 31, 5],
            ['cand-cost-medium-07', 0, 0, 5],
        ]);
    });

    it('is the same twice at one seed', () => {
        expect(buildHazardPuzzleCurve(three, { plays: 50 })).toEqual(curve);
    });

    it('scores the mean of the two win rates and sorts easiest first', () => {
        for (const r of curve.rows) expect(r.score).toBeCloseTo((r.randomRate + r.noisyGreedyRate) / 2, 12);
        const sorted = [...curve.rows].sort(compareHazardPuzzleCurveRows);
        expect(sorted.map((r) => r.id)).toEqual(curve.rows.map((r) => r.id));
    });

    it('breaks a score tie by more solver winning lines, then by id', () => {
        const row = (id: string, winningLines: number): HazardPuzzleCurveRow => ({
            ...curve.rows[0], id, winningLines, score: 0.5,
        });
        const rows = [row('b', 2), row('a', 2), row('c', 9)].sort(compareHazardPuzzleCurveRows);
        expect(rows.map((r) => r.id)).toEqual(['c', 'a', 'b']);
    });

    it('formats one row per candidate under a header that stamps commit, seed and plays', () => {
        const md = formatHazardPuzzleCurve(curve, 'abc1234');
        expect(md).toContain('`abc1234`');
        expect(md).toContain(`**Seed:** ${HAZARD_PUZZLE_SIM.seed}`);
        expect(md).toContain('**Plays per bot, per candidate:** 50');
        expect(md.split('\n').filter((l) => /^\| \d+ \| `cand-/.test(l))).toHaveLength(3);
    });

    it('draws the bar longer for an easier puzzle', () => {
        expect(hazardPuzzleCurveBar(1)).toBe('#'.repeat(20));
        expect(hazardPuzzleCurveBar(0)).toBe('.'.repeat(20));
        expect(hazardPuzzleCurveBar(0.5)).toBe('#'.repeat(10) + '.'.repeat(10));
    });
});

describe('the solver on the shared legal moves (A2)', () => {
    it('keeps the cliff counts: 32 winning outcomes on safe 17, 44 on risk [5, 8]', () => {
        expect(solveHazardPuzzle(CLIFF, 'safe').winningOutcomes).toBe(32);
        expect(solveHazardPuzzle(CLIFF, 'risk').winningOutcomes).toBe(44);
    });
});
