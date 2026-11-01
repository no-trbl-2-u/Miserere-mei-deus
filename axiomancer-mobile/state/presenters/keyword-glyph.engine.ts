/**
 * Which printed keywords have a glyph, what each one is (its colour), and the
 * word it stands for. The card face in glyph mode swaps exactly these words
 * for an icon; VITAE, numbers, `X` and the logic words stay as they print.
 *
 * The icons are drawn in `components/keyword-glyphs/`, one component per
 * keyword behind one keyword-to-component map, so a generated image can
 * replace a glyph by changing one entry there. This file is the pure side: the
 * keyword list, the category each wears, and the lookup. Pure.
 */

/** Every keyword a card line prints in capitals, bar VITAE (a stat) and
 *  CONVICTION (a system word, `SYSTEM_GLOSSARY` in `state/combat/keywords.ts`,
 *  exempt from the keyword admission bar — `docs/card-spec.md` §8). Both read
 *  as plain text on every face, never a glyph badge. */
export const GLYPH_KEYWORDS = [
    'DEAL', 'GUARD', 'HEAL', 'SACRIFICE', 'WAIVE', 'EXILE', 'TETHER', 'LEECH', 'VULNERABLE',
    'INFERNO', 'BLIZZARD', 'STORM', 'FROZEN', 'DRAW', 'THORNS', 'REFLECT', 'RETRIEVE', 'DISCARD', 'HOLDS',
    'RADIANCE', 'MERCY', 'YIELDING',
] as const;

export type GlyphKeyword = (typeof GLYPH_KEYWORDS)[number];

/** What a keyword is; each category is one colour (`HUE.glyph*`). */
export type GlyphCategory =
    | 'damage' | 'defence' | 'blood' | 'life' | 'hex' | 'gold' | 'fire' | 'ice' | 'storm' | 'bone' | 'ember';

export const GLYPH_CATEGORY: Readonly<Record<GlyphKeyword, GlyphCategory>> = Object.freeze({
    DEAL: 'damage',
    THORNS: 'damage',
    GUARD: 'defence',
    HOLDS: 'defence',
    REFLECT: 'defence',
    SACRIFICE: 'blood',
    HEAL: 'life',
    VULNERABLE: 'hex',
    TETHER: 'hex',
    LEECH: 'hex',
    MERCY: 'gold',
    RADIANCE: 'gold',
    YIELDING: 'gold',
    WAIVE: 'gold',
    INFERNO: 'fire',
    BLIZZARD: 'ice',
    FROZEN: 'ice',
    STORM: 'storm',
    DISCARD: 'bone',
    DRAW: 'bone',
    RETRIEVE: 'bone',
    EXILE: 'ember',
});

const GLYPH_KEYWORD_SET: ReadonlySet<string> = new Set(GLYPH_KEYWORDS);

/**
 * The glyph keyword a word names, or null. Case-insensitive, so a registry
 * title (`Deal`) and a printed word (`DEAL`) both resolve.
 */
export function glyphKeywordFor(word: string | null | undefined): GlyphKeyword | null {
    if (!word) return null;
    const upper = word.trim().toUpperCase();
    return GLYPH_KEYWORD_SET.has(upper) ? (upper as GlyphKeyword) : null;
}

/** The accessibility label of a glyph: the keyword's word in capitals. */
export function glyphLabel(keyword: GlyphKeyword): string {
    return keyword;
}
