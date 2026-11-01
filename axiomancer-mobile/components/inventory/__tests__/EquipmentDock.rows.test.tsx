/**
 * Hermetic component test: one dock row is picked at a time.
 *
 * The dock draws its five real rows (not stand-ins). A harness holds the pick
 * the way the satchel screen does, so tapping a row picks it, tapping it again
 * clears it, and the three relic rows never light together.
 */

import { describe, expect, it } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React, { useState } from 'react';

import { EquipmentDock } from '../EquipmentDock';
import type { DockRowId, EquipmentDockViewModel } from '@/state/presenters/inventory.engine';
import { withAllProviders } from '@/test-utils/withAllProviders';

jest.mock('@/components/art/PlayerPortraitImage', () => ({
    PlayerPortraitImage: () => null,
}));

const ROWS: readonly DockRowId[] = ['weapon', 'armor', 'relic-0', 'relic-1', 'relic-2'];

function makeVm(): EquipmentDockViewModel {
    return {
        slots: [
            { id: 'weapon', key: 'weapon', label: 'WEAPON', item: null },
            { id: 'armor', key: 'armor', label: 'ARMOR', item: null },
            { id: 'relic-0', key: 'relic', relicIndex: 0, label: 'RELIC I', item: { id: 'ring', name: "Suppliant's Ring", sub: 'Relic' } },
            { id: 'relic-1', key: 'relic', relicIndex: 1, label: 'RELIC II', item: { id: 'brooch', name: "Elementalist's Brooch", sub: 'Relic' } },
            { id: 'relic-2', key: 'relic', relicIndex: 2, label: 'RELIC III', item: null },
        ],
        headerLabel: '✠ WORN UPON THE BODY',
        hintLabel: 'CHOOSE A SLOT TO SEE WHAT ELSE FITS',
        bareLabel: '— bare —',
        selectedRow: null,
        bannerEyebrow: 'FITTING SLOT',
        bannerSlotLabel: '',
        bannerClearLabel: 'CLEAR ✕',
    };
}

function Harness() {
    const [row, setRow] = useState<DockRowId | null>(null);
    return <EquipmentDock vm={makeVm()} selectedRow={row} onSelectRow={setRow} />;
}

function mount() {
    const { tree } = withAllProviders(<Harness />);
    return render(tree);
}

function pickedRows(screen: ReturnType<typeof mount>): DockRowId[] {
    return ROWS.filter(
        (id) => screen.getByTestId(`dock-slot-${id}`).props.accessibilityState.selected === true,
    );
}

describe('EquipmentDock: one picked row at a time', () => {
    it.each(ROWS)('tapping %s picks that row and no other', (id) => {
        const screen = mount();
        expect(pickedRows(screen)).toEqual([]);

        fireEvent.press(screen.getByTestId(`dock-slot-${id}`));

        expect(pickedRows(screen)).toEqual([id]);
    });

    it('tapping RELIC I leaves RELIC II and RELIC III unlit', () => {
        const screen = mount();
        fireEvent.press(screen.getByTestId('dock-slot-relic-0'));

        const selected = (id: string) => screen.getByTestId(`dock-slot-${id}`).props.accessibilityState.selected;
        expect(selected('relic-0')).toBe(true);
        expect(selected('relic-1')).toBe(false);
        expect(selected('relic-2')).toBe(false);
    });

    it('tapping another row moves the pick, and re-tapping the picked row clears it', () => {
        const screen = mount();
        fireEvent.press(screen.getByTestId('dock-slot-relic-0'));
        fireEvent.press(screen.getByTestId('dock-slot-relic-2'));
        expect(pickedRows(screen)).toEqual(['relic-2']);

        fireEvent.press(screen.getByTestId('dock-slot-relic-2'));
        expect(pickedRows(screen)).toEqual([]);
    });

    it('lets an empty relic row be picked while an earlier one is worn', () => {
        const screen = mount();
        fireEvent.press(screen.getByTestId('dock-slot-relic-2'));
        expect(pickedRows(screen)).toEqual(['relic-2']);
    });
});
