/**
 * Hazard puzzle card report — per-card use across the winning outcomes,
 * worked out by hand.
 *
 * Card numbers used below (free / powered): IRON GRIP red 5/9 force;
 * SCRAMBLE blue 3/6 escape; SURE FOOTING purple 2/2 both meters, DRAW 1;
 * CRACK dead, 0/0 and never powerable; DEAD-MAN HAUL red 3/6 force. A
 * gold die powers any colour, a red die only red.
 *
 * Decision pressure (HP4 A1, A2): a first play is one hand card staged with
 * its die left open, or powered by one die kind that can power it. The walk
 * never undoes a move, so a die placed on the wrong card stays there.
 */

import { describe, expect, it } from 'vitest';

import {
    formatHazardPuzzleCardReport,
    formatHazardPuzzleDecisionPressure,
    hazardPuzzleCardReport,
    hazardPuzzleDecisionPressure,
} from '../hazard-puzzle.report';
import { HAZARD_PUZZLE_LIBRARY } from '../hazard-puzzle.library';
import type { HazardPuzzleUnlock } from '../hazard-puzzle.types';
import { testLayout } from './hazard-puzzle.layouts.mock';
import { useHazardPuzzlePoolCards } from './hazard-puzzle.pool.mock';

useHazardPuzzlePoolCards(['crack']);

const ONE_GOLD = testLayout({
    id: 'report-one-gold',
    hand: ['grip', 'scram', 'crack'],
    dice: ['gold'],
    goals: { safe: 8, risk: [5, 3] },
});

const SCRAM_CARD: HazardPuzzleUnlock = { stat: 'mind', min: 3, kind: 'extraCard', cardId: 'scram' };

const DRAW_WITH_UNLOCK = testLayout({
    id: 'report-draw',
    hand: ['footing'],
    reserve: ['grip'],
    goals: { safe: 9, risk: [7, 2] },
    unlocks: [SCRAM_CARD],
});

describe('hazardPuzzleCardReport (A3)', () => {
    it('safe 8 with one gold die: GRIP is in every win, SCRAMBLE in three of four, CRACK in none', () => {
        // Wins: GRIP 9 alone, GRIP 9 + SCRAMBLE 3, GRIP 5 + SCRAMBLE 3, GRIP 5 + SCRAMBLE 6.
        const report = hazardPuzzleCardReport(ONE_GOLD, 'safe');
        expect(report).toMatchObject({ layoutId: 'report-one-gold', route: 'safe', unlocks: [] });
        expect(report.cards).toEqual([
            { cardId: 'grip', sources: ['hand'], staged: 4, total: 4, required: true, unused: false },
            { cardId: 'scram', sources: ['hand'], staged: 3, total: 4, required: false, unused: false },
            { cardId: 'crack', sources: ['hand'], staged: 0, total: 4, required: false, unused: true },
        ]);
    });

    it('risk [5, 3]: GRIP and SCRAMBLE are both required', () => {
        // Wins: (5, 3), (9, 3), (5, 6); each stages both.
        const cards = hazardPuzzleCardReport(ONE_GOLD, 'risk').cards;
        expect(cards.map((c) => [c.cardId, c.staged, c.total, c.required, c.unused])).toEqual([
            ['grip', 3, 3, true, false],
            ['scram', 3, 3, true, false],
            ['crack', 0, 3, false, true],
        ]);
    });

    it('lists reserve cards and a granted extraCard unlock with their source', () => {
        // FOOTING 4 draws GRIP 5: 9 clears. With SCRAMBLE granted, FOOTING + GRIP + SCRAMBLE (12) is a
        // second win; SCRAMBLE without the draw reaches at most 7.
        const cards = hazardPuzzleCardReport(DRAW_WITH_UNLOCK, 'safe', [SCRAM_CARD]).cards;
        expect(cards).toEqual([
            { cardId: 'footing', sources: ['hand'], staged: 2, total: 2, required: true, unused: false },
            { cardId: 'grip', sources: ['reserve'], staged: 2, total: 2, required: true, unused: false },
            { cardId: 'scram', sources: ['unlock'], staged: 1, total: 2, required: false, unused: false },
        ]);
        expect(hazardPuzzleCardReport(DRAW_WITH_UNLOCK, 'safe').cards.map((c) => c.cardId)).toEqual(['footing', 'grip']);
    });

    it('an unsolvable route marks no card required and every card unused', () => {
        const layout = testLayout({ id: 'report-short', hand: ['scram'], goals: { safe: 4, risk: [1, 1] } });
        expect(hazardPuzzleCardReport(layout, 'safe').cards).toEqual([
            { cardId: 'scram', sources: ['hand'], staged: 0, total: 0, required: false, unused: true },
        ]);
    });

    it('formats as a markdown table, one row per card', () => {
        expect(formatHazardPuzzleCardReport(hazardPuzzleCardReport(ONE_GOLD, 'safe'))).toBe(
            [
                '| card | from | staged / wins | required | unused |',
                '|---|---|---|---|---|',
                '| grip | hand | 4 / 4 | yes |  |',
                '| scram | hand | 3 / 4 |  |  |',
                '| crack | hand | 0 / 4 |  | yes |',
            ].join('\n'),
        );
    });
});

/** GRIP in {0, 5, 9 with gold}; SCRAMBLE in {0, 3, 6 with gold}; one gold die. */
const DIE_CHOICE = testLayout({
    id: 'pressure-die-choice',
    hand: ['grip', 'scram'],
    dice: ['gold'],
    goals: { safe: 12, risk: [9, 3] },
});

/** HAUL in {0, 3, 6 with red}; one red die. */
const ONE_CARD = testLayout({ id: 'pressure-one-card', hand: ['haul'], dice: ['red'], goals: { safe: 3, risk: [3, 1] } });

/** DIE_CHOICE plus HAUL: risk [9, 3] has an optional card and a losing first play. */
const THREE_CARDS = testLayout({
    id: 'pressure-three',
    hand: ['grip', 'scram', 'haul'],
    dice: ['gold'],
    goals: { safe: 1, risk: [9, 3] },
});

describe('decision pressure (HP4 A1)', () => {
    it('neither forced nor free: one optional card, and the die on SCRAMBLE loses', () => {
        // Risk [9, 3]: SCRAMBLE is the only escape, so every win stages it. Wins:
        // GRIP 9 + SCRAMBLE 3; GRIP 9 + SCRAMBLE 3 + HAUL 3; GRIP 5 + HAUL 6 + SCRAMBLE 3.
        // GRIP and SCRAMBLE are required, HAUL is in two of three.
        // First plays: GRIP open, GRIP gold, SCRAMBLE open, HAUL open, HAUL gold still win;
        // SCRAMBLE gold leaves GRIP 5 + HAUL 3 = 8 force, one short of 9.
        expect(hazardPuzzleCardReport(THREE_CARDS, 'risk').pressure).toEqual({
            optional: 1,
            required: 2,
            total: 3,
            requiredShare: 2 / 3,
            firstPlays: { winning: 5, losing: 1 },
            finding: null,
        });
    });

    it('free: every first play still wins, with one optional card and one unused', () => {
        // Safe 8 (see the A3 case above): GRIP required, SCRAMBLE optional, CRACK unused.
        // First plays: GRIP open, GRIP gold, SCRAMBLE open, SCRAMBLE gold (GRIP 5 + 6 = 11),
        // CRACK open: all five still win.
        expect(hazardPuzzleCardReport(ONE_GOLD, 'safe').pressure).toEqual({
            optional: 1,
            required: 1,
            total: 3,
            requiredShare: 1 / 3,
            firstPlays: { winning: 5, losing: 0 },
            finding: 'free',
        });
    });

    it('forced: one win needs both cards, and the die on SCRAMBLE is the one losing first play', () => {
        // Safe 12: only GRIP 9 + SCRAMBLE 3. SCRAMBLE gold caps at 5 + 6 = 11.
        expect(hazardPuzzleCardReport(DIE_CHOICE, 'safe').pressure).toEqual({
            optional: 0,
            required: 2,
            total: 2,
            requiredShare: 1,
            firstPlays: { winning: 3, losing: 1 },
            finding: 'forced',
        });
    });

    it('forced reads before free: one card, both first plays win', () => {
        // Safe 3: HAUL staged (3) or powered (6) wins; held (0) does not.
        expect(hazardPuzzleCardReport(ONE_CARD, 'safe').pressure).toMatchObject({
            optional: 0,
            required: 1,
            total: 1,
            firstPlays: { winning: 2, losing: 0 },
            finding: 'forced',
        });
    });

    it('a route nothing wins has no finding and every first play loses', () => {
        // Risk [3, 1]: HAUL pays no escape.
        expect(hazardPuzzleCardReport(ONE_CARD, 'risk').pressure).toEqual({
            optional: 0,
            required: 0,
            total: 1,
            requiredShare: 0,
            firstPlays: { winning: 0, losing: 2 },
            finding: null,
        });
    });

    it('the first plays add up to the opening share', () => {
        const report = hazardPuzzleCardReport(THREE_CARDS, 'risk');
        const { winning, losing } = report.pressure.firstPlays;
        expect(winning / (winning + losing)).toBe(report.features.openingShare);
    });

    it('an empty report is neither forced nor free and has a zero share', () => {
        expect(hazardPuzzleDecisionPressure([], { winning: 0, losing: 0 })).toEqual({
            optional: 0,
            required: 0,
            total: 0,
            requiredShare: 0,
            firstPlays: { winning: 0, losing: 0 },
            finding: null,
        });
    });

    it('prints as one line, the finding last', () => {
        expect(formatHazardPuzzleDecisionPressure(hazardPuzzleCardReport(THREE_CARDS, 'risk').pressure)).toBe(
            'decision pressure: optional cards 1 · required 2 / 3 (67%) · ' +
                'first plays that can win 5 · first plays that cannot 1',
        );
        expect(formatHazardPuzzleDecisionPressure(hazardPuzzleCardReport(DIE_CHOICE, 'safe').pressure)).toBe(
            'decision pressure: optional cards 0 · required 2 / 2 (100%) · ' +
                'first plays that can win 3 · first plays that cannot 1 · **forced**',
        );
    });
});

describe('decision pressure on the live library (HP4 A2)', () => {
    const findingOf = (id: string, route: 'safe' | 'risk') => {
        const layout = HAZARD_PUZZLE_LIBRARY.find((l) => l.id === id);
        if (!layout) throw new Error(`no library layout ${id}`);
        return hazardPuzzleCardReport(layout, route).pressure.finding;
    };

    it('prints forced where every card is required: ashfall risk and undercroft risk', () => {
        expect(findingOf('demo-ashfall-medium', 'risk')).toBe('forced');
        expect(findingOf('demo-undercroft-hard', 'risk')).toBe('forced');
    });

    it('prints free on cliff-easy risk, and on every other route with no losing first play', () => {
        // The brief named cliff-easy risk; measured, no first play loses on any
        // route that is not forced, so the other three routes are free too.
        expect(findingOf('demo-cliff-easy', 'risk')).toBe('free');
        expect(findingOf('demo-cliff-easy', 'safe')).toBe('free');
        expect(findingOf('demo-ashfall-medium', 'safe')).toBe('free');
        expect(findingOf('demo-undercroft-hard', 'safe')).toBe('free');
    });
});
