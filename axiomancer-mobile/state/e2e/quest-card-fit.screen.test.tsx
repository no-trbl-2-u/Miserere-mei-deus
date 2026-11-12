/**
 * Hermetic screen test - the quest card fits a small phone.
 *
 * The lighthouse when paid (fixture `wanderer-bw-lighthouse-paid`: the turn-in
 * line and the offer line, the relic banner) is the tallest card. Jest cannot
 * measure layout, so this pins what the fit rests on: LEAVE and ACCEPT live in
 * the column's scroll container (reached by scrolling, ACCEPT pressable), the
 * relic banner sits beside the card and not inside it, the card's size comes
 * from the screen alone, and the cue shows only while the buttons lie wholly
 * below the fold, so it never sits over one. The 360x740 reach is proved in
 * the PR's shots.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import QuestScreen, { buttonsBelowFold, cardSizeFor } from '@/app/quest/index';
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

/** Lay the screen out: the scroll area `w` x `h`, its column `content` tall, the button row `buttons` tall. */
function layOut(w: number, h: number, content: number, buttons = 56) {
    act(() => {
        fireEvent(screen.getByTestId('quest-scroll'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: w, height: h } } });
        fireEvent(screen.getByTestId('quest-scroll'), 'contentSizeChange', w, content);
        fireEvent(screen.getByTestId('quest-buttons'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: w, height: buttons } } });
    });
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

    it('sizes the card from the screen, whatever the column under it measures', () => {
        openLighthouse();
        const cardSize = () => StyleSheet.flatten(screen.getByTestId('quest-offer').props.style);
        layOut(360, 740, 900);
        const first = cardSize();
        expect(first).toMatchObject(cardSizeFor(360, 740));
        layOut(360, 740, 1300);
        expect(cardSize()).toEqual(first);
        layOut(390, 844, 1000);
        expect(cardSize()).toMatchObject(cardSizeFor(390, 844));
    });

    it('shows the cue while the buttons lie below the fold, and drops it once they are in view', () => {
        openLighthouse();
        expect(screen.queryByTestId('quest-scroll-cue')).toBeNull();
        layOut(360, 740, 1000);
        expect(screen.getByTestId('quest-scroll-cue')).toBeTruthy();
        act(() => {
            fireEvent.scroll(screen.getByTestId('quest-scroll'), { nativeEvent: { contentOffset: { x: 0, y: 260 } } });
        });
        expect(screen.queryByTestId('quest-scroll-cue')).toBeNull();
    });

    it('shows no cue when the column overflows a little and the buttons are on screen', () => {
        openLighthouse();
        layOut(390, 844, 864);
        expect(screen.queryByTestId('quest-scroll-cue')).toBeNull();
    });
});

describe('buttonsBelowFold', () => {
    it('is false before a layout and when the column fits', () => {
        expect(buttonsBelowFold(0, 1000, 0, 56)).toBe(false);
        expect(buttonsBelowFold(740, 0, 0, 56)).toBe(false);
        expect(buttonsBelowFold(740, 1000, 0, 0)).toBe(false);
        expect(buttonsBelowFold(740, 700, 0, 56)).toBe(false);
    });
    it('is true only while the whole button row lies past the foot', () => {
        expect(buttonsBelowFold(740, 1000, 0, 56)).toBe(true);
        // The row's top is at 926; scrolled 187 it sits at 739, inside the 740 view.
        expect(buttonsBelowFold(740, 1000, 187, 56)).toBe(false);
        // Cut off by a few points only: the row is partly in view.
        expect(buttonsBelowFold(844, 864, 0, 56)).toBe(false);
    });
});

describe('cardSizeFor', () => {
    it('is a share of the screen height within bounds, and never wider than the room', () => {
        expect(cardSizeFor(390, 844)).toEqual({ width: 279, height: 450 });
        expect(cardSizeFor(360, 740)).toMatchObject({ height: 422 });
        expect(cardSizeFor(360, 300).height).toBe(280);
        expect(cardSizeFor(200, 844).width).toBe(172);
    });
});
