/**
 * THE GREY OFFICE — the whole player card library.
 *
 * New cards arrive only from a brief T wrote or approved. These three are
 * the fresh-run deck (Blow 5 / Ward 3 / Word 2) and the reward pool.
 *
 * This file is data-only. All runtime behaviour lives in
 * `src/Cards/card.engine.ts` and `src/Combat/combat.engine.ts`.
 */

import type { Card } from '../types';

// ─── THE GREY OFFICE — the fresh-run seed ────────────────────────────────────
// Colourless shapes (aspect 'any' — every die colour powers them).
// Deliberately plain: fight one teaches
// STRIKE, WARD, FREE-vs-PAID, and the die-spend loop with zero colour
// arithmetic. They are also the whole reward pool.

const GREY_ADDED = '2026-09-20';

const greyStrike: Card = {
    id: 'grey-strike',
    name: 'A Plain Blow',
    color: 'any',
    description:
        'No flourish, no colour, no argument. You hit the thing that is ' +
        'hitting you. It works today the same as it will in a month.',
    tier: 1, rank: 1, cardType: 'attack',
    targetType: 'enemy',
    paidSummary: 'DEAL 5',
    free: { damage: 2 },
    specialMechanics: [{ kind: 'deal', amount: 5 }],
    addedIn: GREY_ADDED,
    tags: ['grey', 'starter'],
};

const greyWard: Card = {
    id: 'grey-ward',
    name: 'A Plain Ward',
    color: 'any',
    description:
        'No flourish, no colour, no argument. You put something solid ' +
        'between yourself and the thing that wants in.',
    tier: 1, rank: 1, cardType: 'skill',
    targetType: 'self',
    paidSummary: 'GUARD 5',
    free: { guard: 2 },
    specialMechanics: [{ kind: 'guard', amount: 5 }],
    addedIn: GREY_ADDED,
    tags: ['grey', 'starter'],
};

// A Plain Word — the grey office's heart verb: VULNERABLE lands on the foe, so heart scales its
// percentage (`stat-scaling.ts`). Grey frame like its siblings.
const greyWord: Card = {
    id: 'grey-word',
    name: 'A Plain Word',
    color: 'any',
    description:
        'No flourish, no colour, no argument. You tell it plainly what it ' +
        'is, and it cannot unhear you.',
    tier: 1, rank: 1, cardType: 'spell',
    targetType: 'enemy',
    paidSummary: 'VULNERABLE 25% for 2 turns',
    // +25% for 2 turns, adds up and refreshes on re-application; FREE is
    // the same verb at whisper volume. Both scale with heart.
    free: { applyEffect: { effectId: 'debuff_vulnerable', intensity: 10, duration: 1 } },
    combatEffects: [{ effectId: 'debuff_vulnerable', appliedTo: 'opponent', intensity: 25, duration: 2 }],
    addedIn: '2026-09-27',
    tags: ['grey', 'starter'],
};

/** The grey office: the entire player card library, and the reward pool. */
export const GREY_OFFICE_CARDS: Card[] = [greyStrike, greyWard, greyWord];
