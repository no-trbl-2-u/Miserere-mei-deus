/**
 * S4-world-C17 / CU1b - the cutscene's SKIP is a control, and the taps tell the story.
 *
 * SKIP wears the brass action plate with a 44pt minimum box and dismisses the
 * scene at once. A tap anywhere else steps through the beats ("1 of 3", "2 of 3",
 * ...), the last tap ends the scene, and no CONTINUE or hint text renders.
 *
 * Hermetic = self-contained + deterministic + isolated. See docs/testing.md.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import type { ResolveMapEventResult } from '@mechanics';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
}));
jest.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

import CutsceneScreen, { cutsceneLineSize, LINE_SIZE, LINE_SIZE_FLOOR } from '@/app/cutscene';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

/** The platform's minimum comfortable touch target, in points. */
const MIN_TOUCH_TARGET = 44;

const LINES = [
    'The tide goes out and does not come back.',
    'Something on the shingle is still breathing.',
    'It knows your name already.',
] as const;

function cutscene(): ResolveMapEventResult {
    return { state: undefined as never, event: { kind: 'cutscene', lines: LINES, scene: 'windmill-headland' } };
}

function makeStore(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    store.setState({ event: { ...EMPTY_EVENT_SLICE, pending: cutscene() } });
    return store;
}

function mount(store: AppStore) {
    return render(
        <GameStoreProvider store={store}>
            <CutsceneScreen />
        </GameStoreProvider>,
    );
}

describe('S4-world-C17: SKIP is a button, and a hittable one', () => {
    it('announces itself as a button with a spoken label', () => {
        const skip = mount(makeStore()).getByTestId('cutscene-skip');
        expect(skip.props.accessibilityRole).toBe('button');
        expect(skip.props.accessibilityLabel).toBe('Skip the scene');
    });

    it('reserves a box at least 44pt on its short edge', () => {
        const tree = mount(makeStore());
        const style = StyleSheet.flatten(tree.getByTestId('cutscene-skip').props.style) as {
            minHeight?: number;
            minWidth?: number;
        };
        expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
        expect(style.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });

    it('still does its job: one press abandons the whole scene', () => {
        const store = makeStore();
        const tree = mount(store);
        expect(tree.getByTestId('cutscene-line-0')).toBeTruthy();

        act(() => {
            fireEvent.press(tree.getByTestId('cutscene-skip'));
        });

        expect(store.getState().event.pending).toBeNull();
        expect(tree.queryByTestId('cutscene-advance')).toBeNull();
        expect(tree.getByTestId('cutscene-inactive')).toBeTruthy();
    });
});

/** A tap anywhere, then the fade-out's timers run so the cursor moves. */
function tap(tree: ReturnType<typeof mount>) {
    act(() => { fireEvent.press(tree.getByTestId('cutscene-advance')); });
    act(() => { jest.advanceTimersByTime(1000); });
}

describe('CU1b: a tap anywhere tells the story on', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    it('steps through the beats with the count, and the last tap ends the scene', () => {
        const store = makeStore();
        const tree = mount(store);

        expect(tree.getByTestId('cutscene-count').props.children).toBe('1 of 3');
        expect(tree.getByText(LINES[0])).toBeTruthy();

        tap(tree);
        expect(tree.getByTestId('cutscene-count').props.children).toBe('2 of 3');
        expect(tree.getByText(LINES[1])).toBeTruthy();

        tap(tree);
        expect(tree.getByTestId('cutscene-count').props.children).toBe('3 of 3');
        expect(store.getState().event.pending).not.toBeNull();

        tap(tree);
        expect(store.getState().event.pending).toBeNull();
    });

    it('draws the chapter, the panel and the narrator, and no CONTINUE or hint', () => {
        const tree = mount(makeStore());
        expect(tree.getByText('THE BREAKWATER')).toBeTruthy();
        expect(tree.getByTestId('cutscene-panel')).toBeTruthy();
        expect(tree.getByTestId('cutscene-narrator')).toBeTruthy();
        expect(tree.queryByText(/continue|walk on|OMEN/i)).toBeNull();
    });

    it('steps a long line down to the 20pt floor and no further', () => {
        expect(cutsceneLineSize('Short.')).toBe(LINE_SIZE);
        expect(cutsceneLineSize('x'.repeat(130))).toBeLessThan(LINE_SIZE);
        expect(cutsceneLineSize('x'.repeat(400))).toBe(LINE_SIZE_FLOOR);
    });
});
