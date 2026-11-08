// scripts/smoke-screens.test.mjs
//
// Hermetic tests for the live hazard shot in `verify:visual` (phase B3e2):
// the `hazard-board` route's wiring, and `pickHazardRoute`, the step that
// picks the route and waits out the dice roll, driven against a fake page.
// The browser run itself only happens on a manual `verify:visual`.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
    BOARD_PLACES, browserLaunchOptions, DIFF_THRESHOLD_RATIO, ROUTES, compareCapture, diffRatioFor, expectPlaces, isOverThreshold, loadRoute, pickHazardRoute, pixelDiffRatio, selectRoutes, settleDiceRoll,
} from './smoke-screens.mjs'

/** A page stand-in that records every locator call in order. */
function fakePage() {
    const calls = []
    return {
        calls,
        getByTestId(id) {
            return {
                click: async () => calls.push(['click', id]),
                waitFor: async (opts) => calls.push(['waitFor', id, opts.state]),
            }
        },
    }
}

test('the hazard-board shot boots the live hazard from its fixture and picks a route', () => {
    const route = ROUTES.find((r) => r.name === 'hazard-board')
    assert.ok(route, 'hazard-board is a visual route')
    // The injector's pinned hazard id keeps the three-round board on bw-m2 (HP6c).
    assert.equal(route.fixture, 'l30-bw-hazard-arrive')
    assert.equal(route.puzzleNode, undefined)
    assert.equal(route.waitForPath, '/hazard')
    assert.ok(route.hazardRoute === 'safe' || route.hazardRoute === 'risk')
})

test('a Breakwater hazard is shot as its puzzle: the stakes card, then the board after Face it', () => {
    const stakes = ROUTES.find((r) => r.name === 'hazard-puzzle-stakes')
    const board = ROUTES.find((r) => r.name === 'hazard-puzzle-node')
    assert.ok(stakes && board)
    for (const r of [stakes, board]) {
        assert.equal(r.fixture, 'l30-bw-hazard-arrive')
        assert.equal(r.waitForPath, '/hazard')
        assert.equal(r.hazardRoute, undefined)
        assert.equal(r.puzzleNode, true)
    }
    assert.equal(stakes.waitForTestId, 'hazard-stakes')
    assert.equal(board.hazardPuzzle, true)
})

test('only the live hazard shot picks a route', () => {
    for (const r of ROUTES.filter((x) => x.hazardRoute)) assert.equal(r.waitForPath, '/hazard', r.name)
})

test('the devpuzzle shots sit beside the live hazard shot', () => {
    const names = ROUTES.map((r) => r.name)
    for (const name of ['hazard-board', 'devpuzzle-list', 'devpuzzle-board', 'devpuzzle-outcome']) assert.ok(names.includes(name), name)
})

test('the devpuzzle list shot opens the bare route in the forced dev-tools context', () => {
    const list = ROUTES.find((r) => r.name === 'devpuzzle-list')
    assert.equal(list.path, '/devpuzzle')
    assert.equal(list.fixture, 'fresh-start')
})

test('pickHazardRoute clicks the route, then waits for the board and for the roll to settle', async () => {
    const page = fakePage()
    await pickHazardRoute(page, 'risk')
    assert.deepEqual(page.calls, [
        ['click', 'hazard-stakes-face'],
        ['click', 'hazard-route-risk'],
        ['waitFor', 'hazard-board', 'visible'],
        ['waitFor', 'hazard-dice-roll', 'hidden'],
    ])
})

test('the devpuzzle board shot waits out the opening roll; the outcome shot does not need to', () => {
    assert.equal(ROUTES.find((r) => r.name === 'devpuzzle-board').settleRoll, true)
    assert.equal(ROUTES.find((r) => r.name === 'devpuzzle-outcome').settleRoll, undefined)
})

test('settleDiceRoll waits for the roll overlay to hide', async () => {
    const page = fakePage()
    await settleDiceRoll(page)
    assert.deepEqual(page.calls, [['waitFor', 'hazard-dice-roll', 'hidden']])
})

test('selectRoutes keeps every route unless SMOKE_ONLY names some', () => {
    assert.equal(selectRoutes(ROUTES, undefined), ROUTES)
    assert.equal(selectRoutes(ROUTES, ''), ROUTES)
    assert.deepEqual(
        selectRoutes(ROUTES, 'devpuzzle-board, hazard-board').map((r) => r.name),
        ['hazard-board', 'devpuzzle-board'],
    )
})

test('selectRoutes throws on a route name it does not know', () => {
    assert.throws(() => selectRoutes(ROUTES, 'devpuzzle-board,no-such-shot'), /no-such-shot/)
})

test('the combat-board route is the reveal route\'s fight one click further, on a tighter line', () => {
    const reveal = ROUTES.find((r) => r.name === 'combat-encounter')
    const board = ROUTES.find((r) => r.name === 'combat-board')
    assert.equal(board.path, reveal.path)
    assert.equal(board.liveFight, true)
    assert.equal(board.intoBoard, true)
    assert.equal(reveal.intoBoard, undefined)
    // The literal ids, read off the board: a rename in the app fails here, not silently.
    const places = [
        'combat-intent', 'combat-conviction', 'combat-momentum-v2', 'combat-rail',
        'combat-end-phase', 'combat-player-medallion', 'combat-rail-vitae-bar',
    ]
    assert.deepEqual(BOARD_PLACES, places)
    assert.deepEqual(board.expectTestIds, places)
})

test('a route may carry its own diff ratio; only combat-board does, at 0.1%', () => {
    assert.equal(diffRatioFor(ROUTES.find((r) => r.name === 'combat-board')), 0.001)
    for (const r of ROUTES.filter((x) => x.name !== 'combat-board')) assert.equal(diffRatioFor(r), DIFF_THRESHOLD_RATIO, r.name)
    assert.equal(DIFF_THRESHOLD_RATIO, 0.005)
})

test('a diff between the two ratios flags the board and not another route', () => {
    // 1,000 of the 329,160 pixels in a 390x844 shot: 0.3%, between 0.1% and 0.5%.
    const ratio = pixelDiffRatio(390, 844, 1000)
    const flagged = (name) => isOverThreshold(ratio, diffRatioFor(ROUTES.find((r) => r.name === name)))
    assert.equal(flagged('combat-board'), true)
    assert.equal(flagged('combat-encounter'), false)
    assert.equal(flagged('character'), false)
})

test('expectPlaces waits on every testID in order, and a missing one rejects', async () => {
    const waited = []
    const page = { getByTestId: (id) => ({ first: () => ({ waitFor: async (o) => { waited.push([id, o.state]); if (id === 'gone') throw new Error('timeout') } }) }) }
    await expectPlaces(page, ['a', 'b'])
    assert.deepEqual(waited, [['a', 'visible'], ['b', 'visible']])
    await expectPlaces(page, undefined)
    await assert.rejects(expectPlaces(page, ['a', 'gone', 'c']), /timeout/)
    assert.deepEqual(waited.map((w) => w[0]), ['a', 'b', 'a', 'gone'])
})

// A pixel diff and a PNG class that touch no disk: the diff count is whatever the stub says.
const stubDeps = (diffPixels) => ({
    PNG: class { constructor({ width, height }) { this.width = width; this.height = height; this.data = new Uint8Array(0) } },
    pixelmatch: () => diffPixels,
})
const shot = (width, height) => ({ width, height, data: new Uint8Array(0) })

test('compareCapture flags combat-board and not another route at a ratio between 0.1% and 0.5%', () => {
    const deps = stubDeps(1000) // 1,000 of 329,160 px: 0.30%
    const board = compareCapture(ROUTES.find((r) => r.name === 'combat-board'), shot(390, 844), shot(390, 844), deps)
    assert.equal(board.kind, 'pixel-diff')
    assert.ok(board.ratio > 0.001 && board.ratio < 0.005)
    for (const name of ['combat-encounter', 'character']) {
        const other = compareCapture(ROUTES.find((r) => r.name === name), shot(390, 844), shot(390, 844), deps)
        assert.equal(other.kind, 'matched', name)
    }
})

test('compareCapture matches under the board line, and reports a size change before any diff', () => {
    const board = ROUTES.find((r) => r.name === 'combat-board')
    assert.equal(compareCapture(board, shot(390, 844), shot(390, 844), stubDeps(300)).kind, 'matched') // 0.09%
    assert.equal(compareCapture(board, shot(390, 844), shot(390, 844), stubDeps(0)).kind, 'matched')
    const sized = compareCapture(board, shot(390, 844), shot(390, 900), stubDeps(0))
    assert.equal(sized.kind, 'size-mismatch')
    assert.match(sized.message, /390x844 vs current 390x900/)
})

// A page that records what it is asked and never touches a browser.
function recordingPage(log) {
    const locator = (id) => {
        const l = {
            first: () => l,
            waitFor: async (o) => { log.push(`waitFor ${id} ${o?.state ?? ''}`.trim()) },
            click: async () => { log.push(`click ${id}`) },
        }
        return l
    }
    return {
        getByTestId: locator,
        goto: async (u) => { log.push(`goto ${u}`) },
        waitForURL: async () => {},
        waitForFunction: async () => { log.push('ready') },
        evaluate: async () => {},
    }
}

test('loadRoute enters the board with intoBoard and waits for every place before the shot', async () => {
    const log = []
    const enter = async (_page, _base, opts) => { log.push(`enter ${JSON.stringify(opts)}`) }
    await loadRoute(recordingPage(log), 'http://x', ROUTES.find((r) => r.name === 'combat-board'), { enter })
    assert.equal(log[0], 'enter {"seed":16,"intoBoard":true}')
    const waited = log.filter((l) => l.startsWith('waitFor ')).map((l) => l.split(' ')[1])
    assert.deepEqual(waited, BOARD_PLACES)
    assert.equal(log.at(-1), 'ready') // painted again after the place waits
})

test('loadRoute stops at the reveal for combat-encounter and loads a plain route by URL', async () => {
    const log = []
    const enter = async (_page, _base, opts) => { log.push(`enter ${JSON.stringify(opts)}`) }
    await loadRoute(recordingPage(log), 'http://x', ROUTES.find((r) => r.name === 'combat-encounter'), { enter })
    assert.equal(log[0], 'enter {"seed":16,"intoBoard":false}')
    assert.equal(log.some((l) => l.startsWith('waitFor ')), false)
    const plain = []
    await loadRoute(recordingPage(plain), 'http://x', ROUTES.find((r) => r.name === 'character'), { enter })
    assert.equal(plain[0], 'goto http://x/character')
})

test('loadRoute rejects when a place never shows, so the route is load-failed and not stamped', async () => {
    const page = recordingPage([])
    const real = page.getByTestId
    page.getByTestId = (id) => (id === 'combat-conviction'
        ? { first: () => ({ waitFor: async () => { throw new Error('Timeout 10000ms exceeded') } }) }
        : real(id))
    await assert.rejects(
        loadRoute(page, 'http://x', ROUTES.find((r) => r.name === 'combat-board'), { enter: async () => {} }),
        /Timeout/,
    )
})

test('the harness browser launches with full-tile raster, so the board shoots the same every load', () => {
    const options = browserLaunchOptions({})
    assert.ok(options.args.includes('--disable-partial-raster'))
    assert.equal(options.headless, true)
    assert.equal(options.executablePath, undefined)
    assert.equal(browserLaunchOptions({ SMOKE_CHROME: '/opt/chrome' }).executablePath, '/opt/chrome')
    assert.ok(browserLaunchOptions({ SMOKE_CHROME: '/opt/chrome' }).args.includes('--disable-partial-raster'))
})
