/**
 * The Curses a foe's move puts in your hand. They are not in the player
 * library (no reward, shop or deck ever holds one): `getCardById` resolves
 * them so the hand can show them, and the engine owns what they do.
 */

import type { Card } from '../types';

/** The BARNACLE word's card: a foe's move puts it in your hand. */
export const BARNACLE_ID = 'barnacle';

/**
 * BARNACLE: a Curse that holds a hand slot. It cannot be played or scrapped;
 * it falls off when you spend a body die on a card (`combat.engine.ts`).
 */
export const BARNACLE_CARD: Card = {
    id: BARNACLE_ID,
    name: 'Barnacle',
    color: 'any',
    description: 'A dead card that holds a hand slot. It cannot be played or scrapped. It falls off when you spend a body die on a card.',
    tier: 1, rank: 1, cardType: 'curse', targetType: 'self',
    tags: ['enemy-word', 'curse'],
};

/** Cards the engine can resolve by id that are not in the player library. */
export const ENEMY_CURSE_CARDS: readonly Card[] = Object.freeze([BARNACLE_CARD]);
