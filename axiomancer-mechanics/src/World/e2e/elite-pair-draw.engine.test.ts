/**
 * Hermetic E2E — the elite nodes' draw (phase EN1j, A14): an elite node
 * names one foe or two in `BW_ELITE_DRAWS`, its pool holds one `weight: 1`
 * encounter entry per foe, and the map's own resolver draws one of them on
 * arrival from the run's seeded RNG: each foe of a pair is drawn by some
 * seed, and one seed always draws the same foe.
 *
 * The sea cave's pair is the Cave Choir and the Tithe-Collector; until the
 * Tithe-Collector lands (EN1h), `bw-c1` names the Cave Choir alone, and the
 * pair test stands a second elite beside it through the same builder.
 * Seeded RNG; no disk / network / TTY.
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
    getNodeEventPool, registerMapEventPool, resolveMapEvent, setNodeEventPoolOverride,
} from '../MapEvents/resolve-map-event';
import { BREAKWATER_CHAPTER_KINDS, BW_ELITE_DRAWS, eliteDrawPool } from '../MapEvents/content';
import type { ActOneFoe } from '../MapEvents/content';
import type { MapEventPool } from '../MapEvents/types';
import { payloadDifficulty } from '../encounter-tier';
import { createNewGameState } from '../../Game/game.reducer';
import type { GameState } from '../../Game/types';
import { ENEMY_REGISTRY } from '../../Enemy/enemy.library';
import { getRng, setRng, setSeed } from '../../Utils/rng';

const CONTINENT = 'coastal-continent';
const MAP = 'breakwater';
const SEEDS = Array.from({ length: 60 }, (_u, i) => i + 1);

/** Standing on `nodeId`, about to answer its arrival. */
function standingOn(nodeId: string): GameState {
    const fresh = createNewGameState({ startMap: 'breakwater' });
    return { ...fresh, world: { ...fresh.world, currentMap: { ...fresh.world.currentMap, currentNode: nodeId } } };
}

/** The foe id the map's resolver draws at `nodeId` with the run seeded to `seed`. */
function drawnAt(nodeId: string, seed: number): string {
    setSeed(seed);
    const { event } = resolveMapEvent(standingOn(nodeId));
    if (event.kind !== 'encounter') throw new Error(`${nodeId}: ${event.kind}`);
    return event.encounter.enemies[0]!.id;
}

const original = getRng();
afterEach(() => setRng(original));

describe('A14 — every elite node draws from its row', () => {
    const rows = Object.entries(BW_ELITE_DRAWS);

    it('the sea cave names the Cave Choir at level 5, an elite under level 10', () => {
        expect(BW_ELITE_DRAWS['bw-c1']!.map(f => f.slug)).toContain('cave-choir');
        for (const [nodeId, foes] of rows) {
            expect(BREAKWATER_CHAPTER_KINDS[nodeId]?.kind, nodeId).toBe('elite');
            expect(foes.length, nodeId).toBeGreaterThanOrEqual(1);
            expect(foes.length, nodeId).toBeLessThanOrEqual(2);
            for (const foe of foes) {
                expect(foe.level, `${nodeId} ${foe.slug}`).toBeLessThan(10);
                expect(payloadDifficulty({ enemySlug: foe.slug, difficulty: foe.difficulty }), foe.slug).toBe('elite');
            }
        }
        expect(BW_ELITE_DRAWS['bw-c1']!.every(f => f.level === 5)).toBe(true);
    });

    it.each(rows)('%s: its pool holds one weight-1 encounter per foe', (nodeId, foes) => {
        const pool = getNodeEventPool(CONTINENT, MAP, nodeId)!;
        expect(pool.entries.map(e => e.weight)).toEqual(foes.map(() => 1));
        expect(pool.entries.map(e => e.payload.kind === 'encounter' && [e.payload.enemySlug, e.payload.level]))
            .toEqual(foes.map(f => [f.slug, f.level]));
    });

    it.each(rows)('%s: the map draws every foe of its row, and one seed always the same one', (nodeId, foes) => {
        const drawn = SEEDS.map(seed => drawnAt(nodeId, seed));
        expect([...new Set(drawn)].sort()).toEqual(foes.map(f => ENEMY_REGISTRY[f.slug].id).sort());
        for (const seed of SEEDS.slice(0, 10)) expect(drawnAt(nodeId, seed), `seed ${seed}`).toBe(drawn[seed - 1]);
    });
});

describe('A14 — a pair is drawn 50/50 by the seeded pool roll', () => {
    // A stand-in partner for the Cave Choir until the Tithe-Collector lands:
    // the Green Jelly staged as an elite, through the same builder.
    const PAIR: readonly ActOneFoe[] = [
        { slug: 'cave-choir', level: 5 },
        { slug: 'green-jelly', level: 5, difficulty: 'elite' },
    ];
    const pairAtCave = (): void => {
        const pool: MapEventPool = { ...eliteDrawPool('bw-c1', PAIR), id: 'bw-c1.pair-test' };
        registerMapEventPool(pool);
        setNodeEventPoolOverride(CONTINENT, MAP, 'bw-c1', pool.id);
    };

    it('the pool is two encounter entries of weight 1, each staged as an elite', () => {
        const pool = eliteDrawPool('bw-c1', PAIR);
        expect(pool.entries).toHaveLength(2);
        expect(pool.entries.map(e => e.weight)).toEqual([1, 1]);
        for (const e of pool.entries) {
            if (e.payload.kind !== 'encounter') throw new Error(e.payload.kind);
            expect(payloadDifficulty(e.payload)).toBe('elite');
        }
    });

    it('across seeds the map draws both, near evenly; one seed always draws the same one', () => {
        pairAtCave();
        const drawn = SEEDS.map(seed => drawnAt('bw-c1', seed));
        const choir = drawn.filter(id => id === ENEMY_REGISTRY['cave-choir'].id).length;
        const jelly = drawn.filter(id => id === ENEMY_REGISTRY['green-jelly'].id).length;
        expect(choir + jelly).toBe(SEEDS.length);
        expect(choir).toBeGreaterThan(SEEDS.length * 0.25);
        expect(jelly).toBeGreaterThan(SEEDS.length * 0.25);
        for (const seed of SEEDS) expect(drawnAt('bw-c1', seed), `seed ${seed}`).toBe(drawn[seed - 1]);
    });

    it('the drawn foe fights as itself, at its row\'s level and as an elite', () => {
        pairAtCave();
        const seen = new Set<string>();
        for (const seed of SEEDS) {
            setSeed(seed);
            const { event } = resolveMapEvent(standingOn('bw-c1'));
            if (event.kind !== 'encounter') throw new Error(event.kind);
            const foe = event.encounter.enemies[0]!;
            expect(foe.level, foe.id).toBe(5);
            expect(foe.difficulty, foe.id).toBe('elite');
            seen.add(foe.id);
        }
        expect([...seen].sort()).toEqual([ENEMY_REGISTRY['cave-choir'].id, ENEMY_REGISTRY['green-jelly'].id].sort());
    });

    it('an elite node names one foe or two, never none or three', () => {
        expect(() => eliteDrawPool('bw-c1', [])).toThrow(/one or two/);
        expect(() => eliteDrawPool('bw-c1', [...PAIR, PAIR[0]!])).toThrow(/one or two/);
    });
});
