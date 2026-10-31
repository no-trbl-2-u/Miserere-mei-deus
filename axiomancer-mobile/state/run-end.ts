/**
 * Where a finished run sends the player (phase CH1i).
 *
 * A run end (the second death on the map or at a hazard, a Labyrinth defeat)
 * leaves the engine's run-over state in the store (`GameState.runOver`: no
 * character, the codex kept). Every path that meets it routes to the Game Over
 * screen, then character select for the slot, whose CONFIRM starts the next run with that codex.
 *
 * Pure: the callers own the router and the save.
 */

import type { GameState } from '@mechanics';

import type { SaveSlotId } from './persistence/saveSlots';

/** The query flag character select reads to start the next run with the slot's codex. */
export const RUN_END_PARAM = 'runEnd';

/**
 * Character select for a finished run in `slot`. With no active slot (a
 * fixture boot) the slot list is the only honest place to begin again.
 */
export function characterSelectRunEndRoute(slot: SaveSlotId | null): string {
    if (slot === null) return '/saves?mode=new';
    return `/character-select?slot=${slot}&${RUN_END_PARAM}=1`;
}

/**
 * Where a run end first lands (phase CH1j): the Game Over screen for the
 * slot, whose button opens `characterSelectRunEndRoute`. The caller arms it
 * (`armGameOver`); unarmed, the screen goes on to character select at once.
 */
export function runEndRoute(slot: SaveSlotId | null): string {
    if (slot === null) return '/saves?mode=new';
    return `/game-over?slot=${slot}`;
}

/** Whether the state is a finished run waiting on a new character. */
export function isRunOver(state: Pick<GameState, 'runOver'>): boolean {
    return state.runOver === true;
}

/**
 * The route a loaded slot opens: character select for a finished run, else
 * the run's own `fallback` route (the active tab).
 */
export function entryRoute(
    state: Pick<GameState, 'runOver'>,
    slot: SaveSlotId | null,
    fallback: string,
): string {
    return isRunOver(state) ? characterSelectRunEndRoute(slot) : fallback;
}
