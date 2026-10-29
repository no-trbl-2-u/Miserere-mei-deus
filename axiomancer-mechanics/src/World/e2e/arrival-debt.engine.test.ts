/**
 * The arrival debt — `MapState.pendingArrival` (burn-day audit 2026-09-19
 * row 3.1 follow-up).
 *
 * A MapEvent fires on ARRIVAL. The arrival and the event are two steps, and a
 * client can be interrupted between them: mobile checkpoints the move before
 * the screen resolves it (BUG-03), so a reload taken in between used to come
 * back standing on the node with its onward edges open and the fight it never
 * had already behind it.
 *
 * The state therefore records the debt as itself: the ARRIVAL verb writes it,
 * the dispatcher clears it the moment the arrival is answered, and the
 * PLACEMENT verbs clear it because standing a player somewhere is not walking
 * them there. That last sentence is the one this file exists for — the first
 * cut of row 3.1 inferred the debt from "the node under the player carries
 * unconsumed content", which cannot tell a walk from a placement, and
 * `placeOnNode` un-consumes the node it places you on. Every state fixture and
 * every dev jump then looked like an unanswered arrival.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { moveToNode, placeOnNode, teleportToNode, unlockAdjacent } from '../world.reducer';
import { createMapState, getMapDefinition } from '../map.registry';
import { createStartingWorld } from '../index';
import { resolveMapEvent, settleArrival } from '../MapEvents/resolve-map-event';
import { takeTravel } from '../MapEvents/travel';
import { createNewGameState } from '../../Game/game.reducer';
import { mockSequentialRng } from '../../test-utils/rng';
import type { GameState } from '../../Game/types';
import { settleQuestNodes } from '../../Game/fixtures/quest-nodes';
import type { WorldState } from '../types';
// Import for side effect — registers the Breakwater pools (bw-w3 encounter,
// bw-b2 door) that the dispatcher rolls from.
import '../MapEvents/content';

afterEach(() => vi.restoreAllMocks());

/** A new Breakwater with its quest nodes settled, so the walks cross the quest gates. */
const freshWorld = (): WorldState => {
    const w = createStartingWorld('breakwater');
    return { ...w, currentMap: settleQuestNodes(w.currentMap) };
};

function gameOn(world: WorldState): GameState {
    mockSequentialRng(0.5);
    return { ...createNewGameState(), world };
}

/**
 * Walk the route for real, one `moveToNode` per step. The onward edges are
 * opened by hand between steps because it is `resolveMapEvent` that unlocks
 * them in play, and these walks deliberately leave the arrival unanswered.
 */
function walk(from: WorldState, ...route: string[]): WorldState {
    let world = from;
    for (const nodeId of route) {
        world = moveToNode(world, nodeId);
        world = { ...world, currentMap: unlockAdjacent(world.currentMap, nodeId) };
    }
    return world;
}

describe('the arrival verb records what the player is owed', () => {
    it('a fresh map owes nothing — the player was placed on its start node', () => {
        expect(freshWorld().currentMap.pendingArrival ?? null).toBeNull();
    });

    it('moveToNode owes the node it walked onto', () => {
        const walked = moveToNode(freshWorld(), 'bw-w2');

        expect(walked.currentMap.currentNode).toBe('bw-w2');
        expect(walked.currentMap.pendingArrival).toBe('bw-w2');
    });

    it('each further move owes only the node under the player', () => {
        const walked = moveToNode(walk(freshWorld(), 'bw-w2'), 'bw-w3');

        expect(walked.currentMap.pendingArrival).toBe('bw-w3');
    });
});

describe('the placement verbs owe nothing — being placed is not arriving', () => {
    it('placeOnNode clears a debt the walk had recorded', () => {
        const walked = moveToNode(freshWorld(), 'bw-w2');
        expect(walked.currentMap.pendingArrival).toBe('bw-w2');

        const placed = placeOnNode(walked, 'bw-w4');

        expect(placed.currentMap.currentNode).toBe('bw-w4');
        expect(placed.currentMap.pendingArrival ?? null).toBeNull();
        // The condition the old inference fired on is still true: placement
        // deliberately un-consumes the node so its content stays live for the
        // tester who jumped there. That is precisely why it cannot stand in
        // for the debt.
        expect(placed.currentMap.consumedNodes).not.toContain('bw-w4');
    });

    it('teleportToNode clears it too — the Oubliette ejects, it does not walk', () => {
        const def = getMapDefinition('labyrinth-continent', 'aporia-colonnade');
        const aporia: WorldState = {
            world: [],
            currentContinent: {
                name: 'labyrinth-continent',
                description: 'THE APORIA',
                availableMaps: ['aporia-colonnade'],
                lockedMaps: ['aporia-archive', 'aporia-proof'],
                completedMaps: [],
            },
            currentMap: createMapState(def),
        };
        const walked = moveToNode(aporia, 'ap1-2');
        expect(walked.currentMap.pendingArrival).toBe('ap1-2');

        const ejected = teleportToNode(walked, 'ap1-1');

        expect(ejected.currentMap.currentNode).toBe('ap1-1');
        expect(ejected.currentMap.pendingArrival ?? null).toBeNull();
    });
});

describe('resolving the arrival is what answers it', () => {
    it('clears the debt for the node it resolved', () => {
        // bw-w4 is a camp: its rest is offered, and the arrival is answered.
        const before = gameOn(walk(freshWorld(), 'bw-w2', 'bw-w4'));
        expect(before.world.currentMap.pendingArrival).toBe('bw-w4');

        const { state, event } = resolveMapEvent(before);

        expect(event.kind).toBe('rest');
        expect(state.world.currentMap.pendingArrival ?? null).toBeNull();
    });

    it('a fight is the exception: the debt stands until the fight settles (R9a)', () => {
        const before = gameOn(walk(freshWorld(), 'bw-w2', 'bw-w3'));

        const { state, event } = resolveMapEvent(before);

        expect(event.kind).toBe('encounter');
        expect(state.world.currentMap.pendingArrival).toBe('bw-w3');
        expect(settleArrival(state).world.currentMap.pendingArrival ?? null).toBeNull();
    });

    it('clears it on the map being LEFT when the arrival is a travel door', () => {
        // A door is never consumed ("a door is repeatable"), so consumption
        // cannot say whether it was answered — the debt can. Resolving the
        // door answers it and only OFFERS the trip (phase NK1d); the yes
        // (`takeTravel`) crosses, and the Breakwater it files away owes
        // nothing, so returning through it never crosses again with no input.
        // The bridge gate is open (the quest nodes settled): it is shut until
        // the chain's last step is turned in at bw-b1.
        const before = gameOn(placeOnNode(freshWorld(), 'bw-b1'));
        const walked = { ...before, world: moveToNode(before.world, 'bw-b2') };
        expect(walked.world.currentMap.pendingArrival).toBe('bw-b2');

        const { state: offered, event } = resolveMapEvent(walked);
        expect(event.kind).toBe('travel');
        expect(offered.world.currentMap.pendingArrival ?? null).toBeNull();
        const state = takeTravel(offered);
        expect(state.world.currentMap.name).toBe('charcoal-wood');
        expect(state.world.mapStates?.['breakwater']?.pendingArrival ?? null).toBeNull();
    });

    it('clears a stale debt on a node that was already consumed', () => {
        const walked = walk(freshWorld(), 'bw-w2', 'bw-w3');
        const consumed: WorldState = {
            ...walked,
            currentMap: { ...walked.currentMap, consumedNodes: ['bw-w3'] },
        };

        const { state, event } = resolveMapEvent(gameOn(consumed));

        expect(event.kind).toBe('none');
        expect(state.world.currentMap.pendingArrival ?? null).toBeNull();
    });
});
