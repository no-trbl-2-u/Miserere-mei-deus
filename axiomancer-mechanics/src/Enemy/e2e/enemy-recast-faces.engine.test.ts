/**
 * Hermetic E2E — Chapter 1's six recast faces are their cut foes' numbers
 * (EN3a, T 2026-11-06).
 *
 * T settled six new portraits onto six cut foes' slots. Nothing is designed,
 * retuned or removed here: each new entry carries its cut foe's `level`,
 * VITAE, tier, `logic`, `baseStats` and phase shape, under a new id, name,
 * description and portrait key. This suite is the guard on that — a future
 * edit that re-tunes one side of a pair and not the other fails here.
 *
 * It also pins the retention ruling (T: "Don't delete them, they're just not
 * in chapter 1"): all ten cut foes are still in `EnemyLibrary`.
 *
 * This chunk touches no node table, so the six are in the library and placed
 * nowhere; 157.2 repoints the nodes.
 */

import { describe, expect, it } from 'vitest';

import { EnemyLibrary, ENEMY_REGISTRY, LIVE_ENEMY_IDS } from '../enemy.library';
import { ENEMY_DECKS } from '../../Combat/combat.enemy-decks';
import type { Enemy } from '../types';

/** new face → the foe whose numbers it carries, and the portrait key it draws. */
const RECAST: ReadonlyArray<{
    face: keyof typeof ENEMY_REGISTRY;
    cut: keyof typeof ENEMY_REGISTRY;
    portrait: string;
    name: string;
    /** The face moved up a tier in 162.4 (MV1d): its VITAE, XP and phase count are its tier's, not its cut foe's. */
    elite?: true;
}> = [
    { face: 'saint-beneath',  cut: 'death-beholder', portrait: 'saint-beneath',  name: 'The Saint Beneath' },
    { face: 'saltwick-swarm', cut: 'green-jelly',    portrait: 'saltwick-swarm', name: 'Saltwick Swarm', elite: true },
    { face: 'wreckmaster',    cut: 'toll-keeper',    portrait: 'wreckmaster',    name: 'The Wreckmaster' },
    { face: 'quay-crab',      cut: 'crane-hook',     portrait: 'quay-crab',      name: 'Quay-Crab' },
    { face: 'bilge-stalker',  cut: 'wreck-picker',   portrait: 'bilge-stalker',  name: 'Bilge-Stalker' },
    { face: 'coralback',      cut: 'lamprey-knot',   portrait: 'coralback',      name: 'Coralback' },
];

/** The ten foes T cut from Chapter 1. None is deleted; all stay in the library. */
const CUT_FROM_CHAPTER1 = [
    'enemy-green-jelly', 'enemy-toll-keeper', 'enemy-crane-hook', 'enemy-wreck-picker',
    'enemy-lamprey-knot', 'enemy-death-beholder',
    'enemy-smokehouse-gutter', 'enemy-curfew-ringer', 'enemy-gallows-crow', 'enemy-float-eye',
];

/** A foe's phase count: its `phases` entries, or its VITAE stages plus its opening. */
const phaseCount = (foe: Enemy): number =>
    foe.phases && foe.phases.length > 0 ? foe.phases.length : (foe.stages?.length ?? 0) + 1;

describe('EN3a — Chapter 1\'s six recast faces carry their cut foes\' numbers', () => {
    it.each(RECAST)('$name is $cut\'s level, VITAE, tier and phase count under its own face', ({ face, cut, portrait, name, elite }) => {
        const now = ENEMY_REGISTRY[face] as Enemy;
        const was = ENEMY_REGISTRY[cut] as Enemy;

        // Its own face.
        expect(now.name).toBe(name);
        expect(now.portraitAsset).toBe(portrait);
        expect(now.id).not.toBe(was.id);
        expect(now.description, `${name} description`).toMatch(/\S/);
        expect(now.mapName, `${name} mapName`).toBe('breakwater');

        // Its cut foe's numbers, copied.
        expect(now.level, `${name} level`).toBe(was.level);
        if (elite) {
            // Saltwick Swarm is an elite now (T: "15 is rough"): the elite VITAE and three phases.
            expect(now.difficulty, `${name} tier`).toBe('elite');
            expect(now.maxHealth, `${name} VITAE`).toBeGreaterThan(was.maxHealth);
            expect(phaseCount(now), `${name} phase count`).toBe(3);
        } else {
            expect(now.maxHealth, `${name} VITAE`).toBe(was.maxHealth);
            expect(now.difficulty, `${name} tier`).toBe(was.difficulty);
        }
        expect(now.logic, `${name} logic`).toBe(was.logic);
        expect(now.baseStats, `${name} stat budget`).toEqual(was.baseStats);
        if (!elite) {
            expect(phaseCount(now), `${name} phase count`).toBe(phaseCount(was));
            expect(now.xpReward, `${name} xpReward`).toBe(was.xpReward);
        }
    });

    it('the boss keeps the Death Beholder\'s authored VITAE, on moves of its own (162.3)', () => {
        const saint = ENEMY_REGISTRY['saint-beneath'] as Enemy;
        expect(saint.difficulty).toBe('boss');
        expect(saint.maxHealth).toBe(320);
        expect(saint.stages).toEqual([]);
        expect(ENEMY_DECKS['enemy-saint-beneath']).toBeUndefined();
        // A boss is never spared, and must carry a journal entry of its own.
        expect(saint.mercyLines).toBeUndefined();
        expect(saint.spareStory).toBeUndefined();
        expect(saint.journalEntry?.title).toBe('The Saint Beneath');
        expect(saint.journalEntry?.id).toBe('codex-saint-beneath');
    });

    it('all ten foes cut from Chapter 1 are still in the library (T: "they\'re just not in chapter 1")', () => {
        const ids = EnemyLibrary.map(e => e.id);
        for (const id of CUT_FROM_CHAPTER1) {
            expect(ids, id).toContain(id);
            expect(LIVE_ENEMY_IDS.has(id), `${id} is live`).toBe(true);
            expect(EnemyLibrary.find(e => e.id === id)!.portraitAsset, `${id} portrait`).toMatch(/\S/);
        }
    });

    it('every recast face is registered in all four library indices, and no portrait key is shared', () => {
        const ids = EnemyLibrary.map(e => e.id);
        for (const { face } of RECAST) {
            const foe = ENEMY_REGISTRY[face] as Enemy;
            expect(ids, foe.id).toContain(foe.id);
            expect(LIVE_ENEMY_IDS.has(foe.id), `${foe.id} is live`).toBe(true);
        }
        const portraits = EnemyLibrary.map(e => e.portraitAsset).filter((p): p is string => !!p);
        expect(new Set(portraits).size, 'one portrait per foe').toBe(portraits.length);
    });
});
