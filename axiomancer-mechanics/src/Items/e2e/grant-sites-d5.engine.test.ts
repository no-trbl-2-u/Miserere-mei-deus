/**
 * D5 routing at the engine grant sites — hermetic E2E.
 *
 * The brief asks that `rollCacheReward` be VERIFIED rather than assumed to be
 * consumables-only, and that the reward-screen predicate be checked against
 * what each engine grant site can actually produce. These tests pin that: they
 * fail the day a loot surface starts minting signet relics, which is exactly
 * when the routing decision would need revisiting.
 */

import { describe, it, expect } from 'vitest';

import { rollCacheReward } from '../cache-reward';
import { consumableLibrary } from '../consumable.library';
import { relicLibrary } from '../relic.library';
import { qualifiesForItemRewardScreen } from '../item-grant';
import type { CacheLootTier } from '../cache-reward';

describe('rollCacheReward — consumables only, so The Reliquary rarely earns the reward screen', () => {
    it('never yields equipment across a wide seed sweep', () => {
        const tiers: CacheLootTier[] = ['modest', 'rich'];
        let rolled = 0;
        for (const tier of tiers) {
            for (let seed = 1; seed <= 200; seed++) {
                for (const item of rollCacheReward({ playerLevel: 3, seed, tier })) {
                    rolled++;
                    expect(item.category).toBe('consumable');
                    expect(qualifiesForItemRewardScreen(item)).toBe(false);
                }
            }
        }
        expect(rolled).toBeGreaterThan(0);
    });
});

describe('the consumable library carries nothing the reward screen should claim', () => {
    it('no consumable qualifies under D5', () => {
        expect(consumableLibrary.length).toBeGreaterThan(0);
        for (const c of consumableLibrary) {
            expect(qualifiesForItemRewardScreen(c)).toBe(false);
        }
    });
});

describe('the relic library is exactly the set D5 routes to the screen', () => {
    it('every signet relic qualifies', () => {
        expect(relicLibrary.length).toBeGreaterThan(0);
        for (const r of relicLibrary) {
            expect(qualifiesForItemRewardScreen(r)).toBe(true);
        }
    });
});
