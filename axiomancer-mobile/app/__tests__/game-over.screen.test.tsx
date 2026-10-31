/**
 * Hermetic screen test — the Game Over screen (phase CH1j, A11).
 *
 * Armed by a run end it shows the title, the placeholder line and NEW
 * CHARACTER, and the button disarms it and replaces to character select for
 * the slot. Not armed (a reload, a deep link) it goes there at once.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

const mockReplace = jest.fn();
const mockParams: Record<string, string> = {};
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => mockParams,
}));

import GameOverScreen from '@/app/game-over/index';
import { armGameOver, clearGameOver, isGameOverArmed } from '@/state/game-over';
import {
    GAME_OVER_BODY,
    GAME_OVER_BUTTON_LABEL,
    GAME_OVER_TITLE,
} from '@/state/presenters/game-over.copy';
import { selectGameOverVM } from '@/state/presenters/game-over.engine';

beforeEach(() => {
    jest.clearAllMocks();
    clearGameOver();
    for (const k of Object.keys(mockParams)) delete mockParams[k];
    mockParams.slot = '2';
});

describe('game-over presenter', () => {
    it('is the placeholder copy, marked [content], and a NEW CHARACTER button', () => {
        const vm = selectGameOverVM();
        expect(vm.title).toBe(GAME_OVER_TITLE);
        expect(vm.title).toBe('GAME OVER');
        expect(vm.body).toBe(GAME_OVER_BODY);
        expect(vm.body).toContain('[content]');
        expect(vm.buttonLabel).toBe(GAME_OVER_BUTTON_LABEL);
    });
});

describe('the Game Over screen', () => {
    it('shows once armed; the button disarms it and opens character select for the slot', () => {
        armGameOver();
        const tree = render(<GameOverScreen />);

        expect(tree.getByTestId('game-over-title').props.children).toBe(GAME_OVER_TITLE);
        expect(tree.getByTestId('game-over-body').props.children).toBe(GAME_OVER_BODY);
        expect(mockReplace).not.toHaveBeenCalled();

        fireEvent.press(tree.getByTestId('game-over-new-character'));

        expect(isGameOverArmed()).toBe(false);
        expect(mockReplace).toHaveBeenCalledWith('/character-select?slot=2&runEnd=1');
    });

    it('not armed (a reload), it goes straight to character select and shows nothing', () => {
        const tree = render(<GameOverScreen />);

        expect(tree.queryByTestId('game-over')).toBeNull();
        expect(tree.queryByTestId('game-over-empty')).not.toBeNull();
        expect(mockReplace).toHaveBeenCalledWith('/character-select?slot=2&runEnd=1');
    });

    it('with no slot it falls back to the slot list', () => {
        delete mockParams.slot;
        render(<GameOverScreen />);
        expect(mockReplace).toHaveBeenCalledWith('/saves?mode=new');
    });
});
