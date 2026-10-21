// scripts/eval/escape-ledger.test.mjs — the pure escape-ledger parts (EV1a A3):
// path-filter matching against the real `verify-*` filters, follow-up
// detection on a recorded history, comment classification, seeds and the
// report splice.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  SECTION_END, SECTION_START, antagonistAtMerge, checksOnHead, classifyComment, classifyPaths, detectFollowUps,
  countMedPlus, evaluateSeeds, globToRegExp, parseWorkflowFilter, pathMatches, renderLedgerSection, reviewAtMerge, spliceReport,
  summarize,
} from './ledger-lib.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../..')
const fixture = (name) => JSON.parse(readFileSync(join(HERE, 'fixtures', name), 'utf8'))

const workflows = readdirSync(join(ROOT, '.github/workflows'))
  .filter((f) => /^verify-.*\.yml$/.test(f))
  .sort()
  .map((file) => ({ file, ...parseWorkflowFilter(readFileSync(join(ROOT, '.github/workflows', file), 'utf8')) }))

test('parseWorkflowFilter: every real verify-* workflow has a pull_request paths list', () => {
  assert.deepEqual(workflows.map((w) => w.file), ['verify-art-department.yml', 'verify-drift.yml', 'verify-mechanics.yml', 'verify-mobile.yml', 'verify-prose.yml'])
  for (const w of workflows) assert.ok(w.paths.length > 0, `${w.file} has paths`)
  const mobile = workflows.find((w) => w.file === 'verify-mobile.yml')
  assert.deepEqual(mobile.paths, [
    'axiomancer-mobile/**', '.github/workflows/verify-mobile.yml', 'scripts/check-worklets.mjs',
    'scripts/check-worklets.test.mjs', 'docs/art-catalog.json', 'docs/feature-map/features.json',
  ])
})

test('parseWorkflowFilter: comments inside the list are skipped and the list ends at the next key', () => {
  const text = [
    'name: x', 'on:', '  push:', '    paths:', "      - 'push-only/**'", '  pull_request:', '    branches: [main]',
    '    paths:', "      - 'a/**'", '      # a note', "      - 'b.ts' # trailing", '    types: [opened]', '  schedule:',
    "    - cron: '1 1 * * 0'", 'jobs: {}',
  ].join('\n')
  assert.deepEqual(parseWorkflowFilter(text), { name: 'x', paths: ['a/**', 'b.ts'] })
})

test('parseWorkflowFilter: no pull_request trigger reads as null; a bare trigger as every path', () => {
  assert.equal(parseWorkflowFilter('name: y\non:\n  push:\n    branches: [main]\n').paths, null)
  assert.deepEqual(parseWorkflowFilter('name: y\non:\n  pull_request:\n    branches: [main]\n').paths, [])
})

test('globToRegExp and pathMatches: ** crosses directories, * does not, ! excludes', () => {
  assert.ok(globToRegExp('axiomancer-mobile/**').test('axiomancer-mobile/a/b/c.ts'))
  assert.ok(globToRegExp('a/**/z.ts').test('a/z.ts'))
  assert.ok(globToRegExp('a/**/z.ts').test('a/b/c/z.ts'))
  assert.ok(globToRegExp('axiomancer-mobile/state/presenters/*.copy.ts').test('axiomancer-mobile/state/presenters/rest.copy.ts'))
  assert.ok(!globToRegExp('axiomancer-mobile/state/presenters/*.copy.ts').test('axiomancer-mobile/state/presenters/x/rest.copy.ts'))
  assert.ok(!globToRegExp('docs/art-catalog.json').test('docs/art-catalogxjson'))
  assert.ok(!pathMatches('a/skip.ts', ['a/**', '!a/skip.ts']))
  assert.ok(pathMatches('anything', []))
})

test('classifyPaths: the real filters skip .github/workflows and root scripts (the #526 gap)', () => {
  const files = ['.github/workflows/pr-resolve.yml', 'scripts/loop-pr.test.mjs', 'plan/AUDIT.md', 'telemetry/x.md']
  const got = classifyPaths(files, workflows)
  assert.deepEqual(got.triggered, [])
  assert.equal(got.skipped.length, workflows.length)
  assert.deepEqual(got.uncovered, ['.github/workflows/pr-resolve.yml', 'scripts/loop-pr.test.mjs'])
})

test('classifyPaths: a mobile copy file triggers mobile and prose, and nothing is uncovered', () => {
  const got = classifyPaths(['axiomancer-mobile/state/presenters/rest.copy.ts'], workflows)
  assert.deepEqual(got.triggered, ['verify-mobile.yml', 'verify-prose.yml'])
  assert.deepEqual(got.uncovered, [])
})

test('checksOnHead: a run that finished after the merge, or never, is flagged', () => {
  const got = checksOnHead([
    { name: 'verify-mobile', path: '.github/workflows/verify-mobile.yml', conclusion: 'success', startedAt: '2026-10-14T03:25:36Z', finishedAt: '2026-10-14T03:29:28Z' },
    { name: 'Cloudflare Pages: axiomancer', conclusion: 'success', startedAt: '2026-10-14T03:25:47Z', finishedAt: '2026-10-14T03:25:47Z' },
    { name: 'verify-drift', conclusion: null, startedAt: '2026-10-14T03:25:40Z', finishedAt: null },
  ], '2026-10-14T03:25:57Z')
  assert.deepEqual(got.map((c) => [c.name, c.finishedAfterMerge]), [
    ['Cloudflare Pages: axiomancer', false], ['verify-drift', true], ['verify-mobile', true],
  ])
  assert.equal(got[1].conclusion, 'pending')
})

const landings = fixture('landings.json')
const bt2b = {
  mergeCommit: '93f05dfe', mergedAt: '2026-10-14T03:25:57Z',
  files: ['axiomancer-mobile/components/combat/encounter/CombatBoard.tsx', 'plan/CRITIQUE.md', 'axiomancer-mobile/components/combat/encounter/CombatFooterDock.tsx'],
}

test('detectFollowUps: fix landings on the same code within 7 days, oldest first, overlap only', () => {
  const got = detectFollowUps(bt2b, landings)
  assert.ok(got.length > 0)
  assert.ok(got.every((f) => /^fix/i.test(f.subject)))
  assert.ok(got.every((f) => f.files.every((p) => bt2b.files.includes(p) && !p.startsWith('plan/'))))
  assert.deepEqual(got.map((f) => f.date), [...got.map((f) => f.date)].sort())
  assert.ok(!got.some((f) => f.sha === '93f05dfe'), 'the PR\'s own merge is never its follow-up')
})

test('detectFollowUps: bookkeeping overlap, non-fix subjects and late landings do not count', () => {
  const pr = { mergeCommit: 'm', mergedAt: '2026-10-14T00:00:00Z', files: ['plan/CRITIQUE.md', 'a.ts'] }
  const hist = [
    { sha: '1', date: '2026-10-14T01:00:00Z', subject: 'critique: repair rows', files: ['plan/CRITIQUE.md'] },
    { sha: '2', date: '2026-10-14T02:00:00Z', subject: 'fix: queue rows', files: ['plan/CRITIQUE.md'] },
    { sha: '3', date: '2026-10-14T03:00:00Z', subject: 'feat: more a', files: ['a.ts'] },
    { sha: '4', date: '2026-10-22T00:00:01Z', subject: 'fix: a again', files: ['a.ts'] },
    { sha: '5', date: '2026-10-13T23:00:00Z', subject: 'fix: before', files: ['a.ts'] },
    { sha: '6', date: '2026-10-20T00:00:00Z', subject: 'Revert "feat: a"', files: ['a.ts', 'b.ts'] },
  ]
  assert.deepEqual(detectFollowUps(pr, hist).map((f) => [f.sha, f.files]), [['6', ['a.ts']]])
})

test('classifyComment: markers decide, never the author', () => {
  const [cloudflare, notPass, conflict, merged] = fixture('pr-529-comments.json')
  assert.deepEqual(classifyComment(cloudflare), { judge: 'workflow', verdict: null })
  assert.deepEqual(classifyComment(notPass), { judge: 'antagonist', verdict: 'not-pass' })
  assert.deepEqual(classifyComment(conflict), { judge: 'owner-or-unknown', verdict: null })
  assert.deepEqual(classifyComment(merged), { judge: 'merge-script', verdict: null }, '"after the antagonist pass" is not an antagonist comment')
  const pass = fixture('pr-526-comments.json').find((c) => c.body.startsWith('## Antagonist pass'))
  assert.deepEqual(classifyComment(pass), { judge: 'antagonist', verdict: 'pass' })
  assert.deepEqual(classifyComment({ author: 'claude[bot]', body: 'deploy ok' }), { judge: 'workflow', verdict: null })
  assert.deepEqual(classifyComment({ author: 'no-trbl-2-u', body: 'Antagonist review: two notes' }), { judge: 'antagonist', verdict: 'review' })
})

const verdict = (v, rows = '') => `## Review verdict\n<!-- pr-review:verdict ${v} -->\n<!-- pr-review:head ${'a'.repeat(40)} -->\n\n| Severity | Where | Finding |\n|---|---|---|\n${rows}\nRisk: derived \`risk:medium\`.`

test('classifyComment: a pr-review verdict marker is the pr-review judge (RV1b, A6)', () => {
  assert.deepEqual(classifyComment({ author: 'claude[bot]', body: verdict('pass') }), { judge: 'pr-review', verdict: 'pass' })
  assert.deepEqual(classifyComment({ author: 'no-trbl-2-u', body: verdict('not-pass') }), { judge: 'pr-review', verdict: 'not-pass' })
  // A heading alone, or the raise marker alone, is not a verdict.
  assert.deepEqual(classifyComment({ author: 'claude[bot]', body: '## Review verdict\nno marker' }), { judge: 'workflow', verdict: null })
  assert.deepEqual(classifyComment({ author: 'x', body: '<!-- pr-review:raised risk:high -->' }), { judge: 'owner-or-unknown', verdict: null })
})

test('countMedPlus: MED and HIGH table rows only', () => {
  assert.equal(countMedPlus(verdict('not-pass', '| HIGH | `a.ts:1` | x |\n| MED | `b.ts:2` | y |\n| LOW | `c.ts:3` | z |\n')), 2)
  assert.equal(countMedPlus('No findings. HIGH and MED in prose do not count.'), 0)
})

test('reviewAtMerge: the last verdict before the merge, with its MED+ count', () => {
  const comments = [
    { author: 'claude[bot]', body: verdict('not-pass', '| HIGH | `a.ts:1` | x |\n'), createdAt: '2026-10-17T01:00:00Z' },
    { author: 'claude[bot]', body: verdict('pass', '| LOW | `a.ts:1` | x |\n'), createdAt: '2026-10-17T02:00:00Z' },
    { author: 'claude[bot]', body: verdict('not-pass'), createdAt: '2026-10-17T04:00:00Z' },
  ]
  assert.deepEqual(reviewAtMerge(comments, '2026-10-17T03:00:00Z'), { verdict: 'pass', at: '2026-10-17T02:00:00Z', medPlus: 0, mergedOnNotPass: false })
  assert.deepEqual(reviewAtMerge(comments.slice(0, 1), '2026-10-17T03:00:00Z'), { verdict: 'not-pass', at: '2026-10-17T01:00:00Z', medPlus: 1, mergedOnNotPass: true })
  assert.equal(reviewAtMerge(comments, '2026-10-17T00:00:00Z').verdict, 'none')
})

test('antagonistAtMerge: #529 merged on a "not a pass"; later comments do not count', () => {
  const got = antagonistAtMerge(fixture('pr-529-comments.json'), '2026-10-14T03:25:57Z')
  assert.equal(got.verdict, 'not-pass')
  assert.equal(got.mergedOnNotPass, true)
  assert.equal(got.mergeScriptComment, true)
  const early = antagonistAtMerge(fixture('pr-529-comments.json'), '2026-10-14T03:00:00Z')
  assert.equal(early.verdict, 'none')
  assert.equal(early.mergedOnNotPass, false)
})

function row(over = {}) {
  return {
    number: 1, title: 't', mergedAt: '2026-10-14T00:00:00Z', head: 'h'.repeat(40), mergeCommit: 'm', files: [],
    ran: [], triggered: [], skipped: [], expectedNotRun: [], uncovered: [], followUps: [],
    antagonist: { verdict: 'none', at: null, mergedOnNotPass: false, mergeScriptComment: false }, ...over,
  }
}

const facts = {
  commits: Object.fromEntries(['c95114a2', '49829988', '23f06828', '662aa10b'].map((s) => [s, { files: ['plan/CRITIQUE.md'] }])),
  prBodies: { 521: '- [x] A4 Ledger', 523: '- [x] A6 Other\n- `verify:visual` was not run locally' },
  verifyMentionsAndroid: false,
}

test('evaluateSeeds: six seeds, confirmed from the ledger rows and facts', () => {
  const rows = [
    row({ number: 529, ran: [{ name: 'verify-mobile', finishedAfterMerge: true }], antagonist: { verdict: 'not-pass', mergedOnNotPass: true } }),
    row({ number: 526, ran: [{ name: 'Cloudflare Pages: axiomancer', finishedAfterMerge: false }], uncovered: ['scripts/pr-resolve.mjs'] }),
  ]
  const seeds = evaluateSeeds(rows, facts)
  assert.deepEqual(seeds.map((s) => s.id), ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'])
  assert.deepEqual(seeds.map((s) => s.status), ['confirmed', 'confirmed', 'seeded', 'confirmed', 'confirmed', 'confirmed'])
  for (const s of seeds) assert.ok(s.gate && s.evidence.length > 0, `${s.id} names its gate and evidence`)
})

test('evaluateSeeds: missing evidence reads unconfirmed, never confirmed', () => {
  const seeds = evaluateSeeds([], { commits: {}, prBodies: {}, verifyMentionsAndroid: true })
  assert.deepEqual(seeds.map((s) => s.status), ['unconfirmed', 'unconfirmed', 'seeded', 'unconfirmed', 'seeded', 'unconfirmed'])
})

test('summarize and renderLedgerSection: counts and one table row per PR, inside the markers', () => {
  const rows = [
    row({ number: 529, ran: [{ name: 'verify-mobile', path: '.github/workflows/verify-mobile.yml', conclusion: 'success', finishedAfterMerge: true }], antagonist: { verdict: 'not-pass', mergedOnNotPass: true } }),
    row({ number: 526, ran: [{ name: 'Cloudflare Pages: axiomancer', path: null, conclusion: 'success', finishedAfterMerge: false }], uncovered: ['a|b.mjs'] }),
  ]
  assert.deepEqual(summarize(rows), {
    prs: 2, mergedBeforeChecks: 1, noVerifyRan: 1, withUncovered: 1, expectedNotRun: 0, withFollowUps: 0,
    antagonistReviewed: 1, mergedOnNotPass: 1, shadowReviewed: 0, mergedOnReviewNotPass: 0,
  })
  const md = renderLedgerSection({ stamp: { commit: 'abcdef12', date: '2026-10-15' }, window: { from: '2026-10-12', to: '2026-10-15' }, rows, seeds: evaluateSeeds(rows, facts) })
  assert.ok(md.startsWith(SECTION_START) && md.endsWith(SECTION_END))
  assert.match(md, /\| #529 t \|.*verify-mobile success \(after merge\).*not-pass \(merged anyway\) \| none \|/)
  const reviewed = [row({ number: 600, review: { verdict: 'not-pass', medPlus: 2, mergedOnNotPass: true } })]
  assert.deepEqual([summarize(reviewed).shadowReviewed, summarize(reviewed).mergedOnReviewNotPass], [1, 1])
  const md2 = renderLedgerSection({ stamp: { commit: 'abcdef12', date: '2026-10-17' }, window: { from: '2026-10-12', to: '2026-10-17' }, rows: reviewed, seeds: [] })
  assert.match(md2, /\| #600 t \|.*\| not-pass, 2 MED\+ \(merged anyway\) \|$/m)
  assert.match(md2, /\| Merged on a shadow review "not-pass" \| 1 \|/)
  assert.match(md, /a\\\|b\.mjs/, 'a pipe in a path is escaped')
  assert.equal(md.split('\n').filter((l) => /^\| S\d \|/.test(l)).length, 6)
})

test('spliceReport: replaces only the ledger section and restamps', () => {
  const stamp = { commit: 'aaaaaaaa', date: '2026-10-15' }
  const first = spliceReport(null, `${SECTION_START}\nold\n${SECTION_END}`, stamp)
  const withOther = `${first}\n<!-- eval:other:start -->\nkeep\n<!-- eval:other:end -->\n`
  const next = spliceReport(withOther, `${SECTION_START}\nnew\n${SECTION_END}`, { commit: 'bbbbbbbb', date: '2026-10-16' })
  assert.match(next, /Ledger stamp: commit `bbbbbbbb`/)
  assert.ok(next.includes('\nnew\n') && !next.includes('\nold\n') && next.includes('\nkeep\n'))
})
