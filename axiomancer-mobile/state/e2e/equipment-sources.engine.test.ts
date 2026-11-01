/**
 * Lane weapons and armor reach the player from an elite, a befriended elite
 * and a loot cache (A13 of the equipment-dock spec). The elite's piece queues
 * on `/item-reward` as a relic does, on top of the relic roll and never the
 * whole reward; a befriended elite always hands one; a cache's item bundle
 * can hold one. Every chance reads `EQUIPMENT_DROP_TUNING`.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { EQUIPMENT_DROP_TUNING, EQUIPMENT_LANE, equipmentLibrary, isEquipment } from '@mechanics';
import type { GameState } from '@mechanics';

import { createAppActions } from '@/state/actions';
import { rollCombatRewardAction, settleEliteEquipmentAction } from '@/state/combat/store-actions';
import { eliteDropSource, eliteGiftSource } from '@/state/presenters/relic-source.copy';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

afterEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as { __AXM_CACHE_SEED__?: number }).__AXM_CACHE_SEED__;
});

const ELITE = { difficulty: 'elite' as const, name: 'Fixture Elite' };
const LANE_IDS = equipmentLibrary.map(p => p.id).filter(id => EQUIPMENT_LANE[id] !== undefined);

function gs(store: AppStore): GameState {
    return store.getState() as unknown as GameState;
}

function freshStore(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter() });
}

describe("an elite's lane piece reaches the item-reward screen", () => {
    it('a win drops one at the elite chance, the elite named, and the card draft still opens', () => {
        const store = freshStore();
        jest.spyOn(Math, 'random').mockReturnValue(EQUIPMENT_DROP_TUNING.elite - 0.01);
        const piece = settleEliteEquipmentAction(store, ELITE);
        expect(piece).not.toBeNull();
        expect(LANE_IDS).toContain(piece!.id);
        const queue = store.getState().itemReward.queue;
        expect(queue.map(e => e.item.id)).toEqual([piece!.id]);
        expect(queue[0]!.source).toBe(eliteDropSource(ELITE.name));
        // Not the whole reward: the draft is untouched and still rolls.
        expect(store.getState().combatReward.claimed).toBe(false);
        expect(rollCombatRewardAction(store, ELITE).length).toBeGreaterThan(0);
    });

    it('drops nothing when the chance misses, and nothing after a non-elite fight', () => {
        const missed = freshStore();
        jest.spyOn(Math, 'random').mockReturnValue(EQUIPMENT_DROP_TUNING.elite);
        expect(settleEliteEquipmentAction(missed, ELITE)).toBeNull();
        expect(missed.getState().itemReward.queue).toHaveLength(0);

        const normal = freshStore();
        (Math.random as jest.Mock).mockReturnValue(0);
        expect(settleEliteEquipmentAction(normal, { difficulty: 'normal' } as never)).toBeNull();
        expect(normal.getState().itemReward.queue).toHaveLength(0);
    });

    it('a befriended elite always hands one, under a gift eyebrow', () => {
        const store = freshStore();
        jest.spyOn(Math, 'random').mockReturnValue(0.999);
        const piece = settleEliteEquipmentAction(store, ELITE, true);
        expect(piece).not.toBeNull();
        const queue = store.getState().itemReward.queue;
        expect(queue.map(e => e.item.id)).toEqual([piece!.id]);
        expect(queue[0]!.source).toBe(eliteGiftSource(ELITE.name));
    });

    it('never hands a piece the player carries, or the grey pair', () => {
        const store = freshStore();
        const player = gs(store).player;
        const carried = equipmentLibrary.filter(p => EQUIPMENT_LANE[p.id] && p.id !== 'armor-flame-guard');
        store.setState({ player: { ...player, inventory: [...player.inventory, ...carried] } } as never);
        jest.spyOn(Math, 'random').mockReturnValue(0);
        expect(settleEliteEquipmentAction(store, ELITE, true)?.id).toBe('armor-flame-guard');
        const full = freshStore();
        full.setState({
            player: { ...gs(full).player, inventory: [...gs(full).player.inventory, ...equipmentLibrary] },
        } as never);
        expect(settleEliteEquipmentAction(full, ELITE, true)).toBeNull();
    });
});

describe("a loot cache's item bundle can hold a lane piece", () => {
    it('some seed puts one in the bundle and the claim carries it, unworn', () => {
        let found: { seed: number; id: string } | null = null;
        for (let seed = 1; seed <= 200 && !found; seed++) {
            const store = freshStore();
            const actions = createAppActions(store);
            actions.beginLootCacheChoice({ tier: 'modest', currency: 0, seed });
            const piece = store.getState().cache!.session!.itemCandidates.find(isEquipment);
            if (!piece) continue;
            found = { seed, id: piece.id };
            expect(LANE_IDS).toContain(piece.id);
            actions.chooseLootCacheChoiceOffer('item');
            expect(actions.claimLootCacheChoiceOutcome().applied).toBe(true);
            const player = gs(store).player;
            expect(player.inventory.some(i => i.id === piece.id)).toBe(true);
            expect(player.equipment.weapon?.id).not.toBe(piece.id);
            expect(player.equipment.armor?.id).not.toBe(piece.id);
        }
        expect(found).not.toBeNull();
    });

    it('a seed always rolls the same bundle', () => {
        const ids = (seed: number) => {
            const store = freshStore();
            createAppActions(store).beginLootCacheChoice({ tier: 'rich', currency: 0, seed });
            return store.getState().cache!.session!.itemCandidates.map(i => i.id);
        };
        for (let seed = 1; seed <= 20; seed++) expect(ids(seed)).toEqual(ids(seed));
    });
});
