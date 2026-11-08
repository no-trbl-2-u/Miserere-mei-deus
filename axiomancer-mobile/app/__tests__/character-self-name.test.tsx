/**
 * Self shows the character's whole name beside the level badge, at 360, 390 and
 * 430 wide ("The Chosen", not "The Ch...").
 *
 * The widths are from a rendered web export: "Chosen" (the longest word of
 * "The Chosen") measured 89.2 wide at 22 points in UncialAntiqua, and the name
 * column measured 76 at 360, 106 at 390 and 146 at 430. The name wraps between
 * words and steps its font down only until that word fits.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import CharacterScreen from '@/app/(tabs)/character';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { createAppStore } from '@/state/store';
import { withAllProviders } from '@/test-utils/withAllProviders';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => ({}),
}));

const layout = (width: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height: 24 } } });

/** Mount Self, give the name its measured widths, read what it draws. */
function nameAt(column: number) {
    const slots = createMemorySlotStore({ activeSlot: 1 });
    const store = createAppStore({ adapter: slots });
    store.setState({ player: { ...store.getState().player, name: 'The Chosen' } });
    render(withAllProviders(<CharacterScreen />, { store, slots }).tree);
    const name = screen.getByTestId('self-character-name');
    act(() => {
        fireEvent(screen.getByTestId('self-character-name-probe', { includeHiddenElements: true }), 'layout', layout(89.2));
        fireEvent(name, 'layout', layout(column));
    });
    const drawn = screen.getByTestId('self-character-name');
    return { text: drawn.props.children, numberOfLines: drawn.props.numberOfLines, size: StyleSheet.flatten(drawn.props.style).fontSize as number };
}

describe('Self name', () => {
    it('keeps the whole name and its full size where the column is wide enough (390, 430)', () => {
        for (const column of [106, 146]) {
            const { text, size } = nameAt(column);
            expect(text).toBe('The Chosen');
            expect(size).toBe(22);
        }
    });

    it('steps down only until "Chosen" fits the 76 column at 360, and still shows the whole name', () => {
        const { text, size, numberOfLines } = nameAt(76);
        expect(text).toBe('The Chosen');
        expect(size).toBeLessThan(22);
        expect(size).toBeGreaterThanOrEqual(14);
        // "Chosen" at that size fits the column that was measured.
        expect(89.2 * (size / 22)).toBeLessThanOrEqual(76);
        // A name that cannot share a line wraps between words instead of being cut.
        expect(numberOfLines).toBeGreaterThanOrEqual(2);
    });
});
