// scripts/loop-pr.test.mjs — pins the pieces of the loop's PR flow (Phase R11,
// D84-D87) that a later edit could silently lose: the fixer's label, branch,
// same-repo and attempt guards; per-PR job-level concurrency; the PR body
// template's `Closes #` trailer, in the shape close-trailers reads; the union
// merge pr-resolve uses on append-only files; the telemetry step that must
// never push a PR branch's commits to main; and the rule that only T fires
// /plot and /messy, and that /plot lands its phases by a `plot` PR (D93); and
// the `verify-gate` job in pr-review.yml (phase RV1a): same-repo
// `pull_request` only, the only writer of `risk:*`, no merge wiring; and the
// `review` job (phase RV1b; every same-repo PR since D95): after the gate,
// a read-comment-label grant with no Edit, Write, push or merge; and its
// three lenses (phase RV1c): distinct, behind the tier check, 30 minutes.
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
// Code only: YAML `#` and JS `//` comment lines explain the rules by name, and
// a `--disallowedTools` line names what it forbids.
const code = (text) => text.split('\n').filter((l) => !/^\s*(#|\/\/)/.test(l) && !/--disallowedTools/.test(l)).join('\n')
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

test('no workflow but pr-review\'s merge job merges or auto-merges, and none force-pushes (D95)', () => {
  for (const f of fs.readdirSync(path.join(ROOT, WF)).filter((f) => f.endsWith('.yml'))) {
    const text = code(read(`${WF}/${f}`))
    if (f !== 'pr-review.yml') {
      assert.doesNotMatch(text, /gh pr merge/, f)
      assert.doesNotMatch(text, /--auto\b/, f)
    } else {
      // Outside the merge job, pr-review.yml merges nothing either.
      const outside = text.replace(/\n {2}merge:\n[\s\S]*$/, '')
      assert.doesNotMatch(outside, /gh pr merge|--auto\b/, 'pr-review.yml merges only in its merge job')
    }
    assert.doesNotMatch(text, /git push[^\n]*(--force|\s-f\b)/, f)
  }
  assert.doesNotMatch(code(read('scripts/pr-resolve.mjs')), /'--force'|'-f'|'rebase'/)
  // No skill or script but the merge decision writes the merge; the reviewer's skill forbids it.
  for (const f of fs.readdirSync(path.join(ROOT, 'skills')).filter((f) => f.endsWith('.md'))) {
    const blocks = (read(`skills/${f}`).match(/```[\s\S]*?```/g) ?? []).join('\n')
    assert.doesNotMatch(blocks, /gh pr merge/, `skills/${f} never runs gh pr merge in a command block`)
  }
})

// --- pr-review.yml: the always-reporting gate (phase RV1a, A1, A2a) ----------

const review = read(`${WF}/pr-review.yml`)
const job = (text, id) => {
  const rest = text.split(new RegExp(`\\n {2}${id}:\\n`))[1]
  return rest ? rest.split(/\n {2}[a-z][\w-]*:\n/)[0] : null
}

test('pr-review runs on pull_request into main, never pull_request_target', () => {
  assert.doesNotMatch(code(review), /pull_request_target/)
  // No labeled trigger: one run per label cancelled the one before and left a cancelled verify-gate on the head (#667).
  assert.match(review, /^on:\n {2}pull_request:\n {4}branches: \[main\]\n {4}types: \[opened, synchronize, reopened, ready_for_review\]$/m)
  for (const f of fs.readdirSync(path.join(ROOT, WF)).filter((f) => f.endsWith('.yml'))) {
    assert.doesNotMatch(code(read(`${WF}/${f}`)), /pull_request_target/, f)
  }
})

test('verify-gate runs on every same-repo PR, not only loop:pr and plot', () => {
  const gate = job(review, 'verify-gate')
  assert.ok(gate, 'verify-gate job present')
  assert.match(gate, /^ {4}if: github\.event\.pull_request\.head\.repo\.full_name == github\.repository$/m)
  assert.doesNotMatch(gate, /loop:pr|'plot'|labels\.\*\.name/, 'no label filter on the gate')
  assert.match(gate, /\n {4}concurrency:\n {6}group: pr-review-gate-\$\{\{ github\.event\.pull_request\.number \}\}\n {6}cancel-in-progress: true/)
  assert.match(gate, /node scripts\/pr-gate\.mjs classify/)
  // LG1b: the root `npm test` is verify-root's lane, so the gate waits on it instead of running it.
  assert.doesNotMatch(gate, /run: npm test/)
  assert.match(gate, /node scripts\/pr-gate\.mjs wait --pr "\$PR" --head "\$HEAD_SHA"/)
})

test('verify-root runs the root npm test on the paths it owns, on PRs and on main', () => {
  const root = read(`${WF}/verify-root.yml`)
  assert.match(root, /^on:\n {2}push:\n {4}branches: \[main\]\n {4}paths:\n/m)
  assert.match(root, /\n {2}pull_request:\n {4}branches: \[main\]\n {4}paths:\n/)
  assert.match(code(root), /run: npm ci --no-audit --no-fund\n\n {6}- name: Root npm test\n {8}run: npm test/)
})

test('verify-gate labels with the workflow token, so its label starts no run', () => {
  assert.match(job(review, 'verify-gate'), /GH_TOKEN: \$\{\{ github\.token \}\}/)
})

test('verify-gate is the only workflow step that writes a risk:* label', () => {
  const writers = []
  for (const f of fs.readdirSync(path.join(ROOT, WF)).filter((f) => f.endsWith('.yml'))) {
    const text = code(read(`${WF}/${f}`))
    if (/pr-risk\.mjs[^\n]*--apply|--add-label[^\n]*risk:|gh label create[^\n]*risk:/.test(text)) writers.push(f)
  }
  assert.deepEqual(writers, ['pr-review.yml'])
  assert.match(job(review, 'verify-gate'), /node scripts\/pr-risk\.mjs --pr "\$PR" --apply/)
})

// --- pr-review.yml: the merge job (D95, amends D86) ---------------------------

test('the one gh pr merge is --auto, in the merge job, gated on the scripted decision', () => {
  const steps = review.split(/\n\s+- name: /).slice(1)
  const merging = steps.filter((s) => /gh pr merge/.test(code(s)))
  assert.equal(merging.length, 1, 'exactly one merging step')
  const [s] = merging
  assert.match(code(s), /gh pr merge "\$PR" --repo "\$GH_REPO" --auto --merge --match-head-commit "\$HEAD_SHA"/, 'auto, merge commit, pinned to the reviewed head')
  assert.match(s, /\n\s+if: steps\.decide\.outputs\.go == 'true'/, 'gated on the decision')
  assert.match(code(s), /gh pr merge[^\n]*\n[^\n]*gh pr comment "\$PR"[^\n]*pr-merge\.mjs audit/, 'the audit comment follows the merge call, never precedes it')
  const mj = job(review, 'merge')
  assert.ok(mj, 'merge job present')
  assert.match(mj, /- uses: actions\/checkout@v4\n\s+with:\n\s+ref: main\n\s+sparse-checkout: scripts/, 'the merge job runs main\'s scripts, never the PR\'s')
  assert.match(mj, /^ {6}actions: read$/m)
  assert.match(mj, /^ {6}checks: read$/m, 'the decision reads the head check runs')
  assert.match(mj, /^ {4}needs: \[review-wanted, review\]$/m)
  assert.match(mj, /\(needs\.review-wanted\.outputs\.go == 'true' && needs\.review\.result == 'success'\) \|\| needs\.review-wanted\.outputs\.reuse == 'true'/, 'a reused verdict reaches the merge job')
  assert.match(mj, /--digest "\$\{\{ needs\.review-wanted\.outputs\.digest \}\}"/)
  assert.match(mj, /node scripts\/pr-merge\.mjs decide --pr "\$PR" --head "\$HEAD_SHA" --since "\$\{\{ steps\.since\.outputs\.since \}\}" --digest/)
  assert.match(mj, /PR_AUTO_MERGE: \$\{\{ vars\.PR_AUTO_MERGE \}\}/, 'the kill switch is a repository variable')
  assert.match(mj, /id: since\n\s+run: node scripts\/pr-merge\.mjs since --run "\$GITHUB_RUN_ID"/, 'the review-start boundary is the tested script, not inline shell')
  assert.doesNotMatch(mj, /--jq/, 'no inline jq in the merge job')
  assert.match(mj, /REASON: \$\{\{ steps\.decide\.outputs\.reason \}\}/, 'the reason reaches the shell through env, never inline')
  assert.match(mj, /^ {6}contents: write$/m)
  assert.doesNotMatch(mj, /claude-code-action|_claude-skill\.yml/, 'no model in the merge job')
  assert.doesNotMatch(mj, /--admin|--delete-branch|gh api -X (PUT|DELETE|PATCH)/, 'no bypass, no settings edits')
})

test('the fixer is a separate run from the reviewer: writes and pushes once, never comments, labels, merges or force-pushes', () => {
  const fw = job(review, 'fix-wanted')
  assert.ok(fw, 'fix-wanted job present')
  assert.match(fw, /needs\.merge\.result == 'success'/)
  assert.match(fw, /ref: main\n\s+sparse-checkout: scripts/, 'main\'s decision, never the PR\'s')
  assert.match(fw, /node scripts\/pr-review\.mjs fix-wanted --pr "\$PR"/)
  const fx = job(review, 'fix')
  assert.ok(fx, 'fix job present')
  assert.match(fx, /if: always\(\) && needs\.fix-wanted\.outputs\.go == 'true'/)
  assert.match(fx, /git archive origin\/main skills\/review-fix\.md \| tar -x -C \.review-tooling/, 'main\'s copy of the skill')
  assert.match(fx, /prompt: 'Read \.review-tooling\/skills\/review-fix\.md end to end/)
  assert.ok(fx.indexOf('git switch "') < fx.indexOf('git checkout origin/main -- "$p"'), 'switch to the PR branch before laying main\'s config over it')
  assert.match(read('skills/review-fix.md'), /never `-A` or `\.`/)
  const grant = fx.match(/allowed_tools: '([^']+)'/)[1].split(',')
  assert.ok(grant.includes('Edit') && grant.includes('Write'), 'the fixer writes')
  for (const t of grant) assert.doesNotMatch(t, /gh pr (comment|edit|merge|close)|gh api|--force|rebase/, t)
  const deny = fx.match(/--disallowedTools "([^"]+)"/)[1].split(',')
  for (const t of ['Bash(gh pr comment:*)', 'Bash(gh pr edit:*)', 'Bash(gh pr merge:*)', 'Bash(gh pr close:*)', 'Bash(gh api:*)', 'Bash(git push --force:*)', 'Bash(git rebase:*)']) assert.ok(deny.includes(t), `denies ${t}`)
  assert.doesNotMatch(fx, /dangerously-skip-permissions/)
  const skill = read('skills/review-fix.md')
  assert.match(skill, /<!-- pr-review-fix:attempt -->/)
  assert.match(skill, /\*\*Write, never judge\.\*\*/)
  assert.match(skill, /\*\*One commit, one push, no history edits\.\*\*/)
  assert.doesNotMatch((skill.match(/```[\s\S]*?```/g) ?? []).join('\n'), /gh pr (comment|edit|merge|close)/)
})

test('pr-review.mjs never imports pr-merge.mjs: the cycle deadlocked fix-wanted (exit 13 on #679)', async () => {
  assert.doesNotMatch(code(read('scripts/pr-review.mjs')), /pr-merge\.mjs/)
  assert.match(code(read('scripts/pr-review.mjs')), /from '\.\/pr-policy\.mjs'/)
  const { PIPELINE_PATHS, MERGEABLE_STATES } = await import('./pr-policy.mjs')
  assert.ok(PIPELINE_PATHS.includes('scripts/pr-policy.mjs'), 'the policy is pipeline')
  assert.deepEqual([...MERGEABLE_STATES], ['CLEAN', 'UNSTABLE'])
})

test('the merge decision refuses plans, holds, forged markers and a non-CLEAN PR', async () => {
  const { PLAN_LABELS, HOLD_LABELS, mergeWanted } = await import('./pr-merge.mjs')
  assert.deepEqual([...PLAN_LABELS], ['plot'])
  assert.ok(HOLD_LABELS.includes('review:needs-T') && HOLD_LABELS.includes('no-auto-merge'))
  const { headMarker } = await import('./pr-review.mjs')
  const head = 'a'.repeat(40)
  const pass = { body: `<!-- pr-review:verdict pass -->\n${headMarker(head)}`, createdAt: '2026-10-20T01:00:00Z', author: 'no-trbl-2-u' }
  const base = { state: 'OPEN', isDraft: false, isCrossRepository: false, labels: [], title: 't', head, mergeStateStatus: 'CLEAN', checks: [{ name: 'verify-gate', conclusion: 'success', headSha: head }], comments: [pass], since: '2026-10-20T00:00:00Z' }
  assert.equal(mergeWanted(base).go, true, 'the clean case merges')
  assert.equal(mergeWanted({ ...base, comments: [] }).go, false, 'no verdict, no merge')
  for (const l of PLAN_LABELS) assert.match(mergeWanted({ ...base, labels: [l] }).reason, /plan PR/, l)
  assert.match(mergeWanted({ ...base, title: 'plot: x' }).reason, /plan PR/)
  for (const l of HOLD_LABELS) assert.match(mergeWanted({ ...base, labels: [l] }).reason, new RegExp(l.replace(/[-:]/g, '.')), l)
  assert.match(mergeWanted({ ...base, comments: [{ ...pass, author: 'stranger' }] }).reason, /trusted account/, 'a forged marker from another account')
  assert.match(mergeWanted({ ...base, comments: [{ ...pass, createdAt: '2026-10-19T23:00:00Z' }] }).reason, /no verdict/, 'a marker from before this run')
  assert.match(mergeWanted({ ...base, comments: [{ ...pass, body: pass.body.replace(head, 'b'.repeat(40)) }] }).reason, /no verdict/, 'a marker for another head')
  assert.match(mergeWanted({ ...base, mergeStateStatus: 'BLOCKED' }).reason, /BLOCKED/)
  assert.match(mergeWanted({ ...base, checks: [] }).reason, /verify-gate is not green/, 'no gate run on the head')
  assert.match(mergeWanted({ ...base, liveHead: 'b'.repeat(40) }).reason, /head moved/)
  assert.match(mergeWanted({ ...base, killSwitch: true }).reason, /kill switch/)
  assert.match(mergeWanted({ ...base, files: ['skills/review.md'] }).reason, /pipeline PR/, 'the pipeline never merges itself')
})

// --- pr-review.yml: the shadow reviewer (phase RV1b, A5) ------------------------

test('review runs after a green verify-gate, through review-wanted, on every same-repo PR (D95)', () => {
  const wanted = job(review, 'review-wanted')
  assert.ok(wanted, 'review-wanted job present')
  assert.match(wanted, /^ {4}needs: verify-gate$/m)
  assert.match(wanted, /needs\.verify-gate\.result == 'success'/)
  assert.match(wanted, /node scripts\/pr-review\.mjs wanted --pr "\$PR"/)
  assert.match(wanted, /if: steps\.wanted\.outputs\.exhausted == 'true'\n\s+run: gh pr edit "\$PR" --repo "\$GH_REPO" --add-label review:exhausted/, 'the pass cap labels the PR for T')
  const rv = job(review, 'review')
  assert.ok(rv, 'review job present')
  assert.match(rv, /^ {4}needs: review-wanted$/m)
  assert.match(rv, /^ {4}if: always\(\) && needs\.review-wanted\.outputs\.go == 'true'$/m)
  assert.match(rv, /\n {4}concurrency:\n {6}group: pr-review-\$\{\{ needs\.review-wanted\.outputs\.pr \}\}\n {6}cancel-in-progress: true/)
  assert.match(rv, /uses: \.\/\.github\/workflows\/_claude-skill\.yml/)
  assert.match(rv, /prompt: 'Read \.review-tooling\/skills\/review\.md end to end/)
  // Phase RV2: the head and its diff digest reach the reviewer by the prompt, not by a new grant.
  assert.match(wanted, /^ {6}head: \$\{\{ steps\.wanted\.outputs\.head \}\}$/m)
  assert.match(wanted, /^ {6}digest: \$\{\{ steps\.wanted\.outputs\.digest \}\}$/m)
  assert.match(rv, /Head \$\{\{ needs\.review-wanted\.outputs\.head \}\}, diff digest \$\{\{ needs\.review-wanted\.outputs\.digest \|\| ''unavailable'' \}\}/)
  assert.match(rv, /effort: 'high'/)
  assert.match(rv, /timeout_minutes: 40/)
})

test('review-wanted reviews every same-repo PR on pull_request; eval:seed drafts only on dispatch', async () => {
  const { DISPATCH_ONLY_LABELS, reviewWanted } = await import('./pr-review.mjs')
  assert.deepEqual([...DISPATCH_ONLY_LABELS], ['eval:seed'])
  const base = { state: 'OPEN', isDraft: false, isCrossRepository: false, labels: [], head: 'a'.repeat(40), comments: [] }
  assert.equal(reviewWanted(base).go, true, 'no label needed')
  assert.equal(reviewWanted({ ...base, labels: ['eval:seed'] }).go, false)
  assert.match(review, /workflow_dispatch:\n {4}inputs:\n {6}pr:/)
})

test('the reviewer can read, comment and label, and nothing else', () => {
  const rv = job(review, 'review')
  const grant = rv.match(/allowed_tools: '([^']+)'/)[1].split(',')
  for (const t of ['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'Bash']) assert.ok(!grant.includes(t), `no ${t}`)
  for (const t of grant.filter((t) => t.startsWith('Bash('))) {
    assert.match(t, /^Bash\((git (diff|show|log|fetch|rev-parse)|npm test|node --test|node \.review-tooling\/scripts\/pr-review\.mjs parent-tests|node \.review-tooling\/scripts\/pr-partition\.mjs|node \.review-tooling\/scripts\/pr-risk\.mjs|gh pr (view|diff|comment|edit)):\*\)$/, t)
  }
  assert.ok(grant.includes('mcp__github_inline_comment__create_inline_comment'))
  const deny = rv.match(/--disallowedTools "([^"]+)"/)[1].split(',')
  for (const t of ['Edit', 'Write', 'Bash(git push:*)', 'Bash(git commit:*)', 'Bash(gh pr merge:*)', 'Bash(gh pr close:*)', 'Bash(gh api:*)']) {
    assert.ok(deny.includes(t), `denies ${t}`)
  }
  assert.doesNotMatch(rv, /dangerously-skip-permissions/, 'the grant only binds without the bypass flag')
})

test('the reviewer runs main\'s copy of its own instructions', () => {
  const rv = job(review, 'review')
  assert.match(rv, /git fetch --no-tags origin main/)
  // main's skill and scripts go to .review-tooling/; the PR's own scripts/ and tests stay whole (the fifth verdict on #666).
  assert.match(rv, /git archive origin\/main skills\/review\.md scripts \| tar -x -C \.review-tooling/)
  assert.match(rv, /for p in \.claude CLAUDE\.md AGENTS\.md \.mcp\.json; do/)
  assert.doesNotMatch(rv.match(/for p in ([^\n]*); do/)[1], /scripts\/|skills\//, 'no script or skill of the PR is overwritten in place')
  assert.match(rv, /git checkout origin\/main -- "\$p"/)
})

test('skills/review.md writes the markers the ledger and verify-gate read', async () => {
  const skill = read('skills/review.md')
  const { REVIEW_VERDICT } = await import('./eval/ledger-lib.mjs')
  const { RAISE_MARKER } = await import('./pr-risk.mjs')
  assert.match(skill, /^ {3}## Review verdict$/m)
  assert.match(skill, REVIEW_VERDICT)
  assert.match(skill, /<!-- pr-review:verdict not-pass -->/)
  assert.match(skill, new RegExp(RAISE_MARKER.source))
  assert.match(skill, /<!-- pr-review:head <full head SHA> diff <diff digest> -->/)
  assert.match(skill, /`<!-- pr-review:head <full head SHA> -->`/, 'the SHA-only fallback shape')
  const { headMarker } = await import('./pr-review.mjs')
  assert.equal(headMarker('<full head SHA>', '<diff digest>'), '<!-- pr-review:head <full head SHA> diff <diff digest> -->')
  assert.equal(headMarker('<full head SHA>'), '<!-- pr-review:head <full head SHA> -->')
  assert.match(skill, /Never lower a tier/)
  assert.match(skill, /<!-- pr-review:readers <n> overlap <k> -->/, 'the readers marker the replay report reads')
})

// --- the partitioned fan-out (phase RV3, D95) --------------------------------

const lenses = (skill) => Object.fromEntries(
  skill.split(/^### Lens: /m).slice(1).map((part) => [part.split('\n')[0].trim(), part.split(/^### /m)[0]]),
)

test('skills/review.md carries three distinct reader prompts: the assignment reader, Tests and Control', () => {
  const l = lenses(read('skills/review.md'))
  assert.deepEqual(Object.keys(l), ['Assignment logic', 'Assignment seams', 'Tests', 'Control'])
  assert.equal(new Set(Object.values(l)).size, 4, 'no two reader prompts are the same')
  assert.match(l['Assignment logic'], /is the logic in what I own correct\?/)
  assert.match(l['Assignment logic'], /Do not read consumers for breakage; the seams reader does/)
  assert.match(l['Assignment seams'], /what must agree with this change and does\s+not\?/)
  assert.match(l['Assignment seams'], /Do not re-check the logic of the changed lines; the logic reader does/)
  for (const k of ['Assignment logic', 'Assignment seams']) assert.match(l[k], /"do not report" list is\s+another\s+assignment's: leave it out/, k)
  assert.match(l.Tests, /would the tests catch this change being wrong\?/)
  assert.match(l.Tests, /node \.review-tooling\/scripts\/pr-review\.mjs parent-tests --pr <n>/)
  assert.match(l.Control, /what breaks across the seams the\s+partition cut\?/)
  for (const [name, body] of Object.entries(l)) assert.match(body, /^Read only: /m, `${name} has a reading list`)
})

test('the fan-out follows the manifest: one Sonnet reader per assignment, Tests always, Control on medium and high', () => {
  const skill = read('skills/review.md')
  const shape = skill.slice(skill.indexOf('### Step 2 — The manifest decides the shape'), skill.indexOf('### Step 3 '))
  assert.match(shape, /node \.review-tooling\/scripts\/pr-partition\.mjs --pr <n>/)
  assert.match(shape, /\*\*Zero assignments\*\*[^\n]*: one\s+reviewer, you\./)
  assert.match(shape, /the manifest is the shape/)
  const fan = skill.slice(skill.indexOf('### Step 3b'), skill.indexOf('### Lens: Assignment logic'))
  assert.ok(fan.length > 0 && fan.length < 4000, 'the Step 3b slice ends at the first lens heading')
  assert.match(fan, /^### Step 3b — The fan-out \(one or more assignments\)$/m)
  assert.match(fan, /`model: sonnet`/)
  // A -p run ends with the turn: a backgrounded reader never reports (PR #610).
  assert.match(fan, /`run_in_background: false`/)
  assert.match(fan, /never end the turn\s+waiting/)
  assert.match(fan, /each given \*\*only\*\* its own text/)
  assert.match(fan, /\*\*Two per `### Assignment`:\*\*/)
  const skillText = read('skills/review.md')
  assert.match(skillText, /^### Pass cap$/m)
  assert.match(skillText, /at most two automated passes/)
  assert.match(fan, /\*\*The control adversary\*\* \(`risk:medium`, `risk:high` only\)/)
  const merge = skill.slice(skill.indexOf('### Step 3c'), skill.indexOf('### Step 4'))
  for (const tag of ['[a1]', '[tests]', '[control]']) assert.ok(merge.includes(tag), tag)
  assert.match(merge, /reader did not finish/)
  assert.match(merge, /never read as\s+`no findings`/)
  assert.match(merge, /\*\*overlap\*\*/)
})

test('the manifest caps readers by tier and gives every assignment a do-not-report list', async () => {
  const { MAX_AGENTS, partition, buildReverseGraph } = await import('./pr-partition.mjs')
  assert.deepEqual(MAX_AGENTS, { 'risk:low': 2, 'risk:medium': 3, 'risk:high': 6 })
  const { READERS_PER_ASSIGNMENT } = await import('./pr-partition.mjs')
  assert.deepEqual([...READERS_PER_ASSIGNMENT], ['logic', 'seams'])
  const reverse = buildReverseGraph(new Map())
  const changed = ['axiomancer-mechanics/src/Combat/a.ts', 'axiomancer-mobile/state/presenters/b.ts', 'scripts/c.mjs'].map((p) => ({ path: p, additions: 1, deletions: 0 }))
  const sizes = new Map(changed.map((c) => [c.path, 10_000]))
  const m = partition({ changed, tier: 'risk:high', reverse, sizes })
  assert.equal(m.agents.length, 3)
  for (const a of m.agents) assert.equal(a.exclude.length, 2)
  assert.equal(partition({ changed, tier: 'risk:low', reverse, sizes }).agents.length, 2)
})

test('the review job allows 40 minutes for the fan-out and nothing else changes its grant', () => {
  const rv = job(review, 'review')
  assert.match(rv, /^ {6}timeout_minutes: 40$/m)
  assert.doesNotMatch(rv, /Bash\(git (worktree|checkout|-C)/, 'the parent-test worktree is the script\'s, not a grant')
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

test('every loop:pr carries one size label (T, 2026-10-14)', () => {
  for (const f of ['skills/march.md', 'skills/ship-a-phase.md', 'skills/iterate.md']) {
    assert.match(read(f), /--label loop:pr --label "size:<S\|M\|L>"/, f)
  }
  assert.match(read('skills/march.md'), /gh label create "size:/)
  assert.match(read('skills/plan-a-phase.md'), /`Size: S`, `Size: M` or `Size: L`/)
})

test('every loop:pr carries an area label; march defines the area/review scheme (T, 2026-10-14)', () => {
  for (const f of ['skills/march.md', 'skills/ship-a-phase.md', 'skills/iterate.md']) {
    assert.match(read(f), /--label "size:<S\|M\|L>" --label "area:<area>"/, f)
  }
  const march = read('skills/march.md')
  for (const l of ['area:combat', 'area:cards', 'area:ui', 'area:mobile', 'area:ci', 'area:loop',
    'review:rules-change', 'review:plan-only', 'review:needs-T']) {
    assert.match(march, new RegExp(`gh label create[\\s\\S]*${l}:`), l)
  }
})

test('a plot PR carries a size label, size:multi-phase when it splits', () => {
  const plot = read('skills/plot.md')
  assert.match(plot, /--label plot --label "<size:S\|size:M\|size:L\|size:multi-phase>"/)
  assert.match(plot, /`size:multi-phase` for a plot that splits/)
  assert.match(plot, /--label review:plan-only --label "area:/)
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

// --- /plot splits into phases and lands by a `plot` PR (D93) ----------------

test('/plot opens a plot-labelled PR, never loop:pr, never a push to main', () => {
  const plot = read('skills/plot.md')
  assert.match(plot, /gh pr create[^\n]*\n[^\n]*--label plot\b/)
  assert.match(plot, /git switch -c "loop\/plot-/)
  assert.doesNotMatch(plot, /--label loop:pr/)
  assert.doesNotMatch(plot, /git push origin main|push origin HEAD:main/)
})

test('/plot decides the phase split, one tick per phase, every A-ID closed once', () => {
  const plot = read('skills/plot.md')
  assert.match(plot, /each\s+phase must ship as one `\/march`\s+tick/)
  assert.match(plot, /every acceptance ID is closed by\s+exactly one phase/)
  assert.match(read('skills/plan-a-phase.md'), /## Phases/)
})

test('a row pointing at a shared brief section is pickable and built alone', () => {
  assert.match(read('skills/march.md'), /`§ <N>`/)
  assert.match(read('skills/ship-a-phase.md'), /A row pointing at `§ <id>` of a shared brief/)
})

test('pr-resolve keeps plot PRs mergeable too', async () => {
  const { RESOLVE_LABELS } = await import('./pr-resolve.mjs')
  assert.deepEqual([...RESOLVE_LABELS].sort(), ['loop:pr', 'plot'])
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

// --- the visual re-stamp (phase VE1c, A7) -------------------------------------

const restamp = read(`${WF}/_visual-restamp.yml`)

test('the visual re-stamp runs only on same-repo pull_request runs with routes to stamp', () => {
  assert.match(restamp, /^on:\n {2}workflow_call:/m, 'only callable, never its own trigger')
  assert.match(restamp, /github\.event_name == 'pull_request'/)
  assert.match(restamp, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/)
  assert.match(restamp, /inputs\.routes != ''/)
  for (const wf of ['verify-mobile', 'verify-mechanics']) {
    const caller = job(read(`${WF}/${wf}.yml`), 'restamp')
    assert.ok(caller, `${wf} has a restamp job`)
    assert.match(caller, /uses: \.\/\.github\/workflows\/_visual-restamp\.yml/, wf)
    assert.match(caller, /github\.event_name == 'pull_request'/, wf)
    assert.match(caller, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/, wf)
  }
})

test('the visual re-stamp stages and pushes only baseline PNGs, to the PR head, never main', () => {
  const body = code(restamp)
  const adds = body.match(/git add[^\n]*/g) ?? []
  assert.deepEqual(adds, ['git add -- axiomancer-mobile/screenshots/baseline/'])
  assert.match(body, /grep -Ev '\^axiomancer-mobile\/screenshots\/baseline\/\[a-z0-9-\]\+\\\.png\$'/, 'a stray staged path refuses the commit')
  const pushes = body.match(/git push[^\n]*/g) ?? []
  assert.deepEqual(pushes, ['git push origin "HEAD:refs/heads/$HEAD_REF"'])
  assert.match(body, /HEAD_REF: \$\{\{ github\.head_ref \}\}/)
  assert.equal((body.match(/'' \| main\) echo "visual-restamp: refusing/g) ?? []).length, 2, 'commit and push both refuse main')
  assert.match(body, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/, 'commits on the head the run shot, so a moved head rejects the push')
})

test('the visual step is report-only and the re-stamp never turns a verify run red', () => {
  for (const wf of ['verify-mobile', 'verify-mechanics']) {
    const text = read(`${WF}/${wf}.yml`)
    const step = text.split('- name: Visual smoke (report-only)\n')[1]?.split('\n      - name:')[0] ?? ''
    assert.match(step, /continue-on-error: true/, wf)
    assert.match(step, /npm run verify:visual --workspace axiomancer-mobile/, wf)
    assert.match(step, /SMOKE_ROUTES: all/, wf)
    assert.match(text, /name: visual-smoke-\$\{\{ github\.sha \}\}/, wf)
    assert.match(text, /key: smoke-dist-\$\{\{ steps\.stamp\.outputs\.hash \}\}/, `${wf} caches the export on its stamp`)
    assert.match(text, /key: playwright-\$\{\{ runner\.os \}\}-\$\{\{ steps\.stamp\.outputs\.playwright \}\}/, `${wf} caches the browsers on the Playwright version`)
  }
  const steps = restamp.split(/\n {6}- name: /).slice(1)
  assert.equal(steps.length, 5)
  for (const s of steps) assert.match(s, /continue-on-error: true/, s.split('\n')[0])
})
