/**
 * Screen-level presenter for `app/(tabs)/inventory/index.tsx`.
 *
 * Drives the inventory view-model from `state.player.inventory`.
 * Items are grouped by engine category (Q1=A), stacks render as a single
 * row with a `quantity` (Q3=A), and the screen renders an empty-state
 * placeholder when the player carries nothing (Q4=A).
 *
 * Worn state is `player.equipment`, the loadout combat reads (shared with
 * `selectCharacterViewModel` through `./loadout`); inventory order means
 * nothing, so a carried relic may be unworn.
 */

import {
    isConsumable,
    isEquipment,
    isMaterial,
    isQuestItem,
    type Character,
    type Equipment,
    type GameStore,
    type Item,
} from '@mechanics';

import { freezeViewModel } from './freeze';
import { computeEquipDelta, type EquipDelta } from '@mechanics';
import { getSignatureSkill } from '@mechanics';
import { equipmentEffectLine } from './equipment-effect-line';
import {
    LOADOUT_ROWS,
    isWornId,
    loadoutRowById,
    replacedByEquip,
    rowSlotKind,
    wornAtRow,
    type DockRowId,
} from './loadout';

export type { DockRowId } from './loadout';

export type { EquipDelta } from '@mechanics';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type InventoryCategory = 'equipment' | 'consumable' | 'material' | 'quest';
export type InventoryTab = 'all' | InventoryCategory;

export interface InventoryLocalUi {
    activeTab?: InventoryTab;
    expandedItemId?: string | null;
    /**
     * When set, the dock row (weapon, armor or one relic position) the user has
     * tapped to filter the sack to pieces that fit it. Only that row is picked,
     * and wearing from the sack goes into it. The filter overrides `activeTab`:
     * the screen sets `activeTab='all'` whenever it picks a row, and the
     * presenter additionally guards against a stale tab (the row filter wins).
     * `null` / omitted → no row picked.
     */
    selectedRow?: DockRowId | null;
}

export interface InventoryItemRow {
    /** Stable engine ID. */
    id: string;
    name: string;
    category: InventoryCategory;
    /** Slot label for equipment (`'Weapon'`, `'Armor'`, `'Relic'`), else `null`. */
    sub: string | null;
    /** Stack size — always 1 for non-stackable items. */
    quantity: number;
    /**
     * Always `null`: equipment (the signet relics) carries no rarity, so the
     * rarity-shine affordance renders "no shine".
     */
    rarity?: 'common' | 'uncommon' | 'rare' | 'unique' | null;
    equipped: boolean;
    /**
     * The row's worn badge: `WORN` on a worn piece, `NOT WORN` on a relic
     * carried unworn (its signature is off), `null` otherwise.
     */
    wornLabel: string | null;
    /** The row's quick-action label: `WEAR` for a relic, `EQUIP`, or `USE`. */
    actionLabel: string;
    description: string;
    /** Whether the item can currently be used / equipped. */
    canUse: boolean;
    /** Whether the item can be discarded (`false` for quest items). */
    canDiscard: boolean;
    /**
     * Equip-preview replacement deltas. Surfaced on equipment rows
     * whose card the screen has expanded, so the player sees the
     * net stat change before committing the equip. Filled when:
     *   - the item is equipment, AND
     *   - the item is NOT currently equipped, AND
     *   - the player has another equipment item in the same slot
     *     marked equipped.
     *
     * `null` for non-equipment, equipped equipment, or equipment in
     * an empty slot (where the preview reduces to "no replacement —
     * the item's own stats win unopposed").
     */
    replacePreview: ReplacePreview | null;
    /**
     * The signature this signet relic grants (display name), or
     * `null` when the item is not a relic. Surfaced as a "grants <name>"
     * sub-label on equipment rows and in the worn dock. Optional (sparse):
     * the presenter always sets it, but fixtures may omit it.
     */
    grantsSignature?: string | null;
    /**
     * What a worn weapon or armor does, in one terse line (the shared
     * `equipmentEffectLine`), or `null` when the item has no effect.
     * Optional (sparse): fixtures may omit it.
     */
    effectLine?: string | null;
    /**
     * Rich equip-change delta surface. Where `replacePreview`
     * is a single signed net-stat list for swaps only, this model carries
     * the net stat deltas plus the signet-relic signatures gained and lost
     * — showing **only** what the equip operation changes.
     *
     * Filled for equipment rows:
     *   - non-equipped with a worn sibling → `mode: 'swap'`
     *   - non-equipped into an empty slot  → `mode: 'equip'` (gained only)
     *   - the worn item itself             → `mode: 'unequip'` (lost only)
     *
     * `null` for non-equipment rows. The view hides empty sections and the
     * whole surface when `equipDelta.isEmpty` is true.
     */
    equipDelta: EquipDelta | null;
}

export interface ReplacePreview {
    /** The currently-equipped sibling in this slot. */
    replacing: { id: string; name: string };
    /**
     * Net stat deltas (this item's stats minus the replaced item's
     * stats). Zero-delta entries are omitted. Each entry's `delta`
     * is signed (positive when better, negative when worse).
     */
    deltas: ReadonlyArray<{ stat: string; delta: number }>;
}

export interface InventoryTabRow {
    key: InventoryTab;
    label: string;
    count: number;
}

/**
 * One paper-doll Equipment Dock slot. The dock renders the wearer's full
 * loadout — 5 rows (1 weapon, 1 armor, 3 interchangeable relics) around
 * the player portrait — so worn vs. unworn is unmistakable at a glance.
 *
 * `key` mirrors the engine `Equipment.slot` union ("weapon", "armor",
 * "relic") and drives the sack-filter / slot-tooltip lookup. The three
 * relic rows share `key: 'relic'` (the positions are interchangeable —
 * see `SLOT_CAPACITY`) and disambiguate via `relicIndex`. `label` is the
 * uppercase chrome label for the row. `item` is the worn equipment row at this
 * position (worn set per the `selectCharacterViewModel` convention) or `null`
 * when the position is bare.
 */
export interface EquipmentDockSlot {
    /** The row's own identity (`weapon`, `armor`, `relic-0`..`relic-2`): what a tap picks. */
    id: DockRowId;
    key: Equipment['slot'];
    /**
     * Which of the 3 interchangeable relic positions this row is (0-2).
     * Present only on `relic` rows; absent for weapon/armor. Mirrors
     * `EquipmentSlotRow.relicIndex` on the SELF character presenter, and
     * gives each relic row a stable identity for React keys / testIDs.
     */
    relicIndex?: 0 | 1 | 2;
    label: string;
    /** Worn item at this position, or `null`. */
    item: {
        id: string; name: string; sub: string | null; grantsSignature?: string | null;
        /** The piece's effect line (`equipmentEffectLine`), or `null`. */
        effectLine?: string | null;
    } | null;
}

/**
 * The Equipment Dock view-model. Independent of the active tab —
 * tapping "PHIALS" should still show the player's worn equipment in
 * the dock above the tabs.
 */
export interface EquipmentDockViewModel {
    /** All 5 worn positions in display order: weapon, armor, relic ×3. */
    slots: readonly EquipmentDockSlot[];
    /** Section eyebrow on the dock outer panel (ritual lowercase chrome). */
    headerLabel: string;
    /** One-line hint under the eyebrow ("TAP A SLOT TO SEE WHAT ELSE FITS"). */
    hintLabel: string;
    /** Empty-slot copy (lowercase ritual register, framed with em-dashes per the design). */
    bareLabel: string;
    /**
     * Slot-filter banner copy & state.
     * `selectedRow` mirrors the user pick; `bannerEyebrow` /
     * `bannerSlotLabel` / `bannerClearLabel` are the chrome strings
     * the screen renders when a row is picked. `bannerSlotLabel`
     * resolves to the picked row's `label` (e.g. "RELIC I") so the
     * screen doesn't have to reach back through `slots`. `null` /
     * empty when no row is picked; the screen treats `null` as
     * "do not render the banner".
     */
    selectedRow: DockRowId | null;
    bannerEyebrow: string;
    bannerSlotLabel: string;
    bannerClearLabel: string;
}

export interface InventoryViewModel {
    /** Tabs in display order. */
    tabs: readonly InventoryTabRow[];
    /** Currently active tab (defaults to `'all'`). */
    activeTab: InventoryTab;
    /** Items filtered by the active tab, in display order. */
    items: readonly InventoryItemRow[];
    /** Currency the player carries (engine "shilling"). */
    shilling: number;
    /** Burden / encumbrance numerator. */
    burden: number;
    burdenMax: number;
    /** ID of the item the user has tapped to expand, or `null`. */
    expandedItemId: string | null;
    /** True when the inventory is empty — the screen shows the empty state. */
    isEmpty: boolean;
    /** Empty-state copy. No second-person archaic pronouns. */
    emptyMessage: string;
    /**
     * Display header above the category list (rendered uppercased by
     * the view). Lives on the presenter so the screen has no inline
     * ritual literal (Hard Rule #8).
     */
    sectionHeader: string;
    /**
     * Per-category section labels, in the order categories appear on
     * the screen. Lives on the presenter so the view layer carries no
     * literal copy.
     */
    categoryHeaders: Record<InventoryCategory, string>;
    /**
     * Paper-doll Equipment Dock above the tabs.
     * Computed from the full inventory (independent of active-tab
     * filter) so the dock keeps showing worn slots regardless of
     * which tab the user is on.
     */
    equipmentDock: EquipmentDockViewModel;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAB_ORDER: readonly InventoryTab[] = [
    'all',
    'equipment',
    'consumable',
    'material',
    'quest',
] as const;

/** Display strings for the inventory screen's chrome. */
// PURSE is the canonical money-container word (blacksmith/rest/village).
const SECTION_HEADER = 'SATCHEL · PURSE · BURDEN';
const CATEGORY_HEADERS: Record<InventoryCategory, string> = {
    // Every header echoes its own tab — GEAR → '✠ GEAR & GIRDING', PHIALS →
    // '✠ PHIALS & SOPS', and so on. The equipment header names the goods, not
    // their state: the list includes everything carried unworn, and the per-row
    // WORN badge is the only claim about what is on the body.
    equipment: '✠ GEAR & GIRDING',
    consumable: '✠ PHIALS & SOPS',
    material: '✠ STUFF',
    quest: '✠ SEALED',
};

const TAB_LABELS: Record<InventoryTab, string> = {
    all: 'ALL',
    // Every tab's badge counts the rows that tab shows, and this tab shows all
    // equipment carried. GEAR names the filter (equipment), not a state
    // (equipped) the filter does not apply; the per-row WORN badge marks what
    // is actually on the body.
    equipment: 'GEAR',
    consumable: 'PHIALS',
    material: 'STUFF',
    quest: 'SEALED',
};

const SLOT_LABELS: Record<Equipment['slot'], string> = {
    weapon: 'Weapon',
    armor: 'Armor',
    // One name on every surface: Weapon, Armor, Relic.
    relic: 'Relic',
};

const BURDEN_MAX = 50;
const EMPTY_MESSAGE = 'nothing in the satchel.';


const DOCK_HEADER_LABEL = '✠ WORN UPON THE BODY';
// The dock lists only worn slots; the worn-vs-unworn comparison is behind a
// tap — selecting a slot filters the grid below to the items that fit it
// (`filterRowsBySlot`). The hint teaches that interaction.
const DOCK_HINT_LABEL = 'CHOOSE A SLOT TO SEE WHAT ELSE FITS';
const DOCK_BARE_LABEL = '— bare —';
const DOCK_BANNER_EYEBROW = 'FITTING SLOT';
const DOCK_BANNER_CLEAR_LABEL = 'CLEAR ✕';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function presentationCategory(item: Item): InventoryCategory {
    if (isEquipment(item)) return 'equipment';
    if (isConsumable(item)) return 'consumable';
    if (isQuestItem(item)) return 'quest';
    return 'material';
}

/** The satchel's slot label for an equipment kind (`Weapon`, `Armor`, `Relic`). */
export function slotSubLabel(slot: Equipment['slot']): string {
    return SLOT_LABELS[slot];
}

function subFor(item: Item): string | null {
    if (isEquipment(item)) return SLOT_LABELS[item.slot] ?? null;
    return null;
}

function rarityFor(_item: Item): InventoryItemRow['rarity'] {
    // Equipment (the signet relics) carries no rarity, so no row has a shine.
    return null;
}

/** The display name of the signature a signet relic grants, or `null` for
 *  non-relic items. */
/** The satchel's worn-state copy. */
export const WORN_LABEL = 'WORN';
export const NOT_WORN_LABEL = 'NOT WORN';
/** The verb that puts a relic on (T's word); other equipment keeps EQUIP. */
export const WEAR_LABEL = 'WEAR';

function wornLabelFor(item: Item, equipped: boolean): string | null {
    if (equipped) return WORN_LABEL;
    return isEquipment(item) && item.grantsSignature ? NOT_WORN_LABEL : null;
}

function actionLabelFor(item: Item): string {
    if (!isEquipment(item)) return 'USE';
    return item.grantsSignature ? WEAR_LABEL : 'EQUIP';
}

function grantsSignatureName(item: Item): string | null {
    if (!isEquipment(item) || !item.grantsSignature) return null;
    return getSignatureSkill(item.grantsSignature)?.name ?? null;
}

/** The terse effect line of a weapon or armor, or `null` for anything else. */
function effectLineFor(item: Item): string | null {
    return isEquipment(item) ? equipmentEffectLine(item.effect) : null;
}

function quantityFor(item: Item): number {
    if (isConsumable(item) || isMaterial(item)) {
        // `?? 1` defends against fixtures that omit the engine-required
        // `quantity` field.
        return Math.max(1, Number(item.quantity ?? 1));
    }
    return 1;
}

function canUseFor(item: Item): boolean {
    return isConsumable(item) || isEquipment(item);
}

function canDiscardFor(item: Item): boolean {
    return !isQuestItem(item);
}

/**
 * Aggregate an equipment item's flat statModifiers into a stat → value
 * map (today only the armor relics' `maxHp`).
 */
function aggregateEquipmentStats(equipment: Equipment): Map<string, number> {
    const out = new Map<string, number>();
    for (const mod of equipment.statModifiers ?? []) {
        out.set(mod.stat, (out.get(mod.stat) ?? 0) + mod.value);
    }
    return out;
}

/**
 * Compute the net stat-delta from replacing `oldItem` with `newItem`:
 * start with the new item's aggregated stats, subtract the equipped
 * item's stats, drop zero entries.
 */
function computeReplacePreview(
    newItem: Equipment,
    oldItem: Equipment,
): ReplacePreview {
    const newAgg = aggregateEquipmentStats(newItem);
    const oldAgg = aggregateEquipmentStats(oldItem);
    const allKeys = new Set<string>([...newAgg.keys(), ...oldAgg.keys()]);
    const deltas: Array<{ stat: string; delta: number }> = [];
    for (const stat of allKeys) {
        const delta = (newAgg.get(stat) ?? 0) - (oldAgg.get(stat) ?? 0);
        if (delta !== 0) deltas.push({ stat, delta });
    }
    return { replacing: { id: oldItem.id, name: oldItem.name }, deltas };
}

/**
 * Convert the raw engine inventory into display rows. Per Q3=A, items
 * with the same `id` collapse into a single row whose `quantity`
 * reflects the stack size. An equipment row is `equipped` when
 * `player.equipment` wears it (inventory order means nothing). Also
 * computes `replacePreview` for every non-equipped
 * equipment row whose slot has an equipped sibling.
 */
function buildRows(state: GameStore, pickedRow: DockRowId | null = null): InventoryItemRow[] {
    const inventory = state.player?.inventory ?? [];
    const rowsById = new Map<string, InventoryItemRow>();
    const order: string[] = [];
    // Worn means worn in `player.equipment`, the loadout combat reads.
    const player = state.player;
    const isWorn = (item: Equipment): boolean => isWornId(player.equipment, item.id);
    // The worn sibling a candidate is compared against: itself when already worn
    // (→ unequip delta), null when a position is free (→ equip), or the piece it
    // would displace when the slot is at capacity (→ swap).
    const siblingFor = (item: Equipment): Equipment | null =>
        isWorn(item) ? item : replacedByEquip(player, item, pickedRow);
    // First-seen engine item per ID — used to grab the StatModifier
    // array on non-equipped equipment when we compute the preview.
    const itemById = new Map<string, Equipment>();

    for (const item of inventory) {
        const cat = presentationCategory(item);
        const existing = rowsById.get(item.id);
        if (existing !== undefined) {
            rowsById.set(item.id, {
                ...existing,
                quantity: existing.quantity + quantityFor(item),
            });
            continue;
        }

        let equipped = false;
        if (isEquipment(item)) {
            equipped = isWorn(item);
            itemById.set(item.id, item);
        }

        const row: InventoryItemRow = {
            id: item.id,
            name: item.name,
            category: cat,
            sub: subFor(item),
            quantity: quantityFor(item),
            rarity: rarityFor(item),
            equipped,
            wornLabel: wornLabelFor(item, equipped),
            actionLabel: actionLabelFor(item),
            description: item.description,
            canUse: canUseFor(item),
            canDiscard: canDiscardFor(item),
            grantsSignature: grantsSignatureName(item),
            effectLine: effectLineFor(item),
            replacePreview: null,
            equipDelta: null,
        };
        rowsById.set(item.id, row);
        order.push(item.id);
    }

    // Second pass: replacePreview + equipDelta for equipment rows.
    //
    // `replacePreview` is scoped to non-equipped items with an equipped
    // sibling — net signed stat list only. `equipDelta` is computed for *every* equipment row so the surface
    // can show gained-only (equip into empty slot), lost-only (the worn
    // item), or gained+lost (swap), across stats and granted signatures.
    for (const id of order) {
        const row = rowsById.get(id)!;
        if (row.category !== 'equipment') continue;
        const item = itemById.get(id);
        if (item === undefined) continue;

        const equippedSibling = siblingFor(item);
        const equipDelta = computeEquipDelta(item, equippedSibling, state.player);

        let replacePreview: ReplacePreview | null = null;
        if (
            !row.equipped &&
            equippedSibling !== null &&
            equippedSibling.id !== item.id
        ) {
            replacePreview = computeReplacePreview(item, equippedSibling);
        }

        rowsById.set(id, { ...row, replacePreview, equipDelta });
    }

    return order.map((id) => rowsById.get(id)!);
}

function countByCategory(rows: readonly InventoryItemRow[]): Record<InventoryCategory, number> {
    const counts: Record<InventoryCategory, number> = {
        equipment: 0,
        consumable: 0,
        material: 0,
        quest: 0,
    };
    for (const row of rows) counts[row.category] += row.quantity;
    return counts;
}

function buildTabs(rows: readonly InventoryItemRow[]): InventoryTabRow[] {
    const counts = countByCategory(rows);
    const totalAll = counts.equipment + counts.consumable + counts.material + counts.quest;
    return TAB_ORDER.map((key) => ({
        key,
        label: TAB_LABELS[key],
        count: key === 'all' ? totalAll : counts[key],
    }));
}

function filterRowsByTab(
    rows: readonly InventoryItemRow[],
    tab: InventoryTab,
): readonly InventoryItemRow[] {
    if (tab === 'all') return rows;
    return rows.filter((r) => r.category === tab);
}

function readShilling(state: GameStore): number {
    // The engine canonical currency field is `Character.currency`
    // (engine type def `Character/types.d.ts:41`). "Shilling" is the
    // mobile chrome label for the same value — the VM field name +
    // the SHILLING screen literal carry the voice-register choice.
    const raw = Number(state.player.currency ?? 0);
    return Number.isFinite(raw) && raw >= 0 ? raw : 0;
}

function computeBurden(rows: readonly InventoryItemRow[]): number {
    // Return the uncapped total so the BURDEN bar's text reads
    // honestly ("60 / 50" when over capacity) rather than silently
    // clamping the display to "50 / 50". The bar fill renders
    // clamped at 100% (StatBar handles its own pct clamp) — that's
    // correct because the bar can't visualize "more than full" —
    // but the numeric text on the label row carries the overflow
    // signal.
    return rows.reduce((acc, r) => acc + r.quantity, 0);
}

function buildEquipmentDock(
    player: Character,
    selectedRow: DockRowId | null,
): EquipmentDockViewModel {
    // The dock draws `player.equipment` itself: one row each for the weapon
    // and the armor, then one per relic position in loadout order.
    const toItem = (piece: Equipment | null | undefined): EquipmentDockSlot['item'] =>
        piece == null
            ? null
            : { id: piece.id, name: piece.name, sub: subFor(piece), grantsSignature: grantsSignatureName(piece), effectLine: effectLineFor(piece) };
    const slots: EquipmentDockSlot[] = LOADOUT_ROWS.map((row): EquipmentDockSlot => ({
        id: row.id,
        key: row.key,
        ...(row.relicIndex !== undefined ? { relicIndex: row.relicIndex } : {}),
        label: row.dockLabel,
        item: toItem(wornAtRow(player.equipment, row)),
    }));
    return {
        slots,
        headerLabel: DOCK_HEADER_LABEL,
        hintLabel: DOCK_HINT_LABEL,
        bareLabel: DOCK_BARE_LABEL,
        selectedRow,
        bannerEyebrow: DOCK_BANNER_EYEBROW,
        bannerSlotLabel: selectedRow === null ? '' : loadoutRowById(selectedRow).dockLabel,
        bannerClearLabel: DOCK_BANNER_CLEAR_LABEL,
    };
}

function filterRowsBySlot(
    rows: readonly InventoryItemRow[],
    slot: Equipment['slot'],
): readonly InventoryItemRow[] {
    const targetSub = SLOT_LABELS[slot];
    return rows.filter((r) => r.category === 'equipment' && r.sub === targetSub);
}

// ---------------------------------------------------------------------------
// Public selector
// ---------------------------------------------------------------------------

export function selectInventoryViewModel(
    state: GameStore,
    localUi: InventoryLocalUi = {},
): InventoryViewModel {
    const inventory = state.player?.inventory ?? [];
    const selectedRow = localUi.selectedRow ?? null;
    const rows = buildRows(state, selectedRow);
    const activeTab = localUi.activeTab ?? 'all';
    // Row filter overrides tab filter — the screen sets activeTab='all'
    // when picking a row, but we guard here too so a stale tab pick
    // can't leak through when the consumer is e.g. a hermetic test.
    const items = selectedRow === null
        ? filterRowsByTab(rows, activeTab)
        : filterRowsBySlot(rows, rowSlotKind(selectedRow));

    return freezeViewModel({
        tabs: buildTabs(rows),
        activeTab,
        items,
        shilling: readShilling(state),
        burden: computeBurden(rows),
        burdenMax: BURDEN_MAX,
        expandedItemId: localUi.expandedItemId ?? null,
        isEmpty: rows.length === 0,
        emptyMessage: EMPTY_MESSAGE,
        sectionHeader: SECTION_HEADER,
        categoryHeaders: CATEGORY_HEADERS,
        equipmentDock: buildEquipmentDock(state.player, selectedRow),
    });
}
