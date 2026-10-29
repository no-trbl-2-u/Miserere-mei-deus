/**
 * The quest chain end to end (phase MQ1b, A8 of the MQ1 brief).
 *
 * Walks the long fixture map from the start to the travel node through the
 * engine's public verbs: the first step given by the start node's dialogue,
 * the sea cave (a held hazard), an elite, a quest node that turns in and hands
 * on, an arrival quest that pays a key, a quest node that takes the key, the
 * boss and the quest node past it. At each gate the far side is unreachable
 * before and reachable after, and a one-step side quest is accepted early and
 * turned in mid-walk.
 */

import { describe, it, expect, beforeAll } from 'vitest';

import { moveToNode, legalMovesFrom, IllegalMoveError } from '../../World/world.reducer';
import { createMapState } from '../../World/map.registry';
import { resolveMapEvent } from '../../World/MapEvents/resolve-map-event';
import { acceptQuestStep } from '../../World/questline';
import { applyDialogueChoice } from '../../World/dialogue.runtime';
import { carriedCount } from '../../World/quest.engine';
import { questGateProblems } from '../../World/quest-gates';
import { createNewGameState, gameReducer } from '../game.reducer';
import type { GameState } from '../types';
import {
    registerLongChainFixture, LONG_CHAIN_DEF, LONG_MAIN_LINE, LONG_SIDE_LINE, LONG_START_DIALOGUE,
    LONG_STEP_1, LONG_STEP_2, LONG_STEP_3, LONG_STEP_4, LONG_SIDE_STEP, CASTLE_KEY, longGateReason,
    LONG_MAIN_QUESTLINE, LONG_SIDE_QUESTLINE,
} from '../fixtures/quest-chain-long.fixture';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

beforeAll(registerLongChainFixture);

const legal = (s: GameState) => legalMovesFrom(s.world.currentMap);

function arrive(state: GameState, nodeId: string) {
    return resolveMapEvent({ ...state, world: moveToNode(state.world, nodeId) }, seededRng(7));
}

function fightAt(state: GameState, nodeId: string): GameState {
    const { state: owed, event } = arrive(state, nodeId);
    if (event.kind !== 'encounter') throw new Error(`expected a fight at ${nodeId}, got ${event.kind}`);
    const fighting = gameReducer(owed, { type: 'START_COMBAT', payload: { target: event.encounter } });
    return gameReducer(fighting, { type: 'END_COMBAT', payload: { outcome: 'victory', grantedLoot: [], grantedXp: 0 } });
}

/** Asserts moving to `nodeId` is refused with the quest-naming reason. */
function expectGated(s: GameState, nodeId: string, questName: string): void {
    expect(legal(s)).not.toContain(nodeId);
    expect(() => moveToNode(s.world, nodeId)).toThrow(IllegalMoveError);
    expect(() => moveToNode(s.world, nodeId)).toThrow(longGateReason(questName));
}

describe('A8: the chain from start to travel', () => {
    it('no gate of the map can be walked around', () => {
        expect(questGateProblems(LONG_CHAIN_DEF, [LONG_MAIN_QUESTLINE, LONG_SIDE_QUESTLINE])).toEqual([]);
    });

    it('walks every step, gate and handoff with a side quest done mid-walk', () => {
        const base = createNewGameState({ startMap: 'breakwater' });
        let s: GameState = { ...base, world: { ...base.world, currentMap: createMapState(LONG_CHAIN_DEF) } };
        s = resolveMapEvent(s, seededRng(1)).state;
        const xp0 = s.player.experience;
        expect(legal(s)).toEqual(expect.arrayContaining(['cave', 'side1']));

        // The start node gives step 1; the side quest is accepted early.
        const choice = LONG_START_DIALOGUE.nodes.root!.choices![0]!;
        s = applyDialogueChoice(s, LONG_START_DIALOGUE, choice).gameState;
        expect(s.quests.active.map(q => q.name)).toEqual([LONG_STEP_1]);
        s = arrive(s, 'side1').state;
        s = acceptQuestStep(s, LONG_SIDE_LINE, 1);
        expect(s.quests.active.map(q => q.name)).toEqual([LONG_STEP_1, LONG_SIDE_STEP]);

        // The sea cave holds the path to the elite until it is crossed.
        expect(legal(s)).not.toContain('elite1');
        s = arrive(s, 'cave').state;
        expect(legal(s)).toContain('elite1');

        // The elite fills step 1 (and the side quest, which wants any foe).
        s = fightAt(s, 'elite1');

        // qA holds the road past it until step 1 is turned in and step 2 taken.
        s = arrive(s, 'qA').state;
        expectGated(s, 'light', LONG_STEP_1);
        s = gameReducer(s, { type: 'TURN_IN_QUEST_STEP', payload: { questline: LONG_MAIN_LINE, step: 1 } });
        expect(s.quests.completed).toEqual([LONG_STEP_1]);
        s = gameReducer(s, { type: 'ACCEPT_QUEST_STEP', payload: { questline: LONG_MAIN_LINE, step: 2 } });
        expect(legal(s)).toContain('light');

        // Mid-walk: the side quest is turned in at its node.
        s = fightAt(s, 'w1');
        s = arrive(s, 'side2').state;
        s = gameReducer(s, { type: 'TURN_IN_QUEST_STEP', payload: { questline: LONG_SIDE_LINE, step: 1 } });
        expect(s.quests.completed).toEqual([LONG_STEP_1, LONG_SIDE_STEP]);
        expect(s.quests.active.map(q => q.name)).toEqual([LONG_STEP_2]);

        // Arriving at the lighthouse completes step 2 and pays the key.
        expect(carriedCount(s.player.inventory, CASTLE_KEY.id)).toBe(0);
        s = arrive(s, 'light').state;
        expect(s.quests.completed).toContain(LONG_STEP_2);
        expect(carriedCount(s.player.inventory, CASTLE_KEY.id)).toBe(1);

        // The lighthouse offers step 3, which asks for the key already in hand.
        s = gameReducer(s, { type: 'ACCEPT_QUEST_STEP', payload: { questline: LONG_MAIN_LINE, step: 3 } });
        expect(legal(s)).toContain('castle');

        // The castle takes the key, then the boss is the only way on.
        s = arrive(s, 'castle').state;
        expectGated(s, 'boss', LONG_STEP_3);
        s = gameReducer(s, { type: 'TURN_IN_QUEST_STEP', payload: { questline: LONG_MAIN_LINE, step: 3 } });
        expect(carriedCount(s.player.inventory, CASTLE_KEY.id)).toBe(0);
        s = gameReducer(s, { type: 'ACCEPT_QUEST_STEP', payload: { questline: LONG_MAIN_LINE, step: 4 } });
        expect(legal(s)).toContain('boss');

        // The boss falls: step 4 is paid and the road past it opens.
        expect(legal(s)).not.toContain('last');
        s = fightAt(s, 'boss');
        expect(s.quests.completed).toContain(LONG_STEP_4);
        expect(legal(s)).toContain('last');

        // The quest node past the boss, then the travel node.
        const last = arrive(s, 'last');
        expect(last.event.kind === 'quest' && last.event.stage).toBe('offer');
        s = last.state;
        expect(legal(s)).toContain('travel');
        s = arrive(s, 'travel').state;
        expect(s.world.currentMap.currentNode).toBe('travel');

        // Every step paid exactly once.
        expect(s.quests.active).toEqual([]);
        expect(s.quests.completed).toEqual([
            LONG_STEP_1, LONG_SIDE_STEP, LONG_STEP_2, LONG_STEP_3, LONG_STEP_4,
        ]);
        expect(s.player.experience).toBeGreaterThanOrEqual(xp0 + 40 + 25 + 30 + 50 + 80);
    });
});
