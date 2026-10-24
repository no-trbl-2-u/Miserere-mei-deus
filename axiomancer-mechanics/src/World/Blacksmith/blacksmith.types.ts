/**
 * Blacksmith encounter ("The Anvil") — engine types.
 *
 * The die-gear upgrade surface. The four dice are
 * permanent immutable 6-siders; ALL progression lives on the GEAR that drives
 * each die's face table + special payload. The blacksmith is where that gear
 * is HONED (add a mana face, −1 miss) and TEMPERED (upgrade a mana face to a
 * special face), and where variant gear pieces can be SWAPPED in (a payload
 * change IS a gear swap — no service keyword for it).
 *
 * Two-way like the hazard / rest / loot-cache minigames: the engine NEVER
 * reads `GameState`. The host passes an authored payload in — the starting
 * rail, the spendable budget, any offered variant gear — and applies the
 * outcome (the upgraded rail written to `Character.dieGear`, the budget spent)
 * at claim time. Every transition is `(session, …) → session`; invalid calls
 * return the input unchanged; cap-violating or unaffordable upgrades are
 * refused LOUDLY (a refusal card), leaving the rail + budget untouched.
 *
 * The anvil also works one card a visit (Phase UP1e): the host passes the
 * deck's card ids, the engine names the copy to swap and the id it becomes,
 * and the host's `replaceCard` swaps it at claim.
 */

import type { SeedInput } from '../seed';
import type { UpgradeableDieGear } from '../../Combat/combat.encounter.types';
import type { DieGearColor, DieGearRail } from '../../Character/dieGear.reducer';
import type { BlacksmithRngState } from './blacksmith.rng';

export type { DieGearColor, DieGearRail };

/** The service verbs the anvil offers (§6 keywords, the gear swap, the card upgrade). */
export type BlacksmithVerb = 'hone' | 'temper' | 'swap' | 'upgrade';

/** The one card a visit's upgrade changed: the copy swapped out and the id it becomes. */
export interface BlacksmithCardUpgrade {
    fromCardId: string;
    toCardId: string;
}

/**
 * One offered variant gear piece the player may swap in for its die. Authored
 * on the map-event payload (a witness reward, e.g. a richer-payload piece).
 * `id` is a stable handle the host maps back; `price` overrides the default
 * swap price when set.
 */
export interface BlacksmithVariantOffer {
    id: string;
    name: string;
    gear: UpgradeableDieGear;
    /** Per-offer price override, in shillings; falls back to the default swap price. */
    price?: number;
}

/** A result flash shown between forging decisions (like the loot-cache card). */
export interface BlacksmithCard {
    title: string;
    body: string;
    verb: BlacksmithVerb;
    /** The die worked on; null for a card upgrade, which works no die. */
    color: DieGearColor | null;
    /** Budget spent by this action (0 on a refusal). */
    cost: number;
    /** The die's gear AFTER the action (the pre-action gear on a refusal); null for a card upgrade. */
    gear: UpgradeableDieGear | null;
    /** The card upgraded by this action; null for a die verb or a refusal. */
    cardUpgrade: BlacksmithCardUpgrade | null;
    /** True when the anvil refused the upgrade (cap violation / unaffordable). */
    refused: boolean;
    /** Loud reason when `refused`; '' otherwise. */
    reason: string;
}

/**
 * The claim-time ledger. The host writes `rail` to `Character.dieGear` and
 * deducts `spent` from the player's budget.
 */
export interface BlacksmithOutcome {
    rail: DieGearRail;
    /** Total budget spent across the visit. */
    spent: number;
    honed: number;
    tempered: number;
    swapped: number;
    /**
     * The card upgrade the host passes to `replaceCard` at claim, or null
     * when the visit upgraded no card.
     */
    cardUpgrade: BlacksmithCardUpgrade | null;
}

export type BlacksmithPhase =
    | 'intro'        // the anvil, described
    | 'forging'      // choosing an upgrade (hone / temper / swap / card) or leaving
    | 'upgrade-pick' // choosing the one card to upgrade
    | 'card'         // a result / refusal flash is open
    | 'outcome'      // the ledger
    | 'done';        // host claimed

export interface BlacksmithSession {
    phase: BlacksmithPhase;
    /** The working rail — starts from the authored payload (or default). */
    rail: DieGearRail;
    /** Spendable resource remaining, in shillings (the mobile host maps
     *  this to `Character.currency` by default). */
    budget: number;
    /** Total spent so far; the host settles this at claim. */
    spent: number;
    /** Variant gear pieces on offer this visit (swap targets). */
    variants: readonly BlacksmithVariantOffer[];
    honed: number;
    tempered: number;
    swapped: number;
    /** The deck's card ids going in (`buildCombatDeck` output). */
    deckCardIds: readonly string[];
    /** The distinct deck ids that can take one more upgrade — the picker's choices. */
    upgradableCardIds: readonly string[];
    /** This visit's card upgrade, once taken; the anvil works one card a visit. */
    cardUpgrade: BlacksmithCardUpgrade | null;
    card: BlacksmithCard | null;
    outcome: BlacksmithOutcome | null;
    seed: SeedInput;
    rng: BlacksmithRngState;
}
