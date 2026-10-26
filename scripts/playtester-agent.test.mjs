// scripts/playtester-agent.test.mjs — guard for .claude/agents/playtester.md.
//
// Part of the root `npm test` suite (phase PH1b). The playtester used to
// share one Playwright MCP browser with every other playtester; it now drives
// its own browser through `axiomancer-mobile/scripts/playtest-session.mjs`.
// This test keeps it there:
//
//   1. the frontmatter `tools` line grants Bash and no `mcp__playwright__*`;
//   2. a hard rule limits Bash to `playtest-session.mjs`;
//   3. the agent is told to `stop` its session at the end;
//   4. every session command the agent's body names is one the tool has.
//
//   node --test scripts/playtester-agent.test.mjs

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const AGENT = path.join(ROOT, '.claude', 'agents', 'playtester.md')
const SESSION_TOOL = path.join(ROOT, 'axiomancer-mobile', 'scripts', 'playtest-session.mjs')

/** The comma-separated `tools:` list of an agent file's frontmatter. */
export function toolsOf(text) {
  const front = /^---\n([\s\S]*?)\n---/.exec(text)
  if (!front) return null
  const line = /^tools:\s*(.*)$/m.exec(front[1])
  return line ? line[1].split(',').map((t) => t.trim()).filter(Boolean) : null
}

/** Problems with a tools list: Bash missing, or any Playwright MCP grant. */
export function toolsProblems(tools) {
  if (!tools) return ['no tools line']
  const problems = []
  if (!tools.includes('Bash')) problems.push('tools line has no Bash')
  for (const t of tools.filter((t) => t.startsWith('mcp__playwright__'))) problems.push(`tools line grants ${t}`)
  return problems
}

/** The numbered items under the agent's `## Hard rules` heading. */
export function hardRules(text) {
  const section = /^## Hard rules\n([\s\S]*?)(?=^## )/m.exec(text)
  if (!section) return []
  return section[1].split(/\n(?=\d+\. )/).map((r) => r.trim()).filter((r) => /^\d+\. /.test(r))
}

/** True when one hard rule limits Bash to the session tool. */
export function hasBashOnlyRule(rules) {
  return rules.some((r) => /\bBash\b/.test(r) && /playtest-session\.mjs/.test(r) && /\bonly\b/i.test(r))
}

/** The command names declared in the session tool's COMMANDS table. */
export function sessionCommands(source) {
  const table = /export const COMMANDS = \{([\s\S]*?)\n\}/.exec(source)
  if (!table) return []
  return [...table[1].matchAll(/^\s*(\w+): \{/gm)].map((m) => m[1])
}

/** Commands named in the body as backticked `ps <cmd> ...` calls. */
export function namedCommands(text) {
  return [...new Set([...text.matchAll(/`ps (\w+)\b/g)].map((m) => m[1]))]
}

const text = fs.readFileSync(AGENT, 'utf8')

test('the tools line grants Bash and no Playwright MCP tool', () => {
  assert.deepEqual(toolsProblems(toolsOf(text)), [])
})

test('the old MCP tools line fails the check', () => {
  const old = '---\nname: playtester\ntools: Read, Grep, Glob, mcp__playwright__browser_navigate, mcp__playwright__browser_click\n---\n'
  assert.deepEqual(toolsProblems(toolsOf(old)), [
    'tools line has no Bash',
    'tools line grants mcp__playwright__browser_navigate',
    'tools line grants mcp__playwright__browser_click',
  ])
})

test('a hard rule limits Bash to playtest-session.mjs', () => {
  const rules = hardRules(text)
  assert.ok(rules.length > 0, 'no ## Hard rules section')
  assert.ok(hasBashOnlyRule(rules), 'no hard rule says Bash runs playtest-session.mjs only')
  assert.equal(hasBashOnlyRule(['1. **Never modify code.**', '5. **Always close the browser cleanly** at the end.']), false)
})

test('the agent is told to stop its session', () => {
  assert.ok(hardRules(text).some((r) => /`stop`/.test(r) || /`ps stop/.test(r)), 'no hard rule says to stop the session')
  assert.match(text, /`ps stop --agent <name>`/)
})

test('every session command the agent names exists in the tool', () => {
  const known = sessionCommands(fs.readFileSync(SESSION_TOOL, 'utf8'))
  assert.ok(known.includes('start') && known.includes('stop'), `could not read COMMANDS from ${SESSION_TOOL}`)
  const named = namedCommands(text)
  assert.ok(named.includes('start'), 'the agent never names `ps start`')
  assert.deepEqual(named.filter((c) => !known.includes(c)), [])
})
