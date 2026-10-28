/**
 * Hermetic screen test — the return moment (phase DY1b, A8).
 *
 * Armed by a revive it shows the title, the placeholder line and CONTINUE,
 * and CONTINUE disarms it and goes to the map. Not armed (a reload) it
 * sends the player to the map without showing.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockCanGoBack = true;
const mockParams: Record<string, string> = {};
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: mockBack, canGoBack: () => mockCanGoBack }),
    useLocalSearchParams: () => mockParams,
}));

import DeathReturnScreen from '@/app/death-return/index';
import { armDeathReturn, clearDeathReturn, isDeathReturnArmed } from '@/state/death-return';
import {
    DEATH_RETURN_BODY,
    DEATH_RETURN_CONTINUE_LABEL,
    DEATH_RETURN_TITLE,
} from '@/state/presenters/death-return.copy';
import { selectDeathReturnVM } from '@/state/presenters/death-return.engine';

beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = true;
    clearDeathReturn();
});

describe('death-return presenter', () => {
    it('is the placeholder copy, marked [content], and a CONTINUE', () => {
        const vm = selectDeathReturnVM();
        expect(vm.title).toBe(DEATH_RETURN_TITLE);
        expect(vm.body).toBe(DEATH_RETURN_BODY);
        expect(vm.title).toContain('[content]');
        expect(vm.body).toContain('[content]');
        expect(vm.continueLabel).toBe(DEATH_RETURN_CONTINUE_LABEL);
    });
});

describe('the return moment screen', () => {
    it('shows once armed; CONTINUE disarms it and goes to the map', () => {
        armDeathReturn();
        const tree = render(<DeathReturnScreen />);

        expect(tree.getByTestId('death-return-title').props.children).toBe(DEATH_RETURN_TITLE);
        expect(tree.getByTestId('death-return-body').props.children).toBe(DEATH_RETURN_BODY);
        expect(mockReplace).not.toHaveBeenCalled();

        fireEvent.press(tree.getByTestId('death-return-continue'));

        expect(isDeathReturnArmed()).toBe(false);
        expect(mockBack).toHaveBeenCalledTimes(1);
        expect(mockReplace).not.toHaveBeenCalled();
    });

    it('CONTINUE replaces to the map when there is nothing to go back to', () => {
        mockCanGoBack = false;
        armDeathReturn();
        const tree = render(<DeathReturnScreen />);

        fireEvent.press(tree.getByTestId('death-return-continue'));

        expect(mockReplace).toHaveBeenCalledWith('/exploration');
    });

    it('not armed (a reload during it), it goes straight to the map and shows nothing', () => {
        const tree = render(<DeathReturnScreen />);

        expect(tree.queryByTestId('death-return')).toBeNull();
        expect(tree.queryByTestId('death-return-empty')).not.toBeNull();
        expect(mockBack).toHaveBeenCalledTimes(1);
    });
});
