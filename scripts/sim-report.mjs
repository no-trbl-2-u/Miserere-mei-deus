#!/usr/bin/env node
// scripts/sim-report.mjs
//
// The nightly sim report T reads. Reads the `run-summary`, `run-ends`,
// `run-pacing` and `coverage` reports of the `miserere-api` Worker for the sim's
// rows at one build, and Chapter 1's content (the universe "never reached" is
// listed against, and the regions the pacing groups by), then:
//
//   - writes `docs/reports/sim/latest.md`: a generated-file comment, a stamp, and
//     five sections in order (run health, pacing, how hard is Chapter 1, coverage,
//     since the last report). No cards: `card-vs-bot` stays on demand in `npm run api`.
//   - appends ONE line to `docs/reports/sim/history.jsonl`, so the numbers outlive
//     the Worker's 14-day window.
//
//   npm run sim:report -- --build <sha> [--breaks <file>] [--repo owner/name]
//
// A measurement, never a gate: every number is a count or a mean for T to read.
// It exits non-zero only on a crash, a refused or failed read, or a missing URL
// or token, and then writes nothing (everything is computed before the first
// write). The breaks file (`sim:run --breaks`) is optional; with a repo the
// report links each break to its issue (a failed issue lookup only drops the links).
//
// The Worker URL and token are the solve-time API's: `PUZZLE_API_URL` and
// `PUZZLE_API_TOKEN` (see `scripts/api.mjs`). Exit codes: 0 ok; 1 a read, a
// file or the content failed; 2 bad arguments or a missing variable.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { fetchReport } from './api.mjs'
import { ENV_FILE, resolveConfig } from './puzzle-times.mjs'
import { indexIssues, runGh } from './sim-breaks.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const USAGE = 'usage: npm run sim:report -- --build <sha> [--breaks <file>] [--repo owner/name] [--seed <n>] [--out <dir>] [--date YYYY-MM-DD] [--content <chapter1.json>]'

export const OUT_DIR = 'docs/reports/sim'
export const LATEST = 'latest.md'
export const HISTORY = 'history.jsonl'

/** The four player personas, in the order the report lists them; any other sim policy follows by name. */
export const PERSONAS = ['cautious', 'reckless', 'explorer', 'rusher']

/** The coverage kinds, as the history line names them (`quest` is the Worker's `quest-step`). */
export const KINDS = [
  { key: 'node', worker: 'node', label: 'nodes' },
  { key: 'quest', worker: 'quest-step', label: 'quest steps' },
  { key: 'enemy', worker: 'enemy', label: 'enemies' },
  { key: 'hazard', worker: 'hazard', label: 'hazards' },
  { key: 'item', worker: 'item', label: 'items' },
]

export function parseArgs(argv) {
  const opts = { build: null, breaks: null, repo: null, seed: 1, out: OUT_DIR, date: null, content: null, help: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '-h' || arg === '--help') { opts.help = true; continue }
    const m = /^--(build|breaks|repo|seed|out|date|content)(?:=(.*))?$/.exec(arg)
    if (!m) throw new Error(`unknown argument '${arg}'`)
    const value = m[2] ?? argv[++i]
    if (value === undefined || value === '' || value.startsWith('--')) throw new Error(`--${m[1]} needs a value`)
    if (m[1] === 'seed') {
      const n = Number(value)
      if (!Number.isInteger(n) || n < 0) throw new Error(`--seed must be a non-negative integer, not '${value}'`)
      opts.seed = n
    } else opts[m[1]] = value
  }
  if (opts.help) return opts
  if (!opts.build) throw new Error('--build <sha> is required')
  if (opts.date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) throw new Error(`--date must be YYYY-MM-DD, not '${opts.date}'`)
  return opts
}

/** Chapter 1's content: the CLI's `--json` form, run in the mechanics workspace. */
export function loadContent(file, spawn = spawnSync) {
  if (file) return JSON.parse(fs.readFileSync(file, 'utf-8'))
  const res = spawn('npm', ['run', '--silent', 'chapter1-content', '-w', 'axiomancer-mechanics', '--', '--json'], { cwd: ROOT, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 })
  if (res.status !== 0) throw new Error(`chapter1-content failed: ${String(res.stderr ?? '').trim().split('\n').slice(-3).join(' ') || `exit ${res.status}`}`)
  return JSON.parse(res.stdout)
}

/** The break lines of a file (every one, in order); a missing file or no path is no breaks. */
export function readBreakLines(file, { read = fs.readFileSync, exists = fs.existsSync } = {}) {
  if (!file || !exists(file)) return []
  const out = []
  for (const line of read(file, 'utf-8').split('\n')) {
    if (line.trim() === '') continue
    const b = JSON.parse(line)
    if (typeof b.key !== 'string' || typeof b.kind !== 'string' || typeof b.persona !== 'string') throw new Error(`not a break line: ${line.slice(0, 80)}`)
    out.push(b)
  }
  return out
}

/** The history lines of a file, oldest first. */
export function readHistory(text) {
  const out = []
  for (const line of text.split('\n')) if (line.trim() !== '') out.push(JSON.parse(line))
  return out
}

/** The ids Chapter 1 holds, per history kind. */
export function universeOf(content) {
  return {
    node: content.nodes.map((n) => n.id),
    quest: content.quests.flatMap((q) => q.steps.map((s) => `${q.id}/${s.stepId}`)),
    enemy: content.enemies.map((e) => e.id),
    hazard: content.hazards.map((h) => h.id),
    item: content.items.map((i) => i.id),
  }
}

const personaOrder = (id) => { const i = PERSONAS.indexOf(id); return i === -1 ? PERSONAS.length : i }
const byPersona = (a, b) => personaOrder(a) - personaOrder(b) || (a < b ? -1 : a > b ? 1 : 0)
const sum = (rows, key) => rows.reduce((n, r) => n + (r[key] ?? 0), 0)
const round1 = (n) => (n === null || n === undefined ? null : Math.round(n * 10) / 10)
const dash = (v) => (v === null || v === undefined ? '-' : v)
const pct = (n, d) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '-')
const short = (sha) => String(sha).slice(0, 8)

/** The sim's policies in the run-summary, personas first. */
export function policiesOf(runSummary) {
  return runSummary.summary.filter((r) => r.source === 'sim' && r.policyId).sort((a, b) => byPersona(a.policyId, b.policyId))
}

/** The night's numbers, computed from the four reports, the content and the break lines. Pure. */
export function buildFacts({ build, date, seed, runSummary, runEnds, runPacing, coverage, content, breaks }) {
  const policies = policiesOf(runSummary)
  const ids = policies.map((p) => p.policyId)
  const breakCount = (id) => breaks.filter((b) => b.persona === id).length
  const personas = {}
  for (const p of policies) {
    personas[p.policyId] = {
      runs: p.runs, chapterClear: p.chapterClear, runOver: p.runOver, open: p.open,
      avgLevel: round1(p.avgLevel), avgVitaeEnd: round1(p.avgVitaeEnd), breaks: breakCount(p.policyId),
    }
  }
  const counts = policies.map((p) => p.runs)
  const runsPerPersona = counts.length === 0 ? 0 : Math.max(...counts)

  const universe = universeOf(content)
  const reached = Object.fromEntries(KINDS.map(({ key, worker }) => {
    const seen = new Set(coverage.coverage.filter((r) => r.source === 'sim' && r.kind === worker && r.count > 0).map((r) => r.id))
    return [key, universe[key].filter((id) => seen.has(id))]
  }))
  return {
    build, date, seed, runsPerPersona, ids, personas, reached, universe, content, breaks,
    summaryRows: Object.fromEntries(policies.map((p) => [p.policyId, p])),
    ends: runEnds.ends.filter((r) => r.source === 'sim'),
    pacing: runPacing.pacing.filter((r) => r.source === 'sim'),
    coverage: coverage.coverage.filter((r) => r.source === 'sim'),
  }
}

/** The history line (Contracts): the part of the facts that outlives the Worker's rows. */
export function historyLine(f) {
  return { date: f.date, commit: f.build, runsPerPersona: f.runsPerPersona, seed: f.seed, personas: f.personas, reached: f.reached }
}

function mdTable(head, rows) {
  const line = (cells) => `| ${cells.join(' | ')} |`
  return [line(head), line(head.map(() => '---')), ...rows.map((r) => line(r.map(String)))].join('\n')
}

const list = (ids) => (ids.length === 0 ? 'none' : ids.map((id) => `\`${id}\``).join(', '))

/** What the issue lookup says about one break key, as a short cell. */
export function issueCell(issue, date) {
  if (!issue) return 'no issue found'
  const link = `[#${issue.number}](${issue.html_url})`
  if (issue.state === 'open') {
    if (issue.state_reason === 'reopened') return `${link} reopened`
    return String(issue.created_at ?? '').slice(0, 10) === date ? `${link} new` : `${link} already open`
  }
  return `${link} closed${issue.state_reason === 'not_planned' ? ' as not planned' : ''}`
}

function runHealth(f, issues) {
  const out = ['## Run health', '']
  if (f.ids.length === 0) out.push('No sim runs at this build reached the Worker.', '')
  else {
    out.push(mdTable(['persona', 'runs', 'ended', 'still open', 'breaks'], f.ids.map((id) => {
      const p = f.personas[id]
      return [id, p.runs, p.runs - p.open, p.open, p.breaks]
    })), '')
  }
  out.push('Ended = reached run-over, a chapter clear or a reset; breaks are the night\'s break lines (a crash, a stuck run or fight, a quest no road can finish, a node left unresolved).', '')
  const seen = new Set()
  const rows = []
  for (const b of f.breaks) {
    if (seen.has(b.key)) continue
    seen.add(b.key)
    const where = b.state?.map && b.state?.node ? `${b.state.map}/${b.state.node}` : '-'
    rows.push([`\`${b.key}\``, b.kind, b.persona, where, b.seed, issues === null ? 'not looked up' : issueCell(issues.get(b.key), f.date)])
  }
  out.push('Breaks of the night:', '')
  out.push(rows.length === 0 ? 'None.' : mdTable(['key', 'kind', 'persona', 'node', 'seed', 'issue'], rows))
  return out
}

/** Per region: nodes resolved per run, level and VITAE at its last node, rests and withdrawals per run. */
export function regionPacing(f, id) {
  const runs = f.personas[id]?.runs ?? 0
  const rows = f.pacing.filter((r) => r.policyId === id)
  const cov = f.coverage.filter((r) => r.policyId === id && r.kind === 'node')
  return f.content.regions.map((region) => {
    const nodes = new Set(region.nodeIds)
    const here = rows.filter((r) => nodes.has(r.nodeId))
    const last = here.filter((r) => r.avgResolvedBefore !== null && r.avgResolvedBefore !== undefined)
      .sort((a, b) => b.avgResolvedBefore - a.avgResolvedBefore)[0] ?? null
    const per = (n) => (runs > 0 ? round1(n / runs) : null)
    return {
      index: region.index, nodes: region.nodeIds.length,
      resolved: per(sum(cov.filter((r) => nodes.has(r.id)), 'cleared')),
      level: round1(last?.avgLevel), vitae: round1(last?.avgVitae),
      rests: per(sum(here, 'rests')), withdrawals: per(sum(here, 'withdrawals')),
    }
  })
}

function pacing(f) {
  const out = ['## Pacing', '']
  if (f.ids.length === 0) return [...out, 'No sim runs at this build.']
  for (const id of f.ids) {
    out.push(`### ${id}`, '')
    const ends = f.ends.filter((r) => r.policyId === id).sort((a, b) => b.runs - a.runs || ((a.endNodeId ?? '') < (b.endNodeId ?? '') ? -1 : 1))
    out.push('Where closed runs ended, most first:', '')
    out.push(ends.length === 0 ? 'No closed runs.' : mdTable(['ended at', 'runs', 'run-over', 'clear', 'avg level', 'avg VITAE'],
      ends.map((r) => [r.endNodeId ?? 'off the map', r.runs, r.runOver, r.chapterClear, dash(r.avgLevel), dash(r.avgVitaeEnd)])))
    out.push('', 'By region, in story order (per run; level and VITAE are the player after resolving the region\'s last node on average):', '')
    out.push(mdTable(['region', 'nodes', 'resolved', 'level', 'VITAE', 'rests', 'withdrawals'],
      regionPacing(f, id).map((r) => [r.index, r.nodes, dash(r.resolved), dash(r.level), dash(r.vitae), dash(r.rests), dash(r.withdrawals)])), '')
  }
  return out.slice(0, -1)
}

function difficulty(f) {
  const out = ['## How hard is Chapter 1', '', 'Plain numbers, never a test or a bar: chapter clears over runs, and the average level and VITAE at the end.', '']
  if (f.ids.length === 0) return [...out, 'No sim runs at this build.']
  out.push(mdTable(['persona', 'runs', 'clears', 'clear rate', 'avg end level', 'avg end VITAE'], f.ids.map((id) => {
    const p = f.personas[id]
    return [id, p.runs, p.chapterClear, pct(p.chapterClear, p.runs), dash(p.avgLevel), dash(p.avgVitaeEnd)]
  })))
  return out
}

/** Every id of a kind reached in any night the history holds, tonight's line included. */
export function everReached(history, tonight, key) {
  const ever = new Set(tonight[key])
  for (const line of history) for (const id of line.reached?.[key] ?? []) ever.add(id)
  return ever
}

function coverageSection(f, history) {
  const out = ['## Coverage', '', 'What the night\'s runs reached of Chapter 1, against what the chapter holds (a node counts when entered, a quest step when taken, a foe when fought).', '']
  const rows = KINDS.map(({ key, label }) => {
    const total = f.universe[key].length
    const ever = everReached(history, f.reached, key)
    return [label, total, f.reached[key].length, pct(f.reached[key].length, total), f.universe[key].filter((id) => ever.has(id)).length]
  })
  out.push(mdTable(['kind', 'in Chapter 1', 'reached tonight', 'of all', 'reached on any night on record'], rows), '')
  out.push('Not reached tonight:', '')
  for (const { key, label } of KINDS) {
    const tonight = new Set(f.reached[key])
    out.push(`- ${label}: ${list(f.universe[key].filter((id) => !tonight.has(id)))}`)
  }
  out.push('', `Not reached on any night on record (${history.length + 1} night${history.length === 0 ? '' : 's'} counting tonight):`, '')
  for (const { key, label } of KINDS) {
    const ever = everReached(history, f.reached, key)
    out.push(`- ${label}: ${list(f.universe[key].filter((id) => !ever.has(id)))}`)
  }
  return out
}

function sinceLast(f, history) {
  const out = ['## Since the last report', '']
  const prev = history[history.length - 1]
  if (!prev) return [...out, 'First report: there is no earlier line to set tonight against.']
  out.push(`Last line: ${prev.date} at ${short(prev.commit)}; this report: ${f.date} at ${short(f.build)}.`, '')
  const ids = [...new Set([...Object.keys(prev.personas ?? {}), ...f.ids])].sort(byPersona)
  const cell = (p, fn) => (p ? fn(p) : '-')
  const rate = (p) => pct(p.chapterClear, p.runs)
  const pair = (a, b, fn) => `${cell(a, fn)} to ${cell(b, fn)}`
  out.push(mdTable(['persona', 'clear rate', 'end level', 'end VITAE', 'breaks'], ids.map((id) => {
    const a = prev.personas?.[id]
    const b = f.personas[id]
    return [id, pair(a, b, rate), pair(a, b, (p) => dash(p.avgLevel)), pair(a, b, (p) => dash(p.avgVitaeEnd)), pair(a, b, (p) => p.breaks)]
  })))
  return out
}

/** The whole `latest.md`. */
export function renderReport(f, history, issues = null) {
  const stamp = `> measured at ${short(f.build)}, ${f.date}, ${f.runsPerPersona} run${f.runsPerPersona === 1 ? '' : 's'} per persona, seed ${f.seed}`
  return [
    '<!-- Generated by scripts/sim-report.mjs (npm run sim:report) from the sim-runs workflow; do not edit by hand. -->',
    '# Sim report',
    '',
    stamp,
    '',
    ...runHealth(f, issues), '',
    ...pacing(f), '',
    ...difficulty(f), '',
    ...coverageSection(f, history), '',
    ...sinceLast(f, history), '',
  ].join('\n')
}

/** Issue lookup for the break keys; null when there is no repo or no break, and a thrown lookup only costs the links. */
export function lookupIssues(breaks, repo, gh, warn) {
  if (breaks.length === 0 || !repo) return null
  try {
    return indexIssues(gh, repo)
  } catch (err) {
    warn(`sim-report: issue lookup failed, the report has no issue links (${err.message})\n`)
    return null
  }
}

/** Run the CLI. Returns the exit code; writes to the given streams and, last, to the report files. */
export async function main(argv, {
  env = process.env, envFile = ENV_FILE, fetchImpl = fetch, stdout = process.stdout, stderr = process.stderr,
  gh = runGh, now = () => new Date(), content = loadContent, cwd = ROOT,
} = {}) {
  let opts
  try {
    opts = parseArgs(argv)
  } catch (err) {
    stderr.write(`sim-report: ${err.message}\n${USAGE}\n`)
    return 2
  }
  if (opts.help) { stdout.write(`${USAGE}\n`); return 0 }

  const resolved = resolveConfig(env, envFile)
  if (resolved.missing) {
    stderr.write(`sim-report: ${resolved.missing.join(' and ')} ${resolved.missing.length > 1 ? 'are' : 'is'} not set (export it, or add it to ${envFile})\n`)
    return 2
  }

  const outDir = path.resolve(cwd, opts.out)
  let text
  let line
  try {
    const read = (report) => fetchReport(resolved.config, { report, build: opts.build, source: 'sim' }, fetchImpl)
    const [runSummary, runEnds, runPacing, coverage] = await Promise.all(['run-summary', 'run-ends', 'run-pacing', 'coverage'].map(read))
    const chapter = content(opts.content)
    const breaks = readBreakLines(opts.breaks)
    const date = opts.date ?? now().toISOString().slice(0, 10)
    const historyFile = path.join(outDir, HISTORY)
    const history = fs.existsSync(historyFile) ? readHistory(fs.readFileSync(historyFile, 'utf-8')) : []
    const facts = buildFacts({ build: opts.build, date, seed: opts.seed, runSummary, runEnds, runPacing, coverage, content: chapter, breaks })
    const issues = lookupIssues(breaks, opts.repo ?? env.GITHUB_REPOSITORY, gh, (m) => stderr.write(m))
    text = renderReport(facts, history, issues)
    line = JSON.stringify(historyLine(facts))
  } catch (err) {
    stderr.write(`sim-report: ${err.message}\n`)
    return 1
  }

  try {
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, LATEST), text)
    fs.appendFileSync(path.join(outDir, HISTORY), `${line}\n`)
  } catch (err) {
    stderr.write(`sim-report: could not write ${outDir}: ${err.message}\n`)
    return 1
  }
  stdout.write(`sim-report: wrote ${path.join(opts.out, LATEST)} and appended one line to ${path.join(opts.out, HISTORY)} (build ${short(opts.build)})\n`)
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2))
}
