#!/usr/bin/env node
// scripts/ink-walk-e2e.mjs
//
// INK WALK: the walk into a fight, animated (phase CX1b, A9). Every other
// browser drive runs with reduced motion or the juice escape hatch, so none
// of them ever sees the ink move. This one sets neither: it stands the
// player on the Breakwater's windmill (bw-w1), confirms the walk to the first
// fight (bw-w2), and while the motion runs it
//
//   1. catches the MAP INK mid-spread: the blot is centred on bw-w2's token
//      and covers some of the window but not all of it;
//   2. sees the fight route open under the ink, and catches the fight
//      screen's CURTAIN mid-draw: its edge has receded part way;
//   3. waits for the reveal to settle with no ink left.
//
// The frames go to INK_WALK_SHOTS (default: the OS temp dir's ink-walk/):
// `map-mid-spread.png`, `reveal-mid-draw.png`, `reveal-settled.png`, for the
// PR description. They are evidence, never committed.
//
// Usage:
//   npm run e2e:ink-walk
//   INK_WALK_SHOTS=/tmp/pr-shots/x npm run e2e:ink-walk
//   AXM_FORCE_EXPORT=1 npm run e2e:ink-walk    # re-export (else .smoke-dist is reused on a stamp hit)
//   INK_WALK_E2E_CHROME=/path/to/chrome npm run e2e:ink-walk
//
// Exit codes: 0 = walk clean · 1 = assertion failed ·
// 3 = boot failure (export / server / browser).

import { createServer } from 'node:http'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { injectStateFixture } from './fixture-injector.mjs'
import { ensureWebExport } from './lib/web-export.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const EXPORT_DIR = resolve(REPO_ROOT, '.smoke-dist')
const VIEWPORT = { width: 390, height: 844 }
const SHOTS = resolve(process.env.INK_WALK_SHOTS || join(tmpdir(), 'ink-walk'))

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
}

function log(msg) {
    console.log(`ink-walk-e2e: ${msg}`)
}

function fail(msg) {
    console.error(`ink-walk-e2e: FAIL — ${msg}`)
    process.exitCode = 1
    throw new Error(msg)
}

async function fileCandidate(requestedPath) {
    try {
        const info = await stat(requestedPath)
        return { requestedPath, exists: true, isDirectory: info.isDirectory() }
    } catch {
        return { requestedPath, exists: false, isDirectory: false }
    }
}

function startStaticServer(rootDir) {
    return new Promise((resolveServer, rejectServer) => {
        const server = createServer(async (req, res) => {
            try {
                const url = new URL(req.url, 'http://localhost')
                let pathname = decodeURIComponent(url.pathname)
                if (pathname.endsWith('/')) pathname += 'index.html'
                const filePath = join(rootDir, pathname)
                if (!filePath.startsWith(rootDir)) {
                    res.statusCode = 403
                    return res.end('forbidden')
                }
                const candidates = [
                    await fileCandidate(filePath),
                    await fileCandidate(join(filePath, 'index.html')),
                    await fileCandidate(join(rootDir, pathname + '.html')),
                    await fileCandidate(join(rootDir, 'index.html')),
                ]
                const chosen =
                    (candidates[0].exists && !candidates[0].isDirectory && candidates[0].requestedPath) ||
                    (candidates[1].exists && !candidates[1].isDirectory && candidates[1].requestedPath) ||
                    (candidates[2].exists && !candidates[2].isDirectory && candidates[2].requestedPath) ||
                    candidates[3].requestedPath
                const body = await readFile(chosen)
                res.setHeader('content-type', MIME[extname(chosen)] ?? 'application/octet-stream')
                res.end(body)
            } catch (err) {
                res.statusCode = 500
                res.end(String(err))
            }
        })
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address()
            resolveServer({ server, baseUrl: `http://127.0.0.1:${port}` })
        })
        server.on('error', rejectServer)
    })
}

// ---------------------------------------------------------------------------
// Coverage readings, taken inside the page
// ---------------------------------------------------------------------------

/**
 * The share of the window the map ink's blot covers, sampled on a grid, and
 * the blot's centre. null while no blot is mounted.
 */
async function mapInkReading(page) {
    return page.evaluate(() => {
        const blot = document.querySelector('[data-testid="map-ink-blot"]')
        if (!blot) return null
        const r = blot.getBoundingClientRect()
        const cx = r.x + r.width / 2
        const cy = r.y + r.height / 2
        const rad = r.width / 2
        const W = window.innerWidth
        const H = window.innerHeight
        let inside = 0
        let total = 0
        for (let y = 4; y < H; y += 16) {
            for (let x = 4; x < W; x += 16) {
                total += 1
                if ((x - cx) ** 2 + (y - cy) ** 2 <= rad * rad) inside += 1
            }
        }
        return { coverage: inside / total, cx, cy }
    })
}

/** The share of the window the fight curtain's ink still covers (its top edge down to the bottom). */
async function curtainReading(page) {
    return page.evaluate(() => {
        const sheet = document.querySelector('[data-testid="ink-curtain-sheet"]')
        if (!sheet) return null
        const r = sheet.getBoundingClientRect()
        const H = window.innerHeight
        const top = Math.max(0, Math.min(H, r.y))
        return { coverage: (H - top) / H, top }
    })
}

/** The window centre of a map node's token. */
async function tokenCentre(page, nodeId) {
    const box = await page.getByTestId(`node-${nodeId}`).boundingBox()
    if (!box) fail(`node-${nodeId} has no box on the map`)
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/**
 * Step the page's (paused) clock a frame at a time until `ok` holds. The
 * clock stays paused between steps, so a capture taken then is the frame
 * that was read, however slow the screenshot is.
 */
async function catchMid(page, read, ok, what, maxSteps = 200) {
    const seen = []
    for (let i = 0; i < maxSteps; i++) {
        await page.clock.runFor(16)
        const r = await read()
        if (r) {
            seen.push(r.coverage.toFixed(2))
            if (ok(r)) return r
        }
    }
    fail(`never caught ${what} part way (coverage readings: ${seen.join(', ') || 'none'})`)
}

/** Step the paused clock until `done()` holds. */
async function stepUntil(page, done, what, maxSteps = 400) {
    for (let i = 0; i < maxSteps; i++) {
        if (await done()) return
        await page.clock.runFor(16)
    }
    fail(what)
}

/**
 * Read again right after a capture: the frame was taken between the two
 * readings, so both strictly between none and full brackets the frame too.
 */
async function stillMid(read, what, frame) {
    const r = await read()
    if (!r || !(r.coverage > 0 && r.coverage < 1)) {
        fail(`${what} was no longer part way once ${frame} was taken (coverage ${r ? r.coverage.toFixed(2) : 'gone'})`)
    }
    return r
}

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

async function runInkWalk(browser, baseUrl) {
    // Motion NOT reduced, and no juice escape hatch: the point of this drive.
    const context = await browser.newContext({ viewport: VIEWPORT, hasTouch: false, reducedMotion: 'no-preference' })
    try {
        await injectStateFixture(context, {
            id: 'ink-walk', seed: 'ink1', preset: 'sage',
            world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-w1', completedMaps: [], questNodesSettled: true },
        })
        const page = await context.newPage()
        // The page's clock is installed so the motion can be held still for each
        // capture; it runs freely until the walk is confirmed.
        await page.clock.install()
        page.on('pageerror', (err) => console.error('ink-walk-e2e: pageerror', err.message))
        await page.goto(`${baseUrl}/exploration`, { waitUntil: 'networkidle' })
        const instant = await page.evaluate(() => globalThis.__AXM_JUICE_INSTANT__ ?? null)
        if (instant) fail('the juice escape hatch is set: this drive must see the motion')

        const node = page.getByTestId('node-bw-w2')
        await node.waitFor({ state: 'visible', timeout: 15000 })
            .catch(() => fail('bw-w2 never showed on the map'))
        await node.click()
        await page.getByTestId('node-confirm-go').waitFor({ state: 'visible', timeout: 5000 })
            .catch(() => fail('tapping bw-w2 opened no confirm panel'))

        log('confirming the walk to bw-w2 ...')
        const now = await page.evaluate(() => Date.now())
        await page.clock.pauseAt(now + 20)
        await page.getByTestId('node-confirm-go').click()

        // 1. The map ink, mid-spread, centred on the token the camera framed.
        const spread = await catchMid(page, () => mapInkReading(page), (r) => r.coverage > 0.2 && r.coverage < 0.8, 'the map ink')
        const token = await tokenCentre(page, 'bw-w2')
        await page.screenshot({ path: join(SHOTS, 'map-mid-spread.png') })
        await stillMid(() => mapInkReading(page), 'the map ink', 'map-mid-spread.png')
        const off = Math.hypot(spread.cx - token.x, spread.cy - token.y)
        if (off > 24) fail(`the ink grew from (${spread.cx.toFixed(0)}, ${spread.cy.toFixed(0)}), ${off.toFixed(0)}pt off bw-w2's token at (${token.x.toFixed(0)}, ${token.y.toFixed(0)})`)
        if (page.url().endsWith('/combat-encounter')) fail('the fight route opened before the ink covered')
        log(`map ink mid-spread: ${(spread.coverage * 100).toFixed(0)}% of the window, from bw-w2's token`)

        // 2. The fight opens under the ink; its curtain, mid-draw.
        await stepUntil(page, async () => new URL(page.url()).pathname.endsWith('/combat-encounter'),
            `the walk to bw-w2 never reached /combat-encounter (at ${page.url()})`)
        const draw = await catchMid(page, () => curtainReading(page), (r) => r.coverage > 0.3 && r.coverage < 0.7, 'the fight curtain')
        await page.screenshot({ path: join(SHOTS, 'reveal-mid-draw.png') })
        await stillMid(() => curtainReading(page), 'the fight curtain', 'reveal-mid-draw.png')
        log(`fight curtain mid-draw: ${(draw.coverage * 100).toFixed(0)}% of the window still inked`)
        if (await page.getByTestId('map-ink').count()) fail('the map ink still covers the fight screen while its curtain draws')

        // 3. The reveal, settled: the clock runs freely again.
        await page.clock.resume()
        await page.getByTestId('ink-curtain').waitFor({ state: 'detached', timeout: 10000 })
            .catch(() => fail('the fight curtain never finished drawing back'))
        await page.getByTestId('combat-reveal').waitFor({ state: 'visible', timeout: 5000 })
            .catch(() => fail('the reveal never showed once the ink was gone'))
        await page.waitForTimeout(400)
        await page.screenshot({ path: join(SHOTS, 'reveal-settled.png') })
        log(`reveal settled; frames in ${SHOTS}`)
    } finally {
        await context.close()
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    await mkdir(SHOTS, { recursive: true })
    const r = await ensureWebExport({ outDir: EXPORT_DIR, log })
    if (!r.ok) { console.error('ink-walk-e2e: expo export failed'); process.exit(3) }
    const { server, baseUrl } = await startStaticServer(EXPORT_DIR)
    log(`static server at ${baseUrl}`)

    const { chromium } = await import('playwright')
    const launchOptions = { headless: true }
    if (process.env.INK_WALK_E2E_CHROME) launchOptions.executablePath = process.env.INK_WALK_E2E_CHROME
    const browser = await chromium.launch(launchOptions)
    try {
        await runInkWalk(browser, baseUrl)
        log('ALL PASS — the ink bleeds out of the token and draws back off the foe')
    } finally {
        await browser.close()
        server.close()
    }
}

main().catch((err) => {
    console.error('ink-walk-e2e: aborted —', err.message)
    process.exit(process.exitCode || 3)
})
