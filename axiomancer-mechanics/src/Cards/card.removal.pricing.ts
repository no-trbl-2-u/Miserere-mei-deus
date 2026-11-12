/**
 * Deck removal: THE ESCALATING PRICE.
 *
 * Removal is *"a low price to start, but every time the
 * player does this across the game, it costs a little more."* The curve is
 * LINEAR — `base + step × removals` — deliberately, not exponential: an
 * exponential curve prices the fourth removal out of the game entirely, and
 * thinning a deck is a strategy the player should be able to commit to.
 *
 * The counter is PER RUN (`Character.cardRemovals`), not per node and not
 * lifetime-across-runs.
 *
 * PRICES ARE RATIFIED against MEASURED income: a full Breakwater walk
 * guarantees 296 shillings (`BREAKWATER_SHILLINGS_FLOOR`): 44 from its five
 * loot caches (`COAST_LOOT_CACHES`: 8 + 12 + 6 + 12 + 6) and 252 in fight
 * wages (`fightWage(level)`, 3 a level, paid by the reducer on every win: 14
 * fights at 56 levels = 168, three elites at levels 5, 7 and 8 = 60, the door
 * boss at level 8 = 24). Hazard purses are upside, not floor, and a spared
 * foe pays more than its wage. Shop wares run ~1-12. `base` sits well under a
 * single loot-cache find so the first cut is obviously affordable early. The
 * old reasoning that the fourth/fifth cut (20 / 25) "approaches a full act's
 * income" no longer holds against that floor: the five cuts total 75, about a
 * quarter of it. The prices stay as T set them; whether they are still right
 * is T's call at a tuning pass. Do not fork copies of these numbers: read the
 * constant.
 *
 * This module charges nothing. `removeCardFromCombatDeck` deliberately does
 * not spend currency — pricing is the CALLER's transaction (the rest-choice
 * engine debits `Character.currency`), so the primitive stays single-purpose
 * and testable without an economy.
 */

import type { Character } from '../Character/types';

/**
 * What a full Breakwater walk guarantees, in shillings, with its parts. A test
 * (`card.removal.pricing.engine.test.ts`) recomputes both parts from the tables
 * and fails when this and the comments quoting it drift.
 */
export const BREAKWATER_SHILLINGS_FLOOR = Object.freeze({
    /** The five loot-cache purses (`COAST_LOOT_CACHES`). */
    caches: 44,
    /** `fightWage(level)` on every fight, elite and boss node. */
    wages: 252,
    total: 296,
});

/**
 * The removal curve, ratified against measured income. Currency
 * unit is SHILLINGS (`Character.currency`).
 */
export const CARD_REMOVAL_PRICING = Object.freeze({
    /** What the FIRST removal of a run costs. */
    base: 5,
    /** What each subsequent removal adds. Linear, not a factor. */
    step: 5,
});

/**
 * Reads a character's per-run removal count. Absent (sparse-optional) reads as
 * 0 — this is the single seam, so a fresh save (field absent) and a migrated
 * v16 save (field materialised to 0) answer identically.
 */
export function cardRemovalsOf(player: Pick<Character, 'cardRemovals'>): number {
    const n = player.cardRemovals;
    return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * The price of the NEXT removal given how many have already been made this
 * run: 5 / 10 / 15 / 20 … Negative or non-finite input floors at 0 removals.
 *
 * @param removals - Removals already made this run (`Character.cardRemovals`).
 */
export function cardRemovalPrice(removals: number): number {
    const n = Number.isFinite(removals) && removals > 0 ? Math.floor(removals) : 0;
    return CARD_REMOVAL_PRICING.base + CARD_REMOVAL_PRICING.step * n;
}

/** The price of this character's next removal. Sugar over `cardRemovalPrice`. */
export function cardRemovalPriceFor(player: Pick<Character, 'cardRemovals'>): number {
    return cardRemovalPrice(cardRemovalsOf(player));
}

/** Whether the character can afford their next removal. Read-only; spends nothing. */
export function canAffordCardRemoval(player: Pick<Character, 'cardRemovals' | 'currency'>): boolean {
    return player.currency >= cardRemovalPriceFor(player);
}
