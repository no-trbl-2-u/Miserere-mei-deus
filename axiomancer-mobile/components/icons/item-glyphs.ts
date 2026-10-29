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
 * Which icon an item wears is an art call made by the owner (IT1b, T's
 * picks of 2026-10-27; IT2, the potions, 2026-10-29); an id with no row
 * draws its category glyph.
 * `ITEM_GLYPH_ACCENTS` adds T's colour accents to a row's icon.
 */

import { isAxmIconName, type AxmIconName, type IconAccent } from './icon-registry';

export type ItemGlyphTable = Readonly<Record<string, AxmIconName>>;

export const ITEM_GLYPH_BY_ID = {
    'relic-crimson-circlet': 'relic-tiara',
    'relic-ruby-signet': 'relic-diamond-ring',
    'relic-bleeding-signet': 'relic-chalice-drops',
    'relic-elementalist-signet': 'relic-bolt-eye',
    'relic-elementalist-brooch': 'relic-gem-pendant',
    'relic-elementalist-belt': 'relic-frostfire',
    'healing-potion': 'potion-heart-flask',
    'minor-healing-potion': 'potion-vial',
    'greater-healing-potion': 'potion-perfume-bottle',
} as const satisfies ItemGlyphTable;

export type ItemGlyphAccentTable = Readonly<Record<string, readonly IconAccent[]>>;

/**
 * Colour accents per item id, in the icon's own 512-unit space. Blood
 * Price wears the theme's blood; the Elementalist wears the weather hues
 * its signatures move between; the healing potions' liquid is blood red
 * (T, 2026-10-29: "Red liquid on all three"). Clip shapes were fitted to each icon's
 * geometry by eye at 28pt and at 3x.
 */
export const ITEM_GLYPH_ACCENTS = {
    // The tiara's centre jewel.
    'relic-crimson-circlet': [{ hue: 'blood', clip: [{ kind: 'ellipse', cx: 256, cy: 150, rx: 52, ry: 128 }] }],
    // The ring's gem as a ruby, enlarged (T: "bigger ruby").
    'relic-ruby-signet': [
        {
            hue: 'blood',
            clip: [{ kind: 'polygon', points: [[160, 15], [352, 15], [352, 62], [262, 160], [250, 160], [160, 62]] }],
            grow: { factor: 1.45, ax: 256, ay: 25 },
        },
    ],
    // The three drops and their splash.
    'relic-bleeding-signet': [
        {
            hue: 'blood',
            clip: [
                { kind: 'ellipse', cx: 211, cy: 96, rx: 34, ry: 78 },
                { kind: 'ellipse', cx: 252, cy: 120, rx: 38, ry: 92 },
                { kind: 'ellipse', cx: 317, cy: 83, rx: 32, ry: 58 },
                { kind: 'ellipse', cx: 256, cy: 190, rx: 44, ry: 20 },
            ],
        },
    ],
    // The bolt inside the iris.
    'relic-elementalist-signet': [{ hue: 'storm', clip: [{ kind: 'circle', cx: 256, cy: 192, r: 104 }] }],
    // The chain gold, the gem amber.
    'relic-elementalist-brooch': [
        { hue: 'storm', clip: [{ kind: 'rect', x: 0, y: 0, w: 512, h: 186 }] },
        { hue: 'ember', clip: [{ kind: 'rect', x: 0, y: 186, w: 512, h: 326 }] },
    ],
    // The flame amber, the snowflakes BLIZZARD blue.
    'relic-elementalist-belt': [
        { hue: 'ember', clip: [{ kind: 'rect', x: 0, y: 0, w: 512, h: 512 }] },
        {
            hue: 'frost',
            clip: [
                { kind: 'circle', cx: 160, cy: 70, r: 48 },
                { kind: 'circle', cx: 429, cy: 83, r: 50 },
                { kind: 'circle', cx: 70, cy: 442, r: 50 },
                { kind: 'circle', cx: 333, cy: 333, r: 112 },
            ],
        },
    ],
    // The heart inside the flask.
    'healing-potion': [
        { hue: 'blood', clip: [{ kind: 'polygon', points: [[118, 196], [420, 196], [420, 330], [264, 445], [118, 330]] }] },
    ],
    // The tube below the glass window, bubbles and all.
    'minor-healing-potion': [{ hue: 'blood', clip: [{ kind: 'rect', x: 0, y: 248, w: 512, h: 264 }] }],
    // The bottle's belly, below the collar.
    'greater-healing-potion': [{ hue: 'blood', clip: [{ kind: 'ellipse', cx: 256, cy: 322, rx: 168, ry: 80 }] }],
} as const satisfies ItemGlyphAccentTable;

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
