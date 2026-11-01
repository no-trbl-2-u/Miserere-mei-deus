#!/usr/bin/env node
// scripts/eval/escape-ledger.mjs
//
// The escape ledger (phase EV1a, `plan/README.md`
// A1-A3): every `loop:pr` PR merged since 2026-10-12, the checks that ran on
// its final head, the `verify-*` workflows its paths skipped, fix or revert
// follow-ups within 7 days, the antagonist's and the shadow reviewer's
// verdicts at merge, and the six seeded escapes. Reads GitHub (`gh`) and git only; writes
// `docs/reports/eval/ledger.json` and the ledger section of
// `docs/reports/eval/latest.md`. The pure parts live in `ledger-lib.mjs`.
//
//   node scripts/eval/escape-ledger.mjs [--from 2026-10-12] [--to <ISO>] [--dry-run]
//
// `--to` defaults to HEAD's commit time, so a rerun at the stamped commit
// sees the same window.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  antagonistAtMerge, checksOnHead, classifyPaths, detectFollowUps, evaluateSeeds, reviewAtMerge,
  renderLedgerSection, spliceReport, verifyWorkflowsFrom,
} from './ledger-lib.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT_DIR = join(ROOT, 'docs/reports/eval')

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : fallback
}

function sh(cmd, args) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()
}

function readEnv(key) {
  if (process.env[key]) return process.env[key]
  const env = join(ROOT, '.env')
  if (!existsSync(env)) return undefined
  const line = readFileSync(env, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${key}=`))
  return line ? line.slice(key.length + 1).trim() : undefined
}

const token = readEnv('GH_TOKEN')
if (token) process.env.GH_TOKEN = token
const REPO = readEnv('GH_REPO') || 'no-trbl-2-u/Miserere-mei-deus'

const ghJson = (args) => JSON.parse(sh('gh', args) || 'null')
const api = (path) => ghJson(['api', '-H', 'Accept: application/vnd.github+json', `repos/${REPO}/${path}`])

/** Today's `verify-*` filters: the ledger's header, the Android seed. */
function verifyWorkflows() {
  const dir = join(ROOT, '.github/workflows')
  return verifyWorkflowsFrom(readdirSync(dir).map((file) => ({ file, text: readFileSync(join(dir, file), 'utf8') })))
}

/**
 * The `verify-*` filters as they stood at `sha`, so a PR merged before a
 * workflow existed is not read as having skipped it.
 */
function verifyWorkflowsAt(sha) {
  const listed = sh('git', ['ls-tree', '--name-only', `${sha}:.github/workflows`]).split('\n').filter(Boolean)
  return verifyWorkflowsFrom(listed.filter((file) => /^verify-.*\.ya?ml$/.test(file))
    .map((file) => ({ file, text: sh('git', ['show', `${sha}:.github/workflows/${file}`]) })))
}

function filesOf(sha) {
  const parents = sh('git', ['rev-list', '--parents', '-n', '1', sha]).split(' ').slice(1)
  if (parents.length === 0) return sh('git', ['show', '--name-only', '--format=', sha]).split('\n').filter(Boolean)
  return sh('git', ['diff', '--name-only', parents[0], sha]).split('\n').filter(Boolean)
}

/** First-parent landings on main from `since` to HEAD, with the PR title as the subject of a PR merge. */
function landings(since, mainRef) {
  const raw = sh('git', ['log', '--first-parent', mainRef, `--since=${since}`, '--format=%H%x1f%cI%x1f%s%x1f%b%x1e'])
  return raw.split('\x1e').map((s) => s.trim()).filter(Boolean).map((rec) => {
    const [sha, date, subject, body] = rec.split('\x1f')
    const pr = subject.match(/^Merge pull request #\d+/)
    const title = pr ? (body ?? '').split('\n').find((l) => l.trim()) ?? subject : subject
    return { sha, date, subject: title.trim(), files: filesOf(sha) }
  })
}

function commitFacts(short) {
  try {
    const sha = sh('git', ['rev-parse', '--verify', `${short}^{commit}`])
    return { sha, files: filesOf(sha) }
  } catch {
    return null
  }
}

function checksFor(head) {
  const runs = (api(`actions/runs?head_sha=${head}&per_page=100`)?.workflow_runs ?? [])
    .filter((r) => r.event === 'pull_request')
    .map((r) => ({ name: r.name, path: r.path, conclusion: r.conclusion, startedAt: r.run_started_at ?? r.created_at, finishedAt: r.status === 'completed' ? r.updated_at : null }))
  const external = (api(`commits/${head}/check-runs?per_page=100`)?.check_runs ?? [])
    .filter((c) => c.app?.slug !== 'github-actions')
    .map((c) => ({ name: c.name, path: null, conclusion: c.conclusion, startedAt: c.started_at, finishedAt: c.completed_at }))
  return [...runs, ...external]
}

function main() {
  const from = arg('--from', '2026-10-12')
  const head = sh('git', ['rev-parse', 'HEAD'])
  const to = arg('--to', sh('git', ['show', '-s', '--format=%cI', head]))
  const mainRef = head
  const workflows = verifyWorkflows()

  const prs = ghJson([
    'pr', 'list', '--repo', REPO, '--state', 'merged', '--label', 'loop:pr', '--limit', '500',
    '--search', `merged:>=${from}`, '--json', 'number,title,mergedAt,headRefOid,mergeCommit,body',
  ])
    .filter((p) => Date.parse(p.mergedAt) >= Date.parse(from) && Date.parse(p.mergedAt) <= Date.parse(to))
    .sort((a, b) => a.number - b.number)

  const history = landings(from, mainRef)
  const rows = prs.map((p) => {
    const mergeCommit = p.mergeCommit?.oid
    const known = mergeCommit && commitFacts(mergeCommit)
    const files = known ? filesOf(mergeCommit) : []
    const { triggered, skipped, uncovered } = classifyPaths(files, known ? verifyWorkflowsAt(mergeCommit) : workflows)
    const ran = checksOnHead(checksFor(p.headRefOid), p.mergedAt)
    const ranPaths = new Set(ran.map((c) => c.path).filter(Boolean))
    const expectedNotRun = triggered.filter((f) => !ranPaths.has(`.github/workflows/${f}`))
    const view = ghJson(['pr', 'view', String(p.number), '--repo', REPO, '--json', 'comments,reviews'])
    const comments = [...(view.comments ?? []), ...(view.reviews ?? [])]
      .map((c) => ({ author: c.author?.login ?? '', body: c.body ?? '', createdAt: c.createdAt ?? c.submittedAt }))
      .filter((c) => c.createdAt && c.body)
    const antagonist = antagonistAtMerge(comments, p.mergedAt)
    const review = reviewAtMerge(comments, p.mergedAt)
    const followUps = detectFollowUps({ mergeCommit, mergedAt: p.mergedAt, files }, history)
    return {
      number: p.number, title: p.title, mergedAt: p.mergedAt, head: p.headRefOid, mergeCommit, files,
      ran, triggered, skipped, expectedNotRun, uncovered, followUps, antagonist, review,
    }
  })

  const facts = {
    commits: Object.fromEntries(['c95114a2', '49829988', '23f06828', '662aa10b'].map((s) => [s, commitFacts(s)])),
    prBodies: Object.fromEntries(prs.filter((p) => [521, 523].includes(p.number)).map((p) => [p.number, p.body ?? ''])),
    verifyMentionsAndroid: workflows.some((wf) => /android/i.test(wf.text)),
  }
  const seeds = evaluateSeeds(rows, facts)
  const stamp = { commit: head.slice(0, 8), date: to }
  const ledger = { stamp, window: { from, to: to.slice(0, 10) }, workflows: workflows.map(({ file, name, paths }) => ({ file, name, paths })), rows, seeds }
  const section = renderLedgerSection(ledger)

  if (process.argv.includes('--dry-run')) {
    process.stdout.write(`${section}\n`)
    return
  }
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, 'ledger.json'), `${JSON.stringify(ledger, null, 2)}\n`)
  const latest = join(OUT_DIR, 'latest.md')
  writeFileSync(latest, spliceReport(existsSync(latest) ? readFileSync(latest, 'utf8') : null, section, stamp))
  console.log(`escape ledger: ${rows.length} PRs, ${seeds.filter((s) => s.status === 'confirmed').length}/${seeds.length} seeds confirmed -> docs/reports/eval/latest.md`)
}

main()
