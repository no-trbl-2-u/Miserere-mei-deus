/**
 * The look affordance for round 2's new-game and ending places (N-01, N-02,
 * G-01): with the table's real looks each screen draws kit pieces.
 * `lookGate.newgame.normal.test.tsx` is the other half.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { StyleSheet } from "react-native";
import { render } from '@testing-library/react-native';
import React from 'react';
import type { CharacterDefinition } from '@mechanics';

import { KIT } from '@/assets/images/experience/kit';
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

/** Kit pieces drawn inside one node. */
function kitIn(node: { findAll: (test: (n: { type: unknown; props: { source?: unknown } }) => boolean) => unknown[] }): number {
    const sources = new Set<unknown>(Object.values(KIT).map((piece) => piece.source));
    return node.findAll((n) => typeof n.type !== 'string' && sources.has(n.props.source)).length;
}

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

describe('the new-game and ending screens on their kit looks', () => {
    it('N-01 and N-02: a save slot row and its BEGIN', () => {
        const view = render(<SaveSlotRow row={ROW as never} onAction={() => undefined} onClear={() => undefined} />);
        expect(view.getByTestId('save-slot-1-action')).toBeTruthy();
        expect(kitImagesIn(view)).toBeGreaterThan(0);
    });

    it('G-01: the death screen button', () => {
        const view = render(<DeathReturnScreen />);
        expect(view.getByTestId('death-return-continue')).toBeTruthy();
        expect(kitImagesIn(view)).toBeGreaterThan(0);
    });

    it('G-01: the game over button', () => {
        const view = render(<GameOverScreen />);
        expect(view.getByTestId('game-over-new-character')).toBeTruthy();
        expect(kitImagesIn(view)).toBeGreaterThan(0);
    });

    it("N-04, N-05 and N-06: character select draws its cards, stat tiles and CONFIRM", () => {
        const slots = createMemorySlotStore();
        const { tree } = withAllProviders(<CharacterSelectScreen />, { store: createAppStore({ adapter: slots }), slots });
        const view = render(tree);
        for (const id of ['character-select-portrait', 'character-select-relic', 'character-select-stat-body', 'character-select-confirm']) {
            expect(kitIn(view.getByTestId(id))).toBeGreaterThan(0);
        }
    });

    it('N-01: the most recent slot and a torn slot keep a marker on vellum', () => {
        const numeral = (row: object) => {
            const view = render(<SaveSlotRow row={row as never} onAction={() => undefined} onClear={() => undefined} />);
            return StyleSheet.flatten(view.getByTestId('save-slot-1-numeral').props.style);
        };
        const plain = numeral({ ...ROW, mostRecent: false });
        expect(numeral(ROW).borderWidth).toBeGreaterThan(plain.borderWidth as number);
        expect(numeral({ ...ROW, mostRecent: false, status: 'unreadable' }).borderStyle).toBe('dashed');
    });
});
