/**
 * The elite-only relic drop (phase LR1c, A8 and A9 of the LR1 brief).
 *
 * The contract this file pins, over the fixture elite relics (no live relic
 * is elite-only until LR1d/LR1e):
 *   · `rollEliteRelicDrop` drops one relic with probability
 *     `ELITE_RELIC_DROP_CHANCE`: over 10,000 seeds the rate is within one
 *     point of the constant;
 *   · the pool is the `relicSource: 'elite'` relics the player does not
 *     carry, so a carried relic (satchel or worn) is never dropped, and a
 *     quest relic never is;
 *   · same seed, same drop; an empty pool drops nothing;
 *   · the drop is its own roll, so the elite reward itself is unchanged
 *     (`elite-reward.engine.test.ts` pins that).
 */

import { describe, it, expect } from 'vitest';

import { eliteRelicPool, rollEliteRelicDrop, rollEliteReward } from '../combat.rewards';
import { ELITE_RELIC_DROP_CHANCE } from '../../Game/game-mechanics.constants';
import { FIXTURE_ELITE_RELICS, FIXTURE_QUEST_RELIC } from '../../Game/fixtures/fixture-content';
import { relicLibrary } from '../../Items/relic.library';
import { Player } from '../../Character/characters.mock';
import { deepClone } from '../../Utils';
import { equipItem } from '../../Character/equipment.reducer';
import type { Character } from '../../Character/types';
import type { Equipment } from '../../Items/types';

const POOL: readonly Equipment[] = [...FIXTURE_ELITE_RELICS, FIXTURE_QUEST_RELIC];
const SEED_COUNT = 10_000;

/** Lehmer rng; seeds are spread so the first draw covers [0, 1). */
function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}
const spread = (i: number): number => (i + 1) * 104729;

function bare(): Character {
    const player = deepClone(Player);
    return { ...player, inventory: [], equipment: { ...player.equipment, relics: [] }, startingLaneIds: ['defender', 'blood-price'] };
}

describe('the elite relic pool', () => {
    it('holds only elite-only relics the player does not carry', () => {
        expect(eliteRelicPool(bare(), POOL).map(r => r.id)).toEqual(FIXTURE_ELITE_RELICS.map(r => r.id));
        const carrying = { ...bare(), inventory: [deepClone(FIXTURE_ELITE_RELICS[0]!)] };
        expect(eliteRelicPool(carrying, POOL).map(r => r.id)).toEqual([FIXTURE_ELITE_RELICS[1]!.id]);
        const wearing = equipItem(bare(), deepClone(FIXTURE_ELITE_RELICS[1]!));
        expect(eliteRelicPool({ ...wearing, inventory: [] }, POOL).map(r => r.id))
            .toEqual([FIXTURE_ELITE_RELICS[0]!.id]);
    });

    it('is empty over the live library today (no live relic is elite-only yet)', () => {
        const live = relicLibrary.filter(r => r.relicSource === 'elite');
        expect(eliteRelicPool(bare()).length).toBe(live.length);
    });
});

describe('rollEliteRelicDrop', () => {
    it(`drops at ELITE_RELIC_DROP_CHANCE (${ELITE_RELIC_DROP_CHANCE}) over ${SEED_COUNT} seeds, within one point`, () => {
        const player = bare();
        let drops = 0;
        for (let i = 0; i < SEED_COUNT; i++) {
            if (rollEliteRelicDrop(player, seededRng(spread(i)), POOL)) drops++;
        }
        expect(Math.abs(drops / SEED_COUNT - ELITE_RELIC_DROP_CHANCE)).toBeLessThanOrEqual(0.01);
    });

    it('never drops a carried relic or a quest relic, and each elite relic can drop', () => {
        const carrying = { ...bare(), inventory: [deepClone(FIXTURE_ELITE_RELICS[0]!)] };
        const seen = new Set<string>();
        for (let i = 0; i < SEED_COUNT; i++) {
            const drop = rollEliteRelicDrop(carrying, seededRng(spread(i)), POOL);
            if (drop) seen.add(drop.id);
        }
        expect([...seen]).toEqual([FIXTURE_ELITE_RELICS[1]!.id]);

        const fresh = new Set<string>();
        for (let i = 0; i < SEED_COUNT; i++) {
            const drop = rollEliteRelicDrop(bare(), seededRng(spread(i)), POOL);
            if (drop) fresh.add(drop.id);
        }
        expect([...fresh].sort()).toEqual(FIXTURE_ELITE_RELICS.map(r => r.id).sort());
        expect(fresh.has(FIXTURE_QUEST_RELIC.id)).toBe(false);
    });

    it('same seed, same drop; the drop is a clone, not the library row', () => {
        const seed = [...Array(SEED_COUNT).keys()].map(spread)
            .find(s => rollEliteRelicDrop(bare(), seededRng(s), POOL) !== null)!;
        const a = rollEliteRelicDrop(bare(), seededRng(seed), POOL);
        const b = rollEliteRelicDrop(bare(), seededRng(seed), POOL);
        expect(a).toEqual(b);
        expect(POOL).not.toContain(a);
    });

    it('an empty pool drops nothing and draws nothing', () => {
        let draws = 0;
        const rng = () => { draws++; return 0; };
        const carryingAll = { ...bare(), inventory: FIXTURE_ELITE_RELICS.map(r => deepClone(r)) };
        expect(rollEliteRelicDrop(carryingAll, rng, POOL)).toBeNull();
        expect(rollEliteRelicDrop(bare(), rng, [FIXTURE_QUEST_RELIC])).toBeNull();
        expect(draws).toBe(0);
    });

    it('is a separate roll: the elite reward for a seed is the same whether or not a relic is rolled after', () => {
        const player = bare();
        const before = rollEliteReward(player, seededRng(spread(3)));
        const rng = seededRng(spread(3));
        const reward = rollEliteReward(player, rng);
        rollEliteRelicDrop(player, rng, POOL);
        expect(reward).toEqual(before);
    });
});
