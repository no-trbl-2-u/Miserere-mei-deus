/**
 * Relic sources — how a quest's item reward and an elite's relic drop reach
 * the item-reward screen (phase LR1c).
 *
 * The RULES are the engine's: `payCompletedQuests` pays a completed quest's
 * reward on every completion path (its item goes straight into the
 * inventory, so a headless run keeps it), and `rollEliteRelicDrop` rolls the
 * elite's relic. This module only routes what they hand over through the
 * `itemReward` queue: an item that deserves the screen
 * (`qualifiesForItemRewardScreen`) is kept in the satchel, saved, and offered
 * as `carried`, so CONFIRM / EQUIP swaps that row for the grant, nothing is
 * paid twice and an app closed before the answer keeps it.
 */

import {
    getQuestline,
    newlyCompletedQuests,
    qualifiesForItemRewardScreen,
    questRewardItem,
} from '@mechanics';
import type { Equipment, GameState, Item, QuestLog, SpareReward } from '@mechanics';

import type { AppStore } from '../store';
import { eliteDropSource, questRewardSource, spareGearSource } from '../presenters/relic-source.copy';
import { offerItemRewardAction } from './store-actions';

/** True when a carried entry for `id` already covers every satchel row of it. */
function carriedCovers(store: AppStore, id: string, rows: number): boolean {
    const waiting = store.getState().itemReward?.queue ?? [];
    return waiting.filter(entry => entry.carried && entry.item.id === id).length >= rows;
}

function saveQuietly(store: AppStore): void {
    try { store.getState().save(); } catch { /* persistence must not strand the reward screen */ }
}

/**
 * After any step that can complete a quest: every quest completed since
 * `before` whose reward is a screen-worthy item stays in the satchel, saved,
 * and is queued on the item-reward screen as carried, its eyebrow naming the
 * quest: the answer swaps that row for the grant, so a closed app keeps the
 * item once. Currency, experience and plain items stay paid inline. Returns
 * the items queued.
 */
export function offerCompletedQuestItemsAction(store: AppStore, before: QuestLog): readonly Item[] {
    const state = store.getState() as unknown as GameState;
    if (!state.player || !state.quests) return [];
    const queued: Item[] = [];
    const inventory = state.player.inventory;
    const counted = new Map<string, number>();
    const offers: Array<{ item: Item; source: string }> = [];
    for (const quest of newlyCompletedQuests(before, state.quests)) {
        // Every reward the quest paid, in the engine's order: `reward`, then
        // `rewards` (a questline step's XP, extra and relic).
        for (const reward of [quest.reward, ...(quest.rewards ?? [])]) {
            const item = questRewardItem(reward);
            if (!item || !qualifiesForItemRewardScreen(item)) continue;
            const rows = inventory.filter(row => row.id === item.id).length;
            if (rows === 0) continue;
            // A second look at the same completion offers nothing more.
            const seen = (counted.get(item.id) ?? 0) + 1;
            counted.set(item.id, seen);
            if (carriedCovers(store, item.id, Math.min(rows, seen))) continue;
            // A questline step names its questline; any other quest names itself.
            const line = quest.questline ? getQuestline(quest.questline) : undefined;
            offers.push({ item, source: questRewardSource(line?.name ?? quest.name) });
        }
    }
    if (offers.length === 0) return [];
    for (const offer of offers) {
        queued.push(...offerItemRewardAction(store, offer.item, { source: offer.source, includeInline: true, carried: true }).queued);
    }
    saveQuietly(store);
    return queued;
}

/**
 * Puts an elite's drop in the satchel, saves, and queues it as carried: the
 * answer swaps that row for the grant, so an app closed before the answer
 * keeps the item once. A second call for the same piece queues nothing.
 */
function carryAndOffer(store: AppStore, item: Equipment, eliteName: string): void {
    const state = store.getState() as unknown as GameState;
    if (!state.player) return;
    if (carriedCovers(store, item.id, 1)) return;
    if (!state.player.inventory.some(row => row.id === item.id)) {
        store.setState({ player: { ...state.player, inventory: [...state.player.inventory, item] } } as never);
    }
    offerItemRewardAction(store, item, { source: eliteDropSource(eliteName), includeInline: true, carried: true });
    saveQuietly(store);
}

/**
 * Queues the elite's relic (rolled with the elite reward by
 * `rollEliteRelicDrop` and held on the draft) on the item-reward screen once
 * the draft is claimed, its eyebrow naming the elite. Carried and saved.
 */
export function offerEliteRelicAction(store: AppStore, relic: Equipment, eliteName: string): void {
    carryAndOffer(store, relic, eliteName);
}

/**
 * Queues the lane weapon or armor an elite hands over (rolled by
 * `rollEliteEquipmentDrop`) on the item-reward screen, its eyebrow naming the
 * elite that dropped it.
 */
export function offerElitePieceAction(
    store: AppStore,
    piece: Equipment,
    eliteName: string,
): void {
    carryAndOffer(store, piece, eliteName);
}

/**
 * Queues the weapon, armor or relic a Spare paid on the item-reward screen,
 * once the spared end screen is closed. The piece is already in the satchel
 * (`endCombat` paid it and the settle saved it), so the entry is `carried`: the
 * answer swaps that row for the grant, and a closed app keeps the item. A
 * result that is not gear (shillings, a potion, a card) queues nothing, and a
 * second call for the same piece queues nothing. Returns the piece queued.
 */
export function offerSpareGearAction(store: AppStore, reward: SpareReward | undefined, foeName: string): Item | null {
    if (!reward || (reward.kind !== 'gear' && reward.kind !== 'relic')) return null;
    const state = store.getState();
    const item = reward.item;
    if (!(state as unknown as GameState).player?.inventory.some(row => row.id === item.id)) return null;
    const waiting = state.itemReward?.queue ?? [];
    if (waiting.some(entry => entry.carried && entry.item.id === item.id)) return null;
    offerItemRewardAction(store, item, { source: spareGearSource(foeName), includeInline: true, carried: true, logFrom: 'spare' });
    return item;
}
