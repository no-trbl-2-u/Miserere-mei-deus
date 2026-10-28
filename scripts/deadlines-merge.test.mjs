// scripts/deadlines-merge.test.mjs — witness for the plan/deadlines.md merge
// driver (Phase MD1a). Pins that two plots inserting an Item, an Unscheduled
// line and a Change log line at the same spot keep both once, that a plot
// beside a Status refresh keeps both, that a row both sides edited merges cell
// by cell, that a doubled Unscheduled id or Items row is refused, that a cell
// both sides changed keeps its markers, that new Items stay in date order, and
// that the driver is registered from the repo's own setup path.
//
//   node --test scripts/deadlines-merge.test.mjs

import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { mergeBuildPlan } from './build-plan-merge.mjs'
import { dupCounts, mergeDeadlines, mergeRow, tidyItems } from './deadlines-merge.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT = path.join(ROOT, 'scripts', 'deadlines-merge.mjs')

const item = (name, { mark = ' ', due = '2026-11-02', rows = 'X1' } = {}) => `| [${mark}] | ${due} | ${name} | W1 | ${rows} |`
const unsched = (id) => `- ${id} — loop work; date not set.`
const log = (what) => `- **2026-10-28** — **${what}** (T).`

const doc = ({ items, unscheduled, changes }) =>
  [
    '# Deadlines',
    '',
    '## Items',
    '',
    '| Status | Due | Item | Window | Rows |',
    '|---|---|---|---|---|',
    ...items,
    '',
    '## Unscheduled',
    '',
    'Open rows left undated.',
    '',
    ...unscheduled,
    '',
    '## How a window closes',
    '',
    'Text.',
    '',
    '## Change log',
    '',
    ...changes,
    '',
  ].join('\n')

const baseItems = [item('Alpha', { due: '2026-10-30', rows: 'A1' }), item('Beta', { due: '2026-11-04', rows: 'B1' }), item('Gamma', { due: '2026-11-10', rows: 'C1' })]
const baseUns = [unsched('U1'), unsched('U2')]
const baseLog = [log('old plot')]
const base = doc({ items: baseItems, unscheduled: baseUns, changes: baseLog })

function merged(b, o, t) {
  const r = mergeDeadlines(b, o, t)
  assert.equal(r.ok, true, r.reason)
  return r.text
}

test('two plots at the same spots: each Item, Unscheduled line and Change log line survives once', () => {
  const ours = doc({
    items: [...baseItems, item('Ours', { due: '2026-11-12', rows: 'O1' })],
    unscheduled: [...baseUns, unsched('O1')],
    changes: [log('ours'), ...baseLog],
  })
  const theirs = doc({
    items: [...baseItems, item('Theirs', { due: '2026-11-13', rows: 'T1' })],
    unscheduled: [...baseUns, unsched('T1')],
    changes: [log('theirs'), ...baseLog],
  })
  assert.equal(
    merged(base, ours, theirs),
    doc({
      items: [...baseItems, item('Ours', { due: '2026-11-12', rows: 'O1' }), item('Theirs', { due: '2026-11-13', rows: 'T1' })],
      unscheduled: [...baseUns, unsched('O1'), unsched('T1')],
      changes: [log('ours'), log('theirs'), ...baseLog],
    }),
  )
})

test('a plot beside a Status refresh: the inserted Item and the ticked cell both survive, the row once', () => {
  const refreshed = [item('Alpha', { mark: 'x', due: '2026-10-30', rows: 'A1' }), baseItems[1], baseItems[2]]
  const ours = doc({ items: refreshed, unscheduled: baseUns, changes: baseLog })
  const theirs = doc({
    items: [item('New', { due: '2026-10-29', rows: 'N1' }), ...baseItems],
    unscheduled: baseUns,
    changes: baseLog,
  })
  const text = merged(base, ours, theirs)
  assert.equal(
    text,
    doc({ items: [item('New', { due: '2026-10-29', rows: 'N1' }), ...refreshed], unscheduled: baseUns, changes: baseLog }),
  )
  assert.equal(dupCounts(text).rows.get(refreshed[0]), 1)
})

test('a Rows cell edited against a Status cell merges cell by cell', () => {
  const ours = doc({ items: [item('Alpha', { due: '2026-10-30', rows: 'A1, A2' }), baseItems[1], baseItems[2]], unscheduled: baseUns, changes: baseLog })
  const theirs = doc({ items: [item('Alpha', { mark: 'x', due: '2026-10-30', rows: 'A1' }), baseItems[1], baseItems[2]], unscheduled: baseUns, changes: baseLog })
  assert.equal(
    merged(base, ours, theirs),
    doc({ items: [item('Alpha', { mark: 'x', due: '2026-10-30', rows: 'A1, A2' }), baseItems[1], baseItems[2]], unscheduled: baseUns, changes: baseLog }),
  )
})

test('mergeRow takes each cell from the side that changed it and refuses a cell changed two ways', () => {
  const b = '| [ ] | 2026-11-01 | Name | W1 | A1 |'
  assert.equal(mergeRow(b, '| [x] | 2026-11-01 | Name | W1 | A1 |', '| [ ] | 2026-11-01 | Name | W1 | A1, A2 |'), '| [x] | 2026-11-01 | Name | W1 | A1, A2 |')
  assert.equal(mergeRow(b, '| [ ] | 2026-11-01 | One | W1 | A1 |', '| [ ] | 2026-11-01 | Two | W1 | A1 |'), null)
  assert.equal(mergeRow(b, '| [ ] | 2026-11-01 | Name | W1 | A1 | extra |', b), null)
  assert.equal(mergeRow(b, 'not a row', b), null)
})

test('a cell both sides changed to different values keeps its conflict markers', () => {
  const ours = doc({ items: [item('Alpha one', { due: '2026-10-30', rows: 'A1' }), baseItems[1], baseItems[2]], unscheduled: baseUns, changes: baseLog })
  const theirs = doc({ items: [item('Alpha two', { due: '2026-10-30', rows: 'A1' }), baseItems[1], baseItems[2]], unscheduled: baseUns, changes: baseLog })
  const r = mergeDeadlines(base, ours, theirs)
  assert.equal(r.ok, false)
  assert.match(r.reason, /1 clash/)
  assert.match(r.text, /^<<<<<<< ours$/m)
  assert.match(r.text, /Alpha one/)
  assert.match(r.text, /Alpha two/)
})

test('a doubled Unscheduled id is refused as a whole', () => {
  const ours = doc({ items: baseItems, unscheduled: [...baseUns, unsched('N1')], changes: baseLog })
  const theirs = doc({ items: baseItems, unscheduled: [...baseUns, `- N1 — a different reason; date not set.`], changes: baseLog })
  const r = mergeDeadlines(base, ours, theirs)
  assert.equal(r.ok, false)
  assert.match(r.reason, /Unscheduled N1 a second line/)
  assert.match(r.text, /^<<<<<<< ours$/m)
})

test('an Items row both sides inserted, at different spots, is refused as a doubled row', () => {
  const same = item('Same', { due: '2026-11-12', rows: 'S1' })
  const ours = doc({ items: [same, ...baseItems], unscheduled: baseUns, changes: baseLog })
  const theirs = doc({ items: [...baseItems, same], unscheduled: baseUns, changes: baseLog })
  const r = mergeDeadlines(base, ours, theirs)
  assert.equal(r.ok, false)
  assert.match(r.reason, /doubles 1 Items row/)
})

test('Items inserted at the same spot by two plots stay in due-date order', () => {
  const ours = doc({ items: [...baseItems, item('Late', { due: '2026-11-20', rows: 'L1' })], unscheduled: baseUns, changes: baseLog })
  const theirs = doc({ items: [...baseItems, item('Early', { due: '2026-11-11', rows: 'E1' })], unscheduled: baseUns, changes: baseLog })
  assert.equal(
    merged(base, ours, theirs),
    doc({ items: [...baseItems, item('Early', { due: '2026-11-11', rows: 'E1' }), item('Late', { due: '2026-11-20', rows: 'L1' })], unscheduled: baseUns, changes: baseLog }),
  )
})

test('tidyItems sorts only the new rows, leaves base rows in place, and ignores other blocks', () => {
  const [a, b, c] = [item('A', { due: '2026-11-09' }), item('B', { due: '2026-11-01' }), item('C', { due: '2026-11-05' })]
  assert.deepEqual(tidyItems([a, c, b], [a]), [a, b, c])
  assert.deepEqual(tidyItems([c, b], [c]), [c, b])
  assert.deepEqual(tidyItems([a, c], []), [c, a])
  const prose = ['text', a]
  assert.equal(tidyItems(prose, []), prose)
})

test('the build-plan core is shared: mergeBuildPlan still settles the same-spot case', () => {
  const row = (id) => `- [ ] Phase ${id} — row`
  const wrap = (rows) => ['# Plan', '', ...rows, '', '## Queue change log', ''].join('\n')
  const r = mergeBuildPlan(wrap([row('B1')]), wrap([row('O1'), row('B1')]), wrap([row('T1'), row('B1')]))
  assert.equal(r.ok, true)
  assert.equal(r.text, wrap([row('O1'), row('T1'), row('B1')]))
})

test('registration: .gitattributes names the driver, SessionStart and MERGE_DRIVERS register it', () => {
  const attrs = fs.readFileSync(path.join(ROOT, '.gitattributes'), 'utf8')
  assert.match(attrs, /^plan\/deadlines\.md\s+.*\bmerge=deadlines\b/m)
  const settings = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf8'))
  const commands = settings.hooks.SessionStart.flatMap((h) => h.hooks.map((x) => x.command))
  const reg = commands.find((c) => /config merge\.deadlines\.driver /.test(c))
  assert.ok(reg, 'a SessionStart command sets merge.deadlines.driver')
  assert.match(reg, /scripts\/deadlines-merge\.mjs %O %A %B %P/)
  const resolver = fs.readFileSync(path.join(ROOT, 'scripts', 'pr-resolve.mjs'), 'utf8')
  assert.match(resolver, /key: 'deadlines'[^\n]*scripts\/deadlines-merge\.mjs %O %A %B %P/)
})

test('the CLI writes the merge to <ours> and exits 0, or leaves markers and exits 1', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deadlines-merge-cli-'))
  try {
    const write = (name, text) => (fs.writeFileSync(path.join(dir, name), text), path.join(dir, name))
    const b = write('base', base)
    const o = write('ours', doc({ items: baseItems, unscheduled: [...baseUns, unsched('O1')], changes: baseLog }))
    const t = write('theirs', doc({ items: baseItems, unscheduled: [...baseUns, unsched('T1')], changes: baseLog }))
    let r = spawnSync(process.execPath, [SCRIPT, b, o, t, 'plan/deadlines.md'], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    assert.match(fs.readFileSync(o, 'utf8'), /- O1 —[^\n]*\n- T1 —/)
    const o2 = write('ours2', doc({ items: baseItems, unscheduled: [...baseUns, unsched('N1')], changes: baseLog }))
    const t2 = write('theirs2', doc({ items: baseItems, unscheduled: [...baseUns, '- N1 — other; date not set.'], changes: baseLog }))
    r = spawnSync(process.execPath, [SCRIPT, b, o2, t2, 'plan/deadlines.md'], { encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /deadlines-merge: plan\/deadlines\.md: .*second line/)
    assert.match(fs.readFileSync(o2, 'utf8'), /^<<<<<<< ours$/m)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a real git merge with the driver registered keeps both plots, and the live file merges cleanly', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deadlines-merge-repo-'))
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  try {
    git('init', '-q', '-b', 'main')
    git('config', 'user.email', 't@example.com')
    git('config', 'user.name', 't')
    git('config', 'merge.deadlines.driver', `"${process.execPath}" "${SCRIPT}" %O %A %B %P`)
    fs.mkdirSync(path.join(dir, 'plan'), { recursive: true })
    fs.writeFileSync(path.join(dir, '.gitattributes'), 'plan/deadlines.md merge=deadlines\n')
    const file = path.join(dir, 'plan', 'deadlines.md')
    const live = fs.readFileSync(path.join(ROOT, 'plan', 'deadlines.md'), 'utf8')
    fs.writeFileSync(file, live)
    git('add', '.')
    git('commit', '-q', '-m', 'base')
    const edit = (tag, due) => {
      let text = live
      text = text.replace('\n## Change log\n\n', `\n## Change log\n\n- **2026-10-28** — **plot ${tag}** (T).\n`)
      text = text.replace('\n## How a window closes', `- ${tag} — loop work; date not set.\n\n## How a window closes`)
      const lines = text.split('\n')
      const at = lines.indexOf('| Status | Due | Item | Window | Rows |')
      assert.ok(at > 0)
      lines.splice(at + 2, 0, `| [ ] | ${due} | Item ${tag} | W1 | ${tag} |`)
      return lines.join('\n')
    }
    git('switch', '-q', '-c', 'plot-t')
    fs.writeFileSync(file, edit('TT1', '2026-10-29'))
    git('commit', '-q', '-am', 'plot T')
    git('switch', '-q', 'main')
    fs.writeFileSync(file, edit('OO1', '2026-10-28'))
    git('commit', '-q', '-am', 'plot O')
    git('merge', '-q', '--no-edit', 'plot-t')
    const text = fs.readFileSync(file, 'utf8')
    for (const needle of ['Item OO1', 'Item TT1', '- OO1 —', '- TT1 —', 'plot OO1', 'plot TT1']) {
      assert.equal(text.split(needle).length - 1, 1, needle)
    }
    assert.ok(!text.includes('<<<<<<<'))
    assert.ok(text.indexOf('Item OO1') < text.indexOf('Item TT1'))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
