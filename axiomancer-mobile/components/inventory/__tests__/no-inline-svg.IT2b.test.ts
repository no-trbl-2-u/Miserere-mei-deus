/**
 * No inline one-off icons under `components/inventory/` (phase IT2b).
 *
 * The icon registry's rule is "never inline a new one-off `<Svg>` icon in a
 * component". This reads the committed inventory components and proves the
 * only `<Svg` left is the material glyph's in `ItemCard.tsx` (gathering
 * nodes are gone, so no material drops; T, 2026-10-30: it gets its own icon
 * when a material returns). Source-level, so it is on the hermeticity
 * audit's FS allowlist.
 *
 * guard-test: pins a source fact (the drawings were deleted), unprovable by rendering
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(__dirname, '..');

const SOURCES = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));

describe('inventory components draw no inline Svg but the material glyph', () => {
    it('finds the component sources (the checks below are not vacuous)', () => {
        expect(SOURCES).toContain('ItemCard.tsx');
        expect(SOURCES).toContain('ItemGrid.tsx');
    });

    it.each(SOURCES.filter((f) => f !== 'ItemCard.tsx'))('%s has no <Svg', (file) => {
        expect(fs.readFileSync(path.join(DIR, file), 'utf8')).not.toMatch(/<Svg\b/);
    });

    it('ItemCard.tsx has exactly one <Svg, the material glyph', () => {
        const text = fs.readFileSync(path.join(DIR, 'ItemCard.tsx'), 'utf8');
        expect(text.match(/<Svg\b/g)).toHaveLength(1);
        expect(text).toContain('Material item icon');
    });
});
