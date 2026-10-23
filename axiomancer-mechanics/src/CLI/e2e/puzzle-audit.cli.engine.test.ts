/**
 * The committed card audit (HP2 A1) is what `npm run puzzle:audit` writes
 * from the current deck, library and pool. A change to any of them without a
 * re-run fails here.
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

import { hazardPuzzleCardAuditMarkdown } from '../puzzle-audit.cli';

const REPORT = path.resolve(__dirname, '../../../../docs/reports/hazard-puzzle-card-audit.md');

// Each case renders the whole audit (about 3s alone); a loaded full verify pushed one past the 5s default.
const AUDIT_TIMEOUT_MS = 30_000;

describe('puzzle:audit', () => {
    it('the committed report is current (re-run `npm run puzzle:audit -w axiomancer-mechanics`)', () => {
        expect(fs.readFileSync(REPORT, 'utf-8')).toBe(hazardPuzzleCardAuditMarkdown());
    }, AUDIT_TIMEOUT_MS);

    it('lists every deck card plus CRACK, each with a keep or cut', () => {
        const rows = hazardPuzzleCardAuditMarkdown().split('\n').filter((l) => /^\| .+ \(`[a-z-]+`\) \|/.test(l));
        expect(rows).toHaveLength(16);
        for (const row of rows) expect(row).toMatch(/\| (keep|cut): [^|]+ \|$/);
    }, AUDIT_TIMEOUT_MS);
});
