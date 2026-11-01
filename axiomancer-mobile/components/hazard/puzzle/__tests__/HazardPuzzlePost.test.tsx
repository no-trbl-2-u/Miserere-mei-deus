/**
 * The puzzle board posts each ended attempt once (phase BE1c, A3): one call
 * per attempt that reaches an end, none again when the solver is renamed
 * after the solve, a candidate's intended band on its post, and no call at
 * all in a production build or a build without the API URL and token.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DICE_ROLL_OVERLAY_MS } from '@/components/hazard/HazardOverlays';
import { HazardPuzzleDemo } from '@/components/hazard/puzzle/HazardPuzzleDemo';
import { createNewGameState, type GameState } from '@mechanics';

import { isDevToolsEnabled } from '@/lib/buildProfile';
import { hydrateStoreWithGameState } from '@/state/menu/store-actions';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
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

type FetchMock = jest.Mock<(url: string, init: { body: string }) => Promise<{ ok: boolean; status: number }>>;
let fetchMock: FetchMock;
const realFetch = globalThis.fetch;

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.parse('2026-10-21T10:00:00.000Z'));
    globalThis.__AXM_HAZARD_SEED__ = 11;
    devTools.mockReturnValue(true);
    process.env.EXPO_PUBLIC_PUZZLE_API_URL = 'https://miserere-api.example.workers.dev';
    process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN = 'dev-token';
    fetchMock = jest.fn(async () => ({ ok: true, status: 201 })) as FetchMock;
    (globalThis as { fetch: unknown }).fetch = fetchMock;
});

afterEach(() => {
    jest.useRealTimers();
    delete (globalThis as { __AXM_HAZARD_SEED__?: number }).__AXM_HAZARD_SEED__;
    delete process.env.EXPO_PUBLIC_PUZZLE_API_URL;
    delete process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN;
    globalThis.fetch = realFetch;
});

function settleRoll() {
    act(() => {
        jest.advanceTimersByTime(DICE_ROLL_OVERLAY_MS);
    });
}

/** Plays the hard demo on the risk route to a CONFIRM and returns to the list. */
function solveHardRisk(screen: ReturnType<typeof render>) {
    fireEvent.press(screen.getByTestId('hazard-puzzle-pick-demo-undercroft-hard'));
    fireEvent.press(screen.getByTestId('hazard-route-risk'));
    settleRoll();
    act(() => {
        jest.advanceTimersByTime(2_000);
    });
    fireEvent.press(screen.getByTestId('hazard-play-button'));
    fireEvent.press(screen.getByTestId('hazard-puzzle-done'));
}

function postedBodies(): Record<string, unknown>[] {
    return fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body) as Record<string, unknown>);
}

function mount() {
    const { tree } = withAllProviders(<HazardPuzzleDemo />);
    return render(tree);
}

describe('posting ended attempts (A3)', () => {
    it('posts each ended attempt exactly once, and a late solver rename posts nothing new', () => {
        const screen = mount();
        fireEvent.changeText(screen.getByTestId('hazard-puzzle-log-solver'), 'T');
        solveHardRisk(screen);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe('https://miserere-api.example.workers.dev/v1/puzzle-attempts');
        expect(postedBodies()[0]).toMatchObject({
            solver: 'T',
            layoutId: 'demo-undercroft-hard',
            route: 'risk',
            intendedBand: null,
            endKind: 'confirm',
            endMs: 2_000,
        });

        fireEvent.changeText(screen.getByTestId('hazard-puzzle-log-solver'), 'T2');
        expect(fetchMock).toHaveBeenCalledTimes(1);

        solveHardRisk(screen);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(postedBodies()[1]).toMatchObject({ solver: 'T2', layoutId: 'demo-undercroft-hard' });
    });

    it('an attempt still being played posts nothing; its expiry posts it', () => {
        const screen = mount();
        fireEvent.press(screen.getByTestId('hazard-puzzle-pick-demo-undercroft-hard'));
        fireEvent.press(screen.getByTestId('hazard-route-risk'));
        settleRoll();
        expect(fetchMock).not.toHaveBeenCalled();
        act(() => {
            jest.advanceTimersByTime(60_000);
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(postedBodies()[0]).toMatchObject({ endKind: 'expiry', cleared: false });
    });

    it('a candidate posts its intended band', () => {
        const screen = mount();
        fireEvent.press(screen.getByTestId('hazard-puzzle-candidate-cand-hard-01'));
        settleRoll();
        fireEvent.press(screen.getByTestId('hazard-play-button'));
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(postedBodies()[0]).toMatchObject({ layoutId: 'cand-hard-01', intendedBand: 'hard', route: 'risk' });
    });

    it('an attempt from the title screen carries no run id and posts as the harness (SM1b)', () => {
        const screen = mount();
        solveHardRisk(screen);
        expect(postedBodies()[0]).toMatchObject({ source: 'harness', runId: null });
    });

    it('an attempt made inside a run carries the save run id, and the human stamp when the build has it (SM1b)', () => {
        process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE = 'human';
        try {
            const store = createAppStore({ adapter: createMemoryAdapter() });
            hydrateStoreWithGameState(store, createNewGameState({ characterId: 'the-chosen' }));
            const runId = (store.getState() as unknown as GameState).runId;
            const { tree } = withAllProviders(<HazardPuzzleDemo />, { store });
            solveHardRisk(render(tree));
            expect(postedBodies()[0]).toMatchObject({ source: 'human', runId });
            expect(runId.length).toBeGreaterThan(0);
        } finally {
            delete process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE;
        }
    });

    it('a production build makes no network call', () => {
        devTools.mockReturnValue(false);
        const screen = mount();
        solveHardRisk(screen);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('a build without the API URL or token makes no network call', () => {
        delete process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN;
        const screen = mount();
        solveHardRisk(screen);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
