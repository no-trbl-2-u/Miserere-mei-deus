// The attempt contract lives in the engine so the app and the Worker share one
// validator. The Worker imports that one module by path rather than the whole
// `@mechanics` barrel, which would bundle the entire engine into the Worker.
export {
    PUZZLE_ATTEMPTS_PATH,
    validatePuzzleAttemptPost,
} from '../../axiomancer-mechanics/src/World/Hazard/puzzle/hazard-puzzle.attempt-contract';
export type {
    PuzzleAttemptCreated,
    PuzzleAttemptError,
    PuzzleAttemptList,
    PuzzleAttemptMove,
    PuzzleAttemptPost,
    PuzzleAttemptRow,
} from '../../axiomancer-mechanics/src/World/Hazard/puzzle/hazard-puzzle.attempt-contract';
