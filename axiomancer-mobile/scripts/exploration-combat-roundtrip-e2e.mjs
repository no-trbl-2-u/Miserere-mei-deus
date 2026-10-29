#!/usr/bin/env node
// scripts/exploration-combat-roundtrip-e2e.mjs
//
// Exploration <-> combat ROUND TRIP — browser-driven guard that a live
// fight leaves the map for its own route and comes back cleanly.
//
// Since phase CR1a a fight is not drawn over the map: `<CombatGate>`
// engages the encounter and pushes the full-screen `/combat-encounter`
// route, which covers the tab bar. This script proves, as real rendered
// layout in a browser:
//
//   1. ROUND TRIP. The `debug-trigger-encounter-encounter` dev button
//      (components/DebugTriggerEncounter.tsx) arms an encounter with no map
//      walk and no RNG; the URL becomes `/combat-encounter`, the reveal
//      shows, and the tab bar cannot be reached. WITHDRAW — an unconditional
//      retreat, no dice roll — returns to `/exploration` with the tab bar
//      and the map back.
//   2. RELOAD MID-FIGHT. A fight entered by ARRIVING at an encounter node
//      (an inline state fixture with `arrive`, re-applied on every load) is
//      reloaded while on `/combat-encounter`: the route finds no fight in
//      the fresh store and leaves, the map's owed arrival replays the
//      encounter, and the gate puts the player back on `/combat-encounter`.
//      (A saved chronicle owes the same arrival: start-node-arrival test.)
//
// Playing a fight to its end is `combat-round-e2e.mjs`'s job.
//
// Usage:
//   node scripts/exploration-combat-roundtrip-e2e.mjs
//   AXM_FORCE_EXPORT=1 node scripts/...       # re-export (else .smoke-dist is reused on a stamp hit)
//   ROUNDTRIP_E2E_CHROME=/path/to/chrome node scripts/...
//
// Exit codes: 0 = round trip clean · 1 = assertion failed ·
// 3 = boot failure (export / server / browser).

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { injectStateFixture } from './fixture-injector.mjs'
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
    console.log(`exploration-combat-roundtrip-e2e: ${msg}`)
}

function fail(msg) {
    console.error(`exploration-combat-roundtrip-e2e: FAIL — ${msg}`)
    process.exitCode = 1
    throw new Error(msg)
}

// ---------------------------------------------------------------------------
// Export + static server (mirrors scripts/encounter-routing-e2e.mjs)
// ---------------------------------------------------------------------------

async function runExpoExport() {
    const r = await ensureWebExport({ outDir: EXPORT_DIR, log })
    if (!r.ok) { console.error('exploration-combat-roundtrip-e2e: expo export failed'); process.exit(3) }
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

/** Navigate from the SELF tab into the dev controls (mirrors encounter-routing-e2e.mjs). */
async function openDevTools(page) {
    await page.getByTestId('self-dev-tools-link').waitFor({ state: 'visible', timeout: 15000 })
    await page.getByTestId('self-dev-tools-link').click()
    await page.waitForURL((url) => url.pathname.endsWith('/dev'), { timeout: 10000 })
}

// react-navigation's web tab bar can leave a hidden/duplicate node with
// the same aria-label mounted alongside the live one during a
// lock/unlock transition (confirmed via manual DOM inspection — not a
// product bug, just DOM noise); `:visible` filters to the one(s)
// actually on screen.
const CHARACTER_TAB = '[aria-label="Character tab"]:visible'

/** Whether a tap on the Character tab would land on it (not on a route covering it). */
async function characterTabReachable(page) {
    return page.evaluate(() => {
        const tab = [...document.querySelectorAll('[aria-label="Character tab"]')]
            .find((el) => el.getClientRects().length > 0)
        if (!tab) return false
        const r = tab.getBoundingClientRect()
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
        return !!hit && tab.contains(hit)
    })
}

const onCombatRoute = (url) => url.pathname.endsWith('/combat-encounter')

// ---------------------------------------------------------------------------
// The round trip
// ---------------------------------------------------------------------------

async function runRoundTrip(page, baseUrl) {
    // A static web export can't surface `extra.devToolsEnabled` at runtime, so
    // the SELF → /dev affordance this harness drives from needs the documented
    // opt-in (lib/buildProfile.ts) — the same one combat-round-e2e sets.
    // Inert in real builds: nothing sets the global there.
    await page.addInitScript(() => { globalThis.__AXM_FORCE_DEV_TOOLS__ = true })
    await page.goto(`${baseUrl}/character`, { waitUntil: 'networkidle' })
    await openDevTools(page)

    log('arming an encounter via the COMBAT dev trigger ...')
    await openDevSection(page, 'encounters', 'debug-trigger-encounter-encounter')
    const trigger = page.getByTestId('debug-trigger-encounter-encounter')
    await trigger.waitFor({ state: 'visible', timeout: 15000 })
    await trigger.click()

    // The dev trigger jumps to the WILDS tab and arms the event; the gate
    // engages it and pushes the fight onto its own route.
    await page
        .waitForURL(onCombatRoute, { timeout: 10000 })
        .catch(() => fail(`COMBAT trigger did not reach /combat-encounter (at ${page.url()})`))

    await page
        .getByTestId('combat-reveal')
        .waitFor({ state: 'visible', timeout: 10000 })
        .catch(() => fail('fight routed but the combat reveal never rendered'))

    // The route covers the tabs: nothing in the fight can reach them.
    if (await characterTabReachable(page)) {
        fail('tab bar (Character tab) reachable while the fight is on screen')
    }
    log('fight on /combat-encounter; tab bar covered')

    log('pressing WITHDRAW ...')
    const flee = page.getByTestId('combat-withdraw')
    await flee.waitFor({ state: 'visible', timeout: 10000 })
    await flee.click()

    // Off the fight route. Where it lands is the map, unless the start
    // node's owed arrival (below) takes the screen first.
    await page
        .waitForURL((url) => !onCombatRoute(url), { timeout: 10000 })
        .catch(() => fail(`WITHDRAW did not leave /combat-encounter (at ${page.url()})`))
    await page
        .getByTestId('combat-reveal')
        .waitFor({ state: 'hidden', timeout: 10000 })
        .catch(() => fail('combat reveal still present after WITHDRAW'))

    // With the encounter out of the way the screen is idle again, which lets
    // the exploration screen's ARRIVAL event for the map's start node resolve
    // (2026-08-08) — the new game starts on the Breakwater, whose bw-w1
    // arrives as a full-screen ROUTE with no tab bar of its own. It is not
    // the tab LOCK, so play it out before reading the bar,
    // or this harness measures the wrong thing.
    //
    // RACE FIXED 2026-09-19. This used to sample `cutscene-advance` ONCE, the
    // instant after the modal hid. The arrival event resolves a beat later, so
    // when the runner was slow the sample read zero, the dismissal was skipped,
    // and the cutscene then mounted OVER the tab bar — and the harness spent its
    // whole 10s budget waiting for a bar that a full-screen route was covering.
    // It failed exactly that way in CI (run 35457152197) while passing locally
    // on the same commit, which is the signature of a sampled race rather than
    // a product bug: the passing log carries the "took the screen" line and the
    // failing one does not.
    //
    // The fix is to wait for the SETTLED outcome instead of sampling: race the
    // cutscene against the tab bar and act on whichever actually arrives. Either
    // is a legitimate post-WITHDRAW state, so neither is a failure here — the
    // real assertion is the tab-bar one below, which is left untouched.
    await Promise.race([
        page.getByTestId('cutscene-advance').waitFor({ state: 'visible', timeout: 8000 }),
        page.getByTestId('rest-choice-offers').waitFor({ state: 'visible', timeout: 8000 }),
        page.locator(CHARACTER_TAB).first().waitFor({ state: 'visible', timeout: 8000 }),
    ]).catch(() => {})

    if (await page.getByTestId('rest-choice-offers').count()) {
        log('start-node arrival rest took the screen — resting and moving on')
        await page.getByTestId('rest-choice-offer-rest').click({ timeout: 5000 })
        await page.getByTestId('rest-claim').click({ timeout: 5000 })
    }

    if (await page.getByTestId('cutscene-advance').count()) {
        log('start-node arrival cutscene took the screen — playing it out')
        // SKIP only reveals the remaining lines; the scene ends on a tap of the
        // body once every line is up (`cutscene-advance` → `dismissEvent`).
        await page.getByTestId('cutscene-skip').click({ timeout: 5000, force: true }).catch(() => {})
        for (let k = 0; k < 12; k++) {
            if (!(await page.getByTestId('cutscene-advance').count())) break
            await page.getByTestId('cutscene-advance').click({ timeout: 3000, force: true }).catch(() => {})
            await page.waitForTimeout(250)
        }
    }

    await page
        .locator(CHARACTER_TAB)
        .first()
        .waitFor({ state: 'visible', timeout: 10000 })
        .catch(() => fail('tab bar (Character tab) still hidden after WITHDRAW left the fight'))

    // The map itself — not just the chrome — survived the round trip.
    await page
        .getByTestId('map-canvas-wrapper')
        .waitFor({ state: 'visible', timeout: 10000 })
        .catch(() => fail('map-canvas-wrapper not visible after the round trip'))

    log('round trip clean — fight route left, tab bar and map back')
}

/** Reload while on the fight route: the player lands back in the fight. */
async function runReloadMidFight(browser, baseUrl) {
    const context = await browser.newContext({ viewport: VIEWPORT, hasTouch: false })
    try {
        // Standing on the Breakwater's bw-w3 encounter with its arrival owed.
        await injectStateFixture(context, {
            id: 'roundtrip-reload', seed: 'rt1', preset: 'sage', arrive: true,
            world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-w3', completedMaps: [] },
        })
        const page = await context.newPage()
        page.on('pageerror', (err) => console.error('exploration-combat-roundtrip-e2e: pageerror', err.message))
        await page.goto(`${baseUrl}/exploration`, { waitUntil: 'networkidle' })
        await page.waitForURL(onCombatRoute, { timeout: 15000 })
            .catch(() => fail(`arriving at bw-w3 did not reach /combat-encounter (at ${page.url()})`))
        await page.getByTestId('combat-reveal').waitFor({ state: 'visible', timeout: 10000 })
            .catch(() => fail('bw-w3 fight routed but the reveal never rendered'))
        log('arrival fight on /combat-encounter; reloading mid-fight ...')

        await page.reload({ waitUntil: 'networkidle' })
        await page.waitForURL(onCombatRoute, { timeout: 15000 })
            .catch(() => fail(`reload mid-fight did not return to /combat-encounter (at ${page.url()})`))
        await page.getByTestId('combat-reveal').waitFor({ state: 'visible', timeout: 10000 })
            .catch(() => fail('reloaded fight routed but the reveal never rendered'))
        log('reload mid-fight clean — back on /combat-encounter, fight restarted')
    } finally {
        await context.close()
    }
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
    if (process.env.ROUNDTRIP_E2E_CHROME) {
        launchOptions.executablePath = process.env.ROUNDTRIP_E2E_CHROME
    }
    const browser = await chromium.launch(launchOptions)
    try {
        const context = await browser.newContext({ viewport: VIEWPORT, hasTouch: false })
        const page = await context.newPage()
        page.on('pageerror', (err) => console.error('exploration-combat-roundtrip-e2e: pageerror', err.message))
        await runRoundTrip(page, baseUrl)
        await context.close()
        await runReloadMidFight(browser, baseUrl)
        log('ALL PASS — exploration/combat round trip and mid-fight reload hold')
    } finally {
        await browser.close()
        server.close()
    }
}

main().catch((err) => {
    console.error('exploration-combat-roundtrip-e2e: aborted —', err.message)
    process.exit(process.exitCode || 3)
})
