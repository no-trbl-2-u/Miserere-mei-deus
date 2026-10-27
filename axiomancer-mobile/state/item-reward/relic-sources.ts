/**
 * Relic sources — how a quest's item reward and an elite's relic drop reach
 * the item-reward screen (phase LR1c).
 *
 * The RULES are the engine's: `payCompletedQuests` pays a completed quest's
 * reward on every completion path (its item goes straight into the
 * inventory, so a headless run keeps it), and `rollEliteRelicDrop` rolls the
 * elite's relic. This module only routes what they hand over through the
 * `itemReward` queue, the way the loot cache re-routes its haul: an item the
 * engine just granted that deserves the screen (`qualifiesForItemRewardScreen`)
 * is taken back out of the satchel and offered, so CONFIRM / EQUIP is the one
 * grant and nothing is paid twice.
 */

import {
    newlyCompletedQuests,
    qualifiesForItemRewardScreen,
    questRewardItem,
} from '@mechanics';
import type { Equipment, GameState, Item, QuestLog } from '@mechanics';

import type { AppStore } from '../store';
import { eliteDropSource, questRewardSource } from '../presenters/relic-source.copy';
import { offerItemRewardAction } from './store-actions';

/** Drops the LAST inventory row with `id` (the clone a grant just appended). */
function withoutLastRow(inventory: readonly Item[], id: string): Item[] {
    const index = inventory.map(item => item.id).lastIndexOf(id);
    if (index === -1) return [...inventory];
    return [...inventory.slice(0, index), ...inventory.slice(index + 1)];
}

/**
 * After any step that can complete a quest: every quest completed since
 * `before` whose reward is a screen-worthy item is taken back out of the
 * satchel and queued on the item-reward screen, its eyebrow naming the quest.
 * Currency, experience and plain items stay paid inline. Returns the items
 * queued.
 */
export function offerCompletedQuestItemsAction(store: AppStore, before: QuestLog): readonly Item[] {
    const state = store.getState() as unknown as GameState;
    if (!state.player || !state.quests) return [];
    const queued: Item[] = [];
    let inventory = state.player.inventory;
    const offers: Array<{ item: Item; source: string }> = [];
    for (const quest of newlyCompletedQuests(before, state.quests)) {
        const item = questRewardItem(quest.reward);
        if (!item || !qualifiesForItemRewardScreen(item)) continue;
        if (!inventory.some(row => row.id === item.id)) continue;
        inventory = withoutLastRow(inventory, item.id);
        offers.push({ item, source: questRewardSource(quest.name) });
    }
    if (offers.length === 0) return [];
    store.setState({ player: { ...state.player, inventory } } as never);
    for (const offer of offers) {
        queued.push(...offerItemRewardAction(store, offer.item, { source: offer.source, includeInline: true }).queued);
    }
    return queued;
}

/**
 * Queues the elite's relic (rolled with the elite reward by
 * `rollEliteRelicDrop` and held on the draft) on the item-reward screen once
 * the draft is claimed, its eyebrow naming the elite.
 */
export function offerEliteRelicAction(store: AppStore, relic: Equipment, eliteName: string): void {
    offerItemRewardAction(store, relic, { source: eliteDropSource(eliteName), includeInline: true });
}
