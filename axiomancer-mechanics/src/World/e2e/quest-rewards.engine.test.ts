/**
 * Quest rewards on every completion path (phase LR1c, A6 of the LR1 brief).
 *
 * One function pays a completed quest's reward (`payCompletedQuests`), and
 * every path that can complete a quest calls it: `endCombat`'s kill
 * objectives, the hazard host's kill (`settleKill`), `reach` and `collect` in
 * `resolveMapEvent`, and the dialogue `progressQuest` / `completeQuest`
 * effects. `currency` and `experience` pay their amount; an `Item` or
 * `{ kind: 'item' }` reward lands in the inventory. Each path is pinned with
 * the fixture quest (re-pointed per objective) and the fixture quest relic.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import {
    payCompletedQuests, payQuestReward, settleKill, startQuest, emptyQuestLog, newlyCompletedQuests,
} from '../quest.engine';
import { resolveMapEvent, applyDialogueChoice, getMapDefinition, createMapState } from '../index';
import { createNewGameState, gameReducer } from '../../Game/game.reducer';
import type { GameState } from '../../Game/types';
import { mockSequentialRng } from '../../test-utils/rng';
import { FIXTURE_QUEST, FIXTURE_QUEST_RELIC } from '../../Game/fixtures/fixture-content';
import { ENEMY_REGISTRY } from '../../Enemy/enemy.library';
import type { Quest, QuestObjective, Reward } from '../types';
import type { DialogueChoice, DialogueTree } from '../../NPCs/types';

afterEach(() => vi.restoreAllMocks());

const FOE = ENEMY_REGISTRY['death-beholder'];
const RELIC_REWARD: Reward = { kind: 'item', item: FIXTURE_QUEST_RELIC };

/** The fixture quest with one objective and a reward swapped in. */
function quest(objective: Partial<QuestObjective>, reward: Reward = RELIC_REWARD): Quest {
    return {
        ...FIXTURE_QUEST,
        objectives: [{ ...FIXTURE_QUEST.objectives[0]!, ...objective }],
        reward,
    };
}

/** A Breakwater state standing on `nodeId`, with `q` active. */
function stateWith(q: Quest, nodeId = 'bw-1'): GameState {
    const base = createNewGameState({ startMap: 'breakwater' });
    const def = getMapDefinition('coastal-continent', 'breakwater');
    return {
        ...base,
        world: { ...base.world, currentMap: { ...createMapState(def), currentNode: nodeId } },
        quests: startQuest(emptyQuestLog(), q),
    };
}

function relicCount(state: Pick<GameState, 'player'>): number {
    return state.player.inventory.filter(i => i.id === FIXTURE_QUEST_RELIC.id).length;
}

const KILL = quest({ id: 'kill-foe', type: 'kill', target: FOE.name });

describe('payQuestReward', () => {
    const player = createNewGameState({ startMap: 'breakwater' }).player;

    it('pays currency and experience by their amount', () => {
        const gold = payQuestReward(player, quest({}, { kind: 'currency', amount: 7 }));
        expect(gold.player.currency).toBe(player.currency + 7);
        const xp = payQuestReward(player, quest({}, { kind: 'experience', amount: 9 }));
        expect(xp.player.experience).toBe(player.experience + 9);
        expect(xp.paid.items).toEqual([]);
    });

    it('grants an `{ kind: "item" }` reward and a bare `Item` reward to the inventory, unworn', () => {
        for (const reward of [RELIC_REWARD, FIXTURE_QUEST_RELIC] as Reward[]) {
            const out = payQuestReward(player, quest({}, reward));
            expect(relicCount(out)).toBe(1);
            expect(out.paid.items.map(i => i.id)).toEqual([FIXTURE_QUEST_RELIC.id]);
            expect(out.player.equipment).toEqual(player.equipment);
        }
    });

    it('pays nothing for a card or a bare tag reward', () => {
        for (const reward of ['quest', { kind: 'card', cardId: 'x' }] as Reward[]) {
            expect(payQuestReward(player, quest({}, reward)).player).toBe(player);
        }
    });
});

describe('payCompletedQuests pays each newly completed quest once', () => {
    it('ignores quests that were already completed before', () => {
        const player = createNewGameState({ startMap: 'breakwater' }).player;
        const before = startQuest(emptyQuestLog(), KILL);
        const after = { ...before, active: [], completed: [KILL.name] };
        expect(newlyCompletedQuests(before, after).map(q => q.name)).toEqual([KILL.name]);
        const once = payCompletedQuests(player, before, after);
        expect(relicCount(once)).toBe(1);
        const again = payCompletedQuests(once.player, after, after);
        expect(again.paid).toEqual([]);
        expect(again.player).toBe(once.player);
    });
});

describe('every completion path pays the quest reward', () => {
    it('endCombat: a kill objective completed by a won fight pays', () => {
        const staged = gameReducer(stateWith(KILL), { type: 'START_COMBAT', payload: { target: FOE } });
        const won = gameReducer(staged, {
            type: 'END_COMBAT', payload: { outcome: 'victory', grantedLoot: [], grantedXp: 0 },
        });
        expect(won.quests.completed).toContain(KILL.name);
        expect(relicCount(won)).toBe(1);
    });

    it('endCombat: currency and experience rewards still pay as before', () => {
        const goldQuest = quest({ id: 'kill-foe', type: 'kill', target: FOE.name }, { kind: 'currency', amount: 5 });
        const start = stateWith(goldQuest);
        const staged = gameReducer(start, { type: 'START_COMBAT', payload: { target: FOE } });
        const won = gameReducer(staged, {
            type: 'END_COMBAT', payload: { outcome: 'victory', grantedLoot: [], grantedXp: 0 },
        });
        expect(won.player.currency).toBe(start.player.currency + 5);
    });

    it('the hazard host: settleKill advances the kill and pays', () => {
        const start = stateWith(KILL);
        const out = settleKill(start.player, start.quests, FOE.name, start.world.currentMap.name);
        expect(out.quests.completed).toContain(KILL.name);
        expect(out.paid.map(p => p.questName)).toEqual([KILL.name]);
        expect(relicCount(out)).toBe(1);
        // A second kill of the same foe pays nothing more.
        const again = settleKill(out.player, out.quests, FOE.name, start.world.currentMap.name);
        expect(again.paid).toEqual([]);
        expect(relicCount(again)).toBe(1);
    });

    it('resolveMapEvent: a reach objective completed on arrival pays', () => {
        mockSequentialRng(0.5);
        const reach = quest({ id: 'reach-bw-2', type: 'reach', target: 'bw-2' });
        const result = resolveMapEvent(stateWith(reach, 'bw-2'));
        expect(result.state.quests.completed).toContain(reach.name);
        expect(relicCount(result.state)).toBe(1);
    });

    const tree: DialogueTree = {
        rootId: 'root',
        nodes: { root: { id: 'root', speaker: 'Fixture NPC', text: 'Placeholder.', choices: [] } },
    } as unknown as DialogueTree;

    it('dialogue: a progressQuest effect that fills the last objective pays', () => {
        const flag = quest({ id: 'flag-1', type: 'flag', target: 'fixture' });
        const choice: DialogueChoice = { text: 'Go on.', effect: { progressQuest: { name: flag.name, objectiveId: 'flag-1' } } };
        const step = applyDialogueChoice(stateWith(flag), tree, choice);
        expect(step.effects.completedQuest).toBe(flag.name);
        expect(relicCount(step.gameState)).toBe(1);
    });

    it('dialogue: a completeQuest effect pays, and a repeat pays nothing', () => {
        const choice: DialogueChoice = { text: 'Done.', effect: { completeQuest: KILL.name } };
        const step = applyDialogueChoice(stateWith(KILL), tree, choice);
        expect(step.effects.completedQuest).toBe(KILL.name);
        expect(relicCount(step.gameState)).toBe(1);
        const repeat = applyDialogueChoice(step.gameState, tree, choice);
        expect(relicCount(repeat.gameState)).toBe(1);
    });
});
