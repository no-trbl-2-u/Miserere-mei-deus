/**
 * Hermetic component tests — ItemCard (inventory UI that renders
 * items with category-based glyphs, expand/collapse states, action
 * buttons, and equipment replacement previews).
 *
 * ItemCard combines several concerns: glyph iconography via ItemGlyph,
 * layout switching between collapsed/expanded via the `expanded` prop,
 * and action handling via callbacks. The test covers the key branches:
 * different category glyphs, expanded state UI, worn/quantity badges.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import Svg from 'react-native-svg';

import { ItemCard, ItemGlyph, groupByCategory, CATEGORY_ORDER } from '@/components/inventory/ItemCard';
import { ActionIcon } from '@/components/ActionIcon';
import type { InventoryItemRow } from '@/state/presenters/inventory.engine';

const mockItem: InventoryItemRow = {
    id: 'test-item-1',
    name: 'Test Sword',
    description: 'A basic testing sword for unit tests',
    category: 'equipment',
    sub: 'Weapon',
    quantity: 1,
    rarity: 'common',
    equipped: false,
    wornLabel: null,
    actionLabel: 'EQUIP',
    canUse: true,
    canDiscard: true,
    replacePreview: null,
    equipDelta: null,
};

const mockConsumableItem: InventoryItemRow = {
    id: 'test-potion-1',
    name: 'Health Potion',
    description: 'Restores 50 HP when consumed',
    category: 'consumable',
    sub: null,
    quantity: 3,
    rarity: null,
    equipped: false,
    wornLabel: null,
    actionLabel: 'USE',
    canUse: true,
    canDiscard: true,
    replacePreview: null,
    equipDelta: null,
};

const mockEquippedItem: InventoryItemRow = {
    id: 'test-armor-1',
    name: 'Leather Armor',
    description: 'Basic protective gear',
    category: 'equipment',
    sub: 'Armor',
    quantity: 1,
    rarity: 'common',
    equipped: true,
    wornLabel: 'WORN',
    actionLabel: 'EQUIP',
    canUse: false,
    canDiscard: false,
    replacePreview: null,
    equipDelta: null,
};

describe('groupByCategory utility function', () => {
    it('groups items by category into separate arrays', () => {
        const items = [mockItem, mockConsumableItem, mockEquippedItem];
        const grouped = groupByCategory(items);
        
        expect(grouped.equipment).toHaveLength(2);
        expect(grouped.consumable).toHaveLength(1);
        expect(grouped.material).toHaveLength(0);
        expect(grouped.quest).toHaveLength(0);
        
        expect(grouped.equipment[0]).toBe(mockItem);
        expect(grouped.consumable[0]).toBe(mockConsumableItem);
    });

    it('handles empty input array', () => {
        const grouped = groupByCategory([]);
        CATEGORY_ORDER.forEach(cat => {
            expect(grouped[cat]).toHaveLength(0);
        });
    });
});

describe('ItemGlyph: category-based icon rendering', () => {
    it('renders ActionIcon with sword for Weapon equipment', () => {
        const tree = render(<ItemGlyph category="equipment" sub="Weapon" />);
        const actionIcons = tree.UNSAFE_queryAllByType(ActionIcon);
        expect(actionIcons).toHaveLength(1);
        expect(actionIcons[0].props.kind).toBe('sword');
    });

    it('renders ActionIcon with shield for Armor equipment', () => {
        const tree = render(<ItemGlyph category="equipment" sub="Armor" />);
        const actionIcons = tree.UNSAFE_queryAllByType(ActionIcon);
        expect(actionIcons).toHaveLength(1);
        expect(actionIcons[0].props.kind).toBe('shield');
    });

    it('renders ActionIcon with shield for Shield equipment', () => {
        const tree = render(<ItemGlyph category="equipment" sub="Shield" />);
        const actionIcons = tree.UNSAFE_queryAllByType(ActionIcon);
        expect(actionIcons).toHaveLength(1);
        expect(actionIcons[0].props.kind).toBe('shield');
    });

    it('draws the registry relic mark for Relic equipment', () => {
        const tree = render(<ItemGlyph category="equipment" sub="Relic" />);
        const svgs = tree.UNSAFE_queryAllByType(Svg);
        expect(svgs).toHaveLength(1);
        expect(svgs[0].props.accessibilityLabel).toBe('Gem on a chain');
    });

    it('draws the registry flask for the consumable category', () => {
        const tree = render(<ItemGlyph category="consumable" sub={null} />);
        const svgs = tree.UNSAFE_queryAllByType(Svg);
        expect(svgs).toHaveLength(1);
        expect(svgs[0].props.accessibilityLabel).toBe('Bubbling flask');
    });

    it('renders custom SVG for material category', () => {
        const tree = render(<ItemGlyph category="material" sub={null} />);
        const svgs = tree.UNSAFE_queryAllByType(Svg);
        expect(svgs).toHaveLength(1);
        expect(svgs[0].props.accessibilityLabel).toBe('Material item icon');
    });

    it('draws the registry key for the quest category', () => {
        const tree = render(<ItemGlyph category="quest" sub={null} />);
        const svgs = tree.UNSAFE_queryAllByType(Svg);
        expect(svgs).toHaveLength(1);
        expect(svgs[0].props.accessibilityLabel).toBe('Key');
    });

    it('draws the registry question mark for an unknown category', () => {
        const tree = render(<ItemGlyph category="equipment" sub="Unknown" />);
        const svgs = tree.UNSAFE_queryAllByType(Svg);
        expect(svgs).toHaveLength(1);
        expect(svgs[0].props.accessibilityLabel).toBe('Question mark');
    });
});

describe('ItemCard: basic rendering and props', () => {
    const mockCallbacks = {
        onTap: jest.fn(),
        onUseOrEquip: jest.fn(),
        onDiscard: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders item name in collapsed state', () => {
        const tree = render(
            <ItemCard 
                item={mockItem} 
                expanded={false} 
                {...mockCallbacks} 
            />
        );
        
        const nameTexts = tree.UNSAFE_queryAllByType(Text).filter(
            node => node.props.children === mockItem.name
        );
        expect(nameTexts.length).toBeGreaterThan(0);
    });

    it('includes testID for item identification', () => {
        const tree = render(
            <ItemCard 
                item={mockItem} 
                expanded={false} 
                {...mockCallbacks} 
            />
        );
        
        expect(tree.queryByTestId(`item-${mockItem.id}`)).not.toBeNull();
    });

    it('shows slot tag for equipment in collapsed state', () => {
        const tree = render(
            <ItemCard 
                item={mockItem} 
                expanded={false} 
                {...mockCallbacks} 
            />
        );
        
        expect(tree.queryByTestId(`slot-tag-${mockItem.id}`)).not.toBeNull();
    });

    it('calls onTap when pressed', () => {
        const tree = render(
            <ItemCard 
                item={mockItem} 
                expanded={false} 
                {...mockCallbacks} 
            />
        );
        
        const itemCard = tree.getByTestId(`item-${mockItem.id}`);
        fireEvent.press(itemCard);
        expect(mockCallbacks.onTap).toHaveBeenCalledTimes(1);
    });
});

describe('ItemCard: expanded state', () => {
    const mockCallbacks = {
        onTap: jest.fn(),
        onUseOrEquip: jest.fn(),
        onDiscard: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows item description when expanded', () => {
        const tree = render(
            <ItemCard 
                item={mockItem} 
                expanded={true} 
                {...mockCallbacks} 
            />
        );
        
        // Look for description text wrapped in quotes
        const descText = tree.UNSAFE_queryAllByType(Text).find(
            node => {
                const children = node.props.children;
                if (Array.isArray(children)) {
                    return children.some(child => typeof child === 'string' && child.includes(mockItem.description));
                }
                return typeof children === 'string' && children.includes(mockItem.description);
            }
        );
        expect(descText).toBeDefined();
    });

    it('shows EQUIP button for equipment when canUse is true', () => {
        const tree = render(
            <ItemCard 
                item={mockItem} 
                expanded={true} 
                {...mockCallbacks} 
            />
        );
        
        expect(tree.queryByTestId(`use-${mockItem.id}`)).not.toBeNull();
        
        const equipText = tree.UNSAFE_queryAllByType(Text).find(
            node => node.props.children === 'EQUIP'
        );
        expect(equipText).toBeDefined();
    });

    it('shows USE button for consumables when canUse is true', () => {
        const tree = render(
            <ItemCard 
                item={mockConsumableItem} 
                expanded={true} 
                {...mockCallbacks} 
            />
        );
        
        const useText = tree.UNSAFE_queryAllByType(Text).find(
            node => node.props.children === 'USE'
        );
        expect(useText).toBeDefined();
    });

    it('shows DISCARD button when canDiscard is true', () => {
        const tree = render(
            <ItemCard 
                item={mockItem} 
                expanded={true} 
                {...mockCallbacks} 
            />
        );
        
        expect(tree.queryByTestId(`discard-${mockItem.id}`)).not.toBeNull();
        
        const discardText = tree.UNSAFE_queryAllByType(Text).find(
            node => node.props.children === 'DISCARD'
        );
        expect(discardText).toBeDefined();
    });

    it('calls onUseOrEquip when use/equip button is pressed', () => {
        const tree = render(
            <ItemCard 
                item={mockItem} 
                expanded={true} 
                {...mockCallbacks} 
            />
        );
        
        const useButton = tree.getByTestId(`use-${mockItem.id}`);
        fireEvent.press(useButton);
        expect(mockCallbacks.onUseOrEquip).toHaveBeenCalledTimes(1);
    });

    it('calls onDiscard when discard button is pressed', () => {
        const tree = render(
            <ItemCard 
                item={mockItem} 
                expanded={true} 
                {...mockCallbacks} 
            />
        );
        
        const discardButton = tree.getByTestId(`discard-${mockItem.id}`);
        fireEvent.press(discardButton);
        expect(mockCallbacks.onDiscard).toHaveBeenCalledTimes(1);
    });
});

describe('ItemCard: special states and badges', () => {
    const mockCallbacks = {
        onTap: jest.fn(),
        onUseOrEquip: jest.fn(),
        onDiscard: jest.fn(),
    };

    it('shows WORN badge for equipped items', () => {
        const tree = render(
            <ItemCard 
                item={mockEquippedItem} 
                expanded={false} 
                {...mockCallbacks} 
            />
        );
        
        const wornText = tree.UNSAFE_queryAllByType(Text).find(
            node => node.props.children === 'WORN'
        );
        expect(wornText).toBeDefined();
    });

    it('shows quantity badge for items with quantity > 1', () => {
        const tree = render(
            <ItemCard 
                item={mockConsumableItem} 
                expanded={false} 
                {...mockCallbacks} 
            />
        );
        
        // Look for quantity text which may be in array format
        const qtyText = tree.UNSAFE_queryAllByType(Text).find(
            node => {
                const children = node.props.children;
                if (Array.isArray(children)) {
                    return children.some(child => typeof child === 'string' && child.includes('×'));
                }
                return typeof children === 'string' && children.includes('×');
            }
        );
        expect(qtyText).toBeDefined();
    });

    it('includes item quantity in accessibility label when quantity > 1', () => {
        const tree = render(
            <ItemCard 
                item={mockConsumableItem} 
                expanded={false} 
                {...mockCallbacks} 
            />
        );
        
        const itemCard = tree.getByTestId(`item-${mockConsumableItem.id}`);
        expect(itemCard.props.accessibilityLabel).toContain('Health Potion, 3');
    });

    it('includes "worn" in accessibility label for equipped items', () => {
        const tree = render(
            <ItemCard 
                item={mockEquippedItem} 
                expanded={false} 
                {...mockCallbacks} 
            />
        );
        
        const itemCard = tree.getByTestId(`item-${mockEquippedItem.id}`);
        expect(itemCard.props.accessibilityLabel).toContain('worn');
    });

    it('sets correct accessibility state for expanded prop', () => {
        const tree = render(
            <ItemCard 
                item={mockItem} 
                expanded={true} 
                {...mockCallbacks} 
            />
        );
        
        const itemCard = tree.getByTestId(`item-${mockItem.id}`);
        expect(itemCard.props.accessibilityState.expanded).toBe(true);
    });
});