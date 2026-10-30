/**
 * HP PHASES — the lines a `phases` foe changes phase at.
 *
 * A normal has 2 phases (one line at 30%), an elite 3 (60%, 30%), a boss 4
 * (75%, 50%, 25%). A foe is past a line when its VITAE is at or below that
 * fraction of its max. The engine advances at most one phase per turn
 * boundary, so a hit that crosses two lines enters one phase now and the next
 * at the following boundary.
 */

import type { Enemy, EnemyDifficulty } from './types';

/** The tier a foe's phase lines come from. */
export type EnemyPhaseTier = 'normal' | 'elite' | 'boss';

/** The VITAE fractions each tier changes phase at, highest first. */
export const PHASE_LINES: Readonly<Record<EnemyPhaseTier, readonly number[]>> = Object.freeze({
    normal: Object.freeze([0.3]),
    elite: Object.freeze([0.6, 0.3]),
    boss: Object.freeze([0.75, 0.5, 0.25]),
});

/** The level a tier's move numbers are authored at (the Appendix numbers). */
export const PHASES_AUTHORED_LEVEL: Readonly<Record<EnemyPhaseTier, number>> = Object.freeze({
    normal: 2,
    elite: 3,
    boss: 2,
});

/** Maps a difficulty to its phase tier: boss and unique are bosses, elite is
 *  elite, everything else (simple, normal, absent) is normal. */
export function enemyPhaseTier(difficulty: EnemyDifficulty | undefined): EnemyPhaseTier {
    if (difficulty === 'boss' || difficulty === 'unique') return 'boss';
    if (difficulty === 'elite') return 'elite';
    return 'normal';
}

/** True when the foe declares the phase model. */
export function hasEnemyPhases(enemy: Pick<Enemy, 'phases'>): boolean {
    return (enemy.phases?.length ?? 0) > 0;
}

/** How many of its tier's lines the foe's VITAE is at or below. */
export function enemyPhaseLinesCrossed(enemy: Pick<Enemy, 'difficulty' | 'health' | 'maxHealth'>): number {
    if (enemy.maxHealth <= 0) return 0;
    return PHASE_LINES[enemyPhaseTier(enemy.difficulty)]
        .filter(line => enemy.health <= line * enemy.maxHealth).length;
}

/**
 * The phase the foe's VITAE says it belongs in (0-based), capped at its last
 * authored phase. The engine walks toward it one phase per boundary and never
 * walks back (a MEND above a line does not revert a phase).
 */
export function enemyPhaseTarget(enemy: Pick<Enemy, 'difficulty' | 'health' | 'maxHealth' | 'phases'>): number {
    const count = enemy.phases?.length ?? 0;
    if (count === 0) return 0;
    return Math.min(enemyPhaseLinesCrossed(enemy), count - 1);
}

/** True when the escalation clock applies to this foe: every foe without
 *  `phases`, and a boss-tier foe with them. */
export function escalationApplies(enemy: Pick<Enemy, 'difficulty' | 'phases'>): boolean {
    return !hasEnemyPhases(enemy) || enemyPhaseTier(enemy.difficulty) === 'boss';
}
