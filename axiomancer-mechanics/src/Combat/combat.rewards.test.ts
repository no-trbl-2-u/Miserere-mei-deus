/**
 * The reward draft — the post-combat 1-of-3.
 *
 * The contract this file pins:
 *   · determinism — same player + same seeded rng ⇒ same offers, always;
 *   · offers are always distinct and always resolvable;
 *   · with no lane relic worn the pool is the grey office, and every one of
 *     its cards is reachable (a uniform draw, no steering);
 *   · a request larger than the pool returns the whole pool, never a repeat.
 * The worn-lane rule itself is pinned in `e2e/reward-lanes.engine.test.ts`.
 */

import { describe, it, expect } from 'vitest';

import {
    COMBAT_REWARD_POOL, STARTING_CARD_IDS, addRewardCard, rollCombatCardRewards, rewardPoolFor,
} from './combat.rewards';
import { GREY_LANE } from '../Cards/card.lanes';
import { cardLibrary, getCardById } from '../Cards/cards.library';
import { Player } from '../Character/characters.mock';
import { deepClone } from '../Utils';
import type { Character } from '../Character/types';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

/** The mock player wears the Suppliant's Ring, which opens the Merciful lane; a grey player wears no relic. */
function greyPlayer(): Character {
    const player = deepClone(Player);
    return { ...player, knownCards: [...STARTING_CARD_IDS], combatRewardCards: [], equipment: { ...player.equipment, relics: [] } };
}

describe('the reward pool', () => {
    it('is the whole library but the Curses, every id resolving', () => {
        expect([...COMBAT_REWARD_POOL].sort()).toEqual(
            cardLibrary.filter(c => c.cardType !== 'curse').map(c => c.id).sort(),
        );
        for (const id of COMBAT_REWARD_POOL) expect(getCardById(id), id).toBeDefined();
    });
});

describe('rollCombatCardRewards', () => {
    it('is deterministic for a seed', () => {
        const a = rollCombatCardRewards(greyPlayer(), seededRng(4242), 3);
        const b = rollCombatCardRewards(greyPlayer(), seededRng(4242), 3);
        expect(a).toEqual(b);
    });

    it('offers distinct, resolvable pool cards', () => {
        for (let seed = 1; seed <= 50; seed++) {
            const offers = rollCombatCardRewards(greyPlayer(), seededRng(seed), 2);
            expect(new Set(offers).size).toBe(offers.length);
            for (const id of offers) expect(rewardPoolFor(greyPlayer())).toContain(id);
        }
    });

    it('with no lane relic worn, the pool is the grey office', () => {
        expect(rewardPoolFor(greyPlayer())).toEqual([...GREY_LANE.cardIds]);
    });

    it('reaches every pool card as a single offer', () => {
        const pool = rewardPoolFor(greyPlayer());
        const seen = new Set<string>();
        for (let i = 0; i < pool.length; i++) {
            seen.add(rollCombatCardRewards(greyPlayer(), () => (i + 0.5) / pool.length, 1)[0]);
        }
        expect([...seen].sort()).toEqual([...pool].sort());
    });

    it('caps at the pool size, never repeating a card', () => {
        const pool = rewardPoolFor(greyPlayer());
        const offers = rollCombatCardRewards(greyPlayer(), seededRng(9), pool.length + 25);
        expect(offers.length).toBe(pool.length);
        expect(new Set(offers).size).toBe(offers.length);
    });
});

describe('addRewardCard', () => {
    it('appends the pick to the persistent reward collection', () => {
        const rewarded = addRewardCard(greyPlayer(), COMBAT_REWARD_POOL[0]);
        expect(rewarded.combatRewardCards).toEqual([COMBAT_REWARD_POOL[0]]);
    });
});
