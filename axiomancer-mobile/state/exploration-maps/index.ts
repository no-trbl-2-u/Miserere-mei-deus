import { breakwaterLayout } from './breakwater.layout';
import { charcoalWoodLayout } from './charcoal-wood.layout';
import { beaconCragsLayout } from './beacon-crags.layout';
import { lanternDeepLayout } from './lantern-deep.layout';
import type { ArenaPlateId } from '@/assets/images/combat';
import type { MapLayout } from './types';

export type { MapLayout, MapSheet, NodeLayout } from './types';

const REGISTRY: Record<string, MapLayout> = {
    // Act 1's coast, the new-game start.
    'breakwater': breakwaterLayout,
    // Act 1's forest, past the Breakwater's bridge.
    'charcoal-wood': charcoalWoodLayout,
    // Act 1's mountains, past the Charcoal Wood's stair cave.
    'beacon-crags': beaconCragsLayout,
    // Act 1's underworld, below the Beacon Crags' glacier shrine.
    'lantern-deep': lanternDeepLayout,
};

export function getMapLayout(mapId: string): MapLayout | null {
    return REGISTRY[mapId] ?? null;
}

/**
 * The plate a map is drawn on, for a screen opened from one of its nodes
 * (the cache, the Anvil), so the screen stands in the same place as the map.
 *
 * @param mapId - the current map's name (`world.currentMap.name`).
 * @returns the layout's backdrop, or null for no map or an unmapped one.
 */
export function mapBackdropFor(mapId: string | null | undefined): number | null {
    if (!mapId) return null;
    return getMapLayout(mapId)?.sheet.backdrop ?? null;
}

/**
 * The arena plate a node names for its fights, if its layout names one.
 *
 * Keyed on the region as well as the node id, so two maps could never answer
 * for each other's nodes.
 *
 * @param region - the layout's region display string (`vm.region`).
 * @param nodeId - the engine node id the fight was walked to.
 * @returns the plate id, or undefined (no map, no node, or a node that names none).
 */
export function nodeArenaFor(
    region: string | undefined,
    nodeId: string | undefined,
): ArenaPlateId | undefined {
    if (!region || !nodeId) return undefined;
    const layout = Object.values(REGISTRY).find((l) => l.region === region);
    return layout?.nodes.find((n) => n.id === nodeId)?.arena;
}

/**
 * Every map layout the game ships, in registry order.
 *
 * Exists so a test can ask "which regions can the game actually put the player
 * in?" without hand-copying the answer. `REGISTRY` is not an implementation
 * detail of anything under test — it is the game's own statement of which maps
 * exist — so it is the correct oracle for that question, and the only one that
 * cannot silently omit a map the way a hand-written region list can.
 */
export const ALL_MAP_LAYOUTS: readonly MapLayout[] = Object.values(REGISTRY);
