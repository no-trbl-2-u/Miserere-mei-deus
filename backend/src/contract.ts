// The attempt and play-log contracts live in the engine so the app and the
// Worker share one validator each. The Worker imports those modules by path
// rather than the whole `@mechanics` barrel, which would bundle the entire
// engine into the Worker.
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
export {
    PLAY_LOG_DECK_EVENTS_PATH,
    PLAY_LOG_FIGHTS_PATH,
    PLAY_LOG_LIMITS,
    validateDeckEventPost,
    validateFightPost,
} from '../../axiomancer-mechanics/src/Combat/combat.play-log-contract';
export type {
    DeckEventList,
    DeckEventPost,
    DeckEventRow,
    FightList,
    FightPost,
    FightRow,
    PlayLogCreated,
    PlayLogError,
    PlayLogEvent,
} from '../../axiomancer-mechanics/src/Combat/combat.play-log-contract';
