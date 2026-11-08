/**
 * Self no longer carries the DEV TOOLS link (it moved to Settings), and its
 * three stat plaques render sized from the row.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import CharacterScreen from '@/app/(tabs)/character';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { createAppStore } from '@/state/store';
import { withAllProviders } from '@/test-utils/withAllProviders';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => ({}),
}));

describe('Self screen', () => {
    it('renders no dev tools link in a dev build', () => {
        const slots = createMemorySlotStore({ activeSlot: 1 });
        const store = createAppStore({ adapter: slots });
        render(withAllProviders(<CharacterScreen />, { store, slots }).tree);
        expect(screen.queryByTestId('settings-dev-tools-link')).toBeNull();
        expect(screen.queryByTestId('self-dev-tools-link')).toBeNull();
    });

    it('draws HEART, BODY and MIND plaques of one width', () => {
        const slots = createMemorySlotStore({ activeSlot: 1 });
        const store = createAppStore({ adapter: slots });
        render(withAllProviders(<CharacterScreen />, { store, slots }).tree);
        const widths = ['heart', 'body', 'mind'].map((k) => {
            const style = screen.getByTestId(`self-base-tile-${k}`).props.style as unknown;
            const flat = ([] as unknown[]).concat(style).flat(3).filter(Boolean) as { width?: number }[];
            return flat.find((s) => typeof s.width === 'number')?.width;
        });
        expect(new Set(widths).size).toBe(1);
        expect(widths[0]).toBeGreaterThan(0);
    });
});
