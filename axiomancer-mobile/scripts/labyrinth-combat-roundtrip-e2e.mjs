#!/usr/bin/env node
// scripts/labyrinth-combat-roundtrip-e2e.mjs
//
// Labyrinth <-> combat ROUND TRIP — browser-driven guard that a fight in
// THE APORIA runs on the same `/combat-encounter` route as a map fight
// (phase CR1b) and returns the player to the room it was sprung in.
//
// Deterministic: an inline state fixture stands a Sage on the Breakwater
// with the labyrinth open; the script enters Act I (leaving the entrance
// narration if it shows), walks from the entry room to The Peristyle (room 4) and
// inspects its baited fountain, whose FIRST inspection springs a combat
// encounter (`trap: 'encounter'`, act1.content.ts). `<CombatGate>` engages
// it and pushes `/combat-encounter`; WITHDRAW leaves, and the script asserts
// the URL is `/labyrinth` with the room on screen. If the room's own
// arrival event happens to be a fight, that fight is used instead.
//
// Usage:
//   node scripts/labyrinth-combat-roundtrip-e2e.mjs
//   AXM_FORCE_EXPORT=1 node scripts/...       # re-export (else .smoke-dist is reused on a stamp hit)
//   LABYRINTH_E2E_CHROME=/path/to/chrome node scripts/...
//
// Exit codes: 0 = round trip clean · 1 = assertion failed ·
// 3 = boot failure (export / server / browser).

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { injectStateFixture } from './fixture-injector.mjs'
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
    console.log(`labyrinth-combat-roundtrip-e2e: ${msg}`)
}

function fail(msg) {
    console.error(`labyrinth-combat-roundtrip-e2e: FAIL — ${msg}`)
    process.exitCode = 1
    throw new Error(msg)
}

// ---------------------------------------------------------------------------
// Export + static server (mirrors scripts/encounter-routing-e2e.mjs)
// ---------------------------------------------------------------------------

async function runExpoExport() {
    const r = await ensureWebExport({ outDir: EXPORT_DIR, log })
    if (!r.ok) { console.error('labyrinth-combat-roundtrip-e2e: expo export failed'); process.exit(3) }
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


const onCombatRoute = (url) => url.pathname.endsWith('/combat-encounter')
const onLabyrinth = (url) => url.pathname.endsWith('/labyrinth')

/** Click a testID once it is visible; fail with `what` if it never shows. */
async function press(page, testId, what, timeout = 10000) {
    // Visible only: a stacked route can leave hidden copies of a testID.
    const el = page.locator(`[data-testid="${testId}"]:visible`).first()
    await el.waitFor({ state: 'visible', timeout }).catch(() => fail(`${what}: \`${testId}\` never appeared (at ${page.url()})`))
    await el.click({ force: true })
}

async function runRoundTrip(page, baseUrl) {
    await page.goto(`${baseUrl}/labyrinth`, { waitUntil: 'networkidle' })

    log('entering Act I ...')
    await press(page, 'labyrinth-act-act1', 'act select')
    // The entrance narration, when it shows, is left with LEAVE; either way
    // the entry room is where the walk starts.
    const leave = page.locator('[data-testid="dialogue-leave"]:visible').first()
    const room = page.locator('[data-testid="labyrinth-room"]:visible').first()
    await Promise.race([
        leave.waitFor({ state: 'visible', timeout: 15000 }),
        room.waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => {})
    if (await leave.count()) await leave.click({ force: true })
    await room.waitFor({ state: 'visible', timeout: 15000 })
        .catch(() => fail('the entry room never showed'))

    log('walking to The Peristyle (room 4) ...')
    await press(page, 'labyrinth-door-ap1-9', 'entry room door to ap1-9')
    await press(page, 'labyrinth-door-walk', 'door confirm')

    // The room's arrival may itself be a fight; otherwise inspect the bait.
    await Promise.race([
        page.waitForURL(onCombatRoute, { timeout: 8000 }),
        page.locator('[data-testid="labyrinth-poi-fountain"]:visible').first().waitFor({ state: 'visible', timeout: 8000 }),
    ]).catch(() => {})
    if (!onCombatRoute(new URL(page.url()))) {
        if (!onLabyrinth(new URL(page.url()))) {
            fail(`arriving at room 4 left the labyrinth for ${new URL(page.url()).pathname}, not a fight`)
        }
        log('inspecting the baited fountain ...')
        // The arrival fight can still beat the click to the punch after the
        // race above picked the fountain: a detached target or a click that
        // never lands because the page has already navigated is that same
        // "arrival was a fight" case, not a harness failure. The waitForURL
        // below is the real assertion either way.
        const fountain = page.locator('[data-testid="labyrinth-poi-fountain"]:visible').first()
        const appeared = await fountain.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false)
        if (appeared) {
            await fountain.click({ force: true, timeout: 5000 }).catch(() => {})
        } else if (!onCombatRoute(new URL(page.url()))) {
            fail(`room 4 fountain: \`labyrinth-poi-fountain\` never appeared (at ${page.url()})`)
        }
    } else {
        log('room 4\'s arrival was itself a fight')
    }

    await page.waitForURL(onCombatRoute, { timeout: 15000 })
        .catch(() => fail(`the labyrinth fight did not reach /combat-encounter (at ${page.url()})`))
    await page.locator('[data-testid="combat-reveal"]:visible').first().waitFor({ state: 'visible', timeout: 10000 })
        .catch(() => fail('labyrinth fight routed but the combat reveal never rendered'))
    log('labyrinth fight on /combat-encounter')

    const withdraw = page.locator('[data-testid="combat-withdraw"]:visible')
    if (await withdraw.count()) {
        log('pressing WITHDRAW ...')
        await withdraw.first().click({ force: true })
    } else {
        fail('the labyrinth foe sealed WITHDRAW; this harness expects a standard foe')
    }

    await page.waitForURL(onLabyrinth, { timeout: 10000 })
        .catch(() => fail(`WITHDRAW did not return to /labyrinth (at ${page.url()})`))
    await page.locator('[data-testid="labyrinth-room"]:visible').first().waitFor({ state: 'visible', timeout: 10000 })
        .catch(() => fail('back on /labyrinth but the room is not on screen'))
    log('round trip clean — back in the labyrinth room')
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
    if (process.env.LABYRINTH_E2E_CHROME) {
        launchOptions.executablePath = process.env.LABYRINTH_E2E_CHROME
    }
    const browser = await chromium.launch(launchOptions)
    try {
        const context = await browser.newContext({ viewport: VIEWPORT, hasTouch: false })
        // A Sage standing on the Breakwater's bw-15, the labyrinth's door
        // (fixture-gallery's labyrinth entries use the same stand).
        await injectStateFixture(context, {
            id: 'labyrinth-roundtrip', seed: 'g9', preset: 'sage',
            world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-15', completedMaps: [] },
        })
        const page = await context.newPage()
        page.on('pageerror', (err) => console.error('labyrinth-combat-roundtrip-e2e: pageerror', err.message))
        await runRoundTrip(page, baseUrl)
        await context.close()
        log('ALL PASS — labyrinth/combat round trip holds')
    } finally {
        await browser.close()
        server.close()
    }
}

main().catch((err) => {
    console.error('labyrinth-combat-roundtrip-e2e: aborted —', err.message)
    process.exit(process.exitCode || 3)
})
