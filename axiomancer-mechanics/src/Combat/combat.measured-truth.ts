/**
 * Measured truth — how the measured decks fare in every Act 1 fight.
 *
 * One cell per (Act 1 ledger fight × stat spread × deck): the player is at the
 * level a full clear brings to that fight (`walkAct1`), spends their points by
 * the spread, and plays the deck with the greedy witness against the fight's
 * pinned enemy. `scripts/measured-truth.mjs` commits the report to
 * `docs/reports/measured/`. It measures; nothing gates on it and nothing is
 * tuned from it.
 *
 * Decks are read from the card-lane registry by lane id, so a lane's revised
 * test deck changes nothing here. Each lane named in
 * {@link MEASURED_HALF_UPGRADED_LANES} is measured a second time with half
 * its test deck upgraded once, under the deck id `<lane>+half` (phase UP1g).
 *
 * Each family in {@link MEASURED_SAMPLED_FAMILIES} is measured as seeded
 * draws of distinct cards from its lanes' pool (phase EM1). A family cell
 * carries the median over its draws in the ordinary fields, plus the range of
 * win rate and lowest-VITAE p10, so drift and the tables read it like a deck.
 * Every cell carries `selfBurnMean`, the VITAE lost to the player's own
 * INFERNO, beside `playerHpTakenMean` (VITAE lost to the foe's threats).
 *
 * The fighter wears what a new run wears, the grey weapon and armor
 * ({@link MeasuredWorn}), so every column is "grey pair worn"; the grey
 * weapon's special pays +2 Conviction and the grey armor changes a die. Each
 * lane named in {@link MEASURED_BARE_LANES} is measured once more with nothing
 * worn, under the deck id `<lane>+bare`, as the control the pair is read
 * against.
 */

import { createCharacter } from '../Character';
import { wearGreyPair } from '../Items/equipment.library';
import { getCardLane, laneRewardPool } from '../Cards/card.lanes';
import { nextUpgradeId } from '../Cards/card-upgrades';
import { ENEMY_REGISTRY, type EnemySlug } from '../Enemy/enemy.library';
import { scaleEnemyToLevel } from '../World/encounter';
import { sourceAtTier } from '../World/encounter-tier';
import {
    act1FightLedger, stageStats, walkAct1, type Act1Fight, type StatSpread,
} from '../Game/act1-progression';
import { scrambleSeed } from '../Utils/rng';
import { simulateHazardPatternCombatDetailed } from './combat.encounter.sim';
import { rewardLanesByCharacter, type RewardLanesOptions, type RewardLanesReport } from './combat.reward-lanes';

/** The lanes whose test decks are measured, by lane id. */
export const MEASURED_DECK_LANES: readonly string[] = ['grey', 'blood-price', 'elementalist'];

/** The lanes also measured with half their test deck upgraded once. */
export const MEASURED_HALF_UPGRADED_LANES: readonly string[] = ['blood-price'];

/** The suffix on a half-upgraded deck's id: `blood-price+half`. */
export const HALF_UPGRADED_DECK_SUFFIX = '+half';

/** What the measured fighter wears: the grey pair a new run opens with, or nothing. */
export type MeasuredWorn = 'grey-pair' | 'none';

/** The lanes also measured with nothing worn, as the control for the grey pair. */
export const MEASURED_BARE_LANES: readonly string[] = ['grey'];

/** The suffix on a bare-handed deck's id: `grey+bare`. */
export const BARE_DECK_SUFFIX = '+bare';

/** A sampled deck family: `drawSize` distinct cards drawn from its lanes' pool. */
export interface MeasuredSampledFamily {
    /** Deck id; the `~` marks a sampled family. */
    id: string;
    /** The lanes whose `cardIds` make the pool, through `laneRewardPool`. */
    laneIds: readonly string[];
    drawSize: number;
}

/** The sampled families: the Elementalist's spread and the mixed-pool median. */
export const MEASURED_SAMPLED_FAMILIES: readonly MeasuredSampledFamily[] = [
    { id: 'elementalist~20of30', laneIds: ['elementalist'], drawSize: 20 },
    { id: 'mixed~20of60', laneIds: ['blood-price', 'elementalist'], drawSize: 20 },
];

/** Draws per sampled family when the caller names none. */
export const DEFAULT_SAMPLE_DRAWS = 16;

/** The stat spreads every fight is measured at. */
export const MEASURED_SPREADS: readonly StatSpread[] = ['even', 'body-mind', 'body'];

/** One measured cell. Rates and fractions are 0–1. */
export interface MeasuredTruthCell {
    /** Stable key for the fight across runs: `<nodeId>/<enemySlug>`. */
    fight: string;
    map: string;
    nodeId: string;
    enemySlug: EnemySlug;
    isBoss: boolean;
    playerLevel: number;
    enemyLevel: number;
    spread: StatSpread;
    deck: string;
    winRate: number;
    meanRounds: number;
    lowestVitaeFractionMean: number;
    lowestVitaeFractionP10: number;
    playerHpTakenMean: number;
    /** Mean VITAE per fight lost to the player's own INFERNO. */
    selfBurnMean: number;
    /** Family cells only: the lowest and highest draw's win rate. */
    winRateMin?: number;
    winRateMax?: number;
    /** Family cells only: the lowest and highest draw's lowest-VITAE p10. */
    lowestVitaeFractionP10Min?: number;
    lowestVitaeFractionP10Max?: number;
    runs: number;
    seed: number;
}

/** One measured deck. */
export interface MeasuredTruthDeck {
    /** What the fighter wore in this deck's cells. */
    worn: MeasuredWorn;
    /** The deck's card ids, copies kept. */
    deckCards: string[];
    /** Mean over the deck's cells of the share of its distinct cards that
     *  never got played in that cell (1 − deck utilization). */
    deadCardRate: number;
}

/** One measured sampled family. */
export interface MeasuredTruthFamily {
    family: true;
    /** What the fighter wore in this family's cells. */
    worn: MeasuredWorn;
    laneIds: string[];
    poolSize: number;
    drawSize: number;
    /** Every draw's card ids, in draw order; each replays as a plain deck. */
    draws: string[][];
    /** Mean over the draws of each draw's dead-card rate. */
    deadCardRate: number;
}

/** The whole report `npm run measured-truth -- --json` prints. */
export interface MeasuredTruthReport {
    runs: number;
    seed: number;
    policy: 'greedy';
    spreads: StatSpread[];
    cells: MeasuredTruthCell[];
    decks: Record<string, MeasuredTruthDeck | MeasuredTruthFamily>;
    /** Reward lanes by character at run start and after three worn relics (phase CH1d). */
    rewardLanes: RewardLanesReport;
}

export interface MeasuredTruthOptions {
    /** Seeded runs per cell (default 300). */
    runs?: number;
    /** First seed of every cell (default 1). */
    seed?: number;
    /** Lane ids to measure (default {@link MEASURED_DECK_LANES}). */
    deckLanes?: readonly string[];
    /** Lane ids also measured half-upgraded (default {@link MEASURED_HALF_UPGRADED_LANES}). */
    halfUpgradedLanes?: readonly string[];
    /** What the fighter wears (default `'grey-pair'`, a new run's loadout); the bare lanes always wear nothing. */
    worn?: MeasuredWorn;
    /** Lane ids also measured with nothing worn (default {@link MEASURED_BARE_LANES}). */
    bareLanes?: readonly string[];
    /** The sampled families (default {@link MEASURED_SAMPLED_FAMILIES}). */
    sampledFamilies?: readonly MeasuredSampledFamily[];
    /** Draws per sampled family (default {@link DEFAULT_SAMPLE_DRAWS}). */
    sampleDraws?: number;
    /** The fights to walk (default the full Act 1 ledger). */
    fights?: readonly Act1Fight[];
    /** The reward-lane section's roster, lanes, relics, rolls and seed (default the live ones). */
    rewardLanes?: RewardLanesOptions;
}

/** Rounds to 4 places so the history stays readable. */
function r4(x: number): number {
    return Math.round(x * 10000) / 10000;
}

/**
 * A deck with half its cards upgraded once: every other card that can take an
 * upgrade, then the rest in order if that falls short, until half the deck
 * (rounded down) carries one. Copies are upgraded one position at a time.
 *
 * @param cards - the deck's card ids, copies kept.
 * @returns The same deck in the same order, half of it as `<id>+`.
 * @example halfUpgradedDeck(['a', 'b', 'c', 'd']) // ['a+', 'b', 'c+', 'd']
 */
export function halfUpgradedDeck(cards: readonly string[]): string[] {
    const open = cards.flatMap((id, i) => (nextUpgradeId(id) ? [i] : []));
    const picked = new Set([
        ...open.filter((_, k) => k % 2 === 0),
        ...open.filter((_, k) => k % 2 === 1),
    ].slice(0, Math.floor(cards.length / 2)));
    return cards.map((id, i) => (picked.has(i) ? nextUpgradeId(id)! : id));
}

/** mulberry32: a local generator, so drawing never touches the global RNG. */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** A 32-bit FNV-1a hash of a string, to mix a family id into a seed. */
function hashId(id: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
    return h >>> 0;
}

/**
 * The seeded draws of one sampled family: `draws` decks of `family.drawSize`
 * distinct cards from its pool. Reads and writes no global RNG.
 *
 * @param family - the family to draw.
 * @param seed - the run's seed; the family id and draw index are mixed in.
 * @param draws - how many decks to draw.
 * @returns The pool and the draws, each a deck in draw order.
 * @throws When a lane id names no registered lane, or the pool is smaller than a draw.
 * @example sampledFamilyDraws(MEASURED_SAMPLED_FAMILIES[0]!, 1, 2).draws.length // 2
 */
export function sampledFamilyDraws(
    family: MeasuredSampledFamily, seed: number, draws: number,
): { pool: string[]; draws: string[][] } {
    for (const id of family.laneIds) {
        if (!getCardLane(id)) throw new Error(`measuredTruthCells: no card lane '${id}'`);
    }
    const pool = laneRewardPool(family.laneIds);
    if (pool.length < family.drawSize) {
        throw new Error(`measuredTruthCells: family '${family.id}' pool of ${pool.length} is under ${family.drawSize}`);
    }
    const out: string[][] = [];
    for (let k = 0; k < draws; k++) {
        const next = mulberry32(scrambleSeed(scrambleSeed(seed) ^ hashId(family.id) ^ Math.imul(k + 1, 0x9e3779b9)));
        const cards = [...pool];
        for (let i = 0; i < family.drawSize; i++) {
            const j = i + Math.floor(next() * (cards.length - i));
            [cards[i], cards[j]] = [cards[j]!, cards[i]!];
        }
        out.push(cards.slice(0, family.drawSize));
    }
    return { pool, draws: out };
}

/** The median of a non-empty list (the mean of the middle two when even). */
function median(xs: readonly number[]): number {
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** The enemy level a fight stages against a player at `playerLevel`. */
function fightEnemyLevel(fight: Act1Fight, playerLevel: number): number {
    return fight.level ?? Math.max(ENEMY_REGISTRY[fight.enemySlug].level, playerLevel);
}

/**
 * Measures every cell.
 *
 * @param options - runs, seed, the lanes, the families, the draws and the fights to measure.
 * @returns The report: one cell per fight × spread × deck or family, in ledger order.
 * @throws When a lane id names no registered lane.
 * @example measuredTruthCells({ runs: 5 }).cells.length // ledger × 3 × 6
 */
export function measuredTruthCells(options: MeasuredTruthOptions = {}): MeasuredTruthReport {
    const runs = options.runs ?? 300;
    const seed = options.seed ?? 1;
    const fights = options.fights ?? act1FightLedger();
    const laneIds = options.deckLanes ?? MEASURED_DECK_LANES;
    const worn: MeasuredWorn = options.worn ?? 'grey-pair';
    const decks: { id: string; cards: string[]; worn: MeasuredWorn }[] = laneIds.map(id => {
        const lane = getCardLane(id);
        if (!lane) throw new Error(`measuredTruthCells: no card lane '${id}'`);
        return { id, cards: [...lane.testDeck], worn };
    });
    for (const id of options.halfUpgradedLanes ?? MEASURED_HALF_UPGRADED_LANES) {
        const lane = getCardLane(id);
        if (!lane) throw new Error(`measuredTruthCells: no card lane '${id}'`);
        decks.push({ id: `${id}${HALF_UPGRADED_DECK_SUFFIX}`, cards: halfUpgradedDeck(lane.testDeck), worn });
    }
    for (const id of options.bareLanes ?? MEASURED_BARE_LANES) {
        const lane = getCardLane(id);
        if (!lane) throw new Error(`measuredTruthCells: no card lane '${id}'`);
        decks.push({ id: `${id}${BARE_DECK_SUFFIX}`, cards: [...lane.testDeck], worn: 'none' });
    }
    const sampleDraws = options.sampleDraws ?? DEFAULT_SAMPLE_DRAWS;
    const families = (options.sampledFamilies ?? MEASURED_SAMPLED_FAMILIES).map(family => ({
        family, ...sampledFamilyDraws(family, seed, sampleDraws),
    }));
    const { fightLevels } = walkAct1(fights);
    const seen = new Map<string, number>();
    const cells: MeasuredTruthCell[] = [];
    const deadRates: Record<string, number[]> = Object.fromEntries(
        [...decks.map(d => d.id), ...families.map(f => f.family.id)].map(id => [id, []]),
    );

    fights.forEach((fight, i) => {
        const base = `${fight.nodeId}/${fight.enemySlug}`;
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        const key = n === 1 ? base : `${base}#${n}`;
        const playerLevel = fightLevels[i]!;
        const enemyLevel = fightEnemyLevel(fight, playerLevel);
        const enemy = scaleEnemyToLevel(sourceAtTier(ENEMY_REGISTRY[fight.enemySlug], fight.difficulty), enemyLevel);
        const play = (cards: readonly string[], spread: StatSpread, wears: MeasuredWorn) => {
            const fresh = createCharacter({
                name: 'Measured', level: playerLevel,
                baseStats: stageStats(playerLevel, spread), knownCards: [...new Set(cards)],
            });
            // A new run wears the grey pair: its special pays +2 Conviction and its armor changes a die.
            const player = wears === 'grey-pair' ? wearGreyPair(fresh) : fresh;
            return simulateHazardPatternCombatDetailed({
                player, enemy, runs, startSeed: seed, policy: 'greedy', deck: [...cards],
            }).stats;
        };
        const at = (spread: StatSpread, deck: string) => ({
            fight: key, map: fight.map, nodeId: fight.nodeId, enemySlug: fight.enemySlug,
            isBoss: fight.isBoss, playerLevel, enemyLevel, spread, deck,
        });
        for (const spread of MEASURED_SPREADS) {
            for (const deck of decks) {
                const stats = play(deck.cards, spread, deck.worn);
                deadRates[deck.id]!.push(1 - stats.deckUtilization);
                cells.push({
                    ...at(spread, deck.id),
                    winRate: r4(stats.winRate),
                    meanRounds: r4(stats.avgRounds),
                    lowestVitaeFractionMean: r4(stats.lowestVitaeFractionMean),
                    lowestVitaeFractionP10: r4(stats.lowestVitaeFractionP10),
                    playerHpTakenMean: r4(stats.playerHpTakenMean),
                    selfBurnMean: r4(stats.selfBurnMean),
                    runs, seed,
                });
            }
            for (const { family, draws } of families) {
                const all = draws.map(cards => play(cards, spread, worn));
                for (const stats of all) deadRates[family.id]!.push(1 - stats.deckUtilization);
                const med = (pick: (s: (typeof all)[number]) => number) => r4(median(all.map(pick)));
                const wins = all.map(s => r4(s.winRate));
                const p10s = all.map(s => r4(s.lowestVitaeFractionP10));
                cells.push({
                    ...at(spread, family.id),
                    winRate: med(s => s.winRate),
                    meanRounds: med(s => s.avgRounds),
                    lowestVitaeFractionMean: med(s => s.lowestVitaeFractionMean),
                    lowestVitaeFractionP10: med(s => s.lowestVitaeFractionP10),
                    playerHpTakenMean: med(s => s.playerHpTakenMean),
                    selfBurnMean: med(s => s.selfBurnMean),
                    winRateMin: Math.min(...wins), winRateMax: Math.max(...wins),
                    lowestVitaeFractionP10Min: Math.min(...p10s), lowestVitaeFractionP10Max: Math.max(...p10s),
                    runs, seed,
                });
            }
        }
    });

    const meanRate = (id: string) => {
        const rates = deadRates[id]!;
        return r4(rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0);
    };
    const deckReport: Record<string, MeasuredTruthDeck | MeasuredTruthFamily> = {};
    for (const deck of decks) deckReport[deck.id] = { worn: deck.worn, deckCards: deck.cards, deadCardRate: meanRate(deck.id) };
    for (const { family, pool, draws } of families) {
        deckReport[family.id] = {
            family: true, worn, laneIds: [...family.laneIds], poolSize: pool.length,
            drawSize: family.drawSize, draws, deadCardRate: meanRate(family.id),
        };
    }
    return {
        runs, seed, policy: 'greedy', spreads: [...MEASURED_SPREADS], cells, decks: deckReport,
        rewardLanes: rewardLanesByCharacter({ seed, ...options.rewardLanes }),
    };
}
