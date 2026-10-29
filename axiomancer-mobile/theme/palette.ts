/**
 * Theme registry + palette factory.
 *
 * Miserere Mei, Deus ships a single dark-gothic identity, but the colour
 * *accents* are theme-driven so the world can shift palette as the
 * pilgrim descends into different regions (future biome worlds) without
 * touching the 150+ components that read `AXM.*`.
 *
 * ## How it works
 *
 * The active palette is a live value held by `theme/runtime.tsx`.
 * Reactive UI reads it through `usePalette()` / `makeStyles()`, so a
 * theme switch re-paints in place without a reload. `AXM` in
 * `theme/axm.ts` is a static snapshot of the active palette at
 * module-load, kept for non-reactive consumers.
 *
 * ## Authoring a new theme
 *
 * Add a `ThemeSpec` (the ~17 base hues) to `THEME_SPECS`. The derived
 * translucent tokens (dividers, accent washes, overlays) are computed
 * by `makePalette` so they always track the theme's accents.
 *
 * The blackletter + serif type system (FONTS / TYPE) is identity and
 * is **not** theme-driven.
 */

export type ThemeId =
    | 'ashen-gold'
    | 'coastal-verdant'
    | 'ember-depths'
    | 'frost-marrow'
    | 'plague-bloom';

/** The integrated default — the "richer accents, dark base" direction. */
export const DEFAULT_THEME_ID: ThemeId = 'ashen-gold';

/** AsyncStorage / localStorage slot. `:v1` so a shape change can migrate. */
export const THEME_STORAGE_KEY = '@axiomancer/theme:v1';

/**
 * The ~17 authored base hues for a theme. Everything else (translucent
 * washes, dividers, overlays) is derived from these so a new theme only
 * needs these values.
 */
export interface ThemeSpec {
    bg: string;
    parchment: string;
    blood: string;
    sulfur: string;
    rust: string;
    heal: string;
    bone: string;
    ash: string;
    panelBg: string;
    deepBg: string;
    dockBg: string;
    silhouette: string;
    selectFill: string;
    debuff: string;
    buff: string;
    pixelShadow: string;
    pixelHighlight: string;
    /** A cool lapis: the map's travel token (`kindTravel`). */
    lapis: string;
    /** A murex purple: the map's story token (`kindStory`). */
    murex: string;
}

/** The full resolved palette — the shape of `AXM`. */
export interface Palette extends ThemeSpec {
    backdrop: string;
    overlay: string;
    divider: string;
    parchmentMed: string;
    parchmentDim: string;
    sulfurSubtle: string;
    sulfurMed: string;
    healSubtle: string;
    bloodSubtle: string;
    bloodMed: string;
    bloodStrong: string;
    rustSubtle: string;
    shadow: string;
    nodeBg: string;
    /**
     * The map's node-kind tokens: the opaque disc a node wears under its kind
     * glyph (`components/exploration/KindToken.tsx`). Opaque hexes, mixed
     * from the theme's own hues so every theme carries a distinct one per
     * kind; `kindInk` picks the glyph's colour on each.
     */
    kindQuest: string;
    kindBoss: string;
    kindElite: string;
    kindFight: string;
    kindHazard: string;
    kindRest: string;
    kindLoot: string;
    kindVillage: string;
    kindStory: string;
    kindTravel: string;
    kindStart: string;
    kindWaypoint: string;
}

export interface ThemeDef {
    id: ThemeId;
    /** Short display name for the dev switcher. */
    name: string;
    /** One-line flavour for the dev switcher. */
    blurb: string;
    spec: ThemeSpec;
}

function hexToRgb(hex: string): [number, number, number] {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, alpha: number): string {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** `a` moved `t` of the way to `b`, as an opaque hex. */
export function mixHex(a: string, b: string, t: number): string {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    return `#${ca
        .map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, '0'))
        .join('')}`;
}

/** WCAG relative luminance of a hex. */
function luminance(hex: string): number {
    const channel = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const [r, g, b] = hexToRgb(hex).map(channel);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hexes. */
export function contrastOf(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/**
 * The glyph colour on a kind token: the theme's darkest ground or its
 * parchment, whichever stands further off the disc, so a light disc
 * carries a dark glyph and a dark disc a light one.
 */
export function kindInk(palette: Pick<Palette, 'deepBg' | 'parchment'>, disc: string): string {
    return contrastOf(palette.deepBg, disc) >= contrastOf(palette.parchment, disc)
        ? palette.deepBg
        : palette.parchment;
}

/** Derive the full translucent palette from a theme's base hues. */
export function makePalette(s: ThemeSpec): Palette {
    return {
        ...s,
        backdrop: rgba(s.deepBg, 0.4),
        overlay: rgba(s.deepBg, 0.92),
        divider: rgba(s.parchment, 0.12),
        parchmentMed: rgba(s.parchment, 0.35),
        parchmentDim: rgba(s.parchment, 0.65),
        sulfurSubtle: rgba(s.sulfur, 0.1),
        sulfurMed: rgba(s.sulfur, 0.3),
        healSubtle: rgba(s.heal, 0.1),
        bloodSubtle: rgba(s.blood, 0.1),
        bloodMed: rgba(s.blood, 0.3),
        bloodStrong: rgba(s.blood, 0.55),
        rustSubtle: rgba(s.rust, 0.1),
        shadow: 'rgba(0, 0, 0, 0.6)',
        nodeBg: rgba(s.bg, 0.9),
        // Quest wears the theme's lamp, the brightest accent; the boss its
        // blood, the elite a darker blood; the common fight stays bone.
        kindQuest: s.sulfur,
        kindBoss: s.blood,
        kindElite: mixHex(s.blood, s.deepBg, 0.45),
        kindFight: s.bone,
        kindHazard: s.rust,
        kindRest: s.heal,
        kindLoot: mixHex(s.sulfur, s.deepBg, 0.45),
        kindVillage: s.parchment,
        kindStory: s.murex,
        kindTravel: s.lapis,
        kindStart: mixHex(s.heal, s.deepBg, 0.45),
        kindWaypoint: mixHex(s.bone, s.deepBg, 0.6),
    };
}

/**
 * The accents are HISTORICAL PIGMENT.
 *
 * The world plates are 19th-century wood engravings graded toward the void:
 * they carry essentially zero chroma. Saturated UI accents would read as
 * stickers laid on top of a print rather than as part of the page, so each
 * theme's hues are colours a hand-tinted plate or an illuminated manuscript
 * would actually carry — iron-gall, oxblood, gold leaf, verdigris, red ochre,
 * lapis, orpiment, murex.
 *
 * Readability is pinned by `READABLE_PAIRS` in `__tests__/palette.test.ts`,
 * which holds every readable token/surface pair at WCAG AA on every theme.
 */
export const THEME_SPECS: Record<ThemeId, ThemeDef> = {
    'ashen-gold': {
        id: 'ashen-gold',
        name: 'Ashen Gold',
        blurb: 'Cursed lands — iron-gall ink, gold leaf and oxblood.',
        spec: {
            bg: '#0b0a09',
            parchment: '#ece0c8',
            blood: '#e05a45',
            sulfur: '#dcb04a',
            rust: '#c36431',
            heal: '#8fa855',
            bone: '#9c937f',
            ash: '#46403a',
            panelBg: '#15110c',
            deepBg: '#070509',
            dockBg: '#100c08',
            silhouette: '#0c0908',
            selectFill: '#27200c',
            debuff: '#241a33',
            buff: '#33270d',
            pixelShadow: '#6e2a1c',
            pixelHighlight: '#f6ecd8',
            lapis: '#6f8fb8',
            murex: '#9a6aa8',
        },
    },
    'coastal-verdant': {
        id: 'coastal-verdant',
        name: 'Coastal Verdant',
        blurb: 'Salt-bitten shores — verdigris and weathered coral over slate.',
        spec: {
            bg: '#080b0c',
            parchment: '#e2e8d8',
            blood: '#e07a5a',
            sulfur: '#6fb89c',
            rust: '#478b83',
            heal: '#8cb473',
            bone: '#8a988f',
            ash: '#324440',
            panelBg: '#0c1614',
            deepBg: '#05090a',
            dockBg: '#0a1210',
            silhouette: '#081110',
            selectFill: '#0d2a24',
            debuff: '#14243a',
            buff: '#10302a',
            pixelShadow: '#1a4a48',
            pixelHighlight: '#e6f2ea',
            lapis: '#6a8fc4',
            murex: '#a2789e',
        },
    },
    'ember-depths': {
        id: 'ember-depths',
        name: 'Ember Depths',
        blurb: 'Molten underworld — red ochre and smoke.',
        spec: {
            bg: '#0c0706',
            parchment: '#eddcc4',
            blood: '#e2604a',
            sulfur: '#dd9a4e',
            rust: '#cd5a2a',
            heal: '#9caf5c',
            bone: '#a8917e',
            ash: '#4a3a32',
            panelBg: '#180e09',
            deepBg: '#0a0503',
            dockBg: '#140b06',
            silhouette: '#0e0805',
            selectFill: '#33180a',
            debuff: '#2b1a18',
            buff: '#33240c',
            pixelShadow: '#7a2a18',
            pixelHighlight: '#f6e8d4',
            lapis: '#7d8fae',
            murex: '#a0607e',
        },
    },
    'frost-marrow': {
        id: 'frost-marrow',
        name: 'Frost Marrow',
        blurb: 'Frozen reaches — pale lapis over bone.',
        spec: {
            bg: '#080a0d',
            parchment: '#e0e7ee',
            blood: '#d3697a',
            sulfur: '#86b2c9',
            rust: '#6b85a2',
            heal: '#83b5a6',
            bone: '#8893a0',
            ash: '#2f3b48',
            panelBg: '#0c131c',
            deepBg: '#05080c',
            dockBg: '#0a1018',
            silhouette: '#080e15',
            selectFill: '#0f2636',
            debuff: '#1b2040',
            buff: '#122a36',
            pixelShadow: '#244a62',
            pixelHighlight: '#e6f0f4',
            lapis: '#7c86d6',
            murex: '#b07ab8',
        },
    },
    'plague-bloom': {
        id: 'plague-bloom',
        name: 'Plague Bloom',
        blurb: 'Rotting fen — orpiment and murex.',
        spec: {
            bg: '#0a0a08',
            parchment: '#e3e7cb',
            blood: '#c46bae',
            sulfur: '#b8c661',
            rust: '#7b8a3a',
            heal: '#74b899',
            bone: '#919a7e',
            ash: '#3e4233',
            panelBg: '#11140c',
            deepBg: '#07090a',
            dockBg: '#0d1108',
            silhouette: '#0a0e08',
            selectFill: '#1f2a0a',
            debuff: '#2a1a38',
            buff: '#232e10',
            pixelShadow: '#4e2a5e',
            pixelHighlight: '#eef4dc',
            lapis: '#6a90b8',
            murex: '#8a6ac8',
        },
    },
};

/** Ordered list for the dev switcher (default first). */
export const THEME_ORDER: ThemeId[] = [
    'ashen-gold',
    'coastal-verdant',
    'ember-depths',
    'frost-marrow',
    'plague-bloom',
];

export function isThemeId(value: unknown): value is ThemeId {
    return typeof value === 'string' && value in THEME_SPECS;
}

/**
 * Resolve the active theme id **synchronously** at module-load.
 * Priority: an explicit global override (used by the screenshot
 * harness / tests) → persisted web `localStorage` choice → default.
 *
 * Native (no `localStorage`) always boots the default and relies on the
 * dev switcher's reload + persisted value; the switcher mirrors the id
 * into the same global so a same-session reload honours the choice.
 */
export function resolveActiveThemeId(): ThemeId {
    try {
        const override = (globalThis as { __AXM_THEME__?: unknown }).__AXM_THEME__;
        if (isThemeId(override)) return override;
    } catch {
        /* ignore */
    }
    try {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem(THEME_STORAGE_KEY);
            if (isThemeId(stored)) return stored;
        }
    } catch {
        /* ignore — storage may be unavailable */
    }
    return DEFAULT_THEME_ID;
}

export function paletteFor(id: ThemeId): Palette {
    return makePalette(THEME_SPECS[id].spec);
}
