/**
 * Test-only: the long quest-chain fixture, T's Chapter 1 chain shape end to
 * end (phase MQ1b), with the side quest of `quest-chain.fixture.ts` running
 * beside it.
 *
 *   start ── cave ── elite1 ── qA ══ light ── castle ══ boss ══ last ── travel
 *     │     (held hazard)      (2)   (3)        (4)              (5)
 *     └── side1 ── w1 ── side2
 *
 * `══` are quest gates (`gatesPast`), seeded shut with the quest named. The
 * chain, four steps:
 *
 *   1  given at the start by a dialogue effect (`giveQuestStep`), beat an
 *      elite, turned in at qA; completing it opens the road past qA
 *   2  taken at qA, paid on ARRIVAL at the lighthouse (`settle: 'on-arrival'`),
 *      paying the castle key
 *   3  taken at the lighthouse, `carry` the key, turned in at the castle (the
 *      key is used up); completing it opens the road past the castle
 *   4  taken at the castle, paid on the boss victory, which opens the road
 *      past the boss to the last quest node and the travel node
 *
 * It is a second map beside the MQ1a one so that map's suites keep their
 * shape; the side quest is the same one-step questline on this map. Copy is
 * placeholder (`[content]`). Registered only by the tests that call
 * `registerLongChainFixture` (vitest isolates each file); the shipped registry
 * never holds it.
 */

import type { MapDefinition, MapNode, Quest, QuestObjective, Reward } from '../../World/types';
import type { MapName } from '../../World/map.library';
import type { MapEventPayload } from '../../World/MapEvents/types';
import type { QuestItem } from '../../Items/types';
import type { DialogueTree } from '../../NPCs/types';
import { registerQuestline, type Questline } from '../../World/questline';
import { MAP_REGISTRY } from '../../World/map.registry';
import { registerMapEventPool, setNodeEventPoolOverride } from '../../World/MapEvents/resolve-map-event';

export const LONG_CHAIN_CONTINENT = 'coastal-continent' as const;
export const LONG_CHAIN_MAP = 'mq1-long-chain' as MapName;
export const LONG_MAIN_LINE = 'mq1-long-main';
export const LONG_SIDE_LINE = 'mq1-long-side';

export const LONG_STEP_1 = 'mq1-long-1';
export const LONG_STEP_2 = 'mq1-long-2';
export const LONG_STEP_3 = 'mq1-long-3';
export const LONG_STEP_4 = 'mq1-long-4';
export const LONG_SIDE_STEP = 'mq1-long-side-1';

/** The castle key: the arrival quest's reward, the key turn-in's `carry` target. */
export const CASTLE_KEY: QuestItem = {
    id: 'mq1-castle-key',
    name: '[content] Castle key',
    description: '[content] Opens the castle.',
    category: 'quest-item',
    questId: LONG_STEP_3,
};

/** A gate's reason: the quest that holds it, named. */
export function longGateReason(questName: string): string {
    return `[content] Shut until the quest "${questName}" is done.`;
}

const NODES: MapNode[] = [
    { id: 'start',  location: [0, 0], connectedNodes: ['cave', 'side1'] },
    { id: 'cave',   location: [1, 0], connectedNodes: ['elite1'] },
    { id: 'elite1', location: [2, 0], connectedNodes: ['qA'] },
    { id: 'qA',     location: [3, 0], connectedNodes: ['light'] },
    { id: 'light',  location: [4, 0], connectedNodes: ['castle'] },
    { id: 'castle', location: [5, 0], connectedNodes: ['boss'] },
    { id: 'boss',   location: [6, 0], connectedNodes: ['last'] },
    { id: 'last',   location: [7, 0], connectedNodes: ['travel'] },
    { id: 'travel', location: [8, 0], connectedNodes: [] },
    { id: 'side1',  location: [1, 1], connectedNodes: ['w1'] },
    { id: 'w1',     location: [2, 1], connectedNodes: ['side2'] },
    { id: 'side2',  location: [3, 1], connectedNodes: [] },
];

export const LONG_CHAIN_GATES = {
    pastQA:     { from: 'qA', to: 'light' },
    pastCastle: { from: 'castle', to: 'boss' },
    pastBoss:   { from: 'boss', to: 'last' },
} as const;

/** The map's definition: the gates seeded shut, the cave, side1 and the quest nodes held. */
export const LONG_CHAIN_DEF: MapDefinition = {
    name: LONG_CHAIN_MAP,
    continent: LONG_CHAIN_CONTINENT,
    description: '[content] The long quest-chain fixture map.',
    startingNode: NODES[0]!,
    nodes: NODES,
    initialBlockedRoutes: [
        { ...LONG_CHAIN_GATES.pastQA, reason: longGateReason(LONG_STEP_1) },
        { ...LONG_CHAIN_GATES.pastCastle, reason: longGateReason(LONG_STEP_3) },
        { ...LONG_CHAIN_GATES.pastBoss, reason: longGateReason(LONG_STEP_4) },
    ],
    holdRoadsUntilSettled: ['cave', 'side1', 'qA', 'light', 'castle'],
};

/** Each node's one event; `start` and `travel` have none. */
export const LONG_CHAIN_POOLS: Readonly<Record<string, MapEventPayload>> = {
    cave:   { kind: 'hazard', damage: 1, description: '[content] The sea cave.' },
    elite1: { kind: 'encounter', enemySlug: 'green-jelly', level: 1 },
    qA:     { kind: 'quest', questline: LONG_MAIN_LINE, node: 2 },
    light:  { kind: 'quest', questline: LONG_MAIN_LINE, node: 3 },
    castle: { kind: 'quest', questline: LONG_MAIN_LINE, node: 4 },
    boss:   { kind: 'encounter', enemySlug: 'death-beholder', isBoss: true, level: 1 },
    last:   { kind: 'quest', questline: LONG_MAIN_LINE, node: 5 },
    side1:  { kind: 'quest', questline: LONG_SIDE_LINE, node: 1 },
    w1:     { kind: 'encounter', enemySlug: 'float-eye', level: 1 },
    side2:  { kind: 'quest', questline: LONG_SIDE_LINE, node: 2 },
};

const xp = (amount: number): Reward => ({ kind: 'experience', amount });
const coin = (amount: number): Reward => ({ kind: 'currency', amount });

function objective(o: Partial<QuestObjective> & Pick<QuestObjective, 'type'>): QuestObjective {
    return { id: 'goal', description: `[content] ${o.type}.`, requiredCount: 1, currentCount: 0, ...o };
}

function quest(name: string, objectives: QuestObjective[]): Quest {
    return {
        name, description: `[content] ${name}.`, mapName: LONG_CHAIN_MAP,
        objectives, reward: 'quest', status: 'available',
    } as Quest;
}

/** The main chain: the four steps of the file header. */
export const LONG_MAIN_QUESTLINE: Questline = {
    id: LONG_MAIN_LINE,
    name: '[content] The long chain',
    mapName: LONG_CHAIN_MAP,
    steps: [
        {
            step: 1, nodeId: 'start', quest: quest(LONG_STEP_1, [objective({ type: 'kill', foeClass: 'elite' })]),
            rewards: [xp(40), coin(10)], settle: 'turn-in', gatesPast: [LONG_CHAIN_GATES.pastQA],
        },
        {
            step: 2, nodeId: 'qA', quest: quest(LONG_STEP_2, [objective({ type: 'reach', target: 'light' })]),
            rewards: [xp(30), CASTLE_KEY], settle: 'on-arrival',
        },
        {
            step: 3, nodeId: 'light', quest: quest(LONG_STEP_3, [objective({ type: 'carry', target: CASTLE_KEY.id })]),
            rewards: [xp(50)], settle: 'turn-in', gatesPast: [LONG_CHAIN_GATES.pastCastle],
        },
        {
            step: 4, nodeId: 'castle', quest: quest(LONG_STEP_4, [objective({ type: 'kill', foeClass: 'boss' })]),
            rewards: [xp(80), coin(20)], settle: 'on-victory', gatesPast: [LONG_CHAIN_GATES.pastBoss],
        },
    ],
};

/** The side quest: one step, given at side1, one kill of any foe, turned in at side2. */
export const LONG_SIDE_QUESTLINE: Questline = {
    id: LONG_SIDE_LINE,
    name: '[content] A side errand',
    mapName: LONG_CHAIN_MAP,
    steps: [
        {
            step: 1, nodeId: 'side1', quest: quest(LONG_SIDE_STEP, [objective({ type: 'kill', foeClass: 'any' })]),
            rewards: [xp(25), coin(5)], settle: 'turn-in', turnInAt: 'side2',
        },
    ],
};

/** What the start node says: its one choice gives the chain's first step. */
export const LONG_START_DIALOGUE: DialogueTree = {
    id: 'mq1-long-start', rootId: 'root',
    nodes: {
        root: {
            id: 'root', text: '[content] A voice on the shore.',
            choices: [{ text: '[content] Listen.', effect: { giveQuestStep: { questline: LONG_MAIN_LINE, step: 1 } } }],
        },
    },
};

/** Registers the fixture map, its pools and both questlines (tests only). */
export function registerLongChainFixture(): void {
    MAP_REGISTRY[LONG_CHAIN_CONTINENT][LONG_CHAIN_MAP] = LONG_CHAIN_DEF;
    for (const [nodeId, payload] of Object.entries(LONG_CHAIN_POOLS)) {
        const id = `${LONG_CHAIN_MAP}.${nodeId}`;
        registerMapEventPool({ id, entries: [{ kind: payload.kind, weight: 1, payload }] });
        setNodeEventPoolOverride(LONG_CHAIN_CONTINENT, LONG_CHAIN_MAP, nodeId, id);
    }
    registerQuestline(LONG_MAIN_QUESTLINE);
    registerQuestline(LONG_SIDE_QUESTLINE);
}
