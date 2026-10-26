/**
 * SATCHEL × a relic carried unworn (phase SG1 A5).
 *
 * A run starts with no relic, so the satchel is empty and the dock bare. A
 * relic the player carries without wearing has its signature off: its row
 * shows NOT WORN where a worn one shows WORN, its detail names the signature
 * that is off above a WEAR button, and pressing WEAR wears it so the next
 * fight from the store carries the signature.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import {
    createCharacter, getRelicById, initializeCombatEncounter, ENEMY_REGISTRY, FIXTURE_TRINKETS,
    type Character, type Equipment, type Item,
} from '@mechanics';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

import { CombatModeProvider } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { selectInventoryViewModel } from '@/state/presenters/inventory.engine';
import { selectItemModalViewModel } from '@/state/presenters/inventory.modal.engine';

import InventoryScreen from '@/app/(tabs)/inventory';

afterEach(() => {
    jest.restoreAllMocks();
});

const SIGNET = 'relic-bleeding-signet';
const RING = 'relic-disarming-plea';

function relic(id: string): Equipment {
    const r = getRelicById(id)!;
    return { ...r, statModifiers: (r.statModifiers ?? []).map((m) => ({ ...m })) };
}

/** A level-1 player carrying `carried`, wearing (and carrying) `worn`. */
function storeWith(carried: Item[], worn: Equipment[] = []): AppStore {
    const player = createCharacter({
        name: 'Pilgrim', level: 1, baseStats: { heart: 5, body: 5, mind: 5 },
        inventory: [...worn, ...carried], equipment: worn,
    });
    return createAppStore({ adapter: createMemoryAdapter(), overrides: { player } });
}

function screen(store: AppStore) {
    return render(
        <CombatModeProvider>
            <GameStoreProvider store={store}>
                <InventoryScreen />
            </GameStoreProvider>
        </CombatModeProvider>,
    );
}

function nextFightSignatures(store: AppStore) {
    const fight = initializeCombatEncounter(
        store.getState().player as Character, { ...ENEMY_REGISTRY['float-eye'] }, ['grey-strike'], 1,
    );
    return fight.signatures;
}

describe('SATCHEL — a brand-new run', () => {
    it('is empty, with a bare dock: a run starts with no relic', () => {
        const vm = selectInventoryViewModel(createAppStore({ adapter: createMemoryAdapter() }).getState(), {});
        expect(vm.isEmpty).toBe(true);
        for (const slot of vm.equipmentDock.slots) expect(slot.item).toBeNull();
    });
});

describe('SATCHEL — NOT WORN (SG1 A5)', () => {
    it('a carried, unworn relic shows NOT WORN; a worn one shows WORN and no NOT WORN', () => {
        const store = storeWith([relic(SIGNET)], [relic(RING)]);
        const rows = selectInventoryViewModel(store.getState(), {}).items;
        expect(rows.find((r) => r.id === SIGNET)?.wornLabel).toBe('NOT WORN');
        expect(rows.find((r) => r.id === RING)?.wornLabel).toBe('WORN');

        const tree = screen(store);
        expect(tree.getByTestId(`item-not-worn-${SIGNET}`)).toBeTruthy();
        expect(tree.queryByTestId(`item-not-worn-${RING}`)).toBeNull();
    });

    it('the detail names the signature that is off, above WEAR; a worn relic shows neither', () => {
        const store = storeWith([relic(SIGNET)], [relic(RING)]);
        const carried = selectItemModalViewModel(store.getState(), SIGNET)!;
        expect(carried.notWornLine).toBe('Not worn: Crimson Covenant is off.');
        expect(carried.confirmLabel).toBe('WEAR');

        const worn = selectItemModalViewModel(store.getState(), RING)!;
        expect(worn.notWornLine).toBeNull();
        expect(worn.confirmLabel).toBe('UNEQUIP');
    });

    it('with the slot full the button reads WEAR · REPLACE <NAME>', () => {
        const store = storeWith([relic(SIGNET)], [...FIXTURE_TRINKETS]);
        const vm = selectItemModalViewModel(store.getState(), SIGNET)!;
        const last = FIXTURE_TRINKETS[FIXTURE_TRINKETS.length - 1]!;
        expect(vm.confirmLabel).toBe(`WEAR · REPLACE ${last.name.toUpperCase()}`);
    });

    it('pressing WEAR wears it: the badge becomes WORN and the next fight carries Crimson Covenant', () => {
        const store = storeWith([relic(SIGNET)]);
        expect(nextFightSignatures(store)).toEqual([]);

        const tree = screen(store);
        fireEvent.press(tree.getByTestId(`item-${SIGNET}`));
        expect(tree.getByTestId('modal-not-worn')).toBeTruthy();
        expect(tree.getByText('Not worn: Crimson Covenant is off.')).toBeTruthy();
        expect(tree.getByText('WEAR')).toBeTruthy();
        fireEvent.press(tree.getByTestId('modal-confirm'));

        expect(tree.queryByTestId(`item-not-worn-${SIGNET}`)).toBeNull();
        expect(selectInventoryViewModel(store.getState(), {}).items.find((r) => r.id === SIGNET)?.wornLabel)
            .toBe('WORN');
        expect(nextFightSignatures(store)).toEqual(['sig-crimson-covenant']);
    });
});
