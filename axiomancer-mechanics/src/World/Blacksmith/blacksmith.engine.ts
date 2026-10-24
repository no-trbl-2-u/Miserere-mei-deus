/**
 * Blacksmith encounter ("The Anvil") — content, tuning, and pure engine
 * transitions. Compact enough to live in one file.
 *
 * State machine:
 *
 *   intro ──beginBlacksmith──▶ forging ──hone/temper/swap──▶ card ──continueBlacksmithCard──▶ forging
 *                                 │  ▲                                                            │
 *                                 │  └────────────────────────────────────────────────────────────┘
 *                                 │
 *                                 ├──chooseBlacksmithCardUpgrade──▶ upgrade-pick ──pickBlacksmithCardUpgrade──▶ card
 *                                 │                                     └──cancelBlacksmithCardUpgrade──▶ forging
 *                                 │
 *                                 └──leaveBlacksmith──▶ outcome ──claimBlacksmithOutcome──▶ done
 *
 * The engine NEVER reads `GameState`. The host passes the authored payload —
 * the starting rail, the spendable budget, offered variant gear — and applies
 * the outcome (upgraded rail + budget spent) at claim. Cap authority is the
 * shared `validateDieGear` (the SAME check the character-side reducer uses),
 * so a cap-violating upgrade is refused identically here and in the reducer.
 * Refusals are LOUD (a refusal card) and leave the rail + budget untouched.
 *
 * The card upgrade (Phase UP1e) works one card a visit: the engine names the
 * copy and the id it becomes (`nextUpgradeId`), and the host's `replaceCard`
 * swaps it at claim, the same split as the rest site's upgrade.
 *
 * Prices are in SHILLINGS. Access is a directly-authored `blacksmith`
 * MapEvent node (`MapEvents/types.ts`), priced by these per-verb tiers.
 * The mobile host maps `budget` to
 * `Character.currency` by default.
 */

import { seedRng } from './blacksmith.rng';
import type { SeedInput } from '../seed';
import {
    validateDieGear,
    concreteDefaultRail,
    type DieGearColor,
    type DieGearRail,
} from '../../Character/dieGear.reducer';
import type { UpgradeableDieGear } from '../../Combat/combat.encounter.types';
import { nextUpgradeId, upgradableCardIds } from '../../Cards/card-upgrades';
import type {
    BlacksmithCard,
    BlacksmithCardUpgrade,
    BlacksmithOutcome,
    BlacksmithSession,
    BlacksmithVariantOffer,
    BlacksmithVerb,
} from './blacksmith.types';

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------

/**
 * Upgrade prices in shillings, sized against measured loot-cache income (~26 shillings/act) — sized so a single anvil visit
 * (hone + temper + swap once each = 16) still leaves room for shop wares,
 * while HONE < TEMPER < SWAP keeps the ordering (a full gear
 * swap costs more than one face upgrade).
 */
export const ANVIL_VERB_PRICING = Object.freeze({
    /** HONE (add a mana face, −1 miss). */
    hone: 3,
    /** TEMPER (upgrade a mana face to a special face). */
    temper: 5,
    /** SWAP (replace a die's gear with an offered variant). */
    swap: 8,
    /** UPGRADE one owned card, once per visit; the TEMPER price (UP1 brief). */
    upgrade: 5,
});

const VERB_CHROME: Readonly<Record<BlacksmithVerb, { title: string; body: string }>> = Object.freeze({
    hone: {
        title: 'THE EDGE TAKES',
        body: 'The hammer finds the die\'s dead weight and draws it out true. A miss face gives way to live mana.',
    },
    temper: {
        title: 'TEMPERED IN THE DARK',
        body: 'Quenched and folded, a mana face hardens into something that pays: a new special, and the Conviction it carries.',
    },
    swap: {
        title: 'RE-GEARED',
        body: 'The old fitting comes off cold; the new one seats with a click the anvil seems to approve of.',
    },
    upgrade: {
        title: 'WORKED SHARPER',
        body: 'The smith lays the card flat on the anvil and works it until its numbers bite deeper.',
    },
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Builds the anvil session from the authored payload. `rail` is the player's
 * current die gear (a host without one may pass a default rail via
 * `concreteDefaultRail()`); `budget` is the spendable resource; `variants` are
 * the swap offers; `deckCardIds` is the deck the card upgrade picks from
 * (`buildCombatDeck` output; empty means no card can be upgraded). RNG is
 * seeded and threaded but untouched by the deterministic upgrade transitions.
 */
export function createBlacksmithSession(
    seed: SeedInput,
    rail: DieGearRail,
    budget: number,
    variants: readonly BlacksmithVariantOffer[] = [],
    deckCardIds: readonly string[] = [],
): BlacksmithSession {
    return {
        phase: 'intro',
        rail: cloneRail(rail),
        budget: Math.max(0, budget),
        spent: 0,
        variants: variants.map(v => ({ ...v, gear: { ...v.gear } })),
        honed: 0,
        tempered: 0,
        swapped: 0,
        deckCardIds: deckCardIds.slice(),
        upgradableCardIds: upgradableCardIds(deckCardIds),
        cardUpgrade: null,
        card: null,
        outcome: null,
        seed,
        rng: seedRng(seed),
    };
}

function cloneRail(rail: DieGearRail): DieGearRail {
    const out = concreteDefaultRail();
    (Object.keys(out) as DieGearColor[]).forEach(c => {
        if (rail[c]) out[c] = { ...rail[c] };
    });
    return out;
}

/** intro → forging. */
export function beginBlacksmith(s: BlacksmithSession): BlacksmithSession {
    if (s.phase !== 'intro') return s;
    return { ...s, phase: 'forging' };
}

// ---------------------------------------------------------------------------
// Forging (the upgrade verbs)
// ---------------------------------------------------------------------------

function refusalCard(
    verb: BlacksmithVerb,
    color: DieGearColor | null,
    gear: UpgradeableDieGear | null,
    reason: string,
): BlacksmithCard {
    return {
        title: 'THE ANVIL REFUSES',
        body: `The smith sets the hammer down. "${reason}."`,
        verb,
        color,
        cost: 0,
        gear,
        cardUpgrade: null,
        refused: true,
        reason,
    };
}

function successCard(
    verb: BlacksmithVerb,
    color: DieGearColor,
    gear: UpgradeableDieGear,
    cost: number,
): BlacksmithCard {
    const chrome = VERB_CHROME[verb];
    return {
        title: chrome.title,
        body: chrome.body,
        verb,
        color,
        cost,
        gear,
        cardUpgrade: null,
        refused: false,
        reason: '',
    };
}

/**
 * Applies a validated upgrade: charges `cost`, writes `gear` into the rail,
 * bumps the verb tally, and opens the success card. Assumes the caller has
 * already validated caps + affordability.
 */
function applyUpgrade(
    s: BlacksmithSession,
    verb: BlacksmithVerb,
    color: DieGearColor,
    gear: UpgradeableDieGear,
    cost: number,
): BlacksmithSession {
    const rail: DieGearRail = { ...s.rail, [color]: gear };
    return {
        ...s,
        rail,
        budget: s.budget - cost,
        spent: s.spent + cost,
        honed: s.honed + (verb === 'hone' ? 1 : 0),
        tempered: s.tempered + (verb === 'temper' ? 1 : 0),
        swapped: s.swapped + (verb === 'swap' ? 1 : 0),
        phase: 'card',
        card: successCard(verb, color, gear, cost),
    };
}

/** Guard shared by every verb: must be forging, and must afford the price. */
function refuseUnaffordable(
    s: BlacksmithSession,
    verb: BlacksmithVerb,
    color: DieGearColor,
    gear: UpgradeableDieGear,
    price: number,
): BlacksmithSession | null {
    if (price > s.budget) {
        return {
            ...s,
            phase: 'card',
            card: refusalCard(verb, color, gear, `you can't cover the ${price} it costs`),
        };
    }
    return null;
}

/**
 * forging → card. HONE a die: add a mana face (−1 miss). Refused loudly at the
 * 1-miss floor (whiff is never forgeable away) or when unaffordable.
 */
export function honeBlacksmith(s: BlacksmithSession, color: DieGearColor): BlacksmithSession {
    if (s.phase !== 'forging') return s;
    const gear = s.rail[color];
    const price = ANVIL_VERB_PRICING.hone;
    const unaffordable = refuseUnaffordable(s, 'hone', color, gear, price);
    if (unaffordable) return unaffordable;

    const candidate: UpgradeableDieGear = { ...gear, manaFaces: gear.manaFaces + 1 };
    const reason = validateDieGear(candidate, color);
    if (reason) return { ...s, phase: 'card', card: refusalCard('hone', color, gear, reason) };
    return applyUpgrade(s, 'hone', color, candidate, price);
}

/**
 * forging → card. TEMPER a die: upgrade a mana face to a special face
 * (+1 special, −1 mana). Refused loudly above the special cap, with no mana
 * face to spend, or when unaffordable.
 */
export function temperBlacksmith(s: BlacksmithSession, color: DieGearColor): BlacksmithSession {
    if (s.phase !== 'forging') return s;
    const gear = s.rail[color];
    const price = ANVIL_VERB_PRICING.temper;
    const unaffordable = refuseUnaffordable(s, 'temper', color, gear, price);
    if (unaffordable) return unaffordable;

    if (gear.manaFaces < 1) {
        return { ...s, phase: 'card', card: refusalCard('temper', color, gear, 'no mana face to upgrade') };
    }
    const candidate: UpgradeableDieGear = {
        ...gear,
        specialFaces: gear.specialFaces + 1,
        manaFaces: gear.manaFaces - 1,
    };
    const reason = validateDieGear(candidate, color);
    if (reason) return { ...s, phase: 'card', card: refusalCard('temper', color, gear, reason) };
    return applyUpgrade(s, 'temper', color, candidate, price);
}

/**
 * forging → card. SWAP in an offered variant gear piece for its die. The
 * variant's `dieColor` decides the target; refused loudly on an unknown offer,
 * an illegal table, or when unaffordable.
 */
export function swapBlacksmith(s: BlacksmithSession, variantId: string): BlacksmithSession {
    if (s.phase !== 'forging') return s;
    const offer = s.variants.find(v => v.id === variantId);
    if (!offer) return s; // unknown offer — invalid call, silent no-op.

    const color = offer.gear.dieColor as DieGearColor;
    const gear = { ...offer.gear };
    const price = offer.price ?? ANVIL_VERB_PRICING.swap;
    const unaffordable = refuseUnaffordable(s, 'swap', color, gear, price);
    if (unaffordable) return unaffordable;

    const reason = validateDieGear(gear, color);
    if (reason) return { ...s, phase: 'card', card: refusalCard('swap', color, s.rail[color], reason) };
    return applyUpgrade(s, 'swap', color, gear, price);
}

// ---------------------------------------------------------------------------
// The card upgrade (Phase UP1e)
// ---------------------------------------------------------------------------

/**
 * Why the card upgrade can't be taken right now, or null when it can. The
 * one authority for the refusal card and a host's greyed offer: once a
 * visit, something to upgrade, and the price covered.
 */
export function blacksmithCardUpgradeRefusal(s: BlacksmithSession): string | null {
    if (s.cardUpgrade !== null) return 'one card a visit, and that one is done';
    if (s.upgradableCardIds.length === 0) return 'nothing you carry can take another upgrade';
    const price = ANVIL_VERB_PRICING.upgrade;
    if (price > s.budget) return `you can't cover the ${price} it costs`;
    return null;
}

/**
 * forging → upgrade-pick, or → card with a loud refusal when the visit's
 * upgrade is spent, no card can take one, or the price can't be covered.
 * Nothing is charged until a card is picked.
 */
export function chooseBlacksmithCardUpgrade(s: BlacksmithSession): BlacksmithSession {
    if (s.phase !== 'forging') return s;
    const reason = blacksmithCardUpgradeRefusal(s);
    if (reason) return { ...s, phase: 'card', card: refusalCard('upgrade', null, null, reason) };
    return { ...s, phase: 'upgrade-pick' };
}

/** upgrade-pick → forging. Backs out of the picker; nothing is charged. */
export function cancelBlacksmithCardUpgrade(s: BlacksmithSession): BlacksmithSession {
    if (s.phase !== 'upgrade-pick') return s;
    return { ...s, phase: 'forging' };
}

/**
 * upgrade-pick → card. Only a card actually offered (`upgradableCardIds`) is
 * a valid pick; anything else is a silent no-op, the rest site's contract.
 * Charges the price and records the copy and the id it becomes; the real
 * `replaceCard` call is the host's, at claim.
 */
export function pickBlacksmithCardUpgrade(s: BlacksmithSession, cardId: string): BlacksmithSession {
    if (s.phase !== 'upgrade-pick') return s;
    if (!s.upgradableCardIds.includes(cardId)) return s;
    const toCardId = nextUpgradeId(cardId);
    if (toCardId === undefined) return s;
    const reason = blacksmithCardUpgradeRefusal(s);
    if (reason) return { ...s, phase: 'card', card: refusalCard('upgrade', null, null, reason) };

    const price = ANVIL_VERB_PRICING.upgrade;
    const cardUpgrade: BlacksmithCardUpgrade = { fromCardId: cardId, toCardId };
    const chrome = VERB_CHROME.upgrade;
    return {
        ...s,
        budget: s.budget - price,
        spent: s.spent + price,
        cardUpgrade,
        phase: 'card',
        card: {
            title: chrome.title,
            body: chrome.body,
            verb: 'upgrade',
            color: null,
            cost: price,
            gear: null,
            cardUpgrade,
            refused: false,
            reason: '',
        },
    };
}

// ---------------------------------------------------------------------------
// Cards & outcome
// ---------------------------------------------------------------------------

/** card → forging. Acknowledges the result flash (success or refusal). */
export function continueBlacksmithCard(s: BlacksmithSession): BlacksmithSession {
    if (s.phase !== 'card' || s.card === null) return s;
    return { ...s, phase: 'forging', card: null };
}

/** forging → outcome. Leaves the anvil, sealing the visit's ledger. */
export function leaveBlacksmith(s: BlacksmithSession): BlacksmithSession {
    if (s.phase !== 'forging') return s;
    const outcome: BlacksmithOutcome = {
        rail: cloneRail(s.rail),
        spent: s.spent,
        honed: s.honed,
        tempered: s.tempered,
        swapped: s.swapped,
        cardUpgrade: s.cardUpgrade,
    };
    return { ...s, phase: 'outcome', outcome };
}

/** outcome → done. The host writes the rail to the player and settles the spend. */
export function claimBlacksmithOutcome(s: BlacksmithSession): BlacksmithSession {
    if (s.phase !== 'outcome' || s.outcome === null) return s;
    return { ...s, phase: 'done' };
}
