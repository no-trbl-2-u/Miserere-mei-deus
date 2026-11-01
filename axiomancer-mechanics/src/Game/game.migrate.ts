/**
 * Save-state validation.
 *
 * Save files are tagged with `version`. Only a save at the current version
 * loads. Every save made before v41 (the live Breakwater became T's Chapter 1
 * map, phase BW1b) is rejected: its world names nodes the map no longer has,
 * and T ruled every old save deleted. The persistence layer reads a rejected
 * slot as `unreadable`, which the slot screen offers only for deletion, and
 * NEW GAME starts on the windmill (`bw-w1`). There is no hop chain: the
 * earlier hops (v11 .. v40) went with the saves they served.
 *
 * Three load-time cleanups run on every load after `migrate`, at any version:
 * `dropUnknownCardIds`, `dropRetiredFlags` and `dropCutNodes`.
 */

import { GameState } from './types';
import type { MapState, NodeId } from '../World/types';
import type { MapName } from '../World/map.library';
import { getCardById } from '../Cards/cards.library';
import { STARTING_CARD_IDS } from '../Combat/combat.rewards';
import { GAME_STATE_VERSION } from './game.reducer';

/**
 * Narrow a raw save payload to the current `GameState`. Only the current
 * version is accepted; any other version throws, and the caller offers the
 * slot only for deletion. The name and signature are kept so the
 * persistence layer's call site is unchanged.
 *
 * @param raw         - The deserialised JSON object pulled from persistence.
 * @param fromVersion - The `version` field of the saved payload.
 * @param toVersion   - The target schema version (defaults to current).
 * @throws If the payload is not an object, is not the current version, or is
 *   missing required `GameState` fields.
 */
export function migrate(
    raw: unknown,
    fromVersion: number,
    toVersion: number = GAME_STATE_VERSION,
): GameState {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`migrate: invalid save payload (got ${typeof raw}).`);
    }
    if (fromVersion !== toVersion) {
        throw new Error(
            `migrate: save version ${fromVersion} is not supported (runtime is ${toVersion}); ` +
            'saves made before the new Breakwater are not migrated — delete it and start a new game.',
        );
    }
    return assertGameState(raw);
}

/**
 * Drop the player card ids the library no longer holds, on every load.
 *
 * A save can outlive the cards it names: the grey-card purge left old ids in
 * `knownCards` and `combatRewardCards`, and a trial set taken out of the
 * library would do the same. Dealing an unknown id throws in
 * `executeCard`. This is not a version hop: a save at the current version can
 * hold them too, so the load paths call it after `migrate`. A save whose
 * `knownCards` named cards and kept none falls back to the starting cards.
 * Returns `state` itself when nothing changes.
 */
export function dropUnknownCardIds(state: GameState): GameState {
    const player = state.player;
    if (!player || typeof player !== 'object') return state;
    const known = (id: string): boolean => getCardById(id) !== undefined;
    const knownCards = player.knownCards ?? [];
    const rewards = player.combatRewardCards;
    const keptKnown = knownCards.filter(known);
    const keptRewards = rewards?.filter(known);
    if (keptKnown.length === knownCards.length && keptRewards?.length === rewards?.length) {
        return state;
    }
    const nextKnown = keptKnown.length === 0 && knownCards.length > 0 ? [...STARTING_CARD_IDS] : keptKnown;
    return {
        ...state,
        player: {
            ...player,
            knownCards: nextKnown,
            ...(keptRewards !== undefined ? { combatRewardCards: keptRewards } : {}),
        },
    };
}

/** `GameState.flags` entries that no code reads; `dropRetiredFlags` removes them. */
const RETIRED_FLAGS: ReadonlySet<string> = new Set([
    'combat-tutorial-done',
    'hazard-tutorial-done',
    'blacksmith-tutorial-done',
    'night-watch-tutorial-done',
]);

/**
 * Drop the `RETIRED_FLAGS` entries from `state.flags`, on every load.
 *
 * Like `dropUnknownCardIds` this is not a version hop: a save at the current
 * version can still carry them, so the load paths call it after
 * `dropUnknownCardIds`. Returns `state` itself when nothing changes.
 */
export function dropRetiredFlags(state: GameState): GameState {
    const flags = state.flags;
    if (!Array.isArray(flags) || !flags.some(f => RETIRED_FLAGS.has(f))) return state;
    return { ...state, flags: flags.filter(f => !RETIRED_FLAGS.has(f)) };
}

/**
 * Node ids a live map no longer has, each with the node a save standing on it
 * moves to. The Breakwater's mountain path (`bw-p2`) was cut on 2026-11-01
 * (T): the high pass took its mark, and the foothills lead straight there.
 */
const CUT_NODES: Readonly<Partial<Record<MapName, Readonly<Record<NodeId, NodeId>>>>> = {
    breakwater: { 'bw-p2': 'bw-p1' },
};

function scrubMap(map: MapState): MapState {
    const cut = CUT_NODES[map.name];
    if (!cut) return map;
    const gone = (id: NodeId | null | undefined): boolean => id != null && id in cut;
    const lists = [
        map.completedNodes, map.availableNodes, map.lockedNodes, map.discoveredNodes, map.consumedNodes,
        map.retiredEliteNodes ?? [], map.eliteUpgradeTakenNodes ?? [],
    ];
    const touched = gone(map.currentNode) || gone(map.pendingArrival) || gone(map.arrivedFrom)
        || lists.some(l => l.some(gone))
        || map.hazardOutcomes.some(o => gone(o.nodeId))
        || map.blockedRoutes.some(r => gone(r.from) || gone(r.to));
    if (!touched) return map;
    const keep = (l: NodeId[]): NodeId[] => l.filter(id => !gone(id));
    return {
        ...map,
        currentNode: gone(map.currentNode) ? cut[map.currentNode]! : map.currentNode,
        completedNodes: keep(map.completedNodes),
        availableNodes: keep(map.availableNodes),
        lockedNodes: keep(map.lockedNodes),
        discoveredNodes: keep(map.discoveredNodes),
        consumedNodes: keep(map.consumedNodes),
        ...(map.retiredEliteNodes ? { retiredEliteNodes: keep(map.retiredEliteNodes) } : {}),
        ...(map.eliteUpgradeTakenNodes ? { eliteUpgradeTakenNodes: keep(map.eliteUpgradeTakenNodes) } : {}),
        ...(gone(map.pendingArrival) ? { pendingArrival: null } : {}),
        ...(gone(map.arrivedFrom) ? { arrivedFrom: cut[map.arrivedFrom!]! } : {}),
        hazardOutcomes: map.hazardOutcomes.filter(o => !gone(o.nodeId)),
        blockedRoutes: map.blockedRoutes.filter(r => !gone(r.from) && !gone(r.to)),
    };
}

/**
 * Scrub the `CUT_NODES` ids from every map a save holds, on every load.
 *
 * Like `dropRetiredFlags` this is not a version hop: a save at the current
 * version can name a node cut after it was written. A player standing on a
 * cut node moves to the node it names; the cut id leaves every list. The
 * move lists are rebuilt from where the player stands by
 * `syncWorldMoveLists`, which the load paths run after this. Returns `state`
 * itself when nothing changes.
 */
export function dropCutNodes(state: GameState): GameState {
    const world = state.world;
    if (!world?.currentMap) return state;
    const currentMap = scrubMap(world.currentMap);
    let mapStates = world.mapStates;
    if (mapStates) {
        const next: Partial<Record<MapName, MapState>> = {};
        let changed = false;
        for (const [name, m] of Object.entries(mapStates) as [MapName, MapState | undefined][]) {
            const s = m ? scrubMap(m) : m;
            if (s !== m) changed = true;
            next[name] = s;
        }
        if (changed) mapStates = next;
    }
    if (currentMap === world.currentMap && mapStates === world.mapStates) return state;
    return { ...state, world: { ...world, currentMap, ...(mapStates ? { mapStates } : {}) } };
}

/**
 * Narrow `raw` to a `GameState`. Only the top-level shape is checked — the
 * sub-modules trust their own invariants and the serialiser writes the full
 * shape. Adjust here as `GameState` gains required keys.
 */
function assertGameState(raw: unknown): GameState {
    const r = raw as Partial<GameState>;
    if (typeof r.version !== 'number'
        || typeof r.runId !== 'string'
        || r.player == null
        || r.world == null
        || r.quests == null
        || !Array.isArray(r.flags)
        || typeof r.rngState !== 'number'
        || r.codex == null
        || !Array.isArray(r.codex.unlockedEntries)
    ) {
        throw new Error('migrate: payload missing required GameState fields.');
    }
    return raw as GameState;
}
