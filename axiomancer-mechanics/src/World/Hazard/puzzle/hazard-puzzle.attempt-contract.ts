/**
 * Hazard puzzle — the solve-time API contract (phase BE1a).
 *
 * One finished `/devpuzzle` attempt, as the preview app posts it and the
 * `miserere-api` Worker stores and returns it. The app and the Worker both
 * import this module, so the request shape and the validator cannot drift
 * between them. Pure types and a pure validator: no I/O, no engine imports
 * beyond types, so the Worker bundle stays small.
 *
 * The API is versioned under `/v1/`. An installed preview APK keeps posting
 * this shape forever, so a breaking change is a new path, never an edit here.
 */

import { checkPlayLogOrigin, withoutAbsentOrigin } from '../../../Combat/combat.play-log-contract';
import type { PlayLogOrigin } from '../../../Combat/combat.play-log-contract';
import type { HazardRouteKey } from '../hazard.types';
import type { HazardPuzzleBand } from './hazard-puzzle.types';

/** The one route both sides use, under its API version. */
export const PUZZLE_ATTEMPTS_PATH = '/v1/puzzle-attempts';

export const PUZZLE_ATTEMPT_ROUTES: readonly HazardRouteKey[] = ['safe', 'risk'];
export const PUZZLE_ATTEMPT_BANDS: readonly HazardPuzzleBand[] = ['easy', 'medium', 'hard'];
export const PUZZLE_ATTEMPT_END_KINDS = ['confirm', 'expiry'] as const;
export const PUZZLE_ATTEMPT_MOVE_KINDS = ['stage', 'unstage', 'power', 'apply'] as const;

/** Upper bounds that keep one malformed or hostile post from filling the table. */
export const PUZZLE_ATTEMPT_LIMITS = {
    text: 200,
    moves: 500,
} as const;

/** How an attempt ended: the solver's CONFIRM, or the clock running out. */
export type PuzzleAttemptEndKind = (typeof PUZZLE_ATTEMPT_END_KINDS)[number];
/** Which board move an entry records. */
export type PuzzleAttemptMoveKind = (typeof PUZZLE_ATTEMPT_MOVE_KINDS)[number];

/** One board move, timed in milliseconds from the clock start. */
export interface PuzzleAttemptMove {
    n: number;
    kind: PuzzleAttemptMoveKind;
    uid: string;
    dieId?: string;
    ms: number;
}

/** The body of `POST /v1/puzzle-attempts`: one ended attempt. */
export interface PuzzleAttemptPost extends PlayLogOrigin {
    /** The name the solver typed on the list screen. */
    solver: string;
    layoutId: string;
    route: HazardRouteKey;
    /** The band a candidate was authored for; null for a demo layout. */
    intendedBand: HazardPuzzleBand | null;
    moves: PuzzleAttemptMove[];
    endKind: PuzzleAttemptEndKind;
    /** Milliseconds from the clock start to the end: the solve time. */
    endMs: number;
    cleared: boolean;
    /** Which build posted it (version and profile), for telling APKs apart. */
    appBuild: string;
}

/** One stored attempt, as `GET /v1/puzzle-attempts` returns it. */
export interface PuzzleAttemptRow extends PuzzleAttemptPost {
    id: number;
    source: NonNullable<PlayLogOrigin['source']>;
    runId: string | null;
    /** ISO instant the Worker stored it. */
    receivedAt: string;
}

/** The body of `GET /v1/puzzle-attempts`, newest first. */
export interface PuzzleAttemptList {
    attempts: PuzzleAttemptRow[];
}

/** The body of a 201 from `POST /v1/puzzle-attempts`. */
export interface PuzzleAttemptCreated {
    id: number;
    receivedAt: string;
}

/** The body of every 4xx: what was wrong, one line per problem. */
export interface PuzzleAttemptError {
    error: string;
    reasons?: string[];
}

export type PuzzleAttemptValidation =
    | { ok: true; attempt: PuzzleAttemptPost; reasons: [] }
    | { ok: false; reasons: string[] };

const POST_KEYS: readonly (keyof PuzzleAttemptPost)[] = [
    'solver', 'layoutId', 'route', 'intendedBand', 'moves', 'endKind', 'endMs', 'cleared', 'appBuild',
    'source', 'runId',
];

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWholeMs(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function checkText(value: unknown, field: string, reasons: string[], allowEmpty: boolean): void {
    if (typeof value !== 'string') {
        reasons.push(`${field}: expected a string`);
    } else if (!allowEmpty && value.trim() === '') {
        reasons.push(`${field}: must not be empty`);
    } else if (value.length > PUZZLE_ATTEMPT_LIMITS.text) {
        reasons.push(`${field}: longer than ${PUZZLE_ATTEMPT_LIMITS.text} characters`);
    }
}

function checkOneOf(value: unknown, allowed: readonly string[], field: string, reasons: string[]): void {
    if (typeof value !== 'string' || !allowed.includes(value)) {
        reasons.push(`${field}: expected one of ${allowed.join(', ')}`);
    }
}

function checkMove(move: unknown, i: number, reasons: string[]): void {
    const at = `moves[${i}]`;
    if (!isRecord(move)) {
        reasons.push(`${at}: expected an object`);
        return;
    }
    if (typeof move.n !== 'number' || !Number.isInteger(move.n) || move.n < 1) {
        reasons.push(`${at}.n: expected a whole number of at least 1`);
    }
    checkOneOf(move.kind, PUZZLE_ATTEMPT_MOVE_KINDS, `${at}.kind`, reasons);
    checkText(move.uid, `${at}.uid`, reasons, false);
    if (move.dieId !== undefined) checkText(move.dieId, `${at}.dieId`, reasons, false);
    if (!isWholeMs(move.ms)) reasons.push(`${at}.ms: expected whole milliseconds of at least 0`);
}

/**
 * Checks an untrusted request body against the post shape. On success the
 * returned `attempt` carries only the contract's keys, so an unknown key a
 * client sends is dropped rather than stored.
 */
export function validatePuzzleAttemptPost(body: unknown): PuzzleAttemptValidation {
    if (!isRecord(body)) return { ok: false, reasons: ['body: expected a JSON object'] };
    const reasons: string[] = [];

    // The solver may be blank: the move log names it late, and a blank name
    // still times the solve. Ids and the build must be present.
    checkText(body.solver, 'solver', reasons, true);
    checkText(body.layoutId, 'layoutId', reasons, false);
    checkText(body.appBuild, 'appBuild', reasons, false);
    checkPlayLogOrigin(body, reasons);
    checkOneOf(body.route, PUZZLE_ATTEMPT_ROUTES, 'route', reasons);
    if (body.intendedBand !== null) {
        checkOneOf(body.intendedBand, PUZZLE_ATTEMPT_BANDS, 'intendedBand', reasons);
    }
    checkOneOf(body.endKind, PUZZLE_ATTEMPT_END_KINDS, 'endKind', reasons);
    if (!isWholeMs(body.endMs)) reasons.push('endMs: expected whole milliseconds of at least 0');
    if (typeof body.cleared !== 'boolean') reasons.push('cleared: expected true or false');

    if (!Array.isArray(body.moves)) {
        reasons.push('moves: expected an array');
    } else if (body.moves.length > PUZZLE_ATTEMPT_LIMITS.moves) {
        reasons.push(`moves: more than ${PUZZLE_ATTEMPT_LIMITS.moves} entries`);
    } else {
        body.moves.forEach((move, i) => checkMove(move, i, reasons));
    }

    if (reasons.length > 0) return { ok: false, reasons };

    const picked = Object.fromEntries(POST_KEYS.map((key) => [key, body[key]]));
    const moves = (body.moves as PuzzleAttemptMove[]).map((m) => ({
        n: m.n, kind: m.kind, uid: m.uid, ...(m.dieId === undefined ? {} : { dieId: m.dieId }), ms: m.ms,
    }));
    return { ok: true, attempt: { ...withoutAbsentOrigin(picked as unknown as PuzzleAttemptPost), moves }, reasons: [] };
}
