/**
 * Hermetic component tests — DebugItemPicker.
 *
 * Pins:
 *   - DEV gate (true / simulated-false)
 *   - One chip per relic and per consumable
 *   - A chip adds that item to the inventory and reports it
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { consumableLibrary, equipmentLibrary, relicLibrary } from '@mechanics';

import { DebugItemPicker } from '@/components/DebugItemPicker';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

afterEach(() => {
    jest.restoreAllMocks();
});

const makeStore = (): AppStore => createAppStore({ adapter: createMemoryAdapter() });
const withProvider = (store: AppStore, child: React.ReactNode) => <GameStoreProvider store={store}>{child}</GameStoreProvider>;

describe('DebugItemPicker', () => {
    it('renders a chip per relic, weapon, armor and consumable', () => {
        const tree = render(withProvider(makeStore(), <DebugItemPicker />));
        for (const r of relicLibrary) expect(tree.queryByTestId(`debug-item-${r.id}`)).not.toBeNull();
        for (const g of equipmentLibrary) expect(tree.queryByTestId(`debug-item-${g.id}`)).not.toBeNull();
        for (const c of consumableLibrary) expect(tree.queryByTestId(`debug-item-${c.id}`)).not.toBeNull();
    });

    it('a weapon chip carries the piece (the slot is taken or free) and reports it', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugItemPicker />));
        fireEvent.press(tree.getByTestId('debug-item-weapon-siphoning-blade'));
        expect(store.getState().player.inventory.some((i) => i.id === 'weapon-siphoning-blade')).toBe(true);
        expect(tree.getByTestId('debug-item-picker-sub').props.children).toContain('Siphoning Blade');
    });

    it('renders null when __DEV__ is false (production build simulation)', () => {
        const g = global as unknown as { __DEV__: boolean };
        const original = g.__DEV__;
        g.__DEV__ = false;
        try {
            const tree = render(withProvider(makeStore(), <DebugItemPicker />));
            expect(tree.queryByTestId(`debug-item-${relicLibrary[0].id}`)).toBeNull();
        } finally {
            g.__DEV__ = original;
        }
    });

    it('a chip adds that item and reports success', () => {
        const store = makeStore();
        const consumable = consumableLibrary[0];
        const before = store.getState().player.inventory.length;
        const tree = render(withProvider(store, <DebugItemPicker />));
        fireEvent.press(tree.getByTestId(`debug-item-${consumable.id}`));
        expect(store.getState().player.inventory.length).toBeGreaterThanOrEqual(before);
        expect(store.getState().player.inventory.some((i) => i.id === consumable.id)).toBe(true);
        expect(tree.getByTestId('debug-item-picker-sub').props.children).toContain('added');
    });
});
