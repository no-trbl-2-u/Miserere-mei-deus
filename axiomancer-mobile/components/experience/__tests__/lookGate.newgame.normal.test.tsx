/**
 * The look affordance for round 2's new-game and ending places: with every
 * look forced to `normal`, none of them draws a kit piece.
 * `lookGate.newgame.test.tsx` is the other half.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { render } from '@testing-library/react-native';
import React from 'react';

import DeathReturnScreen from '@/app/death-return/index';
import GameOverScreen from '@/app/game-over/index';
import { SaveSlotRow } from '@/components/menu/SaveSlotRow';
import { armDeathReturn, clearDeathReturn } from '@/state/death-return';
import { armGameOver, clearGameOver } from '@/state/game-over';
import { kitImagesIn } from '@/test-utils/lookGate';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => ({ slot: '1' }),
}));

const ROW = {
    id: 1, numeral: 'I', status: 'occupied', detail: 'Level 3 · Northern Forest', stamp: 'today',
    action: 'start', actionLabel: 'BEGIN', clearable: true, mostRecent: true,
} as never;

beforeEach(() => { armGameOver(); armDeathReturn(); });
afterEach(() => { clearGameOver(); clearDeathReturn(); });

jest.mock('@/components/experience/looks', () => ({
    ...(jest.requireActual('@/components/experience/looks') as object),
    lookOf: () => 'normal',
}));

describe('a new-game or ending place set to normal draws no kit piece', () => {
    it('N-01 and N-02: a save slot row and its BEGIN', () => {
        const view = render(<SaveSlotRow row={ROW} onAction={() => undefined} onClear={() => undefined} />);
        expect(view.getByTestId('save-slot-1-action')).toBeTruthy();
        expect(kitImagesIn(view)).toBe(0);
    });

    it('G-01: the death screen button', () => {
        const view = render(<DeathReturnScreen />);
        expect(view.getByTestId('death-return-continue')).toBeTruthy();
        expect(kitImagesIn(view)).toBe(0);
    });

    it('G-01: the game over button', () => {
        const view = render(<GameOverScreen />);
        expect(view.getByTestId('game-over-new-character')).toBeTruthy();
        expect(kitImagesIn(view)).toBe(0);
    });
});
