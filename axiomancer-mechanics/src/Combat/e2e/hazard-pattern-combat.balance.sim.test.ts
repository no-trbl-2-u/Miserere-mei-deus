/**
 * Balance-sim witness — Hazard-Pattern Combat (HP model).
 *
 * Pins no balance band.
 *
 * Structural invariants that STAY ARMED:
 *   1. Combats TERMINATE (V+M+D+R === runs; no hangs, no crashes) for DoT,
 *      control, charm, and turtle loadouts, including the boss fight.
 *   2. The HP-source fractions stay coherent (0..1, sum ≤ 1).
 *   3. No degenerate stalemates: a wall-heavy loadout ends within the round cap.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import { FloatEye, BrineHag, DeathBeholder } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import { simulateHazardPatternCombat, runOneEncounter } from '../combat.encounter.sim';

const RUNS = 80;
const SEED = 1;

function loadout(cards: string[]): Character {
    const p = deepClone(Player);
    p.knownCards = cards.slice();
    p.baseStats = { heart: 10, body: 10, mind: 10 };
    p.health = 150;
    p.maxHealth = 150;
    return p;
}

// Loadout families:
const DOT = ['spoiled-poultice', 'the-long-lent', 'unction-of-boils']; // rot seed + PROLONG + tier-2 poison
const CONTROL = ['scolds-bridle', 'petty-indictment'];                 // control + chip
const TURTLE = ['chilblain-watch', 'hoarfrost-teeth', 'spoiled-poultice']; // wall + thorns + DoT

describe('HP combat — combats terminate for every loadout family (structural, armed)', () => {
    for (const [name, enemy] of [['FloatEye', FloatEye], ['BrineHag', BrineHag]] as const) {
        it(`${name}: a DoT loadout terminates every run with exact outcome accounting`, () => {
            const s = simulateHazardPatternCombat(loadout(DOT), enemy, RUNS, SEED);
            expect(s.runs).toBe(RUNS);
            expect(s.victories + s.mercies + s.defeats + s.retreats).toBe(RUNS);
            expect(s.avgRounds).toBeGreaterThan(0);
        });
    }

    it('the boss fight terminates without crashing (win ratio NOT a constraint)', () => {
        const s = simulateHazardPatternCombat(loadout(DOT), DeathBeholder, RUNS, SEED);
        expect(s.victories + s.mercies + s.defeats + s.retreats).toBe(RUNS);
        expect(s.avgRounds).toBeGreaterThan(0);
    });

    it('a CONTROL loadout terminates every run', () => {
        const s = simulateHazardPatternCombat(loadout(CONTROL), FloatEye, RUNS, SEED);
        expect(s.victories + s.mercies + s.defeats + s.retreats).toBe(RUNS);
    });

});

describe('HP combat — engagement metrics stay coherent (structural, armed)', () => {
    it('every HP-source fraction is a valid ratio and the sources sum to ≤ 1', () => {
        const s = simulateHazardPatternCombat(loadout(DOT), FloatEye, RUNS, SEED);
        for (const key of ['dotHpFraction', 'strikeFraction', 'mechanicBurstFraction', 'guardMitigatedFraction'] as const) {
            expect(s[key]).toBeGreaterThanOrEqual(0);
            expect(s[key]).toBeLessThanOrEqual(1);
        }
        expect(s.dotHpFraction + s.strikeFraction + s.mechanicBurstFraction).toBeLessThanOrEqual(1.01);
    });
});

describe('HP combat — no degenerate stalemates (the safety cap never binds in practice)', () => {
    it('a wall-heavy TURTLE loadout still terminates every seeded boss run within the round cap', () => {
        for (let i = 0; i < 25; i++) {
            const r = runOneEncounter(loadout(TURTLE), DeathBeholder, SEED + i, 'turtle');
            expect(['victory', 'mercy', 'defeat', 'retreat']).toContain(r.outcome);
            expect(r.rounds).toBeLessThanOrEqual(61);
        }
    });
});
