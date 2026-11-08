// guard-test: pins 158.1's merged board-entry steps (intoBoard), which had no test; review finding on #1457
// scripts/live-fight-entry.test.mjs
//
// The live-fight entry, driven by a page that only records. No browser, disk or network.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { enterLiveFight } from './live-fight-entry.mjs'

function recordingPage(log) {
    const locator = (id) => {
        const l = {
            first: () => l,
            isVisible: async () => true,
            getAttribute: async () => 'true',
            waitFor: async (o) => { log.push(`waitFor ${id} ${o?.state ?? ''}`.trim()) },
            click: async () => { log.push(`click ${id}`) },
        }
        return l
    }
    return {
        addInitScript: async () => {},
        goto: async () => {},
        getByTestId: locator,
        waitForURL: async () => {},
        waitForFunction: async () => { log.push('waitForFunction') },
        evaluate: async () => {},
    }
}

test('with intoBoard off it resolves on the reveal and presses nothing past the trigger', async () => {
    const log = []
    await enterLiveFight(recordingPage(log), 'http://x', { seed: 16 })
    assert.equal(log.at(-1), 'waitFor combat-reveal visible')
    assert.equal(log.includes('click combat-enter'), false)
    assert.equal(log.some((l) => l.includes('combat-board') || l.includes('combat-dice-skip')), false)
    assert.equal(log.includes('waitForFunction'), false)
})

test('with intoBoard on it presses ENTER COMBAT, waits for the board, the dice layer to detach, then ready', async () => {
    const log = []
    await enterLiveFight(recordingPage(log), 'http://x', { seed: 16, intoBoard: true })
    const at = (entry) => log.indexOf(entry)
    assert.ok(at('waitFor combat-reveal visible') >= 0)
    assert.ok(at('click combat-enter') > at('waitFor combat-reveal visible'))
    assert.ok(at('waitFor combat-board visible') > at('click combat-enter'))
    assert.ok(at('waitFor combat-dice-skip detached') > at('waitFor combat-board visible'))
    // The animation settle and the ready wait come after the dice layer is gone.
    assert.ok(log.indexOf('waitForFunction') > at('waitFor combat-dice-skip detached'))
    assert.equal(log.at(-1), 'waitForFunction')
})
