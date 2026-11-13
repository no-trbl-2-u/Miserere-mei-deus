#!/usr/bin/env node
// scripts/ci-screens.mjs — the log of the screens CI hangs on (phase CW1a).
//
// Reads a PR's `visual-smoke` and `eval:mutation-pr` comments (and its
// commits and workflow runs) and appends one row to docs/reports/ci-screens.md
// for each incident not already logged. A row is keyed on PR, run and route,
// so recording the same PR twice adds nothing the second time. Rows are
// written by this script, never by hand.
//
//   node scripts/ci-screens.mjs record --pr <n> [--repo owner/name] [--file path]
//        [--date YYYY-MM-DD] [--restamping "route route"] [--comment-file path]...
//        [--flag-out path]
// `--file` is read from the working directory; the default is the log in this checkout.
//
// `--restamping` names the routes the CI re-stamp job is about to commit (the
// commit is not on the PR yet), and `--comment-file` is the comment it is about
// to post. A route named in two re-stamp commits with no other commit between
// them is `flapping`, and `--flag-out` receives one line per such route for
// the comment. GitHub is read through `gh api`, which takes GH_TOKEN in CI.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const LOG_FILE = 'docs/reports/ci-screens.md'
const BOT_LOGIN = 'github-actions[bot]'
export const VISUAL_MARKER = '<!-- visual-smoke -->'
export const MUTATION_MARKER = '<!-- eval:mutation-pr -->'
export const COLUMNS = ['date', 'PR', 'run', 'route or file', 'symptom', 'cause', 'fix PR']
export const SYMPTOMS = [
  'load-failed',
  're-stamped without a change',
  'flapping',
  'cancelled by re-stamp',
  'mutation over budget',
  'mutation dry run failed',
]

const cellText = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()

/** The key a row is deduplicated on. */
export const rowKey = (r) => `${String(r.pr).replace('#', '')}|${r.run}|${r.route}`

/**
 * The rows already in the log file's table, newest first.
 * @example parseRows('| 2026-11-12 | #1 | - | a | flapping | - | - |')[0].pr // '#1'
 */
export function parseRows(text) {
  const rows = []
  for (const line of text.split('\n')) {
    if (!/^\| \d{4}-\d{2}-\d{2} \|/.test(line)) continue
    const cells = line.replace(/^\| /, '').replace(/ \|$/, '').split(/ \| /).map((c) => c.replace(/\\\|/g, '|').trim())
    const [date, pr, run, route, symptom, cause = '-', fix = '-'] = cells
    rows.push({ date, pr, run, route, symptom, cause, fix })
  }
  return rows
}

/** One table row. @example renderRow({ date: 'd', pr: '#1', run: '-', route: 'r', symptom: 's', cause: '-', fix: '-' }) // '| d | #1 | - | r | s | - | - |' */
export function renderRow(r) {
  return `| ${[r.date, r.pr, r.run, r.route, r.symptom, r.cause || '-', r.fix || '-'].map(cellText).join(' | ')} |`
}

/** The text before the table, so a file can be rewritten around its rows. */
function headerOf(text) {
  const at = text.indexOf(`| ${COLUMNS[0]} |`)
  return at < 0 ? null : text.slice(0, at)
}

/**
 * The file's text with `fresh` rows added at the top of the table; a row whose
 * key is already there is skipped.
 * @returns {{ text: string, added: object[] }}
 */
export function appendRows(text, fresh) {
  const have = new Set(parseRows(text).map(rowKey))
  const added = []
  for (const r of fresh) {
    if (have.has(rowKey(r))) continue
    have.add(rowKey(r))
    added.push(r)
  }
  if (added.length === 0) return { text, added }
  const head = headerOf(text)
  const sep = `|${COLUMNS.map(() => ' --- ').join('|')}|`
  const old = parseRows(text)
  const all = [...added, ...old]
  const out = `${head}| ${COLUMNS.join(' | ')} |\n${sep}\n${all.map(renderRow).join('\n')}\n`
  return { text: out, added }
}

/**
 * What a `visual-smoke` comment body says: its run, the re-stamped routes with
 * their ratios, and the routes it held back with the reason.
 * @example parseVisualComment('<!-- visual-smoke -->\n| route | verdict | ratio |\n| --- | --- | --- |\n| a | differing | 1.000% |\n').restamped // [{ route: 'a', ratio: '1.000%' }]
 */
export function parseVisualComment(body) {
  const run = /\/actions\/runs\/(\d+)/.exec(body)?.[1] ?? '-'
  const restamped = []
  const held = []
  let inHeld = false
  for (const line of body.split('\n')) {
    if (/^Not re-stamped:/.test(line)) { inHeld = true; continue }
    const row = /^\| ([a-z0-9-]+) \| ([a-z-]+) \| ([^|]+) \|$/.exec(line)
    if (row && row[1] !== 'route') restamped.push({ route: row[1], ratio: row[3].trim() })
    const hold = inHeld ? /^- ([a-z0-9-]+): (.+)$/.exec(line) : null
    if (hold) held.push({ route: hold[1], reason: hold[2].trim() })
  }
  return { run, restamped, held }
}

/**
 * The incident rows a `mutation-pr` comment body holds: a workspace that ran
 * over its budget, or whose first test run failed.
 * @example parseMutationComment('<!-- eval:mutation-pr -->\nHead `abcdef123456`, x\n| mobile | 5 | 60 | - | 0 | 12 | - | n/a | over budget (899s): 12 of 60 tested, 899s |')[0].symptom // 'mutation over budget'
 */
export function parseMutationComment(body) {
  const head = /head `([0-9a-f]{7,40})`/.exec(body)?.[1]?.slice(0, 8)
  const run = head ? `head ${head}` : '-'
  const rows = []
  for (const line of body.split('\n')) {
    const cells = /^\|/.test(line) ? line.replace(/^\| /, '').replace(/ \|$/, '').split(/ \| /).map((c) => c.trim()) : []
    if (cells.length < 9 || cells[0] === 'Workspace') continue
    const [name, , , , , , , , runCell] = cells
    if (/^over budget/.test(runCell)) rows.push({ run, route: name, symptom: 'mutation over budget', cause: runCell.replace(/, \d+s$/, '') })
    else if (/initial test run/.test(runCell)) rows.push({ run, route: name, symptom: 'mutation dry run failed', cause: runCell.replace(/, \d+s$/, '') })
  }
  return rows
}

const RESTAMP_SUBJECT = /^visual: re-stamp (\S+)/

/**
 * Routes named in two re-stamp commits with nothing but re-stamp commits
 * between them. `subjects` is the PR's commit subjects oldest first; the
 * routes about to be re-stamped count as a commit at the end.
 * @example flappingRoutes(['visual: re-stamp a (CI render)'], ['a']) // ['a']
 */
export function flappingRoutes(subjects, restamping = []) {
  const all = subjects.map((s) => s.split('\n')[0])
  if (restamping.length > 0) all.push(`visual: re-stamp ${restamping.join(',')} (CI render)`)
  const flapping = new Set()
  const last = new Map()
  all.forEach((subject, i) => {
    const m = RESTAMP_SUBJECT.exec(subject)
    if (!m) return
    for (const route of m[1].split(',')) {
      const prev = last.get(route)
      if (prev !== undefined && all.slice(prev + 1, i).every((s) => RESTAMP_SUBJECT.test(s))) flapping.add(route)
      last.set(route, i)
    }
  })
  return [...flapping]
}

/**
 * `verify-mobile` runs cancelled by a re-stamp: the PR commit right after the
 * run's head is a `visual: re-stamp` commit.
 * @param {{ id: number, name: string, conclusion: string|null, head_sha: string }[]} runs
 * @param {{ sha: string, subject: string }[]} commits oldest first.
 */
export function cancelledRuns(runs, commits) {
  const out = []
  for (const r of runs) {
    if (r.conclusion !== 'cancelled' || r.name !== 'verify-mobile') continue
    const i = commits.findIndex((c) => c.sha === r.head_sha)
    if (i >= 0 && commits[i + 1] && RESTAMP_SUBJECT.test(commits[i + 1].subject)) out.push(String(r.id))
  }
  return out
}

/**
 * Every incident a PR shows, as rows ready for the log.
 * @param {{ pr: number, date: string, comments: string[], subjects?: string[], restamping?: string[], cancelled?: string[] }} input
 */
export function incidentsFor({ pr, date, comments, subjects = [], restamping = [], cancelled = [] }) {
  const base = { date, pr: `#${pr}`, fix: '-' }
  const rows = []
  const flapping = new Set(flappingRoutes(subjects, restamping))
  const lastVisual = comments.map((b) => b.includes(VISUAL_MARKER)).lastIndexOf(true)
  comments.forEach((body, at) => {
    if (body.includes(VISUAL_MARKER)) {
      const v = parseVisualComment(body)
      for (const h of v.held) {
        if (/load-failed/.test(h.reason)) rows.push({ ...base, run: v.run, route: h.route, symptom: 'load-failed', cause: '-' })
        else if (/differ across runs/.test(h.reason)) rows.push({ ...base, run: v.run, route: h.route, symptom: 'flapping', cause: 'captures differ across SMOKE_RUNS' })
      }
      for (const r of at === lastVisual ? v.restamped : []) {
        if (flapping.has(r.route)) rows.push({ ...base, run: v.run, route: r.route, symptom: 'flapping', cause: `re-stamped again, ratio ${r.ratio}` })
      }
    } else if (body.includes(MUTATION_MARKER)) {
      for (const m of parseMutationComment(body)) rows.push({ ...base, ...m })
    }
  })
  for (const id of cancelled) rows.push({ ...base, run: id, route: 'verify-mobile', symptom: 'cancelled by re-stamp', cause: 'a visual: re-stamp commit landed mid-run' })
  return rows
}

function gh(args) {
  return execFileSync('gh', ['api', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}
const ghJson = (path) => JSON.parse(gh([path, '--paginate', '--slurp'])).flat()

/** Fetch a PR's comments, commit subjects (oldest first) and cancelled runs. */
function fetchPr(repo, pr) {
  // Only the workflows' own token posts the markers; a stranger's comment must never reach the log.
  const comments = ghJson(`repos/${repo}/issues/${pr}/comments`).filter((c) => c.user?.login === BOT_LOGIN).map((c) => c.body ?? '')
  const commits = ghJson(`repos/${repo}/pulls/${pr}/commits`).map((c) => ({ sha: c.sha, subject: c.commit.message.split('\n')[0] }))
  const branch = JSON.parse(gh([`repos/${repo}/pulls/${pr}`])).head.ref
  let runs = []
  try {
    runs = JSON.parse(gh([`repos/${repo}/actions/runs?event=pull_request&branch=${encodeURIComponent(branch)}&per_page=100`])).workflow_runs ?? []
  } catch (err) {
    console.error(`ci-screens: could not list runs (${err.message}); skipping cancelled-run rows`)
  }
  return { comments, commits, runs }
}

function opt(argv, name) {
  const out = []
  argv.forEach((a, i) => { if (a === name) out.push(argv[i + 1]) })
  return out
}

export function record(argv, fetch = fetchPr) {
  const pr = Number(opt(argv, '--pr')[0])
  if (!Number.isInteger(pr) || pr <= 0) throw new Error('record needs --pr <number>')
  const repo = opt(argv, '--repo')[0] ?? process.env.GITHUB_REPOSITORY ?? 'no-trbl-2-u/Miserere-mei-deus'
  const file = opt(argv, '--file')[0] ? resolve(opt(argv, '--file')[0]) : resolve(ROOT, LOG_FILE)
  const date = opt(argv, '--date')[0] ?? new Date().toISOString().slice(0, 10)
  const restamping = (opt(argv, '--restamping')[0] ?? '').split(/\s+/).filter(Boolean)
  const fetched = fetch(repo, pr)
  const comments = [...fetched.comments, ...opt(argv, '--comment-file').map((f) => readFileSync(f, 'utf8'))]
  const subjects = fetched.commits.map((c) => c.subject)
  const cancelled = cancelledRuns(fetched.runs, fetched.commits)
  const rows = incidentsFor({ pr, date, comments, subjects, restamping, cancelled })
  const { text, added } = appendRows(readFileSync(file, 'utf8'), rows)
  if (added.length > 0) writeFileSync(file, text)
  const flagOut = opt(argv, '--flag-out')[0]
  if (flagOut) {
    const lines = flappingRoutes(subjects, restamping).map((r) => `flapping: ${r}, see ${LOG_FILE}`)
    writeFileSync(flagOut, lines.length > 0 ? `${lines.join('\n')}\n` : '')
  }
  return added
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  try {
    const [cmd, ...rest] = process.argv.slice(2)
    if (cmd !== 'record') throw new Error(`unknown command '${cmd}' (record)`)
    const added = record(rest)
    console.log(`ci-screens: ${added.length} new row(s)`)
    for (const r of added) console.log(renderRow(r))
  } catch (err) {
    console.error(`ci-screens: ${err.message}`)
    process.exit(2)
  }
}
