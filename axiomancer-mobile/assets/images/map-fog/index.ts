/**
 * The fog past a map plate's edge (T, 2026-11-01).
 *
 * The map pane shows a still fog plate fixed to the screen, with a tileable
 * drift layer sliding over it, and each Act 1 plate is drawn from a copy
 * whose outer rim fades to transparent so the chart dissolves into the fog
 * instead of stopping on black. The fog itself is a procedural stand-in
 * until T supplies the real art; every file is logged in `provenance.json`.
 */

export const MAP_FOG = {
    still: require('./fog-still.webp'),
    drift: require('./fog-drift.webp'),
} as const;

/** The Act 1 plates with their rims faded to transparent, by region. */
export const ACT1_FADED_PLATES = {
    coast: require('./act1-coast.faded.webp'),
    forest: require('./act1-forest.faded.webp'),
    mountains: require('./act1-mountains.faded.webp'),
    underworld: require('./act1-underworld.faded.webp'),
} as const;
