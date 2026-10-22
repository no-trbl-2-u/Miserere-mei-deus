/**
 * Engine speed bench for the weekly performance audit.
 *
 * Times `simulateHazardPatternCombat` against each enemy in the combat-sim
 * roster with the grey deck: 20 warm-up combats, then 100 timed combats per
 * enemy, seeds counting up from 1. Prints one JSON object to stdout and
 * nothing else, so `scripts/perf-audit.mjs` can parse it.
 *
 * Usage:
 *   npm run perf-bench --workspace axiomancer-mechanics
 *   npm run perf-bench --workspace axiomancer-mechanics -- --runs=100 --warmup=20
 *
 * Output:
 *   { "engineMsPerCombat": { "FloatEye": 1.2, "BrineHag": 1.4, "DeathBeholder": 2.1, "all": 1.6 } }
 */

import { performance } from 'node:perf_hooks';
import { Player } from '../Character/characters.mock';
import type { Character } from '../Character/types';
import type { Enemy } from '../Enemy/types';
import { deepClone } from '../Utils';
import { simulateHazardPatternCombat } from '../Combat/combat.encounter.sim';
import { ENEMIES, DEFAULT_LOADOUT } from './combat-sim.cli';

/** Per-enemy and overall mean milliseconds per combat. */
export type EngineBench = { engineMsPerCombat: Record<string, number> };

/**
 * Builds the bench player: the combat-sim CLI's grey-deck pilgrim.
 *
 * @returns a fresh character holding the grey office cards.
 * @example benchPlayer().knownCards // ['grey-strike', ...]
 */
export function benchPlayer(): Character {
    const p = deepClone(Player);
    p.knownCards = DEFAULT_LOADOUT.slice();
    p.baseStats = { heart: 10, body: 10, mind: 10 };
    p.health = 150;
    p.maxHealth = 150;
    return p;
}

/**
 * Times single seeded combats against one enemy.
 *
 * @param enemy the foe to fight.
 * @param runs number of timed combats.
 * @param warmup number of untimed combats run first.
 * @param seed first seed; each combat uses the next one.
 * @returns one duration in milliseconds per timed combat.
 * @example timeCombats(FloatEye, 100, 20, 1).length // 100
 */
export function timeCombats(enemy: Enemy, runs: number, warmup: number, seed: number): number[] {
    simulateHazardPatternCombat(benchPlayer(), enemy, warmup, seed);
    const durations: number[] = [];
    for (let i = 0; i < runs; i++) {
        const player = benchPlayer();
        const start = performance.now();
        simulateHazardPatternCombat(player, enemy, 1, seed + i);
        durations.push(performance.now() - start);
    }
    return durations;
}

/**
 * Runs the bench over every roster enemy.
 *
 * @param runs timed combats per enemy.
 * @param warmup warm-up combats per enemy.
 * @param seed first seed.
 * @returns the mean ms per combat for each enemy and for every timed combat (`all`).
 * @example runBench(100, 20, 1).engineMsPerCombat.all
 */
export function runBench(runs: number, warmup: number, seed: number): EngineBench {
    const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
    const round3 = (x: number): number => Math.round(x * 1000) / 1000;
    const engineMsPerCombat: Record<string, number> = {};
    const every: number[] = [];
    for (const [name, enemy] of Object.entries(ENEMIES)) {
        const durations = timeCombats(enemy, runs, warmup, seed);
        engineMsPerCombat[name] = round3(mean(durations));
        every.push(...durations);
    }
    engineMsPerCombat.all = round3(mean(every));
    return { engineMsPerCombat };
}

if (require.main === module) {
    const flag = (k: string): string | undefined => {
        const a = process.argv.find(x => x.startsWith(`--${k}=`));
        return a ? a.slice(k.length + 3) : undefined;
    };
    const runs = Number(flag('runs') ?? '100');
    const warmup = Number(flag('warmup') ?? '20');
    const seed = Number(flag('seed') ?? '1');
    process.stdout.write(`${JSON.stringify(runBench(runs, warmup, seed))}\n`);
}
