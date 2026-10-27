/**
 * EQ2b A8: one order, one source. The dock and the SELF sheet map over
 * `LOADOUT_ROWS`, so the same five keys and labels come out in the same order,
 * with an empty weapon and armor still shown as bare rows above the relics.
 */

import { describe, it, expect } from '@jest/globals';
import { createGameStore, FIXTURE_TRINKETS } from '@mechanics';

import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { selectCharacterViewModel } from '@/state/presenters/character.engine';
import { selectInventoryViewModel } from '@/state/presenters/inventory.engine';
import { LOADOUT_ROWS, wornAtRow } from '@/state/presenters/loadout';

function stateWith(relics: typeof FIXTURE_TRINKETS) {
    const state = createGameStore(createMemoryAdapter()).getState();
    return {
        ...state,
        player: {
            ...state.player,
            inventory: [...relics],
            equipment: { weapon: null, armor: null, relics: [...relics] },
        },
    } as typeof state;
}

describe('LOADOUT_ROWS', () => {
    it('is Weapon, Armor, then three numbered Relic positions', () => {
        expect(LOADOUT_ROWS.map((r) => [r.key, r.relicIndex, r.dockLabel, r.selfLabel])).toEqual([
            ['weapon', undefined, 'WEAPON', 'Weapon'],
            ['armor', undefined, 'ARMOR', 'Armor'],
            ['relic', 0, 'RELIC I', 'Relic'],
            ['relic', 1, 'RELIC II', 'Relic'],
            ['relic', 2, 'RELIC III', 'Relic'],
        ]);
    });

    it('the dock and the SELF sheet list the same rows in the same order', () => {
        for (const relics of [[], FIXTURE_TRINKETS.slice(0, 1), FIXTURE_TRINKETS.slice(0, 3)]) {
            const state = stateWith(relics);
            const dock = selectInventoryViewModel(state).equipmentDock.slots;
            const self = selectCharacterViewModel(state).equipment;
            expect(dock.map((s) => [s.key, s.relicIndex])).toEqual(LOADOUT_ROWS.map((r) => [r.key, r.relicIndex]));
            expect(self.map((s) => [s.slotKey, s.relicIndex])).toEqual(LOADOUT_ROWS.map((r) => [r.key, r.relicIndex]));
            expect(dock.map((s) => s.label)).toEqual(LOADOUT_ROWS.map((r) => r.dockLabel));
            expect(self.map((s) => s.name)).toEqual(LOADOUT_ROWS.map((r) => r.selfLabel));
        }
    });

    it('keeps an empty weapon and armor as bare rows above the relics', () => {
        const state = stateWith(FIXTURE_TRINKETS.slice(0, 1));
        const dock = selectInventoryViewModel(state).equipmentDock.slots;
        const self = selectCharacterViewModel(state).equipment;
        expect(dock[0].item).toBeNull();
        expect(dock[1].item).toBeNull();
        expect(self[0].item).toBeNull();
        expect(self[1].item).toBeNull();
        expect(dock[2].item?.id).toBe(FIXTURE_TRINKETS[0].id);
        expect(self[2].item).toBe(FIXTURE_TRINKETS[0].name);
    });

    it('wornAtRow reads the piece for a row', () => {
        const state = stateWith(FIXTURE_TRINKETS.slice(0, 2));
        expect(wornAtRow(state.player.equipment, LOADOUT_ROWS[0])).toBeNull();
        expect(wornAtRow(state.player.equipment, LOADOUT_ROWS[3])?.id).toBe(FIXTURE_TRINKETS[1].id);
        expect(wornAtRow(state.player.equipment, LOADOUT_ROWS[4])).toBeNull();
    });
});
