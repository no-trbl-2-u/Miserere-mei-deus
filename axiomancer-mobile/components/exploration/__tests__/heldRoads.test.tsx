import React from 'react';
import { act, render } from '@testing-library/react-native';

import { MapCanvas } from '../MapCanvas';
import { HELD_ROAD_DRAW_MS, resetHeldRoadMemory, roadsJustOpened, heldKeys } from '../heldRoads';
import type { ExplorationEdge, ExplorationNode } from '@/state/presenters/exploration.engine';

jest.mock('react-native-reanimated', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Reanimated = require('react-native-reanimated/mock');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useRef } = require('react');
    return { ...Reanimated, useSharedValue: <V,>(init: V) => useRef({ value: init }).current };
});

let mockReduced = false;
jest.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => mockReduced }));

const nodes: ExplorationNode[] = [
    { id: 'bw-h4', label: 'The Wreck', kind: 'current', type: 'hazard', x: 100, y: 100, triggersCombat: false },
    { id: 'bw-h5', label: 'Moored ship', kind: 'locked', type: 'rest', x: 300, y: 100, triggersCombat: false },
] as ExplorationNode[];

const edge = (over: Partial<ExplorationEdge>): ExplorationEdge => ({
    fromId: 'bw-h4', toId: 'bw-h5', traveled: false, locked: true, lateral: false, ...over,
});

const held = [edge({ held: true })];
const open = [edge({ held: false, locked: false })];

beforeEach(() => {
    resetHeldRoadMemory();
    mockReduced = false;
    jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe('held roads', () => {
    it('finds a road that was held and is not now', () => {
        expect(roadsJustOpened(heldKeys(held), open)).toEqual(['bw-h4|bw-h5']);
        expect(roadsJustOpened(heldKeys(open), open)).toEqual([]);
    });

    it('draws a freed road open along its length, then lands it open', () => {
        const view = render(<MapCanvas nodes={nodes} edges={held}>{null}</MapCanvas>);
        expect(view.queryByTestId('map-edge-opening')).toBeNull();
        view.rerender(<MapCanvas nodes={nodes} edges={open}>{null}</MapCanvas>);
        expect(view.queryByTestId('map-edge-opening')).not.toBeNull();
        act(() => { jest.advanceTimersByTime(HELD_ROAD_DRAW_MS + 50); });
        expect(view.queryByTestId('map-edge-opening')).toBeNull();
        expect(view.getAllByTestId('map-edge')).toHaveLength(1);
    });

    it('in instant mode lands the road open at once, with no draw', () => {
        mockReduced = true;
        const view = render(<MapCanvas nodes={nodes} edges={held}>{null}</MapCanvas>);
        view.rerender(<MapCanvas nodes={nodes} edges={open}>{null}</MapCanvas>);
        expect(view.queryByTestId('map-edge-opening')).toBeNull();
        expect(view.getAllByTestId('map-edge')).toHaveLength(1);
    });

    it('remembers a hold across the map unmounting while the player is at the hazard', () => {
        const first = render(<MapCanvas nodes={nodes} edges={held}>{null}</MapCanvas>);
        first.unmount();
        const back = render(<MapCanvas nodes={nodes} edges={open}>{null}</MapCanvas>);
        expect(back.queryByTestId('map-edge-opening')).not.toBeNull();
    });
});
