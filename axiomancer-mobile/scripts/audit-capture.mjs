#!/usr/bin/env node
/**
 * Visual-audit screenshot capture (2026-06).
 *
 * Drives the static audit build (served by audit-serve.mjs) with
 * Playwright at iPhone-portrait 390x844 and captures the audit screen
 * set into a target dir. Mirrors smoke-screens.mjs viewport/reduced-
 * motion settings so captures are deterministic.
 *
 *   BASE_URL    server origin (default http://127.0.0.1:4173)
 *   CAPTURE_DIR output dir (default screenshots/audit-2026-06/after)
 *   ONLY        comma-separated screen ids to capture (default: all)
 *
 * Screens that need a specific game state are reached through the dev
 * menu (the export is built with BUILD_PROFILE=preview so dev tools are
 * enabled). Combat/encounter screens go through DebugTriggerEncounter /
 * DebugCombatButton.
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { injectMinigameSeeds } from './minigame-seed-injector.mjs'
import { openDevSection } from './dev-section.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(__dirname, '..')
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173'
const OUT = resolve(REPO, process.env.CAPTURE_DIR ?? 'screenshots/audit-2026-06/after')
const VIEWPORT = { width: 390, height: 844 }
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',').map((s) => s.trim())) : null

const log = (m) => console.log(`audit-capture: ${m}`)

/** Each screen: id, output filename, and an async drive(page) that
 *  leaves the page on the screen to shoot. */
const SCREENS = [
    { id: 'title', file: '00-title.png', drive: async (p) => { await goto(p, '/') } },
    { id: 'exploration', file: '01-exploration.png', drive: async (p) => { await goto(p, '/exploration') } },
    { id: 'character-top', file: '02-character-top.png', drive: async (p) => { await goto(p, '/character') } },
    {
        id: 'character-mid', file: '03-character-mid.png', drive: async (p) => {
            await goto(p, '/character')
            await p.mouse.move(195, 422)
            await p.mouse.wheel(0, 620)
            await settle(p, 500)
        },
    },
    { id: 'satchel', file: '04-satchel.png', drive: async (p) => { await goto(p, '/inventory') } },
    { id: 'memoir', file: '05-memoir.png', drive: async (p) => { await goto(p, '/memoir') } },
    {
        id: 'devart', file: 'enemy-art-gallery.png', fullPage: true, drive: async (p) => {
            await goto(p, '/devart')
            await settle(p, 800)
        },
    },
    {
        id: 'combat-prelude', file: '06-combat-prelude.png', drive: async (p) => {
            await triggerEncounter(p, 'encounter')
        },
    },
    {
        id: 'combat-fight', file: '07-combat-fight.png', drive: async (p) => {
            await enterFight(p) // round-1 stance picker (all three stances visible)
        },
    },
    {
        id: 'combat-do', file: '08-combat-do.png', drive: async (p) => {
            await enterFight(p)
            await tap(p, 'combat-stance-body')
            await settle(p, 700)
        },
    },
    {
        id: 'combat-let', file: '09-combat-let.png', drive: async (p) => {
            await enterFight(p)
            await tap(p, 'combat-stance-body')
            await tap(p, 'combat-action-attack')
            await settle(p, 900)
        },
    },
    {
        id: 'combat-round2', file: '10-combat-round2.png', drive: async (p) => {
            await enterFight(p)
            await playRound(p)
            await settle(p, 800)
        },
    },
    {
        id: 'combat-aftermath', file: '11-combat-aftermath.png', drive: async (p) => {
            await enterFight(p)
            // Play rounds until the victory panel surfaces (rat dies in ~2).
            for (let i = 0; i < 6; i++) {
                if (await isVisible(p, 'combat-victory-panel')) break
                await playRound(p)
            }
            await settle(p, 800)
        },
    },
    {
        id: 'boss-prelude', file: '12-boss-prelude.png', drive: async (p) => {
            await triggerEncounter(p, 'boss')
        },
    },
    {
        id: 'hazard', file: '13-hazard.png', drive: async (p) => {
            await goto(p, '/settings')
            await openDevMenu(p)
            await openDevSection(p, 'rewards', 'debug-hazard-button')
            await p.getByTestId('debug-hazard-button').click()
            await settle(p, 1600)
        },
    },
    // Minigames launched via their dedicated debug buttons (real beginX()
    // actions through the gates — like hazard), not the pending-event path.
    { id: 'rest', file: '16-rest.png', drive: (p) => debugLaunch(p, 'debug-rest-button', 1800) },
    { id: 'cache', file: '18-cache.png', drive: (p) => debugLaunch(p, 'debug-cache-button', 1800) },
    // Phase 61 retired the Quest Board minigame; its screenshot slot
    // (`25-quest-board.png`, driven via the since-deleted
    // `debug-quest-button`) goes with it. Phase 76 retired the Gathering
    // minigame the same way; its slot (`20-gathering.png`, driven via the
    // since-deleted `debug-gathering-button`) goes with it too — the
    // `gathering` node now grants items inline with no screen to capture.
    {
        id: 'dialogue', file: '19-dialogue.png', drive: async (p) => {
            // No map stages an NPC since R7e: the staged-dialogue fixture does.
            await goto(p, '/exploration?fixture=apprentice-staged-dialogue')
            await settle(p, 2400)
        },
    },
    // Paced narrative screens reached via <EventGate> (Phase 137 dedicated
    // routes) — seeded by the village/cutscene dev triggers.
    { id: 'village', file: '28-village.png', drive: (p) => triggerMinigame(p, 'village') },
    {
        id: 'cutscene', file: '29-cutscene.png', drive: async (p) => {
            await triggerMinigame(p, 'cutscene')
            // Reveal all lines (SKIP) so the full stacked scene is audited,
            // not just the first line. SKIP doesn't dismiss; advance does.
            if (await isVisible(p, 'cutscene-skip')) await tap(p, 'cutscene-skip')
            await settle(p, 700)
        },
    },
    {
        id: 'hazard-board', file: '14-hazard-board.png', drive: async (p) => {
            await goto(p, '/settings')
            await openDevMenu(p)
            await openDevSection(p, 'rewards', 'debug-hazard-button')
            await p.getByTestId('debug-hazard-button').click()
            await settle(p, 1600)
            // Dismiss the danger intro to reach the board, if present.
            const faceIt = p.getByText(/FACE IT/i)
            if (await faceIt.count().catch(() => 0)) {
                await faceIt.first().click().catch(() => {})
                await settle(p, 1400)
            }
        },
    },
]

/** Open the dev menu and click a dedicated debug-launch button (real
 *  beginX() action), then settle on the resulting minigame route. */
async function debugLaunch(page, testId, settleMs) {
    await goto(page, '/settings')
    await openDevMenu(page)
    await openDevSection(page, 'rewards', testId)
    const btn = page.getByTestId(testId)
    await btn.waitFor({ state: 'visible', timeout: 15000 })
    await btn.click()
    await settle(page, settleMs)
}

/** Open the dev menu and fire a trigger-encounter button, then settle on
 *  the resulting route (minigame intro / approach screen). */
async function triggerMinigame(page, kind) {
    await goto(page, '/settings')
    await openDevMenu(page)
    await openDevSection(page, 'encounters', `debug-trigger-encounter-${kind}`)
    const btn = page.getByTestId(`debug-trigger-encounter-${kind}`)
    await btn.waitFor({ state: 'visible', timeout: 15000 })
    await btn.click()
    await settle(page, 1600)
}

async function tap(page, testId, timeout = 12000) {
    const el = page.getByTestId(testId)
    await el.waitFor({ state: 'visible', timeout })
    await el.click()
}

async function isVisible(page, testId) {
    return page.getByTestId(testId).first().isVisible().catch(() => false)
}

/** Trigger a combat encounter and step through the reveal onto the board.
 *  2026-08-10: the ENGAGE/FLEE prelude modal is retired — triggering an
 *  encounter lands straight on the combat reveal, whose ENTER COMBAT is now
 *  the single commit gate. */
async function enterFight(page) {
    await triggerEncounter(page, 'encounter')
    await tap(page, 'combat-enter')
    await settle(page, 900)
}

/** Play one full round: pick BODY stance, ATTACK, resolve, continue. */
async function playRound(page) {
    if (await isVisible(page, 'combat-stance-body')) {
        await tap(page, 'combat-stance-body')
    }
    if (await isVisible(page, 'combat-action-attack')) {
        await tap(page, 'combat-action-attack')
    }
    await tap(page, 'combat-resolve-continue')
    await settle(page, 700)
}

async function triggerEncounter(page, kind) {
    await goto(page, '/settings')
    await openDevMenu(page)
    await openDevSection(page, 'encounters', `debug-trigger-encounter-${kind}`)
    const btn = page.getByTestId(`debug-trigger-encounter-${kind}`)
    await btn.waitFor({ state: 'visible', timeout: 15000 })
    await btn.click()
    // <CombatGate> pushes the live fight onto its own route.
    await page.waitForURL((url) => url.pathname.endsWith('/combat-encounter'), { timeout: 15000 })
    await page.getByTestId('combat-reveal').waitFor({ state: 'visible', timeout: 15000 })
    await settle(page, 1000)
}

async function goto(page, path) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    await settle(page, 700)
}

// Phase 132 extracted the inline DevMenu dropdown (the old
// `dev-menu-header` affordance) into a dedicated `/dev` route reached by
// the `settings-dev-tools-link` row at the foot of Settings. Callers `goto('/settings')`
// first; this taps the link and waits for the route before the Debug*
// buttons are queried.
async function openDevMenu(page) {
    const link = page.getByTestId('settings-dev-tools-link')
    await link.waitFor({ state: 'visible', timeout: 15000 })
    await link.click()
    await page.waitForURL((url) => url.pathname.endsWith('/dev'), { timeout: 10000 })
}

async function settle(page, ms) {
    // Let fonts + SVG paint; reduced-motion means no long animations.
    await page.waitForTimeout(ms)
}

async function main() {
    await mkdir(OUT, { recursive: true })
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
    })
    // Deterministic minigame seeds so re-captures are stable. An
    // optional THEME env forces the colour theme (the boot resolver
    // reads __AXM_THEME__ first) — used to showcase the theme system.
    const theme = process.env.THEME ?? null
    await injectMinigameSeeds(context, { theme })
    // A static web export can't surface `extra.devToolsEnabled` at runtime
    // (phase 47b: `web.output` moved to `"single"`) — the documented opt-in
    // (lib/buildProfile.ts) the dev-menu-reached screens below need. Inert
    // in real builds: nothing sets the global there.
    await context.addInitScript(() => { globalThis.__AXM_FORCE_DEV_TOOLS__ = true })
    const page = await context.newPage()
    const errors = []
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })

    let captured = 0
    for (const screen of SCREENS) {
        if (only && !only.has(screen.id)) continue
        try {
            log(`→ ${screen.id}`)
            await screen.drive(page)
            await page.screenshot({ path: resolve(OUT, screen.file), fullPage: screen.fullPage ?? false })
            captured++
        } catch (err) {
            console.error(`audit-capture: FAILED ${screen.id}: ${err.message}`)
        }
    }

    await browser.close()
    log(`captured ${captured} screen(s) → ${OUT}`)
    if (errors.length) {
        log(`console errors (${errors.length}):`)
        for (const e of errors.slice(0, 8)) console.log(`  ! ${e}`)
    }
}

main().catch((err) => { console.error(err); process.exit(1) })
