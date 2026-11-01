/**
 * Hazard puzzle demo — the store side. The board holds its puzzle session in
 * local state (a puzzle is never saved, like a mid-hazard dev entry); only
 * the outcome touches the game state, through the engine's claim:
 * XP through the reducer (so level-ups fire), items through `grantItem`, the
 * scar as a `hazard-scar:` flag a rest mends, VITAE never below 1.
 */

import {
    claimHazardPuzzleOutcome,
    hazardPuzzleOutcome,
    type GameState,
    type HazardPuzzleLayout,
    type HazardPuzzleOutcome,
    type HazardRouteKey,
} from '@mechanics';

import { resolveMinigameSeed } from '../minigame-seeds';
import { recordHazardEnded, recordItemGained, recordNodeResolved, recordProgress } from '../run-log';
import type { AppStore } from '../store';

export interface ClaimHazardPuzzleResult {
    outcome: HazardPuzzleOutcome;
    vitaeLost: number;
    scarApplied: number;
}

/**
 * Turns a resolve into its outcome and applies it to the player. `seed`
 * pins the loot roll (tests and smoke runs); otherwise the shared minigame
 * seed resolver picks one.
 */
export function claimHazardPuzzleAction(
    store: AppStore,
    layout: HazardPuzzleLayout,
    route: HazardRouteKey,
    p: number,
    seed?: number,
): ClaimHazardPuzzleResult {
    const state = store.getState() as unknown as GameState;
    const outcome = hazardPuzzleOutcome({
        route,
        result: { p },
        playerLevel: state.player.level,
        region: layout.region,
        seed: resolveMinigameSeed('hazard', seed, globalThis.__AXM_HAZARD_SEED__),
    });
    const claim = claimHazardPuzzleOutcome(state, outcome);
    store.setState({ player: claim.state.player, flags: claim.state.flags } as never);
    try {
        store.getState().save();
    } catch {
        // Persistence failures must not strand the player on the outcome panel.
    }
    // The run log: the crossing, the VITAE on either side of it, and the XP, levels and items it paid.
    recordHazardEnded(store, {
        hazardId: layout.id,
        cleared: outcome.completed,
        vitaeBefore: state.player.health,
        vitaeAfter: claim.state.player.health,
    });
    recordNodeResolved(store, outcome.completed ? 'hazard-cleared' : 'hazard-failed');
    recordProgress(store, state.player, 'hazard');
    for (const item of outcome.items) recordItemGained(store, item, 'hazard');
    return { outcome, vitaeLost: claim.vitaeLost, scarApplied: claim.scarApplied };
}
