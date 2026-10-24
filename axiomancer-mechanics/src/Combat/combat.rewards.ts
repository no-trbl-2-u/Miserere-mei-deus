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
import { nextUpgradeId, upgradableCardIds } from '../Cards/card-upgrades';

/**
 * The card-reward pool: the whole library except Curses (a Curse is never a
 * reward; a card adds it mid-combat). The grey office and every registered
 * trial set's cards.
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
 * The pool one player's reward draft draws from: the card ids of the lanes
 * in `player.devRewardLaneIds` (set from the dev menu), or the whole
 * {@link COMBAT_REWARD_POOL} when that field is absent, empty, or names no
 * registered lane. Only ids the library resolves are kept.
 *
 * @param player - The player whose draft is being rolled.
 * @param lanes  - The lane registry; defaults to {@link CARD_LANES}.
 * @returns The candidate card ids, library order within each lane.
 * @example rewardPoolFor({ ...player, devRewardLaneIds: ['grey'] })
 */
export function rewardPoolFor(
    player: Pick<Character, 'devRewardLaneIds'>,
    lanes: readonly CardLane[] = CARD_LANES,
): string[] {
    const lanePool = laneRewardPool(player.devRewardLaneIds ?? [], lanes);
    const pool = lanePool.length > 0 ? lanePool : COMBAT_REWARD_POOL;
    return pool.filter(id => !!getCardById(id));
}

/**
 * Rolls `count` distinct card-reward offers after a won combat: a uniform
 * draw over {@link rewardPoolFor} the player. Pure: every decision is seeded by
 * `rng`, so the same seed always yields the same offers. There is no theme
 * pull, keyword guarantee or rarity weighting: all three grey cards share
 * one rank.
 */
export function rollCombatCardRewards(
    player: Character,
    rng: () => number,
    count = 3,
): string[] {
    const remaining = rewardPoolFor(player);
    const offers: string[] = [];
    while (offers.length < count && remaining.length > 0) {
        const idx = Math.min(Math.floor(rng() * remaining.length), remaining.length - 1);
        offers.push(remaining[idx]);
        remaining.splice(idx, 1);
    }
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
export function rollEliteCardRewards(player: Character, rng: () => number, count = 3): string[] {
    const remaining = rewardPoolFor(player);
    const laneCards = new Set(laneRewardPool(deckLaneIds(ownedCardIds(player))));
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
