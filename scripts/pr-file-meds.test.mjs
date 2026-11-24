// scripts/pr-file-meds.test.mjs — node --test scripts/pr-file-meds.test.mjs
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { lintQueue } from './check-plan-queues.mjs'
import { alreadyFiled, auditRow, categoryOf, fileMeds, fileRows, medRows, mergedPrs, parseFindings, passVerdict, run } from './pr-file-meds.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const HEAD = '541afb10b6c85bf50d501945bb5f748f6c505478'
const URL = 'https://github.com/o/r/pull/1750#issuecomment-1'

const verdict = (rows, mark = 'pass') => `## Review verdict
<!-- pr-review:verdict ${mark} -->
<!-- pr-review:head ${HEAD} diff f34d095da6d4a40147df081b85a6c041c0a6774f -->
<!-- pr-review:readers 4 overlap 1 -->

${rows}

Risk: derived \`risk:medium\`.
`

const TABLE = `| Severity | Where | Finding |
|---|---|---|
| HIGH | \`scripts/a.mjs:10\` | [a2:control] The guard is skipped on a retry. |
| MED | \`axiomancer-mobile/scripts/audit-capture.mjs:96\` | [a1:logic][control] The new mercy branch is unreachable: the loop breaks first. |
| MED | \`scripts/b.test.mjs:12\` | [tests] Only the happy path is driven; a \\| pipe stays in the text. |
| LOW | \`x.test.tsx:107\` | [tests] Only the FINISH answer is driven. |`

const AUDIT = `# Audit

> preamble

## Pending

### [ ] [finding] An older row (2026-11-01)
- category: finding
- impact: 4
- ease: 6
- detail: something
- next: fix it

## Done

### [x] [tests] A done row
- category: tests
- detail: done
`

describe('parseFindings / medRows', () => {
  it('a verdict with HIGH, MED and LOW rows yields exactly the MED rows', () => {
    const meds = medRows(verdict(TABLE))
    assert.deepEqual(meds, [
      { severity: 'MED', where: 'axiomancer-mobile/scripts/audit-capture.mjs:96', text: '[a1:logic][control] The new mercy branch is unreachable: the loop breaks first.' },
      { severity: 'MED', where: 'scripts/b.test.mjs:12', text: '[tests] Only the happy path is driven; a \\| pipe stays in the text.' },
    ])
  })

  it('reads every row, so the HIGH and LOW are seen and dropped, never filed', () => {
    const all = parseFindings(verdict(TABLE))
    assert.equal(all.ok, true)
    assert.deepEqual(all.rows.map((r) => r.severity), ['HIGH', 'MED', 'MED', 'LOW'])
    assert.equal(medRows(verdict(TABLE)).some((r) => r.severity !== 'MED'), false)
  })

  it('a verdict with no findings, or with only HIGH and LOW, has no MED rows', () => {
    assert.deepEqual(parseFindings(verdict('No findings.')), { ok: true, rows: [] })
    assert.deepEqual(medRows(verdict('No findings.')), [])
    const noMed = TABLE.split('\n').filter((l) => !l.startsWith('| MED')).join('\n')
    assert.deepEqual(medRows(verdict(noMed)), [])
  })

  it('an unparsable table is a failure, not an empty list', () => {
    assert.equal(parseFindings(verdict('Some prose and no table.')).ok, false)
    const bad = `${TABLE}\n| MEDIUM | \`a:1\` | text |`
    assert.equal(parseFindings(verdict(bad)).ok, false)
    const short = `${TABLE}\n| MED | only two cells |`
    assert.equal(parseFindings(verdict(short)).ok, false)
    assert.throws(() => medRows(verdict('Some prose and no table.')), /unparsable/)
  })
})

describe('categoryOf', () => {
  it('maps the first tag, its reader prefix stripped', () => {
    assert.equal(categoryOf('[a1:logic][control] x'), 'finding')
    assert.equal(categoryOf('[tests] x'), 'tests')
    assert.equal(categoryOf('[a3:control] x'), 'process')
    assert.equal(categoryOf('[seams][tests] x'), 'debt')
    assert.equal(categoryOf('[perf] x'), 'finding')
    assert.equal(categoryOf('no tag at all'), 'finding')
  })
})

describe('auditRow', () => {
  it('has the title, category, impact 5, ease 5, file:line, text, verdict link and next line', () => {
    const [med] = medRows(verdict(TABLE))
    const row = auditRow(med, { pr: 1750, date: '2026-11-24', url: URL })
    const lines = row.split('\n')
    assert.match(lines[0], /^### \[ \] \[finding\] `audit-capture\.mjs:96`: The new mercy branch is unreachable: the loop breaks first\. \(PR #1750 review, 2026-11-24\)$/)
    assert.equal(lines[1], '- category: finding')
    assert.equal(lines[2], '- impact: 5')
    assert.equal(lines[3], '- ease: 5')
    assert.match(lines[4], /^- detail: MED from the `pass` verdict on #1750 \(https:\/\/github\.com\/o\/r\/pull\/1750#issuecomment-1\)\. `axiomancer-mobile\/scripts\/audit-capture\.mjs:96`: \[a1:logic\]\[control\] The new mercy branch/)
    assert.equal(lines[5], '- next: `/iterate`: verify the finding on `main`, fix it or close it as not reproduced.')
    assert.equal(lintQueue(`## Pending\n\n${row}\n`, 'audit').findings.length, 0)
  })

  it('cuts a long finding to one short title line', () => {
    const long = { severity: 'MED', where: 'a.mjs:1', text: `[tests] ${'word '.repeat(60)}end. Second sentence.` }
    const title = auditRow(long, { pr: 1, date: '2026-11-24', url: URL }).split('\n')[0]
    assert.ok(title.length < 160, title)
    assert.match(title, /… \(PR #1 review, 2026-11-24\)$/)
  })
})

describe('fileRows', () => {
  const meds = medRows(verdict(TABLE))
  const at = { pr: 1750, date: '2026-11-24', url: URL }

  it('puts each MED at the top of Pending and keeps the file lint-clean', () => {
    const r = fileRows(AUDIT, meds, at)
    assert.equal(r.filed.length, 2)
    const pending = r.text.slice(r.text.indexOf('## Pending'), r.text.indexOf('## Done'))
    assert.equal((pending.match(/^### /gm) ?? []).length, 3)
    assert.ok(pending.indexOf('audit-capture.mjs:96') < pending.indexOf('An older row'))
    assert.deepEqual(lintQueue(r.text, 'audit').findings, [])
  })

  it('no MED files nothing and leaves the file as it was', () => {
    const r = fileRows(AUDIT, [], at)
    assert.equal(r.text, AUDIT)
    assert.deepEqual(r.filed, [])
  })

  it('a MED already filed is not filed again', () => {
    const once = fileRows(AUDIT, meds, at).text
    const twice = fileRows(once, meds, { ...at, pr: 1751 })
    assert.equal(twice.text, once)
    assert.equal(twice.filed.length, 0)
    assert.equal(twice.skipped.length, 2)
    assert.equal(alreadyFiled(once, meds[0]), true)
    assert.equal(alreadyFiled(AUDIT, meds[0]), false)
  })

  it('the same file:line with other text is a new finding', () => {
    const once = fileRows(AUDIT, meds, at).text
    const other = { ...meds[0], text: '[logic] A different problem on the same line.' }
    assert.equal(fileRows(once, [other], at).filed.length, 1)
  })

  it('two identical MEDs in one verdict file once', () => {
    assert.equal(fileRows(AUDIT, [meds[0], meds[0]], at).filed.length, 1)
  })
})

describe('passVerdict / mergedPrs', () => {
  const c = (body, createdAt, author = 'no-trbl-2-u', url = URL) => ({ body, createdAt, author, url })

  it('takes the latest trusted verdict, and only when it is a pass', () => {
    const pass = c(verdict(TABLE), '2026-11-24T10:00:00Z')
    const later = c(verdict('No findings.', 'not-pass'), '2026-11-24T11:00:00Z')
    assert.equal(passVerdict([pass]).body, pass.body)
    assert.equal(passVerdict([later, pass]), null)
    assert.equal(passVerdict([pass, c(verdict('No findings.'), '2026-11-24T12:00:00Z', 'someone-else')]).body, pass.body)
    assert.equal(passVerdict([c('a comment', '2026-11-24T10:00:00Z')]), null)
  })

  it('names the PRs merged by the pushed commits', () => {
    assert.deepEqual(mergedPrs(['Merge pull request #1749 from o/loop/next-189.1', 'plan: settle 189.1', 'Fix a thing (#1700)', 'Merge pull request #1749 from o/x']), [1749, 1700])
  })
})

describe('the filing never fails the job', () => {
  it('a push rejected twice is reported, exit stays 0', async () => {
    let pushes = 0
    const said = []
    const code = await run({
      prs: () => [1750],
      view: () => ({ state: 'MERGED', mergedAt: '2026-11-24T10:00:00Z', comments: [{ body: verdict(TABLE), createdAt: '2026-11-24T09:00:00Z', author: 'no-trbl-2-u', url: URL }] }),
      write: () => {
        pushes += 1
        return { state: 'lost', reason: 'the push to main was rejected 2 times' }
      },
      log: (s) => said.push(s),
      summary: (s) => said.push(s),
    })
    assert.equal(code, 0)
    assert.equal(pushes, 1)
    assert.ok(said.some((s) => /::warning::.*rejected 2 times/.test(s)), said.join('\n'))
  })

  it('an unparsable table is reported, nothing written, exit 0', async () => {
    const said = []
    let wrote = false
    const code = await run({
      prs: () => [1750],
      view: () => ({ state: 'MERGED', comments: [{ body: verdict('prose only'), createdAt: '2026-11-24T09:00:00Z', author: 'no-trbl-2-u', url: URL }] }),
      write: () => {
        wrote = true
        return { state: 'filed' }
      },
      log: (s) => said.push(s),
      summary: (s) => said.push(s),
    })
    assert.equal(code, 0)
    assert.equal(wrote, false)
    assert.ok(said.some((s) => /::warning::.*unparsable/.test(s)), said.join('\n'))
  })

  it('a thrown error anywhere is reported, exit 0', async () => {
    const said = []
    const code = await run({
      prs: () => {
        throw new Error('git exploded')
      },
      log: (s) => said.push(s),
      summary: (s) => said.push(s),
    })
    assert.equal(code, 0)
    assert.ok(said.some((s) => /::warning::.*git exploded/.test(s)))
  })

  it('an unmerged PR, or a not-pass, files nothing', async () => {
    let wrote = 0
    const write = () => {
      wrote += 1
      return { state: 'filed', filed: [] }
    }
    const base = { prs: () => [1], write, log() {}, summary() {} }
    await run({ ...base, view: () => ({ state: 'OPEN', comments: [{ body: verdict(TABLE), createdAt: '2026-11-24T09:00:00Z', author: 'no-trbl-2-u', url: URL }] }) })
    await run({ ...base, view: () => ({ state: 'MERGED', comments: [{ body: verdict(TABLE, 'not-pass'), createdAt: '2026-11-24T09:00:00Z', author: 'no-trbl-2-u', url: URL }] }) })
    await run({ ...base, view: () => ({ state: 'MERGED', comments: [{ body: verdict('No findings.'), createdAt: '2026-11-24T09:00:00Z', author: 'no-trbl-2-u', url: URL }] }) })
    assert.equal(wrote, 0)
  })

  it('the workflow step is continue-on-error and runs after a red settle', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/pr-resolve.yml'), 'utf8')
    const step = yml.slice(yml.indexOf('node scripts/pr-file-meds.mjs') - 600, yml.indexOf('node scripts/pr-file-meds.mjs') + 120)
    assert.match(step, /continue-on-error: true/)
    assert.match(step, /if: \$\{\{ !cancelled\(\) && github\.event_name == 'push' \}\}/)
  })

  it('the filing is pipeline code: a change to it is a PR T merges', async () => {
    const { PIPELINE_PATHS } = await import('./pr-policy.mjs')
    assert.ok(PIPELINE_PATHS.includes('scripts/pr-file-meds.mjs'))
  })
})

describe('fileMeds against a real repository', () => {
  const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const env = { GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@e', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@e' }

  function fixture() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-file-meds-'))
    const origin = path.join(dir, 'origin.git')
    const work = path.join(dir, 'work')
    Object.assign(process.env, env)
    git(['init', '-q', '--bare', '-b', 'main', origin], dir)
    git(['clone', '-q', origin, work], dir)
    fs.mkdirSync(path.join(work, 'plan'))
    fs.writeFileSync(path.join(work, 'plan', 'AUDIT.md'), AUDIT)
    git(['add', '.'], work)
    git(['commit', '-q', '-m', 'seed'], work)
    git(['push', '-q', 'origin', 'HEAD:main'], work)
    return { dir, origin, work }
  }

  it('commits the MED rows to main, and a second run files nothing', () => {
    const { dir, work } = fixture()
    try {
      const meds = medRows(verdict(TABLE))
      const r = fileMeds({ root: work, pr: 1750, meds, date: '2026-11-24', url: URL, log() {} })
      assert.equal(r.state, 'filed')
      assert.equal(r.filed.length, 2)
      git(['fetch', '-q', 'origin', 'main'], work)
      const onMain = git(['show', 'origin/main:plan/AUDIT.md'], work)
      assert.match(onMain, /audit-capture\.mjs:96`: The new mercy branch/)
      assert.match(git(['log', '-1', '--format=%s', 'origin/main'], work), /^plan: file PR #1750 review MEDs to AUDIT$/)
      const again = fileMeds({ root: work, pr: 1750, meds, date: '2026-11-24', url: URL, log() {} })
      assert.equal(again.state, 'nothing')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('a push rejected on every try comes back lost after two tries', () => {
    const { dir, origin, work } = fixture()
    try {
      fs.writeFileSync(path.join(origin, 'hooks', 'pre-receive'), '#!/bin/sh\nexit 1\n', { mode: 0o755 })
      const said = []
      const r = fileMeds({ root: work, pr: 1750, meds: medRows(verdict(TABLE)), date: '2026-11-24', url: URL, log: (s) => said.push(s) })
      assert.equal(r.state, 'lost')
      assert.equal(said.filter((s) => /push rejected/.test(s)).length, 2)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
