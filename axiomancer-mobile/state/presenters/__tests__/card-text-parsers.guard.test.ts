/**
 * GUARD — footgun `face-text-parsers`: card text is parsed by regex.
 *
 * `card-program.engine.ts` headlines a card's face by regex over its printed
 * line (`programHeadline`, `programFreeCell`), and the run bots read a card's
 * lane through `printedKeywords`. Reword a card and a face headline or a bot's
 * pick can change with no test failing. This pins, for every library card,
 * the keywords it prints and (for a program card) the PAID headline and FREE
 * cell its printed lines parse to, so a wording change shows as a diff.
 *
 * When it fires: read the diff. A headline or keyword you meant to change is
 * fine, so regenerate with `npx jest state/presenters/__tests__/card-text-parsers.guard.test.ts -u`
 * and commit the snapshot with the text, then run `sim/run-archetypes.test.ts`
 * (the bots' picks). One you did not mean is the trap: fix the wording or the
 * pattern, never just the snapshot.
 */

import { describe, it, expect } from '@jest/globals';
import { cardLibrary, printedKeywords } from '@mechanics';

import { programFreeCell, programHeadline, programLinesFor } from '../card-program.engine';

interface ParsedCard {
    keywords: string[];
    paid?: { keyword: string | null; value: string };
    free?: { keyword: string; value: string } | null;
}

function parse(): Record<string, ParsedCard> {
    const out: Record<string, ParsedCard> = {};
    for (const card of [...cardLibrary].sort((a, b) => a.id.localeCompare(b.id))) {
        const row: ParsedCard = { keywords: printedKeywords(card) };
        if (card.program) {
            const { free, paid } = programLinesFor(card);
            row.paid = programHeadline(paid);
            row.free = programFreeCell(free);
        }
        out[card.id] = row;
    }
    return out;
}

describe('face-text parsers guard', () => {
    it('every library card parses to the keywords, headline and FREE cell it was pinned at', () => {
        expect(parse()).toMatchSnapshot();
    });
});
