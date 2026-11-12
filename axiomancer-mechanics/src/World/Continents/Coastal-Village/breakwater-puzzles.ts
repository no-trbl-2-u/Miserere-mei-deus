/**
 * The Breakwater's seven hazard nodes and the puzzle each plays (HP6b).
 *
 * Six of them are the output of `pickChapterHazardPuzzles` on the committed
 * curve (`docs/reports/hazard-puzzle-curve.md`, seed and plays pinned by
 * `HAZARD_PUZZLE_SIM`); the seventh, the clifftop chapel, is pinned to a
 * rank of that curve (`BREAKWATER_PINNED_HAZARD_RANKS`). `BREAKWATER_HAZARD_PUZZLES`
 * maps node id to candidate id. A test re-runs the sim and the rule and fails
 * if this drifts; re-run `npm run puzzle:sim` and copy the report's
 * seven-node table here.
 */

import { hazardPuzzleCurveBar } from '../../Hazard/puzzle/hazard-puzzle.curve-report';
import { pickChapterHazardPuzzles, type HazardPuzzlePick } from '../../Hazard/puzzle/hazard-puzzle.pick';
import { compareHazardPuzzleCurveRows, type HazardPuzzleCurve } from '../../Hazard/puzzle/hazard-puzzle.sim';
import { BREAKWATER_CHAPTER_KINDS } from '../../MapEvents/content';

/**
 * The six hazard nodes the curve rule picks for, in story order: the wreck
 * first (every run clears it), then by depth from the windmill, ties (River
 * meadow and Foothills, both depth 3) by lane.
 */
export const BREAKWATER_CURVE_HAZARD_NODES = ['bw-h4', 'bw-m2', 'bw-p1', 'bw-m4', 'bw-t5', 'bw-d4'] as const;

/**
 * Hazard nodes pinned to one 1-based rank of the curve instead of the rule,
 * so adding them does not move the six. The clifftop chapel takes rank 19, the
 * middle third's free rank between the back lanes (18) and the tower
 * switchbacks (20), the two it sits between by depth. A placeholder pick
 * until T chooses the chapel's puzzle.
 */
export const BREAKWATER_PINNED_HAZARD_RANKS: Readonly<Record<string, number>> = Object.freeze({
    'bw-l2': 19,
});

/** All seven hazard nodes in story order (the wreck, then depth, ties by lane). */
export const BREAKWATER_HAZARD_NODES = ['bw-h4', 'bw-m2', 'bw-p1', 'bw-m4', 'bw-t5', 'bw-l2', 'bw-d4'] as const;

/** Node id to the candidate id it plays. One puzzle per hazard, on its graded route. */
export const BREAKWATER_HAZARD_PUZZLES: Readonly<Record<string, string>> = Object.freeze({
    'bw-h4': 'cand-cost-hard-10',
    'bw-m2': 'cand-hard-08',
    'bw-p1': 'cand-cost-hard-08',
    'bw-m4': 'cand-cost-medium-09',
    'bw-t5': 'cand-hard-10',
    'bw-l2': 'cand-cost-hard-06',
    'bw-d4': 'cand-cost-medium-01',
});

/**
 * The seven picks in story order: the rule's six, plus each pinned node at
 * its pinned rank of the same ranking.
 */
export function pickBreakwaterHazardPuzzles(curve: Pick<HazardPuzzleCurve, 'rows'>): HazardPuzzlePick[] {
    const picked = new Map(pickChapterHazardPuzzles(curve, BREAKWATER_CURVE_HAZARD_NODES).map((p) => [p.nodeId, p]));
    const ranked = [...curve.rows].sort(compareHazardPuzzleCurveRows);
    for (const [nodeId, rank] of Object.entries(BREAKWATER_PINNED_HAZARD_RANKS)) {
        const row = ranked[rank - 1];
        if (!row) throw new Error(`breakwater: ${nodeId} is pinned to rank ${rank} of ${ranked.length}`);
        picked.set(nodeId, { nodeId, candidateId: row.id, rank, row });
    }
    return BREAKWATER_HAZARD_NODES.map((nodeId) => {
        const pick = picked.get(nodeId);
        if (!pick) throw new Error(`breakwater: hazard ${nodeId} has no pick`);
        return pick;
    });
}

/** The report's seven-node section: written by the CLI, never by hand. */
export function formatBreakwaterHazardPuzzles(curve: HazardPuzzleCurve): string {
    const picks = pickBreakwaterHazardPuzzles(curve);
    return [
        '## The Breakwater seven',
        '',
        'Phase HP6b. `pickChapterHazardPuzzles` takes the middle third of the ranking (ranks 11-20 of 30), picks six',
        'evenly spaced ranks and gives them to the six curve hazard nodes in story order, so each is harder than the one',
        'before. The clifftop chapel (`bw-l2`) is pinned to a free rank of the same third (`BREAKWATER_PINNED_HAZARD_RANKS`),',
        'a placeholder until T picks its puzzle. `BREAKWATER_HAZARD_PUZZLES` holds this table; a test fails if the two drift.',
        '',
        '| order | node | place | candidate | label | rank | score | curve |',
        '|---|---|---|---|---|---|---|---|',
        ...picks.map((p, i) => `| ${i + 1} | \`${p.nodeId}\` | ${BREAKWATER_CHAPTER_KINDS[p.nodeId]?.place ?? p.nodeId} | `
            + `\`${p.candidateId}\` | ${p.row.label} | ${p.rank}${p.nodeId in BREAKWATER_PINNED_HAZARD_RANKS ? ' (pinned)' : ''} | `
            + `${(p.row.score * 100).toFixed(1)}% | \`${hazardPuzzleCurveBar(p.row.score)}\` |`),
        '',
    ].join('\n');
}
