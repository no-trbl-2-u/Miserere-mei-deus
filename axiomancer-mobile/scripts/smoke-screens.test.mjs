// scripts/smoke-screens.test.mjs
//
// Hermetic tests for the live hazard shot in `verify:visual` (phase B3e2):
// the `hazard-board` route's wiring, and `pickHazardRoute`, the step that
// picks the route and waits out the dice roll, driven against a fake page.
// The browser run itself only happens on a manual `verify:visual`.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ROUTES, pickHazardRoute, selectRoutes, settleDiceRoll } from './smoke-screens.mjs'

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
