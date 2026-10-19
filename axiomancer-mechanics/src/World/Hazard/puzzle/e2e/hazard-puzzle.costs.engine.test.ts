/**
 * Hazard puzzle costs and utilities — signed card values, the `gainDie`
 * and `reroll` effects, DRAW and CONVERT on cards that carry a cost, and
 * the deck and glossary left untouched. Every cost or new-utility card
 * here is a test-only fixture (`hazard-puzzle.cost-cards.mock.ts`).
 *
 * Deck numbers used below (free / powered): HAUL red 3/6 force; SCRAMBLE
 * blue 3/6 escape; IRON GRIP red 5/9 force; FAITH LEAP blue 5/9 escape;
 * CLIFFRUNNER blue 3/6 escape.
 */

import { describe, expect, it } from 'vitest';

import { HAZARD_DECK, HAZARD_KEYWORDS } from '../../hazard.content';
import { hazardCardValue, hazardProjectedProgress } from '../../hazard.engine';
import { hazardPuzzleOutcome } from '../hazard-puzzle.outcome';
import { hazardPuzzleCardReport } from '../hazard-puzzle.report';
import {
    applyHazardPuzzleCard,
    confirmHazardPuzzle,
    createHazardPuzzleSession,
    playHazardPuzzleMoves,
} from '../hazard-puzzle.session';
import { solveHazardPuzzle } from '../hazard-puzzle.solver';
import { HAZARD_PUZZLE_FAILURE } from '../hazard-puzzle.tuning';
import type { HazardPuzzleLayout, HazardPuzzleMove } from '../hazard-puzzle.types';
import { validateHazardPuzzleLayout } from '../hazard-puzzle.validate';
import { FIXTURE_CARDS, useHazardFixtureCards } from './hazard-puzzle.cost-cards.mock';
import { testLayout } from './hazard-puzzle.layouts.mock';

const DECK_IDS_AT_LOAD = HAZARD_DECK.map((c) => c.id);

function diceOf(layout: HazardPuzzleLayout, moves: HazardPuzzleMove[]) {
    return playHazardPuzzleMoves(createHazardPuzzleSession(layout, 'safe'), moves).board.dice.map((d) => [
        d.kind,
        d.state,
        d.temporary === true,
    ]);
}

describe('signed card values (A6)', () => {
    useHazardFixtureCards();

    it('a cost reads as a negative value on the free line, the powered line or both', () => {
        expect(hazardCardValue({ uid: 'x', cardId: 'fx-toll', dieId: null })).toEqual({ force: -1, escape: -1 });
        expect(hazardCardValue({ uid: 'x', cardId: 'fx-toll', dieId: 'd' })).toEqual({ force: 0, escape: 0 });
        expect(hazardCardValue({ uid: 'x', cardId: 'fx-surge-cost', dieId: null })).toEqual({ force: 3, escape: 0 });
        expect(hazardCardValue({ uid: 'x', cardId: 'fx-surge-cost', dieId: 'd' })).toEqual({ force: 6, escape: -2 });
        expect(hazardCardValue({ uid: 'x', cardId: 'fx-greed', dieId: null })).toEqual({ force: -3, escape: -3 });
        expect(hazardCardValue({ uid: 'x', cardId: 'fx-greed', dieId: 'd' })).toEqual({ force: -3, escape: -3 });
    });

    it('a meter goes below 0 and is never clamped; p is 0 and the outcome pays the full shortfall', () => {
        // GREED alone: -3/-3, and its DRAW finds an empty reserve.
        const layout = testLayout({ id: 'cost-greed-alone', hand: ['fx-greed'], goals: { safe: 4, risk: [2, 2] } });
        for (const route of ['safe', 'risk'] as const) {
            const s = playHazardPuzzleMoves(createHazardPuzzleSession(layout, route), [{ type: 'stage', uid: 'c1' }]);
            expect(hazardProjectedProgress(s.board)).toEqual({ force: -3, escape: -3 });
            const result = confirmHazardPuzzle(s).result!;
            expect(result).toMatchObject({ force: -3, escape: -3, p: 0, cleared: false });
            const outcome = hazardPuzzleOutcome({ route, result, playerLevel: 1, region: 'breakwater', seed: 1 });
            expect(outcome).toMatchObject({ p: 0, completed: false, shillings: 0 });
            expect(outcome.vitaeLoss).toBe(HAZARD_PUZZLE_FAILURE.maxVitaeLoss[route]);
            expect(outcome.scar).toBe(HAZARD_PUZZLE_FAILURE.scar);
        }
    });

    it('a powered-line cost lowers the other meter only when a die is applied', () => {
        // SURGE COST + SCRAMBLE: 3 + 0 force, 0 + 3 escape free; powered 6 force, -2 + 3 escape.
        const layout = testLayout({ id: 'cost-surge', hand: ['fx-surge-cost', 'scram'], dice: ['red'] });
        const staged = playHazardPuzzleMoves(createHazardPuzzleSession(layout, 'risk'), [
            { type: 'stage', uid: 'c1' },
            { type: 'stage', uid: 'c2' },
        ]);
        expect(hazardProjectedProgress(staged.board)).toEqual({ force: 3, escape: 3 });
        const powered = playHazardPuzzleMoves(staged, [{ type: 'power', uid: 'c1', dieId: 'd3' }]);
        expect(hazardProjectedProgress(powered.board)).toEqual({ force: 6, escape: 1 });
    });
});

describe('gainDie (A7)', () => {
    useHazardFixtureCards();

    it('unpowered adds gainDieBase temporary dice of the card colour', () => {
        const layout = testLayout({ id: 'die-minor', hand: ['fx-gain-die'], dice: ['red'] });
        expect(diceOf(layout, [{ type: 'stage', uid: 'c1' }, { type: 'apply', uid: 'c1' }])).toEqual([
            ['red', 'available', false],
            ['purple', 'available', true],
        ]);
    });

    it('powered adds gainDiePowered dice; the die that powered it stays spent', () => {
        const layout = testLayout({ id: 'die-major', hand: ['fx-gain-die'], dice: ['purple'] });
        const moves: HazardPuzzleMove[] = [
            { type: 'stage', uid: 'c1' },
            { type: 'power', uid: 'c1', dieId: 'd2' },
            { type: 'apply', uid: 'c1' },
        ];
        expect(diceOf(layout, moves)).toEqual([
            ['purple', 'spent', false],
            ['purple', 'available', true],
            ['purple', 'available', true],
        ]);
    });

    it('gainDieKind sets the colour; a base of 0 adds nothing until powered', () => {
        const layout = testLayout({ id: 'die-kind', hand: ['fx-surge-cost'], dice: ['red'] });
        expect(diceOf(layout, [{ type: 'stage', uid: 'c1' }, { type: 'apply', uid: 'c1' }])).toEqual([
            ['red', 'available', false],
        ]);
        expect(
            diceOf(layout, [
                { type: 'stage', uid: 'c1' },
                { type: 'power', uid: 'c1', dieId: 'd2' },
                { type: 'apply', uid: 'c1' },
            ]),
        ).toEqual([
            ['red', 'spent', false],
            ['blue', 'available', true],
        ]);
    });

    it('a gold majorEffect card adds the powered amount with or without a die', () => {
        const layout = testLayout({ id: 'die-gold', hand: ['fx-gold-die'], dice: ['gold'] });
        expect(diceOf(layout, [{ type: 'stage', uid: 'c1' }, { type: 'apply', uid: 'c1' }])).toEqual([
            ['gold', 'available', false],
            ['gold', 'available', true],
            ['gold', 'available', true],
        ]);
        expect(
            diceOf(layout, [
                { type: 'stage', uid: 'c1' },
                { type: 'power', uid: 'c1', dieId: 'd2' },
                { type: 'apply', uid: 'c1' },
            ]),
        ).toEqual([
            ['gold', 'spent', false],
            ['gold', 'available', true],
            ['gold', 'available', true],
        ]);
    });
});

describe('reroll to set faces (A8)', () => {
    useHazardFixtureCards();

    const MINOR = testLayout({
        id: 'reroll-minor',
        hand: ['fx-reroll'],
        dice: ['hex', 'red', 'hex'],
        rerollFaces: ['gold', 'blue', 'red'],
    });

    const MAJOR = testLayout({
        id: 'reroll-major',
        hand: ['fx-reroll'],
        dice: ['purple', 'hex', 'red', 'hex'],
        rerollFaces: ['gold', 'blue'],
    });

    const MAJOR_LINE: HazardPuzzleMove[] = [
        { type: 'stage', uid: 'c1' },
        { type: 'power', uid: 'c1', dieId: 'd2' },
        { type: 'apply', uid: 'c1' },
    ];

    it('unpowered turns the first available die to the next face', () => {
        const s = playHazardPuzzleMoves(createHazardPuzzleSession(MINOR, 'safe'), [
            { type: 'stage', uid: 'c1' },
            { type: 'apply', uid: 'c1' },
        ]);
        expect(s.board.dice.map((d) => [d.id, d.kind, d.state])).toEqual([
            ['d2', 'gold', 'available'],
            ['d3', 'red', 'available'],
            ['d4', 'hex', 'available'],
        ]);
        expect(s.board.rerollFaces).toEqual(['blue', 'red']);
    });

    it('powered turns every available die, in die order, until the faces run out', () => {
        const s = playHazardPuzzleMoves(createHazardPuzzleSession(MAJOR, 'safe'), MAJOR_LINE);
        expect(s.board.dice.map((d) => [d.kind, d.state])).toEqual([
            ['purple', 'spent'],
            ['gold', 'available'],
            ['blue', 'available'],
            ['hex', 'available'],
        ]);
        expect(s.board.rerollFaces).toEqual([]);
    });

    it('with no faces left (or none set) every die keeps its face', () => {
        const s = createHazardPuzzleSession(MINOR, 'safe');
        const bare = { ...s, board: { ...s.board, rerollFaces: undefined } };
        const staged = playHazardPuzzleMoves(bare, [{ type: 'stage', uid: 'c1' }]);
        const applied = applyHazardPuzzleCard(staged, 'c1');
        expect(applied.board.dice.map((d) => d.kind)).toEqual(['hex', 'red', 'hex']);
    });

    it('the validator rejects a layout holding a reroll card with no rerollFaces', () => {
        expect(validateHazardPuzzleLayout(MINOR).ok).toBe(true);
        for (const layout of [
            testLayout({ id: 'reroll-bare', hand: ['fx-reroll'] }),
            testLayout({ id: 'reroll-empty', hand: ['fx-reroll'], rerollFaces: [] }),
            testLayout({ id: 'reroll-reserve', hand: ['haul'], reserve: ['fx-reroll'] }),
        ]) {
            const check = validateHazardPuzzleLayout(layout);
            expect(check.ok).toBe(false);
            expect(check.reasons.join(' ')).toMatch(/declares no rerollFaces/);
        }
    });

    it('a reroll line replays to the same board twice; no RNG is read', () => {
        const a = playHazardPuzzleMoves(createHazardPuzzleSession(MAJOR, 'safe'), MAJOR_LINE);
        const b = playHazardPuzzleMoves(createHazardPuzzleSession(MAJOR, 'safe'), MAJOR_LINE);
        expect(b).toEqual(a);
        expect(a.board.rng).toEqual({ s: 0 });
        expect(solveHazardPuzzle(MAJOR, 'safe')).toEqual(solveHazardPuzzle(MAJOR, 'safe'));
    });
});

describe('DRAW and CONVERT on cards with a cost (A9)', () => {
    useHazardFixtureCards();

    // F3: TOLL (-1/-1, DRAW 2) is the only way to the reserve. The one win
    // powers TOLL to cancel its cost and draws IRON GRIP and FAITH LEAP.
    const F3 = testLayout({
        id: 'cost-f3',
        hand: ['haul', 'scram', 'fx-toll'],
        reserve: ['grip', 'leap'],
        dice: ['red', 'blue', 'purple'],
        goals: { safe: 24, risk: [12, 12] },
    });

    it('F3: a layout solvable only with the cost-DRAW card', () => {
        const solution = solveHazardPuzzle(F3, 'risk');
        expect(solution).toMatchObject({ winningOutcomes: 1, bestSurplus: 0, overBudget: false });
        const toll = hazardPuzzleCardReport(F3, 'risk').cards.find((c) => c.cardId === 'fx-toll');
        expect(toll).toMatchObject({ staged: 1, total: 1, required: true });
        const withoutToll = { ...F3, id: 'cost-f3-no-toll', hand: ['haul', 'scram'] };
        expect(solveHazardPuzzle(withoutToll, 'risk').winningOutcomes).toBe(0);
    });

    // F4: GREED (-3/-3 on both lines, DRAW 2) pulls two ESCAPE cards. On the
    // hard goal its FORCE cost always loses; on an easier goal it can pay.
    const F4_HAND = ['haul', 'scram', 'grip', 'leap', 'fx-greed'];
    const F4_RESERVE = ['runner', 'scram'];

    it('F4: the both-lines cost card is unused on the hard goal and staged on an easier one', () => {
        const hard = testLayout({ id: 'cost-f4-hard', hand: F4_HAND, reserve: F4_RESERVE, dice: ['red', 'blue'], goals: { safe: 24, risk: [12, 12] } });
        const easier = { ...hard, id: 'cost-f4-easier', goals: { safe: 18, risk: [9, 9] as [number, number] } };
        const greedHard = hazardPuzzleCardReport(hard, 'risk').cards.find((c) => c.cardId === 'fx-greed')!;
        expect(greedHard.total).toBeGreaterThan(0);
        expect(greedHard).toMatchObject({ staged: 0, unused: true });
        const greedEasier = hazardPuzzleCardReport(easier, 'risk').cards.find((c) => c.cardId === 'fx-greed')!;
        expect(greedEasier.staged).toBeGreaterThan(0);
        expect(greedEasier.required).toBe(false);
    });

    it('CONVERT fires on a card that carries a cost', () => {
        const layout = testLayout({ id: 'cost-convert', hand: ['fx-cost-convert'], dice: ['hex', 'hex'] });
        const s = playHazardPuzzleMoves(createHazardPuzzleSession(layout, 'safe'), [
            { type: 'stage', uid: 'c1' },
            { type: 'apply', uid: 'c1' },
        ]);
        expect(s.board.dice.map((d) => d.kind)).toEqual(['gold', 'hex']);
        expect(hazardProjectedProgress(s.board)).toEqual({ force: -1, escape: -1 });
    });
});

describe('no card and no keyword is added (A10)', () => {
    it('the fixture cards leave HAZARD_DECK after each test; the glossary is unchanged', () => {
        expect(HAZARD_DECK.map((c) => c.id)).toEqual(DECK_IDS_AT_LOAD);
        for (const card of FIXTURE_CARDS) expect(HAZARD_DECK).not.toContain(card);
        expect(HAZARD_DECK.some((c) => c.effect === 'gainDie' || c.effect === 'reroll')).toBe(false);
        expect(Object.keys(HAZARD_KEYWORDS).sort()).toEqual(
            ['convert', 'crack', 'draw', 'escape', 'force', 'gilded', 'recast', 'salvage', 'surge'],
        );
    });
});
