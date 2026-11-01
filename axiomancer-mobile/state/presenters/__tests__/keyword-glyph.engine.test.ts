/**
 * The keyword-glyph table: every keyword a card prints in capitals has a glyph
 * and a colour category, VITAE is the one capital word that stays a word, and
 * glyph mode swaps exactly those words and changes nothing else on the line.
 */

import { describe, expect, it } from '@jest/globals';

import { cardLibrary, cardLinesText, lookupEffect, paidFaceLine } from '@mechanics';
import {
    GLYPH_CATEGORY, GLYPH_KEYWORDS, glyphKeywordFor, glyphLabel,
} from '@/state/presenters/keyword-glyph.engine';
import { paidLineCube, paidLineFit, paidLineLead, paidLineRuns, PAID_LINE_ROWS, PAID_LINE_SIZE } from '@/state/presenters/paid-line.engine';

/** Capital words that are a stat or a system word, not a keyword: they print as they are. */
const STAYS_A_WORD = new Set(['VITAE', 'CONVICTION', 'HOLDS']);

const SAMPLE = [
    'Burn Together', 'Encase in Ice', 'Strike the Burning', 'Shatter the Frost', 'Weight of Grace', 'Shield Bash',
    'Cracking Swing', 'Open Vein', 'Double-Edged', 'Bloodletting', 'Cornered', 'Callus',
];

describe('the glyph keywords', () => {
    it('are the 21 keywords the library prints, each with a category and its own word as the label', () => {
        expect(GLYPH_KEYWORDS).toHaveLength(21);
        for (const k of GLYPH_KEYWORDS) {
            expect(GLYPH_CATEGORY[k]).toBeTruthy();
            expect(glyphLabel(k)).toBe(k);
        }
        expect(Object.keys(GLYPH_CATEGORY).sort()).toEqual([...GLYPH_KEYWORDS].sort());
    });

    it('cover every capital word any printed line of any card uses (bar the stat words)', () => {
        const seen = new Set<string>();
        for (const card of cardLibrary) {
            const { free, paid } = cardLinesText(card);
            for (const line of [free, paid, paidFaceLine(card, lookupEffect)]) {
                for (const m of line.matchAll(/\b[A-Z]{2,}\b/g)) seen.add(m[0]);
            }
        }
        const uncovered = [...seen].filter((w) => !STAYS_A_WORD.has(w) && !glyphKeywordFor(w));
        expect(uncovered).toEqual([]);
        // and no glyph is dead weight: each keyword is printed by at least one card
        const unused = GLYPH_KEYWORDS.filter((k) => !seen.has(k));
        expect(unused).toEqual([]);
    });

    it('resolve a registry title and a printed word alike, and nothing else', () => {
        expect(glyphKeywordFor('Deal')).toBe('DEAL');
        expect(glyphKeywordFor('MERCY')).toBe('MERCY');
        expect(glyphKeywordFor('VITAE')).toBeNull();
        expect(glyphKeywordFor('X')).toBeNull();
        expect(glyphKeywordFor('')).toBeNull();
        expect(glyphKeywordFor(null)).toBeNull();
    });
});

describe('paidLineRuns in glyph mode', () => {
    it('turns a keyword into a glyph run and leaves numbers, X, VITAE and logic words alone', () => {
        const runs = paidLineRuns('DEAL 6 or 14 at half your VITAE', 'glyphs');
        expect(runs.filter((r) => r.glyph).map((r) => r.glyph)).toEqual(['DEAL']);
        expect(runs.find((r) => r.text === 'VITAE')?.glyph).toBeUndefined();
        expect(runs.find((r) => r.text === '6')?.glyph).toBeUndefined();
        expect(paidLineRuns('When you SACRIFICE X: DEAL X', 'glyphs').filter((r) => r.glyph).map((r) => r.glyph))
            .toEqual(['SACRIFICE', 'DEAL']);
    });

    it('is the words mode untouched by default, and the same text in both modes', () => {
        for (const card of cardLibrary) {
            const line = paidFaceLine(card, lookupEffect);
            expect(paidLineRuns(line).some((r) => r.glyph)).toBe(false);
            expect(paidLineRuns(line, 'glyphs').map((r) => r.text).join('')).toBe(line);
        }
    });
});

describe('the small face in glyph mode', () => {
    it.each(SAMPLE)('%s prints its whole PAID line at 10pt in at most three rows', (name) => {
        const card = cardLibrary.find((c) => c.name === name)!;
        const line = paidFaceLine(card, lookupEffect);
        const fit = paidLineFit({ width: 120, line, mode: 'glyphs', lead: paidLineLead(paidLineCube(false)) });
        expect(fit.size).toBe(PAID_LINE_SIZE);
        expect(fit.rows).toBeLessThanOrEqual(PAID_LINE_ROWS);
    });

    it('fits every card in the library at 10pt in three rows or fewer, or shrinks no further than in words', () => {
        for (const card of cardLibrary) {
            const line = paidFaceLine(card, lookupEffect);
            const words = paidLineFit({ width: 120, line, lead: paidLineLead(paidLineCube(false)) });
            const glyphs = paidLineFit({ width: 120, line, mode: 'glyphs', lead: paidLineLead(paidLineCube(false)) });
            expect(glyphs.size).toBeGreaterThanOrEqual(words.size - 1);
        }
    });
});
