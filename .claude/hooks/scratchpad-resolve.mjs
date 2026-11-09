// .claude/hooks/scratchpad-resolve.mjs — the guard behind the footgun
// `scratchpad-script-no-resolve` (identity/footguns.md).
//
// Node resolves a bare import from the script's own directory upward, so a
// script run from the session scratchpad (outside the repo) cannot see the
// repo's node_modules: `import 'sharp'` dies ERR_MODULE_NOT_FOUND. This reads
// the script a `node <file>` command is about to run and reports the bare
// packages that no node_modules above it holds. Pure of the guard's wiring so
// the test can drive it; never throws (fail-open: a parse miss allows the call).

import fs from 'node:fs'
import { builtinModules } from 'node:module'
import path from 'node:path'

const BUILTINS = new Set(builtinModules)

// `node [flags] script.mjs` in command position; the script path unquoted or
// quoted without spaces. Global so a chained command is checked per node call.
const NODE_CALL = /(?:^|[;&|(\n])\s*node\s+(?:-\S+\s+)*["']?([^\s"';&|<>]+\.(?:mjs|cjs|js))/g

const SPECIFIER = [
  /\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
]

/** The package a bare specifier names, or null for a relative, absolute, URL, `node:` or built-in one. */
export function packageOf(spec) {
  if (!spec || /^(?:\.|\/|#|[a-zA-Z]:[\\/])/.test(spec) || /^[a-z][a-z0-9+.-]*:/i.test(spec)) return null
  const parts = spec.split('/')
  const name = spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
  if (BUILTINS.has(name) || BUILTINS.has(spec)) return null
  return name
}

/** True when some node_modules at or above `dir` (or NODE_PATH) holds `pkg`. */
export function resolvableFrom(dir, pkg, env = process.env) {
  for (let d = path.resolve(dir); ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, 'node_modules', pkg))) return true
    if (path.dirname(d) === d) break
  }
  for (const p of String(env.NODE_PATH ?? '').split(path.delimiter).filter(Boolean)) {
    if (fs.existsSync(path.join(p, pkg))) return true
  }
  return false
}

/** Bare packages `file` imports that cannot resolve from where it sits. */
export function unresolvableImports(file, env = process.env) {
  let src
  try {
    src = fs.readFileSync(file, 'utf-8')
  } catch {
    return []
  }
  const dir = path.dirname(path.resolve(file))
  const missing = new Set()
  for (const re of SPECIFIER) {
    for (const m of src.matchAll(re)) {
      const pkg = packageOf(m[1])
      if (pkg && !resolvableFrom(dir, pkg, env)) missing.add(pkg)
    }
  }
  return [...missing]
}

/**
 * The first `node <script>` in `cmd` whose script imports an unresolvable bare
 * package: `{ file, missing }`, or null. Relative script paths resolve against `cwd`.
 */
export function findScratchpadTrap(cmd, cwd = process.cwd(), env = process.env) {
  try {
    for (const m of String(cmd).matchAll(NODE_CALL)) {
      const file = path.resolve(cwd, m[1])
      const missing = unresolvableImports(file, env)
      if (missing.length) return { file, missing }
    }
  } catch {
    /* fail open */
  }
  return null
}

export function scratchpadTrapMessage(hit) {
  return (
    `guard: ${hit.file} imports ${hit.missing.join(', ')}, which cannot resolve from its directory ` +
    '(footgun scratchpad-script-no-resolve: node resolves packages from the script\'s own folder, ' +
    'so a scratchpad script never sees the repo\'s node_modules). Import the package by absolute ' +
    'file:// path from the repo\'s node_modules/, or copy the script into the repo root, run it, ' +
    'and delete it.'
  )
}
