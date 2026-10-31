/**
 * Hermetic engine test — items are the healing potions.
 *
 * The consumable library holds minor, normal and greater healing potions and
 * nothing else. Every grant surface (enemy loot, friendship rewards, debug
 * presets, shops including the parked maps', loot caches) may only name an id
 * the library has, so no surface hands out an item that does not exist.
 */

import { BEFRIEND_TUNING } from '../../Enemy/befriend';
import { describe, it, expect } from 'vitest';
import { EnemiesByMap } from '../../Enemy/enemy.library';
import { characterPresets, levelLadderPresets } from '../../Character/presets';
import { consumableLibrary } from '../consumable.library';
import { rollCacheReward, type CacheLootTier } from '../cache-reward';

const POTIONS = ['healing-potion', 'minor-healing-potion', 'greater-healing-potion'];
const isPotion = (id: string): boolean => POTIONS.includes(id);

/** Every enemy on every map, deduplicated by id. */
function allEnemies() {
    const byId = new Map<string, (typeof EnemiesByMap)[keyof typeof EnemiesByMap][number]>();
    for (const list of Object.values(EnemiesByMap)) for (const e of list) byId.set(e.id, e);
    return [...byId.values()];
}

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

    it('no enemy loot table drops anything else', () => {
        const hits = allEnemies().flatMap(e => (e.loot ?? [])
            .filter(entry => entry.item && entry.item.category === 'consumable' && !isPotion(entry.item.id))
            .map(entry => `${e.id}: ${entry.item!.id}`));
        expect(hits).toEqual([]);
    });

    it('no befriend payout grants anything else', () => {
        const hits = BEFRIEND_TUNING.potionTiers.filter(t => !isPotion(t.itemId)).map(t => t.itemId);
        expect(hits).toEqual([]);
    });

    it('no preset starts with anything else', () => {
        const hits = [...characterPresets, ...levelLadderPresets].flatMap(p => p.consumables
            .filter(c => !isPotion(c.id))
            .map(c => `${p.id}: ${c.id}`));
        expect(hits).toEqual([]);
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
