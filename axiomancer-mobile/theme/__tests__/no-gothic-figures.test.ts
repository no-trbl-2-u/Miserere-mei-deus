/**
 * No figure in the gothic face.
 *
 * Pirata One (`FONTS.gothic`) draws its zero barred, so at 15-22px a 20 reads
 * as 28 and a 200 as 288 (CRITIQUE passes 104 and 106). Names and titles keep
 * the gothic face; a style that prints a number uses `FONTS.sans`. This walks
 * `app/` and `components/` non-test sources and fails on any style whose name
 * marks it as a figure (`statValue`, `warePrice`, `levelText`, `clock`, ...)
 * and whose body sets `FONTS.gothic`, naming file, line and style.
 */

import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const SCANNED = ['app', 'components'];
const FIGURE_NAME = /(?:value|val|price|budget|number|count|conviction|clock)$|^level/i;
const STYLE_BLOCK = /([A-Za-z0-9_]+):\s*\{([^{}]*)\}/g;

function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path);
        return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });
}

function gothicFigures(text: string): { name: string; line: number }[] {
    return [...text.matchAll(STYLE_BLOCK)]
        .filter(([, name, body]) => FIGURE_NAME.test(name) && /FONTS\.gothic\b/.test(body))
        .map((m) => ({ name: m[1], line: text.slice(0, m.index).split('\n').length }));
}

describe('figures in the gothic face (CRITIQUE pass 106)', () => {
    it('no figure-named style in app/ or components/ uses FONTS.gothic', () => {
        const hits = SCANNED.flatMap((d) => sources(join(ROOT, d))).flatMap((file) =>
            gothicFigures(readFileSync(file, 'utf8')).map(({ name, line }) => `${relative(ROOT, file)}:${line} ${name}`),
        );
        expect(hits).toEqual([]);
    });

    it('the guard matches the style shapes it claims to', () => {
        const bad = [
            `statValue: { fontFamily: FONTS.gothic, fontSize: 22 }`,
            `warePrice: {\n  fontFamily: FONTS.gothic,\n  fontSize: 18,\n}`,
            `levelText: { fontFamily: FONTS.gothic }`,
            `clock: { fontFamily: FONTS.gothic }`,
        ];
        for (const s of bad) expect(gothicFigures(s)).toHaveLength(1);
        const ok = [
            `statValue: { fontFamily: FONTS.sans, fontSize: 22 }`,
            `cardName: { fontFamily: FONTS.gothic, fontSize: 22 }`,
            `title: { fontFamily: FONTS.gothic }`,
        ];
        for (const s of ok) expect(gothicFigures(s)).toEqual([]);
    });
});
