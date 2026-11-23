import { describe, expect, it } from '@jest/globals';
import { EARLY_ENCOUNTER_ENEMY_HP_MULTIPLIER, LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER, type Enemy } from '@mechanics';

import { ENCOUNTER_ENEMY_HP_MULTIPLIER, encounterEnemyHpMultiplier, withScaledEnemyHp } from '@/state/actions';

function fakeEnemy(health: number, maxHealth: number): Enemy {
    return { id: 'foe', name: 'Foe', health, maxHealth } as unknown as Enemy;
}

describe('withScaledEnemyHp — testing HP knob for live encounters', () => {
    it('the shipped base knob doubles enemy HP', () => {
        expect(ENCOUNTER_ENEMY_HP_MULTIPLIER).toBe(2);
    });

    it('a fight at levels 1 to 3 takes the early multiplier, one past them the base (phase EP1a)', () => {
        expect(EARLY_ENCOUNTER_ENEMY_HP_MULTIPLIER).toBe(1.5);
        expect(encounterEnemyHpMultiplier(1)).toBe(1.5);
        expect(encounterEnemyHpMultiplier(3)).toBe(1.5);
        expect(encounterEnemyHpMultiplier(4)).toBe(ENCOUNTER_ENEMY_HP_MULTIPLIER);
    });

    it('is the engine constant the pacing sim applies, so sim and live fights agree', () => {
        expect(ENCOUNTER_ENEMY_HP_MULTIPLIER).toBe(LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER);
    });

    it('scales both health and maxHealth together so ratios are preserved', () => {
        const scaled = withScaledEnemyHp(fakeEnemy(25, 25), 2);
        expect(scaled.health).toBe(50);
        expect(scaled.maxHealth).toBe(50);
    });

    it('preserves the current-HP fraction when the foe is already wounded', () => {
        const scaled = withScaledEnemyHp(fakeEnemy(10, 40), 2);
        expect(scaled.health).toBe(20);
        expect(scaled.maxHealth).toBe(80);
    });

    it('never drops HP below 1 and rounds fractional results', () => {
        const scaled = withScaledEnemyHp(fakeEnemy(1, 1), 2.5);
        expect(scaled.maxHealth).toBe(3); // round(2.5)
        expect(scaled.health).toBeGreaterThanOrEqual(1);
    });

    it('returns an equivalent enemy at multiplier 1 (no-op)', () => {
        const foe = fakeEnemy(25, 25);
        const scaled = withScaledEnemyHp(foe, 1);
        expect(scaled.health).toBe(25);
        expect(scaled.maxHealth).toBe(25);
    });

    it('does not mutate the source enemy', () => {
        const foe = fakeEnemy(25, 25);
        withScaledEnemyHp(foe, 2);
        expect(foe.health).toBe(25);
        expect(foe.maxHealth).toBe(25);
    });
});
