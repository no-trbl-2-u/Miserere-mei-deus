// The combined measured table for the results doc: grey and Blood Price (this
// branch, identical to latest.md), the Elementalist test deck as voted and adjusted.
// Usage: node sandbox-results/elementalist/table.mjs <voted.json> <adjusted.json> [deck]
import { readFileSync } from 'node:fs';

const [vf, af, deck = 'elementalist'] = process.argv.slice(2);
const v = JSON.parse(readFileSync(vf, 'utf8'));
const a = JSON.parse(readFileSync(af, 'utf8'));
const spreads = ['even', 'body-mind', 'body'];
const pct = x => `${Math.round(x * 100)}%`;
const cell = c => (c ? `${pct(c.winRate)} / ${c.p10.toFixed(2)}` : '-');
const cols = [
    ...['grey', 'blood-price'].flatMap(d => spreads.map(sp => [`${d} ${sp}`, fk => v.baseline.find(c => c.fight === fk && c.deck === d && c.spread === sp)])),
    ...spreads.map(sp => [`el. voted ${sp}`, fk => v.cells.find(c => c.fight === fk && c.deck === deck && c.spread === sp)]),
    ...spreads.map(sp => [`el. adjusted ${sp}`, fk => a.cells.find(c => c.fight === fk && c.deck === deck && c.spread === sp)]),
];
const fights = [...new Set(v.cells.map(c => c.fight))];
console.log(`| fight | level | ${cols.map(c => c[0]).join(' | ')} |`);
console.log(`|---|---|${cols.map(() => '---').join('|')}|`);
for (const fk of fights) {
    const c0 = v.cells.find(c => c.fight === fk);
    console.log(`| ${fk}${c0.isBoss ? ' (door)' : ''} | L${c0.playerLevel} v L${c0.enemyLevel} | ${cols.map(([, get]) => cell(get(fk))).join(' | ')} |`);
}
console.log('\n| fight | grey turns (even) | blood-price turns (even) | el. voted turns (even / body-mind / body) | el. adjusted turns (even / body-mind / body) |');
console.log('|---|---|---|---|---|');
for (const fk of fights) {
    const g = v.baseline.find(c => c.fight === fk && c.deck === 'grey' && c.spread === 'even');
    const b = v.baseline.find(c => c.fight === fk && c.deck === 'blood-price' && c.spread === 'even');
    const vs = spreads.map(sp => v.cells.find(c => c.fight === fk && c.deck === deck && c.spread === sp).meanRounds.toFixed(2)).join(' / ');
    const as = spreads.map(sp => a.cells.find(c => c.fight === fk && c.deck === deck && c.spread === sp).meanRounds.toFixed(2)).join(' / ');
    console.log(`| ${fk} | ${g.meanRounds.toFixed(2)} | ${b.meanRounds.toFixed(2)} | ${vs} | ${as} |`);
}
