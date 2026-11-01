/**
 * The small face's PAID line: its typeface runs and its fit. The twelve sample
 * cards must each take at most three rows at the full 10pt on the 120pt hand
 * card (the measured widths behind the constants are in `paid-line.engine.ts`;
 * the browser run of the real face is the other half of this check).
 */

import { describe, expect, it } from '@jest/globals';

import { cardLibrary, lookupEffect, paidFaceLine } from '@mechanics';
import {
    PAID_LINE_FLOOR, PAID_LINE_ROWS, PAID_LINE_SIZE, paidLineCube, paidLineFit, paidLineLead, paidLineRoom, paidLineRows, paidLineRuns,
} from '@/state/presenters/paid-line.engine';
import { programHeadline } from '@/state/presenters/card-program.engine';

const SAMPLE = [
    'Burn Together', 'Encase in Ice', 'Strike the Burning', 'Shatter the Frost', 'Weight of Grace', 'Shield Bash',
    'Cracking Swing', 'Open Vein', 'Double-Edged', 'Bloodletting', 'Cornered', 'Callus',
];
const HAND_W = 120;

describe('paidLineRuns', () => {
    it('sets keywords, numbers and X in capitals and the logic words in serif', () => {
        expect(paidLineRuns('DEAL 6 or 14 at half your VITAE')).toEqual([
            { text: 'DEAL', caps: true }, { text: ' ', caps: false }, { text: '6', caps: true },
            { text: ' or ', caps: false }, { text: '14', caps: true }, { text: ' at half your ', caps: false },
            { text: 'VITAE', caps: true },
        ]);
        expect(paidLineRuns('VULNERABLE 75% for 2 turns').map((r) => r.text)).toContain('75%');
        expect(paidLineRuns("DEAL 2× foe's MERCY").find((r) => r.text === '2×')?.caps).toBe(true);
    });

    it('never loses or reorders text', () => {
        for (const card of cardLibrary) {
            const line = paidFaceLine(card, lookupEffect);
            expect(paidLineRuns(line).map((r) => r.text).join('')).toBe(line);
        }
    });
});

/** The lead a hand card's line sits beside: its die and colon. */
const LEAD = paidLineLead(paidLineCube(false));

describe('paidLineFit', () => {
    it('the text room is the card less its border and ledger padding', () => {
        expect(paidLineRoom(HAND_W)).toBe(107);
    });

    it('the die and its colon lead the line, and their width comes out of the room', () => {
        expect(paidLineLead(paidLineCube(false))).toBe(24);
        expect(paidLineLead(paidLineCube(true))).toBe(22);
        expect(paidLineRoom(HAND_W, paidLineLead(paidLineCube(false)))).toBe(83);
    });

    // Beside the die, Shatter the Frost's line takes four rows at 10pt, so it prints at 9.
    const SHRUNK: Record<string, number> = { 'Shatter the Frost': 9 };

    it.each(SAMPLE)('%s prints its whole PAID line beside the die in at most three rows', (name) => {
        const card = cardLibrary.find((c) => c.name === name)!;
        const line = paidFaceLine(card, lookupEffect);
        const fit = paidLineFit({ width: HAND_W, line, lead: LEAD });
        expect(fit.size).toBe(SHRUNK[name] ?? PAID_LINE_SIZE);
        expect(fit.rows).toBeLessThanOrEqual(PAID_LINE_ROWS);
    });

    it('a line too long for three rows shrinks, floored', () => {
        const long = 'Spend all your INFERNO, BLIZZARD 2 for each INFERNO spent, INFERNO 2 for each INFERNO spent (foe only). EXILE';
        const fit = paidLineFit({ width: HAND_W, line: long });
        expect(fit.size).toBeLessThan(PAID_LINE_SIZE);
        expect(fit.size).toBeGreaterThanOrEqual(PAID_LINE_FLOOR);
        expect(paidLineFit({ width: 92, line: long }).size).toBe(PAID_LINE_FLOOR);
    });

    it('counts a short line as one row and a wide word across the rows it breaks over', () => {
        expect(paidLineRows('DEAL 5', 10, 107)).toBe(1);
        expect(paidLineRows('SUPERCALIFRAGILISTICEXPIALIDOCIOUSLYLONGWORD', 10, 40)).toBeGreaterThan(1);
    });
});

describe('programHeadline: a multiple of a board number', () => {
    it('"HEAL 3× the VITAE you lost" headlines HEAL varies, not the SACRIFICE that pays for it', () => {
        expect(programHeadline('SACRIFICE 10, HEAL 3× the VITAE you lost this turn. EXILE')).toEqual({ keyword: 'HEAL', value: 'varies' });
    });

    it('a plain HEAL number still headlines as before', () => {
        expect(programHeadline('SACRIFICE 5, HEAL 12 at the start of your next turn')).toEqual({ keyword: 'HEAL', value: '12' });
    });
});
