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

export interface StatTileLayout {
    /** Each plaque's width, in points. */
    width: number;
    /** Points per art pixel for the plaque's frame. */
    scale: number;
    padTop: number;
    padBottom: number;
    padSide: number;
}

/** `rowWidth` is the width the three plaques and their gaps share. */
export function statTileLayout(rowWidth: number): StatTileLayout {
    const width = Math.floor((rowWidth - STAT_TILE_GAP * (STAT_TILE_COUNT - 1)) / STAT_TILE_COUNT);
    const scale = kitScale('stat-tile') * Math.min(1, width / FULL_SCALE_WIDTH);
    const inset = unstretchedInset('stat-tile', scale)!;
    return {
        width,
        scale,
        padTop: Math.ceil(inset.top) + AIR,
        padBottom: Math.ceil(inset.bottom) + AIR,
        padSide: Math.ceil(Math.max(inset.left, inset.right)) + AIR,
    };
}
