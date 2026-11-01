/**
 * The keyword glyph set: one component per keyword, each drawn with its own
 * geometry, labelled with the keyword's word, and coloured by its category.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { GLYPH_CATEGORY, GLYPH_KEYWORDS } from '@/state/presenters/keyword-glyph.engine';
import {
    GLYPH_CATEGORY_COLOR, KEYWORD_GLYPH_COMPONENT, KeywordGlyph, glyphColor,
} from '@/components/keyword-glyphs';

/** Every `d` string and shape attribute a rendered glyph carries, as one signature. */
function geometry(node: unknown, out: string[] = []): string[] {
    if (!node || typeof node !== 'object') return out;
    if (Array.isArray(node)) { node.forEach((n) => geometry(n, out)); return out; }
    const n = node as { props?: Record<string, unknown>; children?: unknown };
    const p = n.props ?? {};
    for (const key of ['d', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height']) if (p[key] !== undefined) out.push(`${key}=${String(p[key])}`);
    geometry(n.children, out);
    return out;
}

describe('KEYWORD_GLYPH_COMPONENT', () => {
    it('has one component for each of the 23 keywords and no more', () => {
        expect(Object.keys(KEYWORD_GLYPH_COMPONENT).sort()).toEqual([...GLYPH_KEYWORDS].sort());
        expect(new Set(Object.values(KEYWORD_GLYPH_COMPONENT)).size).toBe(GLYPH_KEYWORDS.length);
    });
});

describe('KeywordGlyph', () => {
    it.each(GLYPH_KEYWORDS)('%s renders, labelled with its word', (keyword) => {
        const tree = render(<KeywordGlyph keyword={keyword} size={14} />);
        expect(tree.getByLabelText(keyword)).toBeTruthy();
        expect(geometry(tree.toJSON()).length).toBeGreaterThan(0);
    });

    it('draws a different shape for every keyword', () => {
        const seen = new Map<string, string>();
        for (const keyword of GLYPH_KEYWORDS) {
            const sig = geometry(render(<KeywordGlyph keyword={keyword} size={14} />).toJSON()).join('|');
            expect(seen.get(sig)).toBeUndefined();
            seen.set(sig, keyword);
        }
        expect(seen.size).toBe(GLYPH_KEYWORDS.length);
    });

    it('wears its category colour, or the colour it is given', () => {
        for (const keyword of GLYPH_KEYWORDS) {
            expect(glyphColor(keyword)).toBe(GLYPH_CATEGORY_COLOR[GLYPH_CATEGORY[keyword]]);
        }
        const tinted = render(<KeywordGlyph keyword="DEAL" size={14} color="#123456" />);
        expect(JSON.stringify(tinted.toJSON())).toContain('#123456');
        expect(new Set(Object.values(GLYPH_CATEGORY_COLOR)).size).toBe(Object.keys(GLYPH_CATEGORY_COLOR).length);
    });
});
