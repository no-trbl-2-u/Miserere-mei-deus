/**
 * Hazard puzzle candidates (HP4 A3, A4): a candidate carries a label, an
 * intended band and one nominated route; it is a valid layout drawn only
 * from the puzzle card pool, solvable on its route inside the solver
 * budget, and never held to the band its solver count gives.
 *
 * Fixture numbers are the demo cliff's (`hazard-puzzle.library.ts`): hand
 * LEAP, HAUL, SURE FOOTING, SCRAMBLE over a red, a blue and a purple die,
 * reserve SCRAMBLE; risk [5, 8] has 44 winning outcomes (best surplus 3), an
 * easy count; safe 17 has 32.
 */

import { describe, expect, it } from 'vitest';

import { auditHazardPuzzleCandidate, hazardPuzzleCandidateSetProblems } from '../hazard-puzzle.candidate-audit';
import { getHazardPuzzleCandidate, HAZARD_PUZZLE_CANDIDATES } from '../hazard-puzzle.candidates';
import { auditHazardPuzzleRoute } from '../hazard-puzzle.band';
import { getHazardPuzzleLayout, HAZARD_PUZZLE_LIBRARY } from '../hazard-puzzle.library';
import { HAZARD_PUZZLE_CARD_POOL } from '../hazard-puzzle.tuning';
import type { HazardPuzzleCandidate } from '../hazard-puzzle.types';
import { validateHazardPuzzleCandidate } from '../hazard-puzzle.validate';

const CLIFF = getHazardPuzzleLayout('demo-cliff-easy');

/** The cliff on risk, claimed hard and declaring hard bands the solver count does not give. */
const CLAIMED_HARD: HazardPuzzleCandidate = {
    ...CLIFF,
    id: 'fixture-candidate-cliff',
    label: 'four cards, one goal',
    intendedBand: 'hard',
    route: 'risk',
    bands: { safe: 'hard', risk: 'hard' },
};

function candidate(over: Partial<HazardPuzzleCandidate>): HazardPuzzleCandidate {
    return { ...CLAIMED_HARD, ...over };
}

describe('a candidate carries a label, an intended band and one route (A3)', () => {
    it('validates a well-formed candidate', () => {
        expect(validateHazardPuzzleCandidate(CLAIMED_HARD)).toEqual({ ok: true, reasons: [] });
    });

    it('rejects a blank label', () => {
        expect(validateHazardPuzzleCandidate(candidate({ label: '  ' })).reasons).toEqual([
            'label: a candidate needs a short label',
        ]);
    });

    it('rejects an intended band or route outside the set', () => {
        const bad = candidate({
            intendedBand: 'brutal' as HazardPuzzleCandidate['intendedBand'],
            route: 'middle' as HazardPuzzleCandidate['route'],
        });
        expect(validateHazardPuzzleCandidate(bad).reasons).toEqual([
            'intendedBand: "brutal" is not easy, medium or hard',
            'route: "middle" is not safe or risk',
        ]);
    });

    it('carries the layout checks: a card outside the pool fails', () => {
        expect(HAZARD_PUZZLE_CARD_POOL).not.toContain('crack');
        const reasons = validateHazardPuzzleCandidate(candidate({ hand: [...CLIFF.hand, 'crack'] })).reasons;
        expect(reasons).toContain('hand[4]: "crack" is not in the puzzle card pool');
    });

    it('looks up by id, and an unknown id throws', () => {
        expect(getHazardPuzzleCandidate(CLAIMED_HARD.id, [CLAIMED_HARD])).toBe(CLAIMED_HARD);
        expect(() => getHazardPuzzleCandidate('nope')).toThrow(/Unknown hazard puzzle candidate/);
    });
});

describe('the candidate check (A4)', () => {
    it('passes a solvable candidate on its route without reading its band', () => {
        const audit = auditHazardPuzzleCandidate(CLAIMED_HARD);
        expect(audit.problems).toEqual([]);
        expect(audit.solution?.winningOutcomes).toBe(44);
        expect(audit.replayCleared).toBe(true);
        // The same layout, held to its declared band the library way, fails.
        expect(auditHazardPuzzleRoute(CLAIMED_HARD, 'risk').problems).toEqual([
            'declared hard, measured easy (44 outcomes, best surplus 3)',
        ]);
    });

    it('solves the nominated route only', () => {
        const safe = auditHazardPuzzleCandidate(candidate({ route: 'safe' }));
        expect(safe.solution?.winningOutcomes).toBe(32);
    });

    it('fails an unsolvable candidate', () => {
        const audit = auditHazardPuzzleCandidate(candidate({ goals: { safe: 17, risk: [50, 50] } }));
        expect(audit.problems).toEqual(['risk: unsolvable']);
        expect(audit.replayCleared).toBe(false);
    });

    it('fails a candidate too open to count inside the solver budget', () => {
        const audit = auditHazardPuzzleCandidate(CLAIMED_HARD, { budget: 5 });
        expect(audit.solution?.overBudget).toBe(true);
        expect(audit.problems[0]).toMatch(/^risk: too open to count/);
    });

    it('fails an invalid candidate without solving it', () => {
        const audit = auditHazardPuzzleCandidate(candidate({ hand: ['crack'] }));
        expect(audit.solution).toBeNull();
        expect(audit.problems).toEqual(['hand[0]: "crack" is not in the puzzle card pool']);
    });

    it('flags a repeated id or label, and an id the library already uses', () => {
        const twin = candidate({ id: 'fixture-candidate-twin' });
        const demo = candidate({ id: 'demo-cliff-easy', label: 'another label' });
        expect(hazardPuzzleCandidateSetProblems([CLAIMED_HARD, twin, demo], ['demo-cliff-easy'])).toEqual([
            'label "four cards, one goal" is used by 2 candidates',
            'id "demo-cliff-easy" is already a library layout id',
        ]);
    });
});

describe('the candidate set (A3, A4)', () => {
    const libraryIds = HAZARD_PUZZLE_LIBRARY.map((l) => l.id);

    it('is typed and has no set-level problems', () => {
        expect(Array.isArray(HAZARD_PUZZLE_CANDIDATES)).toBe(true);
        expect(hazardPuzzleCandidateSetProblems(HAZARD_PUZZLE_CANDIDATES, libraryIds)).toEqual([]);
    });

    for (const c of HAZARD_PUZZLE_CANDIDATES) {
        it(`${c.id} (${c.intendedBand}, ${c.route}): "${c.label}" passes the candidate check`, () => {
            const audit = auditHazardPuzzleCandidate(c);
            expect(audit.problems).toEqual([]);
            expect(audit.solution?.overBudget).toBe(false);
            expect(audit.solution?.winningOutcomes).toBeGreaterThan(0);
        });
    }
});
