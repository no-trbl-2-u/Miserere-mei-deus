#!/usr/bin/env node
// scripts/encounter-routing-e2e.mjs
//
// Map-encounter → minigame ROUTING — browser-driven end-to-end guard.
//
// Boots the exported web build, opens the DEV menu, and clicks each
// "TRIGGER ENCOUNTER" minigame button (HAZARD / REST / TREASURE). For
// each, it asserts the app lands on the matching full-screen minigame
// route AND that the minigame's screen actually mounted — never the
// "/event" → "NO EVENT IN PROGRESS" card.
//
// Why this exists (2026-06-14): the four non-hazard minigame kinds
// live at the time (rest / gather / treasure / quest) regressed to a
// dead-end "NO EVENT" card because `<DebugTriggerEncounter>` seeded
// the event slice instead of launching the minigame session. The only
// test covering these buttons asserted that broken slice-seeding, so
// nothing caught it. This script pins the player-facing contract at
// the browser level: clicking TREASURE opens The Reliquary, etc. It
// mirrors `scripts/hazard-e2e.mjs`'s boot rig. (Phase 61 dropped the
// QUEST case along with the Quest Board minigame and its trigger
// button. Phase 76 dropped the GATHER case the same way — the
// `gathering` node now grants items inline with no minigame screen to
// route to; `DebugTriggerEncounter.test.tsx` covers the inline-grant
// contract at the unit level instead.)
//
// Usage:
//   node scripts/encounter-routing-e2e.mjs                  # export + run
//   AXM_FORCE_EXPORT=1 node scripts/...       # re-export (else .smoke-dist is reused on a stamp hit)
//   ENCOUNTER_E2E_CHROME=/path/to/chrome node scripts/...   # custom browser
//
// Exit codes: 0 = every button routed correctly · 1 = assertion failed ·
// 3 = boot failure (export / server / browser).

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDevSection } from './dev-section.mjs'
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

function log(msg) {
    console.log(`encounter-routing-e2e: ${msg}`)
}

function fail(msg) {
    console.error(`encounter-routing-e2e: FAIL — ${msg}`)
    process.exitCode = 1
    throw new Error(msg)
}

// Each minigame TRIGGER button → the route it must open + a landing
// testID proving that minigame's screen mounted. The bug routed these
// to /event instead, so the route is the decisive regression signal.
const CASES = [
    { button: 'treasure', route: '/cache', landing: 'cache-choice-offers', name: 'The Reliquary' },
    { button: 'rest', route: '/rest', landing: 'rest-choice-offers', name: 'the rest-choice node' },
    { button: 'hazard', route: '/hazard', landing: 'hazard-route-select', name: 'Hazard' },
]

// ---------------------------------------------------------------------------
// Export + static server (mirrors scripts/hazard-e2e.mjs)
// ---------------------------------------------------------------------------

async function runExpoExport() {
    const r = await ensureWebExport({ outDir: EXPORT_DIR, log })
    if (!r.ok) { console.error('encounter-routing-e2e: expo export failed'); process.exit(3) }
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
// One case
// ---------------------------------------------------------------------------

/**
 * Navigate from the SELF tab into the dev controls.
 *
 * Phase 132 extracted the inline `DevMenu` dropdown (the old
 * `dev-menu-header` affordance) into a dedicated `/dev` route reached
 * by the `self-dev-tools-link` row on the SELF sheet. The Debug* entry
 * buttons now live on that Developer screen, so the harness taps the
 * link and waits for the route before looking for them.
 */
async function openDevTools(page) {
    await page.getByTestId('self-dev-tools-link').waitFor({ state: 'visible', timeout: 15000 })
    await page.getByTestId('self-dev-tools-link').click()
    await page.waitForURL((url) => url.pathname.endsWith('/dev'), { timeout: 10000 })
}

async function checkButton(page, baseUrl, c) {
    log(`=== ${c.button.toUpperCase()} → ${c.route} (${c.name}) ===`)
    // A static web export can't surface `extra.devToolsEnabled` at runtime
    // (phase 47b: `web.output` moved to `"single"`) — the documented opt-in
    // (lib/buildProfile.ts). Inert in real builds: nothing sets the global there.
    await page.addInitScript(() => { globalThis.__AXM_FORCE_DEV_TOOLS__ = true })
    await page.goto(`${baseUrl}/character`, { waitUntil: 'networkidle' })

    // Open the dev tools (SELF → DEV TOOLS → the /dev Developer screen)
    // and fire the trigger button.
    await openDevTools(page)
    await openDevSection(page, 'encounters', `debug-trigger-encounter-${c.button}`)
    const btn = page.getByTestId(`debug-trigger-encounter-${c.button}`)
    await btn.waitFor({ state: 'visible', timeout: 15000 })
    await btn.click()

    // The decisive regression signal: the gate must route to the
    // minigame, not <EventGate>'s /event shell.
    try {
        await page.waitForURL((url) => url.pathname === c.route, { timeout: 10000 })
    } catch {
        fail(`${c.button} did not route to ${c.route} — landed on ${new URL(page.url()).pathname}`)
    }

    // Belt-and-braces: the "NO EVENT" empty card must never be on screen.
    const bodyText = await page.locator('body').innerText()
    if (/NO EVENT IN PROGRESS/i.test(bodyText)) {
        fail(`${c.button} surfaced the "NO EVENT IN PROGRESS" card on ${c.route}`)
    }

    // The minigame's own screen actually mounted.
    await page
        .getByTestId(c.landing)
        .waitFor({ state: 'visible', timeout: 10000 })
        .catch(() => fail(`${c.button} routed to ${c.route} but '${c.landing}' never rendered`))

    log(`${c.button}: opened ${c.name} at ${c.route}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    await runExpoExport()
    const { server, baseUrl } = await startStaticServer(EXPORT_DIR)
    log(`static server at ${baseUrl}`)

    const { chromium } = await import('playwright')
    const launchOptions = { headless: true }
    if (process.env.ENCOUNTER_E2E_CHROME) {
        launchOptions.executablePath = process.env.ENCOUNTER_E2E_CHROME
    }
    const browser = await chromium.launch(launchOptions)
    try {
        for (const c of CASES) {
            // Fresh context per case so each click starts from a clean
            // session (no carried-over minigame slice).
            const context = await browser.newContext({ viewport: VIEWPORT, hasTouch: false })
            const page = await context.newPage()
            page.on('pageerror', (err) => console.error('encounter-routing-e2e: pageerror', err.message))
            await checkButton(page, baseUrl, c)
            await context.close()
        }
        log('ALL PASS — every minigame trigger routed to its screen')
    } finally {
        await browser.close()
        server.close()
    }
}

main().catch((err) => {
    console.error('encounter-routing-e2e: aborted —', err.message)
    process.exit(process.exitCode || 3)
})
