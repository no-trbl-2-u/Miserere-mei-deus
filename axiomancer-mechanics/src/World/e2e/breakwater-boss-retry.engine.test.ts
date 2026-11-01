// guard-test: the seam already agreed on the parent (DY1a revive un-spends the death node, QL1b leaves it unspent); this pins the joined run so neither rule can drift
/**
 * The chapter boss fought again (phase QL1g, A23 of the QL1 brief; moved to
 * the rebuilt Breakwater in phase BW1b).
 *
 * The Breakwater chain's last step is a `kill` of the chapter boss in the sea
 * keep (bw-k2), taken at the keep gate (bw-k1) and turned in at the river
 * bridge (bw-b1). T's death rule (plot DY1: a first death returns the player
 * to the node walked from at 1 VITAE, dying; a death while dying ends the
 * run) meets the retry rule (a lost or fled fight leaves its node unspent, A9)
 * at this one fight. This walks the live Breakwater and its registered chain
 * from a fresh game to step 4 accepted, loses the boss once through the
 * reducer the app dispatches to, and asserts the two rules agree: the player
 * stands on the keep gate, bw-k2 is open and unspent, step 4 is still active
 * and uncounted and the bridge is shut. The same run then wins, turns the
 * step in at the bridge, gets its relic and opens the bridge. A second loss
 * while dying ends the run.
 */

import { describe, it, expect } from 'vitest';

import { legalMovesFrom, isNodeSpent, roadReachable, walkRoadTo } from '../world.reducer';
import { resolveMapEvent } from '../MapEvents/resolve-map-event';
import { takeTravel } from '../MapEvents/travel';
import { questStepState } from '../questline';
import {
    BREAKWATER_CHAPTER_QUESTLINE, BREAKWATER_CHAPTER_QUESTLINE_ID, BREAKWATER_CHAPTER_PIECES,
    BREAKWATER_CHAPTER_STEPS,
} from '../breakwater-chapter.questline';
import '../index';
import { createNewGameState, gameReducer } from '../../Game/game.reducer';
import type { GameState } from '../../Game/types';
import type { Encounter } from '../types';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

const LINE = BREAKWATER_CHAPTER_QUESTLINE_ID;
const BOSS_NODE = 'bw-k2';
const KEEP_GATE = 'bw-k1';
const BRIDGE_NODE = 'bw-b1';
const BRIDGE = 'bw-b2';
const RELIC = BREAKWATER_CHAPTER_PIECES[4];

const map = (s: GameState) => s.world.currentMap;
const legal = (s: GameState) => legalMovesFrom(map(s));
const step4 = (s: GameState) => questStepState(s.quests, BREAKWATER_CHAPTER_QUESTLINE.steps[3]!);
const bossKills = (s: GameState) =>
    s.quests.active.find(q => q.name === BREAKWATER_CHAPTER_STEPS.boss)?.objectives[0]?.currentCount;
const hasRelic = (s: GameState) => s.player.inventory.some(i => i.id === RELIC);

function freshGame(): GameState {
    return resolveMapEvent(createNewGameState({ startMap: 'breakwater' }), seededRng(1)).state;
}

/** Walks the roads to `nodeId` and resolves its arrival. */
function arrive(state: GameState, nodeId: string) {
    const moved: GameState = { ...state, world: walkRoadTo(state.world, nodeId) };
    return resolveMapEvent(moved, seededRng(7));
}

function quest(state: GameState, nodeId: string): GameState {
    const { state: after, event } = arrive(state, nodeId);
    if (event.kind !== 'quest') throw new Error(`expected a quest node at ${nodeId}, got ${event.kind}`);
    return after;
}

function endFight(state: GameState, target: Encounter, outcome: 'victory' | 'flee' | 'defeat'): GameState {
    const fighting = gameReducer(state, { type: 'START_COMBAT', payload: { target } });
    return gameReducer(fighting, { type: 'END_COMBAT', payload: { outcome, grantedLoot: [], grantedXp: 0 } });
}

function fightAt(state: GameState, nodeId: string): GameState {
    const { state: owed, event } = arrive(state, nodeId);
    if (event.kind !== 'encounter') throw new Error(`expected a fight at ${nodeId}, got ${event.kind}`);
    return endFight(owed, event.encounter, 'victory');
}

const accept = (s: GameState, n: number) => gameReducer(s, { type: 'ACCEPT_QUEST_STEP', payload: { questline: LINE, step: n } });
const turnIn = (s: GameState, n: number) => gameReducer(s, { type: 'TURN_IN_QUEST_STEP', payload: { questline: LINE, step: n } });

/** Takes the passage offered at the travel node `nodeId`. */
function travelFrom(state: GameState, nodeId: string): GameState {
    const { state: offered, event } = arrive(state, nodeId);
    if (event.kind !== 'travel') throw new Error(`expected a passage at ${nodeId}, got ${event.kind}`);
    return takeTravel(offered);
}

/** Steps 1-3 played and turned in, step 4 accepted at the keep gate (bw-k1): the road to the sea keep. */
function atTheKeepGate(): GameState {
    let s = freshGame();
    // Step 1 (given by the windmill): through the wreck and the sea cave to the camp.
    for (const id of ['bw-w2', 'bw-w3', 'bw-h1', 'bw-h2', 'bw-h3']) s = fightAt(s, id);
    s = arrive(s, 'bw-h4').state;
    s = arrive(s, 'bw-h5').state;
    s = travelFrom(s, 'bw-h6');
    s = fightAt(s, 'bw-c1');
    s = accept(turnIn(quest(s, 'bw-c2'), 1), 2);
    // Step 2: back through the cave and up the town to the lighthouse (paid on arrival, with the key).
    s = travelFrom(s, 'bw-c0');
    for (const id of ['bw-t1', 'bw-t2', 'bw-t3']) s = fightAt(s, id);
    s = arrive(s, 'bw-t5').state;
    for (const id of ['bw-t6', 'bw-l1']) s = fightAt(s, id);
    s = arrive(s, 'bw-l3').state;
    s = fightAt(s, 'bw-l4');
    s = accept(quest(s, 'bw-l5'), 3);
    // Step 3: the key to the keep gate, past the causeway elite; then step 4 taken there.
    s = arrive(s, 'bw-w4').state;
    s = fightAt(s, 'bw-w5');
    return accept(turnIn(quest(s, KEEP_GATE), 3), 4);
}

/** The boss engaged at bw-k2: the arrival rolled, the fight staged. */
function engageBoss(state: GameState): { staged: GameState; encounter: Encounter } {
    const { state: owed, event } = arrive(state, BOSS_NODE);
    if (event.kind !== 'encounter') throw new Error(`expected the boss fight at ${BOSS_NODE}, got ${event.kind}`);
    expect(event.isBoss).toBe(true);
    return { staged: owed, encounter: event.encounter };
}

/** The app's lost fight: `endCombat('defeat')`, then `playerDied('fight')`. */
function loseTheBoss(state: GameState): GameState {
    const { staged, encounter } = engageBoss(state);
    const lost = endFight(staged, encounter, 'defeat');
    return gameReducer({ ...lost, player: { ...lost.player, health: 0 } }, { type: 'PLAYER_DIED', payload: { cause: 'fight' } });
}

describe('A23: the chapter boss fought again after the death rule', () => {
    it('a first loss puts the player back on the keep gate with bw-k2 open, step 4 active and the bridge shut', () => {
        const road = atTheKeepGate();
        expect(step4(road)).toBe('active');
        expect(bossKills(road)).toBe(0);
        const walkedFrom = map(arrive(road, BOSS_NODE).state).arrivedFrom;
        expect(walkedFrom).toBe(KEEP_GATE);

        const revived = loseTheBoss(road);

        expect(revived.dying).toBe(true);
        expect(revived.player.health).toBe(1);
        expect(revived.currentEncounter).toBeUndefined();
        expect(map(revived).currentNode).toBe(walkedFrom);
        expect(map(revived).currentNode).not.toBe(BOSS_NODE);
        expect(map(revived).pendingArrival ?? null).toBeNull();

        // bw-k2 is unspent and open again; the bridge is not.
        expect(isNodeSpent(map(revived), BOSS_NODE)).toBe(false);
        expect(legal(revived)).toContain(BOSS_NODE);
        expect(roadReachable(map(revived))).not.toContain(BRIDGE);

        // Step 4 was not counted, paid, dropped or re-offered: still the one active step.
        expect(step4(revived)).toBe('active');
        expect(bossKills(revived)).toBe(0);
        expect(revived.quests).toEqual(road.quests);
        expect(hasRelic(revived)).toBe(false);
    });

    it('the same run fights the boss again, wins, turns it in at the bridge, gets the relic and opens the bridge', () => {
        const revived = loseTheBoss(atTheKeepGate());

        // The retry re-owes the arrival and offers the boss afresh.
        const { staged, encounter } = engageBoss(revived);
        const won = endFight(staged, encounter, 'victory');

        expect(map(won).currentNode).toBe(BOSS_NODE);
        expect(isNodeSpent(map(won), BOSS_NODE)).toBe(true);
        expect(bossKills(won)).toBe(1);
        expect(step4(won)).toBe('ready');
        expect(roadReachable(map(won))).not.toContain(BRIDGE);

        const paid = turnIn(quest(won, BRIDGE_NODE), 4);
        expect(step4(paid)).toBe('completed');
        expect(hasRelic(paid)).toBe(true);
        expect(legal(paid)).toContain(BRIDGE);
        // Winning is not resting: the run is still dying.
        expect(paid.dying).toBe(true);
    });

    it('a second loss while dying ends the run, quest and all', () => {
        const road = atTheKeepGate();
        const revived = loseTheBoss(road);
        const over = loseTheBoss(revived);

        expect(over.dying).toBeUndefined();
        expect(over.runId).not.toBe(road.runId);
        expect(over.player.health).toBe(over.player.maxHealth);
        expect(map(over).currentNode).toBe('bw-w1');
        expect(over.quests.active).toEqual([]);
        expect(isNodeSpent(map(over), BOSS_NODE)).toBe(false);
    });

    it('a fled boss fight leaves the same open, unspent node and the player is not dying', () => {
        const road = atTheKeepGate();
        const { staged, encounter } = engageBoss(road);
        const fled = endFight(staged, encounter, 'flee');

        expect(fled.dying).toBeUndefined();
        expect(map(fled).currentNode).toBe(BOSS_NODE);
        expect(isNodeSpent(map(fled), BOSS_NODE)).toBe(false);
        expect(step4(fled)).toBe('active');
        expect(bossKills(fled)).toBe(0);
        expect(roadReachable(map(fled))).not.toContain(BRIDGE);

        // A loss on the retry is a first death: back on the keep gate, dying.
        const revived = loseTheBoss(fled);
        expect(revived.dying).toBe(true);
        expect(map(revived).currentNode).toBe(KEEP_GATE);
        expect(legal(revived)).toContain(BOSS_NODE);
    });
});
