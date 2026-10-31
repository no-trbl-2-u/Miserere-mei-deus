/**
 * Hermetic E2E Tests — Loot-cache-choice encounter ("The Reliquary") store
 * flow. Drives caches through the store action layer: begin → offer →
 * outcome → claim, for both offers (card / item), and verifies the claim
 * applies the right grant to the real GameState. There is no sacrifice
 * offer; choosing one is a no-op.
 * Seeded; no timers, no network.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { GREY_LANE, getCardLane } from '@mechanics';
import type { Equipment, GameState } from '@mechanics';

import { createAppActions, type AppActions } from '@/state/actions';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

afterEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as { __AXM_CACHE_SEED__?: number }).__AXM_CACHE_SEED__;
});

function makeStoreAndActions(): { store: AppStore; actions: AppActions } {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    return { store, actions: createAppActions(store) };
}

describe('cache store flow (three-offer choice)', () => {
    it('begins in the offer phase; a second begin while active is a no-op', () => {
        const { store, actions } = makeStoreAndActions();
        expect(actions.beginLootCacheChoice({ tier: 'modest', currency: 10, seed: 7 })).toBe(true);
        expect(actions.beginLootCacheChoice({ tier: 'modest', currency: 10, seed: 7 })).toBe(false);
        expect(store.getState().cache?.session?.phase).toBe('offer');
    });

    it('card offer: outcome names a candidate; claim appends it to the deck', () => {
        const { store, actions } = makeStoreAndActions();
        const before = store.getState() as unknown as GameState;
        const beforeRewards = (before.player.combatRewardCards ?? []).length;

        actions.beginLootCacheChoice({ tier: 'modest', currency: 10, seed: 7 });
        actions.chooseLootCacheChoiceOffer('card');
        expect(store.getState().cache?.session?.phase).toBe('outcome');
        const outcome = store.getState().cache!.session!.outcome!;
        expect(outcome.chosen).toBe('card');
        expect(outcome.rewardCardId).not.toBeNull();

        const result = actions.claimLootCacheChoiceOutcome();
        expect(result.applied).toBe(true);
        expect(result.outcome?.chosen).toBe('card');

        const after = store.getState() as unknown as GameState;
        expect((after.player.combatRewardCards ?? []).length).toBe(beforeRewards + 1);
        expect(after.player.combatRewardCards).toContain(outcome.rewardCardId);
        expect(store.getState().cache?.session).toBeNull();
    });

    it('card offer: the cache seed picks the card, whatever Math.random says', () => {
        const offeredCard = (random: number): string | null => {
            jest.spyOn(Math, 'random').mockReturnValue(random);
            const { store, actions } = makeStoreAndActions();
            actions.beginLootCacheChoice({ tier: 'modest', currency: 10, seed: 7 });
            const card = store.getState().cache?.session?.cardCandidate ?? null;
            jest.restoreAllMocks();
            return card;
        };
        const low = offeredCard(0);
        expect(low).not.toBeNull();
        expect(offeredCard(0.999)).toBe(low);
    });

    it('item offer: outcome carries the rolled items + currency; claim grants both', () => {
        const { store, actions } = makeStoreAndActions();
        const before = store.getState() as unknown as GameState;
        const beforeInventory = before.player.inventory.length;
        const beforeCurrency = before.player.currency;

        actions.beginLootCacheChoice({ tier: 'rich', currency: 12, seed: 7 });
        actions.chooseLootCacheChoiceOffer('item');
        const outcome = store.getState().cache!.session!.outcome!;
        expect(outcome.chosen).toBe('item');
        expect(outcome.currency).toBe(12);

        const result = actions.claimLootCacheChoiceOutcome();
        expect(result.applied).toBe(true);

        const after = store.getState() as unknown as GameState;
        expect(after.player.inventory.length).toBe(beforeInventory + outcome.items.length);
        expect(after.player.currency).toBe(beforeCurrency + 12);
    });

    it('offers card and item only: the retired sacrifice offer is a no-op', () => {
        const { store, actions } = makeStoreAndActions();
        actions.beginLootCacheChoice({ tier: 'modest', currency: 25, seed: 7 });
        actions.chooseLootCacheChoiceOffer('sacrifice' as never);
        expect(store.getState().cache!.session!.phase).toBe('offer');
        expect(store.getState().cache!.session!.outcome).toBeNull();
    });

    describe('the card follows the reward rule (RW1a A6)', () => {
        /** A fixture lane relic: no library relic names a lane yet, so the item carries its own. */
        const laneRelic = (laneId: string): Equipment => ({
            id: `fixture-relic-${laneId}`, name: 'Fixture relic', description: '',
            category: 'equipment', slot: 'relic', statModifiers: [], laneId,
        });

        /** Opens a cache for a player holding the Elementalist test deck, and returns its card. */
        function cacheCard(worn: Equipment[], carried: Equipment[], random: number): string | null {
            const { store, actions } = makeStoreAndActions();
            const state = store.getState() as unknown as GameState;
            store.setState({
                player: {
                    ...state.player,
                    knownCards: [...getCardLane('elementalist')!.testDeck],
                    inventory: [...worn, ...carried],
                    equipment: { weapon: null, armor: null, relics: worn },
                    devRewardLaneIds: undefined,
                },
            } as never);
            jest.spyOn(Math, 'random').mockReturnValue(random);
            actions.beginLootCacheChoice({ tier: 'modest', currency: 10, seed: 7 });
            return store.getState().cache!.session!.cardCandidate;
        }

        const RANDOMS = [0, 0.2, 0.45, 0.7, 0.99];
        const grey = GREY_LANE.cardIds;
        const bloodPrice = getCardLane('blood-price')!.cardIds;
        const elementalist = getCardLane('elementalist')!.cardIds;

        it('no lane relic: the card is from a starting lane, never grey, never an Elementalist card', () => {
            for (const r of RANDOMS) {
                const card = cacheCard([], [], r);
                expect(grey).not.toContain(card);
                expect(elementalist).not.toContain(card);
                expect([...bloodPrice, ...getCardLane('defender')!.cardIds]).toContain(card);
            }
        });

        it('a lane relic carried in the satchel but not worn: still the starting lanes only', () => {
            for (const r of RANDOMS) {
                const card = cacheCard([], [laneRelic('elementalist')], r);
                expect(grey).not.toContain(card);
                expect(elementalist).not.toContain(card);
            }
        });

        it('the lane relic worn: the card is from its lane', () => {
            for (const r of RANDOMS) expect(elementalist).toContain(cacheCard([laneRelic('elementalist')], [], r));
        });
    });

    it('cannot claim before an offer is chosen', () => {
        const { store, actions } = makeStoreAndActions();
        actions.beginLootCacheChoice({ tier: 'modest', seed: 7 });
        const result = actions.claimLootCacheChoiceOutcome();
        expect(result.applied).toBe(false);
        expect(store.getState().cache?.session).not.toBeNull();
    });
});
