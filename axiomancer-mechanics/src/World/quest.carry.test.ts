// guard-test: pins MQ1b carry and dialogue-give behaviour already on main, killing the mutation survivors from #1056
/**
 * Carry objectives (phase MQ1b, A7): reading the inventory, partial holds,
 * stacks, and the dialogue effect's edges.
 */

import { describe, it, expect, beforeAll } from 'vitest';

import { carriedCount, syncCarryObjectives, consumeCarriedItems, emptyQuestLog } from './quest.engine';
import { applyDialogueChoice } from './dialogue.runtime';
import { createNewGameState } from '../Game/game.reducer';
import { getConsumableById } from '../Items/consumable.library';
import type { Item, Material, QuestItem } from '../Items/types';
import type { Quest, QuestLog, QuestObjective } from './types';
import type { DialogueTree } from '../NPCs/types';
import { registerLongChainFixture, LONG_MAIN_LINE } from '../Game/fixtures/quest-chain-long.fixture';

beforeAll(registerLongChainFixture);

const POTION = getConsumableById('minor-healing-potion')!;
const stack = (quantity: number): Item => ({ ...POTION, quantity });
const ORE: Material = { id: 'ore', name: 'Ore', description: '', category: 'material', quantity: 3 } as Material;
const KEY: QuestItem = { id: 'key', name: 'Key', description: '', category: 'quest-item', questId: 'q' };

const player = (inventory: Item[]) => ({ ...createNewGameState({ startMap: 'breakwater' }).player, inventory });

const carry = (target: string | undefined, requiredCount = 1, currentCount = 0): QuestObjective =>
    ({ id: 'c', type: 'carry', description: '', target, requiredCount, currentCount });
const kill: QuestObjective = { id: 'k', type: 'kill', description: '', requiredCount: 1, currentCount: 0, foeClass: 'any' };

function quest(name: string, objectives: QuestObjective[], holdForTurnIn = false): Quest {
    return { name, description: '', mapName: 'breakwater', objectives, reward: 'quest', holdForTurnIn, status: 'active' } as Quest;
}
const logOf = (...active: Quest[]): QuestLog => ({ ...emptyQuestLog(), active });

describe('carriedCount', () => {
    it('counts stack quantities, material quantities and lone rows of the id only', () => {
        expect(carriedCount([stack(3), ORE, KEY, KEY], POTION.id)).toBe(3);
        expect(carriedCount([stack(3), ORE, KEY, KEY], 'ore')).toBe(3);
        expect(carriedCount([stack(3), ORE, KEY, KEY], 'key')).toBe(2);
        expect(carriedCount([], 'key')).toBe(0);
    });
});

describe('consumeCarriedItems', () => {
    it('takes one off a stack, drops a stack of one, removes one row of a lone item', () => {
        const ask = { objectives: [carry(POTION.id)] };
        expect(consumeCarriedItems(player([stack(3)]), ask).inventory).toEqual([stack(2)]);
        expect(consumeCarriedItems(player([stack(1)]), ask).inventory).toEqual([]);
        expect(consumeCarriedItems(player([ORE]), { objectives: [carry('ore')] }).inventory).toEqual([{ ...ORE, quantity: 2 }]);
        expect(consumeCarriedItems(player([KEY, KEY]), { objectives: [carry('key')] }).inventory).toEqual([KEY]);
    });

    it('takes requiredCount of each, leaves other items, and ignores non-carry and target-less objectives', () => {
        const p = player([stack(3), KEY]);
        expect(consumeCarriedItems(p, { objectives: [carry(POTION.id, 2)] }).inventory).toEqual([stack(1), KEY]);
        expect(consumeCarriedItems(p, { objectives: [kill, carry(undefined)] })).toBe(p);
        expect(consumeCarriedItems(p, { objectives: [carry('absent')] })).toBe(p);
    });
});

describe('syncCarryObjectives', () => {
    it('sets a partial hold, counts only the carry objective and leaves the rest', () => {
        const log = logOf(quest('Q', [kill, carry('key', 2)], true));
        const half = syncCarryObjectives(player([KEY]), log);
        const objectives = half.active[0]!.objectives;
        expect(objectives[0]).toBe(log.active[0]!.objectives[0]);
        expect(objectives[1]!.currentCount).toBe(1);
        expect(syncCarryObjectives(player([KEY, KEY]), half).active[0]!.objectives[1]!.currentCount).toBe(2);
        expect(syncCarryObjectives(player([KEY, KEY, KEY]), log).active[0]!.objectives[1]!.currentCount).toBe(2);
    });

    it('returns the same log when nothing moved, and ignores quests without carry or a target', () => {
        const plain = logOf(quest('P', [kill]), quest('T', [carry(undefined)]));
        expect(syncCarryObjectives(player([KEY]), plain)).toBe(plain);
        const met = logOf(quest('M', [carry('key', 1, 1)], true));
        expect(syncCarryObjectives(player([KEY]), met)).toBe(met);
    });

    it('syncs each carrying quest on its own', () => {
        const log = logOf(quest('A', [carry('key')], true), quest('B', [carry('ore', 3)], true));
        const next = syncCarryObjectives(player([KEY]), log);
        expect(next.active.map(q => q.objectives[0]!.currentCount)).toEqual([1, 0]);
    });

    it('a filled quest not held for a turn-in completes; a held one stays active', () => {
        const free = syncCarryObjectives(player([KEY]), logOf(quest('F', [carry('key')])));
        expect(free.completed).toEqual(['F']);
        expect(free.active).toEqual([]);
        const held = syncCarryObjectives(player([KEY]), logOf(quest('H', [carry('key')], true)));
        expect(held.completed).toEqual([]);
        expect(held.active.map(q => q.name)).toEqual(['H']);
        // A quest with another unmet objective does not complete.
        const open = syncCarryObjectives(player([KEY]), logOf(quest('O', [kill, carry('key')])));
        expect(open.completed).toEqual([]);
    });
});

describe('the giveQuestStep dialogue effect', () => {
    const tree = (effect?: NonNullable<DialogueTree['nodes'][string]['choices']>[number]['effect']): DialogueTree => ({
        id: 't', rootId: 'root',
        nodes: { root: { id: 'root', text: '', choices: [{ text: '', ...(effect ? { effect } : {}) }] } },
    });
    const apply = (t: DialogueTree) => {
        const state = createNewGameState({ startMap: 'breakwater' });
        return { state, result: applyDialogueChoice(state, t, t.nodes.root!.choices![0]!) };
    };

    it('a choice without the effect gives nothing', () => {
        const { state, result } = apply(tree());
        expect(result.effects.givenQuestStep).toBeUndefined();
        expect(result.gameState.quests).toBe(state.quests);
        const other = apply(tree({ setFlag: 'f' }));
        expect(other.result.effects.givenQuestStep).toBeUndefined();
        expect(other.result.gameState.quests).toBe(other.state.quests);
    });

    it('a step that cannot be given is not reported as given', () => {
        const { state, result } = apply(tree({ giveQuestStep: { questline: LONG_MAIN_LINE, step: 3 } }));
        expect(result.effects.givenQuestStep).toBeUndefined();
        expect(result.gameState.quests).toBe(state.quests);
    });

    it('a step that can be given is started and reported', () => {
        const { result } = apply(tree({ giveQuestStep: { questline: LONG_MAIN_LINE, step: 1 } }));
        expect(result.effects.givenQuestStep).toEqual({ questline: LONG_MAIN_LINE, step: 1 });
        expect(result.gameState.quests.active).toHaveLength(1);
    });
});
