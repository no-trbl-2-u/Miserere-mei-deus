#!/usr/bin/env node
// scripts/perf-web.mjs
//
// Web performance measurer for the weekly performance audit
// (`scripts/perf-audit.mjs` at the repo root runs it three times and keeps
// the median). One run measures:
//
//   * bundle — the JS in the web export, raw and gzipped;
//   * load — time to the title screen, LCP and total blocking time on `/`;
//   * runtime — frame times and long tasks while three combat rounds play
//     in a live fight on the `/combat-encounter` route (entered through
//     /dev, `live-fight-entry.mjs`).
//
// Prints ONE JSON object to stdout; every log line goes to stderr so the
// orchestrator can parse stdout as-is. Exits non-zero only when it cannot
// measure (export failed, the page never booted).
//
// Usage:
//   node scripts/perf-web.mjs
//   AXM_FORCE_EXPORT=1 node scripts/...       # re-export (else .smoke-dist is reused on a stamp hit)
//   PERF_CHROME=/path/to/chrome node scripts/perf-web.mjs

import { createServer } from 'node:http'
import { readFile, readdir, stat } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { enterLiveFight } from './live-fight-entry.mjs'
import { ensureWebExport } from './lib/web-export.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const EXPORT_DIR = resolve(REPO_ROOT, '.smoke-dist')
const VIEWPORT = { width: 390, height: 844 }
const SETTLE_MS = 2000
const ROUNDS = 3
const SLOW_FRAME_MS = 33
const COMBAT_SEED = 1

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
}

function log(msg) { process.stderr.write(`perf-web: ${msg}\n`) }

// ── boot plumbing (mirrors combat-round-e2e.mjs) ─────────────────────────────

async function runExpoExport() {
    const r = await ensureWebExport({ outDir: EXPORT_DIR, log })
    if (!r.ok) { console.error('perf-web: expo export failed'); process.exit(3) }
}

async function fileCandidate(p) {
    try { const info = await stat(p); return { p, exists: true, dir: info.isDirectory() } }
    catch { return { p, exists: false, dir: false } }
}

function startStaticServer(rootDir) {
    return new Promise((resolveServer, rejectServer) => {
        const server = createServer(async (req, res) => {
            try {
                const url = new URL(req.url, 'http://localhost')
                let pathname = decodeURIComponent(url.pathname)
                if (pathname.endsWith('/')) pathname += 'index.html'
                const filePath = join(rootDir, pathname)
                if (!filePath.startsWith(rootDir)) { res.statusCode = 403; return res.end('forbidden') }
                const candidates = [
                    await fileCandidate(filePath),
                    await fileCandidate(join(filePath, 'index.html')),
                    await fileCandidate(join(rootDir, pathname + '.html')),
                    await fileCandidate(join(rootDir, 'index.html')),
                ]
                const chosen =
                    (candidates[0].exists && !candidates[0].dir && candidates[0].p) ||
                    (candidates[1].exists && !candidates[1].dir && candidates[1].p) ||
                    (candidates[2].exists && !candidates[2].dir && candidates[2].p) ||
                    candidates[3].p
                const body = await readFile(chosen)
                res.setHeader('content-type', MIME[extname(chosen)] ?? 'application/octet-stream')
                res.end(body)
            } catch (err) { res.statusCode = 500; res.end(String(err)) }
        })
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address()
            resolveServer({ server, baseUrl: `http://127.0.0.1:${port}` })
        })
        server.on('error', rejectServer)
    })
}

// ── bundle ───────────────────────────────────────────────────────────────────

async function jsFiles(dir) {
    const out = []
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name)
        if (entry.isDirectory()) out.push(...await jsFiles(p))
        else if (extname(entry.name) === '.js') out.push(p)
    }
    return out
}

/**
 * Sums the export's JS, raw and gzipped at level 9.
 *
 * @param {string} dir the export directory.
 * @returns {Promise<{ bundleJsBytes: number, bundleJsGzipBytes: number }>}
 * @example await measureBundle('.smoke-dist') // { bundleJsBytes: 4123456, bundleJsGzipBytes: 987654 }
 */
export async function measureBundle(dir) {
    let raw = 0
    let gzip = 0
    for (const file of await jsFiles(dir)) {
        const body = await readFile(file)
        raw += body.length
        gzip += gzipSync(body, { level: 9 }).length
    }
    return { bundleJsBytes: raw, bundleJsGzipBytes: gzip }
}

// ── load ─────────────────────────────────────────────────────────────────────

/** Installed before any app script: records LCP, long tasks and the moment the title screen appears. */
function installLoadObservers() {
    const perf = { lcp: [], longTasks: [], firstScreen: null }
    globalThis.__AXM_PERF__ = perf
    new PerformanceObserver((list) => {
        for (const e of list.getEntries()) perf.lcp.push(e.startTime)
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((list) => {
        for (const e of list.getEntries()) perf.longTasks.push({ start: e.startTime, duration: e.duration })
    }).observe({ type: 'longtask', buffered: true })
    const watch = () => {
        const el = document.querySelector('[data-testid="title-scrim"]')
        const box = el?.getBoundingClientRect()
        if (box && box.width > 0 && box.height > 0) { perf.firstScreen = performance.now(); return }
        requestAnimationFrame(watch)
    }
    requestAnimationFrame(watch)
}

/**
 * Loads `/` in a fresh context and reads time to the title screen, LCP and
 * total blocking time up to two seconds after the title screen.
 *
 * @param {import('playwright').Browser} browser
 * @param {string} baseUrl the static server.
 * @returns {Promise<{ firstScreenMs: number, lcpMs: number, tbtMs: number }>}
 */
export async function measureLoad(browser, baseUrl) {
    const context = await browser.newContext({ viewport: VIEWPORT })
    try {
        const page = await context.newPage()
        await page.addInitScript(installLoadObservers)
        await page.goto(`${baseUrl}/`)
        await page.getByTestId('title-scrim').waitFor({ state: 'visible', timeout: 30000 })
        await page.waitForFunction(() => globalThis.__AXM_PERF__?.firstScreen != null, null, { timeout: 5000 })
        await page.waitForTimeout(SETTLE_MS)
        return await page.evaluate((settle) => {
            const perf = globalThis.__AXM_PERF__
            const until = perf.firstScreen + settle
            const tbt = perf.longTasks
                .filter((t) => t.start <= until)
                .reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0)
            return {
                firstScreenMs: Math.round(perf.firstScreen),
                lcpMs: Math.round(perf.lcp.length ? perf.lcp[perf.lcp.length - 1] : perf.firstScreen),
                tbtMs: Math.round(tbt),
            }
        }, SETTLE_MS)
    } finally {
        await context.close().catch(() => {})
    }
}

// ── runtime ──────────────────────────────────────────────────────────────────

const has = async (loc) => (await loc.count()) > 0

async function centerOf(locator) {
    if ((await locator.count()) === 0) return null
    const box = await locator.first().boundingBox().catch(() => null)
    if (!box) return null
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Real pointer drag with intermediate moves so PanGestureHandler activates. */
async function dragTo(page, fromLocator, to) {
    const from = await centerOf(fromLocator)
    if (!from || !to) return false
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    const steps = 14
    for (let i = 1; i <= steps; i++) {
        await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps)
        await page.waitForTimeout(12)
    }
    await page.mouse.up()
    await page.waitForTimeout(180)
    return true
}

const terminal = async (page) =>
    (await has(page.getByTestId('combat-summary')))
    || (await has(page.getByTestId('combat-mercy')))
    || (await has(page.getByTestId('combat-rewards')))

/** One round: stage the rightmost hand card, APPLY it free, END PHASE, ride the enemy turn. */
async function playRound(page) {
    const skip = page.getByTestId('combat-dice-skip')
    if (await has(skip)) await skip.click({ timeout: 1500, force: true }).catch(() => {})
    const board = page.getByTestId('combat-board')
    const uids = await board.locator('[data-testid^="combat-hand-"]').evaluateAll((ns) =>
        ns.map((n) => (n.getAttribute('data-testid') ?? '').replace('combat-hand-', '')))
    const uid = uids[uids.length - 1]
    if (uid) {
        const playArea = page.getByTestId('combat-play-area')
        for (let a = 0; a < 3 && !(await has(page.getByTestId(`combat-staged-${uid}`))); a++) {
            await dragTo(page, page.getByTestId(`combat-hand-${uid}`), await centerOf(playArea))
        }
        const apply = page.getByTestId(`combat-apply-${uid}`)
        if (await has(apply)) {
            await apply.click({ force: true, timeout: 3000 }).catch(() => {})
            await page.waitForTimeout(350)
        }
    }
    if (await terminal(page)) return false
    const end = page.getByTestId('combat-end-phase')
    if (!(await has(end))) return false
    await end.click({ timeout: 3000, force: true }).catch(() => {})
    await page.waitForTimeout(500)
    const ack = page.getByTestId('combat-enemy-action-dismiss')
    if (await has(ack)) await ack.click({ force: true, timeout: 1500 }).catch(() => {})
    return true
}

/** Starts in-page recording of frame deltas and long tasks. */
function startRuntimeRecording() {
    const rec = { deltas: [], longTasks: [], running: true, last: null }
    globalThis.__AXM_RUNTIME__ = rec
    new PerformanceObserver((list) => {
        if (!rec.running) return
        for (const e of list.getEntries()) rec.longTasks.push(e.duration)
    }).observe({ type: 'longtask' })
    const tick = (t) => {
        if (!rec.running) return
        if (rec.last != null) rec.deltas.push(t - rec.last)
        rec.last = t
        requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
}

/**
 * Plays three combat rounds in a live fight and reads frame-time p95,
 * the share of frames over 33 ms and total long-task time while they play.
 *
 * @param {import('playwright').Browser} browser
 * @param {string} baseUrl the static server.
 * @returns {Promise<{ frameP95Ms: number, slowFramePct: number, longTaskMs: number, rounds: number }>}
 */
export async function measureRuntime(browser, baseUrl) {
    const context = await browser.newContext({ viewport: VIEWPORT, hasTouch: false })
    try {
        const page = await context.newPage()
        await enterLiveFight(page, baseUrl, { seed: COMBAT_SEED })
        await page.getByTestId('combat-enter').click({ timeout: 8000, force: true }).catch(() => {})
        await page.getByTestId('combat-board').waitFor({ state: 'visible', timeout: 25000 })

        await page.evaluate(startRuntimeRecording)
        let rounds = 0
        for (let r = 0; r < ROUNDS; r++) {
            if (await terminal(page)) break
            if (!(await playRound(page))) break
            rounds++
        }
        const { deltas, longTasks } = await page.evaluate(() => {
            const rec = globalThis.__AXM_RUNTIME__
            rec.running = false
            return { deltas: rec.deltas, longTasks: rec.longTasks }
        })
        if (!deltas.length) throw new Error('no frames recorded during the combat script')
        const sorted = [...deltas].sort((a, b) => a - b)
        const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]
        const slow = deltas.filter((d) => d > SLOW_FRAME_MS).length
        return {
            frameP95Ms: Math.round(p95 * 10) / 10,
            slowFramePct: Math.round((slow / deltas.length) * 1000) / 10,
            longTaskMs: Math.round(longTasks.reduce((a, b) => a + b, 0)),
            rounds,
        }
    } finally {
        await context.close().catch(() => {})
    }
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
    await runExpoExport()
    const bundle = await measureBundle(EXPORT_DIR)
    const { server, baseUrl } = await startStaticServer(EXPORT_DIR)
    const { chromium } = await import('playwright')
    const launchOptions = { headless: true }
    if (process.env.PERF_CHROME) launchOptions.executablePath = process.env.PERF_CHROME
    const browser = await chromium.launch(launchOptions)
    try {
        const load = await measureLoad(browser, baseUrl)
        log(`load: ${JSON.stringify(load)}`)
        const { rounds, ...runtime } = await measureRuntime(browser, baseUrl)
        log(`runtime: ${JSON.stringify(runtime)} over ${rounds} round(s)`)
        if (rounds < ROUNDS) log(`only ${rounds} of ${ROUNDS} rounds played before the combat ended`)
        process.stdout.write(`${JSON.stringify({ ...bundle, ...load, ...runtime })}\n`)
    } finally {
        await browser.close()
        server.close()
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch((err) => {
        log(`aborted — ${err.message}`)
        process.exit(process.exitCode || 1)
    })
}
