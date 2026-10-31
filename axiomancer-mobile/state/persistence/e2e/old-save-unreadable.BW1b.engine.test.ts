/**
 * Hermetic E2E: a save from before the new Breakwater is offered only for
 * deletion, and NEW GAME starts on the windmill (phase BW1b, A7).
 *
 * v41 made the live Breakwater T's Chapter 1 map; an older save names nodes
 * the map no longer has, so the engine's `migrate` rejects it. Through the
 * real AsyncStorage adapter (its official jest mock) the slot reads
 * `unreadable`, never thrown and never booted into; its slot row offers no
 * LOAD or START (action `none`) and only DELETE (`clearable`); and a NEW GAME
 * written over it stands on `bw-w1`.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { GAME_STATE_VERSION, createNewGameState } from '@mechanics';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import { startNewGameAction } from '@/state/menu/store-actions';
import { createAsyncStorageAdapter } from '@/state/persistence/asyncStorageAdapter';
import { wrap } from '@/state/persistence/migrations';
import { LAST_SLOT_KEY, slotStorageKey } from '@/state/persistence/saveSlots';
import { SAVE_SLOTS_COPY, selectSaveSlotRows, selectMainMenuViewModel } from '@/state/presenters/main-menu.engine';
import { createAppStore } from '@/state/store';

afterEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
});

/** A v40 save, standing on the old Breakwater's first fight (`bw-2`, gone from the map). */
function v40Envelope(): string {
    const fresh = createNewGameState({ characterId: 'the-chosen' });
    const old = {
        ...fresh,
        version: 40,
        world: { ...fresh.world, currentMap: { ...fresh.world.currentMap, currentNode: 'bw-2' } },
    };
    return JSON.stringify(wrap(old as never, 1_000));
}

/** An adapter preloaded with the v40 save in slot 1 (the remembered last slot). */
async function adapterWithOldSave() {
    await AsyncStorage.setItem(slotStorageKey(1), v40Envelope());
    await AsyncStorage.setItem(LAST_SLOT_KEY, '1');
    const adapter = createAsyncStorageAdapter();
    await expect(adapter.preload()).resolves.toBeUndefined();
    return adapter;
}

describe('a save older than v41 (A7)', () => {
    it('is listed unreadable, never read and never booted into', async () => {
        expect(GAME_STATE_VERSION).toBe(41);
        const adapter = await adapterWithOldSave();

        expect(adapter.listSlots().map((s) => s.status)).toEqual(['unreadable', 'empty', 'empty']);
        expect(adapter.readSlot(1)).toBeNull();
        expect(adapter.getActiveSlot()).toBeNull();
        expect(adapter.load()).toBeNull();
    });

    it('its slot row offers no LOAD or START, only DELETE, in both slot screens', async () => {
        const adapter = await adapterWithOldSave();
        for (const mode of ['load', 'new'] as const) {
            const row = selectSaveSlotRows(adapter.listSlots(), mode, 2_000)[0]!;
            expect(row.status).toBe('unreadable');
            expect(row.action).toBe('none');
            expect(row.actionLabel).toBe('');
            expect(row.clearable).toBe(true);
            expect(row.detail).toBe(SAVE_SLOTS_COPY.unreadable);
        }
        // Nothing to CONTINUE or LOAD from the main menu.
        const menu = selectMainMenuViewModel(adapter.listSlots(), 2_000);
        expect(menu.continue.enabled).toBe(false);
        expect(menu.loadGame.enabled).toBe(false);
    });

    it('DELETE empties the slot', async () => {
        const adapter = await adapterWithOldSave();
        await adapter.clearSlot(1);
        expect(adapter.listSlots()[0]?.status).toBe('empty');
        expect(await AsyncStorage.getItem(slotStorageKey(1))).toBeNull();
    });

    it('a NEW GAME in another slot stands on the windmill (bw-w1), at the current version', async () => {
        const adapter = await adapterWithOldSave();
        const store = createAppStore({ adapter });

        const fresh = startNewGameAction(store, adapter, 2, undefined, 'the-chosen');
        await adapter.flush?.();

        expect(fresh.version).toBe(GAME_STATE_VERSION);
        expect(fresh.world.currentMap.name).toBe('breakwater');
        expect(fresh.world.currentMap.currentNode).toBe('bw-w1');
        expect(store.getState().world.currentMap.currentNode).toBe('bw-w1');
        expect(adapter.listSlots().map((s) => s.status)).toEqual(['unreadable', 'saved', 'empty']);
        expect(adapter.readSlot(2)?.world.currentMap.currentNode).toBe('bw-w1');
    });
});
