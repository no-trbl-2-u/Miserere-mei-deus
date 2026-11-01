// scripts/pr-resolve.test.mjs — witness for pr-resolve's merge of main into a
// plot PR (Phase MD1b). Runs the real `mergeMain(branch, cwd)` against a
// scratch bare origin: two plot branches that each add asap build-plan rows, an
// Item, an Unscheduled line and a Change log line settle with no Haiku entry,
// keep every added row once, re-derive the Item Status cells main's shipped
// rows made stale, leave LIVE_DEADLINES.md alone, and pass check-deadlines.
//
//   node --test scripts/pr-resolve.test.mjs

import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { lintTree, treeVerdict } from './pr-merge.mjs'
import { driverCommand, MERGE_DRIVERS, mergeMain, updateBranch } from './pr-resolve.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ARCHIVE = 'plan/ARCHIVE.md'
const DEADLINES = 'plan/deadlines.md'
const COPIED_SCRIPTS = [
  'build-plan-merge.mjs',
  'check-deadlines.mjs',
  'check-lessons.mjs',
  'deadlines-lib.mjs',
  'deadlines-merge.mjs',
  'deadlines.mjs',
  'lessons-merge.mjs',
  // check-deadlines reads plan/pending/ through the kit's plan modules (phase NX1e).
  'owner.mjs',
  'plan/config.mjs',
  'plan/footguns.mjs',
  'plan/pending.mjs',
  'plan/settle.mjs',
  'plan/settled.mjs',
]

const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')
const write = (dir, rel, text) => fs.writeFileSync(path.join(dir, rel), text)
const count = (text, needle) => text.split(needle).length - 1

/** Run git in `dir`; stdout. */
const git = (dir, ...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

// --- text edits shaped like a plot's own ------------------------------------

// Since the nexus v2 cut-over (NX1d) a plot adds a spec file of its own, whose chunks keep
// family-style ids as their `alias:`; a new file conflicts with nothing. Its roadmap row is left
// out here: two plots appending to plan/README.md's table meet at one spot, which phase NX1e's
// pending files settle (the build-plan merge driver retired with the build plan).
const SPEC_NUM = { ZA: 901, ZB: 902, ZS: 903, ZC: 904 }
const specFile = (tag) => `plan/${SPEC_NUM[tag]}-fixture-${tag.toLowerCase()}.md`

/** A spec with one attended chunk per id (aliases `ids`), so an Item's `Rows` may name them. */
function addSpec(dir, tag, ids) {
  const n = SPEC_NUM[tag]
  const chunks = ids.map((id, i) => `- [ ] **${n}.${i + 1}** fixture chunk ${id} (attended) · S · closes A${i + 1} · needs — · alias: ${id}`)
  const acc = ids.map((id, i) => `- **A${i + 1}** fixture ${id}.`)
  write(dir, specFile(tag), [`# ${n} — fixture ${tag}`, '', '> fixture', '', '## Acceptance', '', ...acc, '', '## Chunks', '', `Measure: ${ids.length} open · 0 closed · next A${ids.length + 1}`, '', ...chunks, ''].join('\n'))
}

/** Close a chunk the way a shipped PR does: its line leaves the spec, an archive line keeps its alias. */
function shipChunk(dir, tag, id) {
  const file = specFile(tag)
  const md = read(dir, file)
  const line = md.split('\n').find((l) => l.endsWith(`alias: ${id}`))
  assert.ok(line, `${file} has a chunk aliased ${id}`)
  const chunk = line.match(/\*\*(\S+)\*\*/)[1]
  write(dir, file, md.replace(`${line}\n`, ''))
  write(dir, ARCHIVE, `${read(dir, ARCHIVE).trimEnd()}\n- 2026-10-28 · ${chunk} (alias: ${id}) · fixture shipped · (#9001)\n`)
}

/** An Items row at the top of the table; its fixture rows are attended, so `Rows` may name them. */
function addItem(md, name, due, rows) {
  const lines = md.split('\n')
  const head = lines.indexOf('| Status | Due | Item | Window | Rows | Waits on |')
  assert.ok(head > 0)
  lines.splice(head + 2, 0, `| [ ] | ${due} | ${name} | W1 | ${rows} | - |`)
  return lines.join('\n')
}

/** A line at the end of `## Unscheduled`. */
function addUnscheduled(md, id) {
  return md.replace('\n## How a window closes', `- ${id} — fixture; date not set.\n\n## How a window closes`).replace(/\n\n\n## How a window closes/, '\n\n## How a window closes')
}

/** A line at the head of the Unscheduled list, away from the tail every plot appends to. */
const addUnscheduledFirst = (md, id) => md.replace(/^- AD1a — /m, `- ${id} — fixture; date not set.\n- AD1a — `)

const addChangeLog = (md, what) => md.replace('\n## Change log\n\n', `\n## Change log\n\n- **2026-10-28** — **${what}** (T).\n`)

const dropUnscheduled = (md, id) => md.replace(new RegExp(`^- ${id} — .*\\n`, 'm'), '')

/**
 * A scratch bare origin and a clone of it holding the live plan files, the
 * scripts the merge needs and `.gitattributes`. `base(dir)` edits the base
 * commit; the clone is left on main.
 */
function scratch(base) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-resolve-test-'))
  const origin = path.join(dir, 'origin.git')
  const work = path.join(dir, 'work')
  git(dir, 'init', '-q', '--bare', '-b', 'main', origin)
  git(dir, 'clone', '-q', origin, work)
  git(work, 'config', 'user.email', 't@example.com')
  git(work, 'config', 'user.name', 't')
  git(work, 'switch', '-q', '-c', 'main')
  fs.mkdirSync(path.join(work, 'plan'), { recursive: true })
  fs.mkdirSync(path.join(work, 'scripts', 'plan'), { recursive: true })
  const specs = fs.readdirSync(path.join(ROOT, 'plan')).filter((n) => /^\d{2,}-[a-z0-9][a-z0-9-]*\.md$/.test(n)).map((n) => `plan/${n}`)
  for (const f of ['.gitattributes', 'LIVE_DEADLINES.md', 'plan/README.md', ARCHIVE, DEADLINES, ...specs]) write(work, f, fs.readFileSync(path.join(ROOT, f), 'utf8'))
  for (const f of COPIED_SCRIPTS) fs.copyFileSync(path.join(ROOT, 'scripts', f), path.join(work, 'scripts', f))
  write(work, 'notes.txt', 'one\n')
  base?.(work)
  git(work, 'add', '-A')
  git(work, 'commit', '-q', '-m', 'base')
  git(work, 'push', '-q', 'origin', 'main')
  return { dir, work }
}

/** Commit the working tree on `branch` (cut from main) and push it. */
function branchWith(work, branch, edit) {
  git(work, 'switch', '-q', '-c', branch, 'main')
  edit(work)
  git(work, 'add', '-A')
  git(work, 'commit', '-q', '-m', `plot ${branch}`)
  git(work, 'push', '-q', 'origin', branch)
  git(work, 'switch', '-q', 'main')
}

const plot = (tag, due) => (dir) => {
  addSpec(dir, tag, [`${tag}1`, `${tag}2`])
  let d = addItem(read(dir, DEADLINES), `Item ${tag}`, due, `${tag}1`)
  d = addUnscheduled(d, `${tag}2`)
  write(dir, DEADLINES, addChangeLog(d, `plot ${tag}`))
}

const checkDeadlines = (dir) =>
  execFileSync(process.execPath, ['scripts/check-deadlines.mjs'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

test('two plot branches settle through mergeMain: no Haiku entry, every added row once, Status re-derived, check-deadlines green', () => {
  // ZS1 is an open row under Unscheduled; plot B gives it an Item while main ships it.
  const { dir, work } = scratch((d) => {
    addSpec(d, 'ZS', ['ZS1'])
    write(d, DEADLINES, addUnscheduledFirst(read(d, DEADLINES), 'ZS1'))
  })
  try {
    assert.equal(checkDeadlines(work).length > 0, true, 'the base passes check-deadlines')
    branchWith(work, 'plot-a', plot('ZA', '2026-10-30'))
    branchWith(work, 'plot-b', (d) => {
      plot('ZB', '2026-10-29')(d)
      write(d, DEADLINES, addItem(dropUnscheduled(read(d, DEADLINES), 'ZS1'), 'Item ZS', '2026-10-31', 'ZS1'))
    })
    // main: plot A merges by the merge button, then ZS1 ships (its Unscheduled line goes).
    git(work, 'merge', '-q', '--no-edit', '--no-ff', 'plot-a')
    shipChunk(work, 'ZS', 'ZS1')
    write(work, DEADLINES, dropUnscheduled(read(work, DEADLINES), 'ZS1'))
    git(work, 'commit', '-q', '-am', 'ship ZS1')
    git(work, 'push', '-q', 'origin', 'main')

    const before = Number(git(work, 'rev-list', '--count', 'origin/plot-b').trim())
    const { merged, rest } = mergeMain('plot-b', work)

    assert.equal(merged, true)
    assert.deepEqual(rest, [], 'nothing is left for a Haiku run')
    const plan = ['ZA', 'ZB', 'ZS'].map((tag) => read(work, specFile(tag))).join('\n') + read(work, ARCHIVE)
    const dl = read(work, DEADLINES)
    for (const needle of ['alias: ZA1', 'alias: ZA2', 'alias: ZB1', 'alias: ZB2', '(alias: ZS1)']) {
      assert.equal(count(plan, needle), 1, `plan: ${needle}`)
    }
    for (const needle of ['| Item ZA |', '| Item ZB |', '| Item ZS |', '- ZA2 —', '- ZB2 —', 'plot ZA**', 'plot ZB**']) {
      assert.equal(count(dl, needle), 1, `deadlines: ${needle}`)
    }
    assert.ok(!/^(<{7}|={7}|>{7})/m.test(plan + dl), 'no conflict marker')
    assert.match(dl, /\| \[x\] \| 2026-10-31 \| Item ZS \|/, 'the Status main made stale is re-derived')
    assert.ok(dl.indexOf('| Item ZB |') < dl.indexOf('| Item ZA |'), 'new Items stay in due-date order')
    const head = git(work, 'rev-list', '--parents', '-n', '1', 'HEAD').trim().split(' ')
    assert.equal(head.length, 3, 'HEAD is the merge commit')
    assert.equal(Number(git(work, 'rev-list', '--count', 'HEAD').trim()) - before, 4, 'the Status edit amended the merge: no extra commit')
    assert.equal(git(work, 'status', '--porcelain').trim(), '', 'LIVE_DEADLINES.md is back as the merge left it')
    assert.equal(read(work, 'LIVE_DEADLINES.md'), fs.readFileSync(path.join(ROOT, 'LIVE_DEADLINES.md'), 'utf8'))
    checkDeadlines(work) // throws when red
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a merge that touches neither deadline file adds no commit beyond the merge', () => {
  const { dir, work } = scratch()
  try {
    branchWith(work, 'code-b', (d) => write(d, 'branch.txt', 'b\n'))
    write(work, 'main.txt', 'm\n')
    git(work, 'add', '-A')
    git(work, 'commit', '-q', '-m', 'main moves')
    git(work, 'push', '-q', 'origin', 'main')
    const { merged, rest } = mergeMain('code-b', work)
    assert.equal(merged, true)
    assert.deepEqual(rest, [])
    assert.equal(git(work, 'log', '--format=%s', '-n', '1').trim().startsWith('Merge'), true)
    assert.equal(git(work, 'rev-list', '--count', 'HEAD').trim(), '4', 'base, the branch commit, main, one merge')
    assert.equal(git(work, 'status', '--porcelain').trim(), '')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a cell both plots changed to different values is listed for Haiku, as before', () => {
  const { dir, work } = scratch((d) => {
    addSpec(d, 'ZC', ['ZC1', 'ZC2', 'ZC3'])
    write(d, DEADLINES, addItem(read(d, DEADLINES), 'Item ZC', '2026-10-31', 'ZC1'))
    write(d, DEADLINES, addUnscheduled(addUnscheduled(read(d, DEADLINES), 'ZC2'), 'ZC3'))
  })
  try {
    const setRows = (rows) => (d) => write(d, DEADLINES, read(d, DEADLINES).replace('| Item ZC | W1 | ZC1 | - |', `| Item ZC | W1 | ${rows} | - |`))
    branchWith(work, 'plot-c', setRows('ZC1, ZC2'))
    branchWith(work, 'plot-d', setRows('ZC1, ZC3'))
    setRows('ZC1, ZC2')(work)
    git(work, 'commit', '-q', '-am', 'plot C merged')
    git(work, 'push', '-q', 'origin', 'main')
    const { merged, rest } = mergeMain('plot-d', work)
    assert.equal(merged, false)
    assert.deepEqual(rest, [DEADLINES])
    git(work, 'merge', '--abort')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// --- the merge job's tree check (phase MD1c) ---------------------------------

const LESSONS = 'plan/lessons.md'
const lessonRow = (rule) => `- **zz-md1c-dup** · bit once (P1) → ${rule} · seen 1× · last 2026-10-28 · guarded by scripts/pr-resolve.test.mjs`

/** Insert `line` after the `n`th lesson row of the live file. */
function insertRow(md, n, line) {
  const lines = md.split('\n')
  let seen = 0
  const at = lines.findIndex((l) => l.startsWith('- **') && ++seen === n)
  assert.ok(at > 0, `the live lessons file has ${n} rows`)
  lines.splice(at + 1, 0, line)
  return lines.join('\n')
}

/** A scratch repo with the live lessons file; the branch and main add one slug in different places. */
function lessonsClash(branchRule, mainRule, extra) {
  const made = scratch((d) => {
    for (const f of [LESSONS, 'plan/AUDIT.md', 'plan/CRITIQUE.md', 'plan/CANDIDATES.md']) write(d, f, fs.readFileSync(path.join(ROOT, f), 'utf8'))
  })
  const { work } = made
  assert.throws(() => git(work, 'config', 'merge.lessons.driver'), 'the scratch repo registers no driver, as GitHub has none')
  branchWith(work, 'pr-branch', (d) => {
    write(d, LESSONS, insertRow(read(d, LESSONS), 1, lessonRow(branchRule)))
    extra?.(d)
  })
  write(work, LESSONS, insertRow(read(work, LESSONS), 12, lessonRow(mainRule)))
  git(work, 'commit', '-q', '-am', 'main bumps the same slug')
  git(work, 'push', '-q', 'origin', 'main')
  // The tree GitHub's merge button would make: a plain line merge, no driver.
  git(work, 'switch', '-q', '-c', 'server-merge', 'origin/pr-branch')
  git(work, 'merge', '-q', '--no-edit', 'origin/main')
  const serverTree = git(work, 'rev-parse', 'HEAD').trim()
  git(work, 'switch', '-q', 'main')
  return { ...made, serverTree }
}

const treeLints = (work, treeish) => lintTree({ scriptsDir: path.join(ROOT, 'scripts'), repo: work, treeish })
const redOf = (results) => results.filter((r) => !r.ok)

test('a same-slug lessons bump is red as GitHub merges it, green and one row after update, and the verdicts go update then go', () => {
  const { dir, work, serverTree } = lessonsClash('a rule', 'a rule')
  try {
    const red = redOf(treeLints(work, serverTree))
    assert.deepEqual(red.map((r) => r.name), ['check-lessons'], 'the line merge keeps two rows of one slug')
    assert.match(red[0].detail, /zz-md1c-dup/)
    assert.equal(count(git(work, 'show', `${serverTree}:${LESSONS}`), '**zz-md1c-dup**'), 2)
    assert.equal(treeVerdict({ red }).action, 'update')

    let named = ''
    const r = updateBranch('pr-branch', work, (head) => { named = head })
    assert.equal(r.state, 'updated')
    assert.equal(named, r.head, 'the marker can name the new head before the push')
    assert.equal(git(work, 'rev-parse', 'origin/pr-branch').trim(), r.head, 'pushed')
    assert.equal(count(git(work, 'show', `origin/pr-branch:${LESSONS}`), '**zz-md1c-dup**'), 1, 'one row')
    assert.deepEqual(redOf(treeLints(work, 'origin/pr-branch')), [], 'green under the same lints')
    assert.equal(treeVerdict({ red: [], updated: true }).action, 'go')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a clash the drivers cannot fix holds, naming the lint', () => {
  const { dir, work, serverTree } = lessonsClash('the branch rule', 'the main rule')
  try {
    const red = redOf(treeLints(work, serverTree))
    assert.deepEqual(red.map((r) => r.name), ['check-lessons'])
    assert.equal(treeVerdict({ red }).action, 'update')
    assert.equal(updateBranch('pr-branch', work).state, 'updated', 'the union settles the file, so the push happens')
    const again = redOf(treeLints(work, 'origin/pr-branch'))
    assert.deepEqual(again.map((x) => x.name), ['check-lessons'], 'both rewrites survive as two rows')
    const held = treeVerdict({ red: again, updated: true })
    assert.equal(held.action, 'hold')
    assert.match(held.reason, /check-lessons/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('updateBranch aborts a conflict outside the union files and pushes nothing; a current branch pushes nothing', () => {
  const { dir, work } = scratch()
  try {
    branchWith(work, 'pr-x', (d) => write(d, 'notes.txt', 'branch\n'))
    write(work, 'notes.txt', 'main\n')
    git(work, 'commit', '-q', '-am', 'main edits notes')
    git(work, 'push', '-q', 'origin', 'main')
    const before = git(work, 'rev-parse', 'origin/pr-x').trim()
    const r = updateBranch('pr-x', work)
    assert.equal(r.state, 'conflict')
    assert.deepEqual(r.rest, ['notes.txt'])
    assert.equal(git(work, 'status', '--porcelain').trim(), '', 'the merge was aborted')
    assert.equal(git(work, 'rev-parse', 'origin/pr-x').trim(), before)
    assert.equal(treeVerdict({ red: [{ name: 'check-lessons' }], updated: true, updateFailed: true }).action, 'hold')

    branchWith(work, 'pr-y', (d) => write(d, 'other.txt', 'y\n'))
    git(work, 'merge', '-q', '--no-edit', 'origin/pr-y')
    assert.equal(updateBranch('pr-y', work).state, 'current')
    assert.throws(() => updateBranch('main', work), /never main/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('update runs main\'s drivers and scripts by absolute path: the PR worktree\'s own copies never run', () => {
  const sentinel = path.join(os.tmpdir(), `md1c-sentinel-${process.pid}-${Date.now()}`)
  const poison = `import fs from 'node:fs'\nfs.writeFileSync(${JSON.stringify(sentinel)}, 'ran')\nprocess.exit(1)\n`
  const { dir, work } = lessonsClash('a rule', 'a rule', (d) => {
    write(d, 'scripts/lessons-merge.mjs', poison)
    write(d, 'scripts/deadlines.mjs', poison)
  })
  try {
    const mainRoot = path.join(dir, 'main-checkout')
    fs.cpSync(path.join(ROOT, 'scripts'), path.join(mainRoot, 'scripts'), { recursive: true })
    const wt = path.join(dir, 'pr-worktree')
    git(work, 'worktree', 'add', '-q', '--detach', wt, 'origin/main')
    const r = updateBranch('pr-branch', wt, undefined, mainRoot)
    assert.equal(r.state, 'updated')
    assert.equal(fs.existsSync(sentinel), false, 'no PR-branch script ran')
    for (const d of MERGE_DRIVERS) {
      const set = git(wt, 'config', `merge.${d.key}.driver`).trim()
      assert.equal(set, driverCommand(d.driver, mainRoot))
      assert.ok(set.includes(path.join(mainRoot, 'scripts')), 'main\'s absolute script path')
      assert.ok(!set.includes(wt), 'never the worktree\'s')
    }
    assert.equal(count(git(work, 'show', `origin/pr-branch:${LESSONS}`), '**zz-md1c-dup**'), 1, 'main\'s lessons driver merged by slug')
  } finally {
    fs.rmSync(sentinel, { force: true })
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('the update CLI mode uses the invoking checkout\'s drivers, never the poisoned branch\'s', () => {
  const sentinel = path.join(os.tmpdir(), `md1c-cli-sentinel-${process.pid}-${Date.now()}`)
  const poison = `import fs from 'node:fs'\nfs.writeFileSync(${JSON.stringify(sentinel)}, 'ran')\nprocess.exit(1)\n`
  const { dir, work } = lessonsClash('a rule', 'a rule', (d) => {
    write(d, 'scripts/lessons-merge.mjs', poison)
    write(d, 'scripts/deadlines.mjs', poison)
  })
  try {
    // `work` is main's checkout (on main, never switched); the CLI is its own copy of the script.
    fs.copyFileSync(path.join(ROOT, 'scripts', 'pr-resolve.mjs'), path.join(work, 'scripts', 'pr-resolve.mjs'))
    const r = spawnSync(process.execPath, [path.join(work, 'scripts', 'pr-resolve.mjs'), 'update', '--branch', 'pr-branch'], { cwd: work, encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /^updated [0-9a-f]{40}/)
    assert.equal(fs.existsSync(sentinel), false, 'no PR-branch script ran')
    assert.equal(git(work, 'branch', '--show-current').trim(), 'main', 'the invoking checkout stays on main')
    assert.equal(count(git(work, 'show', `origin/pr-branch:${LESSONS}`), '**zz-md1c-dup**'), 1, 'main\'s lessons driver merged by slug')
    assert.ok(git(work, 'config', 'merge.lessons.driver').includes(path.join(work, 'scripts')), 'driver path is the invoking checkout\'s')
  } finally {
    fs.rmSync(sentinel, { force: true })
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
