#!/usr/bin/env node
// scripts/pr-partition.mjs
//
// The review manifest: how one PR's diff is split between the Sonnet
// sub-agents `skills/review.md` spawns (phase RV3, D95). The three fixed
// lenses of phase RV1c (Rules, Tests, Blast radius) gave every PR the same
// three readers whatever it changed; this derives the readers from the diff
// instead. Each changed source file is clustered by the module it lives in,
// each cluster's consumers come from the reverse-import closure of the
// repo's own sources, and each cluster becomes one assignment: the files
// it owns, the consumers it owns, a "do not report" list of every other
// assignment's files, and the defect class the escape ledger says that
// module leaks (`docs/reports/eval/ledger.json`, Part 1 of
// `docs/reports/pr-review-research.md`). The Tests lens stays whole (it
// reads the PR body and the test files, not a module) and a control
// adversary reads the whole diff unpartitioned, so the replay can tell
// whether the partition finds more than one strong reader does.
//
//   node scripts/pr-partition.mjs --pr <n>                       # the PR's manifest, as Markdown for the skill
//   node scripts/pr-partition.mjs --pr <n> --json                # the same as JSON
//   node scripts/pr-partition.mjs --files a,b,c --tier risk:high # a manifest for a file list (replays, tests)
//
// Bounds: the agent count is capped by tier (`MAX_AGENTS`) and each
// assignment's reading list by `CHAR_CEILING` characters of owned source,
// so a wide diff gets more readers than a narrow one and no reader gets
// more than it can hold. The pure parts (`buildReverseGraph`, `partition`,
// `renderManifest`) read nothing; only `main` touches git and `gh`.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { isLowPath } from './pr-risk.mjs'

/**
 * The repository root. The review job runs main's copy of this file from
 * `.review-tooling/scripts/`, so the root is git's toplevel from the file's
 * own directory, not a fixed `..`.
 */
export const ROOT = (() => {
  const here = dirname(fileURLToPath(import.meta.url))
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: here, encoding: 'utf8' }).trim()
  } catch {
    return resolve(here, '..')
  }
})()

/** Assignments per tier, not counting the Tests lens and the control adversary. */
export const MAX_AGENTS = Object.freeze({ 'risk:low': 2, 'risk:medium': 4, 'risk:high': 7 })

/** Characters of owned source (changed files plus consumers) one assignment may carry. */
export const CHAR_CEILING = 120_000

/** A cluster under this many characters with no consumers folds into its package's next cluster. */
export const MIN_CHARS = 8_000

/** Consumers listed per assignment; the rest are counted, not named. */
export const CONSUMER_CAP = 40

/** How many import hops the reverse closure follows. */
export const CLOSURE_DEPTH = 2

/** Source files the graph reads; everything else is a leaf. */
export const SOURCE_RE = /\.(m?js|tsx?)$/

/** Test files: the Tests lens reads them; they are never a consumer an assignment owns. */
export const TEST_RE = /\.test\.|__tests__|\.spec\./

const EXTS = ['', '.ts', '.tsx', '.mjs', '.js', '/index.ts', '/index.tsx', '/index.mjs', '/index.js']

/**
 * The defect classes the escape ledger names, keyed by the module kind that
 * leaked them (research report Part 1, "What escaped, by cause"). Each hunt
 * is the one question the assignment is told to ask first.
 */
export const DEFECT_CLASSES = Object.freeze({
  'ui-layout': {
    hunt: 'a layout constant, callout or pill wrong at a viewport or state no test renders: read every size, inset, breakpoint and conditional render the diff touches against the 375 and 1280 widths and the PR\'s screenshots (D2, D3, #535, #555, #557)',
  },
  'rules-logic': {
    hunt: 'presenter or rules logic that applies one thing while the printed card, keyword, price or tooltip says another, a status set and never cleared, a guard inverted, a rider or modifier a branch ignores (D1 `riderPairs`, #562 scar never mends): read `docs/game-model.md` and `docs/card-spec.md` for every printed value the diff touches',
  },
  'tooling-uncovered': {
    hunt: 'loop tooling that no `verify-*` workflow runs: a script, hook or workflow step that cannot run as written, a merge or union rule that moves rows (D4 `pr-resolve`), a condition that is always false; run the test beside each touched script (`node --test scripts/<name>.test.mjs`) and report a changed script with no test in the diff',
  },
  'units-labels': {
    hunt: 'a unit or label wrong on its face: a price that does not read SHILLINGS, a number printed in the wrong unit, two controls with the same accessibility label, a card text that no longer matches its effect (#531, #541, #559)',
  },
  'saves-schema': {
    hunt: 'a field removed or renamed in a save, an event shape, a JSON report or a marker that an older reader or writer still expects, with no migration',
  },
})

/**
 * The defect class a path's module leaks, by the ledger's classes.
 *
 * @param {string} path a repo-relative path.
 * @returns {keyof typeof DEFECT_CLASSES} the class.
 * @example defectClassFor('axiomancer-mobile/components/combat/x.tsx') // 'ui-layout'
 */
export function defectClassFor(path) {
  if (/^(scripts|skills|\.github|\.claude)\//.test(path) || /^axiomancer-(mobile|mechanics)\/(scripts|automation)\//.test(path)) return 'tooling-uncovered'
  if (/save|persist|storage|migrat|schema/i.test(path)) return 'saves-schema'
  if (/^axiomancer-mobile\/(components|app|theme)\//.test(path)) return 'ui-layout'
  if (/^axiomancer-mechanics\/content\/|\/cards\/|card-spec|pricing/i.test(path)) return 'units-labels'
  return 'rules-logic'
}

/**
 * The module a path belongs to: the directory level the ledger clusters
 * leaks at (`axiomancer-mobile/state/presenters`, `axiomancer-mechanics/src/Combat`,
 * `scripts`, `.github/workflows`).
 *
 * @param {string} path a repo-relative path.
 * @returns {string} the cluster key.
 * @example clusterKey('axiomancer-mechanics/src/Combat/effects.ts') // 'axiomancer-mechanics/src/Combat'
 */
export function clusterKey(path) {
  const parts = path.split('/')
  if (parts[0] === 'axiomancer-mechanics' || parts[0] === 'axiomancer-mobile') {
    const depth = parts[1] === 'src' ? 3 : 3
    return parts.slice(0, Math.min(depth, parts.length - 1)).join('/') || parts[0]
  }
  if (parts[0] === '.github' || parts[0] === '.claude') return parts.slice(0, Math.min(2, parts.length - 1)).join('/')
  return parts.length > 1 ? parts[0] : '(root)'
}

/**
 * Every import specifier a source file names.
 *
 * @param {string} text the file.
 * @returns {string[]} the specifiers, in order, duplicates kept.
 * @example importSpecifiers("import a from './a'\nconst b = require('./b')") // ['./a', './b']
 */
export function importSpecifiers(text) {
  const out = []
  const re = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*|^\s*import\s+)['"]([^'"\n]+)['"]/gm
  for (const m of text.matchAll(re)) out.push(m[1])
  return out
}

/**
 * The repo path an import specifier resolves to, or null for a package.
 *
 * @param {string} from the importing file's repo-relative path.
 * @param {string} spec the specifier.
 * @param {Set<string>} files every source path in the repo.
 * @returns {string | null} the imported file's repo-relative path.
 * @example resolveImport('axiomancer-mobile/a/b.tsx', '@/c/d', new Set(['axiomancer-mobile/c/d.ts'])) // 'axiomancer-mobile/c/d.ts'
 */
export function resolveImport(from, spec, files) {
  let base
  if (spec.startsWith('.')) base = posix.normalize(posix.join(posix.dirname(from), spec))
  else if (spec === '@mechanics' || spec === 'axiomancer-mechanics') base = 'axiomancer-mechanics/src/index'
  else if (spec.startsWith('@mechanics/')) base = `axiomancer-mechanics/src/${spec.slice('@mechanics/'.length)}`
  else if (spec.startsWith('axiomancer-mechanics/')) base = `axiomancer-mechanics/src/${spec.slice('axiomancer-mechanics/'.length)}`
  else if (spec.startsWith('@/')) base = `${from.split('/')[0]}/${spec.slice(2)}`
  else return null
  const stems = [base]
  if (/\.(js|mjs)$/.test(base)) stems.push(base.replace(/\.(js|mjs)$/, ''))
  for (const stem of stems) for (const ext of EXTS) if (files.has(stem + ext)) return stem + ext
  return null
}

/**
 * Reverse import edges: for each file, the files that import it.
 *
 * @param {Map<string, string>} sources repo-relative path to file text.
 * @returns {Map<string, string[]>} importers per path, sorted.
 * @example buildReverseGraph(new Map([['a.ts', "import './b'"], ['b.ts', '']])).get('b.ts') // ['a.ts']
 */
export function buildReverseGraph(sources) {
  const files = new Set(sources.keys())
  const rev = new Map()
  for (const [path, text] of sources) {
    for (const spec of new Set(importSpecifiers(text))) {
      const target = resolveImport(path, spec, files)
      if (!target || target === path) continue
      if (!rev.has(target)) rev.set(target, new Set())
      rev.get(target).add(path)
    }
  }
  return new Map([...rev].map(([k, v]) => [k, [...v].sort()]))
}

/**
 * The reverse-import closure of a set of files, to `depth` hops, excluding
 * the set itself. Each consumer carries the hop it was found at and the
 * changed file it reaches.
 *
 * @param {string[]} changed the changed source paths.
 * @param {Map<string, string[]>} reverse from `buildReverseGraph`.
 * @param {number} [depth] hops to follow.
 * @returns {Map<string, { hop: number, via: string }>} consumer path to how it was reached.
 */
export function reverseClosure(changed, reverse, depth = CLOSURE_DEPTH) {
  const seen = new Map()
  const origin = new Set(changed)
  let frontier = changed.map((p) => ({ path: p, via: p }))
  for (let hop = 1; hop <= depth && frontier.length; hop++) {
    const next = []
    for (const { path, via } of frontier) {
      for (const importer of reverse.get(path) ?? []) {
        if (origin.has(importer) || seen.has(importer) || TEST_RE.test(importer)) continue
        seen.set(importer, { hop, via })
        next.push({ path: importer, via })
      }
    }
    frontier = next
  }
  return seen
}

/**
 * Which changed files leaked a defect before, from the escape ledger: the
 * count of ledger PRs with a post-merge follow-up that changed each file.
 *
 * @param {{ rows?: { files: string[], followUps?: unknown[] }[] }} ledger `docs/reports/eval/ledger.json`.
 * @returns {Map<string, number>} path to count, leaky files only.
 * @example leakyFiles({ rows: [{ files: ['a.ts'], followUps: [{}] }] }).get('a.ts') // 1
 */
export function leakyFiles(ledger) {
  const out = new Map()
  for (const row of ledger?.rows ?? []) {
    if (!row.followUps?.length) continue
    for (const f of row.files ?? []) {
      if (!SOURCE_RE.test(f) || /\.test\.|__tests__/.test(f)) continue
      out.set(f, (out.get(f) ?? 0) + 1)
    }
  }
  return out
}

function splitByCeiling(cluster, size) {
  const parts = []
  let cur = { ...cluster, changed: [], consumers: [], chars: 0 }
  for (const f of cluster.changed) {
    const n = size(f)
    if (cur.changed.length && cur.chars + n > CHAR_CEILING) {
      parts.push(cur)
      cur = { ...cluster, changed: [], consumers: [], chars: 0 }
    }
    cur.changed.push(f)
    cur.chars += n
  }
  parts.push(cur)
  return parts
}

/**
 * The manifest: one assignment per cluster of changed source files, the
 * Tests lens, and the control adversary.
 *
 * @param {{ changed: { path: string, additions?: number, deletions?: number }[], tier: string, labels?: string[], reverse: Map<string, string[]>, sizes?: Map<string, number>, leaks?: Map<string, number>, pr?: number | string | null, head?: string | null }} input the diff facts.
 * @returns {{ tier: string, max: number, agents: object[], tests: object, control: object | null, records: string[], unpartitioned: string[] }} the manifest.
 */
export function partition({ changed, tier, labels = [], reverse, sizes = new Map(), leaks = new Map(), pr = null, head = null }) {
  const max = MAX_AGENTS[tier] ?? MAX_AGENTS['risk:medium']
  const size = (f) => sizes.get(f) ?? 2_000
  const lines = Object.fromEntries(changed.map((c) => [c.path, c.additions == null && c.deletions == null ? null : (c.additions ?? 0) + (c.deletions ?? 0)]))
  const records = changed.map((c) => c.path).filter((p) => isLowPath(p))
  const source = changed.map((c) => c.path).filter((p) => !isLowPath(p) && SOURCE_RE.test(p) && !TEST_RE.test(p))
  const other = changed.map((c) => c.path).filter((p) => !isLowPath(p) && !source.includes(p) && !TEST_RE.test(p))

  // 1. One cluster per module.
  const byKey = new Map()
  for (const p of source) {
    const key = clusterKey(p)
    if (!byKey.has(key)) byKey.set(key, { key, changed: [], consumers: [], chars: 0 })
    const c = byKey.get(key)
    c.changed.push(p)
    c.chars += size(p)
  }
  let clusters = [...byKey.values()].flatMap((c) => (c.chars > CHAR_CEILING ? splitByCeiling(c, size) : [c]))

  // 2. Consumers: each consumer belongs to the cluster of the changed file it reaches.
  const closure = reverseClosure(source, reverse)
  for (const [consumer, { hop, via }] of closure) {
    const c = clusters.find((k) => k.changed.includes(via))
    if (c) c.consumers.push({ path: consumer, hop, via })
  }
  for (const c of clusters) {
    c.consumers.sort((a, b) => a.hop - b.hop || a.path.localeCompare(b.path))
    c.weight = c.changed.reduce((n, f) => n + (lines[f] ?? 0), 0) + c.consumers.length
  }

  // 3. Merge the smallest clusters (by characters) until the tier's cap holds (same package
  //    first), and fold a sliver (under MIN_CHARS, no consumers) into its
  //    package's next cluster: a reader for one small file is a wasted spawn.
  const pkg = (k) => k.split('/')[0]
  const fold = (a, mate) => {
    mate.key = `${mate.key} + ${a.key}`
    mate.changed.push(...a.changed)
    mate.consumers.push(...a.consumers)
    mate.chars += a.chars
    mate.weight += a.weight
    clusters = clusters.filter((c) => c !== a)
  }
  while (clusters.length > max) {
    clusters.sort((a, b) => a.chars - b.chars || a.weight - b.weight)
    const a = clusters[0]
    const rest = clusters.slice(1)
    const fits = (c) => c.chars + a.chars <= CHAR_CEILING
    // The cap wins over the ceiling only when no mate under the ceiling
    // exists; the fold is then marked so the reader is told its list is long.
    const mate = rest.find((c) => pkg(c.key) === pkg(a.key) && fits(c)) ?? rest.find(fits)
      ?? rest.find((c) => pkg(c.key) === pkg(a.key)) ?? rest[0]
    if (!fits(mate)) mate.overCeiling = true
    fold(a, mate)
  }
  for (;;) {
    clusters.sort((a, b) => a.weight - b.weight)
    const sliver = clusters.find((c) => c.chars < MIN_CHARS && c.consumers.length === 0 && clusters.some((o) => o !== c && pkg(o.key) === pkg(c.key) && o.chars + c.chars <= CHAR_CEILING))
    if (!sliver) break
    fold(sliver, clusters.find((o) => o !== sliver && pkg(o.key) === pkg(sliver.key) && o.chars + sliver.chars <= CHAR_CEILING))
  }
  clusters.sort((a, b) => b.weight - a.weight)

  // 4. Assignments.
  const allSource = source
  const agents = clusters.map((c, i) => {
    const classes = [...new Set(c.changed.map(defectClassFor))]
    // Consumers fill what the ceiling leaves after the owned changed files,
    // nearest hop first; a barrel export's whole app of importers is
    // counted, not read.
    let budget = Math.max(0, CHAR_CEILING - c.chars)
    const kept = []
    for (const k of c.consumers) {
      if (kept.length >= CONSUMER_CAP) break
      const n = size(k.path)
      if (n > budget) continue
      kept.push(k)
      budget -= n
    }
    return {
      id: `a${i + 1}`,
      module: c.key,
      defectClass: classes[0],
      alsoClasses: classes.slice(1),
      hunt: DEFECT_CLASSES[classes[0]].hunt,
      changed: c.changed.map((f) => ({ path: f, lines: lines[f] ?? null, leaks: leaks.get(f) ?? 0 })),
      consumers: kept.map((k) => ({ path: k.path, hop: k.hop, via: k.via })),
      consumersOmitted: Math.max(0, c.consumers.length - kept.length),
      exclude: allSource.filter((f) => !c.changed.includes(f)),
      chars: c.chars + kept.reduce((n, k) => n + size(k.path), 0),
      overCeiling: Boolean(c.overCeiling),
    }
  })

  const tests = {
    id: 'tests',
    testFiles: changed.map((c) => c.path).filter((p) => /\.test\.|__tests__|\.spec\./.test(p)),
  }
  const control = tier === 'risk:low' ? null : { id: 'control', files: [...source, ...other] }
  return { pr, head, tier, labels, max, agents, tests, control, records, unpartitioned: other }
}

const list = (items, fmt) => (items.length ? items.map((x) => `- ${fmt(x)}`).join('\n') : '- (none)')

/**
 * The manifest as the Markdown `skills/review.md` pastes into each
 * sub-agent: one `### Assignment <id>` section per agent, then the counts.
 *
 * @param {ReturnType<typeof partition>} m the manifest.
 * @returns {string} Markdown.
 */
export function renderManifest(m) {
  const head = [
    `# Review manifest${m.pr ? ` for PR #${m.pr}` : ''}`,
    '',
    `Tier ${m.tier}: up to ${m.max} assignments; ${m.agents.length} spawned, plus the Tests lens${m.control ? ' and the control adversary' : ''}.`,
    m.records.length ? `Plan, docs and loop records left to no agent: ${m.records.length} file(s).` : '',
    m.unpartitioned.length ? `Changed non-source files (every assignment may read, none owns): ${m.unpartitioned.join(', ')}.` : '',
  ].filter(Boolean)
  const sections = m.agents.map((a) => [
    `### Assignment ${a.id}: ${a.module}`,
    '',
    `You are one of ${m.agents.length} partitioned readers of PR #${m.pr ?? '<n>'}. You own the files below and nothing else.`,
    `Report a finding only on a line in an owned file or an owned consumer; a defect anywhere else is another reader's and you must not report it.`,
    '',
    `**Hunt first:** ${a.hunt}.`,
    a.alsoClasses.length ? `Then also: ${a.alsoClasses.map((c) => DEFECT_CLASSES[c].hunt).join('; ')}.` : '',
    '',
    a.overCeiling ? `**Long list:** the tier's reader cap forced this fold past the ${CHAR_CEILING} character ceiling; read the diff hunks first, then each owned file at the changed regions.` : null,
    '**Owned changed files** (lines changed; ledger leaks = ledger PRs touching this file that needed a post-merge fix):',
    list(a.changed, (f) => {
      const notes = [f.lines != null ? `${f.lines} lines` : '', f.leaks ? `${f.leaks} ledger leak${f.leaks > 1 ? 's' : ''}` : ''].filter(Boolean)
      return `\`${f.path}\`${notes.length ? ` (${notes.join(', ')})` : ''}`
    }),
    '',
    `**Owned consumers** (importers of the owned files, ${CLOSURE_DEPTH} hops${a.consumersOmitted ? `; ${a.consumersOmitted} more omitted` : ''}): read each for a call, prop, type or marker the change breaks.`,
    list(a.consumers, (c) => `\`${c.path}\` (hop ${c.hop}, via \`${c.via}\`)`),
    '',
    '**Do not report** (owned by another assignment):',
    list(a.exclude, (f) => `\`${f}\``),
    '',
  ].filter((l) => l !== null).join('\n'))
  const tail = [
    `### Tests lens`,
    '',
    `Test files in the diff: ${m.tests.testFiles.length ? m.tests.testFiles.map((f) => `\`${f}\``).join(', ') : 'none'}.`,
    '',
    m.control ? `### Control adversary\n\nUnpartitioned: the whole diff (${m.control.files.length} source file(s)).\n` : '',
  ]
  return [...head, '', ...sections, ...tail].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

// --- I/O ----------------------------------------------------------------------

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : fallback
}

function git(args, cwd = ROOT) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).trim()
}

/** Every tracked source file with its text, from the working tree. */
export function readSources(root = ROOT) {
  const paths = git(['ls-files', '--', '*.ts', '*.tsx', '*.mjs', '*.js'], root)
    .split('\n')
    .filter((p) => p && !/(^|\/)(node_modules|dist|dist-swap|\.expo)\//.test(p))
  const sources = new Map()
  for (const p of paths) {
    try {
      sources.set(p, readFileSync(resolve(root, p), 'utf8'))
    } catch {
      // deleted in the working tree
    }
  }
  return sources
}

function readLedger() {
  const p = resolve(ROOT, 'docs/reports/eval/ledger.json')
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

function changedFromPr(pr, repo) {
  const view = JSON.parse(execFileSync('gh', ['pr', 'view', pr, '--repo', repo, '--json', 'files,labels,headRefOid'], { cwd: ROOT, encoding: 'utf8' }))
  return {
    changed: view.files.map((f) => ({ path: f.path, additions: f.additions, deletions: f.deletions })),
    labels: view.labels.map((l) => l.name),
    head: view.headRefOid,
  }
}

async function main() {
  const pr = arg('--pr')
  const files = arg('--files')
  if (!pr && !files) {
    console.error('usage: pr-partition.mjs --pr <n> [--json] | --files a,b,c [--tier risk:low|risk:medium|risk:high] [--labels a,b] [--json]')
    process.exit(2)
  }
  const repo = process.env.GH_REPO || 'no-trbl-2-u/Miserere-mei-deus'
  let changed
  let labels = (arg('--labels', '') || '').split(',').filter(Boolean)
  let head = null
  if (pr) ({ changed, labels, head } = changedFromPr(pr, repo))
  else changed = files.split(',').filter(Boolean).map((p) => ({ path: p.trim() }))
  let tier = arg('--tier') ?? labels.find((l) => l.startsWith('risk:'))
  if (!tier) {
    const { deriveRisk } = await import('./pr-risk.mjs')
    tier = deriveRisk({ files: changed, labels }).tier
  }
  const sources = readSources()
  const sizes = new Map([...sources].map(([p, t]) => [p, t.length]))
  const manifest = partition({
    changed, tier, labels, reverse: buildReverseGraph(sources), sizes, leaks: leakyFiles(readLedger()), pr: pr ?? null, head,
  })
  process.stdout.write(process.argv.includes('--json') ? `${JSON.stringify(manifest, null, 2)}\n` : renderManifest(manifest))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
