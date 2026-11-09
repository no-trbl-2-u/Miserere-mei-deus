/**
 * MapOverlays component — hermetic test suite.
 * Tests the gesture line layered over the exploration map. The legend strip
 * was cut on 2026-11-02 (T: the marks read for themselves), so the suite
 * also pins that nothing draws it any more.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { Platform } from 'react-native';

import { MapOverlays, detectMapPointer, GESTURE_STRIP_HEIGHT } from '../MapOverlays';
import { MAP_GESTURE_LINE } from '@/state/presenters/exploration.engine';

describe('MapOverlays', () => {

    it('renders without crashing', () => {
        const { root } = render(<MapOverlays />);
        expect(root).toBeTruthy();
    });

    it('renders the fixed gesture line, naming the pan/pinch gesture', () => {
        render(<MapOverlays />);
        // The chart pans and zooms behind a much smaller
        // window, so the always-on furniture has to say so.
        expect(screen.getByText(MAP_GESTURE_LINE.touch)).toBeTruthy();
        expect(MAP_GESTURE_LINE.touch).toBe('drag · pinch');
    });

    it('tells a mouse to scroll, since a mouse cannot pinch (critique pass 91)', () => {
        render(<MapOverlays pointer="mouse" />);
        expect(screen.getByTestId('map-gesture-line').props.children).toBe('drag · scroll to zoom');
        expect(screen.queryByText(/pinch/)).toBeNull();
    });

    describe('detectMapPointer', () => {
        const os = Platform.OS;
        const mm = (globalThis as { window?: { matchMedia?: unknown } }).window?.matchMedia;
        const setOS = (v: string) => Object.defineProperty(Platform, 'OS', { value: v, configurable: true });
        const setFine = (fine: boolean) => {
            (globalThis as unknown as { window: { matchMedia: unknown } }).window.matchMedia = (q: string) =>
                ({ matches: fine && q === '(pointer: fine)' });
        };
        afterEach(() => {
            setOS(os);
            const w = (globalThis as { window?: { matchMedia?: unknown } }).window;
            if (w) w.matchMedia = mm;
        });

        it('is touch on native, whatever the media query says', () => {
            setOS('android');
            setFine(true);
            expect(detectMapPointer()).toBe('touch');
        });

        it('is mouse on web with a fine pointer, touch with a coarse one', () => {
            setOS('web');
            setFine(true);
            expect(detectMapPointer()).toBe('mouse');
            setFine(false);
            expect(detectMapPointer()).toBe('touch');
        });

        it('falls back to touch on web without matchMedia', () => {
            setOS('web');
            (globalThis as unknown as { window: { matchMedia?: unknown } }).window.matchMedia = undefined;
            expect(detectMapPointer()).toBe('touch');
        });
    });

    it('carries no compass and no NODE GRAPH label (T, 2026-10-02)', () => {
        render(<MapOverlays />);
        expect(screen.queryByText('NODE GRAPH')).toBeNull();
        expect(screen.queryByText(/N ↑|leagues/)).toBeNull();
    });

    it('draws no legend strip at all (T, 2026-11-02)', () => {
        render(<MapOverlays />);
        expect(screen.queryByTestId('map-legend')).toBeNull();
        expect(screen.queryByTestId('map-legend-plate')).toBeNull();
        expect(screen.queryByText(/TRODDEN|OPEN|SEALED/)).toBeNull();
        expect(screen.queryByText(/nodes ·/)).toBeNull();
    });

    it('lays the gesture line in a strip of its own, not over the map (MC1c A11)', () => {
        render(<MapOverlays />);
        const line = StyleSheet.flatten(screen.getByTestId('map-gesture-line').props.style);
        const strip = StyleSheet.flatten(screen.getByTestId('map-gesture-strip').props.style);
        // In flow: nothing absolute, so it takes a row under the frame and covers no node.
        expect(line.position).toBeUndefined();
        expect(strip.position).toBeUndefined();
        expect(strip.height).toBe(GESTURE_STRIP_HEIGHT);
        expect(line.fontSize).toBeGreaterThanOrEqual(9);
    });
});
