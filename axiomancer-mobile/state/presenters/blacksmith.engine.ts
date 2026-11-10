/**
 * Blacksmith encounter presenter — maps the engine session
 * (`axiomancer-mechanics` World/Blacksmith) onto a render-ready
 * view-model. Pure: no store writes, no rolls,
 * no rule decisions.
 *
 * The forge screen's job is to render, per die, the HONE / TEMPER offers
 * with their shilling prices (`ANVIL_VERB_PRICING`), and
 * the swap offers — each carrying an `enabled` flag AND, when disabled, the
 * LOUD reason (owner-UI doctrine: an illegal or unaffordable action is
 * greyed AND named, never a silent no-op). The reason strings are the SAME
 * cap authority the engine's refusal card uses (`validateDieGear`), so the
 * greyed-offer copy and the refusal-card copy always agree.
 *
 * The card upgrade (Phase UP1e) follows the same doctrine: its offer's
 * reason is the engine's own `blacksmithCardUpgradeRefusal`, and the pick
 * step hands the shared upgrade screen the rows the rest site uses.
 */

import {
    ANVIL_VERB_PRICING,
    blacksmithCardUpgradeRefusal,
    getCardById,
    validateDieGear,
    dieGearMissFaces,
    dieSpecialCap,
    DIE_GEAR_COLORS,
} from '@mechanics';
import type {
    BlacksmithSession,
    DieGearColor,
    DieGearRail,
    UpgradeableDieGear,
} from '@mechanics';
import type { AppStoreState } from '@/state/store';
import {
    BLACKSMITH_CARD_UPGRADE_EFFECT,
    BLACKSMITH_SMITH_LINE,
    BLACKSMITH_CARD_UPGRADE_LABEL,
    blacksmithCardUpgradePriceLine,
    blacksmithUpgradedChip,
} from './blacksmith.copy';
import { cardUpgradeRowsVM, type CardUpgradeRowVM } from './card-upgrade.engine';

// ---------------------------------------------------------------------------
// VM shapes
// ---------------------------------------------------------------------------

/** One offered upgrade action: its price, whether it is takeable, and why not. */
export interface BlacksmithOfferVM {
    /** Verb + target: e.g. `hone:heart`, `swap:die-gear-heart-rich-payload`, `upgrade`. */
    id: string;
    verb: 'hone' | 'temper' | 'swap' | 'upgrade';
    /** The die the verb works; null for the card upgrade. */
    color: DieGearColor | null;
    label: string;
    price: number;
    enabled: boolean;
    /**
     * What the verb BUYS, in the screen's own face words
     * (`MISS face → MANA`). HONE and TEMPER are the smith's vocabulary, not
     * the game's; the offer now states its trade instead of naming it.
     * '' on a SWAP, whose row already prints the face read it installs.
     */
    effect: string;
    /** Loud reason when `!enabled`; '' when takeable. */
    reason: string;
}

/** One face of a die in the cross net: what it pays, in the screen's face words. */
export type BlacksmithFaceKind = 'BOON' | 'MANA' | 'MISS';

/** A single die's current face table + its two service offers. */
export interface BlacksmithDieVM {
    color: DieGearColor;
    label: string;
    specialFaces: number;
    manaFaces: number;
    missFaces: number;
    /** Compact face read, e.g. "1 BOON · 2 MANA · 3 MISS". */
    faceSummary: string;
    /**
     * The six faces in net order: BOON faces first, then MANA, then MISS (the
     * cross net draws the first one up, the next three across, the last two
     * below).
     */
    faces: readonly BlacksmithFaceKind[];
    hone: BlacksmithOfferVM;
    temper: BlacksmithOfferVM;
}

/** A swap offer (a variant gear piece for its die). */
export interface BlacksmithSwapVM {
    offer: BlacksmithOfferVM;
    name: string;
    /** The face read the swap would install. */
    faceSummary: string;
}

/** A card before and after the anvil's upgrade, by name. */
export interface BlacksmithUpgradedVM {
    fromName: string;
    toName: string;
}

export interface BlacksmithCardVM {
    title: string;
    body: string;
    verb: 'hone' | 'temper' | 'swap' | 'upgrade';
    /** The die worked on; null for the card upgrade. */
    color: DieGearColor | null;
    cost: number;
    refused: boolean;
    reason: string;
    /** The card the anvil upgraded on this flash; null for a die verb or a refusal. */
    upgraded: BlacksmithUpgradedVM | null;
}

export interface BlacksmithOutcomeVM {
    spent: number;
    honed: number;
    tempered: number;
    swapped: number;
    /** Compact tally chips, e.g. "2 HONED", "−7 SHILLINGS". */
    chips: readonly string[];
}

export interface BlacksmithVM {
    active: boolean;
    phase: BlacksmithSession['phase'] | 'none';
    /** The smith's line, standing where the dropped intro step stood. */
    smithLine: string;
    /** One line decoding the `1 BOON · 2 MANA · 3 MISS` read. */
    faceKey: string;
    budget: number;
    spent: number;
    dice: readonly BlacksmithDieVM[];
    swaps: readonly BlacksmithSwapVM[];
    /** The card upgrade offer (Phase UP1e): once a visit, its price, and why not. */
    cardUpgrade: BlacksmithOfferVM | null;
    /** The shared upgrade screen's rows, in the `upgrade-pick` phase only. */
    upgradeRows: readonly CardUpgradeRowVM[] | null;
    /** The anvil's price line above the upgrade screen's list. */
    upgradePriceLine: string;
    card: BlacksmithCardVM | null;
    outcome: BlacksmithOutcomeVM | null;
}

const COLOR_LABELS: Record<DieGearColor, string> = Object.freeze({
    heart: 'HEART',
    body: 'BODY',
    mind: 'MIND',
    wild: 'WILD',
});

/**
 * Shilling suffix for forge prices.
 *
 * The forge prices everything in SHILLINGS (`ANVIL_VERB_PRICING`). `◆` is
 * the combat board's CONVICTION mark, so it is not used here. The unit is
 * spelled out, as the village stalls print their prices (`12 SHILLINGS`), so
 * the two shops agree.
 */
const CURRENCY_SUFFIX = ' SHILLINGS';

/**
 * The legend for the per-die face read.
 *
 * Each die prints `1 BOON · 2 MANA · 3 MISS` and nothing said what those
 * three words are worth. Straight off the engine's face semantics
 * (`combat.upgradeable-dice.ts`): a MANA face powers one paid line of its
 * colour, a BOON powers a card AND fires the worn weapon's special, a MISS is
 * dead.
 */
const FACE_KEY =
    'MANA pays for a card in its colour. BOON pays for a card and fires '
    + 'your weapon\'s special. MISS pays nothing.';

/** The trade each verb makes, in the same face words. */
const HONE_EFFECT = 'MISS face → MANA';
const TEMPER_EFFECT = 'MANA face → BOON';

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

const EMPTY_VM: BlacksmithVM = Object.freeze({
    active: false,
    phase: 'none',
    smithLine: BLACKSMITH_SMITH_LINE,
    faceKey: FACE_KEY,
    budget: 0,
    spent: 0,
    dice: Object.freeze([]),
    swaps: Object.freeze([]),
    cardUpgrade: null,
    upgradeRows: null,
    upgradePriceLine: blacksmithCardUpgradePriceLine(ANVIL_VERB_PRICING.upgrade),
    card: null,
    outcome: null,
});

export function selectHasActiveBlacksmith(state: Pick<AppStoreState, 'blacksmith'>): boolean {
    return state.blacksmith?.session != null;
}

function faceSummary(gear: UpgradeableDieGear): string {
    const miss = dieGearMissFaces(gear);
    return `${gear.specialFaces} BOON · ${gear.manaFaces} MANA · ${miss} MISS`;
}

/** The six faces in net order (BOON, MANA, MISS). */
function faceNet(gear: UpgradeableDieGear): BlacksmithFaceKind[] {
    return [
        ...Array<BlacksmithFaceKind>(gear.specialFaces).fill('BOON'),
        ...Array<BlacksmithFaceKind>(gear.manaFaces).fill('MANA'),
        ...Array<BlacksmithFaceKind>(dieGearMissFaces(gear)).fill('MISS'),
    ];
}

/** Combine a cap reason with the affordability reason into one loud line. */
function offerReason(capReason: string | null, affordable: boolean, price: number): string {
    if (capReason) return capReason;
    if (!affordable) return `costs ${price}${CURRENCY_SUFFIX} — you can't cover it`;
    return '';
}

/**
 * Build the HONE offer for one die.
 *
 * @param rail - the session's current die gear, one entry per colour.
 * @param color - which die the offer is for.
 * @param budget - the visit's spendable shillings, for the afford check.
 * @returns the offer VM: price, whether it is takeable, the LOUD reason when
 *   it is not, and the trade it makes in face words.
 */
function honeOffer(rail: DieGearRail, color: DieGearColor, budget: number): BlacksmithOfferVM {
    const gear = rail[color];
    const price = ANVIL_VERB_PRICING.hone;
    const candidate: UpgradeableDieGear = { ...gear, manaFaces: gear.manaFaces + 1 };
    const capReason = validateDieGear(candidate, color);
    const affordable = price <= budget;
    const reason = offerReason(capReason, affordable, price);
    return {
        id: `hone:${color}`,
        verb: 'hone',
        color,
        label: 'HONE',
        price,
        enabled: reason === '',
        effect: HONE_EFFECT,
        reason,
    };
}

/**
 * Build the TEMPER offer for one die.
 *
 * @param rail - the session's current die gear, one entry per colour.
 * @param color - which die the offer is for.
 * @param budget - the visit's spendable shillings, for the afford check.
 * @returns the offer VM, same contract as `honeOffer` — including the face-word
 *   trade line.
 */
function temperOffer(rail: DieGearRail, color: DieGearColor, budget: number): BlacksmithOfferVM {
    const gear = rail[color];
    const price = ANVIL_VERB_PRICING.temper;
    const affordable = price <= budget;
    let capReason: string | null;
    if (gear.manaFaces < 1) {
        capReason = 'no mana face to upgrade';
    } else {
        capReason = validateDieGear(
            { ...gear, specialFaces: gear.specialFaces + 1, manaFaces: gear.manaFaces - 1 },
            color,
        );
    }
    const reason = offerReason(capReason, affordable, price);
    return {
        id: `temper:${color}`,
        verb: 'temper',
        color,
        label: 'TEMPER',
        price,
        enabled: reason === '',
        effect: TEMPER_EFFECT,
        reason,
    };
}

function cardName(cardId: string): string {
    return getCardById(cardId)?.name ?? cardId;
}

function upgradedVM(
    upgrade: { fromCardId: string; toCardId: string } | null,
): BlacksmithUpgradedVM | null {
    if (upgrade === null) return null;
    return { fromName: cardName(upgrade.fromCardId), toName: cardName(upgrade.toCardId) };
}

/**
 * Build the card upgrade offer. Its reason is the engine's own refusal
 * (`blacksmithCardUpgradeRefusal`), so the greyed offer and the refusal card
 * say the same thing.
 */
function cardUpgradeOffer(s: BlacksmithSession): BlacksmithOfferVM {
    const reason = blacksmithCardUpgradeRefusal(s) ?? '';
    return {
        id: 'upgrade',
        verb: 'upgrade',
        color: null,
        label: BLACKSMITH_CARD_UPGRADE_LABEL,
        price: ANVIL_VERB_PRICING.upgrade,
        enabled: reason === '',
        effect: BLACKSMITH_CARD_UPGRADE_EFFECT,
        reason,
    };
}

/**
 * Compose the forge screen's view-model from the engine session.
 *
 * @param state - the blacksmith slice; `session === null` means no visit.
 * @returns the render-ready `BlacksmithVM`, or the inactive `EMPTY_VM`. Carries
 *   the smith's line and the face-read key so
 *   no forge copy lives in the screen; every other field is unchanged.
 */
export function selectBlacksmithVM(state: Pick<AppStoreState, 'blacksmith'>): BlacksmithVM {
    const s = state.blacksmith?.session;
    if (!s) return EMPTY_VM;

    const budget = s.budget;

    const dice: BlacksmithDieVM[] = DIE_GEAR_COLORS.map(color => {
        const gear = s.rail[color];
        return {
            color,
            label: COLOR_LABELS[color],
            specialFaces: gear.specialFaces,
            manaFaces: gear.manaFaces,
            missFaces: dieGearMissFaces(gear),
            faceSummary: faceSummary(gear),
            faces: faceNet(gear),
            hone: honeOffer(s.rail, color, budget),
            temper: temperOffer(s.rail, color, budget),
        };
    });

    const swaps: BlacksmithSwapVM[] = s.variants.map(v => {
        const color = v.gear.dieColor as DieGearColor;
        const price = v.price ?? ANVIL_VERB_PRICING.swap;
        const capReason = validateDieGear(v.gear, color);
        const affordable = price <= budget;
        const reason = offerReason(capReason, affordable, price);
        return {
            offer: {
                id: `swap:${v.id}`,
                verb: 'swap',
                color,
                label: 'SWAP',
                price,
                enabled: reason === '',
                effect: '',
                reason,
            },
            name: v.name,
            faceSummary: faceSummary(v.gear),
        };
    });

    const card: BlacksmithCardVM | null = s.card === null ? null : {
        title: s.card.title,
        body: s.card.body,
        verb: s.card.verb,
        color: s.card.color,
        cost: s.card.cost,
        refused: s.card.refused,
        reason: s.card.reason,
        upgraded: upgradedVM(s.card.cardUpgrade),
    };

    const outcome: BlacksmithOutcomeVM | null = s.outcome === null ? null : {
        spent: s.outcome.spent,
        honed: s.outcome.honed,
        tempered: s.outcome.tempered,
        swapped: s.outcome.swapped,
        chips: composeOutcomeChips(s.outcome, upgradedVM(s.outcome.cardUpgrade)),
    };

    return {
        active: true,
        phase: s.phase,
        smithLine: BLACKSMITH_SMITH_LINE,
        faceKey: FACE_KEY,
        budget,
        spent: s.spent,
        dice,
        swaps,
        cardUpgrade: cardUpgradeOffer(s),
        upgradeRows: s.phase === 'upgrade-pick' ? cardUpgradeRowsVM(s.upgradableCardIds, s.deckCardIds) : null,
        upgradePriceLine: blacksmithCardUpgradePriceLine(ANVIL_VERB_PRICING.upgrade),
        card,
        outcome,
    };
}

function composeOutcomeChips(
    outcome: {
        honed: number;
        tempered: number;
        swapped: number;
        spent: number;
    },
    upgraded: BlacksmithUpgradedVM | null,
): string[] {
    const chips: string[] = [];
    if (outcome.honed > 0) chips.push(`${outcome.honed} HONED`);
    if (outcome.tempered > 0) chips.push(`${outcome.tempered} TEMPERED`);
    if (outcome.swapped > 0) chips.push(`${outcome.swapped} RE-GEARED`);
    if (upgraded !== null) chips.push(blacksmithUpgradedChip(upgraded.fromName, upgraded.toName));
    if (outcome.spent > 0) chips.push(`−${outcome.spent}${CURRENCY_SUFFIX}`);
    if (chips.length === 0) chips.push('LEFT AS FOUND');
    return chips;
}

// Re-export the cap helper the screen uses for a quick per-die legality hint
// (kept here so the screen imports one presenter module, not the engine).
export { dieSpecialCap };
