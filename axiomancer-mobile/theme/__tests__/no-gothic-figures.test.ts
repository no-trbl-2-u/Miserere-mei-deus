/**
 * Figures go through a number role.
 *
 * Pirata One, the old gothic face, drew its zero barred, so at 15-22px a 20
 * read as 28 and a 200 as 288 (CRITIQUE passes 104 and 106). The fix then was
 * to keep figures out of the gothic face; with type set by job, a style that
 * prints a number names the job for it: `TYPE_ROLES.count` for small counts
 * and stats, `TYPE_ROLES.bigNumber` for the large ones. This walks `app/` and
 * `components/` non-test sources and fails on any style whose name marks it as
 * a figure (`statValue`, `warePrice`, `levelText`, `clock`, ...) and whose body
 * sets its face through any other role, naming file, line and style.
 */

import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const SCANNED = ['app', 'components'];
// A figure word at a camel-case boundary, so `revealArrival` is not a `val`.
const FIGURE_NAME = /^(?:value|val|price|budget|number|count|conviction|clock)$|[a-z0-9](?:Value|Val|Price|Budget|Number|Count|Conviction|Clock)$|^level(?:Text)?$/;
const STYLE_BLOCK = /([A-Za-z0-9_]+):\s*\{([^{}]*)\}/g;
const ROLE_FACE = /fontFamily:\s*TYPE_ROLES\.(\w+)\.fontFamily/;
const NUMBER_ROLES = new Set(['count', 'bigNumber']);

function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path);
        return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });
}

function wordFigures(text: string): { name: string; line: number }[] {
    return [...text.matchAll(STYLE_BLOCK)]
        .filter(([, name, body]) => {
            const role = body.match(ROLE_FACE)?.[1];
            return FIGURE_NAME.test(name) && role !== undefined && !NUMBER_ROLES.has(role);
        })
        .map((m) => ({ name: m[1], line: text.slice(0, m.index).split('\n').length }));
}

describe('figures in a number role (CRITIQUE pass 106)', () => {
    it('no figure-named style in app/ or components/ sets a face outside count and bigNumber', () => {
        const hits = SCANNED.flatMap((d) => sources(join(ROOT, d))).flatMap((file) =>
            wordFigures(readFileSync(file, 'utf8')).map(({ name, line }) => `${relative(ROOT, file)}:${line} ${name}`),
        );
        expect(hits).toEqual([]);
    });

    it('the guard matches the style shapes it claims to', () => {
        const bad = [
            `statValue: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 22 }`,
            `warePrice: {\n  fontFamily: TYPE_ROLES.chip.fontFamily,\n  fontSize: 18,\n}`,
            `levelText: { fontFamily: TYPE_ROLES.title.fontFamily }`,
            `clock: { fontFamily: TYPE_ROLES.eyebrow.fontFamily }`,
        ];
        for (const s of bad) expect(wordFigures(s)).toHaveLength(1);
        const ok = [
            `statValue: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 22 }`,
            `clock: { fontFamily: TYPE_ROLES.bigNumber.fontFamily }`,
            `cardName: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 22 }`,
            `title: { fontFamily: TYPE_ROLES.title.fontFamily }`,
        ];
        for (const s of ok) expect(wordFigures(s)).toEqual([]);
        expect(wordFigures(`revealArrival: { fontFamily: TYPE_ROLES.narration.fontFamily }`)).toEqual([]);
    });
});
