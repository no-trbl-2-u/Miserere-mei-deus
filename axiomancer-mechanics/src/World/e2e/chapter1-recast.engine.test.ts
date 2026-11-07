/**
 * Chapter 1's enemy recast (EN3b, T 2026-11-06), end to end: the 18 combat
 * nodes of the Breakwater draw the recast roster at the levels EN1i set, the
 * ten foes cut from the chapter are reachable from no Breakwater pool, and a
 * wandering Act 1 fight draws one of the six named normals.
 *
 * Fixed RNG; no disk / network / TTY.
 */

import { describe, expect, it } from 'vitest';

import { getMapDefinition, getNodeEventPool } from '../index';
import { generateEncounter } from '../encounter';
import { BW_ELITE_DRAWS, BW_ENCOUNTER_FOES } from '../MapEvents/content';
import { EnemiesByMap, ENEMY_REGISTRY } from '../../Enemy/enemy.library';
import type { MapNode } from '../types';

/** The ten foes cut from Chapter 1 (T, 2026-11-06). */
const BENCHED = [
    'float-eye', 'gallows-crow', 'crane-hook', 'lamprey-knot', 'green-jelly',
    'curfew-ringer', 'wreck-picker', 'smokehouse-gutter', 'toll-keeper', 'death-beholder',
] as const;

/** The six named normals the wandering pool is made of. */
const NORMALS = ['quay-crab', 'net-mender', 'coralback', 'brine-widow', 'saltwick-swarm', 'bilge-stalker'] as const;

/** Every one of the 18 combat nodes: its foe slug(s) and level, from the Design table. */
const TABLE: Readonly<Record<string, { slugs: readonly string[]; level: number; boss?: true }>> = {
    'bw-w2': { slugs: ['quay-crab'], level: 2 },
    'bw-w3': { slugs: ['coralback'], level: 2 },
    'bw-m1': { slugs: ['quay-crab'], level: 2 },
    'bw-h1': { slugs: ['net-mender'], level: 3 },
    'bw-h2': { slugs: ['quay-crab'], level: 3 },
    'bw-h3': { slugs: ['net-mender'], level: 3 },
    'bw-h7': { slugs: ['brine-widow'], level: 4 },
    'bw-t1': { slugs: ['coralback'], level: 4 },
    'bw-t2': { slugs: ['saltwick-swarm'], level: 5 },
    'bw-t3': { slugs: ['brine-widow'], level: 5 },
    'bw-t6': { slugs: ['saltwick-swarm'], level: 5 },
    'bw-l1': { slugs: ['bilge-stalker'], level: 6 },
    'bw-d1': { slugs: ['net-mender'], level: 6 },
    'bw-d3': { slugs: ['bilge-stalker'], level: 6 },
    'bw-c1': { slugs: ['cave-choir', 'tithe-collector'], level: 5 },
    'bw-l4': { slugs: ['lamplighter', 'wrecker'], level: 7 },
    'bw-w5': { slugs: ['wreckmaster', 'tide-gate'], level: 8 },
    'bw-k2': { slugs: ['saint-beneath'], level: 1, boss: true },
};

type Staged = { enemySlug?: string; level?: number; isBoss?: boolean };

const stagedAt = (nodeId: string): Staged[] =>
    getNodeEventPool('coastal-continent', 'breakwater', nodeId)!.entries.map(e => e.payload as Staged);

describe('Chapter 1 nodes after the recast (EN3b)', () => {
    it('walks all 18 combat nodes, each drawing the Design table\'s foe(s) at the same level', () => {
        expect(Object.keys(TABLE)).toHaveLength(18);
        for (const [nodeId, row] of Object.entries(TABLE)) {
            const staged = stagedAt(nodeId);
            expect(staged.map(p => p.enemySlug), nodeId).toEqual(row.slugs);
            for (const p of staged) {
                expect(p.level, nodeId).toBe(row.level);
                expect(p.isBoss ?? false, nodeId).toBe(row.boss ?? false);
            }
        }
    });

    it('covers exactly the combat nodes the tables stage, no more and no fewer', () => {
        const staged = [...Object.keys(BW_ENCOUNTER_FOES), ...Object.keys(BW_ELITE_DRAWS), 'bw-k2'].sort();
        expect(staged).toEqual(Object.keys(TABLE).sort());
    });

    it('stages no benched foe at any node of the Breakwater', () => {
        const map = getMapDefinition('coastal-continent', 'breakwater');
        for (const node of map.nodes) {
            const pool = getNodeEventPool('coastal-continent', 'breakwater', node.id);
            for (const entry of pool?.entries ?? []) {
                const slug = (entry.payload as Staged).enemySlug;
                if (slug) expect(BENCHED as readonly string[], `${node.id} stages ${slug}`).not.toContain(slug);
            }
        }
    });

    it('keeps the keep causeway an elite pair, so the draw guard holds', () => {
        expect(BW_ELITE_DRAWS['bw-w5']).toHaveLength(2);
    });

    it('keeps every cut foe in the library, so an old save naming one still resolves', () => {
        for (const slug of BENCHED) expect(ENEMY_REGISTRY[slug], slug).toBeDefined();
    });
});

describe('the wandering Act 1 pool (EN3b)', () => {
    it('is the six named normals, on all seven maps, and no benched foe', () => {
        const ids = NORMALS.map(slug => ENEMY_REGISTRY[slug].id);
        for (const [map, pool] of Object.entries(EnemiesByMap)) {
            expect(pool.map(e => e.id), map).toEqual(ids);
        }
        const benched = BENCHED.map(slug => ENEMY_REGISTRY[slug].id);
        for (const e of EnemiesByMap.breakwater) expect(benched).not.toContain(e.id);
    });

    it('draws each of the six and nothing else across a sweep of the roll', () => {
        const node: MapNode = { id: 'bw-w2', location: [0, 0], connectedNodes: [] };
        const seen = new Set<string>();
        for (let i = 0; i < 60; i++) {
            const roll = (i + 0.5) / 60;
            const enc = generateEncounter(node, 3, { rng: () => roll });
            seen.add(enc.enemies[0]!.id);
        }
        expect([...seen].sort()).toEqual(NORMALS.map(slug => ENEMY_REGISTRY[slug].id).sort());
    });
});
