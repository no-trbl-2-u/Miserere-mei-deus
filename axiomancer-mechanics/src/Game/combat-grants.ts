/**
 * Victory-grant helpers shared by `gameReducer` and `createGameStore`.
 *
 * The store tallies XP and shillings before dispatching `END_COMBAT` so that
 * `endCombat()` can return a populated `CombatEndReport` referring to the
 * exact same grants the reducer then applies. The reducer falls back to these
 * helpers when no grants are supplied (callers that dispatch `END_COMBAT`
 * directly without going through the store).
 */

import { Encounter } from '../World/types';
import { fightWage } from '../Combat/combat.mercy-check';

/**
 * Stack-aware inventory append.
 *
 * The rule moved down to the Items layer (`Items/item.reducer.ts`) so the
 * shared grant path (`Items/item-grant.ts`) and this victory-loot fold ask the
 * same function what "stacks" means. Re-exported here unchanged — signature and
 * behaviour are identical, and `game.reducer.ts` keeps importing it from this
 * module.
 */
export { addItemStacking } from '../Items/item.reducer';

/** The shillings a win over this encounter pays, on its lead foe's level. */
export function encounterWage(encounter: Encounter): number {
    return fightWage(encounter.enemies[0]?.level ?? 0);
}

/** Total XP across every enemy in the encounter (missing values = 0). */
export function totalEncounterXp(encounter: Encounter): number {
    return encounter.enemies.reduce((sum, e) => sum + (e.xpReward ?? 0), 0);
}
