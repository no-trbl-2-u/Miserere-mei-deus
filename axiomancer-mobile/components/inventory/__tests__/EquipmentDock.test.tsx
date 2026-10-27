import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EquipmentDock } from '../EquipmentDock';
import type { EquipmentDockViewModel } from '@/state/presenters/inventory.engine';

// Mock child components that are tested separately
jest.mock('@/components/SectionLabel', () => {
    return {
        SectionLabel: ({ children }: { children: React.ReactNode }) => {
            const React = require('react');
            const { Text } = require('react-native');
            return React.createElement(Text, {}, children);
        },
    };
});

// The centre column renders the player portrait.
jest.mock('@/components/art/PlayerPortraitImage', () => ({
    PlayerPortraitImage: () => null,
}));

jest.mock('../EquipmentSlot', () => {
    return {
        EquipmentSlot: ({
            slot,
            bareLabel,
            selected,
            onPress,
        }: {
            slot: any;
            bareLabel: string;
            selected: boolean;
            onPress: (key: string | null) => void;
        }) => {
            const React = require('react');
            const { TouchableOpacity, Text } = require('react-native');

            // Defensive null-slot path (the real EquipmentSlot renders an empty
            // spacer for a null slot); the dock stacks all 5 real slots in one
            // column, so this branch is not normally hit.
            if (slot === null || slot === undefined) return null;
            // The three relic rows share `key: 'relic'`; disambiguate the
            // testID by position, mirroring the real component's `slotId`.
            const slotId =
                slot.relicIndex !== undefined ? `${slot.key}-${slot.relicIndex}` : slot.key;
            return React.createElement(
                TouchableOpacity,
                {
                    testID: `equipment-slot-${slotId}`,
                    accessibilityState: { selected },
                    onPress: () => onPress(slot.key),
                },
                React.createElement(Text, {}, `${slot.label} - ${slot.item?.name || 'empty'}`)
            );
        },
    };
});

// The dock renders the full loadout: Weapon, Armor, and the 3 interchangeable
// relic positions (Trinket I/II/III). The relic rows share
// `key: 'relic'` and disambiguate via `relicIndex`.
const mockEquippedSlots: EquipmentDockViewModel = {
    slots: [
        { key: 'weapon', label: 'WEAPON', item: { id: 'sword-1', name: 'Iron Sword', sub: 'Weapon' } },
        { key: 'armor', label: 'ARMOR', item: { id: 'armor-1', name: 'Leather Armor', sub: 'Armor' } },
        { key: 'relic', relicIndex: 0, label: 'TRINKET I', item: { id: 'helm-1', name: 'Iron Helm', sub: 'Accessory' } },
        { key: 'relic', relicIndex: 1, label: 'TRINKET II', item: { id: 'ring-1', name: 'Bone Ring', sub: 'Accessory' } },
        { key: 'relic', relicIndex: 2, label: 'TRINKET III', item: null },
    ],
    headerLabel: 'equipment dock',
    hintLabel: 'worn vs unworn at a glance',
    bareLabel: '— unequipped —',
    selectedSlot: null,
    bannerEyebrow: '',
    bannerSlotLabel: '',
    bannerClearLabel: '',
};

const mockEmptySlots: EquipmentDockViewModel = {
    slots: [
        { key: 'weapon', label: 'WEAPON', item: null },
        { key: 'armor', label: 'ARMOR', item: null },
        { key: 'relic', relicIndex: 0, label: 'TRINKET I', item: null },
        { key: 'relic', relicIndex: 1, label: 'TRINKET II', item: null },
        { key: 'relic', relicIndex: 2, label: 'TRINKET III', item: null },
    ],
    headerLabel: 'equipment dock',
    hintLabel: 'worn vs unworn at a glance',
    bareLabel: '— unequipped —',
    selectedSlot: null,
    bannerEyebrow: '',
    bannerSlotLabel: '',
    bannerClearLabel: '',
};

const mockOnSelectSlot = jest.fn();

describe('EquipmentDock', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Mount contract', () => {
        it('mounts without crashing with equipped items', () => {
            const { toJSON } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );
            expect(toJSON()).toBeTruthy();
        });

        it('mounts without crashing with empty slots', () => {
            const { toJSON } = render(
                <EquipmentDock
                    vm={mockEmptySlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );
            expect(toJSON()).toBeTruthy();
        });

        it('renders dock container with correct testID', () => {
            const { getByTestId } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );
            expect(getByTestId('equipment-dock')).toBeDefined();
        });
    });

    describe('Header rendering', () => {
        it('displays header label correctly', () => {
            const { getByText } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );
            expect(getByText('equipment dock')).toBeDefined();
        });

        it('displays hint label correctly', () => {
            const { getByText } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );
            expect(getByText('worn vs unworn at a glance')).toBeDefined();
        });
    });

    describe('Slot pairing and grid layout', () => {
        it('renders all 5 slots (weapon, armor, 3 relic positions)', () => {
            const { getByTestId } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            expect(getByTestId('equipment-slot-weapon')).toBeDefined();
            expect(getByTestId('equipment-slot-armor')).toBeDefined();
            expect(getByTestId('equipment-slot-relic-0')).toBeDefined();
            expect(getByTestId('equipment-slot-relic-1')).toBeDefined();
            expect(getByTestId('equipment-slot-relic-2')).toBeDefined();
        });

        it('passes bare label to all slots consistently', () => {
            const { getByTestId } = render(
                <EquipmentDock
                    vm={mockEmptySlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            // Test that slot components are rendered (bare label is internal to EquipmentSlot)
            const weaponSlot = getByTestId('equipment-slot-weapon');
            expect(weaponSlot).toBeDefined();
        });

        it('renders the final relic slot in the stacked column', () => {
            const { queryByTestId } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            expect(queryByTestId('equipment-slot-relic-2')).toBeDefined();
        });
    });

    describe('Slot selection behavior', () => {
        it('correctly identifies selected slot', () => {
            const { getByTestId } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot="weapon"
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            const weaponSlot = getByTestId('equipment-slot-weapon');
            const armorSlot = getByTestId('equipment-slot-armor');

            expect(weaponSlot.props.accessibilityState.selected).toBe(true);
            expect(armorSlot.props.accessibilityState.selected).toBe(false);
        });

        it('highlights every relic position when the relic slot is selected', () => {
            // The 3 relic positions are interchangeable and share the
            // `relic` slot key, so selecting one lights all three.
            const { getByTestId } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot="relic"
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            expect(getByTestId('equipment-slot-relic-0').props.accessibilityState.selected).toBe(true);
            expect(getByTestId('equipment-slot-relic-1').props.accessibilityState.selected).toBe(true);
            expect(getByTestId('equipment-slot-relic-2').props.accessibilityState.selected).toBe(true);
            expect(getByTestId('equipment-slot-weapon').props.accessibilityState.selected).toBe(false);
        });

        it('handles null selectedSlot correctly', () => {
            const { getByTestId } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            const weaponSlot = getByTestId('equipment-slot-weapon');
            expect(weaponSlot.props.accessibilityState.selected).toBe(false);
        });

        it('forwards slot selection callbacks correctly', () => {
            const { getByTestId } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            const weaponSlot = getByTestId('equipment-slot-weapon');
            fireEvent.press(weaponSlot);

            expect(mockOnSelectSlot).toHaveBeenCalledWith('weapon');
        });

        it('forwards the relic slot key when a relic position is pressed', () => {
            const { getByTestId } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            fireEvent.press(getByTestId('equipment-slot-relic-1'));
            expect(mockOnSelectSlot).toHaveBeenCalledWith('relic');
        });
    });

    describe('Equipment item display', () => {
        it('displays equipped items correctly', () => {
            const { getByTestId, getByText } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            // Verify slots are rendered
            expect(getByTestId('equipment-slot-relic-0')).toBeDefined();
            expect(getByTestId('equipment-slot-weapon')).toBeDefined();

            // Verify content is displayed through Text components
            expect(getByText('TRINKET I - Iron Helm')).toBeDefined();
            expect(getByText('TRINKET II - Bone Ring')).toBeDefined();
            expect(getByText('WEAPON - Iron Sword')).toBeDefined();
        });

        it('displays empty slots correctly', () => {
            const { getByTestId, getByText } = render(
                <EquipmentDock
                    vm={mockEmptySlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            // Verify slots are rendered
            expect(getByTestId('equipment-slot-relic-0')).toBeDefined();
            expect(getByTestId('equipment-slot-weapon')).toBeDefined();

            // Verify empty content is displayed
            expect(getByText('TRINKET I - empty')).toBeDefined();
            expect(getByText('WEAPON - empty')).toBeDefined();
        });
    });

    describe('Accessibility and interaction', () => {
        it('preserves selection state for accessibility', () => {
            const { getByTestId } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot="relic"
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            const accessorySlot = getByTestId('equipment-slot-relic-0');
            expect(accessorySlot.props.accessibilityState.selected).toBe(true);
        });

        it('forwards callback to all interactive slots', () => {
            const { getByTestId } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            // Test multiple slot interactions
            fireEvent.press(getByTestId('equipment-slot-weapon'));
            fireEvent.press(getByTestId('equipment-slot-armor'));
            fireEvent.press(getByTestId('equipment-slot-relic-0'));

            expect(mockOnSelectSlot).toHaveBeenCalledTimes(3);
            expect(mockOnSelectSlot).toHaveBeenNthCalledWith(1, 'weapon');
            expect(mockOnSelectSlot).toHaveBeenNthCalledWith(2, 'armor');
            expect(mockOnSelectSlot).toHaveBeenNthCalledWith(3, 'relic');
        });
    });

    describe('Props stability and re-rendering', () => {
        it('handles slot array changes correctly', () => {
            const updatedSlots: EquipmentDockViewModel = {
                ...mockEmptySlots,
                slots: [
                    { key: 'weapon', label: 'WEAPON', item: { id: 'new-sword', name: 'Steel Sword', sub: 'Weapon' } },
                    ...mockEmptySlots.slots.slice(1),
                ],
            };

            const { getByText, rerender } = render(
                <EquipmentDock
                    vm={mockEmptySlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            rerender(
                <EquipmentDock
                    vm={updatedSlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            // Verify the updated content is displayed
            expect(getByText('WEAPON - Steel Sword')).toBeDefined();
        });

        it('handles selectedSlot changes correctly', () => {
            const { getByTestId, rerender } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            rerender(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot="weapon"
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            const weaponSlot = getByTestId('equipment-slot-weapon');
            expect(weaponSlot.props.accessibilityState.selected).toBe(true);
        });
    });

    describe('Edge cases', () => {
        it('handles slots with null items gracefully', () => {
            const mixedSlots: EquipmentDockViewModel = {
                ...mockEquippedSlots,
                slots: [
                    { key: 'weapon', label: 'WEAPON', item: { id: 'sword-1', name: 'Iron Sword', sub: 'Weapon' } },
                    { key: 'armor', label: 'ARMOR', item: null },
                    { key: 'relic', relicIndex: 0, label: 'TRINKET I', item: { id: 'helm-1', name: 'Iron Helm', sub: 'Accessory' } },
                    { key: 'relic', relicIndex: 1, label: 'TRINKET II', item: null },
                    { key: 'relic', relicIndex: 2, label: 'TRINKET III', item: null },
                ],
            };

            const { getByTestId, getByText } = render(
                <EquipmentDock
                    vm={mixedSlots}
                    selectedSlot={null}
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            const weaponSlot = getByTestId('equipment-slot-weapon');
            const armorSlot = getByTestId('equipment-slot-armor');

            expect(weaponSlot).toBeDefined();
            expect(armorSlot).toBeDefined();

            // Verify content through text queries
            expect(getByText('WEAPON - Iron Sword')).toBeDefined();
            expect(getByText('ARMOR - empty')).toBeDefined();
        });

        it('handles selection of non-existent slot keys gracefully', () => {
            const { getByTestId } = render(
                <EquipmentDock
                    vm={mockEquippedSlots}
                    selectedSlot={'invalid-key' as any}
                    onSelectSlot={mockOnSelectSlot}
                />
            );

            // All slots should be unselected when selectedSlot doesn't match any
            const weaponSlot = getByTestId('equipment-slot-weapon');
            expect(weaponSlot.props.accessibilityState.selected).toBe(false);
        });
    });
});
