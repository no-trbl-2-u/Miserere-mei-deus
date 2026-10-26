/**
 * Hermetic component tests — ItemModal surface.
 *
 * Pins the item use/equip modal: copy register, modal rendering,
 * button interactions, stat displays, accessibility labels. Tests the overlay that
 * appears during inventory item interaction for confirmation.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { ItemModal } from '@/components/inventory/ItemModal';
import type { ItemModalViewModel } from '@/state/presenters/inventory.modal.engine';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const mockConsumableModalVm: ItemModalViewModel = {
    itemId: 'test-potion-id',
    name: 'Test Healing Potion',
    description: 'A magical potion that restores health',
    mode: 'use',
    confirmPrompt: 'Drink the test healing potion?',
    confirmLabel: 'DRINK',
    previewLines: ['Heal 25 HP', 'HP 50 → 75 (+25)'],
    statDeltas: [],
    effectDeltas: [],
    itemModifiers: [],
    replacingName: null,
    notWornLine: null,
};

const mockEquipmentModalVm: ItemModalViewModel = {
    itemId: 'test-sword-id',
    name: 'Iron Sword',
    description: 'A sturdy iron blade forged for combat',
    mode: 'equip',
    confirmPrompt: 'Wear the iron sword?',
    confirmLabel: 'EQUIP · REPLACE RUSTY DAGGER',
    previewLines: ['Slot · WEAPON', 'Weapon slot.'],
    statDeltas: [
        { label: 'PHYS ATK', before: 10, after: 15, delta: 5 },
        { label: 'PHYS DEF', before: 8, after: 8, delta: 0 },
        { label: 'MENT ATK', before: 5, after: 5, delta: 0 },
        { label: 'EMOT DEF', before: 6, after: 6, delta: 0 },
    ],
    effectDeltas: [],
    itemModifiers: [],
    replacingName: 'Rusty Dagger',
    notWornLine: null,
};

const mockViewOnlyModalVm: ItemModalViewModel = {
    itemId: 'test-misc-id',
    name: 'Ancient Tome',
    description: 'A book of forgotten knowledge',
    mode: 'view',
    confirmPrompt: '',
    confirmLabel: 'CLOSE',
    previewLines: ['A book of forgotten knowledge'],
    statDeltas: [],
    effectDeltas: [],
    itemModifiers: [],
    replacingName: null,
    notWornLine: null,
};

function makeStore(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter() });
}

function withProvider(store: AppStore, child: React.ReactNode) {
    return <GameStoreProvider store={store}>{child}</GameStoreProvider>;
}

describe('ItemModal: mount contract', () => {
    it('renders nothing when modalVm is null', () => {
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={null}
                    onConfirm={() => undefined}
                    onCancel={() => undefined}
                />
            ),
        );
        // Modal with visible=false should not have visible content  
        expect(tree.queryByText('Test Healing Potion')).toBeNull();
    });

    it('renders the modal when modalVm is provided', () => {
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={mockConsumableModalVm}
                    onConfirm={() => undefined}
                    onCancel={() => undefined}
                />
            ),
        );
        expect(tree.queryByText('Test Healing Potion')).not.toBeNull();
        expect(tree.queryByText('\u201cA magical potion that restores health\u201d')).not.toBeNull();
    });

    it('renders consumable modal with all required fields', () => {
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={mockConsumableModalVm}
                    onConfirm={() => undefined}
                    onCancel={() => undefined}
                />
            ),
        );
        expect(tree.queryByText('Test Healing Potion')).not.toBeNull();
        expect(tree.queryByText('\u201cA magical potion that restores health\u201d')).not.toBeNull();
        expect(tree.queryByText('Heal 25 HP')).not.toBeNull();
        expect(tree.queryByText('HP 50 → 75 (+25)')).not.toBeNull();
        expect(tree.queryByText('Drink the test healing potion?')).not.toBeNull();
        expect(tree.queryByText('DRINK')).not.toBeNull();
        expect(tree.queryByText('CANCEL')).not.toBeNull();
    });

    it('renders equipment modal with stat deltas table', () => {
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={mockEquipmentModalVm}
                    onConfirm={() => undefined}
                    onCancel={() => undefined}
                />
            ),
        );
        expect(tree.queryByText('Iron Sword')).not.toBeNull();
        expect(tree.queryByText('\u201cA sturdy iron blade forged for combat\u201d')).not.toBeNull();
        expect(tree.queryByText('Slot · WEAPON')).not.toBeNull();
        expect(tree.queryByText('PHYS ATK')).not.toBeNull();
        expect(tree.queryByText('10 → 15 (+5)')).not.toBeNull();
        expect(tree.queryByText('PHYS DEF')).not.toBeNull();
        expect(tree.queryByText('8 → 8')).not.toBeNull();
        expect(tree.queryByText('Wear the iron sword?')).not.toBeNull();
        expect(tree.queryByText('EQUIP · REPLACE RUSTY DAGGER')).not.toBeNull();
    });

    it('renders view-only modal without confirm prompt', () => {
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={mockViewOnlyModalVm}
                    onConfirm={() => undefined}
                    onCancel={() => undefined}
                />
            ),
        );
        expect(tree.queryByText('Ancient Tome')).not.toBeNull();
        expect(tree.queryByText('\u201cA book of forgotten knowledge\u201d')).not.toBeNull();
        expect(tree.queryByText('A book of forgotten knowledge')).not.toBeNull();
        expect(tree.queryByText('CLOSE')).not.toBeNull();
        expect(tree.queryByText('CANCEL')).not.toBeNull();
        // Should not render confirm prompt when empty
        expect(tree.queryByText('')).toBeNull(); // Empty confirm prompt should not render
    });
});

describe('ItemModal: callbacks', () => {
    it('confirm button fires onConfirm exactly once', () => {
        const onConfirm = jest.fn();
        const onCancel = jest.fn();
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={mockConsumableModalVm}
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                />
            ),
        );
        fireEvent.press(tree.getByTestId('modal-confirm'));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onCancel).not.toHaveBeenCalled();
    });

    it('cancel button fires onCancel exactly once', () => {
        const onConfirm = jest.fn();
        const onCancel = jest.fn();
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={mockConsumableModalVm}
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                />
            ),
        );
        const cancelButton = tree.getByLabelText('Cancel');
        fireEvent.press(cancelButton);
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('backdrop press fires onCancel exactly once', () => {
        const onConfirm = jest.fn();
        const onCancel = jest.fn();
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={mockConsumableModalVm}
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                />
            ),
        );
        // Test Modal onRequestClose behavior (backdrop press handled by Modal component)
        const modal = tree.root.findByType('Modal');
        modal.props.onRequestClose();
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
    });
});

describe('ItemModal: accessibility', () => {
    it('confirm button surfaces descriptive accessibilityLabel from modalVm', () => {
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={mockConsumableModalVm}
                    onConfirm={() => undefined}
                    onCancel={() => undefined}
                />
            ),
        );
        const confirmButton = tree.getByTestId('modal-confirm');
        expect(confirmButton.props.accessibilityLabel).toBe('DRINK');
        expect(confirmButton.props.accessibilityRole).toBe('button');
    });

    it('cancel button has static accessibility label', () => {
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={mockConsumableModalVm}
                    onConfirm={() => undefined}
                    onCancel={() => undefined}
                />
            ),
        );
        const cancelButton = tree.getByLabelText('Cancel');
        expect(cancelButton.props.accessibilityLabel).toBe('Cancel');
        expect(cancelButton.props.accessibilityRole).toBe('button');
    });
});

describe('ItemModal: conditional rendering', () => {
    it('hides preview lines section when previewLines is empty', () => {
        const emptyPreviewVm: ItemModalViewModel = {
            ...mockConsumableModalVm,
            previewLines: [],
        };
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={emptyPreviewVm}
                    onConfirm={() => undefined}
                    onCancel={() => undefined}
                />
            ),
        );
        expect(tree.queryByText('Heal 25 HP')).toBeNull();
        expect(tree.queryByText('HP 50 → 75 (+25)')).toBeNull();
    });

    it('hides stat deltas table when statDeltas is empty', () => {
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={mockConsumableModalVm}
                    onConfirm={() => undefined}
                    onCancel={() => undefined}
                />
            ),
        );
        expect(tree.queryByText('PHYS ATK')).toBeNull();
        expect(tree.queryByText('PHYS DEF')).toBeNull();
    });

    it('hides confirm prompt when confirmPrompt is empty string', () => {
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={mockViewOnlyModalVm}
                    onConfirm={() => undefined}
                    onCancel={() => undefined}
                />
            ),
        );
        // With empty confirmPrompt, the Text component should not render
        const allTexts = tree.root.findAllByType('Text').map((node: any) => node.props.children);
        expect(allTexts).not.toContain('');
    });

    it('renders zero delta stat changes without delta notation', () => {
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={mockEquipmentModalVm}
                    onConfirm={() => undefined}
                    onCancel={() => undefined}
                />
            ),
        );
        // PHYS DEF has no change (delta = 0)
        expect(tree.queryByText('8 → 8')).not.toBeNull();
        // Should not show "(+0)" or "(-0)" for zero deltas
        expect(tree.queryByText('8 → 8 (+0)')).toBeNull();
        expect(tree.queryByText('8 → 8 (-0)')).toBeNull();
    });

    it('renders positive delta with plus sign', () => {
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={mockEquipmentModalVm}
                    onConfirm={() => undefined}
                    onCancel={() => undefined}
                />
            ),
        );
        // PHYS ATK has positive change (delta = +5)
        expect(tree.queryByText('10 → 15 (+5)')).not.toBeNull();
    });

    it('renders every stat row as a plain label + before → after', () => {
        const vmWithMixedStats: ItemModalViewModel = {
            ...mockEquipmentModalVm,
            statDeltas: [
                { label: 'PHYS ATK', before: 10, after: 15, delta: 5 },
                { label: 'CUSTOM STAT', before: 1, after: 2, delta: 1 },
            ],
        };
        const store = makeStore();
        const tree = render(
            withProvider(store,
                <ItemModal
                    modalVm={vmWithMixedStats}
                    onConfirm={() => undefined}
                    onCancel={() => undefined}
                />
            ),
        );
        expect(tree.queryByText('PHYS ATK')).not.toBeNull();
        expect(tree.queryByText('CUSTOM STAT')).not.toBeNull();
        expect(tree.queryByText('1 → 2 (+1)')).not.toBeNull();
    });
});