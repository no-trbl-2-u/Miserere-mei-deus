#!/usr/bin/env node
// scripts/act1-walk-e2e.mjs
//
// ACT 1 WALK: a browser journey from a brand-new game across all four Act 1
// doors to the Lantern Deep's sealed stair (Phase AW1a,
// plan/README.md).
//
// `e2e:map-walk` checks one map; this walks the whole act. The route is never
// hand-listed: the walk asks the engine for it (`npm run act1-walk -- --json`
// in axiomancer-mechanics, `planAct1Walk`), which reads each region's start,
// door and exit off the map graph and picks the shortest frontier path that
// meets every event kind the region carries before its door fight.
//
// A same-map passage (the Breakwater's sea cave, NK1d) is a travel node whose
// YES lands on its far end: the plan marks that far end `passage`. A back
// step onto a node that acts again (a village, a travel node, a quest node
// with business) opens the confirm panel, so it goes through the confirm and
// leaves the node's screen (or takes the passage when the next step is it).
//
// Each node is resolved through its own screen by test id, the way a player
// does: a cache by taking an offer, a
// cutscene by advancing it, a rest by REST on `/rest`, a village by opening its Anvil, leaving
// `/blacksmith` unchanged and taking the road, a door by its crossing. Fights (the four door fights
// included) and hazard boards are resolved with the dev seam
// `globalThis.__AXM_SKIP_EVENT__`, and only after the walk has seen the
// encounter reveal or the hazard route select mount. Playing a round is
// `combat-round-e2e.mjs`'s job and playing a board is `hazard-e2e.mjs`'s; this
// pins routing, resolution and the crossings.
//
// The run fails, naming the kind, if any kind the Act 1 pools carry is never
// met, and ends with a per-kind count of nodes resolved by screen and by skip.
//
// Usage:
//   npm run e2e:act1-walk
//   ACT1_WALK_SUMMARY=/tmp/walk.json npm run e2e:act1-walk   # also write the summary as JSON
//   AXM_FORCE_EXPORT=1 npm run e2e:act1-walk                 # re-export (else .smoke-dist is reused on a stamp hit)
//   ACT1_WALK_E2E_CHROME=/path/to/chrome npm run e2e:act1-walk
//
// Exit codes: 0 = walk clean · 1 = assertion failed ·
// 3 = boot failure (plan / export / server / browser).

import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureWebExport } from './lib/web-export.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const MECHANICS_ROOT = resolve(REPO_ROOT, '..', 'axiomancer-mechanics')
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
    console.log(`act1-walk-e2e: ${msg}`)
}

function fail(msg) {
    console.error(`act1-walk-e2e: FAIL — ${msg}`)
    process.exitCode = 1
    throw new Error(msg)
}

// ---------------------------------------------------------------------------
// Export + static server (copied from scripts/map-walk-e2e.mjs)
// ---------------------------------------------------------------------------

async function runExpoExport() {
    const r = await ensureWebExport({ outDir: EXPORT_DIR, log })
    if (!r.ok) { console.error('act1-walk-e2e: expo export failed'); process.exit(3) }
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
// The plan (the engine's, never hand-listed)
// ---------------------------------------------------------------------------

function loadPlan() {
    try {
        const out = execFileSync('npx', ['ts-node', '--transpile-only', 'src/CLI/act1-walk.cli.ts', '--json'], {
            cwd: MECHANICS_ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'inherit'],
            // `npx` is a .cmd shim on Windows, which execFile cannot start without a shell.
            shell: process.platform === 'win32',
        })
        return JSON.parse(out)
    } catch (err) {
        console.error(`act1-walk-e2e: could not read the walk plan from the engine: ${err.message}`)
        process.exit(3)
    }
}

// ---------------------------------------------------------------------------
// Helpers (the map ones follow scripts/map-walk-e2e.mjs)
// ---------------------------------------------------------------------------

const CHARACTER_TAB = '[aria-label="Character tab"]:visible'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const pathname = (page) => new URL(page.url()).pathname

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
        .catch(() => fail(`${what}: \`${testId}\` never appeared (at ${pathname(page)})`))
}

async function expectPath(page, route, what) {
    await page.waitForURL((url) => url.pathname === route, { timeout: 10000 })
        .catch(() => fail(`${what}: expected ${route}, landed on ${pathname(page)}`))
}

async function onMap(page) {
    return (
        /\/exploration/.test(page.url())
        && (await page.locator(CHARACTER_TAB).count()) > 0
        && !(await page.getByTestId('combat-reveal').count())
    )
}

async function nodeLabel(page, nodeId) {
    return page.evaluate((id) => document.querySelector(`[data-testid="node-${id}"]`)?.getAttribute('aria-label') ?? null, nodeId)
}

async function playOutCutscene(page) {
    await tap(page, 'cutscene-skip')
    for (let k = 0; k < 12; k++) {
        if (!(await tap(page, 'cutscene-advance'))) break
        await sleep(250)
    }
}

/** A defeat anywhere is a failed walk: the skip seam never loses, and nothing else fights. */
async function assertNoDefeat(page, what) {
    const summary = page.getByTestId('combat-summary')
    if (await summary.count()) {
        const verdict = (await summary.first().innerText()).split('\n')[0]
        if (/defeat/i.test(verdict)) fail(`${what}: a defeat (${verdict})`)
    }
}

/** Settle back on the map, playing only the screens a node chains into. See map-walk-e2e.mjs. */
async function settleOnMap(page, what) {
    for (let i = 0; i < 40; i++) {
        await assertNoDefeat(page, what)
        if (await onMap(page)) {
            await sleep(250)
            if (await onMap(page)) return
            continue
        }
        await sleep(400)
        if (await tap(page, 'combat-summary-close')) continue
        if (await page.getByTestId('cutscene-advance').count()) { await playOutCutscene(page); continue }
        if (await tap(page, 'item-reward-confirm')) continue
        if (await tap(page, 'rest-claim')) continue
    }
    fail(`${what}: never got back to the map (stuck at ${pathname(page)})`)
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

async function expectHere(page, nodeId) {
    const label = await nodeLabel(page, nodeId)
    if (!label || !/here/.test(label)) fail(`expected to stand on ${nodeId}, its label reads "${label}"`)
}

/**
 * Walk back onto a walked node a road away (phase WR1a: the player walks the
 * roads, and a dead end is left the way it was entered). A plain walked node
 * reads "a road back"; one tap moves the player with no confirm panel and no
 * event. A node that acts again on entry (WR1b: a village, a travel node, a
 * quest node with business) opens the confirm panel instead: GO, then its
 * screen is left (`leave`), or a travel node's passage is taken when
 * `takePassage` is set (the player then stands on the far end).
 */
async function walkBack(page, nodeId, { takePassage = false } = {}) {
    const label = await nodeLabel(page, nodeId)
    if (!label) fail(`node-${nodeId} is not on the map`)
    await page.evaluate((id) => document.querySelector(`[data-testid="node-${id}"]`).click(), nodeId)
    let confirmed = false
    for (let i = 0; i < 20; i++) {
        if (/here/.test((await nodeLabel(page, nodeId)) ?? '')) break
        if (await page.getByTestId('node-confirm-go').count()) {
            await page.evaluate(() => document.querySelector('[data-testid="node-confirm-go"]').click())
            confirmed = true
            break
        }
        await sleep(150)
    }
    if (confirmed) {
        if (await waitForAny(page, ['travel-yes', 'travel-no'], 4000)) {
            await tap(page, takePassage ? 'travel-yes' : 'travel-no')
            await settleOnMap(page, `${nodeId} travel`)
            log(`walked back onto ${nodeId}${takePassage ? ' and took its passage' : ', the trip declined'}`)
            return
        }
        for (const leave of ['village-leave', 'quest-leave-button']) {
            if (await tap(page, leave)) break
        }
        await settleOnMap(page, `${nodeId} back`)
    }
    if (takePassage) fail(`${nodeId}: walking back did not offer its passage`)
    await expectHere(page, nodeId)
    log(`walked back to ${nodeId}${confirmed ? ' (it acted again; left)' : ''}`)
}

/** Confirm every queued item reward (`/item-reward`) until the screen it covered is back. */
async function takeItemRewards(page, what, until = 'quest-paid') {
    const visible = (id) => page.getByTestId(id).first().isVisible().catch(() => false)
    for (let i = 0; i < 60; i++) {
        if (await visible('item-reward-confirm')) {
            await tap(page, 'item-reward-confirm')
            log(`${what}: took an item reward`)
            await sleep(400)
            continue
        }
        if (/\/quest/.test(new URL(page.url()).pathname) && await visible(until)) return
        await sleep(250)
    }
    fail(`${what}: the item rewards never ended`)
}

/** Wait until one of `testIds` is on screen; returns the first seen, or null. */
async function waitForAny(page, testIds, timeout) {
    const until = Date.now() + timeout
    while (Date.now() < until) {
        for (const id of testIds) if (await page.getByTestId(id).count()) return id
        await sleep(150)
    }
    return null
}

/** The player's VITAE off the status card, as `[health, max]`; null when it is not on screen. */
async function vitae(page) {
    const text = await page.locator('[data-testid^="statbar-value"]').first().innerText().catch(() => null)
    const m = text?.trim().match(/^(\d+)\/(\d+)/)
    return m ? [Number(m[1]), Number(m[2])] : null
}

const POTIONS = ['greater-healing-potion', 'healing-potion', 'minor-healing-potion']

/**
 * Drink the satchel's healing potions before a fight or a hazard when VITAE
 * is under half, as a player would. The skip seam's fights bleed (a witness
 * toll), and the Breakwater's questline puts five fights before the door
 * (QL1d), so a walk that never drinks reaches the Charcoal Wood's first
 * hazard at 1 VITAE and dies on its arrival damage. Back on the map after.
 */
async function mendIfLow(page, what) {
    const before = await vitae(page)
    if (!before || before[0] * 2 >= before[1]) return
    await page.locator('[aria-label="Inventory tab"]:visible').first().click({ timeout: 5000 })
        .catch(() => fail(`${what}: no satchel tab to mend from`))
    let drunk = 0
    for (const id of POTIONS) {
        for (let k = 0; k < 5; k++) {
            if (!(await page.getByTestId(`item-${id}`).count())) break
            if (!(await tap(page, `use-${id}`))) {
                await tap(page, `item-${id}`)
                await sleep(200)
                if (!(await tap(page, `use-${id}`))) break
            }
            // USE opens the item modal; its confirm drinks the potion.
            await waitFor(page, 'modal-confirm', `${what}: the ${id} modal`, 5000)
            await tap(page, 'modal-confirm')
            drunk += 1
            await sleep(250)
        }
    }
    await page.locator('[aria-label="Exploration tab"]:visible').first().click({ timeout: 5000 })
        .catch(() => fail(`${what}: no map tab to come back to`))
    await settleOnMap(page, `${what} mend`)
    log(`${what}: VITAE ${before[0]}/${before[1]}, drank ${drunk} potion(s), now ${(await vitae(page))?.join('/') ?? '?'}`)
}

/** Fire the dev skip seam once its bridge has mounted; returns its `{ kind, nodeId, outcome }`. */
async function skipEvent(page, what) {
    await page.waitForFunction(() => typeof globalThis.__AXM_SKIP_EVENT__ === 'function', null, { timeout: 10000 })
        .catch(() => fail(`${what}: the dev skip seam is not installed`))
    const result = await page.evaluate(() => {
        const r = globalThis.__AXM_SKIP_EVENT__()
        return { kind: r.kind, nodeId: r.nodeId, outcome: r.outcome }
    })
    log(`${what}: skipped (${result.kind} ${result.outcome})`)
    return result
}

// ---------------------------------------------------------------------------
// One node per kind: how a player resolves it
// ---------------------------------------------------------------------------

/** Each returns 'screen' or 'skip', how the node was resolved. */
const RESOLVERS = {
    async 'loot-cache'(page, nodeId) {
        await expectPath(page, '/cache', nodeId)
        await waitFor(page, 'cache-choice-offers', `${nodeId} loot cache`)
        await page.getByTestId('cache-choice-offer-card').first().click({ force: true })
        await page.getByRole('button', { name: /move on/i }).first().click({ timeout: 10000 })
            .catch(() => fail(`${nodeId}: the cache outcome has no "Move on"`))
        return 'screen'
    },
    // An empty waypoint opens no screen: the walk onto it is the whole visit,
    // and the caller's settle-on-map check proves the player stayed there.
    async none() {
        return 'screen'
    },
    async rest(page, nodeId) {
        await expectPath(page, '/rest', nodeId)
        await waitFor(page, 'rest-choice-offer-rest', `${nodeId} rest`)
        await page.getByTestId('rest-choice-offer-rest').first().click({ force: true })
        await waitFor(page, 'rest-claim', `${nodeId} rest outcome`)
        await tap(page, 'rest-claim')
        return 'screen'
    },
    // A village: the hub opens, the Anvil counter opens /blacksmith, leaving
    // the anvil unchanged lands back on the hub, and TAKE THE ROAD ends the visit.
    async village(page, nodeId) {
        await expectPath(page, '/village', nodeId)
        await waitFor(page, 'village-anvil', `${nodeId} village anvil counter`)
        await tap(page, 'village-anvil')
        await expectPath(page, '/blacksmith', nodeId)
        await waitFor(page, 'blacksmith-begin', `${nodeId} anvil`)
        await tap(page, 'blacksmith-begin')
        await waitFor(page, 'blacksmith-leave', `${nodeId} anvil forging`)
        await tap(page, 'blacksmith-leave')
        await waitFor(page, 'blacksmith-claim', `${nodeId} anvil outcome`)
        await tap(page, 'blacksmith-claim')
        await expectPath(page, '/village', nodeId)
        await waitFor(page, 'village-leave', `${nodeId} village exit`)
        await tap(page, 'village-leave')
        return 'screen'
    },
    async cutscene(page, nodeId) {
        await expectPath(page, '/cutscene', nodeId)
        await waitFor(page, 'cutscene-advance', `${nodeId} cutscene`)
        await playOutCutscene(page)
        return 'screen'
    },
    async encounter(page, nodeId) {
        await waitFor(page, 'combat-reveal', `${nodeId} encounter reveal`)
        const r = await skipEvent(page, nodeId)
        if (r.kind !== 'encounter' || r.outcome !== 'victory') fail(`${nodeId}: the skip did not win the fight (${r.kind} ${r.outcome})`)
        return 'skip'
    },
    // A questline's quest node, played as a player does: TURN IN the step
    // before when it is ready (a card pick it pays is skipped on the spoils
    // tiles), then ACCEPT the step the node offers, then LEAVE. The plan
    // visits the nodes in step order, so every one has a step to accept.
    // A step paid on arrival shows its ledger with the next offer; the last
    // quest node (the river bridge) turns in and offers nothing more.
    async quest(page, nodeId) {
        // A step paid on arrival (the lighthouse) hands its items over first.
        await takeItemRewards(page, nodeId, 'quest-column')
        await expectPath(page, '/quest', nodeId)
        await waitFor(page, 'quest-column', `${nodeId} quest screen`)
        let turnedIn = false
        if (await tap(page, 'quest-turn-in-button')) {
            turnedIn = true
            // Every chain step pays a relic: it is taken on /item-reward first.
            await takeItemRewards(page, nodeId)
            await waitFor(page, 'quest-paid', `${nodeId} turn-in payout`)
            if (await page.getByTestId('combat-rewards').count()) {
                await tap(page, 'combat-reward-skip') || fail(`${nodeId}: the quest card pick has no SKIP`)
            }
        }
        if (await waitForAny(page, ['quest-accept-button'], 4000)) {
            await tap(page, 'quest-accept-button')
            await waitFor(page, 'quest-accepted-line', `${nodeId} accepted`)
        } else if (!turnedIn) {
            fail(`${nodeId}: the quest node offered nothing and took nothing`)
        }
        await tap(page, 'quest-leave-button') || fail(`${nodeId}: the quest screen has no LEAVE`)
        return 'screen'
    },
    // A travel node on the path: YES takes its passage when the plan's next
    // step is the far end, else NO leaves the player on it.
    async travel(page, nodeId, { next } = {}) {
        await waitFor(page, 'travel-no', `${nodeId} travel screen`)
        await expectPath(page, '/travel', nodeId)
        const go = next?.role === 'passage'
        await tap(page, go ? 'travel-yes' : 'travel-no') || fail(`${nodeId}: the travel screen has no ${go ? 'YES' : 'NO'}`)
        return 'screen'
    },
    async hazard(page, nodeId) {
        await expectPath(page, '/hazard', nodeId)
        // The stakes card comes first (ET1b); Face it leads on to the route select.
        await waitFor(page, 'hazard-stakes', `${nodeId} hazard stakes card`)
        await tap(page, 'hazard-stakes-face') || fail(`${nodeId}: the stakes card has no Face it`)
        await waitFor(page, 'hazard-route-select', `${nodeId} hazard`)
        const r = await skipEvent(page, nodeId)
        if (r.kind !== 'hazard' || r.outcome === 'abandoned') fail(`${nodeId}: the skip did not cross the hazard (${r.kind} ${r.outcome})`)
        return 'skip'
    },
}

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

async function newGame(page, baseUrl, plan) {
    // A static web export can't surface `extra.devToolsEnabled` at runtime; this
    // is the documented opt-in (lib/buildProfile.ts) that installs the skip seam.
    // The walk pins routing, not attrition: skipped fights take no HP toll, or
    // the Breakwater's run of fights before the wreck bleeds the walk to death
    // on the hazard's arrival damage (the new map pays no potions).
    await page.addInitScript(() => {
        globalThis.__AXM_FORCE_DEV_TOOLS__ = true
        globalThis.__AXM_SKIP_TOLL_FREE__ = true
    })
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
    await page.getByLabel('Embark on your journey').click({ timeout: 15000 })
    await tap(page, 'main-menu-new-game') || fail('the main menu has no NEW GAME')
    await waitFor(page, 'save-slot-1-action', 'the new-game slot picker')
    await page.getByTestId('save-slot-1-action').click()
    // CH1f: every new game opens the character select first; CONFIRM starts the run as the shown character.
    await waitFor(page, 'character-select-confirm', 'the character select')
    await page.getByTestId('character-select-confirm').click()

    const first = plan.regions[0]
    await waitFor(page, 'cutscene-advance', `${first.start} arrival scene`)
    await playOutCutscene(page)
    // A run starts with no relic and is handed none: the scene opens the map.
    await settleOnMap(page, 'new game')
    await expectHere(page, first.start)
    log(`new game: on ${first.map}, at ${first.start}`)
}

/**
 * Cross a region's exit: a travel door asks "Move to X?" (phase NK1d); YES
 * lands on the next region's arrival scene.
 */
async function crossExit(page, region, next) {
    await travelTo(page, region.exit)
    if (next) {
        await waitFor(page, 'travel-yes', `${region.exit} travel screen`)
        await expectPath(page, '/travel', `${region.exit} travel screen`)
        await page.evaluate(() => document.querySelector('[data-testid="travel-yes"]').click())
        await waitFor(page, 'cutscene-advance', `${region.exit} crossing to ${next.map}`)
        await expectPath(page, '/cutscene', `${next.map} arrival`)
        await playOutCutscene(page)
        await settleOnMap(page, `${next.map} arrival`)
        await expectHere(page, next.start)
        log(`${region.exit}: crossed to ${next.map}, arrival scene played, at ${next.start}`)
    } else {
        await RESOLVERS.cutscene(page, region.exit)
        await settleOnMap(page, region.exit)
        await expectHere(page, region.exit)
        log(`${region.exit}: the last scene played, the walk ends here`)
    }
}

async function walk(page, baseUrl, plan, tally) {
    const count = (kind, how, nodeId) => {
        const row = (tally[kind] ??= { screen: 0, skip: 0, nodes: [] })
        row[how] += 1
        row.nodes.push(nodeId)
    }
    await newGame(page, baseUrl, plan)
    count(plan.regions[0].steps[0].kind, 'screen', plan.regions[0].start)

    for (let i = 0; i < plan.regions.length; i++) {
        const region = plan.regions[i]
        const next = plan.regions[i + 1] ?? null
        log(`=== ${region.map}: ${region.steps.map((s) => s.nodeId).join(' > ')} ===`)
        for (let j = 0; j < region.steps.length; j++) {
            const step = region.steps[j]
            const nextStep = region.steps[j + 1]
            if (step.role === 'arrival') continue
            if (step.role === 'back') {
                await walkBack(page, step.nodeId, { takePassage: nextStep?.role === 'passage' })
                continue
            }
            if (step.role === 'passage') {
                // The travel node before it took the passage: the player stands here.
                await settleOnMap(page, `${step.nodeId} passage`)
                await expectHere(page, step.nodeId)
                count(step.kind, 'screen', step.nodeId)
                log(`${step.nodeId}: arrived through the passage`)
                continue
            }
            if (step.role === 'exit') {
                await crossExit(page, region, next)
                count(step.kind, 'screen', step.nodeId)
                if (next) count(next.steps[0].kind, 'screen', next.start)
                continue
            }
            const resolve = RESOLVERS[step.kind]
            if (!resolve) fail(`${step.nodeId}: the walk has no way to resolve a ${step.kind} node`)
            if (step.kind === 'encounter' || step.kind === 'hazard') await mendIfLow(page, step.nodeId)
            await travelTo(page, step.nodeId)
            const how = await resolve(page, step.nodeId, { next: nextStep })
            await settleOnMap(page, step.nodeId)
            if (nextStep?.role !== 'passage') await expectHere(page, step.nodeId)
            count(step.kind, how, step.nodeId)
            log(`${step.nodeId} ${step.kind}: resolved by ${how}, back on the map`)
        }
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const started = Date.now()
    const plan = loadPlan()
    log(`plan: ${plan.regions.map((r) => `${r.map} (${r.steps.length} nodes)`).join(', ')}; kinds ${plan.carried.join(', ')}`)

    await runExpoExport()
    const { server, baseUrl } = await startStaticServer(EXPORT_DIR)
    log(`static server at ${baseUrl}`)

    const { chromium } = await import('playwright')
    const launchOptions = { headless: true }
    if (process.env.ACT1_WALK_E2E_CHROME) launchOptions.executablePath = process.env.ACT1_WALK_E2E_CHROME
    const browser = await chromium.launch(launchOptions)
    const pageErrors = []
    const consoleErrors = []
    const tally = {}
    const walkStarted = Date.now()
    try {
        const context = await browser.newContext({ viewport: VIEWPORT, hasTouch: false })
        const page = await context.newPage()
        page.on('pageerror', (err) => {
            pageErrors.push(err.message)
            console.error('act1-walk-e2e: pageerror', err.message)
        })
        page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
        await walk(page, baseUrl, plan, tally)
        if (pageErrors.length) fail(`${pageErrors.length} page error(s) during the walk`)
        const unmet = plan.carried.filter((kind) => !tally[kind])
        if (unmet.length) fail(`the walk never met these kinds the Act 1 pools carry: ${unmet.join(', ')}`)
        await context.close()
    } finally {
        await browser.close()
        server.close()
    }

    const walkSeconds = Math.round((Date.now() - walkStarted) / 1000)
    const totalSeconds = Math.round((Date.now() - started) / 1000)
    log('summary (kind: by screen / by skip):')
    for (const kind of plan.carried) {
        const row = tally[kind]
        log(`  ${kind.padEnd(11)} ${row.screen} / ${row.skip}   ${row.nodes.join(', ')}`)
    }
    // Console errors are reported, not failed on: a page error fails the walk.
    log(`console errors: ${consoleErrors.length}`)
    for (const text of [...new Set(consoleErrors)].slice(0, 10)) log(`  ${text.slice(0, 200)}`)
    log(`duration: walk ${walkSeconds}s, total ${totalSeconds}s`)
    if (process.env.ACT1_WALK_SUMMARY) {
        await writeFile(process.env.ACT1_WALK_SUMMARY, `${JSON.stringify({ tally, consoleErrors, walkSeconds, totalSeconds }, null, 2)}\n`)
    }
    log(`ALL PASS: four doors crossed, ${plan.carried.length} kinds met, ended on ${plan.regions.at(-1).exit}`)
}

main().catch((err) => {
    console.error('act1-walk-e2e: aborted:', err.message)
    process.exit(process.exitCode || 3)
})
