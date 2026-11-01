/**
 * The PAID line the small face prints whole (`paidFaceLine`), and the projected
 * PAID action text it sits beside, over the whole library.
 *
 * - the twelve sample cards print exactly the line the card voice shows;
 * - a Global prints its trigger and its one effect, with no duration and no
 *   closing full stop, and its PAID action text has no doubled full stop;
 * - a stat-scaled grey card prints the voice at every stat, never the old
 *   generated `Deal 6` / `vulnerable i35 d2`.
 */

import { describe, expect, it } from 'vitest';

import { cardLibrary } from '../../Cards/cards.library';
import type { Card } from '../../Cards/types';
import { lookupEffect } from '../../Effects';
import { scaleCardForStats } from '../stat-scaling';
import { paidFaceLine, toCombatCard } from '../combat.cards';

const byName = (name: string): Card => {
    const card = cardLibrary.find(c => c.name === name);
    if (!card) throw new Error(`no library card named ${name}`);
    return card;
};
const byId = (id: string): Card | undefined => cardLibrary.find(c => c.id === id);
const globals = cardLibrary.filter(c => c.program?.global);

describe('paidFaceLine', () => {
    const SAMPLE: [string, string][] = [
        ['Burn Together', 'DEAL 9, INFERNO 4'],
        ['Encase in Ice', "BLIZZARD 5, GUARD = foe's BLIZZARD"],
        ['Strike the Burning', 'DEAL 4 or 8 if the foe has INFERNO'],
        ['Shatter the Frost', "Spend all the foe's BLIZZARD, DEAL 3 +2 for each BLIZZARD spent"],
        ['Weight of Grace', "DEAL 2× foe's MERCY"],
        ['Shield Bash', 'DISCARD 1. GUARD 8, DEAL = your GUARD'],
        ['Cracking Swing', 'DISCARD 2. VULNERABLE 75% for 2 turns, DEAL 8'],
        ['Open Vein', 'TETHER 3, SACRIFICE 4, LEECH 2'],
        ['Double-Edged', 'DEAL 9, twice; SACRIFICE 2 after each'],
        ['Bloodletting', 'SACRIFICE 6, CONVICTION 5. EXILE'],
        ['Cornered', 'DEAL 6 or 14 at half your VITAE'],
        ['Callus', 'When you SACRIFICE X: DEAL X'],
    ];

    it.each(SAMPLE)('%s prints its whole PAID line', (name, line) => {
        expect(paidFaceLine(byName(name), lookupEffect)).toBe(line);
    });

    it('no card prints a closing full stop, and no Global prints a duration', () => {
        const bad: string[] = [];
        for (const card of cardLibrary) {
            const line = paidFaceLine(card, lookupEffect);
            if (/\.\s*$/.test(line)) bad.push(`${card.id}: ends with a full stop: ${line}`);
            if (card.program?.global && /rest of combat|\bin play\b|\d+ turns?\b/i.test(line)) {
                bad.push(`${card.id}: Global prints a duration: ${line}`);
            }
        }
        expect(bad).toEqual([]);
    });

    it('a discard rider stays on the PAID line', () => {
        const withRider = cardLibrary.filter(c => c.program?.onDiscard);
        expect(withRider.length).toBeGreaterThan(0);
        for (const card of withRider) {
            expect(paidFaceLine(card, lookupEffect), card.id).toContain(card.program!.onDiscard!.text.replace(/\{[a-z]+:(\d+)\}/g, '$1'));
        }
    });

    it('a stat-scaled grey card prints the voice at every stat', () => {
        const stats = { body: 6, mind: 7, heart: 7 };
        const blow = scaleCardForStats(byId('grey-strike')!, stats);
        const ward = scaleCardForStats(byId('grey-ward')!, stats);
        const word = scaleCardForStats(byId('grey-word')!, stats);
        expect(paidFaceLine(blow, lookupEffect)).toBe('DEAL 6');
        expect(paidFaceLine(ward, lookupEffect)).toBe('GUARD 7');
        expect(paidFaceLine(word, lookupEffect)).toBe('VULNERABLE 35% for 2 turns');
    });

    it('a grey card prints the same line scaled or not at neutral stats', () => {
        for (const id of ['grey-strike', 'grey-ward', 'grey-word']) {
            const card = byId(id)!;
            const neutral = scaleCardForStats(card, { body: 5, mind: 5, heart: 5 });
            expect(paidFaceLine(neutral, lookupEffect), id).toBe(paidFaceLine(card, lookupEffect));
        }
    });
});

describe('a Global\'s PAID action text', () => {
    it('there are Globals to check', () => {
        expect(globals.length).toBeGreaterThan(10);
    });

    it('never doubles a full stop before "Costs 1 die"', () => {
        const bad: string[] = [];
        for (const card of globals) {
            const projected = toCombatCard(card.id, id => byId(id), lookupEffect);
            const text = projected!.bottomActionText;
            if (/\.\./.test(text)) bad.push(`${card.id}: ${text}`);
            if (!/\. Costs 1 die\.$/.test(text)) bad.push(`${card.id}: ${text}`);
        }
        expect(bad).toEqual([]);
    });

    it('states the duration only in the projected action text, not on the face line', () => {
        const callus = toCombatCard(byName('Callus').id, id => byId(id), lookupEffect)!;
        expect(callus.bottomActionText).toContain('In play for the rest of combat. Costs 1 die.');
    });
});
