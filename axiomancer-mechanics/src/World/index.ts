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

export type { SeedInput } from './seed';

export {
    MAP_REGISTRY, getMapDefinition, createMapState,
} from './map.registry';

export type {
    WorldState, Quest,
    Encounter,
    MapState, QuestObjective, QuestLog,
} from './types';
export type { MapName, ContinentName } from './map.library';
export type { QuestName } from './quest.library';

export {
    emptyQuestLog, isQuestComplete, findActiveQuest,
    startQuest, progressQuest, completeQuest,
    payQuestReward, payCompletedQuests, newlyCompletedQuests, questRewardItem, settleKill,
    advanceHazardObjectives,
} from './quest.engine';
export type { PaidQuestReward, KilledFoe } from './quest.engine';

export {
    moveToNode, completeCurrentNode, IllegalMoveError,
    changeMap, completeMap, unlockMap,
    completeNode, unlockNode, changeContinent,
    revealAdjacent, markNodeConsumed,
    teleportToNode, placeOnNode, unblockMapRoute,
    // Traversal queries + the strand audit.
    legalMovesFrom,
    // A node the map holds (`holdRoadsUntilSettled`) opens its roads once spent.
    isHoldingRoads,
    // Frontier roaming: the derived spent/frontier sets
    // every surface classifies nodes from, plus the forward skeleton the
    // progression audits walk.
    forwardEdges,
} from './world.reducer';

// MapEvents engine.
// Importing `./MapEvents/content` for its side effect registers every
// authored map's pools (coastal + northern continents) on module load.
import './MapEvents/content';

export {
    resolveMapEvent,
    settleArrival,
    answerUnsettledArrival,
    getNodeEventPool,
    getNodePrimaryEventKind,
} from './MapEvents/resolve-map-event';
export type {
    MapEventKind, QuestPayload,
    MapEventPayload, ResolvedEvent, ResolveMapEventResult,
} from './MapEvents/types';
export type {
    Questline, QuestlineStep, QuestlineId, QuestlineSettle, QuestNodeStage, QuestStepView, RouteRef,
    QuestStepState,
} from './questline';
// The questline step rules.
export {
    registerQuestline, getQuestline, listQuestlines, questlineStep,
    questStepState, stepQuest, questStepView, questNodeStage, resolveQuestNodeEvent,
    openReadyQuestRoutes, settleQuestLog, acceptQuestStep, turnInQuestStep,
} from './questline';
// Rest shelter classification. Mobile words an inn night as a bed.
export type { RestShelter } from './MapEvents/types';
export {
    DEFAULT_REST_SHELTER, isInnShelter,
} from './MapEvents/rest-shelter';


// Elites come back after a night's rest (phase ER1).
export {
    respawnElites, settledEliteNodes, retireEliteNode,
    markEliteUpgradeTaken, isEliteUpgradeTaken,
    eliteEncounterAt, isEliteNode, eliteRelicDropsAt,
} from './elite-respawn';
export type { EliteNodeRef, SettledEliteNode, RespawnElitesResult } from './elite-respawn';

export {
    applyDialogueChoice,
} from './dialogue.runtime';

// Hazard Minigame
export * from './Hazard';

// The Labyrinth — THE APORIA (W-01). The pools module self-registers the
// three acts' MapEvent pools on import, mirroring the content import above.
import './Labyrinth/labyrinth.pools';

export {
    createLabyrinthProgress, visibleDoors, inspectPoi,
    submitGateAnswer, preConfirmedWords, buyHint, hintPrice,
    debtPoints, borrowedPremiseStacks, settleDebt, activateWaystone,
    lastWaystone, namingForkOpen, recordBossOutcome, getRoom,
    recordWalk, walkedEdgesOf, isSophistTrueName,
    SETTLE_PRICE_PER_POINT,
} from './Labyrinth/labyrinth.engine';
export { resolvePoiTrap } from './Labyrinth/labyrinth.pools';
export {
    APORIA_ACTS, getAporiaAct,
} from './Labyrinth/maps';
export type {
    LabyrinthActDef, LabyrinthActId,
    LabyrinthProgress, LabyrinthBossOutcome,
} from './Labyrinth/types';
