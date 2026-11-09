/**
 * Guard for the footgun `font-width-estimates-stale`.
 *
 * Several presenters and components size text from a per-glyph width ("em")
 * they measured once, for the face the text used then. When a text role moves
 * to a new face the estimate keeps its old number, its fit test still passes
 * (it only checks itself), and the real face runs wider. This test reads the
 * advance widths out of the real font files and fails when an estimate no
 * longer covers the face its text is set in.
 *
 * Three ways to fail, each naming the site:
 *  - an estimate is under the mean advance of its glyph class on its face and
 *    is not on STALE (remeasure it, then re-run);
 *  - a site on STALE now covers its face (take it off, so the list only
 *    shrinks, like PARKED_FOR_T in `paid-line.fit.engine.test.ts`);
 *  - a `*_EM` constant or `*Em()` function appears in the app with no row in
 *    SITES (register it, naming the face and glyphs it sizes).
 *
 * "Covers" means the estimate is at least the mean advance of the glyph class
 * (capitals, lowercase, digits) per em: the old numbers were measured as a
 * mean plus a little slack, and a max would flag every wide letter.
 */

import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

import { TYPE_ROLES, type TypeRoleId } from '@/theme/axm';
import { CAPS_EM, SERIF_EM, SPACE_EM } from '@/state/presenters/paid-line.engine';
import { GOTHIC_CAP_EM, effectGlyphEm } from '@/components/hazard/HazardCard';
import { STRIP_MONO_EM } from '@/components/hazard/RouteSelect';

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const CAPS_DIGITS = `${UPPER}0123456789+-`;

/** Faces by the `fontFamily` string the theme uses: the package and file that ship it. */
const FACE_FILES: Readonly<Record<string, string>> = {
    UncialAntiqua_400Regular: '@expo-google-fonts/uncial-antiqua/400Regular/UncialAntiqua_400Regular.ttf',
    Rosarivo_400Regular: '@expo-google-fonts/rosarivo/400Regular/Rosarivo_400Regular.ttf',
    Grenze_400Regular: '@expo-google-fonts/grenze/400Regular/Grenze_400Regular.ttf',
};

interface Site {
    /** `file: name`, the key STALE uses. */
    id: string;
    /** The `TYPE_ROLES` job the text is styled with. */
    role: TypeRoleId;
    /** The glyphs the estimate stands for. */
    glyphs: string;
    /** The estimate, em per px of size. */
    estimate: (ch: string) => number;
}

const SITES: readonly Site[] = [
    { id: 'paid-line.engine: CAPS_EM', role: 'chip', glyphs: UPPER, estimate: () => CAPS_EM },
    { id: 'paid-line.engine: SERIF_EM', role: 'cardRules', glyphs: LOWER, estimate: () => SERIF_EM },
    { id: 'paid-line.engine: SPACE_EM', role: 'cardRules', glyphs: ' ', estimate: () => SPACE_EM },
    { id: 'HazardCard: GOTHIC_CAP_EM', role: 'title', glyphs: UPPER, estimate: () => GOTHIC_CAP_EM },
    { id: 'HazardCard: effectGlyphEm caps', role: 'chip', glyphs: CAPS_DIGITS, estimate: effectGlyphEm },
    { id: 'HazardCard: effectGlyphEm space', role: 'chip', glyphs: ' ', estimate: effectGlyphEm },
    { id: 'RouteSelect: STRIP_MONO_EM', role: 'count', glyphs: `${UPPER}—`, estimate: () => STRIP_MONO_EM },
];

/**
 * Constants that look like an estimate by name but are not a font's advance:
 * an icon's edge, or a glyph the face lacks (it falls back to a system font
 * this test cannot read).
 */
const NOT_A_FACE_WIDTH: readonly string[] = ['GLYPH_EM', 'LABEL_GLYPH_EM', 'STRIP_DIAMOND_EM'];

/**
 * Sites whose estimate was measured for a face the text has since left (the
 * Bebas / Pirata / JetBrains days) and has not been remeasured. Each is a real
 * misfit today: the face runs wider than the estimate, so the fit check passes
 * while the text overflows or wraps. Remeasure the number, run with a screenshot,
 * and delete the row; the test fails once a listed site covers its face.
 */
const STALE: ReadonlySet<string> = new Set([
    'paid-line.engine: CAPS_EM',
    'paid-line.engine: SERIF_EM',
    'paid-line.engine: SPACE_EM',
    'HazardCard: GOTHIC_CAP_EM',
    'HazardCard: effectGlyphEm caps',
]);

// ---- a minimal TrueType reader: cmap (format 4) + hmtx ----------------------

interface Face { buf: Buffer; unitsPerEm: number; hmtx: number; metrics: number; cmap: number }

function resolveFile(rel: string): string {
    let dir = __dirname;
    for (let i = 0; i < 8; i++) {
        const p = path.join(dir, 'node_modules', rel);
        if (fs.existsSync(p)) return p;
        dir = path.dirname(dir);
    }
    throw new Error(`font file not found: ${rel}`);
}

function loadFace(rel: string): Face {
    const buf = fs.readFileSync(resolveFile(rel));
    const tables: Record<string, number> = {};
    const count = buf.readUInt16BE(4);
    for (let i = 0; i < count; i++) {
        const at = 12 + i * 16;
        tables[buf.toString('ascii', at, at + 4)] = buf.readUInt32BE(at + 8);
    }
    const cmapAt = tables.cmap;
    let cmap = -1;
    for (let i = 0; i < buf.readUInt16BE(cmapAt + 2); i++) {
        const platform = buf.readUInt16BE(cmapAt + 4 + i * 8);
        const encoding = buf.readUInt16BE(cmapAt + 6 + i * 8);
        const at = cmapAt + buf.readUInt32BE(cmapAt + 8 + i * 8);
        if ((platform === 3 && encoding === 1 || platform === 0) && buf.readUInt16BE(at) === 4) cmap = at;
    }
    if (cmap < 0) throw new Error(`no format 4 cmap in ${rel}`);
    return {
        buf, cmap, hmtx: tables.hmtx,
        unitsPerEm: buf.readUInt16BE(tables.head + 18),
        metrics: buf.readUInt16BE(tables.hhea + 34),
    };
}

/** The advance of `ch` in em, or null when the face has no glyph for it. */
function advanceEm(face: Face, ch: string): number | null {
    const { buf, cmap } = face;
    const cp = ch.codePointAt(0)!;
    const segs = buf.readUInt16BE(cmap + 6) / 2;
    const ends = cmap + 14;
    const starts = ends + segs * 2 + 2;
    const deltas = starts + segs * 2;
    const ranges = deltas + segs * 2;
    let glyph = 0;
    for (let i = 0; i < segs; i++) {
        if (cp > buf.readUInt16BE(ends + i * 2)) continue;
        const start = buf.readUInt16BE(starts + i * 2);
        if (cp < start) break;
        const delta = buf.readInt16BE(deltas + i * 2);
        const range = buf.readUInt16BE(ranges + i * 2);
        glyph = range === 0
            ? (cp + delta) & 0xffff
            : ((buf.readUInt16BE(ranges + i * 2 + range + (cp - start) * 2) + delta) & 0xffff);
        break;
    }
    if (glyph === 0) return null;
    return buf.readUInt16BE(face.hmtx + Math.min(glyph, face.metrics - 1) * 4) / face.unitsPerEm;
}

/** The mean advance of the glyphs the face has, em per px. */
function meanAdvance(face: Face, glyphs: string): number {
    const widths = [...glyphs].map(ch => advanceEm(face, ch)).filter((w): w is number => w !== null);
    if (widths.length === 0) throw new Error(`the face has none of ${JSON.stringify(glyphs)}`);
    return widths.reduce((a, b) => a + b, 0) / widths.length;
}

const EPS = 1e-6;
const faces = new Map<string, Face>();
function faceFor(name: string): Face {
    if (!faces.has(name)) {
        const rel = FACE_FILES[name];
        if (!rel) throw new Error(`teach FACE_FILES where ${name} lives`);
        faces.set(name, loadFace(rel));
    }
    return faces.get(name)!;
}

/** What a site's estimate averages over its glyphs. */
function estimateMean(site: Site): number {
    const vals = [...site.glyphs].map(site.estimate);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ---- the tests --------------------------------------------------------------

describe('font width estimates cover the faces they size (footgun font-width-estimates-stale)', () => {
    it('reads the faces: Uncial Antiqua capitals run wider than half an em', () => {
        // Anchors the reader: a broken parse would pass every site below.
        expect(meanAdvance(faceFor('UncialAntiqua_400Regular'), UPPER)).toBeGreaterThan(0.5);
        expect(advanceEm(faceFor('UncialAntiqua_400Regular'), ' ')).toBeCloseTo(0.25, 2);
    });

    it.each(SITES.map(s => [s.id, s] as const))('%s covers its face unless listed STALE', (id, site) => {
        const face = TYPE_ROLES[site.role].fontFamily;
        const measured = meanAdvance(faceFor(face), site.glyphs);
        const covers = estimateMean(site) + EPS >= measured;
        const note = `${id}: estimate ${estimateMean(site).toFixed(3)} em vs ${face} ${measured.toFixed(3)} em`;
        if (STALE.has(id)) {
            // A listed site is allowed to be short; it is not allowed to be fixed and still listed.
            expect({ id, stillShort: !covers, note }).toEqual({ id, stillShort: true, note });
        } else {
            expect({ id, covers, note }).toEqual({ id, covers: true, note });
        }
    });

    it('every STALE row names a site', () => {
        const ids = new Set(SITES.map(s => s.id));
        expect([...STALE].filter(id => !ids.has(id))).toEqual([]);
    });

    it('every width constant in the app has a row in SITES', () => {
        const root = path.resolve(__dirname, '../../..');
        const found = new Set<string>();
        const walk = (dir: string) => {
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                if (e.name === 'node_modules' || e.name === '__tests__') continue;
                const p = path.join(dir, e.name);
                if (e.isDirectory()) walk(p);
                else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) {
                    const src = fs.readFileSync(p, 'utf8');
                    for (const m of src.matchAll(/\b(?:const|function)\s+([A-Za-z_]*(?:_EM|Em))\b/g)) found.add(`${e.name.replace(/\.tsx?$/, '')}: ${m[1]}`);
                }
            }
        };
        for (const dir of ['state', 'components', 'app', 'theme', 'lib']) {
            const p = path.join(root, dir);
            if (fs.existsSync(p)) walk(p);
        }
        const registered = SITES.map(s => s.id);
        const unregistered = [...found].filter(f => {
            const name = f.split(': ')[1];
            return !NOT_A_FACE_WIDTH.includes(name) && !registered.some(id => id.split(': ')[0] === f.split(': ')[0] && id.includes(name));
        });
        expect(unregistered).toEqual([]);
    });
});
