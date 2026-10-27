// The report's measured table (win rate / lowest-VITAE p10) and per-fight turns, from a defender-sim result with --baseline.
// Usage: node sandbox-results/defender/table.mjs sandbox-results/defender/voted-value.json
import { readFileSync } from 'node:fs';

const j = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const pct = x => `${Math.round(x * 100)}%`;
const cell = c => (c ? `${pct(c.winRate)} / ${c.p10.toFixed(2)}` : '-');
const fights = [...new Set(j.cells.map(c => c.fight))];
const S = ['even', 'body-mind', 'body'];
const cols = [
    ...['grey', 'blood-price', 'elementalist'].flatMap(d => S.map(s => [d, s, 'b'])),
    ...['defender', 'defender-30'].flatMap(d => S.map(s => [d, s, 'd'])),
];
const find = (f, [d, s, k]) => (k === 'b' ? j.baseline : j.cells).find(c => c.fight === f && c.deck === d && c.spread === s);
console.log(`| fight | level | ${cols.map(([d, s]) => `${d} ${s}`).join(' | ')} |`);
console.log(`|---|---|${cols.map(() => '---').join('|')}|`);
for (const f of fights) {
    const d = j.cells.find(c => c.fight === f);
    console.log(`| ${f}${d.isBoss ? ' (door)' : ''} | L${d.playerLevel} v L${d.enemyLevel} | ${cols.map(c => cell(find(f, c))).join(' | ')} |`);
}
console.log('');
console.log('| fight | grey (even) | Blood Price (even) | Elementalist (even) | Defender 20 (even / body-mind / body) | Defender 30 (even / body-mind / body) |');
console.log('|---|---|---|---|---|---|');
for (const f of fights) {
    const b = d => find(f, [d, 'even', 'b']).meanRounds.toFixed(2);
    const t = d => S.map(s => find(f, [d, s, 'd']).meanRounds.toFixed(2)).join(' / ');
    console.log(`| ${f} | ${b('grey')} | ${b('blood-price')} | ${b('elementalist')} | ${t('defender')} | ${t('defender-30')} |`);
}
