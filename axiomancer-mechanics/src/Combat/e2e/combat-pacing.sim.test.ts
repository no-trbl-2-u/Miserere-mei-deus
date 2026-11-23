/**
 * The pacing sim (`combat.pacing.sim.ts`): it fights at the live foe VITAE,
 * its two drivers stay inside the rules (no fight trips the turn law; the
 * human-like driver never pays a SACRIFICE it cannot), and a seed replays.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { FloatEye } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import { STARTING_CARD_IDS } from '../combat.rewards';
import {
    runPacingEncounter, simulatePacing, scaleEnemyVitae, LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER,
} from '../combat.pacing.sim';
import {
    EARLY_ENCOUNTER_ENEMY_HP_MULTIPLIER, EARLY_ENCOUNTER_MAX_LEVEL, liveEncounterHpMultiplier,
} from '../live-encounter';

const deck = [...STARTING_CARD_IDS];

describe('the pacing sim', () => {
    it('fights at the live foe VITAE by default', () => {
        expect(LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER).toBe(2);
        const foe = scaleEnemyVitae(deepClone(FloatEye), LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER);
        expect(foe.maxHealth).toBe(FloatEye.maxHealth * 2);
        expect(scaleEnemyVitae(FloatEye, 1)).toBe(FloatEye);
    });

    it('takes the early multiplier at levels 1 to 3 and the base past them (phase EP1a)', () => {
        expect(EARLY_ENCOUNTER_ENEMY_HP_MULTIPLIER).toBe(1.5);
        expect(EARLY_ENCOUNTER_MAX_LEVEL).toBe(3);
        expect(liveEncounterHpMultiplier(1)).toBe(1.5);
        expect(liveEncounterHpMultiplier(2)).toBe(1.5);
        expect(liveEncounterHpMultiplier(3)).toBe(1.5);
        expect(liveEncounterHpMultiplier(4)).toBe(2);
        expect(liveEncounterHpMultiplier(10)).toBe(LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER);
    });

    it('defaults to the multiplier for the player\'s level', () => {
        const base = { enemy: deepClone(FloatEye), deck, runs: 4, policy: 'human-like' as const, mercy: false };
        for (const level of [3, 4]) {
            const player = { ...deepClone(Player), level };
            const byDefault = simulatePacing({ ...base, player });
            const explicit = simulatePacing({ ...base, player, enemyHpMultiplier: liveEncounterHpMultiplier(level) });
            expect(byDefault).toEqual(explicit);
        }
        const at3 = simulatePacing({ ...base, player: { ...deepClone(Player), level: 3 }, enemyHpMultiplier: 1.5 });
        const at3AsBase = simulatePacing({ ...base, player: { ...deepClone(Player), level: 3 }, enemyHpMultiplier: 2 });
        expect(simulatePacing({ ...base, player: { ...deepClone(Player), level: 3 } })).toEqual(at3);
        expect(at3).not.toEqual(at3AsBase);
    });

    it('replays a seed exactly, under both drivers', () => {
        for (const policy of ['witness', 'human-like'] as const) {
            const a = runPacingEncounter(deepClone(Player), deepClone(FloatEye), deck, 11, policy);
            const b = runPacingEncounter(deepClone(Player), deepClone(FloatEye), deck, 11, policy);
            expect(a).toEqual(b);
            expect(a.turns).toBeGreaterThan(0);
        }
    });

    it('reads the share of fights reaching each declared HP phase', () => {
        const declared = FloatEye.phases?.length ?? 0;
        expect(declared).toBeGreaterThan(1);
        const base = { player: deepClone(Player), enemy: deepClone(FloatEye), deck, runs: 20, policy: 'witness' as const, mercy: false };
        // The phase reading turns the bot's Open Hand off: it heals the foe it means to read.
        // A foe far past the deck's reach is beaten through every phase: each share is 1.
        const long = simulatePacing({ ...base, enemyHpMultiplier: 8 });
        expect(long.winRate).toBe(1);
        expect(long.phaseShares).toEqual(Array.from({ length: declared }, () => 1));
        // A foe the first blow kills never leaves its first phase; the later phases read an explicit 0.
        const short = simulatePacing({ ...base, enemyHpMultiplier: 0.05 });
        expect(short.phaseShares).toEqual([1, ...Array.from({ length: declared - 1 }, () => 0)]);
        // In between, shares fall off and each equals the fraction of runs whose peak phase reached it.
        const mid = simulatePacing({ ...base, enemyHpMultiplier: 1 });
        const peaks = Array.from({ length: 20 }, (_, i) =>
            runPacingEncounter(deepClone(Player), scaleEnemyVitae(deepClone(FloatEye), 1), deck, 1 + i, 'witness', { mercy: false }).phaseReached);
        expect(mid.phaseShares).toEqual(
            Array.from({ length: declared }, (_, k) => peaks.filter(p => p >= k).length / 20));
        expect(mid.phaseShares[1]).toBeGreaterThan(0);
        expect(mid.phaseShares[1]).toBeLessThan(1);
    });

    it('a foe with no phases reads a single share of 1', () => {
        const plain = { ...deepClone(FloatEye), phases: undefined };
        const s = simulatePacing({ player: deepClone(Player), enemy: plain, deck, runs: 5, policy: 'human-like' });
        expect(s.phaseShares).toEqual([1]);
    });

    it('a longer foe takes more turns; the summary reads its runs', () => {
        const base = { player: deepClone(Player), enemy: deepClone(FloatEye), deck, runs: 20, policy: 'human-like' as const, mercy: false };
        const authored = simulatePacing({ ...base, enemyHpMultiplier: 1 });
        const live = simulatePacing(base);
        expect(live.runs).toBe(20);
        expect(live.meanTurns).toBeGreaterThan(authored.meanTurns);
        expect(live.winRate).toBeGreaterThanOrEqual(0);
    });
});
