/**
 * Exploration loop test suite.
 *
 * Coverage:
 *   - moveToNode adjacency / completed-lock / locked-node validation.
 *   - Per-objective quest engine (start / progress / complete).
 *   - resolveMapEvent dispatch for every kind the demo map exercises.
 *   - End-to-end flow through the Breakwater from start to its door fight.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
    createStartingWorld, moveToNode, completeCurrentNode, IllegalMoveError,
    resolveMapEvent, applyDialogueChoice, getMapDefinition, createMapState,
    emptyQuestLog, startQuest, progressQuest, isQuestComplete, completeQuest,
} from '../index';
import { createNewGameState } from '../../Game/game.reducer';
import { GameState } from '../../Game/types';
import { mockSequentialRng } from '../../test-utils/rng';
import { settleQuestNodesIn } from '../../Game/fixtures/quest-nodes';
import {
    FIXTURE_NPC, FIXTURE_QUEST, FIXTURE_VILLAGE_EVENT,
} from '../../Game/fixtures/fixture-content';

afterEach(() => vi.restoreAllMocks());

const startingState = (): GameState => createNewGameState({ startMap: 'breakwater' });

// The Act 1 maps carry no NPC, village or log quest (the Breakwater's questline is its own test): the varied kinds
// and the quest/dialogue mechanics run on the neutral fixtures, staged on the
// Breakwater. Sets currentNode directly — resolveMapEvent works off
// currentNode regardless of traversal.
const bwStateAt = (nodeId: string): GameState => {
    const base = startingState();
    const def = getMapDefinition('coastal-continent', 'breakwater');
    return {
        ...base,
        world: { ...base.world, currentMap: { ...createMapState(def), currentNode: nodeId } },
    };
};

// ── moveToNode ──────────────────────────────────────────────────────────────

describe('moveToNode', () => {
    it('moves to a connected, unlocked, uncompleted node', () => {
        const world = createStartingWorld('breakwater');
        const next = moveToNode(world, 'bw-4');
        expect(next.currentMap.currentNode).toBe('bw-4');
    });

    it('rejects non-adjacent nodes', () => {
        const world = createStartingWorld('breakwater');
        expect(() => moveToNode(world, 'bw-12')).toThrow(IllegalMoveError);
    });

    it('rejects locked nodes', () => {
        const world = createStartingWorld('breakwater');
        // bw-7 (the south pier) starts locked (only bw-19, bw-4 and bw-5 touch the windmill).
        expect(world.currentMap.lockedNodes).toContain('bw-7');
        expect(() => moveToNode(world, 'bw-7')).toThrow(IllegalMoveError);
    });

    it('locks completed nodes against back-travel (Q2)', () => {
        let world = createStartingWorld('breakwater');
        world = moveToNode(world, 'bw-4');
        world = completeCurrentNode(world);
        // After completing bw-4, the south pier (bw-7) becomes available.
        expect(world.currentMap.availableNodes).toContain('bw-7');
        world = moveToNode(world, 'bw-7');
        // Can't go back to the completed bw-4.
        expect(() => moveToNode(world, 'bw-4')).toThrow(IllegalMoveError);
    });

    it('returns the same state when target equals current node', () => {
        const world = createStartingWorld('breakwater');
        const same = moveToNode(world, world.currentMap.currentNode);
        expect(same).toBe(world);
    });
});

// ── Quest engine (Q7B) ──────────────────────────────────────────────────────

describe('per-objective quest engine', () => {
    it('starts a quest and tracks objectives', () => {
        const log = startQuest(emptyQuestLog(), FIXTURE_QUEST);
        expect(log.active).toHaveLength(1);
        expect(log.active[0].status).toBe('active');
        expect(isQuestComplete(log.active[0])).toBe(false);
    });

    it('progressQuest advances counters and auto-completes when filled', () => {
        const quest = { ...FIXTURE_QUEST, objectives: [{ ...FIXTURE_QUEST.objectives[0]!, requiredCount: 3 }] };
        const objective = quest.objectives[0]!.id;
        const log = startQuest(emptyQuestLog(), quest);
        const partial = progressQuest(log, quest.name, objective, 2);
        expect(partial.log.completed).not.toContain(quest.name);
        const res = progressQuest(partial.log, quest.name, objective, 1);
        expect(res.log.completed).toContain(quest.name);
        expect(res.completedName).toBe(quest.name);
    });

    it('completeQuest moves the quest to completed list', () => {
        let log = startQuest(emptyQuestLog(), FIXTURE_QUEST);
        log = completeQuest(log, FIXTURE_QUEST.name);
        expect(log.completed).toContain(FIXTURE_QUEST.name);
        expect(log.active).toHaveLength(0);
    });

    it('a reach objective ticks on arrival at its node', () => {
        mockSequentialRng(0.5);
        const state = bwStateAt('bw-2');
        const result = resolveMapEvent({ ...state, quests: startQuest(emptyQuestLog(), FIXTURE_QUEST) });
        expect(result.state.quests.completed).toContain(FIXTURE_QUEST.name);
    });
});

// ── resolveMapEvent dispatcher ────────────────────────────────────────────

describe('resolveMapEvent dispatch', () => {
    it('returns kind=village for a staged shop', () => {
        mockSequentialRng(0.5);
        const result = resolveMapEvent(bwStateAt('bw-2'), undefined, FIXTURE_VILLAGE_EVENT);
        expect(result.event.kind).toBe('village');
        if (result.event.kind === 'village') {
            expect(result.event.merchants.length).toBeGreaterThan(0);
        }
    });

    it('returns kind=encounter on encounter nodes', () => {
        mockSequentialRng(0.5);
        // bw-2 (the crane quay) is a Float-Eye fight in the second step's
        // pocket; the quest nodes are settled to reach it.
        let state = settleQuestNodesIn(startingState());
        state = { ...state, world: moveToNode(state.world, 'bw-2') };
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('encounter');
        if (result.event.kind === 'encounter') {
            expect(result.event.isBoss).toBe(false);
            expect(result.event.encounter.enemies).toHaveLength(1);
        }
    });

    it('grants currency on loot-cache nodes (treasure folded into loot-cache)', () => {
        mockSequentialRng(0.5);
        // bw-5 is the Breakwater's first loot cache.
        const state = bwStateAt('bw-5');
        const before = state.player.currency;
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('loot-cache');
        const granted = result.event.kind === 'loot-cache' ? result.event.currency : 0;
        expect(granted).toBeGreaterThan(0);
        expect(result.state.player.currency).toBe(before + granted);
    });

    it('returns kind=encounter with isBoss=true on the boss node', () => {
        mockSequentialRng(0.5);
        // The watchtower (bw-17) holds the Breakwater's door fight, behind
        // the last quest node; the quest nodes are settled to reach it.
        let state = settleQuestNodesIn(startingState());
        for (const target of ['bw-4', 'bw-9', 'bw-13', 'bw-16', 'bw-17'] as const) {
            state = { ...state, world: moveToNode(state.world, target) };
            if (target !== 'bw-17') state = { ...state, world: completeCurrentNode(state.world) };
        }
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('encounter');
        if (result.event.kind === 'encounter') {
            expect(result.event.isBoss).toBe(true);
            expect(result.event.encounter.enemies[0].name).toBe('The Death Beholder');
        }
    });
});

// ── Dialogue (Q9) ──────────────────────────────────────────────────────────

describe('applyDialogueChoice', () => {
    // No Act 1 map carries an NPC (R7e): the fixture NPC's tree, with the
    // fixture quest already offered in the log.
    const tree = FIXTURE_NPC.dialogueTree!;
    const offered = (): GameState => ({
        ...bwStateAt('bw-1'),
        quests: { ...emptyQuestLog(), available: [FIXTURE_QUEST] },
    });

    it('starts a quest when a choice carries startQuest', () => {
        mockSequentialRng(0.5);
        const take = tree.nodes[tree.rootId].choices!.find(c => c.effect?.startQuest)!;
        const step = applyDialogueChoice(offered(), tree, take);
        expect(step.nextNode?.id).toBe('end');
        expect(step.effects.startedQuest).toBe(FIXTURE_QUEST.name);
        expect(step.gameState.quests.active.find(q => q.name === FIXTURE_QUEST.name)).toBeDefined();
    });

    it('grants currency when a choice carries grantCurrency', () => {
        mockSequentialRng(0.5);
        const state = offered();
        const choice = { text: 'Take it.', effect: { grantCurrency: 35 } };
        const step = applyDialogueChoice(state, tree, choice);
        expect(step.gameState.player.currency).toBe(state.player.currency + 35);
    });
});
