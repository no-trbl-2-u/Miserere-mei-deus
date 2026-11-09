/**
 * Self no longer carries the DEV TOOLS link (it moved to Settings), and its
 * three stat plaques render sized from the row.
 */

import React from 'react';
import { Dimensions } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { statTileLayout } from '@/components/self/statTileLayout';
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

    for (const w of [320, 360, 390, 430]) {
        it(`sizes each rendered plaque from statTileLayout at ${w} wide`, () => {
            const original = Dimensions.get('window');
            Dimensions.set({ window: { ...original, width: w } });
            let view: ReturnType<typeof render> | undefined;
            try {
                const slots = createMemorySlotStore({ activeSlot: 1 });
                const store = createAppStore({ adapter: slots });
                view = render(withAllProviders(<CharacterScreen />, { store, slots }).tree);
                const expected = statTileLayout(w - 24);
                for (const k of ['heart', 'body', 'mind']) {
                    const flat = ([] as unknown[]).concat(screen.getByTestId(`self-base-tile-${k}`).props.style as unknown).flat(3).filter(Boolean) as { width?: number }[];
                    expect(flat.find((x) => typeof x.width === 'number')?.width).toBe(expected.width);
                }
            } finally {
                view?.unmount();
                Dimensions.set({ window: original });
            }
        });
    }
});
