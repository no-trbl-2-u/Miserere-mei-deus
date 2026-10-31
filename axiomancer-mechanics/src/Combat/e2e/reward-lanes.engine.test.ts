/**
 * The reward rule: worn relics' lanes feed the card reward (Phase RW1a,
 * A1-A5 of `plan/phases/phase_RW1_reward_rule.md`).
 *
 * The contract this file pins, against fixture lanes and fixture relics (no
 * library relic names a lane yet):
 *   · a relic's lane is the relic library's entry first, then the item's own
 *     `laneId`; a lane id the registry does not carry is ignored (A1);
 *   · the unlocked lanes are the worn relics' lanes, registry order, never
 *     grey; a carried, unworn relic opens nothing; with none worn there is no
 *     pool and the draft throws (A2, CH1f deleted the grey fallback);
 *   · the lane slots follow the worn count, 0 / 1-2 / 3-4 / 5 → 0 / 1 / 2 / 3,
 *     from the lane worn most, a tie broken by the seeded rng (A3);
 *   · the roll fills the lane slots first, then the rest from the pool:
 *     distinct, seeded, never a grey card once a lane is worn (A4);
 *   · the dev override replaces the pool and the lane slots (A5).
 */

import { describe, it, expect } from 'vitest';

import {
    laneSlotCount, rewardLaneSlots, rewardPoolFor, rollCombatCardRewards, unlockedLaneIds,
} from '../combat.rewards';
import { relicLaneId } from '../../Items/relic-lanes';
import { GREY_LANE, getCardLane, type CardLane } from '../../Cards/card.lanes';
import { Player } from '../../Character/characters.mock';
import { deepClone } from '../../Utils';
import type { Character } from '../../Character/types';
import type { Equipment } from '../../Items/types';

const BLOOD_CARDS = getCardLane('blood-price')!.cardIds;
const EMBER_CARDS = getCardLane('elementalist')!.cardIds;

/** Fixture lanes cut from the real trial sets' cards, under fixture ids. */
const LANES: readonly CardLane[] = [
    GREY_LANE,
    { id: 'fx-blood', name: 'Fixture blood', cardIds: BLOOD_CARDS, testDeck: [] },
    { id: 'fx-ember', name: 'Fixture ember', cardIds: EMBER_CARDS, testDeck: [] },
];

function relic(id: string, laneId?: string): Equipment {
    return { id, name: id, description: '', category: 'equipment', slot: 'relic', statModifiers: [], laneId };
}

/** The fixture relic library: one relic per fixture lane, one naming grey, one naming no lane. */
const RELICS: readonly Equipment[] = [
    relic('fx-relic-blood', 'fx-blood'),
    relic('fx-relic-ember', 'fx-ember'),
    relic('fx-relic-grey', 'grey'),
    relic('fx-relic-plain'),
];

/** A saved copy of a library relic: no `laneId` on the item itself. */
const saved = (id: string): Equipment => relic(id);

/** Spread seeds: the Lehmer rng's first draw is tiny for small seeds, so a run of 1..n never ties high. */
const SEEDS = Array.from({ length: 60 }, (_, i) => (i + 1) * 104729);

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

/** A fresh player wearing `worn` (relics) and carrying `carried` unworn. */
function player(worn: Equipment[] = [], carried: Equipment[] = []): Character {
    return {
        ...deepClone(Player),
        inventory: [...worn, ...carried],
        equipment: { weapon: null, armor: null, relics: worn },
        devRewardLaneIds: undefined,
    };
}

const roll = (p: Character, seed: number, count = 3): string[] =>
    rollCombatCardRewards(p, seededRng(seed), count, LANES, RELICS);

describe('A1 · the lane a relic opens', () => {
    it('reads the relic library entry by id, so a saved copy without the field still opens it', () => {
        expect(relicLaneId(saved('fx-relic-blood'), LANES, RELICS)).toBe('fx-blood');
    });

    it('falls back to the item\'s own laneId when the library entry names none', () => {
        expect(relicLaneId(relic('not-in-library', 'fx-ember'), LANES, RELICS)).toBe('fx-ember');
        expect(relicLaneId(relic('fx-relic-plain', 'fx-ember'), LANES, RELICS)).toBe('fx-ember');
    });

    it('prefers the library entry over the item\'s own laneId', () => {
        expect(relicLaneId(relic('fx-relic-blood', 'fx-ember'), LANES, RELICS)).toBe('fx-blood');
    });

    it('ignores a lane id the registry does not carry, and a relic naming none', () => {
        expect(relicLaneId(relic('not-in-library', 'no-such-lane'), LANES, RELICS)).toBeUndefined();
        expect(relicLaneId(saved('fx-relic-plain'), LANES, RELICS)).toBeUndefined();
    });
});

describe('A2 · the unlocked lanes are the worn relics\' lanes', () => {
    it('a worn lane relic puts its lane in the list and the pool', () => {
        const p = player([saved('fx-relic-blood')]);
        expect(unlockedLaneIds(p, LANES, RELICS)).toEqual(['fx-blood']);
        expect(rewardPoolFor(p, LANES, RELICS)).toEqual([...BLOOD_CARDS]);
    });

    it('the same relic carried in the satchel, unworn, opens nothing: there is no pool', () => {
        const p = player([], [saved('fx-relic-blood')]);
        expect(unlockedLaneIds(p, LANES, RELICS)).toEqual([]);
        expect(() => rewardPoolFor(p, LANES, RELICS)).toThrow(/no reward pool/);
    });

    it('unequipping it removes the lane again', () => {
        const worn = player([saved('fx-relic-blood')]);
        const unequipped = { ...worn, equipment: { weapon: null, armor: null, relics: [] } };
        expect(unlockedLaneIds(worn, LANES, RELICS)).toEqual(['fx-blood']);
        expect(unlockedLaneIds(unequipped, LANES, RELICS)).toEqual([]);
        expect(() => rewardPoolFor(unequipped, LANES, RELICS)).toThrow(/no reward pool/);
    });

    it('no worn lane relic gives no pool; grey is never an unlocked lane', () => {
        expect(() => rewardPoolFor(player(), LANES, RELICS)).toThrow(/no reward pool/);
        const greyRelic = player([saved('fx-relic-grey'), saved('fx-relic-plain')]);
        expect(unlockedLaneIds(greyRelic, LANES, RELICS)).toEqual([]);
    });

    it('returns several lanes in registry order, each once, whatever the wear order', () => {
        const p = player([saved('fx-relic-ember'), saved('fx-relic-blood'), saved('fx-relic-ember')]);
        expect(unlockedLaneIds(p, LANES, RELICS)).toEqual(['fx-blood', 'fx-ember']);
    });

    it('reads the relic slot only: a lane piece worn as a weapon or armor opens nothing', () => {
        const p = { ...player(), equipment: { weapon: saved('fx-relic-ember'), armor: saved('fx-relic-blood'), relics: [] } };
        expect(unlockedLaneIds(p, LANES, RELICS)).toEqual([]);
    });
});

describe('A3 · the lane slots follow the worn count', () => {
    it.each([
        [0, 0], [1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [6, 3],
    ])('%i worn from one lane gives %i lane cards', (worn, slots) => {
        expect(laneSlotCount(worn)).toBe(slots);
    });

    it.each([
        [0, null], [1, 1], [2, 1], [3, 2],
    ])('wearing %i blood relics gives %s slot(s)', (worn, slots) => {
        const p = player(Array.from({ length: worn }, () => saved('fx-relic-blood')));
        const got = rewardLaneSlots(p, seededRng(1), LANES, RELICS);
        expect(got === null ? null : got.slots).toBe(slots);
        if (got !== null) expect(got.laneId).toBe('fx-blood');
    });

    it('the lane worn most fills the slots', () => {
        const p = player([saved('fx-relic-ember'), saved('fx-relic-blood'), saved('fx-relic-ember')]);
        for (const seed of SEEDS) {
            expect(rewardLaneSlots(p, seededRng(seed), LANES, RELICS)).toEqual({ laneId: 'fx-ember', slots: 1 });
        }
    });

    it('one relic each of two lanes: a seeded tie, one slot, either lane reachable', () => {
        const p = player([saved('fx-relic-blood'), saved('fx-relic-ember')]);
        const seen = new Set<string>();
        for (const seed of SEEDS) {
            const a = rewardLaneSlots(p, seededRng(seed), LANES, RELICS)!;
            expect(a).toEqual(rewardLaneSlots(p, seededRng(seed), LANES, RELICS));
            expect(a.slots).toBe(1);
            seen.add(a.laneId);
        }
        expect([...seen].sort()).toEqual(['fx-blood', 'fx-ember']);
    });
});

describe('A4 · the roll: lane slots first, then the pool', () => {
    it('a relic with no lane gives no pool, so the roll throws rather than offering grey', () => {
        for (const seed of SEEDS) {
            expect(() => roll(player([saved('fx-relic-plain')]), seed)).toThrow(/no reward pool/);
        }
    });

    it('an unworn lane relic changes nothing: no pool, exactly as with no relic', () => {
        for (const seed of SEEDS) {
            expect(() => roll(player([], [saved('fx-relic-blood')]), seed)).toThrow(/no reward pool/);
        }
    });

    it('one worn gives offers from that lane only, never a grey id', () => {
        for (const seed of SEEDS) {
            const offers = roll(player([saved('fx-relic-blood')]), seed);
            expect(offers).toHaveLength(3);
            for (const id of offers) expect(BLOOD_CARDS).toContain(id);
        }
    });

    it('one relic each of two lanes gives offers from those lanes only, at least one from the slot lane', () => {
        const p = player([saved('fx-relic-blood'), saved('fx-relic-ember')]);
        for (const seed of SEEDS) {
            const offers = roll(p, seed);
            const { laneId } = rewardLaneSlots(p, seededRng(seed), LANES, RELICS)!;
            const slotCards = laneId === 'fx-blood' ? BLOOD_CARDS : EMBER_CARDS;
            expect(offers).toHaveLength(3);
            for (const id of offers) expect([...BLOOD_CARDS, ...EMBER_CARDS]).toContain(id);
            expect(slotCards).toContain(offers[0]);
        }
    });

    it('three worn of one lane, beside another lane, give at least two from it', () => {
        const p = player([
            saved('fx-relic-blood'), saved('fx-relic-blood'), saved('fx-relic-blood'), saved('fx-relic-ember'),
        ]);
        for (const seed of SEEDS) {
            const offers = roll(p, seed);
            expect(offers.filter(id => BLOOD_CARDS.includes(id)).length).toBeGreaterThanOrEqual(2);
            expect(BLOOD_CARDS).toContain(offers[0]);
            expect(BLOOD_CARDS).toContain(offers[1]);
        }
    });

    it('offers are distinct, Curse-free, and the same seed gives the same offers', () => {
        const p = player([saved('fx-relic-blood'), saved('fx-relic-ember')]);
        for (const seed of SEEDS) {
            const offers = roll(p, seed);
            expect(new Set(offers).size).toBe(offers.length);
            expect(offers).toEqual(roll(p, seed));
            for (const id of offers) expect(rewardPoolFor(p, LANES, RELICS)).toContain(id);
        }
    });

    it('a card the player already owns may be offered', () => {
        const p = { ...player([saved('fx-relic-blood')]), knownCards: [...BLOOD_CARDS] };
        expect(roll(p, 1).every(id => BLOOD_CARDS.includes(id))).toBe(true);
    });

    it('the cache\'s one card is the first slot: the lane card when a slot is earned', () => {
        const p = player([saved('fx-relic-blood'), saved('fx-relic-ember'), saved('fx-relic-ember')]);
        for (const seed of SEEDS) {
            expect(EMBER_CARDS).toContain(roll(p, seed, 1)[0]);
        }
    });
});

describe('A5 · the dev override stays an override', () => {
    it('every slot draws from the override; the worn lanes and the slots are not read', () => {
        const p = { ...player([saved('fx-relic-blood'), saved('fx-relic-blood'), saved('fx-relic-blood')]), devRewardLaneIds: ['grey'] };
        for (const seed of SEEDS) {
            for (const id of roll(p, seed)) expect(GREY_LANE.cardIds).toContain(id);
        }
        expect(rewardPoolFor(p, LANES, RELICS)).toEqual([...GREY_LANE.cardIds]);
    });

    it('an override naming no registered lane leaves the real rule in place', () => {
        const p = { ...player([saved('fx-relic-blood')]), devRewardLaneIds: ['nope'] };
        for (const seed of SEEDS) {
            for (const id of roll(p, seed)) expect(BLOOD_CARDS).toContain(id);
        }
    });
});
