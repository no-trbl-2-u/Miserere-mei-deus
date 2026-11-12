/**
 * GUARD — authored PAID summaries stay honest.
 *
 * A card may carry an authored `paidSummary`: human prose that REPLACES the
 * generated telegraphese on the card face. Two bug detectors (no style
 * clauses):
 *
 *   1. NUMBER PARITY — every number the generated `paidText` prints (the
 *      engine-applied units) must appear verbatim in the authored text. A
 *      summary that rounds, drops, or invents a number is a lie on the face.
 *   2. KEYWORD DISCIPLINE — every UPPERCASE run in the authored text must be
 *      a registry keyword (or a whitelisted structural word). The mobile
 *      keyword scanner turns printed UPPERCASE runs into glossary chips; an
 *      unknown word would render an undefined chip or bold garbage.
 *
 * When this guard fires, fix the summary (or the payload), never the guard.
 */

import { describe, expect, it } from 'vitest';
import { cardLibrary } from '../../Cards/cards.library';
import { lookupEffect } from '../../Effects';
import { paidText } from '../combat.cards';

/** The keyword registry (mirrors the mobile KEYWORD_GLOSS keys)
 *  plus the structural words a paid sentence may legitimately print in caps. */
const KNOWN_UPPER = new Set([
    // registry keywords
    'DRAW', 'GUARD', 'MARK', 'CLEANSE', 'HEAL', 'POISON', 'BLEED', 'DOOM',
    'PIP', 'STAGGER', 'FORETELL', 'QUARTER', 'RIPOSTE',
    // direct damage and its family
    'DEAL', 'PIERCE', 'WRATH', 'CHAIN', 'BARRIER',
    // VULNERABLE, printed by the grey office's Word
    'VULNERABLE',
    // structural / system words the faces already print in caps
    'FREE', 'ALL', 'WILD', 'VITAE', 'DOT', 'DOTS', 'HP',
]);

const summaried = cardLibrary.filter(c => c.paidSummary !== undefined);

describe('authored paidSummary honesty', () => {
    it('every number the engine applies appears verbatim in the authored text', () => {
        const offenders: string[] = [];
        for (const card of summaried) {
            // DOOM's generated text carries an explanatory parenthetical
            // ("grows +1 each time the foe acts") whose 1 is a RULE, not a
            // number this card applies — strip it before extracting, or every
            // DOOM carrier is forced to print a meaningless 1 on its face.
            const generated = paidText(card, lookupEffect)
                .replace(/\(grows \+1 each time the foe acts\)/g, '');
            const applied = [...new Set(generated.match(/\d+(?:\.\d+)?/g) ?? [])];
            const missing = applied.filter(n => !(card.paidSummary as string).includes(n));
            if (missing.length) {
                offenders.push(`${card.id} → missing [${missing.join(', ')}] (engine: "${generated}")`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('every UPPERCASE run is a registry keyword or structural word', () => {
        const offenders: string[] = [];
        for (const card of summaried) {
            const runs = (card.paidSummary as string).match(/[A-Z]{2,}/g) ?? [];
            const unknown = [...new Set(runs.filter(r => !KNOWN_UPPER.has(r)))];
            if (unknown.length) offenders.push(`${card.id} → unknown caps [${unknown.join(', ')}]`);
        }
        expect(offenders).toEqual([]);
    });

    it('phase 40 — no card face prints a raw decimal (every printed number is a whole unit)', () => {
        const offenders: string[] = [];
        for (const card of summaried) {
            const s = card.paidSummary as string;
            if (/\d+\.\d+/.test(s)) offenders.push(card.id);
        }
        expect(offenders).toEqual([]);
    });
});
