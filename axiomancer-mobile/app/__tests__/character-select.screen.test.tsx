/**
 * The character select screen (CH1 A4): the portrait, relic, stats and
 * playstyle sit above the carousel in that order; the carousel is two rows;
 * locked squares carry a question mark; no registered lane is named.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CARD_LANES, type CharacterDefinition } from '@mechanics';

import CharacterSelectScreen from '@/app/character-select/index';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { createAppStore } from '@/state/store';
import { mockFixedRng } from '@/test-utils/rng';
import { withAllProviders } from '@/test-utils/withAllProviders';

const FIXTURE_ROSTER: CharacterDefinition[] = [
    {
        id: 'fixture-knight',
        name: 'Fixture Knight',
        portraitKey: 'altair-man',
        startingRelicId: 'relic-bleeding-signet',
        baseStats: { heart: 5, body: 7, mind: 3 },
        startingLaneIds: ['elementalist', 'lane-y'],
        startingCardIds: ['card-x', 'card-y'],
        playstyle: 'Bleeds to win.',
    },
    {
        id: 'fixture-bard',
        name: 'Fixture Bard',
        portraitKey: 'bard',
        startingRelicId: 'relic-disarming-plea',
        baseStats: { heart: 7, body: 3, mind: 5 },
        startingLaneIds: ['elementalist', 'lane-y'],
        startingCardIds: ['card-x', 'card-y'],
        playstyle: 'Talks first.',
    },
];

let mockRoster: CharacterDefinition[] = FIXTURE_ROSTER;
jest.mock('@/state/presenters/character-select.engine', () => ({
    ...(jest.requireActual('@/state/presenters/character-select.engine') as object),
    selectRoster: () => mockRoster,
}));

const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: mockBack, canGoBack: () => true }),
    useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
    mockFixedRng(0.5);
    mockRoster = FIXTURE_ROSTER;
});
afterEach(() => {
    jest.clearAllMocks();
    mockParams = {};
});

function mount(params: Record<string, string>) {
    mockParams = params;
    const slots = createMemorySlotStore();
    const store = createAppStore({ adapter: slots });
    const { tree } = withAllProviders(<CharacterSelectScreen />, { store, slots });
    render(tree);
    return { store, slots };
}

/** Every string a node renders, joined. */
function renderedText(): string {
    return JSON.stringify(screen.toJSON());
}

describe('/character-select', () => {
    it('stacks portrait, relic, stats and playstyle above the carousel, in that order', () => {
        mount({ slot: '2' });
        const order = ['portrait', 'relic', 'stats', 'playstyle', 'confirm', 'carousel']
            .map(id => renderedText().indexOf(`character-select-${id}"`));
        expect(order.every(i => i >= 0)).toBe(true);
        expect([...order].sort((a, b) => a - b)).toEqual(order);
        expect(screen.getByTestId('character-select-relic-name').props.children).toBe('Bleeding Signet');
        expect(screen.getByTestId('character-select-stat-body')).toBeTruthy();
        expect(screen.getByTestId('character-select-playstyle').props.children).toBe('Bleeds to win.');
    });

    it('has two carousel rows of four: two character squares, six locked with a question mark', () => {
        mount({ slot: '2' });
        expect(screen.getByTestId('character-select-row-0')).toBeTruthy();
        expect(screen.getByTestId('character-select-row-1')).toBeTruthy();
        expect(screen.queryByTestId('character-select-row-2')).toBeNull();
        expect(screen.getByTestId('character-select-square-fixture-knight')).toBeTruthy();
        expect(screen.getByTestId('character-select-square-fixture-bard')).toBeTruthy();
        for (let i = 2; i < 8; i++) {
            expect(screen.getByTestId(`character-select-locked-${i}-icon`).props.children).toBe('?');
            expect(screen.getByTestId(`character-select-locked-${i}`).props.accessibilityLabel).toBe('Locked');
        }
    });

    it('a locked square does nothing when tapped', () => {
        mount({ slot: '2' });
        act(() => { fireEvent.press(screen.getByTestId('character-select-locked-5')); });
        expect(screen.getByTestId('character-select-name').props.children).toBe('Fixture Knight');
        expect(mockReplace).not.toHaveBeenCalled();
    });

    it('tapping a character square shows that character', () => {
        mount({ slot: '2' });
        act(() => { fireEvent.press(screen.getByTestId('character-select-square-fixture-bard')); });
        expect(screen.getByTestId('character-select-name').props.children).toBe('Fixture Bard');
        expect(screen.getByTestId('character-select-relic-name').props.children).toBe("Suppliant's Ring");
        expect(screen.getByTestId('character-select-playstyle').props.children).toBe('Talks first.');
    });

    it('names no lane, and no old slot word', () => {
        mount({ slot: '2' });
        const text = renderedText();
        for (const lane of CARD_LANES) {
            expect(text).not.toContain(lane.name);
            expect(text).not.toContain(`"${lane.id}"`);
        }
        expect(text).not.toContain('lane-y');
        expect(text).not.toContain('card-x');
    });

    it('CONFIRM starts the picked character in the slot and enters the run', () => {
        const { store, slots } = mount({ slot: '2' });
        act(() => { fireEvent.press(screen.getByTestId('character-select-square-fixture-bard')); });
        act(() => { fireEvent.press(screen.getByTestId('character-select-confirm')); });

        expect(slots.getActiveSlot()).toBe(2);
        expect(slots.readSlot(2)?.player.characterId).toBe('fixture-bard');
        expect(store.getState().player.characterId).toBe('fixture-bard');
        expect(mockReplace).toHaveBeenCalledWith('/exploration');
    });

    it('BACK pops the screen and writes nothing to the slot', () => {
        const { slots } = mount({ slot: '2' });
        act(() => { fireEvent.press(screen.getByTestId('character-select-back')); });
        expect(mockBack).toHaveBeenCalledTimes(1);
        expect(slots.readSlot(2)).toBeNull();
    });

    it('the all-locked state (from /dev) shows eight question marks and cannot confirm', () => {
        const { slots } = mount({ locked: '1' });
        for (let i = 0; i < 8; i++) {
            expect(screen.getByTestId(`character-select-locked-${i}-icon`)).toBeTruthy();
        }
        expect(screen.queryByTestId('character-select-name')).toBeNull();
        act(() => { fireEvent.press(screen.getByTestId('character-select-confirm')); });
        expect(mockReplace).not.toHaveBeenCalled();
        expect(slots.getActiveSlot()).toBeNull();
    });

    it('an empty roster reads as the all-locked state', () => {
        mockRoster = [];
        mount({ slot: '1' });
        expect(screen.getByTestId('character-select-empty')).toBeTruthy();
        expect(screen.getByTestId('character-select-confirm').props.accessibilityState.disabled).toBe(true);
    });
});
