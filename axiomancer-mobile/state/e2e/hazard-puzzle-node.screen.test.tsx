/**
 * Hermetic E2E Tests — the `/hazard` screen at a puzzle hazard node (phase
 * HP6c, A6, A7). The wreck (`bw-h4`) opens on the stakes card with its one
 * goal (no routes line), then the puzzle board with no route select; CONFIRM
 * resolves and claims the round, the outcome panel shows, and its button
 * closes the board and takes the player back to the map. The clock running
 * out confirms the board as it stands. A Charcoal Wood hazard still opens on
 * the three-round route select.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
    BREAKWATER_HAZARD_PUZZLES,
    createStartingWorld,
    getHazardPuzzleCandidate,
    syncMoveLists,
    type WorldState,
} from '@mechanics';

import HazardScreen from '@/app/hazard/index';
import { HazardBoard } from '@/components/hazard/HazardBoard';
import { DICE_ROLL_OVERLAY_MS } from '@/components/hazard/HazardOverlays';
import { HAZARD_PUZZLE_TICK_MS } from '@/components/hazard/puzzle/useHazardPuzzleClock';
import { createAppActions } from '@/state/actions';
import { hazardPuzzleClockFor } from '@/state/presenters/hazard-puzzle.engine';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { settledBreakwater } from '@/test-utils/settledBreakwater';
import { withAllProviders } from '@/test-utils/withAllProviders';

const mockBack = jest.fn();
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        back: mockBack,
        push: jest.fn(),
        replace: jest.fn(),
        canGoBack: () => true,
    }),
}));

// The live board's gestures, as its own test mocks them; moves go through its callbacks.
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

beforeEach(() => {
    jest.useFakeTimers();
    globalThis.__AXM_HAZARD_SEED__ = 11;
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    delete (globalThis as { __AXM_HAZARD_SEED__?: number }).__AXM_HAZARD_SEED__;
});

function mountOn(world: WorldState) {
    const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world } });
    const p = store.getState().player;
    store.setState({ player: { ...p, health: 40, maxHealth: 40 } } as never);
    const { tree } = withAllProviders(<HazardScreen />, { store });
    render(tree);
    return { store, actions: createAppActions(store) };
}

function boardProps() {
    // `HazardBoard` is memoised; the rendered node is the wrapped function.
    const inner = (HazardBoard as unknown as { type: React.ComponentType<unknown> }).type;
    return screen.UNSAFE_getByType(inner).props as React.ComponentProps<typeof HazardBoard>;
}

function openWreck() {
    const mounted = mountOn(settledBreakwater('bw-h4'));
    act(() => {
        mounted.actions.beginHazard();
    });
    return mounted;
}

describe('hazard screen — a puzzle node (the wreck)', () => {
    it('opens on the stakes card with the one goal and no routes', () => {
        openWreck();
        expect(screen.getByTestId('hazard-stakes')).toBeTruthy();
        expect(screen.getByTestId('hazard-stakes-place').props.children).toBe('The wreck');
        expect(screen.getByTestId('hazard-stakes-goal')).toBeTruthy();
        expect(screen.queryByTestId('hazard-stakes-routes')).toBeNull();
        expect(screen.getByTestId('hazard-stakes-opens')).toBeTruthy();
        const candidate = getHazardPuzzleCandidate(BREAKWATER_HAZARD_PUZZLES['bw-h4']!);
        const seconds = hazardPuzzleClockFor(candidate, candidate.route);
        expect(screen.getByText(`${seconds} seconds on the clock`)).toBeTruthy();
    });

    it('Face it opens the puzzle board with no route select; CONFIRM claims; the outcome closes back to the map', () => {
        const { store } = openWreck();
        fireEvent.press(screen.getByTestId('hazard-stakes-face'));
        expect(screen.getByTestId('hazard-puzzle-node')).toBeTruthy();
        expect(screen.queryByTestId('hazard-route-select')).toBeNull();
        expect(screen.queryByTestId('hazard-route-safe')).toBeNull();
        // The opening roll plays first, then the board is live.
        expect(screen.getByTestId('hazard-dice-roll')).toBeTruthy();
        act(() => {
            jest.advanceTimersByTime(DICE_ROLL_OVERLAY_MS);
        });
        expect(screen.queryByTestId('hazard-dice-roll')).toBeNull();

        const xpBefore = store.getState().player.experience;
        act(() => {
            boardProps().onResolve();
        });
        expect(store.getState().hazard.puzzle?.claim).toBeTruthy();
        expect(store.getState().player.experience).toBeGreaterThan(xpBefore);
        expect(screen.getByTestId('hazard-puzzle-outcome')).toBeTruthy();

        fireEvent.press(screen.getByTestId('hazard-puzzle-done'));
        expect(store.getState().hazard.puzzle).toBeNull();
        expect(mockBack).toHaveBeenCalled();
    });

    it('the clock running out confirms the board as it stands', () => {
        const { store } = openWreck();
        fireEvent.press(screen.getByTestId('hazard-stakes-face'));
        act(() => {
            jest.advanceTimersByTime(DICE_ROLL_OVERLAY_MS);
        });
        const candidate = getHazardPuzzleCandidate(BREAKWATER_HAZARD_PUZZLES['bw-h4']!);
        const seconds = hazardPuzzleClockFor(candidate, candidate.route);
        for (let i = 0; i <= seconds; i++) {
            act(() => {
                jest.advanceTimersByTime(HAZARD_PUZZLE_TICK_MS);
            });
        }
        expect(store.getState().hazard.puzzle?.timedOut).toBe(true);
        expect(screen.getByTestId('hazard-puzzle-outcome')).toBeTruthy();
    });
});

describe('hazard screen — a Charcoal Wood hazard', () => {
    it('still opens on the three-round route select', () => {
        const world = createStartingWorld('charcoal-wood');
        const { store, actions } = mountOn({ ...world, currentMap: syncMoveLists({ ...world.currentMap, currentNode: 'cw-3' }) });
        act(() => {
            actions.beginHazard();
        });
        expect(store.getState().hazard.puzzle ?? null).toBeNull();
        expect(screen.getByTestId('hazard-stakes-routes')).toBeTruthy();
        fireEvent.press(screen.getByTestId('hazard-stakes-face'));
        expect(screen.getByTestId('hazard-route-select')).toBeTruthy();
        expect(screen.queryByTestId('hazard-puzzle-node')).toBeNull();
    });
});
