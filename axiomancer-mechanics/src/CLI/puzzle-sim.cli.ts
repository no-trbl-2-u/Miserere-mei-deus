/**
 * Puzzle-sim CLI — plays every `HAZARD_PUZZLE_CANDIDATES` entry on its graded
 * route with two seeded bots and writes the ranked difficulty curve to
 * `docs/reports/hazard-puzzle-curve.md` (phase HP6a). The same seed gives the
 * same numbers.
 *
 * Usage:
 *   npm run puzzle:sim -w axiomancer-mechanics
 *   npm run puzzle:sim -w axiomancer-mechanics -- --plays 200
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { formatBreakwaterHazardPuzzles } from '../World/Continents/Coastal-Village/breakwater-puzzles';
import { HAZARD_PUZZLE_CANDIDATES } from '../World/Hazard/puzzle/hazard-puzzle.candidates';
import { formatHazardPuzzleCurve } from '../World/Hazard/puzzle/hazard-puzzle.curve-report';
import { buildHazardPuzzleCurve } from '../World/Hazard/puzzle/hazard-puzzle.sim';
import { HAZARD_PUZZLE_SIM } from '../World/Hazard/puzzle/hazard-puzzle.tuning';

const REPORT_PATH = path.resolve(__dirname, '..', '..', '..', 'docs', 'reports', 'hazard-puzzle-curve.md');

function playsFromArgs(argv: readonly string[]): number {
    const i = argv.indexOf('--plays');
    if (i < 0) return HAZARD_PUZZLE_SIM.plays;
    const n = Number(argv[i + 1]);
    if (!Number.isInteger(n) || n < 1) throw new Error(`--plays needs a whole number of at least 1, got "${argv[i + 1]}"`);
    return n;
}

function headCommit(): string {
    try {
        return execSync('git rev-parse --short HEAD', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
        return 'unknown';
    }
}

/** The report's markdown at `plays` plays per bot; `commit` is the stamp. */
export function hazardPuzzleCurveMarkdown(plays: number, commit: string): string {
    const curve = buildHazardPuzzleCurve(HAZARD_PUZZLE_CANDIDATES, { plays });
    return `${formatHazardPuzzleCurve(curve, commit)}\n${formatBreakwaterHazardPuzzles(curve)}`;
}

if (require.main === module) {
    fs.writeFileSync(REPORT_PATH, hazardPuzzleCurveMarkdown(playsFromArgs(process.argv.slice(2)), headCommit()), 'utf-8');
    process.stdout.write(`wrote ${path.relative(process.cwd(), REPORT_PATH)}\n`);
}
