/**
 * Per-item glyph table. An item's glyph is a property of the item, not of
 * its category: this map is the one place an item id meets a registry icon,
 * the same shape as `getCardArt` (`assets/images/cards/index.ts`).
 *
 * It lives beside `icon-registry.ts` rather than in `assets/images/`
 * because its values are registry names, not bundled files.
 *
 * Two differences from the card-art table, both deliberate:
 * - Values are typed `AxmIconName`, so an entry naming an icon that is not
 *   in `GAME_ICON_PATHS` is a compile error, not a silent miss.
 * - A miss never renders nothing. `getItemGlyph` returns `null` for an id
 *   with no entry (or an entry that is somehow not a registry name), and
 *   `ItemGlyph` then draws today's category glyph.
 *
 * The table starts empty, so every item draws its category glyph. Which
 * icon an item wears is an art call made by the owner; filling a row is the
 * whole change.
 */

import { isAxmIconName, type AxmIconName } from './icon-registry';

export type ItemGlyphTable = Readonly<Record<string, AxmIconName>>;

export const ITEM_GLYPH_BY_ID = {} as const satisfies ItemGlyphTable;

/**
 * The registry icon an item wears, or `null` when the caller should draw
 * the item's category glyph. `table` defaults to `ITEM_GLYPH_BY_ID`; tests
 * pass their own fixture.
 */
export function getItemGlyph(
    itemId: string | null | undefined,
    table: ItemGlyphTable = ITEM_GLYPH_BY_ID,
): AxmIconName | null {
    if (itemId == null || !Object.prototype.hasOwnProperty.call(table, itemId)) return null;
    const name: string = table[itemId];
    return isAxmIconName(name) ? name : null;
}
