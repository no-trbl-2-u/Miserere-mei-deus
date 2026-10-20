/**
 * The dev-only HAZARD PUZZLES move log on the board (HP2c, A4): three moves
 * timed from the clock start, COPY LOG handing over the JSON, and a
 * production build that renders no log and records nothing.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { HazardBoard } from '@/components/hazard/HazardBoard';
import { DICE_ROLL_OVERLAY_MS } from '@/components/hazard/HazardOverlays';
import { HazardPuzzleDemo } from '@/components/hazard/puzzle/HazardPuzzleDemo';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { withAllProviders } from '@/test-utils/withAllProviders';

jest.mock('@/lib/buildProfile', () => ({
    ...(jest.requireActual('@/lib/buildProfile') as object),
    isDevToolsEnabled: jest.fn(() => true),
}));

// The live board's gestures, as the board's own tests mock them.
jest.mock('react-native-gesture-handler', () => {
    const chainable = () => {
        const gesture: Record<string, unknown> = {};
        for (const method of ['minDistance', 'maxDistance', 'enabled', 'onStart', 'onUpdate', 'onEnd', 'onFinalize']) {
            gesture[method] = () => gesture;
        }
        return gesture;
    };
    return {
        Gesture: { Pan: chainable, Tap: chainable, Exclusive: (...gestures: unknown[]) => gestures[0] },
        GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    };
});

const devTools = isDevToolsEnabled as unknown as jest.Mock<() => boolean>;

interface LoggedMove {
    n: number;
    kind: string;
    uid: string;
    dieId?: string;
    ms: number;
}

interface LoggedAttempt {
    layoutId: string;
    route: string;
    solver: string;
    startedAt: string;
    clockSeconds: number;
    moves: LoggedMove[];
    end: { kind: string; ms: number; cleared: boolean; reachedPercent: number } | null;
}

let copied: string[] = [];

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.parse('2026-10-19T10:00:00.000Z'));
    globalThis.__AXM_HAZARD_SEED__ = 11;
    devTools.mockReturnValue(true);
    copied = [];
    // The web clipboard the COPY LOG control reaches through `copyText`.
    (globalThis as { navigator?: unknown }).navigator = {
        clipboard: {
            writeText: (text: string) => {
                copied.push(text);
                return Promise.resolve();
            },
        },
    };
});

afterEach(() => {
    jest.useRealTimers();
    delete (globalThis as { __AXM_HAZARD_SEED__?: number }).__AXM_HAZARD_SEED__;
    delete (globalThis as { navigator?: unknown }).navigator;
});

/** The live board's props as the puzzle mounted them. */
function boardProps(screen: ReturnType<typeof render>) {
    const inner = (HazardBoard as unknown as { type: React.ComponentType<unknown> }).type;
    return screen.UNSAFE_getByType(inner).props as React.ComponentProps<typeof HazardBoard>;
}

/** Plays the opening roll out, so the board is live and the clock runs. */
function settleRoll() {
    act(() => {
        jest.advanceTimersByTime(DICE_ROLL_OVERLAY_MS);
    });
}

/** Opens the hard demo on the risk route and plays the opening roll out. */
function openHardRisk() {
    const { tree } = withAllProviders(<HazardPuzzleDemo />);
    const screen = render(tree);
    fireEvent.press(screen.getByTestId('hazard-puzzle-pick-demo-undercroft-hard'));
    fireEvent.press(screen.getByTestId('hazard-route-risk'));
    settleRoll();
    return screen;
}

/** Presses COPY LOG and reads back what the clipboard took. */
async function copyLog(screen: ReturnType<typeof render>): Promise<LoggedAttempt[]> {
    fireEvent.press(screen.getByTestId('hazard-puzzle-log-copy'));
    await act(async () => {
        await Promise.resolve();
    });
    expect(copied).toHaveLength(1);
    return (JSON.parse(copied[0]) as { attempts: LoggedAttempt[] }).attempts;
}

describe('the dev-only puzzle move log (A4)', () => {
    it('logs three moves with milliseconds from the clock start, and COPY LOG hands over the JSON', async () => {
        const screen = openHardRisk();
        const firstStart = Date.now();
        // The first board is abandoned by letting its clock run out, then the
        // real timed solve is played on a second board.
        act(() => {
            jest.advanceTimersByTime(60_000);
        });
        fireEvent.press(screen.getByTestId('hazard-puzzle-done'));
        fireEvent.changeText(screen.getByTestId('hazard-puzzle-log-solver'), 'T');
        fireEvent.press(screen.getByTestId('hazard-puzzle-pick-demo-undercroft-hard'));
        fireEvent.press(screen.getByTestId('hazard-route-risk'));
        settleRoll();
        const startedAt = new Date(Date.now()).toISOString();
        // Three moves, each a second apart.
        act(() => {
            jest.advanceTimersByTime(1_000);
        });
        act(() => boardProps(screen).onStage('c1'));
        act(() => {
            jest.advanceTimersByTime(1_000);
        });
        act(() => boardProps(screen).onPower('c1', 'd4'));
        act(() => {
            jest.advanceTimersByTime(1_000);
        });
        act(() => boardProps(screen).onApply('c1'));
        // CONFIRM ends the attempt; DONE returns to the list, where the log lives.
        act(() => {
            jest.advanceTimersByTime(2_000);
        });
        fireEvent.press(screen.getByTestId('hazard-play-button'));
        fireEvent.press(screen.getByTestId('hazard-puzzle-done'));

        const attempts = await copyLog(screen);
        expect(attempts).toHaveLength(2);
        const attempt = attempts[1];
        expect(attempt).toMatchObject({
            layoutId: 'demo-undercroft-hard',
            route: 'risk',
            solver: 'T',
            startedAt,
            clockSeconds: 60,
        });
        expect(attempt.moves).toEqual([
            { n: 1, kind: 'stage', uid: 'c1', ms: 1_000 },
            { n: 2, kind: 'power', uid: 'c1', dieId: 'd4', ms: 2_000 },
            { n: 3, kind: 'apply', uid: 'c1', ms: 3_000 },
        ]);
        expect(attempt.end).toMatchObject({ kind: 'confirm', ms: 5_000, cleared: false });
        // The clock start is the roll settling, not the mount: the overlay's
        // own duration is never charged to the solve.
        expect(Date.parse(attempt.startedAt)).toBe(firstStart + 60_000 + DICE_ROLL_OVERLAY_MS);
        // The panel names the solve time it derived, and the name typed between
        // the two boards labels both attempts.
        expect(screen.getByTestId('hazard-puzzle-log-attempt-1').props.children).toBe(
            'demo-undercroft-hard · risk · 3 moves · 5 s · short',
        );
        expect(attempts[0].solver).toBe('T');
        expect(screen.getByTestId('hazard-puzzle-log-feedback').props.children).toBe('copied as JSON');
    });

    it('records the clock running out as the end of the attempt', async () => {
        const screen = openHardRisk();
        act(() => boardProps(screen).onStage('c1'));
        act(() => {
            jest.advanceTimersByTime(60_000);
        });
        fireEvent.press(screen.getByTestId('hazard-puzzle-done'));
        const attempts = await copyLog(screen);
        expect(attempts).toHaveLength(1);
        expect(attempts[0].end).toMatchObject({ kind: 'expiry', cleared: false });
        expect(attempts[0].moves).toHaveLength(1);
    });

    it('CLEAR empties the log', async () => {
        const screen = openHardRisk();
        act(() => boardProps(screen).onStage('c1'));
        fireEvent.press(screen.getByTestId('hazard-play-button'));
        fireEvent.press(screen.getByTestId('hazard-puzzle-done'));
        expect(screen.getByTestId('hazard-puzzle-log-attempt-0')).toBeTruthy();
        fireEvent.press(screen.getByTestId('hazard-puzzle-log-clear'));
        expect(screen.queryByTestId('hazard-puzzle-log-attempt-0')).toBeNull();
        expect(await copyLog(screen)).toEqual([]);
    });

    it('a production build renders no log and records nothing', () => {
        devTools.mockReturnValue(false);
        const { tree } = withAllProviders(<HazardPuzzleDemo />);
        const screen = render(tree);
        expect(screen.queryByTestId('hazard-puzzle-log')).toBeNull();
        expect(screen.queryByTestId('hazard-puzzle-log-copy')).toBeNull();
        // The board still plays; nothing is recorded and nothing to copy appears.
        fireEvent.press(screen.getByTestId('hazard-puzzle-pick-demo-undercroft-hard'));
        fireEvent.press(screen.getByTestId('hazard-route-risk'));
        settleRoll();
        act(() => boardProps(screen).onStage('c1'));
        fireEvent.press(screen.getByTestId('hazard-play-button'));
        fireEvent.press(screen.getByTestId('hazard-puzzle-done'));
        expect(screen.queryByTestId('hazard-puzzle-log')).toBeNull();
        expect(copied).toEqual([]);
    });
});
