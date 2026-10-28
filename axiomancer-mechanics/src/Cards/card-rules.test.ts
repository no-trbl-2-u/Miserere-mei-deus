/**
 * Unit — the card-rule checkers on hand-built cards (Phase CS1). The fence
 * over the real library is `e2e/card-rules.engine.test.ts`.
 */

import { describe, it, expect } from 'vitest';

import type { Card } from './types';
import {
    cardConditions, cardLinesText, checkCarrierRule, checkComplexityBudget,
    checkDiscardCost, checkGlobalTemplate, checkScrapFloor, parseAtlasKeywords, printedKeywords,
    type AtlasKeyword,
} from './card-rules';

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
        const card: Card = { ...base, program: { free: { text: 'DEAL {deal:3} at half VITAE or less.', run: noop } } };
        expect(cardLinesText(card).free).toBe('DEAL 3 at half VITAE or less.');
        expect(printedKeywords(card)).toEqual(['DEAL']);
        expect(cardConditions(card)).toEqual(['at half VITAE']);
    });

    it('counts a Global trigger as a condition and its type as a printed word', () => {
        const card: Card = { ...base, cardType: 'global', program: {
            global: { trigger: 'sac', text: 'GUARD n.', free: noop, paid: noop } } };
        expect(printedKeywords(card)).toEqual(['GLOBAL', 'GUARD', 'SACRIFICE']);
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
    const global = (text: string, paidDelta?: string): Card => ({ ...base, cardType: 'global', program: {
        global: { trigger: 'turn', text, paidDelta, free: noop, paid: noop } } });

    it('passes a body with no duration and a PAID change that differs', () => {
        expect(checkGlobalTemplate([global('GUARD 2.', 'GUARD 4 instead.')])).toEqual([]);
    });

    it('flags a printed duration and a PAID line that changes nothing', () => {
        expect(checkGlobalTemplate([global('GUARD 2 for 3 turns.')])[0].detail).toMatch(/duration/);
        expect(checkGlobalTemplate([global('GUARD 2.', 'GUARD 2.')])[0].detail).toMatch(/changes nothing/);
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
