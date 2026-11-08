// Shared entry into a live fight for browser-driven harnesses.
//
//   import { enterLiveFight } from './live-fight-entry.mjs'
//   await enterLiveFight(page, baseUrl, { seed: 16 })            // standard foe
//   await enterLiveFight(page, baseUrl, { seed: 16, kind: 'boss' })
//
// Boots the app on /character, opens /dev through the SELF tab's link, and
// presses `debug-trigger-encounter-<kind>`. `<CombatGate>` engages the fight
// and pushes `/combat-encounter`; this resolves once that route shows the
// combat reveal (or, with `intoBoard: true`, presses ENTER COMBAT and resolves
// once the board is up and its dice are at rest). The seed pins the engine through `__AXM_COMBAT_SEED__`,
// which the route honours in dev builds only, so the helper also sets the
// documented dev-tools opt-in (`__AXM_FORCE_DEV_TOOLS__`, lib/buildProfile.ts)
// that a static web export needs.
//
// Replaces the pre-v1 `/combat-encounter` dev sandbox (mock foe, demo deck),
// which tools used to cold-load directly; it was deleted in phase CR1a.
import { openDevSection } from './dev-section.mjs'
import { waitForReady } from './lib/page-ready.mjs'

/**
 * @param {import('playwright').Page} page
 * @param {string} baseUrl the static server's origin.
 * @param {{ seed?: number, kind?: string, timeout?: number, intoBoard?: boolean }} [options]
 *   `intoBoard` (default false) goes one step past the reveal: presses ENTER COMBAT,
 *   waits for `combat-board`, for the dice-skip layer to detach, then for the page to be ready.
 */
export async function enterLiveFight(page, baseUrl, options = {}) {
    const { seed, kind = 'encounter', timeout = 25000, intoBoard = false } = options
    await page.addInitScript((s) => {
        globalThis.__AXM_FORCE_DEV_TOOLS__ = true
        if (typeof s === 'number') globalThis.__AXM_COMBAT_SEED__ = s
    }, seed ?? null)
    await page.goto(`${baseUrl}/character`, { waitUntil: 'networkidle' })
    const link = page.getByTestId('self-dev-tools-link')
    await link.waitFor({ state: 'visible', timeout })
    await link.click()
    await page.waitForURL((url) => url.pathname.endsWith('/dev'), { timeout })
    await openDevSection(page, 'encounters', `debug-trigger-encounter-${kind}`, timeout)
    const trigger = page.getByTestId(`debug-trigger-encounter-${kind}`)
    await trigger.waitFor({ state: 'visible', timeout })
    await trigger.click({ force: true })
    await page.waitForURL((url) => url.pathname.endsWith('/combat-encounter'), { timeout })
    await page.getByTestId('combat-reveal').waitFor({ state: 'visible', timeout })
    if (!intoBoard) return
    await page.getByTestId('combat-enter').click({ timeout, force: true })
    await page.getByTestId('combat-board').waitFor({ state: 'visible', timeout })
    // The tray's tap-to-skip layer is mounted only while a die is tumbling;
    // attached then detached is the dice at rest (a motion-reduced run may
    // never mount it, so the attach wait is allowed to miss).
    const skip = page.getByTestId('combat-dice-skip')
    await skip.waitFor({ state: 'attached', timeout: 2000 }).catch(() => {})
    await skip.waitFor({ state: 'detached', timeout })
    // The dealt hand fades in (reanimated's entering animation runs on the web
    // as CSS animations, which reduced motion does not stop); a shot taken mid
    // fade is a few levels off per pixel and differs load to load.
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState === 'finished' || a.effect?.getComputedTiming().iterations === Infinity), null, { timeout })
    await waitForReady(page)
}
