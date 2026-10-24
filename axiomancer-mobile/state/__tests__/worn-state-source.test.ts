/**
 * Worn state has one record: `player.equipment` (phase EQ1a, A1).
 *
 * The engine's `wornPerSlot` / `isEquippedFirstOfSlot` / `findEquippedInSlot`
 * read "worn" off inventory order, which cannot say "carried but not worn"
 * and so disagreed with the loadout combat reads. No mobile screen,
 * presenter or action may import them; `state/presenters/loadout.ts` reads
 * the loadout instead.
 * Reads committed sources, allowlisted in the hermeticity guard.
 */

import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'fs';
import * as path from 'path';

const MOBILE_ROOT = path.resolve(__dirname, '..', '..');
const SCAN_DIRS = ['state', 'app'];
const BANNED = ['wornPerSlot', 'isEquippedFirstOfSlot', 'findEquippedInSlot'];

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) {
            if (entry === '__tests__') continue;
            walk(full, out);
        } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
            out.push(full);
        }
    }
    return out;
}

/** The names each `import { … } from '…'` statement brings in. */
function importedNames(text: string): string[] {
    const names: string[] = [];
    for (const m of text.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*'[^']+'/g)) {
        for (const part of m[1]!.split(',')) {
            const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]!.trim();
            if (name !== '') names.push(name);
        }
    }
    return names;
}

describe('worn state is read from player.equipment (EQ1 A1)', () => {
    const files = SCAN_DIRS.flatMap((d) => walk(path.join(MOBILE_ROOT, d)));

    it('scans the mobile state and app sources', () => {
        expect(files.length).toBeGreaterThan(50);
        expect(files.some((f) => f.endsWith(path.join('state', 'presenters', 'loadout.ts')))).toBe(true);
    });

    it('no non-test file under state/ or app/ imports the inventory-order worn convention', () => {
        const offenders = files.flatMap((f) => {
            const names = importedNames(readFileSync(f, 'utf8'));
            return BANNED.filter((b) => names.includes(b)).map(
                (b) => `${path.relative(MOBILE_ROOT, f)} imports ${b}`,
            );
        });
        expect(offenders).toEqual([]);
    });

    it('the import reader sees an aliased, multi-line import', () => {
        const sample = "import {\n    foo,\n    wornPerSlot as w,\n} from '@mechanics';";
        expect(importedNames(sample)).toContain('wornPerSlot');
    });
});
