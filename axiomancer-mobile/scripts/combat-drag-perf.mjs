#!/usr/bin/env node
// scripts/combat-drag-perf.mjs
//
// Web drag-and-drop timing for the combat board: the three scripted drags of
// the combat-drag perf protocol (docs/perf/combat-drag-baseline.md), each
// repeated REPS times against the static web export in `.smoke-dist`.
//
// Web is a bisecting aid only. The acceptance numbers come from the Android
// release APK (adb gfxinfo + Perfetto, see the baseline doc); this harness
// exists so a JS-thread regression on the drag path shows up in a container
// that has no device.
//
// Per drag it records, in the page:
//   * frame deltas (requestAnimationFrame) from pointerdown to 400ms after
//     pointerup — p50/p90/p95/p99/max, the share past 17.5ms (a missed
//     60Hz vsync) and the count over 50ms;
//   * pickup latency — first pointermove past the pan's activation distance →
//     first frame the drag ghost is visible (the JS commit the ghost waits on);
//   * drop latency — pointerup → first DOM mutation under the board (the
//     React commit that carries the drop's result);
//   * long tasks (PerformanceObserver 'longtask', >50ms main-thread blocks).
//
// Drags:
//   (a) hand card → play region
//   (b) die → staged card, with 3 cards staged
//   (c) staged card → hand (unstage)
//
// Usage:
//   AXM_FORCE_EXPORT=1 node scripts/...       # re-export (else .smoke-dist is reused on a stamp hit)
//   env: REPS (5), CPU_THROTTLE (4 — CDP slowdown factor, ~mid-range phone),
//        SEED (16), COMBAT_DRAG_PERF_CHROME (Chromium executable),
//        COMBAT_DRAG_PERF_OUT (JSON result path), COMBAT_DRAG_PERF_DIST (a
//        hand-built export dir used as it stands, e.g. a `--no-minify` export
//        so the profile names functions), PROFILE=1 (CPU-profile the first
//        drag of each kind and print its top-15 self-time functions).
//
// Exit 0 always on a completed run (it measures, it does not gate); exit 3 on
// a failed export or a board that never mounts.

import { createServer } from 'node:http'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { enterLiveFight } from './live-fight-entry.mjs'
import { ensureWebExport } from './lib/web-export.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const EXPORT_DIR = resolve(REPO_ROOT, process.env.COMBAT_DRAG_PERF_DIST ?? '.smoke-dist')
const VIEWPORT = { width: 390, height: 844 }
const REPS = Number(process.env.REPS ?? 5)
const CPU_THROTTLE = Number(process.env.CPU_THROTTLE ?? 4)
const SEED = Number(process.env.SEED ?? 16)
const OUT = process.env.COMBAT_DRAG_PERF_OUT ?? null

const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
}

const log = (m) => console.log(`combat-drag-perf: ${m}`)

// Builds the static export unless a reusable one is present and asked for.
async function runExpoExport() {
    if (process.env.COMBAT_DRAG_PERF_DIST) {
        // A hand-built export (a `--no-minify` one) is used as it stands.
        if (!existsSync(join(EXPORT_DIR, 'index.html'))) { console.error(`combat-drag-perf: no export in ${EXPORT_DIR}`); process.exit(3) }
        log(`using ${EXPORT_DIR} as built`)
        return
    }
    const r = await ensureWebExport({ outDir: EXPORT_DIR, log })
    if (!r.ok) { console.error('combat-drag-perf: expo export failed'); process.exit(3) }
}

// Minimal SPA static server (same fallback order as the e2e harnesses).
function startStaticServer(rootDir) {
    const exists = async (p) => { try { return (await stat(p)).isFile() } catch { return false } }
    return new Promise((res, rej) => {
        const server = createServer(async (req, out) => {
            try {
                let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname)
                if (pathname.endsWith('/')) pathname += 'index.html'
                const p = join(rootDir, pathname)
                const chosen = (await exists(p) && p) || (await exists(join(rootDir, `${pathname}.html`)) && join(rootDir, `${pathname}.html`))
                    || join(rootDir, 'index.html')
                out.setHeader('content-type', MIME[extname(chosen)] ?? 'application/octet-stream')
                out.end(await readFile(chosen))
            } catch (e) { out.statusCode = 500; out.end(String(e)) }
        })
        server.listen(0, '127.0.0.1', () => res({ server, baseUrl: `http://127.0.0.1:${server.address().port}` }))
        server.on('error', rej)
    })
}

// In-page probe: rAF frame log, ghost visibility, pointer + mutation stamps,
// long tasks. Installed before the app boots so nothing is missed.
function installProbe() {
    const P = { frames: [], slow: [], recording: false, longtasks: [], downAt: 0, activateAt: 0, ghostAt: 0, upAt: 0, mutAt: 0, sx: 0, sy: 0 }
    globalThis.__DRAG_PERF__ = P
    let last = 0
    const tick = (t) => {
        if (P.recording) {
            if (last) {
                P.frames.push(t - last)
                // Which phase a slow frame landed in: before the pan
                // activated, mid-drag, or after the release.
                if (t - last > 50) P.slow.push({ ms: Math.round(t - last), phase: P.upAt ? 'after-release' : P.activateAt ? 'mid-drag' : 'pickup' })
            }
            if (P.activateAt && !P.ghostAt) {
                const g = document.querySelector('[data-testid="combat-drag-ghost"]')
                if (g && Number(getComputedStyle(g).opacity) > 0.5) P.ghostAt = performance.now()
            }
        }
        last = t
        requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    try {
        new PerformanceObserver((l) => { if (P.recording) for (const e of l.getEntries()) P.longtasks.push(e.duration) })
            .observe({ type: 'longtask', buffered: false })
    } catch { /* longtask unsupported */ }
    addEventListener('pointerdown', (e) => { P.downAt = performance.now(); P.sx = e.clientX; P.sy = e.clientY }, true)
    addEventListener('pointermove', (e) => {
        if (P.downAt && !P.activateAt && Math.hypot(e.clientX - P.sx, e.clientY - P.sy) > 12) P.activateAt = performance.now()
    }, true)
    addEventListener('pointerup', () => { P.upAt = performance.now() }, true)
    new MutationObserver(() => { if (P.upAt && !P.mutAt) P.mutAt = performance.now() })
        .observe(document, { subtree: true, childList: true, attributes: true, characterData: true })
    P.reset = () => {
        Object.assign(P, { frames: [], slow: [], longtasks: [], downAt: 0, activateAt: 0, ghostAt: 0, upAt: 0, mutAt: 0 })
        last = 0
        P.recording = true
    }
}

const has = async (loc) => (await loc.count()) > 0
async function centerOf(loc) {
    if (!(await has(loc))) return null
    const b = await loc.first().boundingBox().catch(() => null)
    return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null
}

// One instrumented drag: ~30 pointer moves at ~16ms, then 400ms of settle.
async function measuredDrag(page, fromLoc, to, cdp = null) {
    const from = await centerOf(fromLoc)
    if (!from || !to) return null
    if (cdp) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start') }
    await page.evaluate(() => globalThis.__DRAG_PERF__.reset())
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    const steps = 30
    for (let i = 1; i <= steps; i++) {
        await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps)
        await page.waitForTimeout(16)
    }
    await page.mouse.up()
    await page.waitForTimeout(400)
    if (cdp) printTopSelf((await cdp.send('Profiler.stop')).profile)
    return page.evaluate(() => {
        const P = globalThis.__DRAG_PERF__
        P.recording = false
        return {
            frames: P.frames.slice(),
            slow: P.slow.slice(),
            longtasks: P.longtasks.slice(),
            pickupMs: P.activateAt && P.ghostAt ? P.ghostAt - P.activateAt : null,
            dropMs: P.upAt && P.mutAt ? P.mutAt - P.upAt : null,
        }
    })
}

// Top-15 functions by self time from a CDP CPU profile (sampled), so a
// regression names the code it spends the drag in.
function printTopSelf(profile) {
    const byId = new Map(profile.nodes.map((n) => [n.id, n]))
    const self = new Map()
    const dts = profile.timeDeltas
    profile.samples.forEach((id, i) => {
        const n = byId.get(id)
        const f = n.callFrame
        const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`
        self.set(key, (self.get(key) ?? 0) + (dts[i] ?? 0) / 1000)
    })
    const top = [...self.entries()].filter(([k]) => !/^\((idle|program|garbage collector)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 15)
    log('top self time (ms):')
    for (const [k, v] of top) log(`  ${v.toFixed(1).padStart(7)}  ${k}`)
    // Who forces layout: the callers of getBoundingClientRect / getComputedStyle.
    const parent = new Map()
    for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n)
    const callers = new Map()
    profile.samples.forEach((id, i) => {
        const n = byId.get(id)
        if (!/getBoundingClientRect|getComputedStyle/.test(n.callFrame.functionName)) return
        const chain = []
        for (let p = parent.get(id), k = 0; p && k < 4; p = parent.get(p.id), k++) chain.push(p.callFrame.functionName || '(anon)')
        const key = `${n.callFrame.functionName} <- ${chain.join(' <- ')}`
        callers.set(key, (callers.get(key) ?? 0) + (dts[i] ?? 0) / 1000)
    })
    for (const [k, v] of [...callers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) log(`  layout ${v.toFixed(1).padStart(6)}  ${k}`)
    // Inclusive time per React component (capitalised function names) — the
    // render cost behind a slow pickup or drop commit.
    const incl = new Map()
    profile.samples.forEach((id, i) => {
        const seen = new Set()
        for (let n = byId.get(id); n; n = parent.get(n.id)) {
            const name = n.callFrame.functionName
            if (/^[A-Z]/.test(name) && !seen.has(name)) { seen.add(name); incl.set(name, (incl.get(name) ?? 0) + (dts[i] ?? 0) / 1000) }
        }
    })
    for (const [k, v] of [...incl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) log(`  incl ${v.toFixed(1).padStart(6)}  ${k}`)
    const gc = [...self.entries()].find(([k]) => k.startsWith('(garbage collector)'))
    if (gc) log(`  GC: ${gc[1].toFixed(1)}ms`)
}

function pct(sorted, p) { return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0 }
function summarise(runs) {
    const ok = runs.filter(Boolean)
    const frames = ok.flatMap((r) => r.frames).sort((a, b) => a - b)
    const nums = (k) => ok.map((r) => r[k]).filter((v) => v != null).sort((a, b) => a - b)
    const pick = nums('pickupMs'); const drop = nums('dropMs')
    const r1 = (v) => Math.round(v * 10) / 10
    return {
        drags: ok.length,
        frames: frames.length,
        p50: r1(pct(frames, 50)), p90: r1(pct(frames, 90)), p95: r1(pct(frames, 95)), p99: r1(pct(frames, 99)), max: r1(frames.at(-1) ?? 0),
        // A frame counts as missed past 17.5ms: rAF deltas jitter around
        // 16.7 (16.6/16.8) on a 60Hz clock without any frame being dropped.
        missedFramePct: `${r1((100 * frames.filter((f) => f > 17.5).length) / Math.max(1, frames.length))}%`,
        over50: frames.filter((f) => f > 50).length,
        longtasks: ok.reduce((n, r) => n + r.longtasks.length, 0),
        longtaskMaxMs: r1(Math.max(0, ...ok.flatMap((r) => r.longtasks))),
        pickupMedianMs: pick.length ? r1(pct(pick, 50)) : null,
        pickupMaxMs: pick.length ? r1(pick.at(-1)) : null,
        dropMedianMs: drop.length ? r1(pct(drop, 50)) : null,
        dropMaxMs: drop.length ? r1(drop.at(-1)) : null,
        // Frames over 50ms, bucketed by drag phase.
        slowByPhase: ok.flatMap((r) => r.slow).reduce((m, f) => ({ ...m, [f.phase]: [...(m[f.phase] ?? []), f.ms] }), {}),
    }
}

async function main() {
    await runExpoExport()
    const { server, baseUrl } = await startStaticServer(EXPORT_DIR)
    const { chromium } = await import('playwright')
    const opts = { headless: true }
    if (process.env.COMBAT_DRAG_PERF_CHROME) opts.executablePath = process.env.COMBAT_DRAG_PERF_CHROME
    const browser = await chromium.launch(opts)
    const result = { seed: SEED, reps: REPS, cpuThrottle: CPU_THROTTLE, drags: {} }
    try {
        const ctx = await browser.newContext({ viewport: VIEWPORT, hasTouch: false })
        const page = await ctx.newPage()
        const errors = []
        page.on('pageerror', (e) => errors.push(e.message))
        await page.addInitScript(installProbe)
        await enterLiveFight(page, baseUrl, { seed: SEED })
        await page.getByTestId('combat-enter').click({ timeout: 15000, force: true })
        await page.getByTestId('combat-board').waitFor({ state: 'visible', timeout: 25000 })
        const skip = page.getByTestId('combat-dice-skip')
        if (await has(skip)) await skip.click({ force: true, timeout: 1500 }).catch(() => {})
        await page.waitForTimeout(1500)
        const cdp = await ctx.newCDPSession(page)
        if (CPU_THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE })
        const prof = (i) => (process.env.PROFILE === '1' && i === 0 ? cdp : null)
        const board = page.getByTestId('combat-board')
        const playArea = page.getByTestId('combat-play-area')
        const handIds = async () => board.locator('[data-testid^="combat-hand-"]').evaluateAll((ns) => ns.map((n) => n.getAttribute('data-testid')))
        const stagedIds = async () => board.locator('[data-testid^="combat-staged-"]').evaluateAll((ns) => ns.map((n) => n.getAttribute('data-testid')).filter((t) => !/staged-die/.test(t)))

        // (a) hand → play, then (c) play → hand, alternating so the hand
        // never runs dry: stage one card, unstage it, REPS times.
        const a = []; const c = []
        for (let i = 0; i < REPS; i++) {
            const hand = await handIds()
            const id = hand[i % hand.length]
            a.push(await measuredDrag(page, page.getByTestId(id), await centerOf(playArea), prof(i)))
            const staged = await stagedIds()
            if (staged.length) {
                const handBox = await page.getByTestId('combat-hand').boundingBox()
                c.push(await measuredDrag(page, page.getByTestId(staged[0]), { x: handBox.x + handBox.width / 2, y: handBox.y + 40 }))
            }
        }
        result.drags['a-hand-to-play'] = summarise(a)
        result.drags['c-play-to-hand'] = summarise(c)

        // (b) die → staged card with 3 cards staged.
        for (let i = 0; i < 3; i++) {
            const hand = await handIds()
            if (!hand.length) break
            const target = await centerOf(playArea)
            const from = await centerOf(page.getByTestId(hand[0]))
            await page.mouse.move(from.x, from.y); await page.mouse.down()
            for (let s = 1; s <= 12; s++) { await page.mouse.move(from.x + ((target.x - from.x) * s) / 12, from.y + ((target.y - from.y) * s) / 12); await page.waitForTimeout(16) }
            await page.mouse.up(); await page.waitForTimeout(400)
        }
        const staged = await stagedIds()
        const b = []
        for (let i = 0; i < REPS; i++) {
            const dice = await board.locator('[data-testid^="combat-die-"]').evaluateAll((ns) => ns.map((n) => n.getAttribute('data-testid')))
            if (!dice.length || !staged.length) break
            const target = await centerOf(page.getByTestId(staged[i % staged.length]))
            b.push(await measuredDrag(page, page.getByTestId(dice[i % dice.length]), target, prof(i)))
        }
        result.drags['b-die-to-staged(3 staged)'] = { ...summarise(b), staged: staged.length }
        if (process.env.DEBUG) console.log(JSON.stringify({ a: a.map((r) => r && [r.pickupMs, r.dropMs]), b: b.map((r) => r && [r.pickupMs, r.dropMs]) }))
        result.pageErrors = errors
    } finally {
        await browser.close()
        server.close()
    }
    console.log(JSON.stringify(result, null, 2))
    if (OUT) await writeFile(OUT, JSON.stringify(result, null, 2))
}

main().catch((e) => { console.error(e); process.exit(3) })
