#!/usr/bin/env node
// scripts/map-walk-e2e.mjs
//
// MAP WALK — a browser journey that plays the start map node to node, the way
// a player does, from a brand-new game (plan/AUDIT.md "[tests] No Playwright
// journey walks a map node to node", filed 2026-09-26).
//
// Every other browser journey arms its screen from a dev button
// (`debug-trigger-*`) or a fixture. Nothing proved that tapping a node,
// confirming, playing out what the node opens, and landing back on the map
// works across node types, and the only walk of the Breakwater was a
// throwaway script. This is that walk, kept:
//
//   1. NEW GAME: the windmill's arrival scene (D31), then the map (no relic);
//   2. bw-5, a loot cache: take a card, move on, back on the map;
//   3. bw-4, an empty waypoint: nothing opens, still on the map (lateral rib);
//   4. bw-19, the first quest node: ACCEPT step 1 on `/quest`, LEAVE; the
//      hazard pocket behind it opens (QL1d: every fight and hazard sits in a
//      pocket behind its quest node);
//   5. bw-3, a hazard: lands on the route select, and the dev skip seam
//      crosses it. Playing the board itself is `hazard-e2e.mjs`'s job (its
//      drag helpers); this pins the routing. Arriving counts step 1;
//   6. bw-9, a rest: REST, claim, back on the map;
//   7. bw-20, the second quest node: TURN IN step 1, ACCEPT step 2;
//   8. bw-2, a fight in its pocket: the reveal, the board on the plain black
//      scene (D32), played to its end by ending phases. A defeat is the death
//      rule: the full-screen return moment, then the map on bw-20 (the node
//      walked from) at 1 VITAE, dying, with bw-2 still open.
//
// Node clicks go through the DOM: nodes off a phone viewport would need the
// camera panned first, and panning is not what this journey tests.
//
// Usage:
//   node scripts/map-walk-e2e.mjs
//   AXM_FORCE_EXPORT=1 node scripts/...       # re-export (else .smoke-dist is reused on a stamp hit)
//   MAP_WALK_E2E_CHROME=/path/to/chrome node scripts/map-walk-e2e.mjs
//
// Exit codes: 0 = walk clean · 1 = assertion failed ·
// 3 = boot failure (export / server / browser).

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
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
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
}

function log(msg) {
    console.log(`map-walk-e2e: ${msg}`)
}

function fail(msg) {
    console.error(`map-walk-e2e: FAIL — ${msg}`)
    process.exitCode = 1
    throw new Error(msg)
}

// ---------------------------------------------------------------------------
// Export + static server (mirrors scripts/exploration-combat-roundtrip-e2e.mjs)
// ---------------------------------------------------------------------------

async function runExpoExport() {
    const r = await ensureWebExport({ outDir: EXPORT_DIR, log })
    if (!r.ok) { console.error('map-walk-e2e: expo export failed'); process.exit(3) }
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
// Helpers
// ---------------------------------------------------------------------------

// See exploration-combat-roundtrip-e2e.mjs: the web tab bar can leave a hidden
// duplicate mounted during a lock transition, so filter to the visible one.
const CHARACTER_TAB = '[aria-label="Character tab"]:visible'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Click a test id if it is on screen; true when it was. */
async function tap(page, testId) {
    const el = page.getByTestId(testId).first()
    if (!(await el.count())) return false
    if (!(await el.isVisible().catch(() => false))) return false
    await el.click({ timeout: 3000, force: true }).catch(() => {})
    return true
}

async function waitFor(page, testId, what, timeout = 15000) {
    await page
        .getByTestId(testId)
        .first()
        .waitFor({ state: 'visible', timeout })
        .catch(() => fail(`${what}: \`${testId}\` never appeared (at ${new URL(page.url()).pathname})`))
}

/** On the map, idle: the WILDS route, the tab bar up, no encounter reveal. */
async function onMap(page) {
    return (
        /\/exploration/.test(page.url())
        && (await page.locator(CHARACTER_TAB).count()) > 0
        && !(await page.getByTestId('combat-reveal').count())
    )
}

/** A node's accessibility label, e.g. "The Windmill, here". */
async function nodeLabel(page, nodeId) {
    return page.evaluate((id) => document.querySelector(`[data-testid="node-${id}"]`)?.getAttribute('aria-label') ?? null, nodeId)
}

/** Play out an arrival cutscene: SKIP reveals the rest, a tap on the body ends it. */
async function playOutCutscene(page) {
    await tap(page, 'cutscene-skip')
    for (let k = 0; k < 12; k++) {
        if (!(await tap(page, 'cutscene-advance'))) break
        await sleep(250)
    }
}

/**
 * Settle back on the map after a node's screen, playing only the screens a
 * node legitimately chains into (an arrival scene after a restart, the first
 * relic, a rest claim). Anything else still up after the budget is a failure.
 *
 * A defeat's run reset re-seats the player on a node that owes a fresh
 * arrival, but the app resolves that arrival a tick late (exploration's
 * screen defers it to a `setTimeout(0)` so a same-handler session-open isn't
 * mistaken for idle) — so the map can render, satisfying `onMap()`, a moment
 * before routing away to the replayed arrival cutscene. A single `onMap()`
 * read can land inside that window, so a hit is confirmed stable across one
 * more deferred-macrotask-sized wait before this returns.
 */
async function settleOnMap(page, what) {
    for (let i = 0; i < 40; i++) {
        if (await onMap(page)) {
            await sleep(250)
            if (await onMap(page)) return
            continue
        }
        await sleep(400)
        if (await tap(page, 'combat-summary-close')) continue
        if (await tap(page, 'death-return-continue')) continue
        if (await page.getByTestId('cutscene-advance').count()) { await playOutCutscene(page); continue }
        if (await tap(page, 'item-reward-confirm')) continue
        if (await tap(page, 'rest-claim')) continue
    }
    fail(`${what}: never got back to the map (stuck at ${new URL(page.url()).pathname})`)
}

/** Tap a map node (through the DOM) and confirm travel. */
async function travelTo(page, nodeId) {
    const label = await nodeLabel(page, nodeId)
    if (!label) fail(`node-${nodeId} is not on the map`)
    if (!/open/.test(label)) fail(`node-${nodeId} is not open (label: "${label}")`)
    await page.evaluate((id) => document.querySelector(`[data-testid="node-${id}"]`).click(), nodeId)
    await waitFor(page, 'node-confirm-go', `${nodeId} confirm panel`, 5000)
    await page.evaluate(() => document.querySelector('[data-testid="node-confirm-go"]').click())
    log(`travelling to ${nodeId} (${label})`)
}

async function expectHere(page, nodeId) {
    const label = await nodeLabel(page, nodeId)
    if (!label || !/here/.test(label)) fail(`expected to stand on ${nodeId}, its label reads "${label}"`)
}

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

async function newGame(page, baseUrl) {
    // A static web export can't surface `extra.devToolsEnabled` at runtime; this
    // is the documented opt-in (lib/buildProfile.ts) that installs the skip
    // seam the hazard step crosses its board with.
    await page.addInitScript(() => { globalThis.__AXM_FORCE_DEV_TOOLS__ = true })
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
    await page.getByLabel('Embark on your journey').click({ timeout: 15000 })
    await tap(page, 'main-menu-new-game') || fail('the main menu has no NEW GAME')
    await waitFor(page, 'save-slot-1-action', 'the new-game slot picker')
    await page.getByTestId('save-slot-1-action').click()

    // D31: a new game opens on the windmill's arrival scene, not a rest.
    await waitFor(page, 'cutscene-advance', 'the windmill arrival scene')
    const scene = await page.innerText('body')
    if (!/windmill/i.test(scene)) fail('the opening scene is not the windmill arrival')
    log('new game: windmill arrival scene')
    await playOutCutscene(page)

    // A run starts with no relic and is handed none: the scene opens the map.
    await settleOnMap(page, 'new game')
    await expectHere(page, 'bw-1')
    log('new game: on the Breakwater, at the windmill')
}

async function lootCache(page) {
    await travelTo(page, 'bw-5')
    await waitFor(page, 'cache-choice-offers', 'bw-5 loot cache')
    await page.getByTestId('cache-choice-offer-card').click({ force: true })
    // The offer resolves to an outcome with a single way out.
    await page.getByRole('button', { name: /move on/i }).first().click({ timeout: 10000 })
        .catch(() => fail('bw-5: the cache outcome has no "Move on"'))
    await settleOnMap(page, 'bw-5')
    await expectHere(page, 'bw-5')
    log('bw-5 cache: took a card, back on the map')
}

async function waypoint(page) {
    await travelTo(page, 'bw-4')
    await settleOnMap(page, 'bw-4')
    await expectHere(page, 'bw-4')
    log('bw-4 waypoint: nothing opened, still on the map')
}

/** A quest node: TURN IN the step before when it is ready, ACCEPT the one offered, LEAVE. */
async function questNode(page, nodeId, { turnIn }) {
    await travelTo(page, nodeId)
    await waitFor(page, 'quest-column', `${nodeId} quest screen`)
    if (turnIn) {
        await tap(page, 'quest-turn-in-button') || fail(`${nodeId}: the ready step has no TURN IN`)
        await waitFor(page, 'quest-paid', `${nodeId} turn-in payout`)
    }
    await waitFor(page, 'quest-accept-button', `${nodeId} offer`)
    await tap(page, 'quest-accept-button')
    await waitFor(page, 'quest-accepted-line', `${nodeId} accepted`)
    await tap(page, 'quest-leave-button') || fail(`${nodeId}: the quest screen has no LEAVE`)
    await settleOnMap(page, nodeId)
    await expectHere(page, nodeId)
    log(`${nodeId} quest node: ${turnIn ? 'turned in, ' : ''}accepted, back on the map`)
}

async function rest(page) {
    await travelTo(page, 'bw-9')
    await waitFor(page, 'rest-choice-offer-rest', 'bw-9 rest')
    await page.getByTestId('rest-choice-offer-rest').first().click({ force: true })
    await waitFor(page, 'rest-claim', 'bw-9 rest outcome')
    await tap(page, 'rest-claim')
    await settleOnMap(page, 'bw-9')
    await expectHere(page, 'bw-9')
    log('bw-9 rest: rested, back on the map')
}

async function fight(page) {
    await travelTo(page, 'bw-2')
    await waitFor(page, 'combat-reveal', 'bw-2 encounter reveal')
    await tap(page, 'combat-enter') || fail('bw-2: the reveal has no ENTER COMBAT')
    await waitFor(page, 'combat-arena-backdrop', 'bw-2 combat board')

    // D32: combat draws a plain black scene, never a plate image.
    const backdrop = await page.getByTestId('combat-arena-backdrop').first().evaluate((el) => ({
        img: el.tagName === 'IMG' || !!el.querySelector('img'),
        bgImage: getComputedStyle(el).backgroundImage,
    }))
    if (backdrop.img || backdrop.bgImage !== 'none') fail(`bw-2: the combat scene draws a plate (${JSON.stringify(backdrop)})`)
    log('bw-2 fight: on the board, plain black scene')

    // Play it to its end by ending phases (no cards staged), then close out.
    for (let k = 0; k < 120; k++) {
        if (await page.getByTestId('combat-summary').count()) break
        if (await tap(page, 'combat-mercy-spare')) continue
        await tap(page, 'combat-end-phase')
        await sleep(150)
    }
    await waitFor(page, 'combat-summary', 'bw-2 combat summary', 10000)
    const verdict = (await page.getByTestId('combat-summary').innerText()).split('\n')[0]
    log(`bw-2 fight: over (${verdict})`)
    if (/defeat/i.test(verdict)) {
        // The first death: the return moment, then the node walked from.
        await tap(page, 'combat-summary-close')
        await waitFor(page, 'death-return', 'the return moment after the bw-2 defeat')
        await tap(page, 'death-return-continue') || fail('the return moment has no CONTINUE')
        await settleOnMap(page, 'bw-2 return')
        await expectHere(page, 'bw-20')
        const label = await nodeLabel(page, 'bw-2')
        if (!label || !/open/.test(label)) fail(`bw-2 is not open after the defeat (label: "${label}")`)
        const vitae = (await page.locator('[data-testid^="statbar-value"]').first().innerText()).trim()
        if (!/^1\//.test(vitae)) fail(`expected 1 VITAE on the return, the status card reads "${vitae}"`)
        let dying = false
        for (let k = 0; k < 20 && !dying; k++) {
            dying = await page.evaluate(() => Object.keys(localStorage).some((key) => (localStorage.getItem(key) ?? '').includes('"dying":true')))
            if (!dying) await sleep(250)
        }
        if (!dying) fail('the save does not carry dying after the defeat')
        log('bw-2 fight: lost; back on bw-20 at 1 VITAE, dying, bw-2 open')
        return
    }
    await settleOnMap(page, 'bw-2')
    await expectHere(page, 'bw-2')
    log('bw-2 fight: won; back on the map')
}

async function hazard(page) {
    // The hazard pocket opened when step 1 was accepted at bw-19.
    await travelTo(page, 'bw-3')
    await waitFor(page, 'hazard-route-select', 'bw-3 hazard')
    log('bw-3 hazard: landed on the route select (the board is hazard-e2e.mjs\'s)')
    await page.waitForFunction(() => typeof globalThis.__AXM_SKIP_EVENT__ === 'function', null, { timeout: 15000 })
        .catch(() => fail('bw-3: the dev skip seam is not installed'))
    const r = await page.evaluate(() => {
        const out = globalThis.__AXM_SKIP_EVENT__()
        return out ? { kind: out.kind, nodeId: out.nodeId, outcome: out.outcome } : null
    })
    if (!r || r.kind !== 'hazard' || r.outcome === 'abandoned') fail(`bw-3: the skip did not cross the hazard (${JSON.stringify(r)})`)
    await settleOnMap(page, 'bw-3')
    await expectHere(page, 'bw-3')
    log(`bw-3 hazard: crossed by the skip seam (${r.outcome}), back on the map`)
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
    if (process.env.MAP_WALK_E2E_CHROME) launchOptions.executablePath = process.env.MAP_WALK_E2E_CHROME
    const browser = await chromium.launch(launchOptions)
    const pageErrors = []
    try {
        const context = await browser.newContext({ viewport: VIEWPORT, hasTouch: false })
        const page = await context.newPage()
        page.on('pageerror', (err) => {
            pageErrors.push(err.message)
            console.error('map-walk-e2e: pageerror', err.message)
        })
        await newGame(page, baseUrl)
        await lootCache(page)
        await waypoint(page)
        await questNode(page, 'bw-19', { turnIn: false })
        await hazard(page)
        await rest(page)
        await questNode(page, 'bw-20', { turnIn: true })
        await fight(page)
        if (pageErrors.length) fail(`${pageErrors.length} page error(s) during the walk`)
        await context.close()
        log('ALL PASS — new game, cache, waypoint, quest, hazard, rest, quest and fight, node to node')
    } finally {
        await browser.close()
        server.close()
    }
}

main().catch((err) => {
    console.error('map-walk-e2e: aborted —', err.message)
    process.exit(process.exitCode || 3)
})
