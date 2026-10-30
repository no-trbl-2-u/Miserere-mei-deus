/**
 * The Act 1 XP ledger: every fight the four Act 1 maps can stage, read from
 * the registered map-event pools, and a walk of it through the XP curve. Its
 * test pins the outcome (a full clear meets each door one level above it and
 * ends at level 5); `npm run act1-progression` prints it. A measurement, not a
 * gated baseline.
 */

import '../World/MapEvents/content';
import type { BaseStats } from '../Character/types';
import { experienceForLevel } from '../Character/experience';
import { ENEMY_REGISTRY, type EnemySlug } from '../Enemy/enemy.library';
import { scaleEnemyToLevel } from '../World/encounter';
import { sourceAtTier } from '../World/encounter-tier';
import type { EnemyDifficulty } from '../Enemy/types';
import { getNodeEventPool } from '../World/MapEvents/resolve-map-event';
import { getMapDefinition } from '../World/map.registry';
import type { ContinentName, MapName } from '../World/map.library';
import { STAT_POINTS_PER_LEVEL } from './game-mechanics.constants';

/** Act 1's maps, in the order a run crosses them. */
export const ACT1_MAPS: ReadonlyArray<{ continent: ContinentName; map: MapName }> = [
    { continent: 'coastal-continent', map: 'breakwater' },
    { continent: 'coastal-continent', map: 'charcoal-wood' },
    { continent: 'northern-continent', map: 'beacon-crags' },
    { continent: 'northern-continent', map: 'lantern-deep' },
];

/** One fight a node can stage. `level` is the pin; unpinned fights scale to the player. */
export interface Act1Fight {
    map: MapName;
    nodeId: string;
    column: number;
    enemySlug: EnemySlug;
    level: number | undefined;
    isBoss: boolean;
    /** The tier the node stages the foe at, when it is not the foe's own. */
    difficulty?: EnemyDifficulty;
}

/**
 * Every Act 1 fight, in crossing order: map by map, column by column, and the
 * door last in its column (a full clear fights the rest of the ring first).
 */
export function act1FightLedger(): Act1Fight[] {
    const out: Act1Fight[] = [];
    for (const { continent, map } of ACT1_MAPS) {
        const fights: Act1Fight[] = [];
        for (const node of getMapDefinition(continent, map).nodes) {
            const pool = getNodeEventPool(continent, map, node.id);
            // A node is one fight: an elite node that draws one of two foes counts its first (same level).
            const entry = pool?.entries.find(e => e.payload.kind === 'encounter' && e.payload.enemySlug);
            if (entry) {
                const payload = entry.payload;
                if (payload.kind !== 'encounter' || !payload.enemySlug) continue;
                fights.push({
                    map, nodeId: node.id, column: node.location[0],
                    enemySlug: payload.enemySlug, level: payload.level, isBoss: payload.isBoss ?? false,
                    ...(payload.difficulty ? { difficulty: payload.difficulty } : {}),
                });
            }
        }
        fights.sort((a, b) => a.column - b.column || Number(a.isBoss) - Number(b.isBoss));
        out.push(...fights);
    }
    return out;
}

/** XP a fight pays a player at `playerLevel` (the encounter handler's scaling). */
export function act1FightXp(fight: Act1Fight, playerLevel: number): number {
    const source = ENEMY_REGISTRY[fight.enemySlug];
    const level = fight.level ?? Math.max(source.level, playerLevel);
    return scaleEnemyToLevel(sourceAtTier(source, fight.difficulty), level).xpReward ?? 0;
}

/** The player's level and XP as they step up to a door fight. */
export interface Act1DoorReading {
    map: MapName;
    nodeId: string;
    playerLevel: number;
    doorLevel: number | undefined;
    experience: number;
}

export interface Act1Walk {
    doors: Act1DoorReading[];
    /** The player's level stepping up to each fight, parallel to the walked list. */
    fightLevels: number[];
    finalLevel: number;
    finalExperience: number;
}

/**
 * Walk `fights` from a fresh level-1 player who wins each one and takes every
 * level-up as soon as it is earned.
 */
export function walkAct1(fights: readonly Act1Fight[]): Act1Walk {
    let level = 1;
    let experience = 0;
    const doors: Act1DoorReading[] = [];
    const fightLevels: number[] = [];
    for (const fight of fights) {
        fightLevels.push(level);
        if (fight.isBoss) {
            doors.push({ map: fight.map, nodeId: fight.nodeId, playerLevel: level, doorLevel: fight.level, experience });
        }
        experience += act1FightXp(fight, level);
        while (experience >= experienceForLevel(level + 1)) level += 1;
    }
    return { doors, fightLevels, finalLevel: level, finalExperience: experience };
}

/** How a stage's stat points are spent: evenly, two-thirds body, or all body. */
export type StatSpread = 'even' | 'body-mind' | 'body';

/** The stats of a level-`level` player who started 5/5/5 and spent every point by `spread`. */
export function stageStats(level: number, spread: StatSpread): BaseStats {
    const points = STAT_POINTS_PER_LEVEL * (Math.max(1, level) - 1);
    if (spread === 'body') return { body: 5 + points, mind: 5, heart: 5 };
    if (spread === 'body-mind') {
        const body = Math.ceil((points * 2) / 3);
        return { body: 5 + body, mind: 5 + points - body, heart: 5 };
    }
    const body = Math.ceil(points / 3);
    const mind = Math.round(points / 3);
    return { body: 5 + body, mind: 5 + mind, heart: 5 + points - body - mind };
}
