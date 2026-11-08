/**
 * Sizing for Self's HEART / BODY / MIND plaques, from the width of their row.
 *
 * The plaque art is nine-sliced and its corners keep a fixed size, so at the
 * art's drawn scale a third of a phone's width is mostly frame. The art scales
 * down with the plaque and the content pads past what the art keeps, so a label
 * or a number never lands on the frame.
 */

import { kitScale, unstretchedInset } from '@/components/experience/KitBackdrop';

export const STAT_TILE_COUNT = 3;
export const STAT_TILE_GAP = 4;
/** Rim of air between the art's kept edge and the content. */
const AIR = 3;
/** Width at which the plaque art draws at its full scale. */
const FULL_SCALE_WIDTH = 200;

/**
 * A conservative advance for one capital of the label font, in ems. The widest
 * capitals of the sans face run about 0.72 em; this is the bound the labels are
 * sized against (there is no text measurer in tests). Tracking is 0.
 */
export const LABEL_GLYPH_EM = 0.75;
/** The widest value is two digits. */
export const VALUE_GLYPHS = 2;
export const LABEL_MAX_SIZE = 13;
export const LABEL_MIN_SIZE = 11;
export const VALUE_MAX_SIZE = 32;

/** The width a word of `glyphs` capitals can take at `fontSize`. */
export function labelWidth(glyphs: number, fontSize: number): number {
    return glyphs * LABEL_GLYPH_EM * fontSize;
}

export interface StatTileLayout {
    /** Each plaque's width, in points. */
    width: number;
    /** Points per art pixel for the plaque's frame. */
    scale: number;
    padTop: number;
    padBottom: number;
    padSide: number;
    /** Room between the padding on both sides. */
    contentWidth: number;
    /** Label size: 13 where it fits, stepping down to a floor of 11. */
    labelSize: number;
    /** Value size: 32 where two digits fit, smaller below. */
    valueSize: number;
}

/** `rowWidth` is the width the three plaques and their gaps share. */
export function statTileLayout(rowWidth: number): StatTileLayout {
    const width = Math.floor((rowWidth - STAT_TILE_GAP * (STAT_TILE_COUNT - 1)) / STAT_TILE_COUNT);
    const scale = kitScale('stat-tile') * Math.min(1, width / FULL_SCALE_WIDTH);
    const inset = unstretchedInset('stat-tile', scale)!;
    const padSide = Math.ceil(Math.max(inset.left, inset.right)) + AIR;
    const contentWidth = width - 2 * padSide;
    // The longest label is HEART (five capitals).
    const labelSize = Math.max(LABEL_MIN_SIZE, Math.min(LABEL_MAX_SIZE, Math.floor(contentWidth / (5 * LABEL_GLYPH_EM))));
    const valueSize = Math.min(VALUE_MAX_SIZE, Math.floor(contentWidth / (VALUE_GLYPHS * LABEL_GLYPH_EM)));
    return {
        width,
        scale,
        padTop: Math.ceil(inset.top) + AIR,
        padBottom: Math.ceil(inset.bottom) + AIR,
        padSide,
        contentWidth,
        labelSize,
        valueSize,
    };
}
