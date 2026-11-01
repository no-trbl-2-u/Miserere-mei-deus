/**
 * Hermetic component tests — ItemGrid.
 *
 * Pins the render contract for the inventory grid container:
 * empty state handling, category grouping and rendering,
 * item delegation to ItemCard, scroll behavior, and proper
 * handler propagation for tap/use/discard actions.
 *
 * The component is pure presentation over grouped items —
 * no store reads, no engine calls. Props drive all rendering
 * branches including empty state vs populated grid.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { ItemGrid } from '@/components/inventory/ItemGrid';
import { useDockDrag, type DockDragController } from '@/components/inventory/useDockDrag';
import type { DockDragPayload } from '@/state/presenters/inventory.drag';
import { withAllProviders } from '@/test-utils/withAllProviders';
import type { InventoryItemRow } from '@/state/presenters/inventory.engine';

// Test fixtures for different item types
const mockEquipmentWeapon: InventoryItemRow = {
    id: 'sword-basic',
    name: 'Iron Sword',
    category: 'equipment',
    sub: 'Weapon',
    quantity: 1,
    rarity: 'common',
    equipped: false,
    wornLabel: null,
    actionLabel: 'EQUIP',
    description: 'A sturdy iron blade.',
    canUse: true,
    canDiscard: true,
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

const mockCategoryHeaders = {
    equipment: 'EQUIPMENT',
    consumable: 'CONSUMABLES',
    material: 'MATERIALS',
    quest: 'QUEST ITEMS',
};

describe('ItemGrid: empty state', () => {
    const mockHandlers = {
        onItemTap: jest.fn(),
        onUseOrEquip: jest.fn(),
        onDiscard: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders empty sack when isEmpty is true', () => {
        const { tree } = withAllProviders(
            <ItemGrid
                items={[]}
                categoryHeaders={mockCategoryHeaders}
                emptyMessage="Carry nothing here yet — gather provisions."
                isEmpty={true}
                expandedItemId={null}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        expect(rendered.getByTestId('inventory-empty')).toBeTruthy();
        // The bag drawing is the registry's, not an inline one-off (IT2b).
        expect(rendered.getByLabelText('Bag or inventory')).toBeTruthy();
        expect(rendered.getByText('Carry nothing here yet — gather provisions.')).toBeTruthy();
        expect(rendered.queryByTestId('inventory-scroll')).toBeNull();
    });

    it('renders empty sack with custom message', () => {
        const { tree } = withAllProviders(
            <ItemGrid
                items={[]}
                categoryHeaders={mockCategoryHeaders}
                emptyMessage="The satchel lies vacant."
                isEmpty={true}
                expandedItemId={null}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        expect(rendered.getByText('The satchel lies vacant.')).toBeTruthy();
    });
});

describe('ItemGrid: populated state', () => {
    const mixedItems: InventoryItemRow[] = [
        mockEquipmentWeapon,
        mockConsumable,
        mockMaterial,
        mockQuestItem,
    ];

    const mockHandlers = {
        onItemTap: jest.fn(),
        onUseOrEquip: jest.fn(),
        onDiscard: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders scrollable grid when items are present', () => {
        const { tree } = withAllProviders(
            <ItemGrid
                items={mixedItems}
                categoryHeaders={mockCategoryHeaders}
                emptyMessage="Empty message"
                isEmpty={false}
                expandedItemId={null}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        expect(rendered.getByTestId('inventory-scroll')).toBeTruthy();
        expect(rendered.queryByTestId('inventory-empty')).toBeNull();
    });

    it('renders category sections with headers in proper order', () => {
        const { tree } = withAllProviders(
            <ItemGrid
                items={mixedItems}
                categoryHeaders={mockCategoryHeaders}
                emptyMessage="Empty message"
                isEmpty={false}
                expandedItemId={null}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        // Should show category headers for categories that have items
        expect(rendered.getByText('EQUIPMENT')).toBeTruthy();
        expect(rendered.getByText('CONSUMABLES')).toBeTruthy();
        expect(rendered.getByText('MATERIALS')).toBeTruthy();
        expect(rendered.getByText('QUEST ITEMS')).toBeTruthy();
    });

    it('renders ItemCard components for all items', () => {
        const { tree } = withAllProviders(
            <ItemGrid
                items={mixedItems}
                categoryHeaders={mockCategoryHeaders}
                emptyMessage="Empty message"
                isEmpty={false}
                expandedItemId={null}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        // Should render all item cards with proper testIDs
        expect(rendered.getByTestId('item-sword-basic')).toBeTruthy();
        expect(rendered.getByTestId('item-health-potion')).toBeTruthy();
        expect(rendered.getByTestId('item-iron-ore')).toBeTruthy();
        expect(rendered.getByTestId('item-ancient-key')).toBeTruthy();
    });

    it('does not render category sections for empty categories', () => {
        const equipmentOnlyItems = [mockEquipmentWeapon];
        
        const { tree } = withAllProviders(
            <ItemGrid
                items={equipmentOnlyItems}
                categoryHeaders={mockCategoryHeaders}
                emptyMessage="Empty message"
                isEmpty={false}
                expandedItemId={null}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        expect(rendered.getByText('EQUIPMENT')).toBeTruthy();
        expect(rendered.queryByText('CONSUMABLES')).toBeNull();
        expect(rendered.queryByText('MATERIALS')).toBeNull();
        expect(rendered.queryByText('QUEST ITEMS')).toBeNull();
    });
});

describe('ItemGrid: expansion state handling', () => {
    const items: InventoryItemRow[] = [mockEquipmentWeapon, mockConsumable];

    const mockHandlers = {
        onItemTap: jest.fn(),
        onUseOrEquip: jest.fn(),
        onDiscard: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('passes expanded state to ItemCard when item is expanded', () => {
        const { tree } = withAllProviders(
            <ItemGrid
                items={items}
                categoryHeaders={mockCategoryHeaders}
                emptyMessage="Empty message"
                isEmpty={false}
                expandedItemId="sword-basic"
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        const expandedCard = rendered.getByTestId('item-sword-basic');
        expect(expandedCard.props.accessibilityState.expanded).toBe(true);
    });

    it('does not expand items when expandedItemId is null', () => {
        const { tree } = withAllProviders(
            <ItemGrid
                items={items}
                categoryHeaders={mockCategoryHeaders}
                emptyMessage="Empty message"
                isEmpty={false}
                expandedItemId={null}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        const card1 = rendered.getByTestId('item-sword-basic');
        const card2 = rendered.getByTestId('item-health-potion');
        expect(card1.props.accessibilityState.expanded).toBe(false);
        expect(card2.props.accessibilityState.expanded).toBe(false);
    });
});

describe('ItemGrid: handler delegation', () => {
    const items: InventoryItemRow[] = [mockEquipmentWeapon];

    const mockHandlers = {
        onItemTap: jest.fn(),
        onUseOrEquip: jest.fn(),
        onDiscard: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('delegates onItemTap to ItemCard tap handler', () => {
        const { tree } = withAllProviders(
            <ItemGrid
                items={items}
                categoryHeaders={mockCategoryHeaders}
                emptyMessage="Empty message"
                isEmpty={false}
                expandedItemId={null}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        fireEvent.press(rendered.getByTestId('item-sword-basic'));
        expect(mockHandlers.onItemTap).toHaveBeenCalledWith('sword-basic');
        expect(mockHandlers.onItemTap).toHaveBeenCalledTimes(1);
    });

    it('delegates onUseOrEquip to ItemCard use handler when expanded', () => {
        const { tree } = withAllProviders(
            <ItemGrid
                items={items}
                categoryHeaders={mockCategoryHeaders}
                emptyMessage="Empty message"
                isEmpty={false}
                expandedItemId="sword-basic"
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        fireEvent.press(rendered.getByTestId('use-sword-basic'));
        expect(mockHandlers.onUseOrEquip).toHaveBeenCalledWith('sword-basic');
        expect(mockHandlers.onUseOrEquip).toHaveBeenCalledTimes(1);
    });

    it('delegates onDiscard to ItemCard discard handler when expanded', () => {
        const { tree } = withAllProviders(
            <ItemGrid
                items={items}
                categoryHeaders={mockCategoryHeaders}
                emptyMessage="Empty message"
                isEmpty={false}
                expandedItemId="sword-basic"
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        fireEvent.press(rendered.getByTestId('discard-sword-basic'));
        expect(mockHandlers.onDiscard).toHaveBeenCalledWith('sword-basic');
        expect(mockHandlers.onDiscard).toHaveBeenCalledTimes(1);
    });
});

describe('ItemGrid: accessibility and testIDs', () => {
    const items: InventoryItemRow[] = [mockEquipmentWeapon, mockConsumable];

    const mockHandlers = {
        onItemTap: jest.fn(),
        onUseOrEquip: jest.fn(),
        onDiscard: jest.fn(),
    };

    it('sets proper testID for scroll container', () => {
        const { tree } = withAllProviders(
            <ItemGrid
                items={items}
                categoryHeaders={mockCategoryHeaders}
                emptyMessage="Empty message"
                isEmpty={false}
                expandedItemId={null}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        expect(rendered.getByTestId('inventory-scroll')).toBeTruthy();
    });

    it('enables vertical scroll indicator', () => {
        const { tree } = withAllProviders(
            <ItemGrid
                items={items}
                categoryHeaders={mockCategoryHeaders}
                emptyMessage="Empty message"
                isEmpty={false}
                expandedItemId={null}
                {...mockHandlers}
            />
        );
        const rendered = render(tree);

        const scrollView = rendered.getByTestId('inventory-scroll');
        expect(scrollView.props.showsVerticalScrollIndicator).toBe(true);
    });
});

describe('ItemGrid: a drag gesture beside the tap', () => {
    let dockDrag: DockDragController;
    const onItemTap = jest.fn();
    const sword: DockDragPayload = {
        itemId: 'sword-basic', name: 'Iron Sword', sub: 'Weapon', kind: 'weapon', from: 'satchel', wornRow: null,
    };
    const getPayload = jest.fn(() => sword);

    function DragHarness() {
        const { drag } = useDockDrag({ onDrop: () => undefined, measure: async () => null });
        dockDrag = drag;
        return (
            <ItemGrid
                items={[mockEquipmentWeapon, mockConsumable]}
                categoryHeaders={mockCategoryHeaders}
                emptyMessage=""
                isEmpty={false}
                expandedItemId={null}
                onItemTap={(id) => { if (!drag.suppressTap()) onItemTap(id); }}
                onUseOrEquip={jest.fn()}
                onDiscard={jest.fn()}
                itemGesture={(item) => item.category === 'equipment'
                    ? drag.gestureFor(`item-${item.id}`, getPayload, 'tile')
                    : undefined}
            />
        );
    }

    beforeEach(() => { jest.clearAllMocks(); });

    it('the pan on an equipment tile starts a drag; the tile still taps once it is over', async () => {
        const now = jest.spyOn(Date, 'now');
        try {
            now.mockReturnValue(1_000);
            const { tree } = withAllProviders(<DragHarness />);
            const rendered = render(tree);
            await act(async () => {
                fireGestureHandler(getByGestureTestId('dock-drag-item-sword-basic'), [
                    { state: State.BEGAN, absoluteX: 10, absoluteY: 10 },
                    { state: State.ACTIVE, absoluteX: 30, absoluteY: 30 },
                    { state: State.END, absoluteX: 30, absoluteY: 30 },
                ]);
                await Promise.resolve();
            });
            // The drag began (its payload was read) and has let go.
            expect(getPayload).toHaveBeenCalledTimes(1);
            expect(dockDrag.active).toBeNull();
            // A press right as the drag lets go is its own release, not a tap.
            fireEvent.press(rendered.getByTestId('item-sword-basic'));
            expect(onItemTap).not.toHaveBeenCalled();

            now.mockReturnValue(5_000);
            fireEvent.press(rendered.getByTestId('item-sword-basic'));
            expect(onItemTap).toHaveBeenCalledWith('sword-basic');
        } finally {
            now.mockRestore();
        }
    });

    it('only equipment tiles carry the drag; every tile still taps', () => {
        const { tree } = withAllProviders(<DragHarness />);
        const rendered = render(tree);
        expect(() => getByGestureTestId('dock-drag-item-health-potion')).toThrow();
        fireEvent.press(rendered.getByTestId('item-health-potion'));
        fireEvent.press(rendered.getByTestId('item-sword-basic'));
        expect(onItemTap.mock.calls.map((c) => c[0])).toEqual(['health-potion', 'sword-basic']);
    });
});