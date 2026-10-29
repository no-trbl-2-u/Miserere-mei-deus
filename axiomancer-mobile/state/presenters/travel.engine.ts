/**
 * Travel screen presenter (phase NK1d). Maps the trip a travel node offered
 * (the engine's resolved `travel` event, held in the `travel` slice) onto a
 * render-ready view-model: its art, its flavor text and the question "Move to
 * {destination}?". Pure: no store writes, no rule decisions. Whether the way
 * is open is the engine's (`opensAfter`); this module only words it.
 *
 * The destination is named only here, on the screen the player opened: the
 * map draws nothing about where a passage leads.
 */

import type { ResolvedEvent } from '@mechanics';
import type { AppStoreState } from '@/state/store';
import { getMapLayout } from '@/state/exploration-maps';
import { selectEventArtSlug, type EventArtSlug } from './event-assets';
import { TRAVEL_COPY } from './travel.copy';

type TravelOffer = Extract<ResolvedEvent, { kind: 'travel' }>;

export interface TravelVM {
    active: boolean;
    /** The travel node the offer stands on. */
    nodeId: string;
    eyebrow: string;
    artSlug: EventArtSlug;
    /** The node's authored flavor text. */
    prompt: string;
    /** The destination's display name: a region, or a node's label. */
    destinationLabel: string;
    /** "Move to {destination}?", or the shut line while the way is shut. */
    question: string;
    /** False while the way is shut: YES is not offered. */
    open: boolean;
    yesLabel: string;
    noLabel: string;
}

const EMPTY_VM: TravelVM = Object.freeze({
    active: false,
    nodeId: '',
    eyebrow: '',
    artSlug: 'interaction-generic',
    prompt: '',
    destinationLabel: '',
    question: '',
    open: false,
    yesLabel: '',
    noLabel: '',
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

/** The travel screen's view-model; the empty VM when no offer is open. */
export function selectTravelVM(state: Pick<AppStoreState, 'travel' | 'world'>): TravelVM {
    const offer = state.travel?.open ?? null;
    if (!offer) return EMPTY_VM;
    const destinationLabel = travelDestinationLabel(offer, state.world.currentMap.name);
    return {
        active: true,
        nodeId: offer.nodeId,
        eyebrow: TRAVEL_COPY.eyebrow,
        artSlug: selectEventArtSlug(offer),
        prompt: offer.prompt,
        destinationLabel,
        question: offer.open ? TRAVEL_COPY.question(destinationLabel) : TRAVEL_COPY.shut,
        open: offer.open,
        yesLabel: TRAVEL_COPY.yes,
        noLabel: offer.open ? TRAVEL_COPY.no : TRAVEL_COPY.leave,
    };
}
