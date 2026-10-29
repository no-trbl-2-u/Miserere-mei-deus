/**
 * `resolveMapEvent` — the map-event dispatcher.
 *
 * Walks the contract:
 *   0. Answer the node's arrival: clear `pendingArrival` if it names this
 *      node. Resolving IS the answer, whatever the roll produces, so this
 *      happens before any handler runs.
 *   1. Look up the active node on the current map.
 *   2. If the node is spent, return `{ kind: 'none' }` immediately
 *      (one-shot enforcement): consumed, or on a gauntlet completed with no
 *      arrival owed (a walk back, phase WR1b). The exceptions act on every
 *      entry (`actsOnRevisit`): a village, a door, a quest node with
 *      business. The one way back for the rest is a claimed rest, which
 *      un-consumes the act's settled elite nodes (`respawnElites`,
 *      `World/elite-respawn.ts`).
 *   3. Roll one entry from the node's event pool. Pool resolution
 *      prefers the node override (`setNodeEventPoolOverride`) over the
 *      map default (`setDefaultMapEventPool`). Missing pool → `{ kind: 'none' }`.
 *   4. Hand the rolled payload off to the matching handler from
 *      `handlers.ts`.
 *   4b. A hazard whose flat `damage` takes VITAE to 0 is a death: the state
 *      returned is `resolveDeath(…, 'hazard')`'s, and steps 5-6 do not run.
 *   5. Add the node to `consumedNodes` and reveal its adjacents.
 *   6. Return the handler's `{ state, event }` with the discovery /
 *      consumption updates folded in.
 *
 * An `encounter` is the exception to 0 and 5. Its arrival stays
 * owed and its node unconsumed, with the way on still shut, until the fight
 * settles: `settleArrival` below, which `END_COMBAT` runs on a victory or a
 * friendship. A flee or a defeat only answers the arrival
 * (`answerUnsettledArrival`): the node stays unspent, to be tried again.
 * The fight itself is never saved (`currentEncounter` is transient), so a
 * save taken mid-fight must still say what the player owes, or a reload
 * lands past the fight.
 *
 * Pure when `rng` is deterministic.
 */

import type { GameState } from '../../Game/types';
import {
    revealAdjacent, markNodeConsumed, unlockAdjacent, isHoldingRoads, syncMoveLists, isNodeSpent,
} from '../world.reducer';
import { getMapDefinition } from '../map.registry';
import { getRng } from '../../Utils/rng';
import { applyPayload } from './handlers';
import { resolveDeath } from '../../Game/death';
import { reachableObjectives, progressQuest, advanceHazardObjectives } from '../quest.engine';
import { settleQuestLog, questNodeStage, getQuestline, questlineStep, questStepState } from '../questline';
import type { QuestLog, NodeId } from '../types';
import type {
    MapEventPayload, MapEventPool, MapEventPoolEntry, MapEventKind, ResolveMapEventResult, ResolvedEvent,
    QuestPayload,
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
 * Moves `state` onto the quest log `quests` through the settle seam
 * (`settleQuestLog`): pays every quest the move completed and opens the roads
 * of a questline step it made ready. Same reference back when the log did not
 * change.
 */
function withQuestLog(state: GameState, quests: QuestLog, rng: () => number): GameState {
    return settleQuestLog(state, quests, rng).state;
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

// ─── Revisits (phase WR1b) ────────────────────────────────────────────────────

/** True on a labyrinth map; false on a gauntlet or a map the registry does not hold. */
function onLabyrinth(map: GameState['world']['currentMap']): boolean {
    try {
        return getMapDefinition(map.continent, map.name).traversal === 'labyrinth';
    } catch {
        return false;
    }
}

/**
 * The kinds whose event acts on every entry, spent or not: the village opens
 * again, a door offers its trip again. A quest node is the fourth, but only
 * while it has business (`questNodeHasBusiness`).
 */
const ACTS_ON_EVERY_ENTRY: ReadonlySet<MapEventKind> = new Set<MapEventKind>(['village', 'travel', 'labyrinth']);

/**
 * True when quest node `payload` has something to do right now: a step to
 * turn in, or a step to offer that is not yet accepted. A marker whose step
 * is accepted and not met has nothing (its turn-in is at the next marker).
 */
function questNodeHasBusiness(quests: QuestLog, payload: QuestPayload): boolean {
    const stage = questNodeStage(quests, payload.questline, payload.node);
    if (stage === 'turn-in') return true;
    if (stage !== 'offer') return false;
    const questline = getQuestline(payload.questline);
    const ahead = questline ? questlineStep(questline, payload.node) : undefined;
    return ahead !== undefined && questStepState(quests, ahead) === 'unaccepted';
}

/**
 * True when walking onto `nodeId` of the current map fires its event even
 * though the node is spent (phase WR1b): a village, a travel or labyrinth
 * door, or a quest node with business (a turn-in or an offer). Every other
 * kind is used once: a spent fight, hazard, rest, cache or cutscene fires
 * nothing again. Reads the authored pool, never RNG.
 */
export function actsOnRevisit(state: Pick<GameState, 'world' | 'quests'>, nodeId: NodeId): boolean {
    const map = state.world.currentMap;
    const pool = lookupPool(map.continent, map.name, nodeId);
    const kind = getNodePrimaryEventKind(map.continent, map.name, nodeId);
    if (!pool || !kind) return false;
    if (ACTS_ON_EVERY_ENTRY.has(kind)) return true;
    if (kind !== 'quest') return false;
    const entry = pool.entries.find(e => e.payload.kind === 'quest');
    return entry !== undefined && entry.payload.kind === 'quest' && questNodeHasBusiness(state.quests, entry.payload);
}

/**
 * True when stepping onto `nodeId` of the current gauntlet map is a QUIET
 * WALK BACK (phase WR1b): the node is spent and does not act on a revisit,
 * so the move fires nothing, owes nothing and opens no screen. False on a
 * labyrinth, whose rooms keep their own rule.
 */
export function isQuietWalkBack(state: Pick<GameState, 'world' | 'quests'>, nodeId: NodeId): boolean {
    const map = state.world.currentMap;
    if (onLabyrinth(map)) return false;
    return isNodeSpent(map, nodeId) && !actsOnRevisit(state, nodeId);
}

/**
 * The spent check (step 1 of `resolveMapEvent`), read on the state BEFORE the
 * arrival is answered. A consumed node resolves nothing, as ever. On a
 * gauntlet a node that acts on every entry resolves again, and a node that is
 * completed but not consumed is spent too unless its arrival is owed: a host
 * that completes a node on the move (mobile does) and then resolves it is
 * answering a first arrival, which owes; a walk back onto it owes nothing
 * (`arriveAtNode`).
 */
function resolvesNothing(state: GameState, nodeId: NodeId): boolean {
    const map = state.world.currentMap;
    const consumed = map.consumedNodes.includes(nodeId);
    if (onLabyrinth(map)) return consumed;
    if ((consumed || map.completedNodes.includes(nodeId)) && actsOnRevisit(state, nodeId)) return false;
    if (consumed) return true;
    const owed = (map.pendingArrival ?? null) === nodeId;
    return map.completedNodes.includes(nodeId) && !owed;
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
 * half of resolving an `encounter`, run once the fight is won (a victory or a
 * friendship). Identity-stable when nothing is owed at the current
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
 * Answers the arrival at the node under the player WITHOUT settling it: the
 * end of a fight that was fled or lost. The debt is cleared (so a host does
 * not re-fire the fight), but the node is neither consumed nor completed, so
 * it stays unspent: a later arrival there is a fresh try, and the player may
 * retry it in place (`moveToNode` onto the node they stand on). Nothing is
 * unlocked from it beyond what the road rule already allows: a node the map
 * holds (`holdRoadsUntilSettled`) opens no road, an unlisted one lets the
 * player walk on past it as before. Identity-stable when nothing is owed.
 */
export function answerUnsettledArrival(state: GameState): GameState {
    const map = state.world.currentMap;
    if ((map.pendingArrival ?? null) !== map.currentNode) return state;
    const answered = syncMoveLists({ ...map, pendingArrival: null });
    return { ...state, world: { ...state.world, currentMap: answered } };
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
    //    handler runs.
    const answered = answerArrival(state, nodeId);

    // 1. Spent? Idempotent no-op: a consumed node, and on a gauntlet a
    //    completed one the player walked back onto (it owed nothing), resolve
    //    nothing; the kinds that act on every entry resolve again.
    if (resolvesNothing(state, nodeId)) {
        const none: ResolvedEvent = { kind: 'none' };
        return { state: answered, event: none };
    }

    // Restore the pre-Phase-25 reach-objective auto-advance — any active
    // `reach: target=nodeId` quest objective ticks on arrival, before the
    // pool roll. Pure no-op for non-reach quests or fully-completed reaches.
    // A reach that completes a quest pays its reward here.
    const questsAfterReach = advanceReachObjectives(answered.quests, nodeId);
    const stateAfterReach: GameState = withQuestLog(answered, questsAfterReach, rng);

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
        const reachedOwed: GameState = withQuestLog(state, questsAfterReach, rng);
        const fight = applyPayload(reachedOwed, entry.payload, rng);
        const revealed = revealAdjacent(fight.state.world.currentMap, nodeId);
        return {
            state: { ...fight.state, world: { ...fight.state.world, currentMap: revealed } },
            event: fight.event,
        };
    }

    const result = applyPayload(stateAfterReach, entry.payload, rng);

    // 4b. A hazard that takes VITAE to 0 is a death, not a player standing
    // at 0. The death rule decides what comes back (a revive on the node
    // walked from, or a run over).
    if (result.event.kind === 'hazard' && result.state.player.health <= 0) {
        return { state: resolveDeath(result.state, 'hazard').state, event: result.event };
    }

    // 4a. A resolved hazard node counts toward an active `hazard` objective
    // on this map, whatever the hazard did to the player.
    const stateAfterCollect: GameState = result.event.kind === 'hazard'
        ? withQuestLog(
            result.state,
            advanceHazardObjectives(result.state.quests, result.state.world.currentMap.name).log,
            rng,
        )
        : result.state;

    // 5. Reveal + unlock adjacents + mark consumed. Unlock is what moves the
    // adjacents out of `lockedNodes` into `availableNodes` so the CLI
    // `mapTab` filter actually offers them as valid moves. The reveal path
    // only updates `discoveredNodes`.
    // A door (travel or the Labyrinth's) opens the way on like any node but
    // is never consumed: it stays a door, and the next entry offers its trip
    // again. A quest node is never consumed here either: accepting its step
    // spends it (`acceptQuestStep`), so until then the player may step off
    // and return.
    const unspent = result.event.kind === 'labyrinth' || result.event.kind === 'quest' || result.event.kind === 'travel';
    const revealed = revealAdjacent(stateAfterCollect.world.currentMap, nodeId);
    // A node the map holds (`holdRoadsUntilSettled`) that stays unspent opens
    // no onward road: only the move-list sync runs, and the road rule keeps it shut.
    const next = unspent && isHoldingRoads(revealed, nodeId)
        ? syncMoveLists(revealed)
        : unlockAdjacent(revealed, nodeId);
    const consumed = unspent ? next : markNodeConsumed(next, nodeId);
    const nextState: GameState = {
        ...stateAfterCollect,
        world: { ...stateAfterCollect.world, currentMap: consumed },
    };

    return { state: nextState, event: result.event };
}
