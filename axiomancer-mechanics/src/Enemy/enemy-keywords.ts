/**
 * ENEMY KEYWORDS AND STAGES.
 *
 * The words a `phases` foe's moves may carry, each with a live counter its
 * gloss names: WARD (the foe's own GUARD), MEND (it heals), SCOUR (it strips
 * a status off itself), BRINE (your GUARD gains are cut), and the player's own
 * VULNERABLE and LEECH landing on the player. Each word is a field on
 * `EnemyMove` (`Enemy/types.ts`); `moveKeywords` reads them back, so a foe's
 * words are always the words its moves resolve. The engine resolves them in
 * `Combat/combat.enemy-words.ts`.
 */

import type { EnemyMove } from './types';

/** Every enemy keyword, in gloss order. */
export const ENEMY_KEYWORDS = ['ward', 'mend', 'scour', 'brine', 'vulnerable', 'leech'] as const;

/** A keyword carried by an enemy move. */
export type EnemyKeyword = (typeof ENEMY_KEYWORDS)[number];

/** The keywords one move carries, in `ENEMY_KEYWORDS` order. */
export function moveKeywords(move: EnemyMove): EnemyKeyword[] {
    const has: Record<EnemyKeyword, boolean> = {
        ward: (move.ward ?? 0) > 0,
        mend: (move.enemyHeal ?? 0) > 0,
        scour: (move.enemyCleanse ?? 0) > 0,
        brine: (move.brine ?? 0) > 0,
        vulnerable: (move.vulnerable?.pct ?? 0) > 0 && (move.vulnerable?.turns ?? 0) > 0,
        leech: (move.leech ?? 0) > 0,
    };
    return ENEMY_KEYWORDS.filter(k => has[k]);
}

/** The keywords a foe's `phases` moves carry (its DANGER moves included). */
export function enemyPhaseKeywords(enemy: { phases?: { moves: EnemyMove[]; danger?: EnemyMove }[] }): EnemyKeyword[] {
    const found = new Set<EnemyKeyword>();
    for (const phase of enemy.phases ?? []) {
        for (const move of [...phase.moves, ...(phase.danger ? [phase.danger] : [])]) {
            for (const k of moveKeywords(move)) found.add(k);
        }
    }
    return ENEMY_KEYWORDS.filter(k => found.has(k));
}

/**
 * A boss/unique STAGE — the moment a fight becomes a different fight.
 *
 * Modelled on Cthulhu: Death May Die's Elder One progression and Aeon's End's
 * tiered nemesis escalation: the foe crosses a printed threshold and changes
 * shape, loudly. The first stage whose `at` is satisfied fires; each stage
 * fires at most once per combat, checked at phase boundaries.
 */
export interface EnemyStage {
    /** Trigger. `vitaePct` is the fraction of max VITAE at or below which it
     *  fires (0.6 = "at 60% or lower"); `round` fires on that round or later.
     *  Both may be set — whichever is satisfied first wins. */
    at: { vitaePct?: number; round?: number };
    /** The stage's name, shouted into the log: `THE COURT ADJOURNS`. */
    name: string;
    /** One telegraphed line printed in the log and on the enemy pane. */
    text: string;
    /** Strip every affliction the player has landed on it. */
    cleanse?: boolean;
    /** Heal a flat amount, or a fraction of max VITAE. */
    heal?: number | { pct: number };
    /** Added to every subsequent phase's damage weight. */
    threatBonus?: number;
}
