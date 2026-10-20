#!/usr/bin/env node
// scripts/critique-drive.mjs
//
// Phase 34 — unattended `/critique` transport.
//
// The problem this solves: `/critique` normally delegates the playthrough to
// the `playtester` sub-agent, which drives the build with the Playwright *MCP*
// tools. Those MCP tool grants do not propagate into the Agent-tool sandbox on
// unattended ticks, so eight consecutive unattended passes filed zero findings.
// The fix is NOT to drop Playwright — it is to drop the *MCP + sub-agent* hop:
// this is a plain Node subprocess that imports the Playwright *library* and
// drives the exported web build directly. No MCP, no grant, no sub-agent.
//
// It does not judge. It DRIVES + CAPTURES: for each screen in the critique set
// it navigates the hermetic build, settles, and writes a screenshot + the DOM
// innerText + any console/page errors to `.critique-artifacts/<viewport>/`,
// plus a top-level `manifest.json`. The `/critique` skill's main agent (which
// has vision and no grant problem) then reads those artifacts and files the
// fresh-eyes findings itself. A screen that redirects, blanks, or throws is
// captured as-is — that is an OBSERVATION for the reviewer, not a driver
// failure. Only a boot failure (export / server / browser) exits non-zero.
//
// Usage:
//   node scripts/critique-drive.mjs                     # mobile viewport
//   CRITIQUE_VIEWPORT=desktop node scripts/critique-drive.mjs
//   CRITIQUE_VIEWPORT=both    node scripts/critique-drive.mjs
//   CRITIQUE_DRIVE_REUSE_EXPORT=1 node scripts/critique-drive.mjs
//   CRITIQUE_DRIVE_CHROME=/path/to/chrome node scripts/critique-drive.mjs
//
// Exit codes: 0 = artifacts captured (even if some screens errored) ·
// 3 = boot failure (export / static server / browser launch).

import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, stat, mkdir, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { enterLiveFight } from './live-fight-entry.mjs'
import { waitForReady } from './lib/page-ready.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const EXPORT_DIR = resolve(REPO_ROOT, '.critique-dist')
const ARTIFACT_ROOT = resolve(REPO_ROOT, '.critique-artifacts')
// Seed 16 pins the tray roll for the combat screen's demo deck (same
// pin the combat e2e uses), so the combat capture is deterministic.
const COMBAT_SEED = 16

const VIEWPORTS = {
    mobile: { width: 375, height: 812 },
    desktop: { width: 1280, height: 800 },
}

// The phone context reports a touch device, so `(pointer: coarse)` and any
// copy or layout keyed to the pointer render as a phone shows them (CRITIQUE
// pass 92: with `hasTouch: false` the mobile hub capture read the desktop
// "drag · scroll to zoom" gesture line). Desktop keeps the mouse.
export function contextOptions(viewport) {
    const touch = viewport === 'mobile'
    return { viewport: VIEWPORTS[viewport], hasTouch: touch, isMobile: touch }
}

// This driver's own output paths under ARTIFACT_ROOT — the only things it is
// safe to wipe on start. `.critique-artifacts/` is not exclusively this
// script's directory (Phase 94 / AUDIT.md [3.2]): the 2026-09-12 fresh-eyes
// sweep wrote a `fresh-eyes/` subtree there and `rm(ARTIFACT_ROOT, ...)`
// destroyed a complete 54-cell capture set that had nothing to do with this
// driver. Scope the delete to what this driver itself produces.
export function ownArtifactPaths(artifactRoot) {
    return [...Object.keys(VIEWPORTS), 'manifest.json'].map((name) => join(artifactRoot, name))
}

// Settle signals. A flat 700ms pause caught the title 0.7s into its 2.65s
// intro and the combat board mid dice-roll (CRITIQUE pass 79, widened at 83),
// so a screen with a timed entrance waits for the DOM to say it is over. A
// signal that never comes is noted on the entry; the capture still happens.
export async function titleSettled(page) {
    // EMBARK and the psalm fade in last; the intro is over when they are opaque.
    await page.waitForFunction(() => {
        const cta = document.querySelector('[data-testid="title-cta"]')
        return cta != null && getComputedStyle(cta).opacity === '1'
    }, null, { timeout: 8000 })
}

export async function diceSettled(page) {
    // The tray's tap-to-skip layer is mounted only while a die is tumbling.
    const skip = page.getByTestId('combat-dice-skip')
    await skip.waitFor({ state: 'attached', timeout: 2000 }).catch(() => {})
    await skip.waitFor({ state: 'detached', timeout: 8000 })
}

// The critique screen set (skill §3). Each entry navigates a route and captures
// what renders. `prepare` is a best-effort interaction to reach a downstream
// state; if it throws, we capture whatever is on screen and move on.
//
// Three ways a screen gets reached:
//
//   1. COLD-ENTERABLE routes — `/` (title→onboarding), `/(tabs)/exploration`
//      (the default landing tab). Navigating to them by URL renders real
//      content.
//
//   1b. THE LIVE FIGHT — `/combat-encounter` holds only a fight the store
//      has staged and leaves when there is none, so a `liveFight` entry is
//      reached through /dev's encounter trigger (`live-fight-entry.mjs`),
//      the seed pinned.
//
//   2. FIXTURE-BOOTED screens (2026-09-08, docs/state-fixtures.md) — many
//      routes are STATE-GATED: `/village`, `/cutscene`, `/dialogue`, `/rest`,
//      `/hazard`, `/blacksmith`, `/cache` are pushed by the gates
//      (`<EventGate>`, `<RestGate>`, …) in response to game state, and bounce
//      out when there is none. A screen entry with a `fixture` key boots the
//      app from that registry fixture (`__AXM_FIXTURE__` + forced dev tools
//      via scripts/fixture-injector.mjs); a fixture with `arrive` fires the
//      node's event so the gate pushes the real screen, and `waitForPath`
//      waits for that route before capturing. Registry:
//      axiomancer-mechanics/src/Game/fixtures/state-fixture.registry.ts
//      (`npm run game -w axiomancer-mechanics -- --fixture list`).
//
// Add a route only through one of those two doors — a bare state-gated URL
// captures a blank bounce, which is a transport artifact, not a finding.
export const SCREENS = [
    {
        name: 'title',
        path: '/',
        why: 'First impression. The fold matters.',
        settle: titleSettled,
    },
    {
        name: 'onboarding',
        path: '/',
        why: 'Where a first-time player forms their model of the game.',
        // New player: watch the intro, then press EMBARK once it is shown.
        prepare: async (page) => {
            await titleSettled(page)
            await page.getByLabel('Embark on your journey').click({ timeout: 4000 })
        },
    },
    {
        name: 'combat',
        path: '/combat-encounter',
        why: "The game's core loop as actually played.",
        seed: COMBAT_SEED,
        liveFight: true,
    },
    {
        name: 'combat-board',
        path: '/combat-encounter',
        why: 'The live board mid-fight — card hand + face copy (VITAE/DoT text) only render after ENTER COMBAT; the pre-fight preview alone cannot re-validate them unattended.',
        seed: COMBAT_SEED,
        liveFight: true,
        prepare: async (page) => {
            await page.getByTestId('combat-enter').click({ timeout: 8000, force: true }).catch(() => {})
            await page.getByTestId('combat-board').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
        },
        settle: diceSettled,
    },
    {
        name: 'exploration-hub',
        path: '/(tabs)/exploration',
        why: 'Town / exploration hub — navigation, voice, orientation, and the early-progression state a cold player lands on.',
    },
    // ── Fixture-booted screens (state-gated routes, opened cold) ──────────
    {
        name: 'dialogue',
        path: '/(tabs)/exploration',
        fixture: 'apprentice-staged-dialogue',
        waitForPath: '/dialogue',
        why: 'The NPC dialogue shell — voice, choice legibility, and how a conversation reads to a first-time player.',
    },
    {
        name: 'village',
        path: '/(tabs)/exploration',
        fixture: 'wanderer-staged-village',
        waitForPath: '/village',
        why: 'The settlement + shop screen — merchant voice, ware pricing, and whether buying/selling explains itself.',
    },
    {
        name: 'cutscene',
        path: '/(tabs)/exploration',
        fixture: 'wanderer-staged-cutscene',
        waitForPath: '/cutscene',
        why: 'A mid-forest omen — cutscene pacing, type, and whether the player knows how to continue.',
    },
    {
        name: 'rest',
        path: '/(tabs)/exploration',
        fixture: 'apprentice-bw-rest',
        waitForPath: '/rest',
        why: 'The night-watch rest choice — a hurt player deciding how to spend the night.',
    },
    {
        name: 'hazard',
        path: '/(tabs)/exploration',
        fixture: 'l30-bw-hazard-arrive',
        waitForPath: '/hazard',
        why: 'The hazard minigame entry with a late-game kit — does the danger read before the first card is dragged?',
    },
    {
        name: 'late-game-hub',
        path: '/(tabs)/exploration',
        fixture: 'sage-bw-door-gate',
        why: 'The exploration hub as a mid-campaign player sees it — a walked map, the boss node and the door one step away.',
    },
]

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
}

function log(msg) { console.log(`critique-drive: ${msg}`) }

function runExpoExport() {
    if (existsSync(EXPORT_DIR) && process.env.CRITIQUE_DRIVE_REUSE_EXPORT === '1') {
        log('reusing existing .critique-dist (CRITIQUE_DRIVE_REUSE_EXPORT=1)')
        return
    }
    log('running `expo export --platform web` → .critique-dist ...')
    // Cross-platform spawn: on Windows `npx` is `npx.cmd`, and Node refuses to
    // spawn a .cmd without a shell (CVE-2024-27980), so use shell there.
    const isWin = process.platform === 'win32'
    const result = spawnSync(
        isWin ? 'npx.cmd' : 'npx',
        ['expo', 'export', '--platform', 'web', '--output-dir', EXPORT_DIR],
        { cwd: REPO_ROOT, stdio: 'inherit', env: { ...process.env }, shell: isWin },
    )
    if (result.error) { console.error('critique-drive: expo export could not spawn —', result.error.message); process.exit(3) }
    if (result.status !== 0) { console.error('critique-drive: expo export failed'); process.exit(3) }
}

async function fileCandidate(p) {
    try { const info = await stat(p); return { p, exists: true, dir: info.isDirectory() } }
    catch { return { p, exists: false, dir: false } }
}

function startStaticServer(rootDir) {
    return new Promise((resolveServer, rejectServer) => {
        const server = createServer(async (req, res) => {
            try {
                const url = new URL(req.url, 'http://localhost')
                let pathname = decodeURIComponent(url.pathname)
                if (pathname.endsWith('/')) pathname += 'index.html'
                const filePath = join(rootDir, pathname)
                if (!filePath.startsWith(rootDir)) { res.statusCode = 403; return res.end('forbidden') }
                const candidates = [
                    await fileCandidate(filePath),
                    await fileCandidate(join(filePath, 'index.html')),
                    await fileCandidate(join(rootDir, pathname + '.html')),
                    await fileCandidate(join(rootDir, 'index.html')),
                ]
                const chosen =
                    (candidates[0].exists && !candidates[0].dir && candidates[0].p) ||
                    (candidates[1].exists && !candidates[1].dir && candidates[1].p) ||
                    (candidates[2].exists && !candidates[2].dir && candidates[2].p) ||
                    candidates[3].p
                const body = await readFile(chosen)
                res.setHeader('content-type', MIME[extname(chosen)] ?? 'application/octet-stream')
                res.end(body)
            } catch (err) { res.statusCode = 500; res.end(String(err)) }
        })
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address()
            resolveServer({ server, baseUrl: `http://127.0.0.1:${port}` })
        })
        server.on('error', rejectServer)
    })
}

// Capture one screen in one viewport. Never throws for screen-level trouble —
// a nav error / page error is recorded on the entry and returned as data.
async function captureScreen(context, baseUrl, screen, viewport, outDir, index) {
    const consoleErrors = []
    const pageErrors = []
    const page = await context.newPage()
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 400)) })
    page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 400)))

    const idx = String(index + 1).padStart(2, '0')
    const base = `${idx}-${screen.name}`
    const entry = {
        name: screen.name, path: screen.path, why: screen.why, viewport,
        fixture: screen.fixture ?? null,
        screenshot: `${base}.png`, domText: `${base}.txt`,
        finalUrl: null, navError: null, settleError: null, consoleErrors, pageErrors,
    }
    try {
        if (screen.seed != null && !screen.liveFight) {
            await page.addInitScript((s) => { globalThis.__AXM_COMBAT_SEED__ = s }, screen.seed)
        }
        if (screen.fixture != null) {
            // Boot from a state fixture: the id is read by state/fixtures.ts
            // before the store mounts; dev tools must be forced because the
            // export has `__DEV__ === false` (docs/state-fixtures.md, "Gate").
            await page.addInitScript((id) => {
                globalThis.__AXM_FIXTURE__ = id
                globalThis.__AXM_FORCE_DEV_TOOLS__ = true
            }, screen.fixture)
        }
        if (screen.liveFight) await enterLiveFight(page, baseUrl, { seed: screen.seed })
        else await page.goto(`${baseUrl}${screen.path}`, { waitUntil: 'networkidle', timeout: 20000 })
        if (screen.waitForPath) {
            await page.waitForURL((u) => u.pathname.endsWith(screen.waitForPath), { timeout: 15000 })
                .catch(() => { entry.navError = `fixture '${screen.fixture}' never reached ${screen.waitForPath} (at ${page.url()})` })
        }
        if (screen.prepare) await screen.prepare(page).catch((e) => { entry.navError = `prepare: ${e.message}` })
        if (screen.settle) await screen.settle(page).catch((e) => { entry.settleError = `settle: ${e.message}` })
        await waitForReady(page).catch((e) => { entry.settleError = entry.settleError ?? `ready: ${e.message}` })
        entry.finalUrl = page.url()
        await page.screenshot({ path: join(outDir, entry.screenshot), fullPage: false })
        const text = await page.evaluate(() => document.body?.innerText ?? '').catch(() => '')
        await writeFile(join(outDir, entry.domText), text.trim().slice(0, 8000), 'utf8')
        log(`  ${viewport}/${screen.name} → captured (${consoleErrors.length} console err, ${pageErrors.length} page err)`)
    } catch (err) {
        entry.navError = entry.navError ?? err.message
        log(`  ${viewport}/${screen.name} → nav error: ${err.message} (captured as observation)`)
        // Still try to grab whatever rendered so the reviewer sees the failure state.
        try { await page.screenshot({ path: join(outDir, entry.screenshot), fullPage: false }) } catch { /* ignore */ }
    } finally {
        await page.close().catch(() => {})
    }
    return entry
}

async function driveViewport(browser, baseUrl, viewport) {
    const dims = VIEWPORTS[viewport]
    const outDir = join(ARTIFACT_ROOT, viewport)
    await mkdir(outDir, { recursive: true })
    const entries = []
    for (let i = 0; i < SCREENS.length; i++) {
        // Fresh context per screen = genuine cold, first-time-player state
        // (no leaked onboarding/combat state between screens).
        const context = await browser.newContext(contextOptions(viewport))
        try {
            entries.push(await captureScreen(context, baseUrl, SCREENS[i], viewport, outDir, i))
        } finally {
            await context.close().catch(() => {})
        }
    }
    return { viewport, dims, outDir, screens: entries }
}

async function main() {
    const want = (process.env.CRITIQUE_VIEWPORT ?? 'mobile').toLowerCase()
    const viewports = want === 'both' ? ['mobile', 'desktop']
        : want === 'desktop' ? ['desktop'] : ['mobile']

    // Fresh artifacts each run so a stale screenshot never masquerades as
    // current — but only this driver's own paths (see ownArtifactPaths).
    for (const p of ownArtifactPaths(ARTIFACT_ROOT)) {
        await rm(p, { recursive: true, force: true }).catch(() => {})
    }
    await mkdir(ARTIFACT_ROOT, { recursive: true })

    runExpoExport()
    const { server, baseUrl } = await startStaticServer(EXPORT_DIR)
    log(`static server at ${baseUrl}`)

    let browser
    try {
        const { chromium } = await import('playwright')
        const launchOptions = { headless: true }
        if (process.env.CRITIQUE_DRIVE_CHROME) launchOptions.executablePath = process.env.CRITIQUE_DRIVE_CHROME
        browser = await chromium.launch(launchOptions)
    } catch (err) {
        console.error('critique-drive: browser launch failed —', err.message)
        console.error('critique-drive: run `npx playwright install chromium` first.')
        server.close()
        process.exit(3)
    }

    const passes = []
    try {
        for (const vp of viewports) {
            log(`=== driving critique screen set — ${vp} (${VIEWPORTS[vp].width}x${VIEWPORTS[vp].height}) ===`)
            passes.push(await driveViewport(browser, baseUrl, vp))
        }
    } finally {
        await browser.close().catch(() => {})
        server.close()
    }

    const manifest = {
        generatedAtNote: 'timestamp intentionally omitted — reviewer stamps at file time',
        transport: 'critique-drive (Phase 34, non-MCP subprocess)',
        exportDir: EXPORT_DIR,
        artifactRoot: ARTIFACT_ROOT,
        viewports: passes.map((p) => ({
            viewport: p.viewport, dims: p.dims, dir: p.outDir, screens: p.screens,
        })),
    }
    await writeFile(join(ARTIFACT_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')

    const total = passes.reduce((n, p) => n + p.screens.length, 0)
    const errored = passes.reduce((n, p) => n + p.screens.filter((s) => s.navError || s.pageErrors.length).length, 0)
    log(`ALL CAPTURED — ${total} screen(s) across ${passes.length} viewport(s); ${errored} with errors/nav trouble`)
    log(`artifacts → ${ARTIFACT_ROOT}  (read manifest.json, then the screenshots + .txt)`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((err) => {
        console.error('critique-drive: aborted —', err.message)
        process.exit(process.exitCode || 3)
    })
}
