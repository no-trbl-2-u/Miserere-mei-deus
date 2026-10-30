export {
    type Item, type Equipment, type Consumable, type Material, type QuestItem,
    type EquipmentSlot,
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
export { buyItem, sellItem, defaultSellPrice } from './shop.reducer';
export type { ShopWare } from './shop.types';
// The signet relics + worn-loadout signature derivation.
export {
    relicLibrary, getRelicById,
} from './relic.library';
// The lane a relic opens while worn (the card-reward rule reads it).
export { relicLaneId, wornLaneCounts } from './relic-lanes';
