/**
 * Hermetic E2E — travel nodes through the store action layer (phase NK1d).
 *
 * The gameplay contract the player feels: a travel node asks "Move to X?".
 * Resolving it opens the travel slice (the `/travel` screen) and moves no
 * one; YES (`takeTravel`) crosses to another map with a toast and a
 * checkpoint save, or steps through a passage to a node of the same map; NO
 * (`closeTravel`) leaves the player standing on the node, owing nothing, and
 * a tap on it offers the trip again.
 *
 * Pinned here:
 *   - bw-18 (the river bridge) offers the Charcoal Wood; YES crosses with a
 *     toast and a save; the arrival map's start node is not consumed
 *   - cw-20 (the stair cave) crosses the continent onto the Beacon Crags
 *   - NO keeps the player on the door; tapping it offers the trip again
 *   - the fixture map's passage pair (mouth and face) works both ways, on
 *     every entry, and a shut way (`opensAfter`) offers no move
 */

import { beforeAll, describe, expect, it } from '@jest/globals';
import { createStartingWorld, moveToNode, type ContinentName, type GameState, type MapName } from '@mechanics';
import { PASSAGE_MAP, registerTravelPassageFixture } from '@mechanics/Game/fixtures';

import { createAppActions } from '@/state/actions';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { createFixtureStore } from '@/test-utils/fixtureStore';
import { selectPacedEventRoute, selectHasActiveEvent } from '@/state/presenters/event.engine';
import { selectHasActiveTravel, selectTravelVM } from '@/state/presenters/travel.engine';

beforeAll(() => { registerTravelPassageFixture(); });

/**
 * Seat the player on a door node through a state fixture (see
 * docs/testing.md "Seeding state with fixtures"). The same document
 * shape boots the CLI (`--fixture`) and the web build (`?fixture=`).
 */
function seatAt(continent: ContinentName, map: MapName, node: string, adapter = createMemoryAdapter()) {
    return createFixtureStore(
        { id: `travel-door-${node}`, seed: `travel-door-${node}`, world: { continent, map, node } },
        { adapter },
    );
}

/** A store on the passage fixture map, standing at its start. */
function onPassageMap() {
    const store = createAppStore({
        adapter: createMemoryAdapter(),
        overrides: { world: createStartingWorld(PASSAGE_MAP) },
    });
    return { store, actions: createAppActions(store) };
}

/** Walks one road through the store and answers the arrival, as the map's confirm does. */
function walk(handle: ReturnType<typeof onPassageMap>, nodeId: string): void {
    expect(handle.actions.moveTo(nodeId).moved).toBe(true);
    handle.actions.resolveCurrentMapEvent();
}

function here(handle: { store: { getState: () => unknown } }): string {
    return (handle.store.getState() as GameState).world.currentMap.currentNode;
}

describe('inter-map travel doors ask before they cross', () => {
    it('bw-18 offers the Charcoal Wood and moves no one', () => {
        const { store, actions } = seatAt('coastal-continent', 'breakwater', 'bw-18');

        expect(actions.resolveCurrentMapEvent('travel')).toBe(true);

        const after = store.getState();
        expect(after.world.currentMap.name).toBe('breakwater');
        expect(selectHasActiveTravel(after)).toBe(true);
        expect(selectHasActiveEvent(after)).toBe(false);
        expect(selectPacedEventRoute(after)).toBeNull();
        const vm = selectTravelVM(after);
        expect(vm.question).toBe('Move to The Charcoal Wood?');
        expect(vm.prompt).toMatch(/toll-house/);
        expect(vm.open).toBe(true);
    });

    it('YES crosses onto the Charcoal Wood with a toast and a checkpoint save', () => {
        const adapter = createMemoryAdapter();
        const { store, actions } = seatAt('coastal-continent', 'breakwater', 'bw-18', adapter);
        actions.resolveCurrentMapEvent('travel');
        const savesBefore = adapter.saveCount;

        expect(actions.takeTravel()).toBe(true);

        const after = store.getState();
        expect(after.world.currentMap.name).toBe('charcoal-wood');
        expect(selectHasActiveTravel(after)).toBe(false);
        expect(after.notifications?.toast?.text).toMatch(/You cross into/);
        expect(adapter.saveCount).toBe(savesBefore + 1);
        // The arrival map's start node is not consumed by the crossing.
        expect(after.world.currentMap.consumedNodes ?? []).not.toContain(after.world.currentMap.currentNode);
    });

    it('cw-20 crosses the continent onto the Beacon Crags', () => {
        const { store, actions } = seatAt('coastal-continent', 'charcoal-wood', 'cw-20');

        actions.resolveCurrentMapEvent('travel');
        expect(actions.takeTravel()).toBe(true);

        const after = store.getState();
        expect(after.world.currentMap.name).toBe('beacon-crags');
        expect(after.world.currentContinent.name).toBe('northern-continent');
        expect(after.notifications?.toast?.text).toBe('You cross into The Beacon Crags.');
    });

    it('NO keeps the player on the door, owing nothing; a tap on it offers the trip again', () => {
        const { store, actions } = seatAt('coastal-continent', 'breakwater', 'bw-18');
        actions.resolveCurrentMapEvent('travel');

        actions.closeTravel();

        const after = store.getState();
        expect(selectHasActiveTravel(after)).toBe(false);
        expect(after.world.currentMap.name).toBe('breakwater');
        expect(after.world.currentMap.currentNode).toBe('bw-18');
        expect(after.world.currentMap.pendingArrival ?? null).toBeNull();

        expect(actions.offerTravelHere()).toBe(true);
        expect(selectHasActiveTravel(store.getState())).toBe(true);
    });

    it('offerTravelHere off a travel node does nothing', () => {
        const { store, actions } = seatAt('coastal-continent', 'breakwater', 'bw-1');
        expect(actions.offerTravelHere()).toBe(false);
        expect(selectHasActiveTravel(store.getState())).toBe(false);
    });
});

describe('a same-map passage pair (the fixture map)', () => {
    it('moves through the pair and back, on every entry', () => {
        const handle = onPassageMap();
        walk(handle, 'trail');
        walk(handle, 'mouth');
        expect(selectHasActiveTravel(handle.store.getState())).toBe(true);
        expect(selectTravelVM(handle.store.getState()).question).toBe('Move to the far side?');

        for (let lap = 0; lap < 2; lap++) {
            expect(handle.actions.takeTravel()).toBe(true);
            expect(here(handle)).toBe('face');
            const map = handle.store.getState().world.currentMap;
            expect(map.completedNodes).toContain('face');
            expect(map.pendingArrival ?? null).toBeNull();
            expect(map.availableNodes).toEqual(['ledge']);
            // No crossing toast for a passage: the map shows the move.
            expect(handle.store.getState().notifications?.toast?.text ?? null).toBeNull();

            expect(handle.actions.offerTravelHere()).toBe(true);
            expect(handle.actions.takeTravel()).toBe(true);
            expect(here(handle)).toBe('mouth');
            expect(handle.actions.offerTravelHere()).toBe(true);
        }
    });

    it('a shut way says so and offers no move', () => {
        const handle = onPassageMap();
        walk(handle, 'ward');
        const vm = selectTravelVM(handle.store.getState());
        expect(vm.open).toBe(false);
        expect(vm.question).toBe('The way is shut.');
        expect(handle.actions.takeTravel()).toBe(false);
        expect(here(handle)).toBe('ward');
    });

    it('the shut way opens once its node is spent', () => {
        const handle = onPassageMap();
        walk(handle, 'trail');
        walk(handle, 'start');
        walk(handle, 'ward');
        expect(selectTravelVM(handle.store.getState()).open).toBe(true);
        expect(handle.actions.takeTravel()).toBe(true);
        expect(here(handle)).toBe('face');
    });

    it('a walk back from the far side onto the far node offers the way back', () => {
        const handle = onPassageMap();
        walk(handle, 'trail');
        walk(handle, 'mouth');
        handle.actions.takeTravel();
        // Off the travel node and back: the far node is spent, but a travel
        // node acts on every entry.
        const world = handle.store.getState().world;
        handle.store.setState({ world: { ...world, currentMap: moveToNode(world, 'ledge').currentMap } } as never);
        expect(handle.actions.moveTo('face').moved).toBe(true);
        handle.actions.resolveCurrentMapEvent();
        expect(selectTravelVM(handle.store.getState()).nodeId).toBe('face');
    });
});
