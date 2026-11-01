/**
 * Per-item glyph table. An item's glyph is a property of the item, not of
 * its category: this map is the one place an item id meets a registry icon,
 * the same shape as `getCardArt` (`assets/images/cards/index.ts`).
 *
 * It lives beside `icon-registry.ts` rather than in `assets/images/`
 * because its values are registry names, not bundled files.
 *
 * T's own item sheets draw every item that has a row in
 * `item-sprites.ts`, so the table is empty today: the rows IT1b and IT2 held
 * (T's game-icons picks) were replaced by sprites, and their colours are in
 * the art. The table and its accents stay as the fallback for an item with no
 * sprite yet, and as the seam `ItemGlyph`'s tests feed a fixture through.
 *
 * Two differences from the card-art table, both deliberate:
 * - Values are typed `AxmIconName`, so an entry naming an icon that is not
 *   in `GAME_ICON_PATHS` is a compile error, not a silent miss.
 * - A miss never renders nothing. `getItemGlyph` returns `null` for an id
 *   with no entry (or an entry that is somehow not a registry name), and
 *   `ItemGlyph` then draws today's category glyph.
 *
 * `ITEM_GLYPH_ACCENTS` adds colour accents to a row's icon.
 */

import { isAxmIconName, type AxmIconName, type IconAccent } from './icon-registry';

export type ItemGlyphTable = Readonly<Record<string, AxmIconName>>;

export const ITEM_GLYPH_BY_ID = {} as const satisfies ItemGlyphTable;

export type ItemGlyphAccentTable = Readonly<Record<string, readonly IconAccent[]>>;

/**
 * Colour accents per item id, in the icon's own 512-unit space. Empty with the
 * glyph table: a sprite carries its own colours.
 */
export const ITEM_GLYPH_ACCENTS = {} as const satisfies ItemGlyphAccentTable;

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

/**
 * The accents an item's icon wears, or none. Only meaningful when
 * `getItemGlyph` resolved an icon for the same id.
 */
export function getItemGlyphAccents(
    itemId: string | null | undefined,
    table: ItemGlyphAccentTable = ITEM_GLYPH_ACCENTS,
): readonly IconAccent[] {
    if (itemId == null || !Object.prototype.hasOwnProperty.call(table, itemId)) return [];
    return table[itemId];
}
