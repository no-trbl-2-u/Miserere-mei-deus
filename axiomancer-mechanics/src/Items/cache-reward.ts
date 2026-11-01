/**
 * Loot-cache reward roller.
 *
 * The Reliquary (and any other cache surface) yields a deterministic set of
 * **consumables** scaled by tier, and, when the caller names who is looking
 * (`carrier`), sometimes one lane weapon or armor they do not carry
 * (`EQUIPMENT_DROP_TUNING.cache`). Currency is handled by the caller (the
 * cache session carries its own currency reward). Relics are never cache loot.
 *
 * Determinism: same `seed` + inputs → same rewards (a caller-supplied cache
 * seed drives a self-contained PRNG).
 *
 * Balance note: this is a minimal-correct reward table. `LootCacheChoice`'s
 * `item` offer is this roller's only caller. Re-tuning the mix, if ever
 * needed, is a manual follow-up.
 */

import { consumableLibrary } from './consumable.library';
import { EQUIPMENT_DROP_TUNING, rollEquipmentDrop, type EquipmentCarrier } from './equipment-drop';
import type { Item } from './types';

/** Reward depth. `modest` = early locales, `rich` = deeper locales. */
export type CacheLootTier = 'modest' | 'rich';

export interface RollCacheRewardOptions {
    /** Player level — reserved for future level-scaling; unused today. */
    playerLevel: number;
    /** Deterministic seed (cache seed). */
    seed: number;
    /** Reward depth: scales the consumable count. */
    tier: CacheLootTier;
    /**
     * Who is looking. Given, the bundle can also hold one lane weapon or armor
     * this carrier lacks, at `EQUIPMENT_DROP_TUNING.cache`. Absent, the bundle
     * is consumables only (a hazard puzzle's haul).
     */
    carrier?: EquipmentCarrier;
}

interface TierTuning {
    /** Inclusive [min, max] consumable rewards. */
    count: readonly [number, number];
}

/** Tier tuning. `modest` leans 1–2 consumables; `rich` leans 2–3. */
export const CACHE_REWARD_TUNING: Readonly<Record<CacheLootTier, TierTuning>> = Object.freeze({
    modest: { count: [1, 2] },
    rich: { count: [2, 3] },
});

/** mulberry32 — small deterministic PRNG (same family as the minigame seeds). */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return function next(): number {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Offset for the equipment stream, so adding a piece never shifts the consumables. */
const CACHE_EQUIPMENT_STREAM_OFFSET = 0x85ebca6b;

/** Offset for the card stream, so the card and the goods never share draws. */
const CACHE_CARD_STREAM_OFFSET = 0x9e3779b9;

/**
 * The rng a cache's card offer is drawn from: the cache seed's own stream,
 * kept apart from `rollCacheReward`'s, so one seed reproduces the whole cache.
 */
export function cacheCardRng(seed: number): () => number {
    return mulberry32((seed ^ CACHE_CARD_STREAM_OFFSET) >>> 0);
}

/** Pick an integer in [min, max] inclusive from an rng. */
function rollInt(rng: () => number, min: number, max: number): number {
    if (max <= min) return min;
    return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Roll a deterministic set of consumable rewards for a loot cache. Draws a
 * tier-scaled count of consumables from `consumableLibrary` (the healing
 * potions), cloned at `quantity: 1` so the shared library is never
 * mutated. With a `carrier`, a lane piece it lacks joins the bundle at
 * `EQUIPMENT_DROP_TUNING.cache`, drawn from the seed's own equipment stream.
 * Never throws; returns `[]` only if the pool is somehow empty.
 */
export function rollCacheReward(opts: RollCacheRewardOptions): Item[] {
    const rng = mulberry32(opts.seed);
    const pool = consumableLibrary;
    if (pool.length === 0) return [];

    const count = rollInt(rng, ...CACHE_REWARD_TUNING[opts.tier].count);
    const out: Item[] = [];
    for (let i = 0; i < count; i++) {
        const pick = pool[Math.floor(rng() * pool.length)];
        out.push({ ...pick, quantity: 1 });
    }
    if (opts.carrier) {
        const piece = rollEquipmentDrop(
            opts.carrier,
            mulberry32((opts.seed ^ CACHE_EQUIPMENT_STREAM_OFFSET) >>> 0),
            EQUIPMENT_DROP_TUNING.cache,
        );
        if (piece) out.push(piece);
    }
    return out;
}
