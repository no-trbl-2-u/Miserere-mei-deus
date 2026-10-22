/**
 * Act 1 progression CLI — the XP ledger and the door win table.
 *
 * Prints every Act 1 fight with its pin and XP, the level a full clear and a
 * door-only route bring to each door, and the greedy witness's win rate at
 * each door for three stat spreads. A measurement, not a baseline.
 *
 * Usage:
 *   npm run act1-progression
 *   npm run act1-progression -- --runs=300 --seed=1
 */

import { createCharacter } from '../Character';
import { ENEMY_REGISTRY } from '../Enemy/enemy.library';
import { scaleEnemyToLevel } from '../World/encounter';
import { simulateHazardPatternCombat } from '../Combat/combat.encounter.sim';
import { STARTING_CARD_IDS } from '../Combat/combat.rewards';
import {
    act1FightLedger, act1FightXp, stageStats, walkAct1,
    type Act1Walk, type StatSpread,
} from '../Game/act1-progression';

const SPREADS: readonly StatSpread[] = ['even', 'body-mind', 'body'];

function printWalk(label: string, walk: Act1Walk): void {
    process.stdout.write(`\n${label}: ends level ${walk.finalLevel} (${walk.finalExperience} XP)\n`);
    for (const d of walk.doors) {
        process.stdout.write(`  ${d.nodeId.padEnd(6)} player L${d.playerLevel} at ${d.experience} XP vs Death Beholder L${d.doorLevel}\n`);
    }
}

if (require.main === module) {
    const flag = (k: string): string | undefined => {
        const a = process.argv.find(x => x.startsWith(`--${k}=`));
        return a ? a.slice(k.length + 3) : undefined;
    };
    const runs = Number(flag('runs') ?? '200');
    const seed = Number(flag('seed') ?? '1');

    const ledger = act1FightLedger();
    process.stdout.write('\nAct 1 fights (crossing order; XP at the pin)\n');
    for (const f of ledger) {
        process.stdout.write(
            `  ${f.map.padEnd(14)} ${f.nodeId.padEnd(6)} c${f.column} ${f.enemySlug.padEnd(15)}`
            + ` L${f.level ?? '-'} ${String(act1FightXp(f, 1)).padStart(4)} XP${f.isBoss ? '  door' : ''}\n`,
        );
    }

    const full = walkAct1(ledger);
    printWalk('Full clear', full);
    printWalk('Door-only route', walkAct1(ledger.filter(f => f.isBoss)));

    process.stdout.write(`\nDoor win rate at the full-clear stage (greedy witness, ${runs} runs, seed ${seed})\n`);
    process.stdout.write(`  ${'door'.padEnd(6)} ${SPREADS.map(s => s.padStart(10)).join('')}\n`);
    for (const d of full.doors) {
        const foe = scaleEnemyToLevel(ENEMY_REGISTRY['death-beholder'], d.doorLevel ?? d.playerLevel);
        const cells = SPREADS.map(spread => {
            const player = createCharacter({
                name: 'Stage', level: d.playerLevel,
                baseStats: stageStats(d.playerLevel, spread), knownCards: [...STARTING_CARD_IDS],
            });
            const { winRate } = simulateHazardPatternCombat(player, foe, runs, seed);
            return `${(winRate * 100).toFixed(0)}%`.padStart(10);
        });
        process.stdout.write(`  ${d.nodeId.padEnd(6)} ${cells.join('')}\n`);
    }
}
