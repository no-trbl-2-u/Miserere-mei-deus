/**
 * Item-reward screen presenter.
 *
 * The data half of the screen shown when a relic is granted: the item, the
 * signature skill it grants, the stats it moves, and — when EQUIP would
 * displace something — the exact trade, named before the player commits.
 *
 * ## What this file does NOT do
 *
 * Every fact here is already computed somewhere in the engine, and each is read
 * rather than re-derived:
 *
 *   - **identity, stat block, signature text, flavour** — from
 *     `selectEquipmentDetailViewModel` (`equipment-detail.engine.ts`), which
 *     already resolves `grantsSignature` through the engine's
 *     `SIGNATURE_SKILLS` (name, Conviction cost, exact effect text). The
 *     pending item is not in the inventory yet, so that selector is called
 *     over a one-item projection of it; the formatting rules stay in one place.
 *   - **what EQUIP would push out** — `displacedBy` from
 *     `Items/item-grant.ts`, the same preview the grant path itself uses, so
 *     the screen cannot promise a trade the commit will not make.
 *   - **what is gained and lost** — `computeEquipDelta`
 *     (`Character/equip-delta.ts`), rendered by the existing
 *     `components/inventory/EquipDeltaPanel.tsx`. There is deliberately no
 *     second stat-delta view in this codebase.
 *
 * ## Deliberate omission: no rarity row
 *
 * Rarity belongs to CARDS, derived from `rank`. The signet `Equipment` carries
 * no `rarity` field: every relic is `common` by construction and the aftermath
 * panel hardcodes it. A rarity row here would render a constant, so there is
 * none.
 *
 * Pure: state in, view-model out. No store writes, no rolls, no rule decisions.
 */

import { computeEquipDelta, displacedBy, isEquipment } from '@mechanics';
import type { Equipment, EquipDelta, GameStore, Item } from '@mechanics';

import type { AppStoreState } from '@/state/store';
import { freezeViewModel } from './freeze';
import {
    selectEquipmentDetailViewModel,
    type EquipmentSignatureInfo,
    type EquipmentStatLine,
} from './equipment-detail.engine';

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

/** Default eyebrow when the offering call site named no source. */
export const ITEM_REWARD_EYEBROW = 'SOMETHING CHANGES HANDS';

/** CONFIRM — inventory only. */
export const ITEM_REWARD_CONFIRM_LABEL = 'TO THE SATCHEL';

/** EQUIP — inventory and worn. */
export const ITEM_REWARD_EQUIP_LABEL = 'WEAR IT NOW';

/**
 * The screen is dismissible and every exit commits the
 * item, so the player is told that before they look for a trap.
 */
export const ITEM_REWARD_KEEP_NOTE =
    'It is yours either way. Leaving this page puts it in the satchel.';

/** Shown under EQUIP when the slot has room — nothing is traded away. */
export const ITEM_REWARD_FREE_SLOT_NOTE = 'The slot is empty. Nothing is given up.';

/** The inactive shell's line, shown for the frame it takes the router to unwind. */
export const ITEM_REWARD_INACTIVE_NOTE = 'Nothing is waiting to change hands.';

/** The trade, named. `{item}` is the piece pushed out. */
export function itemRewardTradeNote(displacedName: string): string {
    return `Wearing this takes off ${displacedName}, which returns to the satchel.`;
}

/** Tail counter when a batch is presented one item at a time. */
export function itemRewardRemainingNote(remaining: number): string {
    return remaining === 1 ? 'One more waits behind this.' : `${remaining} more wait behind this.`;
}

// ---------------------------------------------------------------------------
// VM shapes
// ---------------------------------------------------------------------------

/** The worn piece EQUIP would push out, and where it goes. */
export interface ItemRewardTradeVM {
    /** Id of the displaced piece, or `null` when nothing is displaced. */
    id: string | null;
    /** Display name of the displaced piece, or `null`. */
    name: string | null;
    /** The line the screen renders under EQUIP. Never empty. */
    note: string;
}

export interface ItemRewardVM {
    /** False when nothing is pending — the screen shows its inactive shell. */
    active: boolean;
    /** Source line for the eyebrow (the call site's words, or the default). */
    eyebrow: string;
    itemId: string;
    name: string;
    slotLabel: string;
    /** `ItemGlyph` discriminator for the placeholder art. */
    sub: string | null;
    statLines: readonly EquipmentStatLine[];
    signature: EquipmentSignatureInfo | null;
    flavor: string;
    /**
     * EQUIP's before/after, or `null` when the item is not equippable.
     * Feed straight to `<EquipDeltaPanel itemId delta />`.
     */
    delta: EquipDelta | null;
    /** What EQUIP costs, named before the player commits. */
    trade: ItemRewardTradeVM | null;
    /** EQUIP is HIDDEN, not greyed, when this is false. */
    canEquip: boolean;
    confirmLabel: string;
    equipLabel: string;
    keepNote: string;
    /** Entries queued behind this one. */
    remaining: number;
    /** `null` when nothing is queued behind this one. */
    remainingNote: string | null;
}

const EMPTY_VM: ItemRewardVM = Object.freeze({
    active: false,
    eyebrow: ITEM_REWARD_EYEBROW,
    itemId: '',
    name: '',
    slotLabel: '',
    sub: null,
    statLines: Object.freeze([]),
    signature: null,
    flavor: '',
    delta: null,
    trade: null,
    canEquip: false,
    confirmLabel: ITEM_REWARD_CONFIRM_LABEL,
    equipLabel: ITEM_REWARD_EQUIP_LABEL,
    keepNote: ITEM_REWARD_KEEP_NOTE,
    remaining: 0,
    remainingNote: null,
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** True when an item is waiting on the player — the gate's route trigger. */
export function selectHasPendingItemReward(
    state: Pick<AppStoreState, 'itemReward'>,
): boolean {
    return (state.itemReward?.queue?.length ?? 0) > 0;
}

/**
 * `selectEquipmentDetailViewModel` reads `state.player`, and the
 * pending item is deliberately NOT there yet (the grant is what CONFIRM and
 * EQUIP commit). Handing it a one-item projection reuses that presenter
 * verbatim instead of forking a second copy of the stat/signature/slot
 * formatting — the rule about where those strings come from stays in one file.
 */
function detailOf(item: Equipment) {
    const projection = {
        player: { inventory: [item as Item], equipment: { weapon: null, armor: null, relics: [] } },
    } as unknown as GameStore;
    return selectEquipmentDetailViewModel(projection, item.id);
}

function tradeOf(displaced: Equipment | null): ItemRewardTradeVM {
    if (displaced === null) {
        return { id: null, name: null, note: ITEM_REWARD_FREE_SLOT_NOTE };
    }
    return { id: displaced.id, name: displaced.name, note: itemRewardTradeNote(displaced.name) };
}

/**
 * Build the reward screen's view-model from the head of the pending queue.
 *
 * Returns the inactive VM when nothing is pending, or when the pending item is
 * not equipment and therefore has no detail card to draw — the latter cannot
 * happen through the normal grant path, but a caller may force an item onto the queue
 * with `includeInline`, and a blank screen is never the right answer.
 */
export function selectItemRewardVM(
    state: Pick<AppStoreState, 'itemReward' | 'player'>,
): ItemRewardVM {
    const queue = state.itemReward?.queue ?? [];
    const head = queue[0];
    if (!head) return EMPTY_VM;

    const item = head.item;
    const remaining = queue.length - 1;
    const remainingNote = remaining > 0 ? itemRewardRemainingNote(remaining) : null;
    const eyebrow = head.source ?? ITEM_REWARD_EYEBROW;

    /**
     * Not equipment, or an id the detail card cannot describe: still a real
     * hand-over, so name it and offer CONFIRM alone. `canEquip` stays false,
     * which HIDES the EQUIP button rather than greying it.
     */
    const nameOnly = () => freezeViewModel({
        ...EMPTY_VM,
        active: true,
        eyebrow,
        itemId: item.id,
        name: item.name,
        flavor: item.description,
        remaining,
        remainingNote,
    });

    if (!isEquipment(item)) return nameOnly();

    const equipment: Equipment = item;
    const detail = detailOf(equipment);
    if (detail === null) return nameOnly();

    const player = state.player;

    // The same preview the grant path itself uses, so the screen cannot
    // promise a trade the commit will not make.
    const preview = player
        ? displacedBy(
            player,
            equipment,
            head.replaceIndex === undefined ? undefined : { replaceIndex: head.replaceIndex },
        )
        : { item: null as Equipment | null, index: null };

    const delta = player ? computeEquipDelta(equipment, preview.item, player) : null;

    return freezeViewModel({
        active: true,
        eyebrow,
        itemId: detail.itemId,
        name: detail.name,
        slotLabel: detail.slotLabel,
        sub: detail.sub,
        statLines: detail.statLines,
        signature: detail.signature,
        flavor: detail.flavor,
        delta,
        trade: tradeOf(preview.item),
        canEquip: true,
        confirmLabel: ITEM_REWARD_CONFIRM_LABEL,
        equipLabel: ITEM_REWARD_EQUIP_LABEL,
        keepNote: ITEM_REWARD_KEEP_NOTE,
        remaining,
        remainingNote,
    });
}
