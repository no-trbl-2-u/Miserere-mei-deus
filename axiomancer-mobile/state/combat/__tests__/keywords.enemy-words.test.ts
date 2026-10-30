/**
 * The enemy words (phase EN1d): every word a foe's move can carry has a
 * gloss that names its counter and a glyph silhouette, read from the engine's
 * own list so a new word fails here until it is glossed and drawn.
 */
import { describe, expect, it } from '@jest/globals';

import { ENEMY_KEYWORDS } from '../../../../axiomancer-mechanics/src/Enemy/enemy-keywords';
import { keywordGloss, keywordsInText } from '@/state/combat/keywords';
import { glyphShapeFor } from '@/components/combat/glyphShapes';

const title = (id: string): string => id.charAt(0).toUpperCase() + id.slice(1);

/** What each word's gloss must say its counter is. */
const COUNTER: Record<(typeof ENEMY_KEYWORDS)[number], RegExp> = {
    ward: /VULNERABLE, LEECH and INFERNO get past it/,
    mend: /Counter it with burst/,
    scour: /Lay more statuses than it can strip/,
    brine: /one big play/,
    vulnerable: /GUARD still blocks the larger hit/,
    leech: /race a LEECH on you/,
};

describe('the enemy words', () => {
    it('reads the engine list of six', () => {
        expect([...ENEMY_KEYWORDS]).toEqual(['ward', 'mend', 'scour', 'brine', 'vulnerable', 'leech']);
    });

    for (const id of ENEMY_KEYWORDS) {
        it(`${id.toUpperCase()} has a gloss naming its counter and a glyph`, () => {
            const gloss = keywordGloss(title(id));
            expect(gloss).not.toBeNull();
            expect(gloss).toMatch(COUNTER[id]);
            expect(glyphShapeFor(id)).not.toBeNull();
        });
    }

    it('a foe move line printing a word opens its gloss', () => {
        expect(keywordsInText('Keening: 4 damage and BRINE 3.')).toEqual(['Brine']);
        expect(keywordsInText('Knot Up: WARD 5 and MEND 4.')).toEqual(['Ward', 'Mend']);
        expect(keywordsInText('Mend the Net: MEND 6 and it SCOURs one status off itself.')).toEqual(['Mend', 'Scour']);
    });
});
