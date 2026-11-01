/**
 * Deckbuilder — combat card rewards + the card-unlock hook.
 *
 * Two distinct progression levers (per the design):
 *   1. CARD REWARDS (frequent, after a won combat) grow the DECK — extra copies
 *      and variety. They append to `Character.combatRewardCards`, which
 *      `buildCombatDeck` stacks on top of the learned-card baseline.
 *   2. CARD UNLOCKS (rare, via ethical-dilemma events) add a NEW card type.
 *      `unlockCardViaDilemma` is the hook those events call; it bypasses the
 *      normal learning requirements (the dilemma IS the gate), unlike
 *      `learnCard`. It has no live caller.
 *   3. THE ELITE REWARD (after a won elite fight) offers the best cards
 *      available, one from the player's own lanes, or one upgrade of a random
 *      owned card at the highest rarity the player owns (`rollEliteReward`).
 *
 * Pure: rolling takes an explicit `rng`. The mobile aftermath offers the 1-of-N
 * and persists the pick.
 */

import type { Character } from '../Character/types';
import type { Enemy } from '../Enemy/types';
import { rankToRarity, type CardRarity } from '../Cards/types';
import { cardLibrary, getCardById } from '../Cards/cards.library';
import { CARD_LANES, GREY_LANE, deckLaneIds, laneRewardPool, type CardLane } from '../Cards/card.lanes';
import type { Equipment } from '../Items/types';
import { relicLibrary } from '../Items/relic.library';
import { wornLaneCounts, wornPieces, type Wearer } from '../Items/relic-lanes';
import { EQUIPMENT_DROP_TUNING, rollEquipmentDrop, type EquipmentCarrier } from '../Items/equipment-drop';
import { ELITE_RELIC_DROP_CHANCE } from '../Game/game-mechanics.constants';
import { deepClone } from '../Utils';
import { nextUpgradeId, upgradableCardIds } from '../Cards/card-upgrades';

/**
 * The whole library except Curses (a Curse is never a reward; a card adds it
 * mid-combat): the grey office and every registered trial set's cards. No
 * reward draws from it directly; {@link rewardPoolFor} is the pool.
 */
export const COMBAT_REWARD_POOL: readonly string[] = Object.freeze(
    cardLibrary.filter(card => card.cardType !== 'curse').map(card => card.id),
);

/**
 * The grey office — every brand-new player's opening 10-card
 * deck: three colourless shapes (`color: 'any'` — every die
 * colour powers each), so fight one teaches STRIKE, WARD, FREE-vs-PAID, and
 * the die-spend loop with zero colour arithmetic: Blow 5, Ward 3, and 2 of
 * A Plain Word.
 *
 * `ensureStarterCards` writes this list VERBATIM (copies kept — 5 + 3 + 2, not
 * deduplicated) into a fresh character's `knownCards`, and every sim and
 * playtest deck is this list.
 */
export const STARTING_CARD_IDS: readonly string[] = GREY_LANE.testDeck;

/**
 * The pool one player's reward draft draws from, in priority order:
 *
 *  1. the dev override: the cards of the lanes in `player.devRewardLaneIds`,
 *     when it names a registered lane;
 *  2. the cards of every lane the character starts with or a worn relic opens
 *     ({@link unlockedLaneIds});
 * Grey cards are never offered. A player with no starting lane, no worn lane
 * relic and no dev override has no pool, and that is a bug in whatever built
 * the player (every run opens as a roster character): this throws rather than
 * offering anything.
 *
 * Curses and ids the library cannot resolve are never in it.
 *
 * @param player - The player whose draft is being rolled.
 * @param lanes  - The lane registry; defaults to {@link CARD_LANES}.
 * @param relics - The relic library; defaults to {@link relicLibrary}.
 * @returns The candidate card ids, library order within each lane.
 * @throws When the player draws on no lane at all.
 * @example rewardPoolFor(theChosen) // Defender and Blood Price cards, plus the Merciful lane while the ring is worn
 */
export function rewardPoolFor(
    player: Pick<Character, 'devRewardLaneIds'> & LaneHolder,
    lanes: readonly CardLane[] = CARD_LANES,
    relics: readonly Equipment[] = relicLibrary,
): string[] {
    const override = devOverridePool(player, lanes);
    if (override.length > 0) return override;
    const worn = rewardable(laneRewardPool(unlockedLaneIds(player, lanes, relics), lanes));
    if (worn.length === 0) {
        throw new Error('rewardPoolFor: the player has no starting lane, no worn lane relic and no dev reward lane, so no reward pool.');
    }
    return worn;
}

/** The ids a reward may offer: resolvable by the library and not a Curse. */
function rewardable(ids: readonly string[]): string[] {
    return ids.filter(id => {
        const card = getCardById(id);
        return card !== undefined && card.cardType !== 'curse';
    });
}

/** The dev override's pool, or `[]` when the override names no registered lane. */
function devOverridePool(
    player: Pick<Character, 'devRewardLaneIds'>,
    lanes: readonly CardLane[],
): string[] {
    return rewardable(laneRewardPool(player.devRewardLaneIds ?? [], lanes));
}

/** A wearer who may also hold a character's starting lanes (`Character.startingLaneIds`). */
export type LaneHolder = Wearer & Partial<Pick<Character, 'startingLaneIds'>>;

/**
 * The lanes the player's reward pool draws on: the character's starting lanes
 * (always, worn or not) plus every registered lane a worn relic opens, each
 * once, in registry order. A carried, unworn relic opens nothing, a lane id the
 * registry does not carry is ignored, and the grey office is never returned
 * (its cards are the starter deck, not a reward lane). A run with no character
 * has no starting lanes, so the worn relics decide alone.
 *
 * @param player - The wearer (`player.equipment` and `player.startingLaneIds` are read; `inventory` is not).
 * @param lanes  - The lane registry; defaults to {@link CARD_LANES}.
 * @param relics - The relic library; defaults to {@link relicLibrary}.
 * @returns The lane ids; `[]` when there is neither a starting lane nor a worn lane relic.
 * @example unlockedLaneIds(wearingABloodPriceRelic) // ['blood-price']
 */
export function unlockedLaneIds(
    player: LaneHolder,
    lanes: readonly CardLane[] = CARD_LANES,
    relics: readonly Equipment[] = relicLibrary,
): string[] {
    const counts = wornLaneCounts(player, lanes, relics);
    const starting = new Set(player.startingLaneIds ?? []);
    return lanes
        .filter(lane => lane.id !== GREY_LANE.id && (counts.has(lane.id) || starting.has(lane.id)))
        .map(lane => lane.id);
}

/** The lanes worn relics open, registry order, grey never: the lanes that can earn lane slots. */
function wornLaneIds(
    player: Wearer,
    lanes: readonly CardLane[],
    relics: readonly Equipment[],
): string[] {
    const counts = wornLaneCounts(player, lanes, relics);
    return lanes.filter(lane => lane.id !== GREY_LANE.id && counts.has(lane.id)).map(lane => lane.id);
}

/**
 * How many of a 3-card reward's slots come from one lane, by the number of
 * relics worn from it: 0 gives 0, 1-2 give 1, 3-4 give 2, 5 or more give 3.
 *
 * @param wornFromLane - Relics worn that open the lane.
 * @example laneSlotCount(3) // 2
 */
export function laneSlotCount(wornFromLane: number): number {
    if (wornFromLane >= 5) return 3;
    if (wornFromLane >= 3) return 2;
    if (wornFromLane >= 1) return 1;
    return 0;
}

/** The lane that fills a reward's lane slots, and how many slots it fills. */
export interface RewardLaneSlots {
    readonly laneId: string;
    readonly slots: number;
}

/**
 * The reward's lane slots: the lane the player wears the most relics from
 * (a tie broken by `rng`, drawn only when there is a tie) and its
 * {@link laneSlotCount}. Null when no worn relic opens a lane.
 *
 * @param player - The wearer.
 * @param rng    - The roll's seeded rng.
 * @param lanes  - The lane registry; defaults to {@link CARD_LANES}.
 * @param relics - The relic library; defaults to {@link relicLibrary}.
 */
export function rewardLaneSlots(
    player: Wearer,
    rng: () => number,
    lanes: readonly CardLane[] = CARD_LANES,
    relics: readonly Equipment[] = relicLibrary,
): RewardLaneSlots | null {
    const counts = wornLaneCounts(player, lanes, relics);
    const ranked = wornLaneIds(player, lanes, relics);
    if (ranked.length === 0) return null;
    const most = Math.max(...ranked.map(id => counts.get(id) ?? 0));
    const tied = ranked.filter(id => counts.get(id) === most);
    const laneId = tied.length === 1 ? tied[0] : tied[pick(tied.length, rng)];
    return { laneId, slots: laneSlotCount(most) };
}

/** A seeded index in `[0, length)`. */
function pick(length: number, rng: () => number): number {
    return Math.min(Math.floor(rng() * length), length - 1);
}

/** Draws up to `count` distinct ids from `pool` into `offers`, skipping ids already offered. */
function drawDistinct(pool: readonly string[], count: number, offers: string[], rng: () => number): void {
    const remaining = pool.filter(id => !offers.includes(id));
    let drawn = 0;
    while (drawn < count && remaining.length > 0) {
        const idx = pick(remaining.length, rng);
        offers.push(remaining[idx]);
        remaining.splice(idx, 1);
        drawn += 1;
    }
}

/**
 * Rolls `count` distinct card-reward offers after a won combat (the cache
 * rolls its one card with `count = 1`).
 *
 * The lane slots come first: {@link rewardLaneSlots} cards from the lane the
 * player wears most, then the rest from {@link rewardPoolFor}. A card the
 * player already owns may be offered. When the dev override names a lane,
 * every slot draws from the override and the lane slots are not read.
 * Pure: every decision is seeded by `rng`, so the same seed always yields the
 * same offers.
 *
 * @param player - The player being rewarded.
 * @param rng    - The seeded rng.
 * @param count  - Offers to roll; defaults to 3.
 * @param lanes  - The lane registry; defaults to {@link CARD_LANES}.
 * @param relics - The relic library; defaults to {@link relicLibrary}.
 * @example rollCombatCardRewards(freshPlayer, seeded(1)) // three grey ids
 */
export function rollCombatCardRewards(
    player: Character,
    rng: () => number,
    count = 3,
    lanes: readonly CardLane[] = CARD_LANES,
    relics: readonly Equipment[] = relicLibrary,
): string[] {
    const offers: string[] = [];
    const override = devOverridePool(player, lanes);
    if (override.length > 0) {
        drawDistinct(override, count, offers, rng);
        return offers;
    }
    const slots = rewardLaneSlots(player, rng, lanes, relics);
    if (slots !== null) {
        drawDistinct(rewardable(laneRewardPool([slots.laneId], lanes)), Math.min(slots.slots, count), offers, rng);
    }
    drawDistinct(rewardPoolFor(player, lanes, relics), count - offers.length, offers, rng);
    return offers;
}

// ─── The elite reward (Phase UP1f) ──────────────────────────────────────────

/** The upgrade an elite reward offers: the owned copy and the id it becomes. */
export interface EliteRewardUpgrade {
    /** The owned card id the host passes to `replaceCard` as the copy to swap. */
    readonly fromCardId: string;
    /** The id it becomes (`nextUpgradeId(fromCardId)`). */
    readonly toCardId: string;
}

/**
 * An elite fight's reward: take one of `cards`, or take `upgrade`. `upgrade`
 * is null when nothing the player owns can take another upgrade, and the
 * host then hides that option.
 */
export interface EliteReward {
    readonly cards: string[];
    readonly upgrade: EliteRewardUpgrade | null;
}

/** Rarity bands, best first. */
const RARITY_BEST_FIRST: readonly CardRarity[] = ['rare', 'uncommon', 'common'];

/** True for a foe whose fight pays the elite reward (`difficulty: 'elite'`). */
export function isEliteEnemy(enemy: Pick<Enemy, 'difficulty'>): boolean {
    return enemy.difficulty === 'elite';
}

/** Every card the player owns, copies kept: learned cards, then rewards. */
function ownedCardIds(player: Pick<Character, 'knownCards' | 'combatRewardCards'>): string[] {
    return [...player.knownCards, ...(player.combatRewardCards ?? [])];
}

/**
 * Draws one id from the best rarity band present in `ids`, uniformly within
 * that band. Undefined for an empty list. Ids the library cannot resolve are
 * never drawn.
 */
function drawBest(ids: readonly string[], rng: () => number): string | undefined {
    for (const band of RARITY_BEST_FIRST) {
        const inBand = ids.filter(id => {
            const card = getCardById(id);
            return card !== undefined && rankToRarity(card.rank) === band;
        });
        if (inBand.length > 0) return inBand[Math.min(Math.floor(rng() * inBand.length), inBand.length - 1)];
    }
    return undefined;
}

/**
 * The elite reward's cards: the best `count` cards of {@link rewardPoolFor}
 * the player, highest rarity first. The first offer is the best card from the
 * lanes the player's deck draws on (`deckLaneIds`), so at least one offer is
 * theirs; the rest fill from the best bands left. Distinct; seeded by `rng`.
 * While rares are few, the highest rarity available stands in for "rare".
 */
export function rollEliteCardRewards(
    player: Character,
    rng: () => number,
    count = 3,
    lanes: readonly CardLane[] = CARD_LANES,
    relics: readonly Equipment[] = relicLibrary,
): string[] {
    const remaining = rewardPoolFor(player, lanes, relics);
    const laneCards = new Set(laneRewardPool(deckLaneIds(ownedCardIds(player), lanes), lanes));
    const offers: string[] = [];
    const take = (id: string | undefined): void => {
        if (id === undefined) return;
        offers.push(id);
        remaining.splice(remaining.indexOf(id), 1);
    };
    if (count > 0) take(drawBest(remaining.filter(id => laneCards.has(id)), rng));
    while (offers.length < count && remaining.length > 0) {
        const next = drawBest(remaining, rng);
        if (next === undefined) break;
        take(next);
    }
    return offers;
}

/**
 * The elite reward's upgrade: one owned copy, drawn at random from the cards
 * at the highest rarity the player owns that can still take an upgrade, and
 * the id it becomes. Each copy is one chance, so a card held twice is twice as
 * likely. Null when no owned card can be upgraded.
 */
export function rollEliteUpgrade(player: Character, rng: () => number): EliteRewardUpgrade | null {
    const owned = ownedCardIds(player);
    const upgradable = new Set(upgradableCardIds(owned));
    const fromCardId = drawBest(owned.filter(id => upgradable.has(id)), rng);
    if (fromCardId === undefined) return null;
    const toCardId = nextUpgradeId(fromCardId);
    return toCardId === undefined ? null : { fromCardId, toCardId };
}

/**
 * Rolls a won elite fight's reward (A9 of the UP1 brief): the best `count`
 * cards (one from the player's lanes) or one random upgrade. Pure and seeded:
 * the cards are rolled first, then the upgrade, from the same `rng`.
 *
 * @example rollEliteReward(player, Math.random) // { cards: [...3 ids], upgrade: { fromCardId, toCardId } }
 */
export function rollEliteReward(player: Character, rng: () => number, count = 3): EliteReward {
    const cards = rollEliteCardRewards(player, rng, count);
    return { cards, upgrade: rollEliteUpgrade(player, rng) };
}

/**
 * The relics a won elite fight can drop for `player`: the relics the player
 * does not carry (in the satchel or worn) out of the fight's own drop list
 * `dropList` (relic ids, looked up in `relics`), or, when the fight authors
 * none, the library's `relicSource: 'elite'` relics. Several elites may list
 * the same relic; one the player carries is skipped, so a shared relic won
 * from one elite never drops again from another. A `'quest'` relic drops only
 * where a fight lists it; any relic may also be a quest's reward.
 */
export function eliteRelicPool(
    player: Pick<Character, 'inventory'> & Wearer,
    relics: readonly Equipment[] = relicLibrary,
    dropList?: readonly string[],
): Equipment[] {
    const carried = new Set<string>([
        ...(player.inventory ?? []).map(item => item.id),
        ...wornPieces(player).map(piece => piece.id),
    ]);
    const listed = dropList ? new Set(dropList) : null;
    return relics.filter(relic =>
        (listed ? listed.has(relic.id) : relic.relicSource === 'elite') && !carried.has(relic.id));
}

/**
 * A won elite fight's relic roll, made before any other reward (a drop is
 * the whole reward): one relic from {@link eliteRelicPool} (the fight's
 * `dropList`, else the elite-drop pool) with probability
 * `ELITE_RELIC_DROP_CHANCE`, else `null`. Pure and seeded: the first draw is
 * the chance, the second picks uniformly from the pool. An empty pool drops
 * nothing and draws nothing. The relic comes back deep-cloned.
 *
 * @example rollEliteRelicDrop(player, Math.random) // null, or { id: 'relic-...', ... }
 */
export function rollEliteRelicDrop(
    player: Pick<Character, 'inventory'> & Wearer,
    rng: () => number,
    relics: readonly Equipment[] = relicLibrary,
    dropList?: readonly string[],
): Equipment | null {
    const pool = eliteRelicPool(player, relics, dropList);
    if (pool.length === 0) return null;
    if (rng() >= ELITE_RELIC_DROP_CHANCE) return null;
    const pick = pool[Math.min(Math.floor(rng() * pool.length), pool.length - 1)]!;
    return deepClone(pick);
}

/**
 * A won (or befriended) elite fight's lane piece: one weapon or armor the
 * player does not carry, drawn on top of the relic roll and the card reward.
 * A win drops it at `EQUIPMENT_DROP_TUNING.elite`; a befriended elite always
 * hands one (`befriendedElite`, 1). Pure and seeded like
 * {@link rollEliteRelicDrop}: the chance first, then the pick. The grey pair
 * is never in the pool; with every lane piece carried it drops nothing.
 *
 * @example rollEliteEquipmentDrop(player, Math.random) // null, or { id: 'weapon-...', ... }
 */
export function rollEliteEquipmentDrop(
    player: EquipmentCarrier,
    rng: () => number,
    opts: { befriended?: boolean } = {},
): Equipment | null {
    const chance = opts.befriended ? EQUIPMENT_DROP_TUNING.befriendedElite : EQUIPMENT_DROP_TUNING.elite;
    return rollEquipmentDrop(player, rng, chance);
}

/** Appends a chosen reward card to the player's persistent deck collection. */
export function addRewardCard(player: Character, cardId: string): Character {
    return { ...player, combatRewardCards: [...(player.combatRewardCards ?? []), cardId] };
}

/**
 * Unlock a NEW card from an ethical-dilemma event. Bypasses the
 * normal `learnCard` requirement gates (level/stat/prereq) because the dilemma
 * choice is itself the gate. No-op (same ref) when already known or unknown id.
 * It has no live caller.
 */
export function unlockCardViaDilemma(player: Character, cardId: string): Character {
    if (player.knownCards.includes(cardId)) return player;
    if (!getCardById(cardId)) return player;
    return { ...player, knownCards: [...player.knownCards, cardId] };
}
