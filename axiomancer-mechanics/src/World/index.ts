export {
    STARTING_MAP, STARTABLE_MAPS, createStartingWorld,
} from './starting-world';

export type { SeedInput } from './seed';

export {
    MAP_REGISTRY, getMapDefinition, createMapState,
} from './map.registry';

export type {
    WorldState, Quest,
    Encounter,
    MapState, QuestObjective, QuestLog, Reward,
} from './types';
export type { MapName, ContinentName } from './map.library';
export type { QuestName } from './quest.library';

export {
    emptyQuestLog, isQuestComplete, findActiveQuest,
    startQuest, progressQuest, completeQuest,
    payQuestReward, payCompletedQuests, newlyCompletedQuests, questRewardItem, settleKill,
    carriedCount, syncCarryObjectives, consumeCarriedItems,
    advanceHazardObjectives,
} from './quest.engine';
export type { PaidQuestReward, KilledFoe } from './quest.engine';

export {
    moveToNode, completeCurrentNode, IllegalMoveError,
    changeMap, completeMap, unlockMap,
    completeNode, unlockNode, changeContinent,
    revealAdjacent, markNodeConsumed,
    teleportToNode, placeOnNode, unblockMapRoute, arriveAtNode, unspendNode,
    arriveThroughPassage,
    // Traversal queries: the road rule's legal moves.
    legalMovesFrom,
    // A node the map holds (`holdRoadsUntilSettled`) opens its roads once spent.
    isHoldingRoads,
    // The move lists the road rule keeps, per map and over a loaded world.
    syncMoveLists, syncWorldMoveLists,
    // The walk back along open roads to a node.
    roadRouteTo, walkRoadTo, roadReachable,
    // The forward skeleton the progression audits walk.
    forwardEdges,
} from './world.reducer';
export { auditRoadReachability } from './road-reachability';
export type { RoadReachabilityAudit } from './road-reachability';

// MapEvents engine.
// Importing `./MapEvents/content` for its side effect registers every
// authored map's pools (coastal + northern continents) on module load.
import './MapEvents/content';
// Importing `./quest.library` for its side effect registers every authored
// questline (the Breakwater's) on module load, beside the pools above.
import './quest.library';
export { BREAKWATER_QUESTLINE, BREAKWATER_QUESTLINE_ID, AUTHORED_QUESTLINES } from './quest.library';

export {
    resolveMapEvent,
    settleArrival,
    answerUnsettledArrival,
    getNodeEventPool,
    getNodePrimaryEventKind,
    actsOnRevisit,
    isQuietWalkBack,
} from './MapEvents/resolve-map-event';
// Travel: the yes to a "move to X?" (phase NK1d).
export { takeTravel, travelPayloadAt } from './MapEvents/travel';
export { isTravelOpen } from './MapEvents/handlers';
export type {
    MapEventKind, QuestPayload, TravelPayload, TravelDestination,
    MapEventPayload, ResolvedEvent, ResolveMapEventResult,
} from './MapEvents/types';
export type {
    Questline, QuestlineStep, QuestlineId, QuestlineSettle, QuestNodeStage, QuestStepView, RouteRef,
    QuestStepState,
} from './questline';
// Quest gates: the authoring check that a gate holds its road.
export type { QuestGate } from './quest-gates';
export { questGatesOn, questGateProblems } from './quest-gates';
// The questline step rules.
export {
    registerQuestline, getQuestline, listQuestlines, questlineStep,
    questStepState, stepQuest, questStepView, questNodeStage, resolveQuestNodeEvent,
    openReadyQuestRoutes, settleQuestLog, acceptQuestStep, giveQuestStep, turnInQuestStep, turnInNodeOf,
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
