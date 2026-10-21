/**
 * axiomancer-mechanics — public package surface.
 * 
 * Core game engine exports for React Native and other JavaScript consumers.
 * For Node.js specific adapters, import from 'axiomancer-mechanics/node'.
 *
 * The library is consumed as the non-UI engine for a Miserere Mei, Deus client.
 * Imports are organised by domain.
 *
 * The barrel carries only what a consumer outside the engine imports
 * (axiomancer-mobile, root scripts). Engine-internal
 * helpers and test-only symbols are imported from their defining module.
 */

// ─── Character ────────────────────────────────────────────────────────────────
export {
    createCharacter,
    equipItem, unequipItem, getEquippedItems,
    computeEquipDelta,
    validateDieGear, concreteDefaultRail,
    dieSpecialCap, dieGearMissFaces,
    DIE_GEAR_COLORS,
    characterPresets, getPresetById, buildCharacterFromPreset,
    grantFirstNodeRelic, withholdFirstNodeRelic, isFirstNodeRelicPending,
    FIRST_NODE_RELIC_ID, FIRST_NODE_RELIC_FLAG,
    levelLadderPresets,
    previewStatAllocation,
    experienceForLevel,
    experienceToNext,
    levelForExperience,
} from './Character';
export type {
    Character, BaseStats,
    CharacterPreset,
    EquipDelta,
    SignatureDeltaEntry,
    DieGearColor, DieGearRail,
} from './Character';

// ─── Enemy ────────────────────────────────────────────────────────────────────
export {
    createEnemy, isEnemyBefriendable,
} from './Enemy';
export type {
    Enemy, EnemyDifficulty,
    // CodexEntry's semantic home is the Game-loop persistence surface; the
    // Enemy module re-exports it via `src/Enemy/types.ts` for the per-foe
    // content site, but the top-level barrel pulls from Game alongside
    // CodexState.
} from './Enemy';
export {
    EnemyLibrary, EnemiesByMap, ENEMY_REGISTRY,
} from './Enemy/enemy.library';

// ─── Combat ───────────────────────────────────────────────────────────────────
export {
    heal, isDefeated,
    getActiveEffectModifiers, canAct,
    healCharacter,
} from './Combat';
export type {
    Stance,
    AggregatedEffectModifiers,
} from './Combat';

// ─── Hazard-pattern combat ────────────────────────────────────────────────────
// Card-and-dice combat: emptying the foe's VITAE (`isDefeated`) wins; a
// befriend through The Open Hand opens the mercy choice, the only non-lethal
// ending.
export {
    initializeCombatEncounter, rollEncounterDice, playCombatCard,
    resolveThreatPhase, processBetweenPhases,
    selectEncounterMercyChoice, getCard,
    handCards, buildCombatSummary,
    combatDieCanPower,
    toCombatCard, buildCombatDeck,
    getThreatSequence,
    mechanicText,
    // Turn lifecycle, Conviction, Signature Skills
    startTurn, endTurn, discardCombatCard,
    playSignatureSkill,
    getSignatureSkill, signatureCastBlock, SIGNATURE_COST,
    // Incoming-threat readout
    projectIncomingThreat,
    // Projected-lethality readout
    projectCombatOutcome,
    // Floating dice save-back
    getFloatingDiceColors,
    // Card programs (Global, Curse, SACRIFICE): the reads the board needs
    programLineBlock, programLineShortfall, programXChoice, isProgramCard, isCurseCard, GLOBAL_FREE_TURNS,
    programFaceText, GLOBAL_TRIGGER_TEXT,
    LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER,
    // Card rewards and the starting deck
    COMBAT_REWARD_POOL, STARTING_CARD_IDS, rollCombatCardRewards, rewardPoolFor, addRewardCard,
    unlockCardViaDilemma,
    // Fate Engine — the dice get a second read
    riderText, RESERVE_MAX,
    // Upgradeable Dice (the combat dice model): the surfaces the app/sim
    // layers need.
    SPECIAL_CONVICTION_DEFAULT, MOMENTUM_CHAIN_ORDER, MOMENTUM_SURGE_LENGTH,
    DEFAULT_DIE_GEAR, activeDieGear,
} from './Combat';
export type { UpgradeableDieGear } from './Combat';
// Stat scaling.
export {
    scaleAmount, scaleFor, statFor, scaleRider, scaleCardForStats,
    scaleEffectIntensity, effectScaling, effectFamily,
    MECHANIC_SCALING, RIDER_SCALING, PAYLOAD_SCALING, NEUTRAL_STAT,
    programText,
} from './Combat';
export type { StatFamily, ScalingKind, KeywordScaling } from './Combat';
export type {
    CombatEncounterState,
    CombatManaDie, CombatDieColor,
    CombatCard, CombatVerbClass, CardEffectKind,
    CombatThreatPhase, CombatThreatAction, CombatThreatEffect,
    CombatOutcome, CombatEvent,
    CombatSummary,
    CombatIntentType,
    SignatureSkill,
    // The three chain colours (momentum chain)
    WheelStance,
    // Card programs: the Global / Curse / SACRIFICE ledger
    ProgramLedger, GlobalInPlay, ProgramShortfall,
} from './Combat';
// Measured truth (R12a): the Act 1 ledger x spread x deck measurement.
export { measuredTruthCells, MEASURED_DECK_LANES, MEASURED_SPREADS } from './Combat/combat.measured-truth';
export type {
    MeasuredTruthReport, MeasuredTruthCell, MeasuredTruthDeck, MeasuredTruthOptions,
} from './Combat/combat.measured-truth';

// ─── Sandbox cards — the deck-forge experimentation surface ───────────────────
// New experimental cards + numeric overrides of library cards, live everywhere
// `getCardById` is consulted; the `/deck-tuning` loop A/Bs them here before a
// literal is promoted into the library.
export {
    registerSandboxCards,
    clearSandboxCards,
} from './Cards/cards.sandbox';

// ─── Deck removal — taking a card OUT, and what that costs ──────────────────
// The removal primitive plus the per-run escalating price. The rest-choice
// engine and the picker screen consume these.
export {
    removeCardFromCombatDeck,
    cardRemovalPrice, cardRemovalsOf,
} from './Cards/card.removal';

// ─── Effects ──────────────────────────────────────────────────────────────────
export {
    applyEffect,
    lookupEffect, effectsLibrary,
} from './Effects';
export type {
    Effect, EffectType, EffectCategory,
    ActiveEffect,
} from './Effects';

// ─── Items ────────────────────────────────────────────────────────────────────
export {
    isEquipment, isConsumable, isMaterial, isQuestItem,
    // The desperation band (a healing potion pays 1.5x under half
    // VITAE). `resolveConsumableHeal` is the shared resolver mobile's presenters
    // preview with, so the shop line and the drink preview cannot drift from
    // what the engine actually pays.
    resolveConsumableHeal,
    // Loot caches yield consumables via rollCacheReward.
    rollCacheReward,
    wornPerSlot, isEquippedFirstOfSlot, findEquippedInSlot,
    SLOT_CAPACITY,
    consumableLibrary, getConsumableById,
    buyItem, sellItem, defaultSellPrice,
    relicLibrary, getRelicById,
    // The shared grant/equip/swap path. `equipItem` never returns the displaced
    // piece (weapon/armor replace in place; a full accessory row is a guarded
    // no-op), so every grant site routes through `grantItem` rather than
    // re-deriving the unequip -> addItem -> equipItem chain.
    // `qualifiesForItemRewardScreen` is the one predicate that decides
    // ceremony (reward screen) vs. the lightweight inline grant.
    grantItem, qualifiesForItemRewardScreen, partitionGrantsForReward, displacedBy,
} from './Items';
export type {
    Item, Equipment, Consumable, Material, QuestItem,
    EquipmentSlot,
    CacheLootTier,
    ShopWare,
    GrantOutcome,
} from './Items';

// ─── Cards ───────────────────────────────────────────────────────────────────
export type {
    Card, CardAspect, CardTier, CardTarget,
    CardCombatEffects, CardSpecialMechanic,
    // The rank ladder / rarity / card-type axes
    CardRank, CardRarity, CardType, CardRider,
    CardLane,
    CardRuleId, CardRuleViolation, AtlasKeyword, AtlasKeywordKind, CarrierRuleInput,
} from './Cards';
export {
    // Rank/rarity helpers (mobile renders rank names off these)
    CARD_RANK_NAMES, rankToRarity,
    getAvailableCards, learnCard,
    cardLibrary, getCardById,
    // Card lanes (the dev menu's CARDS section)
    CARD_LANES, GREY_LANE, getCardLane, laneRewardPool,
    // Runtime enumeration of the CardSpecialMechanic union, bound to
    // the type by compile-time assertions. Mobile KW-2 walks this list.
    CARD_SPECIAL_MECHANIC_KINDS,
    // The card-rules checkers (Phase CS1, `docs/card-spec.md` §17)
    COMPLEXITY_BUDGET, ADMISSION_BAR,
    cardLinesText, printedKeywords, cardConditions, parseAtlasKeywords,
    checkComplexityBudget, checkScrapFloor, checkGlobalTemplate, checkCarrierRule,
} from './Cards';

// ─── Game (state, store, persistence, constants) ──────────────────────────────
export {
    createGameStore, createNewGameState, GAME_STATE_VERSION,
    migrate, dropUnknownCardIds, dropRetiredFlags, createEventEmitter,
    selectPlayer, selectIsInCombat,
    selectVersion,
    nullAdapter,
    MAX_EFFECT_INTENSITY,
    STAT_POINTS_PER_LEVEL,
    // State fixtures — one declarative state for CLI / Jest / web.
    buildStateFromFixture,
    validateStateFixture,
    getStateFixtureById, listStateFixtureIds,
    FIXTURE_NPC, FIXTURE_SHOP, FIXTURE_QUEST,
    FIXTURE_DIALOGUE_EVENT, FIXTURE_VILLAGE_EVENT, FIXTURE_CUTSCENE_EVENT,
    FIXTURE_WEAPON, FIXTURE_ARMOR, FIXTURE_TRINKETS,
} from './Game';
export type {
    StateFixture,
    GameState, GameStore, PersistenceAdapter, StoreApi,
    GameEvent, GameEventEmitter, GameEventHandler,
    CodexEntry,
} from './Game';

// ─── World ────────────────────────────────────────────────────────────────────
export {
    MAP_REGISTRY, getMapDefinition, createMapState,
    // The new-game start and "start on any map" (dev tools).
    createStartingWorld, STARTING_MAP, STARTABLE_MAPS,
    moveToNode,
    teleportToNode, placeOnNode, unblockMapRoute,
    applyDialogueChoice,
    emptyQuestLog, findActiveQuest,
    startQuest, progressQuest, completeQuest,
} from './World';

// Hazard Minigame. The engine transitions, content, tuning, deck-flag codec
// and types mobile consumes; the rest of the Hazard module's surface is
// reachable from `./World/Hazard`.
export {
    HAZARD_TUNING, HAZARD_KEYWORDS, HAZARD_DECK, HAZARD_CRACK_CARD,
    getHazardCardDef, HAZARD_REWARDS, HAZARD_CONSEQUENCES,
    HAZARD_VITAE_REWARD, HAZARD_SHILLINGS_REWARD, HAZARD_RISK_SHILLINGS_REWARD,
    HAZARD_MINHP_LOSS, HAZARD_MAXHP_SCAR, HAZARD_LIBRARY, getHazardDef,
    HAZARD_CARD_FLAG_PREFIX, hazardStarterBag, decodeAcquiredCards,
    hazardDeckBag, appendAcquiredCard,
    hazardProjectedProgress, dieCanPowerCard, createHazardSession,
    selectHazardRoute, finishHazardRolling, stageHazardCard, unstageHazardCard,
    powerHazardCard, applyHazardCard, discardHazardCard,
    resolveHazardRound, continueHazardAfterResolve,
    acknowledgeHazardOutcome, claimHazardRewards,
} from './World/Hazard';
export type {
    HazardColor, HazardDieKind, HazardProgressKey, HazardCardDef,
    HazardHandEntry, HazardRouteKey,
    HazardMark, HazardOutcomeTier, HazardPhase, HazardSessionState,
} from './World/Hazard';

// Hazard puzzle: the fixed, one-round hazard (dev-menu only for now).
export {
    HAZARD_PUZZLE_ACT, validateHazardPuzzleLayout, validateHazardCardDef, createHazardPuzzleSession,
    stageHazardPuzzleCard, unstageHazardPuzzleCard, powerHazardPuzzleCard,
    applyHazardPuzzleCard, playHazardPuzzleMove,
    playHazardPuzzleMoves, confirmHazardPuzzle,
} from './World/Hazard';
export type {
    HazardPuzzleBand, HazardPuzzleGoal, HazardPuzzleGoals, HazardPuzzleLayout,
    HazardPuzzleMove, HazardPuzzlePhase, HazardPuzzleResult, HazardPuzzleSession,
    HazardPuzzleStat, HazardPuzzleUnlock, HazardPuzzleUnlockGrant,
    HazardPuzzleValidation,
} from './World/Hazard';
// Hazard puzzle outcome: what a resolve pays and costs, and its claim.
export {
    HAZARD_PUZZLE_FAILURE, HAZARD_PUZZLE_REWARDS, hazardPuzzleOutcome,
    hazardRegionMaterials,
} from './World/Hazard';
export type { HazardPuzzleOutcome, HazardPuzzleOutcomeContext } from './World/Hazard';
export { claimHazardPuzzleOutcome, HAZARD_SCAR_FLAG_PREFIX } from './Game';
export type { HazardPuzzleClaim } from './Game';

// Hazard puzzle solver and band check.
export {
    HAZARD_PUZZLE_TUNING, HAZARD_PUZZLE_BANDS, HAZARD_PUZZLE_SOLVER_BUDGET,
    solveHazardPuzzle, solveHazardPuzzleSession, hazardPuzzleSurplus,
    hazardPuzzleBandOf, auditHazardPuzzleRoute, auditHazardPuzzleLayout,
} from './World/Hazard';
export type {
    HazardPuzzleFeatures, HazardPuzzleFirstPlays, HazardPuzzleSolution, HazardPuzzleSolveOptions,
    HazardPuzzleRouteAudit,
} from './World/Hazard';
// Hazard puzzle card report, the solve's difficulty features and its decision pressure.
export {
    hazardPuzzleCardReport, formatHazardPuzzleCardReport, formatHazardPuzzleFeatures,
    hazardPuzzleDecisionPressure, formatHazardPuzzleDecisionPressure,
} from './World/Hazard';
export type {
    HazardPuzzleCardReport, HazardPuzzleCardSource, HazardPuzzleCardUse,
    HazardPuzzleDecisionPressure, HazardPuzzlePressureFinding,
} from './World/Hazard';
// Hazard puzzle card audit and the card pool puzzles draw from.
export {
    HAZARD_PUZZLE_CARD_POOL, HAZARD_PUZZLE_IGNORED_FIELDS, hazardPuzzleCardAudit,
    hazardPuzzleCardBan, hazardPuzzleCardGroups, hazardPuzzleCardShape, hazardPuzzleLibraryUse,
} from './World/Hazard';
export type { HazardPuzzleCardAuditRow, HazardPuzzleLibraryUse } from './World/Hazard';
// Hazard puzzle worse-copy check: unused and dominated library cards.
export {
    hazardPuzzleDominatedCards, hazardPuzzleUnusedCards, hazardPuzzleLibraryCells, hazardPuzzleLibraryCardIds,
} from './World/Hazard';
export type { HazardPuzzleDominance, HazardPuzzleLibraryCell } from './World/Hazard';
// Hazard puzzle stat unlocks.
export {
    HAZARD_PUZZLE_UNLOCK_DIE, activeHazardPuzzleUnlocks, applyHazardPuzzleUnlocks,
    hazardPuzzleDeclaresUnlocks, hazardPuzzleUnlockSubsets, auditHazardPuzzleUnlocks,
} from './World/Hazard';
export type { HazardPuzzleUnlockAudit } from './World/Hazard';
// Hazard puzzle solve-time API contract: the attempt the preview app posts and the Worker stores.
export {
    PUZZLE_ATTEMPTS_PATH, PUZZLE_ATTEMPT_BANDS, PUZZLE_ATTEMPT_END_KINDS, PUZZLE_ATTEMPT_LIMITS,
    PUZZLE_ATTEMPT_MOVE_KINDS, PUZZLE_ATTEMPT_ROUTES, validatePuzzleAttemptPost,
} from './World/Hazard';
export type {
    PuzzleAttemptCreated, PuzzleAttemptEndKind, PuzzleAttemptError, PuzzleAttemptList,
    PuzzleAttemptMove, PuzzleAttemptMoveKind, PuzzleAttemptPost, PuzzleAttemptRow, PuzzleAttemptValidation,
} from './World/Hazard';
// Hazard puzzle demos and the clock.
export {
    HAZARD_PUZZLE_LIBRARY, getHazardPuzzleLayout, HAZARD_PUZZLE_CLOCK_SECONDS, HAZARD_PUZZLE_REGIONS,
} from './World/Hazard';
// Hazard puzzle candidates: labelled puzzles kept apart from the demo library.
export {
    HAZARD_PUZZLE_CANDIDATES, getHazardPuzzleCandidate, validateHazardPuzzleCandidate,
    auditHazardPuzzleCandidate, hazardPuzzleCandidateSetProblems,
} from './World/Hazard';
export type { HazardPuzzleCandidate, HazardPuzzleCandidateAudit } from './World/Hazard';

// Blacksmith encounter ("The Anvil" — die-gear upgrades: HONE / TEMPER /
// gear swap).
export {
    ANVIL_VERB_PRICING, BLACKSMITH_WITNESS_VARIANTS, HEART_RICH_PAYLOAD_VARIANT,
    createBlacksmithSession, beginBlacksmith, honeBlacksmith, temperBlacksmith,
    swapBlacksmith, continueBlacksmithCard, leaveBlacksmith,
    claimBlacksmithOutcome,
} from './World/Blacksmith';
export type {
    BlacksmithVariantOffer, BlacksmithSession,
} from './World/Blacksmith';
// Rest-choice encounter — the rest node's one irreversible choice of
// `rest` / `cut`, composing the Cards/card.removal primitive rather than
// rebuilding it.
export {
    RESTCHOICE_TUNING, createRestChoiceSession, previewRestChoiceHeal,
    chooseRestChoiceOffer, pickRestChoiceCut, claimRestChoiceOutcome,
} from './World/RestChoice';
export type {
    RestChoiceOfferId, RestChoiceSession,
} from './World/RestChoice';
// Loot-cache-choice encounter ("The Reliquary") — the cache node's one
// irreversible choice of `card` / `item`.
export {
    createLootCacheChoiceSession, chooseLootCacheChoiceOffer,
    claimLootCacheChoiceOutcome,
} from './World/LootCacheChoice';
export type {
    LootCacheChoiceOfferId, LootCacheChoiceOutcome, LootCacheChoiceSession,
} from './World/LootCacheChoice';
export {
    changeMap, completeMap, unlockMap,
    completeNode, unlockNode, changeContinent,
    revealAdjacent, markNodeConsumed,
    // Traversal queries.
    legalMovesFrom,
    // The forward skeleton the progression audits walk.
    forwardEdges,
} from './World';
export {
    resolveMapEvent,
    settleArrival,
    getNodeEventPool,
    getNodePrimaryEventKind,
} from './World';
export type {
    MapEventKind,
    MapEventPayload, ResolvedEvent, ResolveMapEventResult,
} from './World';
// Rest shelter classification. Mobile gates the hazard-scar max-VITAE mend on this.
export type { RestShelter } from './World';
export {
    DEFAULT_REST_SHELTER, isInnShelter,
} from './World';
// The Labyrinth (THE APORIA). Additive surface for the mobile
// dev-menu entry + labyrinth presenters.
export {
    createLabyrinthProgress, visibleDoors, inspectPoi,
    submitGateAnswer, preConfirmedWords, buyHint, hintPrice,
    debtPoints, borrowedPremiseStacks, settleDebt, activateWaystone,
    lastWaystone, namingForkOpen, recordBossOutcome, getRoom,
    recordWalk, walkedEdgesOf, isSophistTrueName, resolvePoiTrap,
    SETTLE_PRICE_PER_POINT,
    APORIA_ACTS, getAporiaAct,
} from './World';
export type {
    LabyrinthActDef, LabyrinthActId,
    LabyrinthProgress,
    LabyrinthBossOutcome,
} from './World';
export type {
    WorldState, Quest,
    Encounter,
    MapName, ContinentName, QuestName,
    MapState, QuestObjective, QuestLog,
    SeedInput,
} from './World';
// Roster health (RH1): dangling references and orphans across the roster.
export { auditRosterHealth } from './World/roster-health';
export type { RosterHealthReport, RosterFinding } from './World/roster-health';

// ─── NPCs (types + dialogue helpers) ──────────────────────────────────────────
export type {
    NPC, DialogueTree, DialogueNode, DialogueChoice, DialogueContext,
} from './NPCs';
export { getDialogueNode, visibleChoices } from './NPCs';

// ─── Utilities ────────────────────────────────────────────────────────────────
export {
    deepClone,
} from './Utils';
export { setRng, getRng } from './Utils/rng';
export type { Rng } from './Utils/rng';

// ── Events ─────────────────────────────────────────────────────────────────
export type {
    TypedGameEvent,
} from './Game/events.types';

export {
    isCombatEndedEvent,
    isWorldMovedEvent,
    isLevelUpEvent, isInventoryChangedEvent,
    isDialogueAppliedEvent,
} from './Game/events.utils';

// ── AXM Log (structured logging — docs/logging.md) ────────────────────────
export {
    getLogger, configureLogging,
    resetLoggingForTests,
    AXM_LOG_DOMAINS, AXM_LOG_LEVEL_RANK,
} from './Log';
export type {
    AxmLogEntry, AxmLogLevel, AxmLogDomain,
    AxmLogFilter,
} from './Log';
