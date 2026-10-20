#!/usr/bin/env node
// .claude/hooks/telemetry.mjs — appends invocation rows to this session's
// telemetry shard, `telemetry/<YYYY-MM-DD>_<session-id>.md`.
//
// Wired via .claude/settings.json:
//
//   PreToolUse  (Skill|SlashCommand|Task|Agent|Read|Bash) → telemetry.mjs tool
//   PostToolUse (Skill|SlashCommand|Task|Agent|Bash) → telemetry.mjs tool-end
//   PostToolUseFailure (same matcher)           → telemetry.mjs tool-end
//   UserPromptSubmit                            → telemetry.mjs prompt
//   Stop                                        → telemetry.mjs tick-end
//
// And from the CI runner (.github/workflows/_claude-skill.yml), after
// Claude exits:
//
//   telemetry.mjs tick-close <execution-file>   → the tick-end row the
//                                                 Stop hook failed to write
//
// Observability only: this hook NEVER blocks (always exits 0) and never
// throws — a telemetry bug must not cost a tick.
//
// ---------------------------------------------------------------------
// Schema:  | when (UTC) | event | name | model | dur | detail |
// ---------------------------------------------------------------------
//
//   when    ISO-8601 UTC, second precision, of the row's own write.
//   event   One of:
//             slash-prompt       a '/command' prompt was submitted
//             skill              a Skill tool call started
//             slash-command      a SlashCommand tool call started
//             subagent           a Task/Agent spawn started
//             verb-read          a loop verb's skills/<verb>.md was read
//                                (no -end row; once per verb per tick)
//             script             a Bash call ran one of the visual/e2e
//                                npm scripts (SCRIPT_RE below)
//             skill-end          …and the matching call finished
//             slash-command-end  …and the matching call finished
//             subagent-end       …and the matching call finished
//             script-end         …and the matching call finished
//             tick-end           the main agent finished responding
//   name    Skill / command / subagent-type name.
//   model   Resolved model id, or '-' when genuinely unknowable at write
//           time (see resolveModel below). NOT a guess.
//   dur     Wall-clock duration on *-end and tick-end rows; '-' on start
//           rows. Formatted '4s', '1m12s', '2h03m'.
//   detail  Free text. On *-end rows: 'ok' or 'error: <reason>'. On
//           script-end rows the outcome follows the script's exit code
//           ('ok' 0, 'diff' 1, 'missing' 2, 'error: <code>' otherwise,
//           'backgrounded' for a run_in_background call), then the
//           'matched N / differing N / missing N' counts when the output
//           carries them.
//
// ---------------------------------------------------------------------
// Why the schema changed (2026-09-15)
// ---------------------------------------------------------------------
// The previous schema carried an 'invoked from' column sourced from the
// last "isSidechain" flag in the transcript tail. Across 404 logged rows
// it emitted only two values — 'main' for every tool row and 'user/ci'
// for every prompt row — i.e. it was exactly derivable from the event
// type and carried zero information. At the moment main spawns a
// subagent the newest transcript entry is still main's, so the flag can
// only ever flip on a *nested* spawn. The column was dropped; 'dur'
// takes its place, and historical rows were migrated to '-'.
//
// The previous schema also had no completion event, so a tick that
// failed and a tick that did work the hook could not see were
// indistinguishable in the log. The *-end and tick-end rows close that.
//
// ---------------------------------------------------------------------
// Known-wrong things this file is careful about
// ---------------------------------------------------------------------
// 1. LOG PATH. Hooks do NOT reliably run with cwd = repo root — a tick
//    working inside a workspace package gets that package's cwd, and a
//    bare relative 'TELEMETRY.md' then writes a *second* log there.
//    That silently happened: axiomancer-mechanics/TELEMETRY.md and
//    axiomancer-mobile/TELEMETRY.md accumulated 6 diverted rows before
//    it was caught. The log path is anchored to CLAUDE_PROJECT_DIR.
// 2. MODEL. Resolved by parsing transcript JSONL and taking the newest
//    main-thread assistant entry's message.model — not by regexing the
//    raw tail, which could match a nested sidechain's model or a
//    "model" string inside a tool result. At UserPromptSubmit on a
//    fresh session no assistant entry exists yet, so the model is
//    genuinely unknowable; that row records '-' and the tick-end row
//    carries the model for the tick instead.
// 3. ONE FILE PER SESSION (2026-09-23). The log used to be a single
//    git-tracked TELEMETRY.md that every session appended to, so any two
//    branches that each logged a row conflicted at its last line on every
//    merge. Each session now writes only its own shard, named by the UTC
//    date of the write and the session id. Two branches never touch the
//    same file, so the log can no longer conflict. A session that runs
//    past midnight UTC opens a second shard for the new date; the reader
//    sorts by timestamp, so nothing is lost. `npm run telemetry`
//    (scripts/telemetry-view.mjs) prints every shard as one table. The
//    pre-split log lives on as telemetry/legacy-to-2026-09-23.md and is
//    never written again. Shards are uncapped: one session is small.
//
// 4. VERBS DISPATCHED BY READING (R0, 2026-09-28). `/march` runs its
//    verbs by reading `skills/<verb>.md` and following it, not through
//    the Skill tool, so those verbs never showed up here and the log
//    undercounted the loop. A Read of a root `skills/<verb>.md` now writes
//    one `verb-read` row per verb per tick. Only the repo's own loop-verb
//    directory counts: `.claude/skills/`, `plan/archive/` and
//    `node_modules/` paths are ignored.
//
// 5. VERBS READ THROUGH THE SHELL (R11, 2026-10-12). CI march ticks logged
//    no `verb-read` row at all from 2026-09-28 to 2026-10-12, though they
//    shipped critique passes and fixes: an unattended tick reads a long
//    skill with `cat`/`sed -n`/`head` as often as with Read. A Bash call
//    whose command reads a root `skills/<verb>.md` with one of those
//    commands now counts as the same `verb-read`.
//
// 6. MISSING TICK-END ROWS (R11, 2026-10-12). Three CI march ticks on
//    2026-10-11 (runs 38147566383, 38164633216, 38172680269) ended with
//    no `tick-end` row: the runner's stranded-rows step found the shard
//    unchanged ("No stranded telemetry rows"), so the Stop hook never
//    wrote one. Ticks before and after did get theirs. The leading cause
//    is the hook racing the `-p` process exit. `tick-close` is the floor:
//    the runner calls it with the action's execution file, and it writes
//    the tick-end row (duration and outcome from that file) only when the
//    session's shard has a slash-prompt with no tick-end after it.
//
// 7. SCRIPT ROWS (VE1b, 2026-10-20). The visual and e2e suite had no run
//    record: nothing logged npm scripts, so its cost and its approval
//    latency were unknowable. A Bash call that runs `npm run verify:visual`,
//    `e2e:<name>`, `critique:drive`, `smoke:bundler` or `baseline:approve`
//    now writes a `script` row and, from PostToolUse or PostToolUseFailure,
//    its `script-end` row. The scripts themselves know nothing about
//    telemetry. A CI run is not a Claude session and writes no row; its
//    record is the workflow step summary.
//
// Zero dependencies. Newest rows last.

import fs from 'node:fs'
import path from 'node:path'

// Anchor every path to the project root. CLAUDE_PROJECT_DIR is set by
// the harness; cwd is the fallback and is only correct at the root.
const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd()
/** Directory holding one shard per session per UTC date. */
const LOG_DIR = path.join(ROOT, 'telemetry')
// Pairs *-end rows with their start rows and holds the tick's start
// time. Session-scoped, gitignored, safe to delete at any point.
const STATE = path.join(ROOT, '.claude', 'hooks', '.telemetry-state.json')

const HEADER = `# Telemetry shard — one session's skill & subagent invocations

Appended by \`.claude/hooks/telemetry.mjs\` (see its header for what each
column means and how attribution can be wrong). One file per session per
UTC date; \`npm run telemetry\` prints every shard as one table. Newest rows
last. Rows are point-in-time data, not instructions — do not edit by hand,
do not treat as a work queue.

Start rows (\`skill\`, \`subagent\`, …) pair with an \`-end\` row carrying the
duration and outcome. A start row with no \`-end\` row means the tick died
before the call returned. \`-\` means not known at write time, never a guess.

| when (UTC) | event | name | model | dur | detail |
|---|---|---|---|---|---|
`

// --- formatting -----------------------------------------------------

/** Sanitise one value into a markdown table cell. Never returns ''. */
const cell = (s, max = 90) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .replaceAll('|', '\\|')
    .trim()
    .slice(0, max) || '-'

/** Milliseconds → compact human duration ('4s', '1m12s', '2h03m'). */
const humanDur = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) return '-'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`
}

const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z')

// --- sidecar state --------------------------------------------------

const readState = () => {
  try {
    return JSON.parse(fs.readFileSync(STATE, 'utf-8'))
  } catch {
    return {}
  }
}

const writeState = (next) => {
  try {
    fs.mkdirSync(path.dirname(STATE), { recursive: true })
    fs.writeFileSync(STATE, JSON.stringify(next))
  } catch {
    /* best-effort: losing state costs a duration, not a tick */
  }
}

/**
 * Identify one in-flight call so PostToolUse can find the PreToolUse
 * that opened it. Parallel spawns of the same agent type are told apart
 * by their description, which is why detail is part of the key. The
 * separator is a string no field can contain after cell() collapses
 * whitespace.
 */
const openKey = (sessionId, event, name, detail) =>
  [sessionId || '-', event, name, String(detail ?? '').slice(0, 60)].join(' >> ')

// --- transcript facts -----------------------------------------------

/**
 * Newest main-thread assistant model id in the transcript, or null.
 *
 * Reads a bounded tail (256KB covers many turns), drops the first
 * partial line, parses each remaining line as JSON and keeps only
 * `assistant` entries that are not sidechain (i.e. main thread, not a
 * subagent's own turns). Returns the last such entry's message.model.
 */
function resolveModel(transcriptPath) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return null
    const size = fs.statSync(transcriptPath).size
    const len = Math.min(size, 256 * 1024)
    const fd = fs.openSync(transcriptPath, 'r')
    const buf = Buffer.alloc(len)
    fs.readSync(fd, buf, 0, len, size - len)
    fs.closeSync(fd)
    const lines = buf.toString('utf-8').split('\n')
    // A tail read almost always starts mid-line; that fragment is not
    // parseable JSON and must not be treated as a record.
    if (len < size) lines.shift()
    let model = null
    for (const line of lines) {
      if (!line.startsWith('{')) continue
      let rec
      try {
        rec = JSON.parse(line)
      } catch {
        continue // truncated final line, or a record we don't care about
      }
      if (rec?.type !== 'assistant') continue
      if (rec?.isSidechain === true) continue // a subagent's model, not ours
      if (rec?.message?.model) model = rec.message.model
    }
    return model
  } catch {
    return null
  }
}

// --- log writing ----------------------------------------------------

/**
 * The shard file for one session on one UTC date. The session id is
 * reduced to filename-safe characters; a payload with no id (never seen
 * from the harness, but possible from a hand-run) shares one
 * `unknown-session` shard for the day rather than being dropped.
 */
const shardPath = (sessionId, iso) => {
  const id = String(sessionId ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
  return path.join(LOG_DIR, `${iso.slice(0, 10)}_${id || 'unknown-session'}.md`)
}

function appendRow({ sessionId, event, name, model, dur, detail }) {
  const when = nowIso()
  const row = `| ${when} | ${cell(event, 20)} | ${cell(name, 40)} | ${cell(model, 40)} | ${cell(dur, 10)} | ${cell(detail)} |`
  const file = shardPath(sessionId, when)
  fs.mkdirSync(LOG_DIR, { recursive: true })
  // Append-only: a shard belongs to one session, so there is nothing to
  // merge or trim. A new shard starts with the table header.
  fs.appendFileSync(file, (fs.existsSync(file) ? '' : HEADER) + row + '\n')
}

// --- event classification -------------------------------------------

/**
 * The loop verb a Read targets, or null. Matches `<root>/skills/<verb>.md`
 * where the parent directory is the repo's top-level `skills/`, whatever
 * checkout or worktree it sits in.
 */
function verbOfBash(command) {
  const cmd = String(command ?? '').replace(/\\/g, '/')
  const m = cmd.match(/\b(?:cat|sed|head|tail|less|more|awk|bat)\b[^|;&]*?((?:\S*\/)?skills\/[a-z0-9][a-z0-9-]*\.md)\b/i)
  return m ? verbOfRead(m[1]) : null
}

/**
 * The npm scripts whose runs are logged as `script` rows: the visual gate
 * and the e2e legs around it. `npm run verify` and the rest are not. `npm`
 * must stand where a command starts (line start, or after `;`, `&`, `|`,
 * `(`, past any `VAR=value` prefixes), so a heredoc or a grep that only
 * mentions a script name is not a run.
 */
const SCRIPT_RE =
  /(?:^|[;&|(\n])\s*(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*npm\s+(?:[^|;&\n]*?\s)?run\s+(?:[^|;&\n]*?\s)?(verify:visual|e2e:[a-z0-9-]+(?::[a-z0-9-]+)*|critique:drive|smoke:bundler|baseline:approve)(?![\w:-])/

/** The logged npm script a Bash command runs, or null. */
function scriptOfBash(command) {
  const m = String(command ?? '').match(SCRIPT_RE)
  return m ? m[1] : null
}

/**
 * The exit code of a finished Bash call: the payload's own field when it
 * has one, else the `Exit code N` a failed call reports, else 0 for a call
 * PostToolUse saw succeed. null when a failure names no code.
 */
function exitCodeOf(input) {
  const res = input?.tool_response
  for (const v of [res?.exit_code, res?.exitCode, res?.code]) if (Number.isInteger(v)) return v
  const text = [input?.error, res?.error, typeof res === 'string' ? res : res?.stderr].filter(Boolean).join('\n')
  const m = text.match(/Exit code (\d+)/i)
  if (m) return Number(m[1])
  return input?.hook_event_name === 'PostToolUseFailure' || input?.error ? null : 0
}

/**
 * The smoke summary counts a run printed (`smoke-screens: matched 13`, …),
 * or null when the output carries no full summary.
 */
function smokeCounts(input) {
  const res = input?.tool_response
  const text = [res?.stdout, typeof res === 'string' ? res : '', input?.error].filter(Boolean).join('\n')
  const read = (k) => {
    const m = text.match(new RegExp(`\\b${k}\\s+(\\d+)`))
    return m ? Number(m[1]) : null
  }
  const counts = { matched: read('matched'), differing: read('differing'), missing: read('missing') }
  if (Object.values(counts).some((n) => n === null)) return null
  return { ...counts, nondeterministic: read('nondeterministic') ?? 0 }
}

/**
 * The exit code the script itself chose. Its printed summary outranks the
 * Bash call's code, because a `| tail` or `; echo` after the script hides
 * its code from the call (smoke-screens' exit order: 4, 2, 1, 0).
 */
function scriptExitCode(input, counts) {
  const code = exitCodeOf(input)
  if (!counts || (code !== 0 && code !== null)) return code
  if (counts.nondeterministic > 0) return 4
  if (counts.missing > 0) return 2
  if (counts.differing > 0) return 1
  return code
}

/** The detail of a script-end row: the exit-code outcome, then the counts. */
function scriptOutcome(input) {
  if (input?.tool_input?.run_in_background === true) return 'backgrounded'
  const counts = smokeCounts(input)
  const code = scriptExitCode(input, counts)
  const outcome =
    code === 0 ? 'ok' : code === 1 ? 'diff' : code === 2 ? 'missing' : `error: ${code ?? 'unknown'}`
  if (!counts) return outcome
  return `${outcome}; matched ${counts.matched} / differing ${counts.differing} / missing ${counts.missing}`
}

function verbOfRead(filePath) {
  const p = String(filePath ?? '').replace(/\\/g, '/')
  const m = p.match(/(?:^|\/)skills\/([a-z0-9][a-z0-9-]*)\.md$/i)
  if (!m) return null
  if (/(?:^|\/)(?:\.claude|plan\/archive|node_modules)\//.test(p)) return null
  return m[1].toLowerCase()
}

/**
 * Map a tool call to its telemetry identity, or null for tools we do
 * not log. Shared by PreToolUse and PostToolUse so a start row and its
 * end row always agree on event and name.
 */
function classify(input) {
  const tool = String(input?.tool_name ?? '')
  const ti = input?.tool_input ?? {}
  if (tool === 'Skill')
    return {
      event: 'skill',
      name: ti.skill ?? ti.name ?? ti.command,
      detail: ti.args ? `args: ${ti.args}` : '',
      pinnedModel: null,
    }
  if (tool === 'SlashCommand')
    return {
      event: 'slash-command',
      name: String(ti.command ?? '').split(/\s+/)[0],
      detail: ti.command,
      pinnedModel: null,
    }
  if (tool === 'Read' || tool === 'Bash') {
    const verb = tool === 'Read' ? verbOfRead(ti.file_path) : verbOfBash(ti.command)
    if (verb) return { event: 'verb-read', name: verb, detail: '', pinnedModel: null, noEnd: true }
    const script = tool === 'Bash' ? scriptOfBash(ti.command) : null
    if (!script) return null
    return { event: 'script', name: script, detail: ti.command, pinnedModel: null }
  }
  if (tool === 'Task' || tool === 'Agent')
    return {
      event: 'subagent',
      name: ti.subagent_type ?? 'general-purpose',
      detail: ti.description ?? ti.prompt,
      // A spawn may pin its own model; that beats the transcript.
      pinnedModel: ti.model ?? null,
    }
  return null
}

/** Read the outcome of a finished tool call off the PostToolUse payload. */
function outcomeOf(input) {
  const res = input?.tool_response
  const failed =
    input?.hook_event_name === 'PostToolUseFailure' ||
    typeof input?.error === 'string' ||
    res?.is_error === true ||
    res?.isError === true ||
    (typeof res?.status === 'string' && /error|fail/i.test(res.status))
  if (!failed) return 'ok'
  const why = input?.error ?? res?.error ?? res?.message ?? (typeof res === 'string' ? res : '')
  return `error: ${String(why).slice(0, 70) || 'unspecified'}`
}

// --- modes ----------------------------------------------------------

/** PreToolUse: open an invocation and write its start row. */
function toolStart(input) {
  const c = classify(input)
  if (!c) return
  const state = readState()
  if (c.noEnd) {
    // A verb read is a single row, once per verb per tick: a long skill
    // file read in chunks must not log a row per chunk.
    state.verbsRead ??= []
    if (state.verbsRead.includes(c.name)) return
    state.verbsRead.push(c.name)
    state.tickStart ??= Date.now()
    state.logged = true
    writeState(state)
    appendRow({
      sessionId: input?.session_id,
      event: c.event,
      name: c.name,
      model: resolveModel(input?.transcript_path) ?? '-',
      dur: '-',
      detail: c.detail,
    })
    return
  }
  state.open ??= {}
  state.open[openKey(input?.session_id, c.event, c.name, c.detail)] = Date.now()
  state.tickStart ??= Date.now()
  state.logged = true // this tick invoked a verb, so it earns a tick-end row
  writeState(state)
  appendRow({
    sessionId: input?.session_id,
    event: c.event,
    name: c.name,
    model: c.pinnedModel ?? resolveModel(input?.transcript_path) ?? '-',
    dur: '-',
    detail: c.detail,
  })
}

/** PostToolUse / PostToolUseFailure: close the matching invocation and write its end row. */
function toolEnd(input) {
  const c = classify(input)
  if (!c || c.noEnd) return
  const state = readState()
  const key = openKey(input?.session_id, c.event, c.name, c.detail)
  const started = state.open?.[key]
  if (state.open) delete state.open[key]
  state.logged = true // this tick invoked a verb, so it earns a tick-end row
  writeState(state)
  appendRow({
    sessionId: input?.session_id,
    event: `${c.event}-end`,
    name: c.name,
    model: c.pinnedModel ?? resolveModel(input?.transcript_path) ?? '-',
    dur:
      c.event === 'script' && input?.tool_input?.run_in_background === true
        ? '-'
        : Number.isFinite(input?.duration_ms)
          ? humanDur(input.duration_ms)
          : started
            ? humanDur(Date.now() - started)
            : '-',
    detail: c.event === 'script' ? scriptOutcome(input) : outcomeOf(input),
  })
}

/**
 * UserPromptSubmit: marks the start of a tick, and logs the prompt when it
 * is a slash dispatch. The model is often '-' here: on a fresh session no
 * assistant turn has happened yet, so there is nothing to read.
 */
function promptMode(input) {
  const prompt = String(input?.prompt ?? '').trim()
  // A slash prompt is CI dispatching a skill (claude-code-action fires
  // '/command' with no Skill tool call, so the prompt is the only
  // record). Prose is the user talking, not an invocation.
  const isDispatch = prompt.startsWith('/')
  // EVERY prompt starts a new tick, slash or not — otherwise an attended
  // session that never invokes a logged verb has no tick start, and its
  // tick-end row can only record a '-' duration. Anything still open
  // belonged to the previous tick. `logged` decides whether this tick has
  // earned a tick-end row; a verb invoked later in the tick sets it too.
  writeState({ tickStart: Date.now(), open: {}, logged: isDispatch })
  if (!isDispatch) return
  appendRow({
    sessionId: input?.session_id,
    event: 'slash-prompt',
    name: prompt.split(/\s+/)[0],
    model: resolveModel(input?.transcript_path) ?? '-',
    dur: '-',
    detail: prompt,
  })
}

/**
 * Stop: the main agent finished responding. This row is what makes a
 * silent tick legible — a slash-prompt followed straight by a tick-end
 * with no rows between did genuinely nothing, which previously looked
 * identical to a tick whose work the hook could not see.
 *
 * It is written only for a tick that logged something (a slash dispatch,
 * a skill, a subagent) or that has a call still open. An ordinary
 * conversational turn invokes no verb and closes nothing, so it gets no
 * row: it is the user talking, not a tick, and logging it buried the
 * real ticks in churn — every turn dirtied the log and demanded its
 * own commit.
 */
function tickEnd(input) {
  const state = readState()
  const leaked = Object.keys(state.open ?? {}).length
  if (!state.logged && !leaked) {
    writeState({})
    return
  }
  appendRow({
    sessionId: input?.session_id,
    event: 'tick-end',
    name: '-',
    model: resolveModel(input?.transcript_path) ?? '-',
    dur: state.tickStart ? humanDur(Date.now() - state.tickStart) : '-',
    detail: leaked ? `${leaked} call(s) never returned` : 'ok',
  })
  writeState({})
}

/**
 * Runner floor for a lost tick-end row (see header note 6). Reads the
 * claude-code-action execution file (a JSON array of stream events), finds
 * the session id, the duration and whether the run errored, and appends a
 * tick-end row to that session's newest shard only if its last
 * slash-prompt has no tick-end after it. Never writes a second row.
 */
function tickClose(executionFile) {
  let events
  try {
    const data = JSON.parse(fs.readFileSync(String(executionFile), 'utf-8'))
    events = Array.isArray(data) ? data : [data]
  } catch {
    return
  }
  const sessionId = events.find((e) => e && typeof e.session_id === 'string')?.session_id
  if (!sessionId) return
  const id = String(sessionId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
  if (!fs.existsSync(LOG_DIR)) return
  const files = fs.readdirSync(LOG_DIR).filter((f) => f.endsWith(`_${id}.md`)).sort()
  if (!files.length) return
  const lines = files.flatMap((f) => fs.readFileSync(path.join(LOG_DIR, f), 'utf-8').split('\n'))
  const events_ = lines.filter((l) => /^\| 20\d\d-/.test(l)).map((l) => l.split('|')[2].trim())
  const lastPrompt = events_.lastIndexOf('slash-prompt')
  if (lastPrompt === -1 || events_.slice(lastPrompt).includes('tick-end')) return
  const result = [...events].reverse().find((e) => e && e.type === 'result') ?? {}
  const model =
    events.find((e) => e && e.type === 'system' && typeof e.model === 'string')?.model ?? '-'
  appendRow({
    sessionId,
    event: 'tick-end',
    name: '-',
    model,
    dur: humanDur(Number(result.duration_ms)),
    detail: result.is_error ? `error: ${String(result.subtype ?? 'run failed').slice(0, 60)} (runner)` : 'ok (runner: Stop hook row missing)',
  })
}

// --- entry ----------------------------------------------------------

function readStdinJson() {
  try {
    const raw = fs.readFileSync(0, 'utf-8')
    return raw.trim() ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

try {
  const mode = process.argv[2]
  // tick-close is run by the CI runner, not the harness: no hook payload.
  const input = mode === 'tick-close' ? {} : readStdinJson()
  if (mode === 'tool') toolStart(input)
  else if (mode === 'tool-end') toolEnd(input)
  else if (mode === 'prompt') promptMode(input)
  else if (mode === 'tick-end') tickEnd(input)
  else if (mode === 'tick-close') tickClose(process.argv[3])
} catch {
  /* observability must never block work */
}
process.exit(0)
