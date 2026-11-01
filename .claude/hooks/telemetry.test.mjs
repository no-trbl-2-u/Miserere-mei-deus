// .claude/hooks/telemetry.test.mjs — behaviour tests for the telemetry hook.
//
// Part of the root `npm test` suite. Drives .claude/hooks/telemetry.mjs with
// synthetic hook payloads inside a throwaway project root and asserts the rows
// it writes, including a regression test for the relative-LOG-path bug that
// diverted rows into workspace-package logs (fixed 2026-09-15).
//
// The hook must never block a tick, so it always exits 0; these tests assert on
// the rows it produces, not on its exit code.

import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test, before, after } from 'node:test'

const HOOK = path.resolve('.claude/hooks/telemetry.mjs')

let root // throwaway CLAUDE_PROJECT_DIR for the whole file
let transcript

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-hook-'))
  fs.mkdirSync(path.join(root, '.claude', 'hooks'), { recursive: true })
  // A minimal transcript: one main-thread assistant turn, plus a sidechain
  // turn on a different model that resolveModel must NOT pick up.
  transcript = path.join(root, 'transcript.jsonl')
  fs.writeFileSync(
    transcript,
    [
      JSON.stringify({ type: 'user', isSidechain: false, message: { role: 'user' } }),
      JSON.stringify({
        type: 'assistant',
        isSidechain: false,
        message: { model: 'claude-opus-5' },
      }),
      JSON.stringify({
        type: 'assistant',
        isSidechain: true,
        message: { model: 'claude-haiku-4-5' },
      }),
    ].join('\n') + '\n',
  )
})

after(() => fs.rmSync(root, { recursive: true, force: true }))

/** Run the hook in `mode` with `payload` on stdin, from a given cwd. */
const fire = (mode, payload, cwd = root) =>
  execFileSync('node', [HOOK, mode], {
    input: JSON.stringify(payload),
    cwd,
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
  })

/** The throwaway root's shard directory, and the shard files in it. */
const logDir = () => path.join(root, 'telemetry')
const shards = () => (fs.existsSync(logDir()) ? fs.readdirSync(logDir()).sort() : [])

/**
 * Every data row in the throwaway root's shards, in write order. Each
 * shard is append-only, and within one test run the rows are written
 * sequentially, so sorting by the timestamp cell (stable) recovers the
 * write order across shards.
 */
const rows = () =>
  shards()
    .flatMap((f) => fs.readFileSync(path.join(logDir(), f), 'utf-8').split('\n'))
    .filter((l) => /^\| 20\d\d-/.test(l))
    .sort((a, b) => (a.slice(2, 22) < b.slice(2, 22) ? -1 : a.slice(2, 22) > b.slice(2, 22) ? 1 : 0))

const base = () => ({ session_id: 's1', transcript_path: transcript })

test('a slash prompt is logged with the main-thread model', () => {
  fire('prompt', { ...base(), prompt: '/march' })
  const [row] = rows()
  assert.match(row, /\| slash-prompt \| \/march \|/)
  assert.match(row, /claude-opus-5/, 'model comes from the main-thread assistant entry')
  assert.doesNotMatch(row, /haiku/, "a sidechain's model is never attributed to the tick")
})

test('a plain prompt is not logged', () => {
  const before = rows().length
  fire('prompt', { ...base(), prompt: 'just a question' })
  assert.equal(rows().length, before)
})

// A plain prompt still opens a tick even though it writes no row. Without
// that, an attended session that never invokes a logged verb has no tick
// start and its tick-end can only report a '-' duration.
/** Forget any tick left open by an earlier test, so a case starts clean. */
const clearTick = () =>
  fs.rmSync(path.join(root, '.claude', 'hooks', '.telemetry-state.json'), { force: true })

// A conversational turn is the user talking, not a tick. Logging it dirtied
// the log every turn and demanded a commit per turn, burying the real
// ticks in churn.
test('a conversational turn writes no tick-end row at all', () => {
  clearTick()
  const before = rows().length
  fire('prompt', { ...base(), prompt: 'a prose question, no slash' })
  fire('tick-end', base())
  assert.equal(rows().length, before, 'a turn that invoked no verb leaves no trace')
})

// …but a tick that did invoke something still closes with a duration, which
// is the whole point of the tick-end row.
test('a tick that invoked a verb closes with a duration', () => {
  clearTick()
  fire('prompt', { ...base(), prompt: 'a prose question, no slash' })
  const call = { ...base(), tool_name: 'Skill', tool_input: { skill: 'critique' } }
  fire('tool', call)
  fire('tool-end', { ...call, tool_response: { status: 'success' } })
  fire('tick-end', base())
  const end = rows().at(-1)
  assert.match(end, /\| tick-end \|/)
  assert.match(end, /\| \d+[smh][^|]*\|/, `tick-end should carry a duration: ${end}`)
})

// A slash dispatch that then does nothing is the signal the tick-end row
// exists to make legible — it must not be silenced as conversational.
test('a slash dispatch that does nothing still closes the tick', () => {
  clearTick()
  fire('prompt', { ...base(), prompt: '/march' })
  fire('tick-end', base())
  const [dispatch, end] = rows().slice(-2)
  assert.match(dispatch, /\| slash-prompt \| \/march \|/)
  assert.match(end, /\| tick-end \|/, 'a dispatch that reached no verb is still a tick')
})

test('a subagent spawn writes a start row, then an end row with its duration', () => {
  const spawn = {
    ...base(),
    tool_name: 'Task',
    tool_input: {
      subagent_type: 'playtester',
      description: 'Run pass 12',
      model: 'claude-sonnet-5',
    },
  }
  fire('tool', spawn)
  const start = rows().at(-1)
  assert.match(start, /\| subagent \| playtester \|/)
  assert.match(start, /claude-sonnet-5/, 'a pinned spawn model beats the transcript')
  assert.match(start, /\| - \| Run pass 12 \|$/, 'a start row carries no duration')

  fire('tool-end', { ...spawn, tool_response: { status: 'success' } })
  const end = rows().at(-1)
  assert.match(end, /\| subagent-end \| playtester \|/)
  assert.match(end, /\| \d+s \|/, 'an end row carries a duration')
  assert.match(end, /\| ok \|$/)
})

test('a failed call records its error on the end row', () => {
  const call = { ...base(), tool_name: 'Skill', tool_input: { skill: 'forge' } }
  fire('tool', call)
  fire('tool-end', {
    ...call,
    tool_response: { is_error: true, error: 'wiring checklist incomplete' },
  })
  assert.match(rows().at(-1), /\| skill-end \| forge \|.*error: wiring checklist incomplete \|$/)
})

test('tick-end reports a call that never returned', () => {
  fire('tool', { ...base(), tool_name: 'Skill', tool_input: { skill: 'iterate' } })
  fire('tick-end', base())
  const end = rows().at(-1)
  assert.match(end, /\| tick-end \|/)
  assert.match(end, /1 call\(s\) never returned \|$/)
  assert.match(end, /\| \d+[smh]/, 'tick-end carries the tick duration')
})

// The bug this suite exists for: hooks do not reliably run with cwd = repo
// root, and a bare relative log path then writes a second log inside the
// workspace package. Six real rows were lost that way before it was caught.
test('a tick running inside a package still writes to the root log', () => {
  const pkg = path.join(root, 'axiomancer-mechanics')
  fs.mkdirSync(pkg, { recursive: true })
  const before = rows().length
  fire('tool', { ...base(), tool_name: 'Task', tool_input: { subagent_type: 'Explore' } }, pkg)
  assert.equal(rows().length, before + 1, 'the row landed in the root log')
  assert.ok(!fs.existsSync(path.join(pkg, 'telemetry')), 'no second log was created')
})

// The reason the log is sharded (2026-09-23): a single shared file made
// every pair of branches that each logged a row conflict on merge. Two
// sessions must therefore never write to the same file.
test('two sessions write to two separate shards, named by date and session id', () => {
  const call = (session_id) => ({ session_id, transcript_path: transcript, tool_name: 'Skill', tool_input: { skill: 'jot' } })
  fire('tool', call('sess-A'))
  fire('tool', call('sess-B'))
  const today = new Date().toISOString().slice(0, 10)
  const a = path.join(logDir(), `${today}_sess-A.md`)
  const b = path.join(logDir(), `${today}_sess-B.md`)
  assert.ok(fs.existsSync(a) && fs.existsSync(b), `expected both shards, got ${shards().join(', ')}`)
  assert.equal(fs.readFileSync(a, 'utf-8').split('\n').filter((l) => /^\| 20/.test(l)).length, 1)
  assert.equal(fs.readFileSync(b, 'utf-8').split('\n').filter((l) => /^\| 20/.test(l)).length, 1)
})

test('a session id is reduced to filename-safe characters', () => {
  fire('tool', { session_id: '../../etc/pa ss', transcript_path: transcript, tool_name: 'Skill', tool_input: { skill: 'jot' } })
  const today = new Date().toISOString().slice(0, 10)
  assert.ok(fs.existsSync(path.join(logDir(), `${today}_etcpass.md`)), `got ${shards().join(', ')}`)
  assert.ok(!fs.existsSync(path.join(root, '..', 'etc')), 'no path traversal out of the log directory')
})

test('a payload with no session id still logs, to an unknown-session shard', () => {
  fire('tool', { transcript_path: transcript, tool_name: 'Skill', tool_input: { skill: 'jot' } })
  const today = new Date().toISOString().slice(0, 10)
  assert.ok(fs.existsSync(path.join(logDir(), `${today}_unknown-session.md`)))
})

test('garbage on stdin never blocks the tick', () => {
  assert.doesNotThrow(() =>
    execFileSync('node', [HOOK, 'tool'], {
      input: 'not json at all',
      cwd: root,
      env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    }),
  )
})

test('every shard carries one table header and stays parseable as a markdown table', () => {
  assert.ok(shards().length > 0)
  for (const f of shards()) {
    const lines = fs.readFileSync(path.join(logDir(), f), 'utf-8').split('\n')
    const headers = lines.filter((l) => l.startsWith('| when'))
    assert.equal(headers.length, 1, `${f} has exactly one table header`)
    assert.equal(headers[0].split('|').length - 2, 6, 'six columns')
  }
  for (const row of rows()) {
    assert.equal(row.split('|').length - 2, 6, `row has six cells: ${row}`)
  }
})

// /march runs its verbs by reading skills/<verb>.md, not through the Skill
// tool. Those reads are the only trace a march-dispatched verb leaves, so
// they are logged (R0, 2026-09-28). Rows from earlier tests can share a
// timestamp second, so these cases count verb-read rows, not row positions.
const verbRows = () => rows().filter((r) => r.includes('| verb-read |'))

test('reading a root skills/<verb>.md logs one verb-read row per tick', () => {
  clearTick()
  fire('prompt', { ...base(), prompt: '/march' })
  const before = verbRows().length
  const read = (file_path) =>
    fire('tool', { ...base(), tool_name: 'Read', tool_input: { file_path } })
  read(String.raw`C:\repo\skills\ship-a-phase.md`)
  read('/repo/skills/ship-a-phase.md') // a second chunk of the same file
  fire('tool-end', { ...base(), tool_name: 'Read', tool_input: { file_path: '/repo/skills/ship-a-phase.md' } })
  const added = verbRows().slice(before)
  assert.equal(added.length, 1, `one row per verb per tick: ${added.join('\n')}`)
  assert.match(added[0], /\| verb-read \| ship-a-phase \|/)
})

test('reads outside the root skills/ directory are not logged', () => {
  clearTick()
  fire('prompt', { ...base(), prompt: '/march' })
  const before = verbRows().length
  for (const file_path of [
    '/repo/plan/archive/2026-09-28-revamp-r0/skills/forge.md',
    '/repo/.claude/skills/kb-query/SKILL.md',
    '/repo/node_modules/x/skills/y.md',
    '/repo/skills/notes.txt',
    '/repo/AGENTS.md',
  ])
    fire('tool', { ...base(), tool_name: 'Read', tool_input: { file_path } })
  assert.equal(verbRows().length, before)
})

test('a shell read of a root skills/<verb>.md counts as a verb-read (CI ticks)', () => {
  clearTick()
  fire('prompt', { ...base(), prompt: '/march' })
  const before = verbRows().length
  const bash = (command) => fire('tool', { ...base(), tool_name: 'Bash', tool_input: { command } })
  bash('cat skills/march.md')
  bash("sed -n '1,120p' /home/runner/work/Axiomancer/Axiomancer/skills/critique.md")
  bash('head -50 skills/march.md') // same verb again: still one row
  const added = verbRows().slice(before)
  assert.equal(added.length, 2, added.join('\n'))
  assert.match(added[0], /\| verb-read \| march \|/)
  assert.match(added[1], /\| verb-read \| critique \|/)
})

test('other shell commands are not verb-reads', () => {
  clearTick()
  fire('prompt', { ...base(), prompt: '/march' })
  const before = verbRows().length
  for (const command of [
    'git add skills/march.md',
    'npm test',
    'cat plan/archive/x/skills/forge.md',
    'cat .claude/skills/kb-query/SKILL.md',
    'grep -n Retro skills/march.md',
  ])
    fire('tool', { ...base(), tool_name: 'Bash', tool_input: { command } })
  assert.equal(verbRows().length, before)
})

// The visual/e2e suite's run record (VE1b): a Bash call running one of its
// npm scripts opens a `script` row and closes it with the exit-code outcome
// and the smoke counts.
const scriptRows = () => rows().filter((r) => /\| script(-end)? \|/.test(r))
const bashCall = (command, extra = {}) => ({ ...base(), tool_name: 'Bash', tool_input: { command, ...extra } })

test('the five suite scripts each open a script row named for the script', () => {
  clearTick()
  const before = scriptRows().length
  for (const command of [
    'npm run verify:visual',
    'SMOKE_RUNS=5 npm run verify:visual 2>&1 | tail -20',
    'npm run e2e:fixture',
    'npm run e2e:combat-round:boss',
    "cat > a.txt <<'EOF'\nnot a run\nEOF\nnpm run e2e:combat-round:boss",
    'npm run --workspace axiomancer-mobile critique:drive',
    'cd axiomancer-mobile && npm run smoke:bundler',
    'npm run baseline:approve',
  ])
    fire('tool', bashCall(command))
  const names = scriptRows().slice(before).map((r) => r.split('|')[3].trim())
  assert.deepEqual(names, ['verify:visual', 'verify:visual', 'e2e:fixture', 'e2e:combat-round:boss', 'e2e:combat-round:boss', 'critique:drive', 'smoke:bundler', 'baseline:approve'])
})

test('other npm scripts and mentions of a script name are not script rows', () => {
  clearTick()
  const before = scriptRows().length
  for (const command of [
    'npm run verify',
    'npm run verify --workspace axiomancer-mobile',
    'npm test',
    'grep -n verify:visual package.json',
    'npm run verify:visual-extra',
    'cat skills/march.md',
    "cat > t.test.mjs <<'EOF'\nconst cmds = [\n  'npm run verify:visual',\n]\nEOF",
    'echo npm && echo run verify:visual',
    "cat > notes.md <<'EOF'\nrun this first:\nnpm run verify:visual\nthen look\nEOF",
    'cat <<EOF > run.sh\nnpm run e2e:fixture\nEOF\necho done',
  ])
    fire('tool', bashCall(command))
  assert.equal(scriptRows().length, before)
})

test('a script-end row carries the smoke counts and the exit-code outcome', () => {
  clearTick()
  const ok = bashCall('npm run verify:visual')
  fire('tool', ok)
  fire('tool-end', {
    ...ok,
    hook_event_name: 'PostToolUse',
    duration_ms: 21_400,
    tool_response: { stdout: 'smoke-screens: matched     13\nsmoke-screens: differing   0\nsmoke-screens: missing     0\n', stderr: '' },
  })
  const end = rows().at(-1)
  assert.match(end, /\| script-end \| verify:visual \|/)
  assert.match(end, /\| 21s \|/, 'the harness duration is the row duration')
  assert.match(end, /\| ok; matched 13 \/ differing 0 \/ missing 0 \|$/)
})

test('a failed script maps its exit code: 1 diff, 2 missing, other codes an error', () => {
  clearTick()
  const cases = [
    [1, /\| diff; matched 11 \/ differing 2 \/ missing 0 \|$/],
    [2, /\| missing; matched 11 \/ differing 0 \/ missing 2 \|$/],
    [4, /\| error: 4 \|$/],
  ]
  for (const [code, want] of cases) {
    const call = bashCall(`npm run verify:visual # case ${code}`)
    fire('tool', call)
    const counts = code === 1 ? [11, 2, 0] : code === 2 ? [11, 0, 2] : null
    const out = counts ? `smoke-screens: matched ${counts[0]}\nsmoke-screens: differing ${counts[1]}\nsmoke-screens: missing ${counts[2]}` : 'nondeterministic: root'
    fire('tool-end', { ...call, hook_event_name: 'PostToolUseFailure', error: `Exit code ${code}\n${out}` })
    assert.match(rows().at(-1), want, `exit ${code}`)
  }
})

// A `| tail` or `; echo` after the script makes the Bash call exit 0 while the
// script exited 1; the summary it printed is the script's own verdict.
test('a pipe that hides the exit code still reads the outcome from the summary', () => {
  clearTick()
  const call = bashCall('npm run verify:visual 2>&1 | tail -20')
  fire('tool', call)
  fire('tool-end', {
    ...call,
    hook_event_name: 'PostToolUse',
    tool_response: { stdout: 'smoke-screens: matched     1\nsmoke-screens: differing   12\nsmoke-screens: missing     0\n' },
  })
  assert.match(rows().at(-1), /\| diff; matched 1 \/ differing 12 \/ missing 0 \|$/)
})

test('a backgrounded script run closes as backgrounded with no duration', () => {
  clearTick()
  const call = bashCall('npm run e2e:hazard', { run_in_background: true })
  fire('tool', call)
  fire('tool-end', { ...call, hook_event_name: 'PostToolUse', tool_response: { stdout: '' } })
  assert.match(rows().at(-1), /\| script-end \| e2e:hazard \| [^|]+ \| - \| backgrounded \|$/)
})

test('a plain Bash call that finishes writes no end row', () => {
  clearTick()
  const before = rows().length
  fire('tool-end', { ...bashCall('ls'), hook_event_name: 'PostToolUse', tool_response: { stdout: 'x' } })
  assert.equal(rows().length, before)
})

test('a Skill failure reported by PostToolUseFailure records its error', () => {
  const call = { ...base(), tool_name: 'Skill', tool_input: { skill: 'expand' } }
  fire('tool', call)
  fire('tool-end', { ...call, hook_event_name: 'PostToolUseFailure', error: 'skill not found' })
  assert.match(rows().at(-1), /\| skill-end \| expand \|.*error: skill not found \|$/)
})

test('tick-close writes the missing tick-end row once, from the execution file', () => {
  const sid = 'ci-run-1'
  fire('prompt', { session_id: sid, transcript_path: transcript, prompt: '/march' })
  // The Stop hook never fired: simulate by not calling tick-end.
  const exec = path.join(root, 'exec.json')
  fs.writeFileSync(
    exec,
    JSON.stringify([
      { type: 'system', subtype: 'init', session_id: sid, model: 'claude-opus-5-5' },
      { type: 'result', subtype: 'success', is_error: false, duration_ms: 439922, session_id: sid },
    ]),
  )
  const closeRows = () => rows().filter((r) => r.includes('| tick-end |') && r.includes('runner'))
  const before = closeRows().length
  execFileSync('node', [HOOK, 'tick-close', exec], { env: { ...process.env, CLAUDE_PROJECT_DIR: root } })
  execFileSync('node', [HOOK, 'tick-close', exec], { env: { ...process.env, CLAUDE_PROJECT_DIR: root } })
  const added = closeRows().slice(before)
  assert.equal(added.length, 1, 'written once, never twice')
  assert.match(added[0], /\| tick-end \| - \| claude-opus-5-5 \| 7m20s \| ok \(runner: Stop hook row missing\) \|/)
})

test('tick-close writes nothing when the Stop hook already closed the tick', () => {
  const sid = 'ci-run-2'
  fire('prompt', { session_id: sid, transcript_path: transcript, prompt: '/march' })
  fire('tick-end', { session_id: sid, transcript_path: transcript })
  const exec = path.join(root, 'exec2.json')
  fs.writeFileSync(exec, JSON.stringify([{ type: 'result', is_error: false, duration_ms: 1000, session_id: sid }]))
  const count = () => rows().filter((r) => r.includes('| tick-end |')).length
  const before = count()
  execFileSync('node', [HOOK, 'tick-close', exec], { env: { ...process.env, CLAUDE_PROJECT_DIR: root } })
  assert.equal(count(), before)
})
