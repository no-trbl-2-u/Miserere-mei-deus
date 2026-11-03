/**
 * The Spare table: the one roll a spared foe pays.
 *
 * `rollSpareReward` draws a result by the weights in `MERCY_TUNING.spareTable`
 * and, for a result that needs a pick (a card, a piece, a relic), picks it. A
 * result with nothing to give (all gear carried, nothing upgradable) pays the
 * extra shillings result instead. `applySpareReward` puts a result on the
 * player; the reducer's `APPLY_SPARE_REWARD` calls it, so a result reaches the
 * save. Nothing in play rolls this yet.
 *
 * Pure: every draw comes from the `rng` passed in (first the weight, then the
 * pick).
 */

import type { Character } from '../Character/types';
import type { Consumable, Equipment } from '../Items/types';
import { cardLibrary } from '../Cards/cards.library';
import { GREY_LANE } from '../Cards/card.lanes';
import { isUpgradedCardId, nextUpgradeId, upgradableCardIds } from '../Cards/card-upgrades';
import { replaceCard } from '../Cards/card.engine';
import { equipmentDropPool, carriedPieceIds } from '../Items/equipment-drop';
import { relicLibrary } from '../Items/relic.library';
import { getConsumableById } from '../Items/consumable.library';
import { addItemStacking } from '../Items/item.reducer';
import { deepClone } from '../Utils';
import { MERCY_TUNING, fightWage } from './combat.mercy-check';

/** The table's results, in table order. */
export type SpareResultKind = keyof typeof MERCY_TUNING.spareTable;

/** One rolled result, ready for `applySpareReward`. */
export type SpareReward =
    | { readonly kind: 'shillings'; readonly amount: number }
    | { readonly kind: 'consumable'; readonly item: Consumable }
    | { readonly kind: 'upgrade'; readonly fromCardId: string; readonly toCardId: string }
    | { readonly kind: 'transform'; readonly fromCardId: string; readonly toCardId: string }
    | { readonly kind: 'gear'; readonly item: Equipment }
    | { readonly kind: 'relic'; readonly item: Equipment };

/** The consumable the table pays. */
const MINOR_CONSUMABLE_ID = 'minor-healing-potion';

/** The 3 grey starters: never a transform's result. */
const GREY_STARTER_IDS: ReadonlySet<string> = new Set(GREY_LANE.testDeck);

/** A seeded index in `[0, length)`. */
function pick(length: number, rng: () => number): number {
    return Math.min(Math.floor(rng() * length), length - 1);
}

/** Every card the player owns, copies kept (each copy is one chance). */
function ownedCardIds(player: Pick<Character, 'knownCards' | 'combatRewardCards'>): string[] {
    return [...player.knownCards, ...(player.combatRewardCards ?? [])];
}

/**
 * The cards a transform can turn into: the whole library, any lane, but not a
 * Curse, not an upgraded copy and not one of the 3 grey starters.
 */
export function transformResultPool(): string[] {
    return cardLibrary
        .filter(card => card.cardType !== 'curse' && !isUpgradedCardId(card.id) && !GREY_STARTER_IDS.has(card.id))
        .map(card => card.id);
}

/**
 * Replaces one owned copy of `cardId` with `withCardId`. Pure; the same
 * character (same reference) comes back when the card is not owned or the
 * replacement does not resolve.
 */
export function transformCard(player: Character, cardId: string, withCardId: string): Character {
    return replaceCard(player, cardId, withCardId);
}

/** The shillings result for a fight whose normal wage is `normalWage`. */
function shillingsResult(normalWage: number): SpareReward {
    return { kind: 'shillings', amount: Math.ceil(MERCY_TUNING.extraShillingsMultiplier * normalWage) };
}

/** Which table result a draw in `[0, 1)` lands on. */
function kindForDraw(draw: number): SpareResultKind {
    const entries = Object.entries(MERCY_TUNING.spareTable) as [SpareResultKind, number][];
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let left = Math.min(Math.max(draw, 0), 0.999999999) * total;
    for (const [kind, weight] of entries) {
        if (left < weight) return kind;
        left -= weight;
    }
    return entries[entries.length - 1]![0];
}

/**
 * Rolls a Spare's one table result for `player`. The first draw picks the
 * result by weight, the second picks within it. A result with nothing to give
 * pays the extra shillings result.
 *
 * @param player     - The player who spared.
 * @param rng        - The seeded rng.
 * @param normalWage - The fight's normal wage (`fightWage(level)`), the unit of the shillings result.
 * @example rollSpareReward(player, rng, fightWage(5)) // { kind: 'shillings', amount: 15 }, or a card, piece or relic
 */
export function rollSpareReward(
    player: Character,
    rng: () => number,
    normalWage: number = fightWage(1),
): SpareReward {
    const kind = kindForDraw(rng());
    switch (kind) {
        case 'shillings':
            return shillingsResult(normalWage);
        case 'consumable': {
            const potion = getConsumableById(MINOR_CONSUMABLE_ID);
            return potion ? { kind, item: { ...deepClone(potion), quantity: 1 } } : shillingsResult(normalWage);
        }
        case 'upgrade': {
            const owned = ownedCardIds(player);
            const upgradable = new Set(upgradableCardIds(owned));
            const copies = owned.filter(id => upgradable.has(id));
            if (copies.length === 0) return shillingsResult(normalWage);
            const fromCardId = copies[pick(copies.length, rng)]!;
            const toCardId = nextUpgradeId(fromCardId);
            return toCardId === undefined ? shillingsResult(normalWage) : { kind, fromCardId, toCardId };
        }
        case 'transform': {
            const owned = ownedCardIds(player);
            if (owned.length === 0) return shillingsResult(normalWage);
            const fromCardId = owned[pick(owned.length, rng)]!;
            const results = transformResultPool().filter(id => id !== fromCardId);
            if (results.length === 0) return shillingsResult(normalWage);
            return { kind, fromCardId, toCardId: results[pick(results.length, rng)]! };
        }
        case 'gear': {
            const pool = equipmentDropPool(player);
            if (pool.length === 0) return shillingsResult(normalWage);
            return { kind, item: deepClone(pool[pick(pool.length, rng)]!) };
        }
        case 'relic': {
            const carried = carriedPieceIds(player);
            const pool = relicLibrary.filter(relic => !carried.has(relic.id));
            if (pool.length === 0) return shillingsResult(normalWage);
            return { kind, item: deepClone(pool[pick(pool.length, rng)]!) };
        }
    }
}

/**
 * Puts a rolled result on the player: shillings join the purse, an item joins
 * the satchel, an upgrade or transform swaps one owned copy. Pure.
 */
export function applySpareReward(player: Character, reward: SpareReward): Character {
    switch (reward.kind) {
        case 'shillings':
            return { ...player, currency: player.currency + reward.amount };
        case 'consumable':
        case 'gear':
        case 'relic':
            return { ...player, inventory: addItemStacking(player.inventory, reward.item) };
        case 'upgrade':
        case 'transform':
            return transformCard(player, reward.fromCardId, reward.toCardId);
    }
}
