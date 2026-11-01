// scripts/check-plan-queues.test.mjs — witness for the plan-queue lint
// (Phase LG1a). Pins each rule on small fixtures, replays the two pr-resolve
// splits the eval found (c95114a2, 49829988), and runs the lint against the
// live queue files so a merge that cuts a row apart fails the root `npm test`.
//
//   node --test scripts/check-plan-queues.test.mjs

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { headerFault, kindOf, lintQueue, lintStatus } from './check-plan-queues.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const critiqueRow = (title, extra = []) => [
  `### [LOW] ${title}`,
  '- pass: 85 (commit 93f05dfe)',
  '- viewport: both',
  '- category: visual',
  '- observation: something seen',
  '- evidence: a capture',
  '- suggested fix: a fix',
  '- source: critique-drive (unattended)',
  ...extra,
]
const critique = (...rows) =>
  ['# Critique log', '', '## Pending', '', ...rows.flatMap((r) => [...r, '']), '## Done', ''].join('\n')

test('well-formed rows in every queue pass', () => {
  assert.deepEqual(lintQueue(critique(critiqueRow('a / b — one'), critiqueRow('a / b — two')), 'critique').findings, [])
  const audit = ['# Audit', '', '## Pending', '', '### [ ] [tests] a gap', '- category: tests', '- next: x', '',
    '### [content][gap] two tags', '- category: content', '', '### untagged title', '- detail: y', ''].join('\n')
  assert.deepEqual(lintQueue(audit, 'audit').findings, [])
  const cands = ['# Phase candidates', '', '## Pending', '', '### [ ] [owner] [score 5.5] A candidate',
    '- proposed: 2026-10-11', '', '### [x] [score 7.5] Another', '- proposed: 2026-10-12', ''].join('\n')
  assert.deepEqual(lintQueue(cands, 'candidates').findings, [])
})

test('a header off its file\'s shape is a finding', () => {
  assert.match(headerFault('### [MEDIUM] combat / hand — x', 'critique', '## Pending'), /does not match/)
  assert.match(headerFault('### combat / hand — no severity', 'critique', '## Pending'), /does not match/)
  assert.match(headerFault('### [ ] [score high] x', 'candidates'), /does not match/)
  assert.match(headerFault('### [x] ', 'audit'), /does not match/)
  assert.equal(headerFault('### [x] [HIGH] combat / hand — fixed', 'critique', '## Done'), null)
})

test('CRITIQUE keeps open rows in Pending and ticked rows in Done', () => {
  assert.match(headerFault('### [x] [LOW] a — b', 'critique', '## Pending'), /ticked row under '## Pending'/)
  assert.match(headerFault('### [LOW] a — b', 'critique', '## Done'), /open row under '## Done'/)
})

test('a blank line between a header and its body is a finding', () => {
  const r = lintQueue(critique(['### [LOW] a / b — x', '', '- pass: 1']), 'critique')
  assert.match(r.findings[0], /line 5: the row's body does not start on the next line/)
})

test('a header glued to the row above it is a finding', () => {
  const text = critique([...critiqueRow('a / b — one'), ...critiqueRow('a / b — two')])
  assert.match(lintQueue(text, 'critique').findings[0], /header follows line \d+ with no blank line/)
})

test('a repeated row is a finding', () => {
  const r = lintQueue(critique(critiqueRow('a / b — same'), critiqueRow('a / b — same')), 'critique')
  assert.match(r.findings[0], /the row at line 5 repeats/)
})

test('a fixed field twice in one row is a finding; free-form keys may repeat', () => {
  const r = lintQueue(critique(critiqueRow('a / b — x', ['- observation: a second one'])), 'critique')
  assert.match(r.findings[0], /'- observation:' twice/)
  const free = ['# C', '', '## Pending', '', '### [ ] [score 3.0] x', '- source: a', '- shape: b', '- source: c', ''].join('\n')
  assert.deepEqual(lintQueue(free, 'candidates').findings, [])
})

test('a blank run past the file\'s norm is a finding', () => {
  const text = ['# Audit', '', '## Pending', '', '', '### [debt] x', '- next: y', ''].join('\n')
  assert.match(lintQueue(text, 'audit').findings[0], /2 blank lines in a row \(max 1\)/)
})

// c95114a2 (merge into loop/iterate-shilling-prices, 2026-10-14): pr-resolve
// kept pass 85's new headers and their `- pass:` lines in one place and their
// bodies in another, so each new row is a header with one line and the
// observation/evidence/suggested-fix lines sit under an older row.
test('the c95114a2 split fails', () => {
  const split = [
    '# Critique log', '', '## Pending', '',
    '### [MED] combat / hand — A Plain Blow draws no FREE pill, so one of the three grey cards looks like it has no free play',
    '- pass: 85 (commit 93f05dfe)',
    '### [LOW] ci / pr-resolve — a hand dispatch with a non-`loop/` branch exits green having done nothing',
    '- pass: antagonist on PR #526 (commit efc7f371)',
    '- viewport: n/a',
    '- category: infra',
    '- observation: with `branch` set to anything outside `loop/`, `scan` is skipped.',
    '- suggested fix: a tiny guard job.',
    '',
    '### [LOW] exploration hub — sealed nodes draw no visible mark, so most roads end at bare vertices',
    '- pass: 84 (commit dd61ec90)',
    '- viewport: both (375x812 and 1280x800)',
    '- category: comprehension',
    '- observation: on the Green Jelly board, A Plain Ward shows its FREE pill ("+4")',
    '- evidence: `.critique-artifacts/mobile/04-combat-board.png`',
    '- suggested fix: add a `DEAL` pair for `r.damage` in `riderPairs`',
    '- observation: on the walked Breakwater sheet ("18 nodes · 12 sealed")',
    '- evidence: `.critique-artifacts/mobile/11-late-game-hub.png`',
    '- suggested fix: drop the extra 0.45 wrapper opacity for sealed nodes',
    '- source: critique-drive (unattended)',
    '',
  ].join('\n')
  const { findings } = lintQueue(split, 'critique')
  assert.ok(findings.some((f) => /line 7: header follows line 6 with no blank line/.test(f)), findings.join('\n'))
  assert.ok(findings.some((f) => /'- observation:' twice in the row at line 14/.test(f)), findings.join('\n'))
})

// 49829988: the same merge path left a Done row's header and its issue line
// with eleven blank lines under it and the rest of its body elsewhere.
test('the 49829988 split fails', () => {
  const split = [
    '# Critique log', '', '## Done', '',
    '### [x] [MED] exploration hub — sealed nodes draw no visible mark — RESOLVED 2026-10-14 (commit cf095d5a)',
    '- issue: #527',
    ...Array(11).fill(''),
    '### [x] [LOW] rest / cache — a later row',
    '- pass: 89 (commit 2927472f)',
    '',
  ].join('\n')
  assert.match(lintQueue(split, 'critique').findings.join('\n'), /line 7: 11 blank lines in a row \(max 2\)/)
})

const status = (...lines) => ['# 01 — Build plan', '', '## Status (at-a-glance)', '', ...lines, '', '## Per-phase scope', ''].join('\n')

test('Status rows with every status word pass', () => {
  const r = lintStatus(status(
    '- [x] (#705) Phase ML1b — shipped: the treatment',
    '      for the build plan. Requires ML1a.',
    '- [ ] Phase LG1a — Plan-queue lint. Requires nothing.',
    '- [-] Phase 12 — partial', '- [skipped] Phase 13 — skipped', '- [blocked: owner-led] Phase B8 — art',
  ))
  assert.deepEqual(r.findings, [])
  assert.equal(r.rows, 5)
})

test('a Status row cut apart, repeated or off-shape is a finding', () => {
  const cut = lintStatus(status('- [x] (#705) Phase ML1b — shipped: the treatment', '>      for the build plan.', '      Requires ML1a.'))
  assert.match(cut.findings[0], /line 7: an indented row line with no row above it/)
  const dup = lintStatus(status('- [ ] Phase LG1a — one', '- [ ] Phase LG1a — again'))
  assert.match(dup.findings[0], /Phase LG1a repeats \(first on line 5\)/)
  const bad = lintStatus(status('- [done] Phase LG1a — x'))
  assert.match(bad.findings[0], /does not match/)
  const blanks = lintStatus(status('- [ ] Phase A — x', '', '', '- [ ] Phase B — y'))
  assert.match(blanks.findings[0], /2 blank lines in a row \(max 1\)/)
})

test('kindOf maps each queue file', () => {
  assert.equal(kindOf('plan/AUDIT.md'), 'audit')
  assert.equal(kindOf('plan/CRITIQUE.md'), 'critique')
  assert.equal(kindOf('plan/CANDIDATES.md'), 'candidates')
  assert.equal(kindOf('plan/README.md'), 'status')
  assert.equal(kindOf('plan/lessons.md'), null)
})

test('the live queue files pass', () => {
  const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-plan-queues.mjs')], { encoding: 'utf8' })
  assert.match(out, /structure clean/)
})
