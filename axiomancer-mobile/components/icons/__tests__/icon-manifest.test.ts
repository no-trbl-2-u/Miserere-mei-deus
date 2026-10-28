/**
 * The extraction manifest and the generated geometry agree.
 *
 * `scripts/extract-game-icons.mjs` needs the operator's local game-icons.net
 * archive, so CI never runs it. This guard reads the committed script and
 * pins its MANIFEST against `GAME_ICON_PATHS`: the same names on both sides,
 * each with the same `<artist>/<icon>` source. A typo in a manifest row, or a
 * row added without regenerating (or the reverse), fails here instead of on
 * the next regeneration. Source-level, so it is on the hermeticity audit's
 * FS allowlist.
 *
 * guard-test: pins the manifest rows #989 shipped, which already agree with the generated geometry
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

import { GAME_ICON_PATHS } from '@/components/icons/game-icon-paths';

const SCRIPT = path.join(__dirname, '..', '..', '..', 'scripts', 'extract-game-icons.mjs');

/** The MANIFEST object literal's rows, as name → source. */
function readManifest(): Record<string, string> {
    const text = fs.readFileSync(SCRIPT, 'utf8');
    const body = text.match(/const MANIFEST = \{([\s\S]*?)\n\};/)?.[1];
    if (body === undefined) throw new Error('MANIFEST not found in extract-game-icons.mjs');
    const rows = [...body.matchAll(/^\s*'([^']+)':\s*'([^']+)',\s*$/gm)];
    return Object.fromEntries(rows.map((m) => [m[1], m[2]]));
}

describe('icon manifest vs generated geometry', () => {
    const manifest = readManifest();
    const generated = GAME_ICON_PATHS as Record<string, { source: string }>;

    it('the manifest parses to rows (the checks below are not vacuous)', () => {
        expect(Object.keys(manifest).length).toBeGreaterThan(0);
    });

    it('names the same icons as the generated file', () => {
        expect(Object.keys(manifest).sort()).toEqual(Object.keys(generated).sort());
    });

    it.each(Object.entries(readManifest()))('%s: manifest source matches the generated source', (name, source) => {
        expect(source).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+$/);
        expect(generated[name]?.source).toBe(source);
    });
});
