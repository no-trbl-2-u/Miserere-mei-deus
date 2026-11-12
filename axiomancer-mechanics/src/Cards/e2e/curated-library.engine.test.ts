/**
 * Hermetic E2E — card library shape guard.
 *
 * These are bug detectors: unique ids, valid
 * rank/type, every card authors a non-empty FREE line, and the grey deck
 * and reward pool resolve.
 */

import { describe, it, expect } from 'vitest';

import { cardLibrary, getCardById } from '../cards.library';
import { CARD_RANK_NAMES } from '../types';
import { COMBAT_REWARD_POOL, STARTING_CARD_IDS } from '../../Combat/combat.rewards';

describe('profane canon — shape contract', () => {
    it('every card id is unique', () => {
        const ids = cardLibrary.map(c => c.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    // A malformed id breaks lookups, so this is a bug detector, not a style law.
    it('every card id is kebab-case', () => {
        const malformed = cardLibrary.map(c => c.id).filter(id => !/^[a-z][a-z0-9-]*$/.test(id));
        expect(malformed).toEqual([]);
    });

    it('every rank is a named rung on the ladder', () => {
        for (const card of cardLibrary) {
            expect(CARD_RANK_NAMES[card.rank], `${card.id} rank ${card.rank}`).toBeTruthy();
        }
    });
});

describe('profane canon — FREE/PAID anatomy', () => {
    it('every card carries an authored FREE rider with substance', () => {
        for (const card of cardLibrary) {
            // A program card's FREE line is a program line (a Global's FREE
            // line puts it in play for 3 turns).
            if (card.program) {
                expect(card.program.free ?? card.program.global, `${card.id} must author a FREE line`).toBeDefined();
                continue;
            }
            expect(card.free, `${card.id} must author a FREE line`).toBeDefined();
            const total = Object.values(card.free!).reduce<number>((n, v) => {
                if (typeof v === 'number') return n + v;
                if (v === true) return n + 1;
                if (typeof v === 'object' && v !== null) return n + 1; // applyEffect
                return n;
            }, 0);
            expect(total, `${card.id} FREE line must not be empty`).toBeGreaterThan(0);
        }
    });
});

describe('profane canon — id hygiene and provenance', () => {
    it('every card has the required shape', () => {
        for (const card of cardLibrary) {
            expect(card.id).toMatch(/^[a-z][a-z0-9-]*$/);
            expect([1, 2, 3]).toContain(card.tier);
            expect([1, 2, 3, 4, 5, 6]).toContain(card.rank);
            expect(['attack', 'skill', 'spell', 'global', 'curse']).toContain(card.cardType);
            expect(['self', 'enemy']).toContain(card.targetType);
            expect(['body', 'mind', 'heart', 'any']).toContain(card.color);
            // Provenance stamp: a well-formed ISO date.
            expect(card.addedIn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
    });

    it('the starting set resolves, teaches a mechanic each, and is the 5/3/2 grey recipe', () => {
        // The grey office — a brand-new player's first ten cards are three
        // colourless shapes: 'any' means every die powers every starter.
        // Blow 5, Ward 3, Word 2.
        expect(STARTING_CARD_IDS).toEqual([
            'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike',
            'grey-ward', 'grey-ward', 'grey-ward',
            'grey-word', 'grey-word',
        ]);
        for (const id of STARTING_CARD_IDS) {
            const card = getCardById(id);
            expect(card, id).toBeDefined();
            expect(card!.rank).toBe(1); // starters are Ash
            expect(card!.tags).toContain('starter');
        }
        const aspects = new Set(STARTING_CARD_IDS.map(id => getCardById(id)!.color));
        expect([...aspects]).toEqual(['any']);
    });

    it('every reward-pool id resolves', () => {
        // The grey office IS the reward pool.
        expect(COMBAT_REWARD_POOL.length).toBeGreaterThan(0);
        for (const id of COMBAT_REWARD_POOL) {
            expect(getCardById(id), `reward pool: ${id}`).toBeDefined();
        }
    });
});
