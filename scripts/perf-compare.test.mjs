// scripts/perf-compare.test.mjs — witness for the weekly performance audit's
// pure core: medians, budget and drift checks, budget seeding and the
// `[perf]` rows it files into plan/AUDIT.md.
//
//   node --test scripts/perf-compare.test.mjs

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  addIssueLine,
  budgetRunnerMismatch,
  compare,
  fileFindings,
  median,
  renderAuditRow,
  roundLimit,
  seedBudgets,
  summarize,
} from './perf-compare.mjs'

const metrics = (over = {}) => ({
  bundleJsBytes: 1_000_000,
  bundleJsGzipBytes: 300_000,
  firstScreenMs: 1000,
  lcpMs: 1200,
  tbtMs: 100,
  frameP95Ms: 20,
  slowFramePct: 4,
  longTaskMs: 200,
  engineMsPerCombat: { FloatEye: 1, BrineHag: 1, DeathBeholder: 1, all: 1 },
  ...over,
})
const line = (over = {}, cpu = 'cpu-a') => ({ commit: 'aaa', runner: { cpu, cores: 4 }, metrics: metrics(over) })
const metricsOf = (findings) => findings.map((f) => `${f.metric}:${f.type}`)

test('median: odd, even and one value', () => {
  assert.equal(median([3, 1, 2]), 2)
  assert.equal(median([4, 1, 3, 2]), 2.5)
  assert.equal(median([7]), 7)
  assert.throws(() => median([]))
})

test('summarize medians every metric across three runs, nested ones too', () => {
  const runs = [
    metrics({ lcpMs: 900, engineMsPerCombat: { all: 3 } }),
    metrics({ lcpMs: 1500, engineMsPerCombat: { all: 1 } }),
    metrics({ lcpMs: 1100, engineMsPerCombat: { all: 2 } }),
  ]
  const s = summarize(runs)
  assert.equal(s.lcpMs, 1100)
  assert.equal(s.engineMsPerCombat.all, 2)
  assert.equal(s.bundleJsBytes, 1_000_000)
})

test('compare: a value over its budget is a budget breach', () => {
  const f = compare({ current: line({ lcpMs: 1300 }), previous: null, budgets: { lcpMs: 1250 } })
  assert.deepEqual(f, [{ metric: 'lcpMs', kind: 'load', type: 'budget breach', value: 1300, limit: 1250 }])
})

test('compare: no previous line checks budgets only', () => {
  assert.deepEqual(compare({ current: line({ lcpMs: 99999 }), previous: null, budgets: {} }), [])
})

test('compare: drift over each kind\'s threshold is a finding', () => {
  const previous = line()
  const current = line({
    bundleJsBytes: 1_060_000, // bytes +6% > 5%
    lcpMs: 1550, // load +29% > 25%
    frameP95Ms: 26, // runtime +30% > 25%
    engineMsPerCombat: { all: 1.2 }, // engine +20% > 15%
  })
  assert.deepEqual(metricsOf(compare({ current, previous, budgets: {} })).sort(), [
    'bundleJsBytes:drift', 'engineMsPerCombat.all:drift', 'frameP95Ms:drift', 'lcpMs:drift',
  ])
})

test('compare: drift under each threshold is silent', () => {
  const current = line({
    bundleJsBytes: 1_040_000, lcpMs: 1450, frameP95Ms: 24, engineMsPerCombat: { all: 1.1 },
  })
  assert.deepEqual(compare({ current, previous: line(), budgets: {} }), [])
})

test('compare: an improvement is never a finding', () => {
  const current = line({ bundleJsBytes: 10, lcpMs: 10, engineMsPerCombat: { all: 0.1 } })
  assert.deepEqual(compare({ current, previous: line(), budgets: {} }), [])
})

test('compare: a runner change skips timing drift but keeps bytes and budgets', () => {
  const current = line({ bundleJsBytes: 1_100_000, lcpMs: 5000, engineMsPerCombat: { all: 9 } }, 'cpu-b')
  const f = compare({ current, previous: line(), budgets: { engineMsPerCombat: undefined, firstScreenMs: 500 } })
  assert.deepEqual(metricsOf(f).sort(), ['bundleJsBytes:drift', 'firstScreenMs:budget breach'])
})

test('compare: timing budgets hold only on the CPU they were seeded on; bytes always do', () => {
  const current = line({ bundleJsBytes: 2_000_000, firstScreenMs: 5000, engineMsPerCombat: { all: 9 } }, 'cpu-b')
  const budgets = { runner: 'cpu-a', bundleJsBytes: 1_500_000, firstScreenMs: 500, 'engineMsPerCombat.all': 2 }
  assert.deepEqual(metricsOf(compare({ current, previous: null, budgets })), ['bundleJsBytes:budget breach'])
  const same = line({ firstScreenMs: 5000 }, 'cpu-a')
  assert.deepEqual(metricsOf(compare({ current: same, previous: null, budgets })), ['firstScreenMs:budget breach'])
})

test('budgetRunnerMismatch: names the seeding CPU only when this run differs', () => {
  assert.equal(budgetRunnerMismatch(line({}, 'cpu-b'), { runner: 'cpu-a' }), 'timing budgets skipped: seeded on cpu-a')
  assert.equal(budgetRunnerMismatch(line({}, 'cpu-a'), { runner: 'cpu-a' }), null)
  assert.equal(budgetRunnerMismatch(line({}, 'cpu-b'), { lcpMs: 1 }), null)
})

test('compare: slowFramePct needs +25% and at least 2 points', () => {
  const previous = line({ slowFramePct: 4 })
  // +50% but only 2 points: a finding.
  assert.deepEqual(metricsOf(compare({ current: line({ slowFramePct: 6 }), previous, budgets: {} })), ['slowFramePct:drift'])
  // +37.5% but 1.5 points: silent.
  assert.deepEqual(compare({ current: line({ slowFramePct: 5.5 }), previous, budgets: {} }), [])
  // From 1% to 2.9%: +190% but under 2 points, silent.
  assert.deepEqual(compare({ current: line({ slowFramePct: 2.9 }), previous: line({ slowFramePct: 1 }), budgets: {} }), [])
})

test('compare: a budget breach outranks drift on the same metric', () => {
  const f = compare({ current: line({ lcpMs: 2000 }), previous: line(), budgets: { lcpMs: 1500 } })
  assert.deepEqual(metricsOf(f), ['lcpMs:budget breach'])
})

test('renderAuditRow matches the AUDIT row shape', () => {
  const row = renderAuditRow(
    { metric: 'lcpMs', kind: 'load', type: 'drift', value: 1550, limit: 1500, previous: 1200 },
    '2026-10-11',
    { commit: 'bbb', previousCommit: 'aaa' },
  )
  const lines = row.split('\n')
  assert.equal(lines[0], '### [ ] [perf] lcpMs drift: 1550 ms vs 1500 ms (2026-10-11)')
  assert.equal(lines[1], '- category: perf')
  assert.equal(lines[2], '- impact: 5')
  assert.equal(lines[3], '- ease: 5')
  assert.match(lines[4], /^- detail: .*1550 ms.*1500 ms.*1200 ms.*bbb.*aaa/)
  assert.match(lines[5], /^- next \(`\/iterate`\): bisect the commits between the two history lines; fix or raise the budget with T\.$/)
  const bytes = renderAuditRow({ metric: 'bundleJsBytes', kind: 'bytes', type: 'budget breach', value: 2048, limit: 1024 }, 'd')
  assert.match(bytes, /- impact: 4/)
  assert.match(bytes, /bundleJsBytes budget breach: 2\.0 KB vs 1\.0 KB/)
})

test('seedBudgets applies 1.20 / 1.10 and rounds up per unit', () => {
  const b = seedBudgets(metrics({
    bundleJsBytes: 10_000, // ×1.1 = 11000 → 11264 (11 KB)
    lcpMs: 1000.4, // ×1.2 = 1200.48 → 1201
    slowFramePct: 4.01, // ×1.2 = 4.812 → 4.9
    engineMsPerCombat: { all: 0.96 }, // ×1.2 = 1.152 → 2
  }))
  assert.equal(b.bundleJsBytes, 11264)
  assert.equal(b.lcpMs, 1201)
  assert.equal(b.slowFramePct, 4.9)
  assert.equal(b['engineMsPerCombat.all'], 2)
  assert.equal(b.firstScreenMs, 1200)
  assert.equal(Object.keys(b).length, 9)
})

test('seedBudgets never seeds under the floors', () => {
  const b = seedBudgets(metrics({ tbtMs: 0, longTaskMs: 10, slowFramePct: 0 }))
  assert.equal(b.tbtMs, 50)
  assert.equal(b.longTaskMs, 50)
  assert.equal(b.slowFramePct, 1)
})

test('roundLimit does not round an exact value up a step', () => {
  assert.equal(roundLimit('lcpMs', 1200), 1200)
  assert.equal(roundLimit('bundleJsBytes', 2048), 2048)
  assert.equal(roundLimit('slowFramePct', 1.2), 1.2)
})

const AUDIT = [
  '# Audit',
  '',
  '## Pending',
  '',
  '### [ ] [tests] something else (2026-10-01)',
  '- category: tests',
  '',
  '## Done',
  '',
].join('\n')

test('fileFindings inserts new rows at the top of Pending', () => {
  const finding = { metric: 'lcpMs', kind: 'load', type: 'drift', value: 1550, limit: 1500, previous: 1200 }
  const { text, added, evidenced } = fileFindings(AUDIT, [finding], '2026-10-11', { commit: 'bbb' })
  const lines = text.split('\n')
  assert.equal(lines[2], '## Pending')
  assert.equal(lines[3], '')
  assert.equal(lines[4], '### [ ] [perf] lcpMs drift: 1550 ms vs 1500 ms (2026-10-11)')
  assert.ok(text.indexOf('[perf] lcpMs') < text.indexOf('[tests] something else'))
  assert.equal(added.length, 1)
  assert.deepEqual(evidenced, [])
})

test('fileFindings never files a metric twice: an open row gets an evidence line', () => {
  const first = { metric: 'lcpMs', kind: 'load', type: 'drift', value: 1550, limit: 1500, previous: 1200 }
  const once = fileFindings(AUDIT, [first], '2026-10-11', { commit: 'bbb' }).text
  const again = { metric: 'lcpMs', kind: 'load', type: 'budget breach', value: 1600, limit: 1500 }
  const { text, added, evidenced } = fileFindings(once, [again], '2026-10-18', { commit: 'ccc' })
  assert.equal(added.length, 0)
  assert.deepEqual(evidenced, ['lcpMs'])
  assert.equal(text.match(/\[perf\] lcpMs/g).length, 1)
  const lines = text.split('\n')
  const ev = lines.findIndex((l) => l.startsWith('- evidence 2026-10-18:'))
  assert.ok(ev > 0)
  assert.match(lines[ev - 1], /^- next/)
  assert.equal(lines[ev + 1], '')
  assert.match(lines[ev], /budget breach 1600 ms vs 1500 ms at ccc/)
})

test('fileFindings files a fresh row when the old one is closed', () => {
  const closed = AUDIT.replace('## Pending\n', '## Pending\n\n### [x] [perf] lcpMs drift: 1 ms vs 1 ms (2026-01-01)\n- category: perf\n')
  const finding = { metric: 'lcpMs', kind: 'load', type: 'drift', value: 1550, limit: 1500 }
  assert.equal(fileFindings(closed, [finding], '2026-10-11').added.length, 1)
})

test('addIssueLine puts the issue under the heading', () => {
  const finding = { metric: 'tbtMs', kind: 'load', type: 'budget breach', value: 80, limit: 50 }
  const { text, added } = fileFindings(AUDIT, [finding], '2026-10-11')
  const withIssue = addIssueLine(text, added[0].title, 512)
  const lines = withIssue.split('\n')
  const at = lines.indexOf(added[0].title)
  assert.equal(lines[at + 1], '- issue: #512')
  assert.equal(lines[at + 2], '- category: perf')
  assert.equal(addIssueLine(text, 'no such heading', 1), text)
})
