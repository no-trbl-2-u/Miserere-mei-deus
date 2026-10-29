/**
 * Harvest's persistent Soul bank ("the jar travels").
 *
 * `applyHazardOutcome` (the panel's economy write-back, same call site that
 * writes `floatingDice` back to the character) must fold whatever
 * `CombatEncounterState.souls` remains unspent at combat end into
 * `player.bankedSouls`, on every outcome — mirrors the floating-die pool's
 * own "persists regardless of how the fight ended" convention.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { type CombatOutcome } from '@mechanics';

import { applyHazardOutcome } from '@/components/combat/encounter/CombatEncounterPanel';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';

afterEach(() => {
    jest.restoreAllMocks();
});

/** The real bw-w2 fight, dealt from the Gleaner's Due. */
function realFight() {
    return startRealFight(REAL_FIGHT_FIXTURE, {
        player: { level: 3, baseStats: { heart: 8, body: 8, mind: 8 } },
        deck: ['the-gleaners-due'],
        seed: 7,
    });
}

describe('applyHazardOutcome: Souls bank write-back (phase 32 part 1b)', () => {
    it('banks unspent souls onto a fresh character (starts at 0)', () => {
        const { store, enemy, combat } = realFight();
        const finalState = { ...combat, souls: 5 };

        applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, enemy);

        expect(store.getState().player?.bankedSouls).toBe(5);
    });

    it('accumulates across repeated combats rather than overwriting', () => {
        const { store, enemy, combat } = realFight();
        const player = store.getState().player;
        store.setState({ player: { ...player, bankedSouls: 3 } } as never);
        const finalState = { ...combat, souls: 4 };

        applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, enemy);

        expect(store.getState().player?.bankedSouls).toBe(7);
    });

    it('banks on every outcome, not just victory — the jar travels regardless', () => {
        const { store, enemy, combat } = realFight();
        const finalState = { ...combat, souls: 2 };

        applyHazardOutcome(store, 'defeat' as CombatOutcome, finalState, enemy);

        expect(store.getState().player?.bankedSouls).toBe(2);
    });

    it('a combat that never generated souls contributes 0', () => {
        const { store, enemy, combat } = realFight();
        const finalState = combat;
        expect(finalState.souls ?? 0).toBe(0);

        applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, enemy);

        expect(store.getState().player?.bankedSouls).toBe(0);
    });
});
