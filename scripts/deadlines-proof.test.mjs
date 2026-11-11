// Spec 169, A5 (DL3c): an act whose Rows is `T: <proof>` is ticked by --write when the proof holds.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { checkDeadlines } from './check-deadlines.mjs'
import { derivedStatus, parseItems, parseProof, planRows, rewriteItemStatus } from './deadlines-lib.mjs'

const md = (...rows) => `# Deadlines

## Windows

| Window | Dates | Milestone |
|---|---|---|
| W1 | Nov 10 - Nov 30 | One |

## Budget

Hours a week: 10

## Items

| Status | Due | Item | Goal | How AI helps | Window | Rows | Waits on |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## Unscheduled
`
const row = (status, rows, name = 'Pick it (1 h)') => `| ${status} | 2026-11-30 | ${name} | g | - | W1 | ${rows} | - |`
const SPEC = { file: 'plan/169-x.md', md: '- [ ] **169.3** Proof · M · closes A5 · needs — · alias: DL3c\n' }
const plan = { specs: [SPEC] }
const MERGE = 'Merge pull request #1585 from no-trbl-2-u/loop/next-171.1'
const phases = planRows(plan).phases
const only = (m) => parseItems(m)[0]

test('A5: parseProof reads the three proofs, ignores a plain T, and flags the rest', () => {
    assert.deepEqual(parseProof('T: pr #12'), { kind: 'pr', arg: '12' })
    assert.deepEqual(parseProof('`T: spec DL3`'), { kind: 'spec', arg: 'DL3' })
    assert.deepEqual(parseProof('T: file public/a b.png'), { kind: 'file', arg: 'public/a b.png' })
    assert.equal(parseProof('T'), null)
    assert.equal(parseProof('BW1d'), null)
    for (const bad of ['T:', 'T: pr 12', 'T: nope x', 'T: file /etc/passwd', 'T: file ../x']) assert.ok(parseProof(bad).error, bad)
})

test('A5: a T: proof cell is still a T act (rows stays T)', () => {
    assert.equal(only(md(row('[ ]', 'T: pr #1585'))).rows, 'T')
})

test('A5: derivedStatus ticks on a held pr proof (merge and squash forms), and says nothing otherwise', () => {
    const item = only(md(row('[ ]', 'T: pr #1585')))
    assert.equal(derivedStatus(item, phases, { subjects: ['x', MERGE] }), '[x]')
    assert.equal(derivedStatus(item, phases, { subjects: ['fix (#1585)'] }), '[x]')
    assert.equal(derivedStatus(item, phases, { subjects: ['fix (#15850)'] }), null)
    assert.equal(derivedStatus(item, phases, {}), null)
})

test('A5: a spec proof holds for a chunk alias of the family, not for a longer family', () => {
    const item = (arg) => only(md(row('[ ]', `T: spec ${arg}`)))
    assert.equal(derivedStatus(item('DL3'), phases), '[x]')
    assert.equal(derivedStatus(item('DL'), phases), null)
    assert.equal(derivedStatus(item('DL30'), phases), null)
    assert.equal(derivedStatus(item('QS1'), phases), null)
})

test('A5: a file proof reads a scratch file, no network', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proof-'))
    fs.writeFileSync(path.join(dir, 'pick.png'), 'x')
    const exists = (rel) => fs.existsSync(path.join(dir, rel))
    assert.equal(derivedStatus(only(md(row('[ ]', 'T: file pick.png'))), phases, { exists }), '[x]')
    assert.equal(derivedStatus(only(md(row('[ ]', 'T: file other.png'))), phases, { exists }), null)
})

test('A5: rewriteItemStatus ticks a held proof and leaves a plain T and a failing proof alone', () => {
    const text = md(row('[ ]', 'T: pr #1585', 'A (1 h)'), row('[ ]', 'T', 'B (1 h)'), row('[ ]', 'T: pr #9', 'C (1 h)'))
    const out = rewriteItemStatus(text, phases, { subjects: [MERGE] })
    assert.deepEqual(out.changed, ['A (1 h): [ ] -> [x]'])
    assert.match(out.md, /\| \[x\] \| 2026-11-30 \| A \(1 h\)/)
    assert.match(out.md, /\| \[ \] \| 2026-11-30 \| B \(1 h\)/)
    assert.deepEqual(out.unmatched, [])
})

const lint = (text, subjects = [], exists = () => false) => checkDeadlines(text, plan, subjects, exists)

test('A5: the lint fails a ticked spec or file act whose proof does not hold, and passes when it does', () => {
    const errs = lint(md(row('[x]', 'T: spec QS1', 'A (1 h)'), row('[x]', 'T: file nope.png', 'B (1 h)')))
    assert.equal(errs.length, 2)
    assert.match(errs[0], /ticked, but its proof `T: spec QS1` does not hold/)
    assert.deepEqual(lint(md(row('[x]', 'T: spec DL3', 'A (1 h)'), row('[x]', 'T: file ok.png', 'B (1 h)')), [], () => true), [])
})

test('A5: the lint asks for --write when a proof holds but the act is not ticked', () => {
    const errs = lint(md(row('[ ]', 'T: pr #1585')), [MERGE])
    assert.equal(errs.length, 1)
    assert.match(errs[0], /--write/)
})

test('A5: a pr proof not found (shallow history) is no failure, ticked or not', () => {
    assert.deepEqual(lint(md(row('[x]', 'T: pr #1585'))), [])
    assert.deepEqual(lint(md(row('[ ]', 'T: pr #1585'))), [])
})

test('A5: the lint fails an unreadable proof, and a plain T is untouched', () => {
    const errs = lint(md(row('[ ]', 'T: pr 12', 'A (1 h)')))
    assert.equal(errs.length, 1)
    assert.match(errs[0], /unreadable proof/)
    assert.deepEqual(lint(md(row('[x]', 'T', 'A (1 h)'), row('[ ]', 'T', 'B (1 h)'))), [])
})

test('A5: a loop row in Rows still fails, beside a proof act', () => {
    const p = { specs: [{ file: 'plan/50-y.md', md: '- [ ] **50.1** Loop row · S · closes A1 · needs — · alias: ZZ1a\n' }] }
    const errs = checkDeadlines(md(row('[ ]', 'ZZ1a', 'L (1 h)'), row('[ ]', 'T: spec ZZ1', 'A (1 h)')), p)
    assert.equal(errs.filter((e) => /loop row ZZ1a/.test(e)).length, 1)
})
