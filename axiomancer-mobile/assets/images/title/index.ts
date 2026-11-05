/**
 * Title plate registry — the one engraving behind the title screen and the
 * main menu: Gustave Doré's Inferno, Plate 3 (Canto I: Dante alone in the dark
 * wood, the lion before him, a pale slit of sky between the cliffs), T's pick
 * (plan 121.2), acquired by `scripts/acquire-art.mjs`
 * (`scripts/art-sources.json` → `lion-in-the-wood`; licence and crop in
 * `provenance.json`). The launcher icons come from the previous plate,
 * Purgatorio I (`../icon.provenance.json`), not from this one.
 */

/** The plate, 1308x1600, graded toward the void like the map backdrops. */
export const TITLE_PLATE = require('./lion-in-the-wood.webp');

/** Width over height of `TITLE_PLATE`, for layout before the image loads. */
export const TITLE_PLATE_ASPECT = 1308 / 1600;
