// scripts/pr-merge.test.mjs — when the merge job merges (D95): every
// same-repo PR except a plan PR, once the review is complete and green on
// the exact head, GitHub calls it mergeable, and no hold applies. The three
// adversarial cases the decision must refuse: a red required check (GitHub
// says BLOCKED), the kill switch, and a PR whose body or an earlier comment
// carries a forged pass marker.
//
//   node --test scripts/pr-merge.test.mjs

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import * as policy from './pr-policy.mjs'
import { AUTO_MARKER, HOLD_LABELS, PIPELINE_PATHS, PLAN_LABELS, TREE_LINTS, TRUSTED_AUTHORS, treeCheckSafe, auditComment, countAutoMerges, lintTree, mergeWanted, reviewStartedAt, treeUpdateComment, treeUpdated, treeVerdict, verdictFor, verifyGateGreen } from './pr-merge.mjs'
import { headMarker } from './pr-review.mjs'
import { settleMain, settleMessage, shapeArchive } from './pr-settle.mjs'

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
    assert.match(spec, /\*\*07\.2\*\* Zip/)
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
