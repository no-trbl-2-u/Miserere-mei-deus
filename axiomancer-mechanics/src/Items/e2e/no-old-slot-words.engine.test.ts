/**
 * Guard — the old name of the relic slot is gone from the code.
 *
 * The third slot kind is `relic`. Its old name (the `'accessory'` slot
 * literal, the loadout row `accessories`, the `accessoryKind` field and the
 * `AccessoryKind` union) may appear only where old saves are read:
 * `Game/game.migrate.ts` and `Game/legacy-slots.ts`. Tests are exempt (they
 * build old saves on purpose).
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const ROOTS = ['axiomancer-mechanics/src', 'axiomancer-mobile'];
const ALLOWED = new Set([
    'axiomancer-mechanics/src/Game/game.migrate.ts',
    'axiomancer-mechanics/src/Game/legacy-slots.ts',
]);
const SKIP_DIRS = new Set([
    'node_modules', '__tests__', 'dist', 'build', 'web-build', 'coverage', '.expo', 'android', 'ios', 'assets',
]);
const CODE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const OLD_WORDS = /\baccessoryKind\b|\bAccessoryKind\b|\baccessories\b|'accessory'|"accessory"/;

function walk(dir: string, out: string[]): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) walk(path.join(dir, entry.name), out);
        } else if (CODE.test(entry.name) && !/\.test\./.test(entry.name)) {
            out.push(path.join(dir, entry.name));
        }
    }
}

describe('the old relic-slot words', () => {
    it('appear in no code outside the save migration', () => {
        const files: string[] = [];
        for (const root of ROOTS) walk(path.join(REPO, root), files);
        expect(files.length).toBeGreaterThan(100);

        const offenders: string[] = [];
        for (const file of files) {
            const rel = path.relative(REPO, file).split(path.sep).join('/');
            if (ALLOWED.has(rel)) continue;
            const text = fs.readFileSync(file, 'utf8');
            if (!OLD_WORDS.test(text)) continue;
            text.split(/\r?\n/).forEach((line, i) => {
                if (OLD_WORDS.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
            });
        }
        expect(offenders).toEqual([]);
    }, 60_000);
});
