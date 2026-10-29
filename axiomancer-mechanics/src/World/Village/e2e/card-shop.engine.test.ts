/**
 * The village card shop (NK1c A9, A10) — hermetic engine suite.
 *
 * Pins: the offer is three distinct cards from the player's reward pool,
 * seeded by the run and the node (the same three every time for one village,
 * a different roll for another village or another run); buying one takes 6
 * shillings and joins the deck as a reward card does, once per visit; a short
 * purse or an unoffered card is refused and moves nothing; removal costs the
 * escalating removal price, bumps `cardRemovals` and honours the deck floor.
 * Driven through the public barrel, the path mobile imports.
 */

import { describe, expect, it } from 'vitest';

import {
    FRESH_VILLAGE_VISIT,
    VILLAGE_TUNING,
    buildCombatDeck,
    buyVillageCard,
    cardRemovalPrice,
    createNewGameState,
    removeVillageCard,
    rewardPoolFor,
    STARTING_CARD_IDS,
    rollVillageCardShop,
    villageCardQuote,
    villageCardShopFor,
    villageCardShopSeed,
    villageRemovalQuote,
} from '../../../index';
import type { GameState, VillageCardShop } from '../../../index';

const POOL = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** A fresh game holding the grey office's ten-card starting deck (the floor). */
function game(currency: number, overrides: Partial<GameState['player']> = {}): GameState {
    const base = createNewGameState();
    return {
        ...base,
        flags: [],
        player: { ...base.player, knownCards: [...STARTING_CARD_IDS], combatRewardCards: [], currency, ...overrides },
    };
}

describe('the card shop offer (A9)', () => {
    it('draws three distinct cards from the pool', () => {
        const offer = rollVillageCardShop(POOL, 7);
        expect(offer).toHaveLength(VILLAGE_TUNING.cardShopSize);
        expect(new Set(offer).size).toBe(3);
        for (const id of offer) expect(POOL).toContain(id);
    });

    it('is the same three for the same run and node, whatever else happened', () => {
        const seed = villageCardShopSeed('run-1', 'bw-16');
        expect(rollVillageCardShop(POOL, seed)).toEqual(rollVillageCardShop(POOL, seed));
        expect(villageCardShopSeed('run-1', 'bw-16')).toBe(seed);
    });

    it('rolls differently for another node or another run', () => {
        const here = villageCardShopSeed('run-1', 'bw-16');
        expect(villageCardShopSeed('run-1', 'cw-18')).not.toBe(here);
        expect(villageCardShopSeed('run-2', 'bw-16')).not.toBe(here);
        const offers = new Set(['bw-16', 'cw-18', 'bc-12', 'ld-14'].map(n =>
            rollVillageCardShop(POOL, villageCardShopSeed('run-1', n)).join(',')));
        expect(offers.size).toBeGreaterThan(1);
    });

    it('offers fewer when the pool is smaller, never a duplicate', () => {
        expect(rollVillageCardShop(['a', 'a', 'b'], 1).sort()).toEqual(['a', 'b']);
        expect(rollVillageCardShop([], 1)).toEqual([]);
    });

    it("draws from the player's own reward pool at the tuned price", () => {
        const state = game(0);
        const shop = villageCardShopFor(state, 'bw-16');
        const pool = rewardPoolFor(state.player);
        expect(shop.price).toBe(6);
        expect(shop.cardIds.length).toBe(Math.min(3, new Set(pool).size));
        for (const id of shop.cardIds) expect(pool).toContain(id);
        expect(villageCardShopFor(state, 'bw-16')).toEqual(shop);
    });
});

describe('buying a card (A9)', () => {
    const shop: VillageCardShop = { cardIds: ['grey-strike', 'grey-ward', 'grey-word'], price: 6 };

    it('takes 6 shillings and the card joins the combat deck', () => {
        const state = game(10);
        const before = buildCombatDeck(state.player, state.flags);
        const r = buyVillageCard(state, FRESH_VILLAGE_VISIT, shop, 'grey-ward');
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.spent).toBe(6);
        expect(r.state.player.currency).toBe(4);
        const after = buildCombatDeck(r.state.player, r.state.flags);
        expect(after).toHaveLength(before.length + 1);
        expect(after.filter(id => id === 'grey-ward').length)
            .toBe(before.filter(id => id === 'grey-ward').length + 1);
        expect(r.visit.boughtCardIds).toEqual(['grey-ward']);
    });

    it('sells each offered card once per visit', () => {
        const first = buyVillageCard(game(20), FRESH_VILLAGE_VISIT, shop, 'grey-ward');
        if (!first.ok) throw new Error('first buy refused');
        const again = buyVillageCard(first.state, first.visit, shop, 'grey-ward');
        expect(again).toEqual({ ok: false, refusal: 'sold this visit' });
        expect(buyVillageCard(first.state, first.visit, shop, 'grey-word').ok).toBe(true);
    });

    it('a short purse is refused, loudly, and nothing moves', () => {
        const state = game(5);
        expect(villageCardQuote(state.player, FRESH_VILLAGE_VISIT, shop, 'grey-ward').refusal).toMatch(/cover the 6/);
        const r = buyVillageCard(state, FRESH_VILLAGE_VISIT, shop, 'grey-ward');
        expect(r.ok).toBe(false);
        expect(state.player.currency).toBe(5);
    });

    it('a card the shop does not offer is refused', () => {
        const r = buyVillageCard(game(50), FRESH_VILLAGE_VISIT, shop, 'not-offered');
        expect(r).toEqual({ ok: false, refusal: 'that card is not on offer here' });
    });
});

describe('removing a card (A10)', () => {
    /** A deck one above the floor, so one removal is legal. */
    function thick(currency: number, cardRemovals = 0): GameState {
        const state = game(currency, { cardRemovals });
        return { ...state, player: { ...state.player, combatRewardCards: ['grey-ward'] } };
    }

    it('costs the removal price (5 + 5 x removals) and bumps the count', () => {
        expect(villageRemovalQuote({ currency: 50, cardRemovals: 0 })).toEqual({ price: 5, nextPrice: 10, refusal: null });
        const state = thick(50, 2);
        const before = buildCombatDeck(state.player, state.flags);
        const r = removeVillageCard(state, FRESH_VILLAGE_VISIT, 'grey-ward');
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.spent).toBe(cardRemovalPrice(2));
        expect(r.state.player.currency).toBe(50 - 15);
        expect(r.state.player.cardRemovals).toBe(3);
        expect(buildCombatDeck(r.state.player, r.state.flags)).toHaveLength(before.length - 1);
    });

    it('a short purse is refused before the deck is touched', () => {
        const r = removeVillageCard(thick(4), FRESH_VILLAGE_VISIT, 'grey-ward');
        expect(r).toEqual({ ok: false, refusal: "you can't cover the 5 it costs" });
    });

    it('the deck floor and an unheld card are refused with the primitive\'s reason', () => {
        const atFloor = game(50);
        const floor = removeVillageCard(atFloor, FRESH_VILLAGE_VISIT, 'grey-strike');
        expect(floor.ok).toBe(false);
        if (!floor.ok) expect(floor.refusal).toMatch(/floor/);
        const unheld = removeVillageCard(thick(50), FRESH_VILLAGE_VISIT, 'no-such-card');
        expect(unheld.ok).toBe(false);
        if (!unheld.ok) expect(unheld.refusal).toMatch(/not in the combat deck/);
    });
});
