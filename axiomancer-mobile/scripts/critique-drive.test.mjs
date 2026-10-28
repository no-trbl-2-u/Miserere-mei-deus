// axiomancer-mobile/scripts/critique-drive.test.mjs — phase 94: the artifact
// cleanup must be scoped to this driver's own output paths, never the whole
// `.critique-artifacts/` root (AUDIT.md [3.2] — a shared-directory wipe
// destroyed an unrelated 54-cell fresh-eyes capture set on 2026-09-12).
//
//   node --test axiomancer-mobile/scripts/critique-drive.test.mjs
//
// This only imports the pure path-list helper; the guarded `main()` (browser
// launch + expo export) never runs under `node --test` because the module
// only self-invokes when executed directly (`process.argv[1]` check).

import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'

import { ownArtifactPaths } from './critique-drive.mjs'

test('ownArtifactPaths is exactly mobile/desktop/manifest.json under the root', () => {
    const root = '/tmp/fake-critique-artifacts'
    const paths = ownArtifactPaths(root)
    assert.deepEqual(paths.sort(), [
        join(root, 'desktop'),
        join(root, 'manifest.json'),
        join(root, 'mobile'),
    ].sort())
})

test('ownArtifactPaths never returns the root itself or an unrelated subtree', () => {
    const root = '/tmp/fake-critique-artifacts'
    const paths = ownArtifactPaths(root)
    assert.ok(!paths.includes(root))
    assert.ok(!paths.some((p) => p.endsWith('fresh-eyes')))
})

// CRITIQUE pass 79/83: a flat 700ms pause caught the title mid-intro and the
// combat board mid dice-roll. The screens with a timed entrance wait on a
// settle signal before the pause.
test('the title, onboarding and combat-board screens wait for their entrance to finish', async () => {
    const { SCREENS, titleSettled, diceSettled } = await import('./critique-drive.mjs')
    const byName = Object.fromEntries(SCREENS.map((s) => [s.name, s]))
    assert.equal(byName.title.settle, titleSettled)
    assert.equal(byName['combat-board'].settle, diceSettled)
    assert.match(String(byName.onboarding.prepare), /titleSettled\(page\)/)
})

// CRITIQUE pass 98/99: the ready flag is set once at boot, so a screen reached
// after boot (the menu after EMBARK, a gate-pushed hazard) waits on its own
// entrance, and the hub is reached through a fresh game, not a saveless bounce.
test('the menu, the hazard routes and the hub are captured after their entrance', async () => {
    const { SCREENS, menuSettled } = await import('./critique-drive.mjs')
    const byName = Object.fromEntries(SCREENS.map((s) => [s.name, s]))
    assert.equal(byName.onboarding.settle, menuSettled)
    assert.equal(typeof byName.hazard.settle, 'function')
    assert.equal(byName['exploration-hub'].fixture, 'fresh-start')
    assert.match(String(byName['exploration-hub'].prepare), /cutscene-skip/)
})

test('entranceSettled waits on the named root, polling until two idle reads in a row', async () => {
    const { entranceSettled } = await import('./critique-drive.mjs')
    const calls = []
    const page = {
        getByTestId: (id) => ({ first: () => ({ waitFor: async (o) => { calls.push(['attached', id, o.state]) } }) }),
        waitForFunction: async (_fn, arg, o) => { calls.push(['fn', arg, o.polling]) },
    }
    await entranceSettled('hazard-route-select')(page)
    assert.deepEqual(calls, [['attached', 'hazard-route-select', 'attached'], ['fn', 'hazard-route-select', 100]])
})

// CRITIQUE pass 92: the mobile context must report a touch pointer, or the
// map's gesture line (and any later pointer-keyed copy) captures as desktop.
test('the mobile context is a touch device and the desktop context keeps the mouse', async () => {
    const { contextOptions } = await import('./critique-drive.mjs')
    assert.deepEqual(contextOptions('mobile'), {
        viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true,
    })
    assert.deepEqual(contextOptions('desktop'), {
        viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false,
    })
})

// CRITIQUE pass 100: the hazard capture was unseeded, so mobile and desktop
// (and pass against pass) played different hazards. Every screen's context
// carries the shared minigame seeds.
test('every screen context pins the shared minigame seeds', async () => {
    const { openScreenContext } = await import('./critique-drive.mjs')
    const { DEFAULT_MINIGAME_SEEDS } = await import('./minigame-seed-injector.mjs')
    const scripts = []
    const browser = {
        newContext: async (opts) => ({ opts, addInitScript: async (fn, arg) => { scripts.push(arg) } }),
    }
    for (const vp of ['mobile', 'desktop']) {
        const context = await openScreenContext(browser, vp)
        assert.equal(context.opts.viewport.width, vp === 'mobile' ? 375 : 1280)
    }
    assert.equal(scripts.length, 2)
    for (const arg of scripts) {
        assert.equal(arg.minigameSeeds.hazard.seed, DEFAULT_MINIGAME_SEEDS.hazard.seed)
    }
})

// CRITIQUE pass 103-107: /cache, the satchel, /quest and /death-return shipped
// and four passes never saw them. Each is reached through a real door.
test('the cache, satchel, quest and death-return screens are in the set', async () => {
    const { SCREENS } = await import('./critique-drive.mjs')
    const byName = Object.fromEntries(SCREENS.map((s) => [s.name, s]))
    assert.equal(byName.cache.fixture, 'apprentice-bw-cache')
    assert.equal(byName.cache.waitForPath, '/cache')
    assert.equal(byName.satchel.path, '/inventory')
    assert.equal(typeof byName.satchel.fixture, 'string')
    assert.equal(byName.quest.fixture, 'apprentice-staged-quest')
    assert.equal(byName.quest.waitForPath, '/quest')
    assert.equal(byName['death-return'].path, '/death-return?preview=1')
    assert.equal(byName['death-return'].devTools, true)
})
