/**
 * Hermetic journey — a fresh run starts with no relic (phase SG1 A1).
 *
 * From a fresh store a new game resolves its first node and enters its first
 * fight through `beginHazardEncounter` (what `<CombatGate>` calls). No relic
 * is carried or worn, nothing waits on the item-reward screen, and the fight
 * starts with no signature. Before SG1 the reducer's fight-start floor wore
 * the Suppliant's Ring here and the item-reward gate offered it at the first
 * node.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { getRelicById, initializeCombatEncounter, isEquipment, type Item } from '@mechanics';

import { createAppActions } from '@/state/actions';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { settledBreakwater } from '@/test-utils/settledBreakwater';
import { selectHasPendingItemReward } from '@/state/presenters/item-reward.engine';

afterEach(() => {
    jest.restoreAllMocks();
});

describe('a fresh run starts with no relic (SG1 A1)', () => {
    it('first node resolved, first fight entered: no relic, no hand-over, no signatures', () => {
        // The quest nodes settled (test-only), so the first fight is a step away.
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: settledBreakwater() } });
        const actions = createAppActions(store);

        // The first node: resolve whatever bw-1 offers, then walk to the first fight.
        actions.resolveCurrentMapEvent();
        actions.moveTo('bw-2');
        expect(actions.resolveCurrentMapEvent()).toBe(true);
        const enemy = actions.beginHazardEncounter();
        expect(enemy).not.toBeNull();

        const state = store.getState();
        expect(state.currentEncounter).toBeDefined();
        expect(state.player.inventory.filter((i: Item) => isEquipment(i))).toEqual([]);
        expect(state.player.equipment.relics).toEqual([]);
        expect(state.itemReward.queue).toEqual([]);
        expect(selectHasPendingItemReward(state)).toBe(false);

        const flags = (state as unknown as { flags?: string[] }).flags;
        const fight = initializeCombatEncounter(state.player, enemy!, undefined, 7, flags);
        expect(fight.signatures).toEqual([]);
    });

    it("keeps the Suppliant's Ring in the library", () => {
        expect(getRelicById('relic-disarming-plea')?.grantsSignature).toBe('sig-disarming-plea');
    });
});
