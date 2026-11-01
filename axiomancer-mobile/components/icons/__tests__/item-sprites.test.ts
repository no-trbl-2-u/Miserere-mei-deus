/**
 * Every item draws its picture. `ITEM_SPRITES` holds the 23 ids of
 * the item icon table (the ten weapon and armor ids included, ahead of their content), each
 * with a label, and a relic or consumable in the libraries without a sprite
 * fails here. Once weapons and armors exist, the weapon and armor libraries join the check
 * (the `LIBRARIES` list below is the one place to add them).
 */

import { describe, expect, it } from '@jest/globals';
import { consumableLibrary, relicLibrary } from '@mechanics';
import * as mechanics from '@mechanics';

import { ITEM_SPRITES, ITEM_SPRITE_LABELS, getItemSprite, getItemSpriteLabel } from '@/components/icons/item-sprites';

const SPEC_IDS = [
    'weapon-opening-blade', 'armor-bracing-coat', 'weapon-siphoning-blade', 'armor-bloodward-mail',
    'weapon-stormcaller-staff', 'armor-flame-guard', 'weapon-bulwark-mace', 'armor-scavengers-coat',
    'weapon-humbling-rod', 'armor-mending-vestments',
    'relic-disarming-plea', 'relic-crimson-circlet', 'relic-ruby-signet', 'relic-bleeding-signet',
    'relic-elementalist-signet', 'relic-elementalist-brooch', 'relic-elementalist-belt',
    'relic-thornback-signet', 'relic-mirror-brooch', 'relic-carapace-belt',
    'minor-healing-potion', 'healing-potion', 'greater-healing-potion',
];

/** Weapon and armor libraries, once they are exported. */
const optional = (name: string): readonly { id: string }[] => {
    const lib = (mechanics as unknown as Record<string, unknown>)[name];
    return Array.isArray(lib) ? (lib as { id: string }[]) : [];
};
const LIBRARIES: readonly (readonly { id: string }[])[] = [
    consumableLibrary,
    relicLibrary,
    optional('weaponLibrary'),
    optional('armorLibrary'),
];

describe('ITEM_SPRITES', () => {
    it('holds the 23 ids of "The icons"', () => {
        expect(Object.keys(ITEM_SPRITES).sort()).toEqual([...SPEC_IDS].sort());
        expect(SPEC_IDS).toHaveLength(23);
    });

    it('every sprite is a bundled module and has a label', () => {
        for (const id of SPEC_IDS) {
            expect(getItemSprite(id)).not.toBeNull();
            expect(getItemSpriteLabel(id)).toMatch(/\S/);
        }
        expect(Object.keys(ITEM_SPRITE_LABELS).sort()).toEqual([...SPEC_IDS].sort());
    });

    it('an unknown id, null and an inherited key have no sprite', () => {
        expect(getItemSprite('not-an-item')).toBeNull();
        expect(getItemSprite(null)).toBeNull();
        expect(getItemSprite(undefined)).toBeNull();
        expect(getItemSprite('constructor')).toBeNull();
        expect(getItemSpriteLabel('toString')).toBeNull();
    });

    it('every relic, consumable (and weapon and armor, once they exist) has a sprite', () => {
        const ids = LIBRARIES.flat().map((i) => i.id);
        expect(ids.length).toBeGreaterThan(0);
        const missing = ids.filter((id) => getItemSprite(id) === null);
        expect(missing).toEqual([]);
    });

});
