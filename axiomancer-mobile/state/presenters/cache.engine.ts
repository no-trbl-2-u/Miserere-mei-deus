/**
 * Loot-cache-choice presenter — maps the engine session (`axiomancer-mechanics`
 * World/LootCacheChoice) onto a render-ready view-model. Pure: no store
 * writes, no rolls, no rule decisions.
 *
 * Both offers are always enabled — unlike `RestChoiceOffer`, nothing
 * here can be unaffordable or capped, so there is no `disabledReason` to
 * shape.
 *
 * Each offer carries its ACTION line — what you do on the adventure to earn
 * that side — and nothing about the reward (spec 154, A7): no card face, no
 * goods chips, no generic "straight into the deck" blurb. The line is the
 * cache node's own data; a cache T has not written yet carries the
 * `[content]` placeholder. The rewards are unchanged and still paid, and the
 * outcome ledger after the pick still names them.
 */

import { CACHE_ACTION_PLACEHOLDER, getCardById } from '@mechanics';
import type { LootCacheChoiceOfferId, LootCacheChoiceSession } from '@mechanics';
import type { AppStoreState } from '@/state/store';
import { CACHE_CHOICE_OFFER_LABEL } from './cache.copy';

// ---------------------------------------------------------------------------
// VM shapes
// ---------------------------------------------------------------------------

export interface CacheChoiceOfferVM {
    id: LootCacheChoiceOfferId;
    label: string;
    /** What you do to earn this side, from the node's data; `[content]` when unwritten. */
    action: string;
}

export interface CacheChoiceOutcomeVM {
    chosen: LootCacheChoiceOfferId;
    label: string;
    /** Set iff `chosen === 'card'`. */
    cardName: string | null;
    /** Non-empty iff `chosen === 'item'`. */
    itemNames: readonly string[];
    /** >0 iff `chosen === 'item'`. */
    currency: number;
}

export interface CacheChoiceVM {
    active: boolean;
    phase: LootCacheChoiceSession['phase'] | 'none';
    offers: readonly CacheChoiceOfferVM[];
    outcome: CacheChoiceOutcomeVM | null;
    /** The authored MapEvent one-liner — the cache's flavour line; `null` when the node authored none. */
    description: string | null;
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

const OFFER_IDS: readonly LootCacheChoiceOfferId[] = Object.freeze(['card', 'item']);

function offersFor(s: LootCacheChoiceSession): readonly CacheChoiceOfferVM[] {
    return OFFER_IDS.map(id => ({
        id,
        label: CACHE_CHOICE_OFFER_LABEL[id],
        // A session persisted before spec 154 carries no lines; the placeholder stands in.
        action: s.actions?.[id]?.trim() || CACHE_ACTION_PLACEHOLDER,
    }));
}

const EMPTY_VM: CacheChoiceVM = Object.freeze({
    active: false,
    phase: 'none',
    offers: Object.freeze([]),
    outcome: null,
    description: null,
});

export function selectHasActiveCache(state: Pick<AppStoreState, 'cache'>): boolean {
    return state.cache?.session != null;
}

export function selectCacheVM(state: Pick<AppStoreState, 'cache'>): CacheChoiceVM {
    const s = state.cache?.session;
    if (!s) return EMPTY_VM;

    const outcome: CacheChoiceOutcomeVM | null = s.outcome === null ? null : {
        chosen: s.outcome.chosen,
        label: CACHE_CHOICE_OFFER_LABEL[s.outcome.chosen],
        cardName: s.outcome.rewardCardId === null ? null : (getCardById(s.outcome.rewardCardId)?.name ?? s.outcome.rewardCardId),
        itemNames: s.outcome.items.map(i => i.name),
        currency: s.outcome.currency,
    };

    return {
        active: true,
        phase: s.phase,
        offers: offersFor(s),
        outcome,
        description: s.description,
    };
}
