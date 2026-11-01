/**
 * MapEvents — type surface.
 *
 * Ten event kinds plus a weighted-pool authoring model. See
 * `src/World/MapEvents/resolve-map-event.ts` for the dispatcher.
 */

import type { ActiveEffect } from '../../Effects/types';
import type { GameState } from '../../Game/types';
import type { Item } from '../../Items/types';
import type { VillageCardShop, VillageEquipmentShop, VillageRestCounter } from '../Village/village.types';
import type { NPC } from '../../NPCs/types';
import type { EnemySlug } from '../../Enemy/enemy.library';
import type { EnemyDifficulty } from '../../Enemy/types';
import type { ContinentName, MapName } from '../map.library';
import type { Encounter, NodeId } from '../types';
import type { BlacksmithVariantOffer } from '../Blacksmith/blacksmith.types';
import type { LabyrinthActId } from '../Labyrinth/types';
import type { QuestlineId, QuestNodeStage, QuestStepView } from '../questline';

/**
 * The MapEvent kinds. 'travel' is an inter-map door; 'labyrinth' is the
 * Aporia's door, placed on no overworld map. A node with no event pool is the
 * empty waypoint: it is not a kind, it resolves to `{ kind: 'none' }`.
 */
export type MapEventKind =
    | 'encounter'
    | 'rest'
    | 'village'
    | 'cutscene'
    | 'hazard'
    | 'loot-cache'
    | 'travel'
    | 'labyrinth'
    | 'quest';

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
    /**
     * The tier this slot stages the foe at, when it is not the foe's own: an
     * elite slot holding a foe that is a normal elsewhere (`World/encounter-tier.ts`).
     */
    difficulty?: EnemyDifficulty;
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
    /** The one dream line the night shows on the way to dawn (ET1c); the screen shows none when absent. */
    dream?: string;
}

export interface VillagePayload {
    kind: 'village';
    villageName: string;
    /** Shopkeepers / merchants present in the scene. */
    merchants?: readonly NPC[];
    /**
     * The paid rest counter, when this village lets a bed: a rest node's
     * heal for shillings, once per visit (`World/Village`).
     */
    rest?: true;
    /**
     * The card shop counter, when this village has one: three cards from the
     * player's reward pool, the same three all run, and paid card removal
     * (`World/Village`).
     */
    cardShop?: true;
    /** The Anvil counter, when this village has a smith. */
    anvil?: VillageAnvil;
    description?: string;
}

export interface CutscenePayload {
    kind: 'cutscene';
    /** Ordered narration lines. */
    lines: readonly string[];
    description?: string;
    /**
     * What the scene does as it plays: `giveQuestStep` starts that step of a
     * questline (`giveQuestStep` in `questline.ts`), as a chapter's arrival
     * gives its first quest. Authored content, never saved.
     */
    effect?: CutsceneEffect;
}

/** A cutscene's effect on the state (see `CutscenePayload.effect`). */
export interface CutsceneEffect {
    giveQuestStep?: { questline: QuestlineId; step: number };
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

/**
 * The Anvil counter of a village ("The Anvil"). Hands the host the
 * variant-gear offers; the host launches a `World/Blacksmith` session from them
 * when the player opens the counter (the sandboxed launch contract the hazard
 * minigame uses). Resolving the village touches no state; it only validates the
 * offered gear against the die-gear caps.
 *
 * One village per Act 1 region carries it, near the region's exit. See
 * `MapEvents/content.ts`'s `ACT1_ANVIL_NODES`.
 */
export interface VillageAnvil {
    /** Variant gear pieces offered for swap this visit. */
    variants?: readonly BlacksmithVariantOffer[];
}
/**
 * Where a travel node leads: another map (entered at its start, or where the
 * player left it), or a node on the same map (a passage, whose far end is
 * normally the paired travel node that leads back).
 */
export type TravelDestination =
    | { map: MapName; continent: ContinentName }
    | { node: NodeId };

/**
 * Travel node — a "move to X?" choice. Resolving it OFFERS the trip and moves
 * no one (`resolveTravel`); taking it is the player's yes (`takeTravel`).
 *
 * A map destination crosses: the departed map's runtime `MapState` is
 * preserved under `WorldState.mapStates` and the map is marked in
 * `completedMaps` (the world is a place, not a checklist); the destination is
 * unlocked if locked, the continent switches when it differs, and the
 * destination becomes `currentMap` (restored if previously departed, fresh
 * otherwise). A node destination is a passage on the same map: the player
 * stands on the far node, which counts as visited, and nothing there fires.
 *
 * Never consumed: a travel node offers its trip on every entry. `opensAfter`
 * shuts it until that node of the same map is spent.
 */
export interface TravelPayload {
    kind: 'travel';
    destination: TravelDestination;
    /** The flavor text the trip is offered over. */
    prompt: string;
    /** The art slug the trip is offered over; the kind's default when absent. */
    art?: string;
    /** A node of the same map that must be spent before the way opens. */
    opensAfter?: NodeId;
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

/**
 * Quest node: the giver of one questline step. `node` (1-based) is its place
 * in the questline: it turns in the step before it (node 2 and on) and offers
 * the step of its own number. Never consumed until the step it offers is
 * accepted (QL1b); resolving one touches no state.
 */
export interface QuestGiver {
    /** Who gives the quest (authored `[content]`, never saved). */
    name: string;
    /** A portrait slug the app resolves to art (a stand-in until T picks). */
    portrait: string;
}

export interface QuestPayload {
    kind: 'quest';
    questline: QuestlineId;
    /** 1-based: the node's place in the questline. */
    node: number;
    description?: string;
    /**
     * The node's own refusal line, shown when the player reaches it too early
     * (stage `locked`: the step it turns in is not yet held). Authored
     * content, never saved.
     */
    lockedLine?: string;
    /** The person who speaks this node's lines. */
    giver?: QuestGiver;
}

/** Discriminated union of all authoring payloads. */
export type MapEventPayload =
    | EncounterPayload
    | RestPayload
    | VillagePayload
    | CutscenePayload
    | HazardPayload
    | LootCachePayload
    | TravelPayload
    | LabyrinthDoorPayload
    | QuestPayload;

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
    // The resolved rest event carries the SHELTER CLASS so hosts (and the
    // rest-choice engine) decide the heal from an honest marker rather than
    // a number. `healed` is a computed OUTCOME, not an authoring knob.
    | { kind: 'rest';        healed: number; shelter: RestShelter; description?: string; dream?: string }
    // The village's counters: `rest` and `cardShop` carry what the host shows
    // (the price, the seeded offer); `anvil` the smith's variants.
    | {
        kind: 'village';
        villageName: string;
        merchants: NPC[];
        rest?: VillageRestCounter;
        cardShop?: VillageCardShop;
        equipmentShop?: VillageEquipmentShop;
        anvil?: VillageAnvil;
        description?: string;
    }
    | { kind: 'cutscene';    lines: readonly string[] }
    | { kind: 'hazard';      effects: ActiveEffect[]; damage: number; description?: string }
    | { kind: 'loot-cache';  items: Item[]; currency: number; description?: string }
    // The OFFER: the state has not moved. `open` is false while the
    // payload's `opensAfter` node is unspent (the way is shut). Taking the
    // trip is `takeTravel`'s.
    | {
        kind: 'travel';
        nodeId: NodeId;
        destination: TravelDestination;
        prompt: string;
        art?: string;
        open: boolean;
        opensAfter?: NodeId;
    }
    // The state is unchanged; the host enters `act` through its own snapshot.
    | { kind: 'labyrinth';   act: LabyrinthActId; description?: string }
    // A quest node. `behind` is the step this node turns in (node 2-4) and
    // `ahead` the step it offers; both are Quests with progress and rewards.
    | {
        kind: 'quest';
        questline: QuestlineId;
        node: number;
        stage: QuestNodeStage;
        behind?: QuestStepView;
        ahead?: QuestStepView;
        description?: string;
        /** The node's refusal line, present only while the stage is `locked` and one is authored. */
        lockedLine?: string;
        giver?: QuestGiver;
    }
    | { kind: 'none' };

export interface ResolveMapEventResult {
    state: GameState;
    event: ResolvedEvent;
}

// ─── Re-export NodeId for downstream consumers ────────────────────────────────
export type { NodeId };
