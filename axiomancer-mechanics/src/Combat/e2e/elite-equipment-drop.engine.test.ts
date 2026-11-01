/**
 * The elite's lane piece: a won elite fight can hand a weapon or armor the
 * player does not carry, on top of its relic roll, and a befriended elite
 * always hands one. Every chance reads `EQUIPMENT_DROP_TUNING`.
 *
 * The contract this file pins:
 *   · the pool is the eight lane pieces the player lacks (satchel or worn);
 *     the grey pair is never in it;
 *   · a win drops at `EQUIPMENT_DROP_TUNING.elite`, seeded: the first draw is
 *     the chance, the second the pick;
 *   · a befriended elite drops on every seed, until the player has all eight;
 *   · the table carries T's starting numbers, shop fields included.
 */

import { describe, it, expect } from 'vitest';

import { rollEliteEquipmentDrop } from '../combat.rewards';
import {
    EQUIPMENT_DROP_TUNING, carriedPieceIds, equipmentDropPool,
} from '../../Items/equipment-drop';
import {
    EQUIPMENT_LANE, GREY_ARMOR_ID, GREY_WEAPON_ID, equipmentLibrary, wearGreyPair,
} from '../../Items/equipment.library';
import { Player } from '../../Character/characters.mock';
import { deepClone } from '../../Utils';
import type { Character } from '../../Character/types';

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

/** A fresh run's player: the grey pair worn and carried, nothing else. */
function freshRun(): Character {
    const player = deepClone(Player);
    const base: Character = { ...player, inventory: [], equipment: { ...player.equipment, relics: [] } };
    delete (base.equipment as { weapon?: unknown }).weapon;
    delete (base.equipment as { armor?: unknown }).armor;
    const worn = wearGreyPair(base);
    return { ...worn, inventory: [worn.equipment.weapon!, worn.equipment.armor!] };
}

/** The eight lane pieces, weapons then armor (the pool's order). */
const LANE_IDS = equipmentLibrary.map(p => p.id).filter(id => EQUIPMENT_LANE[id] !== undefined);

describe('EQUIPMENT_DROP_TUNING', () => {
    it('holds T\'s starting numbers in one table', () => {
        expect(EQUIPMENT_DROP_TUNING).toEqual({
            elite: 0.25, cache: 0.33, befriendedElite: 1, shopCount: 2, shopPrice: 40,
        });
    });
});

describe('the drop pool', () => {
    it('is the eight lane pieces, never the grey pair', () => {
        const pool = equipmentDropPool(freshRun());
        expect(pool.map(p => p.id)).toEqual(LANE_IDS);
        expect(pool.map(p => p.id)).not.toContain(GREY_WEAPON_ID);
        expect(pool.map(p => p.id)).not.toContain(GREY_ARMOR_ID);
    });

    it('leaves out a piece carried in the satchel and one worn', () => {
        const run = freshRun();
        const [carried, worn] = [equipmentLibrary.find(p => p.id === 'weapon-siphoning-blade')!, equipmentLibrary.find(p => p.id === 'armor-flame-guard')!];
        const player: Character = {
            ...run,
            inventory: [...run.inventory, deepClone(carried)],
            equipment: { ...run.equipment, armor: deepClone(worn) },
        };
        expect(carriedPieceIds(player).has(carried.id)).toBe(true);
        expect(equipmentDropPool(player).map(p => p.id)).toEqual(
            LANE_IDS.filter(id => id !== carried.id && id !== worn.id),
        );
    });
});

describe('a won elite fight', () => {
    it(`drops a lane piece at ${EQUIPMENT_DROP_TUNING.elite} over ${SEED_COUNT} seeds, within one point`, () => {
        const player = freshRun();
        let drops = 0;
        for (let i = 0; i < SEED_COUNT; i++) {
            const piece = rollEliteEquipmentDrop(player, seededRng(spread(i)));
            if (piece) {
                drops++;
                expect(LANE_IDS).toContain(piece.id);
            }
        }
        expect(Math.abs(drops / SEED_COUNT - EQUIPMENT_DROP_TUNING.elite)).toBeLessThanOrEqual(0.01);
    });

    it('reads the chance first and the pick second, and a miss draws no pick', () => {
        const draws: number[] = [];
        const rng = (values: number[]) => () => { const v = values.shift()!; draws.push(v); return v; };
        const hit = rollEliteEquipmentDrop(freshRun(), rng([0.24, 0]));
        expect(hit?.id).toBe(LANE_IDS[0]);
        expect(draws).toEqual([0.24, 0]);
        draws.length = 0;
        expect(rollEliteEquipmentDrop(freshRun(), rng([0.25, 0]))).toBeNull();
        expect(draws).toEqual([0.25]);
    });

    it('is seeded: the same seed gives the same drop', () => {
        const a = rollEliteEquipmentDrop(freshRun(), seededRng(spread(3)));
        const b = rollEliteEquipmentDrop(freshRun(), seededRng(spread(3)));
        expect(a?.id).toBe(b?.id);
    });

    it('hands back a clone, never the library piece', () => {
        const piece = rollEliteEquipmentDrop(freshRun(), () => 0)!;
        const library = equipmentLibrary.find(p => p.id === piece.id)!;
        expect(piece).toEqual(library);
        expect(piece).not.toBe(library);
        expect(piece.effect).not.toBe(library.effect);
    });
});

describe('a befriended elite', () => {
    it('always hands a lane piece the player does not carry', () => {
        const player = freshRun();
        for (let i = 0; i < SEED_COUNT; i++) {
            const piece = rollEliteEquipmentDrop(player, seededRng(spread(i)), { befriended: true });
            expect(piece, `seed ${i}`).not.toBeNull();
            expect(LANE_IDS).toContain(piece!.id);
        }
    });

    it('hands the last missing piece, then nothing once all eight are carried', () => {
        let player = freshRun();
        const seen = new Set<string>();
        for (let n = 0; n < LANE_IDS.length; n++) {
            const piece = rollEliteEquipmentDrop(player, () => 0.999, { befriended: true });
            expect(piece).not.toBeNull();
            expect(seen.has(piece!.id)).toBe(false);
            seen.add(piece!.id);
            player = { ...player, inventory: [...player.inventory, piece!] };
        }
        expect([...seen].sort()).toEqual([...LANE_IDS].sort());
        expect(rollEliteEquipmentDrop(player, () => 0, { befriended: true })).toBeNull();
    });
});
