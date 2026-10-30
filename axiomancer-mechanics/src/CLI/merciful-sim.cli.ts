/**
 * MERCIFUL SANDBOX SIM (branch sandbox/merciful-sims only; never merged).
 *
 * Step 6 of the lane-creator flow (`docs/lane-creator.md`): the 29 kept
 * Merciful cards measured against the Act 1 ledger exactly as the
 * measured-truth report measures a lane (`Combat/combat.measured-truth.ts`):
 * every ledger fight, the player at the level a full clear brings to it, the
 * three stat spreads, 300 seeded runs a cell, win rate and lowest-VITAE p10.
 * On top it reads the lane's own telemetry (`Combat/combat.merciful.ts`): the
 * foe's VITAE to plain DEAL, RADIANCE and MERCY bursts, the bursts' sizes,
 * fights that end before MERCY bursts, RADIANCE's whiffs, the runaway lines,
 * and each card's play rate.
 *
 * Usage:
 *   npx ts-node --transpile-only src/CLI/merciful-sim.cli.ts
 *     [--numbers=voted|<overrides>.json] [--decks=test,full] [--runs=300] [--seed=1]
 *     [--witness=value|plain] [--baseline] [--fights=<key,...>] [--deck=<keys>] [--deck-id=<id>]
 *     [--out=sandbox-results/merciful/<name>.json]
 *
 * `--baseline` also measures grey, Blood Price, the Elementalist and the
 * Defender on this branch, to show the sandbox engine changes leave them as
 * the report (and main) reads.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createCharacter } from '../Character';
import { getCardById } from '../Cards/cards.library';
import { ENEMY_REGISTRY } from '../Enemy/enemy.library';
import { scaleEnemyToLevel } from '../World/encounter';
import { act1FightLedger, stageStats, walkAct1, type Act1Fight } from '../Game/act1-progression';
import { simulateHazardPatternCombatDetailed, percentile, type CombatCardUsage } from '../Combat/combat.encounter.sim';
import { MEASURED_SPREADS, measuredTruthCells } from '../Combat/combat.measured-truth';
import { MERCIFUL_TELEMETRY, MERCIFUL_WITNESS, resetMercifulTelemetry } from '../Combat/combat.merciful';
import {
    AS_VOTED, MERCIFUL_KEYS, mercifulColour, mercifulFullDeck, mercifulId, mercifulTestDeck,
    registerMercifulCards, type MercifulNumbers,
} from '../Cards/sandbox/merciful.cards';

const argv = process.argv.slice(2);
const flag = (k: string, fallback: string): string => argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? fallback;
const RUNS = Number(flag('runs', '300'));
const SEED = Number(flag('seed', '1'));
const NUMBERS = flag('numbers', 'voted');
const DECKS = flag('decks', 'test,full').split(',');
const WITNESS = flag('witness', 'value');
const BASELINE = argv.includes('--baseline');
const FIGHTS = flag('fights', '');
const OUT = flag('out', `sandbox-results/merciful/${path.basename(NUMBERS, '.json')}-${WITNESS}.json`);

function numbersTable(): MercifulNumbers {
    if (NUMBERS === 'voted') return { ...AS_VOTED };
    if (NUMBERS.endsWith('.json')) return { ...AS_VOTED, ...JSON.parse(fs.readFileSync(NUMBERS, 'utf8')) };
    throw new Error(`--numbers must be voted or a .json overrides file, not ${NUMBERS}`);
}

function r4(x: number): number { return Math.round(x * 10000) / 10000; }

function fightEnemyLevel(fight: Act1Fight, playerLevel: number): number {
    return fight.level ?? Math.max(ENEMY_REGISTRY[fight.enemySlug].level, playerLevel);
}

/** median / p90 / max / count of a list. */
function spread(xs: readonly number[]): { p50: number; p90: number; max: number; n: number } {
    return { p50: percentile(xs, 0.5), p90: percentile(xs, 0.9), max: xs.length ? Math.max(...xs) : 0, n: xs.length };
}

function main(): void {
    registerMercifulCards(numbersTable());
    MERCIFUL_WITNESS.on = WITNESS !== 'plain';
    const decks: { id: string; cards: string[] }[] = [];
    if (DECKS.includes('test')) decks.push({ id: 'merciful-test', cards: mercifulTestDeck() });
    if (DECKS.includes('full')) decks.push({ id: 'merciful-29', cards: mercifulFullDeck() });
    const custom = flag('deck', '');
    if (custom) {
        decks.length = 0;
        decks.push({ id: flag('deck-id', 'merciful-custom'), cards: custom.split(',').map(mercifulId) });
    }

    const allFights = act1FightLedger();
    const { fightLevels } = walkAct1(allFights);
    const seen = new Map<string, number>();
    const cells: Record<string, unknown>[] = [];
    const usage: Record<string, Record<string, CombatCardUsage>> = Object.fromEntries(decks.map(d => [d.id, {}]));
    // Raw lists per deck and foe, so the per-foe percentiles are exact.
    const raw: Record<string, { bursts: number[]; totals: number[]; peaks: number[]; runaways: Record<string, number[]> }> = {};
    const t0 = Date.now();
    let cellsPerDeck = 0;

    allFights.forEach((fight, i) => {
        const base = `${fight.nodeId}/${fight.enemySlug}`;
        const k = (seen.get(base) ?? 0) + 1;
        seen.set(base, k);
        const key = k === 1 ? base : `${base}#${k}`;
        if (FIGHTS && !FIGHTS.split(',').includes(key)) return;
        const playerLevel = fightLevels[i]!;
        const enemyLevel = fightEnemyLevel(fight, playerLevel);
        const enemy = scaleEnemyToLevel(ENEMY_REGISTRY[fight.enemySlug], enemyLevel);
        for (const sp of MEASURED_SPREADS) {
            cellsPerDeck++;
            for (const deck of decks) {
                const player = createCharacter({
                    name: 'Measured', level: playerLevel,
                    baseStats: stageStats(playerLevel, sp), knownCards: [...new Set(deck.cards)],
                });
                resetMercifulTelemetry();
                const { stats, cardUsage } = simulateHazardPatternCombatDetailed({
                    player, enemy, runs: RUNS, startSeed: SEED, policy: 'greedy', deck: deck.cards,
                });
                const t = MERCIFUL_TELEMETRY;
                const per = (x: number) => r4(x / RUNS);
                const g = raw[`${deck.id}|${fight.enemySlug}`] ??= { bursts: [], totals: [], peaks: [], runaways: {} };
                g.bursts.push(...t.burstSizes);
                g.totals.push(...t.burstTotals);
                g.peaks.push(...t.mercyPeaks);
                for (const [rk, xs] of Object.entries(t.runaways)) (g.runaways[rk] ??= []).push(...xs);
                const known = t.dealPlain + t.radianceDeal + t.burstDeal + t.leech;
                cells.push({
                    fight: key, enemySlug: fight.enemySlug, isBoss: fight.isBoss, playerLevel, enemyLevel,
                    spread: sp, deck: deck.id,
                    winRate: r4(stats.winRate), meanRounds: r4(stats.avgRounds),
                    p10: r4(stats.lowestVitaeFractionP10), lowestMean: r4(stats.lowestVitaeFractionMean),
                    playerHpTakenMean: r4(stats.playerHpTakenMean), maxVitae: player.maxHealth ?? null,
                    enemyMaxVitae: enemy.maxHealth, heart: player.baseStats.heart,
                    foeTakenMean: per(t.foeTaken), dealMean: per(t.dealPlain), radianceMean: per(t.radianceDeal),
                    burstMean: per(t.burstDeal), leechMean: per(t.leech), otherMean: per(Math.max(0, t.foeTaken - known)),
                    foeHealedByMercyMean: per(t.foeHealedByMercy), overhealMean: per(t.overhealToMercy),
                    vulnExtraMean: per(t.vulnExtra),
                    radianceCountMean: per(t.radianceCount), radianceTriedMean: per(t.radianceTried),
                    radianceHealedMean: per(t.radianceHealed), radianceWhiffsMean: per(t.radianceWhiffs),
                    convertedHealsMean: per(t.convertedHeals),
                    burstsMean: per(t.burstSizes.length), burstsOnClockMean: per(t.burstsOnClock), burstsEarlyMean: per(t.burstsEarly),
                    burst: spread(t.burstSizes), burstTotal: spread(t.burstTotals),
                    fightsWithMercy: t.fightsWithMercy, fightsEndedBeforeBurst: t.fightsEndedBeforeBurst,
                    fightsEndedWithMercyOn: t.fightsEndedWithMercyOn,
                    mercyPeak: spread(t.mercyPeaks),
                    sacrificedMean: per(t.sacrificed), healedMean: per(t.healed),
                    attackLessenedMean: per(t.attackLessened), returnedMean: per(t.returned),
                    debuffsClearedMean: per(t.debuffsCleared), maxVitaeAddedMean: per(t.maxVitaeAdded),
                });
                const agg = usage[deck.id]!;
                for (const row of Object.values(cardUsage)) {
                    const a = agg[row.cardId] ?? (agg[row.cardId] = {
                        cardId: row.cardId, plays: 0, bottomPlays: 0, topPlays: 0, statusLands: 0, discards: 0,
                        drawsSeen: 0, runsDrawn: 0, unplayedAtPhaseEnd: 0, lineContribution: { free: 0, paid: 0 },
                    });
                    a.plays += row.plays; a.bottomPlays += row.bottomPlays; a.topPlays += row.topPlays;
                    a.drawsSeen = (a.drawsSeen ?? 0) + (row.drawsSeen ?? 0);
                    a.runsDrawn = (a.runsDrawn ?? 0) + (row.runsDrawn ?? 0);
                    a.unplayedAtPhaseEnd = (a.unplayedAtPhaseEnd ?? 0) + (row.unplayedAtPhaseEnd ?? 0);
                    a.lineContribution!.free += row.lineContribution?.free ?? 0;
                    a.lineContribution!.paid += row.lineContribution?.paid ?? 0;
                }
            }
        }
        process.stderr.write(`merciful-sim: ${key} done (${Math.round((Date.now() - t0) / 1000)}s)\n`);
    });

    const cardRows: Record<string, unknown[]> = {};
    for (const deck of decks) {
        cardRows[deck.id] = deck.cards.map(id => {
            const key = MERCIFUL_KEYS.find(k => mercifulId(k) === id)!;
            const u = usage[deck.id]![id];
            const draws = u?.drawsSeen ?? 0;
            return {
                key, id, colour: mercifulColour(key), type: getCardById(id)?.cardType,
                draws, paidPlays: u?.bottomPlays ?? 0, freePlays: u?.topPlays ?? 0,
                paidPerDraw: r4(draws ? (u?.bottomPlays ?? 0) / draws : 0),
                freePerDraw: r4(draws ? (u?.topPlays ?? 0) / draws : 0),
                heldAtPhaseEnd: u?.unplayedAtPhaseEnd ?? 0,
                freeSwingPerFight: r4((u?.lineContribution?.free ?? 0) / (RUNS * cellsPerDeck)),
                paidSwingPerFight: r4((u?.lineContribution?.paid ?? 0) / (RUNS * cellsPerDeck)),
            };
        });
    }

    const groups = Object.fromEntries(Object.entries(raw).map(([gk, g]) => [gk, {
        burst: spread(g.bursts), burstTotal: spread(g.totals), mercyPeak: spread(g.peaks),
        runaways: Object.fromEntries(Object.entries(g.runaways).map(([rk, xs]) => [rk, spread(xs)])),
    }]));
    const runawaysByDeck: Record<string, Record<string, ReturnType<typeof spread>>> = {};
    for (const deck of decks) {
        const all: Record<string, number[]> = {};
        for (const [gk, g] of Object.entries(raw)) {
            if (!gk.startsWith(`${deck.id}|`)) continue;
            for (const [rk, xs] of Object.entries(g.runaways)) (all[rk] ??= []).push(...xs);
        }
        runawaysByDeck[deck.id] = Object.fromEntries(Object.entries(all).map(([rk, xs]) => [rk, spread(xs)]));
    }

    let baseline: unknown = null;
    if (BASELINE) {
        process.stderr.write('merciful-sim: measuring grey, Blood Price, the Elementalist and the Defender on this branch\n');
        const report = measuredTruthCells({
            runs: RUNS, seed: SEED, deckLanes: ['grey', 'blood-price', 'elementalist', 'defender'],
            halfUpgradedLanes: [], sampledFamilies: [],
        });
        baseline = report.cells.map(c => ({
            fight: c.fight, enemySlug: c.enemySlug, spread: c.spread, deck: c.deck, winRate: c.winRate,
            meanRounds: c.meanRounds, p10: c.lowestVitaeFractionP10, playerHpTakenMean: c.playerHpTakenMean,
        }));
    }

    const out = {
        numbers: NUMBERS, witness: WITNESS, runs: RUNS, seed: SEED, table: numbersTable(),
        cells, cards: cardRows, groups, runaways: runawaysByDeck, baseline,
    };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
    process.stderr.write(`merciful-sim: wrote ${OUT} (${Math.round((Date.now() - t0) / 1000)}s)\n`);
}

main();
