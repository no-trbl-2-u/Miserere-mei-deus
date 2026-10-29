/**
 * Walk the roads (phase WR1a): A1, A2, A3 and A5 of the WR1 brief.
 *
 * On a gauntlet map the legal moves are the open roads out of the node the
 * player stands on, read both ways, onto new and walked nodes alike; held
 * roads and quest gates still gate; the move lists follow the rule after
 * every move, resolve, rest respawn and load. Staged on the live Breakwater
 * (phase BW1b): the wreck and the three elites hold their far roads, and the
 * chain's keep gate and river bridge stay shut until their steps complete.
 */

import { describe, it, expect } from 'vitest';

import {
    legalMovesFrom, moveToNode, roadRouteTo, roadReachable, walkRoadTo,
    syncMoveLists, syncWorldMoveLists, IllegalMoveError,
} from '../world.reducer';
import { createMapState, getMapDefinition } from '../map.registry';
import { resolveMapEvent } from '../MapEvents/resolve-map-event';
import { takeTravel } from '../MapEvents/travel';
import { respawnElites } from '../elite-respawn';
import { BREAKWATER_CHAPTER_QUESTLINE_ID } from '../breakwater-chapter.questline';
import {
    BREAKWATER_CHAPTER_HELD, BRIDGE_GATE_REASON, KEEP_GATE_REASON,
} from '../Continents/Coastal-Village/breakwater-chapter';
import { createStartingWorld } from '../index';
import { createNewGameState, gameReducer } from '../../Game/game.reducer';
import type { GameState } from '../../Game/types';
import type { Encounter, MapState, WorldState } from '../types';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

const DEF = getMapDefinition('coastal-continent', 'breakwater');
const map = (s: GameState) => s.world.currentMap;

/** The road rule's two lists, as the engine should keep them on `m`. */
function expectListsFollowTheRule(m: MapState) {
    const legal = legalMovesFrom(m);
    expect(m.availableNodes).toEqual(legal);
    const spent = new Set([...m.completedNodes, ...m.consumedNodes]);
    const locked = DEF.nodes.map(n => n.id).filter(id => id !== m.currentNode && !legal.includes(id) && !spent.has(id));
    expect(m.lockedNodes).toEqual(locked);
}

function freshGame(): GameState {
    return resolveMapEvent(createNewGameState({ startMap: 'breakwater' }), seededRng(1)).state;
}

function arrive(state: GameState, nodeId: string) {
    return resolveMapEvent({ ...state, world: walkRoadTo(state.world, nodeId) }, seededRng(7));
}

function endFight(state: GameState, target: Encounter, outcome: 'victory' | 'flee' | 'defeat'): GameState {
    const fighting = gameReducer(state, { type: 'START_COMBAT', payload: { target } });
    return gameReducer(fighting, { type: 'END_COMBAT', payload: { outcome, grantedLoot: [], grantedXp: 0 } });
}

/** Opens the fight at `nodeId` (walking there, or retrying it in place) and ends it with `outcome`. */
function fightAt(state: GameState, nodeId: string, outcome: 'victory' | 'flee' | 'defeat' = 'victory'): GameState {
    const world = map(state).currentNode === nodeId ? moveToNode(state.world, nodeId) : walkRoadTo(state.world, nodeId);
    const { state: owed, event } = resolveMapEvent({ ...state, world }, seededRng(7));
    if (event.kind !== 'encounter') throw new Error(`expected a fight at ${nodeId}, got ${event.kind}`);
    return endFight(owed, event.encounter, outcome);
}

const accept = (s: GameState, n: number) =>
    gameReducer(s, { type: 'ACCEPT_QUEST_STEP', payload: { questline: BREAKWATER_CHAPTER_QUESTLINE_ID, step: n } });
const turnIn = (s: GameState, n: number) =>
    gameReducer(s, { type: 'TURN_IN_QUEST_STEP', payload: { questline: BREAKWATER_CHAPTER_QUESTLINE_ID, step: n } });

/** Arrives at the quest node `nodeId` and returns the state and the stage it reads as. */
function quest(state: GameState, nodeId: string): { state: GameState; stage: string } {
    const { state: after, event } = arrive(state, nodeId);
    if (event.kind !== 'quest') throw new Error(`expected a quest node at ${nodeId}, got ${event.kind}`);
    return { state: after, stage: event.stage };
}

/** Takes the passage offered at the travel node `nodeId`. */
function travelFrom(state: GameState, nodeId: string): GameState {
    const offered = arrive(state, nodeId);
    expect(offered.event.kind).toBe('travel');
    return takeTravel(offered.state);
}

/** The road `from` -> `to` is shut: not a legal move, and a move there throws `reason`. */
function expectShut(s: GameState, to: string, reason: string | RegExp) {
    expect(legalMovesFrom(map(s))).not.toContain(to);
    expect(() => moveToNode(s.world, to)).toThrow(IllegalMoveError);
    expect(() => moveToNode(s.world, to)).toThrow(reason);
}

describe('A1: legal moves are the open roads out of the node underfoot', () => {
    it('a new map offers the start node\'s roads, and its lists say so', () => {
        const m = createStartingWorld('breakwater').currentMap;
        expect(legalMovesFrom(m)).toEqual(['bw-w2']);
        expectListsFollowTheRule(m);
        expectListsFollowTheRule(createMapState(DEF));
    });

    it('moveToNode refuses every node that is not one of them', () => {
        const w = createStartingWorld('breakwater');
        const legal = new Set(legalMovesFrom(w.currentMap));
        for (const node of DEF.nodes) {
            if (node.id === w.currentMap.currentNode) continue;
            if (legal.has(node.id)) expect(moveToNode(w, node.id).currentMap.currentNode).toBe(node.id);
            else expect(() => moveToNode(w, node.id)).toThrow(IllegalMoveError);
        }
    });

    it('from a dead end the only road is the one back', () => {
        let s = freshGame();
        s = fightAt(s, 'bw-w2');
        s = fightAt(s, 'bw-m1');
        s = arrive(s, 'bw-m2').state;
        s = arrive(s, 'bw-m3').state;
        expect(legalMovesFrom(map(s))).toEqual(['bw-m2']);
        // Back out to the first fork, then on to a new branch.
        expect(roadRouteTo(map(s), 'bw-w4')).toEqual(['bw-m2', 'bw-m1', 'bw-w2', 'bw-w4']);
        const out = arrive(s, 'bw-w4');
        expect(out.event.kind).toBe('rest');
        expect(map(out.state).currentNode).toBe('bw-w4');
    });

    it('a walk back passes only across walked nodes', () => {
        const s = freshGame();
        // bw-w3 is two roads away and bw-w2 is unwalked: no walk reaches it yet.
        expect(roadRouteTo(map(s), 'bw-w3')).toBeNull();
        expect(() => walkRoadTo(s.world, 'bw-w3')).toThrow(IllegalMoveError);
        expect(roadReachable(map(s))).toEqual(['bw-w2']);
    });
});

describe('A2: the move lists follow the rule after every move, resolve, respawn and load', () => {
    it('after moves and resolves along a walk out and back', () => {
        let s = fightAt(freshGame(), 'bw-w2');
        expectListsFollowTheRule(map(s));
        for (const id of ['bw-w4', 'bw-w2', 'bw-w1', 'bw-w2', 'bw-w4']) {
            const moved: GameState = { ...s, world: moveToNode(s.world, id) };
            expectListsFollowTheRule(syncMoveLists(map(moved)));
            s = resolveMapEvent(moved, seededRng(5)).state;
            expectListsFollowTheRule(map(s));
        }
    });

    it('after a fight settles and after a rest brings an elite back', () => {
        let s = freshGame();
        s = fightAt(s, 'bw-w2');
        s = arrive(s, 'bw-w4').state;
        s = fightAt(s, 'bw-w5');
        expectListsFollowTheRule(map(s));
        const back = respawnElites(s.world);
        expect(back.respawned).toEqual([{ map: 'breakwater', node: 'bw-w5' }]);
        expectListsFollowTheRule(back.world.currentMap);
    });

    it('A5: a save written under the frontier rule loads with its lists rewritten from where the player stands', () => {
        const live = createStartingWorld('breakwater');
        // A frontier-era save: standing on bw-w4 with the whole explored edge
        // in availableNodes and a short lockedNodes.
        const frontierEra: WorldState = {
            ...live,
            currentMap: {
                ...live.currentMap,
                currentNode: 'bw-w4',
                completedNodes: ['bw-w2'],
                consumedNodes: ['bw-w1', 'bw-w2'],
                availableNodes: ['bw-w2', 'bw-w3', 'bw-w4', 'bw-m1', 'bw-w5'],
                lockedNodes: ['bw-k2', 'bw-b2'],
            },
            mapStates: {
                'breakwater': { ...live.currentMap, availableNodes: ['bw-w3'], lockedNodes: [] },
            },
        };
        const loaded = syncWorldMoveLists(frontierEra);
        expect(loaded.currentMap.availableNodes).toEqual(['bw-w2', 'bw-w5']);
        expectListsFollowTheRule(loaded.currentMap);
        expectListsFollowTheRule(loaded.mapStates!['breakwater']!);
        // And it plays on: the next road is a legal move.
        expect(moveToNode(loaded, 'bw-w5').currentMap.currentNode).toBe('bw-w5');
        // A save that already agrees loads untouched.
        expect(syncWorldMoveLists(loaded)).toBe(loaded);
    });
});

describe('A3: held roads and quest gates still gate on the Breakwater', () => {
    it('each held node keeps its far road shut until it is crossed or beaten, and the road it was reached by open', () => {
        // Held node -> [the road it was reached by, its far road].
        const roads: Record<string, [string, string]> = {
            'bw-h4': ['bw-h3', 'bw-h5'],
            'bw-c1': ['bw-c0', 'bw-c2'],
            'bw-l4': ['bw-l3', 'bw-l5'],
            'bw-w5': ['bw-w4', 'bw-k1'],
        };
        expect(Object.keys(roads).sort()).toEqual([...BREAKWATER_CHAPTER_HELD].sort());
        const w = createStartingWorld('breakwater');
        for (const [held, [near, far]] of Object.entries(roads)) {
            const m: MapState = { ...w.currentMap, currentNode: held, blockedRoutes: [] };
            expect(legalMovesFrom(m), `${held} -> ${near}`).toContain(near);
            expect(legalMovesFrom(m), `${held} -> ${far}`).not.toContain(far);
            const settled: MapState = { ...m, completedNodes: [held] };
            expect(legalMovesFrom(settled), `${held} -> ${far} once settled`).toContain(far);
        }
    });

    it('a fled elite keeps its far road shut; a won one opens it', () => {
        let s = fightAt(freshGame(), 'bw-w2');
        s = arrive(s, 'bw-w4').state;
        const fled = fightAt(s, 'bw-w5', 'flee');
        expect(map(fled).currentNode).toBe('bw-w5');
        expect(legalMovesFrom(map(fled))).toEqual(['bw-w4']);
        expect(() => moveToNode(fled.world, 'bw-k1')).toThrow(/held/);
        const won = fightAt(fled, 'bw-w5', 'victory');
        expect(legalMovesFrom(map(won))).toContain('bw-k1');
    });

    it('the keep gate (bw-k1 -> bw-k2) and the river bridge (bw-b1 -> bw-b2) stay shut until their steps complete', () => {
        let s = freshGame();

        // The bridge reached first: the quest node refuses, the bridge stays shut.
        for (const id of ['bw-w2', 'bw-w3', 'bw-h1', 'bw-t1', 'bw-t2']) s = fightAt(s, id);
        const early = quest(s, 'bw-b1');
        expect(early.stage).toBe('locked');
        expectShut(early.state, 'bw-b2', BRIDGE_GATE_REASON);
        s = early.state;

        // Step 1 to the cove and back, step 2 to the lighthouse.
        for (const id of ['bw-h2', 'bw-h3']) s = fightAt(s, id);
        s = arrive(s, 'bw-h4').state;
        s = arrive(s, 'bw-h5').state;
        s = travelFrom(s, 'bw-h6');
        s = fightAt(s, 'bw-c1');
        s = accept(turnIn(quest(s, 'bw-c2').state, 1), 2);
        s = travelFrom(s, 'bw-c0');
        s = fightAt(s, 'bw-t3');
        s = arrive(s, 'bw-t5').state;
        for (const id of ['bw-t6', 'bw-l1']) s = fightAt(s, id);
        s = arrive(s, 'bw-l3').state;
        s = fightAt(s, 'bw-l4');
        s = accept(quest(s, 'bw-l5').state, 3);

        // To the keep gate: shut with step 3 active and the key carried, until it is turned in.
        s = arrive(s, 'bw-w4').state;
        s = fightAt(s, 'bw-w5');
        const gate = quest(s, 'bw-k1');
        expect(gate.stage).toBe('turn-in');
        expectShut(gate.state, 'bw-k2', KEEP_GATE_REASON);
        s = turnIn(gate.state, 3);
        expect(legalMovesFrom(map(s))).toContain('bw-k2');

        // The boss beaten: the bridge stays shut until step 4 is turned in at bw-b1.
        s = accept(s, 4);
        s = fightAt(s, 'bw-k2');
        expect(roadReachable(map(s))).not.toContain('bw-b2');
        const bridge = quest(s, 'bw-b1');
        expect(bridge.stage).toBe('turn-in');
        expectShut(bridge.state, 'bw-b2', BRIDGE_GATE_REASON);
        s = turnIn(bridge.state, 4);
        expect(legalMovesFrom(map(s))).toContain('bw-b2');
    });
});
