/**
 * Rest-choice encounter — engine types.
 *
 * A rest node is one irreversible choice of two: `rest` (free, flat-25%
 * heal) or `upgrade` (free, ONE card upgraded instead of the heal). Card
 * removal is a village counter (`World/Village`), not a rest offer. Two-way
 * like every minigame here: the engine never reads `GameState`, and the host
 * settles the outcome ledger against the real `Character` at claim time —
 * including the actual `replaceCard` call, which needs the full
 * card-base/reward-list accounting this engine does not carry.
 */

import type { SeedInput } from '../seed';
import type { RestShelter } from '../MapEvents/types';

export type { RestShelter };

/** The two offers on the table. Exactly one may be committed. */
export type RestChoiceOfferId = 'rest' | 'upgrade';

/** One offer's price + loud affordability. */
export interface RestChoiceOffer {
    id: RestChoiceOfferId;
    cost: number;
    disabledReason?: string;
}

export type RestChoicePhase =
    | 'offer'        // two offers on the table
    | 'upgrade-pick' // choosing a card to upgrade
    | 'outcome'    // the settled ledger
    | 'done';      // host claimed

/** The claim-time ledger. Narrow on `chosen` for the fields that apply. */
export interface RestChoiceOutcome {
    chosen: RestChoiceOfferId;
    /** Vitae healed (0 unless `chosen === 'rest'`). Never overheals past maxHealth. */
    healed: number;
    /**
     * The card id the host should pass to `replaceCard` as the copy to swap
     * out — non-null iff `chosen === 'upgrade'`.
     */
    upgradedCardId: string | null;
    /** The upgraded id it becomes (`<id>+`) — non-null iff `chosen === 'upgrade'`. */
    upgradedToCardId: string | null;
}

export interface RestChoiceSession {
    phase: RestChoicePhase;
    /** Authored shelter class: an inn words the night as a bed (unrelated to the flat rest heal). */
    shelter: RestShelter;
    maxHealth: number;
    health: number;
    currency: number;
    /** `buildCombatDeck(player, flags)` output — the upgrade picker reads its copies. */
    deckCardIds: readonly string[];
    /** The distinct deck ids that can take one more upgrade — the upgrade picker's choices. */
    upgradableCardIds: readonly string[];
    offers: readonly RestChoiceOffer[];
    /** The authored MapEvent one-liner, preferred over the placeholder intro when present. */
    description: string | null;
    outcome: RestChoiceOutcome | null;
    seed: SeedInput;
}
