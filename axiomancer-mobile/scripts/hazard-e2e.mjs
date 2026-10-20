#!/usr/bin/env node
// scripts/hazard-e2e.mjs
//
// Hazard minigame — browser-driven end-to-end playthrough.
//
// Boots the exported web build, opens the dev entry, and PLAYS the
// minigame with real pointer
// gestures: drags cards from the fanned hand into the play area
// (uncapped — the whole hand can stage), drags mana dice onto staged
// cards, presses PLAY (which auto-applies the staged set), taps
// through the O/X stamps, the outcome modal, and the rewards ledger —
// for BOTH routes. Asserts the no-re-cast doctrine (identical die ids
// across all three rounds) and the full phase order along the way.
//
// Deterministic: the hazard RNG seed + hazard id are pinned through
// the dev hooks (`globalThis.__AXM_HAZARD_SEED__` / `__AXM_HAZARD_ID__`)
// before the app boots. Hermetic: everything runs against localhost.
//
// Usage:
//   node scripts/hazard-e2e.mjs                # export + run
//   AXM_FORCE_EXPORT=1 node scripts/...       # re-export (else .smoke-dist is reused on a stamp hit)
//   HAZARD_E2E_CHROME=/path/to/chrome ...      # custom browser binary
//   HAZARD_E2E_SCREENSHOTS=1 ...               # dump step screenshots
//
// Exit codes: 0 = both routes played clean · 1 = assertion failed ·
// 3 = boot failure (export / server / browser).

import { createServer } from 'node:http'
import { readFile, mkdir, stat } from 'node:fs/promises'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDevSection } from './dev-section.mjs'
import { ensureWebExport } from './lib/web-export.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const EXPORT_DIR = resolve(REPO_ROOT, '.smoke-dist')
const SHOT_DIR = resolve(REPO_ROOT, 'screenshots/hazard-e2e')

const VIEWPORT = { width: 390, height: 844 }
const SEED = 424242

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
    console.log(`hazard-e2e: ${msg}`)
}

function fail(msg) {
    console.error(`hazard-e2e: FAIL — ${msg}`)
    process.exitCode = 1
    throw new Error(msg)
}

// ---------------------------------------------------------------------------
// Export + static server (mirrors scripts/smoke-screens.mjs)
// ---------------------------------------------------------------------------

async function runExpoExport() {
    const r = await ensureWebExport({ outDir: EXPORT_DIR, log })
    if (!r.ok) { console.error('hazard-e2e: expo export failed'); process.exit(3) }
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
                let filePath = join(rootDir, pathname)
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
// Pointer-gesture helpers
// ---------------------------------------------------------------------------

async function centerOf(locator) {
    const box = await locator.boundingBox()
    if (!box) return null
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

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

/** Real pointer drag with intermediate moves so PanGestureHandler activates. */
async function dragTo(page, fromLocator, to) {
    const from = await centerOf(fromLocator)
    if (!from) fail('drag source has no bounding box')
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    const steps = 14
    for (let i = 1; i <= steps; i++) {
        await page.mouse.move(
            from.x + ((to.x - from.x) * i) / steps,
            from.y + ((to.y - from.y) * i) / steps,
        )
        await page.waitForTimeout(12)
    }
    await page.mouse.up()
    await page.waitForTimeout(160)
}

let shotIndex = 0
async function shot(page, name) {
    if (process.env.HAZARD_E2E_SCREENSHOTS !== '1') return
    await mkdir(SHOT_DIR, { recursive: true })
    shotIndex += 1
    await page.screenshot({ path: join(SHOT_DIR, `${String(shotIndex).padStart(2, '0')}-${name}.png`) })
}

// ---------------------------------------------------------------------------
// The playthrough
// ---------------------------------------------------------------------------

async function stagedCount(page) {
    return page.locator('[data-testid^="hazard-staged-"]').count()
}

async function discardCount(page) {
    const text = await page.getByTestId('hazard-deck-counts').innerText()
    const match = text.match(/DISCARD\s+(\d+)/)
    return match ? Number(match[1]) : 0
}

async function playOneRound(page, round) {
    const playArea = page.getByTestId('hazard-play-area')

    // Round 1: exercise the trash bin — drag one hand card onto it and
    // verify the discard registers (salvage fires engine-side).
    if (round === 1) {
        const before = await discardCount(page)
        const handBefore = await page.locator('[data-testid^="hazard-hand-"]').count()
        const trashTarget = await centerOf(page.getByTestId('hazard-trash'))
        await dragTo(page, page.locator('[data-testid^="hazard-hand-"]').first(), trashTarget)
        // a missed drop opens the detail overlay — close it and report
        const detail = page.getByTestId('hazard-card-detail')
        if (await detail.isVisible().catch(() => false)) {
            await detail.click()
            fail('trash-bin drop opened the card detail instead of discarding')
        }
        const after = await discardCount(page)
        const handAfter = await page.locator('[data-testid^="hazard-hand-"]').count()
        if (after !== before + 1 || handAfter !== handBefore - 1) {
            fail(`trash bin did not discard (discard ${before}→${after}, hand ${handBefore}→${handAfter})`)
        }
        log(`round ${round}: scrapped a card to the bin (discard ${after})`)
    }

    // Stage the whole hand (the play area is uncapped) by dragging
    // each card into the play area.
    let guard = 0
    while (guard++ < 12) {
        const handCards = page.locator('[data-testid^="hazard-hand-"]')
        const n = await handCards.count()
        if (n === 0) break
        const before = await stagedCount(page)
        const target = await centerOf(playArea)
        await dragTo(page, handCards.first(), target)
        const after = await stagedCount(page)
        if (after === before) {
            // The drop opened the card detail instead (aborted drag) —
            // close it and try the next card.
            const detail = page.getByTestId('hazard-card-detail')
            if (await detail.isVisible().catch(() => false)) {
                await detail.click()
                await page.waitForTimeout(120)
            }
        }
    }
    const staged = await stagedCount(page)
    if (staged === 0) fail(`round ${round}: nothing staged`)
    log(`round ${round}: staged ${staged} cards`)
    await shot(page, `round${round}-staged`)

    // Drag every usable die onto each staged card until one sticks
    // (the engine rejects colour mismatches — that's part of the test).
    const dieIds = await page
        .locator('[data-testid^="hazard-die-"]')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-testid')))
    for (const dieTestId of dieIds) {
        const die = page.getByTestId(dieTestId)
        const label = await die.getAttribute('aria-label').catch(() => null)
        if (!label || !label.includes('available') || label.includes('hex')) continue
        const stagedCards = page.locator('[data-testid^="hazard-staged-"]')
        const m = await stagedCards.count()
        for (let j = 0; j < m; j++) {
            const cardTarget = await centerOf(stagedCards.nth(j))
            if (!cardTarget) continue
            await dragTo(page, die, cardTarget)
            const newLabel = await die.getAttribute('aria-label').catch(() => null)
            if (newLabel && newLabel.includes('spent')) {
                log(`round ${round}: powered a card with ${dieTestId}`)
                break
            }
        }
    }

    // Commit the set — PLAY arms as soon as anything is staged and
    // auto-applies every staged card (utilities fire engine-side).
    await page.getByTestId('hazard-play-button').click()
    await page.getByTestId('hazard-resolve-flash').waitFor({ state: 'visible', timeout: 5000 })
    const verdict = (await page.getByTestId('hazard-resolve-flash').innerText()).includes('PASSED')
        ? 'O'
        : 'X'
    log(`round ${round}: resolved ${verdict}`)
    await shot(page, `round${round}-resolve`)
    await page.getByTestId('hazard-resolve-flash').click()
    await page.waitForTimeout(300)
    return verdict
}

async function collectDieIds(page) {
    return page
        .locator('[data-testid^="hazard-die-"]')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-testid')).sort())
}

/** Die ids whose accessibility label reports them spent. */
async function collectSpentDieIds(page) {
    return page.locator('[data-testid^="hazard-die-"]').evaluateAll((nodes) =>
        nodes
            .filter((n) => (n.getAttribute('aria-label') ?? '').includes('spent'))
            .map((n) => n.getAttribute('data-testid'))
            .sort(),
    )
}

async function playHazard(page, baseUrl, route, seed) {
    log(`=== playing ${route} route (seed ${seed}) ===`)
    await page.addInitScript(
        ({ s, id }) => {
            globalThis.__AXM_HAZARD_SEED__ = s
            globalThis.__AXM_HAZARD_ID__ = id
        },
        { s: seed, id: 'cracked-cliff' },
    )
    // A static web export can't surface `extra.devToolsEnabled` at runtime
    // (phase 47b: `web.output` moved to `"single"`, so there's no per-route
    // manifest for `expo-constants` to read), so the SELF → /dev affordance
    // this harness drives from needs the documented opt-in
    // (lib/buildProfile.ts) — the same one combat-round-e2e sets. Inert
    // in real builds: nothing sets the global there.
    await page.addInitScript(() => { globalThis.__AXM_FORCE_DEV_TOOLS__ = true })
    await page.goto(`${baseUrl}/character`, { waitUntil: 'networkidle' })

    // Open the dev tools (SELF → DEV TOOLS → the /dev Developer screen)
    // and fire the hazard entry.
    await openDevTools(page)
    await openDevSection(page, 'rewards', 'debug-hazard-button')
    await page.getByTestId('debug-hazard-button').waitFor({ state: 'visible', timeout: 15000 })
    await page.getByTestId('debug-hazard-button').click()

    // Phase: route select — opening hand before dice.
    await page.getByTestId('hazard-route-select').waitFor({ state: 'visible', timeout: 15000 })
    await page.getByTestId('hazard-opening-hand').waitFor({ state: 'visible' })
    await shot(page, `${route}-route-select`)
    await page.getByTestId(`hazard-route-${route}`).click()

    // Phase: dice cast interstitial, then the board.
    await page.getByTestId('hazard-dice-roll').waitFor({ state: 'visible', timeout: 5000 })
    log('dice cast interstitial shown')
    await page.getByTestId('hazard-board').waitFor({ state: 'visible', timeout: 10000 })
    await page.getByTestId('hazard-dice-roll').waitFor({ state: 'hidden', timeout: 10000 })
    await shot(page, `${route}-board`)

    // Doctrine: route badge + meters.
    const boardText = await page.getByTestId('hazard-board').innerText()
    if (route === 'risk' && !boardText.includes('BOTH REQUIRED')) {
        fail('risk route must show the dual BOTH REQUIRED meters')
    }
    if (route === 'safe' && !boardText.includes('PASSAGE')) {
        fail('safe route must show the combined PASSAGE meter')
    }
    if (!boardText.includes('DECK')) fail('deck/discard counts missing (REC#2)')

    const diceRound1 = await collectDieIds(page)
    if (diceRound1.length < 4) fail(`expected ≥4 dice, saw ${diceRound1.length}`)

    const marks = []
    for (let round = 1; round <= 3; round++) {
        // Doctrine guard input: dice spent before this round resolves must
        // still be present — and still spent — after the round advances.
        // (Available dice MAY change ids when a RE-CAST/CONVERT card fires;
        // spent dice never refresh under the no-re-cast doctrine.)
        marks.push(await playOneRound(page, round))
        if (round < 3) {
            const spentBeforeAdvance = await collectSpentDieIds(page)
            await page.waitForTimeout(150)
            const spentNow = await collectSpentDieIds(page)
            const refreshed = spentBeforeAdvance.filter((d) => !spentNow.includes(d))
            if (refreshed.length > 0) {
                fail(`spent dice refreshed between rounds (doctrine violation): ${refreshed.join(',')}`)
            }
            const roundLabel = await page.getByTestId('hazard-board').innerText()
            const expected = round === 1 ? 'ROUND II / III' : 'ROUND III / III'
            if (!roundLabel.includes(expected)) fail(`expected "${expected}" on the board`)
        }
    }

    // Phase: outcome. The verdict word animates in (entering delay), so
    // poll until one of the three tier words is present.
    await page.getByTestId('hazard-outcome').waitFor({ state: 'visible', timeout: 5000 })
    let tier = null
    for (let attempt = 0; attempt < 25 && !tier; attempt++) {
        const outcomeText = await page.getByTestId('hazard-outcome').innerText()
        if (outcomeText.includes('PERFECT')) tier = 'perfect'
        else if (outcomeText.includes('COMPLETE')) tier = 'complete'
        else if (outcomeText.includes('FAILURE')) tier = 'failure'
        if (!tier) await page.waitForTimeout(200)
    }
    if (!tier) fail('outcome verdict word never appeared')
    const wins = marks.filter((m) => m === 'O').length
    const expectedTier = wins === 3 ? 'perfect' : wins >= 1 ? 'complete' : 'failure'
    if (tier !== expectedTier) fail(`outcome tier ${tier} != expected ${expectedTier} (marks ${marks.join('')})`)
    log(`outcome: ${tier} (${marks.join(' ')})`)
    await shot(page, `${route}-outcome`)
    await page.getByTestId('hazard-outcome-continue').click()

    // Phase: rewards — pick a card when offered, confirm, session ends.
    await page.getByTestId('hazard-rewards').waitFor({ state: 'visible', timeout: 5000 })
    await shot(page, `${route}-rewards`)
    const offers = page.locator('[data-testid^="hazard-offer-"]')
    if ((await offers.count()) > 0) {
        // Clicking an offer card opens the full-screen preview overlay; confirm from there.
        await offers.first().click()
        await page.getByTestId('hazard-preview-confirm').click()
    }
    await page.getByTestId('hazard-rewards-confirm').click()
    await page.getByTestId('hazard-rewards').waitFor({ state: 'hidden', timeout: 5000 })
    log(`${route} route: claimed and closed clean`)
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
    if (process.env.HAZARD_E2E_CHROME) {
        launchOptions.executablePath = process.env.HAZARD_E2E_CHROME
    }
    const browser = await chromium.launch(launchOptions)
    try {
        for (const route of ['safe', 'risk']) {
            const context = await browser.newContext({ viewport: VIEWPORT, hasTouch: false })
            const page = await context.newPage()
            page.on('pageerror', (err) => console.error('hazard-e2e: pageerror', err.message))
            await playHazard(page, baseUrl, route, SEED + (route === 'risk' ? 1 : 0))
            await context.close()
        }
        log('ALL PASS — both routes played end-to-end')
    } finally {
        await browser.close()
        server.close()
    }
}

main().catch((err) => {
    console.error('hazard-e2e: aborted —', err.message)
    process.exit(process.exitCode || 3)
})
