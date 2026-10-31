/**
 * The reward draft — the post-combat 1-of-3.
 *
 * The contract this file pins:
 *   · determinism — same player + same seeded rng ⇒ same offers, always;
 *   · offers are always distinct and always resolvable;
 *   · the pool is the player's lanes, never grey, and every one of its cards
 *     is reachable (a uniform draw, no steering);
 *   · a player on no lane has no pool: the draft throws, it never falls back;
 *   · a request larger than the pool returns the whole pool, never a repeat.
 * The worn-lane rule itself is pinned in `e2e/reward-lanes.engine.test.ts`.
 */

import { describe, it, expect } from 'vitest';

import {
    COMBAT_REWARD_POOL, addRewardCard, rollCombatCardRewards, rewardPoolFor,
} from './combat.rewards';
import { GREY_LANE } from '../Cards/card.lanes';
import { cardLibrary, getCardById } from '../Cards/cards.library';
import { Player } from '../Character/characters.mock';
import { CHARACTER_ROSTER } from '../Character/roster';
import { createNewGameState } from '../Game/game.reducer';
import { deepClone } from '../Utils';
import type { Character } from '../Character/types';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

/** The Chosen as the new-run path deals it: two starting lanes and the ring worn. */
function chosenPlayer(): Character {
    return createNewGameState({ characterId: 'the-chosen' }).player;
}

/** A player on no lane: nothing worn, no starting lane, no dev override. */
function laneless(): Character {
    const player = deepClone(Player);
    return { ...player, equipment: { ...player.equipment, relics: [] } };
}

describe('the reward pool', () => {
    it('is the whole library but the Curses, every id resolving', () => {
        expect([...COMBAT_REWARD_POOL].sort()).toEqual(
            cardLibrary.filter(c => c.cardType !== 'curse').map(c => c.id).sort(),
        );
        for (const id of COMBAT_REWARD_POOL) expect(getCardById(id), id).toBeDefined();
    });

    it('is never empty and never grey for any roster character, at the start of the run', () => {
        expect(CHARACTER_ROSTER.length).toBeGreaterThan(0);
        for (const def of CHARACTER_ROSTER) {
            const { player } = createNewGameState({ characterId: def.id });
            const pool = rewardPoolFor(player);
            expect(pool.length, def.id).toBeGreaterThan(0);
            for (const id of pool) expect(GREY_LANE.cardIds, `${def.id} ${id}`).not.toContain(id);
        }
    });

    it('is empty-handed no more: a player on no lane throws instead of falling back to grey', () => {
        expect(() => rewardPoolFor(laneless())).toThrow(/no reward pool/);
        expect(() => rollCombatCardRewards(laneless(), seededRng(1), 3)).toThrow(/no reward pool/);
    });

    it('the pre-run shell (no characterId) holds explicit lanes, so its pool is never empty or grey', () => {
        const pool = rewardPoolFor(createNewGameState().player);
        expect(pool.length).toBeGreaterThan(0);
        for (const id of pool) expect(GREY_LANE.cardIds).not.toContain(id);
    });
});

describe('rollCombatCardRewards', () => {
    it('is deterministic for a seed', () => {
        const a = rollCombatCardRewards(chosenPlayer(), seededRng(4242), 3);
        const b = rollCombatCardRewards(chosenPlayer(), seededRng(4242), 3);
        expect(a).toEqual(b);
    });

    it('offers distinct, resolvable pool cards', () => {
        for (let seed = 1; seed <= 50; seed++) {
            const offers = rollCombatCardRewards(chosenPlayer(), seededRng(seed), 2);
            expect(new Set(offers).size).toBe(offers.length);
            for (const id of offers) expect(rewardPoolFor(chosenPlayer())).toContain(id);
        }
    });

    it('offers no grey card', () => {
        for (let seed = 1; seed <= 50; seed++) {
            for (const id of rollCombatCardRewards(chosenPlayer(), seededRng(seed), 3)) {
                expect(GREY_LANE.cardIds).not.toContain(id);
            }
        }
    });

    it('reaches every pool card as a single offer', () => {
        // No relic worn: a worn lane relic would steer a guaranteed slot.
        const unsteered = (): Character => {
            const p = chosenPlayer();
            return { ...p, equipment: { ...p.equipment, relics: [] } };
        };
        const pool = rewardPoolFor(unsteered());
        const seen = new Set<string>();
        for (let i = 0; i < pool.length; i++) {
            seen.add(rollCombatCardRewards(unsteered(), ()=> (i + 0.5) / pool.length, 1)[0]);
        }
        expect([...seen].sort()).toEqual([...pool].sort());
    });

    it('caps at the pool size, never repeating a card', () => {
        const pool = rewardPoolFor(chosenPlayer());
        const offers = rollCombatCardRewards(chosenPlayer(), seededRng(9), pool.length + 25);
        expect(offers.length).toBe(pool.length);
        expect(new Set(offers).size).toBe(offers.length);
    });
});

describe('addRewardCard', () => {
    it('appends the pick to the persistent reward collection', () => {
        const rewarded = addRewardCard(chosenPlayer(), COMBAT_REWARD_POOL[0]);
        expect(rewarded.combatRewardCards).toEqual([COMBAT_REWARD_POOL[0]]);
    });
});
