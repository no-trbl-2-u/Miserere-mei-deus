/**
 * The scene slot: a node's scene, then its event.
 *
 * Fixture nodes on the Breakwater's opening road, over a cleared registry (no
 * authored content): the windmill `bw-w1` as an empty waypoint, `bw-w2` a
 * fight, `bw-w3` a hazard, `bw-w4` a loot cache. Each carries a `before`
 * scene (`registerNodeScene`); the pools are node overrides
 * (`setNodeEventPoolOverride`).
 *
 *   A1  the table holds a scene per node, a pool-less node included; a
 *       labyrinth map reads none.
 *   A2  the first resolve is the scene (`slot: 'before'`, its effect applied,
 *       the node unspent and owed); the second is the node's own event.
 *   A3  once a run: a withdraw's return is the fight, a walk back is nothing,
 *       a new run replays; a save without `seenScenes` plays it once.
 *   A4  the reducer's resolve action reaches the node's own event.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    _clearMapEventPoolRegistry,
    answerUnsettledArrival,
    getNodeScene,
    isBeforeScene,
    registerMapEventPool,
    registerNodeScene,
    resolveMapEvent,
    setNodeEventPoolOverride,
    settleArrival,
} from '../resolve-map-event';
import { moveToNode } from '../../world.reducer';
import { createNewGameState, gameReducer, GAME_STATE_VERSION } from '../../../Game/game.reducer';
import { migrate } from '../../../Game/game.migrate';
import { MAP_REGISTRY } from '../../map.registry';
import { BREAKWATER_CHAPTER_QUESTLINE_ID } from '../../breakwater-chapter.questline';
import { mockSequentialRng, restoreOriginalRng } from '../../../test-utils/rng';
import type { GameState } from '../../../Game/types';
import type { MapEventPayload, NodeScene } from '../types';

const C = 'coastal-continent';
const M = 'breakwater';

function scene(name: string, effect?: NodeScene['before']['effect']): NodeScene {
    return { before: { kind: 'cutscene', lines: [`${name} scene.`], scene: name, ...(effect ? { effect } : {}) } };
}

function pool(nodeId: string, payload: MapEventPayload): void {
    const id = `ss1a.${nodeId}`;
    registerMapEventPool({ id, entries: [{ kind: payload.kind, weight: 1, payload }] });
    setNodeEventPoolOverride(C, M, nodeId, id);
}

function registerFixtures(): void {
    // bw-w1: no pool, a scene that gives quest step 1 (the windmill's shape).
    registerNodeScene(C, M, 'bw-w1', scene('windmill', {
        giveQuestStep: { questline: BREAKWATER_CHAPTER_QUESTLINE_ID, step: 1 },
    }));
    registerNodeScene(C, M, 'bw-w2', scene('fight'));
    pool('bw-w2', { kind: 'encounter', enemySlug: 'float-eye' });
    registerNodeScene(C, M, 'bw-w3', scene('hazard'));
    pool('bw-w3', { kind: 'hazard', damage: 1 });
    registerNodeScene(C, M, 'bw-w4', scene('cache'));
    pool('bw-w4', { kind: 'loot-cache', currency: 5 });
}

beforeEach(() => {
    mockSequentialRng(0.5);
    _clearMapEventPoolRegistry();
    registerFixtures();
});

afterEach(() => {
    vi.restoreAllMocks();
    restoreOriginalRng();
    _clearMapEventPoolRegistry();
});

function freshRun(): GameState {
    return createNewGameState({ startMap: 'breakwater' });
}

function move(state: GameState, nodeId: string): GameState {
    return { ...state, world: moveToNode(state.world, nodeId) };
}

/** Resolve the windmill (scene, then nothing) so the road to bw-w2 opens. */
function pastTheWindmill(): GameState {
    const scened = resolveMapEvent(freshRun());
    expect(isBeforeScene(scened.event)).toBe(true);
    return resolveMapEvent(scened.state).state;
}

/** Arrive at bw-w2 and win its fight, scene first. */
function wonFirstFight(): GameState {
    const owed = move(pastTheWindmill(), 'bw-w2');
    const scened = resolveMapEvent(owed).state;
    const fight = resolveMapEvent(scened);
    expect(fight.event.kind).toBe('encounter');
    return settleArrival(fight.state);
}

const map = (s: GameState) => s.world.currentMap;

describe('A1: the scene table', () => {
    it('holds a scene per node, a pool-less node included', () => {
        expect(getNodeScene(C, M, 'bw-w2')?.before.scene).toBe('fight');
        expect(getNodeScene(C, M, 'bw-w1')?.before.scene).toBe('windmill');
        expect(getNodeScene(C, M, 'bw-w5')).toBeUndefined();
    });

    it('a labyrinth map reads none', () => {
        const lab = Object.values(MAP_REGISTRY).flatMap(c => Object.values(c ?? {}))
            .find(def => def?.traversal === 'labyrinth');
        expect(lab).toBeDefined();
        registerNodeScene(lab!.continent, lab!.name, lab!.startingNode.id, scene('lab'));
        expect(getNodeScene(lab!.continent, lab!.name, lab!.startingNode.id)).toBeUndefined();
    });

    it('a clear empties the table', () => {
        _clearMapEventPoolRegistry();
        expect(getNodeScene(C, M, 'bw-w2')).toBeUndefined();
    });
});

describe('A2: the scene comes first, then the node', () => {
    it('a fight: the scene, the node unspent and owed; then the fight; the win settles it', () => {
        const owed = move(pastTheWindmill(), 'bw-w2');
        expect(map(owed).pendingArrival).toBe('bw-w2');

        const first = resolveMapEvent(owed);
        expect(first.event).toEqual({ kind: 'cutscene', lines: ['fight scene.'], scene: 'fight', slot: 'before' });
        const after = map(first.state);
        expect(after.pendingArrival).toBe('bw-w2');
        expect(after.consumedNodes).not.toContain('bw-w2');
        expect(after.completedNodes).toEqual(map(owed).completedNodes);
        expect(after.availableNodes).toEqual(map(owed).availableNodes);
        expect(after.lockedNodes).toEqual(map(owed).lockedNodes);
        expect(after.discoveredNodes).toEqual(map(owed).discoveredNodes);
        expect(after.seenScenes).toEqual(['bw-w1', 'bw-w2']);
        expect(first.state.player).toBe(owed.player);
        expect(first.state.quests).toBe(owed.quests);

        const second = resolveMapEvent(first.state);
        expect(second.event.kind).toBe('encounter');
        expect(map(second.state).pendingArrival).toBe('bw-w2');

        const won = settleArrival(second.state);
        expect(map(won).consumedNodes).toContain('bw-w2');
        expect(map(won).pendingArrival).toBeNull();
        expect(map(won).availableNodes).toEqual(expect.arrayContaining(['bw-w3', 'bw-w4']));
    });

    it('a hazard: the scene, then the hazard, which consumes the node', () => {
        const owed = move(wonFirstFight(), 'bw-w3');
        const first = resolveMapEvent(owed);
        expect(first.event).toMatchObject({ kind: 'cutscene', scene: 'hazard', slot: 'before' });
        expect(first.state.player.health).toBe(owed.player.health);
        expect(map(first.state).consumedNodes).not.toContain('bw-w3');

        const second = resolveMapEvent(first.state);
        expect(second.event).toMatchObject({ kind: 'hazard', damage: 1 });
        expect(second.state.player.health).toBe(owed.player.health - 1);
        expect(map(second.state).consumedNodes).toContain('bw-w3');
        expect(map(second.state).pendingArrival).toBeNull();
    });

    it('a loot cache: the scene, then the cache', () => {
        const owed = move(wonFirstFight(), 'bw-w4');
        const first = resolveMapEvent(owed);
        expect(first.event).toMatchObject({ kind: 'cutscene', scene: 'cache', slot: 'before' });
        const second = resolveMapEvent(first.state);
        expect(second.event).toMatchObject({ kind: 'loot-cache', currency: 5 });
        expect(map(second.state).consumedNodes).toContain('bw-w4');
    });

    it('an empty waypoint: the scene and its effect, then none', () => {
        const start = freshRun();
        expect(map(start).currentNode).toBe('bw-w1');
        const first = resolveMapEvent(start);
        expect(first.event).toMatchObject({ kind: 'cutscene', scene: 'windmill', slot: 'before' });
        expect(first.state.quests).not.toBe(start.quests);
        expect(map(first.state).consumedNodes).not.toContain('bw-w1');
        expect(map(first.state).availableNodes).toEqual(map(start).availableNodes);

        const second = resolveMapEvent(first.state);
        expect(second.event).toEqual({ kind: 'none' });
        expect(map(second.state).consumedNodes).toContain('bw-w1');
        expect(map(second.state).availableNodes).toContain('bw-w2');
        // The effect played once: the second call left the quest log alone.
        expect(second.state.quests).toEqual(first.state.quests);
    });

    it('a cutscene without a slot carries no slot key', () => {
        _clearMapEventPoolRegistry();
        pool('bw-w1', { kind: 'cutscene', lines: ['Plain.'] });
        const { event } = resolveMapEvent(freshRun());
        expect(event).toEqual({ kind: 'cutscene', lines: ['Plain.'] });
        expect(isBeforeScene(event)).toBe(false);
    });
});

describe('A3: a scene plays once a run', () => {
    it('after a withdraw the return resolves the fight straight away', () => {
        const owed = move(pastTheWindmill(), 'bw-w2');
        const fight = resolveMapEvent(resolveMapEvent(owed).state);
        expect(fight.event.kind).toBe('encounter');
        const fled = answerUnsettledArrival(fight.state);
        expect(map(fled).consumedNodes).not.toContain('bw-w2');

        const retry = move(fled, 'bw-w2');
        expect(map(retry).pendingArrival).toBe('bw-w2');
        const again = resolveMapEvent(retry);
        expect(again.event.kind).toBe('encounter');
    });

    it('a walk back resolves nothing', () => {
        const atCache = resolveMapEvent(resolveMapEvent(move(wonFirstFight(), 'bw-w4')).state).state;
        const back = move(atCache, 'bw-w2');
        const { event } = resolveMapEvent(back);
        expect(event).toEqual({ kind: 'none' });
    });

    it('a new run plays the scene again', () => {
        const played = resolveMapEvent(freshRun());
        expect(isBeforeScene(played.event)).toBe(true);
        const next = resolveMapEvent(freshRun());
        expect(isBeforeScene(next.event)).toBe(true);
        expect(map(freshRun()).seenScenes).toBeUndefined();
    });

    it('a save without seenScenes loads and plays the scene once', () => {
        const owed = move(pastTheWindmill(), 'bw-w2');
        const save = JSON.parse(JSON.stringify(owed)) as GameState;
        delete save.world.currentMap.seenScenes;
        const loaded = migrate(save, save.version, GAME_STATE_VERSION) as GameState;
        expect(loaded.world.currentMap.seenScenes).toBeUndefined();

        const first = resolveMapEvent(loaded);
        expect(isBeforeScene(first.event)).toBe(true);
        expect(map(first.state).seenScenes).toEqual(['bw-w2']);
        const second = resolveMapEvent(first.state);
        expect(second.event.kind).toBe('encounter');
    });

    it('a save taken after the scene reloads onto the node\'s own event', () => {
        const owed = move(pastTheWindmill(), 'bw-w2');
        const scened = resolveMapEvent(owed).state;
        const save = JSON.parse(JSON.stringify(scened)) as GameState;
        const loaded = migrate(save, save.version, GAME_STATE_VERSION) as GameState;
        expect(map(loaded).seenScenes).toEqual(['bw-w1', 'bw-w2']);
        expect(resolveMapEvent(loaded).event.kind).toBe('encounter');
    });
});

describe('A4: the reducer reaches the node\'s own event', () => {
    it('PROCESS_NODE plays the scene and resolves the fight in one action', () => {
        const owed = move(pastTheWindmill(), 'bw-w2');
        const next = gameReducer(owed, { type: 'PROCESS_NODE' });
        expect(map(next).seenScenes).toContain('bw-w2');
        // The fight resolved: its arrival stays owed until the fight settles,
        // exactly the state two direct resolves reach.
        expect(map(next).pendingArrival).toBe('bw-w2');
        expect(next).toEqual(resolveMapEvent(resolveMapEvent(owed).state).state);
    });

    it('PROCESS_NODE on an empty waypoint with a scene reaches none: the node is spent', () => {
        const next = gameReducer(freshRun(), { type: 'PROCESS_NODE' });
        expect(map(next).seenScenes).toEqual(['bw-w1']);
        expect(map(next).consumedNodes).toContain('bw-w1');
    });
});
