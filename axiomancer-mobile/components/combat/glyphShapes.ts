/**
 * Card-face FREE-glyph SILHOUETTES: the giant
 * top-left glyph must read as the SHAPE of the effect it causes — a flame for
 * BURN, droplets for BLEED — not an abstract rune.
 *
 * Pure + dependency-free (like `statusGlyphs`): a keyword → SVG path table the
 * renderers draw at any size (24×24 viewBox, single filled path; `evenodd`
 * marks the paths that carve holes — target rings, the eye's pupil, the
 * shield's crack). Keywords the table doesn't know keep their text-rune
 * fallback on the face.
 *
 * The editor (`CardFace.tsx` KwGlyph) and the DevLog catalog
 * (`scripts/build-catalog.mjs`) carry copies of these paths — the same
 * precedent as the isometric stance cube, duplicated per renderer because the
 * three live in different runtimes. Keep the three tables in sync.
 */

export interface GlyphShape {
    d: string;
    /** fillRule — 'evenodd' for shapes that carve holes out of themselves. */
    evenodd?: boolean;
}

// ── The silhouettes (24×24) ──────────────────────────────────────────────────
const DROPS: GlyphShape = { d: 'M6 4 C4 9 4 12 6 13 C8 12 8 9 6 4Z M12 8 C10 13 10 16 12 17 C14 16 14 13 12 8Z M18 4 C16 9 16 12 18 13 C20 12 20 9 18 4Z' };
const SHIELD: GlyphShape = { d: 'M12 2 L21 5 V12 C21 17 17 21 12 22 C7 21 3 17 3 12 V5 Z' };
// VULNERABLE — the shield, split by a crack: the foe's guard is open.
const CRACKED_SHIELD: GlyphShape = { d: 'M12 2 L21 5 V12 C21 17 17 21 12 22 C7 21 3 17 3 12 V5 Z M12.6 4.2 L10 9.5 L13.4 11.4 L10.4 19.6 L11.6 19.8 L15.4 10.8 L12 9 L14 4.4 Z', evenodd: true };
const HEART: GlyphShape = { d: 'M12 21 C5 16 3 12 3 8 A4.6 4.6 0 0 1 12 7 A4.6 4.6 0 0 1 21 8 C21 12 19 16 12 21 Z' };
// SACRIFICE — one drop of your own blood.
const DROP: GlyphShape = { d: 'M12 2 C8 8 5 12 5 15 A7 7 0 0 0 19 15 C19 12 16 8 12 2 Z' };
// LEECH — a crescent bite: the foe's VITAE drawn back to you.
const CRESCENT: GlyphShape = { d: 'M15 3 A9 9 0 1 0 21 15 A7 7 0 1 1 15 3 Z' };
// TETHER — two chain links: what you pay, the foe pays.
const LINKS: GlyphShape = { d: 'M2 12 A4 4 0 0 1 6 8 H11 A4 4 0 0 1 11 16 H6 A4 4 0 0 1 2 12 Z M5 12 A1.5 1.5 0 0 0 6.5 13.5 H10.5 A1.5 1.5 0 0 0 10.5 10.5 H6.5 A1.5 1.5 0 0 0 5 12 Z M13 8 H18 A4 4 0 0 1 18 16 H13 A4 4 0 0 1 13 8 Z M13.5 10.5 A1.5 1.5 0 0 0 13.5 13.5 H17.5 A1.5 1.5 0 0 0 17.5 10.5 Z', evenodd: true };
// DEAL — an upright blade: plain damage to the foe.
const SWORD: GlyphShape = { d: 'M12 2 L14 5 V15 H18 V17 H13 V20 A1 1 0 0 1 11 20 V17 H6 V15 H10 V5 Z' };
// INFERNO — a flame. BLIZZARD — a snowflake. STORM — a bolt. DRAW — two cards.
const FLAME: GlyphShape = { d: 'M12 2 C13 6 18 8 18 14 A6 6 0 0 1 6 14 C6 10 9 9 9 5 C11 7 11 9 12 10 C13 8 12 5 12 2 Z' };
const SNOWFLAKE: GlyphShape = { d: 'M11 2 H13 V22 H11 Z M2.3 7.2 L3.3 5.5 L21.7 16.8 L20.7 18.5 Z M3.3 18.5 L2.3 16.8 L20.7 5.5 L21.7 7.2 Z' };
const BOLT: GlyphShape = { d: 'M14 2 L5 13 H11 L9 22 L19 10 H13 L15 2 Z' };
const CARDS: GlyphShape = { d: 'M4 7 H14 V21 H4 Z M8 3 H19 A1 1 0 0 1 20 4 V17 H16 V6 H8 Z' };
// THORNS — a spiked burst. REFLECT — a two-way arrow. RETRIEVE — a return arrow.
const BURST: GlyphShape = { d: 'M12 2 L14 8 L20 4 L16 10 L22 12 L16 14 L20 20 L14 16 L12 22 L10 16 L4 20 L8 14 L2 12 L8 10 L4 4 L10 8 Z' };
const RICOCHET: GlyphShape = { d: 'M2 12 L9 5 V9 H15 V5 L22 12 L15 19 V15 H9 V19 Z' };
const RETURN: GlyphShape = { d: 'M9 3 L3 8 L9 13 V10 H15 A4 4 0 0 1 15 18 H7 V21 H15 A7 7 0 0 0 15 7 H9 Z' };
const EYE: GlyphShape = { d: 'M12 5.5 C6 5.5 2 12 2 12 C2 12 6 18.5 12 18.5 C18 18.5 22 12 22 12 C22 12 18 5.5 12 5.5 Z M12 8.5 A3.5 3.5 0 1 0 12 15.5 A3.5 3.5 0 1 0 12 8.5 Z', evenodd: true };

/** UPPERCASE face keyword → silhouette, for the keys a live face can produce. */
export const GLYPH_SHAPES: Record<string, GlyphShape> = {
    // ── afflictions ──
    BLEED: DROPS,
    VULNERABLE: CRACKED_SHIELD,
    // ── currencies / verbs ──
    DEAL: SWORD,
    GUARD: SHIELD,
    HEAL: HEART,
    // ── the blood price ──
    SACRIFICE: DROP,
    LEECH: CRESCENT,
    TETHER: LINKS,
    // ── the weather ──
    INFERNO: FLAME,
    BLIZZARD: SNOWFLAKE,
    STORM: BOLT,
    DRAW: CARDS,
    // ── the spikes ──
    THORNS: BURST,
    REFLECT: RICOCHET,
    RETRIEVE: RETURN,
};

/** The silhouette for a face keyword, or null → keep the text-rune fallback. */
export function glyphShapeFor(key: string | null | undefined): GlyphShape | null {
    if (!key) return null;
    return GLYPH_SHAPES[key.toUpperCase()] ?? null;
}
