#!/usr/bin/env node
// scripts/fresh-eyes-capture.mjs — THROWAWAY driver for the 2026-09-12 UI
// fresh-eyes sweep (archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/2026-09-12-ui-fresh-eyes.prompt.md §3.3.4).
// Delete before the final commit.
//
// Purpose: capture every route in §3.2 at both viewports in one pass —
// screenshot, DOM innerText, console errors, page errors, final URL — so the
// §10 Observe fleet has evidence for every (route × viewport) cell and the
// §3.4 coverage ledger can be generated rather than remembered.
//
// It DRIVES + CAPTURES. It never judges. A route that bounces, blanks, or
// throws is captured as-is: that is an observation, not a driver failure.
//
// Inputs (env):
//   BASE_URL   — where the export is served (default http://127.0.0.1:8081)
//   OUT        — artifact root (default .critique-artifacts-fresh-eyes/before).
//                NOT under .critique-artifacts/: `npm run critique:drive` wipes
//                that whole directory on start (critique-drive.mjs:318), which
//                deleted a full before/after set mid-sweep.
//   ONLY       — comma-separated screen names to capture (default: all)
// Outputs: <OUT>/<viewport>/NN-<name>.png + .txt, and <OUT>/manifest.json

import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { enterLiveFight } from './live-fight-entry.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(__dirname, '..')
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:8081'
const OUT = resolve(REPO, process.env.OUT ?? '.critique-artifacts-fresh-eyes/before')
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  desktop: { width: 1280, height: 800 },
}

// One row per §3.2 route. `fixture` boots a known state (docs/state-fixtures.md);
// `waitFor` is the route the gate should push us to; `prepare` is a best-effort
// interaction to reach a downstream state.
const SCREENS = [
  { name: 'title', path: '/' },
  {
    name: 'onboarding', path: '/',
    prepare: async (p) => {
      await p.getByRole('button').first().click({ timeout: 5000, force: true }).catch(() => {})
      await p.waitForTimeout(1200)
    },
  },
  { name: 'exploration-fresh', path: '/exploration', fixture: 'fresh-start' },
  { name: 'exploration-midgame', path: '/exploration', fixture: 'sage-bw-door-gate' },
  { name: 'character-fresh', path: '/character', fixture: 'fresh-start' },
  { name: 'character-midgame', path: '/character', fixture: 'sage-bw-door-gate' },
  { name: 'inventory-fresh', path: '/inventory', fixture: 'fresh-start' },
  { name: 'inventory-midgame', path: '/inventory', fixture: 'sage-bw-door-gate' },
  { name: 'memoir-fresh', path: '/memoir', fixture: 'fresh-start' },
  { name: 'memoir-midgame', path: '/memoir', fixture: 'sage-bw-door-gate' },
  // The live fight: entered through /dev's encounter trigger (live-fight-entry.mjs).
  { name: 'combat-preview', path: '/combat-encounter', seed: 16, liveFight: true },
  {
    name: 'combat-board', path: '/combat-encounter', seed: 16, liveFight: true,
    prepare: async (p) => {
      await p.getByTestId('combat-enter').click({ timeout: 8000, force: true }).catch(() => {})
      await p.getByTestId('combat-board').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
    },
  },
  { name: 'dialogue', path: '/exploration', fixture: 'apprentice-staged-dialogue', waitFor: '/dialogue' },
  { name: 'village', path: '/exploration', fixture: 'wanderer-staged-village', waitFor: '/village' },
  { name: 'cutscene', path: '/exploration', fixture: 'wanderer-staged-cutscene', waitFor: '/cutscene' },
  { name: 'rest', path: '/exploration', fixture: 'apprentice-bw-rest', waitFor: '/rest' },
  { name: 'rest-broke', path: '/exploration', fixture: 'broke-l1-bw-rest', waitFor: '/rest' },
  { name: 'cache', path: '/exploration', fixture: 'apprentice-bw-cache', waitFor: '/cache' },
  { name: 'village-anvil', path: '/exploration', fixture: 'wanderer-bw-blacksmith', waitFor: '/village' },
  {
    name: 'blacksmith', path: '/exploration', fixture: 'wanderer-bw-blacksmith', waitFor: '/village',
    prepare: async (p) => {
      await p.getByTestId('village-anvil').click({ timeout: 8000, force: true }).catch(() => {})
      await p.waitForURL((u) => u.pathname.includes('/blacksmith'), { timeout: 8000 }).catch(() => {})
    },
  },
  { name: 'hazard', path: '/exploration', fixture: 'l30-bw-hazard-arrive', waitFor: '/hazard' },
  { name: 'hazard-deck', path: '/hazard-deck', fixture: 'l30-bw-hazard' },
  { name: 'event', path: '/event', fixture: 'sage-bw-door-gate' },
  { name: 'labyrinth', path: '/labyrinth', fixture: 'sage-bw-door-gate' },
  { name: 'dev', path: '/dev', fixture: 'fresh-start' },
  { name: 'devaftermath', path: '/devaftermath', fixture: 'fresh-start' },
  { name: 'devart', path: '/devart', fixture: 'fresh-start' },
  { name: 'devart-rooms', path: '/devart/rooms', fixture: 'fresh-start' },
]

/** Capture one screen in one viewport. Never throws for screen-level trouble. */
async function capture(browser, screen, vpName, index) {
  const consoleErrors = []
  const consoleWarnings = []
  const pageErrors = []
  const context = await browser.newContext({ viewport: VIEWPORTS[vpName] })
  // Dev tools + fixture are read from globals at boot (state/fixtures.ts).
  await context.addInitScript(({ fixture, seed }) => {
    globalThis.__AXM_FORCE_DEV_TOOLS__ = true
    globalThis.__AXM_DEV_TOOLS__ = true
    if (fixture) globalThis.__AXM_FIXTURE__ = fixture
    if (seed != null) globalThis.__AXM_COMBAT_SEED__ = seed
  }, { fixture: screen.fixture ?? null, seed: screen.seed ?? null })

  const page = await context.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 500))
    if (m.type() === 'warning') consoleWarnings.push(m.text().slice(0, 300))
  })
  page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 500)))

  const idx = String(index + 1).padStart(2, '0')
  const base = `${idx}-${screen.name}`
  const entry = {
    name: screen.name, path: screen.path, viewport: vpName,
    fixture: screen.fixture ?? null,
    screenshot: `${vpName}/${base}.png`, domText: `${vpName}/${base}.txt`,
    finalUrl: null, navError: null, consoleErrors, consoleWarnings, pageErrors,
  }

  try {
    const url = `${BASE}${screen.path}${screen.fixture ? `?fixture=${screen.fixture}` : ''}`
    if (screen.liveFight) await enterLiveFight(page, BASE, { seed: screen.seed })
    else await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2200)
    if (screen.waitFor) {
      await page.waitForURL((u) => u.pathname.includes(screen.waitFor), { timeout: 12000 }).catch(() => {})
    }
    if (screen.prepare) await screen.prepare(page).catch(() => {})
    await page.waitForTimeout(900)
    entry.finalUrl = page.url()
    await page.screenshot({ path: join(OUT, vpName, `${base}.png`), fullPage: true })
    const text = await page.evaluate(() => document.body?.innerText ?? '')
    const testIds = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid]')].map((el) => el.getAttribute('data-testid')))
    await writeFile(
      join(OUT, vpName, `${base}.txt`),
      `# ${screen.name} @ ${vpName}\n# url: ${entry.finalUrl}\n# fixture: ${entry.fixture ?? 'none'}\n\n` +
      `## innerText\n${text}\n\n## testIds\n${testIds.join('\n')}\n`,
      'utf8',
    )
  } catch (err) {
    entry.navError = String(err?.message ?? err).slice(0, 500)
  } finally {
    await context.close().catch(() => {})
  }
  console.log(`  ${vpName}/${base} -> ${entry.finalUrl ?? entry.navError}`)
  return entry
}

const screens = ONLY ? SCREENS.filter((s) => ONLY.has(s.name)) : SCREENS
for (const vp of Object.keys(VIEWPORTS)) await mkdir(join(OUT, vp), { recursive: true })

// The container ships prebuilt Chromiums under /opt/pw-browsers that may not
// match this Playwright's pinned revision; FRESH_EYES_CHROME points at one.
const browser = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: process.env.FRESH_EYES_CHROME || undefined,
})
const manifest = { baseUrl: BASE, viewports: VIEWPORTS, screens: [] }
for (const vp of Object.keys(VIEWPORTS)) {
  console.log(`fresh-eyes-capture: ${vp}`)
  for (const [i, s] of screens.entries()) manifest.screens.push(await capture(browser, s, vp, i))
}
await browser.close()
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
console.log(`fresh-eyes-capture: wrote ${manifest.screens.length} entries to ${OUT}`)
