/**
 * Hermetic E2E — legacy slot re-slotting.
 *
 * `LEGACY_SLOT_MAP` / `reslotLegacyEquipment` / `reslotLegacyLoadout` fold the
 * old 7-slot shape into the 5-slot loadout (body loses to armor, fixed
 * accessory order, overflow to inventory, item slot strings re-mapped). No
 * save migrates any more (v41), but the mobile item-reward queue still reads
 * a pending piece through the re-slot.
 */

import { describe, it, expect } from 'vitest';

import {
    reslotLegacyEquipment, reslotLegacyLoadout, LEGACY_SLOT_MAP,
} from '../index';
import type { Equipment } from '../../Items/types';
import type { StatModifier } from '../../Effects/types';
import type { LegacySlot } from '../index';

/** Build a legacy-shaped Equipment instance (slot may be an old 7-slot kind). */
function legacy(id: string, slot: LegacySlot, maxHp = 0): Equipment {
    const statModifiers: StatModifier[] = maxHp ? [{ stat: 'maxHp', value: maxHp }] : [];
    return {
        id, name: id, description: '', category: 'equipment',
        slot: slot as Equipment['slot'], statModifiers,
    };
}

describe('Phase 18 — reslotLegacyEquipment', () => {
    it('maps head/hands/feet to relic and body to armor, with no kind', () => {
        for (const [id, slot] of [['h', 'head'], ['g', 'hands'], ['b', 'feet']] as const) {
            const out = reslotLegacyEquipment(legacy(id, slot));
            expect(out.slot).toBe('relic');
            expect('accessoryKind' in out).toBe(false);
        }
        expect(reslotLegacyEquipment(legacy('coat', 'body'))).toMatchObject({ slot: 'armor' });
    });

    it('maps the old generic slot to relic and drops any carried kind', () => {
        const old = { ...legacy('trinket', 'accessory'), accessoryKind: 'charm' } as Equipment;
        const out = reslotLegacyEquipment(old);
        expect(out.slot).toBe('relic');
        expect('accessoryKind' in out).toBe(false);
    });

    it('LEGACY_SLOT_MAP sends head, hands, feet and the old generic slot to relic', () => {
        for (const slot of ['accessory', 'head', 'hands', 'feet'] as const) {
            expect(LEGACY_SLOT_MAP[slot].slot).toBe('relic');
        }
        expect(LEGACY_SLOT_MAP.body.slot).toBe('armor');
    });

    it('LEGACY_SLOT_MAP is total over the 7 legacy slots', () => {
        expect(Object.keys(LEGACY_SLOT_MAP).sort()).toEqual(
            ['accessory', 'armor', 'body', 'feet', 'hands', 'head', 'weapon'],
        );
    });
});

describe('Phase 18 — reslotLegacyLoadout', () => {
    it('armor wins the armor slot; body overflows', () => {
        const { loadout, overflow } = reslotLegacyLoadout({
            armor: legacy('plate', 'armor'),
            body: legacy('coat', 'body'),
        });
        expect(loadout.armor?.id).toBe('plate');
        expect(overflow.map(i => i.id)).toEqual(['coat']);
    });

    it('a lone body takes the armor slot', () => {
        const { loadout } = reslotLegacyLoadout({ body: legacy('coat', 'body') });
        expect(loadout.armor?.id).toBe('coat');
    });

    it('fills relics in fixed order [accessory, head, hands, feet]; the 4th overflows', () => {
        const { loadout, overflow } = reslotLegacyLoadout({
            head: legacy('helm', 'head'),
            hands: legacy('gaunt', 'hands'),
            feet: legacy('boots', 'feet'),
            accessory: legacy('ring', 'accessory'),
        });
        // ring (old generic slot) first, then head, hands — feet overflows.
        expect(loadout.relics.flatMap((i) => (i ? [i.id] : []))).toEqual(['ring', 'helm', 'gaunt']);
        expect(loadout.relics.every(i => i?.slot === 'relic')).toBe(true);
        expect(overflow.map(i => i.id)).toEqual(['boots']);
    });
});
