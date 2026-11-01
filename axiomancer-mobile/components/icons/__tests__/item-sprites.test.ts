/**
 * EQ3k (A20): every item draws its picture. `ITEM_SPRITES` holds the 23 ids of
 * spec 136 "The icons" (the ten pieces' ids included, ahead of 136.6), each
 * with a label, and a relic or consumable in the libraries without a sprite
 * fails here. Once 136.6 lands, the weapon and armor libraries join the check
 * (the `LIBRARIES` list below is the one place to add them).
 */

import fs from 'fs';
import path from 'path';
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

/** Weapon and armor libraries, once 136.6 exports them. */
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

    it('each sprite file is on disk as a 256 px PNG named by its id', () => {
        const dir = path.join(__dirname, '..', '..', '..', 'assets', 'images', 'items');
        for (const id of SPEC_IDS) {
            const file = path.join(dir, `${id}.png`);
            expect(fs.existsSync(file)).toBe(true);
            const head = fs.readFileSync(file).subarray(0, 24);
            expect(head.subarray(1, 4).toString()).toBe('PNG');
            expect(head.readUInt32BE(16)).toBe(256);
            expect(head.readUInt32BE(20)).toBe(256);
        }
    });
});
