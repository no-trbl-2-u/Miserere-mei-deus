/**
 * The tier a node's fight is staged at.
 *
 * A foe has its own `difficulty`, and a node reads it unless the node's
 * payload names another: an elite slot holds a foe that is a normal
 * elsewhere (the Green Jelly) and stages it as an elite, so the elite's
 * reward, respawn, quest kills and phase lines all follow the slot. One
 * reader for every place that asks "is this node's fight an elite".
 */

import { ENEMY_REGISTRY, type EnemySlug } from '../Enemy/enemy.library';
import { DEFAULT_XP_BY_DIFFICULTY, enemyVitae } from '../Enemy';
import type { Enemy, EnemyDifficulty } from '../Enemy/types';
import type { EncounterPayload } from './MapEvents/types';

/** The difficulty a payload's fight is staged at: its own, else its foe's. */
export function payloadDifficulty(
    payload: Pick<EncounterPayload, 'enemySlug' | 'difficulty'>,
): EnemyDifficulty | undefined {
    return payload.difficulty ?? ENEMY_REGISTRY[payload.enemySlug as EnemySlug]?.difficulty;
}

/**
 * The foe as a slot stages it: the registry foe re-tiered to `difficulty`
 * (its VITAE pool and default XP follow the new tier), or the foe itself when
 * the slot names no other tier.
 */
export function sourceAtTier(source: Enemy, difficulty: EnemyDifficulty | undefined): Enemy {
    if (!difficulty || difficulty === source.difficulty) return source;
    return {
        ...source,
        authoredDifficulty: source.authoredDifficulty ?? source.difficulty,
        difficulty,
        maxHealth: enemyVitae(source.level, difficulty),
        xpReward: source.level * DEFAULT_XP_BY_DIFFICULTY[difficulty],
    };
}
