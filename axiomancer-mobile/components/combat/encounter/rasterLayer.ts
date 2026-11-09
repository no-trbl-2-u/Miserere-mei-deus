/**
 * Texture-cache props for a combat layer that never changes between frames (PF2a).
 *
 * Spread onto the `View` that wraps a static SVG layer or a `CombatDie`: Android draws
 * the subtree once into a hardware texture and re-composites it while the board is
 * dragged, and iOS rasterises it the same way. Nothing is drawn differently, so web
 * and the jest snapshots show the same pixels; only the cost per dragged frame drops.
 *
 * Inputs: none. Output: the two props, spread as `{...RASTER_LAYER}`.
 */
export const RASTER_LAYER = {
    renderToHardwareTextureAndroid: true,
    shouldRasterizeIOS: true,
} as const;
