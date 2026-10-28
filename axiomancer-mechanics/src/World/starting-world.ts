/**
 * The starting world: which map a new game begins on and the world built
 * for it. Its own module so the death rule can build a fresh run without
 * importing the whole `World` barrel (which imports `resolveMapEvent`, which
 * imports the death rule).
 */

import { WorldState, Continent } from './types';
import { createMapState, getMapDefinition, MAP_REGISTRY } from './map.registry';
import type { MapName, ContinentName } from './map.library';
import type { CoastalContinentMapNames } from './map.library';

/**
 * The map a new game starts on: the Breakwater, Act 1's coast.
 */
export const STARTING_MAP: CoastalContinentMapNames = 'breakwater';

/** The two campaign continents, in catalogue order. The labyrinth is not one of them. */
const CAMPAIGN_CONTINENTS: readonly ContinentName[] = ['coastal-continent', 'northern-continent'];

/**
 * Every map a new game can be started on: every map of the two campaign
 * continents, in registry order. The Aporia's acts are not here — they are
 * entered through the Labyrinth door, never started on.
 */
export const STARTABLE_MAPS: readonly MapName[] = CAMPAIGN_CONTINENTS.flatMap(
    c => Object.keys(MAP_REGISTRY[c]) as MapName[],
);

/** The campaign continent that owns `map`. Throws for a map no campaign continent registers. */
function continentOf(map: MapName): ContinentName {
    const owner = CAMPAIGN_CONTINENTS.find(c => MAP_REGISTRY[c][map] !== undefined);
    if (!owner) throw new Error(`createStartingWorld: '${map}' is not a startable campaign map`);
    return owner;
}

/**
 * Builds the initial WorldState for a new save.
 *
 * `startMap` defaults to `STARTING_MAP`. Any other campaign map builds the
 * same two-continent world placed on that map instead:
 * - tests that exercise one map's content (the Breakwater, most of them)
 *   say so here rather than silently following wherever a new game starts;
 * - the dev "start on any map" tools (CLI `--start-map`, mobile dev menu)
 *   build a fresh game on the map T wants to test.
 * The start map is AVAILABLE in its continent's catalogue and the continent
 * is current; every other campaign map starts locked.
 *
 * The `world` catalogue is REAL (inter-map travel): it carries the two campaign continents, and `changeContinent` / `unlockMap`
 * keep it in sync with `currentContinent`. The labyrinth-continent (THE
 * APORIA, W-01) stays deliberately uncatalogued.
 *
 * Note for old saves: a v21 save seeded before W3/W4/W5 lists fewer locked
 * northern maps, and that is FINE — `unlockMap` (the travel handler's step 3)
 * moves any registered destination into `availableMaps` whether or not the
 * catalogue ever listed it as locked, so no migration hop is needed for a
 * door to work (pinned in travel-kind e2e).
 */
export function createStartingWorld(startMap: MapName = STARTING_MAP): WorldState {
    const startContinent = continentOf(startMap);
    const catalogueOf = (name: ContinentName, description: string): Continent => {
        const maps = Object.keys(MAP_REGISTRY[name]) as MapName[];
        return {
            name,
            description,
            availableMaps: maps.filter(m => m === startMap),
            lockedMaps: maps.filter(m => m !== startMap),
            completedMaps: [],
        };
    };
    const coastal = catalogueOf(
        'coastal-continent',
        'The coastal continent is a landmass bordered by the sea to the east and west. It is home to a variety of biomes, including forests, mountains, and plains.',
    );
    const northern = catalogueOf(
        'northern-continent',
        'The northern continent begins underground. Iron caverns climb toward the first city; a river runs on from there. Nobody arrives by daylight.',
    );
    return {
        world: [coastal, northern],
        currentContinent: startContinent === 'coastal-continent' ? coastal : northern,
        currentMap: createMapState(getMapDefinition(startContinent, startMap)),
        mapStates: {},
    };
}
