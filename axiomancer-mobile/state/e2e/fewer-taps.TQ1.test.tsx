/**
 * Hermetic e2e — fewer taps between a decision and the next node (Phase TQ1, A5).
 *
 * Contract asserted here:
 *   · taking one card from the combat spoils is two presses from the
 *     overlay's mount to the card in the deck (the tile, then TAKE CARD;
 *     it was three: tile, CHOOSE THIS, TAKE CARD);
 *   · the map's node panel prints the purse on rest, anvil and village nodes
 *     and none on a fight or a cache, read off the real presenter over the
 *     real Act 1 maps;
 *   · at the anvil, a purse below `ANVIL_VERB_PRICING.hone` adds the short
 *     line, and a purse at it does not.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ANVIL_VERB_PRICING, createStartingWorld, getMapDefinition, settleQuestNodes, syncMoveLists } from '@mechanics';

import { CombatRewardsOverlay } from '@/components/combat/encounter/CombatRewardsOverlay';
import { NodeConfirmPanel } from '@/components/exploration/NodeConfirmPanel';
import { claimCombatRewardAction } from '@/state/combat/store-actions';
import { jumpToNode } from '@/state/dev/world-travel';
import { GameStoreProvider, useGameState } from '@/state/GameStoreProvider';
import { rewardCardVMs } from '@/state/presenters/combat-encounter.engine';
import {
    purseFieldsFor,
    selectExplorationViewModel,
    type ExplorationOption,
    type NodeType,
} from '@/state/presenters/exploration.engine';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { withAllProviders } from '@/test-utils/withAllProviders';

// ---------------------------------------------------------------------------
// The spoils pick
// ---------------------------------------------------------------------------

const OFFER_IDS = ['grey-strike', 'grey-ward', 'grey-word'];
const EMPTY: readonly string[] = [];

/** The draft as the combat panel mounts it: offers off the store, the pick
 *  through the real claim action. */
function SpoilsHarness({ store }: { store: AppStore }) {
    const offers = useGameState((s) => s.combatReward?.offers ?? EMPTY);
    const claimed = useGameState((s) => s.combatReward?.claimed ?? false);
    if (claimed || offers.length === 0) return null;
    return <CombatRewardsOverlay offers={rewardCardVMs([...offers])} onPick={(id) => claimCombatRewardAction(store, id)} />;
}

function spoilsStore(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const { player } = store.getState();
    store.setState({
        player: { ...player, combatRewardCards: [] },
        combatReward: { offers: [...OFFER_IDS], claimed: false, upgrade: null },
    } as never);
    return store;
}

describe('the spoils pick takes two presses (TQ1 A1, A5)', () => {
    it('tile then TAKE CARD puts the card in the deck', () => {
        const store = spoilsStore();
        render(withAllProviders(
            <GameStoreProvider store={store}>
                <SpoilsHarness store={store} />
            </GameStoreProvider>,
        ).tree);
        let presses = 0;
        const press = (testID: string) => {
            presses++;
            fireEvent.press(screen.getByTestId(testID));
        };

        press(`combat-reward-${OFFER_IDS[2]}`);
        press('combat-reward-confirm');

        const player = store.getState().player as unknown as { combatRewardCards?: string[] };
        expect(player.combatRewardCards).toContain(OFFER_IDS[2]);
        expect(screen.queryByTestId('combat-rewards')).toBeNull();
        // Was 3 (tile, CHOOSE THIS, TAKE CARD). Fails if the count rises.
        expect(presses).toBeLessThanOrEqual(2);
    });
});

// ---------------------------------------------------------------------------
// The purse on the node panel
// ---------------------------------------------------------------------------

/**
 * The first option of `type` the real presenter offers anywhere on `map`,
 * found by standing the player on each node in turn.
 */
function optionOf(map: string, type: NodeType, currency: number): ExplorationOption {
    // A questline's quest nodes are settled (test-only) so its pockets'
    // fights are offered from the open fan.
    const fresh = createStartingWorld(map as never);
    const world0 = { ...fresh, currentMap: settleQuestNodes(fresh.currentMap) };
    const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: world0 } });
    const { player } = store.getState();
    store.setState({ player: { ...player, currency } } as never);
    const world = store.getState().world!;
    const def = getMapDefinition(world.currentMap.continent, world.currentMap.name);
    for (const node of def.nodes) {
        // Stand there with the map settled (a placement would un-spend a
        // marker, and an unspent marker holds its pocket's roads).
        store.setState({ world: { ...world, currentMap: syncMoveLists({ ...world.currentMap, currentNode: node.id }) } } as never);
        const found = selectExplorationViewModel(store.getState()).options.find((o) => o.type === type);
        if (found) return found;
    }
    throw new Error(`no ${type} node is offered anywhere on ${map}`);
}

function renderPanel(option: ExplorationOption) {
    render(withAllProviders(
        <NodeConfirmPanel selected={option} onConfirm={() => undefined} onCancel={() => undefined} emptyMessage="" />,
    ).tree);
}

const HONE = ANVIL_VERB_PRICING.hone;

describe('the node panel shows the purse where a node can charge (TQ1 A2, A3, A5)', () => {
    it.each<[NodeType, string]>([
        ['rest', 'breakwater'],
        ['blacksmith', 'breakwater'],
    ])('a %s node prints the purse', (type, map) => {
        const option = optionOf(map, type, 12);
        expect(option.purse).toBe(12);
        renderPanel(option);
        expect(screen.getByTestId('node-confirm-purse')).toBeTruthy();
        expect(screen.getByText(/PURSE 12 SHILLINGS/)).toBeTruthy();
    });

    it('a village node prints the purse', () => {
        // No Act 1 map authors a village event today, so the village option is
        // built from the presenter's own per-kind rule over a real option.
        const option = { ...optionOf('breakwater', 'encounter', 12), type: 'village' as const, ...purseFieldsFor('village', 12) };
        expect(option.purse).toBe(12);
        expect(option.cheapestWork).toBeNull();
        renderPanel(option);
        expect(screen.getByText(/PURSE 12 SHILLINGS/)).toBeTruthy();
        expect(screen.queryByTestId('node-confirm-purse-short')).toBeNull();
    });

    it.each<[NodeType, string]>([
        ['encounter', 'breakwater'],
        ['treasure', 'breakwater'],
    ])('a %s node prints no purse', (type, map) => {
        const option = optionOf(map, type, 12);
        expect(option.purse).toBeNull();
        expect(option.cheapestWork).toBeNull();
        renderPanel(option);
        expect(screen.queryByTestId('node-confirm-purse')).toBeNull();
    });

    it('the anvil below its cheapest work says so, priced from the engine', () => {
        const option = optionOf('breakwater', 'blacksmith', HONE - 1);
        expect(option.cheapestWork).toBe(HONE);
        renderPanel(option);
        const short = screen.getByTestId('node-confirm-purse-short');
        expect(short.props.children).toBe(` · the smith's cheapest work costs ${HONE} SHILLINGS`);
    });

    it('the anvil at its cheapest work prints no short line', () => {
        renderPanel(optionOf('breakwater', 'blacksmith', HONE));
        expect(screen.getByTestId('node-confirm-purse')).toBeTruthy();
        expect(screen.queryByTestId('node-confirm-purse-short')).toBeNull();
    });

    it('a rest node at 0 shillings is never short: rest and upgrade are free', () => {
        renderPanel(optionOf('breakwater', 'rest', 0));
        expect(screen.getByText(/PURSE 0 SHILLINGS/)).toBeTruthy();
        expect(screen.queryByTestId('node-confirm-purse-short')).toBeNull();
    });

    it('a change in the purse alone refreshes the options', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld('breakwater') } });
        jumpToNode(store, 'bw-13');
        const before = selectExplorationViewModel(store.getState()).options.find((o) => o.type === 'blacksmith')!;
        const { player } = store.getState();
        store.setState({ player: { ...player, currency: (before.purse ?? 0) + 7 } } as never);
        const after = selectExplorationViewModel(store.getState()).options.find((o) => o.type === 'blacksmith')!;
        expect(after.purse).toBe((before.purse ?? 0) + 7);
    });
});
