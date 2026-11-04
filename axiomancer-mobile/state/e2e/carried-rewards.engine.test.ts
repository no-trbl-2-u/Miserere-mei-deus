/**
 * A quest's item, an elite's relic and an elite's lane piece survive an app
 * close before the item-reward screen is answered: each is in the saved
 * satchel once the offer is made, stays once through the answer, and keeps the
 * run-log tag its source always had. The queue is not saved, so a reopened app
 * holds the item and misses only its screen. An elite's roll goes around what a
 * quest pays in that same fight, so the player ends with one copy; two quests
 * paying one item still pay two.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
    ENEMY_REGISTRY,
    EQUIPMENT_DROP_TUNING,
    FIXTURE_ELITE_RELICS,
    FIXTURE_QUEST,
    FIXTURE_QUEST_RELIC,
    emptyQuestLog,
    equipmentDropPool,
    initializeCombatEncounter,
    startQuest,
} from '@mechanics';
import type { CombatOutcome, Equipment, GameState, Quest } from '@mechanics';

import { applyHazardOutcome } from '@/components/combat/encounter/CombatEncounterPanel';
import { createAppActions } from '@/state/actions';
import { rollCombatRewardAction, settleEliteEquipmentAction, settleEliteRelicAction } from '@/state/combat/store-actions';
import { offerCompletedQuestItemsAction, offerElitePieceAction, offerEliteRelicAction } from '@/state/item-reward/relic-sources';
import { confirmItemRewardAction, equipItemRewardAction, offerItemRewardAction } from '@/state/item-reward/store-actions';
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

/** A store reopened from the save: the item once, and no screen waiting. */
function expectReopenedOnce(adapter: ReturnType<typeof createMemoryAdapter>, id: string) {
    const reopened = createAppStore({ adapter });
    expect(count(gs(reopened), id)).toBe(1);
    expect(reopened.getState().itemReward.queue).toHaveLength(0);
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
        expectReopenedOnce(adapter, id);
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
        expectReopenedOnce(adapter, id);
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
        expectReopenedOnce(adapter, id);
        confirmItemRewardAction(store);
        expect(count(gs(store), id)).toBe(1);
        expect(count(adapter.load(), id)).toBe(1);
    });

    it('a second look at the same completion queues nothing more, even with another source waiting', () => {
        const { store, q } = questStore();
        const before = gs(store).quests;
        // Another quest's entry for the same item is already waiting: it must
        // not stand in for this quest's offer, nor let it be offered twice.
        const other = questRewardSource('Another Quest');
        const { player } = gs(store);
        store.setState({ player: { ...player, inventory: [...player.inventory, FIXTURE_QUEST_RELIC] } } as never);
        offerItemRewardAction(store, FIXTURE_QUEST_RELIC, { source: other, includeInline: true, carried: true });
        const actions = createAppActions(store);
        actions.startCombat(FOE);
        actions.endCombat('victory');
        expect(offerCompletedQuestItemsAction(store, before)).toHaveLength(0);
        const sources = store.getState().itemReward.queue.map(e => e.source);
        expect([...sources].sort()).toEqual([other, questRewardSource(q.name)].sort());
    });
});

describe('an elite roll goes around what a quest pays in that same fight (D166)', () => {
    const X = FIXTURE_ELITE_RELICS[0]!;
    const Y = FIXTURE_ELITE_RELICS[1]!;
    const elite = { ...FOE, difficulty: 'elite' as const };

    function questPaying(item: Equipment) {
        const { store, adapter } = fresh();
        const q: Quest = {
            ...FIXTURE_QUEST,
            objectives: [{ ...FIXTURE_QUEST.objectives[0]!, id: 'kill-foe', type: 'kill', target: FOE.name }],
            reward: { kind: 'item', item },
        };
        const { player } = gs(store);
        store.setState({
            quests: startQuest(emptyQuestLog(), q),
            player: { ...player, experience: 0, experienceToNextLevel: 1_000_000 },
        } as never);
        createAppActions(store).startCombat(elite);
        return { store, adapter, q };
    }

    /** Wins the staged elite fight with every roll landing on its first pick. */
    function winElite(store: AppStore, relics: readonly Equipment[]) {
        jest.spyOn(Math, 'random').mockReturnValue(0);
        const finalState = initializeCombatEncounter(gs(store).player, elite, ['grey-strike'], 7);
        applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, elite, relics);
    }

    const sourcesOf = (store: AppStore, id: string) =>
        store.getState().itemReward.queue.filter(e => e.item.id === id).map(e => e.source);

    it('the relic roll picks another: one copy of each, and the quest still offers its own', () => {
        const { store, q } = questPaying(X);
        winElite(store, FIXTURE_ELITE_RELICS);
        expect(count(gs(store), X.id)).toBe(1);
        expect(count(gs(store), Y.id)).toBe(1);
        expect(sourcesOf(store, X.id)).toEqual([questRewardSource(q.name)]);
        expect(sourcesOf(store, Y.id)).toEqual([eliteDropSource(elite.name)]);
        expect(store.getState().combatReward.relicDrop?.item.id).toBe(Y.id);
    });

    it('with the quest item the only relic left, no relic drops: the XP and the card draft stand', () => {
        const { store, q } = questPaying(X);
        winElite(store, [X]);
        expect(count(gs(store), X.id)).toBe(1);
        expect(sourcesOf(store, X.id)).toEqual([questRewardSource(q.name)]);
        expect(store.getState().combatReward.relicDrop ?? null).toBeNull();
        expect(gs(store).player.experience).toBe(FOE.xpReward);
        expect(rollCombatRewardAction(store, elite).length).toBeGreaterThan(0);
    });

    it('the piece roll picks another: one copy of each, and the quest still offers its own', () => {
        const [paid, next] = equipmentDropPool(gs(fresh().store).player);
        const { store, q } = questPaying(paid!);
        winElite(store, []);
        expect(count(gs(store), paid!.id)).toBe(1);
        expect(count(gs(store), next!.id)).toBe(1);
        expect(sourcesOf(store, paid!.id)).toEqual([questRewardSource(q.name)]);
        expect(sourcesOf(store, next!.id)).toEqual([eliteDropSource(elite.name)]);
    });

    it('with the quest item the only piece left, no piece drops', () => {
        const pool = equipmentDropPool(gs(fresh().store).player);
        const last = pool[pool.length - 1]!;
        const { store, q } = questPaying(last);
        const { player } = gs(store);
        store.setState({ player: { ...player, inventory: [...player.inventory, ...pool.slice(0, -1)] } } as never);
        winElite(store, []);
        expect(count(gs(store), last.id)).toBe(1);
        expect(store.getState().itemReward.queue.map(e => [e.item.id, e.source])).toEqual([[last.id, questRewardSource(q.name)]]);
    });
});

describe('an offer never makes a second copy', () => {
    const ID = FIXTURE_QUEST_RELIC.id;

    function questEntryWaiting() {
        const { store, adapter } = fresh();
        const q: Quest = {
            ...FIXTURE_QUEST,
            objectives: [{ ...FIXTURE_QUEST.objectives[0]!, id: 'kill-foe', type: 'kill', target: FOE.name }],
            reward: { kind: 'item', item: FIXTURE_QUEST_RELIC },
        };
        store.setState({ quests: startQuest(emptyQuestLog(), q) } as never);
        const actions = createAppActions(store);
        actions.startCombat(FOE);
        actions.endCombat('victory');
        return { store, adapter, q };
    }

    it.each([
        ['relic', offerEliteRelicAction],
        ['piece', offerElitePieceAction],
    ])('an elite %s offered beside a waiting entry adds no row and no entry', (_kind, offer) => {
        const { store, adapter, q } = questEntryWaiting();
        offer(store, FIXTURE_QUEST_RELIC, ELITE.name);
        expect(store.getState().itemReward.queue.map(e => e.source)).toEqual([questRewardSource(q.name)]);
        expect(count(gs(store), ID)).toBe(1);
        expect(savedCounts(store, adapter, ID)).toEqual([1, 1]);
    });

    it('a piece the satchel already holds with nothing waiting takes the row it has', () => {
        const { store } = fresh();
        const { player } = gs(store);
        store.setState({ player: { ...player, inventory: [...player.inventory, FIXTURE_QUEST_RELIC] } } as never);
        offerEliteRelicAction(store, FIXTURE_QUEST_RELIC, ELITE.name);
        expect(store.getState().itemReward.queue).toHaveLength(1);
        expect(count(gs(store), ID)).toBe(1);
    });
});

describe('quests are untouched: two quests paying one item pay two copies', () => {
    const ID = FIXTURE_QUEST_RELIC.id;

    it('each has its own offer, and each answer swaps its own row', () => {
        const { store, adapter } = fresh();
        const quest = (name: string): Quest => ({
            ...FIXTURE_QUEST,
            name,
            objectives: [{ ...FIXTURE_QUEST.objectives[0]!, id: 'kill-foe', type: 'kill', target: FOE.name }],
            reward: { kind: 'item', item: FIXTURE_QUEST_RELIC },
        });
        store.setState({ quests: startQuest(startQuest(emptyQuestLog(), quest('One')), quest('Other')) } as never);
        const actions = createAppActions(store);
        actions.startCombat(FOE);
        actions.endCombat('victory');
        const sources = store.getState().itemReward.queue.map(e => e.source);
        expect([...sources].sort()).toEqual([questRewardSource('One'), questRewardSource('Other')].sort());
        expect(savedCounts(store, adapter, ID)).toEqual([2, 2]);
        confirmItemRewardAction(store);
        confirmItemRewardAction(store);
        expect(store.getState().itemReward.queue).toHaveLength(0);
        expect(count(gs(store), ID)).toBe(2);
        expect(count(adapter.load(), ID)).toBe(2);
    });
});
