/**
 * Item-reward screen — store action glue.
 *
 * The RULES live in `axiomancer-mechanics`:
 *   - `grantItem` owns the `unequipItem -> addItem -> equipItem` chain, so
 *     nothing is destroyed and a full relic row swaps instead of no-oping;
 *   - `qualifiesForItemRewardScreen` is the one predicate that decides
 *     ceremony vs. the lightweight inline grant;
 *   - `displacedBy` previews the trade so the screen can name it.
 *
 * This module only threads those through the mobile `itemReward` slice. It
 * makes no rule decisions of its own, and it never re-derives what the engine
 * already answers.
 *
 * ## The commit model, and why dismissal is safe
 *
 * The pending item is NOT in the inventory while the screen is up — the grant
 * is exactly what CONFIRM and EQUIP commit. That would make "back" a way to
 * lose a reward, so `dismissItemRewardAction` DRAINS the whole queue as
 * CONFIRM. Back, swipe, and Android hardware-back all route there (the screen
 * commits on unmount): leaving keeps the item.
 *
 * ## Worn state
 *
 * `grantItem` wears an EQUIP into `Character.equipment`, the one record of
 * what is worn; the satchel and dock read that loadout, so nothing here
 * reorders the inventory. A CONFIRM leaves the item carried and unworn.
 */

import {
    grantItem,
    isEquipment,
    partitionGrantsForReward,
    reslotRelicPiece,
} from '@mechanics';
import type {
    Equipment,
    GameState,
    GrantOutcome,
    Item,
} from '@mechanics';

import { recordItemGained } from '../run-log';
import { EMPTY_ITEM_REWARD_SLICE, type AppStore, type PendingItemReward } from '../store';

// ---------------------------------------------------------------------------
// Offering
// ---------------------------------------------------------------------------

export interface OfferItemRewardOptions {
    /** Where the item came from, shown as the screen's eyebrow. */
    source?: string | null;
    /** Flags stamped onto `GameState.flags` when the entry commits. */
    settleFlags?: readonly string[];
    /** Relic position EQUIP should displace when the row is full. */
    replaceIndex?: number;
    /**
     * Queue items that do NOT pass the reward-screen predicate as well.
     * Default `false`: the predicate partitions them out and the caller keeps its existing inline grant for them.
     */
    includeInline?: boolean;
}

export interface OfferItemRewardResult {
    /** Items now waiting on the reward screen, in the order they will show. */
    queued: readonly Item[];
    /**
     * Items the predicate sent back to the caller's lightweight inline grant. These were
     * NOT granted here — the caller still owns them.
     */
    inline: readonly Item[];
}

function setQueue(store: AppStore, queue: readonly PendingItemReward[]): void {
    store.setState({ itemReward: { queue } });
}

/**
 * A pending entry whose piece was queued on the old slot model (an
 * equipment piece with the pre-v39 slot name) reads as a relic, through the
 * engine's own re-slot helper, the one the save hop uses. Same reference
 * when nothing changes.
 */
function reslotPending(entry: PendingItemReward): PendingItemReward {
    if (!isEquipment(entry.item)) return entry;
    const item = reslotRelicPiece(entry.item);
    return item === entry.item ? entry : { ...entry, item };
}

function currentQueue(store: AppStore): readonly PendingItemReward[] {
    const queue = store.getState().itemReward?.queue ?? EMPTY_ITEM_REWARD_SLICE.queue;
    const read = queue.map(reslotPending);
    return read.every((entry, i) => entry === queue[i]) ? queue : read;
}

/**
 * Offer one item or a batch to the reward screen.
 *
 * Nothing is granted here — the grant is the player's CONFIRM / EQUIP. The
 * returned `inline` list is the caller's to grant inline, the split
 * `qualifiesForItemRewardScreen` decides.
 */
export function offerItemRewardAction(
    store: AppStore,
    items: Item | readonly Item[],
    options: OfferItemRewardOptions = {},
): OfferItemRewardResult {
    const batch = Array.isArray(items) ? (items as readonly Item[]) : [items as Item];
    if (batch.length === 0) return { queued: [], inline: [] };

    const split = partitionGrantsForReward(batch);
    const toQueue = options.includeInline ? batch : split.reward;
    const inline = options.includeInline ? [] : split.inline;
    if (toQueue.length === 0) return { queued: [], inline };

    const entries: PendingItemReward[] = toQueue.map((item) => ({
        item,
        source: options.source ?? null,
        settleFlags: options.settleFlags ?? [],
        ...(options.replaceIndex === undefined ? {} : { replaceIndex: options.replaceIndex }),
    }));

    setQueue(store, [...currentQueue(store), ...entries]);
    return { queued: toQueue, inline };
}

// ---------------------------------------------------------------------------
// Committing
// ---------------------------------------------------------------------------

export type ItemRewardCommitMode = 'confirm' | 'equip';

export interface ItemRewardCommitResult {
    applied: boolean;
    /** The clone that entered the inventory. `null` when nothing was pending. */
    granted: Item | null;
    /** The worn piece EQUIP pushed back to the satchel. Never destroyed. */
    displaced: Equipment | null;
    outcome: GrantOutcome | null;
    /** Entries still waiting behind this one. */
    remaining: number;
}

const NOOP_COMMIT: ItemRewardCommitResult = Object.freeze({
    applied: false,
    granted: null,
    displaced: null,
    outcome: null,
    remaining: 0,
});

function persist(store: AppStore): void {
    try {
        store.getState().save();
    } catch {
        // A persistence failure must never strand the player mid-hand-over.
    }
}

/**
 * Commit the head of the queue through the engine's shared grant path and
 * advance to the next entry.
 *
 * `'confirm'` grants to the inventory only; `'equip'` grants AND wears it,
 * swapping (never destroying) whatever the slot already held.
 */
export function commitItemRewardAction(
    store: AppStore,
    mode: ItemRewardCommitMode,
): ItemRewardCommitResult {
    const queue = currentQueue(store);
    const head = queue[0];
    if (!head) return NOOP_COMMIT;

    const state = store.getState() as unknown as GameState;
    const equip = mode === 'equip' && isEquipment(head.item);

    const result = grantItem(state.player, head.item, {
        equip,
        ...(head.replaceIndex === undefined ? {} : { replaceIndex: head.replaceIndex }),
    });

    const player = result.character;
    const rest = queue.slice(1);

    const patch: Record<string, unknown> = {
        player,
        itemReward: { queue: rest },
    };

    if (head.settleFlags.length > 0) {
        const flags = state.flags ?? [];
        const missing = head.settleFlags.filter((f) => !flags.includes(f));
        if (missing.length > 0) patch.flags = [...flags, ...missing];
    }

    store.setState(patch as never);
    persist(store);

    // The run log: the item that came into the pack, and what handed it over.
    recordItemGained(store, result.granted ?? head.item, head.source ?? 'reward');

    return {
        applied: true,
        granted: result.granted,
        displaced: result.displaced,
        outcome: result.outcome,
        remaining: rest.length,
    };
}

/** CONFIRM — the item goes to the satchel and nothing is worn. */
export function confirmItemRewardAction(store: AppStore): ItemRewardCommitResult {
    return commitItemRewardAction(store, 'confirm');
}

/** EQUIP — the item goes to the satchel AND onto the body (swap, never destroy). */
export function equipItemRewardAction(store: AppStore): ItemRewardCommitResult {
    return commitItemRewardAction(store, 'equip');
}

/**
 * Leaving the screen is CONFIRM, for every entry still queued.
 *
 * Back, swipe, and Android hardware-back land here (the screen commits on
 * unmount), so there is no exit path that loses a reward. Returns the LAST
 * commit's result, with `applied` true when anything was paid.
 */
export function dismissItemRewardAction(store: AppStore): ItemRewardCommitResult {
    let last = NOOP_COMMIT;
    // Bounded by the queue length; each commit pops exactly one entry.
    for (let guard = currentQueue(store).length; guard > 0; guard--) {
        const step = confirmItemRewardAction(store);
        if (!step.applied) break;
        last = step;
    }
    return last;
}

/**
 * The reward-screen predicate and the displacement preview, re-exported so a call site can
 * ask "does this deserve the screen, and what would it cost" from the one
 * module it already imports. Both are the engine's — nothing is re-derived.
 */
export { qualifiesForItemRewardScreen, partitionGrantsForReward, displacedBy } from '@mechanics';
