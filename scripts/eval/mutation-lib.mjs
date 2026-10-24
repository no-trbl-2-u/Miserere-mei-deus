// scripts/eval/mutation-lib.mjs
//
// Pure parts of the mutation scores (phase EV1c, brief A5): per-file tallies
// from a Stryker JSON report, the survived-mutant listing, the report
// section and a marker splice shared by the EV1c sections. No I/O here;
// `scripts/eval/mutation.mjs` runs Stryker.
//
// The score is Stryker's own: killed plus timed-out mutants over every
// mutant that compiled and ran, uncovered ones included. A measurement,
// not a gate: nothing here fails on a number.

export const SECTION_START = '<!-- eval:mutation:start -->'
export const SECTION_END = '<!-- eval:mutation:end -->'

/** Statuses that count as detected. */
const DETECTED = new Set(['Killed', 'Timeout'])
/** Statuses outside the denominator: the mutant never ran as code. */
const INVALID = new Set(['CompileError', 'RuntimeError', 'Ignored', 'Pending'])

/**
 * Tallies one file's mutants.
 *
 * @param {{ status: string }[]} mutants the file's mutants from the report.
 * @returns {{ total: number, killed: number, timeout: number, survived: number, noCoverage: number, invalid: number, score: number|null }} counts and the score in percent (one decimal), null with no valid mutant.
 * @example tallyMutants([{ status: 'Killed' }, { status: 'Survived' }]).score // 50
 */
export function tallyMutants(mutants) {
  const count = (s) => mutants.filter((m) => m.status === s).length
  const invalid = mutants.filter((m) => INVALID.has(m.status)).length
  const detected = mutants.filter((m) => DETECTED.has(m.status)).length
  const valid = mutants.length - invalid
  return {
    total: mutants.length,
    killed: count('Killed'),
    timeout: count('Timeout'),
    survived: count('Survived'),
    noCoverage: count('NoCoverage'),
    invalid,
    score: valid === 0 ? null : Math.round((detected / valid) * 1000) / 10,
  }
}

/**
 * Per-file tallies and the survivors of one Stryker JSON report.
 *
 * @param {{ files: Record<string, { mutants: object[] }> }} report a `mutation-testing-report-schema` report.
 * @param {string} prefix the workspace prefix that makes a report path repo-relative.
 * @returns {{ files: { path: string, tally: object }[], survivors: { path: string, line: number, mutator: string, replacement: string, status: string }[] }} the summary.
 */
export function summarizeReport(report, prefix) {
  const files = []
  const survivors = []
  for (const [raw, file] of Object.entries(report?.files ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const norm = raw.replace(/\\/g, '/')
    const at = norm.lastIndexOf(`/${prefix}`)
    const path = at >= 0 ? norm.slice(at + 1) : `${prefix}${norm}`
    files.push({ path, tally: tallyMutants(file.mutants) })
    for (const m of file.mutants) {
      if (m.status !== 'Survived' && m.status !== 'NoCoverage') continue
      survivors.push({ path, line: m.location?.start?.line ?? 0, mutator: m.mutatorName, replacement: oneLine(m.replacement ?? ''), status: m.status })
    }
  }
  survivors.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line)
  return { files, survivors }
}

/**
 * Sums several tallies into one.
 *
 * @param {object[]} tallies results of `tallyMutants`.
 * @returns {object} the combined tally, score recomputed.
 */
export function combineTallies(tallies) {
  const sum = (k) => tallies.reduce((n, t) => n + t[k], 0)
  const t = { total: sum('total'), killed: sum('killed'), timeout: sum('timeout'), survived: sum('survived'), noCoverage: sum('noCoverage'), invalid: sum('invalid') }
  const valid = t.total - t.invalid
  return { ...t, score: valid === 0 ? null : Math.round(((t.killed + t.timeout) / valid) * 1000) / 10 }
}

/**
 * The last progress line Stryker printed, for a run stopped before its report.
 *
 * @param {string} output Stryker's console output.
 * @returns {{ tested: number, total: number, survived: number, timedOut: number }|null} the last counts, null when none printed.
 * @example parseProgress('Mutation testing 12% (elapsed: <1m, remaining: ~4m) 101/842 tested (17 survived, 0 timed out)').survived // 17
 */
export function parseProgress(output) {
  const all = [...String(output).matchAll(/(\d+)\/(\d+) tested \((\d+) survived, (\d+) timed out\)/g)]
  const last = all.at(-1)
  if (!last) return null
  return { tested: Number(last[1]), total: Number(last[2]), survived: Number(last[3]), timedOut: Number(last[4]) }
}

const oneLine = (s) => s.replace(/\s+/g, ' ').trim()
const cell = (s) => String(s).replace(/\|/g, '\\|')
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 3)}...` : s)

/**
 * The mutation section of `docs/reports/eval/latest.md`, markers included.
 *
 * @param {{ stamp: { commit: string, date: string }, targets: { name: string, cwd: string, mutate: string[], seconds: number, outcome: string, files: object[], survivors: object[] }[] }} mutation the run.
 * @param {number} [listLimit] survivors listed per target.
 * @returns {string} markdown.
 */
export function renderMutationSection(mutation, listLimit = 40) {
  const { stamp, targets } = mutation
  const out = [SECTION_START, '', '## Mutation scores (EV1c, A5)', '']
  out.push(`Stamp: commit \`${stamp.commit}\` (${stamp.date}). Regenerate with \`npm run eval:mutation\`; the data, with every survivor, is \`docs/reports/eval/mutation.json\`.`, '')
  out.push('StrykerJS mutates the named files and runs the workspace\'s own tests against each mutant, in a detached worktree. The score is killed plus timed-out mutants over every mutant that compiled, uncovered ones included. A survivor is a change to the code that no test noticed. Never part of `verify`.', '')
  out.push('| Target | Files | Mutants | Killed | Timed out | Survived | No coverage | Score | Run |', '|---|---|---|---|---|---|---|---|---|')
  for (const t of targets) {
    const c = t.partial
      ? { total: t.partial.total, killed: '-', timeout: t.partial.timedOut, survived: t.partial.survived, noCoverage: '-', score: null }
      : combineTallies(t.files.map((f) => f.tally))
    out.push(`| ${t.name} | ${t.files.length} | ${c.total} | ${c.killed} | ${c.timeout} | ${c.survived} | ${c.noCoverage} | ${c.score == null ? 'n/a' : `${c.score}%`} | ${t.outcome}, ${t.seconds}s |`)
  }
  out.push('', '### Per file', '', '| File | Mutants | Survived | No coverage | Score |', '|---|---|---|---|---|')
  for (const t of targets) {
    for (const f of t.files) out.push(`| ${f.path} | ${f.tally.total} | ${f.tally.survived} | ${f.tally.noCoverage} | ${f.tally.score == null ? 'n/a' : `${f.tally.score}%`} |`)
  }
  for (const t of targets) {
    out.push('', `### Survivors: ${t.name}`, '')
    if (t.survivors.length === 0) {
      out.push(t.outcome === 'ok' ? 'None.' : `No report (${t.outcome}).`)
      continue
    }
    const shown = t.survivors.slice(0, listLimit)
    out.push('| File:line | Mutator | Replacement | Status |', '|---|---|---|---|')
    for (const s of shown) out.push(`| ${s.path.split('/').pop()}:${s.line} | ${s.mutator} | \`${cell(clip(s.replacement, 70)).replace(/`/g, "'")}\` | ${s.status} |`)
    if (t.survivors.length > shown.length) out.push('', `${t.survivors.length - shown.length} more in \`mutation.json\`.`)
  }
  out.push('', SECTION_END)
  return out.join('\n')
}

/**
 * A report with one marked section replaced, or appended when absent.
 *
 * @param {string} existing the current `latest.md`.
 * @param {string} section the rendered section, markers included.
 * @param {string} start the section's start marker.
 * @param {string} end the section's end marker.
 * @returns {string} the whole file.
 * @example spliceMarked('a\n<!-- s -->x<!-- e -->', '<!-- s -->y<!-- e -->', '<!-- s -->', '<!-- e -->') // 'a\n<!-- s -->y<!-- e -->'
 */
export function spliceMarked(existing, section, start, end) {
  const a = existing.indexOf(start)
  const b = existing.indexOf(end)
  if (a < 0 || b < a) return `${existing.trimEnd()}\n\n${section}\n`
  return existing.slice(0, a) + section + existing.slice(b + end.length)
}

// --- Diff scoping for the PR mutation job (phase LG1g, brief A7) ------------

/** Marker that opens the PR comment, so a later run edits it in place. */
export const PR_MARKER = '<!-- eval:mutation-pr -->'

/**
 * The workspaces a PR's changed lines are mutated in, in run order: the
 * engine first, the app with whatever budget is left. `include` is matched
 * against the path inside the workspace; the engine's `src/CLI/` tools have
 * no tests, so every mutant there would only read as uncovered.
 */
export const PR_SCOPES = [
  { key: 'mechanics', name: 'mechanics', cwd: 'axiomancer-mechanics', config: 'scripts/eval/stryker/mechanics.config.mjs', include: /^src\/(?!CLI\/).+\.ts$/ },
  { key: 'mobile', name: 'mobile', cwd: 'axiomancer-mobile', config: 'scripts/eval/stryker/mobile.config.mjs', include: /^(app|components|hooks|lib|state|theme)\/.+\.tsx?$/ },
]

/** Test, fixture and declaration files: never mutated, whatever the scope. */
const NOT_SOURCE = /\.(test|spec)\.tsx?$|\.d\.ts$|(^|\/)(__tests__|__mocks__|test-utils|mocks)\//

/**
 * The added or modified lines of each file on the new side of a diff.
 *
 * @param {string} diff `git diff --unified=0` output.
 * @returns {Map<string, [number, number][]>} repo-relative path to 1-based inclusive line ranges, in diff order; a file with only deletions is absent.
 * @example parseChangedLines('+++ b/a.ts\n@@ -1,0 +2,3 @@\n').get('a.ts') // [[2, 4]]
 */
export function parseChangedLines(diff) {
  const changed = new Map()
  let file = null
  for (const line of String(diff).split('\n')) {
    if (line.startsWith('+++ ')) {
      const target = line.slice(4)
      file = target.startsWith('b/') ? target.slice(2) : null
      continue
    }
    const hunk = file && line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/)
    if (!hunk) continue
    const start = Number(hunk[1])
    const count = hunk[2] === undefined ? 1 : Number(hunk[2])
    if (count === 0) continue
    if (!changed.has(file)) changed.set(file, [])
    changed.get(file).push([start, start + count - 1])
  }
  return changed
}

/**
 * The Stryker `mutate` line ranges each workspace gets from a PR's changed
 * lines. A workspace with no changed source is left out.
 *
 * @param {Map<string, [number, number][]>} changed the result of `parseChangedLines`.
 * @param {typeof PR_SCOPES} [scopes] the workspaces, in run order.
 * @returns {{ key: string, name: string, cwd: string, config: string, mutate: string[], files: number, lines: number }[]} one entry per workspace with work to do.
 * @example scopeChangedLines(new Map([['axiomancer-mechanics/src/a.ts', [[3, 5]]]]))[0].mutate // ['src/a.ts:3-5']
 */
export function scopeChangedLines(changed, scopes = PR_SCOPES) {
  const out = []
  for (const scope of scopes) {
    const prefix = `${scope.cwd}/`
    const mutate = []
    let files = 0
    let lines = 0
    for (const [path, ranges] of [...changed].sort(([a], [b]) => a.localeCompare(b))) {
      if (!path.startsWith(prefix)) continue
      const rel = path.slice(prefix.length)
      if (!scope.include.test(rel) || NOT_SOURCE.test(rel)) continue
      files++
      for (const [a, b] of ranges) {
        mutate.push(`${rel}:${a}-${b}`)
        lines += b - a + 1
      }
    }
    if (mutate.length === 0) continue
    const { include, ...rest } = scope
    out.push({ ...rest, mutate, files, lines })
  }
  return out
}

/**
 * A run outcome fit for a table cell: colour codes stripped, and Stryker's
 * refusal to run with no related test said plainly.
 *
 * @param {string} outcome a `runTarget` outcome.
 * @returns {string} the outcome as the PR comment shows it.
 * @example prOutcome('failed (exit 1): ERROR Stryker No tests were executed.') // 'no test relates to these lines'
 */
export function prOutcome(outcome) {
  const plain = String(outcome).replace(/\x1b\[[0-9;]*m/g, '')
  return /No tests were executed/.test(plain) ? 'no test relates to these lines' : plain
}

/**
 * The PR comment and job summary for one mutation run on changed lines.
 *
 * @param {{ base: string, head: string, budgetSeconds: number, targets: { name: string, files: number|object[], lines?: number, seconds: number, outcome: string, partial?: object|null, survivors: object[] }[] }} run the run; `targets` empty when no source line changed.
 * @param {number} [listLimit] survivors listed per workspace.
 * @returns {string} markdown, opening with `PR_MARKER`.
 */
export function renderPrReport(run, listLimit = 30) {
  const { base, head, budgetSeconds, targets } = run
  const out = [PR_MARKER, '## Mutation on changed lines (report only)', '']
  out.push(`Base \`${base.slice(0, 8)}\`, head \`${head.slice(0, 8)}\`, budget ${Math.round(budgetSeconds / 60)} min. StrykerJS mutates only the lines this PR adds or changes and runs the workspace's related tests against each mutant. A survivor is a change to those lines that no test noticed. This job never fails a check; the score has no per-diff baseline yet.`, '')
  if (targets.length === 0) {
    out.push('No changed source line in `axiomancer-mechanics/src` or the `axiomancer-mobile` app folders, so nothing was mutated.')
    return out.join('\n')
  }
  out.push('| Workspace | Lines | Mutants | Killed | Timed out | Survived | No coverage | Score | Run |', '|---|---|---|---|---|---|---|---|---|')
  for (const t of targets) {
    const ran = Array.isArray(t.files) && t.files.length > 0
    const c = ran ? combineTallies(t.files.map((f) => f.tally)) : null
    const p = t.partial
    const n = (v) => (c ? v : '-')
    const score = c?.score != null ? `${c.score}%` : c?.total > 0 ? 'n/a (all static or ignored)' : 'n/a'
    out.push(`| ${t.name} | ${t.lines ?? '-'} | ${c ? c.total : p ? p.total : '-'} | ${n(c?.killed)} | ${c ? c.timeout : p ? p.timedOut : '-'} | ${c ? c.survived : p ? p.survived : '-'} | ${n(c?.noCoverage)} | ${score} | ${cell(prOutcome(t.outcome))}, ${t.seconds}s |`)
  }
  for (const t of targets) {
    if (t.survivors.length === 0) continue
    out.push('', `### Survivors: ${t.name}`, '')
    const shown = t.survivors.slice(0, listLimit)
    out.push('| File:line | Mutator | Replacement | Status |', '|---|---|---|---|')
    for (const s of shown) out.push(`| \`${s.path}:${s.line}\` | ${s.mutator} | \`${cell(clip(s.replacement, 70)).replace(/`/g, "'")}\` | ${s.status} |`)
    if (t.survivors.length > shown.length) out.push('', `${t.survivors.length - shown.length} more in the job's log.`)
  }
  return out.join('\n')
}
