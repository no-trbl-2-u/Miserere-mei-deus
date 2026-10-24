/**
 * ELEMENTALIST SANDBOX SIM (branch sandbox/elementalist-sims only; never merged).
 *
 * Step 6 of the lane-creator flow (`docs/lane-creator.md`): the 30 kept
 * Elementalist cards measured against the Act 1 ledger exactly as the
 * measured-truth report measures a lane (`Combat/combat.measured-truth.ts`):
 * every ledger fight, the player at the level a full clear brings to it, the
 * three stat spreads, the greedy witness, win rate and lowest-VITAE p10. On
 * top it reads the weather's own telemetry (INFERNO self-damage and
 * self-kills, FROZEN, the foe's losses to each element) and each card's play
 * rate.
 *
 * Usage:
 *   npx ts-node --transpile-only src/CLI/elementalist-sim.cli.ts
 *     [--numbers=voted|adjusted] [--decks=test,full] [--runs=300] [--seed=1]
 *     [--baseline] [--out=sandbox-results/elementalist/<numbers>.json]
 *
 * `--baseline` also measures the grey and Blood Price test decks on this
 * branch, to show the sandbox engine changes leave them as the report reads.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createCharacter } from '../Character';
import { getCardById } from '../Cards/cards.library';
import { ENEMY_REGISTRY } from '../Enemy/enemy.library';
import { scaleEnemyToLevel } from '../World/encounter';
import { act1FightLedger, stageStats, walkAct1, type Act1Fight } from '../Game/act1-progression';
import { simulateHazardPatternCombatDetailed, type CombatCardUsage } from '../Combat/combat.encounter.sim';
import { MEASURED_SPREADS, measuredTruthCells } from '../Combat/combat.measured-truth';
import { ELEMENT_TELEMETRY, resetElementTelemetry } from '../Combat/combat.elements';
import {
    AS_VOTED, ELEMENTALIST_SLOTS, elementalistFullDeck, elementalistId, elementalistTestDeck,
    registerElementalistCards, type ElementalistNumbers,
} from '../Cards/sandbox/elementalist.cards';
import { SIM_ADJUSTMENTS } from '../Cards/sandbox/elementalist.adjustments';

const argv = process.argv.slice(2);
const flag = (k: string, fallback: string): string => argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? fallback;
const RUNS = Number(flag('runs', '300'));
const SEED = Number(flag('seed', '1'));
const NUMBERS = flag('numbers', 'voted');
const DECKS = flag('decks', 'test,full').split(',');
const BASELINE = argv.includes('--baseline');
const OUT = flag('out', `sandbox-results/elementalist/${path.basename(NUMBERS, '.json')}.json`);

/** A tuning aid: every DEAL, INFERNO and STORM number times `--scale-offence` (rounded, at least 1). */
const SCALE_OFFENCE = Number(flag('scale-offence', '1'));

function numbersTable(): ElementalistNumbers {
    const t = baseTable();
    if (SCALE_OFFENCE === 1) return t;
    for (const k of Object.keys(t)) if (/\.(deal|inferno|storm)$/.test(k)) t[k] = Math.max(1, Math.round(t[k]! * SCALE_OFFENCE));
    return t;
}

function baseTable(): ElementalistNumbers {
    if (NUMBERS === 'voted') return { ...AS_VOTED };
    if (NUMBERS === 'adjusted') {
        const t: ElementalistNumbers = { ...AS_VOTED };
        for (const a of SIM_ADJUSTMENTS) t[a.key] = a.after;
        return t;
    }
    if (NUMBERS.endsWith('.json')) return { ...AS_VOTED, ...JSON.parse(fs.readFileSync(NUMBERS, 'utf8')) };
    throw new Error(`--numbers must be voted, adjusted or a .json overrides file, not ${NUMBERS}`);
}

interface Cell {
    fight: string; enemySlug: string; isBoss: boolean; playerLevel: number; enemyLevel: number;
    spread: string; deck: string; winRate: number; meanRounds: number; p10: number; lowestMean: number;
    selfBurnMean: number; selfKillRate: number; foeTurns: number; frozenRate: number; frozenDoublesMean: number;
    foeInfernoLossMean: number; foeStormLossMean: number; blizzardPreventedMean: number; playerHpTakenMean: number;
}

function r4(x: number): number { return Math.round(x * 10000) / 10000; }

function fightEnemyLevel(fight: Act1Fight, playerLevel: number): number {
    return fight.level ?? Math.max(ENEMY_REGISTRY[fight.enemySlug].level, playerLevel);
}

function main(): void {
    registerElementalistCards(numbersTable());
    const decks: { id: string; cards: string[] }[] = [];
    if (DECKS.includes('test')) decks.push({ id: 'elementalist', cards: elementalistTestDeck() });
    if (DECKS.includes('full')) decks.push({ id: 'elementalist-30', cards: elementalistFullDeck() });

    const fights = act1FightLedger();
    const { fightLevels } = walkAct1(fights);
    const seen = new Map<string, number>();
    const cells: Cell[] = [];
    const usage: Record<string, Record<string, CombatCardUsage>> = Object.fromEntries(decks.map(d => [d.id, {}]));
    const t0 = Date.now();

    fights.forEach((fight, i) => {
        const base = `${fight.nodeId}/${fight.enemySlug}`;
        const k = (seen.get(base) ?? 0) + 1;
        seen.set(base, k);
        const key = k === 1 ? base : `${base}#${k}`;
        const playerLevel = fightLevels[i]!;
        const enemyLevel = fightEnemyLevel(fight, playerLevel);
        const enemy = scaleEnemyToLevel(ENEMY_REGISTRY[fight.enemySlug], enemyLevel);
        for (const spread of MEASURED_SPREADS) {
            for (const deck of decks) {
                const player = createCharacter({
                    name: 'Measured', level: playerLevel,
                    baseStats: stageStats(playerLevel, spread), knownCards: [...new Set(deck.cards)],
                });
                resetElementTelemetry();
                const { stats, cardUsage } = simulateHazardPatternCombatDetailed({
                    player, enemy, runs: RUNS, startSeed: SEED, policy: 'greedy', deck: deck.cards,
                });
                const t = { ...ELEMENT_TELEMETRY };
                cells.push({
                    fight: key, enemySlug: fight.enemySlug, isBoss: fight.isBoss, playerLevel, enemyLevel,
                    spread, deck: deck.id,
                    winRate: r4(stats.winRate), meanRounds: r4(stats.avgRounds),
                    p10: r4(stats.lowestVitaeFractionP10), lowestMean: r4(stats.lowestVitaeFractionMean),
                    selfBurnMean: r4(t.selfBurn / RUNS), selfKillRate: r4(t.selfKills / RUNS),
                    foeTurns: t.foeTurns, frozenRate: r4(t.foeTurns ? t.frozenTriggers / t.foeTurns : 0),
                    frozenDoublesMean: r4(t.frozenDoubles / RUNS),
                    foeInfernoLossMean: r4(t.foeInfernoLoss / RUNS), foeStormLossMean: r4(t.foeStormLoss / RUNS),
                    blizzardPreventedMean: r4(t.blizzardPrevented / RUNS),
                    playerHpTakenMean: r4(stats.playerHpTakenMean),
                });
                const agg = usage[deck.id]!;
                for (const row of Object.values(cardUsage)) {
                    const a = agg[row.cardId] ?? (agg[row.cardId] = {
                        cardId: row.cardId, plays: 0, bottomPlays: 0, topPlays: 0, statusLands: 0, discards: 0,
                        drawsSeen: 0, runsDrawn: 0,
                    });
                    a.plays += row.plays; a.bottomPlays += row.bottomPlays; a.topPlays += row.topPlays;
                    a.drawsSeen = (a.drawsSeen ?? 0) + (row.drawsSeen ?? 0);
                    a.runsDrawn = (a.runsDrawn ?? 0) + (row.runsDrawn ?? 0);
                    a.unplayedAtPhaseEnd = (a.unplayedAtPhaseEnd ?? 0) + (row.unplayedAtPhaseEnd ?? 0);
                    const lc = a.lineContribution ?? (a.lineContribution = { free: 0, paid: 0 });
                    lc.free += row.lineContribution?.free ?? 0;
                    lc.paid += row.lineContribution?.paid ?? 0;
                }
            }
        }
        process.stderr.write(`elementalist-sim: ${key} done (${Math.round((Date.now() - t0) / 1000)}s)\n`);
    });

    const cardRows: Record<string, unknown[]> = {};
    const cellsPerDeck = cells.length / Math.max(1, decks.length);
    for (const deck of decks) {
        cardRows[deck.id] = deck.cards.map(id => {
            const slot = ELEMENTALIST_SLOTS.find(s => elementalistId(s) === id)!;
            const u = usage[deck.id]![id];
            const draws = u?.drawsSeen ?? 0;
            return {
                slot, id, colour: getCardById(id)?.color,
                draws, paidPlays: u?.bottomPlays ?? 0, freePlays: u?.topPlays ?? 0,
                paidPerDraw: r4(draws ? (u?.bottomPlays ?? 0) / draws : 0),
                freePerDraw: r4(draws ? (u?.topPlays ?? 0) / draws : 0),
                heldAtPhaseEnd: u?.unplayedAtPhaseEnd ?? 0,
                // Foe VITAE the card's lines took right away (DEAL, plain loss), per fight.
                freeDamagePerFight: r4((u?.lineContribution?.free ?? 0) / (RUNS * cellsPerDeck)),
                paidDamagePerFight: r4((u?.lineContribution?.paid ?? 0) / (RUNS * cellsPerDeck)),
            };
        });
    }

    let baseline: unknown = null;
    if (BASELINE) {
        process.stderr.write('elementalist-sim: measuring grey and Blood Price on this branch\n');
        const report = measuredTruthCells({ runs: RUNS, seed: SEED, deckLanes: ['grey', 'blood-price'], halfUpgradedLanes: [] });
        baseline = report.cells.map(c => ({
            fight: c.fight, spread: c.spread, deck: c.deck, winRate: c.winRate,
            meanRounds: c.meanRounds, p10: c.lowestVitaeFractionP10,
        }));
    }

    const out = { numbers: NUMBERS, runs: RUNS, seed: SEED, table: numbersTable(), cells, cards: cardRows, baseline };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
    process.stderr.write(`elementalist-sim: wrote ${OUT} (${Math.round((Date.now() - t0) / 1000)}s)\n`);
}

main();
