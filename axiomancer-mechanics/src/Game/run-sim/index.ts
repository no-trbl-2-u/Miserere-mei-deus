/**
 * The run sim's engine half (phase SM1e): the `RunPolicy` contract, the
 * `wanderer` baseline, the road reading and the hazard tap planner. The
 * driver that plays a run through the app's store lives in
 * `axiomancer-mobile/sim/`.
 */

export type {
    RunPolicy, RunRoadOption, RunRoadContext, RunTravelContext, RunRewardSource,
    RunRewardContext, RunRewardDecision, RunRestContext, RunRestDecision, RunCacheContext,
    RunVillageContext, RunVillageDecision, RunHazardContext, RunHazardCardContext,
    RunFightContext, RunLevelUpContext, RunItemContext, RunStat,
} from './run-policy.types';
export { WANDERER_POLICY, nearestRoad } from './run-policy.wanderer';
export { RUN_POLICIES, RUN_POLICY_IDS, getRunPolicy } from './run-policy.registry';
export {
    ARCHETYPE_POLICIES, BLOOD_PRICE_POLICY, DEFENDER_POLICY, MERCIFUL_POLICY, ELEMENTALIST_POLICY,
    MIN_DECK_SIZE, archetypePolicy, bestLaneOffer, offLaneRemovals, type ArchetypeSpec,
} from './run-policy.archetypes';
export { laneFightPolicy, BLOOD_PRICE_SPEND_FLOOR } from './run-policy.fight';
export {
    cardLaneId, cardKeywords, laneKeywords, laneStat, itemLaneId,
    characterLaneFit, characterOpensLane, characterForLane,
} from './run-policy.lanes';
export {
    runRoadOptions, isNodeUnfinished, isReachTarget, distanceToUnfinished, travelPassageTarget,
    isEliteNode, isStoryNode, distanceToStory, distanceToExit, unfinishedReachable,
} from './run-roads';
export { PLAYER_WITNESS } from './player-witness';
export { nextHazardStep, hazardRouteFor, type HazardStep } from './run-hazard';
