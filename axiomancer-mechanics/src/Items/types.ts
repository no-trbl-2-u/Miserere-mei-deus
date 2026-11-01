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
 * 1 armor, 3 relics (see `SLOT_CAPACITY`). A relic may be named anything (a
 * ring, a brooch, a circlet); every relic fits any of the three relic
 * positions, and its flavour is its name and description alone. The save
 * migration maps old `head`/`hands`/`feet` slots into `relic` and `body` into
 * `armor`; see `LEGACY_SLOT_MAP` and `reslotRelicPiece`.
 */
export type EquipmentSlot = 'weapon' | 'armor' | 'relic';

/**
 * Worn capacity per slot kind. The wear-cap of 5 is not a bolt-on
 * counter — it *is* the slot model: 1 weapon + 1 armor + 3 relics.
 */
export const SLOT_CAPACITY: Record<EquipmentSlot, number> = {
    weapon: 1,
    armor: 1,
    relic: 3,
};

/**
 * Equipment instance.
 *
 * Equipment is the fixed signet relics only, each carrying static `statModifiers` and
 * one `grantsSignature`. Nothing else drives combat.
 *
 * @property category       - Always `'equipment'`.
 * @property slot           - The equipment slot this item occupies; a piece
 *                            has exactly one slot kind.
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
 * @property relicSource    - How a player earns this relic: `'quest'` (a
 *                            quest's reward) or `'elite'` (the elite drop's pool,
 *                            `rollEliteRelicDrop`). A quest may pay
 *                            either. Optional; read from the
 *                            relic library's entry by id, like `laneId`.
 * @property effect         - The piece's one fight effect (a weapon's or an
 *                            armor's; spec 136, A10): a trigger and a payoff,
 *                            or a condition and a DEAL bonus. Read from the
 *                            worn loadout at `initializeCombatEncounter` and
 *                            run by `Combat/combat.equipment-effects.ts`, so it
 *                            applies in every fight and only while worn.
 *                            Optional; a piece without one does nothing in a
 *                            fight.
 */
export interface Equipment extends BaseItem {
    category: 'equipment';
    slot: EquipmentSlot;
    statModifiers?: StatModifier[];
    grantsSignature?: SignatureSkillId;
    laneId?: string;
    relicSource?: RelicSource;
    effect?: EquipmentEffect;
}

/**
 * When a worn piece's trigger effect fires (spec 136, A10). "A card's DEAL" is
 * a DEAL a card line makes (RADIANCE and the MERCY burst included), never a
 * Global's, TETHER's, THORNS' or REFLECT's.
 *
 *   'card-deal'        each card's DEAL
 *   'first-card-deal'  the first card DEAL each turn
 *   'first-guard'      the first GUARD a card line gives you each turn
 *   'sacrifice'        each SACRIFICE (a WAIVED one too: it still counts)
 *   'inferno'          each time you lay INFERNO
 *   'discard-pay'      each time you pay by discarding (a random discard or the hand)
 *   'heal'             each HEAL that restores VITAE (a card's, a Global's,
 *                      the delayed heal, a signature's); never the gear's own
 */
export type EquipmentTrigger =
    | 'card-deal' | 'first-card-deal' | 'first-guard' | 'sacrifice' | 'inferno' | 'discard-pay' | 'heal';

/**
 * A condition that adds to each card's DEAL while it holds (read as the DEAL
 * resolves): the foe has any weather (INFERNO, BLIZZARD or STORM on it), your
 * GUARD holds (above 0), the foe is above half its max VITAE.
 */
export type EquipmentCondition = 'foe-has-weather' | 'guard-holds' | 'foe-above-half';

/**
 * What a trigger pays, unscaled: HEAL n (capped at max VITAE), GUARD n, n
 * Conviction (capped at the Conviction cap), +n to the DEAL, draw n. A
 * `'deal-bonus'` on a DEAL trigger adds to that DEAL; on any other trigger it
 * adds to your next card DEAL this turn. The gear's own HEAL, GUARD, draw and
 * Conviction never fire a gear trigger.
 */
export type EquipmentPayoffKind = 'heal' | 'guard' | 'conviction' | 'deal-bonus' | 'draw';

export interface EquipmentPayoff {
    kind: EquipmentPayoffKind;
    amount: number;
}

/** A trigger effect: when `trigger` happens, `payoff` pays. */
export interface EquipmentTriggerEffect {
    trigger: EquipmentTrigger;
    payoff: EquipmentPayoff;
    condition?: never;
    bonus?: never;
}

/** A condition effect: each card's DEAL deals `bonus` more (unscaled, before VULNERABLE) while `condition` holds. */
export interface EquipmentConditionEffect {
    condition: EquipmentCondition;
    bonus: number;
    trigger?: never;
    payoff?: never;
}

/**
 * A piece's one fight effect: a trigger and a payoff, or a condition and a
 * DEAL bonus (A10). A closed union; the dice half (136.5) extends it with
 * optional members shared by both arms.
 */
export type EquipmentEffect = EquipmentTriggerEffect | EquipmentConditionEffect;

/** Where a relic is meant to come from: a quest's reward, or the elite drop's pool (a quest may pay either). */
export type RelicSource = 'quest' | 'elite';

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
