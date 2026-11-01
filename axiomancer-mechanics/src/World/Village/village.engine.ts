/**
 * Village counters — pure engine rules for the paid rest and the card shop.
 *
 *  - REST: heals what a rest node heals (`previewRestChoiceHeal`) for
 *    `VILLAGE_TUNING.restPrice` shillings, once per visit. Like a rest node's
 *    heal it clears `dying`. It is refused, loudly, when the purse is short,
 *    when VITAE is already full, or when the player has rested this visit.
 *  - BUY: one of the shop's cards (`villageCardShopFor`, seeded by the run and
 *    the node so the offer never re-rolls) for `VILLAGE_TUNING.cardPrice`; the
 *    card joins the deck the way a reward card does (`addRewardCard`). Each
 *    offered card sells once per visit.
 *  - EQUIPMENT: up to `EQUIPMENT_DROP_TUNING.shopCount` weapons and armor the
 *    player does not carry (`villageEquipmentShopFor`, seeded like the card
 *    shop) for `EQUIPMENT_DROP_TUNING.shopPrice` each; a bought piece enters
 *    the satchel unworn. The grey pair never sells.
 *  - REMOVE: one deck card for the escalating removal price
 *    (`cardRemovalPriceFor`), through `removeCardFromCombatDeck`, which owns
 *    the deck floor and bumps `Character.cardRemovals`.
 *
 * Every transition takes the host's state and the visit record and returns a
 * new state and visit, or a refusal carrying the reason; a refusal moves
 * nothing. The engine never reads the pending event and never saves the visit.
 */

import { addRewardCard, rewardPoolFor } from '../../Combat/combat.rewards';
import { cardRemovalPrice, cardRemovalsOf, removeCardFromCombatDeck } from '../../Cards/card.removal';
import type { GameState } from '../../Game/types';
import type { Character } from '../../Character/types';
import { EQUIPMENT_DROP_TUNING, carriedPieceIds, equipmentDropPool } from '../../Items/equipment-drop';
import { equipmentLibrary } from '../../Items/equipment.library';
import { grantItem } from '../../Items/item-grant';
import { previewRestChoiceHeal } from '../RestChoice/restchoice.engine';
import { seedInputToUint32 } from '../seed';
import { VILLAGE_TUNING } from './village.content';
import type {
    VillageBuyResult,
    VillageBuyEquipmentResult,
    VillageCardShop,
    VillageEquipmentShop,
    VillageHost,
    VillageQuote,
    VillageRemovalQuote,
    VillageRemoveResult,
    VillageRestCounter,
    VillageRestQuote,
    VillageRestResult,
    VillageVisit,
} from './village.types';

/** A visit nothing has happened in yet. */
export const FRESH_VILLAGE_VISIT: VillageVisit = Object.freeze({
    rested: false,
    boughtCardIds: Object.freeze([]) as readonly string[],
    boughtEquipmentIds: Object.freeze([]) as readonly string[],
});

/** The words a counter prints when the purse cannot cover it. */
function purseShort(price: number): string {
    return `you can't cover the ${price} it costs`;
}

// ---------------------------------------------------------------------------
// The rest counter
// ---------------------------------------------------------------------------

/** The rest counter a village resolves with. */
export function villageRestCounter(): VillageRestCounter {
    return { price: VILLAGE_TUNING.restPrice };
}

/**
 * What a village rest costs and heals right now, and why it is refused if it is.
 *
 * @param player - the player (VITAE and purse are read).
 * @param visit  - this visit's record.
 * @returns the price, the heal (a rest node's heal, capped at missing VITAE)
 *   and the refusal: rested this visit, VITAE full, or a short purse, in that order.
 */
export function villageRestQuote(
    player: Pick<Character, 'health' | 'maxHealth' | 'currency'>,
    visit: VillageVisit,
): VillageRestQuote {
    const price = VILLAGE_TUNING.restPrice;
    const heal = previewRestChoiceHeal(player);
    let refusal: string | null = null;
    if (visit.rested) refusal = 'you have rested here this visit';
    else if (heal <= 0) refusal = 'your VITAE is already full';
    else if (player.currency < price) refusal = purseShort(price);
    return { price, heal, refusal };
}

/**
 * Rests at the village: heals, takes the price, clears `dying`, marks the visit rested.
 *
 * @returns the new state and visit with the VITAE healed, or the refusal.
 */
export function restAtVillage<S extends VillageHost>(state: S, visit: VillageVisit): VillageRestResult<S> {
    const quote = villageRestQuote(state.player, visit);
    if (quote.refusal !== null) return { ok: false, refusal: quote.refusal };
    const player: Character = {
        ...state.player,
        health: state.player.health + quote.heal,
        currency: state.player.currency - quote.price,
    };
    // A rest's heal clears `dying`, as the rest node's does (`clearDying`).
    const next: S = { ...state, player };
    if (next.dying) next.dying = undefined;
    return {
        ok: true,
        state: next,
        visit: { ...visit, rested: true },
        spent: quote.price,
        healed: quote.heal,
    };
}

// ---------------------------------------------------------------------------
// The card shop: the offer
// ---------------------------------------------------------------------------

/** mulberry32: the small deterministic generator the minigames use. */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return function next(): number {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * The seed a village's card shop rolls from: the run and the node, so one
 * village offers the same cards all run and two villages differ.
 */
export function villageCardShopSeed(runId: string, nodeId: string): number {
    return seedInputToUint32(`village-card-shop:${runId}:${nodeId}`);
}

/**
 * Draws a card shop's offer: `size` distinct ids from `pool`, seeded.
 *
 * @param pool - the candidate card ids (the player's reward pool).
 * @param seed - `villageCardShopSeed(runId, nodeId)`.
 * @param size - how many to draw; defaults to `VILLAGE_TUNING.cardShopSize`.
 * @returns the drawn ids; fewer than `size` when the pool is smaller.
 */
export function rollVillageCardShop(
    pool: readonly string[],
    seed: number,
    size: number = VILLAGE_TUNING.cardShopSize,
): string[] {
    const rng = mulberry32(seed);
    const remaining = [...new Set(pool)];
    const out: string[] = [];
    while (out.length < size && remaining.length > 0) {
        const i = Math.min(Math.floor(rng() * remaining.length), remaining.length - 1);
        out.push(remaining[i]!);
        remaining.splice(i, 1);
    }
    return out;
}

/**
 * The card shop a village offers this player: three cards from their reward
 * pool (`rewardPoolFor`), seeded by the run and the village's node.
 *
 * @param state  - the run id and the player (whose reward pool is read).
 * @param nodeId - the village's node.
 */
export function villageCardShopFor(
    state: Pick<GameState, 'runId' | 'player'>,
    nodeId: string,
): VillageCardShop {
    return {
        cardIds: rollVillageCardShop(rewardPoolFor(state.player), villageCardShopSeed(state.runId, nodeId)),
        price: VILLAGE_TUNING.cardPrice,
    };
}

// ---------------------------------------------------------------------------
// The card shop: buying
// ---------------------------------------------------------------------------

/**
 * What one of the shop's cards costs, and why it is refused if it is.
 *
 * @returns the refusal: not on offer, sold this visit, or a short purse.
 */
export function villageCardQuote(
    player: Pick<Character, 'currency'>,
    visit: VillageVisit,
    shop: VillageCardShop,
    cardId: string,
): VillageQuote {
    const price = shop.price;
    let refusal: string | null = null;
    if (!shop.cardIds.includes(cardId)) refusal = 'that card is not on offer here';
    else if (visit.boughtCardIds.includes(cardId)) refusal = 'sold this visit';
    else if (player.currency < price) refusal = purseShort(price);
    return { price, refusal };
}

/**
 * Buys a card from the shop: takes the price and adds the card to the deck
 * as a reward card is added.
 */
export function buyVillageCard<S extends VillageHost>(
    state: S,
    visit: VillageVisit,
    shop: VillageCardShop,
    cardId: string,
): VillageBuyResult<S> {
    const quote = villageCardQuote(state.player, visit, shop, cardId);
    if (quote.refusal !== null) return { ok: false, refusal: quote.refusal };
    const paid: Character = { ...state.player, currency: state.player.currency - quote.price };
    return {
        ok: true,
        state: { ...state, player: addRewardCard(paid, cardId) },
        visit: { ...visit, boughtCardIds: [...visit.boughtCardIds, cardId] },
        spent: quote.price,
        cardId,
    };
}

// ---------------------------------------------------------------------------
// The equipment counter
// ---------------------------------------------------------------------------

/** The seed a village's equipment counter rolls from: the run and the node. */
export function villageEquipmentShopSeed(runId: string, nodeId: string): number {
    return seedInputToUint32(`village-equipment-shop:${runId}:${nodeId}`);
}

/**
 * The equipment counter a village offers this player: `shopCount` pieces of
 * the lane the player does not carry (`equipmentDropPool`), seeded by the run
 * and the village's node. Fewer when the pool is smaller, none when the player
 * carries every lane piece.
 *
 * @param state  - the run id and the player (whose satchel and loadout are read).
 * @param nodeId - the village's node.
 */
export function villageEquipmentShopFor(
    state: Pick<GameState, 'runId' | 'player'>,
    nodeId: string,
): VillageEquipmentShop {
    const pool = equipmentDropPool(state.player).map(piece => piece.id);
    return {
        pieceIds: rollVillageCardShop(
            pool,
            villageEquipmentShopSeed(state.runId, nodeId),
            EQUIPMENT_DROP_TUNING.shopCount,
        ),
        price: EQUIPMENT_DROP_TUNING.shopPrice,
    };
}

/**
 * What one of the equipment counter's pieces costs, and why it is refused if it is.
 *
 * @returns the refusal: not on offer, sold this visit, already carried, or a short purse.
 */
export function villageEquipmentQuote(
    player: Pick<Character, 'currency' | 'inventory' | 'equipment'>,
    visit: VillageVisit,
    shop: VillageEquipmentShop,
    pieceId: string,
): VillageQuote {
    const price = shop.price;
    let refusal: string | null = null;
    if (!shop.pieceIds.includes(pieceId)) refusal = 'that piece is not on offer here';
    else if ((visit.boughtEquipmentIds ?? []).includes(pieceId)) refusal = 'sold this visit';
    else if (carriedPieceIds(player).has(pieceId)) refusal = 'you already carry it';
    else if (player.currency < price) refusal = purseShort(price);
    return { price, refusal };
}

/**
 * Buys a piece from the equipment counter: takes the price and puts the piece
 * in the satchel, unworn (the wearer decides from the dock).
 */
export function buyVillageEquipment<S extends VillageHost>(
    state: S,
    visit: VillageVisit,
    shop: VillageEquipmentShop,
    pieceId: string,
): VillageBuyEquipmentResult<S> {
    const quote = villageEquipmentQuote(state.player, visit, shop, pieceId);
    if (quote.refusal !== null) return { ok: false, refusal: quote.refusal };
    const piece = equipmentLibrary.find(candidate => candidate.id === pieceId);
    if (!piece) return { ok: false, refusal: 'that piece is not on offer here' };
    const paid: Character = { ...state.player, currency: state.player.currency - quote.price };
    return {
        ok: true,
        state: { ...state, player: grantItem(paid, piece).character },
        visit: { ...visit, boughtEquipmentIds: [...(visit.boughtEquipmentIds ?? []), pieceId] },
        spent: quote.price,
        pieceId,
    };
}

// ---------------------------------------------------------------------------
// The card shop: removing
// ---------------------------------------------------------------------------

/**
 * What the next removal costs, what the one after it would cost, and why it
 * is refused if it is (a short purse; the deck floor is checked per card by
 * `removeVillageCard`).
 */
export function villageRemovalQuote(player: Pick<Character, 'currency' | 'cardRemovals'>): VillageRemovalQuote {
    const removals = cardRemovalsOf(player);
    const price = cardRemovalPrice(removals);
    return {
        price,
        nextPrice: cardRemovalPrice(removals + 1),
        refusal: player.currency < price ? purseShort(price) : null,
    };
}

/**
 * Removes one copy of a card from the deck for the removal price.
 *
 * @returns the new state (deck, flags, purse and removal count moved), or the
 *   refusal: a short purse, or the primitive's own (not in the deck, the floor).
 */
export function removeVillageCard<S extends VillageHost>(
    state: S,
    visit: VillageVisit,
    cardId: string,
): VillageRemoveResult<S> {
    const quote = villageRemovalQuote(state.player);
    if (quote.refusal !== null) return { ok: false, refusal: quote.refusal };
    const removal = removeCardFromCombatDeck(state.player, cardId, state.flags ?? []);
    if (!removal.ok) return { ok: false, refusal: removal.refusal.reason };
    const player: Character = { ...removal.player, currency: removal.player.currency - quote.price };
    return {
        ok: true,
        state: { ...state, player, flags: removal.flags },
        visit,
        spent: quote.price,
        cardId,
    };
}
