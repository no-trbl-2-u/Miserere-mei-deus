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

    const withRow = (id: string) => Object.prototype.hasOwnProperty.call(ITEM_GLYPH_BY_ID, id);

    it.each(LIBRARY_ITEMS.map((it) => [it.id] as const))('%s has its own table entry', (id) => {
        expect(withRow(id)).toBe(true);
    });

    it('the three potions resolve to three distinct icons', () => {
        const names = ['healing-potion', 'minor-healing-potion', 'greater-healing-potion'].map((id) => getItemGlyph(id));
        expect(names.every((n) => n !== null)).toBe(true);
        expect(new Set(names).size).toBe(3);
    });

    it.each(LIBRARY_ITEMS.filter((it) => withRow(it.id)).map((it) => [it.id, it] as const))(
        '%s (picked) draws its own icon, not the category glyph',
        (id, item) => {
            const name = getItemGlyph(id);
            expect(name).not.toBeNull();
            const { tree } = withAllProviders(<ItemGlyph category={item.category} sub={item.sub} itemId={id} />);
            const rendered = render(tree);
            expect(rendered.getByLabelText(AXM_ICON_SPECS[name as AxmIconName].label)).toBeTruthy();
            expect(rendered.queryByLabelText('Gem on a chain')).toBeNull();
        },
    );

    it('every table row names an item in the libraries', () => {
        const ids = new Set(LIBRARY_ITEMS.map((it) => it.id));
        for (const id of Object.keys(ITEM_GLYPH_BY_ID)) expect(ids.has(id)).toBe(true);
    });

    it('an id with no entry draws the category mark, never nothing', () => {
        const { tree } = withAllProviders(<ItemGlyph category="consumable" sub={null} itemId="not-in-the-table" />);
        expect(render(tree).getByLabelText('Bubbling flask')).toBeTruthy();
    });

    it('picked items draw distinct icons', () => {
        const names = Object.values(ITEM_GLYPH_BY_ID) as string[];
        expect(new Set(names).size).toBe(names.length);
    });

    it('an id with a table entry draws that registry icon', () => {
        const glyphs: ItemGlyphTable = { 'healing-potion': 'action-herbs' };
        const { tree } = withAllProviders(
            <ItemGlyph category="consumable" sub={null} itemId="healing-potion" glyphs={glyphs} />,
        );
        const rendered = render(tree);
        expect(rendered.getByLabelText(AXM_ICON_SPECS['action-herbs'].label)).toBeTruthy();
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
});

describe("ItemGlyph: T's potion picks (IT2, 2026-10-29)", () => {
    const PICKS: [string, AxmIconName, string][] = [
        ['healing-potion', 'potion-heart-flask', 'Flask with a heart'],
        ['minor-healing-potion', 'potion-vial', 'Slim vial'],
        ['greater-healing-potion', 'potion-perfume-bottle', 'Stoppered crystal bottle'],
    ];
    it.each(PICKS)('%s draws %s, read aloud as "%s"', (id, icon, label) => {
        expect(getItemGlyph(id)).toBe(icon);
        expect(AXM_ICON_SPECS[icon].label).toBe(label);
        const { tree } = withAllProviders(<ItemGlyph category="consumable" sub={null} itemId={id} />);
        expect(render(tree).getByLabelText(label)).toBeTruthy();
    });
});

describe("ItemGlyph: T's relic picks (IT2, 2026-10-30)", () => {
    const PICKS: [string, AxmIconName, string][] = [
        ['relic-disarming-plea', 'relic-engagement-ring', 'Hand holding a ring'],
        ['relic-thornback-signet', 'relic-thorn-helix', 'Thorned vine'],
        ['relic-mirror-brooch', 'relic-mirror-mirror', 'Framed mirror'],
        ['relic-carapace-belt', 'relic-turtle-shell', 'Turtle shell'],
    ];
    it.each(PICKS)('%s draws %s, read aloud as "%s"', (id, icon, label) => {
        expect(getItemGlyph(id)).toBe(icon);
        expect(AXM_ICON_SPECS[icon].label).toBe(label);
        const { tree } = withAllProviders(<ItemGlyph category="equipment" sub="Relic" itemId={id} />);
        expect(render(tree).getByLabelText(label)).toBeTruthy();
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
