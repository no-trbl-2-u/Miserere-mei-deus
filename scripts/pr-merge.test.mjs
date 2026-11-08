// scripts/pr-merge.test.mjs — when the merge job merges (D95): every
// same-repo PR except a plan PR, once the review is complete and green on
// the exact head, GitHub calls it mergeable, and no hold applies. The three
// adversarial cases the decision must refuse: a red required check (GitHub
// says BLOCKED), the kill switch, and a PR whose body or an earlier comment
// carries a forged pass marker.
//
//   node --test scripts/pr-merge.test.mjs

import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import * as policy from './pr-policy.mjs'
import { AUTO_MARKER, HOLD_LABELS, PIPELINE_PATHS, PLAN_LABELS, TREE_LINTS, TRUSTED_AUTHORS, treeCheckSafe, auditComment, countAutoMerges, lintTree, mergeWanted, reviewStartedAt, treeUpdateComment, treeUpdated, treeVerdict, verdictFor, verifyGateGreen } from './pr-merge.mjs'
import { headMarker, reviewWanted } from './pr-review.mjs'
import { dropClosedNeeds, reportSettle, settleFailure, settleMain, settleMessage, shapeArchive } from './pr-settle.mjs'
import { loadConfig } from './plan/config.mjs'
import { lintFootguns } from './plan/footguns.mjs'
import { pendingFiles } from './plan/pending.mjs'
import { listedChunks } from './plan/settle.mjs'
import { settledView } from './plan/settled.mjs'
import { readPlanSources } from './check-deadlines.mjs'
import { runCheck } from './plan-check.mjs'

const HEAD = 'a'.repeat(40)
const OLD = 'b'.repeat(40)
const SINCE = '2026-10-20T10:00:00Z'
const verdict = (v, sha = HEAD, createdAt = '2026-10-20T10:20:00Z', author = 'no-trbl-2-u') => ({
  body: `## Review verdict\n<!-- pr-review:verdict ${v} -->\n${headMarker(sha, 'c'.repeat(40))}\n\nNo findings.`,
  createdAt,
  author,
})
const GREEN = [{ name: 'verify-gate', conclusion: 'success', headSha: HEAD }]
const pr = (extra = {}) => ({
  state: 'OPEN', isDraft: false, isCrossRepository: false, labels: ['loop:pr', 'size:M', 'risk:high'], title: 'feat: a thing',
  head: HEAD, mergeStateStatus: 'CLEAN', checks: GREEN, comments: [verdict('pass')], since: SINCE, ...extra,
})

test('adversarial 0: the job needs a green verify-gate on the head itself, not only the ruleset', () => {
  assert.equal(verifyGateGreen(GREEN, HEAD), true)
  assert.equal(verifyGateGreen([], HEAD), false, 'no run, no merge')
  assert.equal(verifyGateGreen([{ name: 'verify-gate', conclusion: 'failure', headSha: HEAD }], HEAD), false)
  assert.equal(verifyGateGreen([{ name: 'verify-gate', conclusion: null, headSha: HEAD }], HEAD), false, 'still running')
  assert.equal(verifyGateGreen([{ name: 'verify-gate', conclusion: 'success', headSha: OLD }], HEAD), false, 'green on another head')
  assert.equal(verifyGateGreen([{ name: 'verify-gate', conclusion: 'failure', headSha: HEAD }, { name: 'verify-gate', conclusion: 'success', headSha: HEAD }], HEAD), true, 'the latest run decides')
  assert.equal(verifyGateGreen([{ name: 'verify-gate', conclusion: 'success', headSha: HEAD }, { name: 'verify-gate', conclusion: 'failure', headSha: HEAD }], HEAD), false)
  assert.equal(verifyGateGreen([{ name: 'review / run', conclusion: 'success', headSha: HEAD }], HEAD), false, 'another check is not the gate')
  const d = mergeWanted(pr({ checks: [] }))
  assert.equal(d.go, false)
  assert.match(d.reason, /verify-gate is not green/)
  assert.match(mergeWanted(pr({ checks: [{ name: 'verify-gate', conclusion: 'failure', headSha: HEAD }] })).reason, /verify-gate is not green/)
})

test('a reviewed, green, non-plan PR merges, whatever its tier', () => {
  for (const tier of ['risk:low', 'risk:medium', 'risk:high']) {
    const d = mergeWanted(pr({ labels: ['loop:pr', tier] }))
    assert.equal(d.go, true, tier)
    assert.match(d.reason, /verdict pass/)
  }
  assert.equal(mergeWanted(pr({ labels: [] })).go, true, 'a hand PR with no labels merges too')
})

test('only a plot PR never merges: the plot label or a plot: title (D101)', () => {
  assert.deepEqual([...PLAN_LABELS], ['plot'])
  assert.match(mergeWanted(pr({ labels: ['plot', 'risk:low'] })).reason, /plan PR \(label plot\)/)
  assert.match(mergeWanted(pr({ title: 'plot: HP4 — a graded set' })).reason, /plan PR \(title\)/)
  assert.match(mergeWanted(pr({ title: 'Plot(RV3): x' })).reason, /plan PR \(title\)/)
  // A critique pass, a lesson or a decision record merges on a pass like any PR (D101).
  assert.equal(mergeWanted(pr({ labels: ['review:plan-only', 'size:S', 'area:loop'] })).go, true, 'review:plan-only merges')
  assert.equal(mergeWanted(pr({ title: 'plan: HP2c ahead of B3f' })).go, true, 'a plan: title merges')
  assert.equal(mergeWanted(pr({ title: 'feat: plan the dock' })).go, true, 'the word inside a title is not a prefix')
})

test('a review:rules-change PR with a passing verdict is held for T (D119)', () => {
  const d = mergeWanted(pr({ labels: ['loop:pr', 'review:rules-change', 'size:S', 'area:mechanics'] }))
  assert.equal(d.go, false)
  assert.match(d.reason, /label review:rules-change/)
  assert.equal(mergeWanted(pr({ labels: ['loop:pr', 'size:S'] })).go, true, 'the same PR without the label merges')
})

test('a nexus sync PR with a passing verdict is held for T: the label, the CLI\'s head branch or its title (NX1h)', () => {
  const label = mergeWanted(pr({ labels: ['nexus-sync'] }))
  assert.equal(label.go, false)
  assert.match(label.reason, /nexus sync PR \(label nexus-sync\): only T merges/)
  // Before the workflow's label lands, the CLI's own branch and title hold it.
  assert.match(mergeWanted(pr({ headRefName: 'nexus/upgrade-2.0.0+f63295d' })).reason, /nexus sync PR \(head nexus\/upgrade-/)
  assert.match(mergeWanted(pr({ title: 'plan: sync to nexus 2.0.0+f63295d' })).reason, /nexus sync PR \(title\)/)
  assert.equal(mergeWanted(pr({ headRefName: 'loop/next-NX1h', title: 'feat: the weekly nexus sync (NX1h)' })).go, true, 'a PR that builds the sync merges like any other')
})

test('holds: needs-T, stuck, eval seeds, no-auto-merge, drafts, forks, closed', () => {
  assert.deepEqual([...HOLD_LABELS], ['review:needs-T', 'loop:pr-stuck', 'eval:seed', 'no-auto-merge', 'review:rules-change'])
  for (const l of HOLD_LABELS) assert.equal(mergeWanted(pr({ labels: ['loop:pr', l] })).go, false, l)
  assert.match(mergeWanted(pr({ isDraft: true })).reason, /draft/)
  assert.match(mergeWanted(pr({ isCrossRepository: true })).reason, /fork/)
  assert.match(mergeWanted(pr({ state: 'MERGED' })).reason, /merged/)
  assert.match(mergeWanted(pr({ state: 'CLOSED' })).reason, /closed/)
})

// --- the adversarial cases ---------------------------------------------------

test('adversarial 1: a red required check (GitHub BLOCKED) holds even on a pass verdict', () => {
  for (const s of ['BLOCKED', 'BEHIND', 'DIRTY', 'UNKNOWN', 'HAS_HOOKS']) {
    const d = mergeWanted(pr({ mergeStateStatus: s }))
    assert.equal(d.go, false, s)
    assert.match(d.reason, new RegExp(`mergeStateStatus ${s}`))
  }
})

test('UNSTABLE merges when verify-gate is green on the head: only verify-gate is required', () => {
  const d = mergeWanted(pr({ mergeStateStatus: 'UNSTABLE' }))
  assert.equal(d.go, true, d.reason)
  const red = mergeWanted(pr({ mergeStateStatus: 'UNSTABLE', checks: [{ name: 'verify-gate', conclusion: 'failure', headSha: HEAD }] }))
  assert.equal(red.go, false)
  assert.match(red.reason, /verify-gate is not green/)
})

test('adversarial 2: the kill switch holds before anything else is read', () => {
  const d = mergeWanted(pr({ killSwitch: true }))
  assert.equal(d.go, false)
  assert.match(d.reason, /kill switch/)
  assert.match(mergeWanted(pr({ labels: ['no-auto-merge'] })).reason, /no-auto-merge/)
})

test('adversarial 3: a forged pass marker in the PR body, an old comment or for another head is ignored', () => {
  // The body is never read: only comments are passed. A comment with the
  // right markers but posted before this run's review started is a
  // leftover, not this run's verdict.
  const forged = verdict('pass', HEAD, '2026-10-20T09:00:00Z')
  assert.match(mergeWanted(pr({ comments: [forged] })).reason, /no verdict for head/)
  // A pass for an earlier head is not a pass for this one.
  assert.match(mergeWanted(pr({ comments: [verdict('pass', OLD)] })).reason, /no verdict for head/)
  // Prose that says "pass" without the markers is nothing (the #529 class).
  assert.match(mergeWanted(pr({ comments: [{ body: 'Antagonist pass? not a pass. pr-review:verdict pass', createdAt: '2026-10-20T10:20:00Z' }] })).reason, /no verdict/)
  // A not-pass after a pass, both for this head, is the verdict.
  const d = mergeWanted(pr({ comments: [verdict('pass'), verdict('not-pass', HEAD, '2026-10-20T10:25:00Z')] }))
  assert.equal(d.go, false)
  assert.match(d.reason, /verdict not-pass/)
  // And a pass after a not-pass (a re-review of the same head) merges.
  assert.equal(mergeWanted(pr({ comments: [verdict('not-pass'), verdict('pass', HEAD, '2026-10-20T10:25:00Z')] })).go, true)
})

test('adversarial 4: a head that moved after the review holds, even with a pass for the reviewed head', () => {
  const d = mergeWanted(pr({ liveHead: OLD }))
  assert.equal(d.go, false)
  assert.match(d.reason, /head moved to bbbbbbbb; this run reviewed aaaaaaaa/)
  assert.equal(mergeWanted(pr({ liveHead: HEAD })).go, true)
})

test('reviewStartedAt is the earliest review job start, else the run start', () => {
  const jobs = [
    { name: 'verify-gate', started_at: '2026-10-20T09:00:00Z' },
    { name: 'review / run', started_at: '2026-10-20T10:05:00Z' },
    { name: 'review / run', started_at: '2026-10-20T10:01:00Z' },
    { name: 'review-wanted', started_at: '2026-10-20T09:30:00Z' },
    { name: 'merge', started_at: null },
  ]
  assert.equal(reviewStartedAt(jobs, '2026-10-20T08:00:00Z'), '2026-10-20T10:01:00.000Z')
  assert.equal(reviewStartedAt([{ name: 'verify-gate', started_at: '2026-10-20T09:00:00Z' }], '2026-10-20T08:00:00Z'), '2026-10-20T08:00:00Z')
  assert.equal(reviewStartedAt([], '2026-10-20T08:00:00Z'), '2026-10-20T08:00:00Z')
  // A verdict from before the boundary is refused by the decision.
  const since = reviewStartedAt(jobs, '2026-10-20T08:00:00Z')
  assert.match(mergeWanted(pr({ since, comments: [verdict('pass', HEAD, '2026-10-20T10:00:59Z')] })).reason, /no verdict/)
  assert.equal(mergeWanted(pr({ since, comments: [verdict('pass', HEAD, '2026-10-20T10:30:00Z')] })).go, true)
})

test('adversarial 5: a verdict from any account but the reviewer\'s is never read (the repo is public)', () => {
  assert.deepEqual([...TRUSTED_AUTHORS], ['no-trbl-2-u', 'claude[bot]', 'github-actions[bot]'])
  // A stranger's perfect forgery after the review started: not a verdict.
  const forged = verdict('pass', HEAD, '2026-10-20T10:20:00Z', 'someone-else')
  assert.match(mergeWanted(pr({ comments: [forged] })).reason, /no verdict .* trusted account/)
  // A stranger's not-pass cannot override the reviewer's pass either; the reviewer's own later not-pass can.
  assert.equal(mergeWanted(pr({ comments: [verdict('pass'), verdict('not-pass', HEAD, '2026-10-20T10:25:00Z', 'someone-else')] })).go, true)
  assert.equal(mergeWanted(pr({ comments: [verdict('pass'), verdict('not-pass', HEAD, '2026-10-20T10:25:00Z', 'claude[bot]')] })).go, false)
  // No author at all is not trusted.
  assert.equal(verdictFor([{ ...verdict('pass'), author: undefined }], HEAD, SINCE), null)
  // The allowlist can be narrowed or moved.
  assert.equal(verdictFor([verdict('pass')], HEAD, SINCE, ['other-bot']), null)
  assert.equal(verdictFor([verdict('pass', HEAD, '2026-10-20T10:20:00Z', 'other-bot')], HEAD, SINCE, ['other-bot']), 'pass')
})

test('a verdict for the same diff on an earlier head stands after a merge of main moved the head', () => {
  const dg = 'c'.repeat(40)
  // The verdict names OLD and the digest; the live head is HEAD with the same digest; it predates this run.
  const reused = { ...verdict('pass', OLD, '2026-10-20T09:00:00Z'), body: verdict('pass', OLD).body }
  assert.equal(mergeWanted(pr({ comments: [reused], digest: dg })).go, true)
  assert.equal(mergeWanted(pr({ comments: [reused] })).go, false, 'no digest known: the head rule alone')
  assert.equal(mergeWanted(pr({ comments: [reused], digest: 'd'.repeat(40) })).go, false, 'another diff')
  assert.equal(mergeWanted(pr({ comments: [{ ...reused, author: 'stranger' }], digest: dg })).go, false, 'still only a trusted author')
  assert.match(mergeWanted(pr({ comments: [{ ...reused, body: reused.body.replace('verdict pass', 'verdict not-pass') }], digest: dg })).reason, /not-pass/)
})

test('a PR that changes the review pipeline never merges itself', () => {
  for (const f of ['scripts/pr-merge.mjs', 'skills/review.md', 'skills/review-fix.md', 'skills/fix-ci.md', '.github/workflows/pr-review.yml', '.github/workflows/pr-autofix.yml', '.github/workflows/pr-resolve.yml', 'scripts/pr-resolve.mjs']) assert.ok(PIPELINE_PATHS.includes(f), f)
  for (const f of PIPELINE_PATHS) assert.match(mergeWanted(pr({ files: ['README.md', f] })).reason, /pipeline PR/, f)
  assert.equal(mergeWanted(pr({ files: ['README.md', 'scripts/pr-risk.test.mjs'] })).go, true, 'a test beside a pipeline file is not the pipeline')
})

test('verdictFor reads only marker-bearing comments for the head, since the run started', () => {
  assert.equal(verdictFor([verdict('pass')], HEAD, SINCE), 'pass')
  assert.equal(verdictFor([verdict('not-pass')], HEAD, SINCE), 'not-pass')
  assert.equal(verdictFor([verdict('pass', OLD)], HEAD, SINCE), null)
  assert.equal(verdictFor([verdict('pass', HEAD, '2026-10-20T09:59:59Z')], HEAD, SINCE), null)
  assert.equal(verdictFor([{ body: '<!-- pr-review:verdict pass -->', createdAt: '2026-10-20T11:00:00Z' }], HEAD, SINCE), null, 'no head marker, no verdict')
  assert.equal(verdictFor([{ body: headMarker(HEAD), createdAt: '2026-10-20T11:00:00Z' }], HEAD, SINCE), null, 'no verdict marker, no verdict')
  assert.equal(verdictFor([{ body: verdict('pass').body, createdAt: 'garbage' }], HEAD, SINCE), null)
})

test('no daily cap: a reviewed green PR merges however many merged before it', () => {
  assert.equal('DAILY_CAP' in policy, false, 'the cap constant is gone')
  for (const n of [0, 11, 12, 13, 99, 10_000]) {
    const d = mergeWanted(pr({ mergedToday: n }))
    assert.equal(d.go, true, `mergedToday ${n}`)
    assert.match(d.reason, new RegExp(`${n} auto-merged in 24h`), 'the count stays in the pass reason')
  }
  const merged = [
    { mergedAt: '2026-10-20T09:00:00Z', comments: [{ body: auditComment({ pr: 1, head: HEAD, run: 7 }) }] },
    { mergedAt: '2026-10-19T09:00:00Z', comments: [{ body: AUTO_MARKER }] },
    { mergedAt: '2026-10-20T09:30:00Z', comments: [{ body: 'T merged this by hand' }] },
  ]
  assert.equal(countAutoMerges(merged, '2026-10-20T10:00:00Z'), 1)
})

test('the holds that survive the cap still fire, at any merge count', () => {
  const holds = {
    'kill switch': [{ killSwitch: true }, /kill switch/],
    'no-auto-merge label': [{ labels: ['no-auto-merge'] }, /label no-auto-merge/],
    'plan PR': [{ labels: ['plot'] }, /plan PR/],
    'pipeline PR': [{ files: ['scripts/pr-policy.mjs'] }, /pipeline PR/],
    'review:needs-T': [{ labels: ['review:needs-T'] }, /label review:needs-T/],
    'loop:pr-stuck': [{ labels: ['loop:pr-stuck'] }, /label loop:pr-stuck/],
    draft: [{ isDraft: true }, /draft/],
    fork: [{ isCrossRepository: true }, /fork/],
    'untrusted verdict author': [{ comments: [verdict('pass', HEAD, '2026-10-20T10:20:00Z', 'mallory')] }, /no verdict/],
    'head moved': [{ liveHead: OLD }, /head moved/],
    'not-pass verdict': [{ comments: [verdict('not-pass')] }, /verdict not-pass/],
    'missing verdict': [{ comments: [] }, /no verdict/],
    'verify-gate not green': [{ checks: [] }, /verify-gate is not green/],
  }
  for (const [name, [extra, reason]] of Object.entries(holds)) {
    for (const mergedToday of [0, 99]) {
      const d = mergeWanted(pr({ mergedToday, ...extra }))
      assert.equal(d.go, false, `${name} at ${mergedToday}`)
      assert.match(d.reason, reason, name)
    }
  }
})

test('the audit comment names the head and the run and carries the marker', () => {
  const c = auditComment({ pr: 5, head: HEAD, run: 123 })
  assert.match(c, /D95/)
  assert.match(c, /Merge requested/, 'the comment follows the merge call and claims no outcome of its own')
  assert.ok(c.includes(HEAD))
  assert.match(c, /run 123/)
  assert.ok(c.endsWith(AUTO_MARKER))
})

// --- the merged-tree check (phase MD1c) ---------------------------------------

const RED = [{ name: 'check-lessons', detail: 'plan/lessons.md: duplicate slug x' }]

test('treeVerdict: green goes on, red updates once, red after an update or a failed update holds naming the lint', () => {
  assert.equal(treeVerdict({ red: [] }).action, 'go')
  assert.equal(treeVerdict({ red: [], updated: true }).action, 'go', 'a green tree after an update goes on')
  const first = treeVerdict({ red: RED })
  assert.equal(first.action, 'update')
  assert.match(first.reason, /check-lessons/)
  const after = treeVerdict({ red: RED, updated: true })
  assert.equal(after.action, 'hold')
  assert.match(after.reason, /still red under check-lessons.*duplicate slug x/)
  const failed = treeVerdict({ red: RED, updateFailed: true })
  assert.equal(failed.action, 'hold')
  assert.match(failed.reason, /conflicted or changed nothing/)
  assert.match(treeVerdict({ red: [{ name: 'check-deadlines' }, { name: 'check-plan-queues' }], updated: true }).reason, /check-deadlines, check-plan-queues/)
})

test('treeUpdated: one update per head, from a trusted account only', () => {
  const NEW = 'c'.repeat(40)
  const body = treeUpdateComment({ from: HEAD, to: NEW, red: ['check-lessons'] })
  assert.match(body, /check-lessons/)
  const mine = [{ body, author: 'no-trbl-2-u' }]
  assert.equal(treeUpdated(mine, HEAD), true, 'the head the update started from')
  assert.equal(treeUpdated(mine, NEW), true, 'the head the update produced')
  assert.equal(treeUpdated(mine, OLD), false, 'any other head has its update to come')
  assert.equal(treeUpdated([{ body, author: 'someone-else' }], HEAD), false, 'a stranger\'s forged marker suppresses nothing')
  assert.equal(treeUpdated([], HEAD), false)
})

test('the live plan passes the tree lints, and a doubled lessons row fails them (main\'s scripts, the tree\'s plan/)', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const scriptsDir = path.join(root, 'scripts')
  const green = lintTree({ scriptsDir, repo: root, treeish: 'HEAD' })
  assert.deepEqual(green.map((r) => r.name), TREE_LINTS.map((l) => l.name))
  assert.ok(green.every((r) => r.ok), JSON.stringify(green.filter((r) => !r.ok)))

  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-merge-tree-'))
  try {
    const run = (...a) => execFileSync('git', a, { cwd: repo, stdio: 'pipe' })
    run('init', '-q')
    run('config', 'user.email', 't@example.com')
    run('config', 'user.name', 't')
    fs.cpSync(path.join(root, 'plan'), path.join(repo, 'plan'), { recursive: true })
    const file = path.join(repo, 'plan', 'lessons.md')
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    const at = lines.findIndex((l) => l.startsWith('- **'))
    lines.splice(at + 1, 0, lines[at])
    fs.writeFileSync(file, lines.join('\n'))
    run('add', '-A')
    run('commit', '-q', '-m', 'doubled row')
    const red = lintTree({ scriptsDir, repo, treeish: 'HEAD' }).filter((r) => !r.ok)
    assert.deepEqual(red.map((r) => r.name), ['check-lessons'])
    assert.ok(red[0].detail.length > 0)
  } finally {
    fs.rmSync(repo, { recursive: true, force: true })
  }
})

test('a throwing tree check becomes a hold outcome with a comment, never a thrown step', async () => {
  const out = path.join(os.tmpdir(), `pr-merge-output-${process.pid}-${Date.now()}`)
  const before = process.env.GITHUB_OUTPUT
  process.env.GITHUB_OUTPUT = out
  const comments = []
  try {
    await treeCheckSafe('o/r', '7', HEAD, { run: async () => { throw new Error('gh: 502 bad gateway') }, comment: (b) => comments.push(b) })
    const text = fs.readFileSync(out, 'utf8')
    assert.match(text, /^go=false$/m)
    assert.match(text, /^reason=tree check: errored, so no merge \(gh: 502 bad gateway\)$/m)
    assert.equal(comments.length, 1)
    assert.match(comments[0], /502 bad gateway/)
    await treeCheckSafe('o/r', '7', HEAD, { run: async () => { throw new Error('x') }, comment: () => { throw new Error('comment failed too') } })
  } finally {
    if (before === undefined) delete process.env.GITHUB_OUTPUT
    else process.env.GITHUB_OUTPUT = before
    fs.rmSync(out, { force: true })
  }
})

// --- settle on merge (phase NX1e) ---------------------------------------------
//
// No checkout is nexus's owner here, so a merged PR's plan/pending/ files settle on main from
// the push that merged it: pr-resolve's scan calls settleMain (scripts/pr-settle.mjs) first.
// A scratch repo plays origin and main: a PR branch commits its work and its pending close,
// merges as GitHub's merge commit does, and the settle lands on origin/main.

const SPEC = [
  '# 07 · Search',
  '',
  '## Acceptance',
  '',
  '- **A1** A query finds the offices.',
  '- **A2** A zip finds them too.',
  '',
  '## Chunks',
  '',
  'Measure: 2 open · 0 closed · next A3',
  '',
  '- [ ] **07.1** Search · S · closes A1 · needs — · alias: XY1a',
  '- [ ] **07.2** Zip · S · closes A2 · needs 07.1 · alias: XY1b',
  '',
].join('\n')
const README = [
  '# roadmap',
  '',
  '## Lanes',
  '',
  '**Asap** (in this order):',
  '',
  '- (none yet)',
  '',
  '**Held**:',
  '',
  '## Specs',
  '',
  '| # | Initiative | Spec | Status | Progress |',
  '|---|---|---|---|---|',
  '| 07 | Search | [07-search.md](07-search.md) | planned | 2 left |',
  '',
].join('\n')
const PENDING = ['---', 'close: 07.1', 'date: 2026-11-01', 'says: A query finds the offices', '---', ''].join('\n')

function scratchOrigin() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-settle-'))
  const origin = path.join(dir, 'origin.git')
  const work = path.join(dir, 'work')
  const g = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim()
  g(dir, 'init', '-q', '--bare', '-b', 'main', origin)
  g(dir, 'clone', '-q', origin, work)
  for (const [k, v] of [['user.email', 't@example.com'], ['user.name', 't'], ['core.autocrlf', 'false']]) g(work, 'config', k, v)
  g(work, 'switch', '-q', '-c', 'main')
  fs.mkdirSync(path.join(work, 'plan'), { recursive: true })
  fs.writeFileSync(path.join(work, 'plan/07-search.md'), SPEC)
  fs.writeFileSync(path.join(work, 'plan/README.md'), README)
  fs.writeFileSync(path.join(work, 'plan/ARCHIVE.md'), '# Archive\n\n- 2026-10-01 · 06.1 (alias: OLD1) · Old work · 1234567 (#7)\n')
  g(work, 'add', '-A')
  g(work, 'commit', '-q', '-m', 'plan: the search spec')
  g(work, 'push', '-q', '-u', 'origin', 'main')
  return { dir, work, g }
}

/** A PR from loop/next-07.1: its work, then its pending close, merged as GitHub merges. */
function mergePr(work, g, n = 42) {
  g(work, 'switch', '-q', '-c', 'loop/next-07.1')
  fs.writeFileSync(path.join(work, 'search.txt'), 'finds offices\n')
  g(work, 'add', 'search.txt')
  g(work, 'commit', '-q', '-m', 'feat: search')
  fs.mkdirSync(path.join(work, 'plan/pending'), { recursive: true })
  fs.writeFileSync(path.join(work, 'plan/pending/07.1.md'), PENDING)
  g(work, 'add', 'plan/pending/07.1.md')
  g(work, 'commit', '-q', '-m', 'plan: close 07.1')
  g(work, 'switch', '-q', 'main')
  g(work, 'merge', '-q', '--no-ff', '-m', `Merge pull request #${n} from o/loop/next-07.1`, 'loop/next-07.1')
  g(work, 'push', '-q', 'origin', 'main')
}

test('settle on merge: a merged PR\'s pending close settles on origin/main, with its alias and PR number', () => {
  const { dir, work, g } = scratchOrigin()
  try {
    mergePr(work, g)
    const logs = []
    const r = settleMain({ root: work, lint: () => [], log: (s) => logs.push(s) })
    assert.equal(r.state, 'settled', JSON.stringify(r))
    assert.deepEqual(r.ids, ['07.1'])
    g(work, 'fetch', '-q', 'origin')
    assert.equal(g(work, 'log', '-1', '--format=%s', 'origin/main'), 'plan: settle 07.1')
    const archive = g(work, 'show', 'origin/main:plan/ARCHIVE.md')
    assert.match(archive, /^- 2026-11-01 · 07\.1 \(alias: XY1a\) · A query finds the offices · [0-9a-f]{8}\.\.[0-9a-f]{8} \(#42\)$/m)
    assert.match(archive, /^- 2026-10-01 · 06\.1 \(alias: OLD1\) · Old work · 1234567 \(#7\)$/m, 'older lines untouched')
    const spec = g(work, 'show', 'origin/main:plan/07-search.md')
    assert.doesNotMatch(spec, /\*\*07\.1\*\*/)
    assert.match(spec, /\*\*07\.2\*\* Zip · S · closes A2 · needs — · alias: XY1b/, 'the closed need left, past the alias the kit reads as part of it')
    assert.doesNotMatch(g(work, 'ls-tree', '-r', '--name-only', 'origin/main', 'plan/'), /plan\/pending\/07\.1\.md/)
    assert.match(g(work, 'show', 'origin/main:plan/README.md'), /\| 1 left \|/)
    // The settle commit's own push settles nothing.
    assert.equal(settleMain({ root: work, lint: () => [] }).state, 'nothing')
    assert.ok(logs.some((l) => /settled 07\.1 \(PRs #42\)/.test(l)), logs.join('\n'))
    assert.equal(g(work, 'worktree', 'list').split('\n').length, 1, 'the throwaway worktree is gone')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('settle on merge: a settle that adds a lint failure, or a dry run, pushes nothing', () => {
  const { dir, work, g } = scratchOrigin()
  try {
    mergePr(work, g)
    const tip = g(work, 'rev-parse', 'origin/main')
    let calls = 0
    const red = settleMain({ root: work, lint: () => (calls++ % 2 ? ['plan-check: something broke'] : []), log: () => {} })
    assert.equal(red.state, 'refused')
    assert.match(red.reason, /turns the plan lints red: plan-check: something broke/)
    // A failure the plan already had before the settle is not the settle's: it would land.
    assert.equal(settleMain({ root: work, lint: () => ['old failure'], dryRun: true, log: () => {} }).state, 'settled')
    g(work, 'fetch', '-q', 'origin')
    assert.equal(g(work, 'rev-parse', 'origin/main'), tip, 'neither the refusal nor the dry run pushed')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

/** Commit `files` (path → text) straight on main and push: what a merged PR leaves there. */
function landOnMain(work, g, files) {
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(work, file)), { recursive: true })
    fs.writeFileSync(path.join(work, file), text)
    g(work, 'add', '--', file)
  }
  g(work, 'commit', '-q', '-m', 'test: land on main')
  g(work, 'push', '-q', 'origin', 'main')
}

test('settle on merge: a pending file with a footgun settles into the list this repo keeps', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const list = loadConfig(root).footguns
  assert.ok(fs.existsSync(path.join(root, list)), `settle's footgun list, ${list}, is on main: without it every pending file with a footgun is skipped`)
  const { dir, work, g } = scratchOrigin()
  try {
    const line = '- **new-trap** · a trap → a rule · seen 1× · last 2026-11-01 · open'
    landOnMain(work, g, {
      [list]: fs.readFileSync(path.join(root, list), 'utf8'),
      'plan/pending/07.1.md': `${PENDING}## Footguns\n${line}\n`,
    })
    const r = settleMain({ root: work, lint: () => [], log: () => {} })
    assert.equal(r.state, 'settled', JSON.stringify(r))
    assert.deepEqual(r.left, [])
    assert.equal(settleFailure(r), null)
    g(work, 'fetch', '-q', 'origin')
    const open = g(work, 'show', `origin/main:${list}`).split('## Watch')[0]
    assert.ok(open.split('\n').includes(line), open)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('dropClosedNeeds: a closed id leaves a needs list that an alias follows, and nothing else moves', () => {
  const closed = new Set(['146.1', '146.4'])
  const line = (needs) => `- [ ] **146.6** Every foe · S · closes A6 · needs ${needs} · alias: AP1f`
  assert.equal(dropClosedNeeds(line('146.1, 146.4'), closed), line('—'))
  assert.equal(dropClosedNeeds(line('146.1, 146.2'), closed), line('146.2'))
  assert.equal(dropClosedNeeds(line('146.2'), closed), line('146.2'))
  const prose = '- **A1** It · needs 146.1 · says so'
  assert.equal(dropClosedNeeds(prose, closed), prose)
})

test('no pending file names a bare dash as a footgun: settle reads it as a slug and skips the file', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const dashed = pendingFiles(root).filter((f) => /^footguns:\s*-\s*$/m.test(f.text)).map((f) => f.file)
  assert.deepEqual(dashed, [], 'leave the footguns line empty, or out')
})

test('the footgun list passes its lint, and a trap has one home across it and the lessons', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const cfg = loadConfig(root)
  const text = fs.readFileSync(path.join(root, cfg.footguns), 'utf8')
  assert.deepEqual(lintFootguns(text, cfg.footguns, cfg.limits), [])
  const slugs = (t) => [...t.matchAll(/^- \*\*([a-z0-9-]+)\*\* · /gm)].map((m) => m[1])
  const lessons = new Set(slugs(fs.readFileSync(path.join(root, 'plan/lessons.md'), 'utf8')))
  assert.deepEqual(slugs(text).filter((s) => lessons.has(s)), [])
})

test('a refused settle is a failure someone sees, and names why', () => {
  const { dir, work, g } = scratchOrigin()
  try {
    // The one file there is would empty its spec: it is held back, so nothing settles and nothing lands.
    landOnMain(work, g, {
      'plan/07-search.md': SPEC.replace('- **A2** A zip finds them too.\n', '').replace(/^- \[ \] \*\*07\.2\*\*.*\n/m, ''),
      'plan/pending/07.1.md': PENDING,
    })
    const tip = g(work, 'rev-parse', 'origin/main')
    const refused = settleMain({ root: work, lint: () => [], log: () => {} })
    assert.equal(refused.state, 'refused')
    const why = /held back plan\/pending\/07\.1\.md: it would leave plan\/07-search\.md with no chunk/
    assert.match(settleFailure(refused), why)
    const lines = []
    assert.match(reportSettle(() => refused, (s) => lines.push(s)), why)
    assert.match(lines[0], /^::error::pr-settle: .*held back/)
    g(work, 'fetch', '-q', 'origin')
    assert.equal(g(work, 'rev-parse', 'origin/main'), tip, 'a refusal pushes nothing')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

/** Spec 08 with one chunk, its roadmap row beside 07's: a close of 08.1 would empty it. */
const SPEC_ONE = ['# 08 · Maps', '', '## Acceptance', '', '- **A1** A map.', '', '## Chunks', '', 'Measure: 1 open · 0 closed · next A2', '', '- [ ] **08.1** Map · S · closes A1 · needs — · alias: XY2a', ''].join('\n')
const README_TWO = README.replace('| 2 left |\n', '| 2 left |\n| 08 | Maps | [08-maps.md](08-maps.md) | planned | 1 left |\n')
const closeOf = (id, says = 'It works', date = '2026-11-01') => ['---', `close: ${id}`, `date: ${date}`, `says: ${says}`, '---', ''].join('\n')
const PLOT_MORE = ['---', 'date: 2026-11-03', '---', '## Add plan/08-maps.md', '~~~ acceptance', '- **A?more** More maps.', '~~~', '~~~ chunks', '- [ ] **08.?more** More · S · closes A?more · needs — · alias: XY2b', '~~~', ''].join('\n')

test('a settle with one file that empties a spec settles the rest, and names the held file and why', () => {
  const { dir, work, g } = scratchOrigin()
  try {
    landOnMain(work, g, { 'plan/08-maps.md': SPEC_ONE, 'plan/README.md': README_TWO, 'plan/pending/07.1.md': PENDING, 'plan/pending/08.1.md': closeOf('08.1') })
    const r = settleMain({ root: work, lint: () => [], log: () => {} })
    assert.equal(r.state, 'settled', JSON.stringify(r))
    assert.deepEqual(r.ids, ['07.1'])
    assert.deepEqual(r.left, ['plan/pending/08.1.md'])
    assert.match(settleFailure(r), /held back plan\/pending\/08\.1\.md: it would leave plan\/08-maps\.md with no chunk: absorb the spec by hand/)
    const lines = []
    reportSettle(() => r, (s) => lines.push(s))
    assert.match(lines.at(-1), /^::error::pr-settle: .*held back plan\/pending\/08\.1\.md/)
    g(work, 'fetch', '-q', 'origin')
    assert.equal(g(work, 'log', '-1', '--format=%s', 'origin/main'), 'plan: settle 07.1')
    assert.match(g(work, 'show', 'origin/main:plan/08-maps.md'), /\*\*08\.1\*\*/, 'the spec it would empty is as it was')
    assert.equal(g(work, 'show', 'origin/main:plan/pending/08.1.md'), closeOf('08.1').trim(), 'the held file stays pending')
    assert.doesNotMatch(g(work, 'show', 'origin/main:plan/ARCHIVE.md'), /08\.1/)
    assert.match(g(work, 'show', 'origin/main:plan/README.md'), /08-maps\.md\) \| planned \| 1 left \|/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('two closes that together empty a spec: only the last is held, and alone it settles nothing', () => {
  const { dir, work, g } = scratchOrigin()
  try {
    landOnMain(work, g, { 'plan/pending/07.1.md': PENDING, 'plan/pending/07.2.md': closeOf('07.2', 'A zip finds them') })
    const r = settleMain({ root: work, lint: () => [], log: () => {} })
    assert.deepEqual(r.ids, ['07.1'], JSON.stringify(r))
    assert.deepEqual(r.left, ['plan/pending/07.2.md'])
    g(work, 'fetch', '-q', 'origin')
    assert.match(g(work, 'show', 'origin/main:plan/07-search.md'), /\*\*07\.2\*\* Zip · S · closes A2 · needs — · alias: XY1b/)
    const tip = g(work, 'rev-parse', 'origin/main')
    const refused = settleMain({ root: work, lint: () => [], log: () => {} })
    assert.equal(refused.state, 'refused')
    assert.match(settleFailure(refused), /held back plan\/pending\/07\.2\.md: it would leave plan\/07-search\.md with no chunk/)
    g(work, 'fetch', '-q', 'origin')
    assert.equal(g(work, 'rev-parse', 'origin/main'), tip, 'a refusal pushes nothing')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a spec emptied mid-run and refilled later in the run settles whole', () => {
  const { dir, work, g } = scratchOrigin()
  try {
    landOnMain(work, g, { 'plan/08-maps.md': SPEC_ONE, 'plan/README.md': README_TWO, 'plan/pending/08.1.md': closeOf('08.1'), 'plan/pending/plot-more.md': PLOT_MORE })
    const r = settleMain({ root: work, lint: () => [], log: () => {} })
    assert.equal(r.state, 'settled', JSON.stringify(r))
    assert.deepEqual(r.left, [])
    assert.equal(settleFailure(r), null)
    g(work, 'fetch', '-q', 'origin')
    const spec = g(work, 'show', 'origin/main:plan/08-maps.md')
    assert.doesNotMatch(spec, /\*\*08\.1\*\*/)
    assert.match(spec, /\*\*08\.2\*\* More · S · closes A2/)
    assert.match(g(work, 'show', 'origin/main:plan/ARCHIVE.md'), /· 08\.1 \(alias: XY2a\) · It works ·/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a refill whose own chunk also closes in the run holds back that last close, not the first', () => {
  const { dir, work, g } = scratchOrigin()
  try {
    landOnMain(work, g, {
      'plan/08-maps.md': SPEC_ONE,
      'plan/README.md': README_TWO,
      'plan/pending/08.1.md': closeOf('08.1'),
      'plan/pending/plot-more.md': PLOT_MORE,
      'plan/pending/08.2.md': closeOf('08.2', 'More maps', '2026-11-04'),
    })
    const r = settleMain({ root: work, lint: () => [], log: () => {} })
    assert.deepEqual(r.left, ['plan/pending/08.2.md'], JSON.stringify(r))
    assert.deepEqual(r.ids.sort(), ['08.1', 'plot-more'])
    g(work, 'fetch', '-q', 'origin')
    assert.match(g(work, 'show', 'origin/main:plan/08-maps.md'), /\*\*08\.2\*\*/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a held file leaves nothing of itself behind: the decision numbers go to the files that settle', () => {
  const { dir, work, g } = scratchOrigin()
  try {
    const deciding = (text, slug) => `${text}## Decisions\n- **D?${slug}** · 2026-11-01 · A call. *Why:* a reason.\n`
    landOnMain(work, g, {
      'plan/08-maps.md': SPEC_ONE,
      'plan/README.md': README_TWO,
      'identity/decisions/2026.md': '# 2026\n\n- **D5** · 2026-01-01 · Old.\n',
      // Taken first, so a run that kept the emptying pass would have spent D6 on it.
      'plan/pending/08.1.md': deciding(closeOf('08.1', 'It works', '2026-10-30'), 'held-one'),
      'plan/pending/07.1.md': deciding(PENDING, 'kept-one'),
    })
    const r = settleMain({ root: work, lint: () => [], log: () => {} })
    assert.deepEqual(r.ids, ['07.1'], JSON.stringify(r))
    g(work, 'fetch', '-q', 'origin')
    const decisions = g(work, 'show', 'origin/main:identity/decisions/2026.md')
    assert.match(decisions, /\*\*D6\*\* · 2026-11-01 · A call/)
    assert.doesNotMatch(decisions, /D7|held-one/)
    assert.match(g(work, 'show', 'origin/main:plan/pending/08.1.md'), /D\?held-one/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a close that leaves open acceptance and no chunk is held too, and asks for chunks instead of an absorb', () => {
  const { dir, work, g } = scratchOrigin()
  try {
    const partial = SPEC_ONE.replace('closes A1 ·', 'closes A1 (partial) ·')
    landOnMain(work, g, { 'plan/08-maps.md': partial, 'plan/README.md': README_TWO, 'plan/pending/07.1.md': PENDING, 'plan/pending/08.1.md': closeOf('08.1') })
    const r = settleMain({ root: work, lint: () => [], log: () => {} })
    assert.deepEqual(r.ids, ['07.1'], JSON.stringify(r))
    assert.match(settleFailure(r), /held back plan\/pending\/08\.1\.md: it would leave plan\/08-maps\.md with no chunk under open acceptance: chunk the spec/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// While a file waits, every other PR's root `npm test` reads the plan through plan-check and check-deadlines.
const lintsOf = (root) => {
  const sources = readPlanSources(root)
  return [...runCheck({ repoAbs: root }).failures, ...sources.specs.filter((s) => !listedChunks(s.md).length).map((s) => `${s.file}: empty in the deadline view`)]
}
const EDIT_EMPTIES = ['---', 'date: 2026-11-01', '---', '## Edit plan/08-maps.md', '~~~ old', '- [ ] **08.1** Map · S · closes A1 · needs — · alias: XY2a', '~~~', '~~~ new', '~~~', ''].join('\n')

test('a held close leaves the plan lints green for every other PR: closes wait for settle in the view', () => {
  const { dir, work, g } = scratchOrigin()
  try {
    landOnMain(work, g, { 'plan/08-maps.md': SPEC_ONE, 'plan/README.md': README_TWO, 'plan/pending/07.1.md': PENDING, 'plan/pending/08.1.md': closeOf('08.1') })
    assert.deepEqual(settleMain({ root: work, lint: () => [], log: () => {} }).left, ['plan/pending/08.1.md'])
    g(work, 'pull', '-q', 'origin', 'main')
    assert.deepEqual(lintsOf(work), [])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a held edit that empties a spec leaves the plan lints green too: the view holds back what settle would', () => {
  const { dir, work, g } = scratchOrigin()
  try {
    landOnMain(work, g, { 'plan/08-maps.md': SPEC_ONE, 'plan/README.md': README_TWO, 'plan/pending/07.1.md': PENDING, 'plan/pending/empties.md': EDIT_EMPTIES })
    const r = settleMain({ root: work, lint: () => [], log: () => {} })
    assert.deepEqual(r.left, ['plan/pending/empties.md'], JSON.stringify(r))
    g(work, 'pull', '-q', 'origin', 'main')
    assert.deepEqual(lintsOf(work), [])
    const view = settledView(work)
    assert.deepEqual(view.problems, [])
    assert.deepEqual([...view.held.keys()], ['plan/pending/empties.md'])
    assert.match(view.read('plan/08-maps.md'), /\*\*08\.1\*\*/, 'the spec reads as settle would leave it')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('the view judges on the end state as settle does: an edit that empties a spec a later plot refills is not held', () => {
  const { dir, work, g } = scratchOrigin()
  try {
    landOnMain(work, g, { 'plan/08-maps.md': SPEC_ONE, 'plan/README.md': README_TWO, 'plan/pending/empties.md': EDIT_EMPTIES, 'plan/pending/plot-more.md': PLOT_MORE })
    const view = settledView(work)
    assert.deepEqual([...view.held.keys()], [])
    assert.doesNotMatch(view.read('plan/08-maps.md'), /\*\* Map ·/, 'the edit stands')
    assert.match(view.read('plan/08-maps.md'), /\*\* More ·/, 'and the plot refills')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// The CLI itself, spawned. Its root is its own file's parent, so a scratch repo gets a copy of the script and what it imports.
function copyScript(from, toRoot, rel, seen = new Set()) {
  if (seen.has(rel)) return
  seen.add(rel)
  const text = fs.readFileSync(path.join(from, rel), 'utf8')
  fs.mkdirSync(path.dirname(path.join(toRoot, rel)), { recursive: true })
  fs.writeFileSync(path.join(toRoot, rel), text)
  for (const m of text.matchAll(/^\s*(?:import|export)\b[^'"\n]*?from\s+['"](\.[^'"]+)['"]/gm)) {
    copyScript(from, toRoot, path.posix.join(path.posix.dirname(rel), m[1]), seen)
  }
}

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const settleCli = (root, ...args) => spawnSync(process.execPath, [path.join(root, 'scripts/pr-settle.mjs'), ...args], { cwd: root, encoding: 'utf8' })

test('the CLI red path: a held file lands the rest, prints the visible ::error:: and exits 1', () => {
  const { dir, work, g } = scratchOrigin()
  try {
    landOnMain(work, g, { 'plan/08-maps.md': SPEC_ONE, 'plan/README.md': README_TWO, 'plan/pending/07.1.md': PENDING, 'plan/pending/08.1.md': closeOf('08.1') })
    copyScript(REPO, work, 'scripts/pr-settle.mjs')
    const run = settleCli(work)
    assert.equal(run.status, 1, run.stdout + run.stderr)
    assert.match(run.stdout, /^settle: held back plan\/pending\/08\.1\.md: /m)
    assert.match(run.stdout, /^::error::pr-settle: settled 1 files, but 1 stay pending.*held back plan\/pending\/08\.1\.md/m)
    assert.doesNotMatch(run.stderr, /\n\s+at /, 'no stack')
    g(work, 'fetch', '-q', 'origin')
    assert.equal(g(work, 'log', '-1', '--format=%s', 'origin/main'), 'plan: settle 07.1')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('the CLI on --ref misuse: one plain line and a usage exit, nothing run', () => {
  for (const args of [['--ref', 'HEAD'], ['--dry-run', '--ref'], ['--dry-run', '--ref', '--no-such']]) {
    const run = settleCli(REPO, ...args)
    assert.equal(run.status, 64, args.join(' '))
    assert.equal(run.stdout, '')
    assert.equal(run.stderr.trim().split('\n').length, 1, run.stderr)
    assert.match(run.stderr, /^pr-settle: --ref is for a dry run only/)
  }
})

test('a settle that skips a file lands the rest and still fails, naming what stays', () => {
  const { dir, work, g } = scratchOrigin()
  try {
    const stale = ['---', 'date: 2026-11-01', '---', '## Edit plan/README.md', '~~~ old', 'text main has moved past', '~~~', '~~~ new', 'x', '~~~', ''].join('\n')
    landOnMain(work, g, { 'plan/pending/07.1.md': PENDING, 'plan/pending/stale.md': stale })
    const r = settleMain({ root: work, lint: () => [], log: () => {} })
    assert.equal(r.state, 'settled', JSON.stringify(r))
    assert.deepEqual(r.ids, ['07.1'])
    assert.deepEqual(r.left, ['plan/pending/stale.md'])
    assert.match(settleFailure(r), /settled 1 files, but 1 stay pending.*plan\/pending\/stale\.md/)
    g(work, 'fetch', '-q', 'origin')
    assert.match(g(work, 'log', '-1', '--format=%s', 'origin/main'), /^plan: settle 07\.1$/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('reportSettle: only a clean settle or nothing to do stays quiet, and a throw is a failure', () => {
  const lines = []
  const log = (s) => lines.push(s)
  assert.equal(reportSettle(() => ({ state: 'nothing' }), log), null)
  assert.equal(reportSettle(() => ({ state: 'settled', ids: ['07.1'], left: [] }), log), null)
  assert.deepEqual(lines, ['settle: pushed the settle of 07.1'])
  assert.match(reportSettle(() => ({ state: 'lost', reason: 'rejected 3 times' }), log), /rejected 3 times/)
  assert.match(reportSettle(() => { throw new Error('no git\nstack') }, log), /^settle errored: no git$/)
  assert.ok(lines.at(-1).startsWith('::error::pr-settle: settle errored'))
})

test('a dry run rehearses another commit by --ref and refuses to push one', () => {
  const { dir, work, g } = scratchOrigin()
  try {
    g(work, 'switch', '-q', '-c', 'side')
    fs.mkdirSync(path.join(work, 'plan/pending'), { recursive: true })
    fs.writeFileSync(path.join(work, 'plan/pending/07.1.md'), PENDING)
    g(work, 'add', '-A')
    g(work, 'commit', '-q', '-m', 'plan: close 07.1')
    // origin/main holds nothing pending; the branch does.
    assert.equal(settleMain({ root: work, lint: () => [], dryRun: true, log: () => {} }).state, 'nothing')
    assert.equal(settleMain({ root: work, lint: () => [], dryRun: true, ref: 'HEAD', log: () => {} }).state, 'settled')
    assert.throws(() => settleMain({ root: work, lint: () => [], ref: 'HEAD', log: () => {} }), /dry run only/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a red scan still dispatches its resolves, and pr-resolve fails the step on a settle failure', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const yml = fs.readFileSync(path.join(root, '.github/workflows/pr-resolve.yml'), 'utf8').replace(/\r\n/g, '\n')
  assert.match(yml, /name: Dispatch a Claude resolve per conflicted PR\n\s+if: \$\{\{ !cancelled\(\) && /)
  const resolve = fs.readFileSync(path.join(root, 'scripts/pr-resolve.mjs'), 'utf8')
  assert.match(resolve, /if \(reportSettle\(\(\) => settleMain\(\{ root: ROOT \}\)\)\) process\.exitCode = 1/)
  // Nothing after the scan clears it: the mode ends by returning.
  assert.doesNotMatch(resolve, /process\.exitCode = 0/)
})

// A review posted on the head by an earlier run, then this run's gate goes green: `review-wanted` runs
// on the new run, and the merge job runs only when it says go-and-reviewed or reuse (the job's `if`).
{
  const DIGEST = 'c'.repeat(40)
  // This run's review never ran, so `since` is after the verdict: only the digest match can find it.
  const LATE = '2026-10-20T11:00:00Z'
  const lateRun = (extra = {}) => {
    const facts = pr({ digest: DIGEST, since: LATE, ...extra })
    const wanted = reviewWanted({ ...facts, comments: facts.comments.map((c) => c.body) })
    const jobRuns = wanted.reuse === true
    return { wanted, jobRuns, decision: jobRuns ? mergeWanted(facts) : null, facts }
  }

  test('late gate: a pass on the head before the gate finished runs the decision and merges', () => {
    const { wanted, jobRuns, decision } = lateRun()
    assert.equal(wanted.go, false, 'no second review')
    assert.equal(jobRuns, true, 'the merge job runs')
    assert.equal(decision.go, true)
    assert.match(decision.reason, /verdict pass/)
  })

  test('late gate: the pass predates this run, and the digest is what finds it', () => {
    const { facts } = lateRun({ digest: null })
    assert.match(mergeWanted(facts).reason, /no verdict/, 'the head rule alone is bound by since')
  })

  test('late gate: a not-pass on the head never reaches the merge', () => {
    const { wanted, jobRuns, facts } = lateRun({ comments: [verdict('not-pass')] })
    assert.equal(wanted.go, false)
    assert.equal(jobRuns, false, 'a not-pass does not run the job')
    assert.match(mergeWanted(facts).reason, /not-pass/, 'and the decision refuses it anyway')
  })

  test('late gate: the latest verdict on the head counts', () => {
    const later = verdict('not-pass', HEAD, '2026-10-20T10:40:00Z')
    assert.equal(lateRun({ comments: [verdict('pass'), later] }).jobRuns, false)
    const repassed = verdict('pass', HEAD, '2026-10-20T10:50:00Z')
    assert.equal(lateRun({ comments: [later, repassed] }).jobRuns, true)
  })

  test('late gate: a pass with a hold label, a plot or the kill switch does not merge', () => {
    for (const label of HOLD_LABELS) {
      const { decision, facts } = lateRun({ labels: ['loop:pr', label] })
      // A seeded draft stops at review-wanted; every other hold reaches the decision and stops there.
      assert.equal(decision?.go ?? false, false, label)
      assert.match(mergeWanted(facts).reason, new RegExp(label), label)
    }
    assert.equal(lateRun({ labels: ['plot'] }).decision, null, 'a plot PR is never reviewed or merged here')
    assert.match(lateRun({ title: 'feat: x', labels: ['no-auto-merge'] }).decision.reason, /no-auto-merge/)
    assert.match(lateRun({ killSwitch: true }).decision.reason, /kill switch/)
  })

  test('late gate: a pass on an older head does not merge the new head', () => {
    const { wanted, jobRuns, facts } = lateRun({ comments: [verdict('pass', OLD)], digest: 'd'.repeat(40) })
    assert.equal(wanted.go, true, 'a new diff is reviewed')
    assert.equal(jobRuns, false, 'not the late path')
    assert.match(mergeWanted(facts).reason, /no verdict/, 'and the old pass is no verdict for this head')
  })

  test('late gate: a red or missing gate on the head still holds', () => {
    assert.match(lateRun({ checks: [] }).decision.reason, /verify-gate is not green/)
    assert.match(lateRun({ checks: [{ name: 'verify-gate', conclusion: 'failure', headSha: HEAD }] }).decision.reason, /verify-gate is not green/)
  })

  test('late gate: a second trigger after the merge is a clean no-op, so a PR merges once', () => {
    const merged = lateRun({ state: 'MERGED' })
    assert.equal(merged.wanted.go, false)
    assert.equal(merged.jobRuns, false, 'review-wanted reads MERGED first: the job does not run')
    const d = mergeWanted(merged.facts)
    assert.deepEqual(d, { go: false, reason: 'PR is merged' }, 'a run already queued in the group holds rather than fails')
  })

  test('late gate: a PR whose gate was green at review time takes the one ordinary route', () => {
    const fresh = reviewWanted({ state: 'OPEN', isDraft: false, isCrossRepository: false, labels: ['loop:pr'], head: HEAD, digest: DIGEST, comments: [] })
    assert.equal(fresh.go, true, 'the review runs and the merge job follows it')
    assert.equal(fresh.reuse, undefined, 'not reuse: one route, one merge request')
  })
}

test('shapeArchive: only the lines settle added gain the alias and the PR', () => {
  const before = '- 2026-10-01 · 06.1 (alias: OLD1) · Old · 1234567 (#7)'
  const added = '- 2026-11-01 · 07.1 · New · aaaaaaaa..bbbbbbbb'
  const plain = '- 2026-11-01 · 07.3 · Plan only · plan only'
  const out = shapeArchive([before, added, plain, ''].join('\n'), [added, plain], new Map([['07.1', ['XY1a']]]), new Map([['07.1', '42']]))
  assert.deepEqual(out.split('\n'), [before, '- 2026-11-01 · 07.1 (alias: XY1a) · New · aaaaaaaa..bbbbbbbb (#42)', plain, ''])
  assert.deepEqual(settleMessage(['07.1']), ['-m', 'plan: settle 07.1'])
  assert.equal(settleMessage(Array.from({ length: 12 }, (_, i) => `07.${i + 10}`))[1], 'plan: settle 12 pending files')
})

test('the merge job owns the settle: pr-resolve\'s scan settles before it scans, pr-merge settle runs it by hand', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const resolve = fs.readFileSync(path.join(root, 'scripts/pr-resolve.mjs'), 'utf8')
  const scan = resolve.slice(resolve.indexOf("if (mode === 'scan') {"))
  assert.ok(scan.indexOf('settleMain(') > 0 && scan.indexOf('settleMain(') < scan.indexOf('openLoopPrs()'), 'settle runs before the scan')
  assert.match(fs.readFileSync(path.join(root, 'scripts/pr-merge.mjs'), 'utf8'), /mode === 'settle'/)
  assert.ok(PIPELINE_PATHS.includes('scripts/pr-settle.mjs'), 'a change to the settle is a pipeline PR T merges')
  assert.match(fs.readFileSync(path.join(root, '.github/workflows/pr-resolve.yml'), 'utf8').replace(/\r\n/g, '\n'), /push:\n\s+branches: \[main\][\s\S]*node scripts\/pr-resolve\.mjs scan/)
})
