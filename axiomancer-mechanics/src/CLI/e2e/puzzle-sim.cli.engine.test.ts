/**
 * puzzle:sim (HP6a A1, A3): the committed `docs/reports/hazard-puzzle-curve.md`
 * is what the CLI writes at the default plays, apart from its commit stamp,
 * and carries one ranked row for each candidate.
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

import { HAZARD_PUZZLE_CANDIDATES } from '../../World/Hazard/puzzle/hazard-puzzle.candidates';
import { HAZARD_PUZZLE_SIM } from '../../World/Hazard/puzzle/hazard-puzzle.tuning';
import { hazardPuzzleCurveMarkdown } from '../puzzle-sim.cli';

const REPORT = path.resolve(__dirname, '../../../../docs/reports/hazard-puzzle-curve.md');

const withoutStamp = (md: string): string => md.replace(/^- \*\*Commit:\*\* .*$/m, '');

describe('puzzle:sim writes the curve report', () => {
    it('matches the committed report at the default seed and plays (run npm run puzzle:sim after a change)', () => {
        const fresh = hazardPuzzleCurveMarkdown(HAZARD_PUZZLE_SIM.plays, 'x');
        expect(withoutStamp(fs.readFileSync(REPORT, 'utf-8'))).toBe(withoutStamp(fresh));
    }, 60_000);

    it('has one ranked row for each candidate, rank 1 first', () => {
        const rows = fs.readFileSync(REPORT, 'utf-8').split('\n').filter((l) => /^\| \d+ \| `cand-/.test(l));
        expect(rows).toHaveLength(HAZARD_PUZZLE_CANDIDATES.length);
        rows.forEach((row, i) => expect(row.startsWith(`| ${i + 1} |`)).toBe(true));
    });
});
