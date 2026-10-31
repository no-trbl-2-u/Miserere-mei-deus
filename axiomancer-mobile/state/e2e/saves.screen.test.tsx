/**
 * Hermetic E2E — the `/saves` screen (NEW GAME / LOAD GAME over three slots)
 * mounted over an in-memory slot store.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createNewGameState, type GameState } from '@mechanics';

import SaveSlotsScreen from '@/app/saves/index';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { createAppStore } from '@/state/store';
import { mockFixedRng } from '@/test-utils/rng';
import { withAllProviders } from '@/test-utils/withAllProviders';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: mockReplace, push: mockPush, back: mockBack, canGoBack: () => true }),
    useLocalSearchParams: () => mockParams,
}));

afterEach(() => {
    jest.clearAllMocks();
    mockParams = {};
});
beforeEach(() => {
    mockFixedRng(0.5);
});

function savedState(name: string, level: number): GameState {
    const s = createNewGameState({ characterId: 'the-chosen' });
    return { ...s, player: { ...s.player, name, level } };
}

/** A save made before characters: the run's player carries no `characterId`. */
function preCharacterState(level: number): GameState {
    const s = createNewGameState();
    return { ...s, player: { ...s.player, level } };
}

function mount(mode: 'new' | 'load', slots = createMemorySlotStore()) {
    mockParams = { mode };
    const store = createAppStore({ adapter: slots });
    const { tree } = withAllProviders(<SaveSlotsScreen />, { store, slots });
    render(tree);
    return { store, slots };
}

describe('/saves — NEW GAME', () => {
    it('BEGIN on an empty slot always opens the character select and writes nothing yet', () => {
        const { slots } = mount('new');
        expect(screen.getByTestId('saves-new')).toBeTruthy();

        act(() => { fireEvent.press(screen.getByTestId('save-slot-2-action')); });

        expect(mockPush).toHaveBeenCalledWith('/character-select?slot=2');
        expect(mockReplace).not.toHaveBeenCalled();
        expect(slots.readSlot(2)).toBeNull();
    });

    it('OVERWRITE on a saved slot asks first; KEEP IT changes nothing; confirming opens the select and leaves the save as it was', () => {
        const slots = createMemorySlotStore({ initial: { 1: { state: savedState('Keep', 4), savedAt: 10 } } });
        mount('new', slots);
        expect(slots.readSlot(1)?.player.level).toBe(4);

        act(() => { fireEvent.press(screen.getByTestId('save-slot-1-action')); });
        act(() => { fireEvent.press(screen.getByTestId('saves-confirm-cancel')); });
        expect(slots.readSlot(1)?.player.level).toBe(4);
        expect(mockPush).not.toHaveBeenCalled();

        act(() => { fireEvent.press(screen.getByTestId('save-slot-1-action')); });
        act(() => { fireEvent.press(screen.getByTestId('saves-confirm-confirm')); });
        expect(mockPush).toHaveBeenCalledWith('/character-select?slot=1');
        expect(slots.readSlot(1)?.player.level).toBe(4);
    });
});

describe('/saves — a save made before characters', () => {
    it.each(['new', 'load'] as const)('reads "Made before characters", offers delete and no verb (%s)', (mode) => {
        const slots = createMemorySlotStore({ initial: { 2: { state: preCharacterState(6), savedAt: 10 } } });
        mount(mode, slots);

        expect(screen.getByText('Made before characters')).toBeTruthy();
        expect(screen.queryByTestId('save-slot-2-action')).toBeNull();
        expect(screen.getByTestId('save-slot-2-clear')).toBeTruthy();
        expect(mockReplace).not.toHaveBeenCalled();
    });

    it('DELETE SAVE wipes it after the confirmation', async () => {
        const slots = createMemorySlotStore({ initial: { 2: { state: preCharacterState(6), savedAt: 10 } } });
        mount('load', slots);

        act(() => { fireEvent.press(screen.getByTestId('save-slot-2-clear')); });
        await act(async () => { fireEvent.press(screen.getByTestId('saves-confirm-confirm')); });

        expect(slots.readSlot(2)).toBeNull();
    });

    it('a character save beside it still loads', () => {
        const slots = createMemorySlotStore({
            initial: {
                1: { state: preCharacterState(6), savedAt: 20 },
                3: { state: savedState('Third', 5), savedAt: 10 },
            },
        });
        const { store } = mount('load', slots);
        expect(screen.queryByTestId('save-slot-1-action')).toBeNull();
        act(() => { fireEvent.press(screen.getByTestId('save-slot-3-action')); });
        expect(store.getState().player.name).toBe('Third');
        expect(mockReplace).toHaveBeenCalledWith('/exploration');
    });
});

describe('/saves — LOAD GAME', () => {
    it('JOURNEY ON… loads the slot; empty slots offer no verb', () => {
        const slots = createMemorySlotStore({ initial: { 3: { state: savedState('Third', 5), savedAt: 10 } } });
        const { store } = mount('load', slots);

        expect(screen.queryByTestId('save-slot-1-action')).toBeNull();
        expect(screen.queryByTestId('save-slot-2-action')).toBeNull();
        act(() => { fireEvent.press(screen.getByTestId('save-slot-3-action')); });

        expect(slots.getActiveSlot()).toBe(3);
        expect(store.getState().player.name).toBe('Third');
        expect(mockReplace).toHaveBeenCalledWith('/exploration');
    });

    it('DELETE SAVE asks first, then wipes the slot', async () => {
        const slots = createMemorySlotStore({ initial: { 2: { state: savedState('Gone', 2), savedAt: 10 } } });
        mount('load', slots);

        act(() => { fireEvent.press(screen.getByTestId('save-slot-2-clear')); });
        await act(async () => { fireEvent.press(screen.getByTestId('saves-confirm-confirm')); });

        expect(slots.readSlot(2)).toBeNull();
        expect(screen.queryByTestId('save-slot-2-action')).toBeNull();
    });

    it('the back control pops the screen', () => {
        mount('load');
        act(() => { fireEvent.press(screen.getByTestId('saves-back')); });
        expect(mockBack).toHaveBeenCalledTimes(1);
    });
});
