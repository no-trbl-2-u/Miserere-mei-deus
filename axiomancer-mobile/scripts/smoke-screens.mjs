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
//   exit 4  →  SMOKE_RUNS=<n>: a route's n captures were not byte-identical
//              (the gate cannot judge a nondeterministic screen; fix that first)
//   SMOKE_CHROME=/path/to/chrome  custom browser binary · AXM_FORCE_EXPORT=1  re-export
//   (otherwise .smoke-dist is reused when its stamp matches the tree, lib/web-export.mjs)
//   SMOKE_RUNS=5  load and shoot every route 5 times, exit 4 on any that differ
//   SMOKE_ONLY=devpuzzle-board,hazard-board  shoot and diff only these routes
//   (the shots a change moves; on a renderer unlike the baselines' every
//   route drifts, so the full run's exit code says nothing about the change)
//   With neither SMOKE_ONLY nor SMOKE_ROUTES=all, a run shoots only the routes
//   the paths changed since the merge-base with origin/main map to, failing
//   closed to all (lib/smoke-routes-for.mjs). CI passes SMOKE_ROUTES=all.
//   Every run writes screenshots/visual-summary.json (routes, counts, timings)
//   and, under CI, the same table to $GITHUB_STEP_SUMMARY (visual-report.mjs).
//
// When a diff is real and expected, run:
//   npm run baseline:approve
// to copy current → baseline. Commit the baseline PNGs alongside the
// change that produced them so the next run is green.

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir, copyFile, readdir, stat } from 'node:fs/promises'
import { appendFileSync, existsSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { injectMinigameSeeds } from './minigame-seed-injector.mjs'
import { forceDevTools } from './fixture-injector.mjs'
import { enterLiveFight } from './live-fight-entry.mjs'
import { waitForReady } from './lib/page-ready.mjs'
import { ensureWebExport } from './lib/web-export.mjs'
import { changedPaths, chooseRoutes } from './lib/smoke-routes-for.mjs'
import { buildVisualSummary, renderStepSummary } from './visual-report.mjs'

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
    // The full-screen moment after a first death; `preview=1` shows it on a
    // dev build (a real revive arms it in memory), hence the forced context.
    { name: 'death-return', path: '/death-return?preview=1', fixture: 'fresh-start' },
    // Dev-menu HAZARD PUZZLES board on the live hazard board (a dev route,
    // so it needs the forced dev-tools context a fixture route gets): the
    // hard demo's board, and its outcome panel after an immediate confirm.
    // The board opens with the live dice roll, so its shot waits it out.
    // The list: the three demos, then the candidates grouped by intended band.
    { name: 'devpuzzle-list', path: '/devpuzzle', fixture: 'fresh-start' },
    { name: 'devpuzzle-board', path: '/devpuzzle?id=demo-undercroft-hard&route=risk&paused=1', fixture: 'fresh-start', settleRoll: true },
    { name: 'devpuzzle-outcome', path: '/devpuzzle?id=demo-undercroft-hard&route=risk&confirm=1', fixture: 'fresh-start' },
]

// 0.5% of pixels may differ before a route is flagged. Bumps catch
// anti-aliasing / font-subpixel noise without masking real UI shifts.
export const DIFF_THRESHOLD_RATIO = 0.005

/**
 * The routes a run shoots: all of them, or only those `only` names (a
 * comma list, as `SMOKE_ONLY` carries it). An unknown name throws, so a
 * typo never reads as a green run of nothing.
 *
 * @param {typeof ROUTES} routes every visual route.
 * @param {string | undefined} only comma-separated route names, or unset.
 */
export function selectRoutes(routes, only) {
    const names = (only ?? '').split(',').map((n) => n.trim()).filter(Boolean)
    if (names.length === 0) return routes
    const unknown = names.filter((n) => !routes.some((r) => r.name === n))
    if (unknown.length > 0) throw new Error(`SMOKE_ONLY names unknown route(s): ${unknown.join(', ')}`)
    return routes.filter((r) => names.includes(r.name))
}

/**
 * The routes this run shoots and the line that says why: `SMOKE_ONLY`, then
 * `SMOKE_ROUTES=all`, then the routes the branch's changed paths map to.
 *
 * @param {typeof ROUTES} routes every visual route.
 * @param {Record<string, string | undefined>} env the process environment.
 * @param {() => string[] | null} changed the changed paths, or null for all.
 */
export function routesForRun(routes, env, changed) {
    const choice = chooseRoutes(routes, { only: env.SMOKE_ONLY, routesEnv: env.SMOKE_ROUTES, changed })
    const picked = choice.names ? routes.filter((r) => choice.names.includes(r.name)) : selectRoutes(routes, env.SMOKE_ONLY)
    return { routes: picked, log: choice.log }
}

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
export const SUMMARY_PATH = resolve(REPO_ROOT, 'screenshots/visual-summary.json')

// ---------------------------------------------------------------------------
// Exit-code mapping — also re-exported for the hermetic test
// ---------------------------------------------------------------------------

export const EXIT = {
    OK: 0,
    DIFF: 1,
    MISSING_BASELINE: 2,
    BOOT_FAILURE: 3,
    NONDETERMINISTIC: 4,
}

export function resultToExit(result) {
    if (result.bootError) return EXIT.BOOT_FAILURE
    if ((result.nondeterministic ?? []).length > 0) return EXIT.NONDETERMINISTIC
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
 * How many times each route is loaded and shot, from `SMOKE_RUNS`. Unset
 * is 1; anything but a whole number from 1 to 20 throws, so a typo never
 * reads as a determinism check that did not run.
 *
 * @param {string | undefined} raw the `SMOKE_RUNS` value.
 */
export function parseSmokeRuns(raw) {
    if (raw === undefined || raw === '') return 1
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 1 || n > 20) throw new Error(`SMOKE_RUNS must be a whole number from 1 to 20, got '${raw}'`)
    return n
}

/**
 * The routes whose captures are not byte-identical across runs: each
 * entry's later captures are compared with its first.
 *
 * @param {{ route: string, captures: Uint8Array[] }[]} shots every route's captures, in run order.
 * @returns {string[]} the nondeterministic route names, in input order.
 */
export function nondeterministicRoutes(shots) {
    return shots
        .filter(({ captures }) => captures.slice(1).some((c) => !Buffer.from(c).equals(Buffer.from(captures[0]))))
        .map(({ route }) => route)
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

async function runExpoExport() {
    const start = performance.now()
    const r = await ensureWebExport({ outDir: EXPORT_DIR, log: (m) => console.log(`smoke-screens: ${m}`) })
    if (!r.ok) { console.error('smoke-screens: expo export failed'); process.exit(EXIT.BOOT_FAILURE) }
    return { exportMs: performance.now() - start, exportReused: r.reused }
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

async function captureAndDiff({ playwright, PNG, pixelmatch }, baseUrl, routes) {
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

    // Load the route and shoot it; returns the PNG. A fixture page or a
    // live fight's own context is closed straight after its shot.
    async function shootRoute(route) {
        const url = `${baseUrl}${route.path}`
        const liveContext = route.liveFight ? await browser.newContext(contextOptions) : null
        const target = route.fixture ? await fixturePage(route.fixture)
            : liveContext ? await liveContext.newPage()
            : page
        try {
            if (route.liveFight) await enterLiveFight(target, baseUrl, { seed: LIVE_FIGHT_SEED })
            else await target.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
            if (route.waitForPath) {
                await target.waitForURL((u) => u.pathname.endsWith(route.waitForPath), { timeout: 15_000 })
            }
            await waitForReady(target)
            if (route.hazardRoute) await pickHazardRoute(target, route.hazardRoute)
            if (route.settleRoll) {
                await target.getByTestId('hazard-board').waitFor({ state: 'visible', timeout: 10_000 })
                await settleDiceRoll(target)
            }
            // After a hazard step the board has re-rendered; let it paint.
            if (route.hazardRoute || route.settleRoll) await waitForReady(target)
            return await target.screenshot({ fullPage: false })
        } finally {
            if (target !== page) await target.close().catch(() => {})
            if (liveContext) await liveContext.close().catch(() => {})
        }
    }

    const runs = parseSmokeRuns(process.env.SMOKE_RUNS)
    const shots = []
    // Compare time is the loop's time not spent loading and shooting.
    let captureMs = 0
    const loopStart = performance.now()

    for (const route of routes) {
        const captures = []
        const shotStart = performance.now()
        try {
            for (let run = 0; run < runs; run++) captures.push(await shootRoute(route))
        } catch (err) {
            console.error(`smoke-screens: failed to load ${route.path}: ${err.message}`)
            differing.push({ route: route.name, reason: 'load-failed', message: err.message })
            continue
        } finally {
            captureMs += performance.now() - shotStart
        }
        shots.push({ route: route.name, captures })
        // A capture that differs from the first is kept beside the diffs
        // (never in current/, which baseline:approve copies) for review.
        if (nondeterministicRoutes([{ route: route.name, captures }]).length > 0) {
            for (const [k, capture] of captures.entries()) {
                if (k > 0) await writeFile(join(DIFF_DIR, `${route.name}.run${k + 1}.png`), capture)
            }
        }

        const currentPath = join(CURRENT_DIR, `${route.name}.png`)
        await writeFile(currentPath, captures[0])

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
            await writeFile(diffPath, PNG.sync.write(diff))
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

    const compareMs = performance.now() - loopStart - captureMs
    await browser.close()
    return { matched, differing, missing, consoleErrors, runs, nondeterministic: nondeterministicRoutes(shots), captureMs, compareMs }
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

async function main() {
    // A bad SMOKE_ONLY, SMOKE_ROUTES or SMOKE_RUNS fails here, before the export.
    const { routes, log } = routesForRun(ROUTES, process.env, () => changedPaths(resolve(REPO_ROOT, '..')))
    console.log(`smoke-screens: ${log}`)
    parseSmokeRuns(process.env.SMOKE_RUNS)
    const exportTiming = await runExpoExport()
    const deps = await loadDeps()

    const { server, port } = await startStaticServer(EXPORT_DIR)
    const baseUrl = `http://127.0.0.1:${port}`
    console.log(`smoke-screens: serving ${EXPORT_DIR} on ${baseUrl}`)

    let result
    try {
        result = await captureAndDiff(deps, baseUrl, routes)
    } finally {
        server.close()
    }

    console.log('')
    console.log(`smoke-screens: matched     ${result.matched.length}`)
    console.log(`smoke-screens: differing   ${result.differing.length}`)
    console.log(`smoke-screens: missing     ${result.missing.length}`)
    console.log(`smoke-screens: console errors ${result.consoleErrors.length}`)
    if (result.runs > 1) {
        console.log(`smoke-screens: nondeterministic ${result.nondeterministic.length} (${result.runs} runs per route)`)
        for (const route of result.nondeterministic) {
            console.log(`  NONDET  ${route}  captures differ across ${result.runs} runs`)
        }
    }

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

    const exitCode = resultToExit(result)
    writeRunRecord(buildVisualSummary(result, {
        ...exportTiming, captureMs: result.captureMs, compareMs: result.compareMs,
    }, exitCode))
    process.exit(exitCode)
}

// The JSON summary beside the captures (the CI artifact carries it to the
// re-stamp job), and the same table in the CI step summary when there is one.
function writeRunRecord(summary) {
    writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2) + '\n')
    console.log(`smoke-screens: summary -> ${SUMMARY_PATH}`)
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderStepSummary(summary))
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
    main().catch((err) => {
        console.error('smoke-screens: unexpected failure:', err)
        process.exit(EXIT.BOOT_FAILURE)
    })
}
