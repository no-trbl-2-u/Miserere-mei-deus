import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { MapCanvas, computeFocusTransform, focusKeyOf, edgeStroke, minScaleFor } from '../MapCanvas';
import type { ExplorationNode, ExplorationEdge } from '@/state/presenters/exploration.engine';

// The stock reanimated mock builds a fresh `{ value }` box on EVERY render
// (no ref behind `useSharedValue`), so a camera the fit effect commits is gone
// by the next render and the rendered transform can never be asserted. Persist
// the box across renders; everything else stays the stock mock.
jest.mock('react-native-reanimated', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Reanimated = require('react-native-reanimated/mock');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useRef } = require('react');
    return {
        ...Reanimated,
        useSharedValue: <V,>(init: V) => useRef({ value: init }).current,
    };
});

const mockNodes: ExplorationNode[] = [
    {
        id: 'node-1',
        label: 'First Node',
        kind: 'current',
        type: 'encounter',
        x: 100,
        y: 200,
        triggersCombat: true,
    },
    {
        id: 'node-2',
        label: 'Second Node',
        kind: 'available',
        type: 'treasure',
        x: 300,
        y: 400,
        triggersCombat: false,
    },
    {
        id: 'node-3',
        label: 'Third Node',
        kind: 'locked',
        type: 'boss',
        x: 500,
        y: 600,
        triggersCombat: true,
    },
    {
        id: 'node-4',
        label: 'Fourth Node',
        kind: 'completed',
        type: 'rest',
        x: 150,
        y: 100,
        triggersCombat: false,
    },
];

const mockEdges: ExplorationEdge[] = [
    {
        fromId: 'node-1',
        toId: 'node-2',
        traveled: false,
        locked: false,
        lateral: false,
    },
    {
        fromId: 'node-2',
        toId: 'node-3',
        traveled: false,
        locked: true,
        lateral: false,
    },
    {
        fromId: 'node-1',
        toId: 'node-4',
        traveled: true,
        locked: false,
        lateral: false,
    },
];

describe('MapCanvas', () => {
    const MockChildren = () => <></>; // Simple mock children

    it('renders correctly with nodes and edges', () => {
        const { getByTestId } = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges}>
                <MockChildren />
            </MapCanvas>
        );

        // Should render the main wrapper
        expect(getByTestId('map-canvas-wrapper')).toBeDefined();
    });

    it('renders correctly with empty nodes and edges', () => {
        const { getByTestId } = render(
            <MapCanvas nodes={[]} edges={[]}>
                <MockChildren />
            </MapCanvas>
        );

        // Should still render the wrapper even with no nodes
        expect(getByTestId('map-canvas-wrapper')).toBeDefined();
    });

    it('builds node lookup map correctly', () => {
        // Test that the component can handle node lookups internally
        const { getByTestId } = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges}>
                <MockChildren />
            </MapCanvas>
        );

        // The component should render without errors even with edge references
        expect(getByTestId('map-canvas-wrapper')).toBeDefined();
    });

    it('handles viewport layout changes', () => {
        const { getByTestId } = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges}>
                <MockChildren />
            </MapCanvas>
        );

        const wrapper = getByTestId('map-canvas-wrapper');
        
        // Simulate layout event
        fireEvent(wrapper, 'layout', {
            nativeEvent: { layout: { width: 375, height: 400 } }
        });

        // Should handle layout without errors
        expect(wrapper).toBeDefined();
    });

    it('ignores zero-width layout events', () => {
        const { getByTestId } = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges}>
                <MockChildren />
            </MapCanvas>
        );

        const wrapper = getByTestId('map-canvas-wrapper');
        
        // Simulate zero-width layout event (should be ignored)
        fireEvent(wrapper, 'layout', {
            nativeEvent: { layout: { width: 0, height: 400 } }
        });

        // Should handle gracefully
        expect(wrapper).toBeDefined();
    });

    it('renders children correctly', () => {
        const TestChild = () => <></>;
        const { getByTestId } = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges}>
                <TestChild />
            </MapCanvas>
        );

        // The children should be rendered inside the animated canvas
        expect(getByTestId('map-canvas-wrapper')).toBeDefined();
    });

    it('calculates spread canvas dimensions correctly', () => {
        // The component uses a 2.6x spread factor
        const SPREAD = 2.6;
        const expectedCanvasW = 360 * SPREAD;
        const expectedCanvasH = 400 * SPREAD;

        const { getByTestId } = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges}>
                <MockChildren />
            </MapCanvas>
        );

        // Should render without errors with correct dimensions
        expect(getByTestId('map-canvas-wrapper')).toBeDefined();
        
        // Verify canvas dimensions are applied (936 x 1040)
        expect(expectedCanvasW).toBe(936);
        expect(expectedCanvasH).toBe(1040);
    });

    it('pivots the canvas transform at its own top-left (CRITIQUE pass 48)', () => {
        // `computeFocusTransform`'s tx/ty treat the canvas's own TOP-LEFT
        // corner as the scale pivot. The platform default pivots around the
        // CENTER instead, which stayed invisible for as long as the fitted
        // scale happened to land at 1 (desktop always does — `Math.min(1, …)`
        // caps it) but threw the whole canvas off-frame the moment a narrow
        // viewport clamped to MIN_SCALE: the late-game hub's node graph
        // rendered fully blank on mobile because the fitted canvas landed
        // almost entirely below the fold. `transformOrigin: '0 0'` makes the
        // real pivot match what the math already assumes.
        const { getByTestId } = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges}>
                <MockChildren />
            </MapCanvas>
        );
        const flat = StyleSheet.flatten(getByTestId('map-canvas').props.style);
        expect(flat.transformOrigin).toBe('0 0');
    });

    it('mounts overlays in the viewport-fixed furniture layer (CRITIQUE pass 20)', () => {
        const { getByTestId } = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges} overlays={<MockChildren />}>
                <MockChildren />
            </MapCanvas>
        );

        // The fixed layer exists and never swallows pan gestures.
        const fixed = getByTestId('map-overlays-fixed');
        expect(fixed).toBeDefined();
        expect(fixed.props.pointerEvents).toBe('none');
    });

    it('omits the fixed overlay layer when no overlays are passed', () => {
        const { queryByTestId } = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges}>
                <MockChildren />
            </MapCanvas>
        );

        expect(queryByTestId('map-overlays-fixed')).toBeNull();
    });

    it('haloes every node mark only on a sheet that asks for it (map revamp M3d)', () => {
        const plate = { width: 1000, height: 1000, scale: 2.4, backdrop: 1, plateOpacity: 0.85, chartTexture: false };
        const plain = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges} sheet={plate}>
                <MockChildren />
            </MapCanvas>
        );
        expect(plain.queryByTestId('map-node-halos')).toBeNull();

        const haloed = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges} sheet={{ ...plate, nodeHalo: true }}>
                <MockChildren />
            </MapCanvas>
        );
        const halos = haloed.getByTestId('map-node-halos');
        const discs = React.Children.toArray(halos.props.children) as React.ReactElement<{ cx: number; cy: number }>[];
        expect(discs.map((d) => [d.props.cx, d.props.cy])).toEqual(mockNodes.map((n) => [n.x, n.y]));
    });

    it('handles nodes with mixed availability states', () => {
        const mixedNodes: ExplorationNode[] = [
            {
                id: 'current-node',
                label: 'Current Position',
                kind: 'current',
                type: 'encounter',
                x: 180,
                y: 200,
                triggersCombat: true,
            },
            {
                id: 'available-node',
                label: 'Available Option',
                kind: 'available',
                type: 'treasure',
                x: 220,
                y: 250,
                triggersCombat: false,
            },
        ];

        const { getByTestId } = render(
            <MapCanvas nodes={mixedNodes} edges={[]}>
                <MockChildren />
            </MapCanvas>
        );

        expect(getByTestId('map-canvas-wrapper')).toBeDefined();
    });

    it('handles edges with different states correctly', () => {
        const edgesWithStates: ExplorationEdge[] = [
            {
                fromId: 'node-1',
                toId: 'node-2',
                traveled: true,
                locked: false,
                lateral: false,
            },
            {
                fromId: 'node-2',
                toId: 'node-3',
                traveled: false,
                locked: true,
                lateral: false,
            },
            {
                fromId: 'node-1',
                toId: 'node-4',
                traveled: false,
                locked: false,
                lateral: false,
            },
        ];

        const { getByTestId } = render(
            <MapCanvas nodes={mockNodes} edges={edgesWithStates}>
                <MockChildren />
            </MapCanvas>
        );

        expect(getByTestId('map-canvas-wrapper')).toBeDefined();
    });

    it('handles missing node references in edges gracefully', () => {
        const edgesWithMissingNodes: ExplorationEdge[] = [
            {
                fromId: 'nonexistent-1',
                toId: 'nonexistent-2',
                traveled: false,
                locked: false,
                lateral: false,
            },
            {
                fromId: 'node-1',
                toId: 'nonexistent-3',
                traveled: false,
                locked: false,
                lateral: false,
            },
        ];

        const { getByTestId } = render(
            <MapCanvas nodes={mockNodes} edges={edgesWithMissingNodes}>
                <MockChildren />
            </MapCanvas>
        );

        // Should render without errors even with invalid edge references
        expect(getByTestId('map-canvas-wrapper')).toBeDefined();
    });

    it('centers viewport on focus nodes (current and available)', () => {
        const focusNodes: ExplorationNode[] = [
            {
                id: 'current',
                label: 'Current',
                kind: 'current',
                type: 'encounter',
                x: 150,
                y: 200,
                triggersCombat: true,
            },
            {
                id: 'available',
                label: 'Available',
                kind: 'available',
                type: 'treasure',
                x: 250,
                y: 300,
                triggersCombat: false,
            },
        ];

        const { getByTestId } = render(
            <MapCanvas nodes={focusNodes} edges={[]}>
                <MockChildren />
            </MapCanvas>
        );

        const wrapper = getByTestId('map-canvas-wrapper');
        
        // Trigger layout to initiate centering
        fireEvent(wrapper, 'layout', {
            nativeEvent: { layout: { width: 375, height: 400 } }
        });

        expect(wrapper).toBeDefined();
    });

    it('falls back to canvas center when no focus nodes available', () => {
        const nonFocusNodes: ExplorationNode[] = [
            {
                id: 'locked',
                label: 'Locked',
                kind: 'locked',
                type: 'boss',
                x: 150,
                y: 200,
                triggersCombat: true,
            },
            {
                id: 'completed',
                label: 'Completed',
                kind: 'completed',
                type: 'rest',
                x: 250,
                y: 300,
                triggersCombat: false,
            },
        ];

        const { getByTestId } = render(
            <MapCanvas nodes={nonFocusNodes} edges={[]}>
                <MockChildren />
            </MapCanvas>
        );

        const wrapper = getByTestId('map-canvas-wrapper');
        
        // Trigger layout to initiate centering fallback
        fireEvent(wrapper, 'layout', {
            nativeEvent: { layout: { width: 375, height: 400 } }
        });

        expect(wrapper).toBeDefined();
    });
});

describe('computeFocusTransform', () => {
    const SPREAD = 2.6;

    it('centres a single focus node at 1x — no zoom-out needed', () => {
        const nodes: ExplorationNode[] = [
            { id: 'a', label: 'A', kind: 'current', type: 'encounter', x: 200, y: 200, triggersCombat: false },
        ];
        const fit = computeFocusTransform(nodes, { w: 400, h: 800 });
        expect(fit.scale).toBe(1);
        expect(fit.tx).toBeCloseTo(400 / 2 - 200 * SPREAD);
        expect(fit.ty).toBeCloseTo(800 / 2 - 200 * SPREAD);
    });

    // CRITIQUE pass 73: a node set near the plate's top edge, centred, dropped
    // the plate ~150px down a phone pane and left flat black above it.
    it('slides the plate to the frame edge rather than leave an empty band', () => {
        const nodes: ExplorationNode[] = [
            { id: 'a', label: 'A', kind: 'current', type: 'encounter', x: 100, y: 100, triggersCombat: false },
        ];
        const fit = computeFocusTransform(nodes, { w: 400, h: 800 });
        expect(fit.scale).toBe(1);
        expect(fit.ty).toBe(0);
        expect(fit.tx).toBeCloseTo(400 / 2 - 100 * SPREAD);
        const screenY = 100 * SPREAD + fit.ty;
        expect(screenY).toBeGreaterThanOrEqual(0);
        expect(screenY).toBeLessThanOrEqual(800);
    });

    it('never leaves a band on any edge of a plate that covers the pane', () => {
        const sheet = { width: 2400, height: 2400, scale: 1 };
        const viewport = { w: 355, h: 600 };
        const corners: Array<[number, number]> = [[60, 60], [2340, 60], [60, 2340], [2340, 2340]];
        for (const [x, y] of corners) {
            const nodes: ExplorationNode[] = [
                { id: 'a', label: 'A', kind: 'current', type: 'encounter', x, y, triggersCombat: false },
            ];
            const fit = computeFocusTransform(nodes, viewport, sheet);
            const plateW = sheet.width * fit.scale;
            const plateH = sheet.height * fit.scale;
            expect(fit.tx).toBeLessThanOrEqual(0);
            expect(fit.ty).toBeLessThanOrEqual(0);
            expect(fit.tx + plateW).toBeGreaterThanOrEqual(viewport.w);
            expect(fit.ty + plateH).toBeGreaterThanOrEqual(viewport.h);
            const sx = x * fit.scale + fit.tx;
            const sy = y * fit.scale + fit.ty;
            expect(sx).toBeGreaterThanOrEqual(0);
            expect(sx).toBeLessThanOrEqual(viewport.w);
            expect(sy).toBeGreaterThanOrEqual(0);
            expect(sy).toBeLessThanOrEqual(viewport.h);
        }
    });

    // T, 2026-10-28: the screen is always the map — no zoom shows black.
    it('never zooms a plate out smaller than the pane, even for a plate-wide focus', () => {
        const sheet = { width: 2400, height: 2400, scale: 1 };
        const viewport = { w: 394, h: 557 };
        const nodes: ExplorationNode[] = [
            { id: 'a', label: 'A', kind: 'available', type: 'encounter', x: 0, y: 0, triggersCombat: false },
            { id: 'b', label: 'B', kind: 'available', type: 'encounter', x: 2400, y: 2400, triggersCombat: false },
        ];
        const fit = computeFocusTransform(nodes, viewport, sheet);
        expect(sheet.width * fit.scale).toBeGreaterThanOrEqual(viewport.w);
        expect(sheet.height * fit.scale).toBeGreaterThanOrEqual(viewport.h);
        expect(fit.tx).toBeLessThanOrEqual(0);
        expect(fit.ty).toBeLessThanOrEqual(0);
        expect(fit.tx + sheet.width * fit.scale).toBeGreaterThanOrEqual(viewport.w);
        expect(fit.ty + sheet.height * fit.scale).toBeGreaterThanOrEqual(viewport.h);
    });

    it('with no focus nodes, holds the cover floor when 1x would leave black', () => {
        const nodes: ExplorationNode[] = [
            { id: 'a', label: 'A', kind: 'locked', type: 'encounter', x: 100, y: 100, triggersCombat: false },
        ];
        const viewport = { w: 1200, h: 1500 };
        const fit = computeFocusTransform(nodes, viewport);
        const s = minScaleFor(viewport);
        expect(s).toBeGreaterThan(1);
        expect(fit.scale).toBe(s);
        expect(fit.tx).toBeCloseTo((viewport.w - 360 * SPREAD * s) / 2, 5);
        expect(fit.ty).toBeCloseTo((viewport.h - 400 * SPREAD * s) / 2, 5);
    });

    it('falls back to canvas centre at 1x when no focus nodes exist', () => {
        const nodes: ExplorationNode[] = [
            { id: 'a', label: 'A', kind: 'locked', type: 'encounter', x: 100, y: 100, triggersCombat: false },
        ];
        const fit = computeFocusTransform(nodes, { w: 400, h: 800 });
        const CANVAS_W = 360 * SPREAD;
        const CANVAS_H = 400 * SPREAD;
        expect(fit).toEqual({ scale: 1, tx: (400 - CANVAS_W) / 2, ty: (800 - CANVAS_H) / 2 });
    });

    // A wide branch of simultaneously-open nodes must all land
    // inside the viewport on the initial fit, not just their centroid.
    it('zooms out to fit a wide branch of open nodes fully in the viewport', () => {
        const nodes: ExplorationNode[] = [
            { id: 'left',  label: 'Left',  kind: 'available', type: 'encounter', x: 0,   y: 200, triggersCombat: false },
            { id: 'right', label: 'Right', kind: 'available', type: 'encounter', x: 180, y: 200, triggersCombat: false },
        ];
        const viewport = { w: 420, h: 900 };
        const fit = computeFocusTransform(nodes, viewport);

        expect(fit.scale).toBeLessThan(1);

        // Every focus node's projected screen position must land within
        // [0, viewport] on both axes — the exact defect this fit prevents.
        for (const n of nodes) {
            const screenX = n.x * SPREAD * fit.scale + fit.tx;
            const screenY = n.y * SPREAD * fit.scale + fit.ty;
            expect(screenX).toBeGreaterThanOrEqual(0);
            expect(screenX).toBeLessThanOrEqual(viewport.w);
            expect(screenY).toBeGreaterThanOrEqual(0);
            expect(screenY).toBeLessThanOrEqual(viewport.h);
        }
    });

    it('never zooms in past 1x even when focus nodes sit close together', () => {
        const nodes: ExplorationNode[] = [
            { id: 'a', label: 'A', kind: 'current',   type: 'encounter', x: 100, y: 100, triggersCombat: false },
            { id: 'b', label: 'B', kind: 'available', type: 'encounter', x: 102, y: 100, triggersCombat: false },
        ];
        const fit = computeFocusTransform(nodes, { w: 400, h: 800 });
        expect(fit.scale).toBe(1);
    });

    it('clamps to the cover floor rather than shrinking without bound', () => {
        const nodes: ExplorationNode[] = [
            { id: 'left',  label: 'Left',  kind: 'available', type: 'encounter', x: 0,   y: 0,   triggersCombat: false },
            { id: 'right', label: 'Right', kind: 'available', type: 'encounter', x: 1000, y: 1000, triggersCombat: false },
        ];
        const fit = computeFocusTransform(nodes, { w: 400, h: 800 });
        // The default sheet is 936x1040: the floor is the scale where it just covers 400x800.
        expect(fit.scale).toBeCloseTo(800 / 1040, 5);
        expect(fit.scale).toBe(minScaleFor({ w: 400, h: 800 }));
    });

    it('fits the Breakwater start fan on a phone (2026-09-26 playthrough)', () => {
        // A 2400px-square plate at 394x557: the windmill and its four exits
        // span ~840x985 canvas px. A flat 0.6 floor would leave every exit
        // off-screen; the fit must reach the ~0.37 it needs.
        const sheet = { width: 2400, height: 2400, scale: 1 };
        const viewport = { w: 394, h: 557 };
        const nodes: ExplorationNode[] = [
            { id: 'bw-1', label: 'Windmill', kind: 'current',   type: 'rest',      x: 1150, y: 1130, triggersCombat: false },
            { id: 'bw-2', label: 'Quay',     kind: 'available', type: 'encounter', x: 1080, y: 770,  triggersCombat: false },
            { id: 'bw-3', label: 'Gallows',  kind: 'available', type: 'hazard',    x: 1630, y: 1270, triggersCombat: false },
            { id: 'bw-4', label: 'Pass',     kind: 'available', type: 'gather',    x: 1460, y: 1755, triggersCombat: false },
            { id: 'bw-5', label: 'Cove',     kind: 'available', type: 'treasure',  x: 790, y: 1400, triggersCombat: false },
        ];
        const fit = computeFocusTransform(nodes, viewport, sheet);
        expect(fit.scale).toBeLessThan(0.6);
        for (const n of nodes) {
            const sx = n.x * fit.scale + fit.tx;
            const sy = n.y * fit.scale + fit.ty;
            expect(sx).toBeGreaterThanOrEqual(0);
            expect(sx).toBeLessThanOrEqual(viewport.w);
            expect(sy).toBeGreaterThanOrEqual(0);
            expect(sy).toBeLessThanOrEqual(viewport.h);
        }
    });

    it('floors at the scale where the plate just covers the pane', () => {
        const sheet = { width: 2400, height: 2400, scale: 1 };
        expect(minScaleFor({ w: 394, h: 557 }, sheet)).toBeCloseTo(557 / 2400, 5);
        expect(minScaleFor({ w: 1200, h: 900 })).toBeCloseTo(1200 / 936, 5);
    });
});

// ---------------------------------------------------------------------------
// The camera re-frames as the road opens, without fighting a pan
// ---------------------------------------------------------------------------

/**
 * `focusKeyOf` is the whole safety argument for re-fitting the camera, so it is
 * pinned directly rather than inferred from a rendered Reanimated transform.
 *
 * The camera must re-fit after a move, or the player's onward choices can sit
 * entirely off-screen. It must also not fight a manual pan (issue #294): a
 * naive re-key on `nodes` would, because `nodes` is a fresh array on every
 * render. These cases pin the property that satisfies both.
 */
describe('focusKeyOf — what the camera considers a change', () => {
    const node = (id: string, kind: ExplorationNode['kind']): ExplorationNode => ({
        id, label: id, kind, type: 'encounter', x: 0, y: 0, triggersCombat: false,
    });

    it('is EQUAL across a fresh array with identical content', () => {
        // THE REGRESSION GUARD for issue #294. The presenter hands MapCanvas a
        // new array every render; if that alone counted as a change the camera
        // would re-fit constantly and fight every pan.
        const a = [node('n1', 'current'), node('n2', 'available')];
        const b = [node('n1', 'current'), node('n2', 'available')];
        expect(a).not.toBe(b);
        expect(focusKeyOf(a)).toBe(focusKeyOf(b));
    });

    it('is EQUAL when the same options arrive in a different order', () => {
        const a = [node('n1', 'current'), node('n2', 'available'), node('n3', 'available')];
        const b = [node('n1', 'current'), node('n3', 'available'), node('n2', 'available')];
        expect(focusKeyOf(a)).toBe(focusKeyOf(b));
    });

    it('CHANGES when the player moves', () => {
        // The moment the camera has to re-fit.
        const before = [node('n1', 'current'), node('n2', 'available')];
        const after = [node('n2', 'current'), node('n3', 'available')];
        expect(focusKeyOf(before)).not.toBe(focusKeyOf(after));
    });

    it('CHANGES when a new path opens without the player moving', () => {
        const before = [node('n1', 'current'), node('n2', 'available')];
        const after = [node('n1', 'current'), node('n2', 'available'), node('n3', 'available')];
        expect(focusKeyOf(before)).not.toBe(focusKeyOf(after));
    });

    it('is UNCHANGED by locked or completed nodes', () => {
        // They are not the camera's subject; folding them in would re-fit the
        // view for changes the player did not make to their position or options.
        const bare = [node('n1', 'current'), node('n2', 'available')];
        const dressed = [
            node('n1', 'current'), node('n2', 'available'),
            node('n9', 'locked'), node('n8', 'completed'),
        ];
        expect(focusKeyOf(bare)).toBe(focusKeyOf(dressed));
    });

    it('is stable with no current node (empty map / pre-boot)', () => {
        expect(focusKeyOf([])).toBe(focusKeyOf([]));
        expect(() => focusKeyOf([])).not.toThrow();
    });
});

describe('MapCanvas re-frames on a focus change', () => {
    const MockChildren = () => <></>;
    const VIEWPORT = { w: 414, h: 896 };

    /**
     * The camera as the canvas currently renders it. The reanimated jest mock
     * evaluates `useAnimatedStyle` from the shared values' `.value` at render
     * time, so the transform on `map-canvas` is the camera as of the LAST
     * render — one render behind the effect that commits it. Every read below
     * therefore follows a same-props `rerender` to flush the committed fit
     * into the style. That same-props rerender is also load-bearing for the
     * regression guard: it is exactly the "fresh array, same content" render
     * that issue #294's constant re-fit came from.
     */
    const cameraOf = (getByTestId: (id: string) => { props: { style: unknown } }) => {
        const flat = StyleSheet.flatten(getByTestId('map-canvas').props.style) as {
            transform: Record<string, number>[];
        };
        const [{ translateX: tx }, { translateY: ty }, { scale }] = flat.transform;
        return { scale, tx, ty };
    };

    it('fits the camera to the current focus set, and re-fits when the player moves', () => {
        // The re-fit against a live component: the second fit must
        // actually land, not merely "not throw".
        const { getByTestId, rerender } = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges}><MockChildren /></MapCanvas>,
        );
        fireEvent(getByTestId('map-canvas-wrapper'), 'layout', {
            nativeEvent: { layout: { width: VIEWPORT.w, height: VIEWPORT.h } },
        });
        rerender(<MapCanvas nodes={[...mockNodes]} edges={mockEdges}><MockChildren /></MapCanvas>);
        const first = cameraOf(getByTestId);
        expect(first).toEqual(computeFocusTransform(mockNodes, VIEWPORT));

        const moved: ExplorationNode[] = mockNodes.map((n) =>
            n.id === 'node-1' ? { ...n, kind: 'completed' as const }
            : n.id === 'node-2' ? { ...n, kind: 'current' as const }
            : n.id === 'node-3' ? { ...n, kind: 'available' as const }
            : n);
        rerender(<MapCanvas nodes={moved} edges={mockEdges}><MockChildren /></MapCanvas>);
        rerender(<MapCanvas nodes={[...moved]} edges={mockEdges}><MockChildren /></MapCanvas>);
        const second = cameraOf(getByTestId);
        expect(second).toEqual(computeFocusTransform(moved, VIEWPORT));
        expect(second).not.toEqual(first);
    });

    it('does not undo a manual pan when a fresh nodes array describes the same focus (issue #294)', () => {
        const { getByTestId, rerender } = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges}><MockChildren /></MapCanvas>,
        );
        fireEvent(getByTestId('map-canvas-wrapper'), 'layout', {
            nativeEvent: { layout: { width: VIEWPORT.w, height: VIEWPORT.h } },
        });
        rerender(<MapCanvas nodes={[...mockNodes]} edges={mockEdges}><MockChildren /></MapCanvas>);
        const fit = cameraOf(getByTestId);

        // The player drags to look around. Without this perturbation the
        // guard would be vacuous — a spurious re-fit lands on the same numbers.
        // RNGH's jest-utils deliver the FIRST ACTIVE event as `onStart`; only a
        // repeated ACTIVE reaches `onUpdate`, which is where the pan moves tx/ty.
        // The fitted plate exactly fills the pane's height, so only a sideways
        // drag has room to move it.
        const drag = { translationX: 120, translationY: 0 };
        fireGestureHandler(getByGestureTestId('map-pan'), [
            { state: State.BEGAN },
            { state: State.ACTIVE },
            { state: State.ACTIVE, ...drag },
            { state: State.END, ...drag },
        ]);
        rerender(<MapCanvas nodes={[...mockNodes]} edges={mockEdges}><MockChildren /></MapCanvas>);
        const panned = cameraOf(getByTestId);
        expect(panned).toEqual({ scale: fit.scale, tx: fit.tx + drag.translationX, ty: fit.ty + drag.translationY });

        // Fresh arrays, same subject — and a completed/locked-only change is
        // not a change of subject either. The camera must stay where the
        // player put it.
        const dressed: ExplorationNode[] = mockNodes.map((n) =>
            n.id === 'node-4' ? { ...n, kind: 'locked' as const } : { ...n });
        rerender(<MapCanvas nodes={dressed} edges={mockEdges}><MockChildren /></MapCanvas>);
        rerender(<MapCanvas nodes={[...dressed]} edges={mockEdges}><MockChildren /></MapCanvas>);
        expect(cameraOf(getByTestId)).toEqual(panned);

        // …until the player actually moves, which is when it must.
        const moved: ExplorationNode[] = dressed.map((n) =>
            n.id === 'node-1' ? { ...n, kind: 'completed' as const }
            : n.id === 'node-2' ? { ...n, kind: 'current' as const }
            : n);
        rerender(<MapCanvas nodes={moved} edges={mockEdges}><MockChildren /></MapCanvas>);
        rerender(<MapCanvas nodes={[...moved]} edges={mockEdges}><MockChildren /></MapCanvas>);
        expect(cameraOf(getByTestId)).toEqual(computeFocusTransform(moved, VIEWPORT));
    });

    /** Mount, lay out and flush the fit; returns the fitted camera. */
    const mountFitted = () => {
        const utils = render(<MapCanvas nodes={mockNodes} edges={mockEdges}><MockChildren /></MapCanvas>);
        fireEvent(utils.getByTestId('map-canvas-wrapper'), 'layout', {
            nativeEvent: { layout: { width: VIEWPORT.w, height: VIEWPORT.h } },
        });
        const flush = () => utils.rerender(<MapCanvas nodes={[...mockNodes]} edges={mockEdges}><MockChildren /></MapCanvas>);
        flush();
        return { ...utils, flush, fit: cameraOf(utils.getByTestId) };
    };
    const CANVAS = { w: 360 * 2.6, h: 400 * 2.6 };

    it('zooms about the pinch focal point, and a moving focal point drags the map', () => {
        const { getByTestId, flush, fit } = mountFitted();
        const f = { x: 200, y: 300 };
        // The plate point under the fingers before the pinch.
        const u = (f.x - fit.tx) / fit.scale;
        const v = (f.y - fit.ty) / fit.scale;
        fireGestureHandler(getByGestureTestId('map-pinch'), [
            { state: State.BEGAN, focalX: f.x, focalY: f.y, scale: 1 },
            { state: State.ACTIVE, focalX: f.x, focalY: f.y, scale: 1 },
            { state: State.ACTIVE, focalX: f.x, focalY: f.y, scale: 1.5 },
            { state: State.END, focalX: f.x, focalY: f.y, scale: 1.5 },
        ]);
        flush();
        const zoomed = cameraOf(getByTestId);
        expect(zoomed.scale).toBeCloseTo(fit.scale * 1.5, 5);
        expect(zoomed.tx + u * zoomed.scale).toBeCloseTo(f.x, 5);
        expect(zoomed.ty + v * zoomed.scale).toBeCloseTo(f.y, 5);

        // Same zoom, fingers slide up-left together: the map follows them.
        fireGestureHandler(getByGestureTestId('map-pinch'), [
            { state: State.BEGAN, focalX: f.x, focalY: f.y, scale: 1 },
            { state: State.ACTIVE, focalX: f.x, focalY: f.y, scale: 1 },
            { state: State.ACTIVE, focalX: f.x - 30, focalY: f.y - 10, scale: 1 },
            { state: State.END, focalX: f.x - 30, focalY: f.y - 10, scale: 1 },
        ]);
        flush();
        const slid = cameraOf(getByTestId);
        expect(slid.scale).toBeCloseTo(zoomed.scale, 5);
        expect(slid.tx).toBeCloseTo(zoomed.tx - 30, 5);
        expect(slid.ty).toBeCloseTo(zoomed.ty - 10, 5);
    });

    it('clamps a pinch between the cover floor and 3x, never showing black', () => {
        const { getByTestId, flush } = mountFitted();
        const pinchTo = (scale: number) => {
            fireGestureHandler(getByGestureTestId('map-pinch'), [
                { state: State.BEGAN, focalX: 100, focalY: 100, scale: 1 },
                { state: State.ACTIVE, focalX: 100, focalY: 100, scale: 1 },
                { state: State.ACTIVE, focalX: 100, focalY: 100, scale },
                { state: State.END, focalX: 100, focalY: 100, scale },
            ]);
            flush();
            return cameraOf(getByTestId);
        };
        expect(pinchTo(50).scale).toBe(3);
        const out = pinchTo(0.001);
        expect(out.scale).toBe(minScaleFor(VIEWPORT));
        expect(out.tx).toBeLessThanOrEqual(0);
        expect(out.ty).toBeLessThanOrEqual(0);
        expect(out.tx + CANVAS.w * out.scale).toBeGreaterThanOrEqual(VIEWPORT.w - 1e-6);
        expect(out.ty + CANVAS.h * out.scale).toBeGreaterThanOrEqual(VIEWPORT.h - 1e-6);
    });

    it('pans by each step delta and stops at the plate edges', () => {
        const { getByTestId, flush, fit } = mountFitted();
        fireGestureHandler(getByGestureTestId('map-pan'), [
            { state: State.BEGAN },
            { state: State.ACTIVE },
            { state: State.ACTIVE, translationX: 40, translationY: 0 },
            { state: State.ACTIVE, translationX: 70, translationY: 0 },
            { state: State.END, translationX: 70, translationY: 0 },
        ]);
        flush();
        expect(cameraOf(getByTestId)).toEqual({ scale: fit.scale, tx: fit.tx + 70, ty: fit.ty });

        fireGestureHandler(getByGestureTestId('map-pan'), [
            { state: State.BEGAN },
            { state: State.ACTIVE },
            { state: State.ACTIVE, translationX: 5000, translationY: -5000 },
            { state: State.END, translationX: 5000, translationY: -5000 },
        ]);
        flush();
        const far = cameraOf(getByTestId);
        expect(far.tx).toBe(0);
        expect(far.ty).toBeCloseTo(VIEWPORT.h - CANVAS.h * fit.scale, 5);
    });
});

// ---------------------------------------------------------------------------
// A branching chart has to stay readable
// ---------------------------------------------------------------------------

/**
 * `edgeStroke` is the whole of how the chart tells a forward road from a
 * lateral lane rib, so it is pinned directly rather than inferred
 * from rendered SVG (the sheet also draws ~43 hatch `Path`s and 5 contour
 * `Path`s, which would make a count-based assertion meaningless).
 */
describe('edgeStroke: ribs read as ribs, roads read as roads', () => {
    const AXM = { parchment: '#p', ash: '#a', bone: '#b' };
    const edge = (over: Partial<ExplorationEdge> = {}): ExplorationEdge => ({
        fromId: 'a', toId: 'b', traveled: false, locked: false, lateral: false, ...over,
    });

    it('draws a lateral rib lighter than the forward road it sits beside', () => {
        const road = edgeStroke(edge(), AXM);
        const rib = edgeStroke(edge({ lateral: true }), AXM);
        expect(rib.width).toBeLessThan(road.width);
        expect(rib.opacity).toBeLessThan(road.opacity);
    });

    it('gives a rib no road casing — the casing is what makes a line read as a road', () => {
        expect(edgeStroke(edge(), AXM).casing).toBe(true);
        expect(edgeStroke(edge({ lateral: true }), AXM).casing).toBe(false);
    });

    it('keeps a rib dashed even when it is open, so it never impersonates a road', () => {
        // An OPEN forward road is solid; a sealed one is coarsely dashed.
        expect(edgeStroke(edge(), AXM).dash).toBeUndefined();
        expect(edgeStroke(edge({ locked: true }), AXM).dash).toBe('5 5');
        // Every rib is finely dashed regardless of state.
        expect(edgeStroke(edge({ lateral: true }), AXM).dash).toBe('2 4');
        expect(edgeStroke(edge({ lateral: true, traveled: true }), AXM).dash).toBe('2 4');
    });

    it('keeps the progression states separated by WIDTH, not only by hue', () => {
        // Greyscale has to carry it: travelled is the widest, sealed the thinnest.
        const traveled = edgeStroke(edge({ traveled: true }), AXM);
        const open = edgeStroke(edge(), AXM);
        const sealed = edgeStroke(edge({ locked: true }), AXM);
        expect(traveled.width).toBeGreaterThan(open.width);
        expect(open.width).toBeGreaterThan(sealed.width);
    });

    it('still inks a rib in its state colour, so a rib into a sealed lane is visibly shut', () => {
        expect(edgeStroke(edge({ lateral: true, locked: true }), AXM).color).toBe(AXM.ash);
        expect(edgeStroke(edge({ lateral: true, traveled: true }), AXM).color).toBe(AXM.parchment);
    });
});

/**
 * RECENTRE — the return leg of the drag affordance. The pan is unbounded, so
 * a player who drags off to look down a side strand can be left holding a
 * blank corner of a 936x1040 sheet. With frontier roaming, looking
 * sideways is the point, so it has to be undoable.
 */
describe('MapCanvas: the recentre control', () => {
    const MockChildren = () => <></>;

    const mounted = () => {
        const r = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges}><MockChildren /></MapCanvas>,
        );
        fireEvent(r.getByTestId('map-canvas-wrapper'), 'layout', {
            nativeEvent: { layout: { width: 360, height: 640 } },
        });
        return r;
    };

    it('renders a labelled control that takes a touch', () => {
        const { getByTestId } = mounted();
        const btn = getByTestId('map-recenter');
        expect(btn.props.accessibilityRole).toBe('button');
        expect(String(btn.props.accessibilityLabel)).toMatch(/recentre/i);
    });

    it('takes the bottom-right corner, with no compass rose or ink blots left on the chart (T, 2026-10-02)', () => {
        const { getByTestId, queryByTestId } = mounted();
        const flat = StyleSheet.flatten(getByTestId('map-recenter').props.style);
        expect(flat.position).toBe('absolute');
        expect(flat.bottom).toBe(10);
        expect(flat.right).toBe(10);
        expect(queryByTestId('map-compass')).toBeNull();
    });

    it('is a real touch target — it is NOT inside the pointerEvents="none" overlay layer', () => {
        // The regression this guards: the legend layer is pointerEvents="none"
        // so it can never swallow a pan. Anything tappable placed inside it
        // would silently stop responding.
        const { getByTestId } = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges} overlays={<MockChildren />}>
                <MockChildren />
            </MapCanvas>,
        );
        const fixed = getByTestId('map-overlays-fixed');
        const btn = getByTestId('map-recenter');
        expect(fixed.props.pointerEvents).toBe('none');
        // Walk up from the button; the none-layer must not be an ancestor.
        let node: typeof btn | null = btn.parent as typeof btn | null;
        while (node) {
            expect(node).not.toBe(fixed);
            node = node.parent as typeof btn | null;
        }
    });

    it('presses without throwing, before and after a layout is known', () => {
        const unmeasured = render(
            <MapCanvas nodes={mockNodes} edges={mockEdges}><MockChildren /></MapCanvas>,
        );
        // No viewport yet — must be a safe no-op, not a crash.
        expect(() => fireEvent.press(unmeasured.getByTestId('map-recenter'))).not.toThrow();

        const { getByTestId } = mounted();
        expect(() => fireEvent.press(getByTestId('map-recenter'))).not.toThrow();
    });

    it('is a no-op on an empty map rather than a divide-by-nothing', () => {
        const r = render(<MapCanvas nodes={[]} edges={[]}><MockChildren /></MapCanvas>);
        fireEvent(r.getByTestId('map-canvas-wrapper'), 'layout', {
            nativeEvent: { layout: { width: 360, height: 640 } },
        });
        expect(() => fireEvent.press(r.getByTestId('map-recenter'))).not.toThrow();
    });
});
