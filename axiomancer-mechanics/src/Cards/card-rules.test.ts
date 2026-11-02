/**
 * Unit — the card-rule checkers on hand-built cards (Phase CS1). The fence
 * over the real library is `e2e/card-rules.engine.test.ts`.
 */

import { describe, it, expect } from 'vitest';

import type { Card } from './types';
import {
    cardConditions, cardLinesText, checkCarrierRule, checkComplexityBudget,
    checkDiscardCost, checkFaceGrammar, checkGlobalTemplate, checkScrapFloor, checkTextOrder,
    parseAtlasKeywords, printedKeywords,
    type AtlasKeyword,
} from './card-rules';
import type { ProgramCtx } from './card-program.types';

const base: Card = {
    id: 'c', name: 'C', color: 'any', description: 'A test card.',
    tier: 1, rank: 1, cardType: 'skill', targetType: 'self',
};
const KWS = new Set(['DEAL', 'GUARD', 'SACRIFICE', 'LEECH', 'TETHER']);
const noop = (): void => {};

describe('printedKeywords and cardConditions', () => {
    it('reads a plain card from its rider, mechanics and paidSummary', () => {
        const card: Card = { ...base, free: { damage: 2 }, paidSummary: 'Deal 5. GUARD 3.' };
        expect(cardLinesText(card).free).toBe('DEAL 2');
        expect(printedKeywords(card)).toEqual(['DEAL', 'GUARD']);
    });

    it('resolves number tokens and skips structural words', () => {
        const card: Card = { ...base, program: { free: { text: 'DEAL {deal:3} or {deal:6} at half your VITAE', run: noop } } };
        expect(cardLinesText(card).free).toBe('DEAL 3 or 6 at half your VITAE');
        expect(printedKeywords(card)).toEqual(['DEAL']);
        expect(cardConditions(card)).toEqual(['at half VITAE']);
    });

    it('counts a Global trigger as a condition and its type as a printed word', () => {
        const card: Card = { ...base, cardType: 'global', program: {
            global: { trigger: 'sac', text: 'DEAL X', run: noop } } };
        expect(printedKeywords(card)).toEqual(['DEAL', 'GLOBAL', 'SACRIFICE']);
        expect(cardConditions(card)).toEqual(['trigger: sac']);
    });

    it('counts a line requirement once when its text says the same', () => {
        const half = { test: () => true, why: 'only at half VITAE or less' };
        const card: Card = { ...base, program: { free: { text: 'Only at half VITAE or less: DEAL 8.', run: noop, requires: half } } };
        expect(cardConditions(card)).toEqual(['at half VITAE']);
    });
});

describe('checkComplexityBudget', () => {
    const two: Card = { ...base, program: { free: { text: 'SACRIFICE 2, LEECH 1.', run: noop } } };

    it('Ash allows one keyword beyond DEAL and GUARD', () => {
        const one: Card = { ...base, program: { free: { text: 'SACRIFICE 2, DEAL 4, GUARD 2.', run: noop } } };
        expect(checkComplexityBudget([one], KWS)).toEqual([]);
        expect(checkComplexityBudget([two], KWS).map(v => v.id)).toEqual(['c']);
    });

    it('Splinter allows two keywords and one condition; Skull is unbudgeted', () => {
        const cond: Card = { ...two, rank: 3, program: { free: { text: 'SACRIFICE 2, LEECH 1 at half VITAE or less.', run: noop } } };
        expect(checkComplexityBudget([cond], KWS)).toEqual([]);
        const many: Card = { ...base, rank: 5, program: { free: { text: 'SACRIFICE 2, LEECH 1, TETHER 1 if you can.', run: noop } } };
        expect(checkComplexityBudget([many], KWS)).toEqual([]);
    });

    it('counts only the Card keywords it is given', () => {
        expect(checkComplexityBudget([two], new Set(['SACRIFICE']))).toEqual([]);
    });
});

describe('checkScrapFloor', () => {
    it('flags a line whose whole effect is 1 Conviction, in any probed state', () => {
        const card: Card = { ...base, program: {
            free: { text: 'GUARD 2.', run: c => { c.guard(2); } },
            paid: { text: 'Gain 1 Conviction, or 3 at half VITAE.', run: c => { c.conviction(c.q.atHalf ? 3 : 1); } },
        } };
        expect(checkScrapFloor([card])).toEqual([{ rule: 'scrap-floor', id: 'c', detail: 'PAID only gains 1 Conviction' }]);
    });

    it('passes 2 Conviction, and 1 Conviction with anything else', () => {
        const card: Card = { ...base, program: {
            free: { text: 'Gain 2 Conviction.', run: c => { c.conviction(2); } },
            paid: { text: 'GUARD 2. Gain 1 Conviction.', run: c => { c.guard(2); c.conviction(1); } },
        } };
        expect(checkScrapFloor([card])).toEqual([]);
    });
});

describe('checkDiscardCost', () => {
    it('passes a PAID line that discards first', () => {
        const card: Card = { ...base, program: {
            free: { text: 'GUARD 2.', run: c => { c.guard(2); } },
            paid: { text: 'Discard 1 card at random. GUARD 6.', run: c => { c.discardRandom(1); c.guard(6); } },
        } };
        expect(checkDiscardCost([card])).toEqual([]);
    });

    it('flags a FREE line that discards, and a PAID line that discards after an effect', () => {
        const card: Card = { ...base, program: {
            free: { text: 'Discard 1 card at random. GUARD 2.', run: c => { c.discardRandom(1); c.guard(2); } },
            paid: { text: 'GUARD 6. Discard 1 card at random.', run: c => { c.guard(6); c.discardRandom(1); } },
        } };
        expect(checkDiscardCost([card])).toEqual([
            { rule: 'discard-cost', id: 'c', detail: 'FREE discards; PAID discards after another verb' },
        ]);
    });
});

describe('checkGlobalTemplate', () => {
    const global = (text: string): Card => ({ ...base, cardType: 'global', program: {
        global: { trigger: 'turn', text, run: noop } } });

    it('passes one effect with no duration', () => {
        expect(checkGlobalTemplate([global('GUARD 2')])).toEqual([]);
    });

    it('flags a printed duration in the effect', () => {
        expect(checkGlobalTemplate([global('GUARD 2 for 3 turns')])[0].detail).toMatch(/duration/);
        expect(checkGlobalTemplate([global('GUARD 2 for the rest of combat')])[0].detail).toMatch(/duration/);
    });

    it('flags a Global with no trigger and a trigger on a non-Global', () => {
        expect(checkGlobalTemplate([{ ...base, cardType: 'global' }])[0].detail).toMatch(/no trigger/);
        expect(checkGlobalTemplate([{ ...global('GUARD 2.'), cardType: 'skill' }])[0].detail).toMatch(/not a Global/);
    });
});

describe('parseAtlasKeywords and checkCarrierRule', () => {
    const md = [
        '## Card keywords', '### Damage', '| keyword | reminder | carried by |', '|---|---|---|',
        '| **DEAL N** | Damage. | cards |', '| **LEECH N** | Drain. | one card |', '| **BLEED** | Old. | nothing |',
        '## Rule keywords', '| keyword | reminder | carried by |', '|---|---|---|', '| **EXILE** | Leaves. | cards |',
        '## System terms', '| term | what it is |', '|---|---|', '| CONVICTION ◆ | A resource. |',
    ].join('\n');
    const atlas: AtlasKeyword[] = parseAtlasKeywords(md);

    it('reads each row with its section kind', () => {
        expect(atlas).toEqual([
            { word: 'DEAL', kind: 'card' }, { word: 'LEECH', kind: 'card' }, { word: 'BLEED', kind: 'card' },
            { word: 'EXILE', kind: 'rule' }, { word: 'CONVICTION', kind: 'system' },
        ]);
        expect(() => parseAtlasKeywords('# nothing here')).toThrow();
    });

    it('flags a row with no carrier, a Card keyword under the bar and a printed word with no row', () => {
        const cards: Card[] = [
            { ...base, id: 'a', paidSummary: 'DEAL 2. LEECH 1. EXILE.' },
            { ...base, id: 'b', paidSummary: 'DEAL 3. SMITE.' },
        ];
        const v = checkCarrierRule({
            cards, atlas, nonCardCarriers: new Map([['CONVICTION', 'the pool']]), barExempt: new Set(['CONVICTION']),
        });
        expect(v.map(x => x.id).sort()).toEqual(['BLEED', 'LEECH', 'b:SMITE']);
    });

    it('lets two enemies carry a Card keyword past the bar', () => {
        const cards: Card[] = [{ ...base, paidSummary: 'DEAL 2. DEAL 2.' }, { ...base, id: 'd', paidSummary: 'DEAL 1. EXILE.' }];
        const v = checkCarrierRule({
            cards, atlas, nonCardCarriers: new Map([['CONVICTION', 'the pool'], ['BLEED', 'a foe']]),
            enemyCarriers: new Map([['LEECH', 2], ['BLEED', 2]]), barExempt: new Set(),
        });
        expect(v).toEqual([]);
    });
});

describe('checkFaceGrammar', () => {
    const VOICE_KWS = new Set([
        'DEAL', 'GUARD', 'SACRIFICE', 'INFERNO', 'BLIZZARD', 'MERCY', 'DISCARD', 'VULNERABLE', 'TETHER', 'LEECH',
        'CONVICTION', 'EXILE', 'GLOBAL',
    ]);
    const paid = (text: string): Card => ({ ...base, program: { paid: { text, run: noop } } });
    const fails = (text: string): string => {
        const v = checkFaceGrammar([paid(text)], VOICE_KWS);
        expect(v).toHaveLength(1);
        return v[0].detail;
    };

    it("passes every example line in the voice guide", () => {
        const lines = [
            'DEAL 9, INFERNO 4', 'BLIZZARD 5, GUARD = foe\'s BLIZZARD', 'DEAL 4 or 8 if the foe has INFERNO',
            'Spend all the foe\'s BLIZZARD, DEAL 3 +2 for each spent', 'DEAL 2× foe\'s MERCY',
            'DISCARD 1. GUARD 8, DEAL = your GUARD', 'DISCARD 2. VULNERABLE 75% for 2 turns, DEAL 8',
            'VULNERABLE 25% for 1 turn, DEAL 2', 'TETHER 3, SACRIFICE 4, LEECH 2',
            'DEAL 9, twice; SACRIFICE 2 after each', 'SACRIFICE 6, CONVICTION 5. EXILE',
            'DEAL 6 or 14 at half your VITAE', 'When you SACRIFICE X: DEAL X', 'DEAL {deal:3}',
        ];
        expect(checkFaceGrammar(lines.map(paid), VOICE_KWS)).toEqual([]);
    });

    it('fails one line per retired form, naming the form', () => {
        const cases: [string, RegExp][] = [
            ['DEAL 6 instead', /"instead"/],
            ['DEAL 4, doubled if the foe has INFERNO', /"doubled"/],
            ['DEAL 4 or 8 if the foe is burning', /"burning"/],
            ['DEAL 6, then SACRIFICE 2', /"then"/],
            ['DISCARD 1 at random. GUARD 8', /"at random"/],
            ['LEECH 2 on the foe', /"on the foe"/],
            ['DEAL 9, INFERNO 4 on you and the foe', /"you and the foe"/],
            ['INFERNO 4 to both sides', /"both sides"/],
            ['GUARD equal to the foe\'s BLIZZARD', /"equal to"/],
            ['SACRIFICE 6. EXILE this card', /"EXILE this card"/],
            ['SACRIFICE 3, gain 2 CONVICTION', /"gain N"/],
            ['VULNERABLE +75% for 2 turns', /"\+" before a VULNERABLE percent/],
            ['SAC 2, CONV 2', /abbreviation/],
            ['DEAL 9, INFERNO 4.', /full stop at the end/],
            ['Discard 1. GUARD 8', /not in capitals \(Discard\)/],
            ['SACRIFICE 2, Conviction 2', /not in capitals \(Conviction\)/],
        ];
        for (const [text, re] of cases) expect(fails(text)).toMatch(re);
    });

    it('fails a word outside the keywords, numbers, entities and logic words', () => {
        expect(fails('DEAL 6; HEAL all the blood shed')).toMatch(/outside the grammar \(HEAL, blood, shed\)/);
        expect(fails('DEAL 3X')).toMatch(/outside the grammar \(3X\)/);
    });

    it('passes the words T approved (2026-11-01): a logic word, a content word, `+`, and still fails a stranger', () => {
        expect(checkFaceGrammar([paid('DEAL 2 + your INFERNO')], VOICE_KWS)).toEqual([]);
        expect(checkFaceGrammar([paid('Remove all your debuffs, GUARD 4 this turn')], VOICE_KWS)).toEqual([]);
        expect(fails('DEAL 2 + your INFERNO, then rest')).toMatch(/"then"/);
        expect(fails('DEAL 6, ignore the foe')).toMatch(/outside the grammar \(ignore\)/);
    });

    it('fails a duration on a Global, and reads its one effect, not the face stand-in', () => {
        const g = (text: string): Card => ({ ...base, cardType: 'global', program: {
            global: { trigger: 'sac', text, run: noop } } });
        expect(checkFaceGrammar([g('DEAL X')], VOICE_KWS)).toEqual([]);
        expect(checkFaceGrammar([g('GUARD 2 for 3 turns')], VOICE_KWS)[0].detail).toMatch(/GLOBAL: a duration/);
        expect(checkFaceGrammar([g('DEAL X instead')], VOICE_KWS)[0].detail).toMatch(/GLOBAL: "instead"/);
    });

    it('without an atlas, the capitalised words the cards print stand in as keywords', () => {
        const cards = [paid('SACRIFICE 2, CONVICTION 2'), { ...paid('Conviction 2'), id: 'd' }];
        expect(checkFaceGrammar(cards).map(v => v.id)).toEqual(['d']);
    });

    it('reads a plain card from its generated lines', () => {
        const card: Card = { ...base, free: { damage: 2 }, paidSummary: 'Deal 5.' };
        expect(checkFaceGrammar([card], VOICE_KWS)[0].detail).toBe('PAID: a full stop at the end of the line; a keyword not in capitals (Deal)');
    });
});

describe('checkTextOrder', () => {
    const card = (text: string, run: (c: ProgramCtx) => void): Card =>
        ({ ...base, program: { paid: { text, run } } });

    it('passes a line printed in the order it resolves', () => {
        expect(checkTextOrder([card('DISCARD 1. GUARD 8, DEAL = your GUARD', c => { c.discardRandom(1); c.guard(8); c.deal(8, { exact: true }); })])).toEqual([]);
        expect(checkTextOrder([card('DEAL 9, twice; SACRIFICE 2 after each', c => { c.deal(9); c.sacrifice(2); c.deal(9); c.sacrifice(2); })])).toEqual([]);
    });

    it('fails a reordered line', () => {
        const v = checkTextOrder([card('GUARD 8, DEAL 4', c => { c.deal(4); c.guard(8); })]);
        expect(v).toEqual([{ rule: 'text-order', id: 'c', detail: 'PAID prints GUARD, DEAL but resolves DEAL, GUARD' }]);
    });

    it('reads a keyword after =, a possessive, has or each as a value, not a step', () => {
        expect(checkTextOrder([card('BLIZZARD 5, GUARD = foe\'s BLIZZARD', c => { c.blizzard(5); c.guard(5, { exact: true }); })])).toEqual([]);
        expect(checkTextOrder([card('DEAL 4 or 8 if the foe has INFERNO', c => { c.deal(c.q.foeInferno ? 8 : 4); })])).toEqual([]);
    });

    it('judges only the keywords both sides have, under each probe', () => {
        const branch = card('DEAL 6 or 14 at half your VITAE, LEECH 2', c => { if (c.q.atHalf) c.leech(2); c.deal(c.q.atHalf ? 14 : 6); });
        expect(checkTextOrder([branch])[0].detail).toBe('PAID prints DEAL, LEECH but resolves LEECH, DEAL');
    });
});
