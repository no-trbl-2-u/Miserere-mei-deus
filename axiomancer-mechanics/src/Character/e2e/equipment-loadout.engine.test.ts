/**
 * Hermetic E2E — five-slot equipment loadout.
 *
 * Proves the `EquipmentLoadout` semantics end-to-end:
 *   • weapon / armor replace in place.
 *   • relics keep their place (EQ3a): each of 3 positions is a piece or `null`;
 *     a relic with no position fills the first empty one, a 4th with all
 *     three full is a guarded no-op (same reference) unless `position` is passed.
 *   • unequipItem empties exactly the indexed relic position and moves no other.
 *   • getEquippedItems / wornMaxHpBonus fold the whole loadout.
 *   • maxHealth tracks the worn maxHp lines on every equip/unequip.
 */

import { describe, it, expect } from 'vitest';

import { createCharacter } from '../index';
import {
    equipItem, unequipItem, getEquippedItems, wornMaxHpBonus, relicPositions,
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

const ids = (c: { equipment: { relics: (Equipment | null)[] } }) => c.equipment.relics.map((i) => i?.id ?? null);

const fresh = () => createCharacter({ name: 'Test', level: 5, baseStats: { heart: 5, body: 5, mind: 5 } });

describe('Phase 18 — EquipmentLoadout equip/unequip', () => {
    it('starts with an empty loadout', () => {
        const c = fresh();
        expect(c.equipment).toEqual({ weapon: null, armor: null, relics: [null, null, null] });
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
        expect(c.equipment.relics.flatMap((i) => (i ? [i.id] : []))).toEqual(['a', 'b', 'c']);
    });

    it('a 4th relic with the row full is a guarded no-op (same reference)', () => {
        let c = fresh();
        c = equipItem(c, relic('a'));
        c = equipItem(c, relic('b'));
        c = equipItem(c, relic('c'));
        const blocked = equipItem(c, relic('d'));
        expect(blocked).toBe(c);
        expect(blocked.equipment.relics.flatMap((i) => (i ? [i.id] : []))).toEqual(['a', 'b', 'c']);
    });

    it('a position swaps that relic when full (replaceIndex is the older name)', () => {
        let c = fresh();
        c = equipItem(c, relic('a'));
        c = equipItem(c, relic('b'));
        c = equipItem(c, relic('c'));
        c = equipItem(c, relic('d'), { position: 1 });
        expect(ids(c)).toEqual(['a', 'd', 'c']);
        c = equipItem(c, relic('e'), { replaceIndex: 2 });
        expect(ids(c)).toEqual(['a', 'd', 'e']);
    });

    it('a position wears the relic there even when an earlier position is empty', () => {
        let c = fresh();
        c = equipItem(c, relic('x'), { position: 2 });
        expect(ids(c)).toEqual([null, null, 'x']);
        c = equipItem(c, relic('y'));
        expect(ids(c)).toEqual(['y', null, 'x']);
    });

    it('a position out of range reads as no position', () => {
        let c = fresh();
        c = equipItem(c, relic('a'), { position: 7 });
        expect(ids(c)).toEqual(['a', null, null]);
    });

    it('A1: unequipItem empties exactly the indexed relic, the others keep their place, a fourth takes the hole', () => {
        let c = fresh();
        c = equipItem(c, relic('a'));
        c = equipItem(c, relic('b'));
        c = equipItem(c, relic('c'));
        c = unequipItem(c, 'relic', 0);
        expect(ids(c)).toEqual([null, 'b', 'c']);
        expect(getEquippedItems(c.equipment).map(i => i.id)).toEqual(['b', 'c']);
        c = equipItem(c, relic('d'), { position: 0 });
        expect(ids(c)).toEqual(['d', 'b', 'c']);
    });

    it('A1: with no position a relic fills the first hole, not the end', () => {
        let c = fresh();
        for (const id of ['a', 'b', 'c']) c = equipItem(c, relic(id));
        c = unequipItem(c, 'relic', 1);
        c = equipItem(c, relic('d'));
        expect(ids(c)).toEqual(['a', 'd', 'c']);
    });

    it('unequipItem on an empty relic position is a no-op (same reference)', () => {
        let c = fresh();
        c = equipItem(c, relic('a'));
        expect(unequipItem(c, 'relic', 2)).toBe(c);
    });

    it('relicPositions pads a packed list to three and never mutates the loadout', () => {
        const packed = { weapon: null, armor: null, relics: [relic('a')] };
        expect(relicPositions(packed).map(r => r?.id ?? null)).toEqual(['a', null, null]);
        expect(packed.relics).toHaveLength(1);
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
