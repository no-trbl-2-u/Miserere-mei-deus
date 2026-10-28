import { Item } from '../Items/types';
import { Enemy } from '../Enemy/types';
import { Image } from '../Utils/types';
import { ContinentName, MapName } from './map.library';
import { QuestName } from './quest.library';
import { NPC } from '../NPCs/types';
import type { QuestlineId } from './questline';

/**
 * A reward grantable on event/combat completion. Either a tag (`'experience'`,
 * `'currency'`, `'card'`, `'quest'`) or a concrete `Item`.
 */
export type Reward =
    | 'experience'
    | 'currency'
    | 'card'
    | 'quest'
    | Item
    | { kind: 'currency'; amount: number }
    | { kind: 'experience'; amount: number }
    | { kind: 'card'; cardId: string }
    | { kind: 'item'; item: Item }
    /**
     * A pick of `count` cards from the lane pool, the offer a won fight makes
     * (`rollCombatCardRewards`). Paying it adds no card: the offers ride the
     * `PaidQuestReward.cardOffers` for the host to put on the spoils tiles.
     */
    | { kind: 'card-pick'; count: number };

/**
 * A combat encounter. Wraps the list of enemies that take
 * part in the fight plus any encounter-level rewards beyond the per-enemy
 * `xpReward` / `loot` tables.
 *
 * @property enemies  - Enemies in the encounter (length 1 today).
 * @property rewards  - Optional bonus rewards layered on top of per-enemy drops.
 * @property origin   - Optional source label (`<mapName>:<nodeId>`).
 */
export interface Encounter {
    enemies: Enemy[];
    rewards?: Reward[];
    origin?: string;
}

// ─── Quests ───────────────────────────────────────────────────────────────────

/**
 * What an objective tracks. The engine tracks
 * per-objective progress rather than treating a quest as binary.
 *
 * - `kill`    — defeat N enemies of `target` slug.
 * - `collect` — gather N items with `target` item id.
 * - `reach`   — arrive at the node `target` (counts as 1).
 * - `talk`    — talk to the NPC named `target` (counts as 1).
 * - `flag`    — generic world-flag advanced explicitly by the dialogue or CLI.
 * - `hazard`  — resolve N hazard nodes on the quest's map, whatever the outcome.
 */
export type QuestObjectiveType = 'kill' | 'collect' | 'reach' | 'talk' | 'flag' | 'hazard';

/**
 * Which foes a `kill` objective with no `target` counts: every won fight
 * (`'any'`), only an elite (`'elite'`, `isEliteEnemy`) or only a boss
 * (`difficulty: 'boss'`).
 */
export type KillFoeClass = 'any' | 'elite' | 'boss';

/** Per-objective state attached to a Quest. */
export interface QuestObjective {
    id: string;
    type: QuestObjectiveType;
    description: string;
    /** Enemy slug / item id / node id / npc name / flag key. */
    target?: string;
    /** A `kill` objective with no `target`: the class of foe it counts. */
    foeClass?: KillFoeClass;
    requiredCount: number;
    currentCount: number;
}

/** Lifecycle of a quest in the player's log. */
export type QuestStatus = 'available' | 'active' | 'completed' | 'failed';

/**
 * A quest with per-objective progress tracking.
 *
 * @property mapName     - The map where the quest takes place.
 * @property objectives  - Sub-goals — quest completes when all are at `currentCount === requiredCount`.
 * @property reward      - Granted on completion.
 * @property nextQuest   - Next quest in a chain, if any.
 * @property questline    - The questline this quest is a step of, if any.
 * @property step         - Its step number within that questline.
 * @property rewards      - Further rewards, paid in order after `reward`. A
 *                          quest with only `reward` pays as it always has.
 * @property holdForTurnIn - When every objective fills the quest stays active
 *                          ("ready"): neither completed nor paid until
 *                          `turnInQuestStep` (QL1b).
 */
export interface Quest {
    name: QuestName;
    description: string;
    mapName: MapName;
    objectives: QuestObjective[];
    reward: Reward;
    nextQuest?: QuestName;
    questline?: QuestlineId;
    step?: number;
    rewards?: Reward[];
    holdForTurnIn?: boolean;
    status: QuestStatus;
}

/** Player's persistent quest log. */
export interface QuestLog {
    available: Quest[];
    active: Quest[];
    completed: QuestName[];
}

/** An event that can only occur once per save. */
export interface UniqueEvent {
    id: string;
    /** Free-form tag; the engine doesn't dispatch on this any more. */
    type: string;
    description: string;
    nodeLocation: [number, number];
    completed: boolean;
}

/** Node IDs are formatted as `<map-acronym>-<number>`, e.g. `"bw-1"`. */
export type NodeId = string;

/** A traversable location on a map. */
export interface MapNode {
    id: NodeId;
    location: [number, number];
    connectedNodes: NodeId[];
}

// ─── Map split: static MapDefinition vs runtime MapState ──────────────────────

/**
 * Static, frozen template for a map. Lives in the map registry; never mutated.
 *
 * @property nodes        - Every traversable node (including the starting one).
 * @property npcs         - NPCs that can be referenced by node events.
 * @property uniqueEvents - Event templates that fire at most once per save.
 * @property quests       - Quests this map can hand out.
 *
 * Node events are not authored on the definition: they come from weighted
 * pools registered via `registerMapEventPool` /
 * `setDefaultMapEventPool` / `setNodeEventPoolOverride`; see
 * `src/World/MapEvents/content.ts` for the authored content.
 */
export interface MapDefinition {
    readonly name: MapName;
    readonly continent: ContinentName;
    readonly description: string;
    readonly startingNode: MapNode;
    readonly nodes: readonly MapNode[];
    readonly npcs?: readonly NPC[];
    readonly enemies?: readonly Enemy[];
    readonly uniqueEvents?: readonly UniqueEvent[];
    readonly quests?: readonly Quest[];
    readonly images?: { mapImage: Image; combatImage: Image };
    /**
     * Traversal doctrine.
     *
     * `'gauntlet'` (default when absent) is FRONTIER ROAMING: a node the
     * player has resolved is SPENT and cannot be re-entered, and every
     * UNVISITED node joined by an unblocked edge to ANY visited node is a
     * legal destination — not merely the ones adjacent to where the player
     * stands. The explored edge of the map is open all at once, so a lane
     * skipped earlier stays walkable and the region boss becomes
     * unavoidable only when the frontier runs out. It is still a gauntlet
     * in the sense that matters: nothing resolved is ever re-farmed.
     * `lockedNodes` is bookkeeping the reducer keeps in step; it is
     * not consulted for legality.
     *
     * `'labyrinth'` is the Aporia mode: free travel along
     * the CURRENT node's edges INCLUDING back into completed or consumed
     * rooms. One-shot events (`consumedNodes`) apply in both modes.
     */
    readonly traversal?: 'gauntlet' | 'labyrinth';
    /**
     * Routes blocked at map creation (secret doors, act gates). Seeded
     * into `MapState.blockedRoutes` by `createMapState`; opened at runtime
     * via `unblockMapRoute`.
     */
    readonly initialBlockedRoutes?: readonly BlockedRoute[];
    /**
     * NPCs on this map's `npcs` roster that are deliberately NOT
     * homed to any node yet. A written reason (not a boolean) so the
     * narrative-reachability guard (`auditNarrativeReachability`) can tell a
     * deliberate omission from a lost NPC — an NPC with a `dialogueTree`
     * that is neither reachable from a node nor listed here fails the
     * registry-wide invariant test.
     */
    readonly unstagedNpcs?: ReadonlyArray<{ readonly name: string; readonly reason: string }>;
}

// ─── Hazard Persistence ────────────────────────────────────────────────────

/**
 * Hazard modifier effect applied to future encounters at tagged nodes.
 * Used by H08 (supply threshold -2), H12 (stability auto-success ≤6), etc.
 */
export interface HazardModifierEntry {
    hazardType: 'supply' | 'stability' | 'escape' | 'force';
    thresholdAdjustment: number; // negative = easier, positive = harder
    description: string;
}

/**
 * Persistent outcome of a completed hazard encounter at a specific node.
 * Enables world-state modifications that affect future hazard encounters.
 */
export interface HazardNodeOutcome {
    nodeId: NodeId;
    hazardId: string;
    outcome: 'cleared' | 'blocked' | 'modified';
    appliedDate: string; // ISO timestamp
    modifierEffects?: HazardModifierEntry[];
}

/**
 * Blocked route between two connected nodes due to hazard outcome.
 * Used by H12 "Riddled Bridge" final round failure to block bridge passage.
 */
export interface BlockedRoute {
    from: NodeId;
    to: NodeId;
    reason: string;
}

/**
 * Runtime, per-save state for a map.
 *
 * @property currentNode    - Player's current position on this map (per-map).
 * @property completedNodes - Nodes the player has fully resolved (locked from back-travel).
 * @property availableNodes - Nodes currently traversable from the player's progress.
 * @property lockedNodes    - Nodes not yet unlocked.
 * @property uniqueEvents   - Mutable runtime copy of the definition's unique events.
 * @property discoveredNodes - Nodes the player has revealed via the
 *                             fog-of-war discovery mechanic. Seeded with the
 *                             map's `startingNode` by `createMapState`.
 * @property consumedNodes   - Nodes whose MapEvent has been resolved.
 *                             One-shot: a consumed node returns `{ kind: 'none' }`
 *                             from `resolveMapEvent`.
 * @property pendingArrival  - The node the player ARRIVED at and has not yet
 *                             answered. Written by the arrival verb
 *                             (`moveToNode`), cleared by `resolveMapEvent`
 *                             the moment the arrival is answered and by the
 *                             placement verbs (`placeOnNode`,
 *                             `teleportToNode`), which stand the player on a
 *                             node without arriving at it. It rides the save,
 *                             so a reload taken between the move's checkpoint
 *                             and its event can re-offer the arrival instead
 *                             of walking past it. Absent/`null` = nothing
 *                             owed; saves written before this field default
 *                             to that.
 * @property arrivedFrom    - The node the player stood on when they arrived at
 *                             `currentNode`. Written with the arrival
 *                             (`arriveAtNode`), cleared by the placement
 *                             verbs and by a `travel` crossing. A first
 *                             death returns the player here. Absent/`null` =
 *                             no previous node (saves written before this
 *                             field default to that).
 * @property retiredEliteNodes - Elite nodes whose relic dropped: a claimed
 *                             rest never brings them back
 *                             (`retireEliteNode`, `respawnElites`). Absent =
 *                             none retired; saves written before this field
 *                             default to that, with no migration.
 * @property eliteUpgradeTakenNodes - Elite nodes whose reward upgrade the
 *                             player already took; a later win over that elite
 *                             offers cards only (`markEliteUpgradeTaken`).
 *                             Absent = none taken, the same way.
 * @property hazardOutcomes  - Persistent hazard effects applied to this map.
 *                             Tracks modifier effects and cleared/blocked/modified states.
 * @property blockedRoutes    - Routes blocked by hazard outcomes (e.g., collapsed bridge).
 *                             Checked by moveToNode validation for path availability.
 */
export interface MapState {
    name: MapName;
    continent: ContinentName;
    currentNode: NodeId;
    completedNodes: NodeId[];
    availableNodes: NodeId[];
    lockedNodes: NodeId[];
    uniqueEvents: UniqueEvent[];
    discoveredNodes: NodeId[];
    consumedNodes: NodeId[];
    pendingArrival?: NodeId | null;
    arrivedFrom?: NodeId | null;
    retiredEliteNodes?: NodeId[];
    eliteUpgradeTakenNodes?: NodeId[];
    hazardOutcomes: HazardNodeOutcome[];
    blockedRoutes: BlockedRoute[];
}

/** A region containing several maps. */
export interface Continent {
    name: ContinentName;
    description: string;
    availableMaps: MapName[];
    lockedMaps: MapName[];
    completedMaps: MapName[];
}

/**
 * Aggregate world state — the catalogue of continents plus the current
 * navigation context.
 *
 * @property mapStates - Preserved runtime `MapState` of every map the player
 *   departed through a `travel` door. The world is a PLACE the
 *   player moves around in: leaving a map never resets it, and a door that
 *   later leads back restores the preserved state instead of a fresh one.
 *   Optional so pre-travel saves and hand-built test worlds stay valid; an
 *   absent record reads as "nothing departed yet".
 */
export interface WorldState {
    world: Continent[];
    currentContinent: Continent;
    currentMap: MapState;
    mapStates?: Partial<Record<MapName, MapState>>;
}
