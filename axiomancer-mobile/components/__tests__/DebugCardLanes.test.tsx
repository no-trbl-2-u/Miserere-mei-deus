/**
 * Hermetic component tests — the `/dev` CARDS section leaves.
 *
 * Pins:
 *   - DEV gate: both leaves render null when __DEV__ is false.
 *   - DebugLaneDeck: the drop-down opens, lists every lane, picks one, and
 *     SET DECK deals that lane's test deck; the Elementalist trial set's lane
 *     is listed and deals its 20-card deck (Phase EL1c), and so does the
 *     Defender's (Phase DF1d).
 *   - DebugRewardPool: one checkbox per lane; checking a lane and pressing
 *     SET REWARD POOL saves it; the grid starts from the saved override.
 */

import { describe, expect, it } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { CARD_LANES, GREY_LANE, getCardById, getCardLane, rewardPoolFor } from '@mechanics';
import React from 'react';

import { DebugLaneDeck } from '@/components/DebugLaneDeck';
import { DebugRewardPool } from '@/components/DebugRewardPool';
import { setRewardPool } from '@/state/dev/cards';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const makeStore = (): AppStore => createAppStore({ adapter: createMemoryAdapter() });
const withProvider = (store: AppStore, child: React.ReactNode) => <GameStoreProvider store={store}>{child}</GameStoreProvider>;

describe('CARDS leaves: DEV gate', () => {
    it('render null when __DEV__ is false (production build simulation)', () => {
        const g = global as unknown as { __DEV__: boolean };
        const original = g.__DEV__;
        g.__DEV__ = false;
        try {
            const deck = render(withProvider(makeStore(), <DebugLaneDeck />));
            expect(deck.queryByTestId('debug-lane-deck')).toBeNull();
            const pool = render(withProvider(makeStore(), <DebugRewardPool />));
            expect(pool.queryByTestId('debug-reward-pool')).toBeNull();
        } finally {
            g.__DEV__ = original;
        }
    });
});

describe('DebugLaneDeck', () => {
    it('picks a lane from the drop-down and SET DECK deals its deck', () => {
        const store = makeStore();
        const player = store.getState().player;
        store.setState({ player: { ...player, knownCards: ['grey-word'], combatRewardCards: ['grey-strike'] } });
        const tree = render(withProvider(store, <DebugLaneDeck />));

        expect(tree.queryByTestId('debug-lane-deck-select-list')).toBeNull();
        fireEvent.press(tree.getByTestId('debug-lane-deck-select'));
        for (const lane of CARD_LANES) {
            expect(tree.queryByTestId(`debug-lane-deck-select-option-${lane.id}`)).not.toBeNull();
        }
        fireEvent.press(tree.getByTestId('debug-lane-deck-select-option-grey'));
        expect(tree.queryByTestId('debug-lane-deck-select-list')).toBeNull();

        fireEvent.press(tree.getByTestId('debug-lane-deck-set'));
        expect(store.getState().player.knownCards).toEqual([...GREY_LANE.testDeck]);
        expect(store.getState().player.combatRewardCards).toEqual([]);
        expect(tree.getByTestId('debug-lane-deck-sub').props.children).toContain(GREY_LANE.name);
    });
});

describe('DebugLaneDeck: the Elementalist', () => {
    it('lists the Elementalist and SET DECK deals its 20-card test deck', () => {
        const lane = getCardLane('elementalist');
        expect(lane?.name).toBe('Elementalist');
        expect(lane?.testDeck).toHaveLength(20);
        expect(lane?.cardIds).toHaveLength(30);
        for (const id of lane!.testDeck) expect(getCardById(id)).toBeDefined();

        const store = makeStore();
        const tree = render(withProvider(store, <DebugLaneDeck />));
        fireEvent.press(tree.getByTestId('debug-lane-deck-select'));
        fireEvent.press(tree.getByTestId('debug-lane-deck-select-option-elementalist'));
        fireEvent.press(tree.getByTestId('debug-lane-deck-set'));
        expect(store.getState().player.knownCards).toEqual([...lane!.testDeck]);
        expect(tree.getByTestId('debug-lane-deck-sub').props.children).toContain('Elementalist');
    });

    it('offers all 30 Elementalist cards once its reward-pool box is checked', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugRewardPool />));
        fireEvent.press(tree.getByTestId('debug-reward-pool-lane-elementalist'));
        fireEvent.press(tree.getByTestId('debug-reward-pool-set'));
        expect(store.getState().player.devRewardLaneIds).toEqual(['elementalist']);
        expect([...rewardPoolFor(store.getState().player)].sort()).toEqual([...getCardLane('elementalist')!.cardIds].sort());
    });
});

describe('DebugLaneDeck: the Defender', () => {
    it('lists the Defender and SET DECK deals its 20-card test deck', () => {
        const lane = getCardLane('defender');
        expect(lane?.name).toBe('Defender');
        expect(lane?.testDeck).toHaveLength(20);
        expect(lane?.cardIds).toHaveLength(30);
        for (const id of lane!.testDeck) expect(getCardById(id)).toBeDefined();

        const store = makeStore();
        const tree = render(withProvider(store, <DebugLaneDeck />));
        fireEvent.press(tree.getByTestId('debug-lane-deck-select'));
        fireEvent.press(tree.getByTestId('debug-lane-deck-select-option-defender'));
        fireEvent.press(tree.getByTestId('debug-lane-deck-set'));
        expect(store.getState().player.knownCards).toEqual([...lane!.testDeck]);
        expect(tree.getByTestId('debug-lane-deck-sub').props.children).toContain('Defender');
    });

    it('offers all 30 Defender cards once its reward-pool box is checked', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugRewardPool />));
        fireEvent.press(tree.getByTestId('debug-reward-pool-lane-defender'));
        fireEvent.press(tree.getByTestId('debug-reward-pool-set'));
        expect(store.getState().player.devRewardLaneIds).toEqual(['defender']);
        expect([...rewardPoolFor(store.getState().player)].sort()).toEqual([...getCardLane('defender')!.cardIds].sort());
    });
});

describe('DebugRewardPool', () => {
    it('renders one checkbox per lane and saves the checked lanes', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugRewardPool />));
        for (const lane of CARD_LANES) {
            expect(tree.getByTestId(`debug-reward-pool-lane-${lane.id}`).props.accessibilityState).toEqual({ checked: false });
        }
        fireEvent.press(tree.getByTestId('debug-reward-pool-lane-grey'));
        expect(tree.getByTestId('debug-reward-pool-lane-grey').props.accessibilityState).toEqual({ checked: true });
        fireEvent.press(tree.getByTestId('debug-reward-pool-set'));
        expect(store.getState().player.devRewardLaneIds).toEqual(['grey']);
    });

    it('starts from the saved override', () => {
        const store = makeStore();
        setRewardPool(store, ['grey']);
        const tree = render(withProvider(store, <DebugRewardPool />));
        expect(tree.getByTestId('debug-reward-pool-lane-grey').props.accessibilityState).toEqual({ checked: true });
    });
});
