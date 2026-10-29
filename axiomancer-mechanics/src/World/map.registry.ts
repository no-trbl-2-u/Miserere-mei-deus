/**
 * Map registry.
 *
 * Keyed by `ContinentName` → `MapName` → `MapDefinition`. Adding a new
 * continent or map is a single-file change here plus the underlying
 * map-definition file. Consumers should reach a map via
 * `getMapDefinition(continent, mapName)` + `createMapState(def)`.
 */

import { MapDefinition, MapState, NodeId, UniqueEvent } from './types';
import { ContinentName, MapName } from './map.library';
import { roadMoveLists } from './roads';
import { breakwater } from './Continents/Coastal-Village/breakwater';
import { charcoalWood } from './Continents/Coastal-Village/charcoal-wood';
import { beaconCrags } from './Continents/Northern-Continent/beacon-crags';
import { lanternDeep } from './Continents/Northern-Continent/lantern-deep';
import { aporiaColonnade, aporiaArchive, aporiaProof } from './Labyrinth/maps';

/** Thrown when navigating to a map that isn't registered. */
export class MapNotFoundError extends Error {
    constructor(mapName: string, continent: string) {
        super(`Map "${mapName}" not found in ${continent}`);
        this.name = 'MapNotFoundError';
    }
}

/**
 * Continent-keyed map registry. `Partial` on the inner record so a continent
 * can be authored before every map under it ships.
 */
export const MAP_REGISTRY: Record<ContinentName, Partial<Record<MapName, MapDefinition>>> = {
    'coastal-continent': {
        // Act 1's coast, the new-game start.
        'breakwater': breakwater,
        // Act 1's forest, past the Breakwater's bridge.
        'charcoal-wood': charcoalWood,
    },
    'northern-continent': {
        // Act 1's mountains, past the Charcoal Wood's stair cave.
        'beacon-crags': beaconCrags,
        // Act 1's underworld, below the Beacon Crags' glacier shrine.
        'lantern-deep': lanternDeep,
    },
    // The Aporia (dev-menu + CLI access only).
    'labyrinth-continent': {
        'aporia-colonnade': aporiaColonnade,
        'aporia-archive': aporiaArchive,
        'aporia-proof': aporiaProof,
    },
};

/**
 * Returns the static `MapDefinition` for `(continent, mapName)`. Throws when
 * the pairing isn't registered — callers should treat that as a programming
 * error, not a runtime fallback.
 */
export function getMapDefinition(continent: ContinentName, mapName: MapName): MapDefinition {
    const def = MAP_REGISTRY[continent]?.[mapName];
    if (!def) throw new MapNotFoundError(mapName, continent);
    return def;
}

/**
 * Builds the initial runtime `MapState` for a map definition.
 *
 * The starting node is *not* listed in `availableNodes` — the player is
 * standing on it. On a gauntlet map the two lists are the road rule's from
 * the start (`roadMoveLists`): its open roads are available, every other
 * node is locked.
 */
export function createMapState(def: MapDefinition): MapState {
    const startId = def.startingNode.id;
    const blockedRoutes = (def.initialBlockedRoutes ?? []).map(r => ({ ...r }));
    const adjacent = new Set<NodeId>(def.startingNode.connectedNodes);
    let available: NodeId[] = [];
    let locked: NodeId[] = [];
    if (def.traversal === 'labyrinth') {
        for (const n of def.nodes) {
            if (n.id === startId) continue;
            if (adjacent.has(n.id)) available.push(n.id);
            else locked.push(n.id);
        }
    } else {
        const lists = roadMoveLists(def, { currentNode: startId, completedNodes: [], consumedNodes: [], blockedRoutes });
        available = lists.availableNodes;
        locked = lists.lockedNodes;
    }
    return {
        name: def.name,
        continent: def.continent,
        currentNode: startId,
        completedNodes: [],
        availableNodes: available,
        lockedNodes: locked,
        uniqueEvents: (def.uniqueEvents ?? []).map(ue => ({ ...ue }) as UniqueEvent),
        // Fog-of-war seeded with the starting node; nothing consumed yet.
        discoveredNodes: [startId],
        consumedNodes: [],
        // The player is PLACED on the starting node, never arrives at it, so
        // the map opens owing no arrival. The start node's own content is the
        // screen's `startNodePending` affair.
        pendingArrival: null,
        // Hazard persistence extensions, initialized as empty.
        hazardOutcomes: [],
        // Secret doors, act gates and quest locks arrive pre-blocked.
        blockedRoutes,
    };
}

