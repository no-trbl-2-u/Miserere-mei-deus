/**
 * The catalog build script carries a copy of the mobile glyph table, one
 * renderer per runtime. Nothing else compares them, so a word drawn in one and
 * not the other ships quietly.
 *
 * guard-test: both tables agree on the base too, so the comparison holds
 * regardless of this chunk; the SHOCK and UNBROKEN assertions pin the change.
 */
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

import { GLYPH_SHAPES } from '../glyphShapes';

const script = readFileSync(join(__dirname, '../../../../scripts/build-catalog.mjs'), 'utf8');

/** `const SHAPE_X = { d: "...", eo: true };` as name to path and evenodd. */
function catalogShapes(): Map<string, { d: string; evenodd: boolean }> {
    const shapes = new Map<string, { d: string; evenodd: boolean }>();
    for (const m of script.matchAll(/^const (SHAPE_\w+) = \{ d: "([^"]+)"(, eo: true)? \};$/gm)) {
        shapes.set(m[1]!, { d: m[2]!, evenodd: m[3] !== undefined });
    }
    return shapes;
}

/** The `GLYPH_SHAPES` table in the build script, as keyword to shape name. */
function catalogTable(): Map<string, string> {
    const body = /const GLYPH_SHAPES = \{\n([\s\S]*?)\n\};/.exec(script)?.[1] ?? '';
    return new Map(body.split('\n').map((l) => {
        const [key, value] = l.trim().replace(/,$/, '').split(/:\s*/);
        return [key!, value!] as const;
    }));
}

describe('the catalog glyph table matches the mobile table', () => {
    it('finds the build script\'s tables', () => {
        expect(catalogShapes().size).toBeGreaterThan(20);
        expect(catalogTable().size).toBeGreaterThan(20);
    });

    it('names the same keywords', () => {
        expect([...catalogTable().keys()].sort()).toEqual(Object.keys(GLYPH_SHAPES).sort());
    });

    it('draws every keyword with the same path', () => {
        const shapes = catalogShapes();
        for (const [keyword, shapeName] of catalogTable()) {
            const mobile = GLYPH_SHAPES[keyword]!;
            expect({ keyword, ...shapes.get(shapeName) }).toEqual({ keyword, d: mobile.d, evenodd: mobile.evenodd === true });
        }
    });

    it('carries SHOCK and UNBROKEN', () => {
        expect([...catalogTable().keys()]).toEqual(expect.arrayContaining(['SHOCK', 'UNBROKEN']));
    });
});
