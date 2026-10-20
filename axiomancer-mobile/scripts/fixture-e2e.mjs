#!/usr/bin/env node
// scripts/fixture-e2e.mjs
//
// State-fixture boot — browser-driven end-to-end proof (2026-09-07).
//
// Boots the exported web build three ways and asserts what the player
// sees, so the UI half of `docs/state-fixtures.md` is evidenced by the
// same registry the CLI's `--fixture` flag boots from:
//
//   A. URL deep link  `/exploration?fixture=sage-bw-door-gate` (dev tools
//      forced) → the exploration map opens with bw-15 as the live node.
//   B. Init-script global with an INLINE fixture carrying `arrive: true`
//      → `<FixtureBoot>` fires the node event and `<EventGate>` lands on
//      `/dialogue` cold.
//   C. Fallback: an unknown id (`?fixture=no-such-fixture`) is ignored →
//      the fresh-game map opens with bw-15 NOT live and no runtime error.
//
// The production gate (`isDevToolsEnabled()` false → any request ignored)
// is pinned by the Jest suite `state/e2e/state-fixture.engine.test.ts`; a
// `BUILD_PROFILE=preview` export bakes `devToolsEnabled: true`, so the
// gate cannot be exercised against this bundle.
//
// Usage:
//   node scripts/fixture-e2e.mjs                 # export + run
//   AXM_FORCE_EXPORT=1 node scripts/...       # re-export (else .smoke-dist is reused on a stamp hit)
//   FIXTURE_E2E_CHROME=/path/to/chrome ...       # custom browser binary
//
// Exit codes: 0 = all three cases pass · 1 = assertion failed ·
// 3 = boot failure (export / server / browser).

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { forceDevTools, injectStateFixture } from './fixture-injector.mjs'
import { ensureWebExport } from './lib/web-export.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const EXPORT_DIR = resolve(REPO_ROOT, '.smoke-dist')
const VIEWPORT = { width: 390, height: 844 }

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
}

const log = (msg) => console.log(`fixture-e2e: ${msg}`)
function fail(msg) {
    console.error(`fixture-e2e: FAIL — ${msg}`)
    process.exitCode = 1
    throw new Error(msg)
}

// ---------------------------------------------------------------------------
// Export + static server (mirrors scripts/hazard-e2e.mjs)
// ---------------------------------------------------------------------------

async function runExpoExport() {
    const r = await ensureWebExport({ outDir: EXPORT_DIR, log })
    if (!r.ok) { console.error('fixture-e2e: expo export failed'); process.exit(3) }
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
// Assertions
// ---------------------------------------------------------------------------

/** The exploration map marks the live node's accessibility label with "here". */
async function expectLiveNode(page, nodeId, label) {
    const node = page.getByTestId(`node-${nodeId}`)
    await node.waitFor({ state: 'visible', timeout: 20000 }).catch(() => fail(`${label}: node-${nodeId} never rendered`))
    const aria = await node.getAttribute('aria-label')
    if (!aria || !aria.includes('here')) fail(`${label}: node-${nodeId} is not the live node (aria-label: ${aria})`)
    log(`${label}: node-${nodeId} is the live node ✔`)
}

function trackErrors(page, bucket) {
    page.on('pageerror', (e) => bucket.push(`pageerror: ${e.message}`))
    page.on('console', (m) => { if (m.type() === 'error') bucket.push(`console: ${m.text()}`) })
}

async function caseUrlDeepLink(browser, baseUrl) {
    const context = await browser.newContext({ viewport: VIEWPORT })
    const errors = []
    try {
        await forceDevTools(context)
        const page = await context.newPage()
        trackErrors(page, errors)
        await page.goto(`${baseUrl}/exploration?fixture=sage-bw-door-gate`, { waitUntil: 'networkidle', timeout: 30000 })
        await expectLiveNode(page, 'bw-15', 'A (url deep link)')
        // Neighbours were unlocked by placeOnNode: the boss node is open.
        const boss = await page.getByTestId('node-bw-17').getAttribute('aria-label')
        if (!boss || !boss.includes('open')) fail(`A: bw-17 should be open after placement (aria-label: ${boss})`)
    } finally {
        await context.close()
    }
    if (errors.length) fail(`A: runtime errors\n  ${errors.join('\n  ')}`)
}

async function caseInlineArrive(browser, baseUrl) {
    const context = await browser.newContext({ viewport: VIEWPORT })
    const errors = []
    try {
        await injectStateFixture(context, {
            id: 'e2e-inline-arrive',
            seed: 'fixture-e2e-inline',
            preset: 'apprentice',
            world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-2' },
            arrive: true,
            stagedEvent: {
                kind: 'narration',
                dialogue: { rootId: 'start', nodes: { start: { id: 'start', text: 'A placeholder line.' } } },
            },
        })
        const page = await context.newPage()
        trackErrors(page, errors)
        await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 30000 })
        await page.waitForURL((url) => url.pathname.endsWith('/dialogue'), { timeout: 20000 })
            .catch(() => fail(`B (inline + arrive): expected /dialogue, got ${page.url()}`))
        log('B (inline + arrive): landed on /dialogue cold ✔')
    } finally {
        await context.close()
    }
    if (errors.length) fail(`B: runtime errors\n  ${errors.join('\n  ')}`)
}

async function caseUnknownIdFallback(browser, baseUrl) {
    const context = await browser.newContext({ viewport: VIEWPORT })
    const errors = []
    try {
        await forceDevTools(context)
        const page = await context.newPage()
        trackErrors(page, errors)
        await page.goto(`${baseUrl}/exploration?fixture=no-such-fixture`, { waitUntil: 'networkidle', timeout: 30000 })
        // A fresh game boots (title / arrival flow — whatever the new-player
        // path renders); the boss-gate fixture's node must NOT be live and
        // the app must have painted something.
        await page.waitForTimeout(1500)
        const text = await page.evaluate(() => document.body?.innerText?.trim() ?? '')
        if (text.length === 0) fail('C (unknown id): the app rendered nothing')
        const bw15 = page.getByTestId('node-bw-15')
        const aria = (await bw15.count()) > 0 ? await bw15.first().getAttribute('aria-label') : null
        if (aria && aria.includes('here')) fail(`C (unknown id): a fixture was applied (bw-15 aria-label: ${aria})`)
        log('C (unknown id → fresh game): request ignored, app painted, no crash ✔')
    } finally {
        await context.close()
    }
    // The fallback is LOGGED as an error on purpose (`persistence/fixture-boot-failed`)
    // so a harness can see why its request was dropped; that one line is the
    // expected evidence, anything else is a real runtime error.
    const expected = errors.filter((e) => e.includes('fixture-boot-failed'))
    const unexpected = errors.filter((e) => !e.includes('fixture-boot-failed'))
    if (expected.length === 0) fail('C: the fallback did not log persistence/fixture-boot-failed')
    if (unexpected.length) fail(`C: runtime errors\n  ${unexpected.join('\n  ')}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    await runExpoExport()
    const { server, baseUrl } = await startStaticServer(EXPORT_DIR)
    let browser = null
    try {
        const { chromium } = await import('playwright')
        browser = await chromium.launch({ executablePath: process.env.FIXTURE_E2E_CHROME || undefined })
        await caseUrlDeepLink(browser, baseUrl)
        await caseInlineArrive(browser, baseUrl)
        await caseUnknownIdFallback(browser, baseUrl)
        log('all three cases passed')
    } finally {
        if (browser) await browser.close().catch(() => {})
        server.close()
    }
}

main().catch((err) => {
    if (process.exitCode !== 1) {
        console.error(`fixture-e2e: boot failure — ${err?.message ?? err}`)
        process.exitCode = 3
    }
})
