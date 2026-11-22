#!/usr/bin/env node
// .claude/hooks/guard.mjs — mechanical enforcement of the
// standing rules in AGENTS.md. Wired via .claude/settings.json:
//
//   PreToolUse (matcher: Bash)  → node .claude/hooks/guard.mjs pre-bash
//   PreToolUse (Write|Edit)     → node .claude/hooks/guard.mjs pre-write
//   PostToolUse (Write|Edit)    → node .claude/hooks/guard.mjs post-write
//   SessionStart                → node .claude/hooks/guard.mjs session-start
//   Stop                        → node .claude/hooks/guard.mjs stop
//
// Exit-code contract (Claude Code hooks):
//   0  allow / no opinion
//   2  BLOCK — stderr is fed back to the agent as feedback
//   other non-zero = hook error (logged, non-fatal)
//
// The guard is a backstop, not the primary enforcement — the
// skills' prose rules are. A block firing mid-run is itself a
// finding: record it in the commit body or plan/AUDIT.md.
//
// Modes:
//   pre-bash      check a Bash tool call against the forbidden list
//   pre-write     block hand-edits to measured baselines
//   post-write    run the lessons-ladder lint (check-lessons) when
//                 plan/lessons.md, reflexes.md or NEEDS_T.md is written, and
//                 the retired-terminology lint (check-lexicon) on
//                 the .md file just written; findings feed back as
//                 exit 2 so the agent fixes them before CI does
//   session-start print measurement context (baseline freshness) to
//                 stdout for injection into the session
//   stop          warn (or block, with NEXUS_STRICT_STOP=1) when a
//                 turn ends with a dirty tree / unpushed commits
//   self-test     run canned commands through the matcher; exit 1
//                 on any mismatch (use in CI / after editing rules)
//
// Zero dependencies. Never throws: an unexpected error prints to
// stderr and exits 0 (fail-open) so a guard bug can't wedge the
// loop — the provider-level backstops still hold.

import { execSync, spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Loaded fail-open: a missing or broken sibling must not disable the other rules.
// Without the shell reader every pre-bash rule runs its legacy regex alone,
// which is the stricter reading, so a broken reader can only block more.
let shell = null
try {
  shell = await import('./guard-shell.mjs')
} catch {
  /* legacy regexes only */
}
let scratch = null
try {
  scratch = await import('./scratchpad-resolve.mjs')
} catch {
  /* rule off */
}
let hookCwd = process.cwd()

const DEFAULT_BRANCH = 'main'

// --- forbidden-command rules ------------------------------------------
//
// Each rule has two checks, and it can never be weaker than its legacy one:
//
//   legacy(cmd)  the old whole-string regex. It is the PRIMARY check: no
//                match, no block (as before).
//   run(parsed)  the same rule on the argv of the segments the shell
//                executes (guard-shell.mjs). A hit always blocks, even where
//                the legacy regex misses (`git clean --force`, `pkill -xf`).
//
// A legacy match is waved through only when the command is PROVEN INERT
// (provenInert below): the reader parsed it with no ambiguity, run() found
// nothing, every executed segment (substitutions, backticks, process
// substitutions and heredoc consumers included) runs a program on a short
// allowlist of programs that never execute their arguments, and nothing is
// written to a file that could later run. Then the legacy match can only
// have come from data: a heredoc body, a quoted -m message, an echo or grep
// argument (plan/AUDIT.md: the whole-string grep tripped on those). A shell,
// an interpreter with inline code, a wrapper (sudo, env, timeout, xargs,
// find, ssh, ...) or any unknown program means "not proven", and the legacy
// result stands. The content rule (trailer-or-emoji-in-commit) adds one more
// condition: every commit's message must be one the guard can read.

// git commit: short options that take a value, and long ones.
const COMMIT_SHORT_VALUE = 'mFCct'
const COMMIT_LONG_VALUE = [
  'message', 'file', 'reuse-message', 'reedit-message', 'fixup', 'squash', 'author', 'date',
  'template', 'cleanup', 'pathspec-from-file', 'trailer',
]
const PUSH_SHORT_VALUE = 'o'
const PUSH_LONG_VALUE = ['repo', 'push-option', 'receive-pack', 'exec']

// Every executed `git <sub>` segment, with its options parsed.
function gitSegments(parsed, sub, shortValue = '', longValue = []) {
  const out = []
  for (const seg of parsed.segments) {
    const g = shell.gitCall(seg)
    if (g && g.sub === sub) out.push(shell.parseOpts(g.args, shortValue, longValue))
  }
  return out
}

const commits = (p) => gitSegments(p, 'commit', COMMIT_SHORT_VALUE, COMMIT_LONG_VALUE)
const hasLong = (o, pred) => [...o.long.keys()].some(pred)

// The text a commit's message is made of: every -m/--message and --trailer
// value (a `$(cat <<'EOF' ... EOF)` message keeps its heredoc text), plus the
// value of any $NAME it expands that the command itself assigns.
function commitMessage(o, parsed) {
  const parts = o.values
    .filter((v) => ['-m', '--message', '--trailer'].includes(v.opt))
    .map((v) => v.value)
  const text = parts.join('\n')
  const vars = [...text.matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1])
  for (const name of vars) parts.push(...(parsed.assignments.get(name) ?? []))
  return parts.join('\n')
}

function bannedInMessage(text) {
  return /Co-Authored-By/i.test(text) || /[\u{1F000}-\u{1FAFF}\u{2705}\u{2728}\u{FE0F}]/u.test(text)
}

// Can the guard see every byte of this text as the shell will expand it?
// Plain text, `$NAME` / `${NAME}` that the command itself assigns (read in
// turn), positional and special parameters (empty here), and the one
// substitution Claude Code writes for messages, `$(cat <<'EOF' ... EOF)`.
// Anything else (`$(cat m.txt)`, backticks, `${x:-...}`, a variable from
// `read` or the environment) could carry text the guard never sees.
function textReadable(text, parsed, depth = 0) {
  if (depth > 4) return false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '`') return false
    if (c !== '$') continue
    const rest = text.slice(i)
    const hd = /^\$\(\s*cat\s+<<(-?)\s*(['"]?)([A-Za-z_][\w-]*)\2[ \t]*\n/.exec(rest)
    if (hd) {
      const lines = rest.slice(hd[0].length).split('\n')
      const at = lines.findIndex((l) => (hd[1] ? l.replace(/^\t+/, '') : l) === hd[3])
      if (at < 0) return false
      const body = lines.slice(0, at).join('\n')
      if (!hd[2] && /[$`\\]/.test(body)) return false // an unquoted body expands
      const tail = lines.slice(at + 1).join('\n')
      const close = /^\s*\)/.exec(tail)
      if (!close) return false
      i += hd[0].length + lines.slice(0, at + 1).join('\n').length + 1 + close[0].length - 1
      continue
    }
    const v = /^\$([A-Za-z_]\w*)/.exec(rest) ?? /^\$\{([A-Za-z_]\w*)\}/.exec(rest)
    if (v) {
      const values = parsed.assignments.get(v[1])
      if (!values || !values.every((val) => textReadable(val, parsed, depth + 1))) return false
      i += v[0].length - 1
      continue
    }
    if (/^\$[0-9@*#?$!-]/.test(rest)) {
      i++
      continue
    }
    if (rest[1] === '(' || rest[1] === '{' || rest[1] === '[') return false
  }
  return true
}

// A commit whose message the content rule can read: given by -m/--message
// (and --trailer) values alone, every one readable. A message from a file,
// another commit, a template or the editor is invisible to the guard.
function messageReadable(o, parsed) {
  if (['c', 'C', 't', 'F'].some((ch) => o.short.has(ch))) return false
  if (['file', 'template', 'reuse-message', 'reedit-message', 'fixup', 'squash'].some((k) => o.long.has(k))) {
    return false
  }
  const parts = o.values.filter((v) => ['-m', '--message', '--trailer'].includes(v.opt))
  if (!parts.some((v) => v.opt !== '--trailer')) return false // no -m: the editor writes it
  return parts.every((v) => textReadable(v.value, parsed))
}

// --- proven inert: the legacy match came only from data ---------------------

// Programs that never execute their arguments, input or a file named in them.
// Deliberately short: a program missing here only means its legacy match
// stands. sed (e/w), sort (--compress-program), xargs, find, env and every
// shell, interpreter and runner are left out on purpose.
const DATA_PROGRAMS = new Set([
  'echo', 'cat', 'grep', 'egrep', 'fgrep', 'head', 'tail', 'wc', 'ls', 'cd', 'pwd', 'true', 'false', 'mkdir', 'sleep',
])
// git subcommands that run nothing named on their command line (hooks are the
// repo's own). rebase (--exec), bisect, submodule, grep (-O), config, merge
// (-s) and aliases are left out, so they keep their legacy result.
const GIT_INERT_SUBS = new Set([
  'add', 'commit', 'status', 'log', 'diff', 'show', 'push', 'fetch', 'branch', 'checkout', 'switch', 'reset', 'clean',
  'restore', 'rm', 'mv', 'tag', 'rev-parse', 'ls-files', 'stash',
])
// Variables that make an allowlisted program run something else (git's
// editor, ssh command and config, a preload, the PATH it is found on).
const DANGEROUS_VAR =
  /^(GIT_\w*|EDITOR|VISUAL|PAGER|MANPAGER|LESS\w*|LD_\w+|DYLD_\w+|BASH_ENV|ENV|NODE_OPTIONS|NODE_PATH|PS4|PROMPT_COMMAND|SHELLOPTS|BASHOPTS|PATH|IFS|HOME|XDG_CONFIG_HOME|CDPATH|SHELL|PYTHON\w*|PERL\w*|RUBY\w*|npm_config_\w+)$/i
const ASSIGNMENT = /^([A-Za-z_][A-Za-z0-9_]*)=/

// A file the command may write: one nothing will execute later (a note, a
// log), never a script, a hook or anything under .git.
function safeWriteTarget(p) {
  if (/^\/dev\/(null|stdout|stderr)$/.test(p)) return true
  return /^[\w./~@+-]+$/.test(p) && /\.(md|txt|log|csv|out)$/i.test(p) && !/(^|\/)\.git/.test(p)
}

function gitInert(args) {
  let k = 0
  while (k < args.length && args[k].startsWith('-')) {
    if (args[k] === '-C') k += 2
    else if (args[k] === '--no-pager') k++
    else return false // -c, --exec-path, --git-dir, --config-env, ...: may run or redirect anything
  }
  if (!GIT_INERT_SUBS.has(args[k])) return false
  return !args.slice(k + 1).some((a) => /^--(receive-pack|upload-pack|exec)(=|$)/.test(a))
}

function programInert(name, args, ruleName) {
  if (DATA_PROGRAMS.has(name)) return true
  if (name === 'printf') return !args.some((a) => a.startsWith('-v'))
  if (name === 'rg') return !args.some((a) => /^--pre(-glob)?(=|$)/.test(a))
  if (name === 'tee') return args.filter((a) => !a.startsWith('-')).every(safeWriteTarget)
  if (name === 'git') return gitInert(args)
  // node running a script file (no -e/-p/--eval, no option at all): the
  // script is in the tree, not in this command. Never for the gate rule: a
  // script may be the gate.
  if (name === 'node') return ruleName !== 'backgrounded-gate' && args.length > 0 && !args[0].startsWith('-')
  return false
}

function segmentInert(seg, ruleName) {
  for (const r of seg.redirects) {
    if (!r.op.includes('>')) continue // a read, heredoc or here-string: its consumer is checked below
    if (/&$/.test(r.op) && /^(\d+|-)$/.test(r.text)) continue // 2>&1: an fd, not a file
    if (!safeWriteTarget(r.text)) return false
  }
  const ws = seg.words.map((w) => w.text)
  let k = 0
  for (; k < ws.length; k++) {
    const m = ASSIGNMENT.exec(ws[k])
    if (!m) break
    if (DANGEROUS_VAR.test(m[1])) return false
  }
  if (k >= ws.length) return true // only assignments, redirections or a heredoc: no program runs
  const name = ws[k]
  if (name.includes('/')) return false // a path is not the allowlisted program
  return programInert(name, ws.slice(k + 1), ruleName)
}

/**
 * True when a legacy regex match on this command can only have come from data.
 * `ruleName` picks the per-rule allowlist; `readable` is a content rule's
 * extra test. The caller has already found no argv hit for the rule.
 */
function provenInert(parsed, ruleName, readable) {
  if (!parsed || parsed.ambiguous) return false
  if (!parsed.segments.every((seg) => segmentInert(seg, ruleName))) return false
  return readable ? readable(parsed) : true
}

// Each rule: name, run(parsed) → true = block (on argv), legacy(cmd) → the
// whole-string regex (primary; see above), readable(parsed) for a content
// rule, message for the agent. Messages say WHY and what to do instead, so a
// blocked call self-corrects instead of retrying.
const RULES = [
  {
    name: 'no-verify',
    run: (p) => commits(p).some((o) => o.short.has('n') || hasLong(o, (k) => k.startsWith('no-veri'))),
    legacy: (cmd) => /\bgit\b[^|;&]*\bcommit\b[^|;&]*(\s--no-verify\b|\s-n\b)/.test(cmd),
    message:
      'guard: --no-verify is forbidden (AGENTS.md standing rule 3). ' +
      'The verify gate is non-negotiable — fix the root cause of the ' +
      'failing check, then commit normally.',
  },
  {
    name: 'force-push',
    run: (p) =>
      gitSegments(p, 'push', PUSH_SHORT_VALUE, PUSH_LONG_VALUE).some(
        (o) =>
          o.short.has('f') ||
          hasLong(o, (k) => k.startsWith('forc')) ||
          o.positional.some((w) => w.text.startsWith('+')),
      ),
    legacy: (cmd) =>
      /\bgit\b[^|;&]*\bpush\b[^|;&]*(\s--force(-with-lease)?\b|\s-f\b)/.test(cmd) ||
      /\bgit\b[^|;&]*\bpush\b[^|;&]*\s\+\S/.test(cmd),
    message:
      'guard: force-push is forbidden (AGENTS.md standing rule 3). ' +
      'If the push was rejected, run git pull --ff-only and re-apply. ' +
      'If history is genuinely wrong, stop and file [needs-user-call] ' +
      'per your skill\'s failure modes.',
  },
  {
    name: 'destructive-reset',
    run: (p) =>
      gitSegments(p, 'reset').some((o) => o.long.has('hard')) ||
      gitSegments(p, 'clean', 'e', ['exclude']).some((o) => o.short.has('f') || o.long.has('force')) ||
      gitSegments(p, 'checkout', 'bB', ['orphan']).some((o) => o.positional.some((w) => w.text === '.')) ||
      gitSegments(p, 'branch', 'u', ['set-upstream-to']).some(
        (o) => o.short.has('D') && o.positional.some((w) => w.text === DEFAULT_BRANCH),
      ),
    legacy: (cmd) =>
      /\bgit\b[^|;&]*\breset\b[^|;&]*\s--hard\b/.test(cmd) ||
      /\bgit\b[^|;&]*\bclean\b[^|;&]*\s-[a-zA-Z]*f/.test(cmd) ||
      /\bgit\b[^|;&]*\bcheckout\b\s+(--\s+)?\.(\s|$)/.test(cmd) ||
      new RegExp(`\\bgit\\b[^|;&]*\\bbranch\\b[^|;&]*\\s-D\\s+${DEFAULT_BRANCH}\\b`).test(cmd),
    message:
      'guard: destructive resets are forbidden (AGENTS.md standing ' +
      'rule 3). Uncommitted work is either shipped (commit it) or a ' +
      'finding (write it to plan/AUDIT.md) — never discarded.',
  },
  {
    name: 'commit-message-from-file',
    run: (p) => commits(p).some((o) => o.short.has('F') || o.long.has('file')),
    legacy: (cmd) => /\bgit\b[^|;&]*\bcommit\b[^|;&]*(\s--file\b|\s-[a-zA-Z]*F\b)/.test(cmd),
    message:
      'guard: git commit -F/--file is forbidden — the guard lints commit ' +
      'messages from the command string (AGENTS.md standing rule 2), and a ' +
      'message file is invisible to it. Write the message inline with -m. ' +
      'The whole command was refused, so nothing in it ran (a `git add` ' +
      'chained before the commit did not happen either): re-run the full ' +
      'chain, not just the commit.',
  },
  {
    // lesson pkill-self-match: the Bash tool runs the whole command line in
    // one shell, so `pkill -f <pattern>` finds that shell (its argv holds
    // the pattern) and kills the call itself.
    name: 'pkill-self-match',
    run: (p) =>
      p.segments.some((seg) => {
        const ws = shell.effectiveWords(seg)
        if (!ws.length || shell.basename(ws[0].text) !== 'pkill') return false
        const args = ws.slice(1).map((w) => w.text)
        const full = args.some((a) => /^-[a-zA-Z]*f[a-zA-Z]*$/.test(a) || a === '--full')
        return full && !/\[[^\]]+\]/.test(args.join(' '))
      }),
    legacy: (cmd) => {
      const m = cmd.match(/(?:^|[;&|(\n])\s*(?:sudo\s+)?pkill\b([^|;&\n]*)/)
      return !!m && /\s-[a-zA-Z]*f\b|\s--full\b/.test(m[1]) && !/\[[^\]]+\]/.test(m[1])
    },
    message:
      'guard: `pkill -f <pattern>` matches this Bash call\'s own shell and ' +
      'kills it (lesson pkill-self-match). Bracket one letter of the ' +
      'pattern (`pkill -f "[h]ttp.server 8931"`), or kill by pid from ' +
      '`ps aux | grep "[h]ttp.server"`.',
  },
  {
    // CONTENT rule: reads the commit message itself, not the rest of the
    // command (an emoji in card text written by an earlier segment is not a
    // commit body).
    name: 'trailer-or-emoji-in-commit',
    run: (p) => commits(p).some((o) => bannedInMessage(commitMessage(o, p))),
    readable: (p) => commits(p).every((o) => messageReadable(o, p)),
    legacy: (cmd) => /\bgit\b[^|;&]*\bcommit\b/.test(cmd) && bannedInMessage(cmd),
    message:
      'guard: commit bodies are plain (AGENTS.md standing rule 2) — ' +
      'no Co-Authored-By trailers, no emojis. The only sanctioned ' +
      'trailer is Cloud-Run: (cloud ticks only). Rewrite the message.',
  },
  {
    // footgun scratchpad-script-no-resolve: a script outside the repo resolves
    // packages from its own folder, so a bare import dies ERR_MODULE_NOT_FOUND.
    // scratchpad-resolve.mjs reads the command itself (it masks literals).
    name: 'scratchpad-script-no-resolve',
    raw: (cmd) => {
      trap = scratch?.findScratchpadTrap(cmd, hookCwd) ?? null
      return !!trap
    },
    get message() {
      return trap ? scratch.scratchpadTrapMessage(trap) : 'guard: scratchpad-script-no-resolve'
    },
  },
]
let trap = null

// Backgrounding the gate is its own rule because it needs the
// run_in_background flag, not just the command string. This is
// the "post-result exit hang" — see AGENTS.md standing rule 3.
// It matches a gate COMMAND that runs (npm test, npm run verify, node --test,
// npx playwright test, scripts/verify.sh, ...), not the word anywhere.
const GATE_WORD = /\b(verify|deploy:check|e2e|test)\b/
const PACKAGE_RUNNERS = new Set([
  'npm', 'pnpm', 'yarn', 'bun', 'npx', 'pnpx', 'bunx', 'make', 'turbo', 'nx', 'playwright', 'maestro', 'detox',
])
const INTERPRETERS = new Set(['node', 'bash', 'sh', 'zsh', 'python', 'python3', 'tsx', 'ts-node', 'deno'])

// The words of a segment that name what it runs: the program, a package
// runner's script/bin/target names, an interpreter's script (and node --test).
function gateWords(seg) {
  const ws = shell.effectiveWords(seg)
  if (!ws.length) return []
  const name = shell.basename(ws[0].text)
  const words = [name]
  const rest = ws.slice(1)
  if (PACKAGE_RUNNERS.has(name)) {
    for (const w of rest) {
      if (w.text === '--') break
      if (!w.text.startsWith('-')) words.push(w.text)
    }
  } else if (INTERPRETERS.has(name)) {
    for (const w of rest) {
      if (name === 'node' && /^--test(=|-|$)/.test(w.text)) words.push('test')
      if (w.text.startsWith('-')) continue
      words.push(shell.basename(w.text))
      break
    }
  }
  return words
}

function isGateCommand(parsed) {
  return parsed.segments.some((seg) => gateWords(seg).some((w) => GATE_WORD.test(w)))
}

const BACKGROUND_MESSAGE =
  'guard: never run the verify/deploy gate in the background ' +
  '(AGENTS.md standing rule 3 — the post-result exit hang). Run it ' +
  'as a foreground, blocking call and wait for it. If the gate is ' +
  'too slow, run its legs as sequential foreground calls.'

function parseOrNull(cmd) {
  if (!shell) return null
  try {
    return shell.parseShell(cmd)
  } catch {
    return null // reader gap: nothing is proven inert, so the legacy regexes decide
  }
}

// run() on the parsed argv; a reader bug there must not cost the legacy check.
function argvHit(fn, parsed) {
  if (!parsed) return false
  try {
    return !!fn(parsed)
  } catch {
    return false
  }
}

/**
 * The rule a Bash call breaks, or null. `background` is the tool call's
 * run_in_background flag. Pure apart from the scratchpad rule's file reads.
 * @returns {{ name: string, message: string } | null}
 */
export function checkCommand(cmd, { background = false } = {}) {
  cmd = String(cmd ?? '')
  if (!cmd) return null
  const parsed = parseOrNull(cmd)
  const blocks = (name, run, legacy, readable) => {
    if (argvHit(run, parsed)) return true
    if (!legacy(cmd)) return false
    try {
      return !provenInert(parsed, name, readable)
    } catch {
      return true // the legacy match stands
    }
  }
  if (background && blocks('backgrounded-gate', isGateCommand, (c) => GATE_WORD.test(c))) {
    return { name: 'backgrounded-gate', message: BACKGROUND_MESSAGE }
  }
  for (const rule of RULES) {
    const hit = rule.raw ? rule.raw(cmd) : blocks(rule.name, rule.run, rule.legacy, rule.readable)
    if (hit) return { name: rule.name, message: rule.message }
  }
  return null
}

/** The hook payload's view: tool_input.command and tool_input.run_in_background. */
export function checkBash(input) {
  return checkCommand(input?.tool_input?.command, { background: input?.tool_input?.run_in_background === true })
}

export { RULES }

// --- modes --------------------------------------------------------------

function readStdinJson() {
  try {
    const raw = fs.readFileSync(0, 'utf-8')
    return raw.trim() ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// --- the hooked-session marker (the kit's, for scripts/claims.mjs; NX1f) --------------------------------------

// The primary checkout's root (a worktree's too): the folder holding
// the common .git. Read from the files, not by spawning git: this
// runs on every Bash call. null outside a checkout.
function primaryRootOf(start) {
  let dir = path.resolve(start)
  for (;;) {
    const dotGit = path.join(dir, '.git')
    let st = null
    try {
      st = fs.statSync(dotGit)
    } catch {
      /* not here: look up */
    }
    if (st?.isDirectory()) return dir
    if (st) {
      const m = fs.readFileSync(dotGit, 'utf-8').match(/^gitdir:\s*(.+?)\s*$/m)
      if (!m) return null
      const gitdir = path.resolve(dir, m[1])
      let common = gitdir
      try {
        common = path.resolve(gitdir, fs.readFileSync(path.join(gitdir, 'commondir'), 'utf-8').trim())
      } catch {
        /* no commondir: the gitdir is the common dir */
      }
      return path.dirname(common)
    }
    const up = path.dirname(dir)
    if (up === dir) return null
    dir = up
  }
}

// Touch .nexus/hooks/<session id> at the primary checkout of every
// folder this call could run in: scripts/claims.mjs refuses a Claude
// Code session without a fresh one (customization/claims.md), so a
// session that loaded no hooks can't claim and build unguarded.
// Best-effort and silent: a marker that can't be written only means
// a claim refuses, never that this call is blocked.
function markHooked(input, env = process.env) {
  const ids = new Set([input?.session_id, env.CLAUDE_CODE_SESSION_ID].filter((x) => typeof x === 'string' && x))
  if (!ids.size) return []
  const roots = new Set()
  for (const start of [input?.cwd, env.CLAUDE_PROJECT_DIR, process.cwd()]) {
    if (typeof start !== 'string' || !start) continue
    try {
      const root = primaryRootOf(start)
      if (root) roots.add(root)
    } catch {
      /* unreadable .git: skip */
    }
  }
  const written = []
  const stamp = new Date().toISOString() + '\n'
  for (const root of roots) {
    const dir = path.join(root, '.nexus', 'hooks')
    try {
      fs.mkdirSync(dir, { recursive: true })
      for (const id of ids) {
        const file = path.join(dir, id.replace(/[^\w.-]/g, '_'))
        fs.writeFileSync(file, stamp)
        written.push(file)
      }
    } catch {
      /* best-effort */
    }
  }
  return written
}

function preBash() {
  const input = readStdinJson()
  markHooked(input)
  if (typeof input?.cwd === 'string' && input.cwd) hookCwd = input.cwd
  const hit = checkBash(input)
  if (!hit) return 0
  process.stderr.write(hit.message + '\n')
  return 2
}

// --- write guards --------------------------------------------------------

// Repo-relative forward-slash path, or null. Hooks run with cwd = repo root.
function normalizeRel(p) {
  if (!p) return null
  let rel = String(p).replaceAll('\\', '/')
  const root = process.cwd().replaceAll('\\', '/')
  if (rel.startsWith(root)) rel = rel.slice(root.length).replace(/^\//, '')
  return rel
}

// Files that must never be hand-edited. Same shape as the OKF repo's
// GENERATED map: block + say where the truth actually lives.
const WRITE_BLOCKS = [
  {
    name: 'measured-baseline',
    test: (rel) => /\bdocs\/reports\/baselines\/[^/]+\.json$/.test(rel),
    message:
      'guard: baseline files are MEASURED truth — hand-editing one forges ' +
      'a measurement (see AGENTS.md → "Measured truth"). Re-measure via ' +
      'npm run baseline:regen instead.',
  },
]

function preWrite() {
  const input = readStdinJson()
  const rel = normalizeRel(input?.tool_input?.file_path)
  if (!rel) return 0
  for (const b of WRITE_BLOCKS) {
    if (b.test(rel)) {
      process.stderr.write(b.message + '\n')
      return 2
    }
  }
  return 0
}

// After any .md write, run the retired-terminology lint on just that file
// (same instant-feedback pattern as the OKF repo's post-write validator).
// check-lexicon applies its own zone/banner/pragma exemptions, so zoned
// files come back clean here without special-casing.
//
// The hook is wired through $CLAUDE_PROJECT_DIR, so in a worktree session
// this script and its cwd belong to the MAIN checkout while the written
// file lives in the worktree. check-lexicon resolves zones against its own
// repo root, so a worktree path came out as `../.claude/...`, matched no
// dated-record zone, and every zoned file lit up on lines the edit never
// touched (plan/AUDIT.md, 2026-10-11). The lint therefore runs from the
// written file's own repository: its git toplevel, its copy of the script,
// and the path relative to that root.
function lexiconTargetFor(filePath) {
  if (!filePath) return null
  const abs = path.resolve(String(filePath))
  if (!abs.endsWith('.md') || !fs.existsSync(abs)) return null
  const top = spawnSync('git', ['-C', path.dirname(abs), 'rev-parse', '--show-toplevel'], {
    encoding: 'utf-8',
    timeout: 10_000,
  })
  if (top.error || top.status !== 0) return null
  const root = path.resolve(top.stdout.trim())
  const script = path.join(root, 'scripts', 'check-lexicon.mjs')
  if (!fs.existsSync(script)) return null
  const rel = path.relative(root, abs).replaceAll('\\', '/')
  if (rel.startsWith('..')) return null
  return { root, script, rel }
}

// After a write to plan/lessons.md or plan/reflexes.md, run the lessons
// ladder lint (scripts/check-lessons.mjs, Phase R11) from the written file's
// own repository, so a malformed retro is fixed before the commit.
function lessonsTargetFor(filePath) {
  const target = lexiconTargetFor(filePath)
  if (!target || !['plan/lessons.md', 'plan/reflexes.md', 'plan/NEEDS_T.md'].includes(target.rel)) return null
  const script = path.join(target.root, 'scripts', 'check-lessons.mjs')
  return fs.existsSync(script) ? { root: target.root, script } : null
}

function postWrite() {
  const input = readStdinJson()
  const lessons = lessonsTargetFor(input?.tool_input?.file_path)
  if (lessons) {
    const res = spawnSync(process.execPath, [lessons.script], {
      cwd: lessons.root,
      encoding: 'utf-8',
      timeout: 30_000,
    })
    if (!res.error && res.status !== null && res.status !== 0) {
      process.stderr.write(
        'guard: plan/lessons.md or plan/reflexes.md breaks the ladder format:\n' +
        `${(res.stderr || res.stdout || '').trim()}\n`,
      )
      return 2
    }
  }
  const target = lexiconTargetFor(input?.tool_input?.file_path)
  if (!target) return 0
  const res = spawnSync(process.execPath, [target.script, target.rel], {
    cwd: target.root,
    encoding: 'utf-8',
    timeout: 30_000,
  })
  if (res.error || res.status === null) return 0 // fail-open
  if (res.status !== 0) {
    process.stderr.write(
      'guard: retired terminology in the file just written:\n' +
      `${(res.stderr || res.stdout || '').trim()}\n`,
    )
    return 2
  }
  return 0
}

// --- session-start context ------------------------------------------------

// stdout from a SessionStart hook is injected as context, so every session
// opens knowing whether the combat baseline is fresh — mechanizes the
// "cite the baseline's stamp" rule in CLAUDE.md.
function sessionStart() {
  const lines = []
  try {
    const res = spawnSync(process.execPath, ['scripts/check-baseline-freshness.mjs'], {
      encoding: 'utf-8',
      timeout: 20_000,
    })
    const out = (res.stdout || '').trim()
    if (out) lines.push(...out.split(/\r?\n/).slice(0, 4))
  } catch {
    /* best-effort */
  }
  if (lines.length) process.stdout.write(lines.join('\n') + '\n')
  return 0
}

function git(args) {
  return execSync(`git ${args}`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}

function notifyBestEffort(title, body) {
  try {
    if (!fs.existsSync('scripts/notify.mjs')) return
    const child = spawn(
      process.execPath,
      ['scripts/notify.mjs', '--title', title, '--body', body, '--priority', 'high'],
      { detached: true, stdio: 'ignore' },
    )
    child.unref()
  } catch {
    /* best-effort */
  }
}

function stopCheck() {
  const input = readStdinJson()
  let dirty = ''
  let unpushed = 0
  try {
    dirty = git('status --porcelain')
  } catch {
    return 0 // not a git repo / git unavailable — nothing to enforce
  }
  try {
    unpushed = Number(git(`rev-list --count @{u}..HEAD`)) || 0
  } catch {
    unpushed = 0 // no upstream yet — push discipline can't apply
  }
  if (!dirty && unpushed === 0) {
    resetBlockCounter()
    return 0
  }

  const reason =
    (dirty ? `dirty tree (${dirty.split('\n').length} paths)` : '') +
    (dirty && unpushed ? ' + ' : '') +
    (unpushed ? `${unpushed} unpushed commit(s)` : '')
  const message =
    `guard: turn is ending with ${reason}. Standing rule 1: commit ` +
    'and push as a single atomic act — the next tick pulls from ' +
    'origin and will not see this work. Finish the commit+push, or ' +
    'file the leftover as a finding.'

  const strict = process.env.NEXUS_STRICT_STOP === '1'
  const alreadyContinuing = input?.stop_hook_active === true
  if (strict && !alreadyContinuing && bumpBlockCounter() < 3) {
    process.stderr.write(message + '\n')
    return 2
  }
  process.stderr.write(message + ' (warning only)\n')
  notifyBestEffort('loop: unclean stop', reason)
  return 0
}

// Strict mode breaks its own cycle: 3 consecutive blocked stops in
// one repo → warn-and-allow (the underlying failure mode is the
// real bug; blocking forever would wedge the session).
const COUNTER = path.join('.git', 'nexus-stop-blocks')

function bumpBlockCounter() {
  let n = 0
  try {
    n = Number(fs.readFileSync(COUNTER, 'utf-8')) || 0
  } catch {
    /* first block */
  }
  try {
    fs.writeFileSync(COUNTER, String(n + 1))
  } catch {
    /* non-fatal */
  }
  return n
}

function resetBlockCounter() {
  try {
    fs.rmSync(COUNTER, { force: true })
  } catch {
    /* non-fatal */
  }
}

function selfTest() {
  const cases = [
    ['git commit -m "x" --no-verify', 'no-verify'],
    ['git commit --no-verify -m "x"', 'no-verify'],
    ['git commit -n -m "x"', 'no-verify'],
    ['git commit -F msg.txt', 'commit-message-from-file'],
    ['git commit --file=msg.txt', 'commit-message-from-file'],
    ['git commit -aF msg.txt', 'commit-message-from-file'],
    ['git push --force origin main', 'force-push'],
    ['git push -f', 'force-push'],
    ['git push --force-with-lease origin main', 'force-push'],
    ['git push origin +main', 'force-push'],
    ['git reset --hard HEAD~3', 'destructive-reset'],
    ['git clean -fd', 'destructive-reset'],
    ['git checkout -- .', 'destructive-reset'],
    ['git commit -m "feat: x\n\nCo-Authored-By: bot"', 'trailer-or-emoji-in-commit'],
    ['pkill -f "http.server 8931"', 'pkill-self-match'],
    ['cd x && pkill -f wrangler; npm test', 'pkill-self-match'],
    ['pkill --full wrangler', 'pkill-self-match'],
    // allowed commands — must NOT match any rule
    ['git push origin main', null],
    ['git commit -m "feat: ship phase 8"', null],
    ['git commit -m "cloud tick\n\nCloud-Run: https://x"', null],
    ['git reset HEAD~1', null],
    ['gh issue list -n 5', null],
    ['git log -n 5', null],
    ['npm run verify', null],
    ['pkill -f "[h]ttp.server 8931"', null],
    ['pkill node', null],
    ['git commit -m "guard refuses an unbracketed pkill -f now"', null],
    // argv matching (plan/AUDIT.md): text in a message or heredoc body is not a flag
    ['git commit -m "docs: why --no-verify and git push --force stay denied"', null],
    ["cat > x.md <<'EOF'\ngit reset --hard; Co-Authored-By\nEOF", null],
    ['echo "$(git push -f)"', 'force-push'],
    // fail closed: a legacy match stands unless every program is a known data program
    ["echo 'git push -f' | sh", 'force-push'],
    ["bash <<'EOF'\ngit reset --hard\nEOF", 'destructive-reset'],
    ['find . -exec git push -f {} \\;', 'force-push'],
    ['git clean --force', 'destructive-reset'],
  ]
  // scratchpad-script-no-resolve needs a real file: one that imports a package nothing holds.
  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-selftest-'))
  fs.writeFileSync(path.join(scratchDir, 'bad.mjs'), "import 'guard-selftest-ghost'\n")
  fs.writeFileSync(path.join(scratchDir, 'ok.mjs'), "import fs from 'node:fs'\n")
  cases.push(
    [`node ${path.join(scratchDir, 'bad.mjs')}`, 'scratchpad-script-no-resolve'],
    [`node ${path.join(scratchDir, 'ok.mjs')}`, null],
  )
  let failed = 0
  for (const [cmd, expected] of cases) {
    const hit = checkCommand(cmd)?.name ?? null
    const ok = hit === expected
    if (!ok) failed++
    process.stdout.write(
      `  ${ok ? 'ok  ' : 'FAIL'}  ${JSON.stringify(cmd).slice(0, 58).padEnd(60)} → ${hit ?? 'allowed'}\n`,
    )
  }
  const writeCases = [
    ['axiomancer-mechanics/docs/reports/baselines/deck-matrix-baseline.json', 'measured-baseline'],
    ['axiomancer-mechanics/docs/reports/2026-07-10-combat-audit.md', null],
    ['plan/AUDIT.md', null],
  ]
  for (const [p, expected] of writeCases) {
    const rel = normalizeRel(p)
    const hit = WRITE_BLOCKS.find((b) => b.test(rel))?.name ?? null
    const ok = hit === expected
    if (!ok) failed++
    process.stdout.write(
      `  ${ok ? 'ok  ' : 'FAIL'}  write ${JSON.stringify(p).slice(0, 52).padEnd(54)} → ${hit ?? 'allowed'}\n`,
    )
  }
  // post-write resolves the lint against the WRITTEN file's repository, not
  // this script's: a worktree checkout must come back as its own root with
  // a plain repo-relative path, never `../...` against the main checkout.
  const here = path.resolve('plan/AUDIT.md')
  const own = lexiconTargetFor(here)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-selftest-'))
  let other = null
  try {
    spawnSync('git', ['-C', tmp, 'init', '-q'], { encoding: 'utf-8' })
    fs.mkdirSync(path.join(tmp, 'scripts'))
    fs.writeFileSync(path.join(tmp, 'scripts', 'check-lexicon.mjs'), '')
    fs.mkdirSync(path.join(tmp, 'plan'))
    const otherFile = path.join(tmp, 'plan', 'AUDIT.md')
    fs.writeFileSync(otherFile, '# x\n')
    other = lexiconTargetFor(otherFile)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
  const lexCases = [
    ['own checkout → rel plan/AUDIT.md', own?.rel === 'plan/AUDIT.md'],
    ['own checkout → root is this toplevel', !!own && path.resolve(own.root) === path.resolve(process.cwd())],
    ['other repo → its own root, not ../', !!other && other.rel === 'plan/AUDIT.md' && other.root !== own?.root],
    ['non-markdown → skipped', lexiconTargetFor('package.json') === null],
    ['lessons.md → check-lessons runs', lessonsTargetFor(path.resolve('plan/lessons.md')) !== null],
    ['NEEDS_T.md → check-lessons runs', lessonsTargetFor(path.resolve('plan/NEEDS_T.md')) !== null],
    ['AUDIT.md → no lessons lint', lessonsTargetFor(here) === null],
  ]
  for (const [label, ok] of lexCases) {
    if (!ok) failed++
    process.stdout.write(`  ${ok ? 'ok  ' : 'FAIL'}  lexicon ${label.padEnd(54)}\n`)
  }
  process.stdout.write(failed ? `\nself-test: ${failed} FAILED\n` : '\nself-test: green.\n')
  return failed ? 1 : 0
}

// --- entry ---------------------------------------------------------------

// Run as a hook only when invoked directly; guard.test.mjs imports the rules.
function invokedDirectly() {
  try {
    return !!process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (invokedDirectly()) {
  try {
    const mode = process.argv[2]
    const code =
      mode === 'pre-bash' ? preBash()
      : mode === 'pre-write' ? preWrite()
      : mode === 'post-write' ? postWrite()
      : mode === 'session-start' ? sessionStart()
      : mode === 'stop' ? stopCheck()
      : mode === 'self-test' ? selfTest()
      : (process.stderr.write(`guard: unknown mode "${mode}"\n`), 0)
    process.exit(code)
  } catch (err) {
    // Fail-open: a guard bug must not wedge the loop.
    process.stderr.write(`guard: internal error (fail-open): ${err?.message}\n`)
    process.exit(0)
  }
}
