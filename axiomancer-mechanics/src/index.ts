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
    equipItem, unequipItem, moveRelic, relicPositions, getEquippedItems,
    computeEquipDelta,
    validateDieGear, concreteDefaultRail,
    dieSpecialCap, dieGearMissFaces,
    DIE_GEAR_COLORS,
    characterPresets, getPresetById, buildCharacterFromPreset,
    levelLadderPresets,
    CHARACTER_ROSTER, CHARACTER_GREY_DECK, FRESH_RUN_BASE_STATS, FRESH_RUN_STAT_BUDGET,
    getCharacterDefinition, characterDeck, characterProblems,
    previewStatAllocation,
    experienceForLevel,
    experienceToNext,
    levelForExperience,
} from './Character';
export type {
    Character, BaseStats,
    CharacterPreset,
    CharacterDefinition, CharacterProblem, CharacterProblemCode,
    EquipDelta,
    SignatureDeltaEntry,
    DieGearColor, DieGearRail,
} from './Character';

// ─── Enemy ────────────────────────────────────────────────────────────────────
export {
    createEnemy, isEnemyBefriendable, hasEnemyPhases,
} from './Enemy';
export { hasDefeatedEnemy, defeatedEnemies, enemySlugOf } from './Game/defeat-ledger';
export { dangerKey, seenDangers, hasSeenDanger, seenDangerNames, firedDangerKeys } from './Game/seen-dangers';
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
    getThreatSequence, nextEnemyPhaseIndex,
    mechanicText,
    // Turn lifecycle, Conviction, Signature Skills
    startTurn, endTurn, discardCombatCard,
    playSignatureSkill,
    getSignatureSkill, signatureCastBlock,
    // Incoming-threat readout
    projectIncomingThreat,
    // Projected-lethality readout
    projectCombatOutcome,
    // Floating dice save-back
    getFloatingDiceColors,
    // Card programs (Global, Curse, SACRIFICE): the reads the board needs
    programLineBlock, freeLineBlock, playLimitBlock, programLineShortfall, programLineDiscardShortfall, programXChoice, isProgramCard, isCurseCard,
    GLOBAL_FREE_TURNS, DISCARD_SHORTFALL_REASON,
    programFaceText, GLOBAL_TRIGGER_TEXT,
    LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER,
    // The keep causeway (phase EN1l): the toll, TOLL and TIDE
    payTheToll, tollPayBlock, tollPayShortfall, tollPayCost, TOLL_SOURCE,
    tollOwed, tideOf, carriesToll, carriesTide, TIDE_MAX, LOW_TIDE, LOW_TIDE_VULNERABLE_PCT,
    // Card rewards and the starting deck
    COMBAT_REWARD_POOL, STARTING_CARD_IDS, rollCombatCardRewards, rewardPoolFor, addRewardCard,
    // The reward rule: worn relics' lanes feed the pool and the lane slots
    unlockedLaneIds, laneSlotCount, rewardLaneSlots,
    unlockCardViaDilemma,
    // The elite reward: the best cards or a random upgrade
    isEliteEnemy, rollEliteReward, rollEliteCardRewards, rollEliteUpgrade,
    // The elite-only relic drop, rolled after the elite reward
    eliteRelicPool, rollEliteRelicDrop,
    // Fate Engine — the dice get a second read
    riderText, RESERVE_MAX,
    // Upgradeable Dice (the combat dice model): the surfaces the app/sim
    // layers need.
    SPECIAL_CONVICTION_DEFAULT, MOMENTUM_CHAIN_ORDER, MOMENTUM_SURGE_LENGTH,
    DEFAULT_DIE_GEAR, activeDieGear,
} from './Combat';
export type { UpgradeableDieGear, EliteReward, EliteRewardUpgrade, RewardLaneSlots } from './Combat';
export { GREY_SWORD_STAND_IN, wearGreySword } from './Combat/combat.grey-sword';
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
    ProgramLedger, GlobalInPlay, ProgramShortfall, DiscardShortfall,
    // The Elementalist's weather
    ElementState, WeatherElement,
    // The Defender's spikes
    SpikeState, SpikeReading,
    // The Merciful's MERCY
    MercyState,
} from './Combat';
export {
    foeInferno, yourInferno, elementsOnFoe, weatherReading, spikeReading, REFLECT_TURNS,
    mercyReading, programFoeYielding, MERCY_CLOCK_TURNS, MERCY_BURST_MULT,
} from './Combat';
// The lighthouse path's board reads (phase EN1k).
export { lampOf, intentsInTheDark, baitSet } from './Combat';
export type { LampState } from './Combat';
// The play-log API contract: the fight and deck change the preview app posts and the Worker stores.
export {
    PLAY_LOG_FIGHTS_PATH, PLAY_LOG_DECK_EVENTS_PATH, COMBAT_EVENT_KINDS, PLAY_LOG_UI_EVENT_KINDS,
    PLAY_LOG_FIGHT_OUTCOMES, DECK_EVENT_KINDS, PLAY_LOG_LIMITS, validateFightPost, validateDeckEventPost,
    PLAY_LOG_SOURCES, PLAY_LOG_SOURCE_FILTERS,
} from './Combat';
export type {
    CombatEventKind, PlayLogUiEventKind, DeckEventKind, PlayLogStamp, PlayLogCombatEvent, PlayLogUiEvent, PlayLogCardUiEvent, PlayLogSignatureRefusedEvent,
    PlayLogEvent, PlayLogSource, FightPost, DeckEventWhere, DeckEventPost, FightRow, DeckEventRow, FightList,
    DeckEventList, PlayLogCreated, PlayLogError, FightValidation, DeckEventValidation, PlayLogSourceKind,
    PlayLogSourceFilter, PlayLogOrigin,
} from './Combat';
// The whole-run play-log contract (phase SM1c): a run opening, its events and its close.
export {
    PLAY_RUNS_PATH, RUN_EVENTS_PATH, PLAY_RUN_OUTCOMES, RUN_EVENT_KINDS, QUEST_STEP_ACTIONS, playRunEndPath, validatePlayRunPost,
    validatePlayRunEndPost, validateRunEventsPost,
} from './Combat';
export type {
    PlayRunOutcome, RunEventPayloads, RunEventKind, QuestStepAction, RunEvent, PlayRunPost, PlayRunEndPost, RunEventsPost, PlayRunRow,
    RunEventRow, PlayRunList, RunEventList, PlayRunOpened, PlayRunClosed, RunEventsCreated, PlayRunValidation,
    PlayRunEndValidation, RunEventsValidation,
} from './Combat';
// Measured truth (R12a): the Act 1 ledger x spread x deck measurement.
export {
    measuredTruthCells, sampledFamilyDraws, MEASURED_DECK_LANES, MEASURED_SAMPLED_FAMILIES, MEASURED_SPREADS,
    DEFAULT_SAMPLE_DRAWS,
} from './Combat/combat.measured-truth';
export type {
    MeasuredTruthReport, MeasuredTruthCell, MeasuredTruthDeck, MeasuredTruthFamily, MeasuredTruthOptions,
    MeasuredSampledFamily,
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
// The removal primitive plus the per-run escalating price. The village's card
// shop (`World/Village`) consumes these.
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
    // Loot caches yield consumables via rollCacheReward; the card offer draws from cacheCardRng.
    rollCacheReward, cacheCardRng,
    wornPerSlot, isEquippedFirstOfSlot, findEquippedInSlot,
    SLOT_CAPACITY,
    consumableLibrary, getConsumableById,
    relicLibrary, getRelicById, relicLaneId, wornLaneCounts,
    // The ten weapons and armor (the grey pair is worn from the start).
    weaponLibrary, armorLibrary, equipmentLibrary, EQUIPMENT_LANE, GREY_WEAPON_ID, GREY_ARMOR_ID,
    getEquipmentPieceById, cloneEquipmentPiece, equipmentLaneId, greyPair, wearGreyPair,
    // The shared grant/equip/swap path. `equipItem` never returns the displaced
    // piece (weapon/armor replace in place; a full relic row is a guarded
    // no-op), so every grant site routes through `grantItem` rather than
    // re-deriving the unequip -> addItem -> equipItem chain.
    // `qualifiesForItemRewardScreen` is the one predicate that decides
    // ceremony (reward screen) vs. the lightweight inline grant.
    grantItem, grantWearingIfFree, qualifiesForItemRewardScreen, partitionGrantsForReward, displacedBy,
} from './Items';
export type {
    Item, Equipment, Consumable, Material, QuestItem,
    EquipmentSlot,
    EquipmentEffect, EquipmentTrigger, EquipmentCondition, EquipmentPayoff, EquipmentPayoffKind,
    EquipmentDiceEffect, EquipmentDiceFields, EquipmentDieChange, EquipmentDieColor,
    SpecialPayload, SpecialPayloadKind,
    CacheLootTier,
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
    getAvailableCards, learnCard, replaceCard,
    cardLibrary, getCardById,
    // Card upgrades (Phase UP1b): the law by rarity and the id helpers
    UPGRADE_LIMITS, upgradeCard, upgradeLimit, upgradeLevel, canUpgrade,
    baseCardId, isUpgradedCardId, getUpgradedCardById,
    nextUpgradeId, upgradableCardIds,
    // Card lanes (the dev menu's CARDS section)
    CARD_LANES, GREY_LANE, getCardLane, laneRewardPool, deckLaneIds,
    // Runtime enumeration of the CardSpecialMechanic union, bound to
    // the type by compile-time assertions. Mobile KW-2 walks this list.
    CARD_SPECIAL_MECHANIC_KINDS,
    // The card-rules checkers (Phase CS1, `docs/card-spec.md` §17)
    COMPLEXITY_BUDGET, ADMISSION_BAR,
    cardLinesText, printedKeywords, cardConditions, parseAtlasKeywords,
    checkComplexityBudget, checkScrapFloor, checkGlobalTemplate, checkCarrierRule, checkDiscardCost,
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
    ELITE_RELIC_DROP_CHANCE,
    // State fixtures — one declarative state for CLI / Jest / web.
    buildStateFromFixture,
    validateStateFixture,
    getStateFixtureById, listStateFixtureIds,
    FIXTURE_NPC, FIXTURE_QUEST,
    FIXTURE_VILLAGE_EVENT, FIXTURE_CUTSCENE_EVENT, FIXTURE_QUEST_EVENT, FIXTURE_QUESTLINE,
    FIXTURE_WEAPON, FIXTURE_ARMOR, FIXTURE_TRINKETS, FIXTURE_ELITE_RELICS, FIXTURE_QUEST_RELIC,
    // Test-only: a map's quest nodes settled so a walker can cross it.
    settleQuestNodes, settleQuestNodesIn, questNodeIdsOn,
    // The relic re-slot: the v38 -> v39 hop's helper, and the one the mobile
    // item-reward queue reads a pending piece through.
    reslotRelicPiece, reslotRelicSave,
    // The death rule: a first death revives, a death while dying ends the run.
    resolveDeath, clearDying, runOverState,
} from './Game';
export type {
    StateFixture,
    GameState, GameStore, PersistenceAdapter, StoreApi,
    DeathCause, DeathResult,
    GameEvent, GameEventEmitter, GameEventHandler,
    CodexEntry,
} from './Game';

// ─── World ────────────────────────────────────────────────────────────────────
export {
    MAP_REGISTRY, getMapDefinition, createMapState,
    // The new-game start and "start on any map" (dev tools).
    createStartingWorld, STARTING_MAP, STARTABLE_MAPS,
    moveToNode,
    teleportToNode, placeOnNode, unblockMapRoute, arriveAtNode, unspendNode,
    arriveThroughPassage,
    applyDialogueChoice,
    emptyQuestLog, findActiveQuest,
    startQuest, progressQuest, completeQuest,
    payQuestReward, payCompletedQuests, newlyCompletedQuests, questRewardItem, settleKill,
    carriedCount, syncCarryObjectives, consumeCarriedItems,
    advanceHazardObjectives,
    // Elites come back after a night's rest (phase ER1).
    respawnElites, settledEliteNodes, retireEliteNode,
    markEliteUpgradeTaken, isEliteUpgradeTaken,
    eliteEncounterAt, isEliteNode, eliteRelicDropsAt,
} from './World';
export type { PaidQuestReward, KilledFoe, EliteNodeRef, SettledEliteNode, RespawnElitesResult } from './World';

// Hazard Minigame. The engine transitions, content, tuning, deck-flag codec
// and types mobile consumes; the rest of the Hazard module's surface is
// reachable from `./World/Hazard`.
export {
    HAZARD_TUNING, HAZARD_KEYWORDS, HAZARD_DECK, hazardLiveDeck, HAZARD_CRACK_CARD,
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
// Hazard puzzle bots and the difficulty curve (HP6a).
export {
    HAZARD_PUZZLE_SIM, HAZARD_PUZZLE_BOTS, hazardPuzzleLegalMoves,
    buildHazardPuzzleCurve, compareHazardPuzzleCurveRows, formatHazardPuzzleCurve,
    hazardPuzzleCurveBar, hazardPuzzleShortfall, hazardPuzzleSimRng,
    playHazardPuzzleBot, simulateHazardPuzzle,
} from './World/Hazard';
export type {
    HazardPuzzleBotKind, HazardPuzzleCurve, HazardPuzzleCurveOptions, HazardPuzzleCurveRow, HazardPuzzleSimRng,
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
// gear swap, and one card upgrade a visit).
export {
    ANVIL_VERB_PRICING, BLACKSMITH_WITNESS_VARIANTS, HEART_RICH_PAYLOAD_VARIANT,
    createBlacksmithSession, beginBlacksmith, honeBlacksmith, temperBlacksmith,
    swapBlacksmith, chooseBlacksmithCardUpgrade, cancelBlacksmithCardUpgrade,
    pickBlacksmithCardUpgrade, blacksmithCardUpgradeRefusal,
    continueBlacksmithCard, leaveBlacksmith,
    claimBlacksmithOutcome,
} from './World/Blacksmith';
export type {
    BlacksmithVariantOffer, BlacksmithSession, BlacksmithCardUpgrade,
} from './World/Blacksmith';
// Rest-choice encounter — the rest node's one irreversible choice of
// `rest` / `upgrade`.
export {
    RESTCHOICE_TUNING, createRestChoiceSession, previewRestChoiceHeal,
    chooseRestChoiceOffer, pickRestChoiceUpgrade, claimRestChoiceOutcome,
} from './World/RestChoice';
// Village counters — the paid rest and the card shop (buy a card, or pay to
// remove one), beside the Anvil.
export {
    VILLAGE_TUNING, FRESH_VILLAGE_VISIT,
    villageRestCounter, villageRestQuote, restAtVillage,
    villageCardShopSeed, rollVillageCardShop, villageCardShopFor, villageCardQuote, buyVillageCard,
    villageRemovalQuote, removeVillageCard,
} from './World/Village';
export type {
    VillageCardShop, VillageRestCounter, VillageVisit, VillageQuote, VillageRestQuote,
    VillageRemovalQuote, VillageHost,
} from './World/Village';
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
    // Traversal queries: the road rule's legal moves.
    legalMovesFrom,
    isHoldingRoads,
    syncMoveLists, syncWorldMoveLists,
    // The walk back along open roads to a node.
    roadRouteTo, walkRoadTo, roadReachable,
    auditRoadReachability, mapPassages,
    heldRoadTargets, heldRoadPlaces, nodePlace, isRoadHeld,
    // The forward skeleton the progression audits walk.
    forwardEdges,
} from './World';
export {
    resolveMapEvent,
    settleArrival,
    answerUnsettledArrival,
    getNodeEventPool,
    getNodePrimaryEventKind,
    actsOnRevisit,
    isQuietWalkBack,
    takeTravel,
    travelPayloadAt,
    isTravelOpen,
} from './World';
export type {
    MapEventKind, QuestPayload, QuestGiver, TravelPayload, TravelDestination,
    MapEventPayload, ResolvedEvent, ResolveMapEventResult,
    Questline, QuestlineStep, QuestlineId, QuestlineSettle, QuestNodeStage, QuestStepView, RouteRef,
    QuestStepState,
} from './World';
// Quest gates: the authoring check that a gate holds its road.
export type { QuestGate } from './World';
export { questGatesOn, questGateProblems } from './World';
// The questline step rules (accept, turn in, the node's stage, the settle seam).
export {
    registerQuestline, getQuestline, listQuestlines, questlineStep,
    questStepState, stepQuest, questStepView, questNodeStage, resolveQuestNodeEvent,
    openReadyQuestRoutes, settleQuestLog, acceptQuestStep, giveQuestStep, turnInQuestStep, turnInNodeOf,
    // The authored questlines (the Breakwater's Chapter 1 chain).
    AUTHORED_QUESTLINES,
    BREAKWATER_CHAPTER_QUESTLINE, BREAKWATER_CHAPTER_QUESTLINE_ID, BREAKWATER_CHAPTER_STEPS,
    BREAKWATER_CHAPTER_RELICS, BREAKWATER_KEEP_KEY, BREAKWATER_CHAPTER_GATES, BREAKWATER_CHAPTER_HELD,
    // Encounter reveal reads (ET1a).
    BREAKWATER_ENCOUNTER_NODES, BREAKWATER_ARRIVAL_LINES, arrivalLineAt, breakwaterEncounterTier,
    heldRoadPlaceAt, breakwaterPlaceAt,
} from './World';
export type { BreakwaterEncounterTier } from './World';
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
    MapState, QuestObjective, QuestLog, Reward,
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

// ── Run sim (phase SM1e): the RunPolicy contract, the wanderer, and the ──
// engine pieces the app's headless run driver (`axiomancer-mobile/sim/`) plays with.
export * from './Game/run-sim';
export { upgradeablePlayPhase } from './Combat/combat.encounter.sim';
export { COMBAT_SIM_POLICIES } from './Combat/combat.sim-policies';
export type { CombatSimPolicy, CombatSimPolicyId } from './Combat/combat.sim-policies';
export type { HazardPolicyId } from './World/Hazard/hazard.sim';
export { setSeed } from './Utils/rng';
// ── Chapter 1 as data (phase SM2b): the content listing the sim report reads, ──
// and the story readers the run sim's roads use.
export {
    chapter1Content, mapContent, storyOrderedGates, mainQuestline, currentStoryTargets, exitNodes, bossNodes,
} from './World';
export type {
    ChapterContent, ChapterNode, ChapterQuest, ChapterQuestStep, ChapterObjective, ChapterEnemy, ChapterStaging,
    ChapterHazard, ChapterItem, ChapterItemSource, ChapterGate, ChapterRegion,
} from './World';
