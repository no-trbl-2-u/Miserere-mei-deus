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
 */

import { createCharacter } from '../Character';
import { getCardLane } from '../Cards/card.lanes';
import { nextUpgradeId } from '../Cards/card-upgrades';
import { ENEMY_REGISTRY, type EnemySlug } from '../Enemy/enemy.library';
import { scaleEnemyToLevel } from '../World/encounter';
import {
    act1FightLedger, stageStats, walkAct1, type Act1Fight, type StatSpread,
} from '../Game/act1-progression';
import { simulateHazardPatternCombatDetailed } from './combat.encounter.sim';

/** The lanes whose test decks are measured, by lane id. */
export const MEASURED_DECK_LANES: readonly string[] = ['grey', 'blood-price'];

/** The lanes also measured with half their test deck upgraded once. */
export const MEASURED_HALF_UPGRADED_LANES: readonly string[] = ['blood-price'];

/** The suffix on a half-upgraded deck's id: `blood-price+half`. */
export const HALF_UPGRADED_DECK_SUFFIX = '+half';

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
    runs: number;
    seed: number;
}

/** One measured deck. */
export interface MeasuredTruthDeck {
    /** The deck's card ids, copies kept. */
    deckCards: string[];
    /** Mean over the deck's cells of the share of its distinct cards that
     *  never got played in that cell (1 − deck utilization). */
    deadCardRate: number;
}

/** The whole report `npm run measured-truth -- --json` prints. */
export interface MeasuredTruthReport {
    runs: number;
    seed: number;
    policy: 'greedy';
    spreads: StatSpread[];
    cells: MeasuredTruthCell[];
    decks: Record<string, MeasuredTruthDeck>;
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
    /** The fights to walk (default the full Act 1 ledger). */
    fights?: readonly Act1Fight[];
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

/** The enemy level a fight stages against a player at `playerLevel`. */
function fightEnemyLevel(fight: Act1Fight, playerLevel: number): number {
    return fight.level ?? Math.max(ENEMY_REGISTRY[fight.enemySlug].level, playerLevel);
}

/**
 * Measures every cell.
 *
 * @param options - runs, seed, the lanes and the fights to measure.
 * @returns The report: one cell per fight × spread × deck, in ledger order.
 * @throws When a lane id names no registered lane.
 * @example measuredTruthCells({ runs: 5 }).cells.length // ledger × 3 × 3
 */
export function measuredTruthCells(options: MeasuredTruthOptions = {}): MeasuredTruthReport {
    const runs = options.runs ?? 300;
    const seed = options.seed ?? 1;
    const fights = options.fights ?? act1FightLedger();
    const laneIds = options.deckLanes ?? MEASURED_DECK_LANES;
    const decks = laneIds.map(id => {
        const lane = getCardLane(id);
        if (!lane) throw new Error(`measuredTruthCells: no card lane '${id}'`);
        return { id, cards: [...lane.testDeck] };
    });
    for (const id of options.halfUpgradedLanes ?? MEASURED_HALF_UPGRADED_LANES) {
        const lane = getCardLane(id);
        if (!lane) throw new Error(`measuredTruthCells: no card lane '${id}'`);
        decks.push({ id: `${id}${HALF_UPGRADED_DECK_SUFFIX}`, cards: halfUpgradedDeck(lane.testDeck) });
    }
    const { fightLevels } = walkAct1(fights);
    const seen = new Map<string, number>();
    const cells: MeasuredTruthCell[] = [];
    const deadRates: Record<string, number[]> = Object.fromEntries(decks.map(d => [d.id, []]));

    fights.forEach((fight, i) => {
        const base = `${fight.nodeId}/${fight.enemySlug}`;
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        const key = n === 1 ? base : `${base}#${n}`;
        const playerLevel = fightLevels[i]!;
        const enemyLevel = fightEnemyLevel(fight, playerLevel);
        const enemy = scaleEnemyToLevel(ENEMY_REGISTRY[fight.enemySlug], enemyLevel);
        for (const spread of MEASURED_SPREADS) {
            for (const deck of decks) {
                const player = createCharacter({
                    name: 'Measured', level: playerLevel,
                    baseStats: stageStats(playerLevel, spread), knownCards: [...new Set(deck.cards)],
                });
                const { stats } = simulateHazardPatternCombatDetailed({
                    player, enemy, runs, startSeed: seed, policy: 'greedy', deck: deck.cards,
                });
                deadRates[deck.id]!.push(1 - stats.deckUtilization);
                cells.push({
                    fight: key, map: fight.map, nodeId: fight.nodeId, enemySlug: fight.enemySlug,
                    isBoss: fight.isBoss, playerLevel, enemyLevel, spread, deck: deck.id,
                    winRate: r4(stats.winRate),
                    meanRounds: r4(stats.avgRounds),
                    lowestVitaeFractionMean: r4(stats.lowestVitaeFractionMean),
                    lowestVitaeFractionP10: r4(stats.lowestVitaeFractionP10),
                    playerHpTakenMean: r4(stats.playerHpTakenMean),
                    runs, seed,
                });
            }
        }
    });

    const deckReport: Record<string, MeasuredTruthDeck> = {};
    for (const deck of decks) {
        const rates = deadRates[deck.id]!;
        deckReport[deck.id] = {
            deckCards: deck.cards,
            deadCardRate: r4(rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0),
        };
    }
    return { runs, seed, policy: 'greedy', spreads: [...MEASURED_SPREADS], cells, decks: deckReport };
}
