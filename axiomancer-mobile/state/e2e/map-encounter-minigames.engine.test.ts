/**
 * Hermetic E2E — map encounter → minigame routing.
 *
 * The gameplay contract the player feels: walking onto a treasure /
 * rest node opens the matching minigame, NOT the "/event" card.
 * `resolveCurrentMapEventAction` intercepts those two kinds (plus
 * hazard) and starts a minigame session instead of dropping a
 * `ResolvedEvent` on the event slice. An empty waypoint (a node with no
 * pool, where a gathering node used to be) opens nothing at all.
 *
 * This pins that contract end-to-end through the store action layer
 * (the same path `app/(tabs)/exploration` drives on a node tap):
 *   - treasure node → loot-cache session, no paced /event route
 *   - rest node → rest session
 *   - waypoint node → no event, no session, nothing granted
 */

import { describe, expect, it } from '@jest/globals';
import {
    createMapState,
    getMapDefinition,
    getNodePrimaryEventKind,
    type GameState,
    type MapEventKind,
} from '@mechanics';

import { createAppActions } from '@/state/actions';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { selectPacedEventRoute, selectHasActiveEvent } from '@/state/presenters/event.engine';
import { selectHasActiveCache } from '@/state/presenters/cache.engine';
import { selectHasActiveRest } from '@/state/presenters/rest.engine';

function makeStoreAndActions() {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    return { store, actions: createAppActions(store) };
}

type CoastalMap = 'breakwater' | 'charcoal-wood';

/** Seat the player on `nodeId` of `mapName`, mirroring a reachable tap. */
function seatAt(store: AppStore, mapName: CoastalMap, nodeId: string) {
    const base = store.getState() as unknown as GameState;
    const map = createMapState(getMapDefinition('coastal-continent', mapName));
    store.setState({
        world: { ...base.world, currentMap: { ...map, currentNode: nodeId } },
    } as never);
}

/** First node resolving to a given engine event kind (the engine owns kind). */
function firstNodeOfKind(mapName: CoastalMap, kind: MapEventKind): string {
    const def = getMapDefinition('coastal-continent', mapName);
    const node = def.nodes.find(
        (n) => getNodePrimaryEventKind('coastal-continent', mapName, n.id) === kind,
    );
    if (!node) throw new Error(`no ${kind} node in ${mapName}`);
    return node.id;
}

// The varied minigame kinds, on the Charcoal Wood.
describe('map encounter → minigame routing (charcoal-wood)', () => {
    it('loot-cache node opens the loot-cache, not a paced /event', () => {
        const { store, actions } = makeStoreAndActions();
        seatAt(store, 'charcoal-wood', firstNodeOfKind('charcoal-wood', 'loot-cache'));

        expect(actions.resolveCurrentMapEvent('treasure')).toBe(true);

        expect(selectHasActiveCache(store.getState())).toBe(true);
        expect(selectHasActiveEvent(store.getState())).toBe(false);
        expect(selectPacedEventRoute(store.getState())).toBeNull();
    });

    it('rest node opens the rest-choice session, not a paced /event', () => {
        const { store, actions } = makeStoreAndActions();
        seatAt(store, 'charcoal-wood', firstNodeOfKind('charcoal-wood', 'rest'));

        expect(actions.resolveCurrentMapEvent('rest')).toBe(true);

        expect(selectHasActiveRest(store.getState())).toBe(true);
        expect(selectPacedEventRoute(store.getState())).toBeNull();
    });

    // The empty waypoint resolves to nothing: no card, no session, no grant.
    it('waypoint node opens nothing and grants nothing', () => {
        const { store, actions } = makeStoreAndActions();
        seatAt(store, 'charcoal-wood', 'cw-4');
        expect(getNodePrimaryEventKind('coastal-continent', 'charcoal-wood', 'cw-4')).toBeUndefined();
        const before = store.getState().player.inventory;

        expect(actions.resolveCurrentMapEvent('waypoint')).toBe(false);

        expect(store.getState().player.inventory).toEqual(before);
        expect(selectHasActiveEvent(store.getState())).toBe(false);
        expect(selectPacedEventRoute(store.getState())).toBeNull();
        expect(selectHasActiveCache(store.getState())).toBe(false);
        expect(selectHasActiveRest(store.getState())).toBe(false);
    });
});
