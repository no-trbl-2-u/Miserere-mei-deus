/**
 * The look affordance for round 2's new-game and ending places: with every
 * look forced to `normal`, none of them draws a kit piece.
 * `lookGate.newgame.test.tsx` is the other half.
 * guard-test: with every look at normal the base already draws no kit piece here, so this passes on the base by design; it pins the plain fallback that
 * the new look gates must keep.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { render } from '@testing-library/react-native';
import React from 'react';
import type { CharacterDefinition } from '@mechanics';

import CharacterSelectScreen from '@/app/character-select/index';
import DeathReturnScreen from '@/app/death-return/index';
import GameOverScreen from '@/app/game-over/index';
import { SaveSlotRow } from '@/components/menu/SaveSlotRow';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { createAppStore } from '@/state/store';
import { withAllProviders } from '@/test-utils/withAllProviders';
import { armDeathReturn, clearDeathReturn } from '@/state/death-return';
import { armGameOver, clearGameOver } from '@/state/game-over';
import { kitImagesIn } from '@/test-utils/lookGate';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => ({ slot: '1' }),
}));

const FIXTURE_ROSTER: CharacterDefinition[] = [{
    id: 'fixture-knight', name: 'Fixture Knight', portraitKey: 'altair-man', startingRelicId: 'relic-bleeding-signet',
    baseStats: { heart: 5, body: 7, mind: 3 }, startingLaneIds: ['elementalist', 'lane-y'],
    startingCardIds: ['card-x', 'card-y', 'card-z'], playstyle: 'Bleeds to win.',
}];
jest.mock('@/state/presenters/character-select.engine', () => ({
    ...(jest.requireActual('@/state/presenters/character-select.engine') as object),
    selectRoster: () => FIXTURE_ROSTER,
}));

const ROW = {
    id: 1, numeral: 'I', status: 'occupied', detail: 'Level 3 · Northern Forest', stamp: 'today',
    action: 'start', actionLabel: 'BEGIN', clearable: true, mostRecent: true,
};

beforeEach(() => { armGameOver(); armDeathReturn(); });
afterEach(() => { clearGameOver(); clearDeathReturn(); });

jest.mock('@/components/experience/looks', () => ({
    ...(jest.requireActual('@/components/experience/looks') as object),
    lookOf: () => 'normal',
    // BrassButton (the game over button, G-02) reads the table itself, not lookOf.
    LOOKS: new Proxy({}, { get: () => 'normal' }),
}));

describe('a new-game or ending place set to normal draws no kit piece', () => {
    it('N-01 and N-02: a save slot row and its BEGIN', () => {
        const view = render(<SaveSlotRow row={ROW as never} onAction={() => undefined} onClear={() => undefined} />);
        expect(view.getByTestId('save-slot-1-action')).toBeTruthy();
        expect(kitImagesIn(view)).toBe(0);
    });

    it('G-01: the death screen button', () => {
        const view = render(<DeathReturnScreen />);
        expect(view.getByTestId('death-return-continue')).toBeTruthy();
        expect(kitImagesIn(view)).toBe(0);
    });

    it('G-02: the game over button', () => {
        const view = render(<GameOverScreen />);
        expect(view.getByTestId('game-over-new-character')).toBeTruthy();
        expect(kitImagesIn(view)).toBe(0);
    });

    it("N-04, N-05 and N-06: character select's cards, stat tiles and CONFIRM", () => {
        const slots = createMemorySlotStore();
        const { tree } = withAllProviders(<CharacterSelectScreen />, { store: createAppStore({ adapter: slots }), slots });
        const view = render(tree);
        expect(view.getByTestId('character-select-confirm')).toBeTruthy();
        expect(kitImagesIn(view)).toBe(0);
    });
});
