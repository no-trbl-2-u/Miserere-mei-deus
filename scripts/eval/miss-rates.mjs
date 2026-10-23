#!/usr/bin/env node
// scripts/eval/miss-rates.mjs
//
// The miss-rate table (phase EV1c, brief A7): one row per judge from the
// EV1 data in `docs/reports/eval/` (ledger, parent replay, planted defects,
// mutation scores) and the `/critique` pass records in
// `docs/reports/critique/passes.jsonl` (phase LG1e), each pass's
// `base..head` range resolved with git. Reads only those files; writes `miss-rates.json` and
// the miss-rate section of `docs/reports/eval/latest.md`. The pure parts
// live in `miss-rates-lib.mjs`.
//
//   node scripts/eval/miss-rates.mjs [--dry-run]

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SECTION_END, SECTION_START, computeMissRates, parsePassRecords, renderMissRateSection } from './miss-rates-lib.mjs'
import { spliceMarked } from './mutation-lib.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT_DIR = join(ROOT, 'docs/reports/eval')
const PASSES = join(ROOT, 'docs/reports/critique/passes.jsonl')

const read = (name) => (existsSync(join(OUT_DIR, name)) ? JSON.parse(readFileSync(join(OUT_DIR, name), 'utf8')) : null)
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()

// A pass whose range git cannot resolve (a sha not in this clone) plays no commits.
const range = (p) => {
  try {
    return git(['rev-list', '--first-parent', `${p.base}..${p.head}`]).split('\n').filter(Boolean)
  } catch {
    console.warn(`miss-rates: pass ${p.pass} range ${p.base}..${p.head} does not resolve; it counts no escapes`)
    return []
  }
}
const critique = existsSync(PASSES) ? parsePassRecords(readFileSync(PASSES, 'utf8')).map((p) => ({ ...p, commits: range(p) })) : null

const evidence = { ledger: read('ledger.json'), replay: read('parent-replay.json'), seeded: read('seeded.json'), mutation: read('mutation.json'), critique }
if (!evidence.ledger) throw new Error('miss-rates: run `node scripts/eval/escape-ledger.mjs` first')

const head = git(['rev-parse', 'HEAD'])
const stamp = { commit: head.slice(0, 8), date: git(['show', '-s', '--format=%cI', head]) }
const inputs = Object.fromEntries(Object.entries({ ledger: evidence.ledger, 'parent replay': evidence.replay, 'planted defects': evidence.seeded, mutation: evidence.mutation })
  .filter(([, v]) => v).map(([k, v]) => [k, v.stamp.commit]))
if (critique?.length) inputs['critique passes'] = critique.at(-1).head.slice(0, 8)
const table = { stamp, inputs, rows: computeMissRates(evidence) }
const section = renderMissRateSection(table)

if (process.argv.includes('--dry-run')) {
  process.stdout.write(`${section}\n`)
} else {
  writeFileSync(join(OUT_DIR, 'miss-rates.json'), `${JSON.stringify(table, null, 2)}\n`)
  const latest = join(OUT_DIR, 'latest.md')
  writeFileSync(latest, spliceMarked(readFileSync(latest, 'utf8'), section, SECTION_START, SECTION_END))
  console.log(`miss rates: ${table.rows.length} judges -> docs/reports/eval/latest.md`)
}
