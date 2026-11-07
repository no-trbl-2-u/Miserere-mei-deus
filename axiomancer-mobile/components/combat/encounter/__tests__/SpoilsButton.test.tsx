// guard-test: pins SpoilsButton, which #1423 shipped with no test of its own, so it passes on the parent by design
/**
 * The vellum action plate: it sits the plate art behind its children, pads the
 * sides clear of the ornament, and fades when disabled by the same opacity the
 * contrast test measures.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { SpoilsButton } from '@/components/combat/encounter/SpoilsButton';
import { DISABLED_OPACITY } from '@/components/combat/encounter/spoils-ink';
import { withAllProviders } from '@/test-utils/withAllProviders';

const flat = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style) as Record<string, unknown>;

describe('SpoilsButton', () => {
    it('draws the plate art behind its children, with side padding clear of the corners', () => {
        render(withAllProviders(<SpoilsButton testID="plate"><Text>CONTINUE</Text></SpoilsButton>).tree);
        const plate = screen.getByTestId('plate');
        expect(screen.getByText('CONTINUE')).toBeTruthy();
        // The backdrop is the first child, the label after it.
        expect(plate.children.length).toBeGreaterThanOrEqual(2);
        expect(flat('plate').paddingHorizontal).toBeGreaterThanOrEqual(24);
        expect(flat('plate').opacity).toBeUndefined();
    });

    it('fades to the shared disabled opacity when disabled', () => {
        render(withAllProviders(<SpoilsButton testID="plate" disabled><Text>TAKE CARD</Text></SpoilsButton>).tree);
        expect(flat('plate').opacity).toBe(DISABLED_OPACITY);
    });

    it('lets the caller style compose over the plate', () => {
        render(withAllProviders(<SpoilsButton testID="plate" style={{ marginTop: 6 }}><Text>X</Text></SpoilsButton>).tree);
        expect(flat('plate').marginTop).toBe(6);
        expect(flat('plate').flex).toBe(1);
    });
});
