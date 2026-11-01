/**
 * Hermetic E2E — preset loadouts are legal.
 *
 * Every character/ladder preset must build a `Character` whose worn loadout
 * obeys the 5-slot cap (≤1 weapon, ≤1 armor, ≤3 relics) and returns any
 * overflow to inventory rather than dropping it.
 */

import { describe, it, expect } from 'vitest';

import { characterPresets, levelLadderPresets, buildCharacterFromPreset } from '../index';
import { getEquippedItems } from '../equipment.reducer';
import { SLOT_CAPACITY, isEquipment } from '../../Items/types';

const allPresets = [...characterPresets, ...levelLadderPresets];

describe('Phase 18 — preset loadouts (Phase 21: relics are the only equipment)', () => {
    it.each(allPresets.map(p => [p.id, p] as const))('%s builds a legal loadout', (_id, preset) => {
        const c = buildCharacterFromPreset(preset);
        const l = c.equipment;
        expect(l.relics.length).toBeLessThanOrEqual(SLOT_CAPACITY.relic);
        expect(getEquippedItems(l).length).toBeLessThanOrEqual(5);
        // Every worn relic is in the relic slot; weapon/armor keep their own.
        for (const a of l.relics) if (a) expect(a.slot).toBe('relic');
        if (l.weapon) expect(l.weapon.slot).toBe('weapon');
        if (l.armor) expect(l.armor.slot).toBe('armor');
    });

    it.each(allPresets.map(p => [p.id, p] as const))('%s wears and owns no equipment (no starting relic, no procedural gear)', (_id, preset) => {
        const c = buildCharacterFromPreset(preset);
        expect(getEquippedItems(c.equipment)).toEqual([]);
        expect(c.inventory.filter(isEquipment)).toEqual([]);
    });
});
