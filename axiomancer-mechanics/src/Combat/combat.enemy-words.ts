/**
 * ENEMY WORDS: the soak and cut helpers every damage and GUARD site shares.
 *
 *   WARD n        the foe's GUARD: it soaks your DEALs before its VITAE, and
 *                 is gone at the start of the foe's next turn. Only the part
 *                 of a DEAL before VULNERABLE meets it, so VULNERABLE's extra
 *                 always gets through; LEECH, INFERNO, STORM and every other
 *                 plain VITAE loss skip it.
 *   BRINE n       each GUARD you gain is cut by n (never below 0) until the
 *                 end of your next turn.
 *
 * Pure and dependency-free (types only), so the engine and the card-program
 * runtime both call it. The words that land, tick and fade live in
 * `combat.enemy-words.resolve.ts`.
 */

import type { CombatEncounterState, CombatEvent, EnemyWordsState } from './combat.encounter.types';

/** Why a FREE line is refused while TANGLE holds (the engine's refusal and the board's ribbon). */
export const TANGLE_FREE_REFUSAL = 'tangled, the next cards cannot use their FREE line, pay with a die';

/** A fresh, empty words state. */
export function initEnemyWords(): EnemyWordsState {
    return { ward: 0, brine: 0, leechTurns: 0, leechPotency: 0 };
}

/** The fight's words state, all zero when absent. */
export function wordsOf(state: Pick<CombatEncounterState, 'enemyWords'>): EnemyWordsState {
    return state.enemyWords ?? initEnemyWords();
}

/**
 * WARD meets one DEAL. `preVuln` is the hit before VULNERABLE, `dealt` after
 * it; WARD soaks at most `min(preVuln, dealt)`, so VULNERABLE's extra passes.
 * Returns the VITAE the hit still deals, what WARD soaked and the WARD left.
 */
export function wardSoak(ward: number, preVuln: number, dealt: number): { dealt: number; soaked: number; ward: number } {
    const soaked = Math.max(0, Math.min(ward, preVuln, dealt));
    return { dealt: dealt - soaked, soaked, ward: ward - soaked };
}

/**
 * Applies WARD to one DEAL on the encounter: returns the hit left and the
 * state with the WARD spent, pushing a `soaked` event when it took any.
 */
export function soakDealWithWard(
    state: CombatEncounterState, preVuln: number, dealt: number, events: CombatEvent[],
): { state: CombatEncounterState; dealt: number } {
    const words = state.enemyWords;
    if (!words || words.ward <= 0 || dealt <= 0) return { state, dealt };
    const r = wardSoak(words.ward, preVuln, dealt);
    if (r.soaked <= 0) return { state, dealt };
    events.push({ kind: 'enemy-word', word: 'ward', op: 'soaked', amount: r.soaked });
    return { state: { ...state, enemyWords: { ...words, ward: r.ward } }, dealt: r.dealt };
}

/** The foe's veil halves one HEAL of yours (rounded down) until its next turn. */
export function veilHeal(state: Pick<CombatEncounterState, 'enemyRiders'>, amount: number): number {
    return state.enemyRiders?.veil && amount > 0 ? Math.floor(amount / 2) : amount;
}

/** BRINE meets one GUARD gain: the gain left after the cut. */
export function brineCut(state: Pick<CombatEncounterState, 'enemyWords'>, gain: number): number {
    const brine = state.enemyWords?.brine ?? 0;
    if (gain <= 0 || brine <= 0) return Math.max(0, gain);
    return Math.max(0, gain - brine);
}

/** Cuts one GUARD gain by BRINE, pushing a `cut` event when it took any. */
export function cutGuardGain(state: Pick<CombatEncounterState, 'enemyWords'>, gain: number, events: CombatEvent[]): number {
    const left = brineCut(state, gain);
    if (left < gain) events.push({ kind: 'enemy-word', word: 'brine', op: 'cut', amount: gain - left });
    return left;
}
