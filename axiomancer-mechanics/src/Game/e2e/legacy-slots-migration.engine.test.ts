/**
 * Hermetic E2E — legacy slot re-slotting + v11 → v12 save migration.
 *
 * `LEGACY_SLOT_MAP` / `reslotLegacyEquipment` / `reslotLegacyLoadout` fold the
 * old 7-slot shape into the 5-slot loadout; `migrate` applies the whole
 * transform to a v11 save (body loses to armor, fixed accessory order, overflow
 * to inventory, item slot strings re-mapped).
 */

import { describe, it, expect } from 'vitest';

import {
    reslotLegacyEquipment, reslotLegacyLoadout, LEGACY_SLOT_MAP,
    migrate, createNewGameState, GAME_STATE_VERSION,
} from '../index';
import { getEquippedItems } from '../../Character';
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
        expect(loadout.relics.map(i => i.id)).toEqual(['ring', 'helm', 'gaunt']);
        expect(loadout.relics.every(i => i.slot === 'relic')).toBe(true);
        expect(overflow.map(i => i.id)).toEqual(['boots']);
    });
});

describe('Phase 18 — migrate v11 → v12', () => {
    function v11Save() {
        const state = createNewGameState();
        // Downgrade to a v11-shaped payload: legacy record equipment + legacy
        // inventory equipment, worn record over-filled to force overflow.
        const raw = {
            ...state,
            version: 11,
            player: {
                ...state.player,
                equipment: {
                    weapon: legacy('sword', 'weapon'),
                    armor: legacy('plate', 'armor'),
                    body: legacy('coat', 'body', 3),
                    head: legacy('helm', 'head'),
                    hands: legacy('gaunt', 'hands'),
                    feet: legacy('boots', 'feet'),
                    accessory: legacy('ring', 'accessory'),
                },
                inventory: [legacy('spare-cap', 'head')],
            },
        };
        return raw as unknown;
    }

    it('folds the legacy record into a loadout', () => {
        // Pin toVersion=12 to exercise the v11→v12 hop in isolation; the
        // v12→v13 relic seeding (which would replace this loadout) is
        // covered separately in the relic-library migration test.
        const migrated = migrate(v11Save(), 11, 12);
        expect(migrated.version).toBe(12);

        const loadout = migrated.player.equipment;
        expect(loadout.weapon?.id).toBe('sword');
        expect(loadout.armor?.id).toBe('plate');           // armor wins over body
        expect(loadout.relics.length).toBe(3);
        // worn set is exactly 5 pieces (1 weapon + 1 armor + 3 relics).
        expect(getEquippedItems(loadout).length).toBe(5);
    });

    it('returns worn overflow (body + 4th relic) and re-slots inventory equipment', () => {
        const migrated = migrate(v11Save(), 11, 12);
        const invIds = migrated.player.inventory.map(i => i.id);
        // coat (body loses to armor) and one relic overflow land in inventory,
        // alongside the pre-existing spare-cap (re-slotted to relic).
        expect(invIds).toContain('coat');
        const spare = migrated.player.inventory.find(i => i.id === 'spare-cap') as Equipment;
        expect(spare.slot).toBe('relic');
        expect('accessoryKind' in spare).toBe(false);
    });

    it('a v11 save still chains to the current version on the relic model', () => {
        const migrated = migrate(v11Save(), 11);
        expect(migrated.version).toBe(GAME_STATE_VERSION);
        const json = JSON.stringify(migrated);
        expect(json).not.toMatch(/accessoryKind|"accessories"|"accessory"/);
        expect(Array.isArray(migrated.player.equipment.relics)).toBe(true);
    });

    it('still rejects an unsupported (non-v11) version', () => {
        expect(() => migrate({ version: 9 }, 9)).toThrow(/not supported/);
    });
});
