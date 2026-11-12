/**
 * A long cutscene panel is shown as pages, split only at sentence ends.
 *
 * Pure: the split function, then the real Chapter 1 scenes through it.
 * Hermetic = self-contained + deterministic + isolated. See docs/testing.md.
 */

import { describe, expect, it } from '@jest/globals';
import { BW_NODE_SCENES } from '@mechanics/World/MapEvents/content';

import { CUTSCENE_PAGE_LIMIT, paginateLine, paginateLines } from '@/state/presenters/cutscene-pages';

/** A sentence of exactly `n` characters, ending in a period. */
const sentence = (n: number, ch = 'a') => ch.repeat(n - 1) + '.';

describe('paginateLine', () => {
    it('the limit is 240 characters', () => {
        expect(CUTSCENE_PAGE_LIMIT).toBe(240);
    });

    it('does not split a line at or under the limit', () => {
        const atLimit = `${sentence(100)} ${sentence(CUTSCENE_PAGE_LIMIT - 101)}`;
        expect(atLimit.length).toBe(CUTSCENE_PAGE_LIMIT);
        expect(paginateLine(atLimit)).toEqual([atLimit]);
        expect(paginateLine('')).toEqual(['']);
        expect(paginateLine('One.')).toEqual(['One.']);
    });

    it('splits at the sentence end, the period staying on the first page', () => {
        const a = sentence(150, 'a');
        const b = sentence(150, 'b');
        expect(paginateLine(`${a} ${b}`)).toEqual([a, b]);
    });

    it('splits at the sentence end nearest the middle', () => {
        const parts = [sentence(60, 'a'), sentence(60, 'b'), sentence(60, 'c'), sentence(60, 'd'), sentence(60, 'e')];
        // 5 x 60 + 4 spaces = 304; the first page would be 60, 121, 182 or 243 long; the middle is 152, so 182 is nearest.
        expect(paginateLine(parts.join(' '))).toEqual([parts.slice(0, 3).join(' '), parts.slice(3).join(' ')]);
    });

    it('splits again until every page fits', () => {
        const parts = Array.from({ length: 12 }, (_, i) => sentence(100, String.fromCharCode(97 + i)));
        const line = parts.join(' ');
        const pages = paginateLine(line);
        expect(pages.length).toBeGreaterThan(2);
        for (const p of pages) expect(p.length).toBeLessThanOrEqual(CUTSCENE_PAGE_LIMIT);
        expect(pages.join(' ')).toBe(line);
    });

    it('never splits mid-sentence: every page but the last ends in a period', () => {
        const parts = Array.from({ length: 9 }, (_, i) => `Sentence ${i} runs on, with a comma, and a few words more than a few.`);
        const pages = paginateLine(parts.join(' '));
        expect(pages.length).toBeGreaterThan(1);
        for (const p of pages.slice(0, -1)) expect(p.endsWith('.')).toBe(true);
        for (const p of pages) expect(p).toBe(p.trim());
    });

    it('joining the pages with one space gives the line back exactly', () => {
        const line = `${sentence(130)} ${sentence(130, 'b')}  ${sentence(90, 'c')} ${sentence(50, 'd')}`;
        expect(paginateLine(line).join(' ')).toBe(line);
    });

    it('a line with no sentence end stays whole, however long', () => {
        const run = 'word '.repeat(80).trim();
        expect(run.length).toBeGreaterThan(CUTSCENE_PAGE_LIMIT);
        expect(paginateLine(run)).toEqual([run]);
        // A period with no space after it is not a sentence end.
        const dotted = `${'a'.repeat(150)}.${'b'.repeat(150)}`;
        expect(paginateLine(dotted)).toEqual([dotted]);
        // Nor is a trailing one: the split would leave an empty page.
        const trailing = `${'a'.repeat(300)}. `;
        expect(paginateLine(trailing)).toEqual([trailing]);
    });

    it('a half with no sentence end stays whole while the rest still splits', () => {
        const long = 'word '.repeat(60).trim();
        const line = `${long}. ${long}`;
        const pages = paginateLine(line);
        expect(pages.join(' ')).toBe(line);
        expect(pages.length).toBe(2);
    });
});

describe('paginateLines', () => {
    it('keeps the order of the lines and pages each one', () => {
        const a = sentence(150, 'a');
        const b = sentence(150, 'b');
        expect(paginateLines(['Short.', `${a} ${b}`, 'Last.'])).toEqual(['Short.', a, b, 'Last.']);
        expect(paginateLines([])).toEqual([]);
    });
});

describe('the Chapter 1 scenes', () => {
    const panels = BW_NODE_SCENES.flatMap((e) => e.scene.before.lines.map((line: string) => ({ node: e.nodeId, line })));

    it('has panels to check', () => {
        expect(panels.length).toBeGreaterThan(40);
    });

    it('every panel pages back to itself, within the limit unless it has no sentence end to split at', () => {
        for (const { node, line } of panels) {
            const pages = paginateLine(line);
            expect({ node, joined: pages.join(' ') }).toEqual({ node, joined: line });
            for (const p of pages) if (p.length > CUTSCENE_PAGE_LIMIT) expect({ node, whole: pages.length }).toEqual({ node, whole: 1 });
        }
    });

    it('every panel over the limit becomes more than one page', () => {
        const long = panels.filter((p) => p.line.length > CUTSCENE_PAGE_LIMIT);
        expect(long.length).toBeGreaterThan(0);
        for (const { node, line } of long) expect({ node, pages: paginateLine(line).length > 1 }).toEqual({ node, pages: true });
    });
});
