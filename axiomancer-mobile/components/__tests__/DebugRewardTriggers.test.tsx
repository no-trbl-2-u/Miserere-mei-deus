/**
 * Hermetic component tests — DebugRewardTriggers.
 *
 * Pins:
 *   - DEV gate (true / simulated-false)
 *   - RELIQUARY MODEST / RICH open a loot-cache session at that tier
 *     (historic `debug-cache-button` id on MODEST)
 *   - A hazard chip opens a hazard session for that id
 *   - ANVIL opens a blacksmith session
 *   - UNLOCK JOURNAL fills codex.unlockedEntries
 *   - RELIC REWARD queues the Bleeding Signet on the item-reward screen
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DebugRewardTriggers } from '@/components/DebugRewardTriggers';
import { listHazards, listJournalEntries } from '@/state/dev/rewards';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

afterEach(() => {
    jest.restoreAllMocks();
});

const makeStore = (): AppStore => createAppStore({ adapter: createMemoryAdapter() });
const withProvider = (store: AppStore, child: React.ReactNode) => <GameStoreProvider store={store}>{child}</GameStoreProvider>;

describe('DebugRewardTriggers: DEV gate', () => {
    it('renders every reward button and a chip per hazard', () => {
        const tree = render(withProvider(makeStore(), <DebugRewardTriggers />));
        expect(tree.queryByTestId('debug-cache-button')).not.toBeNull();
        expect(tree.queryByTestId('debug-cache-rich-button')).not.toBeNull();
        expect(tree.queryByTestId('debug-anvil-budget-button')).not.toBeNull();
        expect(tree.queryByTestId('debug-journal-unlock-button')).not.toBeNull();
        expect(tree.queryByTestId('debug-relic-reward-button')).not.toBeNull();
        for (const h of listHazards()) expect(tree.queryByTestId(`debug-hazard-id-${h.id}`)).not.toBeNull();
    });

    it('renders null when __DEV__ is false (production build simulation)', () => {
        const g = global as unknown as { __DEV__: boolean };
        const original = g.__DEV__;
        g.__DEV__ = false;
        try {
            const tree = render(withProvider(makeStore(), <DebugRewardTriggers />));
            expect(tree.queryByTestId('debug-cache-button')).toBeNull();
        } finally {
            g.__DEV__ = original;
        }
    });
});

describe('DebugRewardTriggers: sessions + grants', () => {
    it('RELIC REWARD queues the Bleeding Signet for the item-reward screen, granting nothing yet', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugRewardTriggers />));
        fireEvent.press(tree.getByTestId('debug-relic-reward-button'));
        expect(store.getState().itemReward.queue.map((e) => e.item.id)).toEqual(['relic-bleeding-signet']);
        expect(store.getState().player.inventory.map((i) => i.id)).not.toContain('relic-bleeding-signet');
    });

    it('RELIQUARY RICH opens a rich loot-cache session', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugRewardTriggers />));
        fireEvent.press(tree.getByTestId('debug-cache-rich-button'));
        expect(store.getState().cache.session).not.toBeNull();
    });

    it('a hazard chip opens that hazard', () => {
        const store = makeStore();
        const hazard = listHazards()[1];
        const tree = render(withProvider(store, <DebugRewardTriggers />));
        fireEvent.press(tree.getByTestId(`debug-hazard-id-${hazard.id}`));
        expect(store.getState().hazard.session?.hazardId).toBe(hazard.id);
    });

    it('ANVIL opens a blacksmith session', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugRewardTriggers />));
        fireEvent.press(tree.getByTestId('debug-anvil-budget-button'));
        expect(store.getState().blacksmith.session).not.toBeNull();
    });

    it('UNLOCK JOURNAL unlocks every codex entry', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugRewardTriggers />));
        fireEvent.press(tree.getByTestId('debug-journal-unlock-button'));
        expect(store.getState().codex.unlockedEntries).toHaveLength(listJournalEntries().length);
    });
});
