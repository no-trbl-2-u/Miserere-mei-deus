/**
 * Travel screen presenter. Maps the trip a
 * travel node offered (the engine's resolved `travel` event, held in the
 * `travel` slice) onto a render-ready view-model: its picture, its scene line
 * and the question "Move to {destination}?". Pure: no store writes, no rule
 * decisions. Whether the way is open is the engine's (`opensAfter`); this
 * module only words it.
 *
 * The destination is named only here, on the screen the player opened: the
 * map draws nothing about where a passage leads.
 */

import type { ResolvedEvent } from '@mechanics';
import type { AppStoreState } from '@/state/store';
import { getMapLayout } from '@/state/exploration-maps';
import landmarks from '@/assets/images/maps/act1-landmarks.json';
import { travelSceneFor } from '@/assets/images/travel';
import { TRAVEL_COPY } from './travel.copy';

type TravelOffer = Extract<ResolvedEvent, { kind: 'travel' }>;

/** What fills the screen's top: a whole image, or a plate cropped on a point. */
export type TravelSceneVM =
    | { kind: 'image'; source: number }
    | {
        kind: 'crop';
        source: number;
        /** The point to centre on, as fractions of the plate (0 = left/top). */
        focusX: number;
        focusY: number;
        zoom: number;
    };

export interface TravelVM {
    active: boolean;
    /** The travel node the offer stands on. */
    nodeId: string;
    /** The picture, or null for the dark ground alone. */
    scene: TravelSceneVM | null;
    /** The node's authored scene line. */
    prompt: string;
    /** The destination's display name: a region, or a node's label. */
    destinationLabel: string;
    /** "Move to {destination}?", or the shut line while the way is shut. */
    question: string;
    /** False while the way is shut: MOVE is shown disabled. */
    open: boolean;
    moveLabel: string;
    stayLabel: string;
}

const EMPTY_VM: TravelVM = Object.freeze({
    active: false,
    nodeId: '',
    scene: null,
    prompt: '',
    destinationLabel: '',
    question: '',
    open: false,
    moveLabel: '',
    stayLabel: '',
});

/** True while the travel screen has an offer open. */
export function selectHasActiveTravel(state: Pick<AppStoreState, 'travel'>): boolean {
    return state.travel?.open != null;
}

/**
 * The destination as the player reads it: another map by its region's name,
 * a node of the current map by its drawn label.
 */
export function travelDestinationLabel(offer: TravelOffer, currentMap: string): string {
    const destination = offer.destination;
    if ('map' in destination) return getMapLayout(destination.map)?.region ?? destination.map;
    const label = getMapLayout(currentMap)?.nodes.find(n => n.id === destination.node)?.label;
    return label ?? TRAVEL_COPY.unnamedPlace;
}

/** The node's picture as the screen draws it; null when the table has none. */
export function selectTravelScene(nodeId: string): TravelSceneVM | null {
    const scene = travelSceneFor(nodeId);
    if (!scene) return null;
    if (scene.kind === 'image') return { kind: 'image', source: scene.source };
    const mark = landmarks[scene.landmarkSet].find(l => l.id === scene.landmark);
    if (!mark) throw new Error(`travel scene ${nodeId}: unknown landmark '${scene.landmark}'`);
    return { kind: 'crop', source: scene.plate, focusX: mark.x, focusY: mark.y, zoom: scene.zoom };
}

/** The travel screen's view-model; the empty VM when no offer is open. */
export function selectTravelVM(state: Pick<AppStoreState, 'travel' | 'world'>): TravelVM {
    const offer = state.travel?.open ?? null;
    if (!offer) return EMPTY_VM;
    const destinationLabel = travelDestinationLabel(offer, state.world.currentMap.name);
    return {
        active: true,
        nodeId: offer.nodeId,
        scene: selectTravelScene(offer.nodeId),
        prompt: offer.prompt,
        destinationLabel,
        question: offer.open ? TRAVEL_COPY.question(destinationLabel) : TRAVEL_COPY.shut,
        open: offer.open,
        moveLabel: TRAVEL_COPY.move,
        stayLabel: TRAVEL_COPY.stay,
    };
}
