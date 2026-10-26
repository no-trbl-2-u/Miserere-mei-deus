/**
 * Hermetic e2e — level-ladder evidence presets (L1/L15/L30/L50).
 *
 * These were authored client-side before; the engine now owns the data.
 * Verifies each ladder preset resolves through `buildCharacterFromPreset`
 * (so every consumable / card id is real), escalates with
 * level, and stays OUT of the canonical `characterPresets` picker.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    buildCharacterFromPreset,
    characterPresets,
    getPresetById,
    levelLadderPresets,
} from '../presets';
import { getEquippedItems } from '../equipment.reducer';

afterEach(() => {
    vi.restoreAllMocks();
});

const LADDER = [
    { id: 'kid-l1', level: 1 },
    { id: 'kid-l15', level: 15 },
    { id: 'kid-l30', level: 30 },
    { id: 'kid-l50', level: 50 },
] as const;

describe('level-ladder presets', () => {
    it('exposes exactly the four ladder tiers, separate from characterPresets', () => {
        expect(levelLadderPresets.map((p) => p.id)).toEqual([
            'kid-l1',
            'kid-l15',
            'kid-l30',
            'kid-l50',
        ]);
        // The canonical archetype picker is unchanged.
        expect(characterPresets.map((p) => p.id)).toEqual([
            'apprentice',
            'wanderer',
            'sage',
        ]);
        for (const id of LADDER.map((l) => l.id)) {
            expect(characterPresets.some((p) => p.id === id)).toBe(false);
        }
    });

    it('getPresetById resolves ladder presets as well as archetypes', () => {
        expect(getPresetById('kid-l30')?.level).toBe(30);
        expect(getPresetById('apprentice')?.id).toBe('apprentice');
        expect(getPresetById('kid-l999')).toBeUndefined();
    });

    it.each(LADDER)('builds a real character for %s at the declared level', ({ id, level }) => {
        const preset = getPresetById(id)!;
        expect(preset.level).toBe(level);

        const character = buildCharacterFromPreset(preset);
        expect(character.level).toBe(level);
        expect(character.maxHealth).toBeGreaterThan(0);
        expect(character.health).toBe(character.maxHealth);
        expect(character.knownCards.length).toBeGreaterThan(0);
    });

    it('escalates: L50 is tougher than L1, neither wearing a relic', () => {
        const l1 = buildCharacterFromPreset(getPresetById('kid-l1')!);
        const l50 = buildCharacterFromPreset(getPresetById('kid-l50')!);

        // The declared `equipment` entries do not resolve, and no tier is
        // given a starting relic.
        for (const c of [l1, l50]) {
            expect(getEquippedItems(c.equipment)).toEqual([]);
        }
        expect(l50.maxHealth).toBeGreaterThan(l1.maxHealth);
    });
});
