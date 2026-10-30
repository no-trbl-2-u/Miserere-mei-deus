// node sandbox-results/merciful/table.mjs <voted-value.json> > table.md
//
// Every ledger fight and spread: mean turns, win rate and lowest-VITAE p10
// for the four live lanes (measured on this branch) and the two Merciful decks.

import { readFileSync } from 'node:fs'

const r = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const DECKS = ['grey', 'blood-price', 'elementalist', 'defender', 'merciful-test', 'merciful-29']
const all = [...r.baseline, ...r.cells.map((c) => ({ ...c }))]
const key = (c) => `${c.fight}|${c.spread}`
const by = new Map()
for (const c of all) {
  const k = key(c)
  if (!by.has(k)) by.set(k, {})
  by.get(k)[c.deck] = c
}
const out = []
out.push(`# Every fight: turns / win / lowest-VITAE p10 (${r.runs} runs, seed ${r.seed}, ${r.witness} witness for the Merciful)`)
out.push('')
out.push(`| fight | spread | ${DECKS.join(' | ')} |`)
out.push(`|---|---|${DECKS.map(() => '---').join('|')}|`)
for (const [k, row] of by) {
  const [fight, spread] = k.split('|')
  out.push(`| ${fight} | ${spread} | ${DECKS.map((d) => row[d] ? `${row[d].meanRounds.toFixed(2)} / ${Math.round(row[d].winRate * 100)}% / ${row[d].p10.toFixed(2)}` : '-').join(' | ')} |`)
}
process.stdout.write(out.join('\n') + '\n')
