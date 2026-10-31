/**
 * The character select screen over the LIVE roster (CH1f): the Chosen is the
 * one selectable square, the other seven are locked, and confirming starts a
 * run with the ring worn, the lanes recorded and the character's portrait
 * shown (the SELF bust no longer cycles for it).
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CHARACTER_ROSTER, createNewGameState, getEquippedItems, rewardPoolFor, runOverState, type GameState } from '@mechanics';

import CharacterSelectScreen from '@/app/character-select/index';
import CharacterScreen from '@/app/(tabs)/character/index';
import { getPlayerPortrait } from '@/assets/images/portraits';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { characterPortraitKey } from '@/state/presenters/character-select.engine';
import { createAppStore } from '@/state/store';
import { mockFixedRng } from '@/test-utils/rng';
import { withAllProviders } from '@/test-utils/withAllProviders';

const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
    mockFixedRng(0.5);
    mockParams = { slot: '1' };
});
afterEach(() => {
    jest.clearAllMocks();
});

function mountSelect() {
    const slots = createMemorySlotStore();
    const store = createAppStore({ adapter: slots });
    const { tree } = withAllProviders(<CharacterSelectScreen />, { store, slots });
    render(tree);
    return { store, slots };
}

describe('/character-select with the live roster', () => {
    it('shows the Chosen selected, one selectable square and seven locked', () => {
        expect(CHARACTER_ROSTER.map((c) => c.id)).toEqual(['the-chosen']);
        mountSelect();
        expect(screen.getByTestId('character-select-name').props.children).toBe('The Chosen');
        expect(screen.getByTestId('character-select-relic-name').props.children).toBe("Suppliant's Ring");
        expect(screen.getByTestId('character-select-playstyle').props.children).toBe('Fumbling Squire trying to hold the line');
        expect(screen.getByTestId('character-select-square-the-chosen')).toBeTruthy();
        for (let i = 1; i < 8; i++) {
            expect(screen.getByTestId(`character-select-locked-${i}-icon`).props.children).toBe('?');
        }
        expect(screen.queryByTestId('character-select-locked-0')).toBeNull();
    });

    it('CONFIRM starts the Chosen: ring worn, both lanes recorded, a reward pool that is not empty', () => {
        const { store, slots } = mountSelect();
        act(() => { fireEvent.press(screen.getByTestId('character-select-confirm')); });

        const saved = slots.readSlot(1)!.player;
        expect(saved.characterId).toBe('the-chosen');
        expect(saved.startingLaneIds).toEqual(['defender', 'blood-price']);
        expect(saved.baseStats).toEqual({ heart: 7, body: 3, mind: 5 });
        expect(getEquippedItems(saved.equipment).map((p) => p.id)).toEqual(['relic-disarming-plea']);
        expect(saved.knownCards).toHaveLength(10);
        expect(rewardPoolFor(store.getState().player).length).toBeGreaterThan(0);
        expect(mockReplace).toHaveBeenCalledWith('/exploration');
    });
});

describe('/character-select as a run end', () => {
    const finishedSlots = () => {
        const over = { ...runOverState(createNewGameState({ characterId: 'the-chosen' })), codex: { unlockedEntries: ['seen-it'] } } as GameState;
        return createMemorySlotStore({ initial: { 2: { state: over, savedAt: 10 } } });
    };

    it('CONFIRM starts the Chosen in the slot with the finished run codex; BACK goes to the slot list', () => {
        mockParams = { slot: '2', runEnd: '1' };
        const slots = finishedSlots();
        const store = createAppStore({ adapter: slots });
        const { tree } = withAllProviders(<CharacterSelectScreen />, { store, slots });
        render(tree);

        act(() => { fireEvent.press(screen.getByTestId('character-select-back')); });
        expect(mockReplace).toHaveBeenCalledWith('/saves?mode=load');

        act(() => { fireEvent.press(screen.getByTestId('character-select-confirm')); });
        const saved = slots.readSlot(2)!;
        expect(saved.runOver).toBeUndefined();
        expect(saved.player.characterId).toBe('the-chosen');
        expect(saved.player.level).toBe(1);
        expect(saved.codex.unlockedEntries).toContain('seen-it');
        expect(slots.listSlots()[1].runOver).toBe(false);
    });

    it('a plain new game over a finished slot opens a blank codex', () => {
        mockParams = { slot: '2' };
        const slots = finishedSlots();
        const store = createAppStore({ adapter: slots });
        const { tree } = withAllProviders(<CharacterSelectScreen />, { store, slots });
        render(tree);
        act(() => { fireEvent.press(screen.getByTestId('character-select-confirm')); });
        expect(slots.readSlot(2)!.codex.unlockedEntries).not.toContain('seen-it');
    });
});

describe('the Chosen\'s portrait on the SELF screen', () => {
    it('is the roster portrait, and the bust does not cycle', () => {
        const slots = createMemorySlotStore();
        const store = createAppStore({ adapter: slots });
        const { tree: selectTree } = withAllProviders(<CharacterSelectScreen />, { store, slots });
        const first = render(selectTree);
        act(() => { fireEvent.press(screen.getByTestId('character-select-confirm')); });
        first.unmount();

        expect(characterPortraitKey('the-chosen')).toBe('altair-man');
        const flagsBefore = [...(store.getState().flags ?? [])];
        const { tree } = withAllProviders(<CharacterScreen />, { store, slots });
        render(tree);
        expect(screen.queryByTestId('self-portrait-cycle')).toBeNull();
        expect(screen.getByTestId('self-portrait')).toBeTruthy();
        expect(getPlayerPortrait('altair-man').id).toBe('altair-man');
        expect(store.getState().flags ?? []).toEqual(flagsBefore);
    });

    it('a run with no character keeps the gallery cycle', () => {
        const slots = createMemorySlotStore();
        const store = createAppStore({ adapter: slots });
        const { tree } = withAllProviders(<CharacterScreen />, { store, slots });
        render(tree);
        expect(screen.getByTestId('self-portrait-cycle')).toBeTruthy();
        act(() => { fireEvent.press(screen.getByTestId('self-portrait-cycle')); });
        expect((store.getState().flags ?? []).some((f: string) => f.startsWith('portrait:'))).toBe(true);
    });
});
