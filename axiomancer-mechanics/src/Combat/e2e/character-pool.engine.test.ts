/**
 * The character's reward pool: starting lanes plus worn relics (Phase CH1b,
 * A3 of `plan/phases/phase_CH1_character_select.md`).
 *
 * The contract this file pins, against fixture lanes, fixture relics and a
 * fixture character (the real roster is empty):
 *   · the pool is the cards of the character's two starting lanes and of every
 *     worn relic's lane, each lane once, registry order, grey never;
 *   · wearing a relic of another lane adds that lane, unequipping it removes
 *     it, carrying it unworn changes nothing;
 *   · taking off the starting relic removes ITS lane, never a starting lane;
 *   · the guaranteed lane slots still count worn relics only, so starting lanes
 *     widen the pool and never add a guaranteed slot;
 *   · no offer is ever a grey card; a player on no lane has no pool.
 */

import { describe, it, expect } from 'vitest';

import {
    rewardLaneSlots, rewardPoolFor, rollCombatCardRewards, rollEliteCardRewards, unlockedLaneIds,
} from '../combat.rewards';
import { createNewGameState } from '../../Game/game.reducer';
import { GREY_LANE, getCardLane, type CardLane } from '../../Cards/card.lanes';
import type { CharacterDefinition } from '../../Character/roster';
import type { Character } from '../../Character/types';
import type { Equipment } from '../../Items/types';

const BLOOD = getCardLane('blood-price')!.cardIds;
const EMBER = getCardLane('elementalist')!.cardIds;
const half = (ids: readonly string[], second: boolean): string[] =>
    [...(second ? ids.slice(Math.floor(ids.length / 2)) : ids.slice(0, Math.floor(ids.length / 2)))];

const laneOf = (id: string, cardIds: string[]): CardLane => ({ id, name: id, cardIds, testDeck: [] });

/** Four disjoint fixture lanes cut from the real trial sets' cards. */
const LANE_X = laneOf('fx-x', half(BLOOD, false));
const LANE_Y = laneOf('fx-y', half(BLOOD, true));
const LANE_Z = laneOf('fx-z', half(EMBER, false));
const LANE_W = laneOf('fx-w', half(EMBER, true));
const LANES: readonly CardLane[] = [GREY_LANE, LANE_X, LANE_Y, LANE_Z, LANE_W];

function relic(id: string, laneId?: string): Equipment {
    return { id, name: id, description: '', category: 'equipment', slot: 'relic', statModifiers: [], laneId };
}

const START_RELIC = relic('fx-start-relic', 'fx-z');
const RELIC_W = relic('fx-relic-w', 'fx-w');
const RELIC_X = relic('fx-relic-x', 'fx-x');
const RELICS: readonly Equipment[] = [START_RELIC, RELIC_W, RELIC_X];

const FIXTURE: CharacterDefinition = {
    id: 'fx-character',
    name: 'Fixture Character',
    portraitKey: 'portrait-1',
    startingRelicId: START_RELIC.id,
    baseStats: { heart: 5, body: 5, mind: 5 },
    startingLaneIds: ['fx-x', 'fx-y'],
    startingCardIds: [LANE_X.cardIds[0], LANE_Y.cardIds[0]],
    playstyle: 'Fixture.',
};

const SEEDS = Array.from({ length: 60 }, (_, i) => (i + 1) * 104729);

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

/** The fixture character's fresh run (starting relic worn), then `wear` added and `carry` carried. */
function character(wear: Equipment[] = [], carry: Equipment[] = []): Character {
    const { player } = createNewGameState({ characterId: FIXTURE.id, roster: [FIXTURE], relics: RELICS });
    return {
        ...player,
        inventory: [...player.inventory, ...wear, ...carry],
        equipment: { ...player.equipment, relics: [...player.equipment.relics, ...wear] },
        devRewardLaneIds: undefined,
    };
}

const cardsOf = (...lanes: CardLane[]): string[] => lanes.flatMap(l => l.cardIds);
const unlocked = (p: Character) => unlockedLaneIds(p, LANES, RELICS);
const roll = (p: Character, seed: number, count = 3) => rollCombatCardRewards(p, seededRng(seed), count, LANES, RELICS);

describe('A3 · the pool is the starting lanes plus the worn relics\' lanes', () => {
    it('a fresh character with its starting relic worn: X, Y and Z, registry order', () => {
        const p = character();
        expect(p.equipment.relics.map(r => r.id)).toEqual(['fx-start-relic']);
        expect(unlocked(p)).toEqual(['fx-x', 'fx-y', 'fx-z']);
        expect(rewardPoolFor(p, LANES, RELICS).sort()).toEqual(cardsOf(LANE_X, LANE_Y, LANE_Z).sort());
    });

    it('over many seeds every offer comes from X, Y or Z, distinct', () => {
        const allowed = new Set(cardsOf(LANE_X, LANE_Y, LANE_Z));
        const p = character();
        for (const seed of SEEDS) {
            const offers = roll(p, seed);
            expect(offers).toHaveLength(3);
            expect(new Set(offers).size).toBe(3);
            for (const id of offers) expect(allowed.has(id)).toBe(true);
        }
    });

    it('wearing a relic of lane W adds W', () => {
        const p = character([RELIC_W]);
        expect(unlocked(p)).toEqual(['fx-x', 'fx-y', 'fx-z', 'fx-w']);
        const allowed = new Set(cardsOf(LANE_X, LANE_Y, LANE_Z, LANE_W));
        const seen = new Set<string>();
        for (const seed of SEEDS) for (const id of roll(p, seed)) {
            expect(allowed.has(id)).toBe(true);
            if (LANE_W.cardIds.includes(id)) seen.add(id);
        }
        expect(seen.size).toBeGreaterThan(0);
    });

    it('unequipping the W relic removes W again', () => {
        const worn = character([RELIC_W]);
        const off = { ...worn, equipment: { ...worn.equipment, relics: worn.equipment.relics.filter(r => r.id !== RELIC_W.id) } };
        expect(unlocked(off)).toEqual(['fx-x', 'fx-y', 'fx-z']);
        for (const seed of SEEDS) for (const id of roll(off, seed)) expect(LANE_W.cardIds).not.toContain(id);
    });

    it('carrying the W relic unworn changes nothing', () => {
        const p = character([], [RELIC_W]);
        expect(unlocked(p)).toEqual(['fx-x', 'fx-y', 'fx-z']);
        expect(rewardPoolFor(p, LANES, RELICS)).toEqual(rewardPoolFor(character(), LANES, RELICS));
    });

    it('taking off the starting relic removes Z and keeps X and Y', () => {
        const p = character();
        const bare = { ...p, equipment: { ...p.equipment, relics: [] } };
        expect(unlocked(bare)).toEqual(['fx-x', 'fx-y']);
        const allowed = new Set(cardsOf(LANE_X, LANE_Y));
        for (const seed of SEEDS) for (const id of roll(bare, seed)) expect(allowed.has(id)).toBe(true);
    });

    it('a worn relic of a starting lane is that lane once, not twice', () => {
        const p = character([RELIC_X]);
        expect(unlocked(p)).toEqual(['fx-x', 'fx-y', 'fx-z']);
    });

    it('a starting lane the registry does not carry opens nothing; grey is never unlocked', () => {
        const p = { ...character(), startingLaneIds: ['grey', 'no-such-lane', 'fx-y'] };
        expect(unlocked(p)).toEqual(['fx-y', 'fx-z']);
    });

    it('no offer is ever a grey card, from the pool, the roll or the elite reward', () => {
        const grey = new Set(GREY_LANE.cardIds);
        const p = character([RELIC_W]);
        expect(rewardPoolFor(p, LANES, RELICS).some(id => grey.has(id))).toBe(false);
        for (const seed of SEEDS) {
            expect(roll(p, seed).some(id => grey.has(id))).toBe(false);
            expect(rollEliteCardRewards(p, seededRng(seed), 3, LANES, RELICS).some(id => grey.has(id))).toBe(false);
        }
    });
});

describe('A3 · the D100 lane slots count worn relics only', () => {
    it('the starting relic alone gives one slot, from its lane Z, never from X or Y', () => {
        const p = character();
        for (const seed of SEEDS) {
            expect(rewardLaneSlots(p, seededRng(seed), LANES, RELICS)).toEqual({ laneId: 'fx-z', slots: 1 });
        }
    });

    it('with no relic worn the starting lanes widen the pool but earn no guaranteed slot', () => {
        const p = character();
        const bare = { ...p, equipment: { ...p.equipment, relics: [] } };
        for (const seed of SEEDS) expect(rewardLaneSlots(bare, seededRng(seed), LANES, RELICS)).toBeNull();
        expect(rewardPoolFor(bare, LANES, RELICS)).toHaveLength(cardsOf(LANE_X, LANE_Y).length);
    });

    it('three worn relics of one lane give two slots', () => {
        const p = character([RELIC_W, RELIC_W, RELIC_W]);
        expect(rewardLaneSlots(p, seededRng(1), LANES, RELICS)).toEqual({ laneId: 'fx-w', slots: 2 });
        for (const seed of SEEDS) {
            const offers = roll(p, seed);
            expect(offers.filter(id => LANE_W.cardIds.includes(id)).length).toBeGreaterThanOrEqual(2);
        }
    });
});

describe('A3 · a player with no starting lane has no pool (CH1f: no grey fallback)', () => {
    const { player } = createNewGameState();
    const bare: Character = { ...player, devRewardLaneIds: undefined };

    it('has no starting lanes: nothing worn throws, never offers grey', () => {
        expect(unlockedLaneIds(bare, LANES, RELICS)).toEqual([]);
        expect(() => rewardPoolFor(bare, LANES, RELICS)).toThrow(/no reward pool/);
    });

    it('a worn lane relic alone decides the lanes', () => {
        const wearing = { ...bare, equipment: { ...bare.equipment, relics: [RELIC_W] } };
        expect(unlockedLaneIds(wearing, LANES, RELICS)).toEqual(['fx-w']);
        expect(rewardPoolFor(wearing, LANES, RELICS)).toEqual([...LANE_W.cardIds]);
    });
});
