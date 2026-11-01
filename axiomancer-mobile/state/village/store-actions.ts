/**
 * Village counters — store action glue.
 *
 * The pure rules live in `axiomancer-mechanics` (`World/Village`): the paid
 * rest, buying one of the card shop's cards, and paying to remove a card.
 * These wrappers read the pending village event (the hub stays pending while
 * its counters are used) and this visit's record (`event.villageVisit`, absent
 * on a fresh arrival), apply the engine's result to the store, persist it, and
 * return the outcome so the screen can word a refusal. A refused counter
 * writes nothing.
 */

import {
    FRESH_VILLAGE_VISIT,
    buyVillageCard,
    removeVillageCard,
    restAtVillage,
    type GameState,
    type VillageVisit,
} from '@mechanics';

import { deckEventPoster, deckEventRunId, deckEventWhere, runDeck, type DeckEventState } from '@/lib/deckEvents';

import type { AppStore } from '../store';

/** What a counter did: `ok` with what it cost, or the reason it was refused. */
export type VillageCounterResult =
    | { ok: true; spent: number }
    | { ok: false; refusal: string };

const NO_VILLAGE: VillageCounterResult = Object.freeze({ ok: false, refusal: 'there is no village here' });

/** The pending village event and this visit's record, or null when no village is pending. */
function villageAt(store: AppStore) {
    const slice = store.getState().event;
    const pending = slice?.pending;
    if (!pending || pending.event.kind !== 'village') return null;
    return { event: pending.event, visit: slice.villageVisit ?? FRESH_VILLAGE_VISIT };
}

/** The engine-owned slice the counters read. */
function host(store: AppStore): Pick<GameState, 'player' | 'flags' | 'dying'> {
    const state = store.getState() as unknown as GameState;
    return { player: state.player, flags: state.flags ?? [], dying: state.dying };
}

/** Writes the visit record beside the still-pending village event. */
function withVisit(store: AppStore, visit: VillageVisit) {
    return { event: { ...store.getState().event, villageVisit: visit } };
}

/** Persists, never stranding the player on a failed write. */
function persist(store: AppStore): void {
    try {
        store.getState().save();
    } catch {
        // Persistence failures must not strand the player at the counter.
    }
}

/**
 * Rests at the village: 25% of max VITAE for the rest price, once per visit.
 * Clears `dying` as a rest node's heal does.
 */
export function restAtVillageAction(store: AppStore): VillageCounterResult {
    const at = villageAt(store);
    if (!at?.event.rest) return NO_VILLAGE;
    const result = restAtVillage(host(store), at.visit);
    if (!result.ok) return { ok: false, refusal: result.refusal };
    store.setState({
        player: result.state.player,
        // An explicit undefined: the store's set() merges.
        dying: result.state.dying,
        ...withVisit(store, result.visit),
    } as never);
    persist(store);
    return { ok: true, spent: result.spent };
}

/** Buys one of the card shop's cards; it joins the deck as a reward card does. */
export function buyVillageCardAction(store: AppStore, cardId: string): VillageCounterResult {
    const at = villageAt(store);
    if (!at?.event.cardShop) return NO_VILLAGE;
    const result = buyVillageCard(host(store), at.visit, at.event.cardShop, cardId);
    if (!result.ok) return { ok: false, refusal: result.refusal };
    store.setState({ player: result.state.player, ...withVisit(store, result.visit) } as never);
    persist(store);
    return { ok: true, spent: result.spent };
}

/** Removes one copy of a card from the deck for the escalating removal price. */
export function removeVillageCardAction(store: AppStore, cardId: string): VillageCounterResult {
    const at = villageAt(store);
    if (!at?.event.cardShop) return NO_VILLAGE;
    const result = removeVillageCard(host(store), at.visit, cardId);
    if (!result.ok) return { ok: false, refusal: result.refusal };
    store.setState({ player: result.state.player, flags: result.state.flags } as never);
    persist(store);
    postRemoveEvent(store, cardId);
    return { ok: true, spent: result.spent };
}

/**
 * The play log (phase BE2e): the card removed at the village, with the deck
 * after the removal.
 */
function postRemoveEvent(store: AppStore, cardId: string): void {
    const state = store.getState() as unknown as DeckEventState;
    void deckEventPoster.post({
        kind: 'remove',
        cardId,
        offered: null,
        deck: runDeck(state),
        where: deckEventWhere(state, 'village'),
        runId: deckEventRunId(state),
    });
}
