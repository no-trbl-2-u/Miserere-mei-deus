/**
 * Hermetic E2E — five-slot equipment loadout.
 *
 * Proves the `EquipmentLoadout` semantics end-to-end:
 *   • weapon / armor replace in place.
 *   • relics fill the first free of 3 positions; a 4th with the row full
 *     is a guarded no-op (same reference) unless `replaceIndex` is passed.
 *   • unequipItem frees the right relic position (index required).
 *   • getEquippedItems / wornMaxHpBonus fold the whole loadout.
 *   • maxHealth tracks the worn maxHp lines on every equip/unequip.
 */

import { describe, it, expect } from 'vitest';

import { createCharacter } from '../index';
import {
    equipItem, unequipItem, getEquippedItems, wornMaxHpBonus,
} from '../equipment.reducer';
import type { Equipment } from '../../Items/types';
import type { StatModifier } from '../../Effects/types';

function weapon(id: string, maxHp = 0): Equipment {
    const statModifiers: StatModifier[] = maxHp ? [{ stat: 'maxHp', value: maxHp }] : [];
    return { id, name: id, description: '', category: 'equipment', slot: 'weapon', statModifiers };
}
function armor(id: string, maxHp = 0): Equipment {
    const statModifiers: StatModifier[] = maxHp ? [{ stat: 'maxHp', value: maxHp }] : [];
    return { id, name: id, description: '', category: 'equipment', slot: 'armor', statModifiers };
}
function relic(id: string, maxHp = 0): Equipment {
    const statModifiers: StatModifier[] = maxHp ? [{ stat: 'maxHp', value: maxHp }] : [];
    return { id, name: id, description: '', category: 'equipment', slot: 'relic', statModifiers };
}

const fresh = () => createCharacter({ name: 'Test', level: 5, baseStats: { heart: 5, body: 5, mind: 5 } });

describe('Phase 18 — EquipmentLoadout equip/unequip', () => {
    it('starts with an empty loadout', () => {
        const c = fresh();
        expect(c.equipment).toEqual({ weapon: null, armor: null, relics: [] });
        expect(getEquippedItems(c.equipment)).toEqual([]);
    });

    it('weapon and armor replace in place', () => {
        let c = fresh();
        c = equipItem(c, weapon('sword'));
        c = equipItem(c, weapon('axe'));
        expect(c.equipment.weapon?.id).toBe('axe');
        c = equipItem(c, armor('mail'));
        expect(c.equipment.armor?.id).toBe('mail');
        expect(getEquippedItems(c.equipment).map(i => i.id)).toEqual(['axe', 'mail']);
    });

    it('relics fill the first free position (up to 3)', () => {
        let c = fresh();
        c = equipItem(c, relic('a'));
        c = equipItem(c, relic('b'));
        c = equipItem(c, relic('c'));
        expect(c.equipment.relics.map(i => i.id)).toEqual(['a', 'b', 'c']);
    });

    it('a 4th relic with the row full is a guarded no-op (same reference)', () => {
        let c = fresh();
        c = equipItem(c, relic('a'));
        c = equipItem(c, relic('b'));
        c = equipItem(c, relic('c'));
        const blocked = equipItem(c, relic('d'));
        expect(blocked).toBe(c);
        expect(blocked.equipment.relics.map(i => i.id)).toEqual(['a', 'b', 'c']);
    });

    it('replaceIndex swaps a specific relic position when full', () => {
        let c = fresh();
        c = equipItem(c, relic('a'));
        c = equipItem(c, relic('b'));
        c = equipItem(c, relic('c'));
        c = equipItem(c, relic('d'), { replaceIndex: 1 });
        expect(c.equipment.relics.map(i => i.id)).toEqual(['a', 'd', 'c']);
    });

    it('unequipItem frees exactly the indexed relic and compacts the rest', () => {
        let c = fresh();
        c = equipItem(c, relic('a'));
        c = equipItem(c, relic('b'));
        c = equipItem(c, relic('c'));
        c = unequipItem(c, 'relic', 0);
        expect(c.equipment.relics.map(i => i.id)).toEqual(['b', 'c']);
    });

    it('unequipItem on relic with no / out-of-range index is a no-op', () => {
        let c = fresh();
        c = equipItem(c, relic('a'));
        expect(unequipItem(c, 'relic')).toBe(c);
        expect(unequipItem(c, 'relic', 5)).toBe(c);
    });

    it('unequip weapon/armor clears the slot', () => {
        let c = fresh();
        c = equipItem(c, weapon('sword'));
        c = equipItem(c, armor('mail'));
        c = unequipItem(c, 'weapon');
        expect(c.equipment.weapon).toBeNull();
        expect(c.equipment.armor?.id).toBe('mail');
    });

    it('maxHealth folds every worn piece\'s maxHp and drops on unequip', () => {
        let c = fresh();
        const hpBefore = c.maxHealth;
        c = equipItem(c, weapon('sword', 4));
        c = equipItem(c, relic('ring', 6));
        const withGear = c.maxHealth;
        expect(withGear).toBeGreaterThan(hpBefore);

        // wornMaxHpBonus over the loadout sums both pieces' maxHp lines.
        expect(wornMaxHpBonus(c.equipment)).toBe(10);

        c = unequipItem(c, 'weapon');
        expect(c.maxHealth).toBeLessThan(withGear);
    });
});
