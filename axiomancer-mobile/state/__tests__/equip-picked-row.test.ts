/**
 * Hermetic store test: the dock's picked row is the row that changes.
 *
 * Runs each of the five dock rows (weapon, armor, RELIC I-III) through wear,
 * replace and take-off against the real app store and actions, plus the picked
 * row's reflection in the inventory view model and the ItemModal's REPLACE line.
 * Weapon and armor use fixture pieces (no shipped content wears there yet).
 */

import { describe, it, expect } from '@jest/globals';
import {
    createCharacter,
    equipItem as engineEquipItem,
    relicPositions,
    type Equipment,
    type Item,
} from '@mechanics';

import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { createAppActions } from '@/state/actions';
import { createAppStore } from '@/state/store';
import { selectInventoryViewModel } from '@/state/presenters/inventory.engine';
import { selectItemModalViewModel } from '@/state/presenters/inventory.modal.engine';
import { equipPositionFor, rowRelicPosition, rowSlotKind, type DockRowId } from '@/state/presenters/loadout';

function weapon(id: string): Equipment {
    return { id, name: `Weapon ${id}`, description: 'A fixture blade.', category: 'equipment', slot: 'weapon' };
}

function armor(id: string): Equipment {
    return { id, name: `Armor ${id}`, description: 'A fixture coat.', category: 'equipment', slot: 'armor' };
}

function relic(id: string): Equipment {
    return { id, name: `Relic ${id}`, description: 'A fixture relic.', category: 'equipment', slot: 'relic' };
}

/** A clean store whose player carries `items`; `wear` puts pieces on, in order, at the given relic positions. */
function makeStore(items: readonly Equipment[], wear: ReadonlyArray<[string, number?]> = []) {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const state = store.getState();
    const clean = createCharacter({
        id: state.player.id,
        name: state.player.name,
        level: state.player.level,
        baseStats: state.player.baseStats,
        currency: state.player.currency,
        knownCards: state.player.knownCards,
        inventory: [...items],
        equipment: [],
    });
    let player = { ...state.player, ...clean };
    for (const [id, position] of wear) {
        const piece = items.find((i) => i.id === id)!;
        player = engineEquipItem(player, piece, position === undefined ? undefined : { position });
    }
    store.setState({ player });
    return store;
}

const relicIds = (store: ReturnType<typeof makeStore>): Array<string | null> =>
    relicPositions(store.getState().player.equipment).map((r) => r?.id ?? null);

const ROWS: readonly DockRowId[] = ['weapon', 'armor', 'relic-0', 'relic-1', 'relic-2'];

describe('the dock row id', () => {
    it('names five distinct rows and maps each to its kind and relic position', () => {
        expect(new Set(ROWS).size).toBe(5);
        expect(ROWS.map(rowSlotKind)).toEqual(['weapon', 'armor', 'relic', 'relic', 'relic']);
        expect(ROWS.map((r) => rowRelicPosition(r))).toEqual([undefined, undefined, 0, 1, 2]);
    });

    it('steers only a relic, and only toward a relic row', () => {
        expect(equipPositionFor(relic('r'), 'relic-2')).toBe(2);
        expect(equipPositionFor(relic('r'), 'weapon')).toBeUndefined();
        expect(equipPositionFor(relic('r'), null)).toBeUndefined();
        expect(equipPositionFor(weapon('w'), 'relic-1')).toBeUndefined();
    });
});

describe('weapon and armor rows: wear, replace, take off', () => {
    it('weapon: wears into the bare row, replaces the worn piece (which stays carried), takes off', () => {
        const store = makeStore([weapon('w1'), weapon('w2')]);
        const actions = createAppActions(store);

        actions.equipItem('w1');
        expect(store.getState().player.equipment.weapon?.id).toBe('w1');

        // The modal names the worn piece as the one to replace.
        expect(selectItemModalViewModel(store.getState(), 'w2', 'weapon')!.replacingName).toBe('Weapon w1');
        actions.equipItem('w2');
        expect(store.getState().player.equipment.weapon?.id).toBe('w2');
        expect(store.getState().player.inventory.map((i: Item) => i.id)).toContain('w1');

        actions.unequipItem('w2');
        expect(store.getState().player.equipment.weapon).toBeNull();
    });

    it('armor: wears, replaces, takes off, and leaves the weapon row alone', () => {
        const store = makeStore([weapon('w1'), armor('a1'), armor('a2')], [['w1']]);
        const actions = createAppActions(store);

        actions.equipItem('a1');
        actions.equipItem('a2');
        expect(store.getState().player.equipment.armor?.id).toBe('a2');
        expect(store.getState().player.equipment.weapon?.id).toBe('w1');

        actions.unequipItem('a2');
        expect(store.getState().player.equipment.armor).toBeNull();
        expect(store.getState().player.equipment.weapon?.id).toBe('w1');
    });

    it('ignores a relic position handed to a weapon', () => {
        const store = makeStore([weapon('w1')]);
        createAppActions(store).equipItem('w1', 2);
        expect(store.getState().player.equipment.weapon?.id).toBe('w1');
    });
});

describe.each([0, 1, 2])('relic row %i', (position) => {
    const row = `relic-${position}` as DockRowId;
    const others = [0, 1, 2].filter((p) => p !== position);

    it('wears a relic into the picked bare row, whichever earlier rows are empty', () => {
        const store = makeStore([relic('new')]);
        createAppActions(store).equipItem('new', position);

        const ids = relicIds(store);
        expect(ids[position]).toBe('new');
        for (const p of others) expect(ids[p]).toBeNull();
    });

    it('replaces only what is in the picked row, and the replaced relic stays carried', () => {
        const store = makeStore(
            [relic('r0'), relic('r1'), relic('r2'), relic('new')],
            [['r0', 0], ['r1', 1], ['r2', 2]],
        );
        const before = relicIds(store);

        const modal = selectItemModalViewModel(store.getState(), 'new', row)!;
        expect(modal.replacingName).toBe(`Relic r${position}`);
        expect(modal.confirmLabel).toBe(`EQUIP · REPLACE RELIC R${position}`);

        createAppActions(store).equipItem('new', position);

        const after = relicIds(store);
        expect(after[position]).toBe('new');
        for (const p of others) expect(after[p]).toBe(before[p]);
        expect(store.getState().player.inventory.map((i: Item) => i.id)).toContain(`r${position}`);
    });

    it('the modal names no piece when the picked row is empty', () => {
        const store = makeStore([relic('a'), relic('b'), relic('new')], [['a', others[0]], ['b', others[1]]]);
        const modal = selectItemModalViewModel(store.getState(), 'new', row)!;
        expect(modal.replacingName).toBeNull();
        expect(modal.confirmLabel).toBe('EQUIP');
    });

    it('takes a worn relic off from any row: only that row empties', () => {
        const store = makeStore(
            [relic('r0'), relic('r1'), relic('r2')],
            [['r0', 0], ['r1', 1], ['r2', 2]],
        );
        createAppActions(store).unequipItem(`r${position}`);

        const ids = relicIds(store);
        expect(ids[position]).toBeNull();
        for (const p of others) expect(ids[p]).toBe(`r${p}`);
    });
});

describe('no row picked: the engine default stands', () => {
    it('fills the first empty position', () => {
        const store = makeStore([relic('a'), relic('b'), relic('c')], [['a', 0], ['b', 2]]);
        createAppActions(store).equipItem('c');
        expect(relicIds(store)).toEqual(['a', 'c', 'b']);
    });

    it('with all three full, replaces RELIC III and the modal names it', () => {
        const store = makeStore(
            [relic('a'), relic('b'), relic('c'), relic('d')],
            [['a', 0], ['b', 1], ['c', 2]],
        );
        expect(selectItemModalViewModel(store.getState(), 'd')!.replacingName).toBe('Relic c');
        createAppActions(store).equipItem('d');
        expect(relicIds(store)).toEqual(['a', 'b', 'd']);
    });
});

describe('the picked row in the inventory view model', () => {
    it('names the picked relic row in the banner and filters the satchel to relics', () => {
        const store = makeStore([relic('a'), relic('b'), weapon('w')], [['a', 0]]);
        const vm = selectInventoryViewModel(store.getState(), { selectedRow: 'relic-1' });

        expect(vm.equipmentDock.selectedRow).toBe('relic-1');
        expect(vm.equipmentDock.bannerSlotLabel).toBe('RELIC II');
        expect(vm.items.map((i) => i.id).sort()).toEqual(['a', 'b']);
        expect(vm.equipmentDock.slots.map((s) => s.id)).toEqual(ROWS);
    });

    it('previews the trade against the picked row, not the default', () => {
        const store = makeStore(
            [relic('a'), relic('b'), relic('c'), relic('d')],
            [['a', 0], ['b', 1], ['c', 2]],
        );
        const vm = selectInventoryViewModel(store.getState(), { selectedRow: 'relic-0' });
        expect(vm.items.find((i) => i.id === 'd')!.replacePreview?.replacing.name).toBe('Relic a');

        const unpicked = selectInventoryViewModel(store.getState());
        expect(unpicked.items.find((i) => i.id === 'd')!.replacePreview?.replacing.name).toBe('Relic c');
    });
});
