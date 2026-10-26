#!/usr/bin/env node
// scripts/playtest-session.mjs
//
// Phase PH1a: one browser per playtester. The `playtester` agent used to
// drive the build through the Playwright MCP, one shared browser with one
// current tab, so four agents at once overrode each other's tab selects,
// lost the viewport, and lost seeds set before the first `goto` to the
// reload (docs/reports/playtest-elementalist-act1-2026-10-24.md §0).
//
// This is the library-Playwright transport `critique-drive.mjs` uses, kept
// alive between commands. `start` spawns a detached session process that
// owns a browser, one context (414x896 with touch on mobile), its own static
// server on a free port, and context-level init scripts for the dev-tools
// opt-in and the combat and minigame seeds, so every page load and reload
// boots seeded. Every other command is a short CLI call that posts to the
// session's control port on 127.0.0.1 and prints one JSON line.
//
//   node scripts/playtest-session.mjs prepare
//   node scripts/playtest-session.mjs start --agent pt1 --seed 1101 [--minigame-seeds '<json>']
//        [--fixture <id>] [--viewport mobile|desktop] [--base-url <url>]
//   node scripts/playtest-session.mjs <cmd> --agent pt1 [args]
//   npm run --silent playtest:session -- <cmd> ...   (root or this package)
//
// Commands after `start`: goto <path>, reload, fight [--kind <kind>],
// tap <testID> [--force], drag <fromTestID> <toTestID>, wait <testID>,
// snapshot, shot [<path>], eval <expr>, log [--tail <n>] [--domains <d,...>],
// pages, stop.
//
// The session record lives in `.playtest-sessions/<agent>.json` (gitignored).
// `prepare` builds or reuses the stamped web export once; `start` never
// exports, so four agents starting together do not race four exports. A
// session left alone for 30 minutes closes its browser and removes its record.
//
// Exit codes: 0 = `ok: true` printed · 1 = `ok: false` printed.

import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, request } from 'node:http'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { contextOptions as critiqueContextOptions, startStaticServer } from './critique-drive.mjs'
import { enterLiveFight } from './live-fight-entry.mjs'
import { injectMinigameSeeds } from './minigame-seed-injector.mjs'
import { waitForReady } from './lib/page-ready.mjs'
import { computeStamp, decideExport, DEFAULT_EXPORT_DIR, ensureWebExport, MOBILE_ROOT, readStamp } from './lib/web-export.mjs'

const SELF = fileURLToPath(import.meta.url)
export const SESSIONS_DIR = resolve(process.env.PLAYTEST_SESSIONS_DIR ?? join(MOBILE_ROOT, '.playtest-sessions'))
export const IDLE_MS = Number(process.env.PLAYTEST_SESSION_IDLE_MS ?? 30 * 60 * 1000)
const START_TIMEOUT_MS = 90_000
const STEP_TIMEOUT_MS = 20_000

export const COMMANDS = {
    prepare: { positional: 0, agent: false },
    start: { positional: 0, agent: true },
    goto: { positional: 1, agent: true },
    reload: { positional: 0, agent: true },
    fight: { positional: 0, agent: true },
    tap: { positional: 1, agent: true },
    drag: { positional: 2, agent: true },
    wait: { positional: 1, agent: true },
    snapshot: { positional: 0, agent: true },
    shot: { positional: [0, 1], agent: true },
    eval: { positional: 1, agent: true },
    log: { positional: 0, agent: true },
    pages: { positional: 0, agent: true },
    stop: { positional: 0, agent: true },
}

const BOOLEAN_FLAGS = new Set(['force'])
const VIEWPORTS = ['mobile', 'desktop']

// The phone the playtester's walk specifies; critique-drive's 375x812 stays
// as its capture size.
const MOBILE_VIEWPORT = { width: 414, height: 896 }

/**
 * Parse a command line (without `node script`). Throws on anything the
 * command does not take, so a typo fails before a browser starts.
 * @example parseArgs(['tap', '--agent', 'pt1', 'combat-enter'])
 *   // { cmd: 'tap', agent: 'pt1', positional: ['combat-enter'], flags: {} }
 */
export function parseArgs(argv) {
    const [cmd, ...rest] = argv
    const spec = COMMANDS[cmd]
    if (!spec) throw new Error(`unknown command '${cmd ?? ''}'; one of ${Object.keys(COMMANDS).join(', ')}`)
    const flags = {}
    const positional = []
    for (let i = 0; i < rest.length; i++) {
        const token = rest[i]
        if (token.startsWith('--')) {
            const name = token.slice(2)
            if (BOOLEAN_FLAGS.has(name)) { flags[name] = true; continue }
            const value = rest[i + 1]
            if (value === undefined) throw new Error(`--${name} needs a value`)
            flags[name] = value
            i++
        } else {
            positional.push(token)
        }
    }
    const [min, max] = Array.isArray(spec.positional) ? spec.positional : [spec.positional, spec.positional]
    if (positional.length < min || positional.length > max) {
        throw new Error(`${cmd} takes ${min === max ? min : `${min} to ${max}`} argument(s), got ${positional.length}`)
    }
    const { agent, ...other } = flags
    if (spec.agent) {
        if (!agent) throw new Error(`${cmd} needs --agent <name>`)
        if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/.test(agent)) throw new Error(`bad agent name '${agent}': letters, digits, - and _`)
    }
    return { cmd, agent: agent ?? null, positional, flags: other }
}

/**
 * The options `start` hands its session process, read from its flags.
 * @example startOptions({ seed: '1101' }) // { seed: 1101, minigameSeeds: null, fixture: null, viewport: 'mobile', baseUrl: null }
 */
export function startOptions(flags) {
    const known = new Set(['seed', 'minigame-seeds', 'fixture', 'viewport', 'base-url'])
    for (const name of Object.keys(flags)) if (!known.has(name)) throw new Error(`start does not take --${name}`)
    let seed = null
    if (flags.seed !== undefined) {
        seed = Number(flags.seed)
        if (!Number.isInteger(seed)) throw new Error(`--seed must be an integer, got '${flags.seed}'`)
    }
    let minigameSeeds = null
    if (flags['minigame-seeds'] !== undefined) {
        try { minigameSeeds = JSON.parse(flags['minigame-seeds']) } catch { throw new Error('--minigame-seeds must be JSON') }
        if (!minigameSeeds || typeof minigameSeeds !== 'object' || Array.isArray(minigameSeeds)) {
            throw new Error('--minigame-seeds must be a JSON object, as {"hazard":{"seed":7}}')
        }
    }
    const viewport = flags.viewport ?? 'mobile'
    if (!VIEWPORTS.includes(viewport)) throw new Error(`--viewport must be mobile or desktop, got '${viewport}'`)
    const baseUrl = flags['base-url'] ? flags['base-url'].replace(/\/+$/, '') : null
    return { seed, minigameSeeds, fixture: flags.fixture ?? null, viewport, baseUrl }
}

/** The browser context options: mobile is 414x896 with touch, desktop is critique-drive's. */
export function sessionContextOptions(viewport) {
    if (viewport === 'mobile') return { ...critiqueContextOptions('mobile'), viewport: MOBILE_VIEWPORT }
    return critiqueContextOptions('desktop')
}

export function recordPath(agent, dir = SESSIONS_DIR) {
    return join(dir, `${agent}.json`)
}

export function defaultShotPath(agent, n, dir = SESSIONS_DIR) {
    return join(dir, agent, 'shots', `${n}.png`)
}

/**
 * The session record `start` prints and writes to `.playtest-sessions/<agent>.json`.
 * @example buildSessionRecord({ agent: 'pt1', pid: 9, controlPort: 4000, baseUrl: 'http://127.0.0.1:4001', options, servesExport: true })
 */
export function buildSessionRecord({ agent, pid, controlPort, baseUrl, options, servesExport, startedAt = new Date().toISOString(), dir = SESSIONS_DIR }) {
    return {
        agent,
        pid,
        controlPort,
        baseUrl,
        servesExport,
        viewport: options.viewport,
        seed: options.seed,
        minigameSeeds: options.minigameSeeds,
        fixture: options.fixture,
        startedAt,
        idleMinutes: Math.round(IDLE_MS / 60000),
        shotDir: join(dir, agent, 'shots'),
        logFile: join(dir, `${agent}.log`),
    }
}

/**
 * Resolve a caller's path against the caller's own cwd, not the session's.
 * Under `npm run` the cwd is the package; npm keeps the caller's in INIT_CWD.
 */
export function callerPath(path, cwd = process.env.INIT_CWD ?? process.cwd()) {
    return isAbsolute(path) ? path : resolve(cwd, path)
}

function print(result) {
    process.stdout.write(JSON.stringify(result) + '\n')
    if (!result.ok) process.exitCode = 1
}

function readRecord(agent) {
    try { return JSON.parse(readFileSync(recordPath(agent), 'utf8')) } catch { return null }
}

function alive(pid) {
    try { process.kill(pid, 0); return true } catch (err) { return err.code === 'EPERM' }
}

// ── Client side ──────────────────────────────────────────────────────────

async function prepare() {
    const r = await ensureWebExport({ log: (m) => console.error(`playtest-session: ${m}`) })
    return { ok: r.ok, cmd: 'prepare', reused: r.reused, hash: r.hash, exportDir: DEFAULT_EXPORT_DIR, ...(r.ok ? {} : { error: 'expo export failed' }) }
}

function exportIsCurrent() {
    const stamp = computeStamp()
    const decision = decideExport({
        hash: stamp?.hash ?? null,
        stamp: readStamp(DEFAULT_EXPORT_DIR),
        hasIndex: existsSync(join(DEFAULT_EXPORT_DIR, 'index.html')),
        env: {},
    })
    return decision
}

async function start(agent, flags) {
    const options = startOptions(flags)
    const existing = readRecord(agent)
    if (existing && alive(existing.pid)) {
        return { ok: false, cmd: 'start', agent, error: `session '${agent}' is already running (pid ${existing.pid}); stop it first` }
    }
    if (existing) rmSync(recordPath(agent), { force: true })
    if (!options.baseUrl) {
        const decision = exportIsCurrent()
        if (!decision.reuse) {
            return { ok: false, cmd: 'start', agent, error: `the web export is not current (${decision.reason}); run \`playtest-session.mjs prepare\` once first` }
        }
    }
    mkdirSync(SESSIONS_DIR, { recursive: true })
    const logFile = join(SESSIONS_DIR, `${agent}.log`)
    const out = openSync(logFile, 'w')
    const child = spawn(process.execPath, [SELF, '__serve', JSON.stringify({ agent, options })], {
        cwd: MOBILE_ROOT,
        detached: true,
        stdio: ['ignore', out, out],
        env: process.env,
    })
    let exited = null
    child.on('exit', (code) => { exited = code ?? 1 })
    child.unref()
    const deadline = Date.now() + START_TIMEOUT_MS
    while (Date.now() < deadline) {
        const record = readRecord(agent)
        if (record && record.pid === child.pid) return { ok: true, cmd: 'start', ...record }
        if (exited !== null) break
        await new Promise((r) => setTimeout(r, 200))
    }
    if (exited === null) { try { process.kill(child.pid, 'SIGTERM') } catch { /* gone */ } }
    let tail = ''
    try { tail = readFileSync(logFile, 'utf8').trim().split('\n').slice(-5).join(' | ') } catch { /* none */ }
    return { ok: false, cmd: 'start', agent, error: `session did not start${exited !== null ? ` (exit ${exited})` : ' in time'}: ${tail}` }
}

function post(port, body) {
    return new Promise((done, fail) => {
        const payload = JSON.stringify(body)
        const req = request({
            host: '127.0.0.1', port, method: 'POST', path: '/',
            headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) },
        }, (res) => {
            let data = ''
            res.setEncoding('utf8')
            res.on('data', (c) => { data += c })
            res.on('end', () => { try { done(JSON.parse(data)) } catch (err) { fail(err) } })
        })
        req.on('error', fail)
        req.end(payload)
    })
}

async function send({ cmd, agent, positional, flags }) {
    const record = readRecord(agent)
    if (!record) return { ok: false, cmd, agent, error: `no session for '${agent}'; run start --agent ${agent}` }
    if (cmd === 'shot' && positional[0]) positional = [callerPath(positional[0])]
    try {
        return await post(record.controlPort, { cmd, positional, flags })
    } catch (err) {
        if (!alive(record.pid)) {
            rmSync(recordPath(agent), { force: true })
            return { ok: false, cmd, agent, error: `session '${agent}' is gone (it closes after ${record.idleMinutes} idle minutes); start it again` }
        }
        return { ok: false, cmd, agent, error: `could not reach session '${agent}': ${err.message}` }
    }
}

// ── Session side ─────────────────────────────────────────────────────────

/** Real pointer drag with intermediate moves so the gesture handler activates (hazard-e2e.mjs). */
async function pointerDrag(page, from, to) {
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    const steps = 14
    for (let i = 1; i <= steps; i++) {
        await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps)
        await page.waitForTimeout(12)
    }
    await page.mouse.up()
    await page.waitForTimeout(160)
}

async function centerOf(page, testId) {
    const locator = page.getByTestId(testId).first()
    await locator.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS })
    const box = await locator.boundingBox()
    if (!box) throw new Error(`${testId} has no bounding box`)
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function settle(page) {
    await waitForReady(page).catch(() => {})
}

export function makeHandlers(session) {
    const current = async () => {
        if (!session.page || session.page.isClosed()) session.page = await session.context.newPage()
        return session.page
    }
    const here = (page) => ({ url: page.url() })
    return {
        async goto([path]) {
            const page = await current()
            const url = /^https?:\/\//.test(path) ? path : `${session.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
            await settle(page)
            return here(page)
        },
        async reload() {
            const page = await current()
            await page.reload({ waitUntil: 'networkidle', timeout: 30_000 })
            await settle(page)
            return here(page)
        },
        async fight(_, flags) {
            const page = await current()
            await enterLiveFight(page, session.baseUrl, { kind: flags.kind ?? 'encounter' })
            return here(page)
        },
        async tap([testId], flags) {
            const page = await current()
            await page.getByTestId(testId).first().click({ timeout: STEP_TIMEOUT_MS, force: flags.force === true })
            await page.waitForTimeout(120)
            return here(page)
        },
        async drag([fromId, toId]) {
            const page = await current()
            await pointerDrag(page, await centerOf(page, fromId), await centerOf(page, toId))
            return here(page)
        },
        async wait([testId], flags) {
            const page = await current()
            const timeout = flags.timeout ? Number(flags.timeout) : STEP_TIMEOUT_MS
            await page.getByTestId(testId).first().waitFor({ state: 'visible', timeout })
            return here(page)
        },
        async snapshot() {
            const page = await current()
            const view = await page.evaluate(() => {
                const ids = []
                for (const el of document.querySelectorAll('[data-testid]')) {
                    const r = el.getBoundingClientRect()
                    const style = getComputedStyle(el)
                    if (r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') {
                        const id = el.getAttribute('data-testid')
                        if (!ids.includes(id)) ids.push(id)
                    }
                }
                return { testIDs: ids, text: (document.body?.innerText ?? '').trim().slice(0, 8000) }
            })
            return { ...here(page), ...view }
        },
        async shot([path]) {
            const page = await current()
            session.shots += 1
            const target = path ?? defaultShotPath(session.agent, session.shots)
            mkdirSync(dirname(target), { recursive: true })
            await page.screenshot({ path: target, fullPage: false })
            return { ...here(page), path: target }
        },
        async eval([expr]) {
            const page = await current()
            const value = await page.evaluate(expr)
            return { ...here(page), value: value === undefined ? null : value }
        },
        async log(_, flags) {
            const page = await current()
            const n = flags.tail ? Number(flags.tail) : 50
            const domains = flags.domains ? flags.domains.split(',').map((d) => d.trim()).filter(Boolean) : null
            const entries = await page.evaluate(([count, only]) => {
                const bridge = globalThis.__AXM_LOG__
                if (!bridge) return null
                return bridge.tail(count, only ? { domains: only } : undefined)
            }, [n, domains])
            if (entries === null) throw new Error('no __AXM_LOG__ on this page yet; goto a route first')
            return { ...here(page), entries }
        },
        async pages() {
            return { pages: session.context.pages().map((p, index) => ({ index, url: p.url(), current: p === session.page })) }
        },
    }
}

async function serve(raw) {
    const { agent, options } = JSON.parse(raw)
    const { chromium } = await import('playwright')
    const launch = { headless: true }
    if (process.env.PLAYTEST_SESSION_CHROME) launch.executablePath = process.env.PLAYTEST_SESSION_CHROME
    const browser = await chromium.launch(launch)
    let staticServer = null
    let baseUrl = options.baseUrl
    if (!baseUrl) {
        const served = await startStaticServer(DEFAULT_EXPORT_DIR)
        staticServer = served.server
        baseUrl = served.baseUrl
    }
    const context = await browser.newContext(sessionContextOptions(options.viewport))
    // Context-level, so every page, navigation and reload boots seeded.
    await context.addInitScript(({ seed, fixture }) => {
        globalThis.__AXM_FORCE_DEV_TOOLS__ = true
        if (typeof seed === 'number') globalThis.__AXM_COMBAT_SEED__ = seed
        if (fixture) globalThis.__AXM_FIXTURE__ = fixture
    }, { seed: options.seed, fixture: options.fixture })
    await injectMinigameSeeds(context, options.minigameSeeds ? { seeds: options.minigameSeeds } : {})

    const session = { agent, baseUrl, context, page: null, shots: 0 }
    const handlers = makeHandlers(session)
    let queue = Promise.resolve()
    let idleTimer = null
    let closing = false

    const shutdown = async (code = 0) => {
        if (closing) return
        closing = true
        clearTimeout(idleTimer)
        const record = readRecord(agent)
        if (record?.pid === process.pid) rmSync(recordPath(agent), { force: true })
        await browser.close().catch(() => {})
        staticServer?.close()
        control.close()
        process.exit(code)
    }
    const touch = () => {
        clearTimeout(idleTimer)
        idleTimer = setTimeout(() => { console.log(`idle ${Math.round(IDLE_MS / 60000)} min; closing`); shutdown(0) }, IDLE_MS)
    }

    const control = createServer((req, res) => {
        let body = ''
        req.setEncoding('utf8')
        req.on('data', (c) => { body += c })
        req.on('end', () => {
            queue = queue.then(async () => {
                touch()
                let result
                let cmd = null
                try {
                    const msg = JSON.parse(body)
                    cmd = msg.cmd
                    if (cmd === 'stop') result = { ok: true, cmd, agent }
                    else if (handlers[cmd]) result = { ok: true, cmd, agent, ...(await handlers[cmd](msg.positional ?? [], msg.flags ?? {})) }
                    else result = { ok: false, cmd, agent, error: `unknown command '${cmd}'` }
                } catch (err) {
                    result = { ok: false, cmd, agent, error: String(err?.message ?? err).split('\n')[0] }
                }
                res.setHeader('content-type', 'application/json')
                res.end(JSON.stringify(result), () => { if (cmd === 'stop') shutdown(0) })
            })
        })
    })
    await new Promise((r) => control.listen(0, '127.0.0.1', r))
    for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => shutdown(0))
    browser.on('disconnected', () => shutdown(1))

    mkdirSync(SESSIONS_DIR, { recursive: true })
    const record = buildSessionRecord({
        agent, pid: process.pid, controlPort: control.address().port, baseUrl, options, servesExport: staticServer !== null,
    })
    writeFileSync(recordPath(agent), JSON.stringify(record, null, 2) + '\n')
    console.log(`session ${agent} ready: ${baseUrl} (control ${record.controlPort})`)
    touch()
}

async function main(argv) {
    if (argv[0] === '__serve') return serve(argv[1])
    let parsed
    try { parsed = parseArgs(argv) } catch (err) { return print({ ok: false, error: err.message }) }
    const { cmd, agent, flags } = parsed
    if (cmd === 'prepare') return print(await prepare())
    if (cmd === 'start') {
        try { return print(await start(agent, flags)) } catch (err) { return print({ ok: false, cmd, agent, error: err.message }) }
    }
    return print(await send(parsed))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main(process.argv.slice(2)).catch((err) => {
        print({ ok: false, error: String(err?.message ?? err) })
        // A session process that failed to boot must not linger on a half-open server.
        if (process.argv[2] === '__serve') process.exit(1)
    })
}
