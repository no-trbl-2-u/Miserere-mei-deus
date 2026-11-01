/**
 * Hazard puzzle — picking a chapter's puzzles off the curve (HP6b).
 *
 * `pickChapterHazardPuzzles` takes the middle third of the ranked curve
 * (ranks 11-20 of 30), picks `n` evenly spaced ranks from it and hands them
 * out in node order, so each node's puzzle ranks strictly harder than the one
 * before. The easiest and hardest thirds are never picked.
 */

import { compareHazardPuzzleCurveRows, type HazardPuzzleCurve, type HazardPuzzleCurveRow } from './hazard-puzzle.sim';

/** One node's pick. `rank` is 1-based, 1 the easiest. */
export interface HazardPuzzlePick {
    nodeId: string;
    candidateId: string;
    rank: number;
    row: HazardPuzzleCurveRow;
}

/** The 1-based rank window of the middle third: [lo, hi] inclusive. */
export function hazardPuzzleMiddleThird(total: number): { lo: number; hi: number } {
    const third = Math.floor(total / 3);
    return { lo: third + 1, hi: total - third };
}

/** The `n` evenly spaced ranks of a window; one node takes the window's middle. */
export function hazardPuzzlePickRanks(n: number, lo: number, hi: number): number[] {
    if (n < 1) return [];
    if (n === 1) return [Math.round((lo + hi) / 2)];
    const ranks: number[] = [];
    for (let i = 0; i < n; i += 1) ranks.push(Math.round(lo + (i * (hi - lo)) / (n - 1)));
    return ranks;
}

/**
 * Ranks the curve (higher score first, then more solver winning lines, then
 * id), takes its middle third and assigns `n` evenly spaced ranks to
 * `nodesInOrder`. Throws when the window cannot hold `n` distinct ranks.
 */
export function pickChapterHazardPuzzles(
    curve: Pick<HazardPuzzleCurve, 'rows'>,
    nodesInOrder: readonly string[],
): HazardPuzzlePick[] {
    const ranked = [...curve.rows].sort(compareHazardPuzzleCurveRows);
    const { lo, hi } = hazardPuzzleMiddleThird(ranked.length);
    const n = nodesInOrder.length;
    if (n > hi - lo + 1) throw new Error(`cannot pick ${n} puzzles from ranks ${lo}-${hi} of ${ranked.length}`);
    return hazardPuzzlePickRanks(n, lo, hi).map((rank, i) => ({
        nodeId: nodesInOrder[i]!,
        candidateId: ranked[rank - 1]!.id,
        rank,
        row: ranked[rank - 1]!,
    }));
}
