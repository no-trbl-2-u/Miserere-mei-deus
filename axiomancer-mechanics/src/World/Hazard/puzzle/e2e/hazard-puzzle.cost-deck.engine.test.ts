/**
 * The five cost cards (HP5a): hazard cards that trade meter points for a
 * utility, in `HAZARD_DECK` and the puzzle card pool, never in the live
 * three-round hazard.
 *
 * Card numbers (free / powered, FORCE / ESCAPE):
 *  - WAYFARER'S TITHE (`tithe`), purple Toll: -1/-1 free, 0/0 powered, DRAW 2;
 *  - TURN THE STONES (`stones`), red Toll: -2/0 free, 0/0 powered, reroll 1 (2 powered);
 *  - PAWNED BREATH (`pawn`), purple Debt: -2/-2 both lines, DRAW 2 (3 powered), +1 gold die when powered;
 *  - BREAKNECK HAUL (`breakneck`), red Overdrive: 3/0 free, 6/-3 powered, +1 blue die and DRAW 1 when powered;
 *  - HEADLONG DIVE (`headlong`), blue Overdrive: 0/3 free, -3/7 powered, +1 red die and reroll 1 when powered.
 */

import { describe, expect, it } from 'vitest';

import { validateHazardCardDef } from '../../hazard.card-validate';
import { getHazardCardDef, HAZARD_DECK, HAZARD_KEYWORDS, hazardLiveDeck } from '../../hazard.content';
import { hazardStarterBag } from '../../hazard.deck-flags';
import type { HazardCardDef } from '../../hazard.types';
import {
    hazardPuzzleDominatedCards,
    hazardPuzzleUnusedCards,
} from '../hazard-puzzle.dominance';
import { HAZARD_PUZZLE_LIBRARY } from '../hazard-puzzle.library';
import { solveHazardPuzzle } from '../hazard-puzzle.solver';
import { HAZARD_PUZZLE_CARD_POOL } from '../hazard-puzzle.tuning';
import type { HazardPuzzleLayout } from '../hazard-puzzle.types';
import { validateHazardPuzzleLayout } from '../hazard-puzzle.validate';
import { testLayout } from './hazard-puzzle.layouts.mock';

const COST_IDS = ['tithe', 'stones', 'pawn', 'breakneck', 'headlong'];
const COST_CARDS: HazardCardDef[] = COST_IDS.map(getHazardCardDef);
const UTILITIES = ['draw', 'gainDie', 'reroll', 'convert'];

const poweredF = (c: HazardCardDef): number => c.fp ?? c.f;
const poweredE = (c: HazardCardDef): number => c.ep ?? c.e;
const isToll = (c: HazardCardDef): boolean => Math.min(c.f, c.e) < 0 && Math.min(poweredF(c), poweredE(c)) >= 0;
const isDebt = (c: HazardCardDef): boolean => Math.min(c.f, c.e) < 0 && Math.min(poweredF(c), poweredE(c)) < 0;
const isOverdrive = (c: HazardCardDef): boolean =>
    Math.min(c.f, c.e) >= 0 && Math.min(poweredF(c), poweredE(c)) < 0 && c.poweredEffect !== undefined;

/** Every reroll card here turns dice to these faces, in order. */
const FACES: HazardPuzzleLayout['dice'] = ['gold', 'red', 'blue'];

/**
 * One layout per cost card, each on the risk route, where the card earns its
 * place: some winning outcome stages it, and no pool card in its place keeps
 * every winning outcome.
 */
const COST_LIBRARY: HazardPuzzleLayout[] = [
    testLayout({ id: 'cost-tithe', hand: ['tithe', 'scram'], reserve: ['haul', 'haul'], dice: ['gold', 'purple', 'hex'], rerollFaces: FACES, goals: { safe: 1, risk: [6, 6] } }),
    testLayout({ id: 'cost-stones', hand: ['stones', 'footing'], dice: ['red', 'hex'], rerollFaces: FACES, goals: { safe: 1, risk: [2, 2] } }),
    testLayout({ id: 'cost-pawn', hand: ['pawn', 'grip'], reserve: ['leap'], dice: ['blue', 'red', 'purple'], rerollFaces: FACES, goals: { safe: 1, risk: [6, 6] } }),
    testLayout({ id: 'cost-breakneck', hand: ['breakneck', 'leap'], reserve: ['haul'], dice: ['red', 'blue'], rerollFaces: FACES, goals: { safe: 1, risk: [6, 6] } }),
    testLayout({ id: 'cost-headlong', hand: ['headlong', 'oath'], dice: ['purple', 'blue'], rerollFaces: FACES, goals: { safe: 1, risk: [2, 8] } }),
];

describe('five cost cards (HP5 A1)', () => {
    it('are in HAZARD_DECK, each validating, with a cost, a utility, a name and a flavour line', () => {
        for (const c of COST_CARDS) {
            expect(HAZARD_DECK, c.id).toContain(c);
            expect(validateHazardCardDef(c), c.id).toEqual({ ok: true, reasons: [] });
            expect(Math.min(c.f, c.e, poweredF(c), poweredE(c)), c.id).toBeLessThan(0);
            expect(UTILITIES, c.id).toContain(c.effect);
            expect(c.name.length, c.id).toBeGreaterThan(0);
            expect(c.flavor.length, c.id).toBeGreaterThan(0);
        }
    });

    it('hold two Tolls, one Debt and two Overdrives', () => {
        expect(COST_CARDS.filter(isToll).map((c) => c.id)).toEqual(['tithe', 'stones']);
        expect(COST_CARDS.filter(isDebt).map((c) => c.id)).toEqual(['pawn']);
        expect(COST_CARDS.filter(isOverdrive).map((c) => c.id)).toEqual(['breakneck', 'headlong']);
    });

    it('are red, blue and purple, never gold', () => {
        expect(new Set(COST_CARDS.map((c) => c.kind))).toEqual(new Set(['red', 'blue', 'purple']));
    });

    it('print only existing keywords: the glossary is unchanged', () => {
        for (const c of COST_CARDS) for (const k of c.keywords) expect(HAZARD_KEYWORDS, c.id).toHaveProperty(k);
        expect(Object.keys(HAZARD_KEYWORDS).sort()).toEqual(
            ['convert', 'crack', 'draw', 'escape', 'force', 'gilded', 'recast', 'salvage', 'surge'],
        );
    });
});

describe('the live hazard never draws them; puzzles do (HP5 A2)', () => {
    it('the live draw bag is unchanged', () => {
        expect(hazardStarterBag()).toEqual([
            'haul', 'grip', 'scram', 'runner', 'leap',
            'footing', 'footing', 'footing', 'windread', 'windread', 'pole', 'pole', 'oath', 'blessing',
        ]);
    });

    it('the live deck leaves out every puzzle-only card, and only those', () => {
        expect(hazardLiveDeck().map((c) => c.id)).toEqual(HAZARD_DECK.filter((c) => !c.puzzleOnly).map((c) => c.id));
        for (const id of COST_IDS) expect(hazardLiveDeck().map((c) => c.id)).not.toContain(id);
        expect(COST_CARDS.every((c) => c.puzzleOnly === true)).toBe(true);
    });

    it('are in the puzzle card pool, and the solver plays each one', () => {
        for (const id of COST_IDS) expect(HAZARD_PUZZLE_CARD_POOL).toContain(id);
        for (const layout of COST_LIBRARY) {
            expect(validateHazardPuzzleLayout(layout), layout.id).toEqual({ ok: true, reasons: [] });
            const solution = solveHazardPuzzle(layout, 'risk');
            expect(solution.winningOutcomes, layout.id).toBeGreaterThan(0);
        }
    });
});

describe('no cost card is a worse copy (HP5 A3)', () => {
    it('no demo library card is dominated with the five in the pool', () => {
        expect(hazardPuzzleDominatedCards(HAZARD_PUZZLE_LIBRARY)).toEqual([]);
    });

    it('each cost card wins somewhere it is held, and no pool card beats it everywhere', () => {
        expect(hazardPuzzleUnusedCards(COST_LIBRARY).filter((id) => COST_IDS.includes(id))).toEqual([]);
        const dominated = hazardPuzzleDominatedCards(COST_LIBRARY).filter((d) => COST_IDS.includes(d.cardId));
        expect(dominated).toEqual([]);
    });
});
