/**
 * Hermetic E2E — the Labyrinth door.
 *
 * The Lantern Deep's vault door (`ld-15`) enters THE APORIA on arrival, with
 * no gate, through `enterLabyrinthAction`'s snapshot and return path. Pinned
 * through the store action layer against the real engine content:
 *
 *   - enter: arriving on the door opens act I's visit, with the entrance
 *     narration pending, and no event card on the overworld
 *   - return: leaving the Aporia puts the player back on the vault door of
 *     the Lantern Deep, which is not consumed and still opens the way on
 *   - resume: a save taken inside the Aporia rebuilds the visit on load
 *     (the slot load and the cold boot both), and its exit still returns
 *     to the door
 *   - a second visit opens the act the player left
 *
 * The door is sealed: the Labyrinth is parked with its code kept, so the
 * door's entry journeys are skipped and the one live pin is that arriving on
 * the sealed door opens no visit.
 */

import { describe, expect, it } from '@jest/globals';
import type { GameState } from '@mechanics';

import { createAppActions } from '@/state/actions';
import { hydrateStoreWithGameState } from '@/state/menu/store-actions';
import { createAppStore, type AppStore } from '@/state/store';
import { createFixtureStore } from '@/test-utils/fixtureStore';
import { createMemoryAdapter, type MemoryAdapter } from '@/test-utils/memoryAdapter';

/** Seat the player on the vault door, the arrival still to answer. */
function seatAtVaultDoor(adapter: MemoryAdapter = createMemoryAdapter()) {
    return createFixtureStore(
        { id: 'labyrinth-door', seed: 'labyrinth-door', world: { continent: 'northern-continent', map: 'lantern-deep', node: 'ld-15' } },
        { adapter },
    );
}

function where(store: AppStore): { continent: string; map: string; node: string } {
    const w = store.getState().world;
    return { continent: w.currentContinent.name, map: w.currentMap.name, node: w.currentMap.currentNode };
}

/** What a save round-trip hands back: the last save, through JSON. */
function lastSave(adapter: MemoryAdapter): GameState {
    const saved = adapter.load();
    if (!saved) throw new Error('nothing was saved');
    return JSON.parse(JSON.stringify(saved)) as GameState;
}

const AT_THE_DOOR = { continent: 'northern-continent', map: 'lantern-deep', node: 'ld-15' };

describe('the sealed vault door (THE REVAMP R3a, D54)', () => {
    it('arriving on the vault door opens no visit and leaves the player at the door', () => {
        const { store, actions } = seatAtVaultDoor();

        actions.resolveCurrentMapEvent();

        expect(store.getState().labyrinthUi.session).toBeNull();
        expect(where(store)).toEqual(AT_THE_DOOR);
        expect(store.getState().labyrinth?.returnWorld).toBeUndefined();
    });
});

// SKIP-ISSUE: #417
describe.skip('the Labyrinth door (M4, D24) — parked (D54)', () => {
    it('arriving on the vault door enters act I of the Aporia', () => {
        const { store, actions } = seatAtVaultDoor();

        expect(actions.resolveCurrentMapEvent()).toBe(true);

        const state = store.getState();
        expect(state.labyrinthUi.session?.actId).toBe('act1');
        expect(where(store)).toMatchObject({ continent: 'labyrinth-continent', map: 'aporia-colonnade', node: 'ap1-1' });
        // The entrance plays its line (the act's authored override), not the door.
        expect(state.event.pending?.event.kind).toBe('cutscene');
        expect(state.notifications?.toast?.text).toMatch(/round door turns/);
    });

    it('leaving the Aporia returns the player to the vault door, which stays a door', () => {
        const { store, actions } = seatAtVaultDoor();
        actions.resolveCurrentMapEvent();

        actions.exitLabyrinth();

        expect(store.getState().labyrinthUi.session).toBeNull();
        expect(where(store)).toEqual(AT_THE_DOOR);
        const map = store.getState().world.currentMap;
        expect(map.consumedNodes).not.toContain('ld-15');
        expect(map.availableNodes).toEqual(expect.arrayContaining(['ld-16', 'ld-17']));
        // The return point is spent with the visit.
        expect(store.getState().labyrinth?.returnWorld).toBeUndefined();
    });

    it('the entry is a checkpoint that carries the way back', () => {
        const adapter = createMemoryAdapter();
        const { actions } = seatAtVaultDoor(adapter);
        actions.resolveCurrentMapEvent();

        const saved = lastSave(adapter);
        expect(saved.world.currentContinent.name).toBe('labyrinth-continent');
        expect(saved.labyrinth?.returnWorld?.currentMap.name).toBe('lantern-deep');
        expect(saved.labyrinth?.returnWorld?.currentMap.currentNode).toBe('ld-15');
    });

    it('a save loaded from a slot resumes the visit, and its exit still reaches the door', () => {
        const adapter = createMemoryAdapter();
        const { actions } = seatAtVaultDoor(adapter);
        actions.resolveCurrentMapEvent();
        const saved = lastSave(adapter);

        const store = createAppStore({ adapter: createMemoryAdapter() });
        hydrateStoreWithGameState(store, saved);

        expect(store.getState().labyrinthUi.session?.actId).toBe('act1');
        expect(where(store).map).toBe('aporia-colonnade');
        createAppActions(store).exitLabyrinth();
        expect(where(store)).toEqual(AT_THE_DOOR);
    });

    it('a cold boot over a save taken inside resumes the visit too', () => {
        const adapter = createMemoryAdapter();
        const { actions } = seatAtVaultDoor(adapter);
        actions.resolveCurrentMapEvent();

        const store = createAppStore({ adapter: createMemoryAdapter(lastSave(adapter)) });

        expect(store.getState().labyrinthUi.session?.actId).toBe('act1');
        createAppActions(store).exitLabyrinth();
        expect(where(store)).toEqual(AT_THE_DOOR);
    });

    it('a save on the overworld boots with no visit open', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(seatAtVaultDoor().state) });
        expect(store.getState().labyrinthUi.session).toBeNull();
    });

    it('a second visit through the door opens the act the player left', () => {
        const { store, actions } = seatAtVaultDoor();
        actions.resolveCurrentMapEvent();
        // The descent (act I's boss) moves the durable progress on to act II.
        actions.labyrinthRecordBossOutcome('spared');
        expect(store.getState().labyrinthUi.session?.actId).toBe('act2');
        actions.exitLabyrinth();
        expect(where(store)).toEqual(AT_THE_DOOR);

        actions.resolveCurrentMapEvent();

        expect(store.getState().labyrinthUi.session?.actId).toBe('act2');
        actions.exitLabyrinth();
        expect(where(store)).toEqual(AT_THE_DOOR);
    });

    it('a run reset inside the Aporia drops the return point with the visit', () => {
        const { store, actions } = seatAtVaultDoor();
        actions.resolveCurrentMapEvent();

        actions.resetRun({ keepCharacter: true });

        expect(store.getState().labyrinthUi.session).toBeNull();
        expect(store.getState().labyrinth?.returnWorld).toBeUndefined();
    });
});
