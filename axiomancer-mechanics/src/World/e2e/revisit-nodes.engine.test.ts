/**
 * Revisit completed nodes (phase WR1b): A6, A7, A8 and A10's engine walk.
 *
 * Walking back onto a spent fight, hazard, rest, cache or cutscene node
 * resolves nothing and owes nothing; a completed-but-not-consumed node is
 * spent too. A village opens again, a door offers its trip again, a quest node
 * resolves for its current step (an offer, a turn-in, or nothing). An elite a
 * claimed rest revived fights again; a retired one stays spent. Staged on the
 * rebuilt Breakwater (Chapter 1's map).
 */

import { describe, it, expect } from 'vitest';
import { takeTravel } from '../MapEvents/travel';

import { completeCurrentNode, moveToNode, legalMovesFrom, walkRoadTo, syncMoveLists } from '../world.reducer';
import {
    resolveMapEvent, actsOnRevisit, isQuietWalkBack, registerMapEventPool, setNodeEventPoolOverride, getNodeEventPool,
} from '../MapEvents/resolve-map-event';
import { respawnElites, retireEliteNode } from '../elite-respawn';
import { BREAKWATER_CHAPTER_QUESTLINE_ID as LINE } from '../breakwater-chapter.questline';
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

/** A new game on the Breakwater, the windmill's arrival played (it gives step 1). */
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

/** Walks the roads to the fight at `nodeId` and wins it. */
function win(state: GameState, nodeId: string): GameState {
    const { state: owed, event } = arrive(state, nodeId);
    if (event.kind !== 'encounter') throw new Error(`expected a fight at ${nodeId}, got ${event.kind}`);
    return endFight(owed, event.encounter, 'victory');
}

const accept = (s: GameState, n: number) =>
    gameReducer(s, { type: 'ACCEPT_QUEST_STEP', payload: { questline: LINE, step: n } });

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

/** The manor road walked to its hazard: fights bw-w2 and bw-m1 won, hazard bw-m2 spent. */
function walkedToHazard(): GameState {
    let s = freshGame();
    s = win(s, 'bw-w2');
    s = win(s, 'bw-m1');
    return arrive(s, 'bw-m2').state;
}

/** The game walked to the fishermen's camp (bw-c2) through the wreck and the sea cave, its arrival resolved. */
function atTheCamp(): { state: GameState; stage: string | undefined } {
    let s = freshGame();
    for (const id of ['bw-w2', 'bw-w3', 'bw-h1', 'bw-h2', 'bw-h3']) s = win(s, id);
    s = arrive(s, 'bw-h4').state;
    s = arrive(s, 'bw-h5').state;
    const cave = arrive(s, 'bw-h6');
    expect(cave.event.kind).toBe('travel');
    s = takeTravel(cave.state);
    expect(map(s).currentNode).toBe('bw-c0');
    s = win(s, 'bw-c1');
    const camp = arrive(s, 'bw-c2');
    return { state: camp.state, stage: camp.event.kind === 'quest' ? camp.event.stage : undefined };
}

describe('A6: a spent fight, hazard, rest, cache or cutscene node resolves nothing', () => {
    it('a spent hazard and a spent cutscene (the windmill) fire nothing on a walk back', () => {
        let s = walkedToHazard();
        s = expectQuietWalkBack(s, 'bw-m1');
        s = expectQuietWalkBack(s, 'bw-w2');
        s = expectQuietWalkBack(s, 'bw-w1');
        s = expectQuietWalkBack(s, 'bw-w2');
        s = expectQuietWalkBack(s, 'bw-m1');
        expectQuietWalkBack(s, 'bw-m2');
    });

    it('a spent rest heals nothing and a spent cache pays nothing on a walk back', () => {
        let s = walkedToHazard();
        s = arrive(s, 'bw-m3').state;
        s = arrive(s, 'bw-w4').state;
        const hurt: GameState = { ...s, player: { ...s.player, health: 1 } };
        let back = expectQuietWalkBack(hurt, 'bw-w2');
        back = expectQuietWalkBack(back, 'bw-w4');
        expect(back.player.health).toBe(1);
        back = expectQuietWalkBack(back, 'bw-w2');
        back = expectQuietWalkBack(back, 'bw-m1');
        back = expectQuietWalkBack(back, 'bw-m2');
        expectQuietWalkBack(back, 'bw-m3');
    });

    it('a won fight does not fight again on a walk back', () => {
        let s = freshGame();
        const { state: owed, event } = arrive(s, 'bw-w2');
        if (event.kind !== 'encounter') throw new Error(`expected a fight at bw-w2, got ${event.kind}`);
        s = endFight(owed, event.encounter, 'victory');
        s = expectQuietWalkBack(s, 'bw-w1');
        expectQuietWalkBack(s, 'bw-w2');
    });

    it('a completed-but-not-consumed node is spent: the walk back owes nothing and resolves nothing', () => {
        // A host that completes a node on the move (mobile) leaves it in
        // completedNodes alone until its resolve; one left that way is spent.
        let s = walkedToHazard();
        s = { ...s, world: moveToNode(s.world, 'bw-m3') };
        s = { ...s, world: completeCurrentNode(s.world) };
        // The first arrival is owed, so its resolve still pays.
        expect(map(s).pendingArrival).toBe('bw-m3');
        expect(map(s).consumedNodes).not.toContain('bw-m3');
        s = { ...s, world: { ...s.world, currentMap: { ...map(s), pendingArrival: null } } };
        s = step(s, 'bw-m2').state;
        const back = expectQuietWalkBack(s, 'bw-m3');
        expect(map(back).consumedNodes).not.toContain('bw-m3');
    });

    it('a first arrival on a node the host completed on the move still resolves its event', () => {
        let s = walkedToHazard();
        s = { ...s, world: moveToNode(s.world, 'bw-m3') };
        s = { ...s, world: completeCurrentNode(s.world) };
        expect(resolveMapEvent(s, seededRng(3)).event.kind).toBe('loot-cache');
    });
});

describe('A7: a village, a door and a quest node act on every entry', () => {
    it('a quest node left unaccepted offers its step again; once accepted it has nothing and is quiet', () => {
        const camp = atTheCamp();
        expect(camp.stage).toBe('turn-in');
        let s = gameReducer(camp.state, { type: 'TURN_IN_QUEST_STEP', payload: { questline: LINE, step: 1 } });
        // Step 2 is offered at the camp; walk away without taking it.
        expect(actsOnRevisit(s, 'bw-c2')).toBe(true);
        s = step(s, 'bw-c1').state;
        const again = step(s, 'bw-c2');
        expect(map(again.moved).pendingArrival).toBe('bw-c2');
        expect(again.event.kind === 'quest' && again.event.stage).toBe('offer');
        s = accept(again.state, 2);
        expect(actsOnRevisit(s, 'bw-c2')).toBe(false);
        s = step(s, 'bw-c1').state;
        expectQuietWalkBack(s, 'bw-c2');
    });

    it('a spent quest node with a step to turn in acts on a revisit', () => {
        const camp = atTheCamp();
        // The camp reads step 1: met on arrival, so a turn-in.
        expect(camp.stage).toBe('turn-in');
        const s = step(camp.state, 'bw-c1').state;
        const spentCamp: GameState = {
            ...s,
            world: { ...s.world, currentMap: { ...map(s), consumedNodes: [...new Set([...map(s).consumedNodes, 'bw-c2'])] } },
        };
        expect(actsOnRevisit(spentCamp, 'bw-c2')).toBe(true);
        expect(isQuietWalkBack(spentCamp, 'bw-c2')).toBe(false);
        // The lighthouse (step 3's node, step 2 not yet taken) has nothing.
        expect(actsOnRevisit(spentCamp, 'bw-l5')).toBe(false);
    });

    it('a travel door offers its trip again on every entry', () => {
        // The bridge turned in, the far bank walked once by a host that
        // completes on the move: walking back onto it offers the trip again
        // when resolved, and taking it crosses (phase NK1d).
        const base = freshGame();
        const settled = settleQuestNodes(map(base));
        const atBridge: MapState = syncMoveLists({
            ...settled,
            currentNode: 'bw-b1',
            completedNodes: [...settled.completedNodes, 'bw-b1', 'bw-b2'],
            consumedNodes: [...settled.consumedNodes, 'bw-b1'],
        });
        const s: GameState = { ...base, world: { ...base.world, currentMap: atBridge } };
        expect(legalMovesFrom(atBridge)).toContain('bw-b2');
        expect(actsOnRevisit(s, 'bw-b2')).toBe(true);
        expect(isQuietWalkBack(s, 'bw-b2')).toBe(false);
        const { event, state: after } = step(s, 'bw-b2');
        expect(event.kind).toBe('travel');
        expect(map(after).name).toBe('breakwater');
        expect(map(takeTravel(after)).name).toBe('charcoal-wood');
    });

    it('a village opens again on every entry', () => {
        registerMapEventPool({
            id: 'wr1b.test-village',
            entries: [{ kind: 'village', weight: 1, payload: { kind: 'village', villageName: 'Test Hamlet' } }],
        });
        const ownPool = getNodeEventPool('coastal-continent', 'breakwater', 'bw-w2')!;
        setNodeEventPoolOverride('coastal-continent', 'breakwater', 'bw-w2', 'wr1b.test-village');
        try {
            let s = freshGame();
            const first = step(s, 'bw-w2');
            expect(first.event.kind).toBe('village');
            s = step(first.state, 'bw-w1').state;
            expect(isQuietWalkBack(s, 'bw-w2')).toBe(false);
            const again = step(s, 'bw-w2');
            expect(again.event.kind).toBe('village');
        } finally {
            // The fight is bw-w2's own pool: put it back for the walks below.
            setNodeEventPoolOverride('coastal-continent', 'breakwater', 'bw-w2', ownPool.id);
        }
    });
});

describe('A8: an elite a rest revived fights again; a retired one stays spent', () => {
    /** The keep causeway elite (bw-w5) beaten, the player back at the camp before it (bw-w4). */
    function eliteFoughtAndLeft(): GameState {
        const base = freshGame();
        const settled = settleQuestNodes(map(base));
        const standing: MapState = syncMoveLists({
            ...settled,
            currentNode: 'bw-w4',
            consumedNodes: [...settled.consumedNodes, 'bw-w2', 'bw-w4', 'bw-w5'],
            completedNodes: [...settled.completedNodes, 'bw-w2', 'bw-w4', 'bw-w5'],
        });
        return { ...base, world: { ...base.world, currentMap: standing } };
    }

    it('a revived elite owes its fight on arrival and resolves to it', () => {
        const fought = eliteFoughtAndLeft();
        expect(isQuietWalkBack(fought, 'bw-w5')).toBe(true);
        const revived: GameState = { ...fought, world: respawnElites(fought.world).world };
        expect(isQuietWalkBack(revived, 'bw-w5')).toBe(false);
        const { moved, event } = step(revived, 'bw-w5');
        expect(map(moved).pendingArrival).toBe('bw-w5');
        expect(event.kind).toBe('encounter');
    });

    it('a retired elite stays spent through a rest', () => {
        const fought = eliteFoughtAndLeft();
        const retired: GameState = { ...fought, world: retireEliteNode(fought.world, 'bw-w5') };
        const rested: GameState = { ...retired, world: respawnElites(retired.world).world };
        expectQuietWalkBack(rested, 'bw-w5');
    });
});

describe('A10: the Breakwater walk into a dead end and back to the windmill', () => {
    it('walks back across completed nodes to the windmill, then out to an unvisited branch', () => {
        let s = arrive(walkedToHazard(), 'bw-m3').state;
        expect(legalMovesFrom(map(s))).toEqual(['bw-m2']);
        s = expectQuietWalkBack(s, 'bw-m2');
        s = expectQuietWalkBack(s, 'bw-m1');
        s = expectQuietWalkBack(s, 'bw-w2');
        s = expectQuietWalkBack(s, 'bw-w1');
        expect(map(s).currentNode).toBe('bw-w1');
        s = expectQuietWalkBack(s, 'bw-w2');
        const on = step(s, 'bw-w4');
        expect(map(on.moved).pendingArrival).toBe('bw-w4');
        expect(map(on.state).currentNode).toBe('bw-w4');
        expect(map(on.state).consumedNodes).toContain('bw-w4');
    });
});
