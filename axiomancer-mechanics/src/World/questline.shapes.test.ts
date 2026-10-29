/**
 * New step shapes (phase MQ1b, A5-A7 of the MQ1 brief): a step given from
 * anywhere, a step done on arrival, and a step that asks the player to carry
 * an item that is used up at turn-in. Walks the long quest-chain fixture.
 */

import { describe, it, expect, beforeAll } from 'vitest';

import { walkRoadTo, legalMovesFrom, isRouteBlocked } from './world.reducer';
import { createMapState } from './map.registry';
import { resolveMapEvent } from './MapEvents/resolve-map-event';
import {
    acceptQuestStep, giveQuestStep, turnInQuestStep, questStepState, questNodeStage,
} from './questline';
import { applyDialogueChoice } from './dialogue.runtime';
import { carriedCount, syncCarryObjectives } from './quest.engine';
import { createNewGameState, gameReducer } from '../Game/game.reducer';
import type { GameState } from '../Game/types';
import {
    registerLongChainFixture, LONG_CHAIN_DEF, LONG_CHAIN_GATES, LONG_MAIN_QUESTLINE, LONG_MAIN_LINE,
    LONG_START_DIALOGUE, LONG_STEP_1, LONG_STEP_2, LONG_STEP_3, CASTLE_KEY, longGateReason,
} from '../Game/fixtures/quest-chain-long.fixture';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

beforeAll(registerLongChainFixture);

function freshGame(): GameState {
    const base = createNewGameState({ startMap: 'breakwater' });
    const state: GameState = { ...base, world: { ...base.world, currentMap: createMapState(LONG_CHAIN_DEF) } };
    return resolveMapEvent(state, seededRng(1)).state;
}

function arrive(state: GameState, nodeId: string) {
    return resolveMapEvent({ ...state, world: walkRoadTo(state.world, nodeId) }, seededRng(7));
}

function fightAt(state: GameState, nodeId: string): GameState {
    const { state: owed, event } = arrive(state, nodeId);
    if (event.kind !== 'encounter') throw new Error(`expected a fight at ${nodeId}, got ${event.kind}`);
    const fighting = gameReducer(owed, { type: 'START_COMBAT', payload: { target: event.encounter } });
    return gameReducer(fighting, { type: 'END_COMBAT', payload: { outcome: 'victory', grantedLoot: [], grantedXp: 0 } });
}

const [step1, step2, step3] = LONG_MAIN_QUESTLINE.steps as [
    (typeof LONG_MAIN_QUESTLINE.steps)[number], (typeof LONG_MAIN_QUESTLINE.steps)[number], (typeof LONG_MAIN_QUESTLINE.steps)[number],
];
const active = (s: GameState, name: string) => s.quests.active.find(q => q.name === name);
const shut = (s: GameState, road: { from: string; to: string }) => isRouteBlocked(s.world.currentMap, road.from, road.to);

/** The start node's dialogue choice: gives step 1. */
function gaveStep1(s: GameState): GameState {
    const choice = LONG_START_DIALOGUE.nodes.root!.choices![0]!;
    return applyDialogueChoice(s, LONG_START_DIALOGUE, choice).gameState;
}

/** Step 1 given, the cave crossed, the elite beaten, turned in at qA, step 2 taken there. */
function step2Taken(): GameState {
    let s = gaveStep1(freshGame());
    s = arrive(s, 'cave').state;
    s = fightAt(s, 'elite1');
    s = arrive(s, 'qA').state;
    s = turnInQuestStep(s, LONG_MAIN_LINE, 1, seededRng(2)).state;
    return acceptQuestStep(s, LONG_MAIN_LINE, 2);
}

describe('A5: a step given anywhere', () => {
    it('the start node\'s dialogue effect starts step 1 without a quest node, counting from 0', () => {
        const start = freshGame();
        const choice = LONG_START_DIALOGUE.nodes.root!.choices![0]!;
        const result = applyDialogueChoice(start, LONG_START_DIALOGUE, choice);
        expect(result.effects.givenQuestStep).toEqual({ questline: LONG_MAIN_LINE, step: 1 });
        const s = result.gameState;
        expect(active(s, LONG_STEP_1)).toBeDefined();
        expect(active(s, LONG_STEP_1)!.questline).toBe(LONG_MAIN_LINE);
        expect(active(s, LONG_STEP_1)!.objectives.every(o => o.currentCount === 0)).toBe(true);
        expect(questStepState(s.quests, step1)).toBe('active');
        // No quest node was involved and none was spent.
        expect(s.world.currentMap.consumedNodes).toEqual(start.world.currentMap.consumedNodes);
    });

    it('it works standing anywhere, and giving it twice changes nothing', () => {
        const away = arrive(freshGame(), 'side1').state;
        const given = giveQuestStep(away, LONG_MAIN_LINE, 1);
        expect(questStepState(given.quests, step1)).toBe('active');
        expect(giveQuestStep(given, LONG_MAIN_LINE, 1)).toBe(given);
    });

    it('a step whose predecessor is not completed, or an unknown step, is not given', () => {
        const s = freshGame();
        expect(giveQuestStep(s, LONG_MAIN_LINE, 2)).toBe(s);
        expect(giveQuestStep(s, LONG_MAIN_LINE, 9)).toBe(s);
        expect(giveQuestStep(s, 'no-such-line', 1)).toBe(s);
    });

    it('a kill before the step is given does not count (counts from when given)', () => {
        let s = arrive(freshGame(), 'cave').state;
        s = fightAt(s, 'elite1');
        s = giveQuestStep(s, LONG_MAIN_LINE, 1);
        expect(questStepState(s.quests, step1)).toBe('active');
    });
});

describe('A6: done on arrival', () => {
    it('entering the target node completes and pays the step, and the node then offers the next', () => {
        const taken = step2Taken();
        expect(questStepState(taken.quests, step2)).toBe('active');
        expect(carriedCount(taken.player.inventory, CASTLE_KEY.id)).toBe(0);
        const xp0 = taken.player.experience;

        const at = arrive(taken, 'light');
        const s = at.state;
        expect(questStepState(s.quests, step2)).toBe('completed');
        expect(s.quests.completed).toContain(LONG_STEP_2);
        expect(s.player.experience).toBe(xp0 + 30);
        expect(carriedCount(s.player.inventory, CASTLE_KEY.id)).toBe(1);
        expect(at.event.kind === 'quest' && at.event.stage).toBe('offer');
        expect(questNodeStage(s.quests, LONG_MAIN_LINE, 3)).toBe('offer');
        expect(at.event.kind === 'quest' && at.event.ahead?.name).toBe(LONG_STEP_3);
        // Paid once: resolving the node again pays nothing more.
        const again = resolveMapEvent(s, seededRng(7)).state;
        expect(carriedCount(again.player.inventory, CASTLE_KEY.id)).toBe(1);
        expect(again.player.experience).toBe(xp0 + 30);
    });

    it('is not paid anywhere but the target node', () => {
        const s = step2Taken();
        expect(questStepState(s.quests, step2)).toBe('active');
        expect(questStepState(arrive(s, 'side1').state.quests, step2)).toBe('active');
    });
});

describe('A7: carry an item', () => {
    /** Step 2 done on arrival at the lighthouse, step 3 taken there. */
    function step3Taken(): GameState {
        return acceptQuestStep(arrive(step2Taken(), 'light').state, LONG_MAIN_LINE, 3);
    }

    it('a carry objective is met on taking the step while the key is carried', () => {
        const s = step3Taken();
        expect(active(s, LONG_STEP_3)!.objectives[0]!.type).toBe('carry');
        expect(questStepState(s.quests, step3)).toBe('ready');
    });

    it('is unmet when the item leaves and met again when it returns', () => {
        const s = step3Taken();
        const without = { ...s.player, inventory: s.player.inventory.filter(i => i.id !== CASTLE_KEY.id) };
        const lost = syncCarryObjectives(without, s.quests);
        expect(questStepState(lost, step3)).toBe('active');
        const back = syncCarryObjectives(s.player, lost);
        expect(questStepState(back, step3)).toBe('ready');
    });

    it('the turn-in at the castle pays the step, uses up the key and opens the gate past the castle', () => {
        let s = arrive(step3Taken(), 'castle').state;
        expect(shut(s, LONG_CHAIN_GATES.pastCastle)).toBe(longGateReason(LONG_STEP_3));
        const xp0 = s.player.experience;
        const turned = turnInQuestStep(s, LONG_MAIN_LINE, 3, seededRng(4));
        s = turned.state;
        expect(turned.paid.map(p => p.questName)).toEqual([LONG_STEP_3]);
        expect(s.player.experience).toBe(xp0 + 50);
        expect(carriedCount(s.player.inventory, CASTLE_KEY.id)).toBe(0);
        expect(s.quests.completed).toContain(LONG_STEP_3);
        expect(shut(s, LONG_CHAIN_GATES.pastCastle)).toBeUndefined();
        expect(legalMovesFrom(s.world.currentMap)).not.toContain('boss'); // held until step 4 is taken
        expect(legalMovesFrom(acceptQuestStep(s, LONG_MAIN_LINE, 4).world.currentMap)).toContain('boss');
    });

    it('a turn-in without the key pays nothing and opens no gate', () => {
        const at = arrive(step3Taken(), 'castle').state;
        const keyless: GameState = { ...at, player: { ...at.player, inventory: at.player.inventory.filter(i => i.id !== CASTLE_KEY.id) } };
        const turned = turnInQuestStep(keyless, LONG_MAIN_LINE, 3, seededRng(4));
        expect(turned.paid).toEqual([]);
        expect(turned.state).toBe(keyless);
        expect(turned.state.quests.completed).not.toContain(LONG_STEP_3);
        expect(shut(turned.state, LONG_CHAIN_GATES.pastCastle)).toBeDefined();
        // The dispatched verb agrees.
        const dispatched = gameReducer(keyless, { type: 'TURN_IN_QUEST_STEP', payload: { questline: LONG_MAIN_LINE, step: 3 } });
        expect(dispatched.quests.completed).not.toContain(LONG_STEP_3);
    });

    it('the key is used up once: a spare copy stays when two are carried', () => {
        const at = arrive(step3Taken(), 'castle').state;
        const two: GameState = { ...at, player: { ...at.player, inventory: [...at.player.inventory, { ...CASTLE_KEY }] } };
        const turned = turnInQuestStep(two, LONG_MAIN_LINE, 3, seededRng(4)).state;
        expect(carriedCount(turned.player.inventory, CASTLE_KEY.id)).toBe(1);
    });
});
