/**
 * Loot-cache choice encounter ("The Reliquary") — engine types.
 *
 * A loot-cache node is one irreversible choice of two — `card` (a rolled
 * reward card) or `item` (a tier-scaled consumable haul + the node's
 * currency). Two-way like every minigame here: the engine
 * never reads `GameState`, and the host settles the outcome against the
 * real `Character` at claim time. Unlike `RestChoice`'s `cut`, no offer
 * here needs a sub-picker — the `card`/`item` candidates are rolled by the
 * host (who alone has `Character`/RNG-with-deck-context access) and simply
 * named in the outcome, so every offer commits straight to `outcome`.
 */

import type { SeedInput } from '../seed';
import type { Item } from '../../Items/types';
import type { LootCacheActionLines } from '../MapEvents/types';

/** The two offers on the table. Exactly one may be committed; both are always live. */
export type LootCacheChoiceOfferId = 'card' | 'item';

export type LootCacheChoicePhase =
    | 'offer'      // two offers on the table
    | 'outcome'    // the settled ledger
    | 'done';      // host claimed

/** The claim-time ledger. Narrow on `chosen` for the fields that apply. */
export interface LootCacheChoiceOutcome {
    chosen: LootCacheChoiceOfferId;
    /** The host-rolled card id to grant — non-null iff `chosen === 'card'`. */
    rewardCardId: string | null;
    /** The host-rolled consumables to grant — non-empty iff `chosen === 'item'`. */
    items: readonly Item[];
    /** The authored node's currency to grant — >0 iff `chosen === 'item'`. */
    currency: number;
}

export interface LootCacheChoiceSession {
    phase: LootCacheChoicePhase;
    /** `rollCombatCardRewards(player, rng, 1)[0]` — the `card` offer's candidate. */
    cardCandidate: string;
    /** `rollCacheReward(...)` output — the `item` offer's candidates. */
    itemCandidates: readonly Item[];
    /** The authored MapEvent payload's currency, carried for the `item` offer. */
    currencyCandidate: number;
    /** The authored MapEvent one-liner, preferred over a placeholder intro when present. */
    description: string | null;
    /**
     * What you DO for each choice, never what you get. Always both lines: an
     * authored cache's own, else `CACHE_ACTION_PLACEHOLDER`.
     */
    actions: LootCacheActionLines;
    outcome: LootCacheChoiceOutcome | null;
    seed: SeedInput;
}
