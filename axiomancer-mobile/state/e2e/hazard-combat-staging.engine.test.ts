/**
 * `beginHazardEncounter` stages `state.currentEncounter` via `startCombat`
 * before handing the enemy to the panel, so the exit-time `endCombat` call
 * has a real encounter to resolve rewards against instead of silently
 * no-op'ing.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { createAppActions } from '@/state/actions';
import { createAppStore } from '@/state/store';
import { arriveAtRealFight } from '@/test-utils/realFight';

afterEach(() => {
    jest.restoreAllMocks();
});

describe('beginHazardEncounter: stages currentEncounter (phase 54)', () => {
    it('calls startCombat so state.currentEncounter is populated before the fight starts', () => {
        const { store, actions } = arriveAtRealFight();

        expect(store.getState().currentEncounter).toBeUndefined();

        const returnedEnemy = actions.beginHazardEncounter();

        expect(returnedEnemy).not.toBeNull();
        const staged = store.getState().currentEncounter;
        expect(staged).not.toBeUndefined();
        expect(staged?.enemies[0]?.id).toBe(returnedEnemy?.id);
    });

    it('still clears the pending event slice (unchanged behavior)', () => {
        const { store, actions } = arriveAtRealFight();

        actions.beginHazardEncounter();

        expect(store.getState().event?.pending).toBeNull();
    });

    it('returns null and stages nothing when there is no pending encounter event', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const actions = createAppActions(store);

        const result = actions.beginHazardEncounter();

        expect(result).toBeNull();
        expect(store.getState().currentEncounter).toBeUndefined();
    });
});
