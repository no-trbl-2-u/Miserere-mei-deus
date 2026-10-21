/**
 * Hazard puzzle candidates (HP4 A3-A7): a candidate carries a label, an
 * intended band and one nominated route; it is a valid layout drawn only
 * from the puzzle card pool, solvable on its route inside the solver
 * budget, and never held to the band its solver count gives. The authored
 * thirty are ten per band with distinct labels across three or more
 * regions; none is `forced` or `free` on its route, and their optional-card
 * and losing-first-play counts each take four or more values.
 *
 * Fixture numbers are the demo cliff's (`hazard-puzzle.library.ts`): hand
 * LEAP, HAUL, SURE FOOTING, SCRAMBLE over a red, a blue and a purple die,
 * reserve SCRAMBLE; risk [5, 8] has 44 winning outcomes (best surplus 3), an
 * easy count; safe 17 has 32.
 */

import { describe, expect, it } from 'vitest';

import { auditHazardPuzzleCandidate, hazardPuzzleCandidateSetProblems } from '../hazard-puzzle.candidate-audit';
import { getHazardPuzzleCandidate, HAZARD_PUZZLE_CANDIDATES } from '../hazard-puzzle.candidates';
import { auditHazardPuzzleRoute, hazardPuzzleBandOf } from '../hazard-puzzle.band';
import { getHazardPuzzleLayout, HAZARD_PUZZLE_LIBRARY } from '../hazard-puzzle.library';
import { hazardPuzzleCardReport } from '../hazard-puzzle.report';
import { solveHazardPuzzle } from '../hazard-puzzle.solver';
import { HAZARD_PUZZLE_CARD_POOL } from '../hazard-puzzle.tuning';
import type { HazardPuzzleCandidate } from '../hazard-puzzle.types';
import { HAZARD_PUZZLE_REGIONS, validateHazardPuzzleCandidate } from '../hazard-puzzle.validate';
import { HAZARD_LIBRARY } from '../../hazard.content';

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

describe('the thirty (A5)', () => {
    it('holds ten candidates per intended band', () => {
        const count = (band: string): number => HAZARD_PUZZLE_CANDIDATES.filter((c) => c.intendedBand === band).length;
        expect([count('easy'), count('medium'), count('hard')]).toEqual([10, 10, 10]);
        expect(HAZARD_PUZZLE_CANDIDATES).toHaveLength(30);
    });

    it('gives every candidate a distinct, non-empty label', () => {
        const labels = HAZARD_PUZZLE_CANDIDATES.map((c) => c.label.trim());
        expect(labels.every((l) => l.length > 0)).toBe(true);
        expect(new Set(labels).size).toBe(labels.length);
    });

    it('spans at least three of the four Act 1 regions', () => {
        const regions = new Set(HAZARD_PUZZLE_CANDIDATES.map((c) => c.region));
        for (const r of regions) expect(HAZARD_PUZZLE_REGIONS).toContain(r);
        expect(regions.size).toBeGreaterThanOrEqual(3);
    });
});

describe('decision pressure on the nominated route (A6)', () => {
    const reports = HAZARD_PUZZLE_CANDIDATES.map((c) => ({ c, report: hazardPuzzleCardReport(c, c.route) }));

    for (const { c, report } of reports) {
        it(`${c.id} is neither forced nor free on ${c.route}, with a first play that loses`, () => {
            expect(report.overBudget).toBe(false);
            expect(report.pressure.finding).toBeNull();
            expect(report.pressure.firstPlays.losing).toBeGreaterThan(0);
            expect(report.pressure.firstPlays.winning).toBeGreaterThan(0);
        });
    }

    it('spreads the optional-card count and the losing-first-play count over four values or more', () => {
        const optional = new Set(reports.map(({ report }) => report.pressure.optional));
        const losing = new Set(reports.map(({ report }) => report.pressure.firstPlays.losing));
        expect(optional.size).toBeGreaterThanOrEqual(4);
        expect(losing.size).toBeGreaterThanOrEqual(4);
    });
});

describe('pool cards and live copy only (A7)', () => {
    for (const c of HAZARD_PUZZLE_CANDIDATES) {
        it(`${c.id} draws only pool cards and reuses a live hazard's copy`, () => {
            for (const id of [...c.hand, ...c.reserve]) expect(HAZARD_PUZZLE_CARD_POOL).toContain(id);
            expect(c.unlocks).toEqual([]);
            const hazard = HAZARD_LIBRARY.find((h) => h.id === c.hazardId);
            expect(hazard).toBeDefined();
            expect(c.title).toBe(hazard?.title);
        });
    }
});

describe('declared bands record what the solver measures', () => {
    for (const c of HAZARD_PUZZLE_CANDIDATES) {
        it(`${c.id} declares the solver's band on both routes`, () => {
            for (const route of ['safe', 'risk'] as const) {
                const s = solveHazardPuzzle(c, route);
                expect(hazardPuzzleBandOf(s.winningOutcomes, s.bestSurplus)).toBe(c.bands[route]);
            }
        });
    }
});
