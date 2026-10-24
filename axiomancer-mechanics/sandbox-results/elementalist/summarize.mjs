// Summarises an elementalist-sim JSON (sandbox/elementalist-sims only).
// Usage: node sandbox-results/elementalist/summarize.mjs <voted.json> [--md]
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const o = JSON.parse(readFileSync(file, 'utf8'));
const pct = x => `${Math.round(x * 100)}%`;
const f2 = x => x.toFixed(2);
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const decks = [...new Set(o.cells.map(c => c.deck))];
const foes = ['float-eye', 'green-jelly', 'death-beholder'];
const target = { 'float-eye': 3, 'green-jelly': 5, 'death-beholder': 7 };

console.log(`# ${o.numbers} (${o.runs} runs, seed ${o.seed})\n`);
console.log('## Per foe (mean over every ledger fight and spread)\n');
console.log('| deck | foe | target turns | mean turns | win | p10 (mean of cells) | worst p10 | self-burn / fight | self-kill | FROZEN / foe turn | FROZEN doubles / fight | foe INFERNO loss | foe STORM loss | BLIZZARD prevented |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const d of decks) for (const foe of foes) {
    const cs = o.cells.filter(c => c.deck === d && c.enemySlug === foe);
    const turns = cs.reduce((s, c) => s + c.foeTurns, 0);
    const frozen = cs.reduce((s, c) => s + c.frozenRate * c.foeTurns, 0);
    console.log(`| ${d} | ${foe} | ~${target[foe]} | ${f2(mean(cs.map(c => c.meanRounds)))} | ${pct(mean(cs.map(c => c.winRate)))} | ${f2(mean(cs.map(c => c.p10)))} | ${f2(Math.min(...cs.map(c => c.p10)))} | ${f2(mean(cs.map(c => c.selfBurnMean)))} | ${pct(mean(cs.map(c => c.selfKillRate)))} | ${pct(turns ? frozen / turns : 0)} | ${f2(mean(cs.map(c => c.frozenDoublesMean)))} | ${f2(mean(cs.map(c => c.foeInfernoLossMean)))} | ${f2(mean(cs.map(c => c.foeStormLossMean)))} | ${f2(mean(cs.map(c => c.blizzardPreventedMean)))} |`);
}
console.log('\n## Overall\n');
for (const d of decks) {
    const cs = o.cells.filter(c => c.deck === d);
    const ft = cs.reduce((s, c) => s + c.foeTurns, 0);
    const fr = cs.reduce((s, c) => s + c.frozenRate * c.foeTurns, 0);
    console.log(`- ${d}: FROZEN on ${pct(fr / ft)} of foe turns; self-burn ${f2(mean(cs.map(c => c.selfBurnMean)))} VITAE / fight against ${f2(mean(cs.map(c => c.playerHpTakenMean)))} from foe hits; highest self-kill rate in any cell ${pct(Math.max(...cs.map(c => c.selfKillRate)))}`);
    for (const foe of foes) {
        const x = cs.filter(c => c.enemySlug === foe);
        console.log(`  - ${foe}: foe hits ${f2(mean(x.map(c => c.playerHpTakenMean)))}, INFERNO on you ${f2(mean(x.map(c => c.selfBurnMean)))}`);
    }
    const doors = cs.filter(c => c.isBoss);
    console.log(`  - doors, turns per cell: ${doors.map(c => `${c.fight.split('/')[0]} ${c.spread} ${f2(c.meanRounds)}`).join('; ')}`);
}
if (o.baseline) {
    console.log('\n## Baseline on this branch (mean turns per foe)\n');
    for (const d of ['grey', 'blood-price']) for (const foe of foes) {
        const cs = o.baseline.filter(c => c.deck === d && c.fight.includes(foe));
        console.log(`- ${d} ${foe}: turns ${f2(mean(cs.map(c => c.meanRounds)))}, win ${pct(mean(cs.map(c => c.winRate)))}`);
    }
}

console.log('\n## Measured table (win rate / lowest-VITAE p10)\n');
const fights = [...new Set(o.cells.map(c => c.fight))];
const spreads = ['even', 'body-mind', 'body'];
const cols = [];
const bdecks = o.baseline ? ['grey', 'blood-price'] : [];
for (const d of [...bdecks, ...decks]) for (const sp of spreads) cols.push([d, sp]);
console.log(`| fight | level | ${cols.map(([d, sp]) => `${d} ${sp}`).join(' | ')} |`);
console.log(`|---|---|${cols.map(() => '---').join('|')}|`);
for (const fk of fights) {
    const c0 = o.cells.find(c => c.fight === fk);
    const cells = cols.map(([d, sp]) => {
        const src = bdecks.includes(d) ? o.baseline : o.cells;
        const c = src.find(x => x.fight === fk && x.deck === d && x.spread === sp);
        return c ? `${pct(c.winRate)} / ${f2(c.p10)}` : '-';
    });
    console.log(`| ${fk}${c0.isBoss ? ' (door)' : ''} | L${c0.playerLevel} v L${c0.enemyLevel} | ${cells.join(' | ')} |`);
}

console.log('\n## Turns per fight\n');
console.log(`| fight | ${decks.map(d => spreads.map(sp => `${d} ${sp}`).join(' | ')).join(' | ')} |`);
console.log(`|---|${decks.flatMap(() => spreads).map(() => '---').join('|')}|`);
for (const fk of fights) {
    const cells = decks.flatMap(d => spreads.map(sp => f2(o.cells.find(x => x.fight === fk && x.deck === d && x.spread === sp).meanRounds)));
    console.log(`| ${fk} | ${cells.join(' | ')} |`);
}

console.log('\n## Cards\n');
for (const d of decks) {
    console.log(`### ${d}\n`);
    console.log('| slot | colour | draws | PAID / draw | FREE / draw | held at phase end | foe VITAE / fight, FREE | foe VITAE / fight, PAID |');
    console.log('|---|---|---|---|---|---|---|---|');
    for (const r of o.cards[d]) console.log(`| ${r.slot} | ${r.colour} | ${r.draws} | ${pct(r.paidPerDraw)} | ${pct(r.freePerDraw)} | ${r.heldAtPhaseEnd} | ${f2(r.freeDamagePerFight ?? 0)} | ${f2(r.paidDamagePerFight ?? 0)} |`);
    console.log();
}
