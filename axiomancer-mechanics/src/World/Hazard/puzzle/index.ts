/**
 * Hazard puzzle — public API. A fixed, one-round hazard played on the
 * live minigame's card and die rules. Dev-menu only until
 * Act 1's rollout.
 */

export type {
    HazardPuzzleBand,
    HazardPuzzleCandidate,
    HazardPuzzleGoal,
    HazardPuzzleGoals,
    HazardPuzzleLayout,
    HazardPuzzleMove,
    HazardPuzzlePhase,
    HazardPuzzleResult,
    HazardPuzzleSession,
    HazardPuzzleStat,
    HazardPuzzleUnlock,
    HazardPuzzleUnlockGrant,
    HazardPuzzleValidation,
} from './hazard-puzzle.types';

export { HAZARD_PUZZLE_ACT, validateHazardPuzzleCandidate, validateHazardPuzzleLayout } from './hazard-puzzle.validate';

export {
    createHazardPuzzleSession,
    stageHazardPuzzleCard,
    unstageHazardPuzzleCard,
    powerHazardPuzzleCard,
    applyHazardPuzzleCard,
    playHazardPuzzleMove,
    playHazardPuzzleMoves,
    confirmHazardPuzzle,
} from './hazard-puzzle.session';

export {
    HAZARD_PUZZLE_FAILURE, HAZARD_PUZZLE_REWARDS, HAZARD_PUZZLE_TUNING,
    HAZARD_PUZZLE_BANDS, HAZARD_PUZZLE_SOLVER_BUDGET, HAZARD_PUZZLE_CARD_POOL,
} from './hazard-puzzle.tuning';

export type { HazardPuzzleOutcome, HazardPuzzleOutcomeContext } from './hazard-puzzle.outcome';
export { hazardPuzzleOutcome } from './hazard-puzzle.outcome';
export { hazardRegionMaterials } from './hazard-puzzle.region';

export type { HazardPuzzleFeatures, HazardPuzzleSolution, HazardPuzzleSolveOptions } from './hazard-puzzle.solver';
export { solveHazardPuzzle, solveHazardPuzzleSession, hazardPuzzleSurplus } from './hazard-puzzle.solver';

export type { HazardPuzzleCardReport, HazardPuzzleCardSource, HazardPuzzleCardUse } from './hazard-puzzle.report';
export { hazardPuzzleCardReport, formatHazardPuzzleCardReport, formatHazardPuzzleFeatures } from './hazard-puzzle.report';

export type { HazardPuzzleCardAuditRow, HazardPuzzleLibraryUse } from './hazard-puzzle.audit';
export {
    HAZARD_PUZZLE_IGNORED_FIELDS,
    hazardPuzzleCardAudit,
    hazardPuzzleCardBan,
    hazardPuzzleCardGroups,
    hazardPuzzleCardShape,
    hazardPuzzleCardShapeKey,
    hazardPuzzleLibraryUse,
} from './hazard-puzzle.audit';

export type { HazardPuzzleDominance, HazardPuzzleLibraryCell } from './hazard-puzzle.dominance';
export {
    hazardPuzzleCellHolds,
    hazardPuzzleCellLabel,
    hazardPuzzleDominatedCards,
    hazardPuzzleLibraryCardIds,
    hazardPuzzleLibraryCells,
    hazardPuzzleUnusedCards,
    swapHazardPuzzleCard,
} from './hazard-puzzle.dominance';

export type { HazardPuzzleRouteAudit } from './hazard-puzzle.band';
export { hazardPuzzleBandOf, auditHazardPuzzleRoute, auditHazardPuzzleLayout } from './hazard-puzzle.band';

export type { HazardPuzzleUnlockAudit } from './hazard-puzzle.band';
export { auditHazardPuzzleUnlocks } from './hazard-puzzle.band';
export {
    HAZARD_PUZZLE_UNLOCK_DIE,
    activeHazardPuzzleUnlocks,
    applyHazardPuzzleUnlocks,
    hazardPuzzleDeclaresUnlocks,
    hazardPuzzleUnlockSubsets,
} from './hazard-puzzle.unlocks';

export { HAZARD_PUZZLE_LIBRARY, getHazardPuzzleLayout } from './hazard-puzzle.library';
export { HAZARD_PUZZLE_CANDIDATES, getHazardPuzzleCandidate } from './hazard-puzzle.candidates';
export type { HazardPuzzleCandidateAudit } from './hazard-puzzle.candidate-audit';
export { auditHazardPuzzleCandidate, hazardPuzzleCandidateSetProblems } from './hazard-puzzle.candidate-audit';
export { HAZARD_PUZZLE_CLOCK_SECONDS } from './hazard-puzzle.tuning';
export { HAZARD_PUZZLE_REGIONS } from './hazard-puzzle.validate';
