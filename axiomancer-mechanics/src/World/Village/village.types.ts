/**
 * Village counters — engine types.
 *
 * A village is a hub of counters: a paid rest, a card shop (buy one of three
 * cards, or pay to remove one) and the Anvil (`World/Blacksmith`). The hub
 * stays open while the player uses its counters, so what was done THIS VISIT
 * is a small record the host keeps beside the pending village event
 * (`VillageVisit`); the engine never stores it in a save. A fresh arrival is
 * a fresh visit.
 */

import type { GameState } from '../../Game/types';

/** The resolved rest counter: what a night at the village costs. */
export interface VillageRestCounter {
    /** Shillings the rest costs (`VILLAGE_TUNING.restPrice`). */
    price: number;
}

/**
 * The resolved card shop: the cards on offer and what each costs. The offer is
 * seeded by the run and the node (`villageCardShopFor`), so a village offers
 * the same cards every time the player stands in it this run.
 */
export interface VillageCardShop {
    /** Card ids on offer, distinct, at most `VILLAGE_TUNING.cardShopSize`. */
    cardIds: readonly string[];
    /** Shillings each card costs (`VILLAGE_TUNING.cardPrice`). */
    price: number;
}

/**
 * The resolved equipment counter: the weapons and armor on offer and what each
 * costs. Rolled once when the village opens, from the pieces the player does
 * not carry (`villageEquipmentShopFor`).
 */
export interface VillageEquipmentShop {
    /** Equipment ids on offer, distinct, at most `EQUIPMENT_DROP_TUNING.shopCount`. */
    pieceIds: readonly string[];
    /** Shillings each piece costs (`EQUIPMENT_DROP_TUNING.shopPrice`). */
    price: number;
}

/** What the player has done at the village this visit. */
export interface VillageVisit {
    /** The rest counter was used (a village rests once per visit). */
    rested: boolean;
    /** Card ids bought this visit; each offered card sells once per visit. */
    boughtCardIds: readonly string[];
    /** Equipment ids bought this visit; each offered piece sells once. Absent on a fresh visit. */
    boughtEquipmentIds?: readonly string[];
}

/** The slice of the game a counter reads and writes. */
export type VillageHost = Pick<GameState, 'player' | 'flags'> & Partial<Pick<GameState, 'dying'>>;

/** A counter's price right now, and the loud reason it is refused, if it is. */
export interface VillageQuote {
    price: number;
    /** Null when the counter can be used; otherwise the reason it cannot. */
    refusal: string | null;
}

/** The rest counter's quote, with the VITAE the rest would restore. */
export interface VillageRestQuote extends VillageQuote {
    heal: number;
}

/** The removal quote, with what the removal after this one would cost. */
export interface VillageRemovalQuote extends VillageQuote {
    nextPrice: number;
}

/** A counter that was refused: nothing moved. */
export interface VillageRefused {
    ok: false;
    refusal: string;
}

/** A counter that was used: the host's new state, the visit after it, and what it cost. */
export interface VillageAccepted<S extends VillageHost> {
    ok: true;
    state: S;
    visit: VillageVisit;
    spent: number;
}

export type VillageRestResult<S extends VillageHost> =
    | (VillageAccepted<S> & { healed: number })
    | VillageRefused;

export type VillageBuyResult<S extends VillageHost> =
    | (VillageAccepted<S> & { cardId: string })
    | VillageRefused;

export type VillageBuyEquipmentResult<S extends VillageHost> =
    | (VillageAccepted<S> & { pieceId: string })
    | VillageRefused;

export type VillageRemoveResult<S extends VillageHost> =
    | (VillageAccepted<S> & { cardId: string })
    | VillageRefused;
