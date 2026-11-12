/**
 * The cutscene screen steps through the pages of a long panel.
 *
 * S-09 (`bw-t2`, one panel of 383 characters) is played from the real scene text.
 * No sentence end puts it into two pages of 240 or fewer, so it reads as three:
 * "1 of 3", "2 of 3", "3 of 3". SKIP, the effect and the leave-first rule are
 * unchanged (`cutscene-leaves-first.test.tsx`).
 *
 * Hermetic = self-contained + deterministic + isolated. See docs/testing.md.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { createStartingWorld, type ResolveMapEventResult } from '@mechanics';
import { BW_NODE_SCENES } from '@mechanics/World/MapEvents/content';

const mockBack = jest.fn();

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack, canGoBack: () => true }),
}));
jest.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

import CutsceneScreen, { cutsceneLineSize } from '@/app/cutscene';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { CUTSCENE_PAGE_LIMIT } from '@/state/presenters/cutscene-pages';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const S09 = BW_NODE_SCENES.find((e) => e.nodeId === 'bw-t2')!.scene.before as { scene: string; lines: readonly string[] };

function makeStore(): AppStore {
    const world = createStartingWorld('breakwater');
    const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world } });
    const pending = { state: undefined as never, event: { kind: 'cutscene', lines: S09.lines, scene: S09.scene } as never } as ResolveMapEventResult;
    store.setState({ event: { ...EMPTY_EVENT_SLICE, pending } });
    return store;
}

beforeEach(() => { jest.useFakeTimers(); mockBack.mockReset(); });
afterEach(() => { jest.useRealTimers(); });

describe('S-09, one panel of 383 characters', () => {
    // guard-test: the scene text is unchanged by this chunk; this pins the one-panel, 383-character premise the page test relies on.
    it('is one ledger panel over the page limit', () => {
        expect(S09.lines).toHaveLength(1);
        expect(S09.lines[0].length).toBe(383);
        expect(S09.lines[0].length).toBeGreaterThan(CUTSCENE_PAGE_LIMIT);
    });

    it('reads its pages in order, the counter counting pages, and the last tap ends the scene', () => {
        const store = makeStore();
        const tree = render(
            <GameStoreProvider store={store}>
                <CutsceneScreen />
            </GameStoreProvider>,
        );

        const seen: string[] = [];
        const counts: string[] = [];
        for (let k = 0; k < 3; k++) {
            seen.push(String(React.Children.toArray(tree.getByTestId(`cutscene-line-${k}`).props.children).join('')));
            counts.push(String(React.Children.toArray(tree.getByTestId('cutscene-count').props.children).join('')));
            expect(seen[k].length).toBeLessThanOrEqual(CUTSCENE_PAGE_LIMIT);
            // The screen is still showing the scene until the last tap.
            expect(store.getState().event.pending).not.toBeNull();
            act(() => { fireEvent.press(tree.getByTestId('cutscene-advance')); });
            act(() => { jest.advanceTimersByTime(1000); });
        }

        expect(counts).toEqual(['1 of 3', '2 of 3', '3 of 3']);
        // The pages give the ledger panel back exactly, words and all.
        expect(seen.join(' ')).toBe(S09.lines[0]);
        // The last tap dismissed the scene.
        expect(store.getState().event.pending).toBeNull();
    });

    // guard-test: SKIP already ended a scene before paging; this pins that paging leaves it unchanged.
    it('SKIP still ends the scene from the first page', () => {
        const store = makeStore();
        const tree = render(
            <GameStoreProvider store={store}>
                <CutsceneScreen />
            </GameStoreProvider>,
        );
        act(() => { fireEvent.press(tree.getByTestId('cutscene-skip')); });
        expect(store.getState().event.pending).toBeNull();
    });

    // guard-test: the size function is unchanged; this pins that a shorter page steps up from the whole panel's size.
    it('a page sets at a larger type size than the whole panel did', () => {
        expect(cutsceneLineSize(S09.lines[0].slice(0, 130))).toBeGreaterThan(cutsceneLineSize(S09.lines[0]));
    });
});
