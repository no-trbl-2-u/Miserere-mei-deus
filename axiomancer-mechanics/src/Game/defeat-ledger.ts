/**
 * The defeat ledger: the foe slugs the player has beaten, by a win or a
 * befriend. It lives on `codex.defeatedEnemies`, an optional field, so a
 * save written before it loads and reads as "none beaten".
 */

import type { Enemy } from '../Enemy/types';
import { ENEMY_REGISTRY } from '../Enemy/enemy.library';
import type { EnemySlug } from '../Enemy/enemy.library';
import type { GameState } from './types';

const ENEMY_ID_PREFIX = 'enemy-';

/** The registry slug of `enemy` (its id minus `enemy-`), or undefined for a foe the registry does not hold. */
export function enemySlugOf(enemy: Pick<Enemy, 'id'>): EnemySlug | undefined {
    if (!enemy.id.startsWith(ENEMY_ID_PREFIX)) return undefined;
    const slug = enemy.id.slice(ENEMY_ID_PREFIX.length);
    return Object.prototype.hasOwnProperty.call(ENEMY_REGISTRY, slug) ? (slug as EnemySlug) : undefined;
}

/** Every slug the save records as beaten; empty for a save that predates the ledger. */
export function defeatedEnemies(state: Pick<GameState, 'codex'>): readonly EnemySlug[] {
    return state.codex.defeatedEnemies ?? [];
}

/** True when the save records `slug` as beaten. */
export function hasDefeatedEnemy(state: Pick<GameState, 'codex'>, slug: EnemySlug): boolean {
    return defeatedEnemies(state).includes(slug);
}
