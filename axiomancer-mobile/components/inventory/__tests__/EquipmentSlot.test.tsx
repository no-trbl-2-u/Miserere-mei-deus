import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EquipmentSlot } from '../EquipmentSlot';

const mockSlot = {
    key: 'relic' as const,
    label: 'Trinket',
    item: {
        id: 'item-1',
        name: 'Iron Helm',
        sub: 'helmet' as const,
    },
};

const mockEmptySlot = {
    key: 'weapon' as const,
    label: 'Weapon',
    item: null,
};

const mockOnPress = jest.fn();

describe('EquipmentSlot', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders filled slot correctly', () => {
        const { getByText, getByTestId } = render(
            <EquipmentSlot
                slot={mockSlot}
                bareLabel="empty"
                selected={false}
                onPress={mockOnPress}
            />
        );

        expect(getByText('Trinket')).toBeDefined();
        expect(getByText('Iron Helm')).toBeDefined();
        expect(getByTestId('dock-slot-relic')).toBeDefined();
    });

    it('renders empty slot correctly', () => {
        const { getByText, getByTestId } = render(
            <EquipmentSlot
                slot={mockEmptySlot}
                bareLabel="empty"
                selected={false}
                onPress={mockOnPress}
            />
        );

        expect(getByText('Weapon')).toBeDefined();
        expect(getByText('empty')).toBeDefined();
        expect(getByText('∅')).toBeDefined();
        expect(getByTestId('dock-slot-weapon')).toBeDefined();
    });

    it('renders empty view for null slot', () => {
        const { toJSON } = render(
            <EquipmentSlot
                slot={null}
                bareLabel="empty"
                selected={false}
                onPress={mockOnPress}
            />
        );

        expect(toJSON()).toBeTruthy();
    });

    it('calls onPress when pressed', () => {
        const { getByTestId } = render(
            <EquipmentSlot
                slot={mockSlot}
                bareLabel="empty"
                selected={false}
                onPress={mockOnPress}
            />
        );

        fireEvent.press(getByTestId('dock-slot-relic'));
        expect(mockOnPress).toHaveBeenCalledWith('relic');
    });

    it('disambiguates the testID by relic position', () => {
        const positioned = {
            key: 'relic' as const,
            relicIndex: 1 as const,
            label: 'Trinket II',
            item: null,
        };
        const { getByTestId } = render(
            <EquipmentSlot
                slot={positioned}
                bareLabel="empty"
                selected={false}
                onPress={mockOnPress}
            />
        );

        // Per-position testID, but the press still forwards the shared slot key.
        const button = getByTestId('dock-slot-relic-1');
        expect(button).toBeDefined();
        fireEvent.press(button);
        expect(mockOnPress).toHaveBeenCalledWith('relic');
    });

    it('shows selected state correctly', () => {
        const { getByTestId } = render(
            <EquipmentSlot
                slot={mockSlot}
                bareLabel="empty"
                selected={true}
                onPress={mockOnPress}
            />
        );

        const button = getByTestId('dock-slot-relic');
        expect(button.props.accessibilityState).toEqual({ selected: true });
    });
});