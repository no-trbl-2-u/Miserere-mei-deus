/**
 * `resolveMapEvent` — the map-event dispatcher.
 *
 * Walks the contract:
 *   0. Answer the node's arrival: clear `pendingArrival` if it names this
 *      node. Resolving IS the answer, whatever the roll produces, so this
 *      happens before any handler runs.
 *   1. Look up the active node on the current map.
 *   2. If the node is already in `consumedNodes`, return
 *      `{ kind: 'none' }` immediately (one-shot enforcement). The one way
 *      back is a claimed rest, which un-consumes the act's settled elite
 *      nodes (`respawnElites`, `World/elite-respawn.ts`).
 *   3. Roll one entry from the node's event pool. Pool resolution
 *      prefers the node override (`setNodeEventPoolOverride`) over the
 *      map default (`setDefaultMapEventPool`). Missing pool → `{ kind: 'none' }`.
 *   4. Hand the rolled payload off to the matching handler from
 *      `handlers.ts`.
 *   5. Add the node to `consumedNodes` and reveal its adjacents.
 *   6. Return the handler's `{ state, event }` with the discovery /
 *      consumption updates folded in.
 *
 * An `encounter` is the exception to 0 and 5. Its arrival stays
 * owed and its node unconsumed, with the way on still shut, until the fight
 * settles: `settleArrival` below, which `END_COMBAT` runs for every outcome.
 * The fight itself is never saved (`currentEncounter` is transient), so a
 * save taken mid-fight must still say what the player owes, or a reload
 * lands past the fight.
 *
 * Pure when `rng` is deterministic.
 */

import type { GameState } from '../../Game/types';
import { revealAdjacent, markNodeConsumed, unlockAdjacent } from '../world.reducer';
import { getRng } from '../../Utils/rng';
import { applyPayload } from './handlers';
import { reachableObjectives, collectObjectives, progressQuest, payCompletedQuests, advanceHazardObjectives } from '../quest.engine';
import type { QuestLog, NodeId } from '../types';
import type {
    MapEventPayload, MapEventPool, MapEventPoolEntry, MapEventKind, ResolveMapEventResult, ResolvedEvent,
} from './types';

/**
 * Advances any active `reach`-type quest objectives that target `nodeId`.
 * Pure — re-entering a node whose reach objective already
 * completed is a silent no-op via `reachableObjectives`' `currentCount <
 * requiredCount` filter.
 */
function advanceReachObjectives(quests: QuestLog, nodeId: NodeId): QuestLog {
    const reaches = reachableObjectives(quests, nodeId);
    let log = quests;
    for (const r of reaches) {
        log = progressQuest(log, r.questName, r.objectiveId).log;
    }
    return log;
}

/**
 * Moves `state` onto the quest log `quests` and pays every quest the move
 * completed (`payCompletedQuests`, the one reward door). Same reference back
 * when the log did not change.
 */
function withQuestLog(state: GameState, quests: QuestLog): GameState {
    if (quests === state.quests) return state;
    const pay = payCompletedQuests(state.player, state.quests, quests);
    return { ...state, player: pay.player, quests };
}

/**
 * Advances any active `collect`-type quest objectives whose target matches
 * one of `itemIds`. Mirrors `advanceReachObjectives` for the gathering path —
 * called after a `gathering` payload resolves, with the granted items' ids.
 */
function advanceCollectObjectives(quests: QuestLog, itemIds: string[]): QuestLog {
    let log = quests;
    for (const itemId of itemIds) {
        for (const c of collectObjectives(log, itemId)) {
            log = progressQuest(log, c.questName, c.objectiveId).log;
        }
    }
    return log;
}

/**
 * Map-level extension surface. Pools attach via a side registry rather
 * than living on `MapDefinition` itself.
 */
const poolRegistry = new Map<string, MapEventPool>();
const defaultPoolByMap = new Map<string, string>();
const nodePoolOverrides = new Map<string, string>();
// Count how many times each node-override key has been set so the
// content-parity guard can detect a node that was authored then silently
// clobbered (last-write-wins shadowing). The live override `Map` collapses
// duplicates; this preserves the registration history.
const nodePoolOverrideWrites = new Map<string, number>();

function poolKey(continent: string, mapName: string, nodeId?: string): string {
    return nodeId ? `${continent}:${mapName}:${nodeId}` : `${continent}:${mapName}`;
}

export function registerMapEventPool(pool: MapEventPool): void {
    poolRegistry.set(pool.id, pool);
}

/**
 * Read-only: every registered pool, in registration order. For audits that
 * sweep authored content (e.g. "is every relic sold somewhere?") without
 * reaching into the module-private registry.
 */
export function listRegisteredMapEventPools(): readonly MapEventPool[] {
    return [...poolRegistry.values()];
}

export function setDefaultMapEventPool(
    continent: string,
    mapName: string,
    poolId: string,
): void {
    defaultPoolByMap.set(poolKey(continent, mapName), poolId);
}

export function setNodeEventPoolOverride(
    continent: string,
    mapName: string,
    nodeId: string,
    poolId: string,
): void {
    const key = poolKey(continent, mapName, nodeId);
    nodePoolOverrides.set(key, poolId);
    nodePoolOverrideWrites.set(key, (nodePoolOverrideWrites.get(key) ?? 0) + 1);
}

/**
 * Read-only (content-parity guard): the `continent:map:node` keys
 * whose node-override was registered more than once on module load — i.e. an
 * authored pool that was silently clobbered by a later registration
 * (last-write-wins shadowing). An empty array means there is exactly one source
 * of truth per node and no two content blocks are silently diverging. Returned
 * sorted for deterministic assertions.
 */
export function getShadowedNodeOverrideKeys(): string[] {
    const shadowed: string[] = [];
    for (const [key, writes] of nodePoolOverrideWrites) {
        if (writes > 1) shadowed.push(key);
    }
    return shadowed.sort();
}

/** Test-only: clear every pool registration. Used by hermetic tests. */
export function _clearMapEventPoolRegistry(): void {
    poolRegistry.clear();
    defaultPoolByMap.clear();
    nodePoolOverrides.clear();
    nodePoolOverrideWrites.clear();
}

function lookupPool(
    continent: string,
    mapName: string,
    nodeId: string,
): MapEventPool | undefined {
    const overrideId = nodePoolOverrides.get(poolKey(continent, mapName, nodeId));
    const poolId = overrideId ?? defaultPoolByMap.get(poolKey(continent, mapName));
    return poolId ? poolRegistry.get(poolId) : undefined;
}

/**
 * Read-only: the event pool registered for a node (override → map default),
 * without rolling RNG or mutating state. Lets UI clients inspect what a node
 * *can* resolve to (e.g. to choose a map icon) instead of re-deriving node
 * semantics from a parallel client-side table.
 */
export function getNodeEventPool(
    continent: string,
    mapName: string,
    nodeId: string,
): MapEventPool | undefined {
    return lookupPool(continent, mapName, nodeId);
}

/**
 * Read-only: the distinct event kinds a node can resolve to, in pool order.
 * Empty when no pool is registered for the node.
 */
export function getNodeEventKinds(
    continent: string,
    mapName: string,
    nodeId: string,
): MapEventKind[] {
    const pool = lookupPool(continent, mapName, nodeId);
    if (!pool) return [];
    const seen = new Set<MapEventKind>();
    const kinds: MapEventKind[] = [];
    for (const entry of pool.entries) {
        if (!seen.has(entry.kind)) {
            seen.add(entry.kind);
            kinds.push(entry.kind);
        }
    }
    return kinds;
}

/**
 * Read-only: the node's primary (highest-weight) event kind — the single
 * representative kind a client should use for a node icon/tag. `undefined`
 * when no pool is registered or the pool is empty. Ties resolve to the
 * earlier-declared entry (stable with authoring order).
 */
export function getNodePrimaryEventKind(
    continent: string,
    mapName: string,
    nodeId: string,
): MapEventKind | undefined {
    const pool = lookupPool(continent, mapName, nodeId);
    if (!pool || pool.entries.length === 0) return undefined;
    let best = pool.entries[0];
    for (const entry of pool.entries) {
        if (entry.weight > best.weight) best = entry;
    }
    return best.kind;
}

function rollPool(
    pool: MapEventPool,
    rng: () => number,
): MapEventPoolEntry | undefined {
    if (pool.entries.length === 0) return undefined;
    const total = pool.entries.reduce((s, e) => s + e.weight, 0);
    if (total <= 0) return undefined;
    let roll = rng() * total;
    for (const entry of pool.entries) {
        roll -= entry.weight;
        if (roll <= 0) return entry;
    }
    return pool.entries[pool.entries.length - 1];
}

/**
 * Clears `pendingArrival` when it names `nodeId` — the arrival at that node
 * has just been answered.
 * Identity-stable when nothing was owed, so a no-op resolve stays a no-op.
 */
function answerArrival(state: GameState, nodeId: NodeId): GameState {
    const map = state.world.currentMap;
    if ((map.pendingArrival ?? null) !== nodeId) return state;
    return {
        ...state,
        world: { ...state.world, currentMap: { ...map, pendingArrival: null } },
    };
}

/**
 * Settles the arrival at the node under the player: clears the debt, reveals
 * and unlocks the adjacents, and marks the node consumed. This is the second
 * half of resolving an `encounter`, run once the fight is over, whatever its
 * outcome. Identity-stable when nothing is owed at the current
 * node, so calling it after a fight that never came from the map (a dev
 * pick, a test) changes nothing.
 */
export function settleArrival(state: GameState): GameState {
    const map = state.world.currentMap;
    const nodeId = map.currentNode;
    if ((map.pendingArrival ?? null) !== nodeId) return state;
    const opened = unlockAdjacent(revealAdjacent(map, nodeId), nodeId);
    const settled = markNodeConsumed({ ...opened, pendingArrival: null }, nodeId);
    return { ...state, world: { ...state.world, currentMap: settled } };
}

/**
 * Resolves the MapEvent for the player's current node. See file header.
 *
 * `staged` resolves that payload in place of the node's pool. It exists for
 * the state fixtures (`StateFixture.stagedEvent`): Act 1 stages no NPC
 * or shop, so a fixture stages one on an Act 1 node without registering it
 * in the live world.
 */
export function resolveMapEvent(
    state: GameState,
    rng: () => number = () => getRng().random(),
    staged?: MapEventPayload,
): ResolveMapEventResult {
    const map = state.world.currentMap;
    const nodeId = map.currentNode;

    // 0. This call IS the answer to the node's arrival, whatever the roll
    //    turns up — so the debt the move recorded is paid here, before any
    //    handler runs. Before the handler matters for `travel`: it swaps
    //    `currentMap` for the destination and files the departed map under
    //    `world.mapStates`, so a clear applied afterwards would scribble on
    //    the wrong map and leave the door owed forever on the one the player
    //    left.
    const answered = answerArrival(state, nodeId);

    // 1. Already consumed? Idempotent no-op.
    if (answered.world.currentMap.consumedNodes.includes(nodeId)) {
        const none: ResolvedEvent = { kind: 'none' };
        return { state: answered, event: none };
    }

    // Restore the pre-Phase-25 reach-objective auto-advance — any active
    // `reach: target=nodeId` quest objective ticks on arrival, before the
    // pool roll. Pure no-op for non-reach quests or fully-completed reaches.
    // A reach that completes a quest pays its reward here.
    const questsAfterReach = advanceReachObjectives(answered.quests, nodeId);
    const stateAfterReach: GameState = withQuestLog(answered, questsAfterReach);

    // The two early branches below (no pool, no entry) rebuild the map from
    // `answeredMap`, never from the pre-answer `map` — rebuilding from `map`
    // would restore the arrival the resolve just paid. The handler branches
    // rebuild from their own output instead, which descends from `answered`
    // and so carries the cleared debt the same way.
    const answeredMap = answered.world.currentMap;

    // 2. Find the active pool (a staged payload stands in for it).
    const pool: MapEventPool | undefined = staged
        ? { id: `${nodeId}.staged`, entries: [{ kind: staged.kind, weight: 1, payload: staged }] }
        : lookupPool(answeredMap.continent, answeredMap.name, nodeId);
    if (!pool) {
        // No pool registered — reveal + unlock adjacents + consume to advance
        // discovery and traversal, but produce no event.
        const next = unlockAdjacent(revealAdjacent(answeredMap, nodeId), nodeId);
        const consumed = markNodeConsumed(next, nodeId);
        return {
            state: { ...stateAfterReach, world: { ...stateAfterReach.world, currentMap: consumed } },
            event: { kind: 'none' },
        };
    }

    // 3. Roll an entry.
    const entry = rollPool(pool, rng);
    if (!entry) {
        const next = unlockAdjacent(revealAdjacent(answeredMap, nodeId), nodeId);
        const consumed = markNodeConsumed(next, nodeId);
        return {
            state: { ...stateAfterReach, world: { ...stateAfterReach.world, currentMap: consumed } },
            event: { kind: 'none' },
        };
    }

    // 4. Apply the matching handler.
    // An encounter leaves the arrival owed (see the file header): roll it
    // against the unanswered state, and return before step 5. Only the
    // reveal runs, so the map can draw what lies past the fight.
    if (entry.payload.kind === 'encounter') {
        const reachedOwed: GameState = withQuestLog(state, questsAfterReach);
        const fight = applyPayload(reachedOwed, entry.payload, rng);
        const revealed = revealAdjacent(fight.state.world.currentMap, nodeId);
        return {
            state: { ...fight.state, world: { ...fight.state.world, currentMap: revealed } },
            event: fight.event,
        };
    }

    const result = applyPayload(stateAfterReach, entry.payload, rng);

    // 4a. Advance any active `collect`-type quest objectives the granted
    // items satisfy. Mirrors the reach-objective auto-advance above, but
    // fires on the resolved event's items rather than the arrived-at node.
    // A collect that completes a quest pays its reward here.
    // 4a-hazard. A resolved hazard node counts toward an active `hazard`
    // objective on this map, whatever the hazard did to the player.
    const stateAfterCollect: GameState = result.event.kind === 'gathering'
        ? withQuestLog(
            result.state,
            advanceCollectObjectives(result.state.quests, result.event.items.map(i => i.id)),
        )
        : result.event.kind === 'hazard'
            ? withQuestLog(
                result.state,
                advanceHazardObjectives(result.state.quests, result.state.world.currentMap.name).log,
            )
            : result.state;

    // 4a-travel. A resolved travel event has already crossed —
    // `result.state.world.currentMap` IS the destination map. Return here:
    // the reveal/unlock/consume step below operates on the current map and
    // would scribble the departed node's id onto the destination's books.
    // Deliberately NOT consumed — a door is repeatable (one-way per door):
    // re-resolving the departed node, should the player ever stand on it
    // again, travels again.
    if (result.event.kind === 'travel') {
        return { state: result.state, event: result.event };
    }

    // 5. Reveal + unlock adjacents + mark consumed. Unlock is what moves the
    // adjacents out of `lockedNodes` into `availableNodes` so the CLI
    // `mapTab` filter actually offers them as valid moves. The reveal path
    // only updates `discoveredNodes`.
    const next = unlockAdjacent(
        revealAdjacent(stateAfterCollect.world.currentMap, nodeId),
        nodeId,
    );
    // The Labyrinth door opens the way on like any node but is
    // never consumed: it stays a door, and the next arrival enters again. A
    // quest node is the same until its step is accepted (QL1b); QL1a never
    // accepts, so it never consumes.
    const consumed = (result.event.kind === 'labyrinth' || result.event.kind === 'quest')
        ? next
        : markNodeConsumed(next, nodeId);
    const nextState: GameState = {
        ...stateAfterCollect,
        world: { ...stateAfterCollect.world, currentMap: consumed },
    };

    return { state: nextState, event: result.event };
}
