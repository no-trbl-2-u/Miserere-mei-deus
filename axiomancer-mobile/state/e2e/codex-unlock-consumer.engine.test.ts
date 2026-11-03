/**
 * Codex / journal-entry consumer pins.
 *
 * Asserts:
 * - `actions.endCombat(outcome)` returns the engine `CombatEndReport`.
 * - The report's `journalEntryUnlocked` field populates the first time a foe
 *   with a `journalEntry` is spared; absent on a repeat, and on a finish.
 *
 * The engine's `endCombat` takes an explicit outcome and reads the recorded
 * `currentEncounter` (set by `startCombat`) — so these pins drive the
 * outcome directly rather than manipulating a combat slice.
 */

import { describe, expect, it } from '@jest/globals';
import { applyEffect, effectsLibrary, type Enemy } from '@mechanics';

import { createAppActions } from '@/state/actions';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

function makeSpareableEnemy(journalEntryBody?: string) {
    return {
        id: 'test-foe',
        name: 'Test Foe',
        description: 'a figure of test.',
        level: 3,
        health: 10,
        maxHealth: 10,
        baseStats: { heart: 5, body: 5, mind: 5 },
        mapName: 'home-bay',
        logic: 'aggressive' as const,
        effects: [],
        spareStory: { narrative: 'a thing happened.' },
        journalEntry: journalEntryBody !== undefined
            ? {
                id: 'codex-test-foe',
                title: 'Of the Test Foe',
                body: journalEntryBody,
            }
            : undefined,
        // Type assertion for test mock data - partial Enemy properties
    } as unknown as Enemy;
}

describe('actions.endCombat: returns engine CombatEndReport (Phase 78)', () => {
    it('returns a report that unlocks the foe codex entry the first time it is spared', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const actions = createAppActions(store);

        actions.startCombat(makeSpareableEnemy('a long body about the test foe.'));
        const report = store.getState().endCombat('victory', undefined, { spared: true });

        expect(report).not.toBeNull();
        expect(report?.outcome).toBe('victory');
        expect(report?.journalEntryUnlocked?.id).toBe('codex-test-foe');
        expect(store.getState().codex.unlockedEntries).toContain('codex-test-foe');
    });

    it('no journalEntryUnlocked on a repeat Spare (already unlocked)', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const actions = createAppActions(store);

        // The first Spare unlocks the entry.
        actions.startCombat(makeSpareableEnemy('first body.'));
        store.getState().endCombat('victory', undefined, { spared: true });
        expect(store.getState().codex.unlockedEntries).toContain('codex-test-foe');

        // A second Spare with the same journal entry — no fresh unlock.
        actions.startCombat(makeSpareableEnemy('second body.'));
        const report = store.getState().endCombat('victory', undefined, { spared: true });
        expect(report?.journalEntryUnlocked).toBeUndefined();
    });

    it('foe with no journalEntry never gets journalEntryUnlocked', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const actions = createAppActions(store);

        actions.startCombat(makeSpareableEnemy(undefined));
        const report = store.getState().endCombat('victory', undefined, { spared: true });
        expect(report?.journalEntryUnlocked).toBeUndefined();
    });

    it('a victory outcome returns a report and does not unlock the codex', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const actions = createAppActions(store);

        actions.startCombat(makeSpareableEnemy('body.'));
        const report = actions.endCombat('victory');
        expect(report?.outcome).toBe('victory');
        expect(store.getState().codex.unlockedEntries).not.toContain('codex-test-foe');
    });

    it('endCombat outside an encounter reports a flee and grants nothing', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const actions = createAppActions(store);

        const report = actions.endCombat('victory');
        expect(report?.outcome).toBe('flee');
        expect(report?.journalEntryUnlocked).toBeUndefined();
    });

    // Smoke pin — `applyEffect` import keeps the engine-effect surface
    // exercised so a regression in the effects library shape surfaces
    // here, not at runtime.
    it('engine effects library is non-empty (smoke pin)', () => {
        expect(effectsLibrary.debuffs.length).toBeGreaterThan(0);
        const { activeEffects } = applyEffect([], effectsLibrary.debuffs[0], 1);
        expect(activeEffects).toHaveLength(1);
    });
});
