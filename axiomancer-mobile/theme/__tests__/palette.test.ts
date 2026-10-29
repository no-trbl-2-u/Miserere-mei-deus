/**
 * Theme registry + palette factory.
 *
 * Isolates theme/palette.ts's own contract — the runtime store
 * (runtime.test.tsx) only uses paletteFor/DEFAULT_THEME_ID as fixtures
 * and never exercises the derivation/guard/resolution logic here:
 *   - makePalette's 14 derived translucent tokens at their documented
 *     alphas, plus the fixed shadow and the base-spec spread.
 *   - paletteFor resolving every THEME_ORDER id to a complete Palette.
 *   - isThemeId accept/reject across registered ids, unknown strings,
 *     and non-string values.
 *   - resolveActiveThemeId's global-override → localStorage → default
 *     priority, with try/catch resilience when storage is unavailable.
 *   - registry-shape guards (THEME_SPECS keys === THEME_ORDER; every
 *     spec carries the full ThemeSpec hue set; every ThemeDef.id is
 *     self-consistent).
 */

import { afterEach, describe, expect, it } from '@jest/globals';

import {
    DEFAULT_THEME_ID,
    isThemeId,
    makePalette,
    paletteFor,
    resolveActiveThemeId,
    THEME_ORDER,
    THEME_SPECS,
    type Palette,
    type ThemeSpec,
    contrastOf,
    kindInk,
    mixHex,
} from '../palette';

/** The node-kind token keys, one per map node kind. */
const KIND_KEYS: (keyof Palette)[] = [
    'kindQuest',
    'kindBoss',
    'kindElite',
    'kindFight',
    'kindHazard',
    'kindRest',
    'kindLoot',
    'kindVillage',
    'kindStory',
    'kindTravel',
    'kindStart',
    'kindWaypoint',
];

const SPEC_KEYS: (keyof ThemeSpec)[] = [
    'bg',
    'parchment',
    'blood',
    'sulfur',
    'rust',
    'heal',
    'bone',
    'ash',
    'panelBg',
    'deepBg',
    'dockBg',
    'silhouette',
    'selectFill',
    'debuff',
    'buff',
    'pixelShadow',
    'pixelHighlight',
    'lapis',
    'murex',
];

const DERIVED_KEYS: (keyof Palette)[] = [
    'backdrop',
    'overlay',
    'divider',
    'parchmentMed',
    'parchmentDim',
    'sulfurSubtle',
    'sulfurMed',
    'healSubtle',
    'bloodSubtle',
    'bloodMed',
    'bloodStrong',
    'rustSubtle',
    'shadow',
    'nodeBg',
    ...KIND_KEYS,
];

/** A spec with a 6-digit hue per channel-easy-to-assert value. */
const FIXTURE_SPEC: ThemeSpec = {
    bg: '#102030',
    parchment: '#a0b0c0',
    blood: '#ff0011',
    sulfur: '#ffee00',
    rust: '#806040',
    heal: '#00ff80',
    bone: '#fffff0',
    ash: '#404040',
    panelBg: '#080808',
    deepBg: '#020406',
    dockBg: '#111111',
    silhouette: '#000000',
    selectFill: '#222244',
    debuff: '#aa0044',
    buff: '#0088aa',
    pixelShadow: '#010101',
    pixelHighlight: '#fefefe',
    lapis: '#3355cc',
    murex: '#993399',
};

const ORIGINAL_THEME_GLOBAL = (globalThis as { __AXM_THEME__?: unknown }).__AXM_THEME__;

afterEach(() => {
    (globalThis as { __AXM_THEME__?: unknown }).__AXM_THEME__ = ORIGINAL_THEME_GLOBAL;
    try {
        if (typeof localStorage !== 'undefined') localStorage.clear();
    } catch {
        /* ignore */
    }
});

describe('makePalette', () => {
    it('spreads the base spec through unchanged', () => {
        const p = makePalette(FIXTURE_SPEC);
        for (const key of SPEC_KEYS) {
            expect(p[key]).toBe(FIXTURE_SPEC[key]);
        }
    });

    it('derives each translucent token at its documented alpha', () => {
        const p = makePalette(FIXTURE_SPEC);
        // #102030 -> 16,32,48 · #a0b0c0 -> 160,176,192 · #ff0011 -> 255,0,17
        // #ffee00 -> 255,238,0 · #00ff80 -> 0,255,128 · #806040 -> 128,96,64
        expect(p.backdrop).toBe('rgba(2, 4, 6, 0.4)'); // deepBg #020406
        expect(p.overlay).toBe('rgba(2, 4, 6, 0.92)');
        expect(p.divider).toBe('rgba(160, 176, 192, 0.12)'); // parchment
        expect(p.parchmentMed).toBe('rgba(160, 176, 192, 0.35)');
        expect(p.parchmentDim).toBe('rgba(160, 176, 192, 0.65)');
        expect(p.sulfurSubtle).toBe('rgba(255, 238, 0, 0.1)');
        expect(p.sulfurMed).toBe('rgba(255, 238, 0, 0.3)');
        expect(p.healSubtle).toBe('rgba(0, 255, 128, 0.1)');
        expect(p.bloodSubtle).toBe('rgba(255, 0, 17, 0.1)');
        expect(p.bloodMed).toBe('rgba(255, 0, 17, 0.3)');
        expect(p.bloodStrong).toBe('rgba(255, 0, 17, 0.55)');
        expect(p.rustSubtle).toBe('rgba(128, 96, 64, 0.1)');
        expect(p.nodeBg).toBe('rgba(16, 32, 48, 0.9)'); // bg
    });

    it('pins shadow to a fixed opaque-black wash independent of the spec', () => {
        expect(makePalette(FIXTURE_SPEC).shadow).toBe('rgba(0, 0, 0, 0.6)');
    });

    it('expands 3-digit shorthand hex through hexToRgb', () => {
        // #abc -> #aabbcc -> 170,187,204
        const p = makePalette({ ...FIXTURE_SPEC, parchment: '#abc' });
        expect(p.divider).toBe('rgba(170, 187, 204, 0.12)');
    });
});

describe('paletteFor', () => {
    it('resolves every THEME_ORDER id to a structurally complete Palette', () => {
        for (const id of THEME_ORDER) {
            const p = paletteFor(id);
            for (const key of [...SPEC_KEYS, ...DERIVED_KEYS]) {
                expect(typeof p[key]).toBe('string');
                expect(p[key].length).toBeGreaterThan(0);
            }
            // Derived tokens always track the theme's own base hues.
            expect(p).toEqual(makePalette(THEME_SPECS[id].spec));
        }
    });

    it('resolves the default theme', () => {
        expect(paletteFor(DEFAULT_THEME_ID)).toEqual(
            makePalette(THEME_SPECS[DEFAULT_THEME_ID].spec),
        );
    });
});

describe('isThemeId', () => {
    it('accepts every registered theme id', () => {
        for (const id of THEME_ORDER) {
            expect(isThemeId(id)).toBe(true);
        }
    });

    it('rejects unknown strings and non-string values', () => {
        expect(isThemeId('not-a-theme')).toBe(false);
        expect(isThemeId('')).toBe(false);
        expect(isThemeId(undefined)).toBe(false);
        expect(isThemeId(null)).toBe(false);
        expect(isThemeId(42)).toBe(false);
        expect(isThemeId({})).toBe(false);
    });
});

describe('resolveActiveThemeId', () => {
    const otherId = THEME_ORDER.find((id) => id !== DEFAULT_THEME_ID)!;

    it('honours a valid __AXM_THEME__ global override above all else', () => {
        (globalThis as { __AXM_THEME__?: unknown }).__AXM_THEME__ = otherId;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('@axiomancer/theme:v1', DEFAULT_THEME_ID);
            }
        } catch {
            /* ignore */
        }
        expect(resolveActiveThemeId()).toBe(otherId);
    });

    it('ignores an invalid global override and falls through', () => {
        (globalThis as { __AXM_THEME__?: unknown }).__AXM_THEME__ = 'bogus-theme';
        expect(resolveActiveThemeId()).toBe(DEFAULT_THEME_ID);
    });

    it('falls back to a persisted localStorage choice when no global override', () => {
        (globalThis as { __AXM_THEME__?: unknown }).__AXM_THEME__ = undefined;
        if (typeof localStorage === 'undefined') return; // native: no storage path
        localStorage.setItem('@axiomancer/theme:v1', otherId);
        expect(resolveActiveThemeId()).toBe(otherId);
    });

    it('defaults when neither a global override nor a valid stored id is present', () => {
        (globalThis as { __AXM_THEME__?: unknown }).__AXM_THEME__ = undefined;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('@axiomancer/theme:v1', 'bogus-theme');
            }
        } catch {
            /* ignore */
        }
        expect(resolveActiveThemeId()).toBe(DEFAULT_THEME_ID);
    });
});

describe('registry shape', () => {
    it('THEME_SPECS keys match THEME_ORDER exactly', () => {
        expect([...Object.keys(THEME_SPECS)].sort()).toEqual([...THEME_ORDER].sort());
    });

    it('every ThemeDef carries a self-consistent id, a name, a blurb, and the full hue set', () => {
        for (const id of THEME_ORDER) {
            const def = THEME_SPECS[id];
            expect(def.id).toBe(id);
            expect(typeof def.name).toBe('string');
            expect(def.name.length).toBeGreaterThan(0);
            expect(typeof def.blurb).toBe('string');
            expect(def.blurb.length).toBeGreaterThan(0);
            for (const key of SPEC_KEYS) {
                expect(typeof def.spec[key]).toBe('string');
                expect(def.spec[key]).toMatch(/^#[0-9a-fA-F]{3,6}$/);
            }
        }
    });

    it('DEFAULT_THEME_ID is a registered theme', () => {
        expect(isThemeId(DEFAULT_THEME_ID)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Contrast
// ---------------------------------------------------------------------------

/**
 * Relative luminance per WCAG 2.1, and the contrast ratio between two hexes.
 *
 * Implemented here rather than imported because nothing in the app computes
 * contrast at runtime — this is a build-time assertion about authored values,
 * and a test that re-derives the formula independently is the point.
 */
function relativeLuminance(hex: string): number {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const channel = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: string, b: string): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const [hi, lo] = la > lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
}

describe('theme contrast', () => {
    /**
     * Every pair here is a token the player actually READS as text or as a
     * value chip, against the surface it is drawn on.
     *
     * `ash` is deliberately absent: VISUAL_LANGUAGE.md records it as
     * borders/disabled only and explicitly NOT body or hint text, precisely
     * because it is too low-contrast against `bg`. Asserting AA on it would either fail honestly or push a border
     * colour brighter than a border should be.
     */
    const READABLE_PAIRS: ReadonlyArray<readonly [keyof ThemeSpec, keyof ThemeSpec]> = [
        ['parchment', 'bg'],
        ['parchment', 'panelBg'],
        ['bone', 'bg'],
        ['bone', 'panelBg'],
        ['sulfur', 'bg'],
        ['blood', 'bg'],
        ['rust', 'bg'],
        ['rust', 'panelBg'],
    ];

    it.each(THEME_ORDER)('%s keeps every readable pair at WCAG AA (4.5:1)', (id) => {
        const { spec } = THEME_SPECS[id];
        // Collect, then assert once: a failure then names EVERY pair that
        // broke and its ratio, instead of stopping at the first one.
        const failures = READABLE_PAIRS
            .map(([fg, bg]) => ({ pair: `${fg}/${bg}`, ratio: contrastRatio(spec[fg], spec[bg]) }))
            .filter((r) => r.ratio < 4.5)
            .map((r) => `${r.pair} = ${r.ratio.toFixed(2)}`);
        expect(failures).toEqual([]);
    });

    it('the parchment/bg pair clears AA by a wide margin on every theme', () => {
        // Body prose is the most-read text in the game; AA is the floor, not
        // the target. This pins the intent that it stays comfortably above it.
        for (const id of THEME_ORDER) {
            const { spec } = THEME_SPECS[id];
            expect(contrastRatio(spec.parchment, spec.bg)).toBeGreaterThanOrEqual(12);
        }
    });

    it('contrastRatio is symmetric and self-consistent', () => {
        // Guards the helper itself, so a broken formula cannot silently pass
        // the assertions above.
        expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
        expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
        expect(contrastRatio('#7a7a7a', '#7a7a7a')).toBeCloseTo(1, 5);
    });
});

describe('node-kind tokens', () => {
    const rgb = (hex: string): number[] => {
        const n = parseInt(hex.replace('#', ''), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const distance = (a: string, b: string): number => {
        const [ca, cb] = [rgb(a), rgb(b)];
        return Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]);
    };
    /** The closest two kind tokens of a palette, by RGB distance. */
    const closestPair = (p: Palette): number => {
        let min = Infinity;
        for (let i = 0; i < KIND_KEYS.length; i++) {
            for (let j = i + 1; j < KIND_KEYS.length; j++) {
                min = Math.min(min, distance(p[KIND_KEYS[i]], p[KIND_KEYS[j]]));
            }
        }
        return min;
    };

    it('mixHex moves one hue toward another as an opaque hex', () => {
        expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
        expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
        expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
        expect(mixHex('#ff0000', '#0000ff', 0.25)).toBe('#bf0040');
    });

    it.each(THEME_ORDER)('%s: every kind token is an opaque hex', (id) => {
        const p = paletteFor(id);
        for (const key of KIND_KEYS) expect(p[key]).toMatch(/^#[0-9a-f]{6}$/);
    });

    it.each(THEME_ORDER)('%s: every kind wears its own colour', (id) => {
        const p = paletteFor(id);
        expect(new Set(KIND_KEYS.map((k) => p[k])).size).toBe(KIND_KEYS.length);
        expect(closestPair(p)).toBeGreaterThanOrEqual(18);
    });

    it('the default theme keeps its kinds well apart', () => {
        expect(closestPair(paletteFor(DEFAULT_THEME_ID))).toBeGreaterThanOrEqual(35);
    });

    it.each(THEME_ORDER)('%s: each glyph stands off its disc at 3:1 or better', (id) => {
        const p = paletteFor(id);
        const weak = KIND_KEYS
            .map((k) => ({ k, ratio: contrastOf(kindInk(p, p[k]), p[k]) }))
            .filter((r) => r.ratio < 3)
            .map((r) => `${r.k} = ${r.ratio.toFixed(2)}`);
        expect(weak).toEqual([]);
    });

    it('the quest token is the theme lamp, the brightest accent', () => {
        for (const id of THEME_ORDER) {
            const p = paletteFor(id);
            expect(p.kindQuest).toBe(THEME_SPECS[id].spec.sulfur);
        }
    });

    it('kindInk picks the dark ground on a light disc and parchment on a dark one', () => {
        const p = paletteFor(DEFAULT_THEME_ID);
        expect(kindInk(p, p.parchment)).toBe(p.deepBg);
        expect(kindInk(p, p.deepBg)).toBe(p.parchment);
    });
});
