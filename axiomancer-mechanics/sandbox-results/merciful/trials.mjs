// node sandbox-results/merciful/trials.mjs <label=result.json:deck> ... > trials/trials.md
//
// One row per trial: mean turns per foe, the door's burst p90 / max, the
// runaway lines' max, and the kill's split on the door.

import { readFileSync } from 'node:fs'

const FOES = ['float-eye', 'green-jelly', 'death-beholder']
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
const f2 = (x) => x.toFixed(2)
const pct = (x) => `${Math.round(x * 100)}%`
const rows = []
rows.push('| trial | Float-Eye | Green Jelly | Death Beholder | door p10 | door burst p90 / max | P-03 PAID max | P-05 PAID max | M-05c HEAL to full max | P-07 PAID max | P-08 MERCY added max | door DEAL / RADIANCE / burst |')
rows.push('|---|---|---|---|---|---|---|---|---|---|---|---|')
for (const arg of process.argv.slice(2)) {
  const [label, rest] = arg.split('=')
  const [file, deck] = rest.split(':')
  const r = JSON.parse(readFileSync(file, 'utf8'))
  const cs = (foe) => r.cells.filter((c) => c.deck === deck && c.enemySlug === foe)
  const turns = FOES.map((f) => f2(mean(cs(f).map((c) => c.meanRounds))))
  const door = cs('death-beholder')
  const g = r.groups[`${deck}|death-beholder`]
  const run = r.runaways[deck]
  const mx = (k) => (run[k] ? run[k].max : '-')
  const tot = mean(door.map((c) => c.foeTakenMean))
  const sh = (k) => pct(mean(door.map((c) => c[k])) / tot)
  rows.push(`| ${label} | ${turns.join(' | ')} | ${f2(mean(door.map((c) => c.p10)))} | ${g.burst.p90} / ${g.burst.max} | ${mx('P-03 PAID: MERCY then burst now')} | ${run['P-05 PAID: three-times burst'] ? mx('P-05 PAID: three-times burst') : mx('P-05 PAID: the clock runs out now (twice)')} | ${mx('mc-m-05c: HEAL to full')} | ${mx('P-07 PAID: DEAL of all you healed this turn')} | ${Math.max(run['P-08 FREE: MERCY added (all you healed this turn, and its overheal)']?.max ?? 0, run['P-08 PAID: MERCY added (all you healed this turn, and its overheal)']?.max ?? 0)} | ${sh('dealMean')} / ${sh('radianceMean')} / ${sh('burstMean')} |`)
}
process.stdout.write(rows.join('\n') + '\n')
