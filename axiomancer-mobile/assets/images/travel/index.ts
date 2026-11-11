/**
 * The travel screen's pictures.
 *
 * One table keyed by travel node id supplies every travel picture, so T swaps
 * an image in one place (plus its file and provenance entry). An entry is
 * either a whole image (the bridge) or a crop of a map plate: the plate, the
 * landmark on it to centre on, and one zoom constant. A travel node with no
 * entry shows the dark ground alone. The crop is drawn at render time from the
 * plate; no cropped copy is written. Nothing here resolves a path into
 * `Potential Assets/`.
 */

import { ACT1_PLATES } from '@/assets/images/maps';

/** How far a cropped plate is zoomed: 2 shows half the plate's width. */
export const TRAVEL_CROP_ZOOM = 2;

/** A whole image. */
export interface TravelImageScene {
    kind: 'image';
    /** Image source for `<Image source={...}>` (a Metro asset id). */
    source: number;
}

/** A crop of an Act 1 map plate, centred on one of its landmarks. */
export interface TravelCropScene {
    kind: 'crop';
    /** The plate (a Metro asset id). */
    plate: number;
    /** The landmark list in `maps/act1-landmarks.json` the landmark is read from. */
    landmarkSet: 'act1-coast';
    /** The landmark's id in that list: the destination node's own. */
    landmark: string;
    zoom: number;
}

export type TravelScene = TravelImageScene | TravelCropScene;

/**
 * TEMP stand-in for T's bridge image: Rousseau's Pont de Batignies (public
 * domain, acquired via scripts/acquire-art.mjs; see provenance.json). T will
 * still replace it.
 */
const BRIDGE_STAND_IN: number = require('./bridge.webp');

export const TRAVEL_SCENES: Readonly<Record<string, TravelScene>> = {
    // The far bank, on to the Charcoal Wood.
    'bw-b2': { kind: 'image', source: BRIDGE_STAND_IN },
    // The sea cave mouth: the map zoomed on the Cave Face, the end it leads to.
    'bw-h6': { kind: 'crop', plate: ACT1_PLATES.coast, landmarkSet: 'act1-coast', landmark: 'cave-face', zoom: TRAVEL_CROP_ZOOM },
    // The cave face: the map zoomed on the Sea Cave Mouth.
    'bw-c0': { kind: 'crop', plate: ACT1_PLATES.coast, landmarkSet: 'act1-coast', landmark: 'sea-cave-mouth', zoom: TRAVEL_CROP_ZOOM },
};

/** The picture for a travel node, or null for the dark ground. */
export function travelSceneFor(nodeId: string): TravelScene | null {
    return TRAVEL_SCENES[nodeId] ?? null;
}
