/**
 * Hermetic — `<MainMenu>` over an in-memory slot store.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { createNewGameState } from '@mechanics';

import { EMBARK_PRESSED, EmbarkButton } from '../menu/EmbarkButton';
import { MainMenu, MENU_COLUMN_MAX_WIDTH } from '../menu/MainMenu';
import { EMBARK_SCROLL, EMBARK_SCROLL_ASPECT } from '@/assets/images/title';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { MAIN_MENU_COPY } from '@/state/presenters/main-menu.engine';
import { withAllProviders } from '@/test-utils/withAllProviders';

function mount(slots = createMemorySlotStore()) {
    const handlers = { onContinue: jest.fn(), onNewGame: jest.fn(), onLoadGame: jest.fn(), onSettings: jest.fn() };
    const { tree } = withAllProviders(<MainMenu {...handlers} now={() => 1_700_000_000_000} />, { slots });
    render(tree);
    return handlers;
}

describe('MainMenu', () => {
    it('prints the four verbs and routes each press', () => {
        const slots = createMemorySlotStore({ initial: { 1: { state: createNewGameState({ characterId: 'the-chosen' }), savedAt: 1_700_000_000_000 - 5000 } } });
        const h = mount(slots);
        expect(screen.getByText(MAIN_MENU_COPY.continue)).toBeTruthy();
        expect(screen.getByLabelText(MAIN_MENU_COPY.newGameLabel)).toBeTruthy();
        expect(screen.getByText(MAIN_MENU_COPY.loadGame)).toBeTruthy();
        expect(screen.getByText(MAIN_MENU_COPY.settings)).toBeTruthy();
        expect(screen.getByText(/chronicle I · Level 1 · Breakwater · moments ago/)).toBeTruthy();

        fireEvent.press(screen.getByTestId('main-menu-continue'));
        fireEvent.press(screen.getByTestId('main-menu-new-game'));
        fireEvent.press(screen.getByTestId('main-menu-load-game'));
        fireEvent.press(screen.getByTestId('main-menu-settings'));
        expect(h.onContinue).toHaveBeenCalledTimes(1);
        expect(h.onNewGame).toHaveBeenCalledTimes(1);
        expect(h.onLoadGame).toHaveBeenCalledTimes(1);
        expect(h.onSettings).toHaveBeenCalledTimes(1);
    });

    it('hides CONTINUE and disables LOAD GAME with nothing saved', () => {
        const h = mount();
        expect(screen.queryByTestId('main-menu-continue')).toBeNull();
        fireEvent.press(screen.getByTestId('main-menu-load-game'));
        expect(h.onLoadGame).not.toHaveBeenCalled();
        expect(screen.getByText(MAIN_MENU_COPY.loadGameEmptyHint)).toBeTruthy();
    });

    it('re-renders when a slot is written', () => {
        const slots = createMemorySlotStore();
        mount(slots);
        expect(screen.queryByTestId('main-menu-continue')).toBeNull();
        act(() => {
            slots.selectSlot(2);
            slots.save(createNewGameState({ characterId: 'the-chosen' }));
        });
        expect(screen.getByTestId('main-menu-continue')).toBeTruthy();
    });

    it('holds the heading and rows in one centred column at a reading width', () => {
        mount();
        const column = StyleSheet.flatten(screen.getByTestId('main-menu-column').props.style);
        expect(column.maxWidth).toBe(MENU_COLUMN_MAX_WIDTH);
        expect(MENU_COLUMN_MAX_WIDTH).toBeGreaterThanOrEqual(480);
        expect(MENU_COLUMN_MAX_WIDTH).toBeLessThanOrEqual(560);
        expect(column.alignSelf).toBe('center');
        expect(column.width).toBe('100%');
        expect(screen.getByTestId('main-menu-column')).toContainElement(screen.getByTestId('main-menu-new-game'));
    });

    /** Under the title screen the wordmark is the title; the menu adds no second one and no ground. */
    it('drops its own title and ground when embedded in the title screen', () => {
        const handlers = { onContinue: jest.fn(), onNewGame: jest.fn(), onLoadGame: jest.fn(), onSettings: jest.fn() };
        const { tree } = withAllProviders(<MainMenu {...handlers} embedded />, { slots: createMemorySlotStore() });
        render(tree);
        expect(screen.queryByText(MAIN_MENU_COPY.title)).toBeNull();
        expect(screen.getByText(MAIN_MENU_COPY.eyebrow)).toBeTruthy();
        expect(StyleSheet.flatten(screen.getByTestId('main-menu').props.style).backgroundColor).toBe('transparent');
    });

    /** Plan 121.3: NEW GAME is T's parchment "Embark" scroll, not a text row. */
    it('draws NEW GAME as the Embark scroll, a labelled button that dips when pressed and rings on focus', () => {
        const h = mount();
        const button = screen.getByTestId('main-menu-new-game');
        expect(button.props.accessibilityRole).toBe('button');
        expect(button.props.accessibilityLabel).toBe(MAIN_MENU_COPY.newGameLabel);
        expect(button.props.accessibilityHint).toBe(MAIN_MENU_COPY.newGameHint);
        expect(screen.queryByText(MAIN_MENU_COPY.newGame)).toBeNull();

        const scroll = screen.getByTestId('main-menu-new-game-scroll');
        expect([scroll.props.source].flat()).toEqual([EMBARK_SCROLL]);
        const art = StyleSheet.flatten(scroll.props.style);
        expect(art.width).toBe('100%');
        expect(art.aspectRatio).toBeCloseTo(EMBARK_SCROLL_ASPECT);
        expect(screen.getByTestId('main-menu-column')).toContainElement(button);

        expect(screen.queryByTestId('main-menu-new-game-focus')).toBeNull();
        fireEvent(button, 'focus');
        expect(screen.getByTestId('main-menu-new-game-focus')).toBeTruthy();
        fireEvent(button, 'blur');
        expect(screen.queryByTestId('main-menu-new-game-focus')).toBeNull();

        expect(StyleSheet.flatten(button.props.style).opacity).toBeUndefined();
        fireEvent.press(button);
        expect(h.onNewGame).toHaveBeenCalledTimes(1);
    });

    it('dips the Embark scroll while it is held', () => {
        const { tree } = withAllProviders(
            <EmbarkButton onPress={jest.fn()} accessibilityLabel={MAIN_MENU_COPY.newGameLabel} testID="embark" testOnlyPressed />,
            { slots: createMemorySlotStore() },
        );
        render(tree);
        const held = StyleSheet.flatten(screen.getByTestId('embark').props.style);
        expect(held.opacity).toBe(EMBARK_PRESSED.opacity);
        expect(held.transform).toEqual([{ scale: EMBARK_PRESSED.scale }]);
    });
});
