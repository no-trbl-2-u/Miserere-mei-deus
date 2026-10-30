// node sandbox-results/merciful/summarize.mjs <result.json> [<baseline.json>] > <out.md>
//
// The Merciful sims' summary tables, from a `merciful-sim.cli.ts` result. The
// per-foe means average every ledger fight of that foe and the three spreads
// equally. The lane columns read the result's own `baseline` (or a second
// result file that carries one).

import { readFileSync } from 'node:fs'

const res = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const baseSrc = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], 'utf8')) : res
const baseline = baseSrc.baseline ?? []
const FOES = ['float-eye', 'green-jelly', 'death-beholder']
const NAME = { 'float-eye': 'Float-Eye', 'green-jelly': 'Green Jelly', 'death-beholder': 'Death Beholder' }
const TARGET = { 'float-eye': 'about 3', 'green-jelly': 'about 5', 'death-beholder': 'about 7' }
const decks = Object.keys(res.cards)
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '-')
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '-')
const pct = (x) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : '-')
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN)
const sum = (xs) => xs.reduce((a, b) => a + b, 0)

const cellsOf = (deck, foe) => res.cells.filter((c) => c.deck === deck && c.enemySlug === foe)
const baseOf = (deck, foe) => baseline.filter((c) => c.deck === deck && (c.enemySlug ?? c.fight.split('/')[1].split('#')[0].replace(' (door)', '')) === foe)
const out = []
const p = (s = '') => out.push(s)

p(`# Merciful sims: ${res.numbers}, ${res.witness} witness, ${res.runs} runs, seed ${res.seed}`)
p()
p('## Fight length per foe (mean player turns to the end)')
p()
const laneDecks = ['grey', 'blood-price', 'elementalist', 'defender']
p(`| foe | T's target | ${laneDecks.join(' | ')} | ${decks.join(' | ')} |`)
p(`|---|---|${laneDecks.map(() => '---').join('|')}|${decks.map(() => '---').join('|')}|`)
for (const foe of FOES) {
  const lanes = laneDecks.map((d) => f2(mean(baseOf(d, foe).map((c) => c.meanRounds))))
  const ours = decks.map((d) => f2(mean(cellsOf(d, foe).map((c) => c.meanRounds))))
  p(`| ${NAME[foe]} | ${TARGET[foe]} | ${lanes.join(' | ')} | ${ours.join(' | ')} |`)
}
p()
p('Win rate and lowest-VITAE p10 (min over the foe\'s cells / mean):')
p()
p(`| foe | ${[...laneDecks, ...decks].join(' | ')} |`)
p(`|---|${[...laneDecks, ...decks].map(() => '---').join('|')}|`)
for (const foe of FOES) {
  const row = [...laneDecks.map((d) => baseOf(d, foe)), ...decks.map((d) => cellsOf(d, foe))].map((cs) =>
    cs.length ? `${pct(Math.min(...cs.map((c) => c.winRate)))} min, p10 ${f2(Math.min(...cs.map((c) => c.p10)))} min / ${f2(mean(cs.map((c) => c.p10)))} mean` : '-')
  p(`| ${NAME[foe]} | ${row.join(' | ')} |`)
}
p()
p('VITAE the foe took from you per fight (mean):')
p()
p(`| foe | ${[...laneDecks, ...decks].join(' | ')} |`)
p(`|---|${[...laneDecks, ...decks].map(() => '---').join('|')}|`)
for (const foe of FOES) {
  const row = [...laneDecks.map((d) => baseOf(d, foe)), ...decks.map((d) => cellsOf(d, foe))].map((cs) => f1(mean(cs.map((c) => c.playerHpTakenMean))))
  p(`| ${NAME[foe]} | ${row.join(' | ')} |`)
}

for (const deck of decks) {
  p()
  p(`## ${deck}`)
  p()
  p('Per fight, averaged over the foe\'s ledger fights and spreads. Shares are of the foe VITAE taken (its start VITAE plus every heal on it).')
  p()
  p('| foe | turns | win | p10 | VITAE taken from you | SACRIFICE paid | foe VITAE taken | plain DEAL | RADIANCE | MERCY bursts | LEECH | other | MERCY healed the foe | overheal into MERCY | VULNERABLE added |')
  p('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const foe of FOES) {
    const cs = cellsOf(deck, foe)
    const m = (k) => mean(cs.map((c) => c[k]))
    const tot = m('foeTakenMean')
    const sh = (k) => `${f1(m(k))} (${pct(m(k) / tot)})`
    p(`| ${NAME[foe]} | ${f2(m('meanRounds'))} | ${pct(m('winRate'))} | ${f2(m('p10'))} | ${f1(m('playerHpTakenMean'))} | ${f1(m('sacrificedMean'))} | ${f1(tot)} | ${sh('dealMean')} | ${sh('radianceMean')} | ${sh('burstMean')} | ${sh('leechMean')} | ${sh('otherMean')} | ${f1(m('foeHealedByMercyMean'))} | ${f1(m('overhealMean'))} | ${f1(m('vulnExtraMean'))} |`)
  }
  p()
  p('MERCY and RADIANCE:')
  p()
  p('| foe | bursts / fight (on the clock / early) | burst DEAL median / p90 / max | MERCY total at burst median / p90 / max | highest MERCY a fight median / p90 / max | fights with MERCY that end before it bursts | ...that end with MERCY still on | RADIANCE / fight | RADIANCE whiffs (healed 0) | RADIANCE heal lost to full VITAE | HEALs made RADIANCE (E-06a) / fight |')
  p('|---|---|---|---|---|---|---|---|---|---|---|')
  for (const foe of FOES) {
    const cs = cellsOf(deck, foe)
    const m = (k) => mean(cs.map((c) => c[k]))
    const g = res.groups[`${deck}|${foe}`]
    const withM = sum(cs.map((c) => c.fightsWithMercy))
    const before = sum(cs.map((c) => c.fightsEndedBeforeBurst))
    const on = sum(cs.map((c) => c.fightsEndedWithMercyOn))
    const rc = sum(cs.map((c) => c.radianceCountMean))
    const rw = sum(cs.map((c) => c.radianceWhiffsMean))
    const rt = sum(cs.map((c) => c.radianceTriedMean))
    const rh = sum(cs.map((c) => c.radianceHealedMean))
    p(`| ${NAME[foe]} | ${f2(m('burstsMean'))} (${f2(m('burstsOnClockMean'))} / ${f2(m('burstsEarlyMean'))}) | ${g.burst.p50} / ${g.burst.p90} / ${g.burst.max} | ${g.burstTotal.p50} / ${g.burstTotal.p90} / ${g.burstTotal.max} | ${g.mercyPeak.p50} / ${g.mercyPeak.p90} / ${g.mercyPeak.max} | ${pct(before / withM)} of ${pct(withM / (cs.length * res.runs))} | ${pct(on / withM)} | ${f2(m('radianceCountMean'))} | ${pct(rw / rc)} | ${pct(1 - rh / rt)} | ${f2(m('convertedHealsMean'))} |`)
  }
  p()
  p('Other per-fight tallies: ' + FOES.map((foe) => {
    const cs = cellsOf(deck, foe)
    const m = (k) => mean(cs.map((c) => c[k]))
    return `${NAME[foe]}: healed ${f1(m('healedMean'))}, M-08 cut ${f2(m('attackLessenedMean'))}, M-09 returned ${f2(m('returnedMean'))}, max VITAE added ${f2(m('maxVitaeAddedMean'))}, debuffs cleared ${f2(m('debuffsClearedMean'))}`
  }).join('; ') + '.')
  p()
  p('Runaway lines (one number per resolution; median / p90 / max, count):')
  p()
  p('| line | all foes | Death Beholder |')
  p('|---|---|---|')
  const door = res.groups[`${deck}|death-beholder`]?.runaways ?? {}
  for (const [k, v] of Object.entries(res.runaways[deck]).sort()) {
    const d = door[k]
    p(`| ${k} | ${v.p50} / ${v.p90} / ${v.max} (${v.n}) | ${d ? `${d.p50} / ${d.p90} / ${d.max} (${d.n})` : '-'} |`)
  }
  p()
  p('Play rate (share of the card\'s draws), and the foe VITAE the play took at once per fight:')
  p()
  p('| card | colour | type | PAID | FREE | PAID swing / fight | FREE swing / fight |')
  p('|---|---|---|---|---|---|---|')
  for (const r of res.cards[deck]) {
    p(`| ${r.key} | ${r.colour} | ${r.type} | ${pct(r.paidPerDraw)} | ${pct(r.freePerDraw)} | ${f2(r.paidSwingPerFight)} | ${f2(r.freeSwingPerFight)} |`)
  }
}
process.stdout.write(out.join('\n') + '\n')
