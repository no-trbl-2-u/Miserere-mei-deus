/**
 * The dev-only HAZARD PUZZLES move log reducers (HP2c, A4): an attempt's
 * clock start, each move's milliseconds from it, the end and the JSON.
 */

import { describe, expect, it } from '@jest/globals';

import {
    endHazardPuzzleAttempt,
    hazardPuzzleLogJson,
    hazardPuzzleSolveSeconds,
    logHazardPuzzleMove,
    nameHazardPuzzleSolver,
    startHazardPuzzleAttempt,
} from '@/state/presenters/hazard-puzzle-log.engine';

const START = Date.parse('2026-10-19T10:00:00.000Z');

function attempt(solver = 'T') {
    return startHazardPuzzleAttempt({
        layoutId: 'demo-undercroft-hard',
        route: 'risk',
        solver,
        clockSeconds: 60,
        at: START,
    });
}

describe('hazard puzzle move log', () => {
    it('opens an attempt at the clock start, with no moves and no end', () => {
        const a = attempt();
        expect(a).toMatchObject({
            layoutId: 'demo-undercroft-hard',
            route: 'risk',
            solver: 'T',
            startedAt: '2026-10-19T10:00:00.000Z',
            clockSeconds: 60,
            moves: [],
            end: null,
        });
        expect(hazardPuzzleSolveSeconds(a)).toBeNull();
    });

    it('times each move from the clock start, in order, numbering from 1', () => {
        let a = attempt();
        a = logHazardPuzzleMove(a, { kind: 'stage', uid: 'c1' }, START + 1_200);
        a = logHazardPuzzleMove(a, { kind: 'power', uid: 'c1', dieId: 'd4' }, START + 3_500);
        a = logHazardPuzzleMove(a, { kind: 'apply', uid: 'c1' }, START + 4_000);
        expect(a.moves).toEqual([
            { n: 1, kind: 'stage', uid: 'c1', ms: 1_200 },
            { n: 2, kind: 'power', uid: 'c1', ms: 3_500, dieId: 'd4' },
            { n: 3, kind: 'apply', uid: 'c1', ms: 4_000 },
        ]);
        // Only a power move carries a die.
        expect(a.moves[0].dieId).toBeUndefined();
    });

    it('a move before the start never times negative', () => {
        const a = logHazardPuzzleMove(attempt(), { kind: 'stage', uid: 'c1' }, START - 500);
        expect(a.moves[0].ms).toBe(0);
    });

    it('ends on a confirm with the solve time and the result, and ignores anything after', () => {
        let a = logHazardPuzzleMove(attempt(), { kind: 'stage', uid: 'c1' }, START + 1_000);
        a = endHazardPuzzleAttempt(a, { kind: 'confirm', cleared: true, reachedPercent: 100 }, START + 21_400);
        expect(a.end).toEqual({ kind: 'confirm', ms: 21_400, cleared: true, reachedPercent: 100 });
        expect(hazardPuzzleSolveSeconds(a)).toBe(21.4);
        // A log never grows after its end, and never ends twice.
        const after = endHazardPuzzleAttempt(
            logHazardPuzzleMove(a, { kind: 'stage', uid: 'c2' }, START + 30_000),
            { kind: 'expiry', cleared: false, reachedPercent: 10 },
            START + 40_000,
        );
        expect(after).toEqual(a);
    });

    it('ends on an expiry', () => {
        const a = endHazardPuzzleAttempt(attempt(), { kind: 'expiry', cleared: false, reachedPercent: 42 }, START + 60_000);
        expect(a.end).toMatchObject({ kind: 'expiry', cleared: false, reachedPercent: 42, ms: 60_000 });
    });

    it('a name typed later labels every logged attempt', () => {
        const named = nameHazardPuzzleSolver([attempt(''), attempt('')], 'playtester');
        expect(named.map((a) => a.solver)).toEqual(['playtester', 'playtester']);
    });

    it('copies as JSON under an attempts key', () => {
        const a = endHazardPuzzleAttempt(
            logHazardPuzzleMove(attempt(), { kind: 'stage', uid: 'c1' }, START + 900),
            { kind: 'confirm', cleared: false, reachedPercent: 50 },
            START + 5_000,
        );
        const parsed = JSON.parse(hazardPuzzleLogJson([a])) as { attempts: unknown[] };
        expect(parsed.attempts).toEqual([JSON.parse(JSON.stringify(a))]);
        expect(hazardPuzzleLogJson([])).toBe('{\n  "attempts": []\n}');
    });
});
