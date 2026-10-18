/**
 * Hermetic component test — Equipment Dock column split.
 *
 * An even flex split between the pilgrim bust and the five worn slots leaves
 * each slot row too little room: names and the "grants <signature>" sub-label
 * truncate mid-word. The gear list is the information in this panel, so it
 * takes the room and the portrait keeps a fixed narrow gutter.
 *
 * Contract asserted here: the portrait column has a fixed width and does not
 * flex-grow; the slot column is the one that grows.
 */

import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { EquipmentDock } from '../EquipmentDock';
import type { EquipmentDockViewModel } from '@/state/presenters/inventory.engine';
import { withAllProviders } from '@/test-utils/withAllProviders';

function makeVm(): EquipmentDockViewModel {
    return {
        slots: [
            { key: 'weapon', label: 'WEAPON', item: { id: 'w', name: 'Long Blade', sub: 'Weapon' } },
            { key: 'armor', label: 'ARMOR', item: null },
            { key: 'accessory', accessoryIndex: 0, label: 'TRINKET I', item: null },
            { key: 'accessory', accessoryIndex: 1, label: 'TRINKET II', item: null },
            { key: 'accessory', accessoryIndex: 2, label: 'TRINKET III', item: null },
        ],
        headerLabel: '✠ WORN UPON THE BODY',
        hintLabel: 'CHOOSE A SLOT TO SEE WHAT ELSE FITS',
        bareLabel: '— bare —',
        selectedSlot: null,
        bannerEyebrow: 'FITTING SLOT',
        bannerSlotLabel: '',
        bannerClearLabel: 'CLEAR ✕',
    };
}

function mountDock() {
    const { tree } = withAllProviders(
        <EquipmentDock vm={makeVm()} selectedSlot={null} onSelectSlot={() => {}} />,
    );
    return render(tree);
}

describe('EquipmentDock: the gear list gets the room (S3-sheet-C11)', () => {
    it('gives the portrait a fixed narrow gutter instead of half the panel', () => {
        const portrait = StyleSheet.flatten(
            mountDock().getByTestId('equipment-dock-portrait').props.style,
        );

        expect(typeof portrait.width).toBe('number');
        // A gutter, not a half: comfortably under a phone half-width.
        expect(portrait.width as number).toBeLessThanOrEqual(120);
        expect(portrait.flex ?? 0).toBe(0);
    });

    it('lets the slot column take the remaining width', () => {
        const slots = StyleSheet.flatten(
            mountDock().getByTestId('equipment-dock-slots').props.style,
        );

        expect(slots.flex).toBe(1);
        expect(slots.width).toBeUndefined();
    });
});
