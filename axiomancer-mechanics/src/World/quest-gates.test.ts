/**
 * Quest gates (phase MQ1a, A2-A4 of the MQ1 brief).
 *
 *   A2  a `gatesPast` road is shut from map start, never a legal move, and
 *       opens only when its step is completed, on every completion path.
 *   A3  `questGateProblems` fails a map whose gate roaming can walk around.
 *   A4  a held hazard opens its far road only once crossed.
 *
 * Everything walks the quest-chain fixture (`Game/fixtures/quest-chain.fixture.ts`).
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';

import { moveToNode, legalMovesFrom, isRouteBlocked, placeOnNode, IllegalMoveError } from './world.reducer';
import { createMapState } from './map.registry';
import { resolveMapEvent } from './MapEvents/resolve-map-event';
import {
    registerQuestline, acceptQuestStep, turnInQuestStep, questStepState, listQuestlines,
    type Questline,
} from './questline';
import { questGateProblems, questGatesOn } from './quest-gates';
import { emptyQuestLog } from './quest.engine';
import { applyDialogueChoice } from './dialogue.runtime';
import { getMapDefinition } from './map.registry';
import { createNewGameState, gameReducer } from '../Game/game.reducer';
import type { GameState } from '../Game/types';
import type { DialogueTree } from '../NPCs/types';
import type { MapDefinition, QuestObjective } from './types';
import {
    registerQuestChainFixture, QUEST_CHAIN_DEF, QUEST_CHAIN_GATES, MAIN_QUESTLINE, SIDE_QUESTLINE,
    MAIN_LINE, MAIN_STEP_1, MAIN_STEP_2, gateReason,
} from '../Game/fixtures/quest-chain.fixture';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

beforeAll(registerQuestChainFixture);
afterEach(() => registerQuestline(MAIN_QUESTLINE));

function freshGame(): GameState {
    const base = createNewGameState({ startMap: 'breakwater' });
    const state: GameState = { ...base, world: { ...base.world, currentMap: createMapState(QUEST_CHAIN_DEF) } };
    return resolveMapEvent(state, seededRng(1)).state;
}

function arrive(state: GameState, nodeId: string) {
    return resolveMapEvent({ ...state, world: moveToNode(state.world, nodeId) }, seededRng(7));
}

function fightAt(state: GameState, nodeId: string, outcome: 'victory' | 'flee' = 'victory'): GameState {
    const { state: owed, event } = arrive(state, nodeId);
    if (event.kind !== 'encounter') throw new Error(`expected a fight at ${nodeId}, got ${event.kind}`);
    const fighting = gameReducer(owed, { type: 'START_COMBAT', payload: { target: event.encounter } });
    return gameReducer(fighting, { type: 'END_COMBAT', payload: { outcome, grantedLoot: [], grantedXp: 0 } });
}

const map = (s: GameState) => s.world.currentMap;
const { pastQA, pastBoss } = QUEST_CHAIN_GATES;
const shut = (s: GameState, road: { from: string; to: string }) => isRouteBlocked(map(s), road.from, road.to);

/** Main step 1 taken at the start, the sea cave crossed, the elite beaten. */
function readyMainStep1(): GameState {
    let s = acceptQuestStep(freshGame(), MAIN_LINE, 1);
    s = arrive(s, 'cave').state;
    return fightAt(s, 'elite1');
}

/**
 * The main chain with step 1 re-shaped to complete the moment `goal` fills
 * (no turn-in), so each completion path can be tried on the gate past qA.
 */
function mainWithStep1(goal: Partial<QuestObjective>): Questline {
    const [step1, ...rest] = MAIN_QUESTLINE.steps;
    const objective: QuestObjective = {
        id: 'goal', type: 'kill', description: '[content] goal', requiredCount: 1, currentCount: 0, ...goal,
    };
    return {
        ...MAIN_QUESTLINE,
        steps: [{ ...step1!, settle: 'on-victory', quest: { ...step1!.quest, objectives: [objective] } }, ...rest],
    };
}

// ─── A2 ───────────────────────────────────────────────────────────────────────

describe('A2: a quest gate is shut until its quest is completed', () => {
    it('on a new game both gates are seeded shut, the reason naming the quest', () => {
        const s = freshGame();
        expect(shut(s, pastQA)).toBe(gateReason(MAIN_STEP_1));
        expect(shut(s, pastBoss)).toBe(gateReason(MAIN_STEP_2));
    });

    it('standing past the elite, the road beyond qA is never a legal move, and moving there throws the reason', () => {
        const s = arrive(readyMainStep1(), 'qA').state;
        expect(legalMovesFrom(map(s))).not.toContain('e2');
        expect(() => moveToNode(s.world, 'e2')).toThrow(IllegalMoveError);
        expect(() => moveToNode(s.world, 'e2')).toThrow(MAIN_STEP_1);
    });

    it('a ready step is not enough: the gate opens on the turn-in (turnInQuestStep), not before', () => {
        const ready = arrive(readyMainStep1(), 'qA').state;
        expect(questStepState(ready.quests, MAIN_QUESTLINE.steps[0]!)).toBe('ready');
        expect(shut(ready, pastQA)).toBeDefined();
        const turned = turnInQuestStep(ready, MAIN_LINE, 1, seededRng(2)).state;
        expect(shut(turned, pastQA)).toBeUndefined();
        expect(legalMovesFrom(map(turned))).toContain('e2');
        // The other gate holds: it is the boss step's.
        expect(shut(turned, pastBoss)).toBeDefined();
    });

    it('the dispatched turn-in opens it too', () => {
        const ready = arrive(readyMainStep1(), 'qA').state;
        const turned = gameReducer(ready, { type: 'TURN_IN_QUEST_STEP', payload: { questline: MAIN_LINE, step: 1 } });
        expect(shut(turned, pastQA)).toBeUndefined();
    });

    it('a turn-in that pays nothing opens nothing', () => {
        const s = arrive(readyMainStep1(), 'qA').state;
        const offQA: GameState = { ...s, world: placeOnNode(s.world, 'elite1') };
        expect(shut(turnInQuestStep(offQA, MAIN_LINE, 1).state, pastQA)).toBeDefined();
    });

    it('END_COMBAT: the boss victory that completes step 2 opens the gate past the boss', () => {
        let s = arrive(readyMainStep1(), 'qA').state;
        s = turnInQuestStep(s, MAIN_LINE, 1, seededRng(2)).state;
        s = acceptQuestStep(s, MAIN_LINE, 2);
        s = fightAt(s, 'e2');
        expect(legalMovesFrom(map(s))).not.toContain('pier');
        const fled = fightAt(s, 'boss', 'flee');
        expect(shut(fled, pastBoss)).toBeDefined();
        s = fightAt(s, 'boss');
        expect(s.quests.completed).toContain(MAIN_STEP_2);
        expect(shut(s, pastBoss)).toBeUndefined();
        expect(legalMovesFrom(map(s))).toContain('pier');
    });

    it('END_COMBAT: a kill step that completes on the fight opens its gate in that END_COMBAT', () => {
        registerQuestline(mainWithStep1({ foeClass: 'elite' }));
        const s = readyMainStep1();
        expect(s.quests.completed).toContain(MAIN_STEP_1);
        expect(shut(s, pastQA)).toBeUndefined();
    });

    it('the hazard path: the crossing that completes the step opens the gate', () => {
        registerQuestline(mainWithStep1({ type: 'hazard' }));
        const before = acceptQuestStep(freshGame(), MAIN_LINE, 1);
        expect(shut(before, pastQA)).toBeDefined();
        const s = arrive(before, 'cave').state;
        expect(s.quests.completed).toContain(MAIN_STEP_1);
        expect(shut(s, pastQA)).toBeUndefined();
    });

    it('the reach path opens the gate', () => {
        registerQuestline(mainWithStep1({ type: 'reach', target: 'side1' }));
        const s = arrive(acceptQuestStep(freshGame(), MAIN_LINE, 1), 'side1').state;
        expect(shut(s, pastQA)).toBeUndefined();
    });

    it('the dialogue path opens the gate', () => {
        registerQuestline(mainWithStep1({ type: 'flag', target: 'x' }));
        const s0 = acceptQuestStep(freshGame(), MAIN_LINE, 1);
        const tree: DialogueTree = {
            id: 'mq1a-talk', rootId: 'root',
            nodes: { root: { id: 'root', text: '[content]', choices: [{
                text: '[content]', effect: { progressQuest: { name: MAIN_STEP_1, objectiveId: 'goal' } },
            }] } },
        };
        const s = applyDialogueChoice(s0, tree, tree.nodes.root!.choices![0]!).gameState;
        expect(shut(s, pastQA)).toBeUndefined();
    });

    it('the seam reads every questline: completing the side quest opens none of the main chain\'s gates', () => {
        const base = freshGame();
        const s: GameState = { ...base, quests: { ...emptyQuestLog(), completed: [SIDE_QUESTLINE.steps[0]!.quest.name] } };
        const settled = turnInQuestStep(s, MAIN_LINE, 1).state;
        expect(shut(settled, pastQA)).toBeDefined();
    });
});

// ─── A3 ───────────────────────────────────────────────────────────────────────

const LINES = [MAIN_QUESTLINE, SIDE_QUESTLINE];

describe('A3: no way around a gate', () => {
    it('lists the fixture\'s two gates and finds no problem', () => {
        expect(questGatesOn(QUEST_CHAIN_DEF, LINES).map(g => g.road)).toEqual([pastQA, pastBoss]);
        expect(questGateProblems(QUEST_CHAIN_DEF, LINES)).toEqual([]);
    });

    it('a copy with one bypass edge fails, naming the edge and the nodes it reaches', () => {
        const bypass: MapDefinition = {
            ...QUEST_CHAIN_DEF,
            nodes: QUEST_CHAIN_DEF.nodes.map(n => n.id === 'elite1' ? { ...n, connectedNodes: [...n.connectedNodes, 'boss'] } : n),
        };
        expect(questGateProblems(bypass, LINES)).toEqual([
            `${MAIN_LINE} step 1 gate qA-e2: e2, boss reachable around it by elite1-boss`,
        ]);
    });

    it('a bypass reached from the side lane is named by its own road', () => {
        const bypass: MapDefinition = {
            ...QUEST_CHAIN_DEF,
            nodes: QUEST_CHAIN_DEF.nodes.map(n => n.id === 'side2' ? { ...n, connectedNodes: ['harbour'] } : n),
        };
        expect(questGateProblems(bypass, LINES)).toEqual([
            `${MAIN_LINE} step 1 gate qA-e2: pier, harbour reachable around it by side2-harbour`,
            `${MAIN_LINE} step 2 gate boss-pier: pier, harbour reachable around it by side2-harbour`,
        ]);
    });

    it('a gate the map does not seed shut is a problem', () => {
        const unseeded: MapDefinition = { ...QUEST_CHAIN_DEF, initialBlockedRoutes: [] };
        expect(questGateProblems(unseeded, LINES)).toEqual([
            `${MAIN_LINE} step 1 gate qA-e2: not seeded shut in initialBlockedRoutes`,
            `${MAIN_LINE} step 2 gate boss-pier: not seeded shut in initialBlockedRoutes`,
        ]);
    });

    it('every registered questline\'s map passes (the fixture\'s, and the shipped ones vacuously)', () => {
        for (const line of listQuestlines()) {
            const continent = line.mapName === QUEST_CHAIN_DEF.name ? QUEST_CHAIN_DEF.continent : 'coastal-continent';
            const def = getMapDefinition(continent as never, line.mapName);
            expect(questGateProblems(def, listQuestlines()), line.id).toEqual([]);
        }
    });
});

// ─── A4 ───────────────────────────────────────────────────────────────────────

describe('A4: a held hazard holds its path until crossed', () => {
    it('on a new game the cave is a legal move and the elite behind it is not', () => {
        const moves = legalMovesFrom(map(freshGame()));
        expect(moves).toContain('cave');
        expect(moves).not.toContain('elite1');
    });

    it('standing in the cave before the crossing resolves, the far road stays shut', () => {
        const s = freshGame();
        const owed: GameState = { ...s, world: moveToNode(s.world, 'cave') };
        expect(map(owed).pendingArrival).toBe('cave');
        expect(legalMovesFrom(map(owed))).not.toContain('elite1');
    });

    it('a lost (lethal) crossing leaves the cave unspent and its far road shut', () => {
        const s = freshGame();
        const frail: GameState = { ...s, player: { ...s.player, health: 1 } };
        const lost = arrive(frail, 'cave').state;
        expect(map(lost).currentNode).toBe('start');
        expect(map(lost).consumedNodes).not.toContain('cave');
        expect(legalMovesFrom(map(lost))).toContain('cave');
        expect(legalMovesFrom(map(lost))).not.toContain('elite1');
    });

    it('a crossing spends the cave and puts the elite on the frontier', () => {
        const s = arrive(freshGame(), 'cave').state;
        expect(map(s).consumedNodes).toContain('cave');
        expect(legalMovesFrom(map(s))).toContain('elite1');
    });
});
