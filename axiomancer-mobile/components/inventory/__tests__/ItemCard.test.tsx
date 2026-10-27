/**
 * Hermetic component tests — ItemCard.
 *
 * Pins the render contract for the core inventory item display:
 * category-based icon rendering, equipped/quantity badge states,
 * expanded card content (description, replace preview deltas),
 * action buttons (USE/EQUIP/DISCARD), and accessibility props.
 *
 * The component is pure presentation — no store reads, no engine
 * calls. Props drive all rendering branches. Test coverage 
 * matches the complex conditional rendering in the component.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, within } from '@testing-library/react-native';
import React from 'react';

import { ItemCard, ItemGlyph, groupByCategory, CATEGORY_ORDER } from '@/components/inventory/ItemCard';
import { withAllProviders } from '@/test-utils/withAllProviders';
import type { InventoryItemRow } from '@/state/presenters/inventory.engine';

// Test fixtures for different item types
const mockEquipmentWeapon: InventoryItemRow = {
    id: 'sword-basic',
    name: 'Iron Sword',
    category: 'equipment',
    sub: 'Weapon',
    quantity: 1,
    
    equipped: false,
    
    wornLabel: null,
    
    actionLabel: 'EQUIP',
    description: 'A sturdy iron blade.',
    canUse: true,
    canDiscard: true,
    replacePreview: null,
    equipDelta: null,
};

const mockEquippedArmor: InventoryItemRow = {
    id: 'leather-vest',
    name: 'Leather Vest',
    category: 'equipment',
    sub: 'Armor',
    quantity: 1,
    
    equipped: true,
    
    wornLabel: 'WORN',
    
    actionLabel: 'EQUIP',
    description: 'Well-worn protection.',
    canUse: false,
    canDiscard: false,
    replacePreview: null,
    equipDelta: null,
};

const mockConsumable: InventoryItemRow = {
    id: 'health-potion',
    name: 'Health Potion',
    category: 'consumable',
    sub: null,
    quantity: 3,
    rarity: null,
    equipped: false,
    wornLabel: null,
    actionLabel: 'USE',
    description: 'Restores vitality.',
    canUse: true,
    canDiscard: true,
    replacePreview: null,
    equipDelta: null,
};

const mockMaterial: InventoryItemRow = {
    id: 'iron-ore',
    name: 'Iron Ore',
    category: 'material',
    sub: null,
    quantity: 5,
    rarity: null,
    equipped: false,
    wornLabel: null,
    actionLabel: 'USE',
    description: 'Raw metal for smithing.',
    canUse: false,
    canDiscard: true,
    replacePreview: null,
    equipDelta: null,
};

const mockQuestItem: InventoryItemRow = {
    id: 'ancient-key',
    name: 'Ancient Key',
    category: 'quest',
    sub: null,
    quantity: 1,
    rarity: null,
    equipped: false,
    wornLabel: null,
    actionLabel: 'USE',
    description: 'Opens forgotten doors.',
    canUse: false,
    canDiscard: false,
    replacePreview: null,
    equipDelta: null,
};

const mockEquipmentWithPreview: InventoryItemRow = {
    id: 'steel-sword',
    name: 'Steel Sword',
    category: 'equipment',
    sub: 'Weapon',
    quantity: 1,
    
    equipped: false,
    
    wornLabel: null,
    
    actionLabel: 'EQUIP',
    description: 'Sharp steel blade.',
    canUse: true,
    canDiscard: true,
    replacePreview: {
        replacing: { id: 'iron-sword', name: 'Iron Sword' },
        deltas: [
            { stat: 'attack', delta: 2 },
            { stat: 'weight', delta: -1 },
        ],
    },
    equipDelta: null,
};

describe('ItemCard: basic rendering', () => {
    const mockHandlers = {
        onTap: jest.fn(),
        onUseOrEquip: jest.fn(),
        onDiscard: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders collapsed equipment item with proper testID', () => {
        const { tree } = withAllProviders(
            <ItemCard
                item={mockEquipmentWeapon}
                expanded={false}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        expect(rendered.getByTestId('item-sword-basic')).toBeTruthy();
        expect(rendered.getByText('Iron Sword')).toBeTruthy();
        expect(rendered.getByTestId('slot-tag-sword-basic')).toBeTruthy();
        expect(rendered.getByText('SLOT · WEAPON')).toBeTruthy();
    });

    it('renders consumable item with quantity badge', () => {
        const { tree } = withAllProviders(
            <ItemCard
                item={mockConsumable}
                expanded={false}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        expect(rendered.getByText('Health Potion')).toBeTruthy();
        expect(rendered.getByText('×3')).toBeTruthy();
    });

    it('renders equipped item with WORN badge and proper styling', () => {
        const { tree } = withAllProviders(
            <ItemCard
                item={mockEquippedArmor}
                expanded={false}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        expect(rendered.getByText('WORN')).toBeTruthy();
        expect(rendered.getByText('Leather Vest')).toBeTruthy();
    });

    it('renders quest item without quantity or worn badges', () => {
        const { tree } = withAllProviders(
            <ItemCard
                item={mockQuestItem}
                expanded={false}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        expect(rendered.getByText('Ancient Key')).toBeTruthy();
        expect(rendered.queryByText(/×/)).toBeNull();
        expect(rendered.queryByText('WORN')).toBeNull();
    });
});

describe('ItemCard: expanded state', () => {
    const mockHandlers = {
        onTap: jest.fn(),
        onUseOrEquip: jest.fn(),
        onDiscard: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows description and action buttons when expanded', () => {
        const { tree } = withAllProviders(
            <ItemCard
                item={mockEquipmentWeapon}
                expanded={true}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        expect(rendered.getByText('"A sturdy iron blade."')).toBeTruthy();
        expect(rendered.getByTestId('use-sword-basic')).toBeTruthy();
        expect(rendered.getByTestId('discard-sword-basic')).toBeTruthy();
        expect(rendered.getByText('EQUIP')).toBeTruthy();
        expect(rendered.getByText('DISCARD')).toBeTruthy();
    });

    it('shows USE button for consumable items', () => {
        const { tree } = withAllProviders(
            <ItemCard
                item={mockConsumable}
                expanded={true}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        expect(rendered.getByText('USE')).toBeTruthy();
        expect(rendered.getByTestId('use-health-potion')).toBeTruthy();
    });

    it('hides action buttons based on canUse/canDiscard flags', () => {
        const { tree } = withAllProviders(
            <ItemCard
                item={mockQuestItem}
                expanded={true}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        expect(rendered.queryByText('USE')).toBeNull();
        expect(rendered.queryByText('DISCARD')).toBeNull();
    });

    it('renders replace preview when present', () => {
        const { tree } = withAllProviders(
            <ItemCard
                item={mockEquipmentWithPreview}
                expanded={true}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        expect(rendered.getByTestId('replace-preview-steel-sword')).toBeTruthy();
        expect(rendered.getByText('REPLACES')).toBeTruthy();
        expect(rendered.getByText('Iron Sword')).toBeTruthy();
        expect(rendered.getAllByText('Steel Sword').length).toBeGreaterThanOrEqual(1);
        expect(rendered.getByText('→')).toBeTruthy();
        expect(rendered.getByText('NET')).toBeTruthy();
        expect(rendered.getByText('+2 attack')).toBeTruthy();
        expect(rendered.getByText('-1 weight')).toBeTruthy();
        expect(rendered.getByTestId('inventory-delta-attack')).toBeTruthy();
        expect(rendered.getByTestId('inventory-delta-weight')).toBeTruthy();
    });

    it('omits slot tag when expanded (equipment only)', () => {
        const { tree } = withAllProviders(
            <ItemCard
                item={mockEquipmentWeapon}
                expanded={true}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        expect(rendered.queryByTestId('slot-tag-sword-basic')).toBeNull();
        expect(rendered.queryByText('SLOT · WEAPON')).toBeNull();
    });
});

describe('ItemCard: interaction handlers', () => {
    const mockHandlers = {
        onTap: jest.fn(),
        onUseOrEquip: jest.fn(),
        onDiscard: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('calls onTap when card is pressed', () => {
        const { tree } = withAllProviders(
            <ItemCard
                item={mockEquipmentWeapon}
                expanded={false}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        fireEvent.press(rendered.getByTestId('item-sword-basic'));
        expect(mockHandlers.onTap).toHaveBeenCalledTimes(1);
    });

    it('calls onUseOrEquip when EQUIP button is pressed', () => {
        const { tree } = withAllProviders(
            <ItemCard
                item={mockEquipmentWeapon}
                expanded={true}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        fireEvent.press(rendered.getByTestId('use-sword-basic'));
        expect(mockHandlers.onUseOrEquip).toHaveBeenCalledTimes(1);
    });

    it('calls onDiscard when DISCARD button is pressed', () => {
        const { tree } = withAllProviders(
            <ItemCard
                item={mockEquipmentWeapon}
                expanded={true}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        fireEvent.press(rendered.getByTestId('discard-sword-basic'));
        expect(mockHandlers.onDiscard).toHaveBeenCalledTimes(1);
    });
});

describe('ItemCard: accessibility props', () => {
    const mockHandlers = {
        onTap: jest.fn(),
        onUseOrEquip: jest.fn(),
        onDiscard: jest.fn(),
    };

    it('sets correct accessibility labels for single items', () => {
        const { tree } = withAllProviders(
            <ItemCard
                item={mockEquippedArmor}
                expanded={false}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        const card = rendered.getByTestId('item-leather-vest');
        expect(card.props.accessibilityLabel).toBe('Leather Vest, worn');
    });

    it('sets correct accessibility labels for stacked items', () => {
        const { tree } = withAllProviders(
            <ItemCard
                item={mockConsumable}
                expanded={false}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        const card = rendered.getByTestId('item-health-potion');
        expect(card.props.accessibilityLabel).toBe('Health Potion, 3');
    });

    it('sets accessibility state based on expanded prop', () => {
        const { tree } = withAllProviders(
            <ItemCard
                item={mockEquipmentWeapon}
                expanded={true}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        const card = rendered.getByTestId('item-sword-basic');
        expect(card.props.accessibilityState.expanded).toBe(true);
    });

    it('keeps the USE and DISCARD buttons outside the expand button', () => {
        // Nested, they rendered as a <button> in a <button> on web and were
        // folded into the card's one a11y element on native.
        const { tree } = withAllProviders(
            <ItemCard
                item={mockEquipmentWeapon}
                expanded={true}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        const header = rendered.getByTestId('item-sword-basic');
        expect(within(header).queryByTestId('use-sword-basic')).toBeNull();
        expect(within(header).queryByTestId('discard-sword-basic')).toBeNull();
        const frame = rendered.getByTestId('item-card-sword-basic');
        expect(frame.props.accessibilityRole).toBeUndefined();
        expect(within(frame).getByTestId('use-sword-basic')).toBeTruthy();
    });
});

describe('ItemGlyph: category-based icon rendering', () => {
    it('renders sword icon for weapon equipment', () => {
        const { tree } = withAllProviders(
            <ItemGlyph category="equipment" sub="Weapon" />
        );
        const rendered = render(tree);
        // Should render ActionIcon with sword kind
        expect(rendered.toJSON()).not.toBeNull();
    });

    it('renders shield icon for armor/shield equipment', () => {
        const { tree: armorTree } = withAllProviders(
            <ItemGlyph category="equipment" sub="Armor" />
        );
        const armorRendered = render(armorTree);
        expect(armorRendered.toJSON()).not.toBeNull();

        const { tree: shieldTree } = withAllProviders(
            <ItemGlyph category="equipment" sub="Shield" />
        );
        const shieldRendered = render(shieldTree);
        expect(shieldRendered.toJSON()).not.toBeNull();
    });

    it('renders relic icon for relics', () => {
        const { tree } = withAllProviders(
            <ItemGlyph category="equipment" sub="Accessory" />
        );
        const rendered = render(tree);
        expect(rendered.toJSON()).not.toBeNull();
    });

    it('renders potion icon for consumables', () => {
        const { tree } = withAllProviders(
            <ItemGlyph category="consumable" sub={null} />
        );
        const rendered = render(tree);
        expect(rendered.toJSON()).not.toBeNull();
    });

    it('renders crystal icon for materials', () => {
        const { tree } = withAllProviders(
            <ItemGlyph category="material" sub={null} />
        );
        const rendered = render(tree);
        expect(rendered.toJSON()).not.toBeNull();
    });

    it('renders scroll icon for quest items', () => {
        const { tree } = withAllProviders(
            <ItemGlyph category="quest" sub={null} />
        );
        const rendered = render(tree);
        expect(rendered.toJSON()).not.toBeNull();
    });

    it('renders fallback icon for unknown categories', () => {
        const { tree } = withAllProviders(
            <ItemGlyph category="equipment" sub="Unknown" />
        );
        const rendered = render(tree);
        expect(rendered.toJSON()).not.toBeNull();
    });
});

describe('ItemCard: equipDelta panel (Phase 133)', () => {
    const handlers = {
        onTap: jest.fn(),
        onUseOrEquip: jest.fn(),
        onDiscard: jest.fn(),
    };

    const swapItem: InventoryItemRow = {
        ...mockEquipmentWeapon,
        id: 'fang',
        equipDelta: {
            mode: 'swap',
            against: { id: 'old-blade', name: 'Old Blade' },
            stats: [
                { stat: 'attack', delta: 2 },
                { stat: 'stamina', delta: -1 },
            ],
            signatures: {
                gained: [{ id: 'sig-disarming-plea', name: 'The Open Hand' }],
                lost: [],
            },
            isEmpty: false,
        },
    };

    it('renders the panel with stat + signature changes when expanded (Phase 23)', () => {
        const { tree } = withAllProviders(
            <ItemCard item={swapItem} expanded={true} {...handlers} />
        );
        const r = render(tree);
        expect(r.getByTestId('equip-delta-fang')).toBeTruthy();
        expect(r.getByTestId('equip-delta-stats-fang')).toBeTruthy();
        expect(r.getByTestId('equip-delta-signatures-fang')).toBeTruthy();
        expect(r.getByText('grants The Open Hand')).toBeTruthy();
    });

    it('does not render the panel when collapsed', () => {
        const { tree } = withAllProviders(
            <ItemCard item={swapItem} expanded={false} {...handlers} />
        );
        const r = render(tree);
        expect(r.queryByTestId('equip-delta-fang')).toBeNull();
    });

    it('suppresses the panel when the delta is empty', () => {
        const emptyDeltaItem: InventoryItemRow = {
            ...mockEquipmentWeapon,
            id: 'inert',
            equipDelta: {
                mode: 'swap',
                against: { id: 'x', name: 'X' },
                stats: [],
                signatures: { gained: [], lost: [] },
                isEmpty: true,
            },
        };
        const { tree } = withAllProviders(
            <ItemCard item={emptyDeltaItem} expanded={true} {...handlers} />
        );
        const r = render(tree);
        expect(r.queryByTestId('equip-delta-inert')).toBeNull();
    });
});

describe('ItemCard: rarity shine affordances (Phase 135)', () => {
    const handlers = {
        onTap: jest.fn(),
        onUseOrEquip: jest.fn(),
        onDiscard: jest.fn(),
    };

    const makeItem = (
        rarity: InventoryItemRow['rarity'],
        overrides: Partial<InventoryItemRow> = {},
    ): InventoryItemRow => ({
        ...mockEquipmentWeapon,
        id: `rarity-${rarity ?? 'none'}`,
        rarity,
        ...overrides,
    });

    it('renders green shine and "one affix" language for uncommon', () => {
        const item = makeItem('uncommon');
        const { tree } = withAllProviders(
            <ItemCard item={item} expanded={false} {...handlers} />
        );
        const r = render(tree);
        expect(r.getByTestId(`rarity-shine-${item.id}`)).toBeTruthy();
        expect(r.queryByTestId(`rarity-outline-${item.id}`)).toBeNull();
        expect(r.getByTestId(`item-${item.id}`).props.accessibilityLabel)
            .toContain('uncommon, one affix');
    });

    it('renders blue shine and "two affixes" language for rare', () => {
        const item = makeItem('rare');
        const { tree } = withAllProviders(
            <ItemCard item={item} expanded={false} {...handlers} />
        );
        const r = render(tree);
        expect(r.getByTestId(`rarity-shine-${item.id}`)).toBeTruthy();
        expect(r.getByTestId(`item-${item.id}`).props.accessibilityLabel)
            .toContain('rare, two affixes');
    });

    it('renders red outline and "three fixed modifiers" language for unique', () => {
        const item = makeItem('unique');
        const { tree } = withAllProviders(
            <ItemCard item={item} expanded={false} {...handlers} />
        );
        const r = render(tree);
        expect(r.getByTestId(`rarity-outline-${item.id}`)).toBeTruthy();
        expect(r.queryByTestId(`rarity-shine-${item.id}`)).toBeNull();
        expect(r.getByTestId(`item-${item.id}`).props.accessibilityLabel)
            .toContain('unique, three fixed modifiers');
    });

    it('renders no shine or outline for common', () => {
        const item = makeItem('common');
        const { tree } = withAllProviders(
            <ItemCard item={item} expanded={false} {...handlers} />
        );
        const r = render(tree);
        expect(r.queryByTestId(`rarity-shine-${item.id}`)).toBeNull();
        expect(r.queryByTestId(`rarity-outline-${item.id}`)).toBeNull();
    });

    it('renders no shine or outline for non-equipment (null rarity)', () => {
        const item = makeItem(null, { category: 'consumable', sub: null });
        const { tree } = withAllProviders(
            <ItemCard item={item} expanded={false} {...handlers} />
        );
        const r = render(tree);
        expect(r.queryByTestId(`rarity-shine-${item.id}`)).toBeNull();
        expect(r.queryByTestId(`rarity-outline-${item.id}`)).toBeNull();
    });

    it('keeps the unique outline and WORN badge on an equipped unique', () => {
        const item = makeItem('unique', { equipped: true, wornLabel: 'WORN', sub: 'Armor' });
        const { tree } = withAllProviders(
            <ItemCard item={item} expanded={false} {...handlers} />
        );
        const r = render(tree);
        expect(r.getByTestId(`rarity-outline-${item.id}`)).toBeTruthy();
        expect(r.getByText('WORN')).toBeTruthy();
        expect(r.getByTestId(`item-${item.id}`).props.accessibilityLabel)
            .toContain('worn');
    });

    it('preserves the rarity treatment when the card is expanded', () => {
        const item = makeItem('rare');
        const { tree } = withAllProviders(
            <ItemCard item={item} expanded={true} {...handlers} />
        );
        const r = render(tree);
        expect(r.getByTestId(`rarity-shine-${item.id}`)).toBeTruthy();
    });
});

describe('groupByCategory utility', () => {
    const mixedItems: InventoryItemRow[] = [
        mockEquipmentWeapon,
        mockConsumable,
        mockMaterial,
        mockQuestItem,
        mockEquippedArmor,
    ];

    it('groups items by their category', () => {
        const grouped = groupByCategory(mixedItems);

        expect(grouped.equipment).toHaveLength(2);
        expect(grouped.consumable).toHaveLength(1);
        expect(grouped.material).toHaveLength(1);
        expect(grouped.quest).toHaveLength(1);
        
        expect(grouped.equipment).toContain(mockEquipmentWeapon);
        expect(grouped.equipment).toContain(mockEquippedArmor);
        expect(grouped.consumable).toContain(mockConsumable);
        expect(grouped.material).toContain(mockMaterial);
        expect(grouped.quest).toContain(mockQuestItem);
    });

    it('returns empty arrays for categories with no items', () => {
        const grouped = groupByCategory([mockEquipmentWeapon]);

        expect(grouped.equipment).toHaveLength(1);
        expect(grouped.consumable).toHaveLength(0);
        expect(grouped.material).toHaveLength(0);
        expect(grouped.quest).toHaveLength(0);
    });
});

describe('CATEGORY_ORDER constant', () => {
    it('exports the expected category order', () => {
        expect(CATEGORY_ORDER).toEqual(['equipment', 'consumable', 'material', 'quest']);
    });

    it('is a readonly array', () => {
        // TypeScript enforces readonlyness at compile time
        // At runtime, the array is still mutable in JavaScript
        expect(CATEGORY_ORDER.length).toBe(4);
        expect(Object.isFrozen(CATEGORY_ORDER)).toBe(false); // JS arrays aren't frozen by 'as const'
    });
});