/**
 * Typed action layer for the engine store.
 *
 * The combat screen never dispatches engine reducers directly — it
 * calls these actions. Each one wraps a small bit of
 * engine state and writes the result back through the store.
 *
 * In-combat resource accounting is fully engine-owned by the
 * Hazard-Pattern combat driver (`CombatEncounterState.resonance`,
 * `dice`/`reserve`) — mobile keeps no parallel mana bookkeeping.
 */

import {
    applyDialogueChoice,
    payCompletedQuests,
    buyItem as engineBuyItem,
    sellItem as engineSellItem,
    defaultSellPrice as engineDefaultSellPrice,
    buildCharacterFromPreset,
    changeMap as worldChangeMap,
    completeNode as worldCompleteNode,
    consumableLibrary,
    relicLibrary,
    LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER,
    createMapState,
    equipItem as engineEquipItem,
    unequipItem as engineUnequipItem,
    displacedBy,
    getDialogueNode,
    getMapDefinition,
    getNodePrimaryEventKind,
    getPresetById,
    getCardById,
    healCharacter,
    isConsumable,
    arriveAtNode,
    isEquipment,
    markNodeConsumed,
    resolveMapEvent,
    settleArrival,
    revealAdjacent,
    STARTING_CARD_IDS,
    unlockNode as worldUnlockNode,
    type Character,
    type GameStore,
    type Consumable,
    type DialogueChoice,
    type DialogueTree,
    type Enemy,
    type Equipment,
    type EquipmentSlot,
    type GameState,
    type Item,
    type MapName,
    type MapState,
    type ResolveMapEventResult,
    type WorldState,
} from '@mechanics';


import { COMBAT_CARDS } from '@/state/selectors/combat-cards';
import { resolveWareItem } from '@/state/presenters/village.engine';
import { findOwnedEquipment, isWornId } from '@/state/presenters/loadout';
import { EMPTY_EVENT_SLICE, EMPTY_LABYRINTH_SLICE, type AppStore } from './store';
import {
    abandonHazardAction,
    acknowledgeHazardOutcomeAction,
    applyHazardDeckPresetAction,
    applyHazardCardAction,
    beginHazardAction,
    claimHazardRewardsAction,
    continueHazardAfterResolveAction,
    discardHazardCardAction,
    finishHazardRollingAction,
    powerHazardCardAction,
    randomizeHazardDeckAction,
    resolveHazardRoundAction,
    selectHazardRouteAction,
    stageHazardCardAction,
    unstageHazardCardAction,
    type BeginHazardOptions,
    type ClaimHazardRewardsResult,
    type HazardDeckPresetId,
    type HazardDeckPresetResult,
} from './hazard/store-actions';
import { armDeathReturn } from './death-return';
import { claimHazardPuzzleAction, type ClaimHazardPuzzleResult } from './hazard/puzzle-store-actions';
import type { HazardPuzzleLayout, HazardRouteKey } from '@mechanics';
import type { LootCacheChoiceOfferId, RestChoiceOfferId } from '@mechanics';
import {
    beginRestAction,
    chooseRestChoiceOfferAction,
    claimRestChoiceOutcomeAction,
    pickRestChoiceCutAction,
    pickRestChoiceUpgradeAction,
    type BeginRestOptions,
    type ClaimRestChoiceResult,
} from './rest/store-actions';
import {
    beginLootCacheChoiceAction,
    chooseLootCacheChoiceOfferAction,
    claimLootCacheChoiceOutcomeAction,
    type BeginLootCacheChoiceOptions,
    type ClaimLootCacheChoiceResult,
} from './cache/store-actions';
import {
    abandonBlacksmithAction,
    beginBlacksmithAction,
    cancelBlacksmithCardUpgradeAction,
    chooseBlacksmithCardUpgradeAction,
    claimBlacksmithOutcomeAction,
    continueBlacksmithCardAction,
    honeBlacksmithAction,
    leaveBlacksmithAction,
    pickBlacksmithCardUpgradeAction,
    startBlacksmithForgingAction,
    swapBlacksmithAction,
    temperBlacksmithAction,
    type BeginBlacksmithOptions,
    type ClaimBlacksmithResult,
} from './blacksmith/store-actions';
import type { DieGearColor, MapEventPayload } from '@mechanics';
import {
    applyPlayerTierPresetAction,
    type ApplyPlayerTierPresetResult,
} from './dev/player-presets';
import {
    addItemByIdAction,
    devGrantItem,
    type AddItemByIdResult,
} from './dev/item-by-id';
import {
    clearLabyrinthArrivalNoteAction,
    enterLabyrinthAction,
    exitLabyrinthAction,
    labyrinthBuyHintAction,
    labyrinthInspectAction,
    labyrinthMoveAction,
    labyrinthPostArriveAction,
    labyrinthPreArriveAction,
    labyrinthRecordBossOutcomeAction,
    labyrinthSettleDebtAction,
    labyrinthSpeakNameAction,
    labyrinthSubmitGateAction,
    withoutReturnWorld,
    type LabyrinthGateOutcome,
    type LabyrinthHintOutcome,
    type LabyrinthInspectOutcome,
} from './labyrinth/store-actions';
import { getAporiaAct } from '@mechanics';
import type { LabyrinthActId, LabyrinthBossOutcome } from '@mechanics';
import { wrapActionsWithLogging } from './logging';
import { offerCompletedQuestItemsAction } from './item-reward/relic-sources';
import { endCombatOutcome, fightRecorder } from '@/lib/fightRecorder';
import { deckEventPoster, deckEventWhere, runDeck, type DeckEventState } from '@/lib/deckEvents';
import { getMapLayout } from './exploration-maps';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * `CombatEndReport` is not re-exported from the engine
 * package root (only via `axiomancer-mechanics/Game`, which the
 * package `exports` field doesn't expose). Derive the type from
 * the GameStore.endCombat signature so the alias tracks engine
 * changes without a deep import.
 */
export type CombatEndReport = ReturnType<GameStore['endCombat']>;

export interface MoveToResult {
    /** True when the engine state was advanced. */
    moved: boolean;
    /** Engine node id the player now occupies (unchanged on no-op). */
    currentNodeId: string;
    /** True when the target was locked or not currently reachable. */
    locked: boolean;
}

/** Debug seed action summary. */
export interface DebugSeedResult {
    /** Count of items pushed to the player's inventory across categories. */
    itemsAdded: number;
    /** Count of cards appended to the player's `knownCards` list. */
    cardsLearned: number;
    /** True when the current map was successfully re-seeded. */
    mapReset: boolean;
}

/**
 * Dev-only "populate every item" affordance. Adds one of every item
 * known to the engine's central registries to the player's
 * inventory: signet relics and consumables. Useful for surface-testing inventory rendering,
 * equip dock peer ordering, and per-rarity / per-slot chrome under
 * a maximal load. Mirrors `DebugSeedResult`'s shape so callers can
 * toast a uniform summary.
 */
/**
 * Dev-only GET ALL RELICS result: the relic ids added to the inventory (every
 * relic in the library the player did not already own) and the ids now worn.
 */
export interface GrantAllRelicsResult {
    added: string[];
    worn: string[];
}

export interface PopulateAllItemsResult {
    /** Total items pushed across all registries. */
    itemsAdded: number;
    /** Per-registry breakdown so the dev toast can spot a regression at a glance. */
    breakdown: {
        equipment: number;
        unique: number;
        consumable: number;
    };
}

/** Character-preset adoption result. */
export interface ApplyCharacterPresetResult {
    /** True when the preset id matched an engine preset and `player` was replaced. */
    applied: boolean;
    /** Resolved preset id ('apprentice' / 'wanderer' / 'sage'), or null when unknown. */
    presetId: string | null;
    /** Display name from the preset, or null when unknown. */
    presetName: string | null;
}

export interface AppActions {
    startCombat: (enemy: Enemy) => void;
    /**
     * Begin a LIVE map encounter on the hazard-pattern combat. Pulls the
     * foe out of the pending combat-prelude event, guarantees starter cards
     * (the real-deck safe fallback), clears the event slice, stages the
     * engine encounter via `startCombat` (HP-scaled foe) so the exit-time
     * `endCombat` has an encounter to resolve, and returns that `Enemy` for
     * the in-place `<CombatEncounterPanel>` to initialise from. The fight
     * itself lives in the panel's local React state. Returns `null` when
     * there's no pending encounter.
     */
    beginHazardEncounter: () => Enemy | null;
    /**
     * Engine `endCombat` bridge. The live hazard encounter applies its
     * own spoils; this store-level action forwards an outcome to the
     * engine's `endCombat` method (which requires an explicit outcome)
     * and surfaces the resulting `CombatEndReport`
     * (XP, loot, friendship codex unlock) for callers that need post-combat
     * metadata. Defaults to `'flee'` (no reward) when called with no
     * argument.
     */
    endCombat: (outcome?: CombatEndReport['outcome']) => CombatEndReport | null;
    addItem: (item: Item) => void;
    removeItem: (itemId: string) => void;
    useConsumable: (itemId: string) => void;
    /**
     * Apply a consumable's effect to the player and decrement the stack
     * through the engine. A consumable without a structured `healAmount`
     * heals by parsing its `effectId` string (e.g. `"Heal 6 HP"` /
     * `"Restore 4 HP"` / `"+10 HP"`). No-op when the item isn't a
     * consumable or doesn't exist.
     */
    useItem: (itemId: string) => UseItemResult;
    /**
     * Equip an item: the engine folds its stat line into `player.equipment`
     * and wears its signature. When every position of its slot is worn, the
     * last-worn piece comes off to make room (it stays in the satchel). No-op
     * when the item isn't equipment or is already worn.
     */
    equipItem: (itemId: string) => void;
    /**
     * Take a worn item off `player.equipment`, leaving its position empty.
     * Wearing fewer pieces than are carried is legal, and so is wearing none.
     * The item stays in the satchel. No-op when the item isn't worn.
     */
    unequipItem: (itemId: string) => void;
    /** Discard an item — wraps `removeItem` with a quest-item guard. */
    dropItem: (itemId: string) => void;
    /**
     * Move the player to an available node and record the arrival. A
     * non-encounter target is completed and its outbound edges in the
     * engine map graph unlock; an encounter node stays open until the
     * fight settles. Checkpoints the save.
     */
    moveTo: (nodeId: string) => MoveToResult;
    /** Swap the active map within the current continent. */
    changeMap: (mapName: MapName) => void;
    /**
     * Dev-only seed action. Adds representative items
     * across categories, teaches a handful of fixture cards, and
     * resets the current map back to its starting node. Returns a
     * summary so the calling UI can toast the result. Component
     * mount is `__DEV__`-guarded; production never reaches this.
     */
    debugSeed: () => DebugSeedResult;
    /**
     * Dev-only "populate every item" affordance. Walks the engine's
     * central item registries (`relicLibrary`, `consumableLibrary`)
     * and pushes one of each to the player's inventory. Component
     * mount is `__DEV__`-guarded; production never reaches this.
     */
    populateAllItems: () => PopulateAllItemsResult;
    /**
     * Dev-only GET ALL RELICS. Adds every relic in the engine's
     * `relicLibrary` the player does not already own (carried or worn) to
     * the inventory. Nothing worn is displaced: each new relic is worn into
     * `player.equipment` while its slot has a free position (stat line and
     * signature with it), and one past the last free position stays in the
     * satchel, unworn.
     */
    grantAllRelics: () => GrantAllRelicsResult;
    /**
     * Dev-only character preset adoption. Looks up the
     * engine `characterPresets` row by id and replaces the player
     * slice with a fresh `buildCharacterFromPreset(preset)` result.
     * No-op (returns `applied: false`) when the id is unknown.
     * Component mount is `__DEV__`-guarded; production never reaches
     * this.
     */
    applyCharacterPreset: (presetId: string) => ApplyCharacterPresetResult;
    /**
     * Dev-only player-tier preset adoption. Looks up the
     * mobile `PLAYER_TIER_PRESETS` row (`kid-l1` / `kid-l15` /
     * `kid-l30` / `kid-l50`) and replaces the player slice with a
     * fresh `buildCharacterFromPreset` build at that level — seeded
     * with level-relevant cards and equipment for the Kid's
     * evidence runs. No-op (`applied: false`) on unknown ids.
     * Component mount is `isDevToolsEnabled()`-guarded.
     */
    applyPlayerTierPreset: (presetId: string) => ApplyPlayerTierPresetResult;
    /**
     * Dev-only "add item by id". Resolves `id` against the engine's
     * item registries (signet relic → consumable) and pushes the match to the player's
     * inventory. Returns a graceful failure for unknown ids.
     * Component mount is `isDevToolsEnabled()`-guarded.
     */
    addItemById: (id: string) => AddItemByIdResult;
    /**
     * Allocate a single stat point. Wraps the engine's
     * `allocateStatPoint(stat)` action. The engine clamps
     * `availableStatPoints >= 1` before applying; this wrapper trusts
     * the caller to gate. Returns the new `availableStatPoints` count
     * so the LevelUpModal can update its local "spent / total" math
     * without round-tripping through the store selector.
     */
    allocateStatPoint: (stat: 'heart' | 'body' | 'mind') => number;
    /**
     * Engine `levelUp` action. Drains accumulated XP and grants stat points via the
     * engine's `applyLevelUps` loop (handles stacked level-ups in
     * one pass). Caller is responsible for gating on
     * `vm.levelUpReady`; the engine's `LEVEL_UP` reducer is a no-op
     * when `experience < experienceToNextLevel`.
     */
    levelUp: () => void;
    /**
     * Engine run-reset (`RESET_RUN` action). Atomic:
     * regenerates `runId`, full-heals the player, clears active
     * effects, regenerates world / quests / flags. With
     * `keepCharacter: true` the player slice survives the reset
     * (only health + effects refresh); with `keepCharacter: false`
     * a brand-new game state is built. Wraps the engine GameStore
     * method exposed on `GameStore = GameState & GameActions`, and
     * clears any in-flight Labyrinth visit and its return point.
     */
    resetRun: (opts: { keepCharacter: boolean }) => void;
    /**
     * Engine `playerDied` (the death rule). A first death revives the player
     * on the node they walked from at 1 VITAE, dying (`'revived'`); a death
     * while dying ends the run exactly as `resetRun({ keepCharacter: true })`
     * does (`'run-over'`), including the play log's `run-end` and the
     * Labyrinth cleanup. The combat route calls it for a lost fight on the map.
     */
    playerDied: (cause: 'fight' | 'hazard') => 'revived' | 'run-over';
    save: () => void;
    /**
     * Run `resolveMapEvent(state)` on the current node, cache the
     * `ResolveMapEventResult` in the mobile event slice, and apply
     * the resulting `state` to the engine store.
     *
     * `sourceNodeType` — the map node type that triggered this event
     * (e.g. `'quest'`, `'rest'`, `'treasure'`). Stored in the event
     * slice so the event modal can apply category-specific visual
     * treatment even when the engine resolves to a generic kind.
     *
     * `staged` resolves that payload in place of the node's pool: a state
     * fixture's `stagedEvent`, how `<FixtureBoot>` reaches dialogue, a
     * shop or a cutscene on an Act 1 node.
     *
     * Returns `true` when an event was produced (kind !== 'none').
     */
    resolveCurrentMapEvent: (sourceNodeType?: string, staged?: MapEventPayload) => boolean;
    /**
     * Resolve the currently-pending event by id. Branches on VM kind:
     *  - combat-prelude + 'fight'  -> startCombat(encounter.enemies[0]); clear
     *  - combat-prelude + 'flee'   -> clear (no combat)
     *  - narrative-choice + NPC dialogue with cursor -> applyDialogue;
     *    advance cursor if `nextNode !== null`, else clear
     *  - narrative-choice + auto-resolve (rest/gather/treasure/quest)
     *    -> clear (engine already advanced state via resolveMapEvent)
     */
    pickEventChoice: (choiceId: string) => void;
    /**
     * Withdraw from an encounter already entered (the combat reveal's
     * WITHDRAW). Toasts the retreat (free; it only narrates) and settles
     * the node, without requiring a pending event slice, which
     * `beginHazardEncounter` has already cleared by then. Only offered where retreat is allowed;
     * boss encounters never surface it.
     */
    fleeEncounter: () => void;
    /** Clear the pending event without dispatching any engine call. */
    dismissEvent: () => void;

    // -----------------------------------------------------------------
    // Hazard minigame (engine: axiomancer-mechanics World/Hazard). The pure
    // engine owns every rule; these wrappers thread the session through
    // the `hazard` slice. Phase order: route-select → rolling → playing
    // → resolve-flash → … → outcome → rewards → done.
    // -----------------------------------------------------------------

    /** Start a hazard session (random hazard unless pinned). Returns false if one is active. */
    beginHazard: (options?: BeginHazardOptions) => boolean;
    /** Binding route choice; casts the 4 mana dice (once per hazard). */
    selectHazardRoute: (route: HazardRouteKey) => void;
    /** Dice-cast interstitial finished animating. */
    finishHazardRolling: () => void;
    /** Drag a hand card into the play area (max 6; utility effects fire). */
    stageHazardCard: (uid: string) => void;
    /** Tap a staged card to return it to hand (frees its die). */
    unstageHazardCard: (uid: string) => void;
    /** Drag a card to the trash bin — discard it for its SALVAGE benefit. */
    discardHazardCard: (uid: string) => void;
    /** Drop a matching-colour (or wild gold) die on a staged card. */
    powerHazardCard: (uid: string, dieId: string) => void;
    /** Apply a staged card: fire its utility and lock it in (one-way). */
    applyHazardCard: (uid: string) => void;
    /** CHOOSE card (TWIN PATHS): pick which meter its surge value feeds. */
    /** Confirm FORETELL/SCOUR: pass kept card ids in draw-order; omitted ids go to discard. */
    /** Commit the staged set; the engine stamps O or X. */
    resolveHazardRound: () => void;
    /** Dismiss the resolve flash; advances the round or computes the outcome. */
    continueHazardAfterResolve: () => void;
    /** Outcome modal acknowledged → rewards ledger. */
    acknowledgeHazardOutcome: () => void;
    /**
     * Confirm rewards (cardId = picked offer, null = skip/none) and
     * apply the outcome to live game state (VITAE, currency, deck
     * flags). Clears the session and persists.
     */
    claimHazardRewards: (cardId: string | null) => ClaimHazardRewardsResult;
    /** Clear the session without rewards or penalties (dev / escape hatch). */
    abandonHazard: () => void;
    /**
     * Dev hazard puzzle demo: turn a resolve (its p on `route`) into the
     * puzzle outcome and apply it to the player (XP, items, purse, VITAE,
     * scar). The puzzle session itself is never stored.
     */
    claimHazardPuzzle: (layout: HazardPuzzleLayout, route: HazardRouteKey, p: number, seed?: number) => ClaimHazardPuzzleResult;
    /**
     * Dev tool — replace the acquired-card flags with a random pull
     * from every defined hazard card (starter + reward pool). Returns
     * the granted card ids.
     */
    randomizeHazardDeck: () => string[];
    /** Dev tool — apply one deterministic Kid strategy deck preset. */
    applyHazardDeckPreset: (presetId: HazardDeckPresetId) => HazardDeckPresetResult;

    // -----------------------------------------------------------------
    // Rest-choice encounter (see state/rest/). One irreversible choice
    // of two: rest (free, flat 25% heal) / cut (paid deck removal).
    // No back-out.
    // -----------------------------------------------------------------

    /** Start a rest node. Returns false if one is underway. */
    beginRest: (options?: BeginRestOptions) => boolean;
    /** Commit one of the three offers. Locks the others. */
    chooseRestChoiceOffer: (offer: RestChoiceOfferId) => void;
    /** Pick a card to remove (`cut` sub-step). Must be one of the offered ids. */
    pickRestChoiceCut: (cardId: string) => void;
    /** Pick a card to upgrade (`upgrade` sub-step). Must be one of the upgradable ids. */
    pickRestChoiceUpgrade: (cardId: string) => void;
    /** Confirm the settled ledger; applies heal/upgrade/spend/removal and persists. */
    claimRestOutcome: () => ClaimRestChoiceResult;

    // -----------------------------------------------------------------
    // Loot-cache-choice encounter ("The Reliquary" — see state/cache/).
    // One irreversible choice of two: card / item.
    // -----------------------------------------------------------------

    /** Start a cache from the authored payload. Returns false if one is open. */
    beginLootCacheChoice: (options?: BeginLootCacheChoiceOptions) => boolean;
    /** Commit one offer — the other vanishes. */
    chooseLootCacheChoiceOffer: (offer: LootCacheChoiceOfferId) => void;
    /** Confirm the ledger; applies the grant (if any) and persists. */
    claimLootCacheChoiceOutcome: () => ClaimLootCacheChoiceResult;

    // -----------------------------------------------------------------
    // Blacksmith encounter ("The Anvil" — see state/blacksmith/). Phase
    // order: intro → forging ⇄ card → outcome → done. Seeds from the
    // player's rail + wallet; claim writes the rail and deducts the spend.
    // -----------------------------------------------------------------

    /** Start an anvil visit from the player's rail + wallet. False if one is open. */
    beginBlacksmith: (options?: BeginBlacksmithOptions) => boolean;
    /** The anvil acknowledged: intro → forging. */
    startBlacksmithForging: () => void;
    /** HONE a die (add a mana face): forging → card (success or loud refusal). */
    honeBlacksmith: (color: DieGearColor) => void;
    /** TEMPER a die (mana face → special face): forging → card. */
    temperBlacksmith: (color: DieGearColor) => void;
    /** SWAP an offered variant gear piece in for its die: forging → card. */
    swapBlacksmith: (variantId: string) => void;
    /** Acknowledge the open result/refusal flash: card → forging. */
    continueBlacksmithCard: () => void;
    /** Open the anvil's card upgrade (once a visit). forging → upgrade-pick or a refusal card. */
    chooseBlacksmithCardUpgrade: () => void;
    /** Back out of the anvil's card picker, nothing charged. */
    cancelBlacksmithCardUpgrade: () => void;
    /** Upgrade the picked card for the anvil's price. Must be one of the upgradable ids. */
    pickBlacksmithCardUpgrade: (cardId: string) => void;
    /** Leave the anvil, sealing the ledger: forging → outcome. */
    leaveBlacksmith: () => void;
    /** Confirm the ledger; writes the rail, deducts the spend, persists. */
    claimBlacksmithOutcome: () => ClaimBlacksmithResult;
    /** Clear the anvil without applying anything (dev / escape hatch). */
    abandonBlacksmith: () => void;

    // -----------------------------------------------------------------
    // The Labyrinth — THE APORIA (see state/labyrinth/). Entered
    // through the Lantern Deep's vault door or the dev
    // menu. Durable progress lives on GameState.labyrinth; the
    // transient visit on the labyrinthUi slice. Arrival events resolve
    // through resolveCurrentMapEvent with labyrinth bracketing (waystone
    // before the roll, Oubliette ejection after).
    // -----------------------------------------------------------------

    /** Enter an act: snapshot the overworld, swap maps, resolve arrival. */
    enterLabyrinth: (actId: LabyrinthActId) => void;
    /** Leave: restore the overworld snapshot, clear the visit. */
    exitLabyrinth: () => void;
    /** Walk a door; resolves the arrival event (boss rooms defer). */
    labyrinthMove: (to: string) => boolean;
    /** Fire the boss room's deferred arrival (after the naming rite). */
    labyrinthBeginBossEvent: () => boolean;
    /** Inspect a POI: remark + fragment / secret door / baited clue. */
    labyrinthInspect: (poiId: string) => LabyrinthInspectOutcome | null;
    /** Lay words at the room's gate. */
    labyrinthSubmitGate: (words: readonly string[]) => LabyrinthGateOutcome | null;
    /** Ask the Sophist (tiers 1-3, priced by the engine). Null = broke. */
    labyrinthBuyHint: (tier: 1 | 2 | 3) => LabyrinthHintOutcome | null;
    /** Settle debt points at the Fourth Ledger. Returns points settled. */
    labyrinthSettleDebt: (points: number) => number;
    /** Speak a name at the finale; true → spared, act complete. */
    labyrinthSpeakName: (spoken: string) => boolean;
    /** Record the act boss outcome (descends or completes the maze). */
    labyrinthRecordBossOutcome: (outcome: LabyrinthBossOutcome) => void;
    /** Clear the one-shot waystone/ejection toast signal. */
    clearLabyrinthArrivalNote: () => void;

    /**
     * Buy a ware from the pending village event's shop (the village
     * screen). Engine `buyItem` owns the rules
     * (affordability, cloning); returns success.
     */
    buyVillageWare: (itemId: string) => boolean;

    /**
     * Sell an inventory item back to the pending village event's
     * shop. `index` identifies the inventory slot (mirrors
     * the CLI `shopLoop` sell path, which disambiguates the same
     * way). Price is engine `defaultSellPrice` against the shop's
     * ware list when the item matches a listed ware, else the CLI's
     * fallback of `1`. Quest items are never sellable.
     * Returns success.
     */
    sellVillageItem: (index: number) => boolean;
}

export interface UseItemResult {
    /** Item was found and a consumable. */
    applied: boolean;
    /** Healing applied to player HP (positive integer). */
    healed: number;
    /** Damage applied to player HP (positive integer). */
    damaged: number;
}

// ---------------------------------------------------------------------------
// Starter deck
// ---------------------------------------------------------------------------

/**
 * Seeds the grey office when the player knows no card yet. `STARTING_CARD_IDS`
 * is the engine's grey recipe (`grey-strike` ×5, `grey-ward` ×3, `grey-word`
 * ×2). `buildCombatDeck` deals `knownCards` verbatim (copies are real), so the
 * recipe is written directly rather than learned card by card.
 */
function ensureStarterCards(store: AppStore): void {
    const player = store.getState().player;
    if (!player || (player.knownCards?.length ?? 0) > 0) return;
    store.setState({ player: { ...player, knownCards: [...STARTING_CARD_IDS], combatRewardCards: [] } });
}

// ---------------------------------------------------------------------------
// Testing knob — live-encounter enemy HP scale
// ---------------------------------------------------------------------------

/**
 * Testing multiplier applied to every LIVE-encounter foe's HP so fights last
 * longer and there's more time to exercise a deck's status-effect play. Applied
 * only at the mobile `beginHazardEncounter` chokepoint (below), NOT in the
 * engine's `createEnemy` — the hermetic engine tests assert exact authored
 * `maxHealth` values (e.g. every survivor's `maxHealth` in `enemy.library.ts`) and must stay untouched.
 * The value is the engine's `LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER`, which the
 * engine's pacing sim also applies, so sim turn counts match live fights.
 * Set it to 1 there to restore stock HP.
 */
export const ENCOUNTER_ENEMY_HP_MULTIPLIER = LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER;

/**
 * Returns a copy of `enemy` with `health` and `maxHealth` scaled by `mult`
 * (rounded, floored at 1). Both scale together so HP-ratio mechanics
 * (befriend `hpGate`, execute thresholds) keep their proportions. A `mult` of 1
 * returns an equivalent (un-scaled) enemy.
 */
export function withScaledEnemyHp(enemy: Enemy, mult: number): Enemy {
    if (mult === 1) return enemy;
    const maxHealth = Math.max(1, Math.round(enemy.maxHealth * mult));
    const health = Math.max(1, Math.round(enemy.health * mult));
    return { ...enemy, health, maxHealth };
}

/**
 * Opens the play log's recording of the fight just staged (phase BE2c): the
 * foe, the player's level and VITAE before the first card, and the HP
 * multiplier the foe was scaled by. A no-op while the play-log gate is shut.
 */
function recordFightStart(store: AppStore, enemy: Enemy, enemyHpMultiplier: number): void {
    const player = store.getState().player;
    if (!player) return;
    const { weapon, armor } = player.equipment;
    const relics = [weapon, armor, ...player.equipment.relics].flatMap((piece) => (piece ? [piece.id] : []));
    fightRecorder.start({ enemyId: enemy.id, playerLevel: player.level, enemyHpMultiplier, vitaeStart: player.health, relics });
}

/**
 * The play log's run-end deck event (phase BE2e): the deck the run ended
 * with, read before the engine's reset clears it. A no-op with no player
 * loaded or the play-log gate shut.
 */
function recordRunEnd(store: AppStore): void {
    const state = store.getState() as unknown as DeckEventState;
    if (!state.player) return;
    void deckEventPoster.post({
        kind: 'run-end',
        cardId: null,
        offered: null,
        deck: runDeck(state),
        where: deckEventWhere(state, 'run-end'),
    });
}

/**
 * What a run over leaves behind in the mobile slices, after the engine has
 * reset the run.
 */
function clearRunScopedSessions(store: AppStore): void {
    // A run reset regenerates the overworld (seating the player at
    // the starting node), so any in-flight Labyrinth visit is over.
    // Clear the mobile session slice — otherwise the still-mounted
    // Labyrinth presenter looks the fresh overworld node up in the
    // act and throws LabyrinthContentError (the "battle loss → THE
    // BINDING TORE" crash). This is the single choke point for
    // every reset (combat defeat + hazard out-of-combat death).
    if (store.getState().labyrinthUi?.session) {
        store.setState({ labyrinthUi: EMPTY_LABYRINTH_SLICE });
    }
    // The visit's durable return point goes with it:
    // the fresh overworld is where the run now stands.
    const lab = store.getState().labyrinth;
    if (lab?.returnWorld) {
        store.setState({ labyrinth: withoutReturnWorld(lab) });
    }
}

// ---------------------------------------------------------------------------
// Action creators
// ---------------------------------------------------------------------------

export function createAppActions(store: AppStore): AppActions {
    // AXM Log: every action funnels through this object, so wrapping the
    // literal ONCE instruments the whole dispatch surface (name, duration,
    // error capture-and-rethrow) while preserving the provider-stable
    // AppActions reference contract.
    const actions: AppActions = {
        startCombat: (enemy) => {
            // Starter cards must exist BEFORE the engine snapshots the
            // player — the picker and the engine both read the
            // snapshot's knownCards. The engine's `startCombat` records
            // the encounter (`currentEncounter`) and fires `combat:started`.
            ensureStarterCards(store);
            store.getState().startCombat(enemy);
            recordFightStart(store, enemy, 1);
        },
        beginHazardEncounter: () => {
            // Live map encounters run the hazard-pattern combat. Pull the foe out of
            // the pending combat-prelude event, guarantee a real deck via
            // starter cards, clear the event slice, and hand the enemy back
            // for the in-place panel to bootstrap. The fight itself is still
            // driven entirely by the panel's local React state — but we DO
            // stage `state.currentEncounter` via `startCombat` so
            // the exit-time `endCombat` call has a real encounter to resolve
            // rewards, flags, codex unlocks, and faction deltas
            // against instead of silently no-op'ing.
            const slice = store.getState().event;
            const pending = slice?.pending ?? null;
            if (!pending || pending.event.kind !== 'encounter') return null;
            const enemy = pending.event.encounter.enemies[0] ?? null;
            if (!enemy) return null;
            ensureStarterCards(store);
            clearEventSlice(store);
            // Testing: fatten every live foe so encounters run longer (more
            // turns to exercise status-effect play). See ENCOUNTER_ENEMY_HP_MULTIPLIER.
            const scaledEnemy = withScaledEnemyHp(enemy, ENCOUNTER_ENEMY_HP_MULTIPLIER);
            store.getState().startCombat(scaledEnemy);
            recordFightStart(store, scaledEnemy, ENCOUNTER_ENEMY_HP_MULTIPLIER);
            return scaledEnemy;
        },
        endCombat: (outcome) => {
            // Cross-combat resource carry is engine-owned (the reducer's
            // END_COMBAT banks unspent philosophical resources onto the player
            // and folds them into the next combat's seed) — no client carry.
            // Surface the engine `CombatEndReport` so callers can read
            // post-combat metadata (codex unlock, narrative). The engine
            // `endCombat` requires an explicit outcome; default to `'flee'`
            // (no reward) when unspecified. It returns a stub 'flee' report
            // when called outside an encounter.
            const questsBefore = (store.getState() as unknown as GameState).quests;
            const report = store.getState().endCombat(outcome ?? 'flee');
            // A kill that completed a quest: its relic goes to the reward screen.
            if (questsBefore) offerCompletedQuestItemsAction(store, questsBefore);
            // The play log: posts a fight the panel never finished (a WITHDRAW);
            // one it finished has already posted, so this is a no-op then.
            void fightRecorder.end(endCombatOutcome(outcome ?? 'flee'));
            return report ?? null;
        },
        // Action creators used elsewhere — wired here for completeness.
        addItem: (item) => store.getState().addItem(item),
        removeItem: (itemId) => store.getState().removeItem(itemId),
        useConsumable: (itemId) => store.getState().useConsumable(itemId),
        useItem: (itemId) => useItemAction(store, itemId),
        equipItem: (itemId) => equipItemAction(store, itemId),
        unequipItem: (itemId) => unequipItemAction(store, itemId),
        dropItem: (itemId) => dropItemAction(store, itemId),
        moveTo: (nodeId) => moveToAction(store, nodeId),
        changeMap: (mapName) => changeMapAction(store, mapName),
        debugSeed: () => debugSeedAction(store),
        populateAllItems: () => populateAllItemsAction(store),
        grantAllRelics: () => grantAllRelicsAction(store),
        applyCharacterPreset: (presetId) => applyCharacterPresetAction(store, presetId),
        applyPlayerTierPreset: (presetId) => applyPlayerTierPresetAction(store, presetId),
        addItemById: (id) => addItemByIdAction(store, id),
        allocateStatPoint: (stat) => {
            // Engine's `allocateStatPoint` is a zustand action attached
            // to the GameStore (`node_modules/axiomancer-mechanics/dist/
            // Game/store.d.ts:34`). We forward verbatim and return the
            // post-mutation `availableStatPoints` value for the UI.
            const engineStore = store.getState() as unknown as {
                allocateStatPoint?: (s: 'heart' | 'body' | 'mind') => void;
            };
            engineStore.allocateStatPoint?.(stat);
            return store.getState().player?.availableStatPoints ?? 0;
        },
        resetRun: (opts) => {
            // Engine `resetRun`. Same cast pattern as `allocateStatPoint`: the method is
            // attached to the zustand store directly, not the engine
            // selectors. Return value (the fresh GameState) is unused
            // here — the store already reflects the new state.
            const engineStore = store.getState() as unknown as {
                resetRun?: (o: { keepCharacter: boolean }) => unknown;
            };
            recordRunEnd(store);
            engineStore.resetRun?.(opts);
            clearRunScopedSessions(store);
        },
        playerDied: (cause) => {
            const engineStore = store.getState() as unknown as {
                playerDied?: (c: 'fight' | 'hazard') => 'revived' | 'run-over';
            };
            // A death while dying is a run over: post the run's end before
            // the engine drops it, as `resetRun` does.
            const runOver = store.getState().dying === true;
            if (runOver) recordRunEnd(store);
            const outcome = engineStore.playerDied?.(cause) ?? 'run-over';
            if (outcome === 'run-over') clearRunScopedSessions(store);
            // Mobile owns save timing: the engine's durable-action autosave is
            // deflected here, so the revive (or the fresh run) is checkpointed
            // by hand, before the return moment, and a reload keeps `dying`.
            try {
                store.getState().save();
            } catch {
                // Persistence failures must not strand the player on the fight.
            }
            return outcome;
        },
        levelUp: () => {
            // Engine `levelUp` action. Same
            // cast pattern as `allocateStatPoint` / `resetRun`. The
            // engine's `LEVEL_UP` reducer applies `applyLevelUps`
            // which loops while `experience >= experienceToNextLevel`,
            // so a single dispatch covers stacked level-ups.
            const engineStore = store.getState() as unknown as {
                levelUp?: () => void;
            };
            engineStore.levelUp?.();
        },
        save: () => store.getState().save(),
        resolveCurrentMapEvent: (sourceNodeType?: string, staged?: MapEventPayload) =>
            resolveCurrentMapEventAction(store, sourceNodeType, staged),
        pickEventChoice: (choiceId) => pickEventChoiceAction(store, choiceId),
        fleeEncounter: () => fleeEncounterAction(store),
        dismissEvent: () => dismissEventAction(store),
        beginHazard: (options) => beginHazardAction(store, options),
        selectHazardRoute: (route) => selectHazardRouteAction(store, route),
        finishHazardRolling: () => finishHazardRollingAction(store),
        stageHazardCard: (uid) => stageHazardCardAction(store, uid),
        unstageHazardCard: (uid) => unstageHazardCardAction(store, uid),
        discardHazardCard: (uid) => discardHazardCardAction(store, uid),
        powerHazardCard: (uid, dieId) => powerHazardCardAction(store, uid, dieId),
        applyHazardCard: (uid) => applyHazardCardAction(store, uid),
        resolveHazardRound: () => resolveHazardRoundAction(store),
        continueHazardAfterResolve: () => continueHazardAfterResolveAction(store),
        acknowledgeHazardOutcome: () => acknowledgeHazardOutcomeAction(store),
        claimHazardRewards: (cardId) =>
            // A revive owes the return moment: arm it before the claim clears
            // the session, so the hazard screen does not pop on its way out.
            claimHazardRewardsAction(store, cardId, (cause) => {
                const outcome = actions.playerDied(cause);
                if (outcome === 'revived') armDeathReturn();
                return outcome;
            }),
        abandonHazard: () => abandonHazardAction(store),
        claimHazardPuzzle: (layout, route, p, seed) => claimHazardPuzzleAction(store, layout, route, p, seed),
        randomizeHazardDeck: () => randomizeHazardDeckAction(store),
        applyHazardDeckPreset: (presetId) => applyHazardDeckPresetAction(store, presetId),
        // ── The Labyrinth (THE APORIA) ──
        enterLabyrinth: (actId) => enterLabyrinthAndArriveAction(store, actId),
        exitLabyrinth: () => exitLabyrinthAction(store),
        labyrinthMove: (to) => {
            const session = store.getState().labyrinthUi?.session ?? null;
            if (!session) return false;
            if (!labyrinthMoveAction(store, to)) return false;
            // The boss room's arrival is deferred: the finale panel (naming
            // rite, Borrowed Premise reckoning) must precede the fight —
            // `labyrinthBeginBossEvent` fires it (CLI `bossRoomSequence`
            // parity).
            const act = getAporiaAct(session.actId);
            if (store.getState().world.currentMap.currentNode === act.bossRoom) {
                return true;
            }
            labyrinthPreArriveAction(store);
            resolveCurrentMapEventAction(store, 'labyrinth');
            labyrinthPostArriveAction(store);
            return true;
        },
        labyrinthBeginBossEvent: () => resolveCurrentMapEventAction(store, 'labyrinth'),
        labyrinthInspect: (poiId) => labyrinthInspectAction(store, poiId),
        labyrinthSubmitGate: (words) => labyrinthSubmitGateAction(store, words),
        labyrinthBuyHint: (tier) => labyrinthBuyHintAction(store, tier),
        labyrinthSettleDebt: (points) => labyrinthSettleDebtAction(store, points),
        labyrinthSpeakName: (spoken) => labyrinthSpeakNameAction(store, spoken),
        labyrinthRecordBossOutcome: (outcome) => labyrinthRecordBossOutcomeAction(store, outcome),
        clearLabyrinthArrivalNote: () => clearLabyrinthArrivalNoteAction(store),

        beginRest: (options) => beginRestAction(store, options),
        chooseRestChoiceOffer: (offer) => chooseRestChoiceOfferAction(store, offer),
        pickRestChoiceCut: (cardId) => pickRestChoiceCutAction(store, cardId),
        pickRestChoiceUpgrade: (cardId) => pickRestChoiceUpgradeAction(store, cardId),
        claimRestOutcome: () => claimRestChoiceOutcomeAction(store),
        beginLootCacheChoice: (options) => beginLootCacheChoiceAction(store, options),
        chooseLootCacheChoiceOffer: (offer) => chooseLootCacheChoiceOfferAction(store, offer),
        claimLootCacheChoiceOutcome: () => claimLootCacheChoiceOutcomeAction(store),
        beginBlacksmith: (options) => beginBlacksmithAction(store, options),
        startBlacksmithForging: () => startBlacksmithForgingAction(store),
        honeBlacksmith: (color) => honeBlacksmithAction(store, color),
        temperBlacksmith: (color) => temperBlacksmithAction(store, color),
        swapBlacksmith: (variantId) => swapBlacksmithAction(store, variantId),
        continueBlacksmithCard: () => continueBlacksmithCardAction(store),
        chooseBlacksmithCardUpgrade: () => chooseBlacksmithCardUpgradeAction(store),
        cancelBlacksmithCardUpgrade: () => cancelBlacksmithCardUpgradeAction(store),
        pickBlacksmithCardUpgrade: (cardId) => pickBlacksmithCardUpgradeAction(store, cardId),
        leaveBlacksmith: () => leaveBlacksmithAction(store),
        claimBlacksmithOutcome: () => claimBlacksmithOutcomeAction(store),
        abandonBlacksmith: () => abandonBlacksmithAction(store),
        buyVillageWare: (itemId) => buyVillageWareAction(store, itemId),
        sellVillageItem: (index) => sellVillageItemAction(store, index),
    };
    return wrapActionsWithLogging(actions);
}

// ---------------------------------------------------------------------------
// Inventory action implementations
// ---------------------------------------------------------------------------

/**
 * Parse a consumable's free-form `effect` string for a healing value.
 * Recognises patterns like `"Heal N HP"`, `"Restore N HP"`, `"+N HP"`,
 * or `"N HP"`. Returns 0 when no value is found.
 */
export function parseHealAmount(effect: string): number {
    if (!effect) return 0;
    const lowered = effect.toLowerCase();
    // Skip strings that explicitly mention damage so we don't heal from
    // a damage-coded consumable.
    if (/\bdamage|\bharm|\binflict|\bburn|\bpoison|\bbleed/.test(lowered)) {
        const matchDamageOnly = /(?:^|\b)(heal|restore|\+)/.test(lowered);
        if (!matchDamageOnly) return 0;
    }
    const re = /(?:heal|restore|\+)\s*(\d+)\s*hp\b/i;
    const m = effect.match(re);
    if (m && m[1]) return Math.max(0, parseInt(m[1], 10));
    const re2 = /\b(\d+)\s*hp\b/i;
    const m2 = effect.match(re2);
    if (m2 && m2[1]) return Math.max(0, parseInt(m2[1], 10));
    return 0;
}

function useItemAction(store: AppStore, itemId: string): UseItemResult {
    const state = store.getState();
    const inventory: readonly Item[] = state.player.inventory;
    const item = inventory.find((i: Item) => i.id === itemId);
    if (!item || !isConsumable(item)) {
        return { applied: false, healed: 0, damaged: 0 };
    }

    const consumable = item as Consumable;
    const hpBefore = state.player.health;
    // The engine's `store.useConsumable` runs `useConsumableEffect`
    // internally, which already applies `consumable.healAmount` when the
    // structured field is present. We only need to apply heal ourselves
    // for fixtures / records that encode the value as a free-form
    // `effectId` string ("Heal N HP") — the engine ignores those
    // (lookupEffect returns undefined).
    const legacyHeal = consumable.healAmount != null
        ? 0
        : parseHealAmount(consumable.effectId ?? '');
    let nextPlayer: Character = state.player;
    if (legacyHeal > 0) {
        nextPlayer = healCharacter(nextPlayer, legacyHeal);
    }

    // Apply the player-state update first, then route the stack
    // decrement through the engine's reducer.
    if (nextPlayer !== state.player) {
        store.setState({ player: nextPlayer });
    }
    store.getState().useConsumable(itemId);

    const hpAfter = store.getState().player.health;
    const delta = hpAfter - hpBefore;
    return {
        applied: true,
        healed: Math.max(0, delta),
        damaged: Math.max(0, -delta),
    };
}

/**
 * Enter an act and answer its entry room: the snapshot and swap, then the
 * waystone before the arrival roll and the Oubliette after it. Shared by
 * the dev menu, the act-select screen and the Lantern Deep's vault door.
 */
function enterLabyrinthAndArriveAction(store: AppStore, actId: LabyrinthActId): void {
    enterLabyrinthAction(store, actId);
    labyrinthPreArriveAction(store);
    resolveCurrentMapEventAction(store, 'labyrinth');
    labyrinthPostArriveAction(store);
}

/** Surface a one-shot toast, preserving the existing level-up ack flag. */
function pushToast(store: AppStore, text: string): void {
    const prev = store.getState().notifications;
    store.setState({
        notifications: {
            levelUpAcknowledged: prev?.levelUpAcknowledged ?? true,
            questAcknowledged: prev?.questAcknowledged ?? true,
            toast: { text, id: (prev?.toast?.id ?? 0) + 1 },
        },
    });
}

function equipItemAction(store: AppStore, itemId: string): void {
    const state = store.getState();
    const target = state.player.inventory.find((i: Item) => i.id === itemId);
    if (!target || !isEquipment(target)) return;
    const equip = target as Equipment;
    if (isWornId(state.player.equipment, equip.id)) return;

    // The engine folds the stat line and wears the piece. A full relic row
    // gives up its last-worn piece (the one the modal names as REPLACE); it
    // stays in the satchel, since worn pieces are carried too.
    const { index } = displacedBy(state.player, equip);
    const nextPlayer = engineEquipItem(
        state.player,
        equip,
        index === null ? undefined : { replaceIndex: index },
    );
    if (nextPlayer === state.player) return;
    store.setState({ player: nextPlayer });
}

function unequipItemAction(store: AppStore, itemId: string): void {
    // Taking a piece off leaves its position empty: a body may wear fewer
    // relics than it carries, or none. The piece stays in the satchel.
    const state = store.getState();
    const loadout = state.player.equipment;
    if (!isWornId(loadout, itemId)) return;
    const target = findOwnedEquipment(state.player, itemId);
    if (target === null) return;

    const relicIndex =
        target.slot === 'relic'
            ? loadout.relics.findIndex((a) => a.id === itemId)
            : undefined;
    const nextPlayer = engineUnequipItem(state.player, target.slot, relicIndex);
    if (nextPlayer === state.player) return;
    store.setState({ player: nextPlayer });
}

function dropItemAction(store: AppStore, itemId: string): void {
    const state = store.getState();
    const inventory: readonly Item[] = state.player.inventory;
    const target = inventory.find((i: Item) => i.id === itemId);
    if (!target) return;
    // Quest items cannot be discarded — `canDiscard` on the VM mirrors
    // this guard so the screen never offers the action, but defend in
    // depth here for direct dispatch.
    if (target.category === 'quest-item') return;
    store.getState().removeItem(itemId);
}

// ---------------------------------------------------------------------------
// World actions
// ---------------------------------------------------------------------------

/**
 * Read the player's current node id from the world slice. The runtime
 * `MapState` exposes `currentNode` directly — `createMapState` seeds it from the
 * static definition's `startingNode.id` for a fresh map.
 */
export function readCurrentNodeId(world: WorldState): string {
    return world.currentMap.currentNode;
}

/**
 * Stand the player on `nodeId` as an ARRIVAL: the cursor moves and the node's
 * unanswered arrival is recorded (`pendingArrival`), exactly as the engine's
 * own arrival verb `moveToNode` does. Mobile keeps its own move (the screen's
 * reachability rules differ from the reducer's), so it must write the same
 * sentence the engine writes — otherwise the move's checkpoint would save a
 * player standing on a node with no record of what they still owe it.
 */
function writeArrivalNodeId(map: MapState, nodeId: string): MapState {
    // The engine's own arrival write: cursor, owed arrival and `arrivedFrom`
    // (where a first death returns the player) as one sentence.
    return arriveAtNode(map, nodeId);
}

function moveToAction(store: AppStore, nodeId: string): MoveToResult {
    const world: WorldState | undefined = store.getState().world;
    if (!world) {
        return { moved: false, currentNodeId: '', locked: false };
    }

    const currentNodeId = readCurrentNodeId(world);
    const map = world.currentMap;
    const available = map.availableNodes;
    const completed = map.completedNodes;

    // Target must be currently reachable. Locked or already-completed
    // taps no-op (the screen also gates this, but defend in depth).
    const isAvailable = available.includes(nodeId);
    const isLocked = map.lockedNodes.includes(nodeId);
    if (!isAvailable) {
        return { moved: false, currentNodeId, locked: isLocked };
    }

    // Node kind comes from the engine's authored event pools. Encounter /
    // boss nodes (both resolve to the `encounter` kind) are not completed or
    // consumed BY THE MOVE, and the move does not open their way on either:
    // a fight's node is settled when the fight ends, by the
    // engine's `END_COMBAT` (`settleArrival`) or by a flee below. Until then
    // a save, mid-fight included, stands the player on the node with the
    // fight owed and nowhere else to go, and the map re-offers it on reload.
    // Every other kind completes here, and resolving its arrival consumes it
    // (`resolve-map-event.ts`).
    const nodeKind = getNodePrimaryEventKind(map.continent, map.name, nodeId);
    const isEncounterNode = nodeKind === 'encounter';

    // Only complete/consume nodes that aren't encounters
    let nextWorld: WorldState = world;
    if (!isEncounterNode) {
        nextWorld = worldCompleteNode(world, nodeId);
        // The engine reducer only *adds* to completedNodes; tidy up the
        // available list so the same node can't be re-entered.
        nextWorld = {
            ...nextWorld,
            currentMap: {
                ...nextWorld.currentMap,
                availableNodes: (nextWorld.currentMap.availableNodes as readonly string[]).filter(
                    (n: string) => n !== nodeId,
                ),
            },
        };
    }

    // Populate `availableNodes` (the screen's reachable set) from the ENGINE
    // graph's outbound edges — `getMapDefinition` is the single source of truth
    // for the unlock graph; the client carries no edge list of its own.
    const engineNode = getMapDefinition(map.continent, map.name).nodes.find(
        (n) => n.id === nodeId,
    );
    for (const targetId of isEncounterNode ? [] : engineNode?.connectedNodes ?? []) {
        if (completed.includes(targetId)) continue;
        if (nextWorld.currentMap.availableNodes.includes(targetId)) continue;
        nextWorld = worldUnlockNode(nextWorld, targetId);
    }

    nextWorld = {
        ...nextWorld,
        currentMap: writeArrivalNodeId(nextWorld.currentMap, nodeId),
    };

    // Populate the engine's parallel data model (`discoveredNodes`) via
    // `revealAdjacent`. The engine reads neighbours from
    // `getMapDefinition(continent, name).nodes[].connectedNodes` — no
    // mobile-side traversal needed. Kept alongside the `availableNodes`
    // population above.
    nextWorld = {
        ...nextWorld,
        currentMap: revealAdjacent(nextWorld.currentMap, nodeId),
    };

    store.setState({ world: nextWorld });

    // Moving between nodes is a checkpoint. Saves are explicit on mobile,
    // and node movement mutates `currentNode`, `completedNodes`,
    // `availableNodes` and `discoveredNodes`: real progress that a reload
    // must not undo, on the same argument as the map-crossing checkpoint.
    // The adapter debounces writes, so this is cheap even tapped quickly.
    //
    // THE ARRIVAL IS NOT IN THIS SNAPSHOT, AND THAT IS DELIBERATE. The caller resolves the node's event AFTER
    // this returns (`app/(tabs)/exploration/index.tsx` → `onConfirmMove`), so
    // the checkpoint records a player standing on a node whose event they
    // have not answered — on an encounter node, a fight they have not had.
    // What makes that honest is that the debt is recorded too, and recorded
    // as itself: the move above wrote `pendingArrival: nodeId` onto the map
    // (`writeArrivalNodeId`), it rides this very save, and the map screen
    // re-offers it on the next mount (`vm.arrivalPending`). Saving here
    // rather than after the resolve is therefore load-bearing —
    // `resolveMapEvent` clears `pendingArrival` the moment the
    // arrival is answered, so a save taken below it would persist "nothing
    // owed" and the reload would walk past the fight.
    //
    // The debt is a record of ARRIVING, not a guess from the shape of the
    // map. Reading it off "the node under the player is unconsumed" instead
    // could not tell a walk from a placement, and
    // `placeOnNode` un-consumes the node it places you on — so every state
    // fixture and every `/dev` JUMP looked like an arrival nobody had
    // answered and fired its event on mount.
    try { store.getState().save(); } catch { /* persistence must not block the road */ }

    return { moved: true, currentNodeId: nodeId, locked: false };
}

function changeMapAction(store: AppStore, mapName: MapName): void {
    try {
        const world: WorldState | undefined = store.getState().world;
        if (!world) return;

        // Build the fresh map with the engine's two-step
        // `createMapState(getMapDefinition(continent, name))`. Continent
        // is sourced from the current map, so this swaps within it.
        const continent = world.currentMap.continent;
        const nextMap = createMapState(getMapDefinition(continent, mapName));
        const nextWorld = worldChangeMap(world, nextMap);
        store.setState({ world: nextWorld });
    } catch (error) {
        console.error(`Failed to change map to ${mapName}:`, error);
    }
}

// ---------------------------------------------------------------------------
// Debug seed (dev-only manual-testing affordance)
// ---------------------------------------------------------------------------

function debugSeedAction(store: AppStore): DebugSeedResult {
    let itemsAdded = 0;
    let cardsLearned = 0;
    let mapReset = false;

    try {
        const state = store.getState();
        const addItem = state.addItem;

        // 1. One consumable from the engine library (Healing Potion as the
        //    canonical test item). `addItem` is the engine reducer; we
        //    spread to a fresh object so the engine's stack-merge path can
        //    do its work without alias issues.
        try {
            const potion = consumableLibrary[0];
            if (potion) {
                addItem({ ...potion });
                itemsAdded++;
            }
        } catch (error) {
            console.warn('Failed to add consumable item:', error);
        }

        // 2. One relic for the relic slot. The only equipment is the
        //    signet relics, and every relic takes the relic slot (weapon
        //    and armor have no content); grant the first, worn while a
        //    position is free, so the dock + equip-replace preview have a
        //    piece to render.
        const seedSlots: ReadonlyArray<EquipmentSlot> = ['relic'];
        for (const slot of seedSlots) {
            try {
                const relic = relicLibrary.find(r => r.slot === slot);
                if (relic) {
                    devGrantItem(store, relic);
                    itemsAdded++;
                }
            } catch (error) {
                console.warn(`Failed to add relic for slot ${slot}:`, error);
            }
        }

        // 3. The first four cards of the engine's library (via
        //    `state/selectors/combat-cards`). Push directly onto `player.knownCards` rather than via
        //    `engine.learnCard` — `learnCard` enforces level-/stat-
        //    gating which the dev seed should bypass. The ids it adds
        //    are exactly what the picker renders from `COMBAT_CARDS`.
        try {
            const fixtureCardIds: ReadonlyArray<string> = COMBAT_CARDS
                .slice(0, 4)
                .map((s) => s.id);
            if (fixtureCardIds.length > 0) {
                const afterAdd = store.getState();
                const player = afterAdd.player;
                const known = new Set<string>(player.knownCards ?? []);
                for (const id of fixtureCardIds) {
                    if (!known.has(id)) {
                        known.add(id);
                        cardsLearned++;
                    }
                }
                const nextPlayer: Character = {
                    ...player,
                    knownCards: Array.from(known),
                };
                store.setState({ player: nextPlayer });
            }
        } catch (error) {
            console.warn('Failed to add cards:', error);
        }

        // 4. Reset the current map: re-seed via the engine's two-step
        //    `createMapState(getMapDefinition(continent, name))` +
        //    `changeMap`. Engine guarantees the returned `MapState` is at
        //    `currentNode = startingNode.id` with cleared
        //    discoveredNodes / consumedNodes.
        const world: WorldState | undefined = store.getState().world;
        if (world && world.currentMap) {
            try {
                const fresh = createMapState(
                    getMapDefinition(world.currentMap.continent, world.currentMap.name),
                );
                const nextWorld = worldChangeMap(world, fresh);
                store.setState({ world: nextWorld });
                mapReset = true;
            } catch (error) {
                // changeMap can throw if the map name is unknown. Swallow
                // and report — the seed action is best-effort dev affordance.
                console.warn('Failed to reset map:', error);
                mapReset = false;
            }
        }
    } catch (error) {
        console.error('Debug seed action failed:', error);
    }

    return { itemsAdded, cardsLearned, mapReset };
}

/**
 * Walk every engine item registry and push one of each into the
 * player's inventory. Dev-only — surfaced via the Debug menu's
 * POPULATE button. Mirrors the `debugSeedAction` shape so the Debug
 * button can render a uniform toast.
 *
 * Each relic is worn while a position is free (`devGrantItem`).
 *
 * "Every item" means every entry in the engine's central item
 * registries: `relicLibrary` (the signet relics, the only equipment)
 * and `consumableLibrary`. Materials and quest-items aren't in central registries (materials are
 * authored per engine event payload; quest-items live per quest),
 * so they're out of scope.
 */
function populateAllItemsAction(store: AppStore): PopulateAllItemsResult {
    let equipment = 0;
    const unique = 0; // No unique items exist; the breakdown field stays 0.
    let consumable = 0;

    try {
        const state = store.getState();
        const addItem = state.addItem;

        // The only equipment is the signet relics.
        for (const relic of relicLibrary) {
            try {
                devGrantItem(store, relic);
                equipment++;
            } catch (error) {
                console.warn(`Failed to add relic ${relic.name}:`, error);
            }
        }

        for (const item of consumableLibrary) {
            try {
                // Spread to a fresh object so the engine's stack-merge path
                // can do its work without alias issues (same pattern as
                // `debugSeedAction`).
                addItem({ ...item });
                consumable++;
            } catch (error) {
                console.warn(`Failed to add consumable ${item.name}:`, error);
            }
        }
    } catch (error) {
        console.error('Populate all items action failed:', error);
    }

    const itemsAdded = equipment + unique + consumable;
    return { itemsAdded, breakdown: { equipment, unique, consumable } };
}

function grantAllRelicsAction(store: AppStore): GrantAllRelicsResult {
    const state = store.getState();
    const player = state.player;
    const owned = new Set<string>([
        ...player.inventory.map((i: Item) => i.id),
        ...player.equipment.relics.map((a) => a.id),
        ...(player.equipment.weapon ? [player.equipment.weapon.id] : []),
        ...(player.equipment.armor ? [player.equipment.armor.id] : []),
    ]);
    const added: string[] = [];
    // Wear each new relic while its slot has a free position; nothing worn is
    // displaced, so a relic past the last free position stays in the satchel.
    for (const relic of relicLibrary) {
        if (owned.has(relic.id)) continue;
        devGrantItem(store, relic);
        added.push(relic.id);
    }
    return { added, worn: store.getState().player.equipment.relics.map((a) => a.id) };
}

function applyCharacterPresetAction(
    store: AppStore,
    presetId: string,
): ApplyCharacterPresetResult {
    try {
        const preset = getPresetById(presetId);
        if (!preset) {
            return { applied: false, presetId: null, presetName: null };
        }
        const nextPlayer = buildCharacterFromPreset(preset) as Character;
        store.setState({ player: nextPlayer });
        return { applied: true, presetId: preset.id, presetName: preset.name };
    } catch (error) {
        console.error(`Failed to apply character preset ${presetId}:`, error);
        return { applied: false, presetId: null, presetName: null };
    }
}

// ---------------------------------------------------------------------------
// Event actions
// ---------------------------------------------------------------------------

/**
 * The pre-event player a host restores (hazard, rest, cache: the host's own
 * screen settles VITAE and the haul), with the quest rewards the resolve paid
 * on arrival kept: a reach that completed a quest still pays it.
 */
function withQuestRewards(before: GameState, after: GameState): GameState['player'] {
    return payCompletedQuests(before.player, before.quests, after.quests).player;
}

/**
 * Resolves the current node's event, then routes any relic a completed
 * quest paid on the way (a `reach` on arrival, a `collect` from a
 * gathering) to the item-reward screen.
 */
function resolveCurrentMapEventAction(store: AppStore, sourceNodeType?: string, staged?: MapEventPayload): boolean {
    const questsBefore = (store.getState() as unknown as GameState).quests;
    const resolved = resolveCurrentMapEventInner(store, sourceNodeType, staged);
    if (questsBefore) offerCompletedQuestItemsAction(store, questsBefore);
    return resolved;
}

function resolveCurrentMapEventInner(store: AppStore, sourceNodeType?: string, staged?: MapEventPayload): boolean {
    try {
        const state = store.getState();
        const gameState = state as unknown as GameState;
        const result: ResolveMapEventResult = resolveMapEvent(gameState, undefined, staged);

        // When a non-'none' event resolves, mark the current node consumed
        // in the engine's parallel data model (`consumedNodes`) for one-time
        // events only. Encounter, travel, labyrinth and quest events are never
        // consumed here (a quest node is spent when its step is accepted,
        // `acceptQuestStep`); every other kind is (one-time only). Kept alongside
        // `completedNodes` (populated by `moveToAction`'s
        // `worldCompleteNode` call).
        let resolvedState: GameState = result.state;
        // 'travel' must never consume: post-travel, `currentMap` is the
        // DESTINATION, so consuming here would mark the arrival map's
        // start node — mirroring the engine dispatcher's own travel
        // short-circuit. Doors stay repeatable.
        const shouldConsumeNode = result.event.kind !== 'none' &&
            !['encounter', 'travel', 'labyrinth', 'quest'].includes(result.event.kind);
        if (shouldConsumeNode) {
            const currentNodeId = resolvedState.world?.currentMap?.currentNode;
            if (currentNodeId) {
                resolvedState = {
                    ...resolvedState,
                    world: {
                        ...resolvedState.world,
                        currentMap: markNodeConsumed(resolvedState.world.currentMap, currentNodeId),
                    },
                };
            }
        }

        // Hazard events launch the hazard minigame. The engine's
        // resolveMapEvent already applied its flat damage to
        // `result.state`; restore the pre-event player so the minigame's
        // outcome is the only thing that touches VITAE, then start a
        // session. `<HazardGate>` routes to /hazard when the slice fills.
        if (result.event.kind === 'hazard') {
            store.setState({
                ...resolvedState,
                player: withQuestRewards(gameState, resolvedState),
                event: EMPTY_EVENT_SLICE,
            });
            beginHazardAction(store);
            return true;
        }

        // Gathering has NO interceptor: the engine's `resolveGathering`
        // appends the payload items to the inventory in `resolvedState`, and
        // gathering falls through to the paced-event tail below like
        // `interaction` / `village` / `cutscene`, where `composeGathering`
        // renders an acknowledgement card that names what was picked up and
        // waits for the player. A toast alone would not do: `<ToastHost>` is
        // declared BEFORE `<Stack>` in `app/_layout.tsx` with no `zIndex`,
        // so the navigator's opaque `<ScreenBg>` paints over it.
        //
        // Rest events launch the rest-choice node. The engine's resolveMapEvent already
        // applied the passive heal to `result.state`; restore the
        // pre-event player so the node's settled ledger is the only thing
        // that touches VITAE/currency. `<RestGate>` routes to /rest when
        // the slice fills.
        if (result.event.kind === 'rest') {
            store.setState({
                ...resolvedState,
                player: withQuestRewards(gameState, resolvedState),
                event: EMPTY_EVENT_SLICE,
            });
            beginRestAction(store, {
                // The authored inn/camp marker, not a heal number.
                shelter: result.event.shelter,
                // The authored one-liner, same passthrough
                // pattern as the other kinds (event.engine.ts::bodyFromPayload).
                description: result.event.description,
            });
            return true;
        }

        // Loot-cache events launch the two-offer choice screen. The engine already appended the payload
        // items + currency to `result.state`; restore the pre-event
        // player so the cache's claim is the only thing that touches the
        // inventory. `<CacheGate>` routes to /cache when the slice fills.
        //
        // Reward depth: the `item` offer rolls a real engine-truth
        // loot/relic table scaled to the player's level. Every cache rolls
        // the `modest` tier (only the dev rewards menu rolls `rich`). Currency from the event payload is preserved for the `item`
        // offer.
        if (result.event.kind === 'loot-cache') {
            store.setState({
                ...resolvedState,
                player: withQuestRewards(gameState, resolvedState),
                event: EMPTY_EVENT_SLICE,
            });
            beginLootCacheChoiceAction(store, {
                tier: 'modest',
                currency: result.event.currency,
                description: result.event.description,
            });
            return true;
        }

        // Blacksmith events launch "The Anvil" (die-gear upgrades) instead
        // of dropping a paced /event card. The engine
        // handler touches no state (it only validates the offered variant
        // gear), so there is nothing to restore — but we still clear the
        // event slice and seed the session from the player's live rail +
        // wallet. `<BlacksmithGate>` routes to /blacksmith when the slice
        // fills. The authored payload `budget` is a PLACEHOLDER hint; the
        // slice maps the spendable unit to the player's real currency, so
        // it is intentionally not forwarded here.
        if (result.event.kind === 'blacksmith') {
            store.setState({
                ...resolvedState,
                event: EMPTY_EVENT_SLICE,
            });
            beginBlacksmithAction(store, {
                variants: result.event.variants,
            });
            return true;
        }

        // The Labyrinth door: the engine names the act
        // and leaves the world alone; the swap is `enterLabyrinthAction`'s.
        // Settle the resolved overworld first (the door's way on is open and
        // the node is NOT consumed), so the snapshot the entry takes is the
        // one the exit restores: the player comes back out on the door.
        // `<LabyrinthGate>` routes to `/labyrinth` once the session opens.
        if (result.event.kind === 'labyrinth') {
            store.setState({
                ...resolvedState,
                event: EMPTY_EVENT_SLICE,
            });
            if (result.event.description) pushToast(store, result.event.description);
            enterLabyrinthAndArriveAction(store, result.event.act);
            return true;
        }

        // Travel events are already fully applied engine-side: the world
        // on `result.state` has crossed maps (and continents when the door
        // spans one). No screen detour and no pending card — clear the
        // event slice so the exploration canvas re-renders the arrival
        // map, and narrate the crossing as a toast.
        if (result.event.kind === 'travel') {
            store.setState({
                ...resolvedState,
                event: EMPTY_EVENT_SLICE,
            });
            const region = getMapLayout(result.event.destinationMap)?.region
                ?? result.event.destinationMap;
            pushToast(store, `You cross into ${region}.`);
            // Crossing a map is a checkpoint, same as a combat or rest
            // outcome — saves are explicit on mobile, and a
            // crossing lost to an app close would strand the run on the
            // wrong map.
            try { store.getState().save(); } catch { /* persistence must not block the road */ }
            return true;
        }

        // A quest node has no card: it routes to its own screen (QL1c
        // replaces this branch with that route). Until then the player stays
        // on the map with no pending event, and the node stays unspent (the
        // engine does not consume it and the exclusion above keeps it so).
        if (result.event.kind === 'quest') {
            store.setState({
                ...resolvedState,
                event: EMPTY_EVENT_SLICE,
            });
            return true;
        }

        // Spread the advanced state onto the store. `event` is mobile-only
        // and survives because `result.state` does not include it.
        // If the resolved event is an interaction, seed the dialogue cursor at
        // the tree's root so `selectEventViewModel` composes against the right
        // node. The engine supplies the authored tree (its map definition owns
        // the NPCs); when it carries none, the card shows its default copy.
        let dialogueCursor: { tree: DialogueTree; nodeId: string } | null = null;
        if ((result.event.kind === 'interaction' || result.event.kind === 'narration') && result.event.dialogue) {
            const tree = result.event.dialogue;
            dialogueCursor = { tree, nodeId: tree.rootId };
        }

        const nextEvent = {
            ...(state.event ?? EMPTY_EVENT_SLICE),
            pending: result,
            dialogueCursor,
            history: [],
            sourceNodeType: sourceNodeType ?? null,
        };
        store.setState({ ...resolvedState, event: nextEvent });

        // A gathering grant is already folded into `resolvedState` by the
        // engine resolver, and unlike every other paced kind it is a
        // PERMANENT change to the inventory rather than a choice the player is
        // still weighing — the acknowledgement card cannot refuse it.
        // Checkpoint it here, on the same argument the crossing save above
        // makes: saves are explicit on mobile, `moveToAction`'s
        // checkpoint is taken BEFORE the arrival resolves, and a close on the
        // acknowledgement card would otherwise cost the player what they had
        // just picked up.
        if (result.event.kind === 'gathering') {
            try { store.getState().save(); } catch { /* persistence must not block the road */ }
        }

        return result.event.kind !== 'none';
    } catch (error) {
        console.error('Failed to resolve current map event:', error);
        return false;
    }
}

function clearEventSlice(store: AppStore): void {
    store.setState({ event: EMPTY_EVENT_SLICE });
}

/**
 * Walking away from a non-boss encounter. Boss encounters are sealed (the
 * retreat is never offered), so this is only ever called for a foe you were
 * allowed to leave. Retreat is free and only narrates, as a prose toast in the
 * lowercase ritual register.
 */
function announceFlee(store: AppStore): void {
    const prev = store.getState().notifications;
    store.setState({
        notifications: {
            levelUpAcknowledged: prev?.levelUpAcknowledged ?? true,
            questAcknowledged: prev?.questAcknowledged ?? true,
            toast: {
                text: 'you fled the encounter. the path bends away.',
                id: (prev?.toast?.id ?? 0) + 1,
            },
        },
    });
}

/**
 * Withdraw from an encounter the player has already stepped into — the
 * combat reveal's WITHDRAW. By then `beginHazardEncounter` has already cleared the event slice,
 * so unlike `pickEventChoice('flee')` this narrates the retreat without needing a
 * pending event; the slice is cleared defensively for any path that still has
 * one, and the node is settled. The modal teardown is the caller's (the overlay's) concern.
 */
function fleeEncounterAction(store: AppStore): void {
    try {
        announceFlee(store);
    } catch (error) {
        console.error('Failed to process flee action:', error);
    }
    clearEventSlice(store);
    settleArrivalAction(store);
}

/**
 * Settle the fight's node when the player walks away from it. A fight that
 * runs to an end settles through the engine's `END_COMBAT`; a flee does not,
 * so both flee paths settle here. The node is spent and its way on opens.
 */
function settleArrivalAction(store: AppStore): void {
    const settled = settleArrival(store.getState() as unknown as GameState);
    store.setState({ world: settled.world });
}

function pickEventChoiceAction(store: AppStore, choiceId: string): void {
    try {
        const state = store.getState();
        const slice = state.event;
        if (!slice || slice.pending === null) return;

        const processed = slice.pending.event;

        // combat-prelude path
        if (processed.kind === 'encounter') {
            if (choiceId === 'fight') {
                try {
                    // The engine's `Encounter` carries `enemies: Enemy[]`;
                    // the prelude consumes the first enemy.
                    const enemy = processed.encounter.enemies[0];
                    ensureStarterCards(store);
                    store.getState().startCombat(enemy);
                    clearEventSlice(store);
                } catch (error) {
                    console.error('Failed to start combat from encounter:', error);
                    clearEventSlice(store);
                }
                return;
            }
            if (choiceId === 'flee') {
                try {
                    if (!processed.isBoss) announceFlee(store);
                    clearEventSlice(store);
                } catch (error) {
                    console.error('Failed to process flee action:', error);
                    clearEventSlice(store);
                }
                settleArrivalAction(store);
                return;
            }
            // Unknown choice id on combat-prelude — defensive no-op.
            return;
        }

        // npc dialogue path (cursor-driven)
        if (slice.dialogueCursor !== null) {
            try {
                const { tree, nodeId } = slice.dialogueCursor;
                const node = getDialogueNode(tree, nodeId);
                // DialogueChoice has no `.id`: the presenter derives
                // `choiceId` from the choice's index in `node.choices`;
                // lookup mirrors that index. If the
                // id isn't a valid index, treat as unknown choice
                // (defensive no-op preserved).
                const idx = Number(choiceId);
                const choices = node.choices ?? [];
                const choice: DialogueChoice | undefined =
                    Number.isInteger(idx) && idx >= 0 && idx < choices.length
                        ? choices[idx]
                        : undefined;
                if (!choice) {
                    // Unknown choice on dialogue node — defensive no-op.
                    return;
                }

                // applyDialogue advances engine state. Mobile-side: walk the cursor.
                const questsBefore = (store.getState() as unknown as GameState).quests;
                store.getState().applyDialogue(tree, choice);
                // A choice that completed a quest: its relic goes to the reward screen.
                if (questsBefore) offerCompletedQuestItemsAction(store, questsBefore);
                const nextState = store.getState() as unknown as GameState;
                const result = applyDialogueChoice(nextState, tree, choice);

                const nextHistory = [
                    ...(slice.history as ReadonlyArray<{ nodeId: string; choiceId: string }>),
                    { nodeId, choiceId },
                ];

                if (result.nextNode !== null) {
                    store.setState({
                        event: {
                            ...slice,
                            dialogueCursor: {
                                tree,
                                nodeId: result.nextNode.id ?? nodeId,
                            },
                            history: nextHistory,
                        },
                    });
                } else {
                    // Dialogue tree exhausted — clear the event.
                    clearEventSlice(store);
                }
            } catch (error) {
                console.error('Failed to process dialogue choice:', error);
                clearEventSlice(store);
            }
            return;
        }

        // narrative-choice auto-resolve path (rest / gathering / loot-cache /
        // interaction-without-dialogue / village / cutscene / hazard). Engine
        // already advanced state via resolveMapEvent; just clear the event slice.
        clearEventSlice(store);
    } catch (error) {
        console.error('Failed to pick event choice:', error);
        clearEventSlice(store);
    }
}

function dismissEventAction(store: AppStore): void {
    clearEventSlice(store);
}

/**
 * Buys a ware off the pending village event's shop. The
 * engine reducer owns affordability and item cloning; a no-op result
 * (can't afford, unknown ware) returns false so the screen can leave
 * the row enabled-but-inert rather than crash.
 */
function buyVillageWareAction(store: AppStore, itemId: string): boolean {
    try {
        const state = store.getState();
        const pending = state.event?.pending;
        if (!pending || pending.event.kind !== 'village') return false;
        const ware = pending.event.shop?.wares.find(w => w.itemId === itemId);
        if (!ware) return false;
        const item = resolveWareItem(ware);
        if (!item) return false;
        const player = (state as unknown as GameState).player;
        const next = engineBuyItem(player, item, ware.price);
        if (next === player) return false;
        store.setState({ player: next } as never);
        return true;
    } catch (error) {
        console.error('Failed to buy village ware:', error);
        return false;
    }
}

/**
 * Sells an inventory item back to the pending village event's shop.
 * Quest items are never sellable — mirrors the `dropItem`
 * defend-in-depth guard (`canDiscard` on the inventory VM keeps the
 * screen from ever offering the action, but the action layer checks
 * again for direct dispatch). Price matches the CLI's `shopLoop` sell
 * path: `defaultSellPrice` against the shop's ware list when the item
 * matches a listed ware, else a flat fallback of `1`.
 */
function sellVillageItemAction(store: AppStore, index: number): boolean {
    try {
        const state = store.getState();
        const pending = state.event?.pending;
        if (!pending || pending.event.kind !== 'village') return false;
        const player = (state as unknown as GameState).player;
        const item = player.inventory[index];
        if (!item) return false;
        if (item.category === 'quest-item') return false;
        const wares = pending.event.shop?.wares ?? [];
        const matching = wares.find(w => w.itemId === item.id);
        const price = matching ? engineDefaultSellPrice(matching) : 1;
        const next = engineSellItem(player, item.id, price);
        if (next === player) return false;
        store.setState({ player: next } as never);
        return true;
    } catch (error) {
        console.error('Failed to sell village item:', error);
        return false;
    }
}

