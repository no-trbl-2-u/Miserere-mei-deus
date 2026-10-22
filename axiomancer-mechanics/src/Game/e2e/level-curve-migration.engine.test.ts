/**
 * Hermetic engine test — the v36 → v37 hop: the level-20 curve (LV1 A6).
 *
 * The v36 curve (`level × 250` a level) becomes base 70 rising 10% a level
 * to 20, 15% to 40 and 20% after. A v36 save keeps its level, its banked
 * stat points and its progress through the level as a fraction of the step.
 */

import { describe, it, expect } from 'vitest';
import { migrate } from '../game.migrate';
import { createNewGameState, GAME_STATE_VERSION } from '../game.reducer';
import { experienceForLevel } from '../../Character/experience';
import type { GameState } from '../types';

/** A v36 save at `level` holding `experience` on the v36 curve. */
function v36At(level: number, experience: number, availableStatPoints = 0): Record<string, unknown> {
    const fresh = createNewGameState({ startMap: 'breakwater' });
    return {
        ...fresh,
        version: 36,
        player: {
            ...fresh.player, level, experience, availableStatPoints,
            experienceToNextLevel: (250 * level * (level + 1)) / 2,
        },
    };
}

const hop = (raw: Record<string, unknown>): GameState => migrate(raw, 36, 37);

describe('migrate v36 → v37 (LV1: the level-20 curve)', () => {
    it('lands at v37, below the current version', () => {
        expect(GAME_STATE_VERSION).toBeGreaterThanOrEqual(37);
        expect(hop(v36At(1, 0)).version).toBe(37);
    });

    it('a fresh level-1 save stays at 0 XP with the new first threshold', () => {
        const { player } = hop(v36At(1, 0));
        expect(player.level).toBe(1);
        expect(player.experience).toBe(0);
        expect(player.experienceToNextLevel).toBe(70);
    });

    it('a level-3 save half-way to 4 stays level 3, half-way to 4', () => {
        // v36: level 3 at 750, level 4 at 1,500; 1,125 is half-way.
        const { player } = hop(v36At(3, 1125));
        expect(player.level).toBe(3);
        expect(experienceForLevel(3)).toBe(147);
        expect(experienceForLevel(4)).toBe(232);
        expect(player.experience).toBe(Math.round(147 + 85 / 2));
        expect(player.experienceToNextLevel).toBe(232);
    });

    it('keeps unspent stat points banked', () => {
        const { player } = hop(v36At(4, 1500, 7));
        expect(player.level).toBe(4);
        expect(player.availableStatPoints).toBe(7);
        expect(player.experience).toBe(experienceForLevel(4));
    });

    it('a pending level-up stays pending', () => {
        // Level 2 holding 750 XP: the v36 level-3 threshold is met, not taken.
        const { player } = hop(v36At(2, 750));
        expect(player.level).toBe(2);
        expect(player.experience).toBeGreaterThanOrEqual(player.experienceToNextLevel);
    });

    it('a v35 save chains through both hops and on to the current version', () => {
        const fresh = createNewGameState({ startMap: 'breakwater' });
        const raw = { ...fresh, version: 35, player: { ...fresh.player, level: 3, experience: 2500 } };
        const migrated = migrate(raw, 35);
        expect(migrated.version).toBe(GAME_STATE_VERSION);
        expect(migrated.player.level).toBe(3);
        expect(migrated.player.experienceToNextLevel).toBe(experienceForLevel(4));
    });
});
