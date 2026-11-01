/**
 * MapEvent handlers — one function per kind.
 *
 * Each handler is pure: `(state, payload, rng) → { state, event }`.
 * Handlers do NOT mark nodes consumed or reveal adjacents — that's the
 * dispatcher's job in `resolve-map-event.ts`. Handlers only compute the
 * state delta produced by the event itself (HP heal, item grant, effect
 * application, etc.).
 *
 * Design note: the brief proposed one file per kind in a `handlers/`
 * subdir; collapsed to one file because each handler body is short and
 * the imports overlap heavily. If a handler grows past ~50 LOC, split
 * it into its own file at that point.
 */

import type { GameState } from '../../Game/types';
import type { Character } from '../../Character/types';
import type { Item } from '../../Items/types';
import { deepClone } from '../../Utils';
import { addItemStacking } from '../../Items/item.reducer';
import { applyDamage } from '../../Combat/health';
import { applyEffect } from '../../Effects';
import { lookupEffect } from '../../Effects/effects.library';
import type { ActiveEffect } from '../../Effects/types';
import { generateEncounter, scaleEnemyToLevel } from '../encounter';
import { getMapDefinition, createMapState } from '../map.registry';
import { completeMap, changeContinent, unlockMap, changeMap, isNodeSpent } from '../world.reducer';
import type { MapState, WorldState } from '../types';
import type { ContinentName, MapName } from '../map.library';
import { resolveQuestNodeEvent, giveQuestStep } from '../questline';
import { ENEMY_REGISTRY, type EnemySlug } from '../../Enemy/enemy.library';
import { sourceAtTier } from '../encounter-tier';
import { validateDieGear, type DieGearColor } from '../../Character/dieGear.reducer';
import { REST_PASSIVE_HEAL_FRACTION, restShelterOf } from './rest-shelter';
import { villageCardShopFor, villageEquipmentShopFor, villageRestCounter } from '../Village/village.engine';
import type {
    EncounterPayload, RestPayload,
    VillagePayload, CutscenePayload, HazardPayload, LootCachePayload,
    TravelPayload, LabyrinthDoorPayload, QuestPayload,
    ResolveMapEventResult,
} from './types';

function withPlayer(state: GameState, next: Character): GameState {
    return { ...state, player: next };
}

// ─── encounter ────────────────────────────────────────────────────────────────

export function resolveEncounter(
    state: GameState,
    payload: EncounterPayload,
): ResolveMapEventResult {
    const map = state.world.currentMap;
    const def = getMapDefinition(map.continent, map.name);
    const node = def.nodes.find(n => n.id === map.currentNode)!;
    const isBoss = payload.isBoss === true;

    if (payload.enemySlug) {
        const source = ENEMY_REGISTRY[payload.enemySlug as EnemySlug];
        if (!source) {
            throw new Error(`MapEvents: unknown enemySlug '${payload.enemySlug}'.`);
        }
        // An authored `level` pins the difficulty absolutely; otherwise the
        // enemy scales up to the player (never below its own level).
        const targetLevel = payload.level ?? Math.max(source.level, state.player.level);
        const scaled = scaleEnemyToLevel(sourceAtTier(source, payload.difficulty), targetLevel);
        const encounter = { enemies: [scaled], origin: `${def.name}:${node.id}` };
        return { state, event: { kind: 'encounter', encounter, isBoss, description: payload.description } };
    }

    const encounter = generateEncounter(node, state.player.level, {
        mapName: def.name,
        difficulty: isBoss ? 'boss' : undefined,
    });
    return { state, event: { kind: 'encounter', encounter, isBoss, description: payload.description } };
}

// ─── rest ─────────────────────────────────────────────────────────────────────

export function resolveRest(
    state: GameState,
    payload: RestPayload,
): ResolveMapEventResult {
    // The passive heal runs at the pinned default; hosts that use
    // `World/RestChoice` replace it with that engine's flat heal. See
    // `rest-shelter.ts` for why the number is pinned.
    const shelter = restShelterOf(payload);
    const before = state.player.health;
    const newHp = Math.min(
        state.player.maxHealth,
        before + Math.round(state.player.maxHealth * REST_PASSIVE_HEAL_FRACTION),
    );
    const healed = newHp - before;
    const player: Character = { ...state.player, health: newHp };
    return {
        state: withPlayer(state, player),
        // `shelter` rides along so hosts that replace the passive heal with
        // their own rest flow keep the authored inn/camp signal.
        event: { kind: 'rest', healed, shelter, description: payload.description, dream: payload.dream },
    };
}

// ─── village ──────────────────────────────────────────────────────────────────

export function resolveVillage(
    state: GameState,
    payload: VillagePayload,
): ResolveMapEventResult {
    const merchants = (payload.merchants ?? []).map(m => ({ ...m }));
    for (const v of payload.anvil?.variants ?? []) {
        const reason = validateDieGear(v.gear, v.gear.dieColor as DieGearColor);
        if (reason) {
            throw new Error(`MapEvents: illegal anvil variant '${v.id}': ${reason}`);
        }
    }
    const shopNode = state.world?.currentMap?.currentNode || payload.villageName;
    // The equipment counter stands beside the card shop, and only while the
    // player lacks a lane piece to buy.
    const equipmentShop = payload.cardShop ? villageEquipmentShopFor(state, shopNode) : null;
    return {
        state,
        event: {
            kind: 'village',
            villageName: payload.villageName,
            merchants,
            ...(payload.rest ? { rest: villageRestCounter() } : {}),
            ...(payload.cardShop ? { cardShop: villageCardShopFor(state, shopNode) } : {}),
            ...(equipmentShop && equipmentShop.pieceIds.length > 0 ? { equipmentShop } : {}),
            anvil: payload.anvil,
            description: payload.description,
        },
    };
}

// ─── cutscene ─────────────────────────────────────────────────────────────────

/**
 * Plays a cutscene: its lines, and its effect when it authors one (a
 * `giveQuestStep` starts that questline step through the settle seam; a step
 * that cannot start leaves the state as it was).
 */
export function resolveCutscene(
    state: GameState,
    payload: CutscenePayload,
): ResolveMapEventResult {
    const give = payload.effect?.giveQuestStep;
    return {
        state: give ? giveQuestStep(state, give.questline, give.step) : state,
        event: { kind: 'cutscene', lines: payload.lines },
    };
}

// ─── hazard ───────────────────────────────────────────────────────────────────

export function resolveHazard(
    state: GameState,
    payload: HazardPayload,
    _rng: () => number,
): ResolveMapEventResult {
    const round = 0; // node-event hazards apply outside combat; round 0 is fine.
    const applied: ActiveEffect[] = [];
    let effects = state.player.effects;
    for (const id of payload.effectIds ?? []) {
        const def = lookupEffect(id);
        if (!def) continue;
        // Environmental hazards intentionally leave sourceId
        // undefined. Hazards aren't combatants; there's no stable id to
        // attribute. If a consumer ever needs to distinguish hazards from
        // other unsourced effects, file an iterate row to add a synthetic
        // id scheme (e.g. `hazard:<nodeId>`).
        const res = applyEffect(effects, def, round);
        effects = res.activeEffects;
        const a = effects.find(e => e.effectId === id);
        if (a) applied.push(a);
    }

    let player: Character = { ...state.player, effects };
    const damage = payload.damage ?? 0;
    if (damage > 0) {
        player = applyDamage(player, damage);
    }

    return {
        state: withPlayer(state, player),
        event: { kind: 'hazard', effects: applied, damage, description: payload.description },
    };
}

// ─── loot-cache ───────────────────────────────────────────────────────────────

export function resolveLootCache(
    state: GameState,
    payload: LootCachePayload,
): ResolveMapEventResult {
    const items = (payload.items ?? []).map(deepClone) as Item[];
    const currency = payload.currency ?? 0;
    const player: Character = {
        ...state.player,
        inventory: items.reduce(addItemStacking, state.player.inventory),
        currency: state.player.currency + currency,
    };
    return {
        state: withPlayer(state, player),
        event: { kind: 'loot-cache', items, currency, description: payload.description },
    };
}

// ─── travel ───────────────────────────────────────────────────────────────────

/**
 * A travel node OFFERS its trip: the state is returned untouched and the
 * event names the node, where it leads, its prompt and art, and whether the
 * way is open. It is shut while the payload's `opensAfter` node is unspent.
 * Taking the trip is the player's yes, `takeTravel` (`travel.ts`).
 */
export function resolveTravel(
    state: GameState,
    payload: TravelPayload,
): ResolveMapEventResult {
    const map = state.world.currentMap;
    return {
        state,
        event: {
            kind: 'travel',
            nodeId: map.currentNode,
            destination: payload.destination,
            prompt: payload.prompt,
            ...(payload.art !== undefined ? { art: payload.art } : {}),
            open: isTravelOpen(map, payload),
            ...(payload.opensAfter !== undefined ? { opensAfter: payload.opensAfter } : {}),
        },
    };
}

/** True when `payload`'s way is open on `map`: no `opensAfter`, or that node is spent. */
export function isTravelOpen(map: MapState, payload: TravelPayload): boolean {
    return payload.opensAfter === undefined || isNodeSpent(map, payload.opensAfter);
}

/**
 * Crosses the world to another map, the yes to a map destination.
 *
 * The departed map's runtime `MapState` is PRESERVED under
 * `WorldState.mapStates`: the world is a place you can move around in, and
 * `completedMaps` means "walked through", never "reset". Steps, in order:
 *
 *   1. Mark the departed map in its continent's `completedMaps`.
 *   2. Switch continent when the destination continent differs.
 *   3. Move the destination out of `lockedMaps` if it is still locked.
 *   4. Make the destination the current map — restoring its preserved
 *      state when the player has departed it before, fresh otherwise.
 *
 * Throws (via `getMapDefinition`) when the destination is not registered:
 * an authored door to an unshipped map is a programming error.
 */
export function crossToMap(world: WorldState, continent: ContinentName, mapName: MapName): WorldState {
    const destinationDef = getMapDefinition(continent, mapName);
    const departed = world.currentMap;

    let next: WorldState = completeMap(world, departed.name);
    next = changeContinent(next, continent);
    next = unlockMap(next, mapName);

    const preserved = { ...(next.mapStates ?? {}), [departed.name]: departed };
    const restored = preserved[mapName];
    // The restored copy becomes live again; drop its preserved duplicate so
    // `currentMap` is the single writable copy.
    if (restored) delete preserved[mapName];
    return {
        // A crossing is a placement on the far side: no previous node.
        ...changeMap(next, { ...(restored ?? createMapState(destinationDef)), arrivedFrom: null }),
        mapStates: preserved,
    };
}

// ─── labyrinth ────────────────────────────────────────────────────────────────

/**
 * The Labyrinth door. Pure signal: the state is
 * returned untouched, and the resolved event names the act to enter, which is
 * the durable progress's `currentAct` (act I when the player has never been
 * in). The host performs the swap and keeps the way back.
 */
export function resolveLabyrinthDoor(
    state: GameState,
    payload: LabyrinthDoorPayload,
): ResolveMapEventResult {
    return {
        state,
        event: {
            kind: 'labyrinth',
            act: state.labyrinth?.currentAct ?? 'act1',
            description: payload.description,
        },
    };
}

// ─── quest ────────────────────────────────────────────────────────────────────

/**
 * Resolves a quest node. The state is untouched: the node's stage is read off
 * the quest log (`questNodeStage`), never written. The dispatcher does not
 * consume a quest node; accepting its step does (`acceptQuestStep`).
 */
export function resolveQuest(
    state: GameState,
    payload: QuestPayload,
): ResolveMapEventResult {
    return { state, event: resolveQuestNodeEvent(state.quests, payload) };
}

// ─── dispatch table ───────────────────────────────────────────────────────────

import type { MapEventPayload } from './types';

export function applyPayload(
    state: GameState,
    payload: MapEventPayload,
    rng: () => number,
): ResolveMapEventResult {
    switch (payload.kind) {
        case 'encounter':   return resolveEncounter(state, payload);
        case 'rest':        return resolveRest(state, payload);
        case 'village':     return resolveVillage(state, payload);
        case 'cutscene':    return resolveCutscene(state, payload);
        case 'hazard':      return resolveHazard(state, payload, rng);
        case 'loot-cache':  return resolveLootCache(state, payload);
        case 'travel':      return resolveTravel(state, payload);
        case 'labyrinth':   return resolveLabyrinthDoor(state, payload);
        case 'quest':       return resolveQuest(state, payload);
    }
}
