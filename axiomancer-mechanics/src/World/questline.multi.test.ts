/**
 * Several quests at once (phase MQ1a, A1 of the MQ1 brief).
 *
 * Two questlines run side by side on the quest-chain fixture map: the main
 * chain and a one-step side quest. Accepting, progressing and turning in one
 * never reads the other's state; one kill advances every active objective
 * that wants it; each completion pays once through the settle seam.
 */

import { describe, it, expect, beforeAll } from 'vitest';

import { moveToNode } from './world.reducer';
import { createMapState } from './map.registry';
import { resolveMapEvent } from './MapEvents/resolve-map-event';
import { acceptQuestStep, turnInQuestStep, questStepState, questNodeStage } from './questline';
import { createNewGameState, gameReducer } from '../Game/game.reducer';
import type { GameState } from '../Game/types';
import {
    registerQuestChainFixture, QUEST_CHAIN_DEF, MAIN_QUESTLINE, SIDE_QUESTLINE,
    MAIN_LINE, SIDE_LINE, MAIN_STEP_1, SIDE_STEP_1,
} from '../Game/fixtures/quest-chain.fixture';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

beforeAll(registerQuestChainFixture);

/** A fresh game on the fixture map, the start node resolved. */
function freshGame(): GameState {
    const base = createNewGameState({ startMap: 'breakwater' });
    const state: GameState = { ...base, world: { ...base.world, currentMap: createMapState(QUEST_CHAIN_DEF) } };
    return resolveMapEvent(state, seededRng(1)).state;
}

function arrive(state: GameState, nodeId: string) {
    return resolveMapEvent({ ...state, world: moveToNode(state.world, nodeId) }, seededRng(7));
}

function fightAt(state: GameState, nodeId: string): GameState {
    const { state: owed, event } = arrive(state, nodeId);
    if (event.kind !== 'encounter') throw new Error(`expected a fight at ${nodeId}, got ${event.kind}`);
    const fighting = gameReducer(owed, { type: 'START_COMBAT', payload: { target: event.encounter } });
    return gameReducer(fighting, { type: 'END_COMBAT', payload: { outcome: 'victory', grantedLoot: [], grantedXp: 0 } });
}

const mainStep1 = MAIN_QUESTLINE.steps[0]!;
const sideStep1 = SIDE_QUESTLINE.steps[0]!;
const active = (s: GameState, name: string) => s.quests.active.find(q => q.name === name);

/** Main step 1 taken at the start, the side quest taken at side1. */
function bothAccepted(): GameState {
    let s = acceptQuestStep(freshGame(), MAIN_LINE, 1);
    s = arrive(s, 'side1').state;
    return acceptQuestStep(s, SIDE_LINE, 1);
}

describe('A1: several quests at once', () => {
    it('both questlines are active together, each counting from 0', () => {
        const s = bothAccepted();
        expect(s.quests.active.map(q => q.name)).toEqual([MAIN_STEP_1, SIDE_STEP_1]);
        expect(active(s, MAIN_STEP_1)!.questline).toBe(MAIN_LINE);
        expect(active(s, SIDE_STEP_1)!.questline).toBe(SIDE_LINE);
        expect(active(s, SIDE_STEP_1)!.objectives[0]!.currentCount).toBe(0);
    });

    it('accepting the side quest leaves the main quest exactly as it was', () => {
        const before = arrive(acceptQuestStep(freshGame(), MAIN_LINE, 1), 'side1').state;
        const after = acceptQuestStep(before, SIDE_LINE, 1);
        expect(active(after, MAIN_STEP_1)).toBe(active(before, MAIN_STEP_1));
        expect(questStepState(after.quests, mainStep1)).toBe('active');
    });

    it('a plain kill counts only for the quest that wants it', () => {
        const s = fightAt(bothAccepted(), 'w1');
        expect(questStepState(s.quests, sideStep1)).toBe('ready');
        expect(questStepState(s.quests, mainStep1)).toBe('active');
    });

    it('one elite kill advances every active objective that wants it', () => {
        let s = bothAccepted();
        s = arrive(s, 'cave').state;
        s = fightAt(s, 'elite1');
        expect(questStepState(s.quests, mainStep1)).toBe('ready');
        expect(questStepState(s.quests, sideStep1)).toBe('ready');
    });

    it('turning in the side quest pays it once and touches nothing of the main chain', () => {
        let s = fightAt(bothAccepted(), 'w1');
        const at = arrive(s, 'side2');
        expect(at.event.kind === 'quest' && at.event.stage).toBe('turn-in');
        expect(questNodeStage(at.state.quests, SIDE_LINE, 2)).toBe('turn-in');
        // A turn-in of the side quest anywhere else, or of the main chain here, pays nothing.
        expect(turnInQuestStep(s, SIDE_LINE, 1).paid).toEqual([]);
        expect(turnInQuestStep(at.state, MAIN_LINE, 1).paid).toEqual([]);

        const xp0 = at.state.player.experience;
        const coin0 = at.state.player.currency;
        const turned = turnInQuestStep(at.state, SIDE_LINE, 1, seededRng(3));
        s = turned.state;
        expect(turned.paid.map(p => p.questName)).toEqual([SIDE_STEP_1]);
        expect(s.player.experience).toBe(xp0 + 25);
        expect(s.player.currency).toBe(coin0 + 5);
        expect(s.quests.completed).toEqual([SIDE_STEP_1]);
        expect(active(s, MAIN_STEP_1)).toBe(active(at.state, MAIN_STEP_1));
        // Paid once: a second turn-in is a no-op, and the spent turn-in node is no destination.
        expect(turnInQuestStep(s, SIDE_LINE, 1, seededRng(3)).state).toBe(s);
        expect(s.world.currentMap.consumedNodes).toContain('side2');
    });

    it('the main chain then turns in on its own, paying only its own step', () => {
        let s = bothAccepted();
        s = arrive(s, 'cave').state;
        s = fightAt(s, 'elite1');
        const at = arrive(s, 'qA');
        const turned = turnInQuestStep(at.state, MAIN_LINE, 1, seededRng(4));
        expect(turned.paid.map(p => p.questName)).toEqual([MAIN_STEP_1]);
        expect(turned.state.player.experience).toBe(at.state.player.experience + 40);
        // The side quest, filled by the same elite, is still held for its own turn-in.
        expect(questStepState(turned.state.quests, sideStep1)).toBe('ready');
        expect(turned.state.quests.completed).toEqual([MAIN_STEP_1]);
    });
});
