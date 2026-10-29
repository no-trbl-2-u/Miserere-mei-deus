/**
 * Revisit completed nodes (phase WR1b): A6, A7, A8 and A10's engine walk.
 *
 * Walking back onto a spent fight, hazard, rest, cache or cutscene node
 * resolves nothing and owes nothing; a completed-but-not-consumed node is
 * spent too. A village opens again, a door offers its trip again, a quest node
 * resolves for its current step (an offer, a turn-in, or nothing). An elite a
 * claimed rest revived fights again; a retired one stays spent. Staged on the
 * Breakwater that is live when WR1b ships.
 */

import { describe, it, expect } from 'vitest';
import { takeTravel } from '../MapEvents/travel';

import { completeCurrentNode, moveToNode, legalMovesFrom, walkRoadTo, syncMoveLists } from '../world.reducer';
import {
    resolveMapEvent, actsOnRevisit, isQuietWalkBack, registerMapEventPool, setNodeEventPoolOverride,
} from '../MapEvents/resolve-map-event';
import { respawnElites, retireEliteNode } from '../elite-respawn';
import { BREAKWATER_QUESTLINE_ID } from '../quest.library';
import { settleQuestNodes } from '../../Game/fixtures/quest-nodes';
import { createNewGameState, gameReducer } from '../../Game/game.reducer';
import type { GameState } from '../../Game/types';
import type { Encounter, MapState } from '../types';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

const map = (s: GameState) => s.world.currentMap;

function freshGame(): GameState {
    return resolveMapEvent(createNewGameState({ startMap: 'breakwater' }), seededRng(1)).state;
}

function arrive(state: GameState, nodeId: string) {
    return resolveMapEvent({ ...state, world: walkRoadTo(state.world, nodeId) }, seededRng(7));
}

/** One road onto `nodeId` and its resolve: the host's move-then-resolve. */
function step(state: GameState, nodeId: string) {
    const moved: GameState = { ...state, world: moveToNode(state.world, nodeId) };
    return { moved, ...resolveMapEvent(moved, seededRng(11)) };
}

function endFight(state: GameState, target: Encounter, outcome: 'victory' | 'flee' | 'defeat'): GameState {
    const fighting = gameReducer(state, { type: 'START_COMBAT', payload: { target } });
    return gameReducer(fighting, { type: 'END_COMBAT', payload: { outcome, grantedLoot: [], grantedXp: 0 } });
}

const accept = (s: GameState, n: number) =>
    gameReducer(s, { type: 'ACCEPT_QUEST_STEP', payload: { questline: BREAKWATER_QUESTLINE_ID, step: n } });

function quest(state: GameState, nodeId: string): GameState {
    const { state: after, event } = arrive(state, nodeId);
    if (event.kind !== 'quest') throw new Error(`expected a quest node at ${nodeId}, got ${event.kind}`);
    return after;
}

/** A walk back: nothing owed on arrival, nothing resolved, the player untouched. */
function expectQuietWalkBack(state: GameState, nodeId: string): GameState {
    expect(isQuietWalkBack(state, nodeId), `${nodeId} is a quiet walk back`).toBe(true);
    const { moved, state: after, event } = step(state, nodeId);
    expect(map(moved).currentNode).toBe(nodeId);
    expect(map(moved).pendingArrival ?? null).toBeNull();
    expect(event.kind).toBe('none');
    expect(after.player).toEqual(state.player);
    expect(after.quests).toEqual(state.quests);
    expect(map(after).pendingArrival ?? null).toBeNull();
    return after;
}

/** The game as a player stands it with the marker-1 pocket walked: hazard bw-12 spent. */
function walkedIntoPocket(): GameState {
    let s = freshGame();
    s = accept(quest(s, 'bw-19'), 1);
    return arrive(s, 'bw-12').state;
}

describe('A6: a spent fight, hazard, rest, cache or cutscene node resolves nothing', () => {
    it('a spent hazard and a spent cutscene (the windmill) fire nothing on a walk back', () => {
        let s = walkedIntoPocket();
        s = expectQuietWalkBack(s, 'bw-19');
        s = expectQuietWalkBack(s, 'bw-1');
        s = expectQuietWalkBack(s, 'bw-19');
        expectQuietWalkBack(s, 'bw-12');
    });

    it('a spent rest heals nothing and a spent cache pays nothing on a walk back', () => {
        let s = freshGame();
        s = arrive(s, 'bw-5').state;
        s = arrive(s, 'bw-4').state;
        s = arrive(s, 'bw-9').state;
        const hurt: GameState = { ...s, player: { ...s.player, health: 1 } };
        let back = expectQuietWalkBack(hurt, 'bw-4');
        back = expectQuietWalkBack(back, 'bw-9');
        expect(back.player.health).toBe(1);
        back = expectQuietWalkBack(back, 'bw-4');
        expectQuietWalkBack(back, 'bw-5');
    });

    it('a won fight does not fight again on a walk back', () => {
        let s = freshGame();
        s = accept(quest(s, 'bw-19'), 1);
        s = arrive(s, 'bw-3').state;
        s = arrive(s, 'bw-4').state;
        s = arrive(s, 'bw-9').state;
        s = gameReducer(quest(s, 'bw-20'), { type: 'TURN_IN_QUEST_STEP', payload: { questline: BREAKWATER_QUESTLINE_ID, step: 1 } });
        s = accept(s, 2);
        const { state: owed, event } = arrive(s, 'bw-2');
        if (event.kind !== 'encounter') throw new Error(`expected a fight at bw-2, got ${event.kind}`);
        s = endFight(owed, event.encounter, 'victory');
        s = expectQuietWalkBack(s, 'bw-20');
        expectQuietWalkBack(s, 'bw-2');
    });

    it('a completed-but-not-consumed node is spent: the walk back owes nothing and resolves nothing', () => {
        // A host that completes a node on the move (mobile) leaves it in
        // completedNodes alone until its resolve; one left that way is spent.
        let s = freshGame();
        s = { ...s, world: moveToNode(s.world, 'bw-5') };
        s = { ...s, world: completeCurrentNode(s.world) };
        // The first arrival is owed, so its resolve still pays.
        expect(map(s).pendingArrival).toBe('bw-5');
        expect(map(s).consumedNodes).not.toContain('bw-5');
        s = { ...s, world: { ...s.world, currentMap: { ...map(s), pendingArrival: null } } };
        s = step(s, 'bw-1').state;
        const back = expectQuietWalkBack(s, 'bw-5');
        expect(map(back).consumedNodes).not.toContain('bw-5');
    });

    it('a first arrival on a node the host completed on the move still resolves its event', () => {
        let s = freshGame();
        s = { ...s, world: moveToNode(s.world, 'bw-5') };
        s = { ...s, world: completeCurrentNode(s.world) };
        expect(resolveMapEvent(s, seededRng(3)).event.kind).toBe('loot-cache');
    });
});

describe('A7: a village, a door and a quest node act on every entry', () => {
    it('a quest marker left unaccepted offers its step again; once accepted it has nothing and is quiet', () => {
        let s = freshGame();
        const first = arrive(s, 'bw-19');
        expect(first.event.kind === 'quest' && first.event.stage).toBe('offer');
        s = step(first.state, 'bw-1').state;
        const again = step(s, 'bw-19');
        expect(map(again.moved).pendingArrival).toBe('bw-19');
        expect(again.event.kind === 'quest' && again.event.stage).toBe('offer');
        s = accept(again.state, 1);
        expect(actsOnRevisit(s, 'bw-19')).toBe(false);
        s = step(s, 'bw-1').state;
        expectQuietWalkBack(s, 'bw-19');
    });

    it('a spent quest marker with a step to turn in acts on a revisit', () => {
        let s = walkedIntoPocket();
        // Marker 2 reads step 1: met (the hazard pocket filled it), so a turn-in.
        s = arrive(s, 'bw-3').state;
        const spentMarker2: GameState = {
            ...s,
            world: { ...s.world, currentMap: { ...map(s), consumedNodes: [...map(s).consumedNodes, 'bw-20'] } },
        };
        expect(actsOnRevisit(spentMarker2, 'bw-20')).toBe(true);
        expect(isQuietWalkBack(spentMarker2, 'bw-20')).toBe(false);
        // Marker 1 (step 1 accepted, not yet turned in at marker 2) has nothing.
        expect(actsOnRevisit(spentMarker2, 'bw-19')).toBe(false);
    });

    it('a travel door offers its trip again on every entry', () => {
        // The watchtower won, the bridge walked once by a host that completes
        // on the move: walking back onto it offers the trip again when
        // resolved, and taking it crosses (phase NK1d).
        const base = freshGame();
        const settled = settleQuestNodes(map(base));
        const atTower: MapState = syncMoveLists({
            ...settled,
            currentNode: 'bw-17',
            completedNodes: [...settled.completedNodes, 'bw-17', 'bw-18'],
            consumedNodes: [...settled.consumedNodes, 'bw-17'],
        });
        const s: GameState = { ...base, world: { ...base.world, currentMap: atTower } };
        expect(legalMovesFrom(atTower)).toContain('bw-18');
        expect(actsOnRevisit(s, 'bw-18')).toBe(true);
        expect(isQuietWalkBack(s, 'bw-18')).toBe(false);
        const { event, state: after } = step(s, 'bw-18');
        expect(event.kind).toBe('travel');
        expect(map(after).name).toBe('breakwater');
        expect(map(takeTravel(after)).name).toBe('charcoal-wood');
    });

    it('a village opens again on every entry', () => {
        registerMapEventPool({
            id: 'wr1b.test-village',
            entries: [{ kind: 'village', weight: 1, payload: { kind: 'village', villageName: 'Test Hamlet' } }],
        });
        setNodeEventPoolOverride('coastal-continent', 'breakwater', 'bw-4', 'wr1b.test-village');
        let s = freshGame();
        const first = step(s, 'bw-4');
        expect(first.event.kind).toBe('village');
        s = step(first.state, 'bw-1').state;
        expect(isQuietWalkBack(s, 'bw-4')).toBe(false);
        const again = step(s, 'bw-4');
        expect(again.event.kind).toBe('village');
    });
});

describe('A8: an elite a rest revived fights again; a retired one stays spent', () => {
    function eliteFoughtAndLeft(): GameState {
        const base = freshGame();
        const settled = settleQuestNodes(map(base));
        const standing: MapState = syncMoveLists({
            ...settled,
            currentNode: 'bw-21',
            consumedNodes: [...settled.consumedNodes, 'bw-8'],
            completedNodes: [...settled.completedNodes, 'bw-8'],
        });
        return { ...base, world: { ...base.world, currentMap: standing } };
    }

    it('a revived elite owes its fight on arrival and resolves to it', () => {
        const fought = eliteFoughtAndLeft();
        expect(isQuietWalkBack(fought, 'bw-8')).toBe(true);
        const revived: GameState = { ...fought, world: respawnElites(fought.world).world };
        expect(isQuietWalkBack(revived, 'bw-8')).toBe(false);
        const { moved, event } = step(revived, 'bw-8');
        expect(map(moved).pendingArrival).toBe('bw-8');
        expect(event.kind).toBe('encounter');
    });

    it('a retired elite stays spent through a rest', () => {
        const fought = eliteFoughtAndLeft();
        const retired: GameState = { ...fought, world: retireEliteNode(fought.world, 'bw-8') };
        const rested: GameState = { ...retired, world: respawnElites(retired.world).world };
        expectQuietWalkBack(rested, 'bw-8');
    });
});

describe('A10: the Breakwater walk into a dead-end pocket and back to the windmill', () => {
    it('walks back across completed nodes to the windmill, then on to an unvisited branch', () => {
        let s = walkedIntoPocket();
        expect(legalMovesFrom(map(s))).toEqual(['bw-19']);
        s = expectQuietWalkBack(s, 'bw-19');
        s = expectQuietWalkBack(s, 'bw-1');
        expect(map(s).currentNode).toBe('bw-1');
        const on = step(s, 'bw-4');
        expect(map(on.moved).pendingArrival).toBe('bw-4');
        expect(map(on.state).currentNode).toBe('bw-4');
        expect(map(on.state).consumedNodes).toContain('bw-4');
    });
});
