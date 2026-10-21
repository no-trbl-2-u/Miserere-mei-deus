/**
 * The dev harness exists so the frame engine can be judged before any shipped
 * enemy changes — so it is worth pinning that it renders, that it offers the
 * two controls the acceptance names (step a frame, toggle reduced motion), and
 * that it stays dark in a build with dev tools off.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ENEMY_FRAME_SETS, REQUIRED_CLIPS } from '@/assets/images/enemies/frames';

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

    // AN1c — the harness is how T judges the states, so all three must be
    // reachable in it, not only the two the engine shipped with.
    it.each([...REQUIRED_CLIPS])('offers the %s clip', (name) => {
        render(<DevFrameHarness />);
        expect(screen.getByTestId(`devframes-clip-${name}`)).toBeTruthy();
    });

    it('calls the resting clip a loop and the struck clip a one-shot', () => {
        render(<DevFrameHarness />);
        expect(screen.getByTestId('devframes-readout').props.children).toContain('loop');
        fireEvent.press(screen.getByTestId('devframes-clip-struck'));
        expect(screen.getByTestId('devframes-readout').props.children).toContain('one-shot');
    });

    // AN1e — the harness played only the synthetic fixture while the registry
    // was empty. Now that a real enemy is installed, T can watch the article
    // itself here rather than a stand-in for it, and the list is built FROM
    // the registry so the next enemy appears without this file being edited.
    it.each(Object.keys(ENEMY_FRAME_SETS))('offers the installed %s set', (key) => {
        render(<DevFrameHarness />);
        expect(screen.getByTestId(`devframes-set-${key}`)).toBeTruthy();
    });

    it('offers the synthetic fixture too, so the harness survives an empty registry', () => {
        render(<DevFrameHarness />);
        expect(screen.getByTestId('devframes-set-dev-synthetic')).toBeTruthy();
    });

    it('plays an installed set at its own manifest, not the fixture\'s', () => {
        render(<DevFrameHarness />);
        // The fixture is a 4x3 grid at 6fps; the float-eye is 8x3 at 12.
        expect(screen.getByTestId('devframes-readout').props.children).toContain('6fps');
        fireEvent.press(screen.getByTestId('devframes-set-float-eye'));
        expect(screen.getByTestId('devframes-readout').props.children).toContain('12fps');
        expect(screen.getByTestId('devframes-set-readout').props.children).toContain('float-eye');
        // The float-eye floats, so its anchor is the one that is NOT the default.
        expect(screen.getByTestId('devframes-set-readout').props.children).toContain('centre');
    });

    it('renders nothing in a build with dev tools off', () => {
        (globalThis as GlobalWithDev).__DEV__ = false;
        render(<DevFrameHarness />);
        expect(screen.getByTestId('devframes-disabled')).toBeTruthy();
        expect(screen.queryByTestId('devframes-player')).toBeNull();
    });
});
