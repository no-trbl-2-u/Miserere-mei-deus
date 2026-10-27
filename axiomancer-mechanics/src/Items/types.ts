/**
 * Item System Types
 * Discriminated union of all item types with type guards.
 *
 * Equipment is the lean signet-relic shape: persistent `statModifiers` plus
 * an optional `grantsSignature`. See `docs/equipment.md`.
 *
 * Consumables reference real effects from the effects library —
 * either by ID, by inline `Effect`, and/or with an immediate `healAmount` —
 * with optional `intensityOverride` / `durationOverride` per-instance tuning.
 */

import { Effect, StatModifier } from '../Effects/types';
import { Stance } from '../Combat/types';
import type { SignatureSkillId } from '../Combat/combat.encounter.types';

/** Item categories */
export type ItemCategory = 'equipment' | 'consumable' | 'material' | 'quest-item';

/**
 * Base properties shared by all items
 * @property id - Unique identifier for this item
 * @property name - Display name of the item
 * @property description - Flavor text or lore description
 * @property category - Discriminator for the item union type
 */
export interface BaseItem {
    id: string;
    name: string;
    description: string;
    category: ItemCategory;
}

/**
 * Equipment slot kinds. A character wears at most 5 pieces: 1 weapon,
 * 1 armor, 3 accessories (see `SLOT_CAPACITY`). The save migration maps old
 * `head`/`hands`/`feet` slots into `accessory` as `AccessoryKind`s and `body`
 * into `armor` (torso wear is armor, not an accessory); see `LEGACY_SLOT_MAP`.
 */
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';

/**
 * The kind of an `accessory`-slot piece. Explicit and deliberately
 * extensible — adding a kind later is additive (no slot change). Set on an
 * `Equipment` iff `slot === 'accessory'`; absent on weapons and armor.
 */
export type AccessoryKind = 'head' | 'hands' | 'feet' | 'amulet' | 'ring' | 'charm';

/**
 * Worn capacity per slot kind. The wear-cap of 5 is not a bolt-on
 * counter — it *is* the slot model: 1 weapon + 1 armor + 3 accessories.
 */
export const SLOT_CAPACITY: Record<EquipmentSlot, number> = {
    weapon: 1,
    armor: 1,
    accessory: 3,
};

/**
 * Equipment instance.
 *
 * Equipment is the fixed signet relics only, each carrying static `statModifiers` and
 * one `grantsSignature`. Nothing else drives combat.
 *
 * @property category       - Always `'equipment'`.
 * @property slot           - The equipment slot this item occupies.
 * @property accessoryKind  - Set iff `slot === 'accessory'`; the worn
 *                            flavour (head / hands / feet / amulet / ring / charm).
 * @property statModifiers  - Persistent stat lines; only `maxHp`, folded onto
 *                            `maxHealth` at equip-time.
 * @property grantsSignature - The one signature skill this signet relic grants
 *                            while worn. Combat-init derives
 *                            `CombatEncounterState.signatures` from the worn
 *                            loadout's `grantsSignature` values. Absent on
 *                            non-relic equipment.
 * @property laneId         - The card lane (`CardLane.id`) this relic opens
 *                            while worn: its cards join the card-reward pool
 *                            and fill the reward's lane slots. Optional;
 *                            resolved by `relicLaneId` (`Items/relic-lanes.ts`),
 *                            which prefers the relic library's entry.
 */
export interface Equipment extends BaseItem {
    category: 'equipment';
    slot: EquipmentSlot;
    accessoryKind?: AccessoryKind;
    statModifiers?: StatModifier[];
    grantsSignature?: SignatureSkillId;
    laneId?: string;
}

/**
 * Consumable item that can be used once (quantity decrements).
 *
 * A consumable may carry any combination of:
 *   - `effectId`     — reference into the global effects library.
 *   - `inlineEffect` — bespoke one-off `Effect` definition not in the library.
 *   - `healAmount`   — immediate flat HP heal (no effect entry).
 * At least one of these must be present.
 *
 * `intensityOverride` / `durationOverride` retune the referenced or inline
 * effect on a per-instance basis.
 *
 * ## The desperation band (`healAmountBelowHalf`)
 *
 * A flat `healAmount` gives a player no reason to ever DRINK the potion: the
 * flask is worth the same 20 HP at full health as at death's door, so the
 * dominant strategy is to hoard it forever and the item never enters play.
 * `healAmountBelowHalf` is the anti-hoarding lever: a SECOND, larger heal that
 * fires only while the drinker is under
 * {@link DESPERATION_HP_FRACTION} of their `maxHealth`.
 *
 * Prior art: Dawncaster's Healing Potion — "Gain 10 HEALTH. If you are below
 * 50% health, gain 15 HEALTH instead" (`kb:dawncaster/0796-healing-potion`).
 * The corpus bakes the conditional into the ITEM rather than leaving it to
 * player judgment, which is what converts a hoarded resource into a used one.
 *
 * The field is OPTIONAL and purely additive: a consumable that omits it behaves
 * as a flat `healAmount` at every HP level.
 *
 * @property category         - Always `'consumable'`.
 * @property quantity         - Number of this item in the stack.
 * @property effectId         - Optional effect-library lookup key applied on use.
 * @property inlineEffect     - Optional bespoke `Effect` applied on use.
 * @property healAmount       - Optional immediate flat HP heal applied on use.
 * @property healAmountBelowHalf - Optional LARGER heal that replaces `healAmount`
 *   while the drinker is below {@link DESPERATION_HP_FRACTION} of `maxHealth`.
 *   Requires `healAmount` to be set (it is a conditional upgrade of that heal,
 *   never a standalone payload); ignored when `healAmount` is absent.
 * @property intensityOverride - Optional intensity override for the applied effect.
 * @property durationOverride  - Optional duration override for the applied effect.
 */
export interface Consumable extends BaseItem {
    category: 'consumable';
    quantity: number;
    effectId?: string;
    inlineEffect?: Effect;
    healAmount?: number;
    /** The desperation-band heal. See the interface docblock. */
    healAmountBelowHalf?: number;
    intensityOverride?: number;
    durationOverride?: number;
    /** Content-provenance metadata: `addedIn` is an ISO date / phase tag;
     *  `tags` are freeform labels. Both optional, ignored by the engine. */
    addedIn?: string;
    tags?: string[];
}

/**
 * Material item used for crafting
 * @property category - Always 'material'
 * @property quantity - Number of this material in the stack
 */
export interface Material extends BaseItem {
    category: 'material';
    quantity: number;
}

/**
 * Quest item that is used in quests
 * @property category - Always 'quest-item'
 * @property questId - The quest this item is associated with
 */
export interface QuestItem extends BaseItem {
    category: 'quest-item';
    questId: string;
}

/** Discriminated union of all item types */
export type Item = Equipment | Consumable | Material | QuestItem;

/** Re-export `Stance` so downstream consumers of `EquipmentSlot` don't need
 *  a separate import path. */
export type { Stance };

// ============================================================================
// ITEM TYPE GUARDS
// ============================================================================

/** Type guard to check if an item is Equipment */
export function isEquipment(item: Item): item is Equipment {
    return item.category === 'equipment';
}

/** Type guard to check if an item is Consumable */
export function isConsumable(item: Item): item is Consumable {
    return item.category === 'consumable';
}

/** Type guard to check if an item is Material */
export function isMaterial(item: Item): item is Material {
    return item.category === 'material';
}

/** Type guard to check if an item is a Quest Item */
export function isQuestItem(item: Item): item is QuestItem {
    return item.category === 'quest-item';
}
