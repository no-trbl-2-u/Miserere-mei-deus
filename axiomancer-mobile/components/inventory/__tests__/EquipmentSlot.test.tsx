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

describe('EquipmentSlot — what a piece does', () => {
    const weapon = {
        id: 'weapon' as const, key: 'weapon' as const, label: 'Weapon',
        item: { id: 'weapon-opening-blade', name: 'Opening Blade', sub: 'Weapon', effectLine: 'First DEAL +2 · Special: +2 Conviction' },
    };

    it('a weapon or armor shows its effect line under its name', () => {
        const { getByTestId } = render(
            <EquipmentSlot slot={weapon} bareLabel="empty" selected={false} onPress={jest.fn()} />,
        );
        const line = getByTestId('dock-slot-effect-weapon');
        expect(line.props.children).toBe('First DEAL +2 · Special: +2 Conviction');
        expect(line.props.numberOfLines).toBe(2);
    });

    it('a signet relic still says "grants ..." and shows no effect line', () => {
        const relic = { ...mockSlot, item: { ...mockSlot.item, grantsSignature: 'The Open Hand', effectLine: 'ignored' } };
        const { getByText, queryByTestId } = render(
            <EquipmentSlot slot={relic} bareLabel="empty" selected={false} onPress={jest.fn()} />,
        );
        expect(getByText('grants The Open Hand')).toBeDefined();
        expect(queryByTestId('dock-slot-effect-relic-0')).toBeNull();
    });

    it('a piece with no effect and an empty row draw no effect line', () => {
        const { queryByTestId, rerender } = render(
            <EquipmentSlot slot={mockSlot} bareLabel="empty" selected={false} onPress={jest.fn()} />,
        );
        expect(queryByTestId('dock-slot-effect-relic-0')).toBeNull();
        rerender(<EquipmentSlot slot={mockEmptySlot} bareLabel="empty" selected={false} onPress={jest.fn()} />);
        expect(queryByTestId('dock-slot-effect-weapon')).toBeNull();
    });
});
