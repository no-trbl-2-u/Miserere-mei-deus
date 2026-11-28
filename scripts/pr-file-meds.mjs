#!/usr/bin/env node
// scripts/pr-file-meds.mjs — file a merged PR's MED review findings to plan/AUDIT.md on main.
// Zero dependencies.
//
// A `pass` verdict is final for its PR (AGENTS.md "Pull requests"): nobody pushes to the passed
// PR for its MED or LOW findings. Its MEDs are kept instead, as `## Pending` rows of
// plan/AUDIT.md, for `/iterate` to verify and fix in their own PR. LOW rows are not filed.
//
// When: after the merge, on main. The `merge` job in pr-review.yml only turns on auto-merge
// (`gh pr merge --auto`), and GitHub merges later, so that job cannot know the PR has merged.
// The push to main that the merge makes starts `pr-resolve.yml`'s scan, and a step after the
// scan runs this with the push's range: every PR the pushed first-parent commits merged
// (`Merge pull request #N`, or a squash's `(#N)`), whose state is MERGED and whose latest
// trusted verdict comment is a `pass`, has that verdict's MED rows filed.
//
// How: in a throwaway detached worktree of origin/main, the MED rows go to the top of
// `## Pending`, one commit, pushed to main and never forced; a rejected push fetches and starts
// again, two tries at most. A MED whose `file:line` and text already sit in AUDIT.md is skipped.
// The AUDIT lint (`check-plan-queues.mjs`) runs before and after; a filing that adds a finding
// pushes nothing.
//
// It never fails the job: the PR is merged already. A push lost twice, an unparsable findings
// table or any error is a `::warning::` and a job-summary line, and the exit code is 0.
//
//   node scripts/pr-file-meds.mjs --after <sha> [--before <sha>]   # the push's range; no --before: the last first-parent commit

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { lintQueue } from './check-plan-queues.mjs'
import { REVIEW_VERDICT } from './eval/ledger-lib.mjs'
import { TRUSTED_AUTHORS } from './pr-policy.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const AUDIT_FILE = 'plan/AUDIT.md'
const MAX_TRIES = 2
const TITLE_MAX = 100

export const NEXT_LINE = '`/iterate`: verify the finding on `main`, fix it or close it as not reproduced.'

/** The reviewer's first bracket tag (reader prefix `aN:` stripped) to an AUDIT category. */
export const CATEGORY = Object.freeze({ tests: 'tests', logic: 'finding', control: 'process', seams: 'debt' })

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

const HEADER = /^\|\s*Severity\s*\|\s*Where\s*\|\s*Finding\s*\|\s*$/i
const SEPARATOR = /^\|(\s*:?-{3,}:?\s*\|)+\s*$/
const NO_FINDINGS = /^No findings\.?\s*$/m

/** A markdown table row's cells; an escaped `\|` stays inside its cell. */
function cells(line) {
  const parts = line.trim().split(/(?<!\\)\|/)
  return parts.slice(1, parts.length - 1).map((c) => c.trim())
}

/**
 * Every row of a verdict comment's findings table.
 *
 * @param {string} body the `## Review verdict` comment.
 * @returns {{ ok: true, rows: Array<{ severity: 'HIGH' | 'MED' | 'LOW', where: string, text: string }> } | { ok: false, reason: string }}
 * @example parseFindings('No findings.') // { ok: true, rows: [] }
 */
export function parseFindings(body) {
  const lines = String(body ?? '').replace(/\r\n/g, '\n').split('\n')
  const at = lines.findIndex((l) => HEADER.test(l))
  if (at < 0) return NO_FINDINGS.test(body ?? '') ? { ok: true, rows: [] } : { ok: false, reason: 'unparsable findings: no `| Severity | Where | Finding |` table and no `No findings.`' }
  if (!SEPARATOR.test(lines[at + 1] ?? '')) return { ok: false, reason: 'unparsable findings: the table header has no separator row' }
  const rows = []
  for (let i = at + 2; i < lines.length && lines[i].trim().startsWith('|'); i++) {
    let c = cells(lines[i])
    // An unescaped `|` in the Finding prose (`a || b`) splits it: the last cell is prose, so the overflow rejoins it.
    if (c.length > 3) c = [c[0], c[1], lines[i].trim().split(/(?<!\\)\|/).slice(3, -1).join('|').trim()]
    if (c.length !== 3) return { ok: false, reason: `unparsable findings: table row ${i - at - 1} has ${c.length} cells, not 3` }
    const severity = c[0].replace(/\*/g, '').trim().toUpperCase()
    if (!['HIGH', 'MED', 'LOW'].includes(severity)) return { ok: false, reason: `unparsable findings: table row ${i - at - 1} has severity '${c[0]}'` }
    rows.push({ severity, where: c[1].replace(/`/g, '').trim(), text: c[2] })
  }
  return { ok: true, rows }
}

/**
 * The MED rows of a verdict comment; throws on an unparsable table.
 * @param {string} body
 */
export function medRows(body) {
  const r = parseFindings(body)
  if (!r.ok) throw new Error(r.reason)
  return r.rows.filter((row) => row.severity === 'MED')
}

/** The AUDIT category for a finding's text, from its first bracket tag; `finding` when none maps. */
export function categoryOf(text) {
  const tag = /^\s*\[([^\]]+)\]/.exec(text ?? '')?.[1]?.replace(/^a\d+:/i, '').trim().toLowerCase()
  return CATEGORY[tag] ?? 'finding'
}

/** The finding as a one-line title: tags dropped, its first sentence, cut at a word under the cap. */
function titleOf(f) {
  const prose = f.text.replace(/^\s*(\[[^\]]*\]\s*)+/, '').trim()
  let title = /^(.+?[.!?])(\s|$)/.exec(prose)?.[1] ?? prose
  if (title.length > TITLE_MAX) title = `${title.slice(0, TITLE_MAX).replace(/\s+\S*$/, '').replace(/[\s,;:]+$/, '')}…`
  const where = f.where ? `\`${path.basename(f.where)}\`: ` : ''
  return `${where}${title}`
}

/**
 * One `## Pending` row of plan/AUDIT.md for a MED finding.
 *
 * @param {{ where: string, text: string }} f  @param {{ pr: number | string, date: string, url: string }} at
 * @returns {string} the row, no trailing newline.
 */
export function auditRow(f, { pr, date, url }) {
  const category = categoryOf(f.text)
  const where = f.where ? `\`${f.where}\`: ` : ''
  return [
    `### [ ] [${category}] ${titleOf(f)} (PR #${pr} review, ${date})`,
    `- category: ${category}`,
    '- impact: 5',
    '- ease: 5',
    `- detail: MED from the \`pass\` verdict on #${pr} (${url}). ${where}${f.text}`,
    `- next: ${NEXT_LINE}`,
  ].join('\n')
}

/** Whether a finding's `file:line` and its text both already sit in the AUDIT text. */
export function alreadyFiled(audit, f) {
  return audit.includes(f.where) && audit.includes(f.text)
}

/**
 * The AUDIT text with each new MED at the top of `## Pending`. Throws when there is no such heading.
 *
 * @param {string} audit  @param {Array<{ where: string, text: string }>} meds  @param {{ pr: number | string, date: string, url: string }} at
 * @returns {{ text: string, filed: object[], skipped: object[] }}
 */
export function fileRows(audit, meds, at) {
  const filed = []
  const skipped = []
  for (const f of meds) {
    if (alreadyFiled(audit, f) || filed.some((g) => g.where === f.where && g.text === f.text)) skipped.push(f)
    else filed.push(f)
  }
  if (!filed.length) return { text: audit, filed, skipped }
  const m = /^## Pending[ \t]*\n(?:[ \t]*\n)*/m.exec(audit)
  if (!m) throw new Error(`${AUDIT_FILE} has no '## Pending' heading`)
  const end = m.index + m[0].length
  const block = filed.map((f) => auditRow(f, at)).join('\n\n')
  return { text: `${audit.slice(0, m.index)}## Pending\n\n${block}\n\n${audit.slice(end)}`, filed, skipped }
}

/**
 * The verdict comment to file from: the latest one from a trusted account, when it is a pass.
 *
 * @param {Array<{ body: string, createdAt: string, author?: string, url?: string }>} comments
 * @param {readonly string[]} [trusted]
 */
export function passVerdict(comments, trusted = TRUSTED_AUTHORS) {
  const last = (comments ?? [])
    .filter((c) => trusted.includes(c.author ?? '') && Number.isFinite(Date.parse(c.createdAt)) && REVIEW_VERDICT.test(c.body ?? ''))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .at(-1)
  return last && last.body.match(REVIEW_VERDICT)[1] === 'pass' ? last : null
}

/** The PR numbers a list of commit subjects merged, first seen first. */
export function mergedPrs(subjects) {
  const out = []
  for (const s of subjects) {
    const n = /^Merge pull request #(\d+)\b/.exec(s)?.[1] ?? /\(#(\d+)\)\s*$/.exec(s)?.[1]
    if (n && !out.includes(Number(n))) out.push(Number(n))
  }
  return out
}

/**
 * Write the MED rows to origin/`branch`'s AUDIT.md and push, in a throwaway worktree of `root`.
 *
 * @param {{ root?: string, branch?: string, pr: number | string, meds: object[], date: string, url: string, log?: (s: string) => void }} opts
 * @returns {{ state: 'nothing' | 'filed' | 'refused' | 'lost', filed?: object[], reason?: string }}
 */
export function fileMeds({ root = ROOT, branch = 'main', pr, meds, date, url, log = console.log }) {
  for (let i = 0; i < MAX_TRIES; i++) {
    git(['fetch', '-q', 'origin', branch], root)
    const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-file-meds-wt-'))
    try {
      git(['worktree', 'add', '-q', '--detach', wt, `origin/${branch}`], root)
      const file = path.join(wt, AUDIT_FILE)
      const before = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
      const r = fileRows(before, meds, { pr, date, url })
      if (!r.filed.length) return { state: 'nothing', filed: [] }
      const was = new Set(lintQueue(before, 'audit').findings)
      const worse = lintQueue(r.text, 'audit').findings.filter((f) => !was.has(f))
      if (worse.length) return { state: 'refused', reason: `the rows turn the AUDIT lint red: ${worse[0]}` }
      fs.writeFileSync(file, r.text)
      git(['add', '--', AUDIT_FILE], wt)
      git(['commit', '-q', '-m', `plan: file PR #${pr} review MEDs to AUDIT`], wt)
      try {
        git(['push', '-q', 'origin', `HEAD:${branch}`], wt)
        return { state: 'filed', filed: r.filed }
      } catch (err) {
        log(`pr-file-meds: push rejected (${String(err?.stderr ?? err?.message ?? err).split('\n')[0]}); fetching and filing again`)
      }
    } finally {
      try {
        git(['worktree', 'remove', '--force', wt], root)
      } catch {
        fs.rmSync(wt, { recursive: true, force: true })
        try {
          git(['worktree', 'prune'], root)
        } catch {
          // a throwaway runner
        }
      }
    }
  }
  return { state: 'lost', reason: `the push to ${branch} was rejected ${MAX_TRIES} times` }
}

/**
 * The filing for every PR a push merged. Never throws and always resolves 0: a failure is a
 * warning and a summary line, since the PR has merged already.
 *
 * @param {{ prs: () => number[], view: (pr: number) => { state: string, mergedAt?: string, comments: object[] }, write: (a: object) => { state: string, filed?: object[], reason?: string }, log?: (s: string) => void, summary?: (s: string) => void, trusted?: readonly string[] }} deps
 * @returns {Promise<0>}
 */
export async function run({ prs, view, write, log = console.log, summary = () => {}, trusted = TRUSTED_AUTHORS }) {
  const warn = (s) => {
    log(`::warning::pr-file-meds: ${s}`)
    summary(`- MED filing to plan/AUDIT.md failed: ${s}`)
  }
  try {
    for (const pr of prs()) {
      try {
        const v = view(pr)
        if (v.state !== 'MERGED') continue
        const verdict = passVerdict(v.comments, trusted)
        if (!verdict) {
          log(`pr-file-meds: #${pr} has no pass verdict to file from`)
          continue
        }
        const parsed = parseFindings(verdict.body)
        if (!parsed.ok) {
          warn(`#${pr}: ${parsed.reason}`)
          continue
        }
        const meds = parsed.rows.filter((r) => r.severity === 'MED')
        if (!meds.length) {
          log(`pr-file-meds: #${pr}'s pass verdict lists no MED`)
          continue
        }
        const date = (v.mergedAt ?? new Date().toISOString()).slice(0, 10)
        const r = write({ pr, meds, date, url: verdict.url ?? `PR #${pr}` })
        if (r.state === 'filed') {
          log(`pr-file-meds: #${pr}: filed ${r.filed.length} MED row(s) to ${AUDIT_FILE}`)
          summary(`- #${pr}: filed ${r.filed.length} MED finding(s) to plan/AUDIT.md`)
        } else if (r.state === 'nothing') log(`pr-file-meds: #${pr}: every MED is already in ${AUDIT_FILE}`)
        else warn(`#${pr}: ${r.reason}`)
      } catch (err) {
        warn(`#${pr}: ${String(err?.message ?? err).split('\n')[0]}`)
      }
    }
  } catch (err) {
    warn(String(err?.message ?? err).split('\n')[0])
  }
  return 0
}

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : undefined
}

function isCommit(sha, root = ROOT) {
  try {
    git(['cat-file', '-e', `${sha}^{commit}`], root)
    return true
  } catch {
    return false
  }
}

/** The PRs a push merged: its own `before..after` range, or just `after` when `before` is absent, all zeros or unknown. */
export function pushedPrs(before, after, root = ROOT) {
  const known = Boolean(before) && !/^0+$/.test(before) && isCommit(before, root)
  const range = known ? `${before}..${after}` : `${after}^..${after}`
  return mergedPrs(git(['log', '--first-parent', '--format=%s', range], root).split('\n').filter(Boolean))
}

async function cli() {
  const after = arg('--after') ?? 'HEAD'
  const before = arg('--before')
  const repo = process.env.GH_REPO || 'no-trbl-2-u/Miserere-mei-deus'
  const envTrusted = (process.env.TRUSTED_VERDICT_AUTHORS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  process.exitCode = await run({
    prs: () => pushedPrs(before, after),
    view: (pr) => {
      const v = JSON.parse(execFileSync('gh', ['pr', 'view', String(pr), '--repo', repo, '--json', 'state,mergedAt,comments'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
      return { ...v, comments: (v.comments ?? []).map((c) => ({ body: c.body ?? '', createdAt: c.createdAt, author: c.author?.login ?? '', url: c.url })) }
    },
    write: (a) => fileMeds({ ...a, root: ROOT }),
    summary: (s) => {
      if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${s}\n`)
    },
    trusted: envTrusted.length ? envTrusted : TRUSTED_AUTHORS,
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await cli()
