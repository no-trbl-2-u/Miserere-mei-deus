/**
 * The death rule (phase DY1a).
 *
 * A first death in a fight or on a hazard puts the player back on the node
 * they walked from at 1 VITAE, dying, with the death node open to retry. A
 * death while dying is `RESET_RUN` with `keepCharacter: true`. A rest's heal
 * (`clearDying`) takes dying off.
 *
 * The tests assert what dying DOES (the next death is final), never that
 * nothing else changes: other effects of dying are provisional.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { createGameStore } from '../store';
import { createNewGameState, GAME_STATE_VERSION, gameReducer } from '../game.reducer';
import { resolveDeath, clearDying } from '../death';
import type { GameState } from '../types';
import type { PersistenceAdapter } from '../persistence/types';
import { createStartingWorld } from '../../World';
import {
    arriveAtNode, legalMovesFrom, moveToNode, placeOnNode, unlockAdjacent,
} from '../../World/world.reducer';
import { resolveMapEvent } from '../../World/MapEvents/resolve-map-event';
import { takeTravel } from '../../World/MapEvents/travel';
import type { WorldState } from '../../World/types';
import { Player } from '../../Character/characters.mock';
import { mockSequentialRng } from '../../test-utils/rng';
import '../../World/MapEvents/content';
import { settleQuestNodes } from '../fixtures/quest-nodes';

afterEach(() => vi.restoreAllMocks());

/** A disk in memory: `save` writes a deep copy, `load` reads it back. */
function memoryDisk(): PersistenceAdapter & { raw: () => GameState | null } {
    let saved: GameState | null = null;
    return {
        load: () => (saved ? structuredClone(saved) : null),
        save: (state) => { saved = structuredClone(state); },
        raw: () => saved,
    };
}

/** A new Breakwater with its quest nodes settled, so a walk reaches the pockets. */
function bwWorld(): WorldState {
    const w = createStartingWorld('breakwater');
    return { ...w, currentMap: settleQuestNodes(w.currentMap) };
}

function walk(from: WorldState, ...route: string[]): WorldState {
    let world = from;
    for (const nodeId of route) {
        world = moveToNode(world, nodeId);
        world = { ...world, currentMap: unlockAdjacent(world.currentMap, nodeId) };
    }
    return world;
}

const FIGHTS = [
    {
        // A pocket fight: it opens nothing on (its pocket leads nowhere).
        name: 'a normal fight (bw-14)',
        approach: () => walk(bwWorld(), 'bw-4', 'bw-9', 'bw-20'),
        from: 'bw-20',
        node: 'bw-14',
        onward: null,
        boss: false,
    },
    {
        name: 'a boss fight (the door fight at bw-17)',
        approach: () => {
            const placed = placeOnNode(bwWorld(), 'bw-16');
            // The settled quest node bw-22 sits between bw-16 and the door.
            return walk({ ...placed, currentMap: unlockAdjacent(placed.currentMap, 'bw-16') }, 'bw-22');
        },
        from: 'bw-22',
        node: 'bw-17',
        onward: 'bw-18',
        boss: true,
    },
];

/** Walk onto `node` from the approach, roll the arrival and stage the fight. */
function enterFight(store: ReturnType<typeof createGameStore>, node: string, boss: boolean) {
    store.getState().moveToNode(node);
    const { state, event } = resolveMapEvent(store.getState());
    if (event.kind !== 'encounter') throw new Error(`expected a fight at ${node}, got ${event.kind}`);
    expect(event.isBoss).toBe(boss);
    store.setState({ world: state.world, quests: state.quests });
    store.getState().startCombat(event.encounter);
}

function lose(store: ReturnType<typeof createGameStore>) {
    const { player } = store.getState();
    store.getState().endCombat('defeat', { ...player, health: 0 });
    return store.getState().playerDied('fight');
}

describe('A1 - the save contract', () => {
    it('a save round-trips dying and arrivedFrom', () => {
        mockSequentialRng(0.5);
        const disk = memoryDisk();
        const store = createGameStore(disk, { player: Player, world: FIGHTS[0]!.approach() });
        enterFight(store, 'bw-14', false);
        expect(lose(store)).toBe('revived');
        store.getState().save();

        const reloaded = createGameStore(disk).getState();
        expect(reloaded.dying).toBe(true);
        expect(reloaded.player.health).toBe(1);
        expect(reloaded.world.currentMap.currentNode).toBe('bw-20');

        // And the arrival that wrote arrivedFrom rides a save too.
        const arrived = createGameStore(memoryDisk(), { player: Player, world: FIGHTS[0]!.approach() });
        arrived.getState().moveToNode('bw-14');
        arrived.getState().save();
        expect(arrived.getState().world.currentMap.arrivedFrom).toBe('bw-20');
    });

    it('a save from before the death rule loads not dying, with no arrivedFrom', () => {
        const old = createNewGameState();
        expect('dying' in old).toBe(false);
        expect(old.world.currentMap.arrivedFrom).toBeUndefined();
        const disk = memoryDisk();
        disk.save(old);
        const loaded = createGameStore(disk).getState();
        expect(loaded.dying).toBeUndefined();
        expect(loaded.world.currentMap.arrivedFrom ?? null).toBeNull();
        // Not dying: a death revives, it does not end the run.
        expect(resolveDeath(loaded, 'fight').outcome).toBe('revived');
    });

    it('a save writes dying only while it is set', () => {
        const disk = memoryDisk();
        const store = createGameStore(disk);
        store.getState().save();
        expect('dying' in disk.raw()!).toBe(false);
        store.getState().playerDied('fight');
        expect(disk.raw()!.dying).toBe(true);
        store.setState(clearDying(store.getState()));
        store.getState().save();
        expect('dying' in disk.raw()!).toBe(false);
    });
});

describe.each(FIGHTS)('A2, A5 - $name', ({ approach, from, node, onward, boss }) => {
    function setup() {
        mockSequentialRng(0.5);
        const store = createGameStore(memoryDisk(), { player: Player, world: approach() });
        const before = store.getState();
        enterFight(store, node, boss);
        return { store, before };
    }

    it('a first death revives on the node walked from, at 1 VITAE, dying, the fight open', () => {
        const { store, before } = setup();
        expect(store.getState().world.currentMap.arrivedFrom).toBe(from);
        expect(lose(store)).toBe('revived');

        const s = store.getState();
        const map = s.world.currentMap;
        expect(s.dying).toBe(true);
        expect(s.player.health).toBe(1);
        expect(s.player.maxHealth).toBe(before.player.maxHealth);
        expect(s.currentEncounter).toBeUndefined();
        expect(map.currentNode).toBe(from);
        expect(map.pendingArrival ?? null).toBeNull();
        expect(map.completedNodes).not.toContain(node);
        expect(map.consumedNodes).not.toContain(node);
        expect(map.availableNodes).toContain(node);
        expect(map.discoveredNodes).toContain(node);

        // Nothing of the run is lost.
        expect(s.runId).toBe(before.runId);
        expect(s.player.level).toBe(before.player.level);
        expect(s.player.experience).toBe(before.player.experience);
        expect(s.player.knownCards).toEqual(before.player.knownCards);
        expect(s.player.inventory).toEqual(before.player.inventory);
        expect(s.quests).toEqual(before.quests);
        expect(s.flags).toEqual(before.flags);
    });

    it('the death node is a legal move from where the player revives, and its event fires again', () => {
        const { store } = setup();
        lose(store);
        const map = store.getState().world.currentMap;
        expect(legalMovesFrom(map)).toContain(node);

        store.getState().moveToNode(node);
        const { event } = resolveMapEvent(store.getState());
        expect(event.kind).toBe('encounter');
    });

    it('the revive does not depend on how the defeat settled the node', () => {
        const { store } = setup();
        // Whatever END_COMBAT did (settled it or not), the revive un-spends it.
        const { player } = store.getState();
        store.getState().endCombat('defeat', { ...player, health: 0 });
        const settled = store.getState().world.currentMap;
        const unsettled = {
            ...settled,
            consumedNodes: settled.consumedNodes.filter(n => n !== node),
            completedNodes: settled.completedNodes.filter(n => n !== node),
            pendingArrival: node,
        };
        for (const world of [store.getState().world, { ...store.getState().world, currentMap: unsettled }]) {
            const out = resolveDeath({ ...store.getState(), world }, 'fight');
            expect(out.outcome).toBe('revived');
            expect(out.state.world.currentMap.currentNode).toBe(from);
            expect(legalMovesFrom(out.state.world.currentMap)).toContain(node);
            expect(out.state.world.currentMap.consumedNodes).not.toContain(node);
        }
    });

    it('defeat, revive, walk back, win: the node settles and opens its way on', () => {
        const { store } = setup();
        lose(store);
        enterFight(store, node, boss);
        const { player } = store.getState();
        store.getState().endCombat('victory', { ...player, health: Math.max(player.health, 1) });

        const map = store.getState().world.currentMap;
        expect(map.currentNode).toBe(node);
        expect(map.consumedNodes).toContain(node);
        expect(map.pendingArrival ?? null).toBeNull();
        if (onward) expect(map.availableNodes).toContain(onward);
        // Winning is not resting: still dying.
        expect(store.getState().dying).toBe(true);
    });
});

describe('A3 - the final death', () => {
    it('two deaths in one run end it as RESET_RUN does, and dying is gone', () => {
        const store = createGameStore(memoryDisk(), { player: Player, world: FIGHTS[0]!.approach(), flags: ['a-flag'] });
        const first = store.getState();

        enterFight(store, 'bw-14', false);
        expect(lose(store)).toBe('revived');
        enterFight(store, 'bw-14', false);
        expect(lose(store)).toBe('run-over');

        const after = store.getState();
        expect(after.dying).toBeUndefined();
        expect(after.runId).not.toBe(first.runId);
        expect(after.player.health).toBe(after.player.maxHealth);
        expect(after.flags).toEqual([]);
        expect(after.world.currentMap.currentNode).toBe('bw-1');
        expect(after.world.currentMap.consumedNodes).toEqual([]);
        expect(after.player.level).toBe(first.player.level);

        const reset = gameReducer(
            { ...first, dying: true },
            { type: 'RESET_RUN', payload: { keepCharacter: true } },
        );
        // Same fields as RESET_RUN's state (the store adds its verbs on top).
        const project = (g: GameState) => ({
            version: g.version, player: g.player, world: g.world, quests: g.quests,
            flags: g.flags, codex: g.codex, dying: g.dying,
        });
        expect(project(after)).toEqual(project(reset));
    });

    it('a death, a clearDying, then a death revives again', () => {
        mockSequentialRng(0.5);
        const state = { ...createNewGameState(), world: FIGHTS[0]!.approach() };
        const entered = { ...state, world: moveToNode(state.world, 'bw-14') };
        const first = resolveDeath(entered, 'fight');
        expect(first.outcome).toBe('revived');
        expect(first.state.dying).toBe(true);

        const healed = clearDying(first.state);
        expect(healed.dying).toBeUndefined();
        expect(clearDying(healed)).toBe(healed);

        const reEntered = { ...healed, world: moveToNode(healed.world, 'bw-14') };
        const second = resolveDeath(reEntered, 'fight');
        expect(second.outcome).toBe('revived');
        expect(second.state.dying).toBe(true);
    });

    it('through the store, a run over drops dying even over a merged state', () => {
        const store = createGameStore(memoryDisk());
        expect(store.getState().playerDied('fight')).toBe('revived');
        expect(store.getState().dying).toBe(true);
        expect(store.getState().playerDied('fight')).toBe('run-over');
        expect(store.getState().dying).toBeUndefined();
    });
});

describe('A4 - no previous node', () => {
    it('arrivedFrom absent: back on the map start', () => {
        const state = createNewGameState();
        const placed = placeOnNode(state.world, 'bw-14');
        expect(placed.currentMap.arrivedFrom ?? null).toBeNull();
        const out = resolveDeath({ ...state, world: placed }, 'fight');
        expect(out.outcome).toBe('revived');
        expect(out.state.world.currentMap.currentNode).toBe('bw-1');
        expect(out.state.world.currentMap.consumedNodes).not.toContain('bw-14');
        expect(legalMovesFrom(out.state.world.currentMap).length).toBeGreaterThan(0);
    });

    it('arrivedFrom equal to the death node or off the map: back on the map start', () => {
        const state = createNewGameState();
        const placed = placeOnNode(state.world, 'bw-14');
        for (const arrivedFrom of ['bw-14', 'not-a-node']) {
            const world = { ...placed, currentMap: { ...placed.currentMap, arrivedFrom } };
            const out = resolveDeath({ ...state, world }, 'fight');
            expect(out.state.world.currentMap.currentNode).toBe('bw-1');
        }
    });

    it('the death node is the start node: the player stays, the arrival owed', () => {
        const state = createNewGameState();
        const map = state.world.currentMap;
        expect(map.currentNode).toBe('bw-1');
        const out = resolveDeath(state, 'fight');
        expect(out.outcome).toBe('revived');
        const after = out.state.world.currentMap;
        expect(after.currentNode).toBe('bw-1');
        expect(after.pendingArrival).toBe('bw-1');
        expect(out.state.dying).toBe(true);
        expect(out.state.player.health).toBe(1);
    });
});

describe('A6 - the engine hazard dies the same way', () => {
    const lethal = { kind: 'hazard' as const, damage: 100_000, description: 'a drop' };
    const mild = { kind: 'hazard' as const, damage: 1, description: 'a scrape' };

    function onHazard(dying: boolean): GameState {
        const base = createNewGameState();
        const world = walk(bwWorld(), 'bw-5');
        return { ...base, world, dying: dying ? true : undefined };
    }

    it('lethal flat damage on a first death revives on the node walked from', () => {
        const state = onHazard(false);
        const { state: out, event } = resolveMapEvent(state, () => 0.5, lethal);
        expect(event.kind).toBe('hazard');
        expect(out.player.health).toBe(1);
        expect(out.dying).toBe(true);
        expect(out.world.currentMap.currentNode).toBe('bw-1');
        expect(out.world.currentMap.consumedNodes).not.toContain('bw-5');
        expect(out.world.currentMap.availableNodes).toContain('bw-5');
        // The hazard fires again on the way back in.
        const again = moveToNode(out.world, 'bw-5');
        expect(again.currentMap.pendingArrival).toBe('bw-5');
    });

    it('lethal flat damage while dying ends the run', () => {
        const state = onHazard(true);
        const { state: out } = resolveMapEvent(state, () => 0.5, lethal);
        expect(out.dying).toBeUndefined();
        expect(out.runId).not.toBe(state.runId);
        expect(out.player.health).toBe(out.player.maxHealth);
        expect(out.world.currentMap.currentNode).toBe('bw-1');
    });

    it('survivable damage is not a death', () => {
        const state = onHazard(false);
        const { state: out } = resolveMapEvent(state, () => 0.5, mild);
        expect(out.dying).toBeUndefined();
        expect(out.player.health).toBe(state.player.health - 1);
        expect(out.world.currentMap.currentNode).toBe('bw-5');
        expect(out.world.currentMap.consumedNodes).toContain('bw-5');
    });
});

describe('A1 - which verbs write arrivedFrom', () => {
    it('an arrival records the node walked from; a placement and a crossing clear it', () => {
        const start = bwWorld();
        const arrived = moveToNode(start, 'bw-5');
        expect(arrived.currentMap.arrivedFrom).toBe('bw-1');

        const placed = placeOnNode(arrived, 'bw-8');
        expect(placed.currentMap.arrivedFrom).toBeNull();

        // Standing on the river bridge (bw-18) with bw-1 as the node walked
        // from; taking the door crosses (phase NK1d: the yes is `takeTravel`).
        const onDoor = { ...arrived, currentMap: { ...arrived.currentMap, currentNode: 'bw-18' } };
        expect(onDoor.currentMap.arrivedFrom).toBe('bw-1');
        const crossed = takeTravel({ ...createNewGameState(), world: onDoor });
        expect(crossed.world.currentMap.name).toBe('charcoal-wood');
        expect(crossed.world.currentMap.arrivedFrom ?? null).toBeNull();
    });
});

describe('DY1b - the reducer stamps a run over, and arrival keeps what it walked', () => {
    it('PLAYER_DIED on a dying player stamps the current save version; a revive keeps the state version', () => {
        const base = { ...createNewGameState(), world: moveToNode(bwWorld(), 'bw-5') };
        const stale = 1 as GameState['version'];

        const over = gameReducer(
            { ...base, version: stale, dying: true },
            { type: 'PLAYER_DIED', payload: { cause: 'fight' } },
        );
        expect(over.version).toBe(GAME_STATE_VERSION);
        expect(over.dying).toBeUndefined();

        const revived = gameReducer(
            { ...base, version: stale },
            { type: 'PLAYER_DIED', payload: { cause: 'fight' } },
        );
        expect(revived.dying).toBe(true);
        expect(revived.version).toBe(stale);
    });

    it('arriving at the node already under the player keeps the arrivedFrom it had, or none', () => {
        const map = moveToNode(bwWorld(), 'bw-5').currentMap;
        expect(arriveAtNode(map, 'bw-5').arrivedFrom).toBe('bw-1');

        const bare = { ...map };
        delete (bare as { arrivedFrom?: unknown }).arrivedFrom;
        expect(arriveAtNode(bare, 'bw-5').arrivedFrom).toBeNull();
        expect(arriveAtNode(bare, 'bw-7').arrivedFrom).toBe('bw-5');
    });
});
