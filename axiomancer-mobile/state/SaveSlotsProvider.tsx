/**
 * Save-slot context — hands the app's `SaveSlotStore` (the AsyncStorage
 * adapter on a real launch, an in-memory store under tests / fixture boots)
 * to the screens that drive it, and exposes the menu verbs bound to the
 * game store.
 *
 * Kept separate from `GameStoreProvider` on purpose: the game store is
 * engine state, the slot store is where that state LIVES. Mixing them would
 * put storage concerns into `AppActions`, which every screen imports.
 *
 * Hooks:
 *   useSaveSlots()        the raw store + bound verbs
 *   useSaveSlotSummaries() the live summaries (re-renders on writes / selects / clears)
 */

import React, { createContext, useContext, useMemo, useSyncExternalStore } from 'react';

import { useGameStore } from './GameStoreProvider';
import {
    continueGameAction,
    loadGameAction,
    returnToTitleAction,
    startNewGameAction,
} from './menu/store-actions';
import { createMemorySlotStore } from './persistence/memorySlotStore';
import type { SaveSlotId, SaveSlotStore, SaveSlotSummary } from './persistence/saveSlots';
import type { CharacterDefinition, GameState, MapName } from '@mechanics';

export interface SaveSlotsApi {
    /** The slot store itself (for the few callers that need `readSlot` / `clearSlot`). */
    slots: SaveSlotStore;
    /**
     * NEW GAME into `slot` (overwrite is the caller's confirmed decision).
     * `startMap` is the dev tools' "start on any map"; players never pass it.
     * `characterId` opens the run as a roster character (the select screen's
     * pick); `roster` replaces the engine roster (tests).
     */
    startNewGame: (
        slot: SaveSlotId,
        startMap?: MapName,
        characterId?: string,
        roster?: readonly CharacterDefinition[],
        codex?: GameState['codex'],
    ) => void;
    /** LOAD GAME from `slot`; `false` when the slot holds nothing loadable. */
    loadGame: (slot: SaveSlotId) => boolean;
    /** CONTINUE the most recent slot; `false` when nothing is saved. */
    continueGame: () => boolean;
    /** Save + flush before leaving for the title. */
    returnToTitle: () => Promise<void>;
    /** Wipe one slot. */
    clearSlot: (slot: SaveSlotId) => Promise<void>;
}

const SaveSlotsContext = createContext<SaveSlotsApi | null>(null);

export interface SaveSlotsProviderProps {
    children: React.ReactNode;
    /**
     * The slot store. Omitted → a fresh in-memory store (tests, fixture
     * boots — a fixture session must never reach the player's real slots).
     */
    slots?: SaveSlotStore;
}

export function SaveSlotsProvider({ children, slots }: SaveSlotsProviderProps) {
    const store = useGameStore();
    const value = useMemo<SaveSlotsApi>(() => {
        const s = slots ?? createMemorySlotStore();
        return {
            slots: s,
            startNewGame: (slot, startMap, characterId, roster, codex) => {
                startNewGameAction(store, s, slot, startMap, characterId, roster, codex);
            },
            loadGame: (slot) => loadGameAction(store, s, slot),
            continueGame: () => continueGameAction(store, s),
            returnToTitle: () => returnToTitleAction(store, s),
            clearSlot: (slot) => s.clearSlot(slot),
        };
    }, [store, slots]);
    return <SaveSlotsContext.Provider value={value}>{children}</SaveSlotsContext.Provider>;
}

export function useSaveSlots(): SaveSlotsApi {
    const ctx = useContext(SaveSlotsContext);
    if (ctx === null) throw new Error('useSaveSlots must be used inside <SaveSlotsProvider>');
    return ctx;
}

/**
 * The slot the run saves to, or `null` when none is picked or no provider is
 * mounted (a screen under test, a fixture boot). Never throws: the run-end
 * routes read it from screens that tests mount without the slot context.
 */
export function useActiveSlot(): SaveSlotId | null {
    const ctx = useContext(SaveSlotsContext);
    return ctx === null ? null : ctx.slots.getActiveSlot();
}

/** The live slot summaries; re-renders whenever the slot store changes. */
export function useSaveSlotSummaries(): readonly SaveSlotSummary[] {
    const { slots } = useSaveSlots();
    return useSyncExternalStore(slots.subscribe, slots.listSlots, slots.listSlots);
}
