/**
 * Solve-time API contract (BE1 A2): the validator the preview app and the
 * Worker share accepts a well-formed ended attempt and names what is wrong
 * with anything else, so the Worker's 400 carries a reason.
 */

import { describe, expect, it } from 'vitest';

import {
    PUZZLE_ATTEMPT_LIMITS,
    validatePuzzleAttemptPost,
    type PuzzleAttemptPost,
} from '../hazard-puzzle.attempt-contract';

function attempt(over: Partial<Record<keyof PuzzleAttemptPost, unknown>> = {}): Record<string, unknown> {
    return {
        solver: 'T',
        layoutId: 'cand-easy-01',
        route: 'risk',
        intendedBand: 'easy',
        moves: [
            { n: 1, kind: 'stage', uid: 'h0', ms: 1200 },
            { n: 2, kind: 'power', uid: 'h0', dieId: 'd1', ms: 2400 },
        ],
        endKind: 'confirm',
        endMs: 9100,
        cleared: true,
        appBuild: '1.4.0 preview',
        ...over,
    };
}

function reasonsOf(body: unknown): string[] {
    const result = validatePuzzleAttemptPost(body);
    return result.ok ? [] : result.reasons;
}

describe('validatePuzzleAttemptPost', () => {
    it('accepts an ended attempt and returns it unchanged', () => {
        const result = validatePuzzleAttemptPost(attempt());
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.attempt).toEqual(attempt());
    });

    it('accepts a demo (null band), a blank solver and an expiry with no moves', () => {
        const result = validatePuzzleAttemptPost(
            attempt({ intendedBand: null, solver: '', endKind: 'expiry', cleared: false, moves: [] }),
        );
        expect(result.ok).toBe(true);
    });

    it('drops keys the contract does not name', () => {
        const result = validatePuzzleAttemptPost({
            ...attempt({ moves: [{ n: 1, kind: 'apply', uid: 'h1', ms: 5, extra: 1 }] }),
            deviceId: 'abc',
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.attempt).not.toHaveProperty('deviceId');
            expect(result.attempt.moves[0]).toEqual({ n: 1, kind: 'apply', uid: 'h1', ms: 5 });
        }
    });

    it('rejects a body that is not an object', () => {
        expect(reasonsOf(null)).toEqual(['body: expected a JSON object']);
        expect(reasonsOf([attempt()])).toEqual(['body: expected a JSON object']);
        expect(reasonsOf('{}')).toEqual(['body: expected a JSON object']);
    });

    it('names a missing field', () => {
        const body = attempt();
        delete body.layoutId;
        delete body.intendedBand;
        expect(reasonsOf(body)).toEqual([
            'layoutId: expected a string',
            'intendedBand: expected one of easy, medium, hard',
        ]);
    });

    it('names a wrong type', () => {
        expect(reasonsOf(attempt({ endMs: '9100' }))).toEqual(['endMs: expected whole milliseconds of at least 0']);
        expect(reasonsOf(attempt({ endMs: 9.5 }))).toEqual(['endMs: expected whole milliseconds of at least 0']);
        expect(reasonsOf(attempt({ cleared: 1 }))).toEqual(['cleared: expected true or false']);
        expect(reasonsOf(attempt({ moves: {} }))).toEqual(['moves: expected an array']);
    });

    it('rejects an unknown end kind, route or band', () => {
        expect(reasonsOf(attempt({ endKind: 'quit' }))).toEqual(['endKind: expected one of confirm, expiry']);
        expect(reasonsOf(attempt({ route: 'leap' }))).toEqual(['route: expected one of safe, risk']);
        expect(reasonsOf(attempt({ intendedBand: 'brutal' }))).toEqual([
            'intendedBand: expected one of easy, medium, hard',
        ]);
    });

    it('names a bad move by its index', () => {
        expect(reasonsOf(attempt({ moves: [{ n: 0, kind: 'roll', uid: '', ms: -1 }] }))).toEqual([
            'moves[0].n: expected a whole number of at least 1',
            'moves[0].kind: expected one of stage, unstage, power, apply',
            'moves[0].uid: must not be empty',
            'moves[0].ms: expected whole milliseconds of at least 0',
        ]);
    });

    it('caps the text and move counts', () => {
        expect(reasonsOf(attempt({ solver: 'x'.repeat(PUZZLE_ATTEMPT_LIMITS.text + 1) }))).toEqual([
            `solver: longer than ${PUZZLE_ATTEMPT_LIMITS.text} characters`,
        ]);
        const moves = Array.from({ length: PUZZLE_ATTEMPT_LIMITS.moves + 1 }, (_, i) => ({
            n: i + 1, kind: 'stage', uid: 'h0', ms: i,
        }));
        expect(reasonsOf(attempt({ moves }))).toEqual([`moves: more than ${PUZZLE_ATTEMPT_LIMITS.moves} entries`]);
    });
});
