/**
 * Main-menu store actions — the first screen after the title is CONTINUE /
 * NEW GAME / LOAD GAME / SETTINGS over three slots.
 *
 * The store is created ONCE at app boot (`GameStoreProvider`) over whatever
 * the persistence adapter's `load()` returned. Switching runs at the menu
 * therefore means REPLACING the engine state inside the live store, not
 * building a second store: every screen, gate and hook keeps the store
 * reference it already holds and simply re-renders over the new state.
 *
 * `hydrateStoreWithGameState` is that replacement. It is the one place that
 * knows the full list of mobile-only slices, because a loaded run must not
 * inherit the previous run's open event, pending reward, hazard session or
 * event buffer. The one slice it rebuilds rather than empties is the
 * Labyrinth visit: a save taken inside the Aporia resumes there
 * (`resumeLabyrinthSession`). It also restores the engine RNG from the loaded state, as
 * `createGameStore` does at boot, so a loaded run replays deterministically.
 *
 * Every verb here is `(store, slots, …)`: the slot store is passed in, not
 * imported, so tests and fixture boots substitute the in-memory one.
 *
 * Functions (lowest → highest abstraction):
 *   hydrateStoreWithGameState(store, state)   swap the engine state; reset UI slices; restore RNG
 *   startNewGameAction(store, slots, slot)     fresh state → slot; saved at once
 *   loadGameAction(store, slots, slot)         a slot's saved state → the store
 *   continueGameAction(store, slots)           loadGame on the most recent slot
 *   returnToTitleAction(store, slots)          save + flush so the menu is current
 */

import {
    createNewGameState, getLogger, getRng,
    type CharacterDefinition, type GameState, type MapName,
} from '@mechanics';

import { resumeLabyrinthSession } from '../labyrinth/resume';
import type { SaveSlotId, SaveSlotStore } from '../persistence/saveSlots';
import { mostRecentSlot } from '../persistence/saveSlots';
import {
    DEFAULT_NOTIFICATIONS_SLICE,
    EMPTY_BLACKSMITH_SLICE,
    EMPTY_CACHE_SLICE,
    EMPTY_COMBAT_REWARD_SLICE,
    EMPTY_EVENT_SLICE,
    EMPTY_HAZARD_SLICE,
    EMPTY_ITEM_REWARD_SLICE,
    EMPTY_LABYRINTH_SLICE,
    EMPTY_REST_SLICE,
    EMPTY_QUEST_SLICE,
    type AppStore,
    type AppStoreState,
} from '../store';

/**
 * Replace the engine state held by `store` with `next` and reset every
 * mobile-only slice to its empty value.
 *
 * `currentEncounter` is OPTIONAL on `GameState`; it is written explicitly
 * (possibly as `undefined`) so a run that has none does not inherit the
 * previous run's value through the merge. Pure over its inputs apart from the store write and the RNG reset.
 */
export function hydrateStoreWithGameState(store: AppStore, next: GameState): void {
    if (typeof next.rngState === 'number') getRng().setState(next.rngState);
    const resumed = resumeLabyrinthSession(next);
    const patch: Partial<AppStoreState> = {
        ...next,
        currentEncounter: next.currentEncounter,
        event: EMPTY_EVENT_SLICE,
        combatReward: EMPTY_COMBAT_REWARD_SLICE,
        itemReward: EMPTY_ITEM_REWARD_SLICE,
        hazard: EMPTY_HAZARD_SLICE,
        rest: EMPTY_REST_SLICE,
        quest: EMPTY_QUEST_SLICE,
        cache: EMPTY_CACHE_SLICE,
        blacksmith: EMPTY_BLACKSMITH_SLICE,
        // A save taken inside the Aporia resumes there.
        labyrinthUi: resumed ? { session: resumed } : EMPTY_LABYRINTH_SLICE,
        notifications: DEFAULT_NOTIFICATIONS_SLICE,
        _recentEvents: [],
    };
    store.setState(patch);
}

/**
 * NEW GAME into `slot`: build a fresh state (THE VERY START — no items, no
 * coin, no XP; see the engine's `createNewGameState`), make `slot` the
 * active slot, swap the state in, and save at once so the slot exists on
 * disk before the player takes a single step (CONTINUE must find it even if
 * the app is killed on the first screen).
 *
 * Overwriting an occupied slot is the CALLER's decision (the slot screen
 * confirms it); this verb does not check.
 *
 * `startMap` (dev tools only) starts the fresh game on another campaign map
 * instead of the default start (the Breakwater). The player
 * path never passes it.
 *
 * `characterId` opens the run as a roster character (its relic worn, its
 * stats and deck dealt; see the engine's `createNewGameState`). Absent, the
 * run has no character, as before. `roster` replaces the engine's roster
 * (tests pass a fixture character; the player path never passes it).
 */
export function startNewGameAction(
    store: AppStore,
    slots: SaveSlotStore,
    slot: SaveSlotId,
    startMap?: MapName,
    characterId?: string,
    roster?: readonly CharacterDefinition[],
): GameState {
    const fresh = createNewGameState({ startMap, characterId, roster });
    slots.selectSlot(slot);
    hydrateStoreWithGameState(store, fresh);
    try {
        store.getState().save();
    } catch {
        /* persistence must not block the start of a run */
    }
    getLogger().info('persistence', 'new-game', { slot, runId: fresh.runId, startMap: fresh.world.currentMap.name });
    return fresh;
}

/**
 * LOAD GAME from `slot`. Returns `false` (and changes nothing) when the slot
 * is empty or unreadable — the slot screen disables those rows, so this is
 * a guard, not a path.
 */
export function loadGameAction(store: AppStore, slots: SaveSlotStore, slot: SaveSlotId): boolean {
    const saved = slots.readSlot(slot);
    if (saved === null) {
        getLogger().warn('persistence', 'load-game-empty', { slot });
        return false;
    }
    slots.selectSlot(slot);
    hydrateStoreWithGameState(store, saved);
    getLogger().info('persistence', 'load-game', { slot, runId: saved.runId, level: saved.player.level });
    return true;
}

/**
 * CONTINUE: load the most recently written slot. `false` when no slot is
 * saved (the menu hides CONTINUE in that case).
 */
export function continueGameAction(store: AppStore, slots: SaveSlotStore): boolean {
    const slot = mostRecentSlot(slots.listSlots());
    if (slot === null) return false;
    return loadGameAction(store, slots, slot);
}

/**
 * Leave a run for the title: take a save and push it to disk so the menu's
 * slot rows (and a later CONTINUE) see exactly the state the player left.
 * Never throws — a failed save must not trap the player in the run.
 */
export async function returnToTitleAction(store: AppStore, slots: SaveSlotStore): Promise<void> {
    try {
        store.getState().save();
    } catch {
        /* a failed save must not trap the player in the run */
    }
    try {
        await slots.flush?.();
    } catch {
        /* nothing useful to do on the way out */
    }
}
