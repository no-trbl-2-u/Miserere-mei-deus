#!/usr/bin/env node
// scripts/playtest-sessions-e2e.mjs
//
// Phase PH1a: proves `playtest-session.mjs` gives each caller its own browser.
// It drives the CLI as an agent would (one process per command):
//
//   1. `prepare` once.
//   2. Four sessions started at once with seeds 1101 to 1104. Each enters a
//      live fight through /dev (`fight`), and its own `log` reports
//      `combat/encounter-mounted` with its own seed; its `pages` lists only
//      pages on its own server; its `shot` lands at the path it named.
//   3. One session reloads and goes to a second route, and its combat seed
//      still reads back (seeds are context-level init scripts).
//   4. A fifth session boots the hazard fixture with a minigame seed, and its
//      `log` shows `rng/minigame-seed` with that seed.
//
// Every session is stopped at the end, pass or fail.
//
//   npm run e2e:playtest-sessions -w axiomancer-mobile
//
// Exit codes: 0 = pass · 1 = an assertion failed · 3 = prepare failed.

import { execFile } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CLI = resolve(fileURLToPath(import.meta.url), '..', 'playtest-session.mjs')
const SEEDS = [1101, 1102, 1103, 1104]
const HAZARD_SEED = 4242
const HAZARD_FIXTURE = 'l30-bw-hazard-arrive'
const SHOT_DIR = mkdtempSync(join(tmpdir(), 'playtest-sessions-e2e-'))

function log(msg) { console.log(`playtest-sessions-e2e: ${msg}`) }

function cli(...args) {
    return new Promise((done) => {
        execFile(process.execPath, [CLI, ...args], { maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
            const line = stdout.trim().split('\n').at(-1) ?? ''
            let result
            try { result = JSON.parse(line) } catch { result = { ok: false, error: `no JSON from ${args[0]}: ${stdout}${stderr}`.slice(0, 600) } }
            done(result)
        })
    })
}

async function must(...args) {
    const result = await cli(...args)
    if (!result.ok) throw new Error(`${args.join(' ')} -> ${result.error}`)
    return result
}

function check(cond, msg) {
    if (!cond) throw new Error(msg)
}

async function fightCheck(agent, seed) {
    const started = await must('start', '--agent', agent, '--seed', String(seed))
    log(`${agent}: session on ${started.baseUrl}`)
    await must('fight', '--agent', agent)
    const { entries } = await must('log', '--agent', agent, '--tail', '200', '--domains', 'combat')
    const mounted = entries.filter((e) => e.kind === 'encounter-mounted')
    check(mounted.length > 0, `${agent}: no combat/encounter-mounted line`)
    check(mounted.every((e) => e.data?.seed === seed),
        `${agent}: encounter-mounted seeds ${JSON.stringify(mounted.map((e) => e.data?.seed))}, wanted ${seed}`)
    const { pages } = await must('pages', '--agent', agent)
    check(pages.length >= 1, `${agent}: no pages`)
    check(pages.every((p) => p.url.startsWith(started.baseUrl)),
        `${agent}: pages ${JSON.stringify(pages.map((p) => p.url))} are not all on ${started.baseUrl}`)
    const target = join(SHOT_DIR, `${agent}.png`)
    const shot = await must('shot', '--agent', agent, target)
    check(shot.path === target && existsSync(target), `${agent}: shot not at ${target} (got ${shot.path})`)
    check(!shot.path.includes('.playwright-mcp'), `${agent}: shot landed in .playwright-mcp`)
    log(`${agent}: encounter-mounted seed ${seed}, ${pages.length} own page(s), shot ${target}`)
    return started
}

async function seedSurvivesReload(agent, seed) {
    await must('reload', '--agent', agent)
    const afterReload = await must('eval', '--agent', agent, 'globalThis.__AXM_COMBAT_SEED__')
    check(afterReload.value === seed, `${agent}: after reload the combat seed reads ${afterReload.value}, wanted ${seed}`)
    await must('goto', '--agent', agent, '/character')
    const afterGoto = await must('eval', '--agent', agent, 'globalThis.__AXM_COMBAT_SEED__')
    check(afterGoto.value === seed, `${agent}: after a second goto the combat seed reads ${afterGoto.value}, wanted ${seed}`)
    log(`${agent}: seed ${seed} survives a reload and a second goto`)
}

async function hazardSeedCheck(agent) {
    await must('start', '--agent', agent, '--fixture', HAZARD_FIXTURE,
        '--minigame-seeds', JSON.stringify({ hazard: { seed: HAZARD_SEED } }))
    await must('goto', '--agent', agent, '/(tabs)/exploration')
    await must('wait', '--agent', agent, 'hazard-stakes', '--timeout', '30000')
    const { entries } = await must('log', '--agent', agent, '--tail', '200', '--domains', 'rng')
    const lines = entries.filter((e) => e.kind === 'minigame-seed' && e.data?.key === 'hazard')
    check(lines.length > 0, `${agent}: no rng/minigame-seed line for the hazard`)
    check(lines.some((e) => e.data.seed === HAZARD_SEED && e.data.source === 'unified'),
        `${agent}: hazard seed lines ${JSON.stringify(lines.map((e) => e.data))}, wanted ${HAZARD_SEED} from the unified global`)
    log(`${agent}: rng/minigame-seed hazard ${HAZARD_SEED} (unified)`)
}

async function main() {
    const prepared = await cli('prepare')
    if (!prepared.ok) { console.error(`playtest-sessions-e2e: prepare failed: ${prepared.error}`); process.exit(3) }
    log(`export ${prepared.reused ? 'reused' : 'built'} (${String(prepared.hash).slice(0, 12)})`)

    const agents = SEEDS.map((_, i) => `e2e-${i + 1}`)
    const hazardAgent = 'e2e-hazard'
    let failed = false
    try {
        const started = await Promise.all(agents.map((agent, i) => fightCheck(agent, SEEDS[i])))
        const ports = new Set(started.map((s) => s.baseUrl))
        check(ports.size === agents.length, `sessions share a server: ${[...ports].join(', ')}`)
        await seedSurvivesReload(agents[0], SEEDS[0])
        await hazardSeedCheck(hazardAgent)
        log('PASS: four sessions, four own seeds, own pages, named shots, a kept seed, a verifiable hazard seed')
    } catch (err) {
        failed = true
        console.error(`playtest-sessions-e2e: FAIL: ${err.message}`)
    } finally {
        await Promise.all([...agents, hazardAgent].map((agent) => cli('stop', '--agent', agent)))
    }
    process.exit(failed ? 1 : 0)
}

main()
