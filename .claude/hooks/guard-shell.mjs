// .claude/hooks/guard-shell.mjs — a small, pure shell reader for the guard's
// pre-bash rules (plan/AUDIT.md: "guard.mjs greps the whole command string").
//
// The guard used to run its regexes over the whole command text, so a word
// inside a heredoc body, a quoted `-m` message or a file path tripped rules
// meant for what the shell EXECUTES. This module reads a Bash command the way
// the shell does, far enough to tell the two apart:
//
//   - splits it into segments at `&&`, `||`, `;`, `|`, `&`, newlines and
//     parentheses;
//   - removes heredoc bodies (`<<EOF`, `<<'EOF'`, `<<-EOF`) from the argv and
//     keeps them on the segment that opened them;
//   - turns each segment into argv words, honouring single and double quotes,
//     backslashes, comments and redirections;
//   - follows what the shell runs inside text: `$(...)`, backticks, `<(...)`,
//     `$(...)` in an unquoted heredoc body, `bash -c '...'` and `eval`, each
//     read as executed segments of their own.
//
// It is not a full shell grammar. It throws ShellParseError on an unclosed
// quote or substitution (bash refuses those too), and the guard then falls
// back to its old whole-string regexes, so a reader gap never opens a hole.
// Zero dependencies, no I/O.

export class ShellParseError extends Error {}

const MAX_DEPTH = 24
const WORD_END = new Set([' ', '\t', '\n', ';', '&', '|', '<', '>', '(', ')'])

/**
 * Read a command into its executed segments.
 * @returns {{ segments: Segment[], assignments: Map<string, string[]> }}
 *   Segment: { words: { text: string, quoted: boolean }[], argv: string[], heredocs: string[] }
 *   assignments: every `NAME=value` the command sets, by name (for `$NAME` in a message).
 */
export function parseShell(src) {
  const ctx = { segments: [], depth: 0 }
  parseInto(ctx, String(src))
  // `bash -c '...'` / `eval ...`: the string argument is itself a command.
  for (let k = 0; k < ctx.segments.length; k++) {
    const inner = innerCommand(ctx.segments[k])
    if (inner !== null) parseInto(ctx, inner)
  }
  const assignments = new Map()
  for (const seg of ctx.segments) {
    for (const w of seg.argv) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]*)$/.exec(w)
      if (!m) continue
      if (!assignments.has(m[1])) assignments.set(m[1], [])
      assignments.get(m[1]).push(m[2])
    }
  }
  return { segments: ctx.segments, assignments }
}

function parseInto(ctx, src) {
  if (++ctx.depth > MAX_DEPTH) throw new ShellParseError('nesting too deep')
  try {
    parseList(ctx, src, 0, false)
  } finally {
    ctx.depth--
  }
}

function newSeg() {
  return { words: [], argv: [], heredocs: [], redirects: [] }
}

// Read from i until the end of src (or, with stopAtParen, past the `)` that
// closes a `$(`/`<(` opened just before i). Returns the index after the end.
function parseList(ctx, src, i, stopAtParen) {
  const n = src.length
  let seg = newSeg()
  let word = null
  let redirNext = false // the next word is a redirection target or here-string, not argv
  let depth = 0
  const pending = [] // heredocs whose bodies start at the next newline

  const ensureWord = () => {
    if (!word) word = { text: '', quoted: false, start: i, redir: redirNext }
    return word
  }
  const endWord = () => {
    if (!word) return
    if (word.redir) seg.redirects.push(word)
    else {
      seg.words.push({ text: word.text, quoted: word.quoted })
      seg.argv.push(word.text)
    }
    if (word.redir) redirNext = false
    word = null
  }
  const endSeg = () => {
    endWord()
    redirNext = false
    if (seg.words.length || seg.heredocs.length) ctx.segments.push(seg)
    seg = newSeg()
  }

  while (i < n) {
    const c = src[i]
    if (c === '\\') {
      if (src[i + 1] === '\n') {
        i += 2
        continue
      }
      const w = ensureWord()
      w.text += src[i + 1] ?? ''
      w.quoted = true
      i += 2
      continue
    }
    if (c === "'") {
      const w = ensureWord()
      const j = src.indexOf("'", i + 1)
      if (j < 0) throw new ShellParseError('unclosed single quote')
      w.text += src.slice(i + 1, j)
      w.quoted = true
      i = j + 1
      continue
    }
    if (c === '"') {
      const w = ensureWord()
      w.quoted = true
      i = readDouble(ctx, src, i + 1, w)
      continue
    }
    if (c === '`') {
      i = readBacktick(ctx, src, i + 1, ensureWord())
      continue
    }
    if (c === '$' && src[i + 1] === '(') {
      i = readDollarParen(ctx, src, i, ensureWord())
      continue
    }
    if (c === '$' && src[i + 1] === '{') {
      i = readBrace(src, i, ensureWord())
      continue
    }
    if ((c === '<' || c === '>') && src[i + 1] === '(') {
      // process substitution: executed, and its text stays one word
      const w = ensureWord()
      const end = parseList(ctx, src, i + 2, true)
      w.text += src.slice(i, end)
      i = end
      continue
    }
    if (c === '#' && !word) {
      while (i < n && src[i] !== '\n') i++
      continue
    }
    if (c === ' ' || c === '\t') {
      endWord()
      i++
      continue
    }
    if (c === '\n') {
      endSeg()
      i++
      if (pending.length) i = readHeredocBodies(ctx, src, i, pending)
      continue
    }
    if (c === '<' || c === '>' || (c === '&' && src[i + 1] === '>')) {
      // `2>file`: a bare number glued to the operator is a file descriptor
      if (word && !word.quoted && /^\d+$/.test(word.text) && word.start + word.text.length === i) word = null
      else endWord()
      if (src.startsWith('<<<', i)) {
        i += 3
        redirNext = true // here-string: data, not argv
        continue
      }
      if (src.startsWith('<<', i)) {
        i += 2
        const strip = src[i] === '-'
        if (strip) i++
        while (src[i] === ' ' || src[i] === '\t') i++
        const d = readDelimiter(src, i)
        i = d.end
        if (d.text) pending.push({ delim: d.text, quoted: d.quoted, strip, seg })
        continue
      }
      if (c === '&') i++
      i++ // < or >
      if (src[i] === '>' || src[i] === '<') i++
      if (src[i] === '&' || src[i] === '|') i++
      redirNext = true
      continue
    }
    if (c === ';' || c === '&' || c === '|') {
      endSeg()
      i += src[i + 1] === c || (c === '|' && src[i + 1] === '&') ? 2 : 1
      continue
    }
    if (c === '(') {
      endSeg()
      if (stopAtParen) depth++
      i++
      continue
    }
    if (c === ')') {
      endSeg()
      i++
      if (stopAtParen) {
        if (depth === 0) {
          if (pending.length) drainPending(ctx, pending)
          return i
        }
        depth--
      }
      continue
    }
    ensureWord().text += c
    i++
  }
  if (stopAtParen) throw new ShellParseError('unclosed $( or <(')
  endSeg()
  // a heredoc with no newline after its operator gets an empty body (bash warns, runs)
  if (pending.length) drainPending(ctx, pending)
  return n
}

function drainPending(ctx, pending) {
  for (const hd of pending.splice(0)) hd.seg.heredocs.push('')
}

function readDouble(ctx, src, i, w) {
  const n = src.length
  while (i < n) {
    const c = src[i]
    if (c === '"') return i + 1
    if (c === '\\') {
      const nx = src[i + 1]
      if (nx === '\n') {
        i += 2
        continue
      }
      if (nx === '$' || nx === '`' || nx === '"' || nx === '\\') w.text += nx
      else w.text += '\\' + (nx ?? '')
      i += 2
      continue
    }
    if (c === '$' && src[i + 1] === '(') {
      i = readDollarParen(ctx, src, i, w)
      continue
    }
    if (c === '$' && src[i + 1] === '{') {
      i = readBrace(src, i, w)
      continue
    }
    if (c === '`') {
      i = readBacktick(ctx, src, i + 1, w)
      continue
    }
    w.text += c
    i++
  }
  throw new ShellParseError('unclosed double quote')
}

// `$(` (a command, read as executed segments) or `$((` (arithmetic). The raw
// text stays in the word, so a content rule still sees what it holds.
function readDollarParen(ctx, src, i, w) {
  if (src[i + 2] === '(') {
    let d = 0
    for (let j = i + 1; j < src.length; j++) {
      if (src[j] === '(') d++
      else if (src[j] === ')' && --d === 0) {
        w.text += src.slice(i, j + 1)
        return j + 1
      }
    }
    throw new ShellParseError('unclosed $((')
  }
  if (++ctx.depth > MAX_DEPTH) throw new ShellParseError('nesting too deep')
  try {
    const end = parseList(ctx, src, i + 2, true)
    w.text += src.slice(i, end)
    return end
  } finally {
    ctx.depth--
  }
}

function readBrace(src, i, w) {
  let d = 0
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === '{') d++
    else if (src[j] === '}' && --d === 0) {
      w.text += src.slice(i, j + 1)
      return j + 1
    }
  }
  throw new ShellParseError('unclosed ${')
}

function readBacktick(ctx, src, i, w) {
  let inner = ''
  for (let j = i; j < src.length; j++) {
    if (src[j] === '\\' && j + 1 < src.length) {
      inner += src[j + 1] === '`' || src[j + 1] === '\\' || src[j + 1] === '$' ? src[j + 1] : src[j] + src[j + 1]
      j++
      continue
    }
    if (src[j] === '`') {
      parseInto(ctx, inner)
      w.text += '`' + inner + '`'
      return j + 1
    }
    inner += src[j]
  }
  throw new ShellParseError('unclosed backtick')
}

function readDelimiter(src, i) {
  let text = ''
  let quoted = false
  while (i < src.length && !WORD_END.has(src[i])) {
    const c = src[i]
    if (c === "'" || c === '"') {
      const j = src.indexOf(c, i + 1)
      if (j < 0) throw new ShellParseError('unclosed heredoc delimiter quote')
      text += src.slice(i + 1, j)
      quoted = true
      i = j + 1
      continue
    }
    if (c === '\\') {
      text += src[i + 1] ?? ''
      quoted = true
      i += 2
      continue
    }
    text += c
    i++
  }
  return { text, quoted, end: i }
}

// Bodies start at the line after the operator and run to a line that is the
// delimiter alone (leading tabs stripped for <<-). With no such line, bash
// reads to end of input, and so does this.
function readHeredocBodies(ctx, src, i, pending) {
  for (const hd of pending.splice(0)) {
    let body = ''
    for (;;) {
      if (i >= src.length) break
      let nl = src.indexOf('\n', i)
      if (nl < 0) nl = src.length
      const line = src.slice(i, nl)
      i = nl + 1
      if ((hd.strip ? line.replace(/^\t+/, '') : line) === hd.delim) break
      body += line + '\n'
    }
    hd.seg.heredocs.push(body)
    if (!hd.quoted) runsInBody(ctx, body)
  }
  return Math.min(i, src.length)
}

// An unquoted heredoc body still expands `$(...)` and backticks: those run.
function runsInBody(ctx, body) {
  for (let k = 0; k < body.length; k++) {
    if (body[k] === '\\') {
      k++
      continue
    }
    if (body[k] === '$' && body[k + 1] === '(' && body[k + 2] !== '(') {
      const sink = { text: '' }
      try {
        k = readDollarParen(ctx, body, k, sink) - 1
      } catch {
        return
      }
    } else if (body[k] === '`') {
      const sink = { text: '' }
      try {
        k = readBacktick(ctx, body, k + 1, sink) - 1
      } catch {
        return
      }
    }
  }
}

// --- what a segment runs -------------------------------------------------

const RESERVED = new Set(['if', 'then', 'else', 'elif', 'do', 'while', 'until', '{', '}', '!', 'time', 'coproc'])
// wrapper → short options that take a value (the next word)
const WRAPPERS = {
  sudo: 'ugpChUDrtT',
  doas: 'uC',
  env: 'uCS',
  nohup: '',
  command: '',
  builtin: '',
  exec: 'a',
  nice: 'n',
  stdbuf: 'ioe',
  xargs: 'InPLdsEa',
  timeout: 'sk',
  time: 'fo',
}

export function basename(w) {
  const s = String(w)
  return s.slice(s.lastIndexOf('/') + 1)
}

const isAssignment = (w) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(w)

/**
 * The argv a segment actually runs: leading `NAME=value` assignments, shell
 * reserved words and wrappers (`sudo`, `env`, `timeout 60`, `xargs -n1`, ...)
 * peeled off. Returns indices into seg.words so callers keep the quote flags.
 */
export function effectiveWords(seg) {
  const ws = seg.words
  let k = 0
  for (;;) {
    while (k < ws.length && (isAssignment(ws[k].text) || RESERVED.has(ws[k].text))) k++
    if (k >= ws.length) return []
    const name = basename(ws[k].text)
    if (!Object.hasOwn(WRAPPERS, name)) break
    const valued = WRAPPERS[name]
    k++
    while (k < ws.length) {
      const t = ws[k].text
      if (t === '--') {
        k++
        break
      }
      if (/^--?[A-Za-z]/.test(t) && name !== 'env' ? true : /^-/.test(t)) {
        if (/^--/.test(t)) {
          k++
          continue
        }
        const letters = t.slice(1)
        const vi = [...letters].findIndex((ch) => valued.includes(ch))
        k += vi >= 0 && vi === letters.length - 1 ? 2 : 1
        continue
      }
      if (name === 'env' && isAssignment(t)) {
        k++
        continue
      }
      break
    }
    if (name === 'timeout' && k < ws.length && /^\d/.test(ws[k].text)) k++ // the duration
  }
  return ws.slice(k)
}

// `bash -c 'cmd'`, `sh -lc "cmd"`, `eval cmd ...`: the command text they run.
function innerCommand(seg) {
  const ws = effectiveWords(seg)
  if (!ws.length) return null
  const name = basename(ws[0].text)
  if (name === 'eval') return ws.length > 1 ? ws.slice(1).map((w) => w.text).join(' ') : null
  if (!['bash', 'sh', 'zsh', 'dash', 'ksh'].includes(name)) return null
  for (let k = 1; k < ws.length; k++) {
    const t = ws[k].text
    if (!t.startsWith('-') || t.startsWith('--')) {
      if (t.startsWith('--')) continue
      return null // a script path: not inline text
    }
    if (t.slice(1).includes('c')) return ws[k + 1]?.text ?? null
  }
  return null
}

/**
 * Parse an option list the way git and most CLIs do. `shortValue` lists short
 * options that take a value (attached, or the next word); `longValue` lists
 * long options that take one (`--x=v` or `--x v`). Stops at `--`.
 * @returns {{ short: Set<string>, long: Map<string, string[]>, values: {opt: string, value: string}[], positional: {text: string, quoted: boolean}[] }}
 */
export function parseOpts(words, shortValue = '', longValue = []) {
  const short = new Set()
  const long = new Map()
  const values = []
  const positional = []
  for (let k = 0; k < words.length; k++) {
    const t = words[k].text
    if (t === '--') {
      positional.push(...words.slice(k + 1))
      break
    }
    if (t.startsWith('--') && t.length > 2) {
      const eq = t.indexOf('=')
      const name = eq < 0 ? t.slice(2) : t.slice(2, eq)
      let value = eq < 0 ? null : t.slice(eq + 1)
      if (value === null && longValue.includes(name) && k + 1 < words.length) value = words[++k].text
      if (!long.has(name)) long.set(name, [])
      if (value !== null) {
        long.get(name).push(value)
        values.push({ opt: '--' + name, value })
      }
      continue
    }
    if (t.startsWith('-') && t.length > 1) {
      for (let j = 1; j < t.length; j++) {
        const ch = t[j]
        short.add(ch)
        if (shortValue.includes(ch)) {
          let value = t.slice(j + 1)
          if (!value && k + 1 < words.length) value = words[++k].text
          values.push({ opt: '-' + ch, value })
          break
        }
      }
      continue
    }
    positional.push(words[k])
  }
  return { short, long, values, positional }
}

// git's global options that take a value before the subcommand.
const GIT_GLOBAL_VALUE_SHORT = 'Cc'
const GIT_GLOBAL_VALUE_LONG = ['git-dir', 'work-tree', 'namespace', 'super-prefix', 'config-env', 'exec-path']

/** A segment that runs git: its subcommand and the words after it, else null. */
export function gitCall(seg) {
  const ws = effectiveWords(seg)
  if (!ws.length || basename(ws[0].text) !== 'git') return null
  let k = 1
  while (k < ws.length) {
    const t = ws[k].text
    if (t.length === 2 && t[0] === '-' && GIT_GLOBAL_VALUE_SHORT.includes(t[1])) {
      k += 2
      continue
    }
    if (t.startsWith('--')) {
      const name = t.slice(2).split('=')[0]
      k += GIT_GLOBAL_VALUE_LONG.includes(name) && !t.includes('=') && name !== 'exec-path' ? 2 : 1
      continue
    }
    if (t.startsWith('-')) {
      k++
      continue
    }
    return { sub: t, args: ws.slice(k + 1) }
  }
  return null
}
