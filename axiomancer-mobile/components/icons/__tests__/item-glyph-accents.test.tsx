/**
 * Hermetic tests — item icon colour accents (IT1b), after EQ3k.
 *
 * The accent mechanism stays (an item with no sprite yet can wear a registry
 * icon and colour accents), but T's sheets now draw every item, so the
 * production tables are empty. Pins: the production tables are empty and a
 * miss gives no accents; every clip shape of a fixture row sits inside the
 * 512-unit icon space; each hue resolves to its documented colour (blood
 * follows the theme, the weather hues are fixed); an accented icon draws one
 * accent layer per row entry, and an accent-free icon draws none.
 */

import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import { AxmIcon } from '@/components/icons';
import { accentHueColor, accentShapePath } from '@/components/icons/AxmIcon';
import { ITEM_GLYPH_ACCENTS, ITEM_GLYPH_BY_ID, getItemGlyphAccents, type ItemGlyphAccentTable } from '@/components/icons/item-glyphs';
import type { AccentShape, IconAccent } from '@/components/icons/icon-registry';
import { HUE } from '@/theme/axm';
import { withAllProviders } from '@/test-utils/withAllProviders';

/** Two rows in the shape the retired production rows had. */
const FIXTURE: ItemGlyphAccentTable = {
    'fx-chalice': [
        {
            hue: 'blood',
            clip: [
                { kind: 'ellipse', cx: 211, cy: 96, rx: 34, ry: 78 },
                { kind: 'ellipse', cx: 252, cy: 120, rx: 38, ry: 92 },
            ],
        },
    ],
    'fx-ring': [
        {
            hue: 'blood',
            clip: [{ kind: 'polygon', points: [[160, 15], [352, 15], [352, 62], [262, 160], [250, 160], [160, 62]] }],
            grow: { factor: 1.45, ax: 256, ay: 25 },
        },
        { hue: 'storm', clip: [{ kind: 'rect', x: 270, y: 146, w: 122, h: 52 }] },
    ],
};
const ROWS = Object.entries(FIXTURE) as [string, readonly IconAccent[]][];

function inBounds(s: AccentShape): boolean {
    const inside = (v: number) => v >= 0 && v <= 512;
    switch (s.kind) {
        case 'rect':
            return inside(s.x) && inside(s.y) && s.w > 0 && s.h > 0 && inside(s.x + s.w) && inside(s.y + s.h);
        case 'circle':
            return inside(s.cx) && inside(s.cy) && s.r > 0;
        case 'ellipse':
            return inside(s.cx) && inside(s.cy) && s.rx > 0 && s.ry > 0;
        case 'polygon':
            return s.points.length >= 3 && s.points.every(([x, y]) => inside(x) && inside(y));
    }
}

describe('item accent table', () => {
    it('is empty: T\'s sheets draw every item, so no registry icon needs a colour (EQ3k)', () => {
        expect(Object.keys(ITEM_GLYPH_BY_ID)).toEqual([]);
        expect(Object.keys(ITEM_GLYPH_ACCENTS)).toEqual([]);
    });

    it('an id with no row gets no accents', () => {
        expect(getItemGlyphAccents('relic-not-in-the-table')).toEqual([]);
        expect(getItemGlyphAccents(null)).toEqual([]);
        expect(getItemGlyphAccents('constructor')).toEqual([]);
    });

    it('a fixture table resolves its rows', () => {
        expect(getItemGlyphAccents('fx-ring', FIXTURE).map((a) => a.hue)).toEqual(['blood', 'storm']);
    });

    it.each(ROWS)('%s: every layer has a clip, every shape inside the icon space', (_id, accents) => {
        expect(accents.length).toBeGreaterThan(0);
        for (const a of accents) {
            expect(a.clip.length).toBeGreaterThan(0);
            for (const s of a.clip) expect(inBounds(s)).toBe(true);
        }
    });
});

describe('accent hues', () => {
    it('blood follows the palette; the weather hues are fixed', () => {
        expect(accentHueColor('blood', { blood: '#123456' })).toBe('#123456');
        expect(accentHueColor('storm', { blood: '#123456' })).toBe(HUE.goldAccent);
        expect(accentHueColor('ember', { blood: '#123456' })).toBe(HUE.statDownAmber);
        expect(accentHueColor('frost', { blood: '#123456' })).toBe(HUE.guardBlue);
    });
});

describe('accent clip paths', () => {
    it('a shape with no grow keeps its coordinates', () => {
        expect(accentShapePath({ kind: 'rect', x: 10, y: 20, w: 30, h: 40 })).toBe('M10 20L40 20L40 60L10 60Z');
    });

    it('grow scales a shape about its anchor', () => {
        const grow = { factor: 2, ax: 0, ay: 0 };
        expect(accentShapePath({ kind: 'polygon', points: [[1, 1], [3, 1], [2, 4]] }, grow)).toBe('M2 2L6 2L4 8Z');
        expect(accentShapePath({ kind: 'circle', cx: 10, cy: 10, r: 5 }, grow)).toBe(
            'M10 20A10 10 0 1 1 30 20A10 10 0 1 1 10 20Z',
        );
    });

    it('reverse winds the other way, so the shape cuts a hole under nonzero too', () => {
        expect(accentShapePath({ kind: 'polygon', points: [[1, 1], [3, 1], [2, 4]] }, undefined, true)).toBe('M2 4L3 1L1 1Z');
        expect(accentShapePath({ kind: 'ellipse', cx: 10, cy: 10, rx: 4, ry: 2 }, undefined, true)).toBe(
            'M6 10A4 2 0 1 0 14 10A4 2 0 1 0 6 10Z',
        );
    });

    it.each(ROWS.filter(([, a]) => a.some((l) => l.grow)))('%s: a grown layer stays inside the icon space', (_id, accents) => {
        for (const a of accents.filter((l) => l.grow)) {
            for (const s of a.clip) {
                const nums = accentShapePath(s, a.grow).match(/-?\d+(\.\d+)?/g)!.map(Number);
                for (const n of nums) expect(n).toBeGreaterThanOrEqual(0);
                for (const n of nums) expect(n).toBeLessThanOrEqual(512);
            }
        }
    });
});

describe('accent layers render', () => {
    it.each(ROWS)('%s draws one layer per accent entry', (_id, accents) => {
        const { tree } = withAllProviders(<AxmIcon name="relic-chalice-drops" accents={accents} />);
        const rendered = render(tree);
        for (const hue of new Set(accents.map((a) => a.hue))) {
            const want = accents.filter((a) => a.hue === hue).length;
            expect(rendered.getAllByTestId(`axm-icon-accent-${hue}`)).toHaveLength(want);
        }
    });

    it('an icon without accents draws no accent layer', () => {
        const { tree } = withAllProviders(<AxmIcon name="action-sword" />);
        const rendered = render(tree);
        expect(rendered.queryAllByTestId(/^axm-icon-accent-/)).toHaveLength(0);
    });
});
