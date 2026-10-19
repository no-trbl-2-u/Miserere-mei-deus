/**
 * Hazard Minigame v2 — engine types.
 *
 * This is the mechanics source-of-truth port of the Hazard v2 engine
 * formerly housed under `axiomancer-mobile/state/hazard/`. Mobile
 * components must never compute rules — they render `HazardSessionState`
 * via presenters and dispatch mechanics-owned transitions.
 */

import type { SeedInput } from '../seed';
import type { HazardRngState } from './hazard.rng';

// ---------------------------------------------------------------------------
// Colours, progress, dice
// ---------------------------------------------------------------------------

/** The only four card/mana colours in the v2 system. */
export type HazardColor = 'red' | 'blue' | 'purple' | 'gold';

/** A die face is a colour or the hostile blocked face. */
export type HazardDieKind = HazardColor | 'hex';

/** The two progress types that fill the meters. */
export type HazardProgressKey = 'force' | 'escape';

export type HazardDieState = 'available' | 'spent';

export interface HazardDie {
    id: string;
    kind: HazardDieKind;
    state: HazardDieState;
    /**
     * True for dice created by card effects (powered convert / re-cast).
     * Display-only distinction; temporary dice follow normal spend rules
     * and — like all dice under the no-re-cast doctrine — persist until
     * spent or the hazard ends.
     */
    temporary?: boolean;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export type HazardCardRarity = 'common' | 'uncommon' | 'rare';

/**
 * `gainDie` and `reroll` are engine-only so far: no deck card carries
 * them and they have no keyword yet. A reroll never rolls; it turns dice
 * to the session's `rerollFaces`, in order. Neither has a default: a card
 * declares its counts (and a `gainDie` card its colour), checked by
 * `validateHazardCardDef`.
 */
export type HazardUtilityEffect = 'draw' | 'recast' | 'convert' | 'gainDie' | 'reroll';

export type HazardKeywordId =
    | 'surge'
    | 'force'
    | 'escape'
    | 'convert'
    | 'draw'
    | 'recast'
    | 'gilded'
    | 'salvage'
    | 'crack';

/**
 * Salvage — the discard benefit. Dragging a card to the trash bin
 * grants this instead of the card's actions. Always strictly weaker
 * than playing the card:
 *  - progress: +amount of one type, THIS round only (it rides
 *    `progressBase`, which the round advance overwrites);
 *  - mana: conjure a temporary die of the card's colour.
 */
export type HazardSalvage =
    | { type: 'progress'; key: HazardProgressKey; amount: number }
    | { type: 'mana' };

export interface HazardCardDef {
    id: string;
    name: string;
    /** Card colour — its identity (display tint, salvage colour) and the
     *  die colour that powers it, besides the wild gold die. */
    kind: HazardColor;
    rarity: HazardCardRarity;
    /** Relative frequency in the starter draw pile. */
    weight?: number;
    /**
     * FREE (top) action values — contributed the moment the card is staged.
     * Signed: a negative value is a cost on that meter, on either line or
     * both, and the meters are never clamped at 0.
     */
    f: number;
    e: number;
    /** MANA (bottom / SURGE) action values, used once a die is applied. */
    fp?: number;
    ep?: number;
    /**
     * Optional utility, fired once when the card is APPLIED (powered tier
     * if a die is attached, else base). A card may carry BOTH numbers and
     * a utility (purple hybrids; gold cards lead with the utility and only
     * pay their numbers when a die is applied).
     */
    effect?: HazardUtilityEffect;
    /**
     * Gold ("yellow") cards lead with their utility: the effect always
     * fires at its MAJOR tier (the powered amount / the +die bonus) even
     * with no die attached. The die on a gold card buys its numbers
     * instead. Purple/red/blue utilities omit this — they upgrade from
     * minor to major only when a die is applied.
     */
    majorEffect?: boolean;
    /**
     * A second utility that fires only when a die powers the card, after
     * `effect`, at its major tier. Required when the powered line carries a
     * cost (a negative `fp` or `ep`): a paid cost buys a second benefit.
     */
    poweredEffect?: HazardUtilityEffect;
    drawBase?: number;
    drawPowered?: number;
    /** `gainDie`: temporary dice added on apply, minor and major. Required, no default. */
    gainDieBase?: number;
    gainDiePowered?: number;
    /** `gainDie`: the added dice's colour. Required, no default. */
    gainDieKind?: HazardColor;
    /** `reroll`: how many available dice turn, in die order, minor and major. Required, no default. */
    rerollBase?: number;
    rerollPowered?: number;
    /**
     * Dead cards (consequence CRACK cards) cannot be powered and
     * contribute nothing — they only clog the hand.
     */
    dead?: boolean;
    /** Discard benefit (trash bin). Omitted = discards for nothing. */
    salvage?: HazardSalvage;
    flavor: string;
    keywords: HazardKeywordId[];
}

/** A physical card instance in hand / play. */
export interface HazardHandEntry {
    uid: string;
    cardId: string;
    /** Die powering this card's MANA action, or null when un-powered. */
    dieId: string | null;
    /**
     * Set once the card is APPLIED. Applying fires the card's utility
     * effect (if any) and locks the card permanently — it can no longer
     * be returned to hand, re-powered, or discarded. A round can only be
     * resolved once every staged card is applied.
     */
    applied?: boolean;
}

// ---------------------------------------------------------------------------
// Routes & hazards
// ---------------------------------------------------------------------------

export type HazardRouteKey = 'safe' | 'risk';

export interface HazardSafeRouteDef {
    key: 'safe';
    dual: false;
    /** Combined FORCE+ESCAPE threshold per round. */
    thresholds: number[];
    rewardLabel: string;
    /** Vitae lost per failed round when the hazard ends in failure tiers. */
    penaltyVitae: number;
}

export interface HazardRiskRouteDef {
    key: 'risk';
    dual: true;
    /** Per-round [force, escape] thresholds — BOTH required. */
    thresholds: [number, number][];
    rewardLabel: string;
    penaltyVitae: number;
}

export interface HazardDef {
    id: string;
    title: string;
    scenario: string;
    /**
     * Grim intro copy for the danger modal shown the moment the hazard
     * triggers — short, hopeless, ending on the player's only out.
     * The modal pairs it with the title and the hazard's intro art.
     */
    intro: string;
    /** Dramatic headline on the play board's scene strip. */
    boardHeadline: string;
    /** One-line route flavor shown on the play board. */
    safeBoardNote: string;
    riskBoardNote: string;
    safeRouteName: string;
    riskRouteName: string;
    safeRouteDesc: string;
    riskRouteDesc: string;
    rounds: number;
    safe: HazardSafeRouteDef;
    risk: HazardRiskRouteDef;
}

// ---------------------------------------------------------------------------
// Rounds, outcome, rewards
// ---------------------------------------------------------------------------

export type HazardMark = 'O' | 'X' | 'pending';

export interface HazardResolveInfo {
    cleared: boolean;
    dual: boolean;
    round: number;
    force: number;
    escape: number;
    /** Safe route: combined value + need. */
    combined?: number;
    need?: number;
    /** Risk route: per-meter needs. */
    needF?: number;
    needE?: number;
    /**
     * Momentum (REC#1): surplus carried into the next round, already
     * halved and capped. Zero on a failed round or the final round.
     */
    carryForce: number;
    carryEscape: number;
}

export type HazardOutcomeTier = 'perfect' | 'complete' | 'failure';

export type HazardRewardId = 'shillings' | 'riskShillings' | 'vitae';

export type HazardConsequenceId = 'deadcard' | 'maxhp' | 'minhp';

export interface HazardOutcome {
    tier: HazardOutcomeTier;
    wins: number;
    losses: number;
    rewards: HazardRewardId[];
    consequences: HazardConsequenceId[];
    /** Pick-1-of-3 card offer (empty on failure). */
    offerCards: HazardCardDef[];
    /** Perfect runs may decline the card pick. */
    canSkip: boolean;
    /**
     * Reserves (REC#3): unspent non-hex dice at completion each restore
     * 1 VITAE on complete/perfect tiers. Mage Knight's crystal economy —
     * dice you didn't burn are worth something.
     */
    reserveBonus: number;
    /** Vitae lost to the route penalty: penaltyVitae × lost rounds. */
    penaltyVitae: number;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export type HazardPhase =
    | 'route-select'
    | 'rolling'
    | 'playing'
    | 'resolve-flash'
    | 'outcome'
    | 'rewards'
    | 'done';

export interface HazardSessionState {
    hazardId: string;
    phase: HazardPhase;
    route: HazardRouteKey | null;
    round: number;
    totalRounds: number;
    marks: HazardMark[];
    /** Card ids remaining in the draw pile (refilled from the deck bag when low). */
    drawPile: string[];
    /** Card ids discarded this hazard (UI shows the count — REC#2). */
    discardPile: string[];
    hand: HazardHandEntry[];
    play: HazardHandEntry[];
    dice: HazardDie[];
    /**
     * Faces a `reroll` card turns dice to, consumed in order like the draw
     * pile. Set by a hazard puzzle from its layout; absent (no faces) in the
     * live minigame, where a reroll leaves every die as it is.
     */
    rerollFaces?: HazardDieKind[];
    /** Momentum carried into the current round (REC#1). */
    progressBase: { force: number; escape: number };
    /** Per-session momentum cap (HAZARD_MOMENTUM_CAP). */
    momentumCap: number;
    resolveInfo: HazardResolveInfo | null;
    outcome: HazardOutcome | null;
    /** Reward card picked in the rewards phase (null = skipped / none). */
    pickedRewardCardId: string | null;
    seed: SeedInput;
    rng: HazardRngState;
    /** Monotonic per-session counter backing uid generation. */
    uidCounter: number;
}

// Round-shape constants now live in the central tuning module so the
// hazard-tuning card has one file to edit. Re-exported here under their
// long-standing names for every existing import site.
export {
    HAZARD_DICE_COUNT,
    HAZARD_HAND_SIZE,
    HAZARD_MOMENTUM_CAP,
} from './hazard.tuning';
