import React from 'react';
import { render } from '@testing-library/react-native';

import { HazardBoard } from '../HazardBoard';
import type { HazardViewModel } from '@/state/presenters/hazard.engine';
import type { DragController } from '../HazardBoard';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Reanimated = require('react-native-reanimated/mock');
    
    // The mock for `call` immediately calls the callback which is incorrect
    // So we override it with a no-op
    Reanimated.default.call = () => {};
    
    return Reanimated;
});

// Mock react-native-gesture-handler with a chainable builder — the real
// Gesture API returns `this` from every configurator (minDistance,
// enabled, maxDistance, onStart, …), so a partial object breaks render.
jest.mock('react-native-gesture-handler', () => {
    const chainable = () => {
        const gesture: Record<string, unknown> = {};
        for (const method of [
            'minDistance', 'maxDistance', 'enabled',
            'onStart', 'onUpdate', 'onEnd', 'onFinalize',
        ]) {
            gesture[method] = () => gesture;
        }
        return gesture;
    };
    return {
        Gesture: {
            Pan: chainable,
            Tap: chainable,
            Exclusive: (...gestures: unknown[]) => gestures[0],
        },
        GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    };
});

const mockHazardViewModel: HazardViewModel = {
    active: true,
    phase: 'playing',
    title: 'Forest Ambush',
    scenario: 'Bandits block your path',
    boardHeadline: 'The Ambush Springs',
    boardNote: 'Cast your dice',
    roundLabel: 'Round 1',
    roundRoman: 'I',
    totalRounds: 3,
    marks: [],
    routeKey: 'risk',
    routeLabel: 'Risky Route',
    routeChoices: [],
    hand: [
        {
            uid: 'hand-1',
            cardId: 'strike',
            name: 'Strike',
            kind: 'red',
            rarity: 'common',
            dead: false,
            utility: false,
            free: { force: 2, escape: 0 },
            powered: { force: 4, escape: 0 },
            freeEffectLabel: '',
            poweredEffectLabel: '',
            flavor: 'Basic attack',
            keywords: [],
            dieAvailable: true,
            poweredByDieId: null,
            applied: false,
            salvageLabel: null,
        },
    ],
    play: [],
    deckCount: 10,
    discardCount: 2,
    thresholdLadder: [
        { key: 'force', label: 'FORCE', values: [4, 8, 12] },
        { key: 'escape', label: 'ESCAPE', values: [3, 6, 9] },
    ],
    resolveEnabled: true,
    resolveLabel: 'CAST DICE',
    resolveSubLabel: 'RESOLVE',
    resolveFlash: null,
    outcome: null,
    dice: [
        {
            id: 'die-1',
            kind: 'red',
            state: 'available',
            isHex: false,
            usable: true,
            temporary: false,
            accessibilityLabel: 'Red die, available',
        },
    ],
    diceReady: 1,
    hexCount: 0,
    bothRequired: false,
    meters: [
        {
            key: 'force',
            label: 'FORCE',
            value: 2,
            need: 12,
            met: false,
        },
    ],
    meterDetail: null,
    momentumNote: null,
    rewards: null,
};

const mockDragController: DragController = {
    begin: jest.fn(),
    move: jest.fn(),
    end: jest.fn(),
    active: null,
};

describe('HazardBoard', () => {
    const mockProps = {
        vm: mockHazardViewModel,
        drag: mockDragController,
        onStage: jest.fn(),
        onUnstage: jest.fn(),
        onPower: jest.fn(),
        onDiscard: jest.fn(),
        onResolve: jest.fn(),
        onApply: jest.fn(),
        onInspect: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders without crashing with valid props', () => {
        const { root } = render(<HazardBoard {...mockProps} />);
        expect(root).toBeTruthy();
    });

    it('renders round information', () => {
        const { getByText } = render(<HazardBoard {...mockProps} />);
        expect(getByText('Round 1')).toBeTruthy();
    });

    it('renders hand cards', () => {
        const { getByText } = render(<HazardBoard {...mockProps} />);
        expect(getByText('Strike')).toBeTruthy();
    });

    it('renders resolve button when enabled', () => {
        const { getByText } = render(<HazardBoard {...mockProps} />);
        // The button face is fixed PLAY copy; the VM drives the sub-label.
        expect(getByText('PLAY')).toBeTruthy();
        expect(getByText('RESOLVE')).toBeTruthy();
    });

    it('draws the bin on the live board, which passes a discard handler', () => {
        const { getByTestId, getByText } = render(<HazardBoard {...mockProps} />);
        expect(getByTestId('hazard-trash')).toBeTruthy();
        expect(getByText('SCRAP')).toBeTruthy();
    });

    it('draws no bin without a discard handler, as on the puzzle board', () => {
        const { onDiscard: _omitted, ...noBin } = mockProps;
        const { queryByTestId, queryByText, getByTestId } = render(<HazardBoard {...noBin} />);
        expect(queryByTestId('hazard-trash')).toBeNull();
        expect(queryByText('SCRAP')).toBeNull();
        expect(getByTestId('hazard-hand')).toBeTruthy();
    });

    it('renders progress meters', () => {
        const { getByText } = render(<HazardBoard {...mockProps} />);
        expect(getByText('FORCE')).toBeTruthy();
    });

    it('handles disabled resolve button', () => {
        const vmWithDisabledResolve = {
            ...mockHazardViewModel,
            resolveEnabled: false,
        };
        
        const { root } = render(
            <HazardBoard 
                {...mockProps} 
                vm={vmWithDisabledResolve} 
            />
        );
        expect(root).toBeTruthy();
    });
});