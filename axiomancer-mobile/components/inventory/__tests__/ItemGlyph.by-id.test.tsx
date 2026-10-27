/**
 * Hermetic component tests — ItemGlyph's id-keyed path.
 *
 * Pins the item glyph table (`components/icons/item-glyphs.ts`): an id with
 * an entry draws that registry icon; every other id draws the category glyph
 * it drew before the table existed. The library enumeration below is the
 * no-pixel-moved proof while the table is empty, and keeps covering items
 * added to the consumable and relic libraries later.
 */

import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { consumableLibrary, relicLibrary } from '@mechanics';

import { ItemGlyph } from '@/components/inventory/ItemCard';
import { AXM_ICON_SPECS, isAxmIconName, type AxmIconName } from '@/components/icons/icon-registry';
import { ITEM_GLYPH_BY_ID, getItemGlyph, type ItemGlyphTable } from '@/components/icons/item-glyphs';
import { withAllProviders } from '@/test-utils/withAllProviders';
import type { InventoryCategory } from '@/state/presenters/inventory.engine';

const SLOT_SUB: Record<string, string> = { weapon: 'Weapon', armor: 'Armor', relic: 'Relic' };

interface LibraryItem {
    id: string;
    category: InventoryCategory;
    sub: string | null;
}

const LIBRARY_ITEMS: readonly LibraryItem[] = [
    ...consumableLibrary.map((c) => ({ id: c.id, category: 'consumable' as const, sub: null })),
    ...relicLibrary.map((r) => ({ id: r.id, category: 'equipment' as const, sub: SLOT_SUB[r.slot] ?? null })),
];

function renderJson(node: React.ReactElement) {
    const { tree } = withAllProviders(node);
    return render(tree).toJSON();
}

describe('item glyph table', () => {
    it('every value is a registry icon name', () => {
        for (const name of Object.values(ITEM_GLYPH_BY_ID) as string[]) {
            expect(isAxmIconName(name)).toBe(true);
        }
    });

    it('resolves an id with an entry, and returns null for one without', () => {
        const table: ItemGlyphTable = { 'healing-potion': 'action-herbs' };
        expect(getItemGlyph('healing-potion', table)).toBe('action-herbs');
        expect(getItemGlyph('minor-healing-potion', table)).toBeNull();
        expect(getItemGlyph(null, table)).toBeNull();
        expect(getItemGlyph(undefined, table)).toBeNull();
    });

    it('ignores inherited keys on the table', () => {
        expect(getItemGlyph('constructor', {})).toBeNull();
        expect(getItemGlyph('toString', {})).toBeNull();
    });

    it('returns null for an entry that is not a registry name', () => {
        const bogus = { 'healing-potion': 'not-an-icon' as AxmIconName } as ItemGlyphTable;
        expect(getItemGlyph('healing-potion', bogus)).toBeNull();
    });
});

describe('ItemGlyph: id-keyed resolution', () => {
    it('the library is not empty (the enumeration below is not vacuous)', () => {
        expect(consumableLibrary.length).toBeGreaterThan(0);
        expect(relicLibrary.length).toBeGreaterThan(0);
    });

    it.each(LIBRARY_ITEMS.map((it) => [it.id, it] as const))(
        '%s draws the glyph it drew before the table existed',
        (_id, item) => {
            const byId = renderJson(<ItemGlyph category={item.category} sub={item.sub} itemId={item.id} />);
            const byCategory = renderJson(<ItemGlyph category={item.category} sub={item.sub} />);
            expect(byId).not.toBeNull();
            expect(byId).toEqual(byCategory);
        },
    );

    it('an id with a table entry draws that registry icon', () => {
        const glyphs: ItemGlyphTable = { 'healing-potion': 'action-herbs' };
        const { tree } = withAllProviders(
            <ItemGlyph category="consumable" sub={null} itemId="healing-potion" glyphs={glyphs} />,
        );
        const rendered = render(tree);
        expect(rendered.getByLabelText(AXM_ICON_SPECS['action-herbs'].label)).toBeTruthy();
        expect(rendered.queryByLabelText('Consumable item icon')).toBeNull();
    });

    it('a bogus entry falls back to the category glyph instead of rendering nothing', () => {
        const glyphs = { 'healing-potion': 'not-an-icon' as AxmIconName } as ItemGlyphTable;
        const bogus = renderJson(
            <ItemGlyph category="consumable" sub={null} itemId="healing-potion" glyphs={glyphs} />,
        );
        const byCategory = renderJson(<ItemGlyph category="consumable" sub={null} />);
        expect(bogus).not.toBeNull();
        expect(bogus).toEqual(byCategory);
    });
});
