#!/usr/bin/env node
// scripts/fixture-gallery.mjs
//
// Fixture gallery — screenshots of the states a regular walkthrough
// rarely reaches (2026-09-08, docs/state-fixtures.md). Every entry boots
// the exported web build from an INLINE state fixture (no registry
// change needed to add one), optionally waits for the gate to push a
// route, optionally clicks through a step or two, and captures a
// 390×844 frame into screenshots/gallery/<name>.png. Not a diff gate —
// a browsing surface for humans and /critique.
//
// Usage:
//   node scripts/fixture-gallery.mjs                  # export + capture all
//   AXM_FORCE_EXPORT=1 node scripts/...       # re-export (else .smoke-dist is reused on a stamp hit)
//   ONLY=labyrinth-room,village-anvil ...             # subset by name
//   GALLERY_CHROME=/path/to/chrome ...                # custom browser binary
//
// Exit codes: 0 = every entry captured · 1 = one or more entries failed
// (still writes what it could) · 3 = boot failure (export/server/browser).

import { createServer } from 'node:http'
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { injectMinigameSeeds } from './minigame-seed-injector.mjs'
import { forceDevTools } from './fixture-injector.mjs'
import { ensureWebExport } from './lib/web-export.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const EXPORT_DIR = resolve(REPO_ROOT, '.smoke-dist')
const OUT_DIR = resolve(REPO_ROOT, 'screenshots/gallery')
const VIEWPORT = { width: 390, height: 844 }

const log = (m) => console.log(`fixture-gallery: ${m}`)

// ---------------------------------------------------------------------------
// The gallery. `fixture` is an inline StateFixture (or a registry id string);
// `path` is the cold URL; `waitForPath` the route a gate should push;
// `steps` click through to a deeper state; `waitFor` a testID that must be
// visible before the frame is taken.
// ---------------------------------------------------------------------------

const SAGE = { preset: 'sage' }
const coastal = (map, node) => ({ continent: 'coastal-continent', map, node, completedMaps: map === 'breakwater' ? [] : ['breakwater'] })

export const GALLERY = [
    // ── THE APORIA (labyrinth) ───────────────────────────────────────────
    // Entering an act fires the entrance narration (a paced event → /dialogue);
    // leaving it lands in the room.
    { name: 'labyrinth-entrance', why: 'Entering Act I of THE APORIA — the entrance narration.',
      fixture: { id: 'g-lab-entrance', seed: 'g9', ...SAGE, world: coastal('breakwater', 'bw-15') }, path: '/labyrinth',
      steps: [{ click: 'labyrinth-act-act1' }, { waitForPath: '/dialogue' }, { settle: 400 }] },
    { name: 'labyrinth-room', why: 'Inside Act I of THE APORIA — the room view.',
      fixture: { id: 'g-lab-room', seed: 'g9', ...SAGE, world: coastal('breakwater', 'bw-15') }, path: '/labyrinth',
      steps: [{ click: 'labyrinth-act-act1' }, { waitForPath: '/dialogue' }, { click: 'dialogue-leave' }, { waitFor: 'labyrinth-room' }, { settle: 600 }] },
    { name: 'labyrinth-map', why: 'The Act I map overlay.',
      fixture: { id: 'g-lab-map', seed: 'g10', ...SAGE, world: coastal('breakwater', 'bw-15') }, path: '/labyrinth',
      steps: [{ click: 'labyrinth-act-act1' }, { waitForPath: '/dialogue' }, { click: 'dialogue-leave' }, { waitFor: 'labyrinth-room' }, { click: 'labyrinth-map-toggle' }, { settle: 600 }] },

    // ── Minigames + services ─────────────────────────────────────────────
    { name: 'village-anvil', why: 'The village with its Anvil counter, on arrival.',
      fixture: 'wanderer-bw-blacksmith', path: '/exploration', waitForPath: '/village' },
    { name: 'blacksmith-intro', why: 'The forge, opened from the village counter.',
      fixture: 'wanderer-bw-blacksmith', path: '/exploration', waitForPath: '/village',
      steps: [{ jsClick: 'village-anvil' }, { waitForPath: '/blacksmith' }, { settle: 600 }] },
    { name: 'blacksmith-forging', why: 'The forge, mid-session (budget + card).',
      fixture: 'wanderer-bw-blacksmith', path: '/exploration', waitForPath: '/village',
      steps: [{ jsClick: 'village-anvil' }, { waitForPath: '/blacksmith' }, { jsClick: 'blacksmith-begin' }, { settle: 1500 }] },
    { name: 'village-remove-sheet', why: 'Card removal at the village card shop, the deck laid out to pick from.',
      fixture: 'wanderer-bw-blacksmith', path: '/exploration', waitForPath: '/village',
      steps: [{ jsClick: 'village-remove' }, { settle: 800 }] },
    { name: 'loot-cache', why: 'The loot-cache choice.',
      fixture: 'apprentice-bw-cache', path: '/exploration', waitForPath: '/cache' },
    { name: 'hazard-routes', why: 'Choosing a route — the safe crawl or the leap — hand fanned above.',
      fixture: 'l30-bw-hazard-arrive', path: '/exploration', waitForPath: '/hazard',
      steps: [{ settle: 1200 }] },
    { name: 'hazard-board', why: 'The hazard board after taking the safe route — play area + mana dice.',
      fixture: 'l30-bw-hazard-arrive', path: '/exploration', waitForPath: '/hazard',
      steps: [{ settle: 800 }, { clickText: 'TAKE SAFE ROUTE' }, { waitFor: 'hazard-board' }, { settle: 1000 }] },

    // ── Combat at the boss gate ──────────────────────────────────────────
    { name: 'boss-reveal', why: 'The Breakwater door fight — the REVEAL over the map.',
      fixture: { id: 'g-boss-reveal', seed: 'g12', ...SAGE, world: coastal('breakwater', 'bw-17'), arrive: true }, path: '/exploration',
      steps: [{ waitFor: 'combat-reveal' }, { settle: 600 }] },
    { name: 'boss-board', why: 'The live board against the boss, L15 kit.',
      fixture: { id: 'g-boss-board', seed: 'g12', ...SAGE, world: coastal('breakwater', 'bw-17'), arrive: true }, path: '/exploration',
      steps: [{ waitFor: 'combat-reveal' }, { click: 'combat-enter' }, { waitFor: 'combat-board' }, { settle: 1200 }] },

    // ── Late-game tabs ───────────────────────────────────────────────────
    { name: 'self-l50', why: 'SELF at L50 — every stat and relic slot filled.', fixture: { id: 'g-self-l50', seed: 'g13', preset: 'kid-l50' }, path: '/character' },
    { name: 'satchel-l50', why: 'SATCHEL at L50.', fixture: { id: 'g-satchel-l50', seed: 'g13', preset: 'kid-l50' }, path: '/inventory' },
    { name: 'hazard-deck-l30', why: 'The hazard deck sheet with a late kit.', fixture: { id: 'g-hdeck-l30', seed: 'g14', preset: 'kid-l30' }, path: '/hazard-deck' },
    { name: 'memoir-l15', why: 'THE LEDGER for a mid-campaign Sage.', fixture: { id: 'g-memoir', seed: 'g15', ...SAGE, world: coastal('charcoal-wood', 'cw-5') }, path: '/memoir' },

    // ── Dev-only panels that have no organic capture path ────────────────
    { name: 'aftermath-defeat', why: 'The DEFEAT aftermath panel.', fixture: 'fresh-start', path: '/devaftermath?panel=defeat', waitFor: 'devaftermath-panel' },
    { name: 'aftermath-parley', why: 'The PARLEY aftermath panel.', fixture: 'fresh-start', path: '/devaftermath?panel=parley', waitFor: 'devaftermath-panel' },
    { name: 'dev-menu', why: 'The /dev route.', fixture: 'sage-bw-door-gate', path: '/dev' },
]

// ---------------------------------------------------------------------------
// Export + static server (mirrors scripts/smoke-screens.mjs)
// ---------------------------------------------------------------------------

async function runExpoExport() {
    const r = await ensureWebExport({ outDir: EXPORT_DIR, log })
    if (!r.ok) { console.error('fixture-gallery: expo export failed'); process.exit(3) }
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' }

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
                const c = [await fileCandidate(filePath), await fileCandidate(join(filePath, 'index.html')), await fileCandidate(join(rootDir, pathname + '.html')), await fileCandidate(join(rootDir, 'index.html'))]
                const chosen = (c[0].exists && !c[0].dir && c[0].p) || (c[1].exists && !c[1].dir && c[1].p) || (c[2].exists && !c[2].dir && c[2].p) || c[3].p
                res.setHeader('content-type', MIME[extname(chosen)] ?? 'application/octet-stream')
                res.end(await readFile(chosen))
            } catch (err) { res.statusCode = 500; res.end(String(err)) }
        })
        server.listen(0, '127.0.0.1', () => resolveServer({ server, baseUrl: `http://127.0.0.1:${server.address().port}` }))
        server.on('error', rejectServer)
    })
}

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

async function runSteps(page, steps) {
    for (const step of steps) {
        if (step.click) await page.getByTestId(step.click).first().click({ timeout: 10000 })
        if (step.clickText) await page.getByText(step.clickText, { exact: false }).first().click({ timeout: 10000, force: true })
        // Some RN-web touchables sit under a transparent layer that swallows
        // pointer hit-testing; dispatch the click on the node itself.
        if (step.jsClick) await page.getByTestId(step.jsClick).first().evaluate((el) => el.click())
        if (step.waitForPath) await page.waitForURL((u) => u.pathname.endsWith(step.waitForPath), { timeout: 15000 })
        if (step.waitFor) await page.getByTestId(step.waitFor).first().waitFor({ state: 'visible', timeout: 15000 })
        if (step.settle) await page.waitForTimeout(step.settle)
    }
}

async function captureEntry(context, baseUrl, entry) {
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    try {
        await page.addInitScript((f) => { globalThis.__AXM_FIXTURE__ = f }, entry.fixture)
        await page.goto(`${baseUrl}${entry.path}`, { waitUntil: 'networkidle', timeout: 30000 })
        if (entry.waitForPath) await page.waitForURL((u) => u.pathname.endsWith(entry.waitForPath), { timeout: 15000 })
        if (entry.waitFor) await page.getByTestId(entry.waitFor).first().waitFor({ state: 'visible', timeout: 15000 })
        if (entry.steps) await runSteps(page, entry.steps)
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(700)
        const file = join(OUT_DIR, `${entry.name}.png`)
        await page.screenshot({ path: file, fullPage: false })
        return { name: entry.name, why: entry.why, file, finalUrl: page.url(), ok: true, errors }
    } catch (err) {
        const file = join(OUT_DIR, `${entry.name}.FAILED.png`)
        await page.screenshot({ path: file, fullPage: false }).catch(() => {})
        return { name: entry.name, why: entry.why, file, finalUrl: page.url(), ok: false, error: err.message, errors }
    } finally {
        await page.close().catch(() => {})
    }
}

async function main() {
    const only = process.env.ONLY ? new Set(process.env.ONLY.split(',').map((s) => s.trim())) : null
    const entries = only ? GALLERY.filter((e) => only.has(e.name)) : GALLERY
    await mkdir(OUT_DIR, { recursive: true })
    await runExpoExport()
    const { server, baseUrl } = await startStaticServer(EXPORT_DIR)
    let browser
    try {
        const { chromium } = await import('playwright')
        browser = await chromium.launch({ headless: true, executablePath: process.env.GALLERY_CHROME || undefined })
        const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: 'reduce' })
        await injectMinigameSeeds(context)
        await forceDevTools(context)
        const results = []
        for (const entry of entries) {
            const r = await captureEntry(context, baseUrl, entry)
            results.push(r)
            log(`${r.ok ? '✔' : '✖'} ${entry.name.padEnd(24)} ${r.finalUrl.replace(/http:\/\/[^/]+/, '')}${r.ok ? '' : ` — ${r.error}`}`)
        }
        await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify({ viewport: VIEWPORT, results }, null, 2))
        const failed = results.filter((r) => !r.ok).length
        log(`${results.length - failed}/${results.length} captured → ${OUT_DIR}`)
        process.exitCode = failed ? 1 : 0
    } catch (err) {
        console.error(`fixture-gallery: boot failure — ${err?.message ?? err}`)
        process.exitCode = 3
    } finally {
        if (browser) await browser.close().catch(() => {})
        server.close()
    }
}

// Run only as a script — `GALLERY` is also imported by contact-sheet builders.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
