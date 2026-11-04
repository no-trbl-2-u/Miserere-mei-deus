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
import type { Equipment, GameState, Quest } from '@mechanics';

import { createAppActions } from '@/state/actions';
import { settleEliteEquipmentAction, settleEliteRelicAction } from '@/state/combat/store-actions';
import { offerCompletedQuestItemsAction, offerEliteRelicAction } from '@/state/item-reward/relic-sources';
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

    it('EQUIP wears the one row, saved once, and a reopened app has it once', () => {
        const { store, adapter } = fresh();
        jest.spyOn(Math, 'random').mockReturnValue(0);
        settleEliteRelicAction(store, ELITE, FIXTURE_ELITE_RELICS);
        const id = FIXTURE_ELITE_RELICS[0]!.id;
        const worn = (s: GameState | null) => JSON.stringify(s?.player.equipment ?? {}).includes(`"${id}"`);
        expect(worn(gs(store))).toBe(false);
        equipItemRewardAction(store);
        expect(worn(gs(store))).toBe(true);
        expect(count(gs(store), id)).toBe(1);
        expect(store.getState().itemReward.queue).toHaveLength(0);
        expect(count(adapter.load(), id)).toBe(1);
        expect(worn(adapter.load())).toBe(true);
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

    it('a second look at the same completion queues nothing more, even with another source waiting', () => {
        const { store, q } = questStore();
        const before = gs(store).quests;
        // An elite entry for the same item is already waiting: it must not
        // stand in for the quest's offer, nor let the quest be offered twice.
        offerEliteRelicAction(store, FIXTURE_QUEST_RELIC as Equipment, ELITE.name);
        const actions = createAppActions(store);
        actions.startCombat(FOE);
        actions.endCombat('victory');
        expect(offerCompletedQuestItemsAction(store, before)).toHaveLength(0);
        const sources = store.getState().itemReward.queue.map(e => e.source);
        expect([...sources].sort()).toEqual([eliteDropSource(ELITE.name), questRewardSource(q.name)].sort());
    });
});

describe('the same item from a quest and from an elite keeps both offers', () => {
    const ID = FIXTURE_QUEST_RELIC.id;
    const ELITE_SOURCE = eliteDropSource(ELITE.name);

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

    const completeQuest = (store: AppStore) => {
        const actions = createAppActions(store);
        actions.startCombat(FOE);
        actions.endCombat('victory');
    };
    const eliteDrops = (store: AppStore) => offerEliteRelicAction(store, FIXTURE_QUEST_RELIC as Equipment, ELITE.name);

    function expectBothOffers(store: AppStore, adapter: ReturnType<typeof createMemoryAdapter>, q: Quest) {
        const queue = store.getState().itemReward.queue;
        expect(queue.map(e => e.item.id)).toEqual([ID, ID]);
        expect([...queue.map(e => e.source)].sort()).toEqual([ELITE_SOURCE, questRewardSource(q.name)].sort());
        // The app closes before the answer: both rows are already on disk.
        expect(savedCounts(store, adapter, ID)).toEqual([2, 2]);
        // Reopen the app from that save. FINDING (149.5): the item-reward queue
        // is not saved (the store boots it empty), so a reopened app shows no
        // screen for either offer. The player keeps both copies in the satchel,
        // which is what the carried rows are for.
        const reopened = createAppStore({ adapter });
        expect(count(gs(reopened), ID)).toBe(2);
        expect(reopened.getState().itemReward.queue).toHaveLength(0);
        // Each answer swaps its own row: two screens, two items, never three.
        confirmItemRewardAction(store);
        expect(store.getState().itemReward.queue).toHaveLength(1);
        confirmItemRewardAction(store);
        expect(store.getState().itemReward.queue).toHaveLength(0);
        expect(count(gs(store), ID)).toBe(2);
        expect(count(adapter.load(), ID)).toBe(2);
    }

    it('quest first, then the elite drop', () => {
        const { store, adapter, q } = questStore();
        completeQuest(store);
        eliteDrops(store);
        expectBothOffers(store, adapter, q);
    });

    it('elite drop first, then the quest completes', () => {
        const { store, adapter, q } = questStore();
        eliteDrops(store);
        completeQuest(store);
        expectBothOffers(store, adapter, q);
    });

    it('a repeat of either source still queues nothing more', () => {
        const { store, q } = questStore();
        const before = gs(store).quests;
        eliteDrops(store);
        completeQuest(store);
        eliteDrops(store);
        expect(offerCompletedQuestItemsAction(store, before)).toHaveLength(0);
        expect(store.getState().itemReward.queue).toHaveLength(2);
        expect(count(gs(store), ID)).toBe(2);
        expect(q.name).toBeTruthy();
    });
});
