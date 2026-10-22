/**
 * Lane pacing table — a lane's test deck against the three Act 1 foes at
 * player levels 1, 3 and 5, under both pacing drivers
 * (`Combat/combat.pacing.sim.ts`), at live foe VITAE.
 *
 * Usage:
 *   npx ts-node --transpile-only src/CLI/lane-pacing.cli.ts
 *     [--lane=blood-price] [--runs=200] [--seed=1] [--hp=2] [--cap=N] [--no-mercy] [--json]
 *
 * `--cap=N` adds a human-like row capped at N cards a turn (a calibration
 * for a player who reads the hand slowly).
 *
 * Each foe is built the way live play builds it (`resolveEncounter`): the
 * library row scaled with `scaleEnemyToLevel` to its Act 1 map pin, then
 * the live VITAE multiplier. Pins per player level (the region the player
 * reaches at that level, `World/MapEvents/content.ts`):
 *
 *   player L1 → the Breakwater:     Float-Eye 2, Brine Hag 3, Death Beholder 1
 *   player L3 → the Beacon Crags:   Float-Eye 3, Brine Hag 3, Death Beholder 3
 *   player L5 → the Lantern Deep:   Float-Eye 4, Brine Hag 3, Death Beholder 4
 *
 * The player is the sim Player at the level, stats spent evenly, wearing the
 * starting relic.
 */

import { Player } from '../Character/characters.mock';
import type { Character } from '../Character/types';
import { calculateMaxHealth, deepClone } from '../Utils';
import { stageStats } from '../Game/act1-progression';
import { FloatEye, BrineHag, DeathBeholder } from '../Enemy/enemy.library';
import { scaleEnemyToLevel } from '../World/encounter';
import type { Enemy } from '../Enemy/types';
import { getCardLane } from '../Cards/card.lanes';
import { simulatePacing, LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER, type PacingPolicy } from '../Combat/combat.pacing.sim';

const LEVELS = [1, 3, 5] as const;
/** Act 1 map pin per foe per player level (see the header). */
const FOE_PIN: Record<string, Record<number, number>> = {
    [FloatEye.id]: { 1: 2, 3: 3, 5: 4 },
    [BrineHag.id]: { 1: 3, 3: 3, 5: 3 },
    [DeathBeholder.id]: { 1: 1, 3: 3, 5: 4 },
};
const POLICIES: { policy: PacingPolicy; cap?: number }[] = [{ policy: 'witness' }, { policy: 'human-like' }];

function arg(name: string, fallback: string): string {
    const hit = process.argv.find(a => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
}

/** The sim Player at `level`: stats spent evenly, VITAE recomputed, the worn relic's bonus kept. */
function playerAt(level: number, deck: readonly string[]): Character {
    const p = deepClone(Player);
    const relicBonus = Player.maxHealth - calculateMaxHealth(Player.level, Player.baseStats);
    p.level = level;
    p.baseStats = stageStats(level, 'even');
    p.maxHealth = calculateMaxHealth(level, p.baseStats) + relicBonus;
    p.health = p.maxHealth;
    p.knownCards = [...deck];
    return p;
}

/** The foe as live play builds it at its map pin for this player level. */
export function foeFor(base: Enemy, playerLevel: number): Enemy {
    const pin = FOE_PIN[base.id]?.[playerLevel] ?? base.level;
    return deepClone(scaleEnemyToLevel(base, pin));
}

function main(): void {
    const laneId = arg('lane', 'blood-price');
    const runs = Number(arg('runs', '200'));
    const startSeed = Number(arg('seed', '1'));
    const hp = Number(arg('hp', String(LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER)));
    const lane = getCardLane(laneId);
    if (!lane) {
        console.error(`No lane '${laneId}'.`);
        process.exitCode = 1;
        return;
    }
    const rows: Record<string, unknown>[] = [];
    const cap = Number(arg('cap', '0'));
    const drivers = cap > 0 ? [...POLICIES, { policy: 'human-like' as const, cap }] : POLICIES;
    for (const { policy, cap: maxPlaysPerTurn } of drivers) {
        for (const base of [FloatEye, BrineHag, DeathBeholder]) {
            for (const level of LEVELS) {
                const enemy = foeFor(base, level);
                const s = simulatePacing({
                    player: playerAt(level, lane.testDeck), enemy, deck: lane.testDeck,
                    policy, runs, startSeed, enemyHpMultiplier: hp, maxPlaysPerTurn,
                    mercy: !process.argv.includes('--no-mercy'),
                });
                rows.push({
                    policy: maxPlaysPerTurn ? `${policy} ≤${maxPlaysPerTurn}/turn` : policy, foe: base.name, level, foeLevel: enemy.level, foeVitae: Math.round(enemy.maxHealth * hp),
                    win: +(s.winRate * 100).toFixed(1), mercy: +(s.mercyRate * 100).toFixed(1), turns: +s.meanTurns.toFixed(2), turnsWon: +s.meanTurnsWon.toFixed(2),
                    vitaeLeft: +s.meanVitaeLeft.toFixed(1), sacrifices: +s.meanSacrifices.toFixed(1),
                    leechPeak: +s.meanLeechPeak.toFixed(1), leechMax: s.maxLeechPeak,
                });
            }
        }
    }
    if (process.argv.includes('--json')) {
        console.log(JSON.stringify(rows, null, 1));
        return;
    }
    console.log(`${lane.name} test deck · ${runs} runs/cell · foe VITAE ×${hp}`);
    console.table(rows);
}

if (require.main === module) main();
