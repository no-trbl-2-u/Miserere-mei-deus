/**
 * Hermetic e2e — Character presets.
 *
 * Verifies that the three shipped presets build into valid Characters
 * whose level / stats / card rotation / inventory match the
 * declarative recipe, and that two builds with the same RNG produce
 * structurally equal Characters.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
    apprenticePreset, wandererPreset, sagePreset,
    characterPresets, levelLadderPresets, getPresetById, buildCharacterFromPreset,
} from '../presets';
import { createNewGameState } from '../../Game/game.reducer';
import { STAT_POINTS_PER_LEVEL } from '../../Game/game-mechanics.constants';
import { mockSequentialRng } from '../../test-utils/rng';
import type { Consumable } from '../../Items/types';
import { STARTING_CARD_IDS } from '../../Combat/combat.rewards';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('characterPresets', () => {
    it('lists three presets with stable ids', () => {
        const ids = characterPresets.map(p => p.id);
        expect(ids).toEqual(['apprentice', 'wanderer', 'sage']);
    });

    it('getPresetById returns the matching record', () => {
        expect(getPresetById('apprentice')).toBe(apprenticePreset);
        expect(getPresetById('wanderer')).toBe(wandererPreset);
        expect(getPresetById('sage')).toBe(sagePreset);
        expect(getPresetById('does-not-exist')).toBeUndefined();
    });
});

describe('buildCharacterFromPreset', () => {
    it('builds Apprentice as a bare level-1 starter', () => {
        mockSequentialRng(0.5);
        const player = buildCharacterFromPreset(apprenticePreset);
        expect(player.name).toBe('Apprentice');
        expect(player.level).toBe(1);
        expect(player.baseStats).toEqual({ heart: 5, body: 5, mind: 5 });
        // A preset wears no relic, like a fresh run (signatures come from
        // worn equipment, not archetype).
        expect(player.equipment.weapon).toBeNull();
        expect(player.equipment.armor).toBeNull();
        expect(player.equipment.relics).toEqual([null, null, null]);
        // Every preset seeds the grey deck.
        expect(player.knownCards).toEqual([...STARTING_CARD_IDS]);
        // Apprentice declares no procedural gear: inventory = the 1 declared potion.
        expect(player.inventory.map(i => i.id)).toEqual(['minor-healing-potion']);
        const potion = player.inventory.find(i => i.id === 'minor-healing-potion');
        expect(potion).toBeDefined();
        expect((potion as Consumable | undefined)?.quantity).toBe(3);
        expect(player.currency).toBe(0);
    });

    it('builds Wanderer with light armor and the grey deck', () => {
        mockSequentialRng(0.5);
        const player = buildCharacterFromPreset(wandererPreset);
        expect(player.level).toBe(8);
        expect(player.baseStats).toEqual({ heart: 7, body: 8, mind: 7 });
        expect(player.knownCards).toEqual([...STARTING_CARD_IDS]); // grey deck at every tier
        // Presets wear no relic and carry NO procedural gear.
        expect(player.equipment.relics).toEqual([null, null, null]);
        const invEquipmentIds = player.inventory.filter(i => i.category === 'equipment').map(i => i.id);
        expect(invEquipmentIds).toEqual([]);
        expect(player.currency).toBe(25);
    });

    it('builds Sage with mid-tier gear and the grey deck', () => {
        mockSequentialRng(0.5);
        const player = buildCharacterFromPreset(sagePreset);
        expect(player.level).toBe(15);
        expect(player.baseStats).toEqual({ heart: 8, body: 11, mind: 10 });
        expect(player.knownCards).toEqual([...STARTING_CARD_IDS]); // grey deck at every tier
        // Declared procedural gear does not resolve, so it owns no equipment.
        expect(player.equipment.relics).toEqual([null, null, null]);
        const invEquipmentIds = player.inventory.filter(i => i.category === 'equipment').map(i => i.id);
        expect(invEquipmentIds).toEqual([]);
        expect(player.currency).toBe(75);
    });

    it('is deterministic for a given RNG seed', () => {
        mockSequentialRng(0.5);
        const a = buildCharacterFromPreset(sagePreset);
        vi.restoreAllMocks();
        mockSequentialRng(0.5);
        const b = buildCharacterFromPreset(sagePreset);
        expect(a).toEqual(b);
    });

    it('clones consumables from the library — no shared references', () => {
        mockSequentialRng(0.5);
        const a = buildCharacterFromPreset(apprenticePreset);
        const b = buildCharacterFromPreset(apprenticePreset);
        expect(a.inventory[0]).not.toBe(b.inventory[0]);
        expect(a.inventory[0]).toEqual(b.inventory[0]);
    });

    // Stat curve: a preset holds exactly the points its level banks
    // (CRITIQUE pass 90). A new game starts at 15; each level after the
    // first adds STAT_POINTS_PER_LEVEL.
    describe('stat curve', () => {
        const startTotal = (() => {
            const { heart, body, mind } = createNewGameState().player.baseStats;
            return heart + body + mind;
        })();

        it.each([...characterPresets, ...levelLadderPresets].map(p => [p.id, p] as const))(
            '%s holds exactly the stat points its level banks',
            (_id, preset) => {
                const { heart, body, mind } = preset.baseStats;
                const reachable = startTotal + (preset.level - 1) * STAT_POINTS_PER_LEVEL;
                expect(heart + body + mind).toBe(reachable);
            },
        );
    });
});
