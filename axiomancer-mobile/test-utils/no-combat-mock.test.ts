/**
 * CT1b: combat tests start from a real fight. The test-only mock foe
 * (`state/mocks/combat.mock.ts`) is deleted; this guard fails if any source
 * or test file names that module again, by alias or relative path, in an
 * import, a `require` or a `jest.mock`. A test that needs a fight calls
 * `startRealFight` (`test-utils/realFight.ts`) instead.
 *
 * Same committed-source scan as `lib/platform/__tests__/boundary.test.ts`.
 */

import { describe, expect, it } from '@jest/globals';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import * as path from 'path';

const MOBILE_ROOT = path.resolve(__dirname, '..');

const SCAN_DIRS = ['app', 'components', 'hooks', 'lib', 'state', 'test-utils'];

/** A quoted module specifier ending in `mocks/combat.mock`, with or without an extension. */
const MOCK_SPECIFIER = /['"`][^'"`]*mocks\/combat\.mock(?:\.tsx?)?['"`]/;

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (/\.(ts|tsx|js|jsx)$/.test(entry)) out.push(full);
    }
    return out;
}

function stripComments(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('the combat mock stays deleted', () => {
    it('the module file is gone', () => {
        expect(existsSync(path.join(MOBILE_ROOT, 'state', 'mocks', 'combat.mock.ts'))).toBe(false);
    });

    it('the pattern catches every way of naming it', () => {
        for (const line of [
            "import { createMockEncounterEnemy } from '@/state/mocks/combat.mock';",
            "import { createMockEncounterEnemy } from '../../mocks/combat.mock';",
            'jest.mock("@/state/mocks/combat.mock.ts");',
        ]) {
            expect(MOCK_SPECIFIER.test(line)).toBe(true);
        }
    });

    it('no file imports state/mocks/combat.mock', () => {
        const offenders = SCAN_DIRS.flatMap((d) => walk(path.join(MOBILE_ROOT, d)))
            // This file's own samples name the module on purpose.
            .filter((f) => f !== __filename)
            .filter((f) => MOCK_SPECIFIER.test(stripComments(readFileSync(f, 'utf8'))))
            .map((f) => path.relative(MOBILE_ROOT, f));
        expect(offenders).toEqual([]);
    });
});
