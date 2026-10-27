/**
 * DEFENDER SANDBOX SIM (branch sandbox/defender-sims only; never merged).
 *
 * Step 6 of the lane-creator flow (`docs/lane-creator.md`): the 30 kept
 * Defender cards measured against the Act 1 ledger exactly as the
 * measured-truth report measures a lane (`Combat/combat.measured-truth.ts`):
 * every ledger fight, the player at the level a full clear brings to it, the
 * three stat spreads, 300 seeded runs a cell, win rate and lowest-VITAE p10.
 * On top it reads the spikes' own telemetry (`Combat/combat.defender.ts`):
 * the foe's VITAE to THORNS, REFLECT and DEAL, what VULNERABLE added, each
 * fight's highest THORNS and REFLECT, the discard lines' payability, and each
 * card's play rate.
 *
 * Usage:
 *   npx ts-node --transpile-only src/CLI/defender-sim.cli.ts
 *     [--numbers=voted|<overrides>.json] [--decks=test,full] [--runs=300] [--seed=1]
 *     [--witness=value|plain] [--baseline] [--out=sandbox-results/defender/<name>.json]
 *
 * `--baseline` also measures grey, Blood Price and the Elementalist on this
 * branch, to show the sandbox engine changes leave them as the report reads.
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
import { DEFENDER_TELEMETRY, DEFENDER_WITNESS, resetDefenderTelemetry } from '../Combat/combat.defender';
import {
    AS_VOTED, DEFENDER_SLOTS, defenderColour, defenderFullDeck, defenderId, defenderTestDeck,
    registerDefenderCards, type DefenderNumbers,
} from '../Cards/sandbox/defender.cards';

const argv = process.argv.slice(2);
const flag = (k: string, fallback: string): string => argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? fallback;
const RUNS = Number(flag('runs', '300'));
const SEED = Number(flag('seed', '1'));
const NUMBERS = flag('numbers', 'voted');
const DECKS = flag('decks', 'test,full').split(',');
const WITNESS = flag('witness', 'value');
const BASELINE = argv.includes('--baseline');
const FIGHTS = flag('fights', '');
const OUT = flag('out', `sandbox-results/defender/${path.basename(NUMBERS, '.json')}-${WITNESS}.json`);

function numbersTable(): DefenderNumbers {
    if (NUMBERS === 'voted') return { ...AS_VOTED };
    if (NUMBERS.endsWith('.json')) return { ...AS_VOTED, ...JSON.parse(fs.readFileSync(NUMBERS, 'utf8')) };
    throw new Error(`--numbers must be voted or a .json overrides file, not ${NUMBERS}`);
}

function r4(x: number): number { return Math.round(x * 10000) / 10000; }

function fightEnemyLevel(fight: Act1Fight, playerLevel: number): number {
    return fight.level ?? Math.max(ENEMY_REGISTRY[fight.enemySlug].level, playerLevel);
}

function main(): void {
    registerDefenderCards(numbersTable());
    DEFENDER_WITNESS.on = WITNESS !== 'plain';
    const decks: { id: string; cards: string[] }[] = [];
    if (DECKS.includes('test')) decks.push({ id: 'defender', cards: defenderTestDeck() });
    if (DECKS.includes('full')) decks.push({ id: 'defender-30', cards: defenderFullDeck() });
    const custom = flag('deck', '');
    if (custom) {
        decks.length = 0;
        decks.push({ id: flag('deck-id', 'defender-custom'), cards: custom.split(',').map(defenderId) });
    }

    const allFights = act1FightLedger();
    const { fightLevels } = walkAct1(allFights);
    const seen = new Map<string, number>();
    const cells: Record<string, unknown>[] = [];
    const usage: Record<string, Record<string, CombatCardUsage>> = Object.fromEntries(decks.map(d => [d.id, {}]));
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
        for (const spread of MEASURED_SPREADS) {
            cellsPerDeck++;
            for (const deck of decks) {
                const player = createCharacter({
                    name: 'Measured', level: playerLevel,
                    baseStats: stageStats(playerLevel, spread), knownCards: [...new Set(deck.cards)],
                });
                resetDefenderTelemetry();
                const { stats, cardUsage } = simulateHazardPatternCombatDetailed({
                    player, enemy, runs: RUNS, startSeed: SEED, policy: 'greedy', deck: deck.cards,
                });
                const t = DEFENDER_TELEMETRY;
                const per = (x: number) => r4(x / RUNS);
                cells.push({
                    fight: key, enemySlug: fight.enemySlug, isBoss: fight.isBoss, playerLevel, enemyLevel,
                    spread, deck: deck.id,
                    winRate: r4(stats.winRate), meanRounds: r4(stats.avgRounds),
                    p10: r4(stats.lowestVitaeFractionP10), lowestMean: r4(stats.lowestVitaeFractionMean),
                    playerHpTakenMean: r4(stats.playerHpTakenMean), maxVitae: player.maxHealth ?? null,
                    enemyMaxVitae: enemy.maxHealth,
                    thornsMean: per(t.thornsDamage), reflectMean: per(t.reflectDamage), dealMean: per(t.dealDamage),
                    vulnExtraMean: per(t.vulnExtra), selfLossMean: per(t.selfLoss),
                    strikesMean: per(t.strikes), thornsTriggersMean: per(t.thornsTriggers),
                    reflectTriggersMean: per(t.reflectTriggers), thornsDoubledMean: per(t.thornsDoubled),
                    thornsPeakP50: percentile(t.thornsPeaks, 0.5), thornsPeakP90: percentile(t.thornsPeaks, 0.9),
                    thornsPeakMax: Math.max(0, ...t.thornsPeaks),
                    reflectPeakP50: percentile(t.reflectPeaks, 0.5), reflectPeakP90: percentile(t.reflectPeaks, 0.9),
                    reflectPeakMax: Math.max(0, ...t.reflectPeaks),
                    discardChances: t.discardChances, discardUnpayable: t.discardUnpayable,
                    discardTurnStartChecks: t.discardTurnStartChecks, discardTurnStartUnpayable: t.discardTurnStartUnpayable,
                    cardsDiscardedMean: per(t.cardsDiscarded), m09TriggersMean: per(t.m09Triggers),
                    retrievesMean: per(t.retrieves), unexilesMean: per(t.unexiles),
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
        process.stderr.write(`defender-sim: ${key} done (${Math.round((Date.now() - t0) / 1000)}s)\n`);
    });

    const cardRows: Record<string, unknown[]> = {};
    for (const deck of decks) {
        cardRows[deck.id] = deck.cards.map(id => {
            const slot = DEFENDER_SLOTS.find(s => defenderId(s) === id)!;
            const u = usage[deck.id]![id];
            const draws = u?.drawsSeen ?? 0;
            return {
                slot, id, colour: defenderColour(slot), type: getCardById(id)?.cardType,
                draws, paidPlays: u?.bottomPlays ?? 0, freePlays: u?.topPlays ?? 0,
                paidPerDraw: r4(draws ? (u?.bottomPlays ?? 0) / draws : 0),
                freePerDraw: r4(draws ? (u?.topPlays ?? 0) / draws : 0),
                heldAtPhaseEnd: u?.unplayedAtPhaseEnd ?? 0,
                freeSwingPerFight: r4((u?.lineContribution?.free ?? 0) / (RUNS * cellsPerDeck)),
                paidSwingPerFight: r4((u?.lineContribution?.paid ?? 0) / (RUNS * cellsPerDeck)),
            };
        });
    }

    let baseline: unknown = null;
    if (BASELINE) {
        process.stderr.write('defender-sim: measuring grey, Blood Price and the Elementalist on this branch\n');
        const report = measuredTruthCells({
            runs: RUNS, seed: SEED, deckLanes: ['grey', 'blood-price', 'elementalist'], halfUpgradedLanes: [], sampledFamilies: [],
        });
        baseline = report.cells.map(c => ({
            fight: c.fight, spread: c.spread, deck: c.deck, winRate: c.winRate,
            meanRounds: c.meanRounds, p10: c.lowestVitaeFractionP10, playerHpTakenMean: c.playerHpTakenMean,
        }));
    }

    const out = { numbers: NUMBERS, witness: WITNESS, runs: RUNS, seed: SEED, table: numbersTable(), cells, cards: cardRows, baseline };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
    process.stderr.write(`defender-sim: wrote ${OUT} (${Math.round((Date.now() - t0) / 1000)}s)\n`);
}

main();
