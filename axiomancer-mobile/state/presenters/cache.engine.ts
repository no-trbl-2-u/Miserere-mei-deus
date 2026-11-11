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
 * that side — and nothing about the reward: no card face, no
 * goods chips, no generic "straight into the deck" blurb. The line is the
 * cache node's own data; a cache T has not written yet carries the
 * `[content]` placeholder. The rewards are unchanged and still paid, and the
 * outcome ledger after the pick still names them.
 */

import { CACHE_ACTION_PLACEHOLDER, getCardById } from '@mechanics';
import type { Consumable, Item, LootCacheChoiceOfferId, LootCacheChoiceSession } from '@mechanics';
import { getItemSprite } from '@/components/icons/item-sprites';
import type { AppStoreState } from '@/state/store';
import type { CacheMoment } from '@/assets/images/treasure/cache-pictures';
import { CACHE_CHOICE_OFFER_LABEL, cacheGoodHealLine } from './cache.copy';
import { rewardCardVMs, type CombatCardVM } from './combat-encounter.engine';
import { equipmentEffectLine } from './equipment-effect-line';

// ---------------------------------------------------------------------------
// VM shapes
// ---------------------------------------------------------------------------

export interface CacheChoiceOfferVM {
    id: LootCacheChoiceOfferId;
    label: string;
    /** What you do to earn this side, from the node's data; `[content]` when unwritten. */
    action: string;
}

/** One good taken: its icon key, its name, and one line saying what it does. */
export interface CacheGoodVM {
    itemId: string;
    name: string;
    /** The item id when it has a sprite (`getItemSprite`), else `null` (the glyph chain draws). */
    spriteKey: string | null;
    /** What it does, from the item's own numbers; `null` when it has no effect to word. */
    line: string | null;
}

export interface CacheChoiceOutcomeVM {
    chosen: LootCacheChoiceOfferId;
    label: string;
    /** The picture moment the band wears: `goods` or `card`. */
    moment: CacheMoment;
    /** The one card taken, in the one card face; set iff `chosen === 'card'` and the card exists. */
    card: CombatCardVM | null;
    /** One row per item taken; empty for a card. */
    goods: readonly CacheGoodVM[];
    /** The purse once the take is paid (today's purse plus the goods' shillings). */
    purseAfter: number;
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
    /** The picture moment: `choice` on the offer, else the outcome's. */
    moment: CacheMoment;
    /** The purse the bar shows: today's on the offer, as it will stand once paid on the outcome. */
    purse: number;
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
        // A session persisted without action lines falls back to the placeholder.
        action: s.actions?.[id]?.trim() || CACHE_ACTION_PLACEHOLDER,
    }));
}

const EMPTY_VM: CacheChoiceVM = Object.freeze({
    active: false,
    phase: 'none',
    offers: Object.freeze([]),
    outcome: null,
    moment: 'choice',
    purse: 0,
    description: null,
});

function goodLine(item: Item): string | null {
    if (item.category === 'equipment') return equipmentEffectLine(item.effect) ?? null;
    if (item.category === 'consumable') {
        const c = item as Consumable;
        if ((c.healAmount ?? 0) > 0) return cacheGoodHealLine(c.healAmount!, c.healAmountBelowHalf);
    }
    return item.description || null;
}

function goodVM(item: Item): CacheGoodVM {
    return {
        itemId: item.id,
        name: item.name,
        spriteKey: getItemSprite(item.id) === null ? null : item.id,
        line: goodLine(item),
    };
}

export function selectHasActiveCache(state: Pick<AppStoreState, 'cache'>): boolean {
    return state.cache?.session != null;
}

export function selectCacheVM(state: Pick<AppStoreState, 'cache'> & Partial<Pick<AppStoreState, 'player'>>): CacheChoiceVM {
    const s = state.cache?.session;
    if (!s) return EMPTY_VM;

    const purseNow = state.player?.currency ?? 0;
    const o = s.outcome;
    const purseAfter = purseNow + (o?.chosen === 'item' ? o.currency : 0);
    const outcome: CacheChoiceOutcomeVM | null = o === null ? null : {
        chosen: o.chosen,
        label: CACHE_CHOICE_OFFER_LABEL[o.chosen],
        moment: o.chosen === 'item' ? 'goods' : 'card',
        card: o.rewardCardId === null ? null : (rewardCardVMs([o.rewardCardId], state.player?.baseStats)[0] ?? null),
        goods: o.items.map(goodVM),
        purseAfter,
        cardName: o.rewardCardId === null ? null : (getCardById(o.rewardCardId)?.name ?? o.rewardCardId),
        itemNames: o.items.map(i => i.name),
        currency: o.currency,
    };

    return {
        active: true,
        phase: s.phase,
        offers: offersFor(s),
        outcome,
        moment: outcome ? outcome.moment : 'choice',
        purse: outcome ? outcome.purseAfter : purseNow,
        description: s.description,
    };
}
