/**
 * ET1a, reshaped in CX1b (A7, A8): the ink curtain lands its end state at
 * once in instant mode (nothing skipped: it still reports done); in animate
 * mode it starts covered, recedes by its edge (never a fade), reports done
 * once gone, and a tap skips the draw-back.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { INK_DRAW_MS, INK_HOLD_MS, INK_LIP, InkCurtain, curtainEdgeY } from '../InkCurtain';

afterEach(() => {
    jest.useRealTimers();
});

describe('InkCurtain', () => {
    it('in instant mode mounts no ink and reports done once', () => {
        const onDone = jest.fn();
        render(<InkCurtain instant onDone={onDone} />);
        expect(screen.queryByTestId('ink-curtain')).toBeNull();
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('in animate mode covers the screen until tapped, then reports done', () => {
        const onDone = jest.fn();
        render(<InkCurtain instant={false} onDone={onDone} />);
        expect(onDone).not.toHaveBeenCalled();
        fireEvent.press(screen.getByTestId('ink-curtain'));
        expect(onDone).toHaveBeenCalledTimes(1);
        expect(screen.queryByTestId('ink-curtain')).toBeNull();
    });

    it('starts covered: the ink sheet has not moved and is never faded', () => {
        render(<InkCurtain instant={false} onDone={jest.fn()} />);
        const sheet = StyleSheet.flatten(screen.getByTestId('ink-curtain-sheet').props.style) as {
            opacity?: number; transform?: { translateY?: number }[];
        };
        expect(sheet.opacity ?? 1).toBe(1);
        expect(sheet.transform?.[0]?.translateY).toBe(0);
    });

    it('recedes by its edge, then reports done once', () => {
        jest.useFakeTimers();
        const onDone = jest.fn();
        render(<InkCurtain instant={false} onDone={onDone} />);
        act(() => { jest.advanceTimersByTime(INK_HOLD_MS + INK_DRAW_MS + 100); });
        expect(onDone).toHaveBeenCalledTimes(1);
        expect(screen.queryByTestId('ink-curtain')).toBeNull();
    });
});

describe('curtainEdgeY', () => {
    it('is 0 while covered, past the bottom (lip included) once gone, and moves monotonically', () => {
        expect(curtainEdgeY(1, 800)).toBe(0);
        expect(curtainEdgeY(0, 800)).toBe(800 + INK_LIP);
        expect(curtainEdgeY(0.5, 800)).toBeGreaterThan(curtainEdgeY(0.75, 800));
        expect(curtainEdgeY(2, 800)).toBe(0);
    });
});
