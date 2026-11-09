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
// quoted without spaces. Flags that take a value (`--import ./x`, `-r ./x`) are skipped
// with it. `cd <dir>` is matched too, so a script path resolves against the cd target.
const CMD_PART = /(?:^|[;&|(\n])\s*(?:(cd)\s+["']?([^\s"';&|]+)|node\s+((?:(?:--import|--require|--loader|--experimental-loader|-r)(?:=\S+|\s+\S+)\s+|-\S+\s+)*)["']?([^\s"';&|<>]+\.(?:mjs|cjs|js)))/g

// Import forms, matched on code whose comments are gone and whose string literals
// are numbered slots (\u0001N\u0001), so import-looking text inside a string is inert.
const Q = '\\u0001(\\d+)\\u0001'
const SPECIFIER = [
  new RegExp(`\\b(?:import|export)\\b[\\w\\s{},*$]*?\\bfrom\\s*${Q}`, 'g'),
  new RegExp(`\\bimport\\s*${Q}`, 'g'),
  new RegExp(`\\bimport\\s*\\(\\s*${Q}\\s*\\)`, 'g'),
  new RegExp(`\\brequire\\s*\\(\\s*${Q}\\s*\\)`, 'g'),
]

/** Source with comments dropped and each string/template literal replaced by a numbered slot. */
export function maskLiterals(src) {
  const strings = []
  let out = ''
  for (let i = 0; i < src.length; ) {
    const c = src[i]
    const n = src[i + 1]
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++
    } else if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2)
      i = end < 0 ? src.length : end + 2
    } else if (c === '"' || c === "'" || c === '`') {
      let j = i + 1
      while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1
      strings.push(src.slice(i + 1, j))
      out += `\u0001${strings.length - 1}\u0001`
      i = j + 1
    } else {
      out += c
      i++
    }
  }
  return { code: out, strings }
}

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
  const { code, strings } = maskLiterals(src)
  const missing = new Set()
  for (const re of SPECIFIER) {
    for (const m of code.matchAll(re)) {
      const pkg = packageOf(strings[Number(m[1])])
      if (pkg && !resolvableFrom(dir, pkg, env)) missing.add(pkg)
    }
  }
  return [...missing]
}

/**
 * The first `node <script>` in `cmd` whose script imports an unresolvable bare
 * package: `{ file, missing }`, or null. Relative script paths resolve against `cwd`, moved by any `cd` earlier in the command.
 */
export function findScratchpadTrap(cmd, cwd = process.cwd(), env = process.env) {
  try {
    let dir = cwd
    for (const m of String(cmd).matchAll(CMD_PART)) {
      if (m[1]) {
        dir = path.resolve(dir, m[2])
        continue
      }
      const file = path.resolve(dir, m[4])
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
