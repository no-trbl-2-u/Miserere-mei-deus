/**
 * The Vellum & Ink pieces of the experience kit that T's picks name — the
 * parchment half of the kit, worn by the Wilds, the Spoils, the Ledger and the
 * Satchel's filter tabs. They are the delivered PNGs one level up, trimmed of
 * their 2px gutter, capped at 800px wide and converted to WebP (the same
 * recipe the brass set used; provenance.json beside this file). `w` and `h`
 * are the WebP's pixel size, which `KitBackdrop` slices against.
 *
 * Only the pieces a vellum place in `components/experience/looks.ts` draws
 * live here; a piece no place uses stays a PNG one level up, unbundled.
 */

export const VELLUM = {
    'action-button-vellum': { source: require('./action-button-vellum.webp'), w: 366, h: 137 },
    'divider-ornate-ink': { source: require('./divider-ornate-ink.webp'), w: 708, h: 55 },
    'divider-plain-ink': { source: require('./divider-plain-ink.webp'), w: 697, h: 19 },
    'divider-short-ink': { source: require('./divider-short-ink.webp'), w: 402, h: 33 },
    'filter-tab-vellum': { source: require('./filter-tab-vellum.webp'), w: 358, h: 91 },
    'menu-panel-vellum': { source: require('./menu-panel-vellum.webp'), w: 726, h: 229 },
    'modal-panel-vellum': { source: require('./modal-panel-vellum.webp'), w: 741, h: 437 },
    'nav-dock-vellum': { source: require('./nav-dock-vellum.webp'), w: 800, h: 74 },
    'quest-row-vellum': { source: require('./quest-row-vellum.webp'), w: 728, h: 135 },
    'section-header-vellum-leaf': { source: require('./section-header-vellum-leaf.webp'), w: 722, h: 66 },
    'section-header-vellum-star': { source: require('./section-header-vellum-star.webp'), w: 728, h: 67 },
    'vellum-chip': { source: require('./vellum-chip.webp'), w: 159, h: 96 },
} as const;

export type VellumPiece = keyof typeof VELLUM;
