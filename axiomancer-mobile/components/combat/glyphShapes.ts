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
// The enemy words: WARD a battlement, MEND a stitch cross, SCOUR a scrubbed
// sparkle, BRINE a breaking wave.
const BATTLEMENT: GlyphShape = { d: 'M4 3 H7 V6 H10 V3 H14 V6 H17 V3 H20 V21 H4 Z' };
const STITCH: GlyphShape = { d: 'M10 3 H14 V10 H21 V14 H14 V21 H10 V14 H3 V10 H10 Z' };
const SPARKLE: GlyphShape = { d: 'M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z' };
const WAVE: GlyphShape = { d: 'M2 10 C5 6 8 6 12 10 C16 14 19 14 22 10 V16 C19 20 16 20 12 16 C8 12 5 12 2 16 Z' };
// TANGLE a net, UNDERTOW a pulling arrow, BARNACLE a shell with its mouth open.
const NET: GlyphShape = { d: 'M3 8 H21 V11 H3 Z M3 13 H21 V16 H3 Z M8 3 H11 V21 H8 Z M13 3 H16 V21 H13 Z' };
const PULL: GlyphShape = { d: 'M10 2 H14 V13 H19 L12 22 L5 13 H10 Z' };
const SHELL: GlyphShape = { d: 'M12 3 L21 21 H3 Z M12 9 L8 18 H16 Z', evenodd: true };
const EYE: GlyphShape = { d: 'M12 5.5 C6 5.5 2 12 2 12 C2 12 6 18.5 12 18.5 C18 18.5 22 12 22 12 C22 12 18 5.5 12 5.5 Z M12 8.5 A3.5 3.5 0 1 0 12 15.5 A3.5 3.5 0 1 0 12 8.5 Z', evenodd: true };

// RADIANCE — a sun: a disc and eight rays. MERCY — a dove: the body, the raised wing, the tail.
const SUN: GlyphShape = { d: 'M12 7 A5 5 0 1 0 12 17 A5 5 0 1 0 12 7 Z M11 1 H13 V5 H11 Z M11 19 H13 V23 H11 Z M1 11 H5 V13 H1 Z M19 11 H23 V13 H19 Z M4.2 5.6 L5.6 4.2 L8.4 7 L7 8.4 Z M15.6 17 L17 15.6 L19.8 18.4 L18.4 19.8 Z M15.6 7 L18.4 4.2 L19.8 5.6 L17 8.4 Z M4.2 18.4 L7 15.6 L8.4 17 L5.6 19.8 Z' };
const DOVE: GlyphShape = { d: 'M21 5 C18 5 16 6.5 15 8 C14 6 12 4.5 9 4 C10 6 10.5 7.5 10 9 C7 9.5 4 11.5 2 15 C4.5 14.5 6.5 14.5 8.5 15 C7.5 17 7 19 7 21 C9.5 19.5 11.5 17.5 13 15.5 C16 14 18 11 18.5 8 C19.5 7.5 20.5 6.5 21 5 Z' };

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
    // ── the merciful ──
    RADIANCE: SUN,
    MERCY: DOVE,
    // ── the spikes ──
    THORNS: BURST,
    REFLECT: RICOCHET,
    RETRIEVE: RETURN,
    // ── the enemy words ──
    WARD: BATTLEMENT,
    MEND: STITCH,
    SCOUR: SPARKLE,
    BRINE: WAVE,
    TANGLE: NET,
    UNDERTOW: PULL,
    BARNACLE: SHELL,
};

/** The silhouette for a face keyword, or null → keep the text-rune fallback. */
export function glyphShapeFor(key: string | null | undefined): GlyphShape | null {
    if (!key) return null;
    return GLYPH_SHAPES[key.toUpperCase()] ?? null;
}
