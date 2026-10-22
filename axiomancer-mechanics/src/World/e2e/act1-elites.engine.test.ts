/**
 * Act 1's fights.
 *
 * Every Act 1 region's door fight — the map's last fight
 * column — is the Death Beholder as a boss; each region keeps one mid-region
 * node pinned to its one elite, the Brine Hag. Every other fight is Float-Eye.
 *
 * Every Act 1 fight is pinned low, and the elite is too: an
 * unpinned elite would scale to its own roster level (7 and up).
 */

import { describe, expect, it } from 'vitest';

import { getMapDefinition, getNodeEventPool } from '../index';
import { ENEMY_REGISTRY } from '../../Enemy/enemy.library';
import type { Enemy } from '../../Enemy/types';

const ACT1_MAPS = [
    ['coastal-continent', 'breakwater'],
    ['coastal-continent', 'charcoal-wood'],
    ['northern-continent', 'beacon-crags'],
    ['northern-continent', 'lantern-deep'],
] as const;

describe.each(ACT1_MAPS)('Act 1 fights on %s / %s (D30, D61)', (continent, mapName) => {
    const map = getMapDefinition(continent, mapName);
    const roster = new Map(Object.entries(ENEMY_REGISTRY as Record<string, Enemy>));
    const fights = map.nodes.flatMap(node => {
        const payload = getNodeEventPool(continent, mapName, node.id)?.entries[0]?.payload;
        if (payload?.kind !== 'encounter') return [];
        return [{ node, payload, foe: roster.get(payload.enemySlug!) }];
    });

    it('has exactly one boss — the Death Beholder, on the last fight column (D61)', () => {
        const bosses = fights.filter(f => f.payload.isBoss);
        expect(bosses.map(f => f.payload.enemySlug)).toEqual(['death-beholder']);
        const lastColumn = Math.max(...fights.map(f => f.node.location[0]));
        expect(bosses[0]!.node.location[0]).toBe(lastColumn);
    });

    it('stages exactly one elite — the Brine Hag — before the door', () => {
        const elites = fights.filter(f => f.foe?.difficulty === 'elite');
        expect(elites.map(f => f.payload.enemySlug)).toEqual(['brine-hag']);
        const lastColumn = Math.max(...fights.map(f => f.node.location[0]));
        expect(elites[0]!.node.location[0]).toBeLessThan(lastColumn);
    });

    it('every other fight is Float-Eye', () => {
        const rest = fights.filter(f => !f.payload.isBoss && f.foe?.difficulty !== 'elite');
        expect(rest.length).toBeGreaterThan(0);
        for (const f of rest) expect(f.payload.enemySlug, f.node.id).toBe('float-eye');
    });

    it('pins the elite to an Act 1 level', () => {
        const elite = fights.find(f => f.foe?.difficulty === 'elite')!;
        expect(elite.payload.level).toBeGreaterThanOrEqual(2);
        expect(elite.payload.level).toBeLessThanOrEqual(4);
    });
});
