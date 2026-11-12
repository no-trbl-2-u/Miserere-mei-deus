/**
 * Hermetic screen test - the quest card fits a small phone.
 *
 * The lighthouse when paid (fixture `wanderer-bw-lighthouse-paid`: the turn-in
 * line and the offer line, the relic banner) is the tallest card. Jest cannot
 * measure layout, so this pins what the fit rests on: LEAVE and ACCEPT live in
 * the column's scroll container (reached by scrolling, ACCEPT pressable), the
 * relic banner sits beside the card and not inside it, and a cue shows while
 * the column hides more below. The 360x740 reach is proved in the PR's shots.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import QuestScreen, { hasMoreBelow } from '@/app/quest/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { selectQuestVM } from '@/state/presenters/quest.engine';
import { arriveFromFixture, createFixtureStore } from '@/test-utils/fixtureStore';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

function openLighthouse() {
    const handle = createFixtureStore('wanderer-bw-lighthouse-paid');
    expect(arriveFromFixture(handle)).toBe(true);
    render(
        <GameStoreProvider store={handle.store}>
            <QuestScreen />
        </GameStoreProvider>,
    );
    return handle;
}

/** True when `node` has an ancestor with `testID`. */
function within(node: { parent: unknown; props: { testID?: string } } | null, testID: string): boolean {
    for (let n = node as { parent: unknown; props: { testID?: string } } | null; n; n = n.parent as typeof n) {
        if (n.props?.testID === testID) return true;
    }
    return false;
}

describe('/quest - the paid lighthouse card on a small phone', () => {
    it('keeps LEAVE and ACCEPT inside the scrolling column, and ACCEPT presses', () => {
        const { store } = openLighthouse();
        expect(screen.getByTestId('quest-giver-line')).toBeTruthy();
        expect(within(screen.getByTestId('quest-leave-button'), 'quest-scroll')).toBe(true);
        expect(within(screen.getByTestId('quest-accept-button'), 'quest-scroll')).toBe(true);
        expect(selectQuestVM(store.getState()).canAccept).toBe(true);
        fireEvent.press(screen.getByTestId('quest-accept-button'));
        expect(selectQuestVM(store.getState()).canAccept).toBe(false);
    });

    it('seats the relic banner outside the card, so it covers none of its rows', () => {
        openLighthouse();
        const relic = screen.getByTestId('quest-relic-rise');
        expect(within(relic, 'quest-offer')).toBe(false);
        expect(within(relic, 'quest-scroll')).toBe(true);
    });

    it('shows a cue while more column lies below, and drops it at the foot', () => {
        openLighthouse();
        const scroll = screen.getByTestId('quest-scroll');
        expect(screen.queryByTestId('quest-scroll-cue')).toBeNull();
        act(() => {
            fireEvent(scroll, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 740 } } });
            fireEvent(scroll, 'contentSizeChange', 360, 1000);
        });
        expect(screen.getByTestId('quest-scroll-cue')).toBeTruthy();
        act(() => {
            fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { x: 0, y: 260 } } });
        });
        expect(screen.queryByTestId('quest-scroll-cue')).toBeNull();
    });
});

describe('hasMoreBelow', () => {
    it('is false before a layout, when the column fits, and near the foot', () => {
        expect(hasMoreBelow(0, 1000, 0)).toBe(false);
        expect(hasMoreBelow(740, 700, 0)).toBe(false);
        expect(hasMoreBelow(740, 1000, 258)).toBe(false);
    });
    it('is true while more than a few points hide below', () => {
        expect(hasMoreBelow(740, 1000, 0)).toBe(true);
        expect(hasMoreBelow(740, 1000, 200)).toBe(true);
    });
});
