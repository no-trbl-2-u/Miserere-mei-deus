/**
 * Combat barrel.
 *
 * Combat-specific logic is split across focused modules:
 *   health.ts           — applyDamage / heal / status checks
 *   effects.ts          — combatant-side effect manipulations
 *   resist.ts           — tier 2/3 effect application resolver
 *
 * Round-resolution pure helpers also live here.
 */

export type {
    Stance,
} from './types';

export { applyDamage, heal, isAlive, isDefeated, getHealthPercentage } from './health';
export {
    updateEffectDuration, tickAllEffects,
} from './effects';

export {
    getActiveEffectModifiers, canAct,
} from './effect-modifiers';
export type {
    AggregatedEffectModifiers,
} from './effect-modifiers';

// `heal`, also exported under the name `healCharacter`.
export { heal as healCharacter } from './health';

// ─── Hazard-pattern combat ───────────────────────────────────────────────────
// The card-and-dice combat driver, built on the effects + card engines.
export type {
    CombatEncounterState,
    CombatManaDie, CombatDieColor,
    CombatCard, CombatVerbClass, CardEffectKind,
    CombatThreatPhase, CombatThreatAction, CombatThreatEffect,
    CombatOutcome, CombatEvent,
    CombatSummary,
    // Intents and signature skills
    CombatIntentType,
    SignatureSkill,
    // The three chain colours (the momentum chain)
    WheelStance,
    // The die-gear interface
    UpgradeableDieGear,
} from './combat.encounter.types';
export {
    initializeCombatEncounter, rollEncounterDice, playCombatCard,
    resolveThreatPhase, processBetweenPhases,
    selectMercyChoice as selectEncounterMercyChoice, getCard,
    handCards, buildCombatSummary,
    // Turn lifecycle + Conviction + Signature Skills
    startTurn, endTurn, discardCombatCard,
    playSignatureSkill,
    getSignatureSkill, signatureCastBlock,
    // The dice get a second read
    riderText,
    // Legibility: the incoming-threat projection
    projectIncomingThreat,
    // Projected-lethality readout (heal-aware)
    projectCombatOutcome,
    // Floating dice save-back
    getFloatingDiceColors,
    // Card programs: why a line cannot be played, and an X line's range
    programLineBlock, programLineShortfall, programLineDiscardShortfall, programXChoice,
} from './combat.engine';
// Card programs: the Global / Curse / SACRIFICE ledger and its reads.
export {
    isProgramCard, isCurseCard, GLOBAL_FREE_TURNS, DISCARD_SHORTFALL_REASON,
} from './combat.card-program';
export type { ProgramLedger, GlobalInPlay, ProgramShortfall, DiscardShortfall } from './combat.card-program';
// The Elementalist's weather: INFERNO, BLIZZARD, FROZEN, STORM.
export { foeInferno, yourInferno, elementsOnFoe, weatherReading, initElementState } from './combat.elements';
export type { ElementState } from './combat.elements';
export type { WeatherElement } from './combat.encounter.types';
// The Defender's spikes: THORNS and REFLECT.
export { spikeReading, initSpikeState, REFLECT_TURNS } from './combat.spikes';
export type { SpikeState } from './combat.spikes';
export type { SpikeReading } from './combat.encounter.types';
// The live-encounter VITAE knob the app applies (and the pacing sim reads).
export { LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER } from './live-encounter';
// Stat scaling: the formula, the keyword families, and the
// display-only stat-scaled card the hand prints.
export {
    scaleAmount, scaleFor, statFor, scaleRider, scaleCardForStats,
    scaleEffectIntensity, effectScaling, effectFamily,
    MECHANIC_SCALING, RIDER_SCALING, PAYLOAD_SCALING, NEUTRAL_STAT,
    programText,
} from './stat-scaling';
export type { StatFamily, ScalingKind, KeywordScaling } from './stat-scaling';
// The Upgradeable-Dice model: THE combat dice model.
export {
    SPECIAL_CONVICTION_DEFAULT, MOMENTUM_CHAIN_ORDER, MOMENTUM_SURGE_LENGTH,
    DEFAULT_DIE_GEAR, activeDieGear,
} from './combat.upgradeable-dice';

export {
    combatDieCanPower,
    RESERVE_MAX,
} from './combat.dice';
export { COMBAT_HAND_SIZE, buildCombatDeck } from './combat.deck';

export {
    toCombatCard,

    mechanicText,
    programFaceText, GLOBAL_TRIGGER_TEXT,
} from './combat.cards';
export {
    getThreatSequence,
} from './combat.threat';

export {
    COMBAT_REWARD_POOL, STARTING_CARD_IDS, rollCombatCardRewards, rewardPoolFor, addRewardCard,
    unlockedLaneIds, laneSlotCount, rewardLaneSlots,
    unlockCardViaDilemma,
    isEliteEnemy, rollEliteReward, rollEliteCardRewards, rollEliteUpgrade,
    eliteRelicPool, rollEliteRelicDrop,
    type EliteReward, type EliteRewardUpgrade, type RewardLaneSlots,
} from './combat.rewards';

export {
    getCombatLoadout, addToLoadout,
} from './combat.loadout';

// The play-log API contract: the fight and deck change the preview app posts and the Worker stores.
export {
    PLAY_LOG_FIGHTS_PATH, PLAY_LOG_DECK_EVENTS_PATH, COMBAT_EVENT_KINDS, PLAY_LOG_UI_EVENT_KINDS,
    PLAY_LOG_FIGHT_OUTCOMES, DECK_EVENT_KINDS, PLAY_LOG_LIMITS, validateFightPost, validateDeckEventPost,
} from './combat.play-log-contract';
export type {
    CombatEventKind, PlayLogUiEventKind, DeckEventKind, PlayLogStamp, PlayLogCombatEvent, PlayLogUiEvent, PlayLogCardUiEvent, PlayLogSignatureRefusedEvent,
    PlayLogEvent, PlayLogSource, FightPost, DeckEventWhere, DeckEventPost, FightRow, DeckEventRow, FightList,
    DeckEventList, PlayLogCreated, PlayLogError, FightValidation, DeckEventValidation,
} from './combat.play-log-contract';
