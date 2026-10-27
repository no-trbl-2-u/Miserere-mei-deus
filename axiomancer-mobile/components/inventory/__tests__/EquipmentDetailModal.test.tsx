/**
 * Hermetic component tests — EquipmentDetailModal's loadout button
 * (phase EQ1a, A2).
 *
 * The card's view-model is built by the real presenter from a store whose
 * player carries relics, so the button the card offers is the one
 * `player.equipment` implies: UNEQUIP for a worn relic, EQUIP for an unworn
 * one with a free position, EQUIP · REPLACE <NAME> when every trinket
 * position is worn.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { createCharacter, getRelicById, type Equipment } from '@mechanics';

import { EquipmentDetailModal } from '@/components/inventory/EquipmentDetailModal';
import { selectEquipmentDetailViewModel } from '@/state/presenters/equipment-detail.engine';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const RING = getRelicById('relic-disarming-plea')!;
const SIGNET = getRelicById('relic-bleeding-signet')!;

function trinket(id: string, name: string): Equipment {
    return { id, name, description: '', category: 'equipment', slot: 'accessory' };
}

function stateWith(inventory: readonly Equipment[], worn: readonly Equipment[]) {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const base = store.getState().player;
    const player = createCharacter({
        id: base.id,
        name: base.name,
        level: base.level,
        baseStats: base.baseStats,
        inventory: [...inventory],
        equipment: [...worn],
    });
    store.setState({ player: { ...base, ...player } });
    return store.getState();
}

describe('EquipmentDetailModal — the loadout button (EQ1 A2)', () => {
    it('a worn relic offers UNEQUIP, which calls onUnequip with its id', () => {
        const vm = selectEquipmentDetailViewModel(stateWith([RING, SIGNET], [RING, SIGNET]), SIGNET.id)!;
        expect(vm.action).toEqual({ mode: 'unequip', label: 'UNEQUIP' });

        const onUnequip = jest.fn();
        const onEquip = jest.fn();
        const { getByTestId } = render(
            <EquipmentDetailModal vm={vm} onClose={jest.fn()} onEquip={onEquip} onUnequip={onUnequip} />,
        );
        fireEvent.press(getByTestId('equip-detail-unequip'));
        expect(onUnequip).toHaveBeenCalledWith(SIGNET.id);
        expect(onEquip).not.toHaveBeenCalled();
    });

    it('an unworn relic with a free position offers WEAR, which calls onEquip', () => {
        const vm = selectEquipmentDetailViewModel(stateWith([RING, SIGNET], [RING]), SIGNET.id)!;
        expect(vm.action).toEqual({ mode: 'equip', label: 'WEAR' });

        const onEquip = jest.fn();
        const { getByTestId, getByText } = render(
            <EquipmentDetailModal vm={vm} onClose={jest.fn()} onEquip={onEquip} onUnequip={jest.fn()} />,
        );
        expect(getByText('WEAR')).toBeTruthy();
        fireEvent.press(getByTestId('equip-detail-equip'));
        expect(onEquip).toHaveBeenCalledWith(SIGNET.id);
    });

    it('with every trinket position worn it offers WEAR · REPLACE the last-worn one', () => {
        const worn = [trinket('t1', 'First'), trinket('t2', 'Second'), trinket('t3', 'Third')];
        const vm = selectEquipmentDetailViewModel(stateWith([...worn, SIGNET], worn), SIGNET.id)!;
        expect(vm.action).toEqual({ mode: 'equip', label: 'WEAR · REPLACE THIRD' });
    });

    it('a lane relic shows its Lane line and carries it in the button label (LR1a A3)', () => {
        const vm = selectEquipmentDetailViewModel(stateWith([SIGNET], []), SIGNET.id)!;
        const { getByTestId, getByLabelText } = render(
            <EquipmentDetailModal vm={vm} onClose={jest.fn()} onEquip={jest.fn()} />,
        );
        expect(getByTestId('equip-detail-lane').props.children).toBe('Lane: Blood Price (while worn)');
        expect(getByLabelText('WEAR Bleeding Signet. Lane: Blood Price (while worn)')).toBeTruthy();
    });

    it('a relic with no lane draws no Lane line', () => {
        const vm = selectEquipmentDetailViewModel(stateWith([RING], []), RING.id)!;
        const { queryByTestId } = render(<EquipmentDetailModal vm={vm} onClose={jest.fn()} onEquip={jest.fn()} />);
        expect(queryByTestId('equip-detail-lane')).toBeNull();
    });

    it('shows no action button when no handler is wired, and CLOSE still closes', () => {
        const vm = selectEquipmentDetailViewModel(stateWith([RING], [RING]), RING.id)!;
        const onClose = jest.fn();
        const { queryByTestId, getByTestId } = render(<EquipmentDetailModal vm={vm} onClose={onClose} />);
        expect(queryByTestId('equip-detail-unequip')).toBeNull();
        fireEvent.press(getByTestId('equip-detail-close'));
        expect(onClose).toHaveBeenCalled();
    });
});
