/**
 * The dev-only HAZARD PUZZLES move log (phase HP2c, acceptance A4).
 *
 * One attempt is one solve: a layout, the route it was solved on, the solver
 * who typed their name on the list screen, the clock start, every board move
 * with milliseconds since that start, and the end (a CONFIRM or the clock
 * expiring) with the result. The log is the timing instrument the calibration
 * and clock-tuning phases read: an attempt's `end.ms` IS its solve time, so
 * the start has to be the moment the solve actually becomes playable.
 *
 * **The clock start is the moment the opening roll settles**, not the moment
 * the board mounts: the puzzle board holds its clock while the live dice-roll
 * overlay plays (`HazardPuzzleDemo`: `running` is false while `rolling` is
 * true), so a start taken at mount would charge every solve the overlay's
 * duration.
 *
 * Pure reducers over plain data — no store, no clock, no I/O. The caller
 * passes `at` (epoch milliseconds) for every event, so a test drives the log
 * with fake timers and the screen passes `Date.now()`. Recording is the
 * screen's call and is gated on dev builds there; this module has no opinion
 * about builds, which keeps it testable.
 */

import type { HazardRouteKey } from '@mechanics';

/** Which board move an entry records. The engine's four puzzle moves. */
export type HazardPuzzleLogMoveKind = 'stage' | 'unstage' | 'power' | 'apply';

/** How an attempt ended: the solver's CONFIRM, or the clock running out. */
export type HazardPuzzleLogEndKind = 'confirm' | 'expiry';

/** One board move, timed from the clock start. */
export interface HazardPuzzleLogMove {
    /** 1-based order within the attempt. */
    n: number;
    kind: HazardPuzzleLogMoveKind;
    /** The card the move acted on. */
    uid: string;
    /** The die a `power` move spent; absent on the other kinds. */
    dieId?: string;
    /** Milliseconds since the clock start. */
    ms: number;
}

/** How an attempt finished, and what it scored. */
export interface HazardPuzzleLogEnd {
    kind: HazardPuzzleLogEndKind;
    /** Milliseconds since the clock start — the attempt's solve time. */
    ms: number;
    cleared: boolean;
    /** The engine's share of the goal reached, as a whole percent. */
    reachedPercent: number;
}

/** One solve of one layout on one route. */
export interface HazardPuzzleLogAttempt {
    layoutId: string;
    route: HazardRouteKey;
    /** Whatever the solver typed; empty until they type it. */
    solver: string;
    /** The clock start as an ISO instant: when the opening roll settled. */
    startedAt: string;
    /** The clock this route ran, in seconds. */
    clockSeconds: number;
    moves: readonly HazardPuzzleLogMove[];
    /** Null while the attempt is still being played. */
    end: HazardPuzzleLogEnd | null;
}

/** What the screen knows when a solve begins. */
export interface HazardPuzzleLogStart {
    layoutId: string;
    route: HazardRouteKey;
    solver: string;
    clockSeconds: number;
    /** Epoch milliseconds of the clock start (the roll settling). */
    at: number;
}

/** Opens an attempt. The clock start is `at`; every later `ms` is measured from it. */
export function startHazardPuzzleAttempt(start: HazardPuzzleLogStart): HazardPuzzleLogAttempt {
    return {
        layoutId: start.layoutId,
        route: start.route,
        solver: start.solver,
        startedAt: new Date(start.at).toISOString(),
        clockSeconds: start.clockSeconds,
        moves: [],
        end: null,
    };
}

/** The attempt's clock start, back as epoch milliseconds. */
function startedAtMs(attempt: HazardPuzzleLogAttempt): number {
    return Date.parse(attempt.startedAt);
}

/** Milliseconds from the clock start to `at`, never negative. */
function sinceStart(attempt: HazardPuzzleLogAttempt, at: number): number {
    return Math.max(0, at - startedAtMs(attempt));
}

/** Appends a move. An ended attempt is returned untouched: a log never grows after its end. */
export function logHazardPuzzleMove(
    attempt: HazardPuzzleLogAttempt,
    move: { kind: HazardPuzzleLogMoveKind; uid: string; dieId?: string },
    at: number,
): HazardPuzzleLogAttempt {
    if (attempt.end !== null) return attempt;
    const entry: HazardPuzzleLogMove = {
        n: attempt.moves.length + 1,
        kind: move.kind,
        uid: move.uid,
        ms: sinceStart(attempt, at),
        ...(move.dieId === undefined ? {} : { dieId: move.dieId }),
    };
    return { ...attempt, moves: [...attempt.moves, entry] };
}

/** Closes an attempt with its end and result. A second call is ignored. */
export function endHazardPuzzleAttempt(
    attempt: HazardPuzzleLogAttempt,
    end: { kind: HazardPuzzleLogEndKind; cleared: boolean; reachedPercent: number },
    at: number,
): HazardPuzzleLogAttempt {
    if (attempt.end !== null) return attempt;
    return {
        ...attempt,
        end: {
            kind: end.kind,
            ms: sinceStart(attempt, at),
            cleared: end.cleared,
            reachedPercent: end.reachedPercent,
        },
    };
}

/** Names the solver on every attempt, so a name typed late still labels the log. */
export function nameHazardPuzzleSolver(
    attempts: readonly HazardPuzzleLogAttempt[],
    solver: string,
): HazardPuzzleLogAttempt[] {
    return attempts.map((a) => (a.solver === solver ? a : { ...a, solver }));
}

/** The log as the COPY LOG control hands it over: pretty-printed JSON. */
export function hazardPuzzleLogJson(attempts: readonly HazardPuzzleLogAttempt[]): string {
    return JSON.stringify({ attempts }, null, 2);
}

/** An attempt's solve time in seconds, to one decimal; null while it is unfinished. */
export function hazardPuzzleSolveSeconds(attempt: HazardPuzzleLogAttempt): number | null {
    return attempt.end === null ? null : Math.round(attempt.end.ms / 100) / 10;
}
