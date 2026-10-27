/**
 * The Chapter 1 lane-relic quest, giver to relic to lane card (phase LR1f,
 * A17 of the LR1 brief, cut to Chapter 1 by T on 2026-10-27).
 *
 * One journey, through the real map graph and the real pools: from a fresh
 * game on the Breakwater's arrival, walk to the giver, take the quest in its
 * narration, meet the objective on the map, and the quest's relic is in the
 * satchel. Carried unworn, its lane is not unlocked; worn, it is,
 * and the next combat reward holds a card of that lane.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyDialogueChoice, createMapState, getMapDefinition, moveToNode, resolveMapEvent } from '../index';
import { QUEST_LIBRARY, WATCHTOWER_LAMP_QUEST } from '../quest.library';
import { questRewardItem } from '../quest.engine';
import { createNewGameState, gameReducer } from '../../Game/game.reducer';
import { equipItem } from '../../Character/equipment.reducer';
import { rollCombatCardRewards, unlockedLaneIds } from '../../Combat/combat.rewards';
import { getCardLane } from '../../Cards/card.lanes';
import { relicLaneId } from '../../Items/relic-lanes';
import { mockSequentialRng } from '../../test-utils/rng';
import type { GameState } from '../../Game/types';
import type { ContinentName, MapName } from '../map.library';
import type { Quest } from '../types';
import type { Equipment } from '../../Items/types';

afterEach(() => vi.restoreAllMocks());

/** A fresh game standing on the arrival node of `map`, its arrival resolved. */
function arrive(continent: ContinentName, map: MapName): GameState {
    mockSequentialRng(0.5);
    const base = createNewGameState();
    const def = getMapDefinition(continent, map);
    const at: GameState = { ...base, world: { ...base.world, currentMap: createMapState(def) } };
    return resolveMapEvent(at).state;
}

/** Step onto `nodeId` and answer it: a fight is staged and won, a narration is left unanswered. */
function step(state: GameState, nodeId: string): GameState {
    const moved: GameState = { ...state, world: moveToNode(state.world, nodeId) };
    const { state: resolved, event } = resolveMapEvent(moved);
    if (event.kind !== 'encounter') return resolved;
    const staged = gameReducer(resolved, { type: 'START_COMBAT', payload: { target: event.encounter } });
    return gameReducer(staged, { type: 'END_COMBAT', payload: { outcome: 'victory', grantedLoot: [], grantedXp: 0 } });
}

function walk(state: GameState, ...route: string[]): GameState {
    return route.reduce(step, state);
}

/** Take the quest: step onto the giver and pick its first choice. */
function takeQuest(state: GameState, giver: string, quest: Quest): GameState {
    const moved: GameState = { ...state, world: moveToNode(state.world, giver) };
    const { state: resolved, event } = resolveMapEvent(moved);
    expect(event.kind).toBe('narration');
    if (event.kind !== 'narration') throw new Error('unreachable');
    const tree = event.dialogue;
    const accept = tree.nodes[tree.rootId]!.choices![0]!;
    expect(accept.effect?.startQuest).toBe(quest.name);
    const out = applyDialogueChoice(resolved, tree, accept).gameState;
    expect(out.quests.active.map(q => q.name)).toContain(quest.name);
    return out;
}

const relicOf = (q: Quest): Equipment => questRewardItem(q.reward) as Equipment;

function carries(state: GameState, id: string): boolean {
    return state.player.inventory.some(i => i.id === id);
}

/** Wear the quest relic, then roll the next combat reward with spread seeds. */
function expectLaneCardOnceWorn(state: GameState, relic: Equipment): void {
    const lane = relicLaneId(relic)!;
    expect(lane).toBeDefined();
    expect(unlockedLaneIds(state.player)).not.toContain(lane);

    const piece = state.player.inventory.find(i => i.id === relic.id) as Equipment;
    const player = equipItem(state.player, piece);
    expect(unlockedLaneIds(player)).toContain(lane);

    const laneCards = new Set(getCardLane(lane)!.cardIds);
    for (const seed of [104729, 209458, 314187]) {
        let s = seed;
        const rng = () => { s = (s * 48271) % 2147483647; return s / 2147483647; };
        const offers = rollCombatCardRewards(player, rng, 3);
        expect(offers.some(id => laneCards.has(id)), `seed ${seed}: ${offers.join(', ')}`).toBe(true);
    }
}

describe('A17 · the Chapter 1 quest pays its lane relic, and the lane follows the worn relic', () => {
    it('authors exactly the one journey below', () => {
        expect(QUEST_LIBRARY.map(q => q.name)).toEqual([WATCHTOWER_LAMP_QUEST.name]);
    });

    it('the Breakwater: the smuggler in the sea cave, the watchtower door, the Ruby Signet', () => {
        const q = WATCHTOWER_LAMP_QUEST;
        let state = walk(arrive('coastal-continent', 'breakwater'), 'bw-3', 'bw-9');
        state = takeQuest(state, 'bw-12', q);
        state = walk(state, 'bw-15', 'bw-17');
        expect(state.quests.completed).toContain(q.name);
        expect(carries(state, relicOf(q).id)).toBe(true);
        expectLaneCardOnceWorn(state, relicOf(q));
    });

    it('a quest not taken pays nothing: the door fight alone, past the sea cave, does not start it', () => {
        const state = walk(arrive('coastal-continent', 'breakwater'), 'bw-3', 'bw-9', 'bw-13', 'bw-15', 'bw-17');
        expect(state.quests.completed).not.toContain(WATCHTOWER_LAMP_QUEST.name);
        expect(carries(state, relicOf(WATCHTOWER_LAMP_QUEST).id)).toBe(false);
    });
});
