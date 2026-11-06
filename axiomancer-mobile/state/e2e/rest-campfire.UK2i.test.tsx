/**
 * Hermetic screen test, the black rest screen (Phase UK2i, A9).
 *
 * No eyebrow, no "node is spent" line, a VITAE bar in the purse strip, the
 * campfire frame player mounted between the header and the two choices, a
 * still frame 00 under reduced motion, and the night (ET1c) still plays after
 * a choice.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import RestScreen from '@/app/rest/index';
import { NIGHT_TOTAL_MS } from '@/components/rest/night';
import { CAMPFIRE_05_FRAME_MS, CAMPFIRE_05_FRAMES } from '@/assets/images/screens';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { beginRestAction } from '@/state/rest/store-actions';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => true,
    }),
}));

let mockReduced = false;
jest.mock('@/hooks/useReducedMotion', () => ({
    useReducedMotion: () => mockReduced,
}));

function restStore(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const { player } = store.getState();
    store.setState({
        player: {
            ...player,
            maxHealth: 160,
            health: 90,
            knownCards: ['grey-strike', 'grey-strike', 'grey-strike', 'grey-ward', 'grey-word'],
        },
        flags: [],
    } as never);
    expect(beginRestAction(store, { seed: 7, shelter: 'camp', dream: '[content] A dream.' })).toBe(true);
    return store;
}

function mount(store: AppStore) {
    return render(
        <GameStoreProvider store={store}>
            <RestScreen />
        </GameStoreProvider>,
    );
}

describe('the black rest screen (Phase UK2i)', () => {
    beforeEach(() => {
        mockReduced = false;
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
    });

    it('has no eyebrow and no "node is spent" line', () => {
        const r = mount(restStore());
        expect(r.queryByText(/A MOMENT TO STOP/i)).toBeNull();
        expect(r.queryByText(/node is spent/i)).toBeNull();
        expect(r.queryByTestId('rest-choice-intro-one-way')).toBeNull();
        expect(r.getByTestId('rest-choice-offers')).toBeTruthy();
    });

    it('shows the VITAE bar in the purse strip', () => {
        const r = mount(restStore());
        expect(r.getByTestId('rest-purse')).toBeTruthy();
        expect(r.getByLabelText(/^VITAE: 90 out of 160/)).toBeTruthy();
    });

    it('mounts the frame player and advances a frame every 80 ms, looping', () => {
        const r = mount(restStore());
        expect(r.getByTestId('rest-campfire')).toBeTruthy();
        expect(r.getByTestId('rest-campfire-frame-0')).toBeTruthy();
        act(() => { jest.advanceTimersByTime(CAMPFIRE_05_FRAME_MS * 3); });
        expect(r.getByTestId('rest-campfire-frame-3')).toBeTruthy();
        act(() => { jest.advanceTimersByTime(CAMPFIRE_05_FRAME_MS * (CAMPFIRE_05_FRAMES.length - 3)); });
        expect(r.getByTestId('rest-campfire-frame-0')).toBeTruthy();
    });

    it('holds frame 00 under reduced motion', () => {
        mockReduced = true;
        const r = mount(restStore());
        act(() => { jest.advanceTimersByTime(CAMPFIRE_05_FRAME_MS * 10); });
        expect(r.getByTestId('rest-campfire-frame-0')).toBeTruthy();
    });

    it('still plays the night after a choice', () => {
        const r = mount(restStore());
        fireEvent.press(r.getByTestId('rest-choice-offer-rest'));
        expect(r.getByTestId('rest-night')).toBeTruthy();
        expect(r.queryByTestId('rest-campfire')).toBeNull();
        act(() => { jest.advanceTimersByTime(NIGHT_TOTAL_MS); });
        expect(r.getByTestId('rest-outcome')).toBeTruthy();
    });
});
