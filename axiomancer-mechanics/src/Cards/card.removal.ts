/**
 * DECK REMOVAL: the engine's way to take a card OUT.
 *
 * This module is the pure primitive; the rest-choice engine and the picker
 * screen sit on top. No player-facing surface lands here.
 *
 * ## What "the deck" means
 *
 * `buildCombatDeck(player)` is the authority, and it deals from TWO
 * lists with different semantics:
 *
 *   - the CARD BASE — `player.knownCards`. It contributes ONE deck copy PER
 *     ENTRY: a base that lists an id three times deals three copies (see
 *     `buildCombatDeck`).
 *   - the REWARDS — `player.combatRewardCards`, duplicates KEPT (extra copies
 *     are the whole point of a deckbuilder pickup).
 *
 * Removal therefore has to answer to whichever list actually owns the copy.
 *
 * ## The rules, in order
 *
 *   1. The card must be IN the deck `buildCombatDeck` would deal. If it is
 *      not, refuse (`not-in-deck`) — a known-but-benched card is not in the
 *      deck, and benching is already free.
 *   2. The deck must be above `MIN_COMBAT_DECK_SIZE`. At the floor, refuse
 *      (`deck-at-floor`) — REFUSED, never clamped.
 *   3. `combatRewardCards` gives up ONE copy if it has one. Rewards are the
 *      bloat the player is paying to undo; the unlock set is the base. One
 *      copy, never all of them: a player who removed a 4-of would otherwise
 *      nuke a quarter of their deck for one price.
 *   4. Otherwise the CARD BASE gives up ONE entry — one deck copy, now that
 *      the base keeps its copies. One `knownCards` entry leaves. A 3-of loses
 *      one copy and stays a 2-of, which is what one removal is supposed to
 *      buy. (Both lists really do carry duplicates in shipped data — the
 *      mobile starter-bundle path writes the preset recipe into `knownCards`
 *      verbatim, 3× copies and all.)
 *
 * Every accepted removal increments `Character.cardRemovals`, the per-run
 * counter the escalating price reads (`card.removal.pricing.ts`).
 *
 * ## What this does NOT do
 *
 * It spends no currency (the rest-choice engine's transaction), touches no RNG (removal is fully
 * deterministic — there is nothing to roll), and goes nowhere near the LOCKED
 * MECHANICS: Conviction, the Surge meter and the Dice system are not read or
 * written here. A thinner deck draws the same hands off the same dice.
 */

import type { Character } from '../Character/types';
import { buildCombatDeck } from '../Combat/combat.deck';
import { cardRemovalsOf } from './card.removal.pricing';
import type {
    CardRemovalRefusalCode,
    CardRemovalResult,
    CardRemovalSource,
} from './card.removal.types';

/**
 * The deck-size floor. Removal that would take `buildCombatDeck`'s output
 * below this is REFUSED, not clamped.
 *
 * **10, from the grey office.** A fresh run deals a
 * 10-card starting deck (`grey-strike` ×5, `grey-ward` ×3, `grey-word` ×2 — see
 * `Combat/combat.rewards.ts`'s `STARTING_CARD_IDS`), the smallest shipped
 * starting shape in the tree, so the floor tracks it: **10 = 2 ×
 * `COMBAT_HAND_SIZE`** (5), the reshuffle-inside-one-round bound below which
 * the draw pile reshuffles inside a single round and every fight deals the
 * same hand. A fresh run's first CUT is legal only after the first reward
 * card is taken (10 + 1 reward > floor) — the intended tempo.
 * `card-removal.engine.test.ts` pins the derivation, so a future re-cut of
 * the starting deck forces this to be re-derived rather than silently
 * drifting.
 */
export const MIN_COMBAT_DECK_SIZE = 10;

/** Loud copy per refusal code. Kept beside the codes so they never drift. */
function refusalReason(code: CardRemovalRefusalCode, cardId: string, deckSize: number): string {
    switch (code) {
        case 'not-in-deck':
            return `Cannot remove '${cardId}': it is not in the combat deck. `
                + 'Only cards the deck actually deals can be removed — a card you '
                + 'know but have not seated is already out of the fight.';
        case 'deck-at-floor':
            return `Cannot remove '${cardId}': the deck is at its floor of `
                + `${MIN_COMBAT_DECK_SIZE} cards (currently ${deckSize}). `
                + 'A deck this thin deals the same hand every fight. Earn more '
                + 'cards before cutting another.';
    }
}

/** Returns `list` with the FIRST occurrence of `id` dropped. */
function dropOneCopy(list: readonly string[], id: string): string[] {
    const i = list.indexOf(id);
    return i === -1 ? list.slice() : [...list.slice(0, i), ...list.slice(i + 1)];
}

/**
 * Removes one copy of `cardId` from the player's combat deck, or refuses.
 *
 * PURE: returns a new `Character` on success; on refusal it returns the SAME
 * `Character` reference it was handed (so a caller can assert nothing moved).
 *
 * @param player - The character whose deck is being thinned. Never mutated.
 * @param cardId - The card id to remove one copy of.
 * @returns A {@link CardRemovalResult} — narrow on `ok`. A refusal is a
 *   first-class value carrying a stable `code` and a loud `reason`; nothing is
 *   thrown, and the floor is never silently clamped.
 *
 * @example
 * const result = removeCardFromCombatDeck(player, 'spoiled-poultice');
 * if (!result.ok) return showRefusal(result.refusal.reason);
 * apply({ player: result.player });
 */
export function removeCardFromCombatDeck(
    player: Character,
    cardId: string,
): CardRemovalResult {
    const deckBefore = buildCombatDeck(player);
    const deckSizeBefore = deckBefore.length;
    const removals = cardRemovalsOf(player);

    const refuse = (code: CardRemovalRefusalCode): CardRemovalResult => ({
        ok: false,
        player,
        cardId,
        removedFrom: null,
        deckSizeBefore,
        deckSizeAfter: deckSizeBefore,
        removals,
        floor: MIN_COMBAT_DECK_SIZE,
        refusal: {
            code,
            reason: refusalReason(code, cardId, deckSizeBefore),
            cardId,
            deckSize: deckSizeBefore,
            floor: MIN_COMBAT_DECK_SIZE,
        },
    });

    // Rule 1 — it has to be in the deck the engine would actually deal.
    if (!deckBefore.includes(cardId)) return refuse('not-in-deck');
    // Rule 2 — the floor is a refusal, never a clamp.
    if (deckSizeBefore <= MIN_COMBAT_DECK_SIZE) return refuse('deck-at-floor');

    const rewards = player.combatRewardCards ?? [];
    const known = player.knownCards ?? [];

    let nextRewards = rewards;
    let nextKnown = known;
    let removedFrom: CardRemovalSource;

    if (rewards.includes(cardId)) {
        // Rule 3 — rewards drain first, ONE copy.
        nextRewards = dropOneCopy(rewards, cardId);
        removedFrom = 'rewards';
    } else {
        // Rule 4 — the card base gives up exactly ONE copy.
        //
        // The base keeps its copies (see `buildCombatDeck`), which makes
        // entries and deck copies one-for-one — so draining the list would
        // delete a 3-of for the price of a single removal. One `knownCards`
        // entry leaves.
        removedFrom = 'known';
        const kept = dropOneCopy(known, cardId);
        if (kept.length !== known.length) nextKnown = kept;
    }

    // Only write the lists that actually changed, so a sparse-optional
    // `combatRewardCards` is never materialised into an empty array.
    const nextPlayer: Character = { ...player, cardRemovals: removals + 1 };
    if (nextKnown !== known) nextPlayer.knownCards = nextKnown;
    if (nextRewards !== rewards) nextPlayer.combatRewardCards = nextRewards;

    return {
        ok: true,
        player: nextPlayer,
        cardId,
        removedFrom,
        deckSizeBefore,
        deckSizeAfter: buildCombatDeck(nextPlayer).length,
        removals: removals + 1,
        floor: MIN_COMBAT_DECK_SIZE,
        refusal: null,
    };
}

export {
    CARD_REMOVAL_PRICING,
    cardRemovalPrice,
    cardRemovalPriceFor,
    cardRemovalsOf,
    canAffordCardRemoval,
} from './card.removal.pricing';
export type {
    CardRemovalRefusal,
    CardRemovalRefusalCode,
    CardRemovalResult,
    CardRemovalSource,
    CardRemovalAccepted,
    CardRemovalRefused,
} from './card.removal.types';
