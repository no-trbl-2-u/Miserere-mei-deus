/**
 * Hermetic component tests — DebugRunControls (+ gallery links).
 *
 * Pins:
 *   - DEV gate (true / simulated-false)
 *   - SAVE writes through the adapter
 *   - RESET RUN keeps the character; NEW RUN changes the run id
 *   - Gallery buttons push their dev routes
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DebugRunControls } from '@/components/DebugRunControls';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const mockPush = jest.fn();
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
}));

afterEach(() => {
    mockPush.mockClear();
    jest.restoreAllMocks();
});

const withProvider = (store: AppStore, child: React.ReactNode) => <GameStoreProvider store={store}>{child}</GameStoreProvider>;

describe('DebugRunControls', () => {
    it('renders run + gallery buttons in dev', () => {
        const tree = render(withProvider(createAppStore({ adapter: createMemoryAdapter() }), <DebugRunControls />));
        for (const id of ['debug-run-save', 'debug-run-reset', 'debug-run-new', 'debug-gallery-enemy-art', 'debug-gallery-rooms', 'debug-gallery-defeat', 'debug-gallery-parley', 'debug-gallery-frames']) {
            expect(tree.queryByTestId(id)).not.toBeNull();
        }
    });

    it('renders null when __DEV__ is false (production build simulation)', () => {
        const g = global as unknown as { __DEV__: boolean };
        const original = g.__DEV__;
        g.__DEV__ = false;
        try {
            const tree = render(withProvider(createAppStore({ adapter: createMemoryAdapter() }), <DebugRunControls />));
            expect(tree.queryByTestId('debug-run-save')).toBeNull();
        } finally {
            g.__DEV__ = original;
        }
    });

    it('SAVE persists through the adapter', () => {
        const adapter = createMemoryAdapter();
        const save = jest.spyOn(adapter, 'save');
        const store = createAppStore({ adapter });
        const tree = render(withProvider(store, <DebugRunControls />));
        fireEvent.press(tree.getByTestId('debug-run-save'));
        expect(save).toHaveBeenCalled();
    });

    it('RESET RUN keeps the character name; NEW RUN starts a fresh run id', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const name = store.getState().player.name;
        const runId = store.getState().runId;
        const tree = render(withProvider(store, <DebugRunControls />));
        fireEvent.press(tree.getByTestId('debug-run-reset'));
        expect(store.getState().player.name).toBe(name);
        fireEvent.press(tree.getByTestId('debug-run-new'));
        expect(store.getState().runId).not.toBe(runId);
    });

    it('gallery buttons push their dev routes', () => {
        const tree = render(withProvider(createAppStore({ adapter: createMemoryAdapter() }), <DebugRunControls />));
        fireEvent.press(tree.getByTestId('debug-gallery-rooms'));
        expect(mockPush).toHaveBeenCalledWith('/devart/rooms');
        fireEvent.press(tree.getByTestId('debug-gallery-parley'));
        expect(mockPush).toHaveBeenCalledWith('/devaftermath?panel=parley');
        fireEvent.press(tree.getByTestId('debug-gallery-frames'));
        expect(mockPush).toHaveBeenCalledWith('/devframes');
    });
});
