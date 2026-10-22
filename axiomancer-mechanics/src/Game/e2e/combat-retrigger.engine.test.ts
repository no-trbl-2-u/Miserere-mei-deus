/**
 * Combat retrigger lock fix — hermetic e2e test.
 *
 * Reproduces and verifies the fix for playtest jot #89(a): after WIN or
 * FRIENDSHIP outcomes, players cannot trigger new combat encounters. Only
 * DEFEAT/restart properly clears the encounter lock.
 *
 * Each terminal combat outcome should allow re-triggering new encounters.
 *
 * Combat is driven by the Hazard-Pattern engine outside
 * the store. `startCombat` stages `currentEncounter`; the driver reports the
 * outcome to `endCombat(outcome)`, which clears the staged encounter.
 */

import { describe, it, expect } from 'vitest';
import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';
import { createCharacter } from '../../Character';
import { FloatEye, GreenJelly } from '../../Enemy/enemy.library';

describe('Phase 103 — Combat retrigger lock fix', () => {
    it('victory outcome allows new combat trigger', () => {
        const character = createCharacter({
            name: 'TestPlayer',
            level: 10,
            baseStats: { heart: 15, body: 15, mind: 15 },
        });

        const store = createGameStore(nullAdapter, { player: character });

        // Stage first encounter.
        store.getState().startCombat(FloatEye);
        expect(store.getState().currentEncounter).toBeTruthy();

        // Driver reports victory.
        const report = store.getState().endCombat('victory');
        expect(report.outcome).toBe('victory');
        expect(store.getState().currentEncounter).toBeUndefined();

        // Should be able to stage a new encounter.
        store.getState().startCombat(GreenJelly);
        expect(store.getState().currentEncounter).toBeTruthy();
        expect(store.getState().currentEncounter!.enemies[0]!.name).toBe('Green Jelly');
    });

    it('friendship outcome allows new combat trigger', () => {
        const character = createCharacter({
            name: 'TestPlayer',
            level: 10,
            baseStats: { heart: 15, body: 15, mind: 15 },
        });

        const store = createGameStore(nullAdapter, { player: character });

        store.getState().startCombat(GreenJelly);
        expect(store.getState().currentEncounter).toBeTruthy();

        const report = store.getState().endCombat('friendship');
        expect(report.outcome).toBe('friendship');
        expect(store.getState().currentEncounter).toBeUndefined();

        store.getState().startCombat(FloatEye);
        expect(store.getState().currentEncounter).toBeTruthy();
        expect(store.getState().currentEncounter!.enemies[0]!.name).toBe('Float-Eye');
    });

    it('defeat outcome allows new combat trigger (regression guard)', () => {
        const character = createCharacter({
            name: 'TestPlayer',
            level: 1,
            baseStats: { heart: 1, body: 1, mind: 1 },
        });

        const store = createGameStore(nullAdapter, { player: character });

        store.getState().startCombat(FloatEye);
        expect(store.getState().currentEncounter).toBeTruthy();

        const report = store.getState().endCombat('defeat');
        expect(report.outcome).toBe('defeat');
        expect(store.getState().currentEncounter).toBeUndefined();

        store.getState().startCombat(GreenJelly);
        expect(store.getState().currentEncounter).toBeTruthy();
        expect(store.getState().currentEncounter!.enemies[0]!.name).toBe('Green Jelly');
    });

    it('all terminal outcomes clear encounter lock for map-based triggers', () => {
        // Test the scenario where combat is triggered via map events,
        // not just direct startCombat calls
        const character = createCharacter({
            name: 'TestPlayer',
            level: 5,
            baseStats: { heart: 10, body: 10, mind: 10 },
        });

        const store = createGameStore(nullAdapter, { player: character });

        // Victory → new encounter sequence.
        store.getState().startCombat({ enemies: [FloatEye], origin: 'test-node-1' });
        const report1 = store.getState().endCombat('victory');
        expect(report1.outcome).toBe('victory');

        store.getState().startCombat({ enemies: [GreenJelly], origin: 'test-node-2' });
        expect(store.getState().currentEncounter).toBeTruthy();
        expect(store.getState().currentEncounter?.origin).toBe('test-node-2');

        // Friendship → new encounter sequence.
        const report2 = store.getState().endCombat('friendship');
        expect(report2.outcome).toBe('friendship');

        store.getState().startCombat({ enemies: [FloatEye], origin: 'test-node-3' });
        expect(store.getState().currentEncounter).toBeTruthy();
        expect(store.getState().currentEncounter?.origin).toBe('test-node-3');
    });

    it('sequential combat encounters work after any outcome', () => {
        const character = createCharacter({
            name: 'TestPlayer',
            level: 5,
            baseStats: { heart: 10, body: 10, mind: 10 },
        });

        const store = createGameStore(nullAdapter, { player: character });

        // First encounter: victory.
        store.getState().startCombat({ enemies: [FloatEye], origin: 'encounter-1' });
        expect(store.getState().endCombat('victory').outcome).toBe('victory');
        expect(store.getState().currentEncounter).toBeUndefined();

        // Second encounter: friendship.
        store.getState().startCombat({ enemies: [GreenJelly], origin: 'encounter-2' });
        expect(store.getState().endCombat('friendship').outcome).toBe('friendship');
        expect(store.getState().currentEncounter).toBeUndefined();

        // Third encounter: defeat.
        store.getState().startCombat({ enemies: [FloatEye], origin: 'encounter-3' });
        expect(store.getState().endCombat('defeat').outcome).toBe('defeat');
        expect(store.getState().currentEncounter).toBeUndefined();

        // Fourth encounter: verify all outcomes cleared the lock.
        store.getState().startCombat({ enemies: [GreenJelly], origin: 'encounter-4' });
        expect(store.getState().currentEncounter).toBeTruthy();
        expect(store.getState().currentEncounter?.origin).toBe('encounter-4');
    });
});
