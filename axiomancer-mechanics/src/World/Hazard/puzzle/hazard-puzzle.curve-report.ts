/**
 * Hazard puzzle — the difficulty curve as markdown (HP6a).
 *
 * `docs/reports/hazard-puzzle-curve.md` is written by `npm run puzzle:sim`
 * from this and never edited by hand.
 */

import type { HazardPuzzleCurve, HazardPuzzleCurveRow } from './hazard-puzzle.sim';

const BAR_WIDTH = 20;

function pct(n: number): string {
    return `${(n * 100).toFixed(1)}%`;
}

/** A text bar of a 0 to 1 score: longer is easier. */
export function hazardPuzzleCurveBar(score: number): string {
    const filled = Math.round(Math.min(1, Math.max(0, score)) * BAR_WIDTH);
    return '#'.repeat(filled) + '.'.repeat(BAR_WIDTH - filled);
}

function goalLabel(row: HazardPuzzleCurveRow): string {
    return Array.isArray(row.goal) ? `${row.route} ${row.goal[0]}F + ${row.goal[1]}E` : `${row.route} ${row.goal}`;
}

function rowLine(row: HazardPuzzleCurveRow, rank: number): string {
    return [
        rank,
        `\`${row.id}\``,
        row.label,
        row.intendedBand,
        goalLabel(row),
        pct(row.randomRate),
        pct(row.noisyGreedyRate),
        pct(row.score),
        `\`${hazardPuzzleCurveBar(row.score)}\``,
        row.winningLines,
        pct(row.firstPlayShare),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |');
}

/** The curve's markdown. `commit` is the short hash the sim ran at. */
export function formatHazardPuzzleCurve(curve: HazardPuzzleCurve, commit: string): string {
    return [
        '# Hazard puzzle difficulty curve',
        '',
        'Written by `npm run puzzle:sim -w axiomancer-mechanics` (phase HP6a). Do not edit by hand; re-run the script.',
        '',
        `- **Commit:** \`${commit}\``,
        `- **Seed:** ${curve.seed}`,
        `- **Plays per bot, per candidate:** ${curve.plays}`,
        `- **Candidates:** ${curve.rows.length}, each played on its graded route with no unlock.`,
        '',
        'Two seeded bots play each candidate through the session\'s move functions. `random` picks uniformly',
        'among the legal moves and confirm. `noisy-greedy` picks the move that leaves the smallest shortfall to',
        'the goal (a move and its best single follow-up, such as a stage and its power, count as one placement),',
        'confirms when no move shrinks it, and plays a random legal move 15% of the time. The score is the mean',
        'of the two win rates: higher is easier. Rank 1 is the easiest. Ties go to more solver winning lines,',
        'then to id. The solver columns are an exhaustive cross-check and are not in the score. This is a rough',
        'measurement (D57), not a gated baseline, and not calibrated against human solve times.',
        '',
        '| rank | id | label | intended | route goal | random | noisy-greedy | score | curve | solver lines | first plays that win |',
        '|---|---|---|---|---|---|---|---|---|---|---|',
        ...curve.rows.map((row, i) => rowLine(row, i + 1)),
        '',
    ].join('\n');
}
