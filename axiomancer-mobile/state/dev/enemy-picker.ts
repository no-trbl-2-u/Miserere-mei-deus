/**
 * Dev-only ENEMY PICKER helpers.
 *
 * Lets a tester fight ANY authored foe from ANY map — including the
 * region boss (The Death Beholder), which no map pool draws (it is pinned
 * per-node), so the `library` roster lists every production foe — by staging the same `combat-prelude` event the
 * live exploration path produces, so `<CombatGate>` engages it and the
 * fight pays out real rewards through `endCombat`.
 *
 * Functions:
 *   listEnemyMaps()               map keys with a roster, then `library`
 *   listEnemies(mapKey)           roster sorted by level, bosses flagged
 *   stageEncounter(store, enemy)  seed `event.pending` with a combat
 *                                 prelude for `enemy`
 *
 * `stageEncounter` is the single source of truth for the dev prelude
 * shape; `DebugTriggerEncounter` reuses it.
 */

import { EnemiesByMap, EnemyLibrary } from '@mechanics';
import type { Enemy } from '@mechanics';

import { EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';

/** The pseudo-roster holding every production foe (`EnemyLibrary`). */
export const LIBRARY_ROSTER = 'library' as const;

/** A map key that has an enemy roster, or the whole-library roster. */
export type EnemyMapKey = keyof typeof EnemiesByMap | typeof LIBRARY_ROSTER;

/** One selectable foe. */
export interface EnemyChoice {
    readonly enemy: Enemy;
    readonly isBoss: boolean;
    /** `name · L<level>` for chip labels. */
    readonly label: string;
}

/** Map keys with a roster, in library order, then the whole-library roster. */
export function listEnemyMaps(): readonly EnemyMapKey[] {
    return [...(Object.keys(EnemiesByMap) as EnemyMapKey[]), LIBRARY_ROSTER];
}

/** Whether a foe is boss-tier (drives the KNEEL / STRIKE prelude chrome). */
export const isBossEnemy = (e: Enemy): boolean => e.difficulty === 'boss';

/** Roster for `mapKey`, lowest level first, bosses last within a level. */
export function listEnemies(mapKey: EnemyMapKey): readonly EnemyChoice[] {
    const roster: readonly Enemy[] =
        mapKey === LIBRARY_ROSTER ? EnemyLibrary : (EnemiesByMap[mapKey] ?? []);
    return [...roster]
        .sort((a, b) => a.level - b.level || Number(isBossEnemy(a)) - Number(isBossEnemy(b)) || a.health - b.health)
        .map((enemy) => ({ enemy, isBoss: isBossEnemy(enemy), label: `${enemy.name} · L${enemy.level}` }));
}

/**
 * Seed a combat prelude for `enemy` onto the event slice. The overlay
 * on the WILDS tab observes `event.pending` and engages; the fight then
 * runs through `beginHazardEncounter` → `startCombat` like any live one.
 * `origin` tags the encounter for logs (`dev:enemy-picker` by default);
 * `isBoss` defaults to the foe's own tier but can be forced (the quick
 * BOSS trigger keeps boss chrome even when a map has no boss-tier row).
 */
export function stageEncounter(store: AppStore, enemy: Enemy, origin = 'dev:enemy-picker', isBoss = isBossEnemy(enemy)): void {
    store.setState({
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: {
                state: store.getState(),
                event: { kind: 'encounter', encounter: { enemies: [enemy], origin }, isBoss },
            } as never,
            sourceNodeType: isBoss ? 'boss' : 'encounter',
        },
    });
}
