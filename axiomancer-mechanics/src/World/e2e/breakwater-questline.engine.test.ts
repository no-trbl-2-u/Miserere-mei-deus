/**
 * The Breakwater's questline on the live map (phase QL1d: A16, A18 of the QL1
 * brief).
 *
 *   A16 the routing proof: with the markers settled in order every node is
 *       reachable; with no step accepted a full roam never touches a pocket,
 *       the watchtower or the bridge, and never enters a locked marker; with
 *       step k accepted only pocket k opens and marker k+1 stays shut until
 *       step k is met; the watchtower holds the bridge until the boss falls,
 *       and step 4 needs steps 1-3 turned in.
 *   A18 the walk: from a fresh game, all four steps by engine calls, to the
 *       Belt in the satchel with the bridge open; worn, it opens the
 *       Elementalist lane and the next combat reward holds its card.
 *
 * Everything runs on the registered Breakwater and its registered questline
 * (`quest.library.ts`), through the reducer the app dispatches to.
 */

import { describe, it, expect } from 'vitest';

import { legalMovesFrom, moveToNode, isNodeSpent } from '../world.reducer';
import { createMapState, getMapDefinition } from '../map.registry';
import { resolveMapEvent } from '../MapEvents/resolve-map-event';
import {
    getQuestline, listQuestlines, registerQuestline, _unregisterQuestline,
    questStepState, questStepView, turnInQuestStep, acceptQuestStep,
} from '../questline';
import { reachableUnder } from '../questline-supply';
import { BREAKWATER_QUESTLINE, BREAKWATER_QUESTLINE_ID } from '../quest.library';
import '../index';
import { createNewGameState, gameReducer } from '../../Game/game.reducer';
import type { GameState } from '../../Game/types';
import type { Encounter } from '../types';
import { equipItem } from '../../Character/equipment.reducer';
import { unlockedLaneIds, rollCombatCardRewards } from '../../Combat/combat.rewards';
import { laneRewardPool } from '../../Cards/card.lanes';
import type { Equipment } from '../../Items/types';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

const LINE = BREAKWATER_QUESTLINE_ID;
const DEF = getMapDefinition('coastal-continent', 'breakwater');
const POCKETS: Readonly<Record<number, readonly string[]>> = {
    1: ['bw-3', 'bw-12'],
    2: ['bw-2', 'bw-10', 'bw-14'],
    3: ['bw-6', 'bw-8'],
    4: ['bw-17'],
};
const ALL_POCKET_NODES = Object.values(POCKETS).flat();
const MARKERS = ['bw-19', 'bw-20', 'bw-21', 'bw-22'];

const map = (s: GameState) => s.world.currentMap;
const legal = (s: GameState) => legalMovesFrom(map(s));
const step = (s: GameState, n: number) => questStepState(s.quests, BREAKWATER_QUESTLINE.steps[n - 1]!);

/** A fresh game on the Breakwater, the windmill's arrival resolved. */
function freshGame(): GameState {
    const base = createNewGameState({ startMap: 'breakwater' });
    return resolveMapEvent(base, seededRng(1)).state;
}

/** Walks onto `nodeId` and resolves its arrival. */
function arrive(state: GameState, nodeId: string) {
    const moved: GameState = { ...state, world: moveToNode(state.world, nodeId) };
    return resolveMapEvent(moved, seededRng(7));
}

function quest(state: GameState, nodeId: string) {
    const { state: after, event } = arrive(state, nodeId);
    if (event.kind !== 'quest') throw new Error(`expected a quest node at ${nodeId}, got ${event.kind}`);
    return { state: after, event };
}

function endFight(state: GameState, target: Encounter, outcome: 'victory' | 'flee' | 'defeat'): GameState {
    const fighting = gameReducer(state, { type: 'START_COMBAT', payload: { target } });
    return gameReducer(fighting, { type: 'END_COMBAT', payload: { outcome, grantedLoot: [], grantedXp: 0 } });
}

function fightAt(state: GameState, nodeId: string, outcome: 'victory' | 'flee' | 'defeat' = 'victory'): GameState {
    const { state: owed, event } = arrive(state, nodeId);
    if (event.kind !== 'encounter') throw new Error(`expected a fight at ${nodeId}, got ${event.kind}`);
    return endFight(owed, event.encounter, outcome);
}

const accept = (s: GameState, n: number) => gameReducer(s, { type: 'ACCEPT_QUEST_STEP', payload: { questline: LINE, step: n } });
const turnIn = (s: GameState, n: number) => gameReducer(s, { type: 'TURN_IN_QUEST_STEP', payload: { questline: LINE, step: n } });

/** The pockets open at `s`: every pocket node on the frontier, by pocket. */
function openPockets(s: GameState): number[] {
    const moves = new Set(legal(s));
    return Object.entries(POCKETS)
        .filter(([, nodes]) => nodes.some(id => moves.has(id)))
        .map(([k]) => Number(k));
}

/** Steps 1-3 played and turned in, step 4 accepted at bw-22. */
function atTheWatchtowerRoad(): GameState {
    let s = freshGame();
    s = accept(quest(s, 'bw-19').state, 1);
    s = arrive(s, 'bw-3').state;
    s = arrive(s, 'bw-4').state;
    s = arrive(s, 'bw-9').state;
    s = accept(turnIn(quest(s, 'bw-20').state, 1), 2);
    s = fightAt(s, 'bw-2');
    s = fightAt(s, 'bw-10');
    s = arrive(s, 'bw-7').state;
    s = accept(turnIn(quest(s, 'bw-21').state, 2), 3);
    s = fightAt(s, 'bw-8');
    s = arrive(s, 'bw-13').state;
    s = arrive(s, 'bw-15').state;
    return accept(turnIn(quest(s, 'bw-22').state, 3), 4);
}

describe('the registry holds the Breakwater questline from module load', () => {
    it('lists it, finds it by id, and reads its nodes as their stages', () => {
        expect(getQuestline(LINE)).toBe(BREAKWATER_QUESTLINE);
        expect(listQuestlines()).toContain(BREAKWATER_QUESTLINE);
        expect(BREAKWATER_QUESTLINE.steps.map(st => st.nodeId)).toEqual(MARKERS);
        const s = freshGame();
        expect(quest(s, 'bw-19').event.stage).toBe('offer');
    });

    it('an unregistered line reads node 1 as an offer and every later node as locked; re-registering restores it', () => {
        _unregisterQuestline(LINE);
        try {
            expect(getQuestline(LINE)).toBeUndefined();
            expect(listQuestlines()).not.toContain(BREAKWATER_QUESTLINE);
            const pre: GameState = { ...freshGame() };
            const at22: GameState = {
                ...pre,
                world: { ...pre.world, currentMap: { ...map(pre), currentNode: 'bw-22', pendingArrival: 'bw-22', blockedRoutes: [] } },
            };
            const { event } = resolveMapEvent(at22, seededRng(3));
            expect(event).toMatchObject({ kind: 'quest', node: 4, stage: 'locked' });
        } finally {
            registerQuestline(BREAKWATER_QUESTLINE);
        }
        expect(getQuestline(LINE)).toBe(BREAKWATER_QUESTLINE);
    });

    it('a pre-QL1 save (no seeded locks) standing on bw-22 reads it locked and does not crash', () => {
        const s = freshGame();
        const old: GameState = {
            ...s,
            world: { ...s.world, currentMap: { ...map(s), blockedRoutes: [], currentNode: 'bw-22', pendingArrival: 'bw-22' } },
        };
        const { event, state } = resolveMapEvent(old, seededRng(3));
        expect(event).toMatchObject({ kind: 'quest', node: 4, stage: 'locked' });
        expect(isNodeSpent(map(state), 'bw-22')).toBe(false);
    });
});

describe('A16: the questline can be neither skipped nor spent early', () => {
    it('(a) with the markers and the watchtower settled and the locks open, every node is reachable', () => {
        const settled = new Set([...MARKERS, 'bw-17']);
        const open = BREAKWATER_QUESTLINE.steps.flatMap(st => st.opensOnReady ?? []);
        expect([...reachableUnder(DEF, settled, open)].sort()).toEqual(DEF.nodes.map(n => n.id).sort());
    });

    it('(b) with no step accepted, a roam of every legal move never touches a pocket, the watchtower, the bridge or a locked marker', () => {
        let s = freshGame();
        const entered = new Set<string>(['bw-1']);
        for (let guard = 0; guard < 50; guard++) {
            const next = legal(s).find(id => !entered.has(id));
            if (!next) break;
            entered.add(next);
            s = arrive(s, next).state;
        }
        expect(legal(s).every(id => entered.has(id))).toBe(true);
        for (const id of [...ALL_POCKET_NODES, 'bw-18', 'bw-20', 'bw-21', 'bw-22']) {
            expect(entered.has(id), `${id} was entered before any step was accepted`).toBe(false);
        }
        // The open fan and marker 1 are all there is.
        expect([...entered].sort()).toEqual(['bw-1', 'bw-11', 'bw-13', 'bw-15', 'bw-16', 'bw-19', 'bw-4', 'bw-5', 'bw-7', 'bw-9'].sort());
        expect(s.quests.active).toEqual([]);
    });

    it('(c) with step k accepted only pocket k opens, and marker k+1 stays shut until step k is met', () => {
        let s = freshGame();
        // The windmill's fan, walked before anything is accepted.
        for (const id of ['bw-4', 'bw-5', 'bw-7', 'bw-9', 'bw-11', 'bw-13', 'bw-15', 'bw-16']) s = arrive(s, id).state;
        expect(openPockets(s)).toEqual([]);

        s = accept(quest(s, 'bw-19').state, 1);
        expect(openPockets(s)).toEqual([1]);
        expect(legal(s)).not.toContain('bw-20');
        s = arrive(s, 'bw-3').state;
        expect(step(s, 1)).toBe('ready');
        expect(legal(s)).toContain('bw-20');
        expect(legal(s)).not.toContain('bw-21');

        s = accept(turnIn(quest(s, 'bw-20').state, 1), 2);
        expect(openPockets(s)).toEqual([1, 2]);
        s = fightAt(s, 'bw-2');
        expect(legal(s)).not.toContain('bw-21');
        s = fightAt(s, 'bw-10');
        expect(step(s, 2)).toBe('ready');
        expect(legal(s)).toContain('bw-21');
        expect(legal(s)).not.toContain('bw-22');

        s = accept(turnIn(quest(s, 'bw-21').state, 2), 3);
        expect(openPockets(s)).toEqual([1, 2, 3]);
        s = fightAt(s, 'bw-8');
        expect(step(s, 3)).toBe('ready');
        expect(legal(s)).toContain('bw-22');
        expect(legal(s)).not.toContain('bw-17');

        s = accept(turnIn(quest(s, 'bw-22').state, 3), 4);
        expect(openPockets(s)).toEqual([1, 2, 3, 4]);
        expect(legal(s)).not.toContain('bw-18');
    });

    it('(d) a defeat or a flee at bw-17 leaves it unspent with the bridge shut; a retry offers the fight; a victory opens the bridge', () => {
        for (const outcome of ['defeat', 'flee'] as const) {
            let s = fightAt(atTheWatchtowerRoad(), 'bw-17', outcome);
            expect(map(s).currentNode).toBe('bw-17');
            expect(isNodeSpent(map(s), 'bw-17')).toBe(false);
            expect(map(s).pendingArrival ?? null).toBeNull();
            expect(legal(s)).not.toContain('bw-18');
            expect(step(s, 4)).toBe('active');

            // The retry: the node underfoot is owed again and offers the fight.
            const retried: GameState = { ...s, world: moveToNode(s.world, 'bw-17') };
            expect(map(retried).pendingArrival).toBe('bw-17');
            const { state: owed, event } = resolveMapEvent(retried, seededRng(9));
            expect(event).toMatchObject({ kind: 'encounter', isBoss: true });
            if (event.kind !== 'encounter') return;
            s = endFight(owed, event.encounter, 'victory');
            expect(isNodeSpent(map(s), 'bw-17')).toBe(true);
            expect(legal(s)).toContain('bw-18');
        }
    });

    it('(e) step 4 cannot be accepted until steps 1-3 are turned in', () => {
        let s = freshGame();
        s = accept(quest(s, 'bw-19').state, 1);
        s = arrive(s, 'bw-3').state;
        s = arrive(s, 'bw-4').state;
        s = arrive(s, 'bw-9').state;
        s = accept(turnIn(quest(s, 'bw-20').state, 1), 2);
        s = fightAt(s, 'bw-2');
        s = fightAt(s, 'bw-10');
        s = arrive(s, 'bw-7').state;
        s = accept(turnIn(quest(s, 'bw-21').state, 2), 3);
        s = fightAt(s, 'bw-8');
        s = arrive(s, 'bw-13').state;
        s = arrive(s, 'bw-15').state;
        const at22 = quest(s, 'bw-22');
        expect(at22.event.stage).toBe('turn-in');
        // Step 3 ready but not turned in: accepting step 4 changes nothing.
        expect(acceptQuestStep(at22.state, LINE, 4)).toBe(at22.state);
        expect(accept(at22.state, 4)).toBe(at22.state);
        expect(legal(at22.state)).not.toContain('bw-17');
    });
});

describe('A18: the questline walked from a fresh game to the Belt worn', () => {
    it('pays each step at the next marker, the boss pays the Belt with the bridge open, and the worn Belt opens the Elementalist lane', () => {
        let s = freshGame();
        const xp0 = s.player.experience;
        const coin0 = s.player.currency;

        // Step 1: accept at bw-19, cross the Gallows Hill hazard.
        const offer1 = quest(s, 'bw-19');
        expect(offer1.event.stage).toBe('offer');
        s = accept(offer1.state, 1);
        s = arrive(s, 'bw-3').state;
        expect(step(s, 1)).toBe('ready');

        // Turn in at bw-20 (40 XP, 10 shillings), accept step 2.
        s = arrive(s, 'bw-4').state;
        s = arrive(s, 'bw-9').state;
        const at20 = quest(s, 'bw-20');
        expect(at20.event.stage).toBe('turn-in');
        const coinBefore = at20.state.player.currency;
        s = turnIn(at20.state, 1);
        expect(step(s, 1)).toBe('completed');
        // A completed step reads full, and completed, wherever it is shown.
        const done = questStepView(s.quests, BREAKWATER_QUESTLINE, BREAKWATER_QUESTLINE.steps[0]!);
        expect(done.status).toBe('completed');
        expect(done.objectives.map(o => o.currentCount)).toEqual(done.objectives.map(o => o.requiredCount));
        expect(s.player.experience).toBe(xp0 + 40);
        expect(s.player.currency).toBe(coinBefore + 10);
        expect(coinBefore).toBeGreaterThanOrEqual(coin0);
        s = accept(s, 2);

        // Step 2: two fights in the pocket; turn in at bw-21 (a potion).
        s = fightAt(s, 'bw-2');
        s = fightAt(s, 'bw-10');
        expect(step(s, 2)).toBe('ready');
        s = arrive(s, 'bw-7').state;
        const at21 = quest(s, 'bw-21');
        expect(at21.event.stage).toBe('turn-in');
        s = turnIn(at21.state, 2);
        expect(s.player.inventory.some(i => i.id === 'minor-healing-potion')).toBe(true);
        s = accept(s, 3);

        // Step 3: the elite on the North Pier; turn in at bw-22 (a card pick).
        s = fightAt(s, 'bw-8');
        expect(step(s, 3)).toBe('ready');
        s = arrive(s, 'bw-13').state;
        s = arrive(s, 'bw-15').state;
        const at22 = quest(s, 'bw-22');
        expect(at22.event.stage).toBe('turn-in');
        const paid = turnInQuestStep(at22.state, LINE, 3, seededRng(5));
        expect(paid.paid[0]?.cardOffers).toHaveLength(3);
        s = accept(paid.state, 4);
        expect(questStepView(s.quests, BREAKWATER_QUESTLINE, BREAKWATER_QUESTLINE.steps[3]!).objectives[0]?.currentCount).toBe(0);

        // Step 4: the watchtower boss pays on the victory, the Belt included.
        expect(s.player.inventory.some(i => i.id === 'relic-elementalist-belt')).toBe(false);
        s = fightAt(s, 'bw-17');
        expect(step(s, 4)).toBe('completed');
        const belt = s.player.inventory.find(i => i.id === 'relic-elementalist-belt') as Equipment | undefined;
        expect(belt).toBeDefined();
        expect(legal(s)).toContain('bw-18');

        // Carried unworn, the Belt opens nothing; worn, it opens its lane.
        expect(unlockedLaneIds(s.player)).not.toContain('elementalist');
        const worn = equipItem(s.player, belt!);
        expect(unlockedLaneIds(worn)).toContain('elementalist');
        const lane = new Set(laneRewardPool(['elementalist']));
        const offers = rollCombatCardRewards(worn, seededRng(11));
        expect(offers.some(id => lane.has(id))).toBe(true);
    });

    it('resolving a marker before its step is accepted leaves its pocket shut, even in the legacy unlock lists', () => {
        const { state } = quest(freshGame(), 'bw-19');
        expect(isNodeSpent(map(state), 'bw-19')).toBe(false);
        for (const id of POCKETS[1]!) {
            expect(map(state).availableNodes).not.toContain(id);
            expect(legal(state)).not.toContain(id);
        }
        // An unheld node's arrival opens its neighbours in the same lists.
        const fan = arrive(freshGame(), 'bw-4').state;
        expect(map(fan).availableNodes).toEqual(expect.arrayContaining(['bw-7', 'bw-9']));
    });

    it('a fresh Breakwater map seeds the four quest-node locks', () => {
        const fresh = createMapState(DEF);
        expect(fresh.blockedRoutes.map(r => `${r.from}-${r.to}`).sort()).toEqual(
            ['bw-15-bw-22', 'bw-16-bw-22', 'bw-7-bw-21', 'bw-9-bw-20'],
        );
        expect(fresh.blockedRoutes.every(r => r.reason.length > 0)).toBe(true);
    });
});
