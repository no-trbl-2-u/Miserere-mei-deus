/**
 * A Spare's gear on the item-reward queue: it is carried and saved before the
 * screen opens, so an app closed before the answer keeps it once; the queue is
 * not doubled by a second offer; and a result that is not gear queues nothing.
 */

import { describe, expect, it } from '@jest/globals';
import { equipmentLibrary, getRelicById } from '@mechanics';
import type { GameState, SpareReward } from '@mechanics';

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
