/**
 * Chapter 1 walked (phase BW1a, the Measure of the BW1 brief: A2, A3, A4,
 * A5, A12, and Decision 13's elite revival).
 *
 * Walks the live Breakwater from the windmill to the far bank through
 * the engine's public verbs, road by road (`walkRoadTo`, never a jump): the
 * windmill's arrival gives the first quest; the wreck holds the harbour; the
 * sea cave is a passage to the cove and back; each elite holds the road past
 * it (a fled attempt leaves it shut); the fishermen's camp turns in and hands
 * on; the lighthouse pays the key on arrival; a rest brings the elites back;
 * the keep gate takes the key (and refuses without it); the boss falls; the
 * bridge turns in the last quest and opens the road to the Charcoal Wood.
 * Every quest pays its XP and one relic. Every gate is asserted shut before
 * and open after.
 */

import { describe, expect, it } from 'vitest';

import {
    IllegalMoveError, legalMovesFrom, moveToNode, roadReachable, walkRoadTo,
} from '../world.reducer';
import { resolveMapEvent } from '../MapEvents/resolve-map-event';
import { takeTravel } from '../MapEvents/travel';
import { respawnElites } from '../elite-respawn';
import { acceptQuestStep, turnInQuestStep } from '../questline';
import { carriedCount } from '../quest.engine';
import { eliteRelicPool } from '../../Combat/combat.rewards';
import { relicLibrary } from '../../Items/relic.library';
import { createNewGameState, gameReducer } from '../../Game/game.reducer';
import type { GameState } from '../../Game/types';
import type { ResolvedEvent } from '../MapEvents/types';
import { BRIDGE_GATE_REASON, KEEP_GATE_REASON } from '../Continents/Coastal-Village/breakwater-chapter';
import {
    BREAKWATER_CHAPTER_QUESTLINE_ID as LINE, BREAKWATER_CHAPTER_RELICS, BREAKWATER_CHAPTER_STEPS as STEPS,
    BREAKWATER_KEEP_KEY,
} from '../breakwater-chapter.questline';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

const legal = (s: GameState) => legalMovesFrom(s.world.currentMap);
const reachable = (s: GameState) => roadReachable(s.world.currentMap);
const here = (s: GameState) => s.world.currentMap.currentNode;
const spent = (s: GameState, id: string) =>
    s.world.currentMap.completedNodes.includes(id) || s.world.currentMap.consumedNodes.includes(id);
const relicsCarried = (s: GameState) =>
    s.player.inventory.filter(i => i.category === 'equipment' && i.slot === 'relic').map(i => i.id);

/** A new game on the Breakwater, its arrival played (the windmill's cutscene). */
function newGame(): { state: GameState; event: ResolvedEvent } {
    return resolveMapEvent(createNewGameState({ startMap: 'breakwater' }), seededRng(1));
}

/** Walks the roads to `nodeId` and answers the arrival there. */
function arrive(state: GameState, nodeId: string) {
    return resolveMapEvent({ ...state, world: walkRoadTo(state.world, nodeId) }, seededRng(7));
}

/** Opens the fight at `nodeId` (walking there, or retrying it in place) and ends it with `outcome`. */
function fight(state: GameState, nodeId: string, outcome: 'victory' | 'flee'): GameState {
    const world = here(state) === nodeId ? moveToNode(state.world, nodeId) : walkRoadTo(state.world, nodeId);
    const { state: owed, event } = resolveMapEvent({ ...state, world }, seededRng(7));
    if (event.kind !== 'encounter') throw new Error(`expected a fight at ${nodeId}, got ${event.kind}`);
    const fighting = gameReducer(owed, { type: 'START_COMBAT', payload: { target: event.encounter } });
    return outcome === 'victory'
        ? gameReducer(fighting, { type: 'END_COMBAT', payload: { outcome: 'victory', grantedLoot: [], grantedXp: 0 } })
        : gameReducer(fighting, { type: 'END_COMBAT', payload: { outcome: 'flee' } });
}

const win = (state: GameState, nodeId: string) => fight(state, nodeId, 'victory');

/** Takes the trip the travel node at `nodeId` offers, after checking it is offered and moves no one. */
function travelFrom(state: GameState, nodeId: string): GameState {
    const offered = arrive(state, nodeId);
    expect(offered.event.kind).toBe('travel');
    expect(here(offered.state)).toBe(nodeId);
    return takeTravel(offered.state);
}

/** Asserts the road to `nodeId` is shut, by the quest gate's own reason. */
function expectGated(s: GameState, nodeId: string, reason: string): void {
    expect(legal(s)).not.toContain(nodeId);
    expect(() => moveToNode(s.world, nodeId)).toThrow(IllegalMoveError);
    expect(() => moveToNode(s.world, nodeId)).toThrow(reason);
}

/** Every step's relic, by step. */
const RELIC = BREAKWATER_CHAPTER_RELICS;

describe('the chapter, windmill to far bank', () => {
    it('walks every gate, quest and passage in order, paying XP and one relic per quest', () => {
        // ── The windmill: the arrival gives quest 1 ─────────────────────
        const start = newGame();
        let s = start.state;
        expect(start.event.kind).toBe('cutscene');
        expect(here(s)).toBe('bw-w1');
        expect(s.quests.active.map(q => q.name)).toEqual([STEPS.fishermen]);
        expect(legal(s)).toEqual(['bw-w2']);
        const xp0 = s.player.experience;
        expect(relicsCarried(s)).toEqual([]);

        // ── To the wreck: it holds the harbour until crossed (A3) ───────
        for (const id of ['bw-w2', 'bw-w3', 'bw-h1', 'bw-h2', 'bw-h3']) s = win(s, id);
        s = { ...s, world: moveToNode(s.world, 'bw-h4') };
        expect(legal(s)).toEqual(['bw-h3']);
        expect(() => moveToNode(s.world, 'bw-h5')).toThrow(/held until its node is settled/);
        s = resolveMapEvent(s, seededRng(3)).state;
        expect(legal(s)).toContain('bw-h5');

        // ── The sea cave: a passage down to the cove (A4) ───────────────
        s = arrive(s, 'bw-h5').state;
        expect(reachable(s)).not.toContain('bw-c0');
        s = travelFrom(s, 'bw-h6');
        expect(here(s)).toBe('bw-c0');
        expect(spent(s, 'bw-c0')).toBe(true);
        expect(legal(s)).toEqual(['bw-c1']);

        // ── The cove elite: a fled attempt leaves it shut (A3) ──────────
        s = fight(s, 'bw-c1', 'flee');
        expect(here(s)).toBe('bw-c1');
        expect(spent(s, 'bw-c1')).toBe(false);
        expect(legal(s)).not.toContain('bw-c2');
        s = win(s, 'bw-c1');
        expect(legal(s)).toContain('bw-c2');

        // ── The fishermen's camp: quest 1 met on arrival, turned in ─────
        const camp = arrive(s, 'bw-c2');
        expect(camp.event.kind === 'quest' && camp.event.stage).toBe('turn-in');
        s = gameReducer(camp.state, { type: 'TURN_IN_QUEST_STEP', payload: { questline: LINE, step: 1 } });
        expect(s.quests.completed).toEqual([STEPS.fishermen]);
        expect(relicsCarried(s)).toEqual([RELIC[1]]);
        s = gameReducer(s, { type: 'ACCEPT_QUEST_STEP', payload: { questline: LINE, step: 2 } });
        expect(s.quests.active.map(q => q.name)).toEqual([STEPS.lighthouse]);

        // ── Back up through the cave, both ways (A4) ────────────────────
        s = travelFrom(s, 'bw-c0');
        expect(here(s)).toBe('bw-h6');

        // ── Up through the town to the lighthouse elite ─────────────────
        for (const id of ['bw-t1', 'bw-t2', 'bw-t3']) s = win(s, id);
        s = arrive(s, 'bw-t5').state;
        for (const id of ['bw-t6', 'bw-l1']) s = win(s, id);
        s = arrive(s, 'bw-l3').state;
        s = { ...s, world: moveToNode(s.world, 'bw-l4') };
        expect(legal(s)).not.toContain('bw-l5');
        s = win(s, 'bw-l4');
        expect(legal(s)).toContain('bw-l5');

        // ── The lighthouse: quest 2 paid on arrival, with the key ───────
        expect(carriedCount(s.player.inventory, BREAKWATER_KEEP_KEY.id)).toBe(0);
        const light = arrive(s, 'bw-l5');
        s = light.state;
        expect(s.quests.completed).toEqual([STEPS.fishermen, STEPS.lighthouse]);
        expect(carriedCount(s.player.inventory, BREAKWATER_KEEP_KEY.id)).toBe(1);
        expect(relicsCarried(s)).toEqual([RELIC[1], RELIC[2]]);
        expect(light.event.kind === 'quest' && light.event.stage).toBe('offer');
        s = gameReducer(s, { type: 'ACCEPT_QUEST_STEP', payload: { questline: LINE, step: 3 } });
        expect(s.quests.active.map(q => q.name)).toEqual([STEPS.keep]);

        // ── A rest brings the elites back on their near side ────────────
        s = arrive(s, 'bw-w4').state;
        expect(here(s)).toBe('bw-w4');
        const revived = respawnElites(s.world);
        expect(revived.respawned).toEqual([
            { map: 'breakwater', node: 'bw-c1' },
            { map: 'breakwater', node: 'bw-l4' },
        ]);
        s = { ...s, world: revived.world };
        expect(spent(s, 'bw-l4')).toBe(false);
        expect(reachable(s)).toContain('bw-l4');
        expect(reachable(s)).not.toContain('bw-l5');
        expect(legal(s)).toEqual(expect.arrayContaining(['bw-w2', 'bw-w5']));

        // ── The keep causeway, then the keep gate (A3) ──────────────────
        s = { ...s, world: moveToNode(s.world, 'bw-w5') };
        expect(legal(s)).not.toContain('bw-k1');
        s = win(s, 'bw-w5');
        const gate = arrive(s, 'bw-k1');
        s = gate.state;
        expect(gate.event.kind === 'quest' && gate.event.stage).toBe('turn-in');
        expectGated(s, 'bw-k2', KEEP_GATE_REASON);

        // Without the key the turn-in pays nothing and opens nothing.
        const keyless: GameState = {
            ...s, player: { ...s.player, inventory: s.player.inventory.filter(i => i.id !== BREAKWATER_KEEP_KEY.id) },
        };
        const refused = turnInQuestStep(keyless, LINE, 3);
        expect(refused.state).toBe(keyless);
        expect(refused.paid).toEqual([]);
        expectGated(refused.state, 'bw-k2', KEEP_GATE_REASON);

        // With it, the key is used up and the keep gate opens.
        s = gameReducer(s, { type: 'TURN_IN_QUEST_STEP', payload: { questline: LINE, step: 3 } });
        expect(carriedCount(s.player.inventory, BREAKWATER_KEEP_KEY.id)).toBe(0);
        expect(s.quests.completed).toContain(STEPS.keep);
        expect(relicsCarried(s)).toEqual([RELIC[1], RELIC[2], RELIC[3]]);
        expect(legal(s)).toContain('bw-k2');
        s = gameReducer(s, { type: 'ACCEPT_QUEST_STEP', payload: { questline: LINE, step: 4 } });

        // ── The chapter boss ────────────────────────────────────────────
        s = win(s, 'bw-k2');
        expect(s.quests.active.find(q => q.name === STEPS.boss)?.objectives[0]?.currentCount).toBe(1);
        expect(s.quests.completed).not.toContain(STEPS.boss);

        // ── The bridge: turned in, the road on opens (A3) ───────────────
        const bridge = arrive(s, 'bw-b1');
        s = bridge.state;
        expect(bridge.event.kind === 'quest' && bridge.event.stage).toBe('turn-in');
        expectGated(s, 'bw-b2', BRIDGE_GATE_REASON);
        s = gameReducer(s, { type: 'TURN_IN_QUEST_STEP', payload: { questline: LINE, step: 4 } });
        expect(legal(s)).toContain('bw-b2');
        expect(spent(s, 'bw-b1')).toBe(true);

        // Every quest paid once: its XP and its one relic, the last one a
        // relic the elite drop also draws (A12).
        expect(s.quests.active).toEqual([]);
        expect(s.quests.completed).toEqual([STEPS.fishermen, STEPS.lighthouse, STEPS.keep, STEPS.boss]);
        expect(relicsCarried(s)).toEqual([RELIC[1], RELIC[2], RELIC[3], RELIC[4]]);
        expect(relicLibrary.find(r => r.id === RELIC[4])?.relicSource).toBe('elite');
        expect(s.player.experience).toBeGreaterThanOrEqual(xp0 + 4 * 40);

        // ── The far bank: on to the Charcoal Wood ───────────────────────
        s = travelFrom(s, 'bw-b2');
        expect(s.world.currentMap.name).toBe('charcoal-wood');
    });
});

describe('A5: a quest node reached too early refuses, and opens nothing', () => {
    /** Walks a fresh game to the lighthouse path's far side by the town, never through the cove. */
    function toTheLighthouse(): GameState {
        let s = newGame().state;
        for (const id of ['bw-w2', 'bw-w3', 'bw-h1', 'bw-t1', 'bw-t2', 'bw-t3']) s = win(s, id);
        s = arrive(s, 'bw-t5').state;
        for (const id of ['bw-t6', 'bw-l1']) s = win(s, id);
        s = arrive(s, 'bw-l3').state;
        return win(s, 'bw-l4');
    }

    it('turns the player away at the lighthouse with its own line, pays nothing, and stays unspent', () => {
        const before = toTheLighthouse();
        const early = arrive(before, 'bw-l5');
        expect(early.event.kind).toBe('quest');
        if (early.event.kind !== 'quest') return;
        expect(early.event.stage).toBe('locked');
        expect(early.event.lockedLine).toMatch(/^\[content\] The lighthouse keeper/);
        expect(early.state.quests).toEqual(before.quests);
        expect(early.state.player.inventory).toEqual(before.player.inventory);
        expect(carriedCount(early.state.player.inventory, BREAKWATER_KEEP_KEY.id)).toBe(0);
        expect(spent(early.state, 'bw-l5')).toBe(false);
        expect(acceptQuestStep(early.state, LINE, 3)).toBe(early.state);
    });

    it('turns the player away at the bridge, whose gate stays shut', () => {
        let s = newGame().state;
        for (const id of ['bw-w2', 'bw-w3', 'bw-h1', 'bw-t1', 'bw-t2']) s = win(s, id);
        const early = arrive(s, 'bw-b1');
        expect(early.event.kind === 'quest' && early.event.stage).toBe('locked');
        expect(early.event.kind === 'quest' && early.event.lockedLine).toMatch(/^\[content\] The bridge-keeper/);
        expectGated(early.state, 'bw-b2', BRIDGE_GATE_REASON);
    });

    it('carries no refusal line once the node has business', () => {
        // The camp, reached with quest 1 held, reads as a turn-in with no line.
        let s = newGame().state;
        for (const id of ['bw-w2', 'bw-w3', 'bw-h1', 'bw-h2', 'bw-h3']) s = win(s, id);
        s = arrive(s, 'bw-h4').state;
        s = arrive(s, 'bw-h5').state;
        s = travelFrom(s, 'bw-h6');
        s = win(s, 'bw-c1');
        const camp = arrive(s, 'bw-c2');
        expect(camp.event.kind === 'quest' && camp.event.stage).toBe('turn-in');
        expect(camp.event.kind === 'quest' && 'lockedLine' in camp.event).toBe(false);
    });
});

describe('A12: the elite drop is unchanged', () => {
    it('still draws only the elite-drop relics when a fight lists none', () => {
        const player = createNewGameState({ startMap: 'breakwater' }).player;
        expect(eliteRelicPool(player).map(r => r.id)).toEqual(
            relicLibrary.filter(r => r.relicSource === 'elite').map(r => r.id),
        );
    });
});
