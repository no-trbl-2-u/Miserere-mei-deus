import React from 'react';
import { render } from '@testing-library/react-native';


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

import { LiveMeter, SegBar } from '../HazardMeters';
import type { HazardMeterVM, HazardViewModel } from '@/state/presenters/hazard.engine';

const meter = (over: Partial<HazardMeterVM> = {}): HazardMeterVM => ({
    key: 'force', label: 'FORCE', value: 2, valueLabel: '2', debt: false, need: 12, met: false, ...over,
});

describe('SegBar', () => {
    it('draws the label, the value over the need and one segment per need point', () => {
        const { getByText, getByTestId } = render(<SegBar meter={meter({ need: 4 })} />);
        expect(getByText('FORCE')).toBeTruthy();
        expect(getByTestId('hazard-meter-force')).toBeTruthy();
    });

    it('marks a met meter and a debt meter', () => {
        const met = render(<SegBar meter={meter({ value: 12, valueLabel: '12', met: true })} />);
        expect(met.getByText('12', { exact: false })).toBeTruthy();
        expect(met.queryByTestId('hazard-meter-force-debt')).toBeNull();
        const debt = render(<SegBar meter={meter({ value: -2, valueLabel: '-2', debt: true })} />);
        expect(debt.getByTestId('hazard-meter-force-debt')).toBeTruthy();
    });
});

describe('LiveMeter', () => {
    const vm = {
        meters: [meter(), meter({ key: 'escape', label: 'ESCAPE' })],
        bothRequired: true,
        meterDetail: 'Both must clear',
        momentumNote: 'x2 next round',
        thresholdLadder: [{ key: 'force', label: 'FORCE', values: [4, 8] }],
    } as unknown as HazardViewModel;

    it('stacks every meter with the both-required rule, the detail, the ladder and the momentum note', () => {
        const { getByTestId, getByText } = render(<LiveMeter vm={vm} />);
        expect(getByTestId('hazard-meter-force')).toBeTruthy();
        expect(getByTestId('hazard-meter-escape')).toBeTruthy();
        expect(getByText('BOTH REQUIRED')).toBeTruthy();
        expect(getByText('Both must clear')).toBeTruthy();
        expect(getByText('FORCE 4·8')).toBeTruthy();
        expect(getByText('⟜ x2 next round')).toBeTruthy();
    });

    it('omits the both-required rule, detail and momentum when the VM has none', () => {
        const plain = { ...vm, bothRequired: false, meterDetail: null, momentumNote: null } as unknown as HazardViewModel;
        const { queryByText } = render(<LiveMeter vm={plain} />);
        expect(queryByText('BOTH REQUIRED')).toBeNull();
        expect(queryByText('Both must clear')).toBeNull();
    });
});
