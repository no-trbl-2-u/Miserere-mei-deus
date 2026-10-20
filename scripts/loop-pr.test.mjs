// scripts/loop-pr.test.mjs — pins the pieces of the loop's PR flow (Phase R11,
// D84-D87) that a later edit could silently lose: the fixer's label, branch,
// same-repo and attempt guards; per-PR job-level concurrency; the PR body
// template's `Closes #` trailer, in the shape close-trailers reads; the union
// merge pr-resolve uses on append-only files; the telemetry step that must
// never push a PR branch's commits to main; and the rule that only T fires
// /plot and /messy.
//
//   node --test scripts/loop-pr.test.mjs

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { parseCloseTrailers } from './loop-issue.mjs'
import { hasMarker, isUnionPath, keepCount, unionMerge } from './pr-resolve.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
// Code only: YAML `#` and JS `//` comment lines explain the rules by name.
const code = (text) => text.split('\n').filter((l) => !/^\s*(#|\/\/)/.test(l)).join('\n')
const WF = '.github/workflows'

// --- pr-autofix.yml --------------------------------------------------------

const autofix = read(`${WF}/pr-autofix.yml`)

test('pr-autofix fires on every verify-* workflow', () => {
  for (const wf of ['verify-mechanics', 'verify-mobile', 'verify-prose', 'verify-drift']) {
    assert.match(autofix, new RegExp(`workflows: \\[[^\\]]*\\b${wf}\\b`), wf)
  }
})

test('pr-autofix only acts on red, non-main, same-repo pull_request runs', () => {
  assert.match(autofix, /workflow_run\.conclusion == 'failure'/)
  assert.match(autofix, /workflow_run\.head_branch != 'main'/)
  assert.match(autofix, /workflow_run\.event == 'pull_request'/)
  assert.match(autofix, /workflow_run\.head_repository\.full_name == github\.repository/)
})

test('pr-autofix only fixes open, same-repo PRs labelled loop:pr and not stuck', () => {
  assert.match(autofix, /--state open/)
  assert.match(autofix, /isCrossRepository == false/)
  assert.match(autofix, /\.name == "loop:pr"/)
  assert.match(autofix, /\.name == "loop:pr-stuck"/)
})

test('pr-autofix stops after two attempts and labels the PR loop:pr-stuck', () => {
  assert.match(autofix, /"\$attempts" -ge 2/)
  assert.match(autofix, /--add-label loop:pr-stuck/)
  assert.match(autofix, /<!-- pr-autofix:attempt -->/)
})

test('pr-autofix concurrency is job-level, per PR, never nexus-loop', () => {
  const top = autofix.split(/\njobs:\n/)[0]
  assert.doesNotMatch(top, /^concurrency:/m, 'no workflow-level group (lesson workflow-level-concurrency)')
  assert.match(autofix, /\n {4}concurrency:\n {6}group: pr-autofix-\$\{\{ needs\.gate\.outputs\.pr \}\}/)
  assert.doesNotMatch(code(autofix), /nexus-loop/)
})

test('pr-autofix runs /fix-ci --branch on Haiku with a 30-minute cap', () => {
  assert.match(autofix, /prompt: '\/fix-ci \$\{\{ needs\.gate\.outputs\.run_id \}\} --branch \$\{\{ needs\.gate\.outputs\.branch \}\}'/)
  assert.match(autofix, /model: 'claude-haiku-5-5'/)
  assert.match(autofix, /timeout_minutes: 30/)
})

// --- pr-resolve.yml --------------------------------------------------------

const resolve = read(`${WF}/pr-resolve.yml`)

test('pr-resolve runs on pushes to main, job-level group, never nexus-loop', () => {
  assert.match(resolve, /push:\n {4}branches: \[main\]/)
  const top = resolve.split(/\njobs:\n/)[0]
  assert.doesNotMatch(top, /^concurrency:/m)
  assert.match(resolve, /\n {4}concurrency:\n {6}group: pr-resolve\n/)
  assert.doesNotMatch(code(resolve), /nexus-loop/)
})

test('pr-resolve hands Claude only Read and Edit, on Haiku', () => {
  assert.match(resolve, /allowed_tools: 'Read,Edit'/)
  assert.match(resolve, /model: 'claude-haiku-5-5'/)
})

// claude-code-action rejects a `push` event ("Unsupported event type:
// push"), so the Claude resolve must never ride the push run: the scan
// dispatches one workflow_dispatch run per conflicted PR (issue #524).
test('pr-resolve runs Claude only on a dispatched run, never on push', () => {
  const resolveJob = resolve.split(/\n {2}resolve:\n/)[1]
  assert.ok(resolveJob, 'resolve job present')
  assert.match(resolveJob, /^ {4}if: github\.event_name == 'workflow_dispatch' && startsWith\(inputs\.branch, 'loop\/'\)$/m)
  assert.match(resolve, /workflow_dispatch:\n {4}inputs:\n {6}branch:/)
  assert.match(resolve, /gh workflow run pr-resolve\.yml[^\n]*\n[^\n]*-f branch="\$branch" -f pr="\$pr"/)
  assert.match(resolve, /^ {2}actions: write$/m)
  assert.doesNotMatch(resolveJob, /needs:/)
})

// --- nothing in the loop merges, auto-merges or force-pushes a PR -----------

test('no workflow merges, auto-merges or force-pushes', () => {
  for (const f of fs.readdirSync(path.join(ROOT, WF)).filter((f) => f.endsWith('.yml'))) {
    const text = code(read(`${WF}/${f}`))
    assert.doesNotMatch(text, /gh pr merge/, f)
    assert.doesNotMatch(text, /--auto\b/, f)
    assert.doesNotMatch(text, /git push[^\n]*(--force|\s-f\b)/, f)
  }
  assert.doesNotMatch(code(read('scripts/pr-resolve.mjs')), /'--force'|'-f'|'rebase'/)
})

// --- the telemetry step never pushes across branches -------------------------

test('stranded telemetry rows push to the branch HEAD is on, never PR commits to main', () => {
  const skill = read(`${WF}/_claude-skill.yml`)
  const step = skill.slice(skill.indexOf('name: Commit stranded telemetry rows'))
  assert.match(step, /branch="\$\(git rev-parse --abbrev-ref HEAD\)"/)
  assert.match(step, /loop\/\*\|"\$\{GITHUB_REF_NAME\}"\) ;;/)
  assert.doesNotMatch(step, /branch="\$\{GITHUB_REF_NAME\}"/, 'lesson cross-branch-telemetry-push')
})

// --- the PR body template ---------------------------------------------------

const march = read('skills/march.md')

test('the PR body template carries its sections in order and ends with Closes #', () => {
  const start = march.indexOf('**Body template**')
  const block = march.slice(start, march.indexOf('```\n', march.indexOf('```markdown', start) + 3) + 4)
  const order = ['## What shipped', '## What T can now do', '## Decisions', '## Acceptance', '## Verify']
  let at = -1
  for (const h of order) {
    const i = block.indexOf(h)
    assert.ok(i > at, `${h} present and in order`)
    at = i
  }
  const lines = block.split('\n').map((l) => l.trim()).filter((l) => l && l !== '```')
  assert.equal(lines.at(-1), 'Closes #<mirror issue>')
})

test('close-trailers reads the template trailer shape', () => {
  const body = ['## What shipped', '- a thing', '', '## Verify', '- `npm test` -> green', '', 'Closes #512'].join('\n')
  assert.deepEqual(parseCloseTrailers(body), [512])
})

test('ship-a-phase and iterate put Closes # in the PR\'s last commit', () => {
  assert.match(read('skills/ship-a-phase.md'), /-m "Closes #<phase-issue-number>"/)
  assert.match(read('skills/iterate.md'), /-m "Closes #<N>"/)
})

test('every loop:pr is opened with the label and against main', () => {
  for (const f of ['skills/march.md', 'skills/ship-a-phase.md', 'skills/iterate.md']) {
    assert.match(read(f), /gh pr create[^\n]*\n?[^\n]*--label loop:pr|gh pr create --repo "\$GH_REPO" --base main/, f)
  }
})

// --- /plot and /messy are only ever fired by T ------------------------------

test('no workflow fires /plot or /messy', () => {
  for (const f of fs.readdirSync(path.join(ROOT, WF)).filter((f) => f.endsWith('.yml'))) {
    const text = read(`${WF}/${f}`)
    assert.doesNotMatch(text, /\/(plot|messy)\b|skills\/(plot|messy)\.md/, f)
  }
})

test('no other skill dispatches /plot or /messy', () => {
  const dispatch = /(Read|Execute|dispatch(es)? (to|into)|run) `?skills\/(plot|messy)\.md|Skill\(\s*['"]?(plot|messy)/i
  for (const f of fs.readdirSync(path.join(ROOT, 'skills')).filter((f) => f.endsWith('.md'))) {
    if (f === 'plot.md' || f === 'messy.md') continue
    assert.doesNotMatch(read(`skills/${f}`), dispatch, f)
  }
})

test('the two intake skills say the loop never fires them', () => {
  for (const f of ['skills/plot.md', 'skills/messy.md']) {
    assert.match(read(f), /Never fired by the loop/, f)
  }
})

// --- pr-resolve's union merge ------------------------------------------------

test('union paths are the append-only files only', () => {
  for (const p of ['telemetry/2026-10-12_abc.md', 'plan/AUDIT.md', 'plan/CRITIQUE.md', 'plan/PHASE_CANDIDATES.md', 'plan/lessons.md']) {
    assert.ok(isUnionPath(p), p)
  }
  for (const p of ['plan/bearings.md', 'skills/march.md', 'axiomancer-mechanics/src/x.ts', 'telemetry/sub/x.md']) {
    assert.ok(!isUnionPath(p), p)
  }
})

test('keepCount: shared adds keep one, edits drop the old form, independent adds both survive', () => {
  assert.equal(keepCount(0, 1, 1), 1) // both added the same row
  assert.equal(keepCount(1, 0, 1), 0) // ours edited (removed) it
  assert.equal(keepCount(0, 1, 0), 1) // ours added
  assert.equal(keepCount(1, 1, 1), 1) // untouched
  assert.equal(keepCount(1, 0, 2), 1) // ours removed one, theirs added one
})

test('unionMerge keeps both sides\' new rows', () => {
  const base = '# Q\n\n- a\n'
  const ours = '# Q\n\n- a\n- ours\n'
  const theirs = '# Q\n\n- a\n- theirs\n'
  const out = unionMerge(base, ours, theirs)
  assert.match(out, /- ours/)
  assert.match(out, /- theirs/)
  assert.equal(out.match(/- a\n/g).length, 1)
})

test('unionMerge does not double a row one side edited (lesson union-edit-doubles)', () => {
  const base = '- [ ] row one\n- [ ] row two\n'
  const ours = '- [x] row one\n- [ ] row two\n'
  const theirs = '- [ ] row one\n- [ ] row two\n- [ ] row three\n'
  const out = unionMerge(base, ours, theirs)
  assert.doesNotMatch(out, /- \[ \] row one/)
  assert.match(out, /- \[x\] row one/)
  assert.match(out, /row three/)
})

test('unionMerge moves a row whole when one side moves it Pending to Done (lesson union-anchor-split)', () => {
  const row = (t) => [`### ${t}`, '- viewport: n/a', '- source: drive', '']
  const base = ['## Pending', '', ...row('A'), ...row('B'), '## Done', '', ...row('[x] Z')].join('\n')
  // ours closes B; theirs closes A. Both rows share the generic body lines.
  const ours = ['## Pending', '', ...row('A'), '## Done', '', ...row('[x] B'), ...row('[x] Z')].join('\n')
  const theirs = ['## Pending', '', ...row('B'), '## Done', '', ...row('[x] A'), ...row('[x] Z')].join('\n')
  const out = unionMerge(base, ours, theirs)
  const [pending, done] = out.split('## Done')
  assert.doesNotMatch(pending, /viewport/, 'no headerless body left in Pending')
  for (const t of ['A', 'B', 'Z']) {
    assert.match(done, new RegExp(`### \\[x\\] ${t}\\n- viewport: n/a\\n- source: drive\\n`), `row ${t} whole`)
  }
  assert.ok(!/\n\n\n/.test(out), 'no blank-line bloat')
})

test('unionMerge keeps telemetry rows in timestamp order', () => {
  const head = '| when (UTC) | event |\n|---|---|\n'
  const base = `${head}| 2026-10-12T01:00Z | a |\n`
  const ours = `${base}| 2026-10-12T03:00Z | c |\n`
  const theirs = `${base}| 2026-10-12T02:00Z | b |\n`
  const rows = unionMerge(base, ours, theirs, { telemetry: true }).split('\n').filter((l) => l.startsWith('| 2026'))
  assert.deepEqual(rows, ['| 2026-10-12T01:00Z | a |', '| 2026-10-12T02:00Z | b |', '| 2026-10-12T03:00Z | c |'])
})

test('hasMarker finds conflict markers and nothing else', () => {
  assert.ok(hasMarker('a\n<<<<<<< HEAD\nb\n=======\nc\n>>>>>>> main\n'))
  assert.ok(!hasMarker('a table\n|===|\n## heading\n'))
})

// --- every closing verb ends with a Retro ------------------------------------

test('ship-a-phase, iterate, critique, fix-ci and plot each run the Retro', () => {
  for (const f of ['ship-a-phase', 'iterate', 'critique', 'fix-ci', 'plot']) {
    assert.match(read(`skills/${f}.md`), /skills\/march\.md` §3 "Retro"/, f)
  }
  assert.match(march, /### Retro\n/)
})
