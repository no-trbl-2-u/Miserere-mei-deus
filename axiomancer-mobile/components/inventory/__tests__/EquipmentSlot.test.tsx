import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EquipmentSlot } from '../EquipmentSlot';

const mockSlot = {
    id: 'relic-0' as const,
    key: 'relic' as const,
    relicIndex: 0 as const,
    label: 'Relic',
    item: {
        id: 'item-1',
        name: 'Iron Helm',
        sub: 'helmet' as const,
    },
};

const mockEmptySlot = {
    id: 'weapon' as const,
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

        expect(getByText('Relic')).toBeDefined();
        expect(getByText('Iron Helm')).toBeDefined();
        expect(getByTestId('dock-slot-relic-0')).toBeDefined();
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

    it('calls onPress with the row id when pressed', () => {
        const { getByTestId } = render(
            <EquipmentSlot
                slot={mockSlot}
                bareLabel="empty"
                selected={false}
                onPress={mockOnPress}
            />
        );

        fireEvent.press(getByTestId('dock-slot-relic-0'));
        expect(mockOnPress).toHaveBeenCalledWith('relic-0');
    });

    it('presses each relic position by its own row id, not the shared slot kind', () => {
        const positioned = {
            id: 'relic-1' as const,
            key: 'relic' as const,
            relicIndex: 1 as const,
            label: 'Relic II',
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

        const button = getByTestId('dock-slot-relic-1');
        expect(button).toBeDefined();
        fireEvent.press(button);
        expect(mockOnPress).toHaveBeenCalledWith('relic-1');
    });

    it('clears the pick when the picked row is pressed again', () => {
        const { getByTestId } = render(
            <EquipmentSlot
                slot={mockSlot}
                bareLabel="empty"
                selected={true}
                onPress={mockOnPress}
            />
        );

        fireEvent.press(getByTestId('dock-slot-relic-0'));
        expect(mockOnPress).toHaveBeenCalledWith(null);
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

        const button = getByTestId('dock-slot-relic-0');
        expect(button.props.accessibilityState).toEqual({ selected: true });
    });
});
