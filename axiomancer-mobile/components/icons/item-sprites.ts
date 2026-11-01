/**
 * Item sprites: the picture an item wears, from T's own item sheets.
 * The files and their `require` literals live in
 * `assets/images/items/index.ts` (Metro needs static literals, and the asset
 * check walks a category's registry); this module is the lookup the glyph
 * reads. An id with a sprite draws it; any other id draws the glyph chain in
 * `item-glyphs.ts`, and then the category glyph.
 */

import { ITEM_SPRITE_FILES } from '@/assets/images/items';

export { ITEM_SPRITE_FILES };

export type ItemSpriteTable = Readonly<Record<string, number>>;

export const ITEM_SPRITES: ItemSpriteTable = ITEM_SPRITE_FILES;

/** The sprite an item wears, or `null` when the caller should draw a glyph. */
export function getItemSprite(
    itemId: string | null | undefined,
    table: ItemSpriteTable = ITEM_SPRITES,
): number | null {
    if (itemId == null || !Object.prototype.hasOwnProperty.call(table, itemId)) return null;
    return table[itemId];
}

/** What each sprite shows, read aloud (T's picture table). */
export const ITEM_SPRITE_LABELS: Readonly<Record<keyof typeof ITEM_SPRITE_FILES, string>> = {
    'weapon-opening-blade': 'Longsword',
    'armor-bracing-coat': 'Steel breastplate',
    'weapon-siphoning-blade': 'Scimitar',
    'armor-bloodward-mail': 'Gold breastplate',
    'weapon-stormcaller-staff': 'Staff',
    'armor-flame-guard': 'Kite shield',
    'weapon-bulwark-mace': 'Gold hammer',
    'armor-scavengers-coat': 'Round shield',
    'weapon-humbling-rod': 'Gold scepter',
    'armor-mending-vestments': 'Purple cloak',
    'relic-disarming-plea': 'Pearl ring',
    'relic-crimson-circlet': 'Circlet',
    'relic-ruby-signet': 'Ruby ring',
    'relic-bleeding-signet': 'Bleeding chalice',
    'relic-elementalist-signet': 'Eye',
    'relic-elementalist-brooch': 'Amber pendant',
    'relic-elementalist-belt': 'Flame belt',
    'relic-thornback-signet': 'Thorn ring',
    'relic-mirror-brooch': 'Mirror',
    'relic-carapace-belt': 'Shell belt',
    'minor-healing-potion': 'Vial',
    'healing-potion': 'Heart flask',
    'greater-healing-potion': 'Perfume bottle',
};

/** What a sprite shows, or `null` for an id with none. */
export function getItemSpriteLabel(itemId: string | null | undefined): string | null {
    if (itemId == null || !Object.prototype.hasOwnProperty.call(ITEM_SPRITE_LABELS, itemId)) return null;
    return (ITEM_SPRITE_LABELS as Record<string, string>)[itemId];
}
