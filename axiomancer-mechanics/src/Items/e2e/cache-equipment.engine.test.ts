/**
 * A loot cache's item bundle can hold one lane weapon or armor the player does
 * not carry, at `EQUIPMENT_DROP_TUNING.cache`, on a stream of its own so the
 * consumables of a seed never move. A caller that names no carrier (a hazard
 * puzzle's haul) gets consumables only.
 */

import { describe, it, expect } from 'vitest';

import { rollCacheReward } from '../cache-reward';
import { EQUIPMENT_DROP_TUNING } from '../equipment-drop';
import { EQUIPMENT_LANE, equipmentLibrary, wearGreyPair } from '../equipment.library';
import { qualifiesForItemRewardScreen } from '../item-grant';
import { isEquipment } from '../types';
import { Player } from '../../Character/characters.mock';
import { deepClone } from '../../Utils';
import type { Character } from '../../Character/types';

const SEEDS = 4_000;

function freshRun(): Character {
    const player = deepClone(Player);
    const worn = wearGreyPair({ ...player, inventory: [], equipment: { ...player.equipment, relics: [] } });
    return { ...worn, inventory: [worn.equipment.weapon!, worn.equipment.armor!] };
}

const piecesIn = (items: ReturnType<typeof rollCacheReward>) => items.filter(isEquipment);

describe('rollCacheReward with a carrier', () => {
    it(`adds a lane piece at ${EQUIPMENT_DROP_TUNING.cache} over ${SEEDS} seeds, within two points`, () => {
        const carrier = freshRun();
        let hits = 0;
        for (let seed = 1; seed <= SEEDS; seed++) {
            const pieces = piecesIn(rollCacheReward({ playerLevel: 1, seed, tier: 'modest', carrier }));
            expect(pieces.length).toBeLessThanOrEqual(1);
            for (const piece of pieces) {
                hits++;
                expect(EQUIPMENT_LANE[piece.id]).toBeDefined();
            }
        }
        expect(Math.abs(hits / SEEDS - EQUIPMENT_DROP_TUNING.cache)).toBeLessThanOrEqual(0.02);
    });

    it('is seeded: one seed gives one bundle', () => {
        const carrier = freshRun();
        const ids = (seed: number) => rollCacheReward({ playerLevel: 1, seed, tier: 'rich', carrier }).map(i => i.id);
        for (let seed = 1; seed <= 50; seed++) expect(ids(seed)).toEqual(ids(seed));
    });

    it('leaves the consumables of every seed exactly as they were', () => {
        const carrier = freshRun();
        for (let seed = 1; seed <= 200; seed++) {
            const bare = rollCacheReward({ playerLevel: 1, seed, tier: 'modest' });
            const withCarrier = rollCacheReward({ playerLevel: 1, seed, tier: 'modest', carrier });
            expect(withCarrier.slice(0, bare.length)).toEqual(bare);
            expect(bare.some(isEquipment)).toBe(false);
        }
    });

    it('never hands a piece the player carries, so a full set drops nothing', () => {
        const full: Character = {
            ...freshRun(),
            inventory: [...freshRun().inventory, ...equipmentLibrary.filter(p => EQUIPMENT_LANE[p.id]).map(p => deepClone(p))],
        };
        for (let seed = 1; seed <= 500; seed++) {
            expect(piecesIn(rollCacheReward({ playerLevel: 1, seed, tier: 'rich', carrier: full }))).toEqual([]);
        }
        const lacking: Character = { ...full, inventory: full.inventory.filter(i => i.id !== 'armor-flame-guard') };
        const found = new Set<string>();
        for (let seed = 1; seed <= 500; seed++) {
            for (const p of piecesIn(rollCacheReward({ playerLevel: 1, seed, tier: 'rich', carrier: lacking }))) found.add(p.id);
        }
        expect([...found]).toEqual(['armor-flame-guard']);
    });

    it('routes a lane piece to the reward screen, which plain gear did not', () => {
        for (const piece of equipmentLibrary) expect(qualifiesForItemRewardScreen(piece)).toBe(true);
    });
});
