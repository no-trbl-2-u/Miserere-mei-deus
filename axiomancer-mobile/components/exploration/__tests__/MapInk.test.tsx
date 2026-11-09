/**
 * CX1b, A6 and A8: the map ink grows out of the given point and reports
 * covered once; in instant mode it draws nothing and reports at once. The
 * host draws the live spread and arms the fight route's handoff.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';

import { MapInk, MAP_INK_SPREAD_MS, MAP_INK_START_RADIUS, inkCoverRadius, inkScaleAt } from '../MapInk';
import { MapInkHost } from '../MapInkHost';
import { tokenWindowPoint } from '../MapCanvas';
import {
    MAP_INK_HANDOFF_MAX_MS, __resetMapInkForTests, clearMapInk, currentMapInk, isMapInkHandoff, startMapInk,
} from '@/state/map-ink';

beforeEach(() => {
    jest.useFakeTimers();
    __resetMapInkForTests();
});

afterEach(() => {
    __resetMapInkForTests();
    jest.useRealTimers();
});

describe('the cover geometry', () => {
    it('reaches the farthest window corner from the origin', () => {
        // From the top-left corner of a 300x400 window the far corner is 500 away.
        expect(inkCoverRadius({ x: 0, y: 0 }, 300, 400)).toBeGreaterThanOrEqual(500);
        expect(inkCoverRadius({ x: 150, y: 200 }, 300, 400)).toBeGreaterThanOrEqual(250);
        expect(inkCoverRadius({ x: 150, y: 200 }, 300, 400)).toBeLessThan(260);
    });

    it('grows from a token-sized blot to the whole cover', () => {
        const r = 500;
        expect(inkScaleAt(0, r)).toBeCloseTo(MAP_INK_START_RADIUS / r);
        expect(inkScaleAt(0.5, r)).toBeGreaterThan(inkScaleAt(0.25, r));
        expect(inkScaleAt(1, r)).toBe(1);
        expect(inkScaleAt(2, r)).toBe(1);
    });
});

describe('tokenWindowPoint', () => {
    it('maps a sheet point through the sheet scale, the camera and the pane origin', () => {
        // Sheet (100, 50) at sheet scale 2 is canvas (200, 100); at camera scale
        // 0.5 that is pane (tx + 100, ty + 50); the pane sits at (10, 80).
        expect(tokenWindowPoint({ x: 100, y: 50 }, 2, { scale: 0.5, tx: -30, ty: 20 }, { x: 10, y: 80 }))
            .toEqual({ x: 80, y: 150 });
    });
});

describe('MapInk', () => {
    it('in instant mode draws nothing and reports covered once, at once', () => {
        const onCovered = jest.fn();
        render(<MapInk origin={{ x: 10, y: 10 }} width={390} height={844} instant onCovered={onCovered} />);
        expect(screen.queryByTestId('map-ink')).toBeNull();
        expect(onCovered).toHaveBeenCalledTimes(1);
    });

    it('in animate mode is centred on the origin, starts token-sized, and reports covered once the spread ends', () => {
        const onCovered = jest.fn();
        const origin = { x: 120, y: 300 };
        render(<MapInk origin={origin} width={390} height={844} instant={false} onCovered={onCovered} />);
        const blot = screen.getByTestId('map-ink-blot');
        const style = StyleSheet.flatten(blot.props.style) as { left: number; top: number; width: number };
        expect(style.left + style.width / 2).toBe(origin.x);
        expect(style.top + style.width / 2).toBe(origin.y);
        expect(onCovered).not.toHaveBeenCalled();
        act(() => { jest.advanceTimersByTime(MAP_INK_SPREAD_MS + 100); });
        expect(onCovered).toHaveBeenCalledTimes(1);
        // Covered, it stays up: its owner lifts it.
        expect(screen.queryByTestId('map-ink')).not.toBeNull();
    });
});

describe('MapInkHost and the handoff', () => {
    it('draws the live spread, runs its follow-up once on cover, arms the handoff until cleared', () => {
        render(<MapInkHost />);
        expect(screen.queryByTestId('map-ink')).toBeNull();
        const then = jest.fn();
        act(() => { startMapInk({ x: 50, y: 60 }, then); });
        expect(screen.queryByTestId('map-ink')).not.toBeNull();
        expect(isMapInkHandoff()).toBe(false);
        act(() => { jest.advanceTimersByTime(MAP_INK_SPREAD_MS + 100); });
        expect(then).toHaveBeenCalledTimes(1);
        expect(isMapInkHandoff()).toBe(true);
        // Still black while the fight screen opens behind it.
        expect(screen.queryByTestId('map-ink')).not.toBeNull();
        act(() => { clearMapInk(); });
        expect(isMapInkHandoff()).toBe(false);
        expect(screen.queryByTestId('map-ink')).toBeNull();
    });

    it('a covered spread no fight screen lifts clears itself, never stranding the player on black', () => {
        render(<MapInkHost />);
        act(() => { startMapInk({ x: 0, y: 0 }, () => undefined); });
        act(() => { jest.advanceTimersByTime(MAP_INK_SPREAD_MS + 100); });
        expect(currentMapInk()?.covered).toBe(true);
        act(() => { jest.advanceTimersByTime(MAP_INK_HANDOFF_MAX_MS + 10); });
        expect(currentMapInk()).toBeNull();
        expect(screen.queryByTestId('map-ink')).toBeNull();
    });
});
