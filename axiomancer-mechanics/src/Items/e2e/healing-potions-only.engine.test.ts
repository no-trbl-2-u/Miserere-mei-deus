/**
 * Hermetic engine test — items are the healing potions.
 *
 * The consumable library holds minor, normal and greater healing potions and
 * nothing else. Every grant surface (debug
 * presets, shops including the parked maps', loot caches) may only name an id
 * the library has, so no surface hands out an item that does not exist.
 */

import { describe, it, expect } from 'vitest';
import { characterPresets, levelLadderPresets } from '../../Character/presets';
import { consumableLibrary } from '../consumable.library';
import { EnemyLibrary } from '../../Enemy/enemy.library';
import { rollCacheReward, type CacheLootTier } from '../cache-reward';

const POTIONS = ['healing-potion', 'minor-healing-potion', 'greater-healing-potion'];
const isPotion = (id: string): boolean => POTIONS.includes(id);

/** Every item id a registered map-event pool sells (village shop wares). */
describe('R5 — the consumable library is the healing potions', () => {
    it('holds exactly minor, normal and greater healing potions', () => {
        expect(consumableLibrary.map(c => c.id).sort()).toEqual([...POTIONS].sort());
    });

    it('every potion heals and says VITAE, not HP', () => {
        for (const c of consumableLibrary) {
            expect(c.healAmount, c.id).toBeGreaterThan(0);
            expect(c.effectId, c.id).toBeUndefined();
            expect(c.description, c.id).toMatch(/VITAE/);
            expect(c.description, c.id).not.toMatch(/\bHP\b/);
        }
    });

    it('no preset starts with anything else', () => {
        const hits = [...characterPresets, ...levelLadderPresets].flatMap(p => p.consumables
            .filter(c => !isPotion(c.id))
            .map(c => `${p.id}: ${c.id}`));
        expect(hits).toEqual([]);
    });

    it('no foe carries a loot table, so no foe hands out an item', () => {
        const carrying = EnemyLibrary.filter(e => 'loot' in e).map(e => e.id);
        expect(carrying).toEqual([]);
    });

    it('a loot cache only rolls potions', () => {
        const tiers: CacheLootTier[] = ['modest', 'rich'];
        const hits: string[] = [];
        let rolled = 0;
        for (const tier of tiers) {
            for (let seed = 1; seed <= 500; seed++) {
                for (const item of rollCacheReward({ playerLevel: 3, seed, tier })) {
                    rolled++;
                    if (!isPotion(item.id)) hits.push(`${tier}/${seed}: ${item.id}`);
                }
            }
        }
        expect(rolled).toBeGreaterThan(0);
        expect(hits).toEqual([]);
    });
});
