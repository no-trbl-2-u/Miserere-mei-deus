/**
 * Rarity in the card rewards.
 *
 * The contract this file pins:
 *   · a normal reward draws each offer's rarity first, by
 *     `CARD_REWARD_RARITY_WEIGHTS` (common 60, uncommon 30, rare 10), then a
 *     card of that rarity; over 10,000 seeded rolls the offers split about
 *     60/30/10 when every band has cards;
 *   · a drawn band with no card left falls to the next band down, then up;
 *   · an elite reward offers only rare cards while three or more rares are in
 *     its pool, and fills from the best band left when fewer are.
 */

import { describe, it, expect } from 'vitest';

import {
    CARD_REWARD_RARITY_WEIGHTS, rewardRarityOrder, rollCombatCardRewards, rollEliteCardRewards, rewardPoolFor,
} from '../combat.rewards';
import { CARD_LANES, getCardLane, laneRewardPool, type CardLane } from '../../Cards/card.lanes';
import { getCardById } from '../../Cards/cards.library';
import { rankToRarity, type CardRarity } from '../../Cards/types';
import { Player } from '../../Character/characters.mock';
import { deepClone } from '../../Utils';
import type { Character } from '../../Character/types';
import type { Equipment } from '../../Items/types';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

/** Spreads consecutive indexes into well-separated seeds. */
const spread = (i: number): number => (i + 1) * 7919;

const rarityOf = (id: string): CardRarity => rankToRarity(getCardById(id)!.rank);

/** A player who wears no relic and starts on the given lanes. */
function onLanes(...laneIds: string[]): Character {
    const player = deepClone(Player);
    return { ...player, equipment: { ...player.equipment, relics: [] }, startingLaneIds: laneIds as [string, string] };
}

/** The player wearing one fixture relic per lane id. */
function wearing(player: Character, ...laneIds: string[]): Character {
    const relics: Equipment[] = laneIds.map((laneId, i) => ({
        id: `fixture-relic-${laneId}-${i}`, name: `Fixture ${laneId}`, description: '',
        category: 'equipment', slot: 'relic', laneId,
    } as Equipment));
    return { ...player, equipment: { weapon: null, armor: null, relics } };
}

function bandCounts(ids: readonly string[]): Record<CardRarity, number> {
    const counts: Record<CardRarity, number> = { common: 0, uncommon: 0, rare: 0 };
    for (const id of ids) counts[rarityOf(id)] += 1;
    return counts;
}

const ROLLS = 10_000;

describe('the normal reward weighs rarity', () => {
    it('pins the weights at common 60, uncommon 30, rare 10', () => {
        expect(CARD_REWARD_RARITY_WEIGHTS).toEqual({ common: 60, uncommon: 30, rare: 10 });
    });

    it('the player\'s pool holds every band, so the split below is not a fallback artifact', () => {
        const counts = bandCounts(rewardPoolFor(onLanes('blood-price', 'merciful')));
        expect(counts.common).toBeGreaterThan(0);
        expect(counts.uncommon).toBeGreaterThan(0);
        expect(counts.rare).toBeGreaterThan(0);
    });

    it(`one offer per roll splits 60/30/10 over ${ROLLS} seeds, within two points`, () => {
        const player = onLanes('blood-price', 'merciful');
        const offers: string[] = [];
        for (let i = 0; i < ROLLS; i++) offers.push(...rollCombatCardRewards(player, seededRng(spread(i)), 1));
        const counts = bandCounts(offers);
        expect(Math.abs(counts.common / ROLLS - 0.6)).toBeLessThanOrEqual(0.02);
        expect(Math.abs(counts.uncommon / ROLLS - 0.3)).toBeLessThanOrEqual(0.02);
        expect(Math.abs(counts.rare / ROLLS - 0.1)).toBeLessThanOrEqual(0.02);
    });

    it(`three offers per roll, lane slots included, split about 60/30/10 over ${ROLLS} seeds`, () => {
        const player = wearing(onLanes('blood-price', 'merciful'), 'blood-price');
        const offers: string[] = [];
        for (let i = 0; i < ROLLS; i++) offers.push(...rollCombatCardRewards(player, seededRng(spread(i)), 3));
        const counts = bandCounts(offers);
        const total = offers.length;
        expect(total).toBe(ROLLS * 3);
        expect(Math.abs(counts.common / total - 0.6)).toBeLessThanOrEqual(0.03);
        expect(Math.abs(counts.uncommon / total - 0.3)).toBeLessThanOrEqual(0.03);
        expect(Math.abs(counts.rare / total - 0.1)).toBeLessThanOrEqual(0.03);
    });

    it('a band with no card falls to the next band down, then up', () => {
        expect(rewardRarityOrder('rare')).toEqual(['rare', 'uncommon', 'common']);
        expect(rewardRarityOrder('uncommon')).toEqual(['uncommon', 'common', 'rare']);
        expect(rewardRarityOrder('common')).toEqual(['common', 'uncommon', 'rare']);
    });

    it('the Defender pool has no rare: a drawn rare falls to an uncommon', () => {
        const defenderOnly: CardLane[] = CARD_LANES.filter(lane => lane.id === 'defender' || lane.id === 'grey');
        const player = onLanes('defender', 'grey');
        expect(bandCounts(rewardPoolFor(player, defenderOnly)).rare).toBe(0);
        // 0.95 lands in the rare tenth of the weights; the card pick reuses it.
        const [offer] = rollCombatCardRewards(player, () => 0.95, 1, defenderOnly);
        expect(rarityOf(offer)).toBe('uncommon');
        const counts = bandCounts(Array.from({ length: 2000 }, (_, i) =>
            rollCombatCardRewards(player, seededRng(spread(i)), 1, defenderOnly)[0]));
        expect(Math.abs(counts.uncommon / 2000 - 0.4)).toBeLessThanOrEqual(0.03);
    });

    it('a band drawn out by earlier offers falls through, so offers stay distinct', () => {
        const player = onLanes('blood-price', 'merciful');
        const pool = rewardPoolFor(player);
        const rares = pool.filter(id => rarityOf(id) === 'rare').length;
        // Always the rare band: the rares go first, then uncommons fill the rest.
        const offers = rollCombatCardRewards(player, () => 0.99, rares + 2);
        expect(new Set(offers).size).toBe(offers.length);
        expect(offers.slice(0, rares).every(id => rarityOf(id) === 'rare')).toBe(true);
        expect(offers.slice(rares).every(id => rarityOf(id) === 'uncommon')).toBe(true);
    });
});

describe('the elite reward offers rares', () => {
    it('offers only rares while three or more are in the pool', () => {
        const player = onLanes('blood-price', 'merciful');
        expect(bandCounts(rewardPoolFor(player)).rare).toBeGreaterThanOrEqual(3);
        for (let i = 0; i < 200; i++) {
            const cards = rollEliteCardRewards(player, seededRng(spread(i)));
            expect(cards).toHaveLength(3);
            expect(cards.map(rarityOf)).toEqual(['rare', 'rare', 'rare']);
        }
    });

    it('a deck on a lane with no rare still gets three rares when the pool holds them', () => {
        const defender = getCardLane('defender')!;
        const player = { ...wearing(onLanes('defender', 'blood-price'), 'merciful'), knownCards: [defender.cardIds[0]] };
        const pool = rewardPoolFor(player);
        expect(pool.filter(id => laneRewardPool(['defender']).includes(id)).length).toBeGreaterThan(0);
        expect(bandCounts(pool).rare).toBeGreaterThanOrEqual(3);
        for (let i = 0; i < 200; i++) {
            expect(rollEliteCardRewards(player, seededRng(spread(i))).map(rarityOf)).toEqual(['rare', 'rare', 'rare']);
        }
    });

    it('fills from the best band left when fewer than three rares are in the pool', () => {
        const player = onLanes('blood-price', 'defender');
        const rares = bandCounts(rewardPoolFor(player)).rare;
        expect(rares).toBeGreaterThan(0);
        expect(rares).toBeLessThan(3);
        for (let i = 0; i < 200; i++) {
            const bands = rollEliteCardRewards(player, seededRng(spread(i))).map(rarityOf).sort();
            expect(bands.filter(b => b === 'rare')).toHaveLength(rares);
            expect(bands.filter(b => b === 'uncommon')).toHaveLength(3 - rares);
        }
    });
});
