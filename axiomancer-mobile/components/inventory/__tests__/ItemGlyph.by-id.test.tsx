/**
 * Hermetic component tests — ItemGlyph's id-keyed path.
 *
 * Resolution order (EQ3k, spec 136): an id with a sprite (T's sheets,
 * `item-sprites.ts`) draws it; else an id with an entry in the glyph table
 * (`item-glyphs.ts`, empty in production, fed a fixture here) draws that
 * registry icon; every other id draws the category glyph it drew before any
 * table existed.
 */

import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { consumableLibrary, relicLibrary } from '@mechanics';

import { ItemGlyph } from '@/components/inventory/ItemCard';
import { AXM_ICON_SPECS, isAxmIconName, type AxmIconName } from '@/components/icons/icon-registry';
import { ITEM_GLYPH_BY_ID, getItemGlyph, type ItemGlyphTable } from '@/components/icons/item-glyphs';
import { getItemSprite, getItemSpriteLabel } from '@/components/icons/item-sprites';
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
        '%s draws its sprite, read aloud by what it shows',
        (id, item) => {
            expect(getItemSprite(id)).not.toBeNull();
            const label = getItemSpriteLabel(id);
            expect(label).not.toBeNull();
            const { tree } = withAllProviders(<ItemGlyph category={item.category} sub={item.sub} itemId={id} />);
            const rendered = render(tree);
            expect(rendered.getByLabelText(label as string)).toBeTruthy();
            expect(rendered.queryByLabelText('Gem on a chain')).toBeNull();
            expect(rendered.queryByLabelText('Bubbling flask')).toBeNull();
        },
    );

    it('the three potions resolve to three distinct pictures', () => {
        const labels = ['healing-potion', 'minor-healing-potion', 'greater-healing-potion'].map((id) =>
            getItemSpriteLabel(id),
        );
        expect(labels).toEqual(['Heart flask', 'Vial', 'Perfume bottle']);
    });

    it('an id with no sprite and no entry draws the category mark, never nothing', () => {
        const { tree } = withAllProviders(<ItemGlyph category="consumable" sub={null} itemId="not-in-the-table" />);
        expect(render(tree).getByLabelText('Bubbling flask')).toBeTruthy();
    });

    it('an id with a table entry draws that registry icon (the fixture seam)', () => {
        const glyphs: ItemGlyphTable = { 'healing-potion': 'action-herbs' };
        const { tree } = withAllProviders(
            <ItemGlyph category="consumable" sub={null} itemId="healing-potion" glyphs={glyphs} />,
        );
        const rendered = render(tree);
        expect(rendered.getByLabelText(AXM_ICON_SPECS['action-herbs'].label)).toBeTruthy();
        expect(rendered.queryByLabelText('Heart flask')).toBeNull();
        expect(rendered.queryByLabelText('Bubbling flask')).toBeNull();
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

    it('a sprite draws at the size asked', () => {
        const { tree } = withAllProviders(
            <ItemGlyph category="equipment" sub="Relic" itemId="relic-ruby-signet" size={44} />,
        );
        const img = render(tree).getByLabelText('Ruby ring');
        expect(img.props.style).toEqual({ width: 44, height: 44 });
    });
});

describe("ItemGlyph: category and unknown marks are registry icons (IT2, 2026-10-30)", () => {
    const MARKS: [InventoryCategory, string | null, string][] = [
        ['consumable', null, 'Bubbling flask'],
        ['equipment', 'Relic', 'Gem on a chain'],
        ['quest', null, 'Key'],
        ['equipment', 'Unknown', 'Question mark'],
    ];
    it.each(MARKS)('%s / %s draws "%s"', (category, sub, label) => {
        const { tree } = withAllProviders(<ItemGlyph category={category} sub={sub} />);
        expect(render(tree).getByLabelText(label)).toBeTruthy();
    });
});
