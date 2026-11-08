import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import {
    MapCanvas, computeFocusTransform, computeFocusTransformIn, frameCentreY, paneInsets, panIntoFrame,
    panIntoFrameIn, NO_INSETS,
} from '../MapCanvas';
import { clearCameraMemory } from '../mapCameraMemory';
import type { ExplorationEdge, ExplorationNode } from '@/state/presenters/exploration.engine';

jest.mock('react-native-reanimated', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Reanimated = require('react-native-reanimated/mock');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useRef } = require('react');
    return {
        ...Reanimated,
        useSharedValue: <V,>(init: V) => useRef({ value: init }).current,
        useReducedMotion: () => false,
    };
});

const nodes: ExplorationNode[] = [
    { id: 'a', label: 'A', kind: 'current', type: 'encounter', x: 100, y: 200, triggersCombat: true },
    { id: 'b', label: 'B', kind: 'available', type: 'encounter', x: 220, y: 90, triggersCombat: true },
] as ExplorationNode[];
const edges: ExplorationEdge[] = [];
const VIEW = { w: 360, h: 640 };

beforeEach(() => clearCameraMemory());

describe('the map frames inside the part of the pane the furniture leaves free', () => {
    it('paneInsets takes the pane\'s own 6pt margin off, never below zero', () => {
        expect(paneInsets({ top: 120, bottom: 90 })).toEqual({ top: 114, bottom: 84 });
        expect(paneInsets({ top: 3, bottom: 0 })).toEqual({ top: 0, bottom: 0 });
    });

    it('with no insets the framing is exactly the old one', () => {
        expect(computeFocusTransformIn(nodes, VIEW, undefined as never, NO_INSETS))
            .toEqual(computeFocusTransform(nodes, VIEW));
        const cam = { scale: 1, tx: 0, ty: 0 };
        expect(panIntoFrameIn(cam, 100, 200, VIEW, NO_INSETS)).toEqual(panIntoFrame(cam, 100, 200, VIEW));
    });

    it('centres the player in the free rectangle, not the pane', () => {
        const insets = { top: 120, bottom: 80 };
        const fit = computeFocusTransformIn(nodes, VIEW, undefined as never, insets);
        const y = fit.ty + 200 * 2.6 * fit.scale;
        expect(y).toBeCloseTo(frameCentreY(VIEW, insets), 5);
        expect(frameCentreY(VIEW, insets)).toBe(120 + (640 - 200) / 2);
    });

    it('pans a node hiding under the card or the foot back into the free rectangle', () => {
        const insets = { top: 120, bottom: 80 };
        // A point at the pane's very top is under the card; at the very bottom, under the foot.
        const hiddenTop = panIntoFrameIn({ scale: 1, tx: 0, ty: 0 }, 180, 5, VIEW, insets);
        expect(hiddenTop.ty + 5).toBeGreaterThanOrEqual(120);
        const hiddenFoot = panIntoFrameIn({ scale: 1, tx: 0, ty: 0 }, 180, 635, VIEW, insets);
        expect(hiddenFoot.ty + 635).toBeLessThanOrEqual(640 - 80);
        // A node already inside the free rectangle leaves the camera untouched.
        const inside = { scale: 1, tx: 7, ty: 330 };
        expect(panIntoFrameIn(inside, 180, 0, VIEW, insets)).toEqual(inside);
    });
});

describe('the map\'s furniture clears the card and the foot', () => {
    const mounted = (insets: { top: number; bottom: number }) => {
        const r = render(
            <MapCanvas nodes={nodes} edges={edges} insets={insets} overlays={<Text testID="gesture-line">drag</Text>}>
                <Text>x</Text>
            </MapCanvas>,
        );
        fireEvent(r.getByTestId('map-canvas-wrapper'), 'layout', {
            nativeEvent: { layout: { width: 360, height: 640 } },
        });
        return r;
    };

    it('lays the overlay layer below the card', () => {
        const flat = StyleSheet.flatten(mounted({ top: 126, bottom: 0 }).getByTestId('map-overlays-fixed').props.style);
        expect(flat.top).toBe(120);
        expect(flat.bottom).toBe(0);
    });

    it('parks the recentre button above the foot', () => {
        const flat = StyleSheet.flatten(mounted({ top: 0, bottom: 106 }).getByTestId('map-recenter').props.style);
        expect(flat.bottom).toBe(10 + 100);
        expect(flat.right).toBe(10);
    });

    it('leaves both where they were with no insets', () => {
        const r = mounted({ top: 0, bottom: 0 });
        expect(StyleSheet.flatten(r.getByTestId('map-recenter').props.style).bottom).toBe(10);
        expect(StyleSheet.flatten(r.getByTestId('map-overlays-fixed').props.style).top).toBe(0);
    });
});
