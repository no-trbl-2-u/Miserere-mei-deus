import { ENEMY_REGISTRY, deepClone, type Enemy } from '@mechanics';

/**
 * Placeholder foe the combat-encounter screen bootstraps when no combat is
 * in progress (also the default foe in combat tests). It clones the
 * library's Green Jelly and owns no stats of its own, so mock-driven
 * surfaces show the same numbers a real fight would.
 */
export function createMockEncounterEnemy(): Enemy {
    return deepClone(ENEMY_REGISTRY['green-jelly']);
}
