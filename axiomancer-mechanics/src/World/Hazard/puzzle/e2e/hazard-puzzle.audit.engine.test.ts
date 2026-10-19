/**
 * Hazard puzzle card audit and pool (HP2 A1, A2).
 *
 * Fixture cards below are built here and never registered: the audit reads
 * card defs directly. Two cards that differ only in name, flavour, keywords,
 * salvage, rarity or weight play the same in a puzzle.
 */

import { describe, expect, it } from 'vitest';

import { getHazardCardDef, HAZARD_CRACK_CARD, HAZARD_DECK } from '../../hazard.content';
import type { HazardCardDef } from '../../hazard.types';
import {
    hazardPuzzleCardAudit,
    hazardPuzzleCardBan,
    hazardPuzzleCardGroups,
    hazardPuzzleCardShape,
    hazardPuzzleLibraryUse,
} from '../hazard-puzzle.audit';
import { HAZARD_PUZZLE_LIBRARY } from '../hazard-puzzle.library';
import { HAZARD_PUZZLE_CARD_POOL } from '../hazard-puzzle.tuning';
import type { HazardPuzzleLayout, HazardPuzzleUnlock } from '../hazard-puzzle.types';
import { validateHazardPuzzleLayout } from '../hazard-puzzle.validate';
import { testLayout } from './hazard-puzzle.layouts.mock';

function card(over: Partial<HazardCardDef> & Pick<HazardCardDef, 'id'>): HazardCardDef {
    return { name: over.id, kind: 'blue', rarity: 'common', f: 0, e: 3, fp: 0, ep: 6, flavor: '', keywords: [], ...over };
}

const A = card({ id: 'a', salvage: { type: 'mana' }, weight: 1 });
const A_TWIN = card({ id: 'a-twin', name: 'OTHER', flavor: 'x', keywords: ['escape'], rarity: 'rare', weight: 3, salvage: { type: 'progress', key: 'escape', amount: 1 } });
const A_STRONGER = card({ id: 'a-stronger', ep: 7 });
const A_RED = card({ id: 'a-red', kind: 'red' });
const DRAW_1 = card({ id: 'draw-1', kind: 'purple', effect: 'draw', drawBase: 1, drawPowered: 2 });
const DRAW_2 = card({ id: 'draw-2', kind: 'purple', effect: 'draw', drawBase: 2, drawPowered: 2 });
const DRAW_1_TWIN = card({ id: 'draw-1-twin', kind: 'purple', effect: 'draw', drawBase: 1, drawPowered: 2, weight: 9 });
const MAJOR = card({ id: 'major', kind: 'purple', effect: 'draw', drawBase: 1, drawPowered: 2, majorEffect: true });
const RECAST = card({ id: 'recast', kind: 'purple', effect: 'recast' });
const DEAD = card({ id: 'dead', kind: 'purple', f: 0, e: 0, fp: 0, ep: 0, dead: true });

describe('the puzzle shape (A1)', () => {
    it('drops the label fields and the fields puzzles ignore', () => {
        expect(hazardPuzzleCardShape(A)).toEqual({ e: 3, ep: 6, f: 0, fp: 0, kind: 'blue' });
        expect(hazardPuzzleCardShape(A_TWIN)).toEqual(hazardPuzzleCardShape(A));
    });

    it('keeps colour, values, the utility, its amounts, majorEffect and dead', () => {
        expect(hazardPuzzleCardShape(MAJOR)).toEqual({
            drawBase: 1, drawPowered: 2, e: 3, effect: 'draw', ep: 6, f: 0, fp: 0, kind: 'purple', majorEffect: true,
        });
        expect(hazardPuzzleCardShape(DEAD)).toMatchObject({ dead: true });
    });
});

describe('identical-behaviour groups (A1)', () => {
    it('groups cards with an equal puzzle shape, in input order', () => {
        expect(hazardPuzzleCardGroups([A, A_STRONGER, A_TWIN, A_RED, DRAW_1, DRAW_2, DRAW_1_TWIN, MAJOR])).toEqual([
            ['a', 'a-twin'],
            ['a-stronger'],
            ['a-red'],
            ['draw-1', 'draw-1-twin'],
            ['draw-2'],
            ['major'],
        ]);
    });

    it('puts SCRAMBLE and CLIFFRUNNER in one group, and nothing else in the deck shares one', () => {
        const groups = hazardPuzzleCardGroups([...HAZARD_DECK, HAZARD_CRACK_CARD]);
        expect(groups.filter((g) => g.length > 1)).toEqual([['scram', 'runner']]);
    });
});

describe('bans (A1)', () => {
    it('bans RE-CAST and dead cards, and nothing else', () => {
        expect(hazardPuzzleCardBan(RECAST)).toMatch(/RE-CAST/);
        expect(hazardPuzzleCardBan(DEAD)).toMatch(/dead/);
        expect(hazardPuzzleCardBan(A)).toBeNull();
        expect(hazardPuzzleCardBan(DRAW_1)).toBeNull();
    });
});

describe('the recommendation (A1)', () => {
    it('keeps the first card of each group, cuts its twins and every banned card', () => {
        const rows = hazardPuzzleCardAudit([A, A_TWIN, RECAST, DEAD, DRAW_1, DRAW_1_TWIN], []);
        expect(rows.map((r) => [r.def.id, r.keep, r.libraryUse])).toEqual([
            ['a', true, 'absent'],
            ['a-twin', false, 'absent'],
            ['recast', false, 'absent'],
            ['dead', false, 'absent'],
            ['draw-1', true, 'absent'],
            ['draw-1-twin', false, 'absent'],
        ]);
        expect(rows[0].reason).toBe('stands for its group (a, a-twin)');
        expect(rows[1].reason).toBe('plays the same as a in every puzzle');
        expect(rows[2].reason).toMatch(/^banned \(RE-CAST/);
    });

    it('a banned card does not stand for its group', () => {
        const recastTwin = { ...RECAST, id: 'recast-twin' };
        const rows = hazardPuzzleCardAudit([RECAST, recastTwin], []);
        expect(rows.map((r) => r.keep)).toEqual([false, false]);
        expect(rows[1].reason).toMatch(/^banned/);
    });
});

describe('library use (A1)', () => {
    it('reads required, unused, mixed and absent across the library', () => {
        // Free values only (no dice): GRIP 5/0, SCRAMBLE 0/3, FAITH LEAP 0/5, DEAD-MAN HAUL 3/0.
        // both: safe 8 and risk [5, 3] each need GRIP + SCRAMBLE.
        const both = testLayout({ id: 'both', hand: ['grip', 'scram'], goals: { safe: 8, risk: [5, 3] } });
        // escape-only: safe 5 wins with LEAP or LEAP + SCRAMBLE; risk has no FORCE, so nothing wins.
        const escapeOnly = testLayout({ id: 'escape-only', hand: ['scram', 'leap'], goals: { safe: 5, risk: [1, 1] } });
        // short: HAUL 3 reaches neither goal.
        const short = testLayout({ id: 'short', hand: ['haul'], goals: { safe: 99, risk: [9, 9] } });
        const use = hazardPuzzleLibraryUse(['grip', 'scram', 'leap', 'haul', 'oath'], [both, escapeOnly, short]);
        expect(Object.fromEntries(use)).toEqual({
            grip: 'required',
            scram: 'mixed',
            leap: 'mixed',
            haul: 'unused',
            oath: 'absent',
        });
    });
});

describe('the puzzle card pool (A2)', () => {
    it('holds no two cards that play the same', () => {
        const groups = hazardPuzzleCardGroups(HAZARD_PUZZLE_CARD_POOL.map(getHazardCardDef));
        expect(groups.every((g) => g.length === 1)).toBe(true);
    });

    it('holds only deck cards, none banned', () => {
        for (const id of HAZARD_PUZZLE_CARD_POOL) {
            expect(HAZARD_DECK.some((c) => c.id === id), id).toBe(true);
            expect(hazardPuzzleCardBan(getHazardCardDef(id)), id).toBeNull();
        }
    });

    it('leaves HAZARD_DECK whole: the live hazard still draws the cut cards', () => {
        expect(HAZARD_DECK.map((c) => c.id)).toEqual([
            'haul', 'grip', 'scram', 'runner', 'leap', 'footing', 'windread', 'pole', 'oath', 'blessing',
        ]);
    });

    it('the validator rejects an off-pool card in the hand, the reserve or an extraCard unlock', () => {
        const mindRunner: HazardPuzzleUnlock = { stat: 'mind', min: 3, kind: 'extraCard', cardId: 'runner' };
        const cases: [Partial<HazardPuzzleLayout>, string][] = [
            [{ hand: ['runner'] }, 'hand[0]: "runner"'],
            [{ hand: ['haul'], reserve: ['runner'] }, 'reserve[0]: "runner"'],
            [{ hand: ['haul'], unlocks: [mindRunner] }, 'unlocks[0]: "runner"'],
            [{ hand: ['haul', 'crack'] }, 'hand[1]: "crack"'],
        ];
        for (const [over, where] of cases) {
            const v = validateHazardPuzzleLayout(testLayout({ id: 'off-pool', ...over }));
            expect(v.ok).toBe(false);
            expect(v.reasons).toContain(`${where} is not in the puzzle card pool`);
        }
    });

    it('every demo puzzle uses only pool cards', () => {
        for (const l of HAZARD_PUZZLE_LIBRARY) {
            const ids = [...l.hand, ...l.reserve, ...l.unlocks.flatMap((u) => (u.kind === 'extraCard' ? [u.cardId] : []))];
            for (const id of ids) expect(HAZARD_PUZZLE_CARD_POOL, `${l.id} ${id}`).toContain(id);
        }
    });
});
