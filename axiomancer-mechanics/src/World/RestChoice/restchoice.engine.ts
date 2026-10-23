/**
 * Rest-choice engine ("rest" / "upgrade" / "cut") — pure engine transitions.
 *
 * A rest node is one irreversible choice: "Rest: Heal 25% health or remove a
 * card", or give up the heal to upgrade one card (Phase UP1d). State machine:
 *
 *   offer ──chooseRestChoiceOffer('rest')────────────────────────────▶ outcome
 *     │
 *     ├──chooseRestChoiceOffer('upgrade')──▶ upgrade-pick ──pickRestChoiceUpgrade──▶ outcome
 *     │
 *     └──chooseRestChoiceOffer('cut')────▶ cut-pick ──pickRestChoiceCut──▶ outcome
 *                                                                              │
 *                                                                    claimRestChoiceOutcome
 *                                                                              ▼
 *                                                                            done
 *
 * `cut` does NOT call `Cards/card.removal`'s `removeCardFromCombatDeck`
 * itself — that primitive needs the full `Character` (which list, rewards
 * or known, actually owns the copy) that this engine never carries. It only
 * names the picked card; the host performs the real removal against its own
 * `Character` at claim — see `restchoice.types.ts` header. `upgrade` is the
 * same: it names the card and the id it becomes, and the host's `replaceCard`
 * swaps the one copy.
 */

import { RESTCHOICE_TUNING } from './restchoice.content';
import type { SeedInput } from '../seed';
import { MIN_COMBAT_DECK_SIZE, cardRemovalPrice } from '../../Cards/card.removal';
import { nextUpgradeId, upgradableCardIds } from '../../Cards/card-upgrades';
import type {
    RestChoiceOffer,
    RestChoiceOfferId,
    RestChoiceOutcome,
    RestChoiceSession,
    RestShelter,
} from './restchoice.types';

const T = RESTCHOICE_TUNING;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export interface CreateRestChoiceOptions {
    shelter: RestShelter;
    maxHealth: number;
    health: number;
    currency: number;
    /** `buildCombatDeck(player, flags)` output — the `cut` picker's choices. */
    deckCardIds: readonly string[];
    /** `Character.cardRemovals` going in. Defaults to 0 — same seam as `cardRemovalsOf`. */
    removals?: number;
    /** The authored MapEvent one-liner. `null`/absent falls back to the presenter's placeholder intro. */
    description?: string | null;
}

function buildOffers(
    currency: number,
    deckSize: number,
    removals: number,
    upgradableCount: number,
): RestChoiceOffer[] {
    const cutPrice = cardRemovalPrice(removals);
    return [
        { id: 'rest', cost: 0 },
        {
            id: 'upgrade',
            cost: 0,
            ...(upgradableCount === 0
                ? { disabledReason: 'no card in the deck can take another upgrade' }
                : {}),
        },
        {
            id: 'cut',
            cost: cutPrice,
            ...(deckSize <= MIN_COMBAT_DECK_SIZE
                ? { disabledReason: `the deck is at its floor of ${MIN_COMBAT_DECK_SIZE} cards` }
                : currency < cutPrice
                    ? { disabledReason: `you can't cover the ${cutPrice} it costs` }
                    : {}),
        },
    ];
}

/** Builds the offer session from the authored payload. Nothing is read from `GameState`. */
export function createRestChoiceSession(seed: SeedInput, opts: CreateRestChoiceOptions): RestChoiceSession {
    const removals = typeof opts.removals === 'number' && Number.isFinite(opts.removals) && opts.removals > 0
        ? Math.floor(opts.removals)
        : 0;
    const upgradable = upgradableCardIds(opts.deckCardIds);
    return {
        phase: 'offer',
        shelter: opts.shelter,
        maxHealth: opts.maxHealth,
        health: opts.health,
        currency: opts.currency,
        deckCardIds: opts.deckCardIds.slice(),
        upgradableCardIds: upgradable,
        removals,
        offers: buildOffers(opts.currency, opts.deckCardIds.length, removals, upgradable.length),
        description: opts.description?.trim() || null,
        outcome: null,
        seed,
    };
}

function offerFor(s: RestChoiceSession, id: RestChoiceOfferId): RestChoiceOffer | undefined {
    return s.offers.find(o => o.id === id);
}

function sealOutcome(s: RestChoiceSession, outcome: RestChoiceOutcome): RestChoiceSession {
    return { ...s, phase: 'outcome', outcome };
}

// ---------------------------------------------------------------------------
// Offer commit
// ---------------------------------------------------------------------------

/**
 * The VITAE a `rest` offer would restore if committed right now — the SAME
 * number `chooseRestChoiceOffer` seals into the outcome.
 *
 * Purpose: let a host print the heal beside the offer without re-deriving
 * the rule. The heal is `round(maxHealth × restHealFraction)`, capped at the
 * VITAE actually missing, so a nearly-full pilgrim is never promised more
 * than the commit pays (at 170/175 the heal is 5, not 44).
 *
 * @param s - any object carrying the session's `maxHealth` and `health`.
 * @returns the heal in VITAE, always `>= 0`.
 */
export function previewRestChoiceHeal(s: Pick<RestChoiceSession, 'maxHealth' | 'health'>): number {
    const healCap = Math.max(0, s.maxHealth - s.health);
    const raw = Math.round(s.maxHealth * T.restHealFraction);
    return Math.max(0, Math.min(healCap, raw));
}

/**
 * offer → outcome | cut-pick. Commits ONE offer — the other vanishes (the
 * caller's `offers` list is only meaningful in the `offer` phase). A
 * disabled or unknown offer id is an invalid call: silent no-op.
 */
export function chooseRestChoiceOffer(s: RestChoiceSession, offer: RestChoiceOfferId): RestChoiceSession {
    if (s.phase !== 'offer') return s;
    const found = offerFor(s, offer);
    if (!found || found.disabledReason) return s;

    if (offer === 'rest') {
        // One rule, one place: the preview and the commit share the arithmetic.
        const healed = previewRestChoiceHeal(s);
        return sealOutcome(s, {
            chosen: 'rest', healed, spent: 0, removedCardId: null, removals: s.removals,
            upgradedCardId: null, upgradedToCardId: null,
        });
    }
    if (offer === 'upgrade') return { ...s, phase: 'upgrade-pick' };
    return { ...s, phase: 'cut-pick' };
}

// ---------------------------------------------------------------------------
// Cut sub-step
// ---------------------------------------------------------------------------

/**
 * cut-pick → outcome. Only a card actually offered (`deckCardIds`) is a
 * valid pick — anything else is an invalid call: silent no-op, matching the
 * sibling engines' unknown-id contract (e.g. Blacksmith's unknown swap
 * offer). The real `removeCardFromCombatDeck` call is the host's, at claim.
 */
export function pickRestChoiceCut(s: RestChoiceSession, cardId: string): RestChoiceSession {
    if (s.phase !== 'cut-pick') return s;
    if (!s.deckCardIds.includes(cardId)) return s;
    return sealOutcome(s, {
        chosen: 'cut',
        healed: 0,
        spent: cardRemovalPrice(s.removals),
        removedCardId: cardId,
        removals: s.removals + 1,
        upgradedCardId: null,
        upgradedToCardId: null,
    });
}

// ---------------------------------------------------------------------------
// Upgrade sub-step
// ---------------------------------------------------------------------------

/**
 * upgrade-pick → outcome. Only a card actually offered
 * (`upgradableCardIds`) is a valid pick; anything else is a silent no-op,
 * the same contract as the cut. Heals nothing and costs nothing: the night
 * spent at the work is the price. The real `replaceCard` call is the
 * host's, at claim.
 */
export function pickRestChoiceUpgrade(s: RestChoiceSession, cardId: string): RestChoiceSession {
    if (s.phase !== 'upgrade-pick') return s;
    if (!s.upgradableCardIds.includes(cardId)) return s;
    const to = nextUpgradeId(cardId);
    if (to === undefined) return s;
    return sealOutcome(s, {
        chosen: 'upgrade',
        healed: 0,
        spent: 0,
        removedCardId: null,
        removals: s.removals,
        upgradedCardId: cardId,
        upgradedToCardId: to,
    });
}

// ---------------------------------------------------------------------------
// Claim
// ---------------------------------------------------------------------------

/** outcome → done. The host applies the ledger to the real `Character` and seals the visit. */
export function claimRestChoiceOutcome(s: RestChoiceSession): RestChoiceSession {
    if (s.phase !== 'outcome' || s.outcome === null) return s;
    return { ...s, phase: 'done' };
}
