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

/**
 * T's parchment "Embark" scroll, the main menu's NEW GAME button (plan
 * 121.3): cut from T's sheet of button plates by `scripts/cut-embark-button.mjs`
 * (record in `provenance.json`), 640x176 with its own torn-edge alpha.
 */
export const EMBARK_SCROLL = require('./embark-scroll.webp');

/** Width over height of `EMBARK_SCROLL`, so the button can size before it loads. */
export const EMBARK_SCROLL_ASPECT = 640 / 176;
