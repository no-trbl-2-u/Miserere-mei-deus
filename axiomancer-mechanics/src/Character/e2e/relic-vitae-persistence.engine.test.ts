/**
 * Hermetic engine test — TRIM THE FAT Tier 0 item 4
 * (the Trim the Fat spec (deleted; see history)): a worn armor's +max VITAE must
 * survive stat allocation and level-up.
 *
 * Both paths used to rebuild `maxHealth` from `calculateMaxHealth(level,
 * baseStats)` alone, silently dropping a worn armor's bonus. Witnessed by the
 * fixture armor (+5) since R7e2 deleted the armor relics.
 */

import { describe, it, expect } from 'vitest';
import { createCharacter, allocateStatPoint } from '../index';
import { calculateMaxHealth } from '../../Utils';
import { createNewGameState, gameReducer } from '../../Game/game.reducer';
import { FIXTURE_ARMOR } from '../../Game/fixtures';
import type { Character } from '../types';

const ARMOR_BONUS = 5;

/** A level-3 pilgrim wearing the fixture armor (+5 max VITAE). */
function armorWearer(): Character {
    return createCharacter({
        name: 'Armored', level: 3, baseStats: { heart: 4, body: 5, mind: 3 }, equipment: [FIXTURE_ARMOR],
    });
}

describe('Tier 0 item 4 — the armor bonus survives stat changes', () => {
    it('the fixture wears the bonus to begin with', () => {
        const p = armorWearer();
        expect(p.maxHealth).toBe(calculateMaxHealth(p.level, p.baseStats) + ARMOR_BONUS);
    });

    it('keeps the bonus through allocateStatPoint', () => {
        const p = { ...armorWearer(), availableStatPoints: 1 };
        const next = allocateStatPoint(p, 'body');
        expect(next.baseStats.body).toBe(p.baseStats.body + 1);
        expect(next.maxHealth).toBe(calculateMaxHealth(next.level, next.baseStats) + ARMOR_BONUS);
    });

    it('keeps the bonus through a LEVEL_UP', () => {
        const p = armorWearer();
        const state = { ...createNewGameState(), player: { ...p, experience: p.experienceToNextLevel } };
        const next = gameReducer(state, { type: 'LEVEL_UP' }).player;
        expect(next.level).toBe(p.level + 1);
        expect(next.maxHealth).toBe(calculateMaxHealth(next.level, next.baseStats) + ARMOR_BONUS);
        expect(next.health).toBe(next.maxHealth);
    });

    it('adds nothing for a character wearing no armor', () => {
        const bare = { ...createCharacter({ name: 'Bare', level: 3, baseStats: { heart: 4, body: 5, mind: 3 } }), availableStatPoints: 1 };
        const next = allocateStatPoint(bare, 'mind');
        expect(next.maxHealth).toBe(calculateMaxHealth(next.level, next.baseStats));
    });
});
