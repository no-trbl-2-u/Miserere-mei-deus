#!/usr/bin/env node
// scripts/pr-risk.mjs
//
// Derives a PR's risk tier, `risk:low`, `risk:medium` or `risk:high`, from
// its diff and labels (phase RV1a, `plan/README.md`
// A2a and A3; the rule table is `docs/reports/pr-review-research.md` Part 3).
// The tier is deterministic: a reviewer may raise it with a stated reason and
// never lowers it. `verify-gate` in `.github/workflows/pr-review.yml` is the
// only workflow step that writes a `risk:*` label.
//
//   node scripts/pr-risk.mjs <base>..<head> [--labels a,b]   # print the tier
//   node scripts/pr-risk.mjs --pr <n> [--apply]              # read the PR; --apply labels it
//   node scripts/pr-risk.mjs --replay [--before <ISO>] [--limit 60] [--write]
//
// `--replay` tiers the last merged PRs before the report's stamp and, with
// `--write`, splices the distribution into the report between its markers.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const TIERS = Object.freeze(['risk:low', 'risk:medium', 'risk:high'])

/** Paths whose changes are plan, docs or loop records only. */
export const LOW_PREFIXES = Object.freeze(['plan/', 'docs/', 'telemetry/', 'devlog/entries/'])
export const LOW_FILES = Object.freeze(['CLAUDE.md', 'AGENTS.md'])

/** Loop tooling that changes what the loop does to every PR. */
export const HIGH_PREFIXES = Object.freeze(['.github/workflows/', '.claude/'])
export const HIGH_FILES = Object.freeze(['scripts/pr-resolve.mjs', 'scripts/loop-issue.mjs'])

/** More changed lines than this under `skills/` is a doctrine change, not a build-plan tick. */
export const SKILLS_LINE_LIMIT = 20
/** More changed lines than this in a non-plan diff is a large change. */
export const LARGE_DIFF_LINES = 1000

/**
 * Whether a path is plan, docs or loop records only.
 *
 * @param {string} path a repo-relative path.
 * @returns {boolean} true for the `risk:low` path set.
 * @example isLowPath('plan/CRITIQUE.md') // true
 */
export function isLowPath(path) {
  return LOW_FILES.includes(path) || LOW_PREFIXES.some((p) => path.startsWith(p))
}

/**
 * The `dependencies` and `devDependencies` keys a `package.json` change adds.
 *
 * @param {string|null} before the file at the base, or null when new.
 * @param {string|null} after the file at the head, or null when deleted.
 * @returns {string[]} the added keys, `devDependencies:` prefixed for dev ones.
 * @example addedDependencies('{}', '{"dependencies":{"a":"1"}}') // ['a']
 */
export function addedDependencies(before, after) {
  const parse = (t) => { try { return t ? JSON.parse(t) : {} } catch { return {} } }
  const a = parse(before)
  const b = parse(after)
  const added = []
  for (const field of ['dependencies', 'devDependencies']) {
    const had = new Set(Object.keys(a[field] ?? {}))
    for (const k of Object.keys(b[field] ?? {})) if (!had.has(k)) added.push(field === 'dependencies' ? k : `devDependencies:${k}`)
  }
  return added
}

/**
 * The tier and the rule lines that set it.
 *
 * @param {{ files: { path: string, additions: number, deletions: number }[], labels?: string[], newDependencies?: string[] }} pr the diff facts.
 * @returns {{ tier: string, reasons: string[] }} `tier` is one of `TIERS`.
 * @example deriveRisk({ files: [{ path: 'plan/x.md', additions: 1, deletions: 0 }] }).tier // 'risk:low'
 */
export function deriveRisk(pr) {
  const files = pr.files ?? []
  const labels = new Set((pr.labels ?? []).filter((l) => !l.startsWith('risk:')))
  const lines = (f) => (f.additions ?? 0) + (f.deletions ?? 0)
  const total = files.reduce((n, f) => n + lines(f), 0)
  const lowPaths = files.length > 0 && files.every((f) => isLowPath(f.path))
  const reasons = []

  if (labels.has('review:rules-change')) reasons.push('label review:rules-change')
  if (labels.has('review:needs-T')) reasons.push('label review:needs-T')
  const loopTooling = files.filter((f) => HIGH_FILES.includes(f.path) || HIGH_PREFIXES.some((p) => f.path.startsWith(p)))
  if (loopTooling.length) reasons.push(`loop tooling: ${loopTooling.map((f) => f.path).join(', ')}`)
  const skillLines = files.filter((f) => f.path.startsWith('skills/')).reduce((n, f) => n + lines(f), 0)
  if (skillLines > SKILLS_LINE_LIMIT) reasons.push(`${skillLines} changed lines under skills/ (> ${SKILLS_LINE_LIMIT})`)
  // The low tier has no size cap: a plot PR is all plan and may carry the size of the phase it plans.
  if (!lowPaths && labels.has('size:L')) reasons.push('label size:L')
  if (!lowPaths && total > LARGE_DIFF_LINES) reasons.push(`${total} changed lines (> ${LARGE_DIFF_LINES})`)
  if (pr.newDependencies?.length) reasons.push(`new dependency: ${pr.newDependencies.join(', ')}`)
  if (reasons.length) return { tier: 'risk:high', reasons }

  if (lowPaths) return { tier: 'risk:low', reasons: ['every path is plan, docs or loop records'] }
  return { tier: 'risk:medium', reasons: ['code or tooling outside the high rules'] }
}

/** The marker a reviewer writes, in a PR comment, when it raises the tier with a reason. */
export const RAISE_MARKER = /<!--\s*pr-review:raised (risk:(?:low|medium|high))\s*-->/g

/**
 * The highest tier a reviewer raised to, read from the PR's comments.
 *
 * @param {string[]} bodies comment bodies.
 * @returns {string|null} a `risk:*` label, or null when nothing was raised.
 * @example raisedTier(['<!-- pr-review:raised risk:high -->']) // 'risk:high'
 */
export function raisedTier(bodies) {
  let best = -1
  for (const b of bodies) for (const m of (b ?? '').matchAll(RAISE_MARKER)) best = Math.max(best, TIERS.indexOf(m[1]))
  return best < 0 ? null : TIERS[best]
}

/**
 * The label edit that leaves exactly one `risk:*` label: the derived tier,
 * or a reviewer's raise above it. A stale tier from an earlier head goes.
 *
 * @param {{ derived: string, current: string[], raised?: string|null }} state the PR's labels and the tiers.
 * @returns {{ tier: string, add: string[], remove: string[] }} the edit.
 * @example planRiskLabel({ derived: 'risk:low', current: ['risk:medium'] }) // { tier: 'risk:low', add: ['risk:low'], remove: ['risk:medium'] }
 */
export function planRiskLabel({ derived, current, raised = null }) {
  const tier = raised && TIERS.indexOf(raised) > TIERS.indexOf(derived) ? raised : derived
  const have = current.filter((l) => l.startsWith('risk:'))
  return { tier, add: have.includes(tier) ? [] : [tier], remove: have.filter((l) => l !== tier) }
}

/** Markers that bound the replay's block in the research report. */
export const REPLAY_START = '<!-- pr-risk:replay:start -->'
export const REPLAY_END = '<!-- pr-risk:replay:end -->'

/**
 * The replay block for the research report, markers included.
 *
 * @param {{ stamp: { commit: string, date: string }, before: string, rows: { number: number, tier: string, reasons: string[] }[] }} replay the tiered PRs.
 * @returns {string} markdown.
 */
export function renderReplay({ stamp, before, rows }) {
  const by = (t) => rows.filter((r) => r.tier === t).sort((a, b) => b.number - a.number)
  const out = [REPLAY_START, '', '#### Replay by `scripts/pr-risk.mjs` (phase RV1a, A3)', '']
  out.push(`The last ${rows.length} PRs merged before ${before}, tiered by the script, not by hand. Stamp: commit \`${stamp.commit}\` (${stamp.date}). Regenerate with \`node scripts/pr-risk.mjs --replay --write\`; labels are read as they stand today.`, '')
  out.push('| Tier | PRs | Which |', '|---|---|---|')
  for (const t of TIERS) out.push(`| \`${t}\` | ${by(t).length} | ${by(t).map((r) => `#${r.number}`).join(' ') || 'none'} |`)
  out.push('', REPLAY_END)
  return out.join('\n')
}

/**
 * The report with the replay block replaced, or appended to Part 3.
 *
 * @param {string} report the research report.
 * @param {string} block the rendered block.
 * @returns {string} the whole file.
 */
export function spliceReplay(report, block) {
  const a = report.indexOf(REPLAY_START)
  const b = report.indexOf(REPLAY_END)
  if (a >= 0 && b > a) return report.slice(0, a) + block + report.slice(b + REPLAY_END.length)
  const anchor = report.indexOf('### Stage 0:')
  if (anchor < 0) return `${report.trimEnd()}\n\n${block}\n`
  return `${report.slice(0, anchor)}${block}\n\n${report.slice(anchor)}`
}

// --- I/O ----------------------------------------------------------------------

const ROOT = (() => {
  // The review job runs main's copy of scripts/ from .review-tooling/, so the
  // root is git's toplevel from this file's directory, not a fixed path.
  const here = dirname(fileURLToPath(import.meta.url))
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: here, encoding: 'utf8' }).trim()
  } catch {
    return resolve(here, '..')
  }
})()
const REPORT = 'docs/reports/pr-review-research.md'

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts }).trim()
}

function tryShow(ref, path) {
  try { return sh('git', ['show', `${ref}:${path}`], { stdio: ['ignore', 'pipe', 'ignore'] }) } catch { return null }
}

function readEnv(key) {
  if (process.env[key]) return process.env[key]
  const env = join(ROOT, '.env')
  if (!existsSync(env)) return undefined
  const line = readFileSync(env, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${key}=`))
  return line ? line.slice(key.length + 1).trim() : undefined
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : fallback
}

function newDeps(base, head, paths) {
  return paths.filter((p) => /(^|\/)package\.json$/.test(p)).flatMap((p) => addedDependencies(tryShow(base, p), tryShow(head, p)))
}

function fromRange(range, labels) {
  const [base, head] = range.split('..')
  const files = sh('git', ['diff', '--numstat', base, head]).split('\n').filter(Boolean).map((l) => {
    const [a, d, path] = l.split('\t')
    return { path, additions: Number(a) || 0, deletions: Number(d) || 0 }
  })
  return { files, labels, newDependencies: newDeps(base, head, files.map((f) => f.path)) }
}

function main() {
  const token = readEnv('GH_TOKEN')
  if (token) process.env.GH_TOKEN = token
  const repo = readEnv('GH_REPO') || 'no-trbl-2-u/Miserere-mei-deus'
  const gh = (args) => JSON.parse(sh('gh', args) || 'null')

  if (process.argv.includes('--replay')) {
    const stampCommit = arg('--stamp', 'a712832a7')
    const before = arg('--before', sh('git', ['show', '-s', '--format=%cI', stampCommit]))
    const limit = Number(arg('--limit', '60'))
    const prs = gh(['pr', 'list', '--repo', repo, '--state', 'merged', '--limit', '300',
      '--json', 'number,mergedAt,labels,files,mergeCommit'])
      .filter((p) => Date.parse(p.mergedAt) <= Date.parse(before))
      .sort((a, b) => Date.parse(b.mergedAt) - Date.parse(a.mergedAt))
      .slice(0, limit)
    const rows = prs.map((p) => {
      const merge = p.mergeCommit?.oid
      const files = p.files ?? []
      const deps = merge ? newDeps(`${merge}^1`, merge, files.map((f) => f.path)) : []
      return { number: p.number, ...deriveRisk({ files, labels: p.labels.map((l) => l.name), newDependencies: deps }) }
    })
    const stamp = { commit: sh('git', ['rev-parse', '--short=9', 'HEAD']), date: new Date().toISOString().slice(0, 10) }
    const block = renderReplay({ stamp, before, rows })
    for (const t of TIERS) console.log(`${t}: ${rows.filter((r) => r.tier === t).length}`)
    if (process.argv.includes('--write')) {
      const file = join(ROOT, REPORT)
      writeFileSync(file, spliceReplay(readFileSync(file, 'utf8'), block))
      console.log(`wrote ${REPORT}`)
    }
    return
  }

  const pr = arg('--pr')
  if (pr) {
    const view = gh(['pr', 'view', pr, '--repo', repo, '--json', 'labels,files,baseRefOid,headRefOid,comments'])
    const paths = view.files.map((f) => f.path)
    let base = view.baseRefOid
    try { base = sh('git', ['merge-base', view.baseRefOid, view.headRefOid]) } catch { /* shallow: fall back to the base tip */ }
    const labels = view.labels.map((l) => l.name)
    const { tier: derived, reasons } = deriveRisk({ files: view.files, labels, newDependencies: newDeps(base, view.headRefOid, paths) })
    const plan = planRiskLabel({ derived, current: labels, raised: raisedTier(view.comments.map((c) => c.body)) })
    console.log(`derived ${derived}: ${reasons.join('; ')}`)
    if (plan.tier !== derived) console.log(`kept ${plan.tier}: a reviewer raised it`)
    if (process.argv.includes('--apply') && (plan.add.length || plan.remove.length)) {
      const color = { 'risk:low': 'C2E0C6', 'risk:medium': 'FBCA04', 'risk:high': 'B60205' }[plan.tier]
      try {
        sh('gh', ['label', 'create', plan.tier, '--repo', repo, '--color', color,
          '--description', 'Derived by scripts/pr-risk.mjs; a reviewer may only raise it'], { stdio: ['ignore', 'pipe', 'ignore'] })
      } catch { /* the label already exists */ }
      const args = ['pr', 'edit', pr, '--repo', repo]
      for (const l of plan.add) args.push('--add-label', l)
      for (const l of plan.remove) args.push('--remove-label', l)
      sh('gh', args)
      console.log(`labelled ${plan.tier}${plan.remove.length ? `, removed ${plan.remove.join(', ')}` : ''}`)
    }
    console.log(plan.tier)
    return
  }

  const range = process.argv.slice(2).find((a) => a.includes('..'))
  if (!range) {
    console.error('usage: pr-risk.mjs <base>..<head> [--labels a,b] | --pr <n> [--apply] | --replay [--write]')
    process.exit(2)
  }
  const labels = (arg('--labels', '') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const { tier, reasons } = deriveRisk(fromRange(range, labels))
  console.error(reasons.join('; '))
  console.log(tier)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
