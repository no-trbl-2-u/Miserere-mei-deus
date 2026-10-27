// Summarizes a defender-sim result file into the report's tables (markdown on stdout).
// Usage: node sandbox-results/defender/summarize.mjs <result.json> [--history=../docs/reports/measured/history.jsonl]
import { readFileSync } from 'node:fs';

const [file, ...rest] = process.argv.slice(2);
const j = JSON.parse(readFileSync(file, 'utf8'));
const histArg = rest.find(a => a.startsWith('--history='))?.slice(10);

const FOES = [['float-eye', 'Float-Eye', 3], ['green-jelly', 'Green Jelly', 5], ['death-beholder', 'Death Beholder', 7]];
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const f2 = x => x.toFixed(2);
const pct = x => `${Math.round(x * 100)}%`;
const decks = [...new Set(j.cells.map(c => c.deck))];
const out = [];

out.push(`numbers: ${j.numbers}, witness: ${j.witness}, runs: ${j.runs}, seed: ${j.seed}\n`);

// Fight length per foe.
const base = j.baseline ?? [];
const baseDecks = [...new Set(base.map(c => c.deck))];
out.push('| foe | target | ' + [...baseDecks, ...decks].join(' | ') + ' |');
out.push('|---|---|' + [...baseDecks, ...decks].map(() => '---').join('|') + '|');
for (const [slug, name, target] of FOES) {
    const row = [name, `about ${target}`];
    for (const d of baseDecks) row.push(f2(mean(base.filter(c => c.deck === d && c.fight.includes(slug)).map(c => c.meanRounds))));
    for (const d of decks) row.push(f2(mean(j.cells.filter(c => c.deck === d && c.enemySlug === slug).map(c => c.meanRounds))));
    out.push(`| ${row.join(' | ')} |`);
}
out.push('');

// Per-deck summary: win, p10 range, damage split, taken, peaks, discard.
for (const d of decks) {
    const cs = j.cells.filter(c => c.deck === d);
    out.push(`### ${d}`);
    out.push(`win rate: min ${pct(Math.min(...cs.map(c => c.winRate)))}, mean ${pct(mean(cs.map(c => c.winRate)))}; p10 ${f2(Math.min(...cs.map(c => c.p10)))} to ${f2(Math.max(...cs.map(c => c.p10)))}`);
    out.push('');
    out.push('| foe | turns | win | p10 (min) | VITAE taken / fight | E-09 self-loss | foe VITAE: THORNS | REFLECT | DEAL | THORNS share | REFLECT share | VULNERABLE added | THORNS peak p50 / p90 / max | REFLECT peak p50 / p90 / max | strikes / fight |');
    out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const [slug, name] of FOES) {
        const x = cs.filter(c => c.enemySlug === slug);
        if (!x.length) continue;
        const th = mean(x.map(c => c.thornsMean)), rf = mean(x.map(c => c.reflectMean)), dl = mean(x.map(c => c.dealMean));
        const tot = th + rf + dl || 1;
        out.push(`| ${name} | ${f2(mean(x.map(c => c.meanRounds)))} | ${pct(mean(x.map(c => c.winRate)))} | ${f2(Math.min(...x.map(c => c.p10)))} | ${f2(mean(x.map(c => c.playerHpTakenMean)))} | ${f2(mean(x.map(c => c.selfLossMean)))} | ${f2(th)} | ${f2(rf)} | ${f2(dl)} | ${pct(th / tot)} | ${pct(rf / tot)} | ${f2(mean(x.map(c => c.vulnExtraMean)))} | ${f2(mean(x.map(c => c.thornsPeakP50)))} / ${f2(mean(x.map(c => c.thornsPeakP90)))} / ${Math.max(...x.map(c => c.thornsPeakMax))} | ${f2(mean(x.map(c => c.reflectPeakP50)))} / ${f2(mean(x.map(c => c.reflectPeakP90)))} / ${Math.max(...x.map(c => c.reflectPeakMax))} | ${f2(mean(x.map(c => c.strikesMean)))} |`);
    }
    const sum = k => cs.reduce((a, c) => a + c[k], 0);
    out.push('');
    out.push(`discard PAID lines: unpayable at turn start ${pct(sum('discardTurnStartUnpayable') / Math.max(1, sum('discardTurnStartChecks')))} of ${sum('discardTurnStartChecks')} checks; played FREE with a die of its colour unspent: ${sum('discardChances')} times, ${pct(sum('discardUnpayable') / Math.max(1, sum('discardChances')))} of them because the PAID line was unpayable`);
    out.push(`cards discarded / fight ${f2(mean(cs.map(c => c.cardsDiscardedMean)))}; M-09 riders / fight ${f2(mean(cs.map(c => c.m09TriggersMean)))}; RETRIEVEs / fight ${f2(mean(cs.map(c => c.retrievesMean)))}; un-exiles / fight ${f2(mean(cs.map(c => c.unexilesMean)))}; P-08 doubled THORNS / fight ${f2(mean(cs.map(c => c.thornsDoubledMean)))}`);
    out.push('');
    out.push('| card | colour | type | PAID | FREE | held | PAID swing / fight | FREE swing / fight |');
    out.push('|---|---|---|---|---|---|---|---|');
    for (const r of j.cards[d] ?? []) {
        out.push(`| ${r.slot} | ${r.colour} | ${r.type} | ${pct(r.paidPerDraw)} | ${pct(r.freePerDraw)} | ${r.heldAtPhaseEnd} | ${f2(r.paidSwingPerFight)} | ${f2(r.freeSwingPerFight)} |`);
    }
    out.push('');
    // Per fight (even / body-mind / body) turns and win / p10.
    out.push('| fight | turns (even / body-mind / body) | win / p10 (even / body-mind / body) |');
    out.push('|---|---|---|');
    const fights = [...new Set(cs.map(c => c.fight))];
    for (const f of fights) {
        const x = ['even', 'body-mind', 'body'].map(s => cs.find(c => c.fight === f && c.spread === s));
        out.push(`| ${f} | ${x.map(c => f2(c.meanRounds)).join(' / ')} | ${x.map(c => `${pct(c.winRate)} / ${f2(c.p10)}`).join(' / ')} |`);
    }
    out.push('');
}

// Baseline identity against the history line.
if (histArg && base.length) {
    const lines = readFileSync(histArg, 'utf8').trim().split('\n');
    const h = JSON.parse(lines[lines.length - 1]);
    let same = 0, diff = 0;
    const diffs = [];
    for (const c of base) {
        const m = h.cells.find(x => x.fight === c.fight && x.spread === c.spread && x.deck === c.deck);
        if (!m) continue;
        const ok = m.winRate === c.winRate && m.meanRounds === c.meanRounds && m.lowestVitaeFractionP10 === c.p10;
        if (ok) same++; else { diff++; diffs.push(`${c.deck} ${c.fight} ${c.spread}`); }
    }
    out.push(`baseline vs history (${h.commit}): ${same} identical, ${diff} differ${diffs.length ? `: ${diffs.slice(0, 10).join('; ')}` : ''}`);
}

console.log(out.join('\n'));
