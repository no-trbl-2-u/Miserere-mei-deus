#!/usr/bin/env node
// scripts/equipment-dock-drag-e2e.mjs
//
// The satchel dock's drag and drop, walked in a real browser on the web
// export, with the app store reading each result:
//
//   1. Two relics worn (Suppliant's Ring in RELIC I, Elementalist's Brooch in
//      RELIC II) and the Elementalist's Belt carried unworn.
//   2. Drag the Brooch from RELIC II onto RELIC I: the two swap.
//   3. Drag it from RELIC I back onto RELIC II: the loadout is as it began.
//   4. Drag the Belt from the satchel onto RELIC III: it is worn there.
//   5. Drag the Belt from RELIC III onto WEAPON: refused, the reason line
//      shows and nothing changes.
//   6. Drag the Belt from RELIC III onto the satchel list: taken off, only
//      RELIC III empties.
//   7. A tap on RELIC I still picks the row (the banner names it).
//
// The store is read from the React context value `{ store, actions }` by
// walking the fiber tree; staging writes `player` straight into it.
//
// Usage:
//   node scripts/equipment-dock-drag-e2e.mjs            # export (or reuse) + walk
//   DOCK_DRAG_SHOTS=<dir> node scripts/...               # also write screenshots there
//   DOCK_DRAG_SHOTS_ONLY=1                               # stage and shoot, no drags or asserts
//   AXM_FORCE_EXPORT=1                                   # re-export
//   DOCK_DRAG_CHROME=/path/to/chrome                     # custom browser binary
//
// The viewport is 360x800: at 360x640 the satchel list sits below the fold,
// so a drag from it needs the taller window.
//
// Exit codes: 0 = walk passed · 1 = assertion failed · 3 = boot failure.

import { createServer } from 'node:http'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureWebExport } from './lib/web-export.mjs'
import { waitForReady } from './lib/page-ready.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const EXPORT_DIR = resolve(process.env.DOCK_DRAG_EXPORT_DIR ?? resolve(REPO_ROOT, '.smoke-dist'))
const VIEWPORT = { width: 360, height: 800 }
const SHOTS_DIR = process.env.DOCK_DRAG_SHOTS ? resolve(process.env.DOCK_DRAG_SHOTS) : null
const SHOTS_ONLY = process.env.DOCK_DRAG_SHOTS_ONLY === '1'

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

const log = (msg) => console.log(`dock-drag-e2e: ${msg}`)
class WalkFailure extends Error {}
function check(cond, msg) {
    if (!cond) throw new WalkFailure(msg)
    log(`ok  ${msg}`)
}

// The three relics the walk uses, as the engine's relic library defines them.
const RING = {
    id: 'relic-disarming-plea', name: "Suppliant's Ring", category: 'equipment', slot: 'relic',
    description: 'Offer a foe that can be befriended the choice of mercy, once it is low enough.',
    statModifiers: [], grantsSignature: 'sig-disarming-plea', laneId: 'merciful', relicSource: 'elite',
}
const BROOCH = {
    id: 'relic-elementalist-brooch', name: "Elementalist's Brooch", category: 'equipment', slot: 'relic',
    description: "+5 Mind while worn. Turn the foe's own INFERNO into STORM; INFERNO that burns you too stays.",
    statModifiers: [{ stat: 'mind', value: 5 }], grantsSignature: 'sig-elementalist-brooch',
    laneId: 'elementalist', relicSource: 'quest',
}
const BELT = {
    id: 'relic-elementalist-belt', name: "Elementalist's Belt", category: 'equipment', slot: 'relic',
    description: '+5 Body while worn.', statModifiers: [{ stat: 'body', value: 5 }],
    grantsSignature: 'sig-elementalist-belt', laneId: 'elementalist', relicSource: 'quest',
}

async function fileCandidate(p) {
    try { const s = await stat(p); return { p, file: !s.isDirectory() } } catch { return { p, file: false } }
}

function startStaticServer(rootDir) {
    return new Promise((done, fail) => {
        const server = createServer(async (req, res) => {
            try {
                const url = new URL(req.url, 'http://localhost')
                let pathname = decodeURIComponent(url.pathname)
                if (pathname.endsWith('/')) pathname += 'index.html'
                const direct = join(rootDir, pathname)
                if (!direct.startsWith(rootDir)) { res.statusCode = 403; return res.end('forbidden') }
                const tries = [direct, join(direct, 'index.html'), join(rootDir, pathname + '.html'), join(rootDir, 'index.html')]
                let filePath = tries[3]
                for (const t of tries) { if ((await fileCandidate(t)).file) { filePath = t; break } }
                const data = await readFile(filePath)
                res.statusCode = 200
                res.setHeader('Content-Type', MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream')
                res.end(data)
            } catch (e) { res.statusCode = 500; res.end(String(e)) }
        })
        server.on('error', fail)
        server.listen(0, '127.0.0.1', () => done({ server, port: server.address().port }))
    })
}

/** Finds `{ store, actions }` on the React tree and parks it on `globalThis.__DOCK_WALK__`. */
async function grabStore(page) {
    const found = await page.evaluate(() => {
        const rootEl = document.getElementById('root') ?? document.body
        const key = Object.keys(rootEl).find((k) => k.startsWith('__reactContainer$'))
        const start = key ? rootEl[key] : null
        const stack = start ? [start] : []
        let seen = 0
        while (stack.length > 0 && seen < 200000) {
            const fiber = stack.pop()
            seen++
            const v = fiber?.memoizedProps?.value
            if (v && typeof v === 'object' && v.store && typeof v.store.getState === 'function' && v.actions) {
                globalThis.__DOCK_WALK__ = v
                return true
            }
            if (fiber?.sibling) stack.push(fiber.sibling)
            if (fiber?.child) stack.push(fiber.child)
        }
        return false
    })
    if (!found) throw new WalkFailure('the store context was not found on the React tree')
}

/** Puts `relics` (three positions, null for empty) on the player and carries `carried`. */
async function stage(page, relics, carried) {
    await page.evaluate(({ relics: r, carried: c }) => {
        const { store } = globalThis.__DOCK_WALK__
        const player = store.getState().player
        const others = player.inventory.filter((i) => !c.some((x) => x.id === i.id))
        store.setState({
            player: {
                ...player,
                inventory: [...others, ...c],
                equipment: { ...player.equipment, weapon: null, armor: null, relics: r },
            },
        })
    }, { relics, carried })
    await page.waitForTimeout(250)
}

async function relicIds(page) {
    return page.evaluate(() => {
        const rel = globalThis.__DOCK_WALK__.store.getState().player.equipment.relics ?? []
        return [0, 1, 2].map((i) => rel[i]?.id ?? null)
    })
}

async function centre(page, testId) {
    const box = await page.getByTestId(testId).first().boundingBox()
    if (!box) throw new WalkFailure(`no box for ${testId}`)
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Presses on `fromId`, moves in steps onto `toId`, optionally shoots mid-drag, releases. */
async function drag(page, fromId, toId, shotName) {
    const a = await centre(page, fromId)
    const b = await centre(page, toId)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    await page.mouse.move(a.x + 6, a.y + 6, { steps: 3 })
    await page.mouse.move(a.x + 16, a.y + 16, { steps: 3 })
    await page.mouse.move(b.x, b.y, { steps: 12 })
    await page.waitForTimeout(150)
    if (shotName) await shoot(page, shotName)
    await page.mouse.up()
    await page.waitForTimeout(300)
}

async function shoot(page, name) {
    if (!SHOTS_DIR) return
    await mkdir(SHOTS_DIR, { recursive: true })
    const file = join(SHOTS_DIR, `${name}.png`)
    await page.screenshot({ path: file })
    log(`shot ${file}`)
}

async function dismissCrashBanner(page) {
    const dismiss = page.getByText(/dismiss/i).first()
    if (await dismiss.isVisible().catch(() => false)) await dismiss.click().catch(() => undefined)
}

async function walk(page) {
    await grabStore(page)
    await stage(page, [RING, BROOCH, null], [RING, BROOCH, BELT])
    await shoot(page, 'dock-two-worn')
    check(JSON.stringify(await relicIds(page)) === JSON.stringify([RING.id, BROOCH.id, null]), 'staged: Ring in RELIC I, Brooch in RELIC II')
    if (SHOTS_ONLY) {
        await drag(page, 'dock-slot-relic-1', 'dock-slot-relic-0', 'dock-dragging-relic')
        return
    }

    await drag(page, 'dock-slot-relic-1', 'dock-slot-relic-0', 'dock-dragging-relic')
    check(JSON.stringify(await relicIds(page)) === JSON.stringify([BROOCH.id, RING.id, null]), 'Brooch dragged RELIC II -> RELIC I swaps with the Ring')

    await drag(page, 'dock-slot-relic-0', 'dock-slot-relic-1')
    check(JSON.stringify(await relicIds(page)) === JSON.stringify([RING.id, BROOCH.id, null]), 'Brooch dragged back RELIC I -> RELIC II')

    await page.getByTestId('inventory-scroll').first().evaluate((el) => { el.scrollTop = 0 })
    await drag(page, `item-card-${BELT.id}`, 'dock-slot-relic-2', 'satchel-dragging-belt')
    check(JSON.stringify(await relicIds(page)) === JSON.stringify([RING.id, BROOCH.id, BELT.id]), 'satchel Belt dragged onto RELIC III is worn there')

    await drag(page, 'dock-slot-relic-2', 'dock-slot-weapon')
    await shoot(page, 'dock-refused-weapon')
    const refusal = await page.getByTestId('dock-drop-refusal').first().textContent().catch(() => null)
    check(typeof refusal === 'string' && refusal.length > 0, `relic onto WEAPON is refused: "${refusal}"`)
    check(JSON.stringify(await relicIds(page)) === JSON.stringify([RING.id, BROOCH.id, BELT.id]), 'the refused drop changes nothing')

    await drag(page, 'dock-slot-relic-2', 'inventory-scroll')
    check(JSON.stringify(await relicIds(page)) === JSON.stringify([RING.id, BROOCH.id, null]), 'Belt dragged onto the satchel is taken off; only RELIC III empties')

    check(await page.getByTestId('slot-filter-banner').count() === 0, 'no drag fired a tap: no row is picked')

    await page.waitForTimeout(500)
    await page.getByTestId('dock-slot-relic-0').first().click()
    await page.waitForTimeout(300)
    const banner = await page.getByTestId('slot-filter-banner').first().textContent().catch(() => null)
    check(typeof banner === 'string' && banner.includes('RELIC I'), `a tap on RELIC I still picks the row (banner: "${banner}")`)
}

async function main() {
    let playwright
    try { playwright = await import('playwright') } catch {
        console.error('dock-drag-e2e: playwright is not installed'); process.exit(3)
    }
    const exp = await ensureWebExport({ outDir: EXPORT_DIR, log })
    if (!exp.ok) { console.error('dock-drag-e2e: expo export failed'); process.exit(3) }
    const { server, port } = await startStaticServer(EXPORT_DIR)
    let browser
    try {
        browser = await playwright.chromium.launch({ executablePath: process.env.DOCK_DRAG_CHROME || undefined })
        const context = await browser.newContext({ viewport: VIEWPORT })
        await context.addInitScript(() => { globalThis.__AXM_FORCE_DEV_TOOLS__ = true })
        const page = await context.newPage()
        const errors = []
        page.on('pageerror', (e) => errors.push(String(e)))
        await page.goto(`http://127.0.0.1:${port}/inventory`, { waitUntil: 'load' })
        await waitForReady(page, { timeout: 60_000 }).catch(() => undefined)
        await page.getByTestId('equipment-dock').first().waitFor({ timeout: 60_000 })
        await dismissCrashBanner(page)
        await walk(page)
        check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`)
        log('PASS')
    } catch (e) {
        if (e instanceof WalkFailure) { console.error(`dock-drag-e2e: FAIL: ${e.message}`); process.exitCode = 1 }
        else { console.error(`dock-drag-e2e: boot failure: ${e?.stack ?? e}`); process.exitCode = 3 }
    } finally {
        await browser?.close()
        server.close()
    }
}

main()
