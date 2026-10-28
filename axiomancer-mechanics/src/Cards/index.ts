/**
 * Cards module — types and runtime engine.
 *
 * The engine functions here are pure: callers thread state forward
 * themselves.
 *
 * Card content (the named library) lives in `cards.library`.
 */

export type {
    Card, CardAspect, CardTier, CardTarget,
    CardCombatEffects, CardSpecialMechanic,
} from './types';

export {
    getAvailableCards, learnCard, replaceCard,
} from './card.engine';

// Card upgrades (Phase UP1b): the law by rarity and the id helpers.
export {
    UPGRADE_LIMITS, upgradeCard, upgradeLimit, upgradeLevel, canUpgrade,
    baseCardId, isUpgradedCardId, getUpgradedCardById,
    nextUpgradeId, upgradableCardIds,
} from './card-upgrades';

export {
    cardLibrary, getCardById,
} from './cards.library';

// Card lanes: the registry the dev menu's CARDS section lists.
export type { CardLane } from './card.lanes';
export { CARD_LANES, GREY_LANE, getCardLane, laneRewardPool, deckLaneIds } from './card.lanes';

// The rank ladder and the card types.
export type { CardRank, CardRarity, CardType, CardRider } from './types';
export { rankToRarity, CARD_RANK_NAMES } from './types';
// The runtime enumeration of `CardSpecialMechanic['kind']`, bound to
// the union by compile-time assertions in types.ts. Consumers that need to walk
// every kind (mobile KW-2, drift lints) read THIS instead of keeping a copy.
export { CARD_SPECIAL_MECHANIC_KINDS } from './types';

// The ratified card text rules as pure checkers (Phase CS1); the fence is
// `e2e/card-rules.engine.test.ts`, and B5's card-creator can call them too.
export type { CardRuleId, CardRuleViolation, AtlasKeyword, AtlasKeywordKind, CarrierRuleInput } from './card-rules';
export {
    COMPLEXITY_BUDGET, ADMISSION_BAR,
    cardLinesText, printedKeywords, cardConditions, parseAtlasKeywords,
    checkComplexityBudget, checkScrapFloor, checkGlobalTemplate, checkCarrierRule, checkDiscardCost,
} from './card-rules';
