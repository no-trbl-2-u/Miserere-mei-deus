#!/usr/bin/env node
// scripts/feature-map-e2e.mjs
//
// THE REACHABILITY DRIVE (phase FM1d). The feature map
// (`docs/feature-map/features.json`) says which routes a player can reach
// from the title screen; this drive checks it in a browser, from a fresh save.
//
//   1. PLAY: a new game the way a player starts one (title, save slot, the
//      windmill arrival; a run starts with no relic), every tab (SETTINGS among them), the hazard
//      deck from the SELF sheet, then the start map's first road: onto the
//      windmill's one neighbour, a fight, to its reveal.
//   2. SEAMS: every reachable route play did not reach is provoked from the
//      dev tools (the same `/dev` buttons the encounter-routing journey
//      presses), one fresh context each. A route with no seam stays
//      unreached and fails the drive: that is a finding, never a faked visit.
//
// Every path the app navigates to is recorded (history API and frame
// navigations). The rule lives in `scripts/lib/feature-map-drive.mjs`:
// every non-dev route the map marks reachable must be reached, a reached path
// the map lacks fails, and so does a route marked unreachable that play
// reached. The report lists every flow edge crossed or uncrossed; uncrossed
// edges never fail.
//
// The drive never computes reachability. A map without FM1b's
// `reachable.value` on every route is refused before anything boots.
//
// Usage:
//   node scripts/feature-map-e2e.mjs
//   FEATURE_MAP_E2E_MAP=/path/features.json node scripts/...   # another map
//   FEATURE_MAP_E2E_REPORT=/path/report.json node scripts/...  # also write JSON
//   AXM_FORCE_EXPORT=1 node scripts/...       # re-export (else .smoke-dist is reused on a stamp hit)
//   FEATURE_MAP_E2E_CHROME=/path/to/chrome node scripts/...
//
// The markdown report goes to stdout and, on CI, to the step summary.
//
// Exit codes: 0 = every reachable route reached · 1 = rule or leg failed ·
// 2 = the map breaks the input contract · 3 = boot failure.

import { createServer } from 'node:http'
import { appendFileSync, writeFileSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDevSection } from './dev-section.mjs'
import { ensureWebExport } from './lib/web-export.mjs'
import {
    FeatureMapContractError,
    crossEdges,
    formatReport,
    judgeVisits,
    loadFeatureMap,
    requiredRoutes,
    routePathForId,
} from './lib/feature-map-drive.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MOBILE_ROOT = resolve(__dirname, '..')
const EXPORT_DIR = resolve(MOBILE_ROOT, '.smoke-dist')
const DEFAULT_MAP = resolve(MOBILE_ROOT, '..', 'docs', 'feature-map', 'features.json')
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
    console.log(`feature-map-e2e: ${msg}`)
}

class StepFailure extends Error {}

function fail(msg) {
    throw new StepFailure(msg)
}

// ---------------------------------------------------------------------------
// Export + static server (mirrors scripts/map-walk-e2e.mjs)
// ---------------------------------------------------------------------------

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
// Visit recording
// ---------------------------------------------------------------------------

/**
 * A fresh browser context whose every navigation is recorded into `session`.
 * The history API is patched in an init script (expo-router on web pushes
 * state rather than loading pages), and frame navigations back it up.
 */
async function recordedContext(browser, { devTools }) {
    const context = await browser.newContext({ viewport: VIEWPORT, hasTouch: false })
    const session = []
    const push = (pathname) => {
        if (session[session.length - 1] !== pathname) session.push(pathname)
    }
    await context.exposeBinding('__axmFeatureMapVisit', (_source, pathname) => push(String(pathname)))
    await context.addInitScript(({ forceDevTools }) => {
        // A static web export cannot surface `extra.devToolsEnabled` at
        // runtime; this is the documented opt-in (lib/buildProfile.ts).
        if (forceDevTools) globalThis.__AXM_FORCE_DEV_TOOLS__ = true
        const send = () => {
            if (!/^https?:$/.test(location.protocol)) return
            try { globalThis.__axmFeatureMapVisit?.(location.pathname) } catch { /* the binding is not up yet */ }
        }
        for (const key of ['pushState', 'replaceState']) {
            const original = history[key]
            history[key] = function patched(...args) {
                const r = original.apply(this, args)
                send()
                return r
            }
        }
        addEventListener('popstate', send)
        setTimeout(send, 0)
    }, { forceDevTools: devTools })
    const page = await context.newPage()
    page.on('framenavigated', (frame) => {
        if (frame !== page.mainFrame()) return
        const url = new URL(frame.url())
        if (url.protocol === 'http:' || url.protocol === 'https:') push(url.pathname)
    })
    page.on('pageerror', (err) => console.error('feature-map-e2e: pageerror', err.message))
    return { context, page, session }
}

// ---------------------------------------------------------------------------
// Helpers (the map walk's, see scripts/map-walk-e2e.mjs)
// ---------------------------------------------------------------------------

// The web tab bar can leave a hidden duplicate mounted during a lock
// transition, so filter to the visible one.
const tabSelector = (name) => `[aria-label="${name} tab"]:visible`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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

async function waitForPath(page, path, what, timeout = 10000) {
    await page
        .waitForURL((url) => url.pathname === path, { timeout })
        .catch(() => fail(`${what}: never reached ${path} (at ${new URL(page.url()).pathname})`))
}

async function onMap(page) {
    return (
        /\/exploration/.test(page.url())
        && (await page.locator(tabSelector('Character')).count()) > 0
        && !(await page.getByTestId('combat-reveal').count())
    )
}

async function nodeLabel(page, nodeId) {
    return page.evaluate((id) => document.querySelector(`[data-testid="node-${id}"]`)?.getAttribute('aria-label') ?? null, nodeId)
}

async function expectHere(page, nodeId) {
    const label = await nodeLabel(page, nodeId)
    if (!label || !/here/.test(label)) fail(`expected to stand on ${nodeId}, its label reads "${label}"`)
}

/**
 * Walk back onto a walked node a road away (phase WR1a: the player walks the
 * roads, and a dead end is left the way it was entered). The node reads
 * "a road back"; one tap moves the player with no confirm panel and no event.
 */
async function walkBack(page, nodeId) {
    const label = await nodeLabel(page, nodeId)
    if (!label || !/a road back/.test(label)) fail(`node-${nodeId} is not a road back (label: "${label}")`)
    await page.evaluate((id) => document.querySelector(`[data-testid="node-${id}"]`).click(), nodeId)
    for (let i = 0; i < 20; i++) {
        if (/here/.test((await nodeLabel(page, nodeId)) ?? '')) break
        await sleep(150)
    }
    await expectHere(page, nodeId)
    log(`walked back to ${nodeId}`)
}

async function playOutCutscene(page) {
    await tap(page, 'cutscene-skip')
    for (let k = 0; k < 12; k++) {
        if (!(await tap(page, 'cutscene-advance'))) break
        await sleep(250)
    }
}

async function settleOnMap(page, what) {
    for (let i = 0; i < 40; i++) {
        if (await onMap(page)) {
            await sleep(250)
            if (await onMap(page)) return
            continue
        }
        await sleep(400)
        if (await tap(page, 'combat-summary-close')) continue
        if (await page.getByTestId('cutscene-advance').count()) { await playOutCutscene(page); continue }
        if (await tap(page, 'death-return-continue')) continue
        if (await tap(page, 'item-reward-confirm')) continue
        if (await tap(page, 'rest-claim')) continue
    }
    fail(`${what}: never got back to the map (stuck at ${new URL(page.url()).pathname})`)
}

async function travelTo(page, nodeId) {
    const label = await nodeLabel(page, nodeId)
    if (!label) fail(`node-${nodeId} is not on the map`)
    if (!/open/.test(label)) fail(`node-${nodeId} is not open (label: "${label}")`)
    await page.evaluate((id) => document.querySelector(`[data-testid="node-${id}"]`).click(), nodeId)
    await waitFor(page, 'node-confirm-go', `${nodeId} confirm panel`, 5000)
    await page.evaluate(() => document.querySelector('[data-testid="node-confirm-go"]').click())
    log(`travelling to ${nodeId} (${label})`)
}

async function clickTab(page, name, path) {
    await page.locator(tabSelector(name)).first().click({ timeout: 10000 })
        .catch(() => fail(`the ${name} tab is not on screen (at ${new URL(page.url()).pathname})`))
    await waitForPath(page, path, `${name} tab`)
}

// ---------------------------------------------------------------------------
// Leg 1: play from a fresh save
// ---------------------------------------------------------------------------

async function newGame(page, baseUrl) {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
    await page.getByLabel('Embark on your journey').click({ timeout: 15000 })
    await tap(page, 'main-menu-new-game') || fail('the main menu has no NEW GAME')
    await waitFor(page, 'save-slot-1-action', 'the new-game slot picker')
    await page.getByTestId('save-slot-1-action').click()
    // CH1f: every new game opens the character select first; CONFIRM starts the run as the shown character.
    await waitFor(page, 'character-select-confirm', 'the character select')
    await page.getByTestId('character-select-confirm').click()
    await waitFor(page, 'cutscene-advance', 'the windmill arrival scene')
    await playOutCutscene(page)
    // A run starts with no relic and is handed none: the scene opens the map.
    await settleOnMap(page, 'new game')
    log('play: new game, on the map')
}

async function shell(page) {
    await clickTab(page, 'Character', '/character')
    await clickTab(page, 'Deck', '/deck')
    await clickTab(page, 'Inventory', '/inventory')
    await clickTab(page, 'Memoir', '/memoir')
    await clickTab(page, 'Character', '/character')
    log('play: every tab')

    await tap(page, 'self-hazard-deck-link') || fail('the SELF sheet has no hazard deck link')
    await waitForPath(page, '/hazard-deck', 'hazard deck')
    await waitFor(page, 'hazard-deck-back', 'the hazard deck screen')
    await tap(page, 'hazard-deck-back')
    await waitForPath(page, '/character', 'back from the hazard deck')
    log('play: the hazard deck and back')

    await clickTab(page, 'Settings', '/settings-tab')
    await waitFor(page, 'settings-screen', 'the settings screen')
    if (await page.getByTestId('settings-back').count()) fail('the SETTINGS tab shows a close control')
    await clickTab(page, 'Character', '/character')
    log('play: the settings tab and back')

    await clickTab(page, 'Exploration', '/exploration')
    await settleOnMap(page, 'back to the map')
}

async function walk(page) {
    // The Breakwater's windmill has one road, to the gallows crossroads
    // (bw-w2), a fight. This leg installs no dev skip, so it walks onto the
    // fight and stops at its reveal; the seam leg provokes the cache, hazard,
    // rest and quest routes the map holds past it.
    await travelTo(page, 'bw-w2')
    await waitFor(page, 'combat-reveal', 'bw-w2 encounter reveal')
    log('play: bw-w2 fight reveal')
}

async function playLeg(page, baseUrl) {
    await newGame(page, baseUrl)
    await shell(page)
    await walk(page)
}

// ---------------------------------------------------------------------------
// Leg 2: dev seams, one per route play did not reach
// ---------------------------------------------------------------------------

/** Clicks the first visible element whose test id starts with `prefix` (not equal to it). */
async function tapFirstPrefixed(page, prefix) {
    const el = page.locator(`[data-testid^="${prefix}"]:not([data-testid="${prefix.replace(/-$/, '')}"])`).first()
    await el.waitFor({ state: 'visible', timeout: 10000 }).catch(() => fail(`no \`${prefix}*\` control on /dev`))
    await el.click()
}

/**
 * Each seam: the `/dev` section and the control that opens the route (or a
 * state fixture that stages it), and the test id that proves the route's
 * screen mounted with content (its `-inactive` empty state does not count).
 */
const SEAMS = {
    'route:blacksmith': { section: 'rewards', leaf: 'debug-anvil-budget-button', landing: 'blacksmith-scroll' },
    'route:rest': { section: 'encounters', leaf: 'debug-trigger-encounter-rest', landing: 'rest-column' },
    'route:village': { section: 'encounters', leaf: 'debug-trigger-encounter-village', landing: 'village-column' },
    'route:cutscene': { section: 'encounters', leaf: 'debug-trigger-encounter-cutscene', landing: 'cutscene-advance' },
    'route:cache': { section: 'encounters', leaf: 'debug-trigger-encounter-treasure', landing: 'cache-choice-offers' },
    'route:hazard': { section: 'encounters', leaf: 'debug-trigger-encounter-hazard', landing: 'hazard-stakes' },
    'route:combat-encounter': {
        section: 'encounters',
        leaf: 'debug-trigger-encounter-encounter',
        after: async (page) => {
            await waitFor(page, 'combat-reveal', 'the encounter reveal')
            await page.getByTestId('ink-curtain').waitFor({ state: 'detached', timeout: 25000 }).catch(() => {})
            await tap(page, 'combat-enter') || fail('the reveal has no ENTER COMBAT')
        },
        landing: 'combat-arena-backdrop',
    },
    // The STORY section's NPC chips list no one (Act 1 stages no NPC), so
    // the dialogue route is provoked by the state fixture that stages one.
    'route:dialogue': { fixture: 'apprentice-staged-dialogue', landing: 'dialogue-nameplate' },
    // The quest screen is provoked by the state fixture that stages the first
    // quest node of the fixture questline (hermetic: no walk to the chain's quest nodes).
    'route:quest': { fixture: 'apprentice-staged-quest', landing: 'quest-column' },
    // The travel screen is provoked by the state fixture that arrives on the
    // far bank (bw-b2), whose offer opens "Move to The Charcoal Wood?".
    'route:travel': { fixture: 'wanderer-bw-door-arrive', landing: 'travel-question' },
    // No run hands out a relic yet (phase SG1 cut the first-node ring), so the
    // reward screen is provoked by the dev REWARDS row's RELIC REWARD.
    'route:item-reward': { section: 'rewards', leaf: 'debug-relic-reward-button', landing: 'item-reward-card' },
    'route:labyrinth': { section: 'world', leaf: 'debug-world-travel', press: (p) => tapFirstPrefixed(p, 'debug-aporia-'), landing: null },
    // The select screen opens from play only once the roster holds a character
    // (CH1f), so until then the `/dev` row that opens it (all locked) is the seam.
    // That row sits outside every section, so it has no section to open.
    // A revive arms this screen in memory and a lost fight is not a seam, so the
    // forced-dev-tools leg opens its preview (`?preview=1`) directly.
    'route:death-return': { url: '/death-return?preview=1', landing: 'death-return' },
    // The full-screen settings route is the title menu's SETTINGS (the SELF sheet no
    // longer links to it); the SETTINGS tab is the play leg's. Open it by its path.
    'route:settings': { url: '/settings', landing: 'settings-screen' },
    'route:character-select': { leaf: 'dev-open-character-select', landing: 'character-select-carousel' },
}

async function seamLeg(page, baseUrl, id) {
    const seam = SEAMS[id]
    const path = routePathForId(id)
    if (seam.url) {
        await page.goto(`${baseUrl}${seam.url}`, { waitUntil: 'networkidle' })
    } else if (seam.fixture) {
        // docs/state-fixtures.md: `?fixture=<id>` boots the fixture and its
        // `arrive` pushes the staged route.
        await page.goto(`${baseUrl}/exploration?fixture=${seam.fixture}`, { waitUntil: 'networkidle' })
    } else {
        await openSeamFromDevTools(page, baseUrl, seam)
    }
    await waitForPath(page, path, id, 20000)
    const name = id.replace(/^route:/, '')
    if (await page.getByTestId(`${name}-inactive`).isVisible().catch(() => false)) {
        fail(`${id}: reached ${path} but the screen shows its empty state`)
    }
    if (seam.landing) await waitFor(page, seam.landing, `${id} screen`)
    log(`seam: ${id} reached at ${path}${seam.fixture ? ` (fixture ${seam.fixture})` : ''}`)
}

async function openSeamFromDevTools(page, baseUrl, seam) {
    await page.goto(`${baseUrl}/character`, { waitUntil: 'networkidle' })
    await page.getByTestId('self-dev-tools-link').waitFor({ state: 'visible', timeout: 15000 })
        .catch(() => fail('the SELF sheet has no DEV TOOLS link'))
    await page.getByTestId('self-dev-tools-link').click()
    await waitForPath(page, '/dev', 'the dev tools')
    if (seam.section) await openDevSection(page, seam.section, seam.leaf)
    if (seam.press) await seam.press(page)
    else await page.getByTestId(seam.leaf).click()
    if (seam.after) await seam.after(page)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const mapPath = process.env.FEATURE_MAP_E2E_MAP ? resolve(process.env.FEATURE_MAP_E2E_MAP) : DEFAULT_MAP
    let map
    try {
        map = loadFeatureMap(mapPath)
    } catch (err) {
        if (err instanceof FeatureMapContractError) {
            console.error(`feature-map-e2e: FAIL — the feature map breaks the input contract: ${err.message}`)
            process.exit(2)
        }
        throw err
    }
    const required = requiredRoutes(map)
    log(`map ${mapPath}: ${required.length} reachable non-dev routes to reach`)

    const r = await ensureWebExport({ outDir: EXPORT_DIR, log })
    if (!r.ok) { console.error('feature-map-e2e: expo export failed'); process.exit(3) }
    const { server, baseUrl } = await startStaticServer(EXPORT_DIR)
    log(`static server at ${baseUrl}`)

    const { chromium } = await import('playwright')
    const launchOptions = { headless: true }
    if (process.env.FEATURE_MAP_E2E_CHROME) launchOptions.executablePath = process.env.FEATURE_MAP_E2E_CHROME
    const browser = await chromium.launch(launchOptions)

    const visits = []
    const sessions = []
    const legs = []
    const runLeg = async (name, via, devTools, body) => {
        const { context, page, session } = await recordedContext(browser, { devTools })
        const leg = { name, via, ok: true }
        try {
            await body(page)
        } catch (err) {
            leg.ok = false
            leg.error = err.message
            console.error(`feature-map-e2e: leg "${name}" failed — ${err.message}`)
        }
        await sleep(100)
        sessions.push([...session])
        for (const path of session) visits.push({ path, via })
        legs.push(leg)
        await context.close()
    }

    try {
        await runLeg('play: new game, tabs, the start map', 'play', false, (page) => playLeg(page, baseUrl))
        const playReached = new Set(judgeVisits(map, visits).reached)
        for (const id of required) {
            if (playReached.has(id)) continue
            if (!SEAMS[id]) {
                log(`no play path and no dev seam reaches ${id}`)
                continue
            }
            await runLeg(`seam: ${id}`, 'seam', true, (page) => seamLeg(page, baseUrl, id))
        }
    } finally {
        await browser.close()
        server.close()
    }

    const judgement = judgeVisits(map, visits)
    const edges = crossEdges(map, sessions)
    const report = formatReport({ judgement, edges, legs })
    console.log(report)
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report)
    if (process.env.FEATURE_MAP_E2E_REPORT) {
        writeFileSync(process.env.FEATURE_MAP_E2E_REPORT, `${JSON.stringify({ judgement, edges, legs, sessions }, null, 2)}\n`)
    }
    const ok = judgement.ok && legs.every((l) => l.ok)
    log(`${ok ? 'PASS' : 'FAIL'}: ${judgement.reached.length} routes reached, ${edges.crossed.length} flow edges crossed, ${edges.uncrossed.length} uncrossed`)
    process.exit(ok ? 0 : 1)
}

main().catch((err) => {
    console.error('feature-map-e2e: aborted —', err.stack || err.message)
    process.exit(3)
})
