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

const deck = [...STARTING_CARD_IDS];

describe('the pacing sim', () => {
    it('fights at the live foe VITAE by default', () => {
        expect(LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER).toBe(2);
        const foe = scaleEnemyVitae(deepClone(FloatEye), LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER);
        expect(foe.maxHealth).toBe(FloatEye.maxHealth * 2);
        expect(scaleEnemyVitae(FloatEye, 1)).toBe(FloatEye);
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
        const base = { player: deepClone(Player), enemy: deepClone(FloatEye), deck, runs: 20, policy: 'witness' as const };
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
            runPacingEncounter(deepClone(Player), scaleEnemyVitae(deepClone(FloatEye), 1), deck, 1 + i, 'witness').phaseReached);
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
        const base = { player: deepClone(Player), enemy: deepClone(FloatEye), deck, runs: 20, policy: 'human-like' as const };
        const authored = simulatePacing({ ...base, enemyHpMultiplier: 1 });
        const live = simulatePacing(base);
        expect(live.runs).toBe(20);
        expect(live.meanTurns).toBeGreaterThan(authored.meanTurns);
        expect(live.winRate).toBeGreaterThanOrEqual(0);
        expect(live.mercyRate).toBe(0);
    });
});
