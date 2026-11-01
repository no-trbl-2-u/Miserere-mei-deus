/**
 * The map camera's memory (MC1b): where the player left the camera on each
 * map, kept for the life of the app and never saved.
 *
 * The map unmounts under a fight, a rest or a hazard (PF4), so its camera
 * lives in shared values that die with it. `MapCanvas` writes the camera here
 * as it unmounts and reads it back as it mounts, so the player returns to the
 * same zoom and the same place they left.
 *
 * The place is stored as the CANVAS point at the pane's centre, not as a
 * translation, so it survives a pane of a different size (a keyboard, a
 * rotated phone, a taller quest box).
 */

/** A remembered camera: the zoom and the canvas point the pane's centre shows. */
export interface RememberedCamera {
    scale: number;
    /** Canvas x (device px at 1x) under the pane's centre. */
    cx: number;
    /** Canvas y (device px at 1x) under the pane's centre. */
    cy: number;
}

const memory = new Map<string, RememberedCamera>();

/** The camera last left on this map, or undefined on a first visit this session. */
export function recallCamera(mapId: string): RememberedCamera | undefined {
    return memory.get(mapId);
}

/** Remember the camera for this map, replacing any earlier one. */
export function rememberCamera(mapId: string, camera: RememberedCamera): void {
    memory.set(mapId, { ...camera });
}

/** Forget every map's camera (tests; a fresh launch starts empty anyway). */
export function clearCameraMemory(): void {
    memory.clear();
}
