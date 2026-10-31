/**
 * Befriend eligibility and reward, read off the foe itself and one tuning
 * table: the rules The Open Hand (the Suppliant's Ring signature) reads, and
 * what a befriend pays.
 */

import type { Item } from '../Items/types';
import { getConsumableById } from '../Items/consumable.library';
import type { Enemy } from './types';

/**
 * The befriend tuning table. `[content]` for T: a first cut for testing, all
 * of it retunable here.
 *
 * - `defaultHpGate`: the VITAE fraction at or below which a foe with no
 *   `befriendabilityConfig.hpGate` of its own can be spared (the Green Jelly's
 *   line).
 * - `shillingsPerLevel`: a befriend paying shillings pays this times the
 *   foe's level (a level-2 foe is 6, one village rest).
 * - `potionTiers`: a befriend paying a consumable pays the tier with the
 *   highest `minLevel` the foe's level reaches.
 */
export const BEFRIEND_TUNING = {
    defaultHpGate: 0.3,
    shillingsPerLevel: 3,
    potionTiers: [
        { minLevel: 10, itemId: 'greater-healing-potion' },
        { minLevel: 5, itemId: 'healing-potion' },
        { minLevel: 0, itemId: 'minor-healing-potion' },
    ],
} as const;

/**
 * Every foe can be befriended (T, 2026-10-31, for testing): whether it will
 * yield is the VITAE gate's business (`befriendHpGateOpen`), not the foe's.
 * The rule lives here, so it can be narrowed later in one place.
 */
export function isEnemyBefriendable(_enemy?: Pick<Enemy, 'befriendabilityConfig'>): boolean {
    return true;
}

/**
 * The foe's `befriendabilityConfig.hpGate`, else `BEFRIEND_TUNING.defaultHpGate`:
 * open when its VITAE fraction is at or below `belowPct`.
 */
export function befriendHpGateOpen(enemy: Pick<Enemy, 'befriendabilityConfig' | 'health' | 'maxHealth'>): boolean {
    const belowPct = enemy.befriendabilityConfig?.hpGate?.belowPct ?? BEFRIEND_TUNING.defaultHpGate;
    if (enemy.maxHealth <= 0) return false;
    return enemy.health / enemy.maxHealth <= belowPct;
}

/** What a befriend pays: shillings, or one consumable, never both and never XP. */
export interface BefriendPayout {
    shillings: number;
    items: Item[];
}

/** The potion a foe of this level pays when the befriend pays a consumable. */
export function befriendPotionFor(level: number): Item {
    const tier = BEFRIEND_TUNING.potionTiers.find(t => level >= t.minLevel)!;
    return { ...getConsumableById(tier.itemId)! };
}

/**
 * Roll a befriend's payout for a foe of `level`: even odds of shillings
 * (`shillingsPerLevel` x level) or the level's potion, drawn from `rng` so a
 * seed reproduces it.
 */
export function rollBefriendPayout(level: number, rng: () => number): BefriendPayout {
    if (rng() < 0.5) {
        return { shillings: BEFRIEND_TUNING.shillingsPerLevel * Math.max(0, level), items: [] };
    }
    return { shillings: 0, items: [befriendPotionFor(level)] };
}
