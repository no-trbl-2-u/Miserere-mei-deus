#!/usr/bin/env node
// scripts/smoke-screens.mjs
//
// Visual smoke gate: boot the web build, visit every primary route,
// capture a screenshot, diff against the committed baseline. Surfaces
// the "Character crash" / blank-screen / unintended UI change class
// of regressions that hermetic Jest can't see.
//
// Exit contract (mirrors deploy-check.mjs):
//   exit 0  →  all routes match baseline (within threshold)
//   exit 1  →  one or more routes differ; review + maybe approve
//   exit 2  →  baseline missing for one or more routes (first-run / new route)
//   exit 3  →  config / boot failure (expo export / browser / server)
//   SMOKE_CHROME=/path/to/chrome  custom browser binary · SMOKE_REUSE_EXPORT=1  skip the export
//
// When a diff is real and expected, run:
//   npm run baseline:approve
// to copy current → baseline. Commit the baseline PNGs alongside the
// change that produced them so the next run is green.

import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, mkdir, copyFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { injectMinigameSeeds } from './minigame-seed-injector.mjs'
import { forceDevTools } from './fixture-injector.mjs'
import { enterLiveFight } from './live-fight-entry.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Config — also re-exported for the hermetic test
// ---------------------------------------------------------------------------

export const ROUTES = [
    { name: 'root', path: '/' },
    { name: 'character', path: '/character' },
    { name: 'inventory', path: '/inventory' },
    { name: 'exploration', path: '/exploration' },
    // The live fight holds only a staged fight, so it is entered through
    // /dev's encounter trigger with the engine seed pinned.
    { name: 'combat-encounter', path: '/combat-encounter', liveFight: true },
    { name: 'memoir', path: '/memoir' },
    // THE APORIA act select (no session on a fresh boot).
    { name: 'labyrinth', path: '/labyrinth' },
    // State-gated screens (2026-09-08, docs/state-fixtures.md). These
    // routes are pushed by `<EventGate>` off game state and bounce when
    // there is none, so each boots from a registry fixture whose `arrive`
    // fires the node event; `waitForPath` is the route the gate pushes.
    // (The generic `/event` shell this comment used to wait on is
    // unreachable today — every paced kind has a dedicated screen.)
    // Fixture routes run in a second browser context with dev tools
    // forced, so the plain routes above keep their unforced baselines.
    { name: 'dialogue', path: '/exploration', fixture: 'apprentice-staged-dialogue', waitForPath: '/dialogue' },
    { name: 'village', path: '/exploration', fixture: 'wanderer-staged-village', waitForPath: '/village' },
    { name: 'cutscene', path: '/exploration', fixture: 'wanderer-staged-cutscene', waitForPath: '/cutscene' },
    // The live hazard on its board, the parity baseline for the puzzle
    // board: the fixture's arrival starts the hazard (seed pinned by the
    // minigame-seed injector), `hazardRoute` picks the route, and the shot
    // waits out the dice roll.
    { name: 'hazard-board', path: '/exploration', fixture: 'l30-bw-hazard-arrive', waitForPath: '/hazard', hazardRoute: 'risk' },
    // Dev-menu HAZARD PUZZLES board on the live hazard board (a dev route,
    // so it needs the forced dev-tools context a fixture route gets): the
    // hard demo's board, and its outcome panel after an immediate confirm.
    // The board opens with the live dice roll, so its shot waits it out.
    { name: 'devpuzzle-board', path: '/devpuzzle?id=demo-undercroft-hard&route=risk&paused=1', fixture: 'fresh-start', settleRoll: true },
    { name: 'devpuzzle-outcome', path: '/devpuzzle?id=demo-undercroft-hard&route=risk&confirm=1', fixture: 'fresh-start' },
]

// 0.5% of pixels may differ before a route is flagged. Bumps catch
// anti-aliasing / font-subpixel noise without masking real UI shifts.
export const DIFF_THRESHOLD_RATIO = 0.005

// Per-pixel sensitivity passed to pixelmatch. 0 = exact, 1 = ignore.
// 0.1 matches the pixelmatch default and is the sweet spot for fonts.
export const PIXELMATCH_THRESHOLD = 0.1

// Viewport — mobile iPhone-ish so the rendered surface stays close
// to the device target.
export const VIEWPORT = { width: 390, height: 844 }

export const BASELINE_DIR = resolve(REPO_ROOT, 'screenshots/baseline')
/** Engine seed for the live-fight capture, so its baseline is stable. */
const LIVE_FIGHT_SEED = 16
export const CURRENT_DIR = resolve(REPO_ROOT, 'screenshots/current')
export const DIFF_DIR = resolve(REPO_ROOT, 'screenshots/diff')

// ---------------------------------------------------------------------------
// Exit-code mapping — also re-exported for the hermetic test
// ---------------------------------------------------------------------------

export const EXIT = {
    OK: 0,
    DIFF: 1,
    MISSING_BASELINE: 2,
    BOOT_FAILURE: 3,
}

export function resultToExit(result) {
    if (result.bootError) return EXIT.BOOT_FAILURE
    if (result.missing.length > 0) return EXIT.MISSING_BASELINE
    if (result.differing.length > 0) return EXIT.DIFF
    return EXIT.OK
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function pixelDiffRatio(width, height, diffPixelCount) {
    const total = width * height
    if (total === 0) return 0
    return diffPixelCount / total
}

export function isOverThreshold(ratio, threshold = DIFF_THRESHOLD_RATIO) {
    return ratio > threshold
}

/**
 * On the live hazard's route select: picks `hazardRoute` (`safe` or `risk`),
 * then waits for the board to show and the dice roll to settle, so the shot
 * is the board with its dice at rest.
 *
 * @param {import('playwright').Page} page the page, on `/hazard` at the route select.
 * @param {'safe' | 'risk'} hazardRoute the route to pick.
 */
export async function pickHazardRoute(page, hazardRoute) {
    await page.getByTestId(`hazard-route-${hazardRoute}`).click()
    await page.getByTestId('hazard-board').waitFor({ state: 'visible', timeout: 10_000 })
    await settleDiceRoll(page)
}

/**
 * Waits for a hazard board's opening dice roll to finish, so the shot is
 * the board with its dice at rest (the live hazard and the puzzle board).
 *
 * @param {import('playwright').Page} page the page, on a hazard board.
 */
export async function settleDiceRoll(page) {
    await page.getByTestId('hazard-dice-roll').waitFor({ state: 'hidden', timeout: 10_000 })
}

// ---------------------------------------------------------------------------
// Lazy imports — keep boot fast + don't crash the file from being
// required by Jest when devDeps aren't installed yet.
// ---------------------------------------------------------------------------

async function loadDeps() {
    const errors = []
    let playwright, PNG, pixelmatch
    try {
        playwright = (await import('playwright')).default ?? (await import('playwright'))
    } catch (e) {
        errors.push("'playwright' is not installed. Run: npm install -D playwright && npx playwright install chromium")
    }
    try {
        PNG = (await import('pngjs')).PNG
    } catch (e) {
        errors.push("'pngjs' is not installed. Run: npm install -D pngjs")
    }
    try {
        pixelmatch = (await import('pixelmatch')).default
    } catch (e) {
        errors.push("'pixelmatch' is not installed. Run: npm install -D pixelmatch")
    }
    if (errors.length > 0) {
        console.error('smoke-screens: missing dependencies:\n  - ' + errors.join('\n  - '))
        process.exit(EXIT.BOOT_FAILURE)
    }
    return { playwright, PNG, pixelmatch }
}

// ---------------------------------------------------------------------------
// Expo export + static server
// ---------------------------------------------------------------------------

const EXPORT_DIR = resolve(REPO_ROOT, '.smoke-dist')

function runExpoExport() {
    if (existsSync(EXPORT_DIR) && process.env.SMOKE_REUSE_EXPORT === '1') {
        console.log('smoke-screens: reusing existing .smoke-dist (SMOKE_REUSE_EXPORT=1)')
        return
    }
    console.log('smoke-screens: running `expo export --platform web` → .smoke-dist ...')
    const result = spawnSync(
        'npx',
        ['expo', 'export', '--platform', 'web', '--output-dir', EXPORT_DIR],
        { cwd: REPO_ROOT, stdio: 'inherit' },
    )
    if (result.status !== 0) {
        console.error('smoke-screens: expo export failed')
        process.exit(EXIT.BOOT_FAILURE)
    }
}

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

export function resolveStaticExportPath(_pathname, candidates) {
    const exact = candidates[0]
    const directoryIndex = candidates[1]
    const htmlGuess = candidates[2]
    const fallbackIndex = candidates[3]

    if (exact?.exists && !exact.isDirectory) return exact.requestedPath
    if (exact?.exists && exact.isDirectory && directoryIndex?.exists && !directoryIndex.isDirectory) {
        return directoryIndex.requestedPath
    }
    if (htmlGuess?.exists && !htmlGuess.isDirectory) return htmlGuess.requestedPath
    return fallbackIndex.requestedPath
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
                filePath = resolveStaticExportPath(pathname, candidates)

                const data = await readFile(filePath)
                const mime = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
                res.statusCode = 200
                res.setHeader('Content-Type', mime)
                res.end(data)
            } catch (e) {
                res.statusCode = 500
                res.end(String(e))
            }
        })
        server.on('error', rejectServer)
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address()
            resolveServer({ server, port })
        })
    })
}

// ---------------------------------------------------------------------------
// Screenshot + diff per route
// ---------------------------------------------------------------------------

async function captureAndDiff({ playwright, PNG, pixelmatch }, baseUrl) {
    await mkdir(CURRENT_DIR, { recursive: true })
    await mkdir(DIFF_DIR, { recursive: true })

    // SMOKE_CHROME=/path/to/chrome overrides the browser binary (the other
    // scripts/*-e2e.mjs drivers expose the same escape hatch).
    const launchOptions = { headless: true }
    if (process.env.SMOKE_CHROME) launchOptions.executablePath = process.env.SMOKE_CHROME
    const browser = await playwright.chromium.launch(launchOptions)
    const contextOptions = {
        viewport: VIEWPORT,
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
    }
    const context = await browser.newContext(contextOptions)
    await injectMinigameSeeds(context)
    const page = await context.newPage()

    const consoleErrors = []
    const trackErrors = (p) => {
        p.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push({ url: p.url(), text: msg.text() })
        })
        p.on('pageerror', (err) => {
            consoleErrors.push({ url: p.url(), text: err.message })
        })
    }
    trackErrors(page)

    // Fixture routes get their own context: dev tools must be forced for
    // the fixture to be honoured (export builds have `__DEV__ === false`),
    // and forcing them on the shared context would put the dev-tools row
    // into the SELF baseline. One page per fixture route, since the id is
    // read once at boot from an init script.
    let fixtureContext = null
    async function fixturePage(fixtureId) {
        if (fixtureContext === null) {
            fixtureContext = await browser.newContext(contextOptions)
            await injectMinigameSeeds(fixtureContext)
            await forceDevTools(fixtureContext)
        }
        const p = await fixtureContext.newPage()
        await p.addInitScript((id) => { globalThis.__AXM_FIXTURE__ = id }, fixtureId)
        trackErrors(p)
        return p
    }

    const matched = []
    const differing = []
    const missing = []

    for (const route of ROUTES) {
        const url = `${baseUrl}${route.path}`
        const target = route.fixture ? await fixturePage(route.fixture)
            : route.liveFight ? await (await browser.newContext(contextOptions)).newPage()
            : page
        try {
            if (route.liveFight) await enterLiveFight(target, baseUrl, { seed: LIVE_FIGHT_SEED })
            else await target.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
            if (route.waitForPath) {
                await target.waitForURL((u) => u.pathname.endsWith(route.waitForPath), { timeout: 15_000 })
            }
            if (route.hazardRoute) await pickHazardRoute(target, route.hazardRoute)
            if (route.settleRoll) {
                await target.getByTestId('hazard-board').waitFor({ state: 'visible', timeout: 10_000 })
                await settleDiceRoll(target)
            }
            // Settle fonts + any deferred layout. The 600ms is empirical:
            // long enough for the @expo-google-fonts loaders to resolve,
            // short enough to keep the suite under a minute.
            await target.evaluate(() => document.fonts.ready)
            await target.waitForTimeout(600)
        } catch (err) {
            console.error(`smoke-screens: failed to load ${route.path}: ${err.message}`)
            differing.push({ route: route.name, reason: 'load-failed', message: err.message })
            if (target !== page) await target.close().catch(() => {})
            continue
        }

        const currentPath = join(CURRENT_DIR, `${route.name}.png`)
        await target.screenshot({ path: currentPath, fullPage: false })
        if (target !== page) await target.close().catch(() => {})

        const baselinePath = join(BASELINE_DIR, `${route.name}.png`)
        if (!existsSync(baselinePath)) {
            console.warn(`smoke-screens: no baseline for ${route.name} (current → ${currentPath})`)
            missing.push({ route: route.name, currentPath })
            continue
        }

        const baselinePng = PNG.sync.read(await readFile(baselinePath))
        const currentPng = PNG.sync.read(await readFile(currentPath))

        if (baselinePng.width !== currentPng.width || baselinePng.height !== currentPng.height) {
            differing.push({
                route: route.name,
                reason: 'size-mismatch',
                message: `baseline ${baselinePng.width}x${baselinePng.height} vs current ${currentPng.width}x${currentPng.height}`,
            })
            continue
        }

        const { width, height } = baselinePng
        const diff = new PNG({ width, height })
        const diffPixels = pixelmatch(baselinePng.data, currentPng.data, diff.data, width, height, {
            threshold: PIXELMATCH_THRESHOLD,
        })

        const ratio = pixelDiffRatio(width, height, diffPixels)
        if (isOverThreshold(ratio)) {
            const diffPath = join(DIFF_DIR, `${route.name}.png`)
            await readFile(baselinePath) // touch
            const fs = await import('node:fs/promises')
            await fs.writeFile(diffPath, PNG.sync.write(diff))
            differing.push({
                route: route.name,
                reason: 'pixel-diff',
                ratio,
                diffPath,
            })
        } else {
            matched.push({ route: route.name, ratio })
        }
    }

    await browser.close()
    return { matched, differing, missing, consoleErrors }
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

async function main() {
    runExpoExport()
    const deps = await loadDeps()

    const { server, port } = await startStaticServer(EXPORT_DIR)
    const baseUrl = `http://127.0.0.1:${port}`
    console.log(`smoke-screens: serving ${EXPORT_DIR} on ${baseUrl}`)

    let result
    try {
        result = await captureAndDiff(deps, baseUrl)
    } finally {
        server.close()
    }

    console.log('')
    console.log(`smoke-screens: matched     ${result.matched.length}`)
    console.log(`smoke-screens: differing   ${result.differing.length}`)
    console.log(`smoke-screens: missing     ${result.missing.length}`)
    console.log(`smoke-screens: console errors ${result.consoleErrors.length}`)

    if (result.differing.length > 0) {
        console.log('')
        for (const d of result.differing) {
            const ratio = d.ratio !== undefined ? ` (${(d.ratio * 100).toFixed(3)}% px)` : ''
            console.log(`  DIFF  ${d.route}${ratio}  [${d.reason}]  ${d.message ?? d.diffPath ?? ''}`)
        }
        console.log('')
        console.log('If the diff is expected, run:  npm run baseline:approve')
    }
    if (result.missing.length > 0) {
        console.log('')
        for (const m of result.missing) {
            console.log(`  NEW   ${m.route}  →  ${m.currentPath}`)
        }
        console.log('')
        console.log('First-run / new route: review then approve with: npm run baseline:approve')
    }
    if (result.consoleErrors.length > 0) {
        console.log('')
        console.log('Console errors observed during smoke:')
        for (const e of result.consoleErrors) {
            console.log(`  ERR  ${e.url}  →  ${e.text}`)
        }
        // Console errors are surfaced but don't fail the gate today —
        // they're informational until the project has zero baseline.
        // Promote to a fail-gate by adding a non-zero return here.
    }

    process.exit(resultToExit(result))
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
    main().catch((err) => {
        console.error('smoke-screens: unexpected failure:', err)
        process.exit(EXIT.BOOT_FAILURE)
    })
}
