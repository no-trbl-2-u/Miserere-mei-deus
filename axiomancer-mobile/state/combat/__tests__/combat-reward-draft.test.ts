/**
 * The post-combat card draft, store side.
 *
 * Two guarantees this pins:
 *   4a — the claimed pick is SAVED at once, not left until some unrelated
 *        `save()` happens to run.
 *   4b — the offer lives in the store, not in `CombatEncounterPanel`'s own
 *        React state, so a remount mid-draft keeps an already-earned reward.
 *
 * Plus the draft's own contract: rolled once (never rerolled under the
 * player), claimed exactly once, cleared for the next encounter.
 */

import { describe, expect, it } from '@jest/globals';
import {
    COMBAT_REWARD_POOL, ENEMY_REGISTRY, STARTING_CARD_IDS, cardLibrary, getCardById, upgradeLimit, type GameState,
    type Equipment,
} from '@mechanics';

import {
    COMBAT_REWARD_OFFER_COUNT,
    claimCombatRewardAction,
    claimCombatUpgradeAction,
    resetCombatRewardAction,
    rollCombatRewardAction,
} from '@/state/combat/store-actions';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

function makeStore(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter() });
}

const playerOf = (store: AppStore): NonNullable<GameState['player']> =>
    (store.getState() as unknown as GameState).player!;

/** A store with a loaded character carrying a deck. */
function storeWithPlayer(): AppStore {
    const store = makeStore();
    const player = playerOf(store);
    store.setState({
        player: { ...player, knownCards: [...COMBAT_REWARD_POOL.slice(0, 6)], combatRewardCards: [] },
    } as never);
    return store;
}

describe('combat reward draft — store actions', () => {
    it('starts with an empty, unclaimed slice', () => {
        const store = makeStore();
        expect(store.getState().combatReward).toEqual({ offers: [], claimed: false, upgrade: null });
    });

    it('rolls three distinct, resolvable offers into the store', () => {
        const store = storeWithPlayer();
        const offers = rollCombatRewardAction(store);
        expect(offers.length).toBe(COMBAT_REWARD_OFFER_COUNT);
        expect(new Set(offers).size).toBe(COMBAT_REWARD_OFFER_COUNT);
        for (const id of offers) {
            expect(getCardById(id)).toBeTruthy();
        }
        expect(store.getState().combatReward.offers).toEqual(offers);
        expect(store.getState().combatReward.claimed).toBe(false);
    });

    // 4b — the offer must OUTLIVE the panel. Re-entering the roll (what a
    // remount does) has to hand back the same three cards, not reroll them.
    it('is idempotent: a second roll returns the SAME offer, never a reroll', () => {
        const store = storeWithPlayer();
        const first = rollCombatRewardAction(store);
        const second = rollCombatRewardAction(store);
        expect(second).toEqual(first);
        expect(store.getState().combatReward.offers).toEqual(first);
    });

    it('never re-opens a draft that was already claimed', () => {
        const store = storeWithPlayer();
        rollCombatRewardAction(store);
        claimCombatRewardAction(store, null);
        expect(rollCombatRewardAction(store)).toEqual([]);
        expect(store.getState().combatReward).toEqual({ offers: [], claimed: true, upgrade: null });
    });

    it('no-ops with no player loaded', () => {
        const store = makeStore();
        store.setState({ player: null } as never);
        expect(rollCombatRewardAction(store)).toEqual([]);
        expect(store.getState().combatReward.offers).toEqual([]);
    });

    // 4a — the claim must PERSIST, not wait on an unrelated save.
    it('claiming a card appends it to combatRewardCards AND persists', () => {
        const adapter = createMemoryAdapter();
        const store = createAppStore({ adapter });
        const player = playerOf(store);
        store.setState({ player: { ...player, knownCards: [...COMBAT_REWARD_POOL.slice(0, 6)], combatRewardCards: [] } } as never);
        const offers = rollCombatRewardAction(store);

        claimCombatRewardAction(store, offers[0]);

        expect(playerOf(store).combatRewardCards).toEqual([offers[0]]);
        expect(store.getState().combatReward).toEqual({ offers: [], claimed: true, upgrade: null });
        // The save actually reached the adapter — a reload sees the card.
        const saved = adapter.load() as GameState | null;
        expect(saved?.player?.combatRewardCards).toEqual([offers[0]]);
    });

    it('a second claim stacks a second copy onto the collection', () => {
        const store = storeWithPlayer();
        const first = rollCombatRewardAction(store);
        claimCombatRewardAction(store, first[0]);
        resetCombatRewardAction(store);
        const second = rollCombatRewardAction(store);
        claimCombatRewardAction(store, second[0]);
        expect(playerOf(store).combatRewardCards).toEqual([first[0], second[0]]);
    });

    // The SKIP path: claimed, nothing added, still persisted.
    it('skipping claims the draft and adds nothing', () => {
        const adapter = createMemoryAdapter();
        const store = createAppStore({ adapter });
        const player = playerOf(store);
        store.setState({ player: { ...player, knownCards: [...COMBAT_REWARD_POOL.slice(0, 6)], combatRewardCards: [] } } as never);
        rollCombatRewardAction(store);

        claimCombatRewardAction(store, null);

        expect(playerOf(store).combatRewardCards).toEqual([]);
        expect(store.getState().combatReward.claimed).toBe(true);
        expect((adapter.load() as GameState | null)?.player?.combatRewardCards).toEqual([]);
    });

    it('reset clears the slate so the next encounter can draft again', () => {
        const store = storeWithPlayer();
        rollCombatRewardAction(store);
        claimCombatRewardAction(store, null);
        resetCombatRewardAction(store);
        expect(store.getState().combatReward).toEqual({ offers: [], claimed: false, upgrade: null });
        expect(rollCombatRewardAction(store).length).toBe(COMBAT_REWARD_OFFER_COUNT);
    });

    // The draft reads the deck the player is ACTUALLY playing — so the earned
    // reward cards feed back into what gets offered next.
    it('the roll reads earned reward cards as part of the deck', () => {
        const store = storeWithPlayer();
        rollCombatRewardAction(store);
        const offers = store.getState().combatReward.offers;
        claimCombatRewardAction(store, offers[0]);
        expect(playerOf(store).combatRewardCards).toContain(offers[0]);
        resetCombatRewardAction(store);
        // The next draft still produces a legal screen with the grown deck.
        const next = rollCombatRewardAction(store);
        expect(new Set(next).size).toBe(COMBAT_REWARD_OFFER_COUNT);
    });
});

// Phase UP1f — after an elite fight the draft is the elite reward: the best
// cards available, or one random upgrade of an owned card.
describe('the elite reward — store actions', () => {
    // The Green Jelly in an elite slot: a normal on its own, staged at the slot's tier.
    const ELITE = { ...ENEMY_REGISTRY['green-jelly'], difficulty: 'elite' as const };
    const RARE = cardLibrary.find((card) => upgradeLimit(card) === 3)!.id;

    function storeWithDeck(knownCards: readonly string[], rewards: readonly string[] = []): { store: AppStore; adapter: ReturnType<typeof createMemoryAdapter> } {
        const adapter = createMemoryAdapter();
        const store = createAppStore({ adapter });
        store.setState({ player: { ...playerOf(store), knownCards: [...knownCards], combatRewardCards: [...rewards] } } as never);
        return { store, adapter };
    }

    it('an elite win offers the rare among its cards and an upgrade of an owned card', () => {
        const { store } = storeWithDeck(STARTING_CARD_IDS);
        // The rare's lane must be worn to be in the pool: a fixture relic
        // naming it (no library relic names a lane yet).
        const laneRelic: Equipment = {
            id: 'fixture-relic-blood-price', name: 'Fixture relic', description: '',
            category: 'equipment', slot: 'relic', statModifiers: [], laneId: 'blood-price',
        };
        store.setState({
            player: { ...playerOf(store), equipment: { weapon: null, armor: null, relics: [laneRelic] } },
        } as never);
        const offers = rollCombatRewardAction(store, ELITE);
        expect(offers).toHaveLength(COMBAT_REWARD_OFFER_COUNT);
        expect(offers).toContain(RARE);
        const { upgrade } = store.getState().combatReward;
        expect(STARTING_CARD_IDS).toContain(upgrade!.fromCardId);
        expect(upgrade!.toCardId).toBe(`${upgrade!.fromCardId}+`);
    });

    it('a normal win carries no upgrade', () => {
        const { store } = storeWithDeck(STARTING_CARD_IDS);
        rollCombatRewardAction(store, ENEMY_REGISTRY['float-eye']);
        expect(store.getState().combatReward.upgrade).toBeNull();
        resetCombatRewardAction(store);
        rollCombatRewardAction(store);
        expect(store.getState().combatReward.upgrade).toBeNull();
    });

    it('the upgrade hides when nothing owned can be upgraded', () => {
        const { store } = storeWithDeck(['grey-strike+', 'grey-ward+'], [`${RARE}+++`]);
        rollCombatRewardAction(store, ELITE);
        expect(store.getState().combatReward.offers).toHaveLength(COMBAT_REWARD_OFFER_COUNT);
        expect(store.getState().combatReward.upgrade).toBeNull();
    });

    it('taking the upgrade swaps one owned copy, claims the draft and saves', () => {
        const { store, adapter } = storeWithDeck(['grey-strike', 'grey-strike'], [RARE]);
        rollCombatRewardAction(store, ELITE);
        expect(store.getState().combatReward.upgrade).toEqual({ fromCardId: RARE, toCardId: `${RARE}+` });

        claimCombatUpgradeAction(store, RARE);

        expect(playerOf(store).combatRewardCards).toEqual([`${RARE}+`]);
        expect(playerOf(store).knownCards).toEqual(['grey-strike', 'grey-strike']);
        expect(store.getState().combatReward).toEqual({ offers: [], claimed: true, upgrade: null });
        expect((adapter.load() as GameState | null)?.player?.combatRewardCards).toEqual([`${RARE}+`]);
    });

    it('an upgrade claim for any other card changes nothing', () => {
        const { store } = storeWithDeck(['grey-strike'], [RARE]);
        rollCombatRewardAction(store, ELITE);
        claimCombatUpgradeAction(store, 'grey-strike');
        expect(playerOf(store).knownCards).toEqual(['grey-strike']);
        expect(store.getState().combatReward.claimed).toBe(false);
    });
});
