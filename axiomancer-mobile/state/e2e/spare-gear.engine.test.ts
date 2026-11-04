/**
 * A Spare's gear on the item-reward queue: it is carried and saved before the
 * screen opens, so an app closed before the answer keeps it once; the queue is
 * not doubled by a second offer; and a result that is not gear queues nothing.
 * A Spare's roll runs after `END_COMBAT` paid the fight's quests, so it goes
 * around what they paid. That is also why `offerSpareGearAction`'s dedupe can't
 * lose a Spare's screen: a carried entry holds a satchel row, the roll skipped
 * every row, and the queue is drained before a fight can start.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
    ENEMY_REGISTRY,
    FIXTURE_QUEST,
    emptyQuestLog,
    equipmentDropPool,
    equipmentLibrary,
    getRelicById,
    getRng,
    initializeCombatEncounter,
    relicLibrary,
    startQuest,
} from '@mechanics';
import type { CombatEncounterState, CombatOutcome, Equipment, GameState, Quest, SpareReward } from '@mechanics';

import { applyHazardOutcome } from '@/components/combat/encounter/CombatEncounterPanel';
import { createAppActions } from '@/state/actions';
import { questRewardSource, spareGearSource } from '@/state/presenters/relic-source.copy';
import { confirmItemRewardAction } from '@/state/item-reward/store-actions';
import { offerSpareGearAction } from '@/state/item-reward/relic-sources';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

function storeCarrying(reward: SpareReward) {
    const adapter = createMemoryAdapter();
    const store = createAppStore({ adapter });
    const player = (store.getState() as unknown as GameState).player;
    const inventory = 'item' in reward ? [...player.inventory, reward.item] : player.inventory;
    store.setState({ player: { ...player, inventory } } as never);
    store.getState().save();
    return { store, adapter };
}

const count = (state: GameState | null, id: string) => state?.player.inventory.filter(i => i.id === id).length ?? 0;

afterEach(() => {
    jest.restoreAllMocks();
});

describe('offerSpareGearAction', () => {
    const relic: SpareReward = { kind: 'relic', item: getRelicById('relic-disarming-plea')! };
    const gear: SpareReward = { kind: 'gear', item: equipmentLibrary.find(p => p.slot === 'weapon')! };

    it.each([relic, gear])('a $kind result queues the carried piece, and a reload before the answer keeps it once', (reward) => {
        const { store, adapter } = storeCarrying(reward);
        const id = (reward as { item: { id: string } }).item.id;
        expect(offerSpareGearAction(store, reward, 'Float-Eye')?.id).toBe(id);
        expect(store.getState().itemReward.queue).toHaveLength(1);
        // The run log hears of the grant as a Spare's, whatever the eyebrow says.
        expect(store.getState().itemReward.queue[0]!.logFrom).toBe('spare');
        expect(count(adapter.load(), id)).toBe(1);
        // A second offer is not a second entry.
        expect(offerSpareGearAction(store, reward, 'Float-Eye')).toBeNull();
        expect(store.getState().itemReward.queue).toHaveLength(1);
        confirmItemRewardAction(store);
        expect(count(adapter.load(), id)).toBe(1);
    });

    it('queues nothing for shillings, a card, or a piece no longer in the satchel', () => {
        const { store } = storeCarrying({ kind: 'shillings', amount: 3 });
        expect(offerSpareGearAction(store, { kind: 'shillings', amount: 3 }, 'x')).toBeNull();
        expect(offerSpareGearAction(store, { kind: 'upgrade', fromCardId: 'a', toCardId: 'b' }, 'x')).toBeNull();
        expect(offerSpareGearAction(store, relic, 'x')).toBeNull();
        expect(offerSpareGearAction(store, undefined, 'x')).toBeNull();
        expect(store.getState().itemReward.queue).toHaveLength(0);
    });
});

describe("a Spare's roll goes around what a quest paid in that fight", () => {
    const FOE = { ...ENEMY_REGISTRY['death-beholder'], difficulty: 'normal' as const };
    /** The spare table's first draw: gear from 0.85 to 0.95, a relic above 0.95. */
    const GEAR_DRAW = 0.9;
    const RELIC_DRAW = 0.99;

    function questPaying(item: Equipment, carrying: readonly Equipment[] = []) {
        const adapter = createMemoryAdapter();
        const store = createAppStore({ adapter });
        const q: Quest = {
            ...FIXTURE_QUEST,
            objectives: [{ ...FIXTURE_QUEST.objectives[0]!, id: 'kill-foe', type: 'kill', target: FOE.name }],
            reward: { kind: 'item', item },
        };
        const { player } = store.getState() as unknown as GameState;
        store.setState({
            quests: startQuest(emptyQuestLog(), q),
            player: { ...player, inventory: [...player.inventory, ...carrying] },
        } as never);
        createAppActions(store).startCombat(FOE);
        return { store, q };
    }

    function spare(store: ReturnType<typeof createAppStore>, draws: readonly number[]): SpareReward {
        const player = (store.getState() as unknown as GameState).player;
        const fought = initializeCombatEncounter(player, FOE, ['grey-strike'], 7);
        const finalState: CombatEncounterState = { ...fought, mercyCheck: 'spared' };
        const rng = jest.spyOn(getRng(), 'random');
        for (const draw of draws) rng.mockReturnValueOnce(draw);
        applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, FOE);
        return store.getState().combatReward.spare!.reward;
    }

    const pieces = () => equipmentDropPool((createAppStore({ adapter: createMemoryAdapter() }).getState() as unknown as GameState).player);

    it('a gear draw picks another piece, and its offer reaches the screen beside the quest entry', () => {
        const [paid, next] = pieces();
        const { store, q } = questPaying(paid!);
        const reward = spare(store, [GEAR_DRAW, 0]);
        expect(reward).toMatchObject({ kind: 'gear', item: { id: next!.id } });
        const game = store.getState() as unknown as GameState;
        expect(count(game, paid!.id)).toBe(1);
        expect(count(game, next!.id)).toBe(1);
        expect(offerSpareGearAction(store, reward, FOE.name)?.id).toBe(next!.id);
        expect(store.getState().itemReward.queue.map(e => [e.item.id, e.source])).toEqual([
            [paid!.id, questRewardSource(q.name)],
            [next!.id, spareGearSource(FOE.name)],
        ]);
    });

    it('with the whole lane pool paid or carried, a gear draw pays shillings', () => {
        const all = pieces();
        const { store } = questPaying(all[all.length - 1]!, all.slice(0, -1));
        expect(spare(store, [GEAR_DRAW]).kind).toBe('shillings');
        expect(count(store.getState() as unknown as GameState, all[all.length - 1]!.id)).toBe(1);
    });

    it('with every relic paid or carried, a relic draw pays shillings', () => {
        const paid = relicLibrary[0]!;
        const { store } = questPaying(paid, relicLibrary.slice(1));
        expect(spare(store, [RELIC_DRAW]).kind).toBe('shillings');
        expect(count(store.getState() as unknown as GameState, paid.id)).toBe(1);
    });
});
