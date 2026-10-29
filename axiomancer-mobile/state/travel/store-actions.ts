/**
 * Travel screen - store action glue (phase NK1d).
 *
 * The RULES are the engine's: resolving a travel node offers the trip and
 * moves no one (`resolveMapEvent`), `takeTravel` is the yes that crosses to
 * another map or steps through a passage on the same one. This module opens
 * the `/travel` screen on an offer and routes the player's answer. It makes
 * no rule decisions of its own.
 */

import { takeTravel } from '@mechanics';
import type { GameState, ResolvedEvent } from '@mechanics';

import { getMapLayout } from '../exploration-maps';
import { EMPTY_TRAVEL_SLICE, type AppStore } from '../store';
import { TRAVEL_COPY } from '../presenters/travel.copy';

/** Opens the travel screen on the trip a travel node offered. */
export function openTravelScreenAction(store: AppStore, offer: Extract<ResolvedEvent, { kind: 'travel' }>): void {
    store.setState({ travel: { open: offer } } as never);
}

/** NO: closes the screen. The player stays on the travel node and owes nothing. */
export function closeTravelAction(store: AppStore): void {
    store.setState({ travel: EMPTY_TRAVEL_SLICE } as never);
}

/**
 * YES: takes the trip the open screen offers. A map destination crosses the
 * world (a toast names the region, and the crossing is a checkpoint save); a
 * passage stands the player on its far node. Returns true when the player
 * moved; a shut way moves no one and leaves the screen open. `toast` is the
 * host's one-shot toast.
 */
export function takeTravelAction(store: AppStore, toast: (text: string) => void): boolean {
    const open = store.getState().travel?.open;
    if (!open || !open.open) return false;
    const before = store.getState() as unknown as GameState;
    if (before.world.currentMap.currentNode !== open.nodeId) {
        closeTravelAction(store);
        return false;
    }
    const after = takeTravel(before);
    if (after === before) return false;
    store.setState({ world: after.world, travel: EMPTY_TRAVEL_SLICE } as never);
    const destination = open.destination;
    if ('map' in destination) {
        const region = getMapLayout(destination.map)?.region ?? destination.map;
        toast(TRAVEL_COPY.crossedToast(region));
    }
    // Moving is a checkpoint, as a combat or rest outcome is: saves are
    // explicit on mobile, and a trip lost to an app close would strand the
    // run where the player had left.
    try { store.getState().save(); } catch { /* persistence must not block the road */ }
    return true;
}
