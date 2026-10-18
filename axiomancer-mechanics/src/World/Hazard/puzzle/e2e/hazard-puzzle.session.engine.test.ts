/**
 * Hazard puzzle session — determinism, the one-round resolve, p on both
 * routes, DRAW from the reserve and the layout validator.
 */

import { describe, expect, it } from 'vitest';

import { HAZARD_DECK } from '../../hazard.content';
import {
    applyHazardPuzzleCard,
    confirmHazardPuzzle,
    createHazardPuzzleSession,
    playHazardPuzzleMoves,
    stageHazardPuzzleCard,
} from '../hazard-puzzle.session';
import type { HazardPuzzleMove } from '../hazard-puzzle.types';
import { solveHazardPuzzle } from '../hazard-puzzle.solver';
import { validateHazardPuzzleLayout } from '../hazard-puzzle.validate';
import * as puzzleApi from '../index';
import { DRAW_ONLY_LAYOUT, MIXED_LAYOUT, testLayout } from './hazard-puzzle.layouts.mock';

// MIXED_LAYOUT uids: hand c1 haul, c2 scram, c3 windread, c4 oath;
// dice d5 red, d6 blue, d7 hex, d8 gold; reserve draws become c9, c10, …
const MIXED_LINE: HazardPuzzleMove[] = [
    { type: 'stage', uid: 'c1' },
    { type: 'power', uid: 'c1', dieId: 'd5' }, // haul powered: 6 force
    { type: 'stage', uid: 'c3' },
    { type: 'apply', uid: 'c3' }, // windread minor convert: d7 hex -> gold; pays 2/2
    { type: 'stage', uid: 'c4' },
    { type: 'power', uid: 'c4', dieId: 'd8' }, // oath powered: 6/6
    { type: 'apply', uid: 'c4' }, // oath draws 2: grip (c9), leap (c10)
    { type: 'stage', uid: 'c2' }, // scram: 3 escape
    { type: 'stage', uid: 'c9' },
    { type: 'power', uid: 'c9', dieId: 'd7' }, // grip on the converted gold: 9 force
];

describe('createHazardPuzzleSession', () => {
    it('builds the authored board: hand, dice and reserve in order, one round', () => {
        const s = createHazardPuzzleSession(MIXED_LAYOUT, 'safe');
        expect(s.phase).toBe('playing');
        expect(s.goal).toBe(30);
        expect(s.board.hand.map((h) => [h.uid, h.cardId])).toEqual([
            ['c1', 'haul'],
            ['c2', 'scram'],
            ['c3', 'windread'],
            ['c4', 'oath'],
        ]);
        expect(s.board.dice.map((d) => [d.id, d.kind])).toEqual([
            ['d5', 'red'],
            ['d6', 'blue'],
            ['d7', 'hex'],
            ['d8', 'gold'],
        ]);
        expect(s.board.drawPile).toEqual(['grip', 'leap', 'footing']);
        expect(s.board.totalRounds).toBe(1);
        expect(createHazardPuzzleSession(MIXED_LAYOUT, 'risk').goal).toEqual([20, 9]);
    });

    it('throws on an invalid layout', () => {
        expect(() => createHazardPuzzleSession(testLayout({ id: 'bad', hand: ['pole'] }), 'safe')).toThrow(/RE-CAST/);
    });
});

describe('no bin (HP1 A1)', () => {
    it('offers no discard: the puzzle API has no discard function', () => {
        expect('discardHazardPuzzleCard' in puzzleApi).toBe(false);
    });

    it('a hand card can only be staged or held', () => {
        const s = createHazardPuzzleSession(MIXED_LAYOUT, 'safe');
        for (const { uid, cardId } of s.board.hand) {
            const staged = stageHazardPuzzleCard(s, uid);
            expect(staged.board.hand.some((h) => h.uid === uid), cardId).toBe(false);
            expect(staged.board.play.map((p) => p.uid), cardId).toEqual([uid]);
            expect(staged.board.dice, cardId).toEqual(s.board.dice);
        }
    });

    it('salvage never fires: a solved line bins nothing and adds no base progress', () => {
        for (const route of ['safe', 'risk'] as const) {
            const line = solveHazardPuzzle(MIXED_LAYOUT, route).winningLine ?? [];
            expect(line.map((m) => m.type), route).not.toContain('discard');
            const end = confirmHazardPuzzle(playHazardPuzzleMoves(createHazardPuzzleSession(MIXED_LAYOUT, route), line));
            expect(end.board.discardPile, route).toEqual([]);
            expect(end.board.progressBase, route).toEqual({ force: 0, escape: 0 });
        }
    });
});

describe('determinism (A2)', () => {
    it('replays one move list twice to the same state', () => {
        const a = confirmHazardPuzzle(playHazardPuzzleMoves(createHazardPuzzleSession(MIXED_LAYOUT, 'safe'), MIXED_LINE));
        const b = confirmHazardPuzzle(playHazardPuzzleMoves(createHazardPuzzleSession(MIXED_LAYOUT, 'safe'), MIXED_LINE));
        expect(a).toEqual(b);
    });

    it('never advances the rng: no roll, no shuffle', () => {
        const s = confirmHazardPuzzle(playHazardPuzzleMoves(createHazardPuzzleSession(MIXED_LAYOUT, 'safe'), MIXED_LINE));
        expect(s.board.rng).toEqual({ s: 0 });
    });

    it('every move in the line is legal and changes the board', () => {
        let s = createHazardPuzzleSession(MIXED_LAYOUT, 'safe');
        for (const move of MIXED_LINE) {
            const next = playHazardPuzzleMoves(s, [move]);
            expect(next, JSON.stringify(move)).not.toBe(s);
            s = next;
        }
    });
});

describe('the one-round resolve (A5)', () => {
    it('sums the line by hand: 23 force, 11 escape, 34 combined', () => {
        const s = confirmHazardPuzzle(playHazardPuzzleMoves(createHazardPuzzleSession(MIXED_LAYOUT, 'safe'), MIXED_LINE));
        // force: haul 6 + windread 2 + oath 6 + grip 9; escape: windread 2 + oath 6 + scram 3.
        expect(s.result).toEqual({ force: 23, escape: 11, goal: 30, p: 1, cleared: true });
        expect(s.phase).toBe('resolved');
        expect(s.board.marks).toEqual(['O']);
    });

    it('risk p is the weaker meter over its goal', () => {
        const s = confirmHazardPuzzle(playHazardPuzzleMoves(createHazardPuzzleSession(MIXED_LAYOUT, 'risk'), MIXED_LINE));
        expect(s.result).toMatchObject({ goal: [20, 9], p: 1, cleared: true });

        const short = confirmHazardPuzzle(
            playHazardPuzzleMoves(createHazardPuzzleSession(MIXED_LAYOUT, 'risk'), MIXED_LINE.slice(0, 2)),
        );
        // haul alone: 6 force, 0 escape -> min(6/20, 0/9) = 0.
        expect(short.result).toEqual({ force: 6, escape: 0, goal: [20, 9], p: 0, cleared: false });
    });

    it('safe p is the combined value over the goal', () => {
        const s = confirmHazardPuzzle(
            playHazardPuzzleMoves(createHazardPuzzleSession(MIXED_LAYOUT, 'safe'), MIXED_LINE.slice(0, 4)),
        );
        // haul 6 + windread 2/2 = 10 of 30.
        expect(s.result).toEqual({ force: 8, escape: 2, goal: 30, p: 10 / 30, cleared: false });
        expect(s.board.marks).toEqual(['X']);
    });

    it('applies staged cards that were not applied, as the live resolve does', () => {
        const s = confirmHazardPuzzle(stageHazardPuzzleCard(createHazardPuzzleSession(DRAW_ONLY_LAYOUT, 'risk'), 'c1'));
        // footing 2/2 against [7, 2]: the weaker meter is 2/7. Its draw fires but grip stays in hand.
        expect(s.result).toEqual({ force: 2, escape: 2, goal: [7, 2], p: 2 / 7, cleared: false });
        expect(s.board.hand.map((h) => h.cardId)).toEqual(['grip']);
    });

    it('resolves once: a second confirm and later moves change nothing', () => {
        const once = confirmHazardPuzzle(createHazardPuzzleSession(DRAW_ONLY_LAYOUT, 'safe'));
        expect(once.result).toEqual({ force: 0, escape: 0, goal: 9, p: 0, cleared: false });
        expect(confirmHazardPuzzle(once)).toBe(once);
        expect(stageHazardPuzzleCard(once, 'c1')).toBe(once);
    });
});

describe('DRAW from the reserve (A3)', () => {
    const SOLUTION: HazardPuzzleMove[] = [
        { type: 'stage', uid: 'c1' },
        { type: 'apply', uid: 'c1' }, // footing unpowered: drawBase 1 -> grip as c2
        { type: 'stage', uid: 'c2' },
    ];

    it('the only solution draws the reserve card, on both routes', () => {
        for (const route of ['safe', 'risk'] as const) {
            const s = confirmHazardPuzzle(playHazardPuzzleMoves(createHazardPuzzleSession(DRAW_ONLY_LAYOUT, route), SOLUTION));
            expect(s.result?.cleared, route).toBe(true);
            expect(s.result?.p, route).toBe(1);
        }
    });

    it('without the draw the goal is out of reach', () => {
        const s = confirmHazardPuzzle(createHazardPuzzleSession(DRAW_ONLY_LAYOUT, 'safe'));
        expect(s.result).toEqual({ force: 0, escape: 0, goal: 9, p: 0, cleared: false });
    });

    it('draws in reserve order at drawPowered, and stops when the reserve is empty', () => {
        let s = createHazardPuzzleSession(testLayout({ id: 'deep', hand: ['oath'], reserve: ['grip'] }), 'safe');
        s = applyHazardPuzzleCard(stageHazardPuzzleCard(s, 'c1'), 'c1');
        // oath draws 2 (majorEffect) but the reserve holds 1: grip, then nothing.
        expect(s.board.hand.map((h) => h.cardId)).toEqual(['grip']);
        expect(s.board.drawPile).toEqual([]);
        expect(s.board.rng).toEqual({ s: 0 });

        let t = createHazardPuzzleSession(MIXED_LAYOUT, 'safe');
        t = playHazardPuzzleMoves(t, MIXED_LINE.slice(4, 7));
        expect(t.board.hand.slice(-2).map((h) => [h.uid, h.cardId])).toEqual([
            ['c9', 'grip'],
            ['c10', 'leap'],
        ]);
        expect(t.board.drawPile).toEqual(['footing']);
    });
});

describe('validateHazardPuzzleLayout (A4)', () => {
    it('accepts the test layouts', () => {
        expect(validateHazardPuzzleLayout(MIXED_LAYOUT)).toEqual({ ok: true, reasons: [] });
        expect(validateHazardPuzzleLayout(DRAW_ONLY_LAYOUT)).toEqual({ ok: true, reasons: [] });
    });

    it('rejects a RE-CAST card in the hand, the reserve or an extraCard unlock, with a reason', () => {
        const recast = HAZARD_DECK.filter((c) => c.effect === 'recast').map((c) => c.id);
        expect(recast.length).toBeGreaterThan(0);
        for (const id of recast) {
            for (const over of [
                { hand: [id] },
                { hand: ['haul'], reserve: [id] },
                { hand: ['haul'], unlocks: [{ stat: 'body' as const, min: 3, kind: 'extraCard' as const, cardId: id }] },
            ]) {
                const v = validateHazardPuzzleLayout(testLayout({ id: 'recast', ...over }));
                expect(v.ok).toBe(false);
                expect(v.reasons.join(' ')).toContain(`"${id}" is a RE-CAST card`);
            }
        }
    });

    it('keeps RE-CAST cards in HAZARD_DECK for the live minigame', () => {
        expect(HAZARD_DECK.some((c) => c.effect === 'recast')).toBe(true);
    });

    it('rejects any act but Act 1', () => {
        for (const act of [0, 2, 3]) {
            const v = validateHazardPuzzleLayout({ ...MIXED_LAYOUT, act });
            expect(v.ok).toBe(false);
            expect(v.reasons).toContain(`act ${act}: hazard puzzles are scoped to Act 1`);
        }
    });

    it('rejects a hazard with no live copy and a region outside Act 1', () => {
        const v = validateHazardPuzzleLayout({ ...MIXED_LAYOUT, hazardId: 'nope', region: 'aporia-act-1' as never });
        expect(v.reasons).toEqual([
            'hazardId: "nope" is not a live hazard whose copy the puzzle can reuse',
            'region: "aporia-act-1" is not an Act 1 region',
        ]);
    });

    it('rejects unknown cards, an empty hand and non-positive goals', () => {
        const v = validateHazardPuzzleLayout(
            testLayout({ id: 'junk', hand: [], reserve: ['nope'], goals: { safe: 0, risk: [3, 0] } }),
        );
        expect(v.ok).toBe(false);
        expect(v.reasons).toEqual([
            'hand: a puzzle needs at least one card',
            'reserve[0]: unknown hazard card "nope"',
            'goals.safe: 0 is not a positive whole number',
            'goals.risk: [3, 0] needs two positive whole numbers',
        ]);
    });
});
