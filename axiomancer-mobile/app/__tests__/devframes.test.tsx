/**
 * The dev harness exists so the frame engine can be judged before any shipped
 * enemy changes — so it is worth pinning that it renders, that it offers the
 * two controls the acceptance names (step a frame, toggle reduced motion), and
 * that it stays dark in a build with dev tools off.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import DevFrameHarness from '../devframes/index';

type GlobalWithDev = typeof globalThis & { __DEV__?: boolean };

afterEach(() => {
    (globalThis as GlobalWithDev).__DEV__ = true;
});

describe('the enemy frame harness', () => {
    it('plays the supplied set and names the clip, its fps and its resting frame', () => {
        render(<DevFrameHarness />);
        expect(screen.getByTestId('devframes-player')).toBeTruthy();
        expect(screen.getByTestId('devframes-readout').props.children).toContain('6fps');
    });

    it('steps a frame by hand once paused', () => {
        render(<DevFrameHarness />);
        fireEvent.press(screen.getByTestId('devframes-step-forward'));
        expect(screen.getByTestId('devframes-player-cell-1')).toBeTruthy();
        fireEvent.press(screen.getByTestId('devframes-step-forward'));
        expect(screen.getByTestId('devframes-player-cell-2')).toBeTruthy();
        fireEvent.press(screen.getByTestId('devframes-step-back'));
        expect(screen.getByTestId('devframes-player-cell-1')).toBeTruthy();
    });

    it('toggles the reduced-motion path, which holds the resting frame', () => {
        render(<DevFrameHarness />);
        expect(screen.queryByTestId('devframes-player-still')).toBeNull();
        fireEvent.press(screen.getByTestId('devframes-reduced-motion'));
        expect(screen.getByTestId('devframes-player-still')).toBeTruthy();
    });

    it('switches clips, so the one-shot can be watched beside the loop', () => {
        render(<DevFrameHarness />);
        fireEvent.press(screen.getByTestId('devframes-clip-attacking'));
        expect(screen.getByTestId('devframes-readout').props.children).toContain('one-shot');
    });

    it('renders nothing in a build with dev tools off', () => {
        (globalThis as GlobalWithDev).__DEV__ = false;
        render(<DevFrameHarness />);
        expect(screen.getByTestId('devframes-disabled')).toBeTruthy();
        expect(screen.queryByTestId('devframes-player')).toBeNull();
    });
});
