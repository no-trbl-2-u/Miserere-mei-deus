/**
 * Rest-choice encounter — engine types.
 *
 * A rest node is one irreversible choice of three: `rest` (free, flat-25%
 * heal), `upgrade` (free, ONE card upgraded instead of the heal) or `cut`
 * (paid, composes `Cards/card.removal` for ONE deck removal). Two-way like every minigame here: the engine never reads
 * `GameState`, and the host settles the outcome ledger against the real
 * `Character` at claim time — including the actual
 * `removeCardFromCombatDeck` and `replaceCard` calls, which need the full
 * card-base/reward-list accounting this engine does not carry.
 */

import type { SeedInput } from '../seed';
import type { RestShelter } from '../MapEvents/types';

export type { RestShelter };

/** The three offers on the table. Exactly one may be committed. */
export type RestChoiceOfferId = 'rest' | 'upgrade' | 'cut';

/** One offer's price + loud affordability. */
export interface RestChoiceOffer {
    id: RestChoiceOfferId;
    cost: number;
    disabledReason?: string;
}

export type RestChoicePhase =
    | 'offer'        // three offers on the table
    | 'upgrade-pick' // choosing a card to upgrade
    | 'cut-pick'     // choosing a card to remove
    | 'outcome'    // the settled ledger
    | 'done';      // host claimed

/** The claim-time ledger. Narrow on `chosen` for the fields that apply. */
export interface RestChoiceOutcome {
    chosen: RestChoiceOfferId;
    /** Vitae healed (0 unless `chosen === 'rest'`). Never overheals past maxHealth. */
    healed: number;
    /** Currency the host should deduct (0 for `rest`). */
    spent: number;
    /**
     * The card id the host should pass to `removeCardFromCombatDeck` —
     * non-null iff `chosen === 'cut'`. The engine does not perform the
     * removal itself (see module header); it only names the card.
     */
    removedCardId: string | null;
    /** `Character.cardRemovals` the host should write — incremented iff `chosen === 'cut'`. */
    removals: number;
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
    /** `buildCombatDeck(player, flags)` output — the cut picker's choices. */
    deckCardIds: readonly string[];
    /** The distinct deck ids that can take one more upgrade — the upgrade picker's choices. */
    upgradableCardIds: readonly string[];
    /** `Character.cardRemovals` going in — prices the `cut` offer. */
    removals: number;
    offers: readonly RestChoiceOffer[];
    /** The authored MapEvent one-liner, preferred over the placeholder intro when present. */
    description: string | null;
    outcome: RestChoiceOutcome | null;
    seed: SeedInput;
}
