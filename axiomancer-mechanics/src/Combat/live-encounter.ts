/**
 * The live-encounter VITAE knob.
 *
 * Every live encounter in the app scales its foe's VITAE (a testing knob
 * applied at the app's encounter chokepoint, so fights run long enough to
 * exercise a deck). The scale is by the player's level when the fight starts
 * (phase EP1a): a fight at levels 1 to {@link EARLY_ENCOUNTER_MAX_LEVEL}
 * takes {@link EARLY_ENCOUNTER_ENEMY_HP_MULTIPLIER}, so the opening fights end
 * sooner; every later fight, the boss's among them, takes the base
 * {@link LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER}. The engine's own fights and
 * tests use the authored VITAE; the pacing sim (`combat.pacing.sim.ts`)
 * applies the same rule so its turn counts compare with play.
 */

/** The base live-encounter VITAE multiplier: every fight past level {@link EARLY_ENCOUNTER_MAX_LEVEL}. */
export const LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER = 2;

/** The early VITAE multiplier: fights started at levels 1 to {@link EARLY_ENCOUNTER_MAX_LEVEL}. */
export const EARLY_ENCOUNTER_ENEMY_HP_MULTIPLIER = 1.5;

/** The last player level whose fights take the early multiplier. */
export const EARLY_ENCOUNTER_MAX_LEVEL = 3;

/** The foe VITAE multiplier for a live fight started at this player level. */
export function liveEncounterHpMultiplier(playerLevel: number): number {
    return playerLevel <= EARLY_ENCOUNTER_MAX_LEVEL
        ? EARLY_ENCOUNTER_ENEMY_HP_MULTIPLIER
        : LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER;
}
