/**
 * The village equipment counter — hermetic engine suite.
 *
 * Pins: the stock is `EQUIPMENT_DROP_TUNING.shopCount` lane pieces the player
 * does not carry, never the grey pair, the same for one run and node and a
 * different roll for another; a bought piece costs `shopPrice`, enters the
 * satchel unworn and sells once per visit; a short purse, an unoffered piece
 * and a piece already carried are refused and move nothing; the village event
 * carries the counter only beside a card shop. Driven through the public
 * barrel, the path mobile imports.
 */

import { describe, expect, it } from 'vitest';

import {
    EQUIPMENT_DROP_TUNING,
    EQUIPMENT_LANE,
    FRESH_VILLAGE_VISIT,
    GREY_ARMOR_ID,
    GREY_WEAPON_ID,
    buyVillageEquipment,
    carriedPieceIds,
    createNewGameState,
    equipmentDropPool,
    villageEquipmentQuote,
    villageEquipmentShopFor,
    villageEquipmentShopSeed,
} from '../../../index';
import { resolveVillage } from '../../MapEvents/handlers';
import type { GameState, VillageEquipmentShop } from '../../../index';

/** A fresh game with `currency` shillings. */
function game(currency: number): GameState {
    const base = createNewGameState({ characterId: 'the-chosen' });
    return { ...base, flags: [], player: { ...base.player, currency } };
}

describe('the equipment counter stock', () => {
    it('offers shopCount distinct lane pieces the player does not carry', () => {
        const state = game(100);
        const shop = villageEquipmentShopFor(state, 'bw-t4');
        expect(shop.pieceIds).toHaveLength(EQUIPMENT_DROP_TUNING.shopCount);
        expect(new Set(shop.pieceIds).size).toBe(shop.pieceIds.length);
        expect(shop.price).toBe(EQUIPMENT_DROP_TUNING.shopPrice);
        const carried = carriedPieceIds(state.player);
        for (const id of shop.pieceIds) {
            expect(EQUIPMENT_LANE[id]).toBeDefined();
            expect(carried.has(id)).toBe(false);
        }
    });

    it('never sells the grey pair, which every run starts with', () => {
        const state = game(100);
        expect(carriedPieceIds(state.player).has(GREY_WEAPON_ID)).toBe(true);
        for (let n = 0; n < 40; n++) {
            const shop = villageEquipmentShopFor(state, `node-${n}`);
            expect(shop.pieceIds).not.toContain(GREY_WEAPON_ID);
            expect(shop.pieceIds).not.toContain(GREY_ARMOR_ID);
        }
    });

    it('is the same for one run and node, and rolls differently elsewhere', () => {
        const state = game(100);
        expect(villageEquipmentShopFor(state, 'bw-t4')).toEqual(villageEquipmentShopFor(state, 'bw-t4'));
        expect(villageEquipmentShopSeed('run-1', 'a')).not.toBe(villageEquipmentShopSeed('run-1', 'b'));
        const rolls = new Set<string>();
        for (let n = 0; n < 12; n++) rolls.add(villageEquipmentShopFor(state, `node-${n}`).pieceIds.join());
        expect(rolls.size).toBeGreaterThan(1);
    });

    it('stocks fewer when the pool is smaller and nothing when the player carries every piece', () => {
        const state = game(100);
        const pool = equipmentDropPool(state.player);
        const carrying = (ids: string[]): GameState['player'] => ({
            ...state.player,
            inventory: [...state.player.inventory, ...pool.filter(p => ids.includes(p.id))],
        });
        const oneLeft = carrying(pool.slice(1).map(p => p.id));
        expect(villageEquipmentShopFor({ ...state, player: oneLeft }, 'n').pieceIds).toEqual([pool[0]!.id]);
        const none = carrying(pool.map(p => p.id));
        expect(villageEquipmentShopFor({ ...state, player: none }, 'n').pieceIds).toEqual([]);
    });
});

describe('buying a piece', () => {
    it('takes the price and puts the piece in the satchel, unworn', () => {
        const state = game(100);
        const shop = villageEquipmentShopFor(state, 'n');
        const pieceId = shop.pieceIds[0]!;
        const r = buyVillageEquipment(state, FRESH_VILLAGE_VISIT, shop, pieceId);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.spent).toBe(EQUIPMENT_DROP_TUNING.shopPrice);
        expect(r.state.player.currency).toBe(100 - EQUIPMENT_DROP_TUNING.shopPrice);
        expect(r.state.player.inventory.some(item => item.id === pieceId)).toBe(true);
        expect(r.state.player.equipment.weapon?.id).toBe(GREY_WEAPON_ID);
        expect(r.state.player.equipment.armor?.id).toBe(GREY_ARMOR_ID);
        expect(r.visit.boughtEquipmentIds).toEqual([pieceId]);
        expect(state.player.currency).toBe(100);
    });

    it('sells each piece once per visit and refuses to sell what is carried', () => {
        const state = game(200);
        const shop = villageEquipmentShopFor(state, 'n');
        const pieceId = shop.pieceIds[0]!;
        const first = buyVillageEquipment(state, FRESH_VILLAGE_VISIT, shop, pieceId);
        if (!first.ok) throw new Error('first buy refused');
        const again = buyVillageEquipment(first.state, first.visit, shop, pieceId);
        expect(again).toEqual({ ok: false, refusal: 'sold this visit' });
        const carried = villageEquipmentQuote(first.state.player, FRESH_VILLAGE_VISIT, shop, pieceId);
        expect(carried.refusal).toBe('you already carry it');
    });

    it('refuses a short purse and an unoffered piece, moving nothing', () => {
        const state = game(EQUIPMENT_DROP_TUNING.shopPrice - 1);
        const shop = villageEquipmentShopFor(state, 'n');
        const short = buyVillageEquipment(state, FRESH_VILLAGE_VISIT, shop, shop.pieceIds[0]!);
        expect(short.ok).toBe(false);
        if (!short.ok) expect(short.refusal).toContain(`${EQUIPMENT_DROP_TUNING.shopPrice}`);
        const rich = game(500);
        expect(buyVillageEquipment(rich, FRESH_VILLAGE_VISIT, shop, GREY_WEAPON_ID)).toEqual({
            ok: false,
            refusal: 'that piece is not on offer here',
        });
        const empty: VillageEquipmentShop = { pieceIds: [], price: 40 };
        expect(villageEquipmentQuote(rich.player, FRESH_VILLAGE_VISIT, empty, 'x').refusal).not.toBeNull();
    });
});

describe('the village event', () => {
    it('carries the counter beside a card shop, and not without one', () => {
        const state = game(100);
        const withShop = resolveVillage(state, { kind: 'village', villageName: 'Saltmarsh', cardShop: true });
        const ev = withShop.event;
        expect(ev.kind).toBe('village');
        if (ev.kind !== 'village') return;
        expect(ev.equipmentShop?.pieceIds).toHaveLength(EQUIPMENT_DROP_TUNING.shopCount);
        const without = resolveVillage(state, { kind: 'village', villageName: 'Saltmarsh', rest: true });
        if (without.event.kind !== 'village') throw new Error('not a village');
        expect(without.event.equipmentShop).toBeUndefined();
    });
});
