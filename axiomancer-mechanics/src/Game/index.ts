/**
 * Game module barrel — store, persistence, reducers, constants.
 */

export {
    createGameStore,
    selectPlayer, selectIsInCombat,
    selectVersion,
} from './store';
export type { GameStore, StoreApi } from './store';

export { createNewGameState, GAME_STATE_VERSION } from './game.reducer';
export { resolveDeath, clearDying } from './death';
export type { DeathCause, DeathResult } from './death';
export type { NewGameOptions } from './game.reducer';
export type { GameState, CodexEntry } from './types';

export { migrate, dropUnknownCardIds, dropRetiredFlags } from './game.migrate';

export { claimHazardPuzzleOutcome, HAZARD_SCAR_FLAG_PREFIX } from './hazard-puzzle.claim';
export type { HazardPuzzleClaim } from './hazard-puzzle.claim';

export {
    LEGACY_SLOT_MAP, reslotLegacyEquipment, reslotLegacyLoadout,
    reslotRelicPiece, reslotRelicSave,
} from './legacy-slots';
export type { LegacySlot } from './legacy-slots';

export {
    createEventEmitter,
} from './events';
export type {
    GameEvent, GameEventEmitter, GameEventHandler,
} from './events';

export {
    MAX_EFFECT_INTENSITY,
    STAT_POINTS_PER_LEVEL,
    ELITE_RELIC_DROP_CHANCE,
} from './game-mechanics.constants';

export type { PersistenceAdapter } from './persistence/types';
export { nullAdapter } from './persistence/null.adapter';

// State fixtures (2026-09-07) — declarative test states for CLI / Jest / web.
export type { StateFixture } from './fixtures';
export {
    buildStateFromFixture,
    validateStateFixture,
    getStateFixtureById, listStateFixtureIds,
    // R7e / R7e2 — the neutral witnesses for dialogue, shops, quests and gear.
    FIXTURE_NPC, FIXTURE_SHOP, FIXTURE_QUEST,
    FIXTURE_DIALOGUE_EVENT, FIXTURE_VILLAGE_EVENT, FIXTURE_CUTSCENE_EVENT, FIXTURE_QUEST_EVENT, FIXTURE_QUESTLINE,
    FIXTURE_WEAPON, FIXTURE_ARMOR, FIXTURE_TRINKETS, FIXTURE_ELITE_RELICS, FIXTURE_QUEST_RELIC,
    // Test-only: a map's quest nodes settled so a walker can cross it.
    settleQuestNodes, settleQuestNodesIn, questNodeIdsOn,
} from './fixtures';
