/**
 * Hermetic E2E — one weapon, one armor, three relic slots.
 *
 * Any relic, whatever it is called, fits any of the three relic positions;
 * a piece has exactly one slot kind; only the relic slot grants signatures
 * (and, once relics carry one, lanes).
 */

import { describe, it, expect } from 'vitest';

import { createCharacter } from '../../Character';
import { equipItem, unequipItem } from '../../Character/equipment.reducer';
import { FIXTURE_WEAPON, FIXTURE_ARMOR } from '../../Game/fixtures';
import { getSignaturesForLoadout, relicLibrary } from '../relic.library';
import { SLOT_CAPACITY } from '../types';
import type { Equipment } from '../types';

/** Three fixture relics with different names and no kind. */
const RING: Equipment = { id: 'fx-ring', name: 'Plain Ring', description: '', category: 'equipment', slot: 'relic' };
const BROOCH: Equipment = { id: 'fx-brooch', name: 'Tin Brooch', description: '', category: 'equipment', slot: 'relic' };
const CIRCLET: Equipment = { id: 'fx-circlet', name: 'Iron Circlet', description: '', category: 'equipment', slot: 'relic' };
const FOURTH: Equipment = { id: 'fx-belt', name: 'Rope Belt', description: '', category: 'equipment', slot: 'relic' };

const fresh = () => createCharacter({ name: 'Test', level: 5, baseStats: { heart: 5, body: 5, mind: 5 } });

function permutations<T>(xs: readonly T[]): T[][] {
    if (xs.length <= 1) return [xs.slice()];
    return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p]));
}

describe('the slot model', () => {
    it('is one weapon, one armor and three relics', () => {
        expect(SLOT_CAPACITY).toEqual({ weapon: 1, armor: 1, relic: 3 });
        expect(fresh().equipment).toEqual({ weapon: null, armor: null, relics: [] });
    });
});

describe('any relic fits any relic slot', () => {
    const orders = permutations([RING, BROOCH, CIRCLET]);

    it('covers all six orders', () => {
        expect(orders).toHaveLength(6);
    });

    it.each(orders.map(o => [o.map(r => r.name).join(', '), o] as const))(
        'equipping %s fills the first free relic position each time',
        (_label, order) => {
            let c = fresh();
            order.forEach((relic, i) => {
                c = equipItem(c, relic);
                expect(c.equipment.relics).toHaveLength(i + 1);
                expect(c.equipment.relics[i]!.id).toBe(relic.id);
            });
            expect(c.equipment.relics.map(r => r.id)).toEqual(order.map(r => r.id));
        },
    );

    it('a fourth relic without replaceIndex is the guarded no-op', () => {
        let c = fresh();
        for (const r of [RING, BROOCH, CIRCLET]) c = equipItem(c, r);
        expect(equipItem(c, FOURTH)).toBe(c);
    });

    it.each([0, 1, 2])('a fourth relic with replaceIndex %i swaps that position', (idx) => {
        let c = fresh();
        for (const r of [RING, BROOCH, CIRCLET]) c = equipItem(c, r);
        const swapped = equipItem(c, FOURTH, { replaceIndex: idx });
        const expected = [RING, BROOCH, CIRCLET].map(r => r.id);
        expected[idx] = FOURTH.id;
        expect(swapped.equipment.relics.map(r => r.id)).toEqual(expected);
    });

    it('unequip compacts the relic row', () => {
        let c = fresh();
        for (const r of [RING, BROOCH, CIRCLET]) c = equipItem(c, r);
        c = unequipItem(c, 'relic', 0);
        expect(c.equipment.relics.map(r => r.id)).toEqual([BROOCH.id, CIRCLET.id]);
    });
});

describe('each piece has one slot kind; only relics grant', () => {
    it('every library piece that grants a signature or a lane is a relic', () => {
        for (const piece of relicLibrary) {
            const grants = piece.grantsSignature !== undefined
                || (piece as Equipment & { laneId?: unknown }).laneId !== undefined;
            if (grants) expect(piece.slot).toBe('relic');
        }
    });

    it('a weapon and an armor leave the relic positions untouched', () => {
        let c = equipItem(fresh(), RING);
        const relicsBefore = c.equipment.relics;
        c = equipItem(c, FIXTURE_WEAPON);
        c = equipItem(c, FIXTURE_ARMOR);
        expect(c.equipment.weapon?.id).toBe(FIXTURE_WEAPON.id);
        expect(c.equipment.armor?.id).toBe(FIXTURE_ARMOR.id);
        expect(c.equipment.relics).toBe(relicsBefore);
    });

    it('signatures are read from the relics only', () => {
        const carrier = { grantsSignature: 'sig-disarming-plea' as const };
        expect(getSignaturesForLoadout({
            weapon: { ...FIXTURE_WEAPON, ...carrier },
            armor: { ...FIXTURE_ARMOR, grantsSignature: 'sig-bleeding-signet' },
            relics: [],
        })).toEqual([]);
        expect(getSignaturesForLoadout({
            weapon: null, armor: null, relics: [{ ...RING, ...carrier }],
        })).toEqual(['sig-disarming-plea']);
    });
});
