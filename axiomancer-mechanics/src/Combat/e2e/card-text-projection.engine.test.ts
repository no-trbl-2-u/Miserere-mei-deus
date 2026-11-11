/**
 * The card-text projection must be the SAME truth as the printed lines.
 *
 * `combat.card-text.ts` exists so mobile stops re-deriving the card's payload
 * (owner finding 4 — the detail panel disagreed with the card). That only
 * holds if the clause list is exhaustive and its wording is the engine's own,
 * so this guard pins both against the whole live library:
 *
 * - joined FREE clauses === `riderText(card.free)`
 * - joined PAID clauses === `paidText(card)`
 * - every authored status and every mechanic the engine prints has a clause
 * - no clause carries a number its own engine wording does not print
 */

import { describe, expect, it } from 'vitest';

import { cardLibrary } from '../../Cards/cards.library';
import type { Card } from '../../Cards/types';
import { lookupEffect } from '../../Effects';
import { mechanicText, paidText, riderText } from '../combat.cards';
import {
    clausesText, freeClauses, paidClauses, paidDetailText, riderClauses,
} from '../combat.card-text';

describe('card-text projection', () => {
    it('the FREE clause list rejoins into the engine\'s own rider text', () => {
        const drift: string[] = [];
        for (const card of cardLibrary) {
            if (!card.free) continue;
            const opts = { selfTargetCard: card.targetType === 'self' };
            const joined = clausesText(riderClauses(card.free, opts));
            const engine = riderText(card.free, opts);
            if (joined !== engine) drift.push(`${card.id}: "${joined}" !== "${engine}"`);
        }
        expect(drift).toEqual([]);
    });

    it('the PAID clause list rejoins into the engine\'s own paid text', () => {
        const drift: string[] = [];
        for (const card of cardLibrary) {
            const joined = paidDetailText(card, lookupEffect);
            const engine = paidText(card, lookupEffect);
            if (joined !== engine) drift.push(`${card.id}: "${joined}" !== "${engine}"`);
        }
        expect(drift).toEqual([]);
    });

    it('no authored payload is dropped from the PAID clause list', () => {
        const missing: string[] = [];
        for (const card of cardLibrary) {
            const clauses = paidClauses(card, lookupEffect);
            for (const ce of card.combatEffects ?? []) {
                if (!lookupEffect(ce.effectId)) continue;
                if (!clauses.some(c => c.source === 'effect' && c.id === ce.effectId)) {
                    missing.push(`${card.id}: status ${ce.effectId}`);
                }
            }
            for (const m of card.specialMechanics ?? []) {
                if (!mechanicText(m)) continue;
                if (!clauses.some(c => c.source === 'mechanic' && c.id === m.kind)) {
                    missing.push(`${card.id}: mechanic ${m.kind}`);
                }
            }
        }
        expect(missing).toEqual([]);
    });

    it('a clause never carries a number its own wording does not print', () => {
        const bad: string[] = [];
        for (const card of cardLibrary) {
            const all = [...paidClauses(card, lookupEffect), ...freeClauses(card)];
            for (const c of all) {
                const printed = (c.text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
                for (const n of c.numbers) {
                    if (!printed.includes(n)) bad.push(`${card.id}/${c.id}: ${n} not in "${c.text}"`);
                }
            }
        }
        expect(bad).toEqual([]);
    });

    it('a DEAL clause survives on a card that also carries other verbs', () => {
        // The exact regression behind finding 4: a card that dealt 20 alongside
        // other verbs lost its DEAL clause, because DEAL carries no keyword
        // badge and the old presenter walk was keyed on badges. After the card
        // purge (P1, 2026-09-27) no library card pairs DEAL with another verb,
        // so the witness is Blow widened in place: DEAL 20 plus
        // Word's VULNERABLE status.
        const strike = cardLibrary.find(c => c.id === 'grey-strike');
        const word = cardLibrary.find(c => c.id === 'grey-word');
        expect(strike).toBeDefined();
        expect(word).toBeDefined();
        const card: Card = {
            ...strike!,
            id: 'multi-verb-witness',
            paidSummary: undefined,
            specialMechanics: [{ kind: 'deal', amount: 20 }],
            combatEffects: word!.combatEffects,
        };
        const clauses = paidClauses(card, lookupEffect);
        const deal = clauses.find(c => c.id === 'deal');
        expect(deal).toBeDefined();
        expect(deal!.label).toBe('DEAL');
        expect(deal!.value).toBe('20');
        expect(clauses.some(c => c.source === 'effect' && c.id === 'debuff_vulnerable')).toBe(true);
    });
});
