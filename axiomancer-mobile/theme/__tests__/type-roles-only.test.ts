/**
 * Every screen sets its type through a role.
 *
 * A component names the job its text does (`TYPE_ROLES.button`,
 * `TYPE_ROLES.count`, ...), never a face. This walks `app/` and `components/`
 * non-test sources and fails on any direct `FONTS.<face>`, any `TYPE.<size>`
 * (built on `FONTS`), any `getTypeWithFallbacks` and any `fontFamily` set to a
 * string literal, naming file and line. Pick the role for the job in
 * `theme/axm.ts`; a job with no role is a question for the type ballot, not a
 * new face here.
 */

import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const SCANNED = ['app', 'components'];
const DIRECT = /\bFONTS\.\w+|\bTYPE\.\w+|\bgetTypeWithFallbacks\b|fontFamily:\s*['"`]/g;

function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path);
        return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });
}

/** Comments may name a face; only code counts. */
function code(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/\/\/[^\n]*/g, '');
}

function directFaces(text: string): { hit: string; line: number }[] {
    const src = code(text);
    return [...src.matchAll(DIRECT)].map((m) => ({ hit: m[0], line: src.slice(0, m.index).split('\n').length }));
}

describe('type goes through TYPE_ROLES', () => {
    it('no component in app/ or components/ sets a face directly', () => {
        const hits = SCANNED.flatMap((d) => sources(join(ROOT, d))).flatMap((file) =>
            directFaces(readFileSync(file, 'utf8')).map(({ hit, line }) => `${relative(ROOT, file)}:${line} ${hit}`),
        );
        expect(hits).toEqual([]);
    });

    it('the guard catches the shapes it claims to', () => {
        const bad = [
            `label: { fontFamily: FONTS.sans, fontSize: 11 }`,
            `body: { ...TYPE.body, color }`,
            `const t = getTypeWithFallbacks(true);`,
            `x: { fontFamily: 'Grenze_400Regular' }`,
        ];
        for (const s of bad) expect(directFaces(s)).toHaveLength(1);
        const ok = [
            `label: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 11 }`,
            `// was FONTS.sans before the roles`,
            `/* TYPE.body */ x: { ...TYPE_ROLES.rules }`,
        ];
        for (const s of ok) expect(directFaces(s)).toEqual([]);
    });
});
