/**
 * Hazard puzzle card report — per-card use across the winning outcomes,
 * worked out by hand.
 *
 * Card numbers used below (free / powered): IRON GRIP red 5/9 force;
 * SCRAMBLE blue 3/6 escape; SURE FOOTING purple 2/2 both meters, DRAW 1;
 * CRACK dead, 0/0 and never powerable. A gold die powers any colour.
 */

import { describe, expect, it } from 'vitest';

import { formatHazardPuzzleCardReport, hazardPuzzleCardReport } from '../hazard-puzzle.report';
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
