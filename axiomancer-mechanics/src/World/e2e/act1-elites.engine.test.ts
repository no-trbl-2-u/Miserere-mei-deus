/**
 * Act 1's fights.
 *
 * Every later Act 1 region's door fight — the map's last fight
 * column — is the Death Beholder as a boss; each keeps one mid-region
 * node pinned to its one elite, the Green Jelly. The Breakwater's Death
 * Beholder is its chapter boss in the sea keep (`bw-k2`), a dead end behind
 * the keep gate, and it stages three Green Jellies, each holding the road
 * past it. Every other Breakwater fight binds the foe and level its
 * `BW_ENCOUNTER_FOES` row names (T's Breakwater table); every other fight
 * elsewhere is Float-Eye.
 *
 * Every Act 1 fight is pinned low, and the elite is too: an
 * unpinned elite would scale to its own roster level (7 and up).
 */

import { describe, expect, it } from 'vitest';

import { getMapDefinition, getNodeEventPool, isEliteNode, eliteRelicDropsAt } from '../index';
import { BREAKWATER_CHAPTER_HELD } from '../Continents/Coastal-Village/breakwater-chapter';
import { ENEMY_REGISTRY } from '../../Enemy/enemy.library';
import { BW_ENCOUNTER_FOES } from '../MapEvents/content';
import type { Enemy } from '../../Enemy/types';

const ACT1_MAPS = [
    ['coastal-continent', 'breakwater'],
    ['coastal-continent', 'charcoal-wood'],
    ['northern-continent', 'beacon-crags'],
    ['northern-continent', 'lantern-deep'],
] as const;

/** Where a map stages its boss and elites when it does not follow the last-column rule. */
const STAGED: Partial<Record<string, { boss: string; elites: readonly string[] }>> = {
    breakwater: { boss: 'bw-k2', elites: ['bw-w5', 'bw-c1', 'bw-l4'] },
};

describe.each(ACT1_MAPS)('Act 1 fights on %s / %s (D30, D61)', (continent, mapName) => {
    const map = getMapDefinition(continent, mapName);
    const staged = STAGED[mapName];
    const roster = new Map(Object.entries(ENEMY_REGISTRY as Record<string, Enemy>));
    const fights = map.nodes.flatMap(node => {
        const payload = getNodeEventPool(continent, mapName, node.id)?.entries[0]?.payload;
        if (payload?.kind !== 'encounter') return [];
        return [{ node, payload, foe: roster.get(payload.enemySlug!) }];
    });

    it('has exactly one boss — the Death Beholder, on the last fight column or where the map stages it (D61)', () => {
        const bosses = fights.filter(f => f.payload.isBoss);
        expect(bosses.map(f => f.payload.enemySlug)).toEqual(['death-beholder']);
        if (staged) {
            expect(bosses[0]!.node.id).toBe(staged.boss);
            expect(bosses[0]!.node.connectedNodes).toEqual([]);
            return;
        }
        const lastColumn = Math.max(...fights.map(f => f.node.location[0]));
        expect(bosses[0]!.node.location[0]).toBe(lastColumn);
    });

    it('stages the Green Jelly as its elite — once before the door, or on each held elite node', () => {
        const elites = fights.filter(f => f.foe?.difficulty === 'elite');
        if (staged) {
            expect(elites.map(f => f.node.id).sort()).toEqual([...staged.elites].sort());
            for (const e of elites) expect(e.payload.enemySlug, e.node.id).toBe('green-jelly');
            for (const id of staged.elites) expect(BREAKWATER_CHAPTER_HELD as readonly string[]).toContain(id);
            return;
        }
        expect(elites.map(f => f.payload.enemySlug)).toEqual(['green-jelly']);
        const lastColumn = Math.max(...fights.map(f => f.node.location[0]));
        expect(elites[0]!.node.location[0]).toBeLessThan(lastColumn);
    });

    it('every other fight is its table row on the Breakwater, and Float-Eye elsewhere', () => {
        const rest = fights.filter(f => !f.payload.isBoss && f.foe?.difficulty !== 'elite');
        expect(rest.length).toBeGreaterThan(0);
        for (const f of rest) {
            const row = mapName === 'breakwater' ? BW_ENCOUNTER_FOES[f.node.id] : undefined;
            if (mapName === 'breakwater') expect(row, f.node.id).toBeDefined();
            expect(f.payload.enemySlug, f.node.id).toBe(row?.slug ?? 'float-eye');
            if (row) expect(f.payload.level, f.node.id).toBe(row.level);
        }
        if (mapName === 'breakwater') expect(rest.length).toBe(Object.keys(BW_ENCOUNTER_FOES).length);
    });

    it('the elite node is the one node the rest respawn reads as elite (phase ER1)', () => {
        const flagged = map.nodes.filter(n => isEliteNode(continent, mapName, n.id)).map(n => n.id);
        const elites = fights.filter(f => f.foe?.difficulty === 'elite').map(f => f.node.id);
        expect(flagged).toEqual(elites);
        // No drop list authored yet: the whole elite-only pool applies.
        expect(eliteRelicDropsAt(continent, mapName, elites[0]!)).toBeUndefined();
    });

    it('pins the elite to an Act 1 level', () => {
        const elite = fights.find(f => f.foe?.difficulty === 'elite')!;
        expect(elite.payload.level).toBeGreaterThanOrEqual(2);
        expect(elite.payload.level).toBeLessThanOrEqual(4);
    });
});
