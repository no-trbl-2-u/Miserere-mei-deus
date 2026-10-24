// A probe: where the foe's VITAE goes in one fight (sandbox tuning aid).
// Usage: npx ts-node --transpile-only sandbox-results/elementalist/probe.ts <fightIndex> [spread] [overrides.json]
import * as fs from 'fs';
import { createCharacter } from '../../src/Character';
import { ENEMY_REGISTRY } from '../../src/Enemy/enemy.library';
import { scaleEnemyToLevel } from '../../src/World/encounter';
import { act1FightLedger, stageStats, walkAct1, type StatSpread } from '../../src/Game/act1-progression';
import { runOneEncounter } from '../../src/Combat/combat.encounter.sim';
import { AS_VOTED, elementalistTestDeck, registerElementalistCards } from '../../src/Cards/sandbox/elementalist.cards';

const [idx = '5', spread = 'even', over] = process.argv.slice(2);
registerElementalistCards({ ...AS_VOTED, ...(over ? JSON.parse(fs.readFileSync(over, 'utf8')) : {}) });
const fights = act1FightLedger();
const { fightLevels } = walkAct1(fights);
const f = fights[Number(idx)]!;
const lvl = fightLevels[Number(idx)]!;
const enemy = scaleEnemyToLevel(ENEMY_REGISTRY[f.enemySlug], f.level ?? Math.max(ENEMY_REGISTRY[f.enemySlug].level, lvl));
const deck = elementalistTestDeck();
const player = createCharacter({ name: 'P', level: lvl, baseStats: stageStats(lvl, spread as StatSpread), knownCards: [...new Set(deck)] });
console.log(f.nodeId, f.enemySlug, 'player L', lvl, 'stats', player.baseStats, 'foe VITAE', enemy.maxHealth, 'player VITAE', player.maxHealth);
const by: Record<string, number> = {};
let rounds = 0;
const N = 100;
for (let i = 0; i < N; i++) {
    const r = runOneEncounter(player, enemy, 1 + i, 'greedy', { deck });
    rounds += r.rounds;
    for (const row of Object.values(r.attribution)) by[row.cardId] = (by[row.cardId] ?? 0) + row.damageDealt + row.dotDamage;
}
console.log('mean rounds', rounds / N);
for (const [k, v] of Object.entries(by).sort((a, b) => b[1] - a[1])) console.log(k.padEnd(12), (v / N).toFixed(1));
