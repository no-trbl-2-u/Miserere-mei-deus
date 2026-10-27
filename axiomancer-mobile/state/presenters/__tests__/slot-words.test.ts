/**
 * EQ2b A7: the slot is called Weapon, Armor, Relic on every screen. No
 * "Trinket" or "Accessory" appears in a player-visible string (a quoted
 * literal or JSX text) under presenters, components or app, outside tests.
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const DIRS = ['state/presenters', 'components', 'app'];
const BARRED = /trinket|accessor(y|ies)/i;

function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
            out.push(...sourceFiles(full));
        } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
            out.push(full);
        }
    }
    return out;
}

/** String literals and JSX text on non-comment lines. */
function visibleStrings(source: string): string[] {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const found: string[] = [];
    for (const m of code.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)) {
        found.push(m[1] ?? m[2] ?? m[3] ?? '');
    }
    for (const m of code.matchAll(/>([^<>{}\n]+)</g)) found.push(m[1]);
    return found;
}

describe('slot words', () => {
    const files = DIRS.flatMap((d) => sourceFiles(path.join(ROOT, d)));

    it('scans real files', () => {
        expect(files.length).toBeGreaterThan(50);
    });

    it('bars "Trinket" and "Accessory" from every player-visible string', () => {
        const offenders: string[] = [];
        for (const file of files) {
            for (const s of visibleStrings(fs.readFileSync(file, 'utf8'))) {
                if (BARRED.test(s)) offenders.push(`${path.relative(ROOT, file)}: ${s}`);
            }
        }
        expect(offenders).toEqual([]);
    });
});
