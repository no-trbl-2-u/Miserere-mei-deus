/**
 * Encounter generator tests.
 *
 * Verifies:
 *   - Per-map node resolution (`bw-*` → breakwater, `cw-*` → charcoal-wood).
 *   - Adaptive scaling bands per difficulty tier.
 *   - Difficulty filtering.
 *   - Encounter cloning (no canonical-library mutation).
 *   - Errors for unknown nodes / empty pools.
 */

import { describe, it, expect } from 'vitest';
import {
    generateEncounter, scaleEnemyToLevel, scaledEncounterLevel,
    DIFFICULTY_LEVEL_BANDS,
} from './encounter';
import { Enemy } from '../Enemy/types';
import { FloatEye, ENEMY_REGISTRY } from '../Enemy/enemy.library';
import { MapNode } from './types';

const coastNode:   MapNode = { id: 'bw-w2', location: [0, 0], connectedNodes: [] };
const forestNode:  MapNode = { id: 'cw-3', location: [0, 0], connectedNodes: [] };
const unknownNode: MapNode = { id: 'zz-1', location: [0, 0], connectedNodes: [] };

describe('DIFFICULTY_LEVEL_BANDS', () => {
    it('keeps simple at or below player level, boss two-to-three above', () => {
        expect(DIFFICULTY_LEVEL_BANDS.simple).toEqual({ min: -1, max: 0 });
        expect(DIFFICULTY_LEVEL_BANDS.boss).toEqual({ min: 2, max: 3 });
    });
    it('unique stays at authored level — no adaptive scaling', () => {
        expect(DIFFICULTY_LEVEL_BANDS.unique).toBe('authored');
    });
});

describe('scaledEncounterLevel', () => {
    it('clamps the floor to 1 when scaling simple enemies for a low-level player', () => {
        const simple: Enemy = { ...FloatEye, difficulty: 'simple' };
        // Player level 1, simple band = [-1, 0] → either 0 (clamped to 1) or 1.
        for (let i = 0; i < 20; i++) {
            const level = scaledEncounterLevel(simple, 1);
            expect(level).toBeGreaterThanOrEqual(1);
            expect(level).toBeLessThanOrEqual(1);
        }
    });

    it('unique enemies ignore player level — they stay at authored level', () => {
        // No roster foe is unique — a unique-tier fixture.
        const unique: Enemy = { ...FloatEye, difficulty: 'unique', level: 30 };
        const level = scaledEncounterLevel(unique, 50);
        expect(level).toBe(unique.level);
    });

    it('boss band stays in [+2, +3] relative to the player', () => {
        const boss = ENEMY_REGISTRY['death-beholder'];
        for (let i = 0; i < 50; i++) {
            const level = scaledEncounterLevel(boss, 5);
            expect(level).toBeGreaterThanOrEqual(7);
            expect(level).toBeLessThanOrEqual(8);
        }
    });
});

describe('scaleEnemyToLevel', () => {
    it('returns a clone — does not mutate the source', () => {
        const before = JSON.stringify(FloatEye);
        scaleEnemyToLevel(FloatEye, 5);
        expect(JSON.stringify(FloatEye)).toBe(before);
    });

    it('recomputes maxHealth and resets HP to full', () => {
        const scaled = scaleEnemyToLevel(FloatEye, 5);
        expect(scaled.level).toBe(5);
        expect(scaled.health).toBe(scaled.maxHealth);
        expect(scaled.maxHealth).toBeGreaterThan(FloatEye.maxHealth);
    });

    it('clamps the target level to a floor of 1', () => {
        const scaled = scaleEnemyToLevel(FloatEye, -5);
        expect(scaled.level).toBe(1);
    });

    it('rescales xpReward when the source used the default multiplier', () => {
        const scaled = scaleEnemyToLevel(FloatEye, 4);
        // FloatEye is normal; default = 4 × 20 = 80.
        expect(scaled.xpReward).toBe(80);
    });
});

describe('generateEncounter', () => {
    it('picks an enemy from the resolved map and stamps origin', () => {
        const enc = generateEncounter(coastNode, 1);
        expect(enc.enemies).toHaveLength(1);
        // The Act 1 pool is Float-Eye only.
        expect(enc.enemies[0].id).toBe(FloatEye.id);
        expect(enc.origin).toBe('breakwater:bw-w2');
    });

    it('throws for nodes whose map cannot be resolved', () => {
        expect(() => generateEncounter(unknownNode, 1)).toThrow(/cannot resolve map/);
    });

    it('honours an explicit options.mapName for non-prefixed nodes', () => {
        const enc = generateEncounter(unknownNode, 1, { mapName: 'breakwater' });
        expect(enc.origin).toBe('breakwater:zz-1');
    });

    it('honours options.difficulty as a filter', () => {
        for (let i = 0; i < 20; i++) {
            const enc = generateEncounter(forestNode, 5, { difficulty: 'normal' });
            expect(enc.enemies[0].difficulty).toBe('normal');
        }
    });

    it('throws when the difficulty filter empties the pool', () => {
        // No unique enemy sits in the Breakwater's pool; filtering on
        // `unique` empties it.
        expect(() => generateEncounter(coastNode, 5, { difficulty: 'unique' })).toThrow();
    });

    it('the returned enemy is a fresh clone — combat mutations don\'t bleed back', () => {
        const enc = generateEncounter(coastNode, 1);
        const picked = enc.enemies[0];
        picked.health = 0;
        const enc2 = generateEncounter(coastNode, 1);
        expect(enc2.enemies[0].health).toBeGreaterThan(0);
    });

    it('every map pool draws a normal foe (the R2 pools are Float-Eye only)', () => {
        // Sanity check the library indices used by the generator.
        const coast   = generateEncounter(coastNode, 5, { difficulty: 'normal' });
        const forest  = generateEncounter(forestNode,  5, { difficulty: 'normal' });
        expect(coast.enemies[0].difficulty).toBe('normal');
        expect(forest.enemies[0].difficulty).toBe('normal');
    });
});
