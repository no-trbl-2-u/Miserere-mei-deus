/**
 * S4-world-C17 — the cutscene's SKIP must read as a control, not a caption.
 *
 * A small bare SKIP label reads as chrome and is easy to miss: `padding: 8`
 * around a four-glyph mono label is well under a thumb. SKIP is a bordered
 * plate with a 44pt minimum box.
 *
 * The suite pins the two things the finding is actually about — that the
 * control is announced and reachable as a button, and that its box clears the
 * 44pt touch minimum — plus the behaviour it exists for (one press reveals the
 * whole omen and the SKIP retires).
 *
 * Hermetic = self-contained + deterministic + isolated. See docs/testing.md.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import type { ResolveMapEventResult } from '@mechanics';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
}));

import CutsceneScreen from '@/app/cutscene';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { CUTSCENE_HINT } from '@/state/presenters/event.engine';
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
    return { state: undefined as never, event: { kind: 'cutscene', lines: LINES } };
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
        const tree = mount(makeStore());
        const skip = tree.getByTestId('cutscene-skip');

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

    it('wears chrome that says pressable — a border and a filled plate', () => {
        const tree = mount(makeStore());
        const style = StyleSheet.flatten(tree.getByTestId('cutscene-skip').props.style) as {
            borderWidth?: number;
            backgroundColor?: string;
        };

        expect(style.borderWidth).toBeGreaterThan(0);
        expect(style.backgroundColor).toBeTruthy();
    });

    // With the fade-through presentation (one line on
    // screen at a time) there is no "reveal everything" state to jump to, so
    // SKIP abandons the scene outright — it dismisses the pending event, which
    // empties the store slice and drops the screen to its inactive shell.
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

// Critique pass 93: the plate runs under a mouse on web too, so the hint under
// the line comes from the presenter and names no touch gesture.
describe('the cutscene hint is presenter copy, pointer-neutral', () => {
    it('shows the presenter hint under a line with more to follow', () => {
        const tree = mount(makeStore());

        expect(tree.getByText(CUTSCENE_HINT.next)).toBeTruthy();
    });

    it('names no gesture in either hint', () => {
        for (const hint of Object.values(CUTSCENE_HINT)) {
            expect(hint).not.toMatch(/\b(tap|click)\b/i);
        }
    });
});
