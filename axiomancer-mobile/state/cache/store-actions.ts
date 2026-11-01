/**
 * Loot-cache-choice encounter ("The Reliquary") — store action glue.
 *
 * The pure engine lives in `axiomancer-mechanics` (World/LootCacheChoice);
 * these wrappers thread the cache node's one irreversible choice — `card`
 * (a rolled reward card) / `item` (a tier-scaled consumable haul + the
 * node's currency) — through the
 * mobile `cache` slice. The engine
 * never reads `GameState`; both candidates (the card to offer, the items to
 * offer) are rolled here, before the session opens, exactly mirroring how
 * `state/rest/store-actions.ts` rolls `deckCardIds` before creating a
 * `RestChoiceSession`.
 */

import type { Character, GameState, Item } from '@mechanics';

import {
    addRewardCard,
    cacheCardRng,
    chooseLootCacheChoiceOffer as engineChooseOffer,
    claimLootCacheChoiceOutcome as engineClaim,
    createLootCacheChoiceSession,
    rollCacheReward,
    rollCombatCardRewards,
} from '@mechanics';
import type { CacheLootTier, LootCacheChoiceOfferId, LootCacheChoiceOutcome, LootCacheChoiceSession } from '@mechanics';
import { deckEventPoster, deckEventRunId, deckEventWhere, runDeck, type DeckEventState } from '@/lib/deckEvents';

import { resolveMinigameSeed } from '../minigame-seeds';
import { recordItemGained, recordNodeResolved } from '../run-log';
import { EMPTY_CACHE_SLICE, type AppStore } from '../store';

/**
 * Flag prefix banking a keeper's keepsake. Nothing in the game mints these;
 * saves may still carry them, and `/memoir`'s REMAINS section reads them back.
 */
export const CACHE_KEEPSAKE_FLAG_PREFIX = 'cache-keepsake:';

/**
 * Dev/test seed override (`globalThis.__AXM_CACHE_SEED__`), mirroring
 * the hazard/rest/blacksmith hooks. Seeds both offers: the `item` offer's
 * `rollCacheReward` roll and the `card` offer's draw (`cacheCardRng`, a
 * separate stream of the same seed), so one seed reproduces the whole cache.
 */
declare global {
    // eslint-disable-next-line no-var
    var __AXM_CACHE_SEED__: number | undefined;
}

function setSession(store: AppStore, session: LootCacheChoiceSession | null): void {
    store.setState({ cache: { session } });
}

export interface BeginLootCacheChoiceOptions {
    /** The authored node's currency (offered whole by the `item` branch). */
    currency?: number;
    /** The authored MapEvent one-liner. */
    description?: string | null;
    /** Reward depth for the `item` offer's roll — caller derives from the current map. */
    tier?: CacheLootTier;
    seed?: number;
}

/** Start a loot-cache-choice node. One cache at a time. */
export function beginLootCacheChoiceAction(store: AppStore, options: BeginLootCacheChoiceOptions = {}): boolean {
    const state = store.getState();
    if (state.cache?.session) return false;
    const seed = resolveMinigameSeed('cache', options.seed, globalThis.__AXM_CACHE_SEED__);

    const player = (state as unknown as GameState).player;
    const tier = options.tier ?? 'modest';
    const itemCandidates = rollCacheReward({ playerLevel: player?.level ?? 1, seed, tier });
    const cardCandidate = rollCombatCardRewards(player as Character, cacheCardRng(seed), 1)[0];

    setSession(store, createLootCacheChoiceSession(seed, {
        cardCandidate,
        itemCandidates,
        currencyCandidate: options.currency ?? 0,
        description: options.description,
    }));
    return true;
}

/** offer -> outcome. Commits ONE offer — the other vanishes. */
export function chooseLootCacheChoiceOfferAction(store: AppStore, offer: LootCacheChoiceOfferId): void {
    const s = store.getState().cache?.session;
    if (!s) return;
    setSession(store, engineChooseOffer(s, offer));
}

export interface ClaimLootCacheChoiceResult {
    applied: boolean;
    outcome: LootCacheChoiceOutcome | null;
}

const NOOP_CLAIM: ClaimLootCacheChoiceResult = Object.freeze({
    applied: false,
    outcome: null,
});

/**
 * Confirms the outcome ledger and applies the cache node to the engine
 * `GameState`: `card` appends the rolled card to the deck, `item` appends
 * the rolled items + currency to the inventory. Clears the slice and persists.
 */
export function claimLootCacheChoiceOutcomeAction(store: AppStore): ClaimLootCacheChoiceResult {
    const s = store.getState().cache?.session;
    if (!s || s.phase !== 'outcome' || !s.outcome) return NOOP_CLAIM;
    const done = engineClaim(s);
    if (done.phase !== 'done') return NOOP_CLAIM;

    const outcome = s.outcome;
    const state = store.getState() as unknown as GameState;
    let player: Character = state.player;

    if (outcome.chosen === 'card' && outcome.rewardCardId) {
        player = addRewardCard(player, outcome.rewardCardId);
    } else if (outcome.chosen === 'item') {
        player = {
            ...player,
            inventory: [...player.inventory, ...(outcome.items as Item[])],
            currency: player.currency + outcome.currency,
        };
    }

    store.setState({
        player,
        cache: EMPTY_CACHE_SLICE,
    } as never);

    try {
        store.getState().save();
    } catch {
        // Persistence failures must not strand the player on the ledger.
    }

    postCacheRewardEvent(store, s.cardCandidate, outcome.chosen === 'card' ? outcome.rewardCardId : null);
    // The run log: the offer taken, and each item of the haul.
    recordNodeResolved(store, outcome.chosen);
    if (outcome.chosen === 'item') for (const item of outcome.items as Item[]) recordItemGained(store, item, 'cache');
    return { applied: true, outcome };
}

/**
 * The play log (phase BE2e): the cache's one card, taken or passed over for
 * the item haul (a skip), with the deck after the claim. A cache that rolled
 * no card posts nothing.
 */
function postCacheRewardEvent(store: AppStore, cardCandidate: string | undefined, cardId: string | null): void {
    if (typeof cardCandidate !== 'string' || cardCandidate.length === 0) return;
    const state = store.getState() as unknown as DeckEventState;
    void deckEventPoster.post({
        kind: 'cache-reward',
        cardId: cardId === cardCandidate ? cardId : null,
        offered: [cardCandidate],
        deck: runDeck(state),
        where: deckEventWhere(state, 'cache'),
        runId: deckEventRunId(state),
    });
}
