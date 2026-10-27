/**
 * Hermetic E2E — equip / unequip stat folding + consumable lifecycle.
 *
 * Equipment carries only static `statModifiers` (only the `maxHp` line,
 * folded into `maxHealth` at equip-time) and one `grantsSignature`. This
 * suite pins:
 *
 *   • `equipItem` folds `statModifiers` into `maxHealth`; `unequipItem` reverts.
 *   • Equipment applies NO effects (stat-only) — `Character.effects` untouched.
 *   • Equip / unequip invariants.
 *   • Consumable heal / stack lifecycle through the store.
 */

import { afterEach, describe, it, expect, vi } from 'vitest';

import { createCharacter } from '../../Character/index';
import { equipItem, unequipItem } from '../../Character/equipment.reducer';
import { createGameStore } from '../../Game/store';
import { nullAdapter } from '../../Game/persistence/null.adapter';
import { Consumable, Equipment } from '../types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const buildPlayer = () => createCharacter({
    name: 'TestPlayer',
    level: 1,
    baseStats: { heart: 4, body: 3, mind: 2 },
});

const ironWeapon: Equipment = {
    id: 'eq_iron_blade',
    name: 'Iron Blade',
    description: 'A simple iron blade. +3 max VITAE.',
    category: 'equipment',
    slot: 'weapon',
    statModifiers: [{ stat: 'maxHp', value: 3 }],
};

/** A plain relic (no effects — equipment is stat-only post-epic). */
const plainCirclet: Equipment = {
    id: 'eq_circlet_courage',
    name: 'Circlet of Courage',
    description: 'A quiet circlet.',
    category: 'equipment',
    slot: 'relic',
};

const healingPotion: Consumable = {
    id: 'csl_heal_10',
    name: 'Healing Potion',
    description: '+10 HP immediately.',
    category: 'consumable',
    healAmount: 10,
    quantity: 3,
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe('equipItem / unequipItem', () => {
    it('folds statModifiers into maxHealth at equip-time and reverts on unequip', () => {
        const player = buildPlayer();
        expect(player.baseStats.body).toBe(3);
        const bare = player.maxHealth;

        const equipped = equipItem(player, ironWeapon);
        // +3 maxHp → maxHealth grows by 3.
        expect(equipped.equipment.weapon).toBe(ironWeapon);
        expect(equipped.maxHealth).toBe(bare + 3);
        expect(equipped.baseStats.body).toBe(3); // baseStats untouched

        const unequipped = unequipItem(equipped, 'weapon');
        expect(unequipped.equipment.weapon).toBeNull();
        expect(unequipped.maxHealth).toBe(bare);
    });

    it('equipment is stat-only — equipping/unequipping never touches Character.effects', () => {
        const player = buildPlayer();
        expect(player.effects).toHaveLength(0);
        const equipped = equipItem(player, plainCirclet);
        expect(equipped.effects).toHaveLength(0);
        const unequipped = unequipItem(equipped, 'relic', 0);
        expect(unequipped.effects).toHaveLength(0);
    });

    it('replacing a weapon swaps its statModifiers and leaves effects empty', () => {
        const player = buildPlayer();
        const hpWeapon: Equipment = { ...ironWeapon, id: 'eq_hp_weapon', statModifiers: [{ stat: 'maxHp', value: 2 }] };
        const withWeapon = equipItem(player, hpWeapon);
        expect(withWeapon.effects).toHaveLength(0);
        expect(withWeapon.maxHealth).toBe(player.maxHealth + 2); // +2 maxHp

        const replacement: Equipment = { ...hpWeapon, id: 'eq_other_weapon', statModifiers: [] };
        const replaced = equipItem(withWeapon, replacement);
        expect(replaced.effects).toHaveLength(0);
        expect(replaced.maxHealth).toBe(player.maxHealth); // prior +2 maxHp reverted
    });

    it('createCharacter accepts a starting equipment list and folds stats but applies no effects', () => {
        const player = createCharacter({
            name: 'Equipped',
            level: 1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            equipment: [ironWeapon, plainCirclet],
        });
        expect(player.maxHealth).toBe(buildPlayer().maxHealth + 3);
        expect(player.effects).toHaveLength(0);
    });
});

describe('Invariants', () => {
    it('unequipping an empty slot is a no-op (returns the same reference)', () => {
        const player = buildPlayer();
        expect(unequipItem(player, 'weapon')).toBe(player);
    });

    it('input character is not mutated by equipItem', () => {
        const player = buildPlayer();
        const beforeHash = JSON.stringify(player);
        equipItem(player, ironWeapon);
        expect(JSON.stringify(player)).toBe(beforeHash);
    });
});

describe('Game store lifecycle: equipment & consumables with nullAdapter', () => {
    it('equipItem / unequipItem flow through the store; autosave is NOT fired on UI-tier actions', () => {
        const saveSpy = vi.spyOn(nullAdapter, 'save');
        const player  = buildPlayer();
        const store   = createGameStore(nullAdapter, { player });

        store.getState().equipItem(ironWeapon);
        expect(store.getState().player.equipment.weapon).toBe(ironWeapon);
        expect(store.getState().player.maxHealth).toBe(player.maxHealth + 3);

        store.getState().unequipItem('weapon');
        expect(store.getState().player.equipment.weapon).toBeNull();
        expect(store.getState().player.maxHealth).toBe(player.maxHealth);

        expect(saveSpy).not.toHaveBeenCalled();
    });

    it('useConsumable applies the healAmount on the root player and decrements the stack', () => {
        const player = buildPlayer();
        const hurt = { ...player, health: player.maxHealth - 5, inventory: [{ ...healingPotion, quantity: 2 }] };
        const store = createGameStore(nullAdapter, { player: hurt });

        const before = store.getState().player.health;
        store.getState().useConsumable(healingPotion.id);
        expect(store.getState().player.health).toBe(before + 5);
        const left = store.getState().player.inventory.find(i => i.id === healingPotion.id) as Consumable;
        expect(left.quantity).toBe(1);
    });

    it('useConsumable is a no-op for a non-consumable / unknown itemId', () => {
        const player = buildPlayer();
        const store  = createGameStore(nullAdapter, { player });
        store.getState().useConsumable('csl_does_not_exist');
        expect(store.getState().player.inventory).toEqual(player.inventory);
    });
});
