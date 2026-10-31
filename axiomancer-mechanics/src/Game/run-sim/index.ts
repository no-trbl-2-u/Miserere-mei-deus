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
export { runRoadOptions, isNodeUnfinished, isReachTarget, distanceToUnfinished, travelPassageTarget } from './run-roads';
export { nextHazardStep, hazardRouteFor, type HazardStep } from './run-hazard';
