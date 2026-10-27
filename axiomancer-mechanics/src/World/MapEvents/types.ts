/**
 * MapEvents — type surface.
 *
 * Twelve event kinds plus a weighted-pool authoring model. See
 * `src/World/MapEvents/resolve-map-event.ts` for the dispatcher.
 */

import type { ActiveEffect } from '../../Effects/types';
import type { GameState } from '../../Game/types';
import type { Item } from '../../Items/types';
import type { ShopInventory } from '../../Items/shop.types';
import type { NPC, DialogueTree } from '../../NPCs/types';
import type { EnemySlug } from '../../Enemy/enemy.library';
import type { ContinentName, MapName } from '../map.library';
import type { Encounter, NodeId } from '../types';
import type { BlacksmithVariantOffer } from '../Blacksmith/blacksmith.types';
import type { LabyrinthActId } from '../Labyrinth/types';

/**
 * The MapEvent kinds. 'narration' is a dialogue-backed monologue shell;
 * 'travel' is an inter-map door; 'labyrinth' is the Aporia's door.
 */
export type MapEventKind =
    | 'encounter'
    | 'interaction'
    | 'gathering'
    | 'rest'
    | 'village'
    | 'cutscene'
    | 'hazard'
    | 'loot-cache'
    | 'narration'
    | 'blacksmith'
    | 'travel'
    | 'labyrinth';

// ─── Per-kind authoring payloads ──────────────────────────────────────────────

export interface EncounterPayload {
    kind: 'encounter';
    /** Specific enemy slug; if omitted, the encounter generator picks. */
    enemySlug?: EnemySlug;
    /** Boss flag — affects scaling and downstream UI framing. */
    isBoss?: boolean;
    /**
     * Absolute level to scale the enemy to, overriding the default
     * `max(enemy.level, player.level)` scaling. Lets an authored encounter
     * pin a fixed difficulty — e.g. a starting-region boss that must stay
     * beatable by a fresh player even though the shared enemy is endgame-tier.
     */
    level?: number;
    /**
     * An elite fight's own relic drop list: the relic ids a won fight here can
     * drop (`rollEliteRelicDrop`). Several elites may list the same relic.
     * Absent = the whole elite-only pool (`eliteRelicPool`). Authored content,
     * never saved; ignored on a non-elite fight.
     */
    eliteRelicDrops?: string[];
    description?: string;
}

export interface InteractionPayload {
    kind: 'interaction';
    /** NPC name on the current map. */
    npcName: string;
    description?: string;
}

export interface GatheringPayload {
    kind: 'gathering';
    /** Items the player gathers. Cloned at resolution time. */
    items: readonly Item[];
    description?: string;
}

/**
 * Shelter class of a rest node.
 *
 * `'inn'` is a PAID, tended shelter; the rest screen words its night as
 * a bed.
 * `'camp'` is anything in the wild: a spring, a mossy log, a corner of
 * the labyrinth the house forgot to make uncomfortable.
 *
 * "Is this an inn?" is authored, never inferred.
 */
export type RestShelter = 'camp' | 'inn';

export interface RestPayload {
    kind: 'rest';
    /**
     * Shelter class. Defaults to `'camp'` — a node that forgot to say is
     * wilderness. Never infer this from a heal magnitude; see
     * `rest-shelter.ts`.
     */
    shelter?: RestShelter;
    description?: string;
}

export interface VillagePayload {
    kind: 'village';
    villageName: string;
    /** Shopkeepers / merchants present in the scene. */
    merchants?: readonly NPC[];
    /**
     * Transactional shop attached to this village. Authoring
     * is optional — a village can carry merchants for dialogue without
     * a shop, or a shop without named merchants.
     */
    shop?: ShopInventory;
    description?: string;
}

export interface CutscenePayload {
    kind: 'cutscene';
    /** Ordered narration lines. */
    lines: readonly string[];
    description?: string;
}

export interface HazardPayload {
    kind: 'hazard';
    /** Effect IDs (from `src/Effects/`) applied to the player on arrival. */
    effectIds?: readonly string[];
    /** Flat damage applied to the player on arrival. */
    damage?: number;
    description?: string;
}

export interface LootCachePayload {
    kind: 'loot-cache';
    items?: readonly Item[];
    currency?: number;
    description?: string;
}

export interface NarrationPayload {
    kind: 'narration';
    /**
     * Dialogue tree the narration plays through (`src/NPCs/types.ts`). A
     * narration is authored as a monologue — leaf `DialogueNode`s with no
     * `choices` — so it reuses the existing dialogue runtime without
     * branching. Unlike `interaction`, the tree is authored inline on the
     * node rather than looked up from a map NPC.
     */
    dialogue: DialogueTree;
    description?: string;
}

/**
 * Blacksmith node ("The Anvil"). Hands the host an
 * authored budget + variant-gear offers; the host launches a
 * `World/Blacksmith` session from them (the sandboxed launch contract the
 * hazard minigame uses). The handler touches no state — it only
 * validates the offered gear against the die-gear caps.
 *
 * The anvil is its own placed `blacksmith` node: one per Act 1 region, near
 * its exit. See `MapEvents/content.ts`'s `ACT1_ANVIL_NODES`.
 */
export interface BlacksmithPayload {
    kind: 'blacksmith';
    /** Spendable budget for this visit (PLACEHOLDER unit; host maps ◆/souls). */
    budget?: number;
    /** Variant gear pieces offered for swap this visit. */
    variants?: readonly BlacksmithVariantOffer[];
    description?: string;
}

/**
 * Travel node — an inter-map DOOR. Resolving it walks the
 * player out of the current map: the departed map's runtime `MapState` is
 * preserved under `WorldState.mapStates` and the map is marked in
 * `completedMaps` (the world is a place, not a checklist — completing a
 * map means "walked through", never "reset"); the destination map is
 * unlocked if locked, the continent switches when it differs, and the
 * destination becomes `currentMap` (restored if previously departed,
 * fresh otherwise). One-way per door, repeatable: the dispatcher never
 * consumes a travel node, so re-resolving it travels again.
 */
export interface TravelPayload {
    kind: 'travel';
    destinationContinent: ContinentName;
    destinationMap: MapName;
    description?: string;
}

/**
 * Labyrinth door: arriving enters THE APORIA. The engine
 * only names the act: the durable progress's `currentAct`, so a first visit
 * opens act I and a return opens the act the player left. The world swap,
 * its overworld snapshot and the way back belong to the host (mobile
 * `enterLabyrinthAction`). Never consumed, so the door can be used again, like
 * `travel`.
 */
export interface LabyrinthDoorPayload {
    kind: 'labyrinth';
    description?: string;
}

/** Discriminated union of all authoring payloads. */
export type MapEventPayload =
    | EncounterPayload
    | InteractionPayload
    | GatheringPayload
    | RestPayload
    | VillagePayload
    | CutscenePayload
    | HazardPayload
    | LootCachePayload
    | NarrationPayload
    | BlacksmithPayload
    | TravelPayload
    | LabyrinthDoorPayload;

// ─── Pools ────────────────────────────────────────────────────────────────────

export interface MapEventPoolEntry {
    /** Must match `payload.kind`. */
    kind: MapEventKind;
    /** Weight for weighted-random draw; must be positive. */
    weight: number;
    payload: MapEventPayload;
}

export interface MapEventPool {
    id: string;
    entries: readonly MapEventPoolEntry[];
}

// ─── Resolved events (the engine's output) ────────────────────────────────────

// Every kind below except 'cutscene' (already delivers its
// authored prose via `lines`) and 'none' (nothing to say) carries the
// optional `description` threaded straight from its `MapEventPayload`.
// Presenters prefer it over their kind-keyed placeholder text; see
// `axiomancer-mobile/state/presenters/event.engine.ts::bodyFromPayload`.
export type ResolvedEvent =
    | { kind: 'encounter';   encounter: Encounter; isBoss: boolean; description?: string }
    | { kind: 'interaction'; npcName: string; dialogue?: DialogueTree; description?: string }
    | { kind: 'gathering';   items: Item[]; description?: string }
    // The resolved rest event carries the SHELTER CLASS so hosts (and the
    // rest-choice engine) decide the heal from an honest marker rather than
    // a number. `healed` is a computed OUTCOME, not an authoring knob.
    | { kind: 'rest';        healed: number; shelter: RestShelter; description?: string }
    | { kind: 'village';     villageName: string; merchants: NPC[]; shop?: ShopInventory; description?: string }
    | { kind: 'cutscene';    lines: readonly string[] }
    | { kind: 'hazard';      effects: ActiveEffect[]; damage: number; description?: string }
    | { kind: 'loot-cache';  items: Item[]; currency: number; description?: string }
    | { kind: 'narration';   dialogue: DialogueTree; description?: string }
    | { kind: 'blacksmith';  budget: number; variants: readonly BlacksmithVariantOffer[]; description?: string }
    // The world state on the result has already crossed; the resolved event
    // names where the door led so hosts can narrate the departure.
    | { kind: 'travel';      destinationContinent: ContinentName; destinationMap: MapName; description?: string }
    // The state is unchanged; the host enters `act` through its own snapshot.
    | { kind: 'labyrinth';   act: LabyrinthActId; description?: string }
    | { kind: 'none' };

export interface ResolveMapEventResult {
    state: GameState;
    event: ResolvedEvent;
}

// ─── Re-export NodeId for downstream consumers ────────────────────────────────
export type { NodeId };
