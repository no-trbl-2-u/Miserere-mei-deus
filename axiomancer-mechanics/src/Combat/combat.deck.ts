/**
 * Hazard-pattern combat: card deck.
 *
 * Mirrors the Hazard deck-management pattern (`src/World/Hazard/hazard.engine`
 * `drawFromPile` / `refillPile`): Fisher-Yates shuffle, draw-up-to-N, and
 * reshuffle-the-discard when the draw pile runs dry. The Hazard engine threads
 * its own `HazardRngState`; combat threads the seedable global RNG singleton so
 * dice, deck, and card procs share one reproducible stream (hermetic via
 * `mockFixedRng` / `setSeed`).
 *
 * The player's combat deck is built from their learned cards. There is
 * no in-combat escape card — once a fight is joined it resolves only by
 * winning or losing. Every character preset grants a starting kit of cards
 * (`TIER_1_CARDS`), so a real player never reaches combat with an empty
 * deck; the always-available `Signature Skills` kit (`combat.signature.ts`,
 * funded by Conviction, independent of the drawn hand) is the real fallback
 * action space regardless of deck contents.
 */

import { getRng } from '../Utils/rng';
import type { Character } from '../Character/types';

/** Hand-size target. The opening hand draws this many; every round boundary
 *  REFILLS the hand up to this target (keep-hand rule): unplayed
 *  cards stay in hand and occupy draw room, so holding a card is a real cost —
 *  a dead card clogs the hand until it is played or scrapped, instead of being
 *  silently recycled by a full redraw. */
export const COMBAT_HAND_SIZE = 5;

const defaultRng = (): number => getRng().random();

/** Fisher–Yates shuffle over the global/explicit `() => number` RNG. Pure. */
export function shuffleCombatDeck<T>(items: readonly T[], rng: () => number = defaultRng): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.min(i, Math.floor(rng() * (i + 1)));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/**
 * Builds the player's combat deck from `knownCards` plus the reward cards.
 *
 * Card ids are card ids (kebab-case). Reward cards stack on top of the card
 * base. No escape card is appended — see the file header.
 *
 * COPIES ARE REAL, IN BOTH LISTS. The card base is NOT de-duplicated: every
 * time the base names an id it contributes one deck copy, exactly as the
 * reward list does. The mobile starter-bundle path writes a recipe into
 * `knownCards` verbatim, copies and all, and a deckbuilder's copy counts are
 * load-bearing (a de-duplicated deck would reshuffle inside a single round
 * and could sit below `MIN_COMBAT_DECK_SIZE`).
 *
 * Order is preserved from both lists, so opening hands deal from an
 * authored order before the shuffle touches them.
 *
 * @param player - Character whose `knownCards` / `combatRewardCards` supply the base.
 */
export function buildCombatDeck(player: Character): string[] {
    const base = player.knownCards ?? [];
    // The card base keeps its copies (see the note above) and its order.
    const deck: string[] = [...base];
    // Reward cards stack on top (DUPLICATES kept: extra
    // copies are the whole point of a deckbuilder pickup).
    for (const id of player.combatRewardCards ?? []) deck.push(id);
    return deck;
}

export interface DrawResult {
    drawn: string[];
    drawPile: string[];
    discard: string[];
}

/**
 * Draws up to `n` cards from `drawPile`. When the pile runs dry, the discard is
 * shuffled back in (reshuffle-discard-on-empty — same as Hazard). The full
 * `deck` is the fallback shuffle source when both pile and discard are empty
 * (so a tiny deck never starves the hand).
 */
export function drawCombatCards(
    drawPile: readonly string[],
    discard: readonly string[],
    deck: readonly string[],
    n: number,
    rng: () => number = defaultRng,
): DrawResult {
    let pile = drawPile.slice();
    let disc = discard.slice();
    const drawn: string[] = [];
    for (let i = 0; i < n; i++) {
        if (pile.length === 0) {
            // Reshuffle the discard; if that is also empty, reshuffle the whole deck.
            const source = disc.length > 0 ? disc : deck;
            if (source.length === 0) break;
            pile = shuffleCombatDeck(source, rng);
            disc = [];
        }
        drawn.push(pile.shift() as string);
    }
    return { drawn, drawPile: pile, discard: disc };
}
