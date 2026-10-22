/**
 * A save taken mid-fight reloads onto the fight.
 *
 * The fight itself is never saved: `currentEncounter` is transient
 * (`durableSlice`), and the turn state lives with whoever drives the
 * fight. What a save CAN carry is the arrival debt, `pendingArrival`. So an
 * encounter leaves the debt owed, its node unconsumed and the way on shut, and
 * only the fight's end settles it (`END_COMBAT` → `settleArrival`). A reload
 * between the two stands the player back on the node with the fight owed, and
 * resolving the arrival again offers the same fight from the start.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { moveToNode, placeOnNode, unlockAdjacent } from '../world.reducer';
import { createStartingWorld } from '../index';
import { resolveMapEvent, settleArrival } from '../MapEvents/resolve-map-event';
import { createGameStore } from '../../Game/store';
import type { GameState } from '../../Game/types';
import type { PersistenceAdapter } from '../../Game/persistence/types';
import type { WorldState } from '../types';
import { Player } from '../../Character/characters.mock';
import { mockSequentialRng } from '../../test-utils/rng';
import '../MapEvents/content';

afterEach(() => vi.restoreAllMocks());

/** A disk in memory: `save` writes a deep copy, `load` reads it back. */
function memoryDisk(): PersistenceAdapter {
    let saved: GameState | null = null;
    return {
        load: () => (saved ? structuredClone(saved) : null),
        save: (state) => { saved = structuredClone(state); },
    };
}

/** Walk the route, opening each node's way on as a settled arrival would. */
function walk(from: WorldState, ...route: string[]): WorldState {
    let world = from;
    for (const nodeId of route) {
        world = moveToNode(world, nodeId);
        world = { ...world, currentMap: unlockAdjacent(world.currentMap, nodeId) };
    }
    return world;
}

/**
 * Stand on `approach`, walk onto `fightNode`, roll its arrival and enter the
 * fight, then save, as the app does when it is closed mid-fight. Returns the
 * disk and the foe the fight was against.
 */
function saveMidFight(approach: WorldState, fightNode: string) {
    mockSequentialRng(0.5);
    const disk = memoryDisk();
    const store = createGameStore(disk, { player: Player, world: approach });
    store.getState().moveToNode(fightNode);

    const { state, event } = resolveMapEvent(store.getState());
    if (event.kind !== 'encounter') throw new Error(`expected a fight at ${fightNode}, got ${event.kind}`);
    store.setState({ world: state.world, quests: state.quests });
    store.getState().startCombat(event.encounter);
    expect(store.getState().currentEncounter).toBeDefined();

    store.getState().save();
    return { disk, foe: event.encounter.enemies[0]!, isBoss: event.isBoss, store };
}

const cases = [
    {
        name: 'a normal fight (Float-Eye at bw-14)',
        approach: () => walk(createStartingWorld('breakwater'), 'bw-2', 'bw-7', 'bw-11'),
        node: 'bw-14',
        onward: 'bw-17',
        boss: false,
    },
    {
        name: 'the door fight (the Death Beholder at bw-17)',
        approach: () => {
            const placed = placeOnNode(createStartingWorld('breakwater'), 'bw-16');
            return { ...placed, currentMap: unlockAdjacent(placed.currentMap, 'bw-16') };
        },
        node: 'bw-17',
        onward: 'bw-18',
        boss: true,
    },
];

describe.each(cases)('a save taken during $name', ({ approach, node, onward, boss }) => {
    it('reloads onto the node with the fight owed and the way on shut', () => {
        const { disk } = saveMidFight(approach(), node);

        const reloaded = createGameStore(disk).getState();
        const map = reloaded.world.currentMap;

        expect(reloaded.currentEncounter).toBeUndefined();
        expect(map.currentNode).toBe(node);
        expect(map.pendingArrival).toBe(node);
        expect(map.consumedNodes).not.toContain(node);
        expect(map.availableNodes).not.toContain(onward);
    });

    it('offers the same fight again when the arrival is resolved', () => {
        const { disk, foe, isBoss } = saveMidFight(approach(), node);

        const reloaded = createGameStore(disk).getState();
        const { event } = resolveMapEvent(reloaded);

        expect(event.kind).toBe('encounter');
        if (event.kind !== 'encounter') return;
        expect(event.isBoss).toBe(boss);
        expect(isBoss).toBe(boss);
        expect(event.encounter.enemies[0]?.name).toBe(foe.name);
        expect(event.encounter.enemies[0]?.level).toBe(foe.level);
    });

    it.each(['victory', 'flee', 'friendship', 'defeat'] as const)(
        'the fight ending in %s settles the node',
        (outcome) => {
            const { store } = saveMidFight(approach(), node);

            store.getState().endCombat(outcome);
            const map = store.getState().world.currentMap;

            expect(map.pendingArrival ?? null).toBeNull();
            expect(map.consumedNodes).toContain(node);
            expect(map.availableNodes).toContain(onward);
        },
    );
});

describe('settleArrival', () => {
    it('is the identity when nothing is owed at the node underfoot', () => {
        const state: GameState = createGameStore(memoryDisk(), {
            world: placeOnNode(createStartingWorld('breakwater'), 'bw-14'),
        }).getState();

        expect(settleArrival(state)).toBe(state);
    });

    it('settles only the node the debt names', () => {
        const world = walk(createStartingWorld('breakwater'), 'bw-2');
        const state: GameState = createGameStore(memoryDisk(), { world }).getState();

        const settled = settleArrival(state).world.currentMap;

        expect(settled.consumedNodes).toEqual(['bw-2']);
        expect(settled.pendingArrival ?? null).toBeNull();
    });
});
