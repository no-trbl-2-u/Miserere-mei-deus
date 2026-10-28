/**
 * Loot-cache-choice presenter — maps the engine session (`axiomancer-mechanics`
 * World/LootCacheChoice) onto a render-ready view-model. Pure: no store
 * writes, no rolls, no rule decisions.
 *
 * Both offers are always enabled — unlike `RestChoiceOffer`, nothing
 * here can be unaffordable or capped, so there is no `disabledReason` to
 * shape. The card offer carries the rolled candidate's face (the same
 * `rewardCardVMs` the combat reward draws), so the player sees the card
 * before choosing it. The goods offer carries the rolled goods as the same
 * chips the outcome ledger prints, so neither side of the one-way pick is
 * blind (CRITIQUE pass 108).
 */

import { getCardById } from '@mechanics';
import type { LootCacheChoiceOfferId, LootCacheChoiceSession } from '@mechanics';
import type { AppStoreState } from '@/state/store';
import { rewardCardVMs, type CombatCardVM } from './combat-encounter.engine';
import {
    CACHE_CHOICE_OFFER_DESC,
    CACHE_CHOICE_OFFER_LABEL,
    cacheOutcomeCurrencyChip,
    cacheOutcomeItemChip,
} from './cache.copy';

// ---------------------------------------------------------------------------
// VM shapes
// ---------------------------------------------------------------------------

export interface CacheChoiceOfferVM {
    id: LootCacheChoiceOfferId;
    label: string;
    desc: string;
    /** The rolled card's face, scaled to the player's stats. Set iff `id === 'card'` and the id resolves. */
    card: CombatCardVM | null;
    /** The rolled goods as ledger chips ("+ HEALING POTION", "+10 SHILLINGS"). Empty unless `id === 'item'`. */
    goods: readonly string[];
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
    /** The authored MapEvent one-liner; `null` falls back to the placeholder intro. */
    description: string | null;
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

const OFFER_IDS: readonly LootCacheChoiceOfferId[] = Object.freeze(['card', 'item']);

type PlayerStats = Parameters<typeof rewardCardVMs>[1];

/** The chips the outcome ledger prints for the goods, built before the pick from the same candidates. */
function goodsChips(s: LootCacheChoiceSession): readonly string[] {
    const chips = s.itemCandidates.map(i => cacheOutcomeItemChip(i.name));
    return s.currencyCandidate > 0 ? [...chips, cacheOutcomeCurrencyChip(s.currencyCandidate)] : chips;
}

function offersFor(s: LootCacheChoiceSession, stats: PlayerStats): readonly CacheChoiceOfferVM[] {
    return OFFER_IDS.map(id => ({
        id,
        label: CACHE_CHOICE_OFFER_LABEL[id],
        desc: CACHE_CHOICE_OFFER_DESC[id],
        card: id === 'card' ? (rewardCardVMs([s.cardCandidate], stats)[0] ?? null) : null,
        goods: id === 'item' ? goodsChips(s) : [],
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

/** `stats` are the player's base stats, so the card face's numbers match the combat reward's. */
export function selectCacheVM(
    state: Pick<AppStoreState, 'cache'>,
    stats?: PlayerStats,
): CacheChoiceVM {
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
        offers: offersFor(s, stats),
        outcome,
        description: s.description,
    };
}
