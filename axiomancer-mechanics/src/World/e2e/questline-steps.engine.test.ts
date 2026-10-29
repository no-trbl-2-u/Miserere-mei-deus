/**
 * The questline step rules (phase QL1b, A5-A9 of the QL1 brief).
 *
 *   A5  a quest node is never consumed until the step it offers is accepted.
 *   A6  the next quest node is locked until the current step is met: its
 *       roads open in the same call that fills the step, on every completion
 *       path; on a save without the locks the stages still hold the order.
 *   A7  a step counts only from acceptance; declining changes nothing.
 *   A8  a ready step is turned in at the NEXT quest node and paid once; the
 *       last step pays on the boss victory, the relic included.
 *   A9  a fled or lost fight answers the arrival and leaves the node unspent;
 *       a held node (`holdRoadsUntilSettled`) opens its roads only once spent;
 *       standing on an unspent answered node, the player can retry it.
 *
 * Everything walks a fixture questline on a fixture map registered for this
 * file only (vitest isolates each file): four quest nodes, a pocket behind
 * each, the three quest-node locks and a held watchtower before the bridge.
 */

import { describe, it, expect, beforeAll } from 'vitest';

import {
    moveToNode, legalMovesFrom, isRouteBlocked, placeOnNode, IllegalMoveError,
} from '../world.reducer';
import { MAP_REGISTRY, createMapState } from '../map.registry';
import {
    resolveMapEvent, registerMapEventPool, setNodeEventPoolOverride,
} from '../MapEvents/resolve-map-event';
import {
    registerQuestline, acceptQuestStep, turnInQuestStep, questNodeStage, questStepState,
    type Questline, type QuestlineStep,
} from '../questline';
import { killObjectives, hazardObjectives, startQuest, emptyQuestLog } from '../quest.engine';
import { applyDialogueChoice } from '../dialogue.runtime';
import { createNewGameState, gameReducer } from '../../Game/game.reducer';
import type { GameState } from '../../Game/types';
import { ENEMY_REGISTRY } from '../../Enemy/enemy.library';
import { getRelicById } from '../../Items/relic.library';
import { getConsumableById } from '../../Items/consumable.library';
import type { Encounter, MapDefinition, MapNode, Quest, QuestObjective, Reward } from '../types';
import type { Enemy } from '../../Enemy/types';
import type { MapName } from '../map.library';
import type { MapEventPayload } from '../MapEvents/types';
import type { DialogueTree } from '../../NPCs/types';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

// ─── The fixture map ──────────────────────────────────────────────────────────
//
//   s0 ── q1 ── h1                 (pocket 1: a hazard)
//    │
//    r ══ q2 ── f1 ── past         (pocket 2: two fights; past lies beyond f1)
//    │       └─ f2
//    ╞═══ q3 ── e1                 (pocket 3: the elite)
//    ╘═══ q4 ── boss ── bridge     (the watchtower, the bridge behind it)
//
// `══` are the quest-node locks (blocked at map creation). The four quest
// nodes and the boss hold their roads until spent.

const CONTINENT = 'coastal-continent' as const;
const LOCKED_MAP = 'ql1b-fixture' as MapName;
const OPEN_MAP = 'ql1b-open' as MapName;
const LINE = 'ql1b-line';

const NODES: MapNode[] = [
    { id: 's0',     location: [0, 0], connectedNodes: ['q1', 'r'] },
    { id: 'q1',     location: [1, 1], connectedNodes: ['h1'] },
    { id: 'h1',     location: [2, 1], connectedNodes: [] },
    { id: 'r',      location: [1, 0], connectedNodes: ['q2', 'q3', 'q4'] },
    { id: 'q2',     location: [2, 0], connectedNodes: ['f1', 'f2'] },
    { id: 'f1',     location: [3, 0], connectedNodes: ['past'] },
    { id: 'past',   location: [4, 0], connectedNodes: [] },
    { id: 'f2',     location: [3, 1], connectedNodes: [] },
    { id: 'q3',     location: [2, -1], connectedNodes: ['e1'] },
    { id: 'e1',     location: [3, -1], connectedNodes: [] },
    { id: 'q4',     location: [2, -2], connectedNodes: ['boss'] },
    { id: 'boss',   location: [3, -2], connectedNodes: ['bridge'] },
    { id: 'bridge', location: [4, -2], connectedNodes: [] },
];

const LOCKS = [
    { from: 'r', to: 'q2', reason: 'Step 1 is not done.' },
    { from: 'r', to: 'q3', reason: 'Step 2 is not done.' },
    { from: 'r', to: 'q4', reason: 'Step 3 is not done.' },
];

function fixtureMap(name: MapName, extra: Partial<MapDefinition>): MapDefinition {
    return {
        name, continent: CONTINENT, description: 'QL1b fixture map.',
        startingNode: NODES[0]!, nodes: NODES, ...extra,
    };
}

const LOCKED_DEF = fixtureMap(LOCKED_MAP, {
    initialBlockedRoutes: LOCKS,
    holdRoadsUntilSettled: ['q1', 'q2', 'q3', 'q4', 'boss'],
});
/** The same graph with no locks and no held nodes: a pre-QL1 save's view. */
const OPEN_DEF = fixtureMap(OPEN_MAP, {});

const POOLS: Record<string, MapEventPayload> = {
    q1: { kind: 'quest', questline: LINE, node: 1 },
    q2: { kind: 'quest', questline: LINE, node: 2 },
    q3: { kind: 'quest', questline: LINE, node: 3 },
    q4: { kind: 'quest', questline: LINE, node: 4 },
    h1: { kind: 'hazard', damage: 1 },
    f1: { kind: 'encounter', enemySlug: 'float-eye', level: 1 },
    f2: { kind: 'encounter', enemySlug: 'float-eye', level: 1 },
    past: { kind: 'encounter', enemySlug: 'float-eye', level: 1 },
    e1: { kind: 'encounter', enemySlug: 'green-jelly', level: 1 },
    boss: { kind: 'encounter', enemySlug: 'death-beholder', isBoss: true, level: 1 },
};

// ─── The fixture questline ────────────────────────────────────────────────────

const XP: Reward = { kind: 'experience', amount: 40 };
const BELT = getRelicById('relic-elementalist-belt')!;
const POTION = getConsumableById('minor-healing-potion')!;

function objective(o: Partial<QuestObjective>): QuestObjective {
    return { id: 'goal', type: 'kill', description: 'fixture', requiredCount: 1, currentCount: 0, ...o };
}

function stepQuestOf(step: number, objectives: QuestObjective[]): Quest {
    return {
        name: `ql1b-step-${step}`, description: `Step ${step} of 4.`, mapName: 'breakwater',
        objectives, reward: 'quest', status: 'available',
    };
}

function step(n: number, nodeId: string, objectives: QuestObjective[], rewards: Reward[], extra: Partial<QuestlineStep> = {}): QuestlineStep {
    return { step: n, nodeId, quest: stepQuestOf(n, objectives), rewards, settle: 'turn-in', ...extra };
}

/** The questline, with step 1's objective swappable (one per completion path). */
function questline(mapName: MapName, step1Goal: QuestObjective = objective({ type: 'hazard' })): Questline {
    return {
        id: LINE,
        mapName,
        steps: [
            step(1, 'q1', [step1Goal], [XP, { kind: 'currency', amount: 10 }], { opensOnReady: [{ from: 'r', to: 'q2' }] }),
            step(2, 'q2', [objective({ foeClass: 'any', requiredCount: 2 })], [XP, { kind: 'card-pick', count: 3 }], { opensOnReady: [{ from: 'r', to: 'q3' }] }),
            step(3, 'q3', [objective({ foeClass: 'elite' })], [XP, { kind: 'item', item: POTION }], { opensOnReady: [{ from: 'r', to: 'q4' }] }),
            step(4, 'q4', [objective({ foeClass: 'boss' })], [XP, { kind: 'currency', amount: 15 }, { kind: 'item', item: BELT }], { settle: 'on-victory' }),
        ],
    };
}

beforeAll(() => {
    MAP_REGISTRY[CONTINENT][LOCKED_MAP] = LOCKED_DEF;
    MAP_REGISTRY[CONTINENT][OPEN_MAP] = OPEN_DEF;
    for (const mapName of [LOCKED_MAP, OPEN_MAP]) {
        for (const [nodeId, payload] of Object.entries(POOLS)) {
            const id = `${mapName}.${nodeId}`;
            registerMapEventPool({ id, entries: [{ kind: payload.kind, weight: 1, payload }] });
            setNodeEventPoolOverride(CONTINENT, mapName, nodeId, id);
        }
    }
    registerQuestline(questline(LOCKED_MAP));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** A fresh game on the fixture map, the start node resolved (spent). */
function freshGame(def: MapDefinition = LOCKED_DEF): GameState {
    const base = createNewGameState({ startMap: 'breakwater' });
    const state: GameState = { ...base, world: { ...base.world, currentMap: createMapState(def) } };
    return resolveMapEvent(state, seededRng(1)).state;
}

/** Walks onto `nodeId` (the arrival verb) and resolves its arrival. */
function arrive(state: GameState, nodeId: string, rng = seededRng(7)) {
    const moved: GameState = { ...state, world: moveToNode(state.world, nodeId) };
    return resolveMapEvent(moved, rng);
}

/** Arrives at a fight node and plays the fight to `outcome` through the reducer. */
function fightAt(state: GameState, nodeId: string, outcome: 'victory' | 'friendship' | 'flee' | 'defeat'): GameState {
    const { state: owed, event } = arrive(state, nodeId);
    if (event.kind !== 'encounter') throw new Error(`expected a fight at ${nodeId}, got ${event.kind}`);
    return endFight(owed, event.encounter, outcome);
}

function endFight(state: GameState, target: Enemy | Encounter, outcome: 'victory' | 'friendship' | 'flee' | 'defeat'): GameState {
    const fighting = gameReducer(state, { type: 'START_COMBAT', payload: { target } });
    return gameReducer(fighting, { type: 'END_COMBAT', payload: { outcome, grantedLoot: [], grantedXp: 0 } });
}

function stageAt(state: GameState, nodeId: string) {
    const { state: after, event } = arrive(state, nodeId);
    if (event.kind !== 'quest') throw new Error(`expected a quest node at ${nodeId}, got ${event.kind}`);
    return { state: after, event };
}

const map = (s: GameState) => s.world.currentMap;
const accept = (s: GameState, n: number) => gameReducer(s, { type: 'ACCEPT_QUEST_STEP', payload: { questline: LINE, step: n } });

/** Accepts step 1 at q1 and spends the open-fan node r. */
function acceptedStep1(): GameState {
    let s = freshGame();
    s = arrive(s, 'r').state;
    s = stageAt(s, 'q1').state;
    return accept(s, 1);
}

/** Steps 1 accepted and met (the hazard crossed). */
function readyStep1(): GameState {
    return arrive(acceptedStep1(), 'h1').state;
}

// ─── A5 ───────────────────────────────────────────────────────────────────────

describe('A5: a quest node is spent only once its step is accepted', () => {
    it('resolving q1 offers step 1 and consumes nothing; the player can step off and come back', () => {
        let s = freshGame();
        const offered = stageAt(s, 'q1');
        expect(offered.event.stage).toBe('offer');
        expect(offered.event.ahead?.name).toBe('ql1b-step-1');
        expect(offered.event.ahead?.objectives[0]?.currentCount).toBe(0);
        expect(offered.event.ahead?.rewards).toEqual([{ kind: 'currency', amount: 10 }]);
        expect(offered.event.ahead?.reward).toEqual(XP);
        s = offered.state;
        expect(map(s).consumedNodes).not.toContain('q1');
        expect(map(s).pendingArrival ?? null).toBeNull();

        s = arrive(s, 'r').state;
        expect(legalMovesFrom(map(s))).toContain('q1');
        expect(stageAt(s, 'q1').event.stage).toBe('offer');
    });

    it('once step 1 is accepted, q1 is spent and moveToNode refuses it', () => {
        let s = acceptedStep1();
        expect(map(s).consumedNodes).toContain('q1');
        s = arrive(s, 'h1').state;
        expect(legalMovesFrom(map(s))).not.toContain('q1');
        expect(() => moveToNode(s.world, 'q1')).toThrow(/spent/);
    });

    it('a step cannot be accepted away from its node, twice, or before the step behind is turned in', () => {
        const s = arrive(freshGame(), 'r').state;
        expect(acceptQuestStep(s, LINE, 1)).toBe(s);
        expect(acceptQuestStep(s, 'no-such-line', 1)).toBe(s);
        const once = acceptedStep1();
        expect(accept(once, 1)).toBe(once);
        // Placed on q2 with step 1 accepted but not turned in: no accept.
        const onQ2: GameState = { ...once, world: placeOnNode(once.world, 'q2') };
        expect(accept(onQ2, 2)).toBe(onQ2);
    });
});

// ─── A6 ───────────────────────────────────────────────────────────────────────

describe('A6: the next quest node is locked until the step is met', () => {
    it('on a new game q2-q4 are behind blocked roads: never a legal move, and moving there throws the reason', () => {
        const s = arrive(freshGame(), 'r').state;
        const moves = legalMovesFrom(map(s));
        for (const q of ['q2', 'q3', 'q4']) expect(moves).not.toContain(q);
        expect(() => moveToNode(s.world, 'q2')).toThrow(IllegalMoveError);
        expect(() => moveToNode(s.world, 'q2')).toThrow(/Step 1 is not done/);
    });

    it("q2's road opens in the END_COMBAT that fills step 1 (a kill step), and not before", () => {
        registerQuestline(questline(LOCKED_MAP, objective({ foeClass: 'any' })));
        try {
            let s = acceptedStep1();
            expect(isRouteBlocked(map(s), 'r', 'q2')).toBeDefined();
            // The step's own kill: a fight from outside the map's pools.
            s = endFight(s, ENEMY_REGISTRY['float-eye'], 'victory');
            expect(questStepState(s.quests, questline(LOCKED_MAP).steps[0]!)).toBe('ready');
            expect(isRouteBlocked(map(s), 'r', 'q2')).toBeUndefined();
            expect(legalMovesFrom(map(s))).toContain('q2');
            // Ready is not paid: the step is held for its turn-in.
            expect(s.quests.completed).not.toContain('ql1b-step-1');
        } finally {
            registerQuestline(questline(LOCKED_MAP));
        }
    });

    it('a fled fight fills nothing and opens nothing', () => {
        registerQuestline(questline(LOCKED_MAP, objective({ foeClass: 'any' })));
        try {
            const s = endFight(acceptedStep1(), ENEMY_REGISTRY['float-eye'], 'flee');
            expect(isRouteBlocked(map(s), 'r', 'q2')).toBeDefined();
        } finally {
            registerQuestline(questline(LOCKED_MAP));
        }
    });

    it('the hazard path: crossing the hazard that fills step 1 opens the road in that resolve', () => {
        const before = acceptedStep1();
        expect(isRouteBlocked(map(before), 'r', 'q2')).toBeDefined();
        const s = readyStep1();
        expect(isRouteBlocked(map(s), 'r', 'q2')).toBeUndefined();
        expect(legalMovesFrom(map(s))).toContain('q2');
        expect(s.player.experience).toBe(before.player.experience);
    });

    it('the reach path opens the road', () => {
        registerQuestline(questline(LOCKED_MAP, objective({ type: 'reach', target: 'h1' })));
        try {
            const s = arrive(acceptedStep1(), 'h1').state;
            expect(isRouteBlocked(map(s), 'r', 'q2')).toBeUndefined();
        } finally {
            registerQuestline(questline(LOCKED_MAP));
        }
    });

    it('the dialogue path opens the road', () => {
        registerQuestline(questline(LOCKED_MAP, objective({ type: 'flag', target: 'x' })));
        try {
            const s0 = acceptedStep1();
            const tree: DialogueTree = {
                id: 'ql1b-talk', rootId: 'root',
                nodes: { root: { id: 'root', text: 'Placeholder.', choices: [{
                    text: 'Done.', effect: { progressQuest: { name: 'ql1b-step-1', objectiveId: 'goal' } },
                }] } },
            };
            const s = applyDialogueChoice(s0, tree, tree.nodes.root!.choices![0]!).gameState;
            expect(isRouteBlocked(map(s), 'r', 'q2')).toBeUndefined();
            expect(s.quests.completed).not.toContain('ql1b-step-1');
        } finally {
            registerQuestline(questline(LOCKED_MAP));
        }
    });

    it('on a save without the locks the stages hold the order: visit q3, q1, q2, q3', () => {
        registerQuestline(questline(OPEN_MAP));
        try {
            let s = arrive(freshGame(OPEN_DEF), 'r').state;
            let at = stageAt(s, 'q3');
            expect(at.event.stage).toBe('locked');
            s = stageAt(at.state, 'q1').state;
            expect(questNodeStage(s.quests, LINE, 1)).toBe('offer');
            s = accept(s, 1);
            at = stageAt(s, 'q2');
            expect(at.event.stage).toBe('waiting');
            expect(at.event.behind?.objectives[0]?.currentCount).toBe(0);
            at = stageAt(at.state, 'q3');
            expect(at.event.stage).toBe('locked');
            // Meet step 1, then q2 turns it in and offers step 2.
            s = arrive(at.state, 'h1').state;
            at = stageAt(s, 'q2');
            expect(at.event.stage).toBe('turn-in');
            s = turnInQuestStep(at.state, LINE, 1, seededRng(5)).state;
            expect(questNodeStage(s.quests, LINE, 2)).toBe('offer');
            expect(questNodeStage(s.quests, LINE, 3)).toBe('locked');
        } finally {
            registerQuestline(questline(LOCKED_MAP));
        }
    });
});

// ─── A7 ───────────────────────────────────────────────────────────────────────

describe('A7: a step counts only from acceptance', () => {
    it('win a fight, accept, the count is 0; win again, it is 1', () => {
        // Step 1 turned in; standing on q2, where step 2 is offered.
        const base = freshGame();
        const s0: GameState = {
            ...base,
            quests: { ...emptyQuestLog(), completed: ['ql1b-step-1'] },
            world: placeOnNode(base.world, 'q2'),
        };
        let s = endFight(s0, ENEMY_REGISTRY['float-eye'], 'victory');
        s = accept(s, 2);
        const count = (g: GameState) => g.quests.active.find(q => q.name === 'ql1b-step-2')!.objectives[0]!.currentCount;
        expect(count(s)).toBe(0);
        s = endFight(s, ENEMY_REGISTRY['float-eye'], 'victory');
        expect(count(s)).toBe(1);
    });

    it('declining (leaving without accepting) changes nothing; the next visit offers again', () => {
        const first = stageAt(freshGame(), 'q1');
        expect(first.state.quests).toEqual(freshGame().quests);
        const back = stageAt(arrive(first.state, 'r').state, 'q1');
        expect(back.event.stage).toBe('offer');
        expect(back.state.quests.active).toEqual([]);
    });
});

// ─── A8 ───────────────────────────────────────────────────────────────────────

describe('A8: turn-in at the next node, and the boss victory pays the last step', () => {
    it('walks all four steps from a fresh game to the Belt and the bridge', () => {
        let s = readyStep1();
        const xp0 = s.player.experience;
        const coin0 = s.player.currency;

        // Step 1 is ready but held: it pays nothing where it was met.
        expect(s.player.experience).toBe(xp0);
        // Turned in at q2 (the NEXT node), paid once.
        let at = stageAt(s, 'q2');
        expect(at.event.stage).toBe('turn-in');
        expect(at.event.behind?.name).toBe('ql1b-step-1');
        expect(turnInQuestStep(s, LINE, 1).paid).toEqual([]); // not standing on q2 yet
        const t1 = turnInQuestStep(at.state, LINE, 1, seededRng(9));
        s = t1.state;
        expect(s.player.experience).toBe(xp0 + 40);
        expect(s.player.currency).toBe(coin0 + 10);
        expect(s.quests.completed).toContain('ql1b-step-1');
        // A second turn-in pays nothing.
        expect(turnInQuestStep(s, LINE, 1, seededRng(9)).state).toBe(s);
        // The same visit then offers step 2; q2 stays unspent until accepted.
        expect(questNodeStage(s.quests, LINE, 2)).toBe('offer');
        expect(map(s).consumedNodes).not.toContain('q2');
        s = accept(s, 2);
        expect(map(s).consumedNodes).toContain('q2');

        // Step 2: two fights in pocket 2, then the turn-in at q3 rolls a card pick.
        s = fightAt(s, 'f1', 'victory');
        expect(isRouteBlocked(map(s), 'r', 'q3')).toBeDefined();
        s = fightAt(s, 'f2', 'victory');
        expect(isRouteBlocked(map(s), 'r', 'q3')).toBeUndefined();
        at = stageAt(s, 'q3');
        expect(at.event.stage).toBe('turn-in');
        const t2 = turnInQuestStep(at.state, LINE, 2, seededRng(11));
        expect(t2.paid[0]?.cardOffers).toHaveLength(3);
        expect(t2.state.player.knownCards).toEqual(at.state.player.knownCards);
        s = accept(t2.state, 3);

        // Step 3: the elite; the turn-in at q4 hands over the potion.
        s = fightAt(s, 'e1', 'victory');
        at = stageAt(s, 'q4');
        expect(at.event.stage).toBe('turn-in');
        const potions = (g: GameState) => g.player.inventory.filter(i => i.id === POTION.id).length;
        // This turn-in goes through the dispatched action (no card pick, so
        // no rng is drawn).
        const t3 = gameReducer(at.state, { type: 'TURN_IN_QUEST_STEP', payload: { questline: LINE, step: 3 } });
        expect(potions(t3)).toBe(potions(at.state) + 1);
        expect(t3.player.experience).toBe(at.state.player.experience + 40);
        expect(t3.quests.completed).toContain('ql1b-step-3');
        s = accept(t3, 4);
        expect(gameReducer(s, { type: 'TURN_IN_QUEST_STEP', payload: { questline: LINE, step: 4 } })).toBe(s); // step 4 is never turned in

        // Step 4: the boss victory completes and pays it, the Belt included.
        expect(legalMovesFrom(map(s))).toContain('boss');
        const xp4 = s.player.experience;
        const coin4 = s.player.currency;
        s = fightAt(s, 'boss', 'victory');
        expect(s.quests.completed).toContain('ql1b-step-4');
        expect(s.player.experience).toBe(xp4 + 40);
        expect(s.player.currency).toBe(coin4 + 15);
        expect(s.player.inventory.some(i => i.id === BELT.id)).toBe(true);
        expect(legalMovesFrom(map(s))).toContain('bridge');
    });
});

// ─── A9 ───────────────────────────────────────────────────────────────────────

/** Standing on q4 with step 4 accepted: the boss is the way on. */
function atTheWatchtower(): GameState {
    const base = freshGame();
    const q4: GameState = {
        ...base,
        quests: { ...emptyQuestLog(), completed: ['ql1b-step-1', 'ql1b-step-2', 'ql1b-step-3'] },
        world: placeOnNode(base.world, 'q4'),
    };
    return accept(q4, 4);
}

describe('A9: incomplete nodes, held roads and the retry', () => {
    it.each(['flee', 'defeat'] as const)(
        'a %s at the held boss answers the arrival, leaves it unspent and opens no road',
        (outcome) => {
            const s = fightAt(atTheWatchtower(), 'boss', outcome);
            expect(map(s).currentNode).toBe('boss');
            expect(map(s).pendingArrival ?? null).toBeNull();
            expect(map(s).consumedNodes).not.toContain('boss');
            expect(map(s).completedNodes).not.toContain('boss');
            expect(legalMovesFrom(map(s))).not.toContain('bridge');
            expect(map(s).availableNodes).not.toContain('bridge');
            expect(s.quests.active.map(q => q.name)).toContain('ql1b-step-4');
        },
    );

    it.each(['victory', 'friendship'] as const)('a %s at the boss puts the bridge on the frontier', (outcome) => {
        const s = fightAt(atTheWatchtower(), 'boss', outcome);
        expect(map(s).consumedNodes).toContain('boss');
        expect(legalMovesFrom(map(s))).toContain('bridge');
    });

    it('standing on the held boss before the fight ends, the bridge is not a legal move', () => {
        const s = atTheWatchtower();
        const owed = arrive(s, 'boss').state;
        expect(map(owed).pendingArrival).toBe('boss');
        expect(legalMovesFrom(map(owed))).not.toContain('bridge');
    });

    it('a held quest node opens nothing while the player stands on it unspent', () => {
        const s = stageAt(freshGame(), 'q1').state;
        expect(legalMovesFrom(map(s))).not.toContain('h1');
        expect(map(s).availableNodes).not.toContain('h1');
        expect(legalMovesFrom(map(accept(s, 1)))).toContain('h1');
    });

    it('the retry: moving onto the unspent node underfoot re-owes it once, and offers the fight again', () => {
        const fled = fightAt(atTheWatchtower(), 'boss', 'flee');
        const retried = moveToNode(fled.world, 'boss');
        expect(retried.currentMap.pendingArrival).toBe('boss');
        // Owed already: the idempotent no-op stays.
        expect(moveToNode(retried, 'boss')).toBe(retried);
        const { event } = resolveMapEvent({ ...fled, world: retried }, seededRng(2));
        expect(event.kind).toBe('encounter');
        // A spent node underfoot stays a no-op.
        const won = fightAt(atTheWatchtower(), 'boss', 'victory');
        expect(moveToNode(won.world, 'boss')).toBe(won.world);
    });

    it('an unlisted fled node is walked past, unspent and uncounted, and offers a fresh fight on return', () => {
        let s = turnInQuestStep(stageAt(readyStep1(), 'q2').state, LINE, 1, seededRng(4)).state;
        s = accept(s, 2);
        s = fightAt(s, 'f1', 'flee');
        expect(map(s).consumedNodes).not.toContain('f1');
        expect(s.quests.active.find(q => q.name === 'ql1b-step-2')!.objectives[0]!.currentCount).toBe(0);
        // f1 is not held: standing on it, the road past it is open.
        expect(legalMovesFrom(map(s))).toContain('past');
        s = arrive(s, 'f2').state;
        s = gameReducer(s, { type: 'END_COMBAT', payload: { outcome: 'flee' } });
        expect(legalMovesFrom(map(s))).toContain('f1');
        const again = arrive(s, 'f1');
        expect(again.event.kind).toBe('encounter');
        expect(map(again.state).pendingArrival).toBe('f1');
    });

    it('a map with no list keeps the frontier it has today: standing on a quest node opens its roads', () => {
        const s = stageAt(freshGame(OPEN_DEF), 'q1').state;
        expect(legalMovesFrom(map(s))).toContain('h1');
    });
});

// ─── Guards the counting sites keep ───────────────────────────────────────────

describe('objective lookups skip a filled objective, and a hazard counts once', () => {
    it('a held step that filled lists no kill or hazard objective for a further count', () => {
        const held: Quest = {
            ...stepQuestOf(9, [
                objective({ id: 'k', foeClass: 'any', currentCount: 1 }),
                objective({ id: 'h', type: 'hazard', currentCount: 1 }),
            ]),
            mapName: LOCKED_MAP, holdForTurnIn: true,
        };
        const log = startQuest(emptyQuestLog(), held);
        expect(killObjectives(log, ENEMY_REGISTRY['float-eye'], LOCKED_MAP)).toEqual([]);
        expect(hazardObjectives(log, LOCKED_MAP)).toEqual([]);
    });

    it('one hazard resolve counts once toward a two-hazard step; a loot cache counts none', () => {
        registerQuestline(questline(LOCKED_MAP, objective({ type: 'hazard', requiredCount: 2 })));
        try {
            const s0 = acceptedStep1();
            const count = (g: GameState) => g.quests.active.find(q => q.name === 'ql1b-step-1')!.objectives[0]!.currentCount;
            const moved: GameState = { ...s0, world: moveToNode(s0.world, 'h1') };
            const gathered = resolveMapEvent(moved, seededRng(3), { kind: 'loot-cache', items: [POTION] }).state;
            expect(count(gathered)).toBe(0);
            const crossed = arrive(s0, 'h1').state;
            expect(count(crossed)).toBe(1);
            expect(isRouteBlocked(map(crossed), 'r', 'q2')).toBeDefined();
        } finally {
            registerQuestline(questline(LOCKED_MAP));
        }
    });
});
