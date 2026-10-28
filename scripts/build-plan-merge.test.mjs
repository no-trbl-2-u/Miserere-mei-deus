// scripts/build-plan-merge.test.mjs — witness for the build-plan merge driver
// (Phase ML1b). Pins that two plots inserting above the same first open row
// keep both sides' rows in each side's order and both Queue change log
// entries, that an insertion beside a tick and two neighbouring ticks settle,
// that a real clash keeps its markers, that a duplicated phase row is
// refused, and that the driver is registered from the repo's own setup path.
//
//   node --test scripts/build-plan-merge.test.mjs

import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { mergeBuildPlan, phaseRowCounts, resolveHunk, settleClashes } from './build-plan-merge.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT = path.join(ROOT, 'scripts', 'build-plan-merge.mjs')

const row = (id, { mark = ' ', text = `the ${id} row` } = {}) => `- [${mark}] Phase ${id} — ${text}`
const entry = (what) => `- **2026-10-20** — actor: **T, attended session**. Action: **added ${what}**.`
const plan = (rows, log) =>
  ['# 01 — Build plan', '', '## Status (at-a-glance)', '', ...rows, '', '## Queue change log', '', '> Append-only.', '', ...log, '>', '## Phase log (commit hashes)', '', '- phase 0 — adoption', ''].join('\n')

const baseRows = [row('A1', { mark: 'x' }), row('B1'), row('C1')]
const baseLog = [entry('Phase B1'), entry('Phase C1')]

function merged(base, ours, theirs) {
  const r = mergeBuildPlan(base, ours, theirs)
  assert.equal(r.ok, true, r.reason)
  return r.text
}

test('two plots above the same first open row: both sides\' rows, each in its own order, and both log entries', () => {
  const base = plan(baseRows, baseLog)
  const ours = plan([row('A1', { mark: 'x' }), row('O1'), row('O2'), row('B1'), row('C1')], [...baseLog, entry('Phases O1, O2')])
  const theirs = plan([row('A1', { mark: 'x' }), row('T1'), row('T2'), row('T3'), row('B1'), row('C1')], [...baseLog, entry('Phases T1, T2, T3')])
  const text = merged(base, ours, theirs)
  assert.equal(
    text,
    plan(
      [row('A1', { mark: 'x' }), row('O1'), row('O2'), row('T1'), row('T2'), row('T3'), row('B1'), row('C1')],
      [...baseLog, entry('Phases O1, O2'), entry('Phases T1, T2, T3')],
    ),
  )
})

test('a plot above the row a phase PR ticks: the insertion stays above the ticked row', () => {
  const base = plan(baseRows, baseLog)
  const ours = plan([row('A1', { mark: 'x' }), row('B1', { mark: 'x', text: 'the B1 row (#700)' }), row('C1')], baseLog)
  const theirs = plan([row('A1', { mark: 'x' }), row('N1'), row('B1'), row('C1')], [...baseLog, entry('Phase N1')])
  assert.equal(
    merged(base, ours, theirs),
    plan([row('A1', { mark: 'x' }), row('N1'), row('B1', { mark: 'x', text: 'the B1 row (#700)' }), row('C1')], [...baseLog, entry('Phase N1')]),
  )
})

test('two neighbouring rows ticked on each side: each line from the side that changed it', () => {
  const base = plan(baseRows, baseLog)
  const ours = plan([row('A1', { mark: 'x' }), row('B1', { mark: 'x' }), row('C1')], baseLog)
  const theirs = plan([row('A1', { mark: 'x' }), row('B1'), row('C1', { mark: 'skipped' })], baseLog)
  assert.equal(merged(base, ours, theirs), plan([row('A1', { mark: 'x' }), row('B1', { mark: 'x' }), row('C1', { mark: 'skipped' })], baseLog))
})

test('both sides rewrote one row: conflict markers, not a guess', () => {
  const base = plan(baseRows, baseLog)
  const ours = plan([row('A1', { mark: 'x' }), row('B1', { text: 'scope one way' }), row('C1')], baseLog)
  const theirs = plan([row('A1', { mark: 'x' }), row('B1', { text: 'scope the other way' }), row('C1')], baseLog)
  const r = mergeBuildPlan(base, ours, theirs)
  assert.equal(r.ok, false)
  assert.match(r.reason, /1 clash both sides edited/)
  assert.match(r.text, /^<{7} ours\n- \[ \] Phase B1 — scope one way\n={7}\n- \[ \] Phase B1 — scope the other way\n>{7} theirs$/m)
})

test('a clash it can settle is settled even beside one it cannot', () => {
  const base = plan(baseRows, baseLog)
  const ours = plan([row('A1', { mark: 'x' }), row('B1', { text: 'one way' }), row('C1')], [...baseLog, entry('Phase O1')])
  const theirs = plan([row('A1', { mark: 'x' }), row('B1', { text: 'other way' }), row('C1')], [...baseLog, entry('Phase T1')])
  const r = mergeBuildPlan(base, ours, theirs)
  assert.equal(r.ok, false)
  assert.ok(r.text.includes(`${entry('Phase O1')}\n${entry('Phase T1')}\n>\n`), 'the log entries are unioned')
  assert.equal((r.text.match(/^<{7} /gm) || []).length, 1)
})

test('a phase row the union would duplicate is refused with the line merge\'s markers', () => {
  const base = plan(baseRows, baseLog)
  const ours = plan([row('A1', { mark: 'x' }), row('N1', { text: 'ours\' copy' }), row('B1'), row('C1')], baseLog)
  const theirs = plan([row('A1', { mark: 'x' }), row('N1', { text: 'theirs\' copy' }), row('B1'), row('C1')], baseLog)
  const r = mergeBuildPlan(base, ours, theirs)
  assert.equal(r.ok, false)
  assert.match(r.reason, /Phase N1 a second row/)
  assert.match(r.text, /^<{7} ours$/m)
})

test('a duplicate one side already carried is not the merge\'s doing', () => {
  const dupRows = [row('A1', { mark: 'x' }), row('B1'), row('B1', { text: 'again' }), row('C1')]
  const base = plan(dupRows, baseLog)
  const ours = plan([row('O1'), ...dupRows], baseLog)
  const theirs = plan(dupRows, [...baseLog, entry('Phase T1')])
  assert.equal(merged(base, ours, theirs), plan([row('O1'), ...dupRows], [...baseLog, entry('Phase T1')]))
})

test('resolveHunk: pure insertions, insertion beside an edit, line-wise edits, and the refusals', () => {
  assert.deepEqual(resolveHunk([], ['o1', 'o2'], ['t1']), ['o1', 'o2', 't1'])
  assert.deepEqual(resolveHunk(['L'], ['o1', 'L'], ['L2']), ['o1', 'L2'])
  assert.deepEqual(resolveHunk(['L'], ['L2'], ['L', 't1']), ['L2', 't1'])
  assert.deepEqual(resolveHunk(['L'], ['o1', 'L'], []), ['o1'], 'a row the other side deleted stays deleted')
  assert.deepEqual(resolveHunk(['a', 'b'], ['a2', 'b'], ['a', 'b2']), ['a2', 'b2'])
  assert.equal(resolveHunk(['a'], ['a2'], ['a3']), null)
  assert.equal(resolveHunk(['a', 'b'], ['a2'], ['a', 'b2']), null)
})

test('phaseRowCounts reads ticked, PR-numbered and pending rows', () => {
  const counts = phaseRowCounts(['- [x] (#683) Phase IT1a — x', '- [ ] Phase ML1b — y', '- [blocked: owner-led] Phase B8 — z', '- [x] Phase ML1b — again', '  - [ ] Phase Q — nested'].join('\n'))
  assert.deepEqual(Object.fromEntries(counts), { IT1a: 1, ML1b: 2, B8: 1 })
})

test('phaseRowCounts finds no duplicate row in the live build plan', () => {
  const counts = phaseRowCounts(fs.readFileSync(path.join(ROOT, 'plan', 'steps', '01_build_plan.md'), 'utf8'))
  assert.ok(counts.size > 100)
  assert.deepEqual([...counts].filter(([, n]) => n > 1), [])
})

test('registration: .gitattributes names the driver, and SessionStart registers it', () => {
  const attrs = fs.readFileSync(path.join(ROOT, '.gitattributes'), 'utf8')
  assert.match(attrs, /^plan\/steps\/01_build_plan\.md\s+.*\bmerge=buildplan\b/m)
  const settings = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf8'))
  const commands = settings.hooks.SessionStart.flatMap((h) => h.hooks.map((x) => x.command))
  const reg = commands.find((c) => /config merge\.buildplan\.driver /.test(c))
  assert.ok(reg, 'a SessionStart command sets merge.buildplan.driver')
  assert.match(reg, /scripts\/build-plan-merge\.mjs %O %A %B %P/)
})

test('the CLI writes the merge to <ours> and exits 0, or leaves markers and exits 1', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-plan-merge-cli-'))
  try {
    const write = (name, text) => (fs.writeFileSync(path.join(dir, name), text), path.join(dir, name))
    const base = plan(baseRows, baseLog)
    const b = write('base', base)
    let o = write('ours', plan(baseRows, [...baseLog, entry('O')]))
    let t = write('theirs', plan(baseRows, [...baseLog, entry('T')]))
    let r = spawnSync(process.execPath, [SCRIPT, b, o, t, 'plan/steps/01_build_plan.md'], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    assert.equal(fs.readFileSync(o, 'utf8'), plan(baseRows, [...baseLog, entry('O'), entry('T')]))
    o = write('ours', plan([row('A1', { mark: 'x' }), row('B1', { text: 'x' }), row('C1')], baseLog))
    t = write('theirs', plan([row('A1', { mark: 'x' }), row('B1', { text: 'y' }), row('C1')], baseLog))
    r = spawnSync(process.execPath, [SCRIPT, b, o, t, 'plan/steps/01_build_plan.md'], { encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /build-plan-merge: plan\/steps\/01_build_plan\.md: 1 clash both sides edited/)
    assert.match(fs.readFileSync(o, 'utf8'), /^<{7} ours$/m)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a real git merge with the driver registered keeps both plots', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-plan-merge-repo-'))
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  try {
    git('init', '-q', '-b', 'main')
    git('config', 'user.email', 't@example.com')
    git('config', 'user.name', 't')
    git('config', 'merge.buildplan.driver', `"${process.execPath}" "${SCRIPT}" %O %A %B %P`)
    fs.mkdirSync(path.join(dir, 'plan', 'steps'), { recursive: true })
    fs.writeFileSync(path.join(dir, '.gitattributes'), 'plan/steps/01_build_plan.md merge=buildplan\n')
    const file = path.join(dir, 'plan', 'steps', '01_build_plan.md')
    fs.writeFileSync(file, plan(baseRows, baseLog))
    git('add', '.')
    git('commit', '-q', '-m', 'base')
    git('switch', '-q', '-c', 'plot-t')
    fs.writeFileSync(file, plan([row('A1', { mark: 'x' }), row('T1'), row('B1'), row('C1')], [...baseLog, entry('Phase T1')]))
    git('commit', '-q', '-am', 'plot T1')
    git('switch', '-q', 'main')
    fs.writeFileSync(file, plan([row('A1', { mark: 'x' }), row('O1'), row('B1'), row('C1')], [...baseLog, entry('Phase O1')]))
    git('commit', '-q', '-am', 'plot O1')
    git('merge', '-q', '--no-edit', 'plot-t')
    assert.equal(
      fs.readFileSync(file, 'utf8'),
      plan([row('A1', { mark: 'x' }), row('O1'), row('T1'), row('B1'), row('C1')], [...baseLog, entry('Phase O1'), entry('Phase T1')]),
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('settleClashes: opts.mergeLine settles a line both sides edited, opts.tidy post-processes a settled clash', () => {
  const edit = settleClashes('a\nX\nb\n', 'a\nX1\nb\n', 'a\nX2\nb\n', { mergeLine: (b, o, t) => `${b}|${o}|${t}` })
  assert.deepEqual(edit, { text: 'a\nX|X1|X2\nb\n', open: 0 })
  // Without mergeLine the same clash stays open, with markers.
  const plain = settleClashes('a\nX\nb\n', 'a\nX1\nb\n', 'a\nX2\nb\n')
  assert.equal(plain.open, 1)
  assert.match(plain.text, /^<<<<<<< ours$/m)
  // Same-spot insertions settle by resolveHunk; tidy sees them with the base block and may reorder.
  const seen = []
  const tidy = (settled, baseLines) => {
    seen.push([settled, baseLines])
    return [...settled].reverse()
  }
  const tidied = settleClashes('a\nb\n', 'a\no\nb\n', 'a\nt\nb\n', { tidy })
  assert.equal(tidied.open, 0)
  assert.equal(seen.length, 1)
  assert.deepEqual([...seen[0][0]].sort(), ['o', 't'])
  assert.equal(tidied.text, `a\n${[...seen[0][0]].reverse().join('\n')}\nb\n`)
})
