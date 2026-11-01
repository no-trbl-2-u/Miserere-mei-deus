export {
    type Item, type Equipment, type Consumable, type Material, type QuestItem,
    type EquipmentSlot,
    type EquipmentEffect, type EquipmentTriggerEffect, type EquipmentConditionEffect,
    type EquipmentTrigger, type EquipmentCondition, type EquipmentPayoff, type EquipmentPayoffKind,
    type EquipmentDiceEffect, type EquipmentDiceFields, type EquipmentDieChange, type EquipmentDieColor,
    type SpecialPayload, type SpecialPayloadKind,
    SLOT_CAPACITY,
    isEquipment, isConsumable, isMaterial, isQuestItem,
} from './types';
// The shared grant/equip/swap path — the one door every "the player now has
// this item" transition walks through, plus the reward-screen predicate.
export {
    grantItem, grantWearingIfFree, qualifiesForItemRewardScreen, partitionGrantsForReward, displacedBy,
} from './item-grant';
export type { GrantOutcome } from './item-grant';
// The desperation band. `resolveConsumableHeal` is the ONE resolver
// for the two-band heal; presenters import it rather than re-deriving the
// threshold, which is what keeps the shop line, the drink preview and the
// actual heal from disagreeing.
export {
    resolveConsumableHeal,
} from './equipment.engine';
// Loot caches yield consumables via `rollCacheReward`; the signet relics are
// the whole equipment surface.
export { cacheCardRng, rollCacheReward } from './cache-reward';
export type { CacheLootTier } from './cache-reward';
export {
    wornPerSlot, isEquippedFirstOfSlot, findEquippedInSlot,
} from './equipped';
export { consumableLibrary, getConsumableById } from './consumable.library';
// The signet relics + worn-loadout signature derivation.
export {
    relicLibrary, getRelicById,
} from './relic.library';
// The ten weapons and armor: the grey pair every run starts in and a pair per lane.
export {
    weaponLibrary, armorLibrary, equipmentLibrary, EQUIPMENT_LANE, GREY_WEAPON_ID, GREY_ARMOR_ID,
    getEquipmentPieceById, cloneEquipmentPiece, equipmentLaneId, greyPair, wearGreyPair,
} from './equipment.library';
// The lane a relic opens while worn (the card-reward rule reads it).
export { relicLaneId, wornLaneCounts } from './relic-lanes';
