/**
 * A quest's item, an elite's relic and an elite's lane piece survive an app
 * close before the item-reward screen is answered: each is in the saved
 * satchel once the offer is made, stays once through the answer, and keeps the
 * run-log tag its source always had.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
    ENEMY_REGISTRY,
    EQUIPMENT_DROP_TUNING,
    FIXTURE_ELITE_RELICS,
    FIXTURE_QUEST,
    FIXTURE_QUEST_RELIC,
    emptyQuestLog,
    startQuest,
} from '@mechanics';
import type { GameState, Quest } from '@mechanics';

import { createAppActions } from '@/state/actions';
import { settleEliteEquipmentAction, settleEliteRelicAction } from '@/state/combat/store-actions';
import { offerCompletedQuestItemsAction } from '@/state/item-reward/relic-sources';
import { confirmItemRewardAction, equipItemRewardAction } from '@/state/item-reward/store-actions';
import { eliteDropSource, questRewardSource } from '@/state/presenters/relic-source.copy';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

afterEach(() => {
    jest.restoreAllMocks();
});

const ELITE = { difficulty: 'elite' as const, name: 'Fixture Elite' };
const FOE = ENEMY_REGISTRY['death-beholder'];

function gs(store: AppStore): GameState {
    return store.getState() as unknown as GameState;
}

const count = (state: GameState | null, id: string) => state?.player.inventory.filter(i => i.id === id).length ?? 0;

function fresh() {
    const adapter = createMemoryAdapter();
    return { store: createAppStore({ adapter }), adapter };
}

/** The app closes now, or after the next ordinary save: the satchel on disk both times. */
function savedCounts(store: AppStore, adapter: ReturnType<typeof createMemoryAdapter>, id: string): [number, number] {
    const closedNow = count(adapter.load(), id);
    store.getState().save();
    return [closedNow, count(adapter.load(), id)];
}

describe("an elite's relic survives an app close before the screen is answered", () => {
    it('is in the saved satchel once, and still once after CONFIRM', () => {
        const { store, adapter } = fresh();
        jest.spyOn(Math, 'random').mockReturnValue(0);
        expect(settleEliteRelicAction(store, ELITE, FIXTURE_ELITE_RELICS)).toBe(true);
        const id = FIXTURE_ELITE_RELICS[0]!.id;
        const queue = store.getState().itemReward.queue;
        expect(queue.map(e => e.item.id)).toEqual([id]);
        expect(queue[0]!.source).toBe(eliteDropSource(ELITE.name));
        // The run log keeps the eyebrow as the tag: no `logFrom`.
        expect(queue[0]!.logFrom).toBeUndefined();
        expect(savedCounts(store, adapter, id)).toEqual([1, 1]);
        expect(count(gs(store), id)).toBe(1);
        confirmItemRewardAction(store);
        expect(count(gs(store), id)).toBe(1);
        expect(count(adapter.load(), id)).toBe(1);
    });

    it('EQUIP wears the one row and leaves no second copy', () => {
        const { store } = fresh();
        jest.spyOn(Math, 'random').mockReturnValue(0);
        settleEliteRelicAction(store, ELITE, FIXTURE_ELITE_RELICS);
        const id = FIXTURE_ELITE_RELICS[0]!.id;
        equipItemRewardAction(store);
        expect(count(gs(store), id)).toBe(1);
        expect(store.getState().itemReward.queue).toHaveLength(0);
    });
});

describe("an elite's lane piece survives an app close before the screen is answered", () => {
    it('is in the saved satchel once, and still once after CONFIRM', () => {
        const { store, adapter } = fresh();
        jest.spyOn(Math, 'random').mockReturnValue(EQUIPMENT_DROP_TUNING.elite - 0.01);
        const piece = settleEliteEquipmentAction(store, ELITE);
        expect(piece).not.toBeNull();
        const id = piece!.id;
        const queue = store.getState().itemReward.queue;
        expect(queue.map(e => e.item.id)).toEqual([id]);
        expect(queue[0]!.source).toBe(eliteDropSource(ELITE.name));
        expect(queue[0]!.logFrom).toBeUndefined();
        expect(savedCounts(store, adapter, id)).toEqual([1, 1]);
        confirmItemRewardAction(store);
        expect(count(gs(store), id)).toBe(1);
        expect(count(adapter.load(), id)).toBe(1);
    });
});

describe("a quest's item survives an app close before the screen is answered", () => {
    function questStore() {
        const { store, adapter } = fresh();
        const q: Quest = {
            ...FIXTURE_QUEST,
            objectives: [{ ...FIXTURE_QUEST.objectives[0]!, id: 'kill-foe', type: 'kill', target: FOE.name }],
            reward: { kind: 'item', item: FIXTURE_QUEST_RELIC },
        };
        store.setState({ quests: startQuest(emptyQuestLog(), q) } as never);
        return { store, adapter, q };
    }

    it('is in the saved satchel once, and still once after CONFIRM', () => {
        const { store, adapter, q } = questStore();
        const actions = createAppActions(store);
        actions.startCombat(FOE);
        actions.endCombat('victory');
        const id = FIXTURE_QUEST_RELIC.id;
        const queue = store.getState().itemReward.queue;
        expect(queue.map(e => e.item.id)).toEqual([id]);
        expect(queue[0]!.source).toBe(questRewardSource(q.name));
        expect(queue[0]!.logFrom).toBeUndefined();
        expect(savedCounts(store, adapter, id)).toEqual([1, 1]);
        confirmItemRewardAction(store);
        expect(count(gs(store), id)).toBe(1);
        expect(count(adapter.load(), id)).toBe(1);
    });

    it('a second look at the same completion queues nothing more', () => {
        const { store } = questStore();
        const before = gs(store).quests;
        const actions = createAppActions(store);
        actions.startCombat(FOE);
        actions.endCombat('victory');
        expect(offerCompletedQuestItemsAction(store, before)).toHaveLength(0);
        expect(store.getState().itemReward.queue).toHaveLength(1);
    });
});
