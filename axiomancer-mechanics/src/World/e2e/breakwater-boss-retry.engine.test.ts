// guard-test: the seam already agreed on the parent (DY1a revive un-spends the death node, QL1b leaves it unspent); this pins the joined run so neither rule can drift
/**
 * The watchtower fought again (phase QL1g, A23 of the QL1 brief).
 *
 * The Breakwater questline's last step is the boss at bw-17. T's death rule
 * (plot DY1: a first death returns the player to the node walked from at 1
 * VITAE, dying; a death while dying ends the run) meets the questline's retry
 * rule (a lost or fled fight leaves its node unspent, A9) at this one fight.
 * This walks the live Breakwater and its registered questline from a fresh
 * game to step 4 accepted, loses the boss once through the reducer the app
 * dispatches to, and asserts the two rules agree: the player stands before
 * bw-17, bw-17 is open and unspent, step 4 is still active and the bridge is
 * shut. The same run then wins, gets the Belt and opens the bridge. A second
 * loss while dying ends the run.
 */

import { describe, it, expect } from 'vitest';

import { legalMovesFrom, moveToNode, isNodeSpent, frontierNodes } from '../world.reducer';
import { resolveMapEvent } from '../MapEvents/resolve-map-event';
import { questStepState } from '../questline';
import { BREAKWATER_QUESTLINE, BREAKWATER_QUESTLINE_ID } from '../quest.library';
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

const LINE = BREAKWATER_QUESTLINE_ID;
const BOSS_NODE = 'bw-17';
const BRIDGE = 'bw-18';

const map = (s: GameState) => s.world.currentMap;
const legal = (s: GameState) => legalMovesFrom(map(s));
const step4 = (s: GameState) => questStepState(s.quests, BREAKWATER_QUESTLINE.steps[3]!);

function freshGame(): GameState {
    return resolveMapEvent(createNewGameState({ startMap: 'breakwater' }), seededRng(1)).state;
}

/** Walks onto `nodeId` and resolves its arrival. */
function arrive(state: GameState, nodeId: string) {
    const moved: GameState = { ...state, world: moveToNode(state.world, nodeId) };
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

/** Steps 1-3 played and turned in, step 4 accepted at bw-22: the road to the watchtower. */
function atTheWatchtowerRoad(): GameState {
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
    return accept(turnIn(quest(s, 'bw-22'), 3), 4);
}

/** The boss engaged at bw-17: the arrival rolled, the fight staged. */
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

describe('A23: the watchtower fought again after the death rule', () => {
    it('a first loss puts the player before bw-17 with it open, step 4 active and the bridge shut', () => {
        const road = atTheWatchtowerRoad();
        expect(step4(road)).toBe('active');
        const walkedFrom = map(arrive(road, BOSS_NODE).state).arrivedFrom;
        expect(walkedFrom).toBeTruthy();

        const revived = loseTheBoss(road);

        expect(revived.dying).toBe(true);
        expect(revived.player.health).toBe(1);
        expect(revived.currentEncounter).toBeUndefined();
        expect(map(revived).currentNode).toBe(walkedFrom);
        expect(map(revived).currentNode).not.toBe(BOSS_NODE);
        expect(map(revived).pendingArrival ?? null).toBeNull();

        // bw-17 is unspent and open again; the bridge is not.
        expect(isNodeSpent(map(revived), BOSS_NODE)).toBe(false);
        expect(legal(revived)).toContain(BOSS_NODE);
        expect(frontierNodes(map(revived))).toContain(BOSS_NODE);
        expect(legal(revived)).not.toContain(BRIDGE);
        expect(frontierNodes(map(revived))).not.toContain(BRIDGE);

        // Step 4 was not paid, dropped or re-offered: still the one active step.
        expect(step4(revived)).toBe('active');
        expect(revived.quests).toEqual(road.quests);
        expect(revived.player.inventory.some(i => i.id === 'relic-elementalist-belt')).toBe(false);
    });

    it('the same run fights the boss again, wins, gets the Belt and opens the bridge', () => {
        const revived = loseTheBoss(atTheWatchtowerRoad());

        // The retry re-owes the arrival and offers the boss afresh.
        const { staged, encounter } = engageBoss(revived);
        const won = endFight(staged, encounter, 'victory');

        expect(map(won).currentNode).toBe(BOSS_NODE);
        expect(isNodeSpent(map(won), BOSS_NODE)).toBe(true);
        expect(step4(won)).toBe('completed');
        expect(won.player.inventory.some(i => i.id === 'relic-elementalist-belt')).toBe(true);
        expect(legal(won)).toContain(BRIDGE);
        // Winning is not resting: the run is still dying.
        expect(won.dying).toBe(true);
    });

    it('a second loss while dying ends the run, quest and all', () => {
        const road = atTheWatchtowerRoad();
        const revived = loseTheBoss(road);
        const over = loseTheBoss(revived);

        expect(over.dying).toBeUndefined();
        expect(over.runId).not.toBe(road.runId);
        expect(over.player.health).toBe(over.player.maxHealth);
        expect(map(over).currentNode).toBe('bw-1');
        expect(over.quests.active).toEqual([]);
        expect(isNodeSpent(map(over), BOSS_NODE)).toBe(false);
    });

    it('a fled boss fight leaves the same open, unspent node and the player is not dying', () => {
        const road = atTheWatchtowerRoad();
        const { staged, encounter } = engageBoss(road);
        const fled = endFight(staged, encounter, 'flee');

        expect(fled.dying).toBeUndefined();
        expect(map(fled).currentNode).toBe(BOSS_NODE);
        expect(isNodeSpent(map(fled), BOSS_NODE)).toBe(false);
        expect(step4(fled)).toBe('active');
        expect(legal(fled)).not.toContain(BRIDGE);

        // A loss on the retry is a first death: back before bw-17, dying.
        const revived = loseTheBoss(fled);
        expect(revived.dying).toBe(true);
        expect(map(revived).currentNode).not.toBe(BOSS_NODE);
        expect(legal(revived)).toContain(BOSS_NODE);
    });
});
