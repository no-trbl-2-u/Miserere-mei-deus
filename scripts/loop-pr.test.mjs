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
// three lenses (phase RV1c): distinct, behind the tier check, 30 minutes; and
// the plot PR body (What you'll see, Your calls) with claude.yml routing T's
// @claude answers on a plot PR to skills/plot.md §3 (T, 2026-10-25).
//
//   node --test scripts/loop-pr.test.mjs

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { parseCloseTrailers } from './loop-issue.mjs'
import { branchFor, CAP, capState, labelsFor, land } from './loop-land.mjs'
import { hasMarker, isUnionPath, keepCount, MERGE_DRIVERS, registerMergeDrivers, unionMerge } from './pr-resolve.mjs'

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

// NX1a (A2): `--dangerously-skip-permissions` makes Claude Code ignore the
// allow list, so a workflow that pairs the two states a limit it does not
// have. The resolver ran that way until NX1a; it now runs `acceptEdits`.
// A block is a job or a step; the reusable `_claude-skill.yml` carries the
// default grant and its callers add a bypass on purpose, so only an
// explicit list (`allowed_tools:` or `--allowedTools`) counts as a pairing.
// KNOWN_PAIRINGS are the ones not yet fixed; a new one fails, and so does a
// listed one that has been fixed (delete it from the list).
const KNOWN_PAIRINGS = ['claude.yml']
const BYPASS = /--dangerously-skip-permissions|--permission-mode\s+bypassPermissions/
const ALLOW_LIST = /allowed_tools:|--allowedTools/
const pairsAllowListWithBypass = (text) =>
  code(text).split(/\n(?=\s*- name: |  [\w-]+:[ \t]*(?:\n|$))/).some((b) => ALLOW_LIST.test(b) && BYPASS.test(b))

test('no workflow pairs an allow list with a permission bypass (NX1a)', () => {
  const found = fs.readdirSync(path.join(ROOT, WF)).filter((f) => f.endsWith('.yml') && pairsAllowListWithBypass(read(`${WF}/${f}`)))
  assert.deepEqual(found, KNOWN_PAIRINGS)
  assert.equal(pairsAllowListWithBypass(resolve), false, 'pr-resolve runs without a bypass')
  assert.match(resolve, /--permission-mode acceptEdits/)
  // The detector itself.
  const job = (args) => `  job:\n    with:\n      allowed_tools: 'Read'\n      extra_claude_args: |\n        ${args}\n`
  assert.equal(pairsAllowListWithBypass(job('--dangerously-skip-permissions')), true)
  assert.equal(pairsAllowListWithBypass(job('--permission-mode bypassPermissions')), true)
  assert.equal(pairsAllowListWithBypass(job('--permission-mode acceptEdits')), false)
  assert.equal(pairsAllowListWithBypass('      - name: x\n        with:\n          claude_args: |\n            --dangerously-skip-permissions\n            --allowedTools "Read"\n'), true)
  assert.equal(pairsAllowListWithBypass("  a:\n    allowed_tools: 'Read'\n  b:\n    extra_claude_args: --dangerously-skip-permissions\n"), false, 'two jobs, no pairing')
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

test('pr-resolve registers every merge driver .gitattributes names, as the SessionStart hook does', () => {
  const named = [...read('.gitattributes').matchAll(/\bmerge=(\w+)/g)].map((m) => m[1])
  const settings = read('.claude/settings.json')
  for (const key of new Set(named)) {
    const d = MERGE_DRIVERS.find((x) => x.key === key)
    assert.ok(d, `pr-resolve registers merge.${key}`)
    assert.ok(settings.includes(`merge.${key}.driver '${d.driver}'`), `merge.${key}.driver matches the hook`)
  }
  // Registered before the merge it settles, not only in a Claude session.
  assert.match(code(read('scripts/pr-resolve.mjs')), /function mergeMain\(branch, cwd = ROOT, scriptsRoot = null\) \{\n\s*registerMergeDrivers\(cwd, scriptsRoot\)/)
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-resolve-drivers-'))
  execFileSync('git', ['init', '-q'], { cwd: repo })
  registerMergeDrivers(repo)
  for (const d of MERGE_DRIVERS) {
    assert.equal(execFileSync('git', ['config', `merge.${d.key}.driver`], { cwd: repo, encoding: 'utf8' }).trim(), d.driver)
  }
})

test('no workflow but pr-review\'s merge job merges or auto-merges, and none force-pushes (D95)', () => {
  for (const f of fs.readdirSync(path.join(ROOT, WF)).filter((f) => f.endsWith('.yml'))) {
    const text = code(read(`${WF}/${f}`))
    if (f !== 'pr-review.yml') {
      assert.doesNotMatch(text, /gh pr merge/, f)
      assert.doesNotMatch(text, /--auto(?![\w-])/, f) // --auto-submit (EAS) is not gh's --auto
    } else {
      // Outside the merge job, pr-review.yml merges nothing either.
      const outside = text.replace(/\n {2}merge:\n[\s\S]*$/, '')
      assert.doesNotMatch(outside, /gh pr merge|--auto(?![\w-])/, 'pr-review.yml merges only in its merge job')
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
  // always(): the gate needs the judge (LG1f) and still reports when the judge fails.
  assert.match(gate, /^ {4}if: always\(\) && github\.event\.pull_request\.head\.repo\.full_name == github\.repository$/m)
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
  assert.match(mj, /REASON: \$\{\{ steps\.tree\.outputs\.reason \|\| steps\.decide\.outputs\.reason \}\}/, 'the reason reaches the shell through env, never inline')
  assert.match(mj, /^ {6}contents: write$/m)
  assert.doesNotMatch(mj, /claude-code-action|_claude-skill\.yml/, 'no model in the merge job')
  assert.doesNotMatch(mj, /--admin|--delete-branch|gh api -X (PUT|DELETE|PATCH)/, 'no bypass, no settings edits')
})

test('the merge job checks the merged tree after the decision and before the merge, with main\'s scripts only (MD1c)', () => {
  const mj = job(review, 'merge')
  const at = (needle) => {
    const i = mj.indexOf(needle)
    assert.ok(i > 0, `merge job has ${needle}`)
    return i
  }
  const decide = at('id: decide')
  const tree = at('id: tree')
  const merge = at('gh pr merge')
  assert.ok(decide < tree && tree < merge, 'decide, then the tree check, then the merge')
  assert.ok(at('path: tree') < tree, 'the full checkout comes first')
  const checkout = mj.slice(at('path: tree') - 120, tree)
  assert.match(checkout, /ref: main\n\s+path: tree\n\s+fetch-depth: 0/, 'a full checkout of main, beside the sparse one')
  assert.match(mj, /id: tree\n\s+if: steps\.decide\.outputs\.go == 'true'/, 'a hold never reaches the tree check')
  assert.match(mj, /run: node tree\/scripts\/pr-merge\.mjs tree --pr "\$PR" --head "\$HEAD_SHA"/, 'main\'s script, on the tree check')
  assert.match(mj, /if: steps\.decide\.outputs\.go == 'true' && steps\.tree\.outputs\.go == 'true'\n\s+run: \|\n\s+gh pr merge/, 'the merge needs both')
  // The merged tree's plan/ is data for main's lints; no step runs the PR's own lints or tests.
  assert.doesNotMatch(code(mj), /npm (ci|test|run)|node --test|scripts\/check-/, 'no step runs the PR\'s lints')
  const decideOnly = code(read('scripts/pr-merge.mjs')).match(/export function mergeWanted[\s\S]*?\n}\n/)[0]
  assert.doesNotMatch(decideOnly, /tree/i, 'the tree check is not part of the pure decision')
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

// The v1 skills/march.md section 3 (landing, labels, the PR body, the retro) lives in
// skills/march.lanes.md since the nexus v2 cut-over (NX1d), with the v1 ship-a-phase's
// mirror, PR and close steps; the kit's march.md and next.md are kit text.
const march = read('skills/march.lanes.md')

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

test('a shipped chunk and iterate put Closes # in the PR\'s last commit', () => {
  assert.match(read('skills/march.lanes.md'), /-m "Closes #<phase-issue-number>"/)
  assert.match(read('skills/iterate.lanes.md'), /-m "Closes #<N>"/)
})

test('every loop:pr is opened with the label and against main', () => {
  for (const f of ['skills/march.lanes.md', 'skills/iterate.lanes.md']) {
    assert.match(read(f), /gh pr create[^\n]*\n?[^\n]*--label loop:pr|gh pr create --repo "\$GH_REPO" --base main/, f)
  }
})

test('every loop:pr carries one size label (T, 2026-10-14)', () => {
  for (const f of ['skills/march.lanes.md', 'skills/iterate.lanes.md']) {
    assert.match(read(f), /--label loop:pr --label "size:<S\|M\|L>"/, f)
  }
  assert.match(read('skills/march.lanes.md'), /gh label create "size:/)
  assert.match(read('skills/plan-a-spec.md'), /S \(about an hour\), M \(a few hours\) or L/)
})

test('every loop:pr carries an area label; march defines the area/review scheme (T, 2026-10-14)', () => {
  for (const f of ['skills/march.lanes.md', 'skills/iterate.lanes.md']) {
    assert.match(read(f), /--label "size:<S\|M\|L>" --label "area:<area>"/, f)
  }
  const march = read('skills/march.lanes.md')
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

// --- v2's land step, Miserere's PRs (phase NX1e) ----------------------------

// A scratch repo plays origin; a fake gh records what land asks of GitHub. The PR comes
// from loop/next-<chunk> with loop:pr, one size, the areas and any review label; an open
// loop:pr PR counts toward the cap whatever its branch; the claim passes to the PR.
function landRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-land-'))
  const origin = path.join(dir, 'origin.git')
  const work = path.join(dir, 'work')
  const g = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim()
  g(dir, 'init', '-q', '--bare', '-b', 'main', origin)
  g(dir, 'clone', '-q', origin, work)
  for (const [k, v] of [['user.email', 't@example.com'], ['user.name', 't']]) g(work, 'config', k, v)
  g(work, 'switch', '-q', '-c', 'main')
  fs.writeFileSync(path.join(work, 'a.txt'), 'a\n')
  g(work, 'add', '-A')
  g(work, 'commit', '-q', '-m', 'init')
  g(work, 'push', '-q', '-u', 'origin', 'main')
  g(work, 'switch', '-q', '-c', 'loop/next-07.1')
  fs.mkdirSync(path.join(work, 'plan/pending'), { recursive: true })
  fs.writeFileSync(path.join(work, 'plan/pending/07.1.md'), '---\nclose: 07.1\ndate: 2026-11-01\nsays: Search works\n---\n')
  g(work, 'add', '-A')
  g(work, 'commit', '-q', '-m', 'plan: close 07.1')
  return { dir, work, g }
}

function fakeGh(open = []) {
  const calls = []
  const gh = (args) => {
    calls.push(args)
    if (args[0] === 'pr' && args[1] === 'list' && args.includes('--head')) return JSON.stringify(open.filter((p) => p.headRefName === args[args.indexOf('--head') + 1]))
    if (args[0] === 'pr' && args[1] === 'list') return JSON.stringify(open)
    if (args[0] === 'pr' && args[1] === 'create') return 'https://github.com/o/r/pull/77\n'
    throw new Error(`unexpected gh ${args.join(' ')}`)
  }
  return { gh, calls }
}

const LAND = { verb: 'next', slug: '07.1', size: 'M', areas: ['loop', 'ci'], reviews: ['rules-change'], title: 'feat: search works (XY1a)', bodyFile: 'body.md', chunk: '07.1' }

test('land: the PR comes from loop/next-<chunk> with loop:pr, size, area and review labels; the claim passes to it', () => {
  const { dir, work, g } = landRepo()
  try {
    const { gh, calls } = fakeGh([{ number: 5, labels: [{ name: 'plot' }], headRefName: 'loop/plot-x' }])
    const claimed = []
    const logs = []
    const r = land(LAND, { git: (a) => g(work, ...a), gh, claims: (a) => claimed.push(a), log: (s) => logs.push(s) })
    assert.equal(r.state, 'opened')
    assert.equal(r.number, 77)
    assert.equal(g(work, 'ls-remote', '--heads', 'origin', 'loop/next-07.1').split('\t')[0], g(work, 'rev-parse', 'HEAD'), 'the branch is on origin')
    const create = calls.find((c) => c[1] === 'create')
    assert.deepEqual(create.slice(0, 6), ['pr', 'create', '--base', 'main', '--head', 'loop/next-07.1'])
    const labels = create.flatMap((x, i) => (x === '--label' ? [create[i + 1]] : []))
    assert.deepEqual(labels, ['loop:pr', 'size:M', 'area:loop', 'area:ci', 'review:rules-change'])
    assert.deepEqual(claimed, [['pr', '07.1', '77']])
    assert.match(logs.join('\n'), /T merges it/, 'a review:rules-change PR waits for T')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('land: the cap counts every open loop:pr PR, loop/next-* included, and stops the sixth', () => {
  const pr = (n, branch, labels = ['loop:pr']) => ({ number: n, headRefName: branch, labels: labels.map((name) => ({ name })) })
  const open = [pr(1, 'loop/ship-A1'), pr(2, 'loop/next-03.2'), pr(3, 'loop/iterate-x'), pr(4, 'loop/next-04.1'), pr(5, 'loop/plot-y', ['plot']), pr(6, 'loop/fix-z')]
  assert.deepEqual(capState(open), { count: 5, atCap: true, numbers: [1, 2, 3, 4, 6] })
  assert.equal(capState(open.slice(0, 4)).atCap, false)
  assert.equal(CAP, 5)
  const { dir, work, g } = landRepo()
  try {
    const { gh, calls } = fakeGh(open)
    const r = land(LAND, { git: (a) => g(work, ...a), gh })
    assert.equal(r.state, 'capped')
    assert.deepEqual(r.numbers, [1, 2, 3, 4, 6])
    assert.ok(!calls.some((c) => c[1] === 'create'), 'no PR opened at the cap')
    assert.equal(g(work, 'ls-remote', '--heads', 'origin', 'loop/next-07.1'), '', 'nothing pushed at the cap')
    assert.equal(land({ ...LAND, overCap: true }, { git: (a) => g(work, ...a), gh }).state, 'opened', "T's word goes past it")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('land: an open PR for the branch is pushed to, never doubled; the wrong branch or label is refused', () => {
  const { dir, work, g } = landRepo()
  try {
    const { gh, calls } = fakeGh([{ number: 9, headRefName: 'loop/next-07.1', labels: [{ name: 'loop:pr' }] }])
    assert.deepEqual(land(LAND, { git: (a) => g(work, ...a), gh }), { state: 'pushed', branch: 'loop/next-07.1', labels: ['loop:pr', 'size:M', 'area:loop', 'area:ci', 'review:rules-change'], number: 9 })
    assert.ok(!calls.some((c) => c[1] === 'create'))
    assert.throws(() => land({ ...LAND, slug: '07.2' }, { git: (a) => g(work, ...a), gh }), /HEAD is on loop\/next-07\.1; the PR comes from loop\/next-07\.2/)
    assert.throws(() => labelsFor({ size: 'XL', areas: ['loop'] }), /size "XL"/)
    assert.throws(() => labelsFor({ size: 'S', areas: [] }), /at least one --area/)
    assert.throws(() => labelsFor({ size: 'S', areas: ['art'] }), /area "art"/)
    assert.equal(branchFor('next', '133.5'), 'loop/next-133.5')
    assert.throws(() => branchFor('next', '../main'))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('land: an older claims module without `pr` releases the claim instead', () => {
  const { dir, work, g } = landRepo()
  try {
    const { gh } = fakeGh()
    const claimed = []
    land({ ...LAND, owner: 'heads-down:1' }, { git: (a) => g(work, ...a), gh, claims: (a) => { claimed.push(a); if (a[0] === 'pr') throw new Error('usage') } })
    assert.deepEqual(claimed, [['pr', '07.1', '77'], ['release', '07.1', '--owner', 'heads-down:1']])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('the land step names Miserere\'s landing in a marked local block; kit text stays above it', () => {
  const land = read('skills/next/land.md').replace(/\r\n/g, '\n')
  const block = land.slice(land.indexOf('<!-- miserere:local'), land.indexOf('<!-- /miserere:local -->'))
  assert.ok(block.length > 0, 'the local block is marked')
  for (const want of ['loop/next-<id>', 'scripts/loop-land.mjs', 'loop:pr', 'pr-merge.mjs settle', 'plot', 'review:rules-change', 'nexus-sync', 'skills/march.lanes.md']) {
    assert.ok(block.includes(want), `the local block names ${want}`)
  }
  assert.match(land, /^## 4\. Contributor: land as a pull request$/m, 'the kit section stays')
  const notes = read('skills/march.lanes.md')
  const landing = notes.slice(notes.indexOf('### Landing a change'), notes.indexOf('### Retro'))
  assert.match(landing, /plan\/pending\//)
  assert.doesNotMatch(landing, /commit and `git push\s+origin main` as before/, 'D84 path split is gone (D119)')
})

// --- /plot and /messy are only ever fired by T ------------------------------

// The one exception: claude.yml's route step, which runs only on T's own
// @claude comment on a plot PR (T answering its calls, 2026-10-25). T fires it.
const routeStep = (text) => text.slice(text.indexOf("- name: Route T's answers on a plot PR"), text.indexOf('- name: Run Claude Code'))

test('no workflow fires /plot, /messy, /lane-creator, /pilot or /heads-down', () => {
  for (const f of fs.readdirSync(path.join(ROOT, WF)).filter((f) => f.endsWith('.yml'))) {
    let text = read(`${WF}/${f}`)
    if (f === 'claude.yml') text = text.replace(routeStep(text), '')
    assert.doesNotMatch(text, /\/(plot|messy|lane-creator|pilot|heads-down)\b|skills\/(plot|messy|pilot|heads-down)\.md|pilot-waves/, f)
  }
})

test('no other skill dispatches /plot or /messy', () => {
  const dispatch = /(Read|Execute|dispatch(es)? (to|into)|run) `?skills\/(plot|messy)\.md|Skill\(\s*['"]?(plot|messy)/i
  for (const f of fs.readdirSync(path.join(ROOT, 'skills')).filter((f) => f.endsWith('.md'))) {
    if (f === 'plot.md' || f === 'messy.md') continue
    assert.doesNotMatch(read(`skills/${f}`), dispatch, f)
  }
})

// --- /pitch is only ever fired by T (NX1b) ----------------------------------

test('no workflow fires /pitch', () => {
  for (const f of fs.readdirSync(path.join(ROOT, WF)).filter((f) => f.endsWith('.yml'))) {
    assert.doesNotMatch(read(`${WF}/${f}`), /\/pitch\b|skills\/pitch\b/, f)
  }
})

test('no loop skill or command fires /pitch', () => {
  const fires = /\/pitch\b|skills\/pitch\b|Skill\(\s*['"]?pitch/i
  for (const f of fs.readdirSync(path.join(ROOT, 'skills')).filter((f) => f.endsWith('.md'))) {
    assert.doesNotMatch(read(`skills/${f}`), fires, f)
  }
  for (const f of fs.readdirSync(path.join(ROOT, '.claude/commands')).filter((f) => f.endsWith('.md'))) {
    assert.doesNotMatch(read(`.claude/commands/${f}`), fires, f)
  }
})

test('/pitch lives in the repo, picks the game-design lens and never fires from a loop', () => {
  const skill = read('.claude/skills/pitch/SKILL.md')
  assert.match(skill, /^---\nname: pitch\n/)
  assert.match(skill, /Never fired by a loop, workflow or another skill/)
  for (const f of ['config.md', 'references.md', 'replays.md', 'lenses/game-design.md']) {
    assert.ok(fs.existsSync(path.join(ROOT, '.claude/skills/pitch', f)), f)
  }
  const cfg = read('.claude/pitch.md')
  assert.match(cfg, /^lens: game-design$/m)
  assert.match(cfg, /^pitch_dir: braindump\/$/m)
  assert.match(read('AGENTS.md'), /`AskUserQuestion` only in `\/oversight`[\s\S]{0,200}`\/pitch`/)
})

test('the two intake skills and /pilot say the loop never fires them', () => {
  for (const f of ['skills/plot.md', 'skills/messy.md', 'skills/pilot.md']) {
    assert.match(read(f), /Never fired by the loop/, f)
  }
})

// --- /pilot: T's attended parallel orchestrator (NX1g, R5) ------------------

test('no other skill dispatches /pilot, and it has a doorway', () => {
  const dispatch = /(Read|Execute|dispatch(es)? (to|into)|run) `?skills\/pilot\.md|Skill\(\s*['"]?pilot/i
  for (const f of fs.readdirSync(path.join(ROOT, 'skills')).filter((f) => f.endsWith('.md'))) {
    if (f === 'pilot.md') continue
    assert.doesNotMatch(read(`skills/${f}`), dispatch, f)
  }
  for (const f of fs.readdirSync(path.join(ROOT, '.claude/commands')).filter((f) => f.endsWith('.md'))) {
    if (f === 'pilot.md') continue
    assert.doesNotMatch(read(`.claude/commands/${f}`), /\/pilot\b|skills\/pilot\.md/, f)
  }
  const door = read('.claude/commands/pilot.md')
  assert.match(door, /^---\ndescription: /)
  assert.match(door, /skills\/pilot\.md/)
  assert.match(door, /- `peek \[<scope>\]` → [^\n]*launch nothing/)
  assert.match(door, /- `resume` →/)
  assert.match(door, /Argument: \$ARGUMENTS/)
})

test("/heads-down is the kit's, stock; ours is retired into /pilot", () => {
  const hd = read('skills/heads-down.md')
  assert.match(hd, /^# Skill: heads-down \(nexus\)$/m)
  assert.match(hd, /loop `\/next` through/)
  assert.doesNotMatch(hd, /ship-a-phase|heads-down-ledger|Miserere/)
  assert.doesNotMatch(read('.claude/commands/heads-down.md'), /ship-a-phase|heads-down-ledger/)
})

test('/pilot workers run /next per chunk, never /march, and waves wait on merges', () => {
  const p = read('skills/pilot.md')
  assert.match(p, /`\/next <id>`/)
  assert.match(p, /Never `\/march`/)
  assert.match(p, /\*\*merged on\s+`main`\*\*/)
  assert.match(p, /The orchestrator never builds/)
  assert.match(p, /\*\*push once\*\*/)
  assert.match(p, /`loop\/next-<id>`/)
})

test('/pilot peek prints the waves from the chunks\' needs and launches nothing', () => {
  const p = read('skills/pilot.md')
  assert.match(p, /`peek` launches nothing, claims nothing and writes no ledger/)
  assert.match(p, /node scripts\/pilot-waves\.mjs <scope>/)
  assert.ok(fs.existsSync(path.join(ROOT, 'scripts/pilot-waves.mjs')))
  assert.doesNotMatch(read('scripts/pilot-waves.mjs'), /claims\.mjs (claim|renew|release)|ledger\.mjs beat|writeFileSync|spawn\(/)
})

test('/pilot UI workers show before/after shots in the PR body, never in the repo', () => {
  const p = read('skills/pilot.md')
  assert.match(p, /^SHOTS: /m)
  assert.match(p, /UI shots live in the PR description, never in the repo/)
  assert.match(p, /\/tmp\/pr-shots\//)
  assert.match(p, /gh release upload pr-shots/)
  assert.match(p, /user-attachments\/assets/)
  assert.match(p, /## Screenshots/)
})

test('/pilot asks every question at a gate before the launch', () => {
  const p = read('skills/pilot.md')
  const gate = p.indexOf('### Step 3 — The question gate')
  const launch = p.indexOf('### Step 4 — Open the ledger, claim the wave, launch it')
  assert.ok(gate > 0 && launch > gate, 'the question gate precedes the launch')
  const body = p.slice(gate, launch)
  assert.match(body, /\[T to confirm #n\]/)
  assert.match(body, /## Your calls/)
  assert.match(body, /plan\/NEEDS_T\.md/)
  assert.match(body, /## Open questions/)
  assert.match(body, /at most four\s+questions/)
  assert.match(body, /before the first launch/)
  assert.match(body, /T's answers/)
  assert.match(body, /calls\s+worker/)
  assert.match(body, /progress\.mjs/)
})

test('/pilot workers never ask T and report DEFAULTS and PARKED lines', () => {
  const p = read('skills/pilot.md')
  assert.match(p, /\*\*the park rule\*\*: never ask T/)
  assert.match(p, /^DEFAULTS:\n- <call> \| took: <option> \| why: <reason>$/m)
  assert.match(p, /^PARKED:\n- q: <whole question> \| alts: <a; b> \| default taken: <x> \| why: <reason>$/m)
  assert.match(p, /^CALLOUTS:\n- footgun: /m)
  assert.match(p, /neither a `DEFAULTS:` nor a `PARKED:` line goes back/)
})

test('/pilot end gate asks the parked questions and routes contradicting answers', () => {
  const p = read('skills/pilot.md')
  const end = p.slice(p.indexOf('### Step 8 — The end gate'), p.indexOf('### Resume'))
  assert.match(end, /every parked question of the run/)
  assert.match(end, /`SendMessage`/)
  assert.match(end, /follow-up commit[^.]*after the review\s+verdict/)
  assert.match(end, /push-once rule holds/)
  assert.match(end, /`\/plot`/)
  assert.match(end, /every default taken/)
  assert.match(end, /node scripts\/claims\.mjs release <chunk>/)
  assert.match(end, /node scripts\/ledger\.mjs end/)
  assert.match(p, /\*\*Questions only at the two gates\.\*\*/)
})

test('/pilot claims each wave before launching, renews, and never releases on a crash', () => {
  const p = read('skills/pilot.md')
  const launch = p.slice(p.indexOf('### Step 4 — Open the ledger'), p.indexOf('### Step 5 — The callout bus'))
  const ledger = launch.indexOf('node scripts/ledger.mjs beat --step gate --set kind=pilot')
  const claim = launch.indexOf('node scripts/claims.mjs claim <chunk>')
  const spawn = launch.indexOf('**Then launch**: one background subagent')
  assert.ok(ledger > 0 && claim > ledger && spawn > claim, 'ledger, then claim, then launch')
  assert.match(launch, /Drop those chunks from the wave/i)
  assert.match(launch, /\*\*the claim session\*\*: `NEXUS_SESSION=<claims id>`/)
  assert.match(launch, /keeps that owner to its end/)
  const react = p.slice(p.indexOf('### Step 6'), p.indexOf('### Step 7'))
  assert.match(react, /Renew at every worker report and every wave start/)
  assert.match(react, /node scripts\/claims\.mjs renew/)
  assert.match(p, /\*\*A crash never releases claims\.\*\*/)
})

test('/pilot keeps the kit ledger in the primary checkout and beats it; the old one is a shim', () => {
  const p = read('skills/pilot.md')
  assert.match(p, /untracked `\.nexus\/sessions\/<session id>\.json` in the \*\*primary\s+checkout\*\*/)
  assert.match(p, /\*\*Beat it at every step\*\*/)
  assert.match(p, /--set-file workers\.<chunk>\.prompt=<file>/)
  assert.match(read('.gitignore'), /^\.nexus\/$/m)
  assert.match(read('scripts/heads-down-ledger.mjs'), /RETIRED \(phase NX1g\)\. A thin shim\./)
})

test('/pilot resume takes the ledger and relaunches dead workers', () => {
  const p = read('skills/pilot.md')
  assert.match(p, /^\/pilot resume /m)
  const resume = p.slice(p.indexOf('### Resume'), p.indexOf('## 3. Hard rules'))
  assert.match(resume, /node scripts\/ledger\.mjs\s+take <star \| id>/)
  assert.match(resume, /`\/reboot-resume`/)
  assert.match(resume, /git ls-remote --heads origin <branch>/)
  assert.match(resume, /gh pr list --head\s+<branch>/)
  assert.match(resume, /`fix-ci --branch`/)
  assert.match(resume, /relaunch it from its saved prompt/)
  assert.match(resume, /first\s+unfinished wave/)
  assert.match(p, /run `\/pilot resume`/)
})

test('/pilot says which parts came from nexus /heads-down and which are ours', () => {
  const p = read('skills/pilot.md')
  const map = p.slice(p.indexOf('## 6. Where each part comes from'))
  assert.match(map, /^\| Part of `\/pilot` \| From \| nexus `\/heads-down` section it tracks \|$/m)
  assert.ok((map.match(/^\| [^|]+ \| nexus \|/gm) ?? []).length >= 5, 'nexus rows')
  assert.ok((map.match(/^\| [^|]+ \| ours/gm) ?? []).length >= 5, 'ours rows')
  const lock = /^ref: ([0-9a-f]{7})/m.exec(read('plan/nexus.lock'))[1]
  assert.match(map, new RegExp('`' + lock + '`'), 'the kit ref the rows were matched to')
})

// --- /plot splits into phases and lands by a `plot` PR (D93) ----------------

test('/plot opens a plot-labelled PR, never loop:pr, never a push to main', () => {
  const plot = read('skills/plot.md')
  assert.match(plot, /gh pr create[^\n]*\n[^\n]*--label plot\b/)
  assert.match(plot, /git switch -c "loop\/plot-/)
  assert.doesNotMatch(plot, /--label loop:pr/)
  assert.doesNotMatch(plot, /git push origin main|push origin HEAD:main/)
})

// Since the nexus v2 cut-over (NX1d) a plot writes a spec chunked S, M or L with every
// A-ID covered, plan-check gates that shape in the root gate, and /next builds one
// chunk per run.
test('/plot chunks the task S, M or L, every A-ID covered; plan-check gates the shape', () => {
  assert.match(read('skills/plan-a-spec.md'), /S \(about an hour\), M \(a few hours\) or L/)
  assert.match(read('scripts/plan-check.mjs'), /is closed or partialed by no chunk/)
  assert.match(read('package.json'), /node scripts\/plan-check\.mjs/)
})

test('a chunk is built alone: one chunk per /next run', () => {
  assert.match(read("skills/next.md"), /one chunk, done fully/i)
})

// --- a plot PR reads for T, and T answers its calls by comment (2026-10-25) ---

test("the plot body opens with What you'll see, then Your calls, then the engineering sections", () => {
  const plot = read('skills/plot.md')
  const start = plot.indexOf('```markdown', plot.indexOf('### 7.3 The PR body'))
  const block = plot.slice(start, plot.indexOf('\n```\n', start + 3))
  const heads = block.split('\n').filter((l) => l.startsWith('## '))
  assert.deepEqual(heads.slice(0, 2), ["## What you'll see", '## Your calls'])
  for (const h of ['## The task', '## Recommendation', '## Slot', '## After merge']) assert.ok(heads.includes(h), h)
  assert.doesNotMatch(block, /## To confirm/)
  assert.match(block, /\| Today \| After this ships \|/)
  assert.match(block, /^Cost: /m)
  assert.match(block, /1\. <[^>]+>\? Default: <[^>]+>\. Or: /)
  assert.match(block, /@claude 1: yes, 2: /)
  assert.match(plot, /no\s+file paths, chunk or acceptance IDs, D-numbers/)
  assert.match(plot, /mark it `\[T to confirm #n\]`/)
})

test("plot.md carries the Answering T's calls procedure, and merge means agreement", () => {
  const plot = read('skills/plot.md')
  const from = plot.indexOf("### 7.4 Answering T's calls")
  const to = plot.indexOf('### 7.5 Merge means agreement')
  assert.ok(from > 0 && to > from + 200, 'section 7.4 exists before section 7.5')
  const ans = plot.slice(from, to)
  for (const re of [/Parse the answers/, /`Confirmed by T \(<YYYY-MM-DD>\): <answer/, /Regenerate the PR body/,
    /check-deadlines|deadline lint/, /never force/, /reply on\s+the PR/, /rewrite the spec to match/]) {
    assert.match(ans, re)
  }
  assert.match(plot, /a call\s+still unanswered at merge is its default,\s+accepted/)
  assert.match(read('AGENTS.md'), /Rewrite each `\[T to confirm #n\]` still in the brief to `Accepted at\s+merge \(default\)`/)
  assert.match(plot, /It does not\s+hold the chunk/)
})

test("claude.yml routes T's comment on a plot PR to plot.md section 3, and changes nothing else", () => {
  const wf = read(`${WF}/claude.yml`)
  const step = routeStep(wf)
  assert.match(step, /id: route/)
  assert.match(step, /contains\(github\.event\.issue\.labels\.\*\.name, 'plot'\)/)
  assert.match(step, /contains\(github\.event\.pull_request\.labels\.\*\.name, 'plot'\)/)
  assert.match(step, /github\.event\.sender\.login == github\.repository_owner/)
  assert.match(step, /--append-system-prompt[^\n]*skills\/plot\.md[^\n]*Answering T's calls/)
  assert.match(step, /echo "args=" >> "\$GITHUB_OUTPUT"/, 'every other comment gets no extra argument')
  assert.doesNotMatch(step, /messy/)
  assert.match(wf, /claude_args: \|[\s\S]*\$\{\{ steps\.route\.outputs\.args \}\}/)
})

test('pr-resolve keeps plot PRs mergeable too', async () => {
  const { RESOLVE_LABELS } = await import('./pr-resolve.mjs')
  assert.deepEqual([...RESOLVE_LABELS].sort(), ['loop:pr', 'plot'])
})

// --- pr-resolve's union merge ------------------------------------------------

test('union paths are the append-only files only', () => {
  for (const p of ['telemetry/2026-10-12_abc.md', 'plan/AUDIT.md', 'plan/CRITIQUE.md', 'plan/CANDIDATES.md', 'plan/lessons.md']) {
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

test('a shipped chunk, iterate, critique, fix-ci and plot each run the Retro', () => {
  for (const f of ['march.lanes', 'iterate.lanes', 'critique', 'fix-ci', 'plot']) {
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

// --- pr-review.yml: report-only mutation on changed lines (phase LG1g, A7) ---

test('the mutation job never fails a check and runs Stryker with no token in reach', () => {
  const mutation = job(review, 'mutation')
  assert.ok(mutation, 'mutation job present')
  assert.match(mutation, /^ {4}if: github\.event_name == 'pull_request' && github\.event\.pull_request\.head\.repo\.full_name == github\.repository$/m)
  assert.doesNotMatch(mutation, /\n {4}needs:/, 'it waits on nothing')
  assert.doesNotMatch(code(review), /needs: \[?[^\n]*\bmutation\b/, 'nothing waits on it')
  assert.match(mutation, /persist-credentials: false/)
  assert.match(mutation, /node scripts\/eval\/mutation-pr\.mjs run [^\n]*\n[^\n]*--budget 900/)
  const steps = mutation.split(/\n {6}- name: /).slice(1)
  for (const s of steps.slice(2)) assert.match(s, /continue-on-error: true/, s.split('\n')[0])
  const withToken = steps.filter((s) => /GH_TOKEN/.test(s))
  assert.deepEqual(withToken.map((s) => s.split('\n')[0]), ['Post the score and survivors'])
})

// --- the weekly nexus sync: one PR only T merges (phase NX1h, A12) ------------

const sync = read(`${WF}/nexus-sync.yml`).replace(/\r\n/g, '\n')

test('nexus-sync runs the CLI weekly (Mondays 14:00 UTC) and by hand, with --pr --no-assist, on GH_PAT || github.token', () => {
  assert.match(sync, /schedule:\n\s+- cron: '0 14 \* \* 1'\n\s+workflow_dispatch:/)
  assert.match(code(sync), /npx --yes @usenexus\/cli@latest upgrade --pr --no-assist --json/)
  assert.match(code(sync), /GH_TOKEN: \$\{\{ secrets\.GH_PAT \|\| github\.token \}\}/)
  assert.match(sync, /concurrency:\n\s+group: nexus-sync\n\s+cancel-in-progress: false/, 'its own group, never nexus-loop')
  assert.match(code(sync), /node scripts\/nexus-sync-body\.mjs --report/, 'the body is written by the body script')
})

test('nexus-sync labels its PR nexus-sync, never loop:pr, and merges nothing', () => {
  assert.match(code(sync), /gh pr edit "\$PR" --body-file "\$RUNNER_TEMP\/body\.md" --add-label nexus-sync/)
  assert.doesNotMatch(code(sync), /loop:pr|gh pr merge|--auto(?![\w-])|git push/)
})

test('the merge decision holds a nexus-sync PR: the label, the CLI\'s head branch or its title', async () => {
  const { SYNC_HEAD, SYNC_LABEL, SYNC_TITLE, mergeWanted } = await import('./pr-merge.mjs')
  assert.equal(SYNC_LABEL, 'nexus-sync')
  const { headMarker } = await import('./pr-review.mjs')
  const head = 'c'.repeat(40)
  const pass = { body: `<!-- pr-review:verdict pass -->\n${headMarker(head)}`, createdAt: '2026-11-02T01:00:00Z', author: 'no-trbl-2-u' }
  const base = { state: 'OPEN', isDraft: false, isCrossRepository: false, labels: [], title: 't', headRefName: 'loop/next-NX1h', head, mergeStateStatus: 'CLEAN', checks: [{ name: 'verify-gate', conclusion: 'success', headSha: head }], comments: [pass], since: '2026-11-02T00:00:00Z' }
  assert.equal(mergeWanted(base).go, true)
  assert.match(mergeWanted({ ...base, labels: ['nexus-sync'] }).reason, /only T merges a nexus sync/)
  assert.match(mergeWanted({ ...base, headRefName: 'nexus/upgrade-2.1.0' }).reason, /only T merges a nexus sync/)
  assert.match(mergeWanted({ ...base, title: 'plan: sync to nexus 2.1.0' }).reason, /only T merges a nexus sync/)
  assert.ok(SYNC_HEAD.test('nexus/upgrade-v2') && SYNC_TITLE.test('plan: sync to nexus 2.1.0'))
  // The merge job reads the head branch, so the hold works before the label lands.
  assert.match(read('scripts/pr-merge.mjs'), /headRefName: view\.headRefName/)
})

test('nothing else merges a nexus-sync PR: pr-autofix and pr-resolve act on loop:pr and plot only; no skill or command runs a merge', async () => {
  const { RESOLVE_LABELS } = await import('./pr-resolve.mjs')
  assert.ok(!RESOLVE_LABELS.includes('nexus-sync'), 'pr-resolve never picks it up')
  assert.match(code(autofix), /\.name == "loop:pr"/, 'pr-autofix fixes loop:pr PRs only')
  for (const dir of ['skills', 'skills/next', '.claude/commands']) {
    for (const f of fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.md'))) {
      const blocks = (read(`${dir}/${f}`).match(/```[\s\S]*?```/g) ?? []).join('\n')
      assert.doesNotMatch(blocks, /gh pr merge|--auto(?![\w-])/, `${dir}/${f} runs no merge`)
    }
  }
  for (const f of fs.readdirSync(path.join(ROOT, 'scripts')).filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs'))) {
    if (f === 'pr-merge.mjs') continue
    assert.doesNotMatch(code(read(`scripts/${f}`)).replace(/^\s*\*.*$/gm, ''), /\['pr', 'merge'|'pr',\s*'merge'|gh pr merge/, `scripts/${f} merges no PR`)
  }
})
