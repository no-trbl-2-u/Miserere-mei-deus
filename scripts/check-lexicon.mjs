#!/usr/bin/env node
// scripts/check-lexicon.mjs — retired-terminology + retired-doctrine lint.
// Zero dependencies.
//
//   node scripts/check-lexicon.mjs             # scan live prose surfaces
//   node scripts/check-lexicon.mjs <files...>   # scan just those files (the
//                                               # post-write hook's mode; zone/
//                                               # banner/pragma still apply)
//   node scripts/check-lexicon.mjs --list      # print the registry
//
// Enforces axiomancer-mechanics/docs/lexicon.json (the single source for
// retired game terminology AND retired design law; docs/LEXICON.md is the
// human guide) against every live *.md surface in the monorepo, so a retired
// concept cannot quietly re-enter the docs an agent will read as current law.
//
// Two row shapes (registry field `type`, default `identifier`):
//   identifier — a term. Matched line-by-line, as it always was.
//   doctrine   — a multi-clause design-law CLAIM. Matched against the whole
//                file with runs of whitespace collapsed to one space, so a
//                sentence wrapped across markdown line breaks is still caught
//                (phase 66). Findings still report the original line number.
//                Doctrine patterns are ASSERTION-scoped by construction: a
//                file that names a retired law in order to call it retired
//                must not be a finding, or every reconciliation the lint asks
//                for would create a new one.
//
// Three exemption mechanisms, in order of checking:
//   zone    — dated-record paths (CHANGELOG, braindump/, devlog/, specs/,
//             plan/ except bearings.md, reports, ADRs, automation/,
//             telemetry/) may
//             speak in period terms; never scanned.
//   banner  — a file whose first 40 lines carry '**Status:** HISTORICAL'
//             is a point-in-time record; skipped whole.
//   pragma  — '<!-- lexicon-ok: <id>, <id> -->' anywhere in a file
//             exempts those registry ids for that file (for legitimate
//             removal-mentions like "basePower no longer exists").
//
// Exit codes: 0 clean; 1 findings (file:line: term -> replacement).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REGISTRY_PATH = path.join(ROOT, 'axiomancer-mechanics', 'docs', 'lexicon.json')

export function loadRegistry(registryPath = REGISTRY_PATH) {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
  return registry.retired.map((r) => ({ ...r, type: r.type ?? 'identifier', re: new RegExp(r.pattern, 'g') }))
}

// Dated-record zones — path fragments (forward-slash, repo-relative).
const ZONE_DIRS = [
  'node_modules/', '.git/', 'tmp-images/', '.claude/worktrees/',
  'devlog/', 'braindump/', 'docs/reports/', 'docs/adr/', 'automation/', 'specs/',
  'telemetry/',
]
const ZONE_BASENAMES = ['CHANGELOG.md', 'RELEASES.md', 'lexicon.json', 'TELEMETRY.md']
const PLAN_LIVE = 'plan/bearings.md' // the only live plan/ surface

export const isZoned = (rel) => {
  if (rel.startsWith('plan/')) return rel !== PLAN_LIVE
  if (rel.startsWith('vault/')) return true // T's Obsidian notes: a separate, ignored repo (docs/vault.md)
  if (ZONE_BASENAMES.includes(path.basename(rel))) return true
  return ZONE_DIRS.some((z) => rel.includes(z))
}

const BANNER_RE = /\*\*Status:\*\*\s+HISTORICAL/i
const PRAGMA_RE = /<!--\s*lexicon-ok:\s*([^>]+?)\s*-->/g

export const hasHistoricalBanner = (text) => BANNER_RE.test(text.split(/\r?\n/, 40).join('\n'))

// '<!-- lexicon-ok: id, id -->', optionally followed by ' — why', so a pragma
// can carry its own justification instead of being a bare id nobody can audit.
export const exemptIdsIn = (text) =>
  new Set(
    [...text.matchAll(PRAGMA_RE)].flatMap((m) =>
      m[1].split(/\s+[—–]\s+/, 1)[0].split(',').map((s) => s.trim()).filter(Boolean),
    ),
  )

// Collapse runs of whitespace to a single space, keeping an index map back to
// the original offsets so a doctrine finding can still name its line. Leading
// whitespace on a line (markdown indentation) collapses with the newline
// itself, which is what makes a wrapped sentence match a single-space pattern.
function normalizeWhitespace(text) {
  let out = ''
  const offsets = []
  let i = 0
  while (i < text.length) {
    if (/\s/.test(text[i])) {
      const start = i
      while (i < text.length && /\s/.test(text[i])) i++
      if (out.length > 0 && i < text.length) {
        out += ' '
        offsets.push(start)
      }
    } else {
      out += text[i]
      offsets.push(i)
      i++
    }
  }
  return { normalized: out, offsets }
}

const lineOf = (text, offset) => text.slice(0, offset).split(/\r?\n/).length

/**
 * Scan one file's text against the registry. Returns findings as
 * `{ id, line, since, replacement }`; callers format them.
 */
export function scanText(text, rows) {
  const findings = []
  if (hasHistoricalBanner(text)) return findings
  const exempt = exemptIdsIn(text)
  const lines = text.split(/\r?\n/)
  const norm = rows.some((r) => r.type === 'doctrine') ? normalizeWhitespace(text) : null

  for (const term of rows) {
    if (exempt.has(term.id)) continue
    term.re.lastIndex = 0

    if (term.type === 'doctrine') {
      let m
      while ((m = term.re.exec(norm.normalized)) !== null) {
        const offset = norm.offsets[m.index] ?? 0
        const line = lineOf(text, offset)
        // A pragma comment sitting on the matched line exempts it, mirroring
        // the identifier path's per-line escape hatch.
        if ((lines[line - 1] ?? '').includes('lexicon-ok')) continue
        findings.push({ id: term.id, line, since: term.since, replacement: term.replacement })
        if (m[0].length === 0) term.re.lastIndex++
      }
      continue
    }

    lines.forEach((line, i) => {
      if (line.includes('lexicon-ok')) return
      term.re.lastIndex = 0
      if (term.re.test(line)) {
        findings.push({ id: term.id, line: i + 1, since: term.since, replacement: term.replacement })
      }
    })
  }
  return findings
}

function* mdFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'kb') continue
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* mdFiles(p)
    else if (entry.name.endsWith('.md')) yield p
  }
}

function main() {
  const RETIRED = loadRegistry()

  if (process.argv.includes('--list')) {
    for (const r of RETIRED) {
      console.log(`${r.id} [${r.type}]: /${r.pattern}/ -> ${r.replacement} (since ${r.since})`)
    }
    process.exit(0)
  }

  // Explicit file args (repo-relative or absolute) narrow the scan; zoning
  // still applies, so a zoned file passed explicitly exits clean.
  const fileArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const targets = fileArgs.length
    ? fileArgs.map((a) => path.resolve(ROOT, a)).filter((p) => p.endsWith('.md') && fs.existsSync(p))
    : mdFiles(ROOT)

  const findings = []
  let scanned = 0
  for (const abs of targets) {
    const rel = path.relative(ROOT, abs).replaceAll('\\', '/')
    if (isZoned(rel)) continue
    const text = fs.readFileSync(abs, 'utf-8')
    if (hasHistoricalBanner(text)) continue
    scanned++
    for (const f of scanText(text, RETIRED)) {
      findings.push(`${rel}:${f.line}: "${f.id}" is retired (since ${f.since}) -> ${f.replacement}`)
    }
  }

  if (findings.length) {
    console.error(`check-lexicon: ${findings.length} retired-term finding(s) across live surfaces:`)
    findings.forEach((f) => console.error(`  ${f}`))
    console.error(`\nFix the prose, or if the mention is legitimate (describing the removal),`)
    console.error(`add '<!-- lexicon-ok: <id> -->' to the file; dated records get the`)
    console.error(`'**Status:** HISTORICAL' banner instead. See axiomancer-mechanics/docs/LEXICON.md.`)
    process.exit(1)
  }
  console.log(`check-lexicon: ${scanned} live file(s) clean against ${RETIRED.length} retired term(s)`)
}

/**
 * True when this module is the process entry point.
 *
 * The old guard compared `import.meta.url` to `file://${process.argv[1]}`.
 * On Windows `process.argv[1]` is a backslash path (`C:\Users\...`) while
 * `import.meta.url` is `file:///C:/Users/...`, so the comparison was ALWAYS
 * false: every one of these CLIs exited 0 with no output on Windows, and the
 * `PostToolUse` lexicon hook was a silent no-op there. Normalising both sides
 * through `pathToFileURL` fixes it on every platform.
 */
function isDirectRun(moduleUrl) {
    if (!process.argv[1]) return false
    return moduleUrl === pathToFileURL(process.argv[1]).href
}

if (isDirectRun(import.meta.url)) main()
