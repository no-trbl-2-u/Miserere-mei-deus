/**
 * Combat (hazard-pattern encounter) store-actions — mobile UI layer.
 *
 * The encounter engine (`CombatEncounterState`) is pure and the
 * `/combat-encounter` screen holds it in local React state, so unlike the
 * gathering/hazard slices there is no mobile combat session slice here. This
 * module carries the post-combat card draft. Mobile invents no cards, costs,
 * or tuning.
 */

import {
    addRewardCard,
    isEliteEnemy,
    replaceCard,
    rollCombatCardRewards,
    rollEliteReward,
    rollEliteRelicDrop,
    type Enemy,
    type Equipment,
    type GameState,
} from '@mechanics';

import { deckEventPoster, deckEventWhere, runDeck, type DeckEventState } from '@/lib/deckEvents';

import { EMPTY_COMBAT_REWARD_SLICE, type AppStore } from '../store';
import { offerEliteRelicAction } from '../item-reward/relic-sources';

// ---------------------------------------------------------------------------
// Post-combat card reward — the 1-of-3 draft.
//
// The ROLL is engine truth (`rollCombatCardRewards` fills the lane slots from
// the lane the player wears most, then draws from `rewardPoolFor`: the worn
// relics' lanes, grey when none is worn; after an elite, `rollEliteReward`
// offers the best cards or a random upgrade). Mobile owns exactly two things: WHEN the draft
// opens, and persisting the claim.
// ---------------------------------------------------------------------------

/** Offers shown per reward screen. */
export const COMBAT_REWARD_OFFER_COUNT = 3;

/**
 * Rolls the post-combat draft into the store, once. After an elite fight
 * (`isEliteEnemy`) the draft is the elite reward: the best cards available
 * and, when an owned card can take one, a random upgrade as the other option.
 * No-ops when a draft is already open, when the reward was already claimed
 * this encounter, or when no player is loaded — so a re-render (or a panel
 * remount mid-draft) re-reads the SAME offer instead of rerolling it.
 * After an elite it also rolls the elite's relic (`rollEliteRelicDrop`, from
 * `relics`, the relic library by default), held on the draft and queued on
 * the item-reward screen once the draft is claimed.
 */
export function rollCombatRewardAction(
    store: AppStore,
    enemy?: Pick<Enemy, 'difficulty'> & Partial<Pick<Enemy, 'name'>>,
    relics?: readonly Equipment[],
): readonly string[] {
    const state = store.getState();
    const slice = state.combatReward ?? EMPTY_COMBAT_REWARD_SLICE;
    if (slice.claimed || slice.offers.length > 0) return slice.offers;
    const player = (state as unknown as GameState).player;
    if (!player) return EMPTY_COMBAT_REWARD_SLICE.offers;
    if (enemy && isEliteEnemy(enemy)) {
        const elite = rollEliteReward(player, Math.random, COMBAT_REWARD_OFFER_COUNT);
        // The elite's relic is its own roll, after the reward and never
        // replacing it; held on the draft and queued once the draft is claimed.
        const relic = relics ? rollEliteRelicDrop(player, Math.random, relics) : rollEliteRelicDrop(player, Math.random);
        const relicDrop = relic ? { item: relic, eliteName: enemy.name ?? '' } : null;
        store.setState({ combatReward: { offers: elite.cards, claimed: false, upgrade: elite.upgrade, relicDrop } } as never);
        return elite.cards;
    }
    const offers = rollCombatCardRewards(player, Math.random, COMBAT_REWARD_OFFER_COUNT);
    store.setState({ combatReward: { offers, claimed: false, upgrade: null } } as never);
    return offers;
}

/**
 * Resolves the draft: `cardId` appends that card to the player's persistent
 * `combatRewardCards`; `null` is the SKIP (a lean deck is a legitimate play —
 * the draft is claimed, nothing is added). Either way the claim is PERSISTED
 * immediately: before this, a pick lived
 * only in memory until some unrelated `save()` happened to run, so closing the
 * app after taking a card silently lost it.
 */
export function claimCombatRewardAction(store: AppStore, cardId: string | null): void {
    const offered = [...(store.getState().combatReward?.offers ?? [])];
    const player = (store.getState() as unknown as GameState).player;
    const patch: Record<string, unknown> = { combatReward: { offers: [], claimed: true, upgrade: null } };
    if (cardId && player) patch.player = addRewardCard(player, cardId);
    const relicDrop = store.getState().combatReward?.relicDrop ?? null;
    store.setState(patch as never);
    try { store.getState().save(); } catch { /* persistence must not strand the reward screen */ }
    if (relicDrop) offerEliteRelicAction(store, relicDrop.item, relicDrop.eliteName);
    postRewardEvent(store, offered, cardId);
}

/**
 * The play log (phase BE2e): the draft just claimed, with the cards it showed
 * and the deck after it. A claim with no open draft behind it posts nothing.
 */
function postRewardEvent(store: AppStore, offered: string[], cardId: string | null): void {
    if (offered.length === 0) return;
    const state = store.getState() as unknown as DeckEventState;
    void deckEventPoster.post({
        kind: 'reward',
        cardId: cardId && offered.includes(cardId) ? cardId : null,
        offered,
        deck: runDeck(state),
        where: deckEventWhere(state, 'combat-reward'),
    });
}

/**
 * Takes the elite reward's upgrade instead of a card: one owned copy of the
 * drawn card becomes its upgrade (`replaceCard`), the draft is claimed and the
 * save written. `cardId` must be the draft's own drawn card; anything else
 * (no upgrade on offer, a stale id) changes nothing.
 */
export function claimCombatUpgradeAction(store: AppStore, cardId: string): void {
    const state = store.getState();
    const upgrade = state.combatReward?.upgrade ?? null;
    const player = (state as unknown as GameState).player;
    if (!upgrade || !player || upgrade.fromCardId !== cardId) return;
    const relicDrop = state.combatReward?.relicDrop ?? null;
    store.setState({
        player: replaceCard(player, upgrade.fromCardId, upgrade.toCardId),
        combatReward: { offers: [], claimed: true, upgrade: null },
    } as never);
    try { store.getState().save(); } catch { /* persistence must not strand the reward screen */ }
    if (relicDrop) offerEliteRelicAction(store, relicDrop.item, relicDrop.eliteName);
}

/** Clears the draft for the next encounter (called when combat is left). */
export function resetCombatRewardAction(store: AppStore): void {
    store.setState({ combatReward: EMPTY_COMBAT_REWARD_SLICE } as never);
}
