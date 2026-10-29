/**
 * Walk the roads (phase WR1a): A1, A2, A3 and A5 of the WR1 brief.
 *
 * On a gauntlet map the legal moves are the open roads out of the node the
 * player stands on, read both ways, onto new and walked nodes alike; held
 * roads and quest locks still gate; the move lists follow the rule after
 * every move, resolve, rest respawn and load. Staged on the Breakwater that is
 * live when WR1a ships (the four markers, their pockets, the watchtower).
 */

import { describe, it, expect } from 'vitest';

import {
    legalMovesFrom, moveToNode, roadRouteTo, roadReachable, walkRoadTo,
    syncMoveLists, syncWorldMoveLists, IllegalMoveError,
} from '../world.reducer';
import { createMapState, getMapDefinition } from '../map.registry';
import { resolveMapEvent } from '../MapEvents/resolve-map-event';
import { respawnElites } from '../elite-respawn';
import { BREAKWATER_QUESTLINE_ID } from '../quest.library';
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

function fightAt(state: GameState, nodeId: string, outcome: 'victory' | 'flee' | 'defeat' = 'victory'): GameState {
    const { state: owed, event } = arrive(state, nodeId);
    if (event.kind !== 'encounter') throw new Error(`expected a fight at ${nodeId}, got ${event.kind}`);
    return endFight(owed, event.encounter, outcome);
}

const accept = (s: GameState, n: number) =>
    gameReducer(s, { type: 'ACCEPT_QUEST_STEP', payload: { questline: BREAKWATER_QUESTLINE_ID, step: n } });
const turnIn = (s: GameState, n: number) =>
    gameReducer(s, { type: 'TURN_IN_QUEST_STEP', payload: { questline: BREAKWATER_QUESTLINE_ID, step: n } });

function quest(state: GameState, nodeId: string): GameState {
    const { state: after, event } = arrive(state, nodeId);
    if (event.kind !== 'quest') throw new Error(`expected a quest node at ${nodeId}, got ${event.kind}`);
    return after;
}

describe('A1: legal moves are the open roads out of the node underfoot', () => {
    it('a new map offers the start node\'s roads, and its lists say so', () => {
        const m = createStartingWorld('breakwater').currentMap;
        expect(legalMovesFrom(m)).toEqual(['bw-19', 'bw-4', 'bw-5']);
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

    it('from a dead-end pocket the only road is the one back', () => {
        let s = freshGame();
        s = accept(quest(s, 'bw-19'), 1);
        s = arrive(s, 'bw-12').state;
        expect(legalMovesFrom(map(s))).toEqual(['bw-19']);
        // Back out through the marker to the windmill, then on to a new branch.
        expect(roadRouteTo(map(s), 'bw-4')).toEqual(['bw-19', 'bw-1', 'bw-4']);
        const out = arrive(s, 'bw-4');
        expect(out.event.kind).toBe('none');
        expect(map(out.state).currentNode).toBe('bw-4');
    });

    it('a walk back passes only across walked nodes', () => {
        const s = freshGame();
        // bw-7 is two roads away and bw-4 / bw-5 are unwalked: no walk reaches it yet.
        expect(roadRouteTo(map(s), 'bw-7')).toBeNull();
        expect(() => walkRoadTo(s.world, 'bw-7')).toThrow(IllegalMoveError);
        expect(roadReachable(map(s))).toEqual(['bw-19', 'bw-4', 'bw-5']);
    });
});

describe('A2: the move lists follow the rule after every move, resolve, respawn and load', () => {
    it('after moves and resolves along a walk out and back', () => {
        let s = freshGame();
        expectListsFollowTheRule(map(s));
        for (const id of ['bw-4', 'bw-9', 'bw-4', 'bw-1', 'bw-5']) {
            const moved: GameState = { ...s, world: moveToNode(s.world, id) };
            expectListsFollowTheRule(syncMoveLists(map(moved)));
            s = resolveMapEvent(moved, seededRng(5)).state;
            expectListsFollowTheRule(map(s));
        }
    });

    it('after a fight settles and after a rest brings an elite back', () => {
        let s = freshGame();
        s = accept(quest(s, 'bw-19'), 1);
        s = arrive(s, 'bw-3').state;
        s = arrive(s, 'bw-4').state;
        s = arrive(s, 'bw-9').state;
        s = accept(turnIn(quest(s, 'bw-20'), 1), 2);
        s = fightAt(s, 'bw-2');
        expectListsFollowTheRule(map(s));
        const back = respawnElites(s.world);
        expectListsFollowTheRule(back.world.currentMap);
    });

    it('A5: a save written under the frontier rule loads with its lists rewritten from where the player stands', () => {
        const live = createStartingWorld('breakwater');
        // A frontier-era save: standing on bw-9 with the whole explored edge
        // in availableNodes and a short lockedNodes.
        const frontierEra: WorldState = {
            ...live,
            currentMap: {
                ...live.currentMap,
                currentNode: 'bw-9',
                completedNodes: ['bw-4', 'bw-5'],
                consumedNodes: ['bw-1', 'bw-4', 'bw-5'],
                availableNodes: ['bw-19', 'bw-4', 'bw-5', 'bw-7', 'bw-9', 'bw-13'],
                lockedNodes: ['bw-17', 'bw-18'],
            },
            mapStates: {
                'breakwater': { ...live.currentMap, availableNodes: ['bw-7'], lockedNodes: [] },
            },
        };
        const loaded = syncWorldMoveLists(frontierEra);
        expect(loaded.currentMap.availableNodes).toEqual(['bw-4', 'bw-13']);
        expectListsFollowTheRule(loaded.currentMap);
        expectListsFollowTheRule(loaded.mapStates!['breakwater']!);
        // And it plays on: the next road is a legal move.
        expect(moveToNode(loaded, 'bw-13').currentMap.currentNode).toBe('bw-13');
        // A save that already agrees loads untouched.
        expect(syncWorldMoveLists(loaded)).toBe(loaded);
    });
});

describe('A3: held roads and blocked routes still gate on the Breakwater', () => {
    it('no road out of a quest marker opens before its step is accepted', () => {
        // Each marker, stood on unspent with its lock open: only the roads it
        // was reached by are legal, never one into its pocket.
        const pockets: Record<string, string[]> = {
            'bw-19': ['bw-3', 'bw-12'],
            'bw-20': ['bw-2', 'bw-10', 'bw-14'],
            'bw-21': ['bw-8', 'bw-6'],
            'bw-22': ['bw-17'],
        };
        const w = createStartingWorld('breakwater');
        for (const [marker, pocket] of Object.entries(pockets)) {
            const m: MapState = { ...w.currentMap, currentNode: marker, blockedRoutes: [] };
            for (const id of pocket) expect(legalMovesFrom(m), `${marker} -> ${id}`).not.toContain(id);
            expect(legalMovesFrom(m).length).toBeGreaterThan(0);
            const accepted: MapState = { ...m, consumedNodes: [marker] };
            for (const id of pocket) expect(legalMovesFrom(accepted), `${marker} -> ${id} once spent`).toContain(id);
        }
    });

    it('the bridge (bw-18) is not a legal move until the watchtower fight (bw-17) is won', () => {
        let s = freshGame();
        s = accept(quest(s, 'bw-19'), 1);
        s = arrive(s, 'bw-3').state;
        s = arrive(s, 'bw-4').state;
        s = arrive(s, 'bw-9').state;
        s = accept(turnIn(quest(s, 'bw-20'), 1), 2);
        s = fightAt(s, 'bw-2');
        s = fightAt(s, 'bw-10');
        s = arrive(s, 'bw-7').state;
        s = accept(turnIn(quest(s, 'bw-21'), 2), 3);
        s = fightAt(s, 'bw-8');
        s = arrive(s, 'bw-13').state;
        s = arrive(s, 'bw-15').state;
        s = accept(turnIn(quest(s, 'bw-22'), 3), 4);
        expect(roadReachable(map(s))).not.toContain('bw-18');

        const fled = fightAt(s, 'bw-17', 'flee');
        expect(map(fled).currentNode).toBe('bw-17');
        expect(legalMovesFrom(map(fled))).toEqual(['bw-22']);
        expect(() => moveToNode(fled.world, 'bw-18')).toThrow(/held/);

        const won = fightAt(s, 'bw-17', 'victory');
        expect(legalMovesFrom(map(won))).toContain('bw-18');
    });

    it('a quest lock keeps its marker off the moves until the step before is met', () => {
        let s = freshGame();
        s = arrive(s, 'bw-4').state;
        s = arrive(s, 'bw-9').state;
        expect(legalMovesFrom(map(s))).not.toContain('bw-20');
        expect(() => moveToNode(s.world, 'bw-20')).toThrow(/blocked/);
    });
});
