/**
 * Rest-choice engine ("rest" / "upgrade") — pure engine transitions.
 *
 * A rest node is one irreversible choice: heal 25% of max VITAE, or give up
 * the heal to upgrade one card (Phase UP1d). Card removal is a village
 * counter (`World/Village`), not a rest offer. State machine:
 *
 *   offer ──chooseRestChoiceOffer('rest')────────────────────────────▶ outcome
 *     │                                                                   │
 *     └──chooseRestChoiceOffer('upgrade')──▶ upgrade-pick ──pickRestChoiceUpgrade──▶ outcome
 *                                                                              │
 *                                                                    claimRestChoiceOutcome
 *                                                                              ▼
 *                                                                            done
 *
 * `upgrade` names the card and the id it becomes; the host's `replaceCard`
 * swaps the one copy at claim.
 */

import { RESTCHOICE_TUNING } from './restchoice.content';
import type { SeedInput } from '../seed';
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
    /** `buildCombatDeck(player, flags)` output — the upgrade picker reads its copies. */
    deckCardIds: readonly string[];
    /** The authored MapEvent one-liner. `null`/absent falls back to the presenter's placeholder intro. */
    description?: string | null;
}

function buildOffers(upgradableCount: number): RestChoiceOffer[] {
    return [
        { id: 'rest', cost: 0 },
        {
            id: 'upgrade',
            cost: 0,
            ...(upgradableCount === 0
                ? { disabledReason: 'no card in the deck can take another upgrade' }
                : {}),
        },
    ];
}

/** Builds the offer session from the authored payload. Nothing is read from `GameState`. */
export function createRestChoiceSession(seed: SeedInput, opts: CreateRestChoiceOptions): RestChoiceSession {
    const upgradable = upgradableCardIds(opts.deckCardIds);
    return {
        phase: 'offer',
        shelter: opts.shelter,
        maxHealth: opts.maxHealth,
        health: opts.health,
        currency: opts.currency,
        deckCardIds: opts.deckCardIds.slice(),
        upgradableCardIds: upgradable,
        offers: buildOffers(upgradable.length),
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
 * offer → outcome | upgrade-pick. Commits ONE offer — the other vanishes (the
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
            chosen: 'rest', healed, upgradedCardId: null, upgradedToCardId: null,
        });
    }
    return { ...s, phase: 'upgrade-pick' };
}

// ---------------------------------------------------------------------------
// Upgrade sub-step
// ---------------------------------------------------------------------------

/**
 * upgrade-pick → outcome. Only a card actually offered
 * (`upgradableCardIds`) is a valid pick; anything else is a silent no-op,
 * matching the sibling engines' unknown-id contract (e.g. Blacksmith's
 * unknown swap offer). Heals nothing and costs nothing: the night
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
