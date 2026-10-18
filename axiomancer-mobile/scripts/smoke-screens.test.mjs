// scripts/smoke-screens.test.mjs
//
// Hermetic tests for the live hazard shot in `verify:visual` (phase B3e2):
// the `hazard-board` route's wiring, and `pickHazardRoute`, the step that
// picks the route and waits out the dice roll, driven against a fake page.
// The browser run itself only happens on a manual `verify:visual`.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ROUTES, pickHazardRoute } from './smoke-screens.mjs'

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
    assert.equal(route.fixture, 'l30-bw-hazard-arrive')
    assert.equal(route.waitForPath, '/hazard')
    assert.ok(route.hazardRoute === 'safe' || route.hazardRoute === 'risk')
})

test('only the live hazard shot picks a route', () => {
    for (const r of ROUTES.filter((x) => x.hazardRoute)) assert.equal(r.waitForPath, '/hazard', r.name)
})

test('the devpuzzle shots sit beside the live hazard shot', () => {
    const names = ROUTES.map((r) => r.name)
    for (const name of ['hazard-board', 'devpuzzle-board', 'devpuzzle-outcome']) assert.ok(names.includes(name), name)
})

test('pickHazardRoute clicks the route, then waits for the board and for the roll to settle', async () => {
    const page = fakePage()
    await pickHazardRoute(page, 'risk')
    assert.deepEqual(page.calls, [
        ['click', 'hazard-route-risk'],
        ['waitFor', 'hazard-board', 'visible'],
        ['waitFor', 'hazard-dice-roll', 'hidden'],
    ])
})
