/**
 * Reward lanes by character — which card lanes a run's rewards draw on, at the
 * start of the run and after three relics are worn (phase CH1d).
 *
 * One row per roster character. Each row rolls `rolls` seeded combat rewards in
 * two states:
 *
 *  - **start**: the character as `createNewGameState` deals it (its starting
 *    relic worn, nothing else);
 *  - **late**: the same player with three relics worn: the starting relic plus
 *    the library lane relics that add the most lanes not already in the pool,
 *    ties in library order.
 *
 * A state reports the lanes in the pool ({@link unlockedLaneIds}) and each
 * lane's share of the cards offered. A card in no registered lane reads under
 * {@link UNLANED_KEY}. `scripts/measured-truth.mjs` prints the section. A
 * measurement, not a gate; nothing is tuned from it.
 */

import type { Character } from '../Character/types';
import { CHARACTER_ROSTER, type CharacterDefinition } from '../Character/roster';
import { createNewGameState } from '../Game/game.reducer';
import { CARD_LANES, GREY_LANE, type CardLane } from '../Cards/card.lanes';
import type { Equipment } from '../Items/types';
import { relicLibrary } from '../Items/relic.library';
import { relicLaneId } from '../Items/relic-lanes';
import { scrambleSeed } from '../Utils/rng';
import { rollCombatCardRewards, unlockedLaneIds } from './combat.rewards';

/** The key a card that sits in no registered lane is counted under. */
export const UNLANED_KEY = 'unlaned';

/** Relics worn in the late state, the starting relic included. */
export const LATE_WORN_RELICS = 3;

/** Seeded rewards rolled per state when the caller names none. */
export const DEFAULT_REWARD_ROLLS = 400;

/** Cards per reward roll. */
const OFFERS_PER_ROLL = 3;

/** One state of a run: the lanes in its pool and what its rewards offered. */
export interface RewardLaneState {
    /** The relic ids worn in this state, in wear order. */
    worn: string[];
    /** The lanes the pool draws on, registry order; `[]` is the grey fallback. */
    lanes: string[];
    /** Cards offered across all rolls. */
    offered: number;
    /** Each lane's share (0-1, 4 places) of the cards offered, offered lanes only. */
    shares: Record<string, number>;
}

/** One report row: a roster character. */
export interface RewardLaneRow {
    /** The roster character id. */
    character: string;
    name: string;
    start: RewardLaneState;
    late: RewardLaneState;
}

/** The "Reward lanes by character" section of the measured report. */
export interface RewardLanesReport {
    rolls: number;
    seed: number;
    /** One row per roster character in roster order, in roster order. */
    rows: RewardLaneRow[];
}

export interface RewardLanesOptions {
    /** The roster to report; defaults to {@link CHARACTER_ROSTER}. */
    roster?: readonly CharacterDefinition[];
    /** The lane registry; defaults to {@link CARD_LANES}. */
    lanes?: readonly CardLane[];
    /** The relic library; defaults to {@link relicLibrary}. */
    relics?: readonly Equipment[];
    /** Seeded rewards rolled per state (default {@link DEFAULT_REWARD_ROLLS}). */
    rolls?: number;
    /** First seed (default 1). */
    seed?: number;
}

/** Rounds to 4 places so the history stays readable. */
function r4(x: number): number {
    return Math.round(x * 10000) / 10000;
}

/** A Park-Miller generator from a scrambled seed, so nearby seeds diverge. */
function seededRng(seed: number): () => number {
    let state = scrambleSeed(seed) % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

/** The lane a card is counted under: its registered non-grey lane, else grey, else unlaned. */
function laneOfCard(cardId: string, lanes: readonly CardLane[]): string {
    const lane = lanes.find(l => l.id !== GREY_LANE.id && l.cardIds.includes(cardId));
    if (lane) return lane.id;
    return GREY_LANE.cardIds.includes(cardId) ? GREY_LANE.id : UNLANED_KEY;
}

/**
 * Up to `count` library relics to wear next: each pick is the carried-nowhere
 * lane relic that adds the most lanes the pool lacks (0 or 1 each), ties in
 * library order; a pick's lane joins the pool before the next pick.
 *
 * @param player - The wearer; its pool is the lanes already present.
 * @param count  - How many relics to pick.
 * @param lanes  - The lane registry.
 * @param relics - The relic library.
 * @returns The picked relics, in pick order (fewer when the library runs out).
 */
export function lateRelicPicks(
    player: Pick<Character, 'equipment'> & Partial<Pick<Character, 'startingLaneIds'>>,
    count: number,
    lanes: readonly CardLane[],
    relics: readonly Equipment[],
): Equipment[] {
    const present = new Set(unlockedLaneIds(player, lanes, relics));
    const wornIds = new Set(player.equipment.relics.map(r => r.id));
    const open = relics.filter(r => !wornIds.has(r.id) && relicLaneId(r, lanes, relics) !== undefined);
    const picks: Equipment[] = [];
    while (picks.length < count && open.length > 0) {
        let best = 0;
        for (let i = 1; i < open.length; i++) {
            const gain = (r: Equipment) => (present.has(relicLaneId(r, lanes, relics)!) ? 0 : 1);
            if (gain(open[i]!) > gain(open[best]!)) best = i;
        }
        const [pick] = open.splice(best, 1);
        present.add(relicLaneId(pick!, lanes, relics)!);
        picks.push(pick!);
    }
    return picks;
}

/** Rolls the state's rewards and reads its lanes and shares. */
function measureState(
    player: Character,
    lanes: readonly CardLane[],
    relics: readonly Equipment[],
    rolls: number,
    seed: number,
): RewardLaneState {
    const counts = new Map<string, number>();
    let offered = 0;
    for (let i = 0; i < rolls; i++) {
        const cards = rollCombatCardRewards(player, seededRng(seed + i), OFFERS_PER_ROLL, lanes, relics);
        for (const id of cards) {
            const lane = laneOfCard(id, lanes);
            counts.set(lane, (counts.get(lane) ?? 0) + 1);
            offered += 1;
        }
    }
    const shares: Record<string, number> = {};
    for (const [lane, n] of [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
        shares[lane] = r4(n / offered);
    }
    return {
        worn: player.equipment.relics.map(r => r.id),
        lanes: unlockedLaneIds(player, lanes, relics),
        offered,
        shares,
    };
}

/** One row: the start player (as dealt) and the same player with relics added. */
function measureRow(
    start: Character,
    character: string,
    name: string,
    opts: Required<Omit<RewardLanesOptions, 'roster'>>,
): RewardLaneRow {
    const { lanes, relics, rolls, seed } = opts;
    const extra = lateRelicPicks(start, LATE_WORN_RELICS - start.equipment.relics.length, lanes, relics);
    const late: Character = {
        ...start,
        equipment: { ...start.equipment, relics: [...start.equipment.relics, ...extra.map(r => ({ ...r }))] },
    };
    return {
        character, name,
        start: measureState(start, lanes, relics, rolls, seed),
        late: measureState(late, lanes, relics, rolls, seed),
    };
}

/**
 * The reward-lane section: one row per roster character.
 *
 * @param options - the roster, lanes and relics (fixtures in tests), rolls and seed.
 * @returns The rows; none for an empty roster.
 * @example rewardLanesByCharacter({ rolls: 50 }).rows[0]!.character // "the-chosen"
 */
export function rewardLanesByCharacter(options: RewardLanesOptions = {}): RewardLanesReport {
    const roster = options.roster ?? CHARACTER_ROSTER;
    const opts = {
        lanes: options.lanes ?? CARD_LANES,
        relics: options.relics ?? relicLibrary,
        rolls: options.rolls ?? DEFAULT_REWARD_ROLLS,
        seed: options.seed ?? 1,
    };
    const rows = roster.map(def => measureRow(
        createNewGameState({ characterId: def.id, roster, relics: opts.relics }).player,
        def.id, def.name, opts,
    ));
    return { rolls: opts.rolls, seed: opts.seed, rows };
}
