// scripts/lessons-merge.test.mjs — witness for the lessons merge driver
// (Phase ML1a). Pins the by-slug union (one row, higher count, later date,
// unioned citations, guarded over open), the refusals (byte cap, open cap,
// malformed row, clashing rewrites), that untouched rows keep their place,
// that check-lessons accepts every merge it emits, and that the driver is
// registered from the repo's own setup path.
//
//   node --test scripts/lessons-merge.test.mjs

import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { lintLessons, lintNeedsT, MAX_BYTES, MAX_OPEN } from './check-lessons.mjs'
import { conflictText, kindFor, mergeLessons, unionCitations } from './lessons-merge.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT = path.join(ROOT, 'scripts', 'lessons-merge.mjs')

const row = (slug, { trap = 'a trap (P1)', rule = 'a rule', seen = 1, last = '2026-10-12', tail = 'open' } = {}) =>
  `- **${slug}** · ${trap} → ${rule} · seen ${seen}× · last ${last} · ${tail}`
const doc = (...lines) => ['# Lessons', '', '<!-- @domain:deploy -->', '', '## Deploy', '', ...lines, ''].join('\n')
const needsRow = (slug, { seen = 1, last = '2026-10-12', what = 'renew the token' } = {}) =>
  `- **${slug}** · ${what} · blocks: deploys · workaround: none · seen ${seen}× · last ${last}`
const needsDoc = (...lines) => ['# Needs T', '', '## Open', '', ...lines, ''].join('\n')

function merged(base, ours, theirs, kind = 'lessons') {
  const r = mergeLessons(base, ours, theirs, kind)
  assert.equal(r.ok, true, r.reason)
  const lint = kind === 'lessons' ? lintLessons(r.text) : lintNeedsT(r.text)
  assert.deepEqual(lint.findings, [], 'check-lessons accepts the merge')
  return r.text
}

test('both sides bump one slug: one row, higher count, later date, unioned citations', () => {
  const base = doc(row('a', { trap: 'it bit (P1)', seen: 2, last: '2026-10-01' }))
  const ours = doc(row('a', { trap: 'it bit (P1; P2)', seen: 3, last: '2026-10-05' }))
  const theirs = doc(row('a', { trap: 'it bit (P1; P3)', seen: 3, last: '2026-10-07' }))
  const text = merged(base, ours, theirs)
  assert.equal(text, doc(row('a', { trap: 'it bit (P1; P2; P3)', seen: 3, last: '2026-10-07' })))
})

test('both sides add the same slug in different places: one row, at ours\' place', () => {
  const base = doc(row('x'), row('y'))
  const ours = doc(row('new', { seen: 1, last: '2026-10-02' }), row('x'), row('y'))
  const theirs = doc(row('x'), row('y'), row('new', { seen: 2, last: '2026-10-01' }))
  const text = merged(base, ours, theirs)
  assert.equal(text, doc(row('new', { seen: 2, last: '2026-10-02' }), row('x'), row('y')))
})

test('guarded by beats open', () => {
  const base = doc(row('a', { seen: 1 }))
  const ours = doc(row('a', { seen: 2, last: '2026-10-13', tail: 'guarded by scripts/x.test.mjs' }))
  const theirs = doc(row('a', { seen: 2, last: '2026-10-14' }))
  const text = merged(base, ours, theirs)
  assert.equal(text, doc(row('a', { seen: 2, last: '2026-10-14', tail: 'guarded by scripts/x.test.mjs' })))
})

test('each side adds a different slug at the same spot: both survive, ours first', () => {
  const base = doc(row('x'))
  const ours = doc(row('x'), row('o'))
  const theirs = doc(row('x'), row('t'))
  assert.equal(merged(base, ours, theirs), doc(row('x'), row('o'), row('t')))
})

test('a row on one side only, and untouched rows, keep their text and place', () => {
  const base = doc(row('a'), row('b'), row('c'))
  const ours = doc(row('a'), row('b', { seen: 2, last: '2026-10-20' }), row('c'))
  const theirs = doc(row('a'), row('b'), row('c'), row('d'))
  assert.equal(merged(base, ours, theirs), doc(row('a'), row('b', { seen: 2, last: '2026-10-20' }), row('c'), row('d')))
})

test('a row deleted on one side and untouched on the other stays deleted', () => {
  const base = doc(row('a'), row('b'))
  const ours = doc(row('a'))
  const theirs = doc(row('a'), row('b'), row('c'))
  assert.equal(merged(base, ours, theirs), doc(row('a'), row('c')))
})

test('non-row edits on separate lines merge as git would', () => {
  const base = doc(row('a'))
  const ours = base.replace('## Deploy', '## Deploy and ship')
  const theirs = doc(row('a', { seen: 2, last: '2026-10-20' }))
  assert.equal(merged(base, ours, theirs), doc(row('a', { seen: 2, last: '2026-10-20' })).replace('## Deploy', '## Deploy and ship'))
})

test('refuses a union that breaches the byte cap', () => {
  const long = 'x'.repeat(MAX_BYTES - 90)
  const base = doc(row('a', { trap: `${long} (P1)` }))
  const ours = doc(row('a', { trap: `${long} (P1; PHASE-OURS)`, seen: 2 }))
  const theirs = doc(row('a', { trap: `${long} (P1; PHASE-THEIRS)`, seen: 2 }))
  assert.ok(Buffer.byteLength(ours.split('\n')[6]) <= MAX_BYTES, 'each side fits on its own')
  const r = mergeLessons(base, ours, theirs)
  assert.equal(r.ok, false)
  assert.match(r.reason, /bytes \(max 500\)/)
})

test('refuses a result past the open cap', () => {
  const shared = Array.from({ length: MAX_OPEN - 1 }, (_, i) => row(`l${i}`))
  const base = doc(...shared)
  const r = mergeLessons(base, doc(...shared, row('ours-new')), doc(...shared, row('theirs-new')))
  assert.equal(r.ok, false)
  assert.match(r.reason, /open lessons \(max 40\)/)
})

test('refuses a malformed row rather than passing it through', () => {
  const base = doc(row('a'))
  const r = mergeLessons(base, doc(row('a'), '- **b** · no seen count → rule · open'), base)
  assert.equal(r.ok, false)
  assert.match(r.reason, /ours line 8 is not a well-formed row/)
})

test('refuses when both sides rewrote the rule', () => {
  const base = doc(row('a'))
  const r = mergeLessons(base, doc(row('a', { rule: 'rule one' })), doc(row('a', { rule: 'rule two' })))
  assert.equal(r.ok, false)
  assert.match(r.reason, /both sides changed the rule of 'a'/)
})

test('refuses a row deleted on one side and bumped on the other', () => {
  const base = doc(row('a'), row('b'))
  const r = mergeLessons(base, doc(row('a')), doc(row('a'), row('b', { seen: 2 })))
  assert.equal(r.ok, false)
  assert.match(r.reason, /'b' was deleted by ours and changed by theirs/)
})

test('refuses a clash outside the rows', () => {
  const base = doc(row('a'))
  const r = mergeLessons(base, base.replace('# Lessons', '# Lessons one'), base.replace('# Lessons', '# Lessons two'))
  assert.equal(r.ok, false)
  assert.match(r.reason, /outside the rows/)
})

test('NEEDS_T rows merge by slug the same way', () => {
  const base = needsDoc(needsRow('tok', { seen: 1 }))
  const ours = needsDoc(needsRow('tok', { seen: 2, last: '2026-10-15' }))
  const theirs = needsDoc(needsRow('tok', { seen: 2, last: '2026-10-16' }), needsRow('oauth'))
  assert.equal(merged(base, ours, theirs, 'needs-t'), needsDoc(needsRow('tok', { seen: 2, last: '2026-10-16' }), needsRow('oauth')))
  assert.equal(kindFor('plan/NEEDS_T.md'), 'needs-t')
  assert.equal(kindFor('plan/lessons.md'), 'lessons')
})

test('unionCitations appends only new ids and leaves other text alone', () => {
  assert.equal(unionCitations('bit (A, B)', 'bit (A, C)'), 'bit (A, B, C)')
  assert.equal(unionCitations('bit (A; B)', 'bit (B)'), 'bit (A; B)')
  assert.equal(unionCitations('bit (A) here', 'bot (A) here'), undefined)
})

test('a refusal leaves ordinary conflict markers, even where a line merge was clean', () => {
  const base = doc(row('x'))
  const text = conflictText(base, doc(row('x'), row('o')), doc(row('t'), row('x')))
  assert.match(text, /^<{7} ours$/m)
  assert.match(text, /^>{7} theirs$/m)
})

test('the CLI writes the merge into <ours>, and markers plus exit 1 on a refusal', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-merge-test-'))
  try {
    const write = (name, text) => (fs.writeFileSync(path.join(dir, name), text), path.join(dir, name))
    const base = doc(row('a'))
    const args = [write('O', base), write('A', doc(row('a', { seen: 2 }))), write('B', doc(row('a'), row('b')))]
    execFileSync(process.execPath, [SCRIPT, ...args, 'plan/lessons.md'])
    assert.equal(fs.readFileSync(args[1], 'utf8'), doc(row('a', { seen: 2 }), row('b')))

    const bad = [write('O2', base), write('A2', doc(row('a', { rule: 'one' }))), write('B2', doc(row('a', { rule: 'two' })))]
    const r = spawnSync(process.execPath, [SCRIPT, ...bad, 'plan/lessons.md'], { encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /refused plan\/lessons\.md/)
    assert.match(fs.readFileSync(bad[1], 'utf8'), /^<{7} /m)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('registration: .gitattributes names the driver for both files, and SessionStart registers it', () => {
  const attrs = fs.readFileSync(path.join(ROOT, '.gitattributes'), 'utf8')
  for (const file of ['plan/lessons.md', 'plan/NEEDS_T.md']) {
    assert.match(attrs, new RegExp(`^${file.replace('.', '\\.')}\\s+.*\\bmerge=lessons\\b`, 'm'), file)
  }
  const settings = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf8'))
  const commands = settings.hooks.SessionStart.flatMap((h) => h.hooks.map((x) => x.command))
  const reg = commands.find((c) => /config merge\.lessons\.driver /.test(c))
  assert.ok(reg, 'a SessionStart command sets merge.lessons.driver')
  assert.match(reg, /scripts\/lessons-merge\.mjs %O %A %B %P/)
  assert.ok(commands.some((c) => /config core\.hooksPath/.test(c)), 'beside the core.hooksPath registration')
})

test('a real git merge with the driver registered keeps one row', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-merge-repo-'))
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  try {
    git('init', '-q', '-b', 'main')
    git('config', 'user.email', 't@example.com')
    git('config', 'user.name', 't')
    git('config', 'merge.lessons.driver', `"${process.execPath}" "${SCRIPT}" %O %A %B %P`)
    fs.mkdirSync(path.join(dir, 'plan'))
    fs.writeFileSync(path.join(dir, '.gitattributes'), 'plan/lessons.md merge=lessons\n')
    const file = path.join(dir, 'plan', 'lessons.md')
    fs.writeFileSync(file, doc(row('x'), row('y')))
    git('add', '.')
    git('commit', '-q', '-m', 'base')
    git('switch', '-q', '-c', 'side')
    fs.writeFileSync(file, doc(row('x'), row('y'), row('dup', { trap: 'bit (S1)', last: '2026-10-19' })))
    git('commit', '-q', '-am', 'side')
    git('switch', '-q', 'main')
    fs.writeFileSync(file, doc(row('dup', { trap: 'bit (M1)', last: '2026-10-20' }), row('x'), row('y')))
    git('commit', '-q', '-am', 'main')
    git('merge', '-q', '--no-edit', 'side')
    assert.equal(fs.readFileSync(file, 'utf8'), doc(row('dup', { trap: 'bit (M1, S1)', last: '2026-10-20' }), row('x'), row('y')))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
