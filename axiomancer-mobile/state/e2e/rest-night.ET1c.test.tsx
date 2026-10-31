/**
 * Hermetic screen test, the rest's night (Phase ET1c, A8, A9).
 *
 * After the pick the screen runs dusk, night, dawn with the node's dream
 * line, then shows the outcome with "Move on". The dawn reads "+N VITAE"
 * after a rest and "<card> upgraded" after an upgrade. In instant mode
 * (reduced motion, the e2e flag) the night is skipped and the dawn lands at
 * once.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { getCardById } from '@mechanics';

import RestScreen from '@/app/rest/index';
import { NIGHT_TOTAL_MS, nightStageAt } from '@/components/rest/night';
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

type Flagged = typeof globalThis & { __AXM_JUICE_INSTANT__?: unknown };

const DREAM = '[content] A dream of the West cliff road.';

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
    expect(beginRestAction(store, { seed: 7, shelter: 'camp', dream: DREAM })).toBe(true);
    return store;
}

function mount(store: AppStore) {
    return render(
        <GameStoreProvider store={store}>
            <RestScreen />
        </GameStoreProvider>,
    );
}

describe('the night passes (Phase ET1c)', () => {
    beforeEach(() => {
        delete (globalThis as Flagged).__AXM_JUICE_INSTANT__;
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
        delete (globalThis as Flagged).__AXM_JUICE_INSTANT__;
    });

    it('splits the two seconds into dusk, night, dawn', () => {
        expect(nightStageAt(0)).toBe('dusk');
        expect(nightStageAt(700)).toBe('night');
        expect(nightStageAt(NIGHT_TOTAL_MS - 1)).toBe('dawn');
        expect(nightStageAt(NIGHT_TOTAL_MS)).toBeNull();
        expect(NIGHT_TOTAL_MS).toBeLessThanOrEqual(2200);
    });

    it('rest: dusk, night with the dream line, then the dawn shows +N VITAE and Move on', () => {
        const r = mount(restStore());
        fireEvent.press(r.getByTestId('rest-choice-offer-rest'));

        expect(r.getByTestId('rest-night-dusk')).toBeTruthy();
        expect(r.queryByTestId('rest-outcome')).toBeNull();

        act(() => { jest.advanceTimersByTime(800); });
        expect(r.getByTestId('rest-night-night')).toBeTruthy();
        expect(r.getByTestId('rest-night-dream')).toHaveTextContent(DREAM);

        act(() => { jest.advanceTimersByTime(NIGHT_TOTAL_MS); });
        expect(r.queryByTestId('rest-night')).toBeNull();
        expect(r.getByTestId('rest-outcome')).toBeTruthy();
        expect(r.getByText(/^\+\d+ VITAE$/)).toBeTruthy();
        expect(r.getByTestId('rest-claim')).toBeTruthy();
    });

    it('upgrade: the dawn says "<card> upgraded" and shows no VITAE chip', () => {
        const r = mount(restStore());
        fireEvent.press(r.getByTestId('rest-choice-offer-upgrade'));
        fireEvent.press(r.getByTestId('card-upgrade-row-grey-strike'));
        fireEvent.press(r.getByTestId('card-upgrade-confirm'));

        expect(r.getByTestId('rest-night')).toBeTruthy();
        act(() => { jest.advanceTimersByTime(NIGHT_TOTAL_MS); });
        expect(r.getByTestId('rest-outcome-upgraded')).toHaveTextContent(`${getCardById('grey-strike')!.name} upgraded`);
        expect(r.queryByText(/^\+\d+ VITAE$/)).toBeNull();
    });

    it('a tap skips the night to the dawn', () => {
        const r = mount(restStore());
        fireEvent.press(r.getByTestId('rest-choice-offer-rest'));
        fireEvent.press(r.getByTestId('rest-night'));
        expect(r.getByTestId('rest-outcome')).toBeTruthy();
    });

    it('instant mode (reduced motion, the e2e flag) lands the dawn at once', () => {
        (globalThis as Flagged).__AXM_JUICE_INSTANT__ = true;
        const r = mount(restStore());
        fireEvent.press(r.getByTestId('rest-choice-offer-rest'));
        expect(r.queryByTestId('rest-night')).toBeNull();
        expect(r.getByTestId('rest-outcome')).toBeTruthy();
    });

    it('a screen that mounts already settled opens on the dawn', () => {
        const store = restStore();
        // Settle before the second screen mounts, as a resume would.
        const first = mount(store);
        fireEvent.press(first.getByTestId('rest-choice-offer-rest'));
        first.unmount();
        const r = mount(store);
        expect(r.queryByTestId('rest-night')).toBeNull();
        expect(r.getByTestId('rest-outcome')).toBeTruthy();
    });
});
