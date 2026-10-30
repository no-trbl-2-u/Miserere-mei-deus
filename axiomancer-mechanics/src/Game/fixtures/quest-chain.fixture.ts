/**
 * Test-only: the quest-chain fixture map, shaped like T's Chapter 1 chain,
 * and its two questlines (the main chain and a one-step side quest).
 *
 *   start ── cave ── elite1 ── qA ══ e2 ── boss ══ pier ── harbour
 *     │      (held hazard)       (gate)          (gate)
 *     └── side1 ── w1 ── side2
 *         (side quest given at side1, turned in at side2)
 *
 * `══` are quest gates (`gatesPast`), seeded shut with the quest named: the
 * road past qA opens when the main chain's step 1 (an elite) is turned in
 * there, the road past the boss when step 2 (the boss) falls. The sea cave
 * is a hazard the map holds (`holdRoadsUntilSettled`): its far road opens
 * only once it is crossed. Copy is placeholder (`[content]`).
 *
 * Registered only by the tests that call `registerQuestChainFixture` (vitest
 * isolates each file); the shipped registry never holds it.
 */

import type { MapDefinition, MapNode, Quest, QuestObjective, Reward } from '../../World/types';
import type { MapName } from '../../World/map.library';
import type { MapEventPayload } from '../../World/MapEvents/types';
import { registerQuestline, type Questline } from '../../World/questline';
import { MAP_REGISTRY } from '../../World/map.registry';
import { registerMapEventPool, setNodeEventPoolOverride } from '../../World/MapEvents/resolve-map-event';

export const QUEST_CHAIN_CONTINENT = 'coastal-continent' as const;
export const QUEST_CHAIN_MAP = 'mq1-quest-chain' as MapName;
export const MAIN_LINE = 'mq1-main';
export const SIDE_LINE = 'mq1-side';

export const MAIN_STEP_1 = 'mq1-main-1';
export const MAIN_STEP_2 = 'mq1-main-2';
export const SIDE_STEP_1 = 'mq1-side-1';

/** A gate's reason: the quest that holds it, named. */
export function gateReason(questName: string): string {
    return `[content] Shut until the quest "${questName}" is done.`;
}

const NODES: MapNode[] = [
    { id: 'start',   location: [0, 0],  connectedNodes: ['cave', 'side1'] },
    { id: 'cave',    location: [1, 0],  connectedNodes: ['elite1'] },
    { id: 'elite1',  location: [2, 0],  connectedNodes: ['qA'] },
    { id: 'qA',      location: [3, 0],  connectedNodes: ['e2'] },
    { id: 'e2',      location: [4, 0],  connectedNodes: ['boss'] },
    { id: 'boss',    location: [5, 0],  connectedNodes: ['pier'] },
    { id: 'pier',    location: [6, 0],  connectedNodes: ['harbour'] },
    { id: 'harbour', location: [7, 0],  connectedNodes: [] },
    { id: 'side1',   location: [1, 1],  connectedNodes: ['w1'] },
    { id: 'w1',      location: [2, 1],  connectedNodes: ['side2'] },
    { id: 'side2',   location: [3, 1],  connectedNodes: [] },
];

export const QUEST_CHAIN_GATES = {
    pastQA:   { from: 'qA', to: 'e2' },
    pastBoss: { from: 'boss', to: 'pier' },
} as const;

/** The fixture map's definition: the gates seeded shut, the cave and side1 held. */
export const QUEST_CHAIN_DEF: MapDefinition = {
    name: QUEST_CHAIN_MAP,
    continent: QUEST_CHAIN_CONTINENT,
    description: '[content] The quest-chain fixture map.',
    startingNode: NODES[0]!,
    nodes: NODES,
    initialBlockedRoutes: [
        { ...QUEST_CHAIN_GATES.pastQA, reason: gateReason(MAIN_STEP_1) },
        { ...QUEST_CHAIN_GATES.pastBoss, reason: gateReason(MAIN_STEP_2) },
    ],
    holdRoadsUntilSettled: ['cave', 'side1'],
};

/** Each node's one event; `start`, `pier` and `harbour` have none. */
export const QUEST_CHAIN_POOLS: Readonly<Record<string, MapEventPayload>> = {
    cave:   { kind: 'hazard', damage: 1, description: '[content] The sea cave.' },
    elite1: { kind: 'encounter', enemySlug: 'green-jelly', level: 1, difficulty: 'elite' },
    qA:     { kind: 'quest', questline: MAIN_LINE, node: 2 },
    e2:     { kind: 'encounter', enemySlug: 'float-eye', level: 1 },
    boss:   { kind: 'encounter', enemySlug: 'death-beholder', isBoss: true, level: 1 },
    side1:  { kind: 'quest', questline: SIDE_LINE, node: 1 },
    w1:     { kind: 'encounter', enemySlug: 'float-eye', level: 1 },
    side2:  { kind: 'quest', questline: SIDE_LINE, node: 2 },
};

const xp = (amount: number): Reward => ({ kind: 'experience', amount });
const coin = (amount: number): Reward => ({ kind: 'currency', amount });

function kill(foeClass: QuestObjective['foeClass']): QuestObjective {
    return { id: 'goal', type: 'kill', description: `[content] Beat ${foeClass} foe.`, requiredCount: 1, currentCount: 0, foeClass };
}

function quest(name: string, objectives: QuestObjective[]): Quest {
    return {
        name, description: `[content] ${name}.`, mapName: QUEST_CHAIN_MAP,
        objectives, reward: 'quest', status: 'available',
    } as Quest;
}

/**
 * The main chain, reduced to its turn-in and boss shapes: step 1 is taken at
 * the start, met on the elite and turned in at qA (opening the gate past
 * it); step 2 is offered at qA and paid on the boss victory (opening the
 * gate past the boss).
 */
export const MAIN_QUESTLINE: Questline = {
    id: MAIN_LINE,
    name: '[content] The main chain',
    mapName: QUEST_CHAIN_MAP,
    steps: [
        {
            step: 1, nodeId: 'start', quest: quest(MAIN_STEP_1, [kill('elite')]),
            rewards: [xp(40), coin(10)], settle: 'turn-in', gatesPast: [QUEST_CHAIN_GATES.pastQA],
        },
        {
            step: 2, nodeId: 'qA', quest: quest(MAIN_STEP_2, [kill('boss')]),
            rewards: [xp(60), coin(15)], settle: 'on-victory', gatesPast: [QUEST_CHAIN_GATES.pastBoss],
        },
    ],
};

/** The side quest: one step, given at side1, one kill of any foe, turned in at side2. */
export const SIDE_QUESTLINE: Questline = {
    id: SIDE_LINE,
    name: '[content] A side errand',
    mapName: QUEST_CHAIN_MAP,
    steps: [
        {
            step: 1, nodeId: 'side1', quest: quest(SIDE_STEP_1, [kill('any')]),
            rewards: [xp(25), coin(5)], settle: 'turn-in', turnInAt: 'side2',
        },
    ],
};

/** Registers the fixture map, its pools and both questlines (tests only). */
export function registerQuestChainFixture(): void {
    MAP_REGISTRY[QUEST_CHAIN_CONTINENT][QUEST_CHAIN_MAP] = QUEST_CHAIN_DEF;
    for (const [nodeId, payload] of Object.entries(QUEST_CHAIN_POOLS)) {
        const id = `${QUEST_CHAIN_MAP}.${nodeId}`;
        registerMapEventPool({ id, entries: [{ kind: payload.kind, weight: 1, payload }] });
        setNodeEventPoolOverride(QUEST_CHAIN_CONTINENT, QUEST_CHAIN_MAP, nodeId, id);
    }
    registerQuestline(MAIN_QUESTLINE);
    registerQuestline(SIDE_QUESTLINE);
}
