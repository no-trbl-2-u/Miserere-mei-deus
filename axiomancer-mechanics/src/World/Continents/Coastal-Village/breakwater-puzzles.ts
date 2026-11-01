/**
 * The Breakwater's six hazard nodes and the puzzle each plays (HP6b).
 *
 * `BREAKWATER_HAZARD_PUZZLES` is the output of `pickChapterHazardPuzzles` on
 * the committed curve (`docs/reports/hazard-puzzle-curve.md`, seed and plays
 * pinned by `HAZARD_PUZZLE_SIM`): node id to candidate id. A test re-runs the
 * sim and the rule and fails if this drifts; re-run `npm run puzzle:sim`
 * and copy the report's six-node table here.
 */

import { hazardPuzzleCurveBar } from '../../Hazard/puzzle/hazard-puzzle.curve-report';
import { pickChapterHazardPuzzles } from '../../Hazard/puzzle/hazard-puzzle.pick';
import type { HazardPuzzleCurve } from '../../Hazard/puzzle/hazard-puzzle.sim';
import { BREAKWATER_CHAPTER_KINDS } from '../../MapEvents/content';

/**
 * The six hazard nodes in story order: the wreck first (every run clears
 * it), then by depth from the windmill, ties (River meadow and Foothills,
 * both depth 3) by lane.
 */
export const BREAKWATER_HAZARD_NODES = ['bw-h4', 'bw-m2', 'bw-p1', 'bw-m4', 'bw-t5', 'bw-d4'] as const;

/** Node id to the candidate id it plays. One puzzle per hazard, on its graded route. */
export const BREAKWATER_HAZARD_PUZZLES: Readonly<Record<string, string>> = Object.freeze({
    'bw-h4': 'cand-cost-hard-10',
    'bw-m2': 'cand-hard-08',
    'bw-p1': 'cand-cost-hard-08',
    'bw-m4': 'cand-cost-medium-09',
    'bw-t5': 'cand-hard-10',
    'bw-d4': 'cand-cost-medium-01',
});

/** The report's six-node section: written by the CLI, never by hand. */
export function formatBreakwaterHazardPuzzles(curve: HazardPuzzleCurve): string {
    const picks = pickChapterHazardPuzzles(curve, BREAKWATER_HAZARD_NODES);
    return [
        '## The Breakwater six',
        '',
        'Phase HP6b. `pickChapterHazardPuzzles` takes the middle third of the ranking (ranks 11-20 of 30), picks six',
        'evenly spaced ranks and gives them to the six hazard nodes in story order, so each is harder than the one',
        'before. `BREAKWATER_HAZARD_PUZZLES` holds this table; a test fails if the two drift.',
        '',
        '| order | node | place | candidate | label | rank | score | curve |',
        '|---|---|---|---|---|---|---|---|',
        ...picks.map((p, i) => `| ${i + 1} | \`${p.nodeId}\` | ${BREAKWATER_CHAPTER_KINDS[p.nodeId]?.place ?? p.nodeId} | `
            + `\`${p.candidateId}\` | ${p.row.label} | ${p.rank} | ${(p.row.score * 100).toFixed(1)}% | `
            + `\`${hazardPuzzleCurveBar(p.row.score)}\` |`),
        '',
    ].join('\n');
}
