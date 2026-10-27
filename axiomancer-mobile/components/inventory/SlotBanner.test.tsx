/**
 * Hermetic component tests — SlotBanner.
 *
 * Pins the inventory slot-filter banner's render + interaction
 * contract: the eyebrow / slot-label / clear-label props all render,
 * the slot label is prefixed with the ✦ marker, the `slot-filter-banner`
 * and `slot-filter-clear` testIDs are present, the clear control carries
 * the "Clear slot filter" accessibility label, and pressing it fires
 * `onClear`.
 *
 * The component is pure presentation — props drive every branch, no
 * store reads or engine calls.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { SlotBanner } from '@/components/inventory/SlotBanner';

const mockOnClear = jest.fn();

function renderBanner(overrides: Partial<React.ComponentProps<typeof SlotBanner>> = {}) {
    return render(
        <SlotBanner
            bannerEyebrow="FILTERING BY SLOT"
            bannerSlotLabel="Weapon"
            bannerClearLabel="Clear"
            onClear={mockOnClear}
            {...overrides}
        />,
    );
}

describe('SlotBanner', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the eyebrow, slot label, and clear label from props', () => {
        const { getByText } = renderBanner();

        expect(getByText('FILTERING BY SLOT')).toBeDefined();
        expect(getByText('✦ Weapon')).toBeDefined();
        expect(getByText('Clear')).toBeDefined();
    });

    it('exposes the banner and clear testIDs', () => {
        const { getByTestId } = renderBanner();

        expect(getByTestId('slot-filter-banner')).toBeDefined();
        expect(getByTestId('slot-filter-clear')).toBeDefined();
    });

    it('labels the clear control for accessibility', () => {
        const { getByLabelText } = renderBanner();

        expect(getByLabelText('Clear slot filter')).toBeDefined();
    });

    it('fires onClear when the clear control is pressed', () => {
        const { getByTestId } = renderBanner();

        fireEvent.press(getByTestId('slot-filter-clear'));
        expect(mockOnClear).toHaveBeenCalledTimes(1);
    });

    it('reflects updated label props', () => {
        const { getByText } = renderBanner({
            bannerEyebrow: 'EQUIPPABLE HERE',
            bannerSlotLabel: 'Relic',
            bannerClearLabel: 'Show all',
        });

        expect(getByText('EQUIPPABLE HERE')).toBeDefined();
        expect(getByText('✦ Relic')).toBeDefined();
        expect(getByText('Show all')).toBeDefined();
    });
});
