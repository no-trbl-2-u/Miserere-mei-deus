import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ExplorationNode, NODE_MIN_SCREEN, NODE_SIZE, nodeCounterScale } from '../ExplorationNode';
import { MapCameraContext } from '../mapSheetContext';
import { minScaleFor } from '../MapCanvas';
import { ALL_MAP_LAYOUTS } from '@/state/exploration-maps';
import { Circle } from 'react-native-svg';
import { SEALED_MARK_OPACITY } from '@/components/NodeMark';

const mockNode = {
    id: 'node-1',
    label: 'Test Node',
    kind: 'available' as const,
    type: 'encounter' as const,
    x: 100,
    y: 200,
    triggersCombat: true,
};

const mockOnNodePress = jest.fn();

describe('ExplorationNode', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly', () => {
        const { getByTestId } = render(
            <ExplorationNode
                node={mockNode}
                onNodePress={mockOnNodePress}
                isSelected={false}
            />
        );

        expect(getByTestId('node-node-1')).toBeDefined();
    });

    it('calls onNodePress when pressed', () => {
        const { getByTestId } = render(
            <ExplorationNode
                node={mockNode}
                onNodePress={mockOnNodePress}
                isSelected={false}
            />
        );

        fireEvent.press(getByTestId('node-node-1'));
        expect(mockOnNodePress).toHaveBeenCalledWith(mockNode);
    });

    it('shows the node label when selected', () => {
        const { getByText } = render(
            <ExplorationNode
                node={mockNode}
                onNodePress={mockOnNodePress}
                isSelected={true}
            />
        );

        expect(getByText('Test Node')).toBeDefined();
    });

    it('does not show the label when not selected', () => {
        const { queryByText } = render(
            <ExplorationNode
                node={mockNode}
                onNodePress={mockOnNodePress}
                isSelected={false}
            />
        );

        expect(queryByText('Test Node')).toBeNull();
    });
});

describe('a node behind a blocked road reads its reason (QL1d)', () => {
    it('a locked node with a blocked road says sealed and the road\'s reason; without one, sealed alone', () => {
        const locked = { ...mockNode, id: 'lock-1', label: 'The Marker', kind: 'locked' as const };
        const { getByTestId, rerender } = render(
            <ExplorationNode node={{ ...locked, blockedReason: 'Not yet.' }} onNodePress={mockOnNodePress} isSelected={false} />,
        );
        expect(getByTestId('node-lock-1').props.accessibilityLabel).toBe('The Marker, sealed: Not yet.');
        rerender(<ExplorationNode node={{ ...locked, blockedReason: null }} onNodePress={mockOnNodePress} isSelected={false} />);
        expect(getByTestId('node-lock-1').props.accessibilityLabel).toBe('The Marker, sealed');
    });
});

describe('the sealed mark shows where a road ends (critique pass 84)', () => {
    const sealedNode = { ...mockNode, id: 'sealed-1', kind: 'locked' as const };

    it('draws a sealed node at full wrapper opacity, so only NodeMark dims it', () => {
        const { getByTestId } = render(
            <ExplorationNode node={sealedNode} onNodePress={mockOnNodePress} isSelected={false} />,
        );
        const style = StyleSheet.flatten(getByTestId('node-sealed-1').props.style);
        expect(style.opacity ?? 1).toBe(1);
    });

    it('prints the sealed ring and disc at an effective opacity that still reads, but below a full mark', () => {
        const { UNSAFE_getAllByType } = render(
            <ExplorationNode node={sealedNode} onNodePress={mockOnNodePress} isSelected={false} />,
        );
        const circles = UNSAFE_getAllByType(Circle);
        const ring = circles.find((c) => c.props.strokeDasharray !== undefined)!;
        const disc = circles.find((c) => c.props.strokeDasharray === undefined)!;
        expect(ring.props.opacity).toBe(SEALED_MARK_OPACITY.ring);
        expect(disc.props.opacity).toBe(SEALED_MARK_OPACITY.disc);
        for (const o of [SEALED_MARK_OPACITY.ring, SEALED_MARK_OPACITY.disc]) {
            expect(o).toBeGreaterThanOrEqual(0.6);
            expect(o).toBeLessThan(1);
        }
    });
});

describe('node marks at any zoom (critique pass 75)', () => {
    it('keeps its own size wherever the zoom alone draws it at the floor or larger', () => {
        expect(nodeCounterScale(1)).toBe(1);
        expect(nodeCounterScale(0.7)).toBe(1);
    });

    it('scales up so the mark never draws under NODE_MIN_SCREEN px', () => {
        for (const camera of [0.6, 0.3, 0.148]) {
            expect(NODE_SIZE * camera * nodeCounterScale(camera)).toBeCloseTo(NODE_MIN_SCREEN);
        }
    });

    it.each(ALL_MAP_LAYOUTS.map((l) => [l.mapId, l] as const))(
        '%s: at a phone\'s widest fit, no two marks overlap',
        (_id, layout) => {
            const camera = minScaleFor({ w: 375, h: 600 }, layout.sheet);
            const drawn = NODE_SIZE * camera * nodeCounterScale(camera);
            let closest = Infinity;
            for (let i = 0; i < layout.nodes.length; i++) {
                for (let j = i + 1; j < layout.nodes.length; j++) {
                    const a = layout.nodes[i];
                    const b = layout.nodes[j];
                    closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y));
                }
            }
            expect(drawn).toBeCloseTo(NODE_MIN_SCREEN);
            expect(closest * layout.sheet.scale * camera).toBeGreaterThanOrEqual(drawn);
        },
    );

    it('carries the counter-scale on its press target inside a zoomed-out map', () => {
        const camera = { value: 0.148 } as React.ContextType<typeof MapCameraContext>;
        const { getByTestId } = render(
            <MapCameraContext.Provider value={camera}>
                <ExplorationNode node={mockNode} onNodePress={mockOnNodePress} isSelected={false} />
            </MapCameraContext.Provider>,
        );
        const style = StyleSheet.flatten(getByTestId('node-node-1').props.style);
        expect(style.transform).toEqual([{ scale: nodeCounterScale(0.148) }]);
    });
});
