/**
 * Hazard puzzle chapter pick (HP6b A4, A5): the rule on synthetic curves
 * (ties, window edges, n of 1 and 6, strict ordering) and the Breakwater
 * table matching the rule at the pinned seed and plays.
 */

import { describe, expect, it } from 'vitest';

import { BREAKWATER_HAZARD_NODES, BREAKWATER_HAZARD_PUZZLES } from '../../../Continents/Coastal-Village/breakwater-puzzles';
import { breakwaterChapter } from '../../../Continents/Coastal-Village/breakwater-chapter';
import { BREAKWATER_CHAPTER_KINDS } from '../../../MapEvents/content';
import { HAZARD_PUZZLE_CANDIDATES, getHazardPuzzleCandidate } from '../hazard-puzzle.candidates';
import { hazardPuzzleMiddleThird, hazardPuzzlePickRanks, pickChapterHazardPuzzles } from '../hazard-puzzle.pick';
import { buildHazardPuzzleCurve, type HazardPuzzleCurveRow } from '../hazard-puzzle.sim';
import { HAZARD_PUZZLE_SIM } from '../hazard-puzzle.tuning';

function row(id: string, score: number, winningLines = 1): HazardPuzzleCurveRow {
    return {
        id, label: id, intendedBand: 'hard', route: 'safe', goal: 10, plays: 1,
        randomWins: 0, noisyGreedyWins: 0, randomRate: 0, noisyGreedyRate: 0,
        score, winningLines, firstPlayShare: 0,
    };
}

/** A synthetic curve of `count` rows; `c01` is the easiest. Fed in shuffled order. */
function synthetic(count: number): { rows: HazardPuzzleCurveRow[] } {
    const rows = Array.from({ length: count }, (_, i) =>
        row(`c${String(i + 1).padStart(2, '0')}`, 1 - i / count));
    return { rows: [...rows].reverse() };
}

const nodes = (n: number): string[] => Array.from({ length: n }, (_, i) => `n${i + 1}`);

describe('pickChapterHazardPuzzles (A4)', () => {
    it('takes ranks 11, 13, 15, 16, 18, 20 of 30 for six nodes', () => {
        const picks = pickChapterHazardPuzzles(synthetic(30), nodes(6));
        expect(picks.map((p) => p.rank)).toEqual([11, 13, 15, 16, 18, 20]);
        expect(picks.map((p) => p.candidateId)).toEqual(['c11', 'c13', 'c15', 'c16', 'c18', 'c20']);
        expect(picks.map((p) => p.nodeId)).toEqual(nodes(6));
    });

    it('window edges: ranks 11 and 20 for the middle third of 30', () => {
        expect(hazardPuzzleMiddleThird(30)).toEqual({ lo: 11, hi: 20 });
        expect(hazardPuzzleMiddleThird(9)).toEqual({ lo: 4, hi: 6 });
        expect(hazardPuzzleMiddleThird(10)).toEqual({ lo: 4, hi: 7 });
        const ranks = hazardPuzzlePickRanks(6, 11, 20);
        expect(ranks[0]).toBe(11);
        expect(ranks[5]).toBe(20);
    });

    it('one node takes the middle of the window, none takes nothing', () => {
        expect(pickChapterHazardPuzzles(synthetic(30), nodes(1)).map((p) => p.rank)).toEqual([16]);
        expect(pickChapterHazardPuzzles(synthetic(30), [])).toEqual([]);
    });

    it('never returns a rank from the easiest or hardest third, and ranks strictly rise', () => {
        for (const total of [9, 12, 30, 31, 45]) {
            const { lo, hi } = hazardPuzzleMiddleThird(total);
            for (let n = 1; n <= hi - lo + 1; n += 1) {
                const ranks = pickChapterHazardPuzzles(synthetic(total), nodes(n)).map((p) => p.rank);
                ranks.forEach((r) => {
                    expect(r).toBeGreaterThanOrEqual(lo);
                    expect(r).toBeLessThanOrEqual(hi);
                });
                for (let i = 1; i < ranks.length; i += 1) expect(ranks[i]!).toBeGreaterThan(ranks[i - 1]!);
            }
        }
    });

    it('throws when the window cannot hold the nodes', () => {
        expect(() => pickChapterHazardPuzzles(synthetic(9), nodes(4))).toThrow();
    });

    it('ranks ties by more solver winning lines, then id', () => {
        const rows = Array.from({ length: 9 }, (_, i) => row(`t${i}`, 0.5, 1));
        rows[4] = row('t4', 0.5, 9); // the most lines: rank 1 among the ties
        const picks = pickChapterHazardPuzzles({ rows }, nodes(3));
        // ranked: t4, t0, t1, t2, t3, t5, t6, t7, t8; the window is ranks 4-6.
        expect(picks.map((p) => p.candidateId)).toEqual(['t2', 't3', 't5']);
        expect(pickChapterHazardPuzzles({ rows: [...rows].reverse() }, nodes(3)).map((p) => p.candidateId))
            .toEqual(['t2', 't3', 't5']);
    });
});

describe('BREAKWATER_HAZARD_PUZZLES (A5)', () => {
    it('matches the rule at the pinned seed and plays', () => {
        const curve = buildHazardPuzzleCurve(HAZARD_PUZZLE_CANDIDATES, { seed: HAZARD_PUZZLE_SIM.seed, plays: HAZARD_PUZZLE_SIM.plays });
        const picks = pickChapterHazardPuzzles(curve, BREAKWATER_HAZARD_NODES);
        expect(Object.fromEntries(picks.map((p) => [p.nodeId, p.candidateId]))).toEqual(BREAKWATER_HAZARD_PUZZLES);
        expect(picks.map((p) => p.rank)).toEqual([11, 13, 15, 16, 18, 20]);
    }, 60_000);

    it('names a real candidate for each of the six hazard nodes, with no repeats', () => {
        expect(Object.keys(BREAKWATER_HAZARD_PUZZLES)).toEqual([...BREAKWATER_HAZARD_NODES]);
        const ids = Object.values(BREAKWATER_HAZARD_PUZZLES);
        expect(new Set(ids).size).toBe(6);
        ids.forEach((id) => expect(getHazardPuzzleCandidate(id), id).toBeDefined());
    });

    it('lists the chapter\'s hazard nodes in story order: the wreck, then depth, ties by lane', () => {
        const hazards = Object.entries(BREAKWATER_CHAPTER_KINDS).filter(([, v]) => v.kind === 'hazard').map(([id]) => id);
        expect([...hazards].sort()).toEqual([...BREAKWATER_HAZARD_NODES].sort());
        const at = (id: string): [number, number] => breakwaterChapter.nodes.find((n) => n.id === id)!.location as [number, number];
        expect(BREAKWATER_HAZARD_NODES[0]).toBe('bw-h4');
        const rest = BREAKWATER_HAZARD_NODES.slice(1);
        const sorted = [...rest].sort((a, b) => at(a)[0] - at(b)[0] || at(a)[1] - at(b)[1]);
        expect(rest).toEqual(sorted);
    });
});
