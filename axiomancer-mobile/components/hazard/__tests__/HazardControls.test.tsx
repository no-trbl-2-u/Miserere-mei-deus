import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';


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

import { ApplyButton, PlayButton, TrayDie } from '../HazardControls';
import type { HazardCardVM, HazardDieVM } from '@/state/presenters/hazard.engine';
import type { DragController } from '../HazardBoard';

const drag: DragController = { begin: jest.fn(), move: jest.fn(), end: jest.fn(), active: null };

const card = (over: Partial<HazardCardVM> = {}): HazardCardVM => ({
    uid: 'c1', cardId: 'strike', name: 'Strike', kind: 'red', rarity: 'common', dead: false, utility: false,
    free: { force: 2, escape: 0 }, powered: { force: 4, escape: 0 }, freeEffectLabel: '', poweredEffectLabel: '',
    flavor: '', keywords: [], dieAvailable: true, poweredByDieId: null, applied: false, salvageLabel: null, ...over,
} as HazardCardVM);

const die = (over: Partial<HazardDieVM> = {}): HazardDieVM => ({
    id: 'd1', kind: 'red', state: 'available', isHex: false, usable: true, temporary: false,
    accessibilityLabel: 'Red die, available', ...over,
} as HazardDieVM);

describe('ApplyButton', () => {
    it('applies the card on press', () => {
        const onApply = jest.fn();
        const { getByTestId } = render(<ApplyButton card={card()} onApply={onApply} />);
        fireEvent.press(getByTestId('hazard-apply-c1'));
        expect(onApply).toHaveBeenCalledWith('c1');
    });

    it('reads LOCKED, with no button, once applied', () => {
        const { getByText, queryByTestId } = render(<ApplyButton card={card({ applied: true })} onApply={jest.fn()} />);
        expect(getByText('✓ LOCKED')).toBeTruthy();
        expect(queryByTestId('hazard-apply-c1')).toBeNull();
    });
});

describe('PlayButton', () => {
    it('fires when enabled and speaks its label', () => {
        const onPress = jest.fn();
        const { getByTestId, getByText } = render(<PlayButton enabled label="PLAY" subLabel="RESOLVE" onPress={onPress} />);
        expect(getByText('RESOLVE')).toBeTruthy();
        fireEvent.press(getByTestId('hazard-play-button'));
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('is disabled and says why when nothing is staged', () => {
        const onPress = jest.fn();
        const { getByTestId, getByLabelText } = render(<PlayButton enabled={false} label="PLAY" subLabel="" onPress={onPress} />);
        expect(getByLabelText('Play, disabled. Stage at least one card first.')).toBeTruthy();
        fireEvent.press(getByTestId('hazard-play-button'));
        expect(onPress).not.toHaveBeenCalled();
    });
});

describe('TrayDie', () => {
    it('labels the die and tags a conjured one', () => {
        const a = render(<TrayDie die={die()} drag={drag} ghosted={false} />);
        expect(a.getByLabelText('Red die, available')).toBeTruthy();
        expect(a.queryByText('CONJURED')).toBeNull();
        const b = render(<TrayDie die={die({ id: 'd2', temporary: true })} drag={drag} ghosted />);
        expect(b.getByText('CONJURED')).toBeTruthy();
    });
});
