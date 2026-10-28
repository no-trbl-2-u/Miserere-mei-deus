/**
 * The questline contract (phase QL1a, A1-A4 of the QL1 brief).
 *
 *   A1  the `quest` map-event kind resolves a staged payload.
 *   A2  a quest pays several rewards in order (XP, shillings, an item, a card
 *       pick), and a held quest that fills is neither completed nor paid.
 *   A3  kill objectives count by foe class on the quest's own map; a hazard
 *       objective counts each hazard node resolved.
 *   A4  no save migration: a save made before QL1 loads and reads the new kind.
 *
 * The step rules (accept, turn in, locks) are QL1b's; here a fixture quest
 * stands in for a questline step.
 */

import { describe, it, expect } from 'vitest';

import {
    payQuestReward, payCompletedQuests, settleKill, startQuest, emptyQuestLog,
    progressQuest, completeQuest, advanceHazardObjectives,
} from '../quest.engine';
import { resolveMapEvent, getMapDefinition, createMapState } from '../index';
import { ACT1_WALK_EVENT_KINDS } from '../act1-walk';
import { createNewGameState, gameReducer, GAME_STATE_VERSION } from '../../Game/game.reducer';
import { migrate } from '../../Game/game.migrate';
import type { GameState } from '../../Game/types';
import { FIXTURE_QUEST } from '../../Game/fixtures/fixture-content';
import { ENEMY_REGISTRY } from '../../Enemy/enemy.library';
import { getRelicById } from '../../Items/relic.library';
import type { Quest, QuestObjective, Reward } from '../types';
import type { QuestPayload } from '../MapEvents/types';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

const FLOAT_EYE = ENEMY_REGISTRY['float-eye'];
const GREEN_JELLY = ENEMY_REGISTRY['green-jelly'];
const BOSS = ENEMY_REGISTRY['death-beholder'];

const XP: Reward = { kind: 'experience', amount: 40 };
const SHILLINGS: Reward = { kind: 'currency', amount: 10 };

/** The fixture quest with its objectives (and optionally more) swapped in. */
function quest(objectives: Partial<QuestObjective>[], extra: Partial<Quest> = {}): Quest {
    return {
        ...FIXTURE_QUEST,
        objectives: objectives.map((o, i) => ({
            id: `obj-${i}`, type: 'kill', description: 'fixture', requiredCount: 1, currentCount: 0, ...o,
        })),
        reward: XP,
        ...extra,
    };
}

/** A Breakwater state standing on `nodeId` with `q` active. */
function stateWith(q: Quest, nodeId = 'bw-1'): GameState {
    const base = createNewGameState({ startMap: 'breakwater' });
    const def = getMapDefinition('coastal-continent', 'breakwater');
    return {
        ...base,
        world: { ...base.world, currentMap: { ...createMapState(def), currentNode: nodeId } },
        quests: startQuest(emptyQuestLog(), q),
    };
}

/** Fights `foe` to a verdict from `state` through the real reducer. */
function fight(state: GameState, foe: typeof BOSS, outcome: 'victory' | 'friendship' | 'defeat' | 'flee'): GameState {
    const staged = gameReducer(state, { type: 'START_COMBAT', payload: { target: foe } });
    return gameReducer(staged, {
        type: 'END_COMBAT', payload: { outcome, grantedLoot: [], grantedXp: 0 },
    });
}

const QUEST_NODE_1: QuestPayload = { kind: 'quest', questline: 'fixture-line', node: 1 };

describe('A1: the quest map-event kind', () => {
    it('resolves a staged quest payload to the offer at node 1 and consumes nothing', () => {
        const state = createNewGameState({ startMap: 'breakwater' });
        const nodeId = state.world.currentMap.currentNode;
        const { state: after, event } = resolveMapEvent(state, () => 0.5, QUEST_NODE_1);
        expect(event).toMatchObject({ kind: 'quest', questline: 'fixture-line', node: 1, stage: 'offer' });
        expect(after.world.currentMap.consumedNodes).not.toContain(nodeId);
        expect(after.player).toBe(state.player);
        expect(after.quests).toBe(state.quests);
    });

    it('reads a later node as locked until the step rules (QL1b) look at the log', () => {
        const state = createNewGameState({ startMap: 'breakwater' });
        const { event } = resolveMapEvent(state, () => 0.5, { ...QUEST_NODE_1, node: 2, description: 'x' });
        expect(event).toMatchObject({ kind: 'quest', node: 2, stage: 'locked', description: 'x' });
    });

    it('is one of the thirteen kinds the Act 1 audit lists', () => {
        expect(ACT1_WALK_EVENT_KINDS).toHaveLength(13);
        expect(ACT1_WALK_EVENT_KINDS).toContain('quest');
    });
});

describe('A2: rewards paid in order, and a held quest', () => {
    const player = createNewGameState({ startMap: 'breakwater' }).player;
    const relicReward = { kind: 'item', item: getRelicById('relic-disarming-plea')! } as const;

    it('pays XP, shillings and an item in one call, and a bare `reward` pays as before', () => {
        const out = payQuestReward(player, quest([{}], { rewards: [SHILLINGS, relicReward] }));
        expect(out.player.experience).toBe(player.experience + 40);
        expect(out.player.currency).toBe(player.currency + 10);
        expect(out.paid.items.map(i => i.id)).toEqual([relicReward.item.id]);
        expect(out.paid.rewards).toEqual([XP, SHILLINGS, relicReward]);

        const bare = payQuestReward(player, quest([{}]));
        expect(bare.player.experience).toBe(player.experience + 40);
        expect(bare.paid.rewards).toEqual([XP]);
        expect(bare.paid.cardOffers).toBeUndefined();
    });

    it('a card-pick rolls its offers onto the paid record and adds no card', () => {
        const q = quest([{}], { rewards: [{ kind: 'card-pick', count: 3 }] });
        const out = payQuestReward(player, q, seededRng(4242));
        expect(out.paid.cardOffers).toHaveLength(3);
        expect(out.player.knownCards).toEqual(player.knownCards);
        expect(out.player.combatRewardCards).toEqual(player.combatRewardCards);
        expect(out.player.experience).toBe(player.experience + 40);
    });

    it('a held quest that fills stays active and pays nothing', () => {
        const held = quest([{ type: 'flag', target: 'x' }], { holdForTurnIn: true });
        const log = startQuest(emptyQuestLog(), held);
        const step = progressQuest(log, held.name, 'obj-0');
        expect(step.completedName).toBeUndefined();
        expect(step.log.completed).toEqual([]);
        expect(step.log.active[0]!.objectives[0]!.currentCount).toBe(1);
        expect(payCompletedQuests(player, log, step.log).paid).toEqual([]);
    });

    it('a held quest completed by hand pays once through the one door', () => {
        const held = quest([{}], { holdForTurnIn: true, rewards: [SHILLINGS] });
        const before = startQuest(emptyQuestLog(), held);
        const after = completeQuest(before, held.name);
        const paid = payCompletedQuests(player, before, after);
        expect(paid.player.experience).toBe(player.experience + 40);
        expect(paid.player.currency).toBe(player.currency + 10);
        expect(paid.paid).toHaveLength(1);
    });

    it('an unheld quest with a card-pick pays through payCompletedQuests with offers', () => {
        const q = quest([{}], { rewards: [{ kind: 'card-pick', count: 2 }] });
        const before = startQuest(emptyQuestLog(), q);
        const after = completeQuest(before, q.name);
        const paid = payCompletedQuests(player, before, after, seededRng(4242));
        expect(paid.paid[0]!.cardOffers).toHaveLength(2);
    });
});

describe('A3: kills by foe class and hazards, on the quest map only', () => {
    function counts(foeClass: 'any' | 'elite' | 'boss', foe: typeof BOSS, nodeMap = 'breakwater'): number {
        const q = quest([{ foeClass, requiredCount: 9 }], { holdForTurnIn: true, mapName: nodeMap as Quest['mapName'] });
        const won = fight(stateWith(q), foe, 'victory');
        return won.quests.active[0]?.objectives[0]?.currentCount ?? -1;
    }

    it('an `any` objective counts a normal foe, the elite and the boss', () => {
        expect(counts('any', FLOAT_EYE)).toBe(1);
        expect(counts('any', GREEN_JELLY)).toBe(1);
        expect(counts('any', BOSS)).toBe(1);
    });

    it('an `elite` objective counts only the elite', () => {
        expect(counts('elite', FLOAT_EYE)).toBe(0);
        expect(counts('elite', GREEN_JELLY)).toBe(1);
        expect(counts('elite', BOSS)).toBe(0);
    });

    it('a `boss` objective counts only the boss', () => {
        expect(counts('boss', FLOAT_EYE)).toBe(0);
        expect(counts('boss', GREEN_JELLY)).toBe(0);
        expect(counts('boss', BOSS)).toBe(1);
    });

    it('a friendship counts as a won fight', () => {
        const q = quest([{ foeClass: 'any', requiredCount: 9 }]);
        const out = fight(stateWith(q), FLOAT_EYE, 'friendship');
        expect(out.quests.active[0]!.objectives[0]!.currentCount).toBe(1);
    });

    it('a flee and a defeat count nothing', () => {
        const q = quest([{ foeClass: 'any', requiredCount: 9 }]);
        for (const outcome of ['flee', 'defeat'] as const) {
            const out = fight(stateWith(q), FLOAT_EYE, outcome);
            expect(out.quests.active[0]!.objectives[0]!.currentCount).toBe(0);
        }
    });

    it('a win on another map counts nothing', () => {
        const q = quest([{ foeClass: 'any', requiredCount: 9 }], { mapName: 'charcoal-wood' });
        const out = fight(stateWith(q), FLOAT_EYE, 'victory');
        expect(out.quests.active[0]!.objectives[0]!.currentCount).toBe(0);
    });

    it('a bare name carries no difficulty: it fills a name target and an any-class one, never an elite one', () => {
        const player = createNewGameState({ startMap: 'breakwater' }).player;
        const classQ = quest([{ foeClass: 'elite' }]);
        const nameQ = quest([{ target: FLOAT_EYE.name }]);
        const log = (q: Quest) => startQuest(emptyQuestLog(), q);
        expect(settleKill(player, log(classQ), FLOAT_EYE.name, 'breakwater').quests.completed).toEqual([]);
        expect(settleKill(player, log(nameQ), FLOAT_EYE.name, 'breakwater').quests.completed).toEqual([nameQ.name]);
    });

    it('a hazard resolved counts once, whatever its outcome, on the quest map', () => {
        const q = quest([{ type: 'hazard', requiredCount: 2 }], { holdForTurnIn: true });
        const state = stateWith(q, 'bw-3');
        const { state: after, event } = resolveMapEvent(state, () => 0.5);
        expect(event.kind).toBe('hazard');
        expect(after.quests.active[0]!.objectives[0]!.currentCount).toBe(1);
        // Re-resolving the spent node counts nothing more.
        const again = resolveMapEvent(after, () => 0.5);
        expect(again.state.quests.active[0]!.objectives[0]!.currentCount).toBe(1);
    });

    it('a card-pick paid through resolveMapEvent draws from the passed rng, not the global one', () => {
        const q = quest([{ type: 'hazard' }], { rewards: [{ kind: 'card-pick', count: 3 }] });
        const draws = (): number => {
            const rng = seededRng(77);
            let calls = 0;
            resolveMapEvent(stateWith(q, 'bw-3'), () => { calls += 1; return rng(); });
            return calls;
        };
        // The pool roll takes one draw; the card pick takes more from the same rng.
        expect(draws()).toBeGreaterThan(1);
        expect(draws()).toBe(draws());
    });

    it('a hazard on another map counts nothing', () => {
        const q = quest([{ type: 'hazard', requiredCount: 2 }], { mapName: 'charcoal-wood' });
        const log = startQuest(emptyQuestLog(), q);
        expect(advanceHazardObjectives(log, 'breakwater').log).toBe(log);
    });

    it('a hazard that fills the objective pays an unheld quest through the door', () => {
        const q = quest([{ type: 'hazard' }]);
        const state = stateWith(q, 'bw-3');
        const { state: after } = resolveMapEvent(state, () => 0.5);
        expect(after.quests.completed).toContain(q.name);
        expect(after.player.experience).toBe(state.player.experience + 40);
    });
});

describe('A4: no save migration', () => {
    it('a save made before QL1 loads at the current version and reads a quest node', () => {
        const fresh = createNewGameState({ startMap: 'breakwater' });
        const raw = JSON.parse(JSON.stringify(fresh)) as Record<string, unknown>;
        // A pre-QL1 save holds none of the new fields.
        expect(JSON.stringify(raw)).not.toContain('holdForTurnIn');
        expect(JSON.stringify(raw)).not.toContain('questline');
        const loaded = migrate(raw, GAME_STATE_VERSION);
        expect(loaded.version).toBe(GAME_STATE_VERSION);
        expect(loaded.quests).toEqual(fresh.quests);
        const { event } = resolveMapEvent(loaded, () => 0.5, { ...QUEST_NODE_1, node: 4 });
        expect(event).toMatchObject({ kind: 'quest', stage: 'locked' });
    });

    it('a quest log carrying the new optional fields round-trips through JSON', () => {
        const q = quest([{ foeClass: 'elite' }], {
            questline: 'fixture-line', step: 2, holdForTurnIn: true,
            rewards: [SHILLINGS, { kind: 'card-pick', count: 3 }],
        });
        const state = stateWith(q);
        const back = JSON.parse(JSON.stringify(state)) as GameState;
        expect(back.quests).toEqual(state.quests);
    });
});
