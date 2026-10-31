#!/usr/bin/env node
// scripts/env-run.mjs
//
// Cross-platform `VAR=x command` for npm scripts (phase HD1b, A6). cmd.exe
// cannot run `ENCOUNTER_KIND=boss node ...`, so the e2e:combat-round:*
// scripts pass the variables as leading KEY=value arguments instead:
//
//   node scripts/env-run.mjs ENCOUNTER_KIND=boss PRESET=sage node scripts/combat-round-e2e.mjs
//
// Leading KEY=value arguments are set in the child's environment; the first
// argument that is not one is the command. `node` runs as this process's own
// executable, so no shell is involved on any platform.

import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const ASSIGNMENT = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s

/** Split argv into the env assignments and the command that follows them. */
export function parseEnvRun(argv) {
  const env = {}
  let i = 0
  for (; i < argv.length; i++) {
    const m = ASSIGNMENT.exec(argv[i])
    if (!m) break
    env[m[1]] = m[2]
  }
  const [cmd, ...args] = argv.slice(i)
  return { env, cmd, args }
}

function main() {
  const { env, cmd, args } = parseEnvRun(process.argv.slice(2))
  if (!cmd) {
    console.error('env-run: usage: node scripts/env-run.mjs KEY=value... <command> [args...]')
    process.exit(2)
  }
  const child = spawn(cmd === 'node' ? process.execPath : cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    else process.exit(code ?? 1)
  })
  child.on('error', (err) => {
    console.error(`env-run: failed to spawn "${cmd}": ${err.message}`)
    process.exit(127)
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
