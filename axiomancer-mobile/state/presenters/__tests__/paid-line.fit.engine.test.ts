/**
 * Every library card's PAID face line fits the small face: at most
 * `PAID_LINE_ROWS` rows at `PAID_LINE_SIZE` on the 120-wide hand card, beside
 * the stance die and its colon, at base and every upgraded level, in both text
 * modes. A future long line fails here, naming the card, instead of printing
 * smaller or clipped on screen.
 *
 * Measured with the face's own estimator (`paidLineRows`); jest cannot measure
 * real text, so the browser run of the face is the other half of the check.
 */

import { describe, expect, it } from '@jest/globals';

import { cardLibrary, getUpgradedCardById, lookupEffect, paidFaceLine, upgradeLimit } from '@mechanics';
import type { Card } from '@mechanics';
import {
    PAID_LINE_ROWS, PAID_LINE_SIZE, paidLineCube, paidLineLead, paidLineRoom, paidLineRows,
} from '@/state/presenters/paid-line.engine';
import type { CardTextMode } from '@/state/settings';

const HAND_W = 120;
const ROOM = paidLineRoom(HAND_W, paidLineLead(paidLineCube(false)));
const MODES: readonly CardTextMode[] = ['words', 'glyphs'];

/**
 * The cards whose line still takes more than three rows, each parked for T
 * (the wording cannot shorten inside the voice, `docs/card-voice.md`, without
 * a new word or a changed effect). This is the only way past the test, and
 * it fails once a listed card fits, so the list only shrinks.
 */
const PARKED_FOR_T: Readonly<Record<string, string>> = {
    'Shatter the Frost': 'its wording is one of T\'s pinned examples (card-voice section 11); T decides a shorter one',
    'Boil to Steam': 'four rows even without "(foe only)"; needs a shorter way to say the foe gains the INFERNO',
    'Not Yet': 'four or more rows; "VITAE cannot go below 1 this turn" would fit but "go" is not in the closed lists',
    'Feeding Mark': 'four rows; the drain\'s "each time the foe loses VITAE" needs a shorter phrase T approves',
    'Uneven Trade': 'four rows; the foe\'s plain VITAE loss has no short form in the closed lists',
    'Stay the Hand': 'four rows; "the foe\'s next attack" cannot shorten without dropping "the" (card-voice section 5)',
};

interface Printed { name: string; level: number; line: string }

function printedLines(): Printed[] {
    const out: Printed[] = [];
    for (const base of cardLibrary) {
        for (let level = 0; level <= upgradeLimit(base); level++) {
            const card: Card | undefined = level === 0 ? base : getUpgradedCardById(base.id + '+'.repeat(level));
            if (card) out.push({ name: base.name, level, line: paidFaceLine(card, lookupEffect) });
        }
    }
    return out;
}

/** Names of the cards with a line over the rows, with the worst case. */
function overRows(): Map<string, string> {
    const over = new Map<string, string>();
    for (const { name, level, line } of printedLines()) {
        for (const mode of MODES) {
            const rows = paidLineRows(line, PAID_LINE_SIZE, ROOM, mode);
            if (rows > PAID_LINE_ROWS && !over.has(name)) over.set(name, `${rows} rows at level ${level} in ${mode}: ${line}`);
        }
    }
    return over;
}

describe('every PAID face line fits the small face', () => {
    it('covers the whole library', () => {
        expect(printedLines().length).toBeGreaterThanOrEqual(cardLibrary.length);
    });

    it(`takes at most ${PAID_LINE_ROWS} rows at ${PAID_LINE_SIZE}px, at every level and in both modes`, () => {
        const unparked = [...overRows()].filter(([name]) => !(name in PARKED_FOR_T)).map(([name, why]) => `${name}: ${why}`);
        expect(unparked).toEqual([]);
    });

    it('lists no parked card that now fits', () => {
        const over = overRows();
        expect(Object.keys(PARKED_FOR_T).filter((name) => !over.has(name))).toEqual([]);
    });
});
