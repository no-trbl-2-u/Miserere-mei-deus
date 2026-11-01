#!/usr/bin/env node
// scripts/check-devlog-not-served.mjs — guards against the DevLog's generated
// HTML/data/art re-entering `git ls-files`, which is what Cloudflare Pages
// serves from `main`'s tree. Phase 57 (archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/phases/phase_57_devlog_pages_scopedown.md)
// untracked these paths because the built site's own header reads "A private
// index of the game's content and the nightly development log" — the source
// inputs (entries/*.md, dated screenshots) stay tracked; only the
// regenerable output is gitignored.
//
// The public DevLog (2026-09-20) does NOT weaken this. It builds to
// `dist/devlog-public/`, which is gitignored and listed here as generated too:
// publication happens at deploy time, from a build, so generated output still
// never enters `main`'s tree. That is what makes the new publication
// deliberate rather than accidental — phase 57's actual complaint.
//
//   node scripts/check-devlog-not-served.mjs             # scan the real tree
//   node scripts/check-devlog-not-served.mjs <paths...>   # scan an explicit list
//
// Exit codes: 0 clean; 1 findings (path: reason).

import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** True if `rel` (repo-relative, forward-slash) is a generated DevLog output —
 *  derived from other tracked sources and rebuilt on demand by
 *  `npm run site:build`, never a member that should be committed. */
export function isGeneratedDevlogPath(rel) {
  // The public site's build directory — every byte of it is generated.
  if (rel === 'dist' || rel.startsWith('dist/')) return true
  if (rel === 'devlog/index.html' || rel === 'devlog/log.html' || rel === 'devlog/catalog.html' || rel === 'devlog/atlas.html') return true
  if (/^devlog\/entries\/.*\.html$/.test(rel)) return true
  if (rel.startsWith('devlog/data/')) return true
  if (rel.startsWith('devlog/assets/catalog/')) return true
  return false
}

/** Filter a list of repo-relative paths down to the generated-and-tracked ones. */
export function findServedGeneratedFiles(paths) {
  return paths.filter(isGeneratedDevlogPath)
}

// ── CLI ──
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

if (isDirectRun(import.meta.url)) {
  const args = process.argv.slice(2)
  const paths = args.length
    ? args
    : execFileSync('git', ['ls-files', 'devlog/', 'dist/'], { cwd: ROOT, encoding: 'utf-8' })
        .split('\n')
        .filter(Boolean)

  const offenders = findServedGeneratedFiles(paths)
  if (offenders.length) {
    console.error(`check-devlog-not-served: ${offenders.length} generated DevLog path(s) are tracked (Pages would serve them):`)
    offenders.forEach((p) => console.error(`  ${p}: generated output — untrack it (see .gitignore, phase 57 brief)`))
    console.error('\nRun `npm run site:build` locally to regenerate; do not commit the output.')
    process.exit(1)
  }
  console.log(`check-devlog-not-served: ${paths.length} tracked devlog/ and dist/ path(s) clean.`)
}
