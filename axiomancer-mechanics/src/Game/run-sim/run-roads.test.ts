import { describe, expect, it } from 'vitest';

import {
    BREAKWATER_CHAPTER_QUESTLINE_ID,
    BREAKWATER_CHAPTER_STEPS,
    createNewGameState,
    giveQuestStep,
    settleQuestNodes,
    syncMoveLists,
    unblockMapRoute,
    type GameState,
    type Quest,
} from '../../index';
import {
    distanceToExit, distanceToStory, distanceToUnfinished, isEliteNode, isNodeUnfinished, isReachTarget, isStoryNode,
    runRoadOptions, unfinishedReachable,
} from './run-roads';

/** A new game as the-chosen, optionally standing on `nodeId` with `spent` nodes walked. */
function stateAt(nodeId?: string, spent: readonly string[] = [], settled = false): GameState {
    const fresh = createNewGameState({ characterId: 'the-chosen' });
    let map = fresh.world.currentMap;
    if (settled) map = settleQuestNodes(map);
    map = { ...map, completedNodes: [...map.completedNodes, ...spent] };
    if (nodeId !== undefined) map = syncMoveLists({ ...map, currentNode: nodeId, pendingArrival: null });
    return { ...fresh, world: { ...fresh.world, currentMap: map } };
}

describe('runRoadOptions', () => {
    it('offers the windmill road to the first fight, unfinished, distance 0', () => {
        const options = runRoadOptions(stateAt());
        expect(options.map((o) => o.nodeId)).toEqual(['bw-w2']);
        expect(options[0]).toMatchObject({ via: 'road', nodeKind: 'encounter', unfinished: true, distanceToUnfinished: 0 });
    });

    it('never offers a road through a shut quest gate (the keep gate)', () => {
        const options = runRoadOptions(stateAt('bw-k1', ['bw-w2', 'bw-w4', 'bw-w5']));
        expect(options.map((o) => o.nodeId)).not.toContain('bw-k2');
    });

    it('measures the walk past spent nodes to the nearest unfinished one', () => {
        const state = stateAt('bw-w2', ['bw-w2', 'bw-w3']);
        const viaField = runRoadOptions(state).find((o) => o.nodeId === 'bw-w3');
        // bw-w3 is spent; bw-h1 lies one road past it.
        expect(viaField).toMatchObject({ unfinished: false, distanceToUnfinished: 1 });
    });

    it('offers the sea cave passage from the cave mouth as a trip', () => {
        const options = runRoadOptions(stateAt('bw-h6', ['bw-w2', 'bw-w3', 'bw-h1', 'bw-h2', 'bw-h3', 'bw-h4', 'bw-h5', 'bw-h6']));
        expect(options.find((o) => o.via === 'travel')).toMatchObject({ nodeId: 'bw-c0', unfinished: true });
    });

    it('offers the node underfoot again when it is unspent and its arrival answered', () => {
        const options = runRoadOptions(stateAt('bw-w2'));
        expect(options[0]).toMatchObject({ nodeId: 'bw-w2', via: 'retry', distanceToUnfinished: 0 });
    });
});

describe('isNodeUnfinished', () => {
    it('reads a quest node with no business as finished, and the start node always', () => {
        const state = stateAt();
        expect(isNodeUnfinished(state, 'bw-l5')).toBe(false);
        expect(isNodeUnfinished(state, 'bw-w1')).toBe(false);
        expect(isNodeUnfinished(state, 'bw-w3')).toBe(true);
    });

    it('reads a quest node an active quest asks the player to reach as unfinished, until the objective fills', () => {
        const reach = (currentCount: number): GameState => {
            const state = stateAt();
            const quest = {
                name: 'q', description: '', mapName: 'breakwater', reward: 'quest', status: 'active',
                objectives: [{ id: 'camp', type: 'reach', target: 'bw-c2', description: '', requiredCount: 1, currentCount }],
            };
            return { ...state, quests: { available: [], active: [quest], completed: [] } } as unknown as GameState;
        };
        expect(isReachTarget(reach(0), 'bw-c2')).toBe(true);
        expect(isNodeUnfinished(reach(0), 'bw-c2')).toBe(true);
        expect(isReachTarget(reach(1), 'bw-c2')).toBe(false);
        expect(isNodeUnfinished(reach(1), 'bw-c2')).toBe(false);
        expect(isReachTarget(reach(0), 'bw-l5')).toBe(false);
    });

    it('returns null distance when nothing unfinished is reachable', () => {
        const state = stateAt('bw-w2', [], true);
        const all = state.world.currentMap;
        const everything = { ...all, completedNodes: ['bw-w2', 'bw-w3', 'bw-w4', 'bw-m1', 'bw-w5', 'bw-k1', 'bw-h1', 'bw-m2', 'bw-p1'] };
        const walled: GameState = { ...state, world: { ...state.world, currentMap: { ...everything, blockedRoutes: [
            { from: 'bw-w3', to: 'bw-h1', reason: 'test' },
            { from: 'bw-w4', to: 'bw-w5', reason: 'test' },
            { from: 'bw-m1', to: 'bw-m2', reason: 'test' },
            { from: 'bw-m1', to: 'bw-p1', reason: 'test' },
        ] } } };
        expect(distanceToUnfinished(walled, 'bw-w3', 'bw-w2')).toBeNull();
    });
});

/** `state` with the chapter's first step given, as the windmill's arrival gives it. */
function withStep1(state: GameState): GameState {
    return giveQuestStep(state, BREAKWATER_CHAPTER_QUESTLINE_ID, 1);
}

/** `state` holding the boss step, accepted with its kill at `count`, and the first three completed. */
function withBossStep(state: GameState, count: number): GameState {
    const boss = {
        name: BREAKWATER_CHAPTER_STEPS.boss, description: '', mapName: 'breakwater', reward: 'quest', status: 'active',
        questline: BREAKWATER_CHAPTER_QUESTLINE_ID, step: 4, holdForTurnIn: true,
        objectives: [{ id: 'boss', type: 'kill', foeClass: 'boss', description: '', requiredCount: 1, currentCount: count }],
    } as Quest;
    const completed = [BREAKWATER_CHAPTER_STEPS.fishermen, BREAKWATER_CHAPTER_STEPS.lighthouse, BREAKWATER_CHAPTER_STEPS.keep];
    return { ...state, quests: { available: [], active: [boss], completed } };
}

describe('what a road says (phase SM2b)', () => {
    it('marks a road to an elite node, read from its pool', () => {
        const options = runRoadOptions(stateAt('bw-w4', ['bw-w2', 'bw-w4']));
        expect(options.find((o) => o.nodeId === 'bw-w5')).toMatchObject({ elite: true });
        expect(options.find((o) => o.nodeId === 'bw-w2')).toMatchObject({ elite: false });
        expect(isEliteNode(stateAt(), 'bw-c1')).toBe(true);
        expect(isEliteNode(stateAt(), 'bw-k2')).toBe(false);
    });

    it('marks the current step\'s target, a held node still holding, and an unbeaten boss as story', () => {
        const state = withStep1(stateAt());
        // Step 1 sends the player to the fishermen's camp.
        expect(isStoryNode(state, 'bw-c2')).toBe(true);
        // The wreck and the elites hold their roads on until crossed or beaten.
        expect(isStoryNode(state, 'bw-h4')).toBe(true);
        expect(isStoryNode(state, 'bw-w5')).toBe(true);
        // The boss holds the chapter; a plain fight and a side village do not.
        expect(isStoryNode(state, 'bw-k2')).toBe(true);
        expect(isStoryNode(state, 'bw-w2')).toBe(false);
        expect(isStoryNode(state, 'bw-t4')).toBe(false);
        // A held node once crossed holds nothing.
        expect(isStoryNode(withStep1(stateAt('bw-w4', ['bw-w2', 'bw-w4', 'bw-w5'])), 'bw-w5')).toBe(false);
    });

    it('moves the story with the quest log: the boss while it stands, then the turn-in', () => {
        expect(isStoryNode(withBossStep(stateAt(), 0), 'bw-k2')).toBe(true);
        expect(isStoryNode(withBossStep(stateAt(), 0), 'bw-b1')).toBe(false);
        expect(isStoryNode(withBossStep(stateAt(), 1), 'bw-b1')).toBe(true);
    });

    it('measures the walk to the nearest story node past the node underfoot', () => {
        const options = runRoadOptions(withStep1(stateAt()));
        // From the windmill: the crossroads, then the cliff road, then the keep causeway (an elite, held).
        expect(options.find((o) => o.nodeId === 'bw-w2')).toMatchObject({ story: false, distanceToStory: 2 });
        expect(distanceToStory(withStep1(stateAt()), 'bw-w5')).toBe(0);
    });

    it('reads the exit as out of reach while the bridge is shut, and its distance once open', () => {
        const shut = stateAt('bw-t2', ['bw-w2', 'bw-w3', 'bw-h1', 'bw-t1', 'bw-t2']);
        expect(runRoadOptions(shut).every((o) => o.distanceToExit === null)).toBe(true);
        const open: GameState = { ...shut, world: { ...shut.world, currentMap: unblockMapRoute(shut.world.currentMap, 'bw-b1', 'bw-b2') } };
        expect(runRoadOptions(open).find((o) => o.nodeId === 'bw-b1')).toMatchObject({ distanceToExit: 1 });
        expect(distanceToExit(open, 'bw-b2')).toBe(0);
        expect(distanceToExit(open, 'bw-t1', 'bw-t2')).toBeNull();
    });
});

describe('unfinishedReachable (phase SM2b)', () => {
    it('counts the unfinished nodes the open roads reach, leaving out the node underfoot', () => {
        // From the windmill: every unspent node short of the holds and the shut gates,
        // less the bridge (a quest node with no business yet).
        expect(unfinishedReachable(stateAt())).toBe(30);
        // Standing on the crossroads, unspent, it is not counted.
        expect(unfinishedReachable(stateAt('bw-w2'))).toBe(29);
    });

    it('counts nothing when every road is walled off', () => {
        const state = stateAt('bw-w2', ['bw-w2'], true);
        const walled: GameState = { ...state, world: { ...state.world, currentMap: { ...state.world.currentMap, blockedRoutes: [
            { from: 'bw-w1', to: 'bw-w2', reason: 'test' },
            { from: 'bw-w2', to: 'bw-w3', reason: 'test' },
            { from: 'bw-w2', to: 'bw-w4', reason: 'test' },
            { from: 'bw-w2', to: 'bw-m1', reason: 'test' },
        ] } } };
        expect(unfinishedReachable(walled)).toBe(0);
    });
});
