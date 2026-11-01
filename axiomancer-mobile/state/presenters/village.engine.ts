/**
 * Village encounter presenter — composes the settlement screen's VM from the
 * pending `village` event. Pure: no store writes, no rules of its own.
 *
 * A village is a hub of counters, each present only when the event carries it:
 *  - the paid rest (`rest`): price, the VITAE it restores, and its refusal;
 *  - the card shop (`cardShop`): the three offered cards as real card faces,
 *    each with its price and refusal (sold this visit, a short purse), and
 *    card removal: the escalating price, its refusal, and the deck's cards;
 *  - the equipment counter (`equipmentShop`): the weapons and armor on offer,
 *    each with its price and refusal (sold this visit, a short purse);
 *  - the Anvil (`anvil`): opens the existing Anvil session.
 * Every price and refusal is the engine's (`World/Village`, the Anvil's
 * `ANVIL_VERB_PRICING`); a refused counter is shown with its reason, never
 * hidden. The village sells cards, weapons and armor, and buys nothing back.
 */

import {
    ANVIL_VERB_PRICING,
    FRESH_VILLAGE_VISIT,
    buildCombatDeck,
    equipmentLibrary,
    getCardById,
    villageCardQuote,
    villageEquipmentQuote,
    villageRemovalQuote,
    villageRestQuote,
    type BlacksmithVariantOffer,
    type VillageVisit,
} from '@mechanics';
import type { AppStoreState } from '@/state/store';
import { rewardCardVMs, type CombatCardVM } from './combat-encounter.engine';
import { villageRestEffect } from './village.copy';

export interface VillageMerchantVM {
    name: string;
    /** First dialogue line, used as the merchant's stall-call. */
    line: string;
    /** Merchant has a walkable dialogue tree. */
    hasDialogue: boolean;
}

/** The paid rest counter. */
export interface VillageRestVM {
    price: number;
    /** VITAE the rest would restore now (a rest node's heal, capped at missing). */
    heal: number;
    /** What the shillings buy, in one line. */
    effect: string;
    enabled: boolean;
    /** Why the rest is refused (rested this visit, VITAE full, a short purse); null when it is not. */
    refusal: string | null;
}

/** One card on the card shop's counter. */
export interface VillageShopCardVM {
    cardId: string;
    name: string;
    /** The card's own face, the one face the game draws a card with. */
    face: CombatCardVM;
    price: number;
    /** Bought this visit. */
    sold: boolean;
    enabled: boolean;
    refusal: string | null;
}

/** One piece on the equipment counter. */
export interface VillageShopPieceVM {
    pieceId: string;
    name: string;
    /** The satchel's slot label: `Weapon` or `Armor`. */
    sub: 'Weapon' | 'Armor';
    price: number;
    /** Bought this visit. */
    sold: boolean;
    enabled: boolean;
    refusal: string | null;
}

/** One row of the removal picker: a deck card, its copies counted. */
export interface VillageRemovableCardVM {
    cardId: string;
    name: string;
    count: number;
}

/** Card removal, the card shop's second service. */
export interface VillageRemovalVM {
    price: number;
    /** What the removal after this one would cost. */
    nextPrice: number;
    enabled: boolean;
    refusal: string | null;
    /** The deck's distinct cards, deck order. */
    cards: readonly VillageRemovableCardVM[];
}

/** The card shop counter: its offer and the removal service. */
export interface VillageCardShopVM {
    cards: readonly VillageShopCardVM[];
    removal: VillageRemovalVM;
}

/** The village's Anvil counter: what the button names and what opening it seeds. */
export interface VillageAnvilVM {
    /** Variant gear on offer at the anvil (swap targets), handed to the session. */
    variants: readonly BlacksmithVariantOffer[];
    /** The smith's cheapest work in shillings (`ANVIL_VERB_PRICING.hone`). */
    cheapestWork: number;
}

export interface VillageVM {
    active: boolean;
    villageName: string;
    body: string;
    merchants: readonly VillageMerchantVM[];
    currency: number;
    health: number;
    maxHealth: number;
    /** The paid rest, when this village lets a bed; null otherwise. */
    rest: VillageRestVM | null;
    /** The card shop, when this village has one; null otherwise. */
    cardShop: VillageCardShopVM | null;
    /** The weapons and armor on offer, when the village stocks any; null otherwise. */
    equipmentShop: readonly VillageShopPieceVM[] | null;
    /** The Anvil counter, when this village has a smith; null otherwise. */
    anvil: VillageAnvilVM | null;
}

const EMPTY_VM: VillageVM = Object.freeze({
    active: false,
    villageName: '',
    body: '',
    merchants: Object.freeze([]),
    currency: 0,
    health: 0,
    maxHealth: 0,
    rest: null,
    cardShop: null,
    equipmentShop: null,
    anvil: null,
});

/**
 * The deck's distinct cards with their copy counts, in first-seen order.
 *
 * @param deck - `buildCombatDeck` output, copies repeated.
 */
export function removableCards(deck: readonly string[]): VillageRemovableCardVM[] {
    const counts = new Map<string, number>();
    for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts].map(([cardId, count]) => ({
        cardId,
        name: getCardById(cardId)?.name ?? cardId,
        count,
    }));
}

/**
 * Compose the settlement screen's view-model from the pending event.
 *
 * @param state - the event slice (the pending `village` payload and this
 *   visit's record), the player (purse, VITAE, deck) and the flags (the deck's
 *   loadout).
 * @returns the render-ready `VillageVM`, or the inactive `EMPTY_VM` when no
 *   village event is pending.
 */
export function selectVillageVM(
    state: Pick<AppStoreState, 'event' | 'player'> & { flags?: readonly string[] },
): VillageVM {
    const pending = state.event?.pending;
    if (!pending || pending.event.kind !== 'village') return EMPTY_VM;
    const event = pending.event;
    const visit: VillageVisit = state.event?.villageVisit ?? FRESH_VILLAGE_VISIT;
    const player = state.player;
    const currency = player?.currency ?? 0;

    const merchants: VillageMerchantVM[] = event.merchants.map(npc => {
        const tree = npc.dialogueTree;
        const rootText = tree ? tree.nodes[tree.rootId]?.text ?? '' : '';
        return {
            name: npc.name,
            line: rootText,
            hasDialogue: tree !== undefined && rootText.length > 0,
        };
    });

    let rest: VillageRestVM | null = null;
    if (event.rest && player) {
        const quote = villageRestQuote(player, visit);
        rest = {
            price: quote.price,
            heal: quote.heal,
            effect: villageRestEffect(quote.heal),
            enabled: quote.refusal === null,
            refusal: quote.refusal,
        };
    }

    let cardShop: VillageCardShopVM | null = null;
    if (event.cardShop && player) {
        const shop = event.cardShop;
        const faces = rewardCardVMs(shop.cardIds);
        const cards: VillageShopCardVM[] = faces.map(face => {
            const quote = villageCardQuote(player, visit, shop, face.cardId);
            return {
                cardId: face.cardId,
                name: face.name,
                face,
                price: quote.price,
                sold: visit.boughtCardIds.includes(face.cardId),
                enabled: quote.refusal === null,
                refusal: quote.refusal,
            };
        });
        const removalQuote = villageRemovalQuote(player);
        cardShop = {
            cards,
            removal: {
                price: removalQuote.price,
                nextPrice: removalQuote.nextPrice,
                enabled: removalQuote.refusal === null,
                refusal: removalQuote.refusal,
                cards: removableCards(buildCombatDeck(player, state.flags ?? [])),
            },
        };
    }

    let equipmentShop: VillageShopPieceVM[] | null = null;
    if (event.equipmentShop && player) {
        const shop = event.equipmentShop;
        equipmentShop = shop.pieceIds.flatMap((pieceId): VillageShopPieceVM[] => {
            const piece = equipmentLibrary.find(candidate => candidate.id === pieceId);
            if (!piece || (piece.slot !== 'weapon' && piece.slot !== 'armor')) return [];
            const quote = villageEquipmentQuote(player, visit, shop, pieceId);
            return [{
                pieceId,
                name: piece.name,
                sub: piece.slot === 'weapon' ? 'Weapon' : 'Armor',
                price: quote.price,
                sold: (visit.boughtEquipmentIds ?? []).includes(pieceId),
                enabled: quote.refusal === null,
                refusal: quote.refusal,
            }];
        });
    }

    return {
        active: true,
        villageName: event.villageName,
        body: event.description && event.description.length > 0
            ? event.description
            : 'Roofs and smoke and the particular noise of people who all know ' +
              'each other. Shillings are welcome. Strangers are tolerated, provided ' +
              'they become customers promptly.',
        merchants,
        currency,
        health: player?.health ?? 0,
        maxHealth: player?.maxHealth ?? 0,
        rest,
        cardShop,
        equipmentShop,
        anvil: event.anvil
            ? { variants: event.anvil.variants ?? [], cheapestWork: ANVIL_VERB_PRICING.hone }
            : null,
    };
}
