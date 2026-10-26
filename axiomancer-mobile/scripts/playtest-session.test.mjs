// axiomancer-mobile/scripts/playtest-session.test.mjs: phase PH1a, the session
// tool's argument parsing and session record. The session process itself
// (browser, servers) is proven by `npm run e2e:playtest-sessions`.
//
//   node --test axiomancer-mobile/scripts/playtest-session.test.mjs

import assert from 'node:assert/strict'
import test from 'node:test'
import { join, resolve } from 'node:path'

import {
    buildSessionRecord,
    callerPath,
    COMMANDS,
    defaultShotPath,
    parseArgs,
    recordPath,
    sessionContextOptions,
    startOptions,
} from './playtest-session.mjs'

test('parseArgs splits the command, the agent, positionals and flags', () => {
    assert.deepEqual(parseArgs(['tap', '--agent', 'pt1', 'combat-enter']), {
        cmd: 'tap', agent: 'pt1', positional: ['combat-enter'], flags: {},
    })
    assert.deepEqual(parseArgs(['drag', 'hazard-hand-1', '--agent', 'pt2', 'hazard-play-area']), {
        cmd: 'drag', agent: 'pt2', positional: ['hazard-hand-1', 'hazard-play-area'], flags: {},
    })
    assert.deepEqual(parseArgs(['log', '--agent', 'pt1', '--tail', '5', '--domains', 'combat,rng']).flags, {
        tail: '5', domains: 'combat,rng',
    })
    assert.deepEqual(parseArgs(['tap', '--agent', 'pt1', '--force', 'x']).flags, { force: true })
    assert.deepEqual(parseArgs(['prepare']), { cmd: 'prepare', agent: null, positional: [], flags: {} })
})

test('parseArgs takes an optional shot path', () => {
    assert.deepEqual(parseArgs(['shot', '--agent', 'pt1']).positional, [])
    assert.deepEqual(parseArgs(['shot', '--agent', 'pt1', 'out/a.png']).positional, ['out/a.png'])
    assert.throws(() => parseArgs(['shot', '--agent', 'pt1', 'a.png', 'b.png']), /0 to 1 argument/)
})

test('parseArgs rejects unknown commands, missing agents, bad names and wrong arity', () => {
    assert.throws(() => parseArgs(['click', '--agent', 'pt1']), /unknown command 'click'/)
    assert.throws(() => parseArgs([]), /unknown command ''/)
    assert.throws(() => parseArgs(['goto', '/character']), /needs --agent/)
    assert.throws(() => parseArgs(['goto', '--agent', '../etc', '/x']), /bad agent name/)
    assert.throws(() => parseArgs(['tap', '--agent', 'pt1']), /takes 1 argument/)
    assert.throws(() => parseArgs(['start', '--agent']), /--agent needs a value/)
})

test('every command but prepare needs an agent', () => {
    for (const [cmd, spec] of Object.entries(COMMANDS)) assert.equal(spec.agent, cmd !== 'prepare', cmd)
})

test('startOptions reads seeds, fixture, viewport and base url', () => {
    assert.deepEqual(startOptions({}), { seed: null, minigameSeeds: null, fixture: null, viewport: 'mobile', baseUrl: null })
    assert.deepEqual(startOptions({
        seed: '1101',
        'minigame-seeds': '{"hazard":{"seed":7}}',
        fixture: 'l30-bw-hazard-arrive',
        viewport: 'desktop',
        'base-url': 'http://localhost:8081/',
    }), {
        seed: 1101,
        minigameSeeds: { hazard: { seed: 7 } },
        fixture: 'l30-bw-hazard-arrive',
        viewport: 'desktop',
        baseUrl: 'http://localhost:8081',
    })
})

test('startOptions rejects bad values and unknown flags', () => {
    assert.throws(() => startOptions({ seed: 'abc' }), /--seed must be an integer/)
    assert.throws(() => startOptions({ 'minigame-seeds': '{' }), /must be JSON/)
    assert.throws(() => startOptions({ 'minigame-seeds': '[1]' }), /JSON object/)
    assert.throws(() => startOptions({ viewport: 'tablet' }), /mobile or desktop/)
    assert.throws(() => startOptions({ sed: '1' }), /does not take --sed/)
})

test('the mobile context is 414x896 with touch; desktop has no touch', () => {
    assert.deepEqual(sessionContextOptions('mobile'), { viewport: { width: 414, height: 896 }, hasTouch: true, isMobile: true })
    const desktop = sessionContextOptions('desktop')
    assert.equal(desktop.hasTouch, false)
    assert.equal(desktop.viewport.width, 1280)
})

test('the session record names its ports, seeds and paths', () => {
    const dir = '/tmp/sessions'
    const options = startOptions({ seed: '1101', fixture: 'fresh-start' })
    const record = buildSessionRecord({
        agent: 'pt1', pid: 42, controlPort: 4000, baseUrl: 'http://127.0.0.1:4001',
        options, servesExport: true, startedAt: '2026-10-26T00:00:00.000Z', dir,
    })
    assert.deepEqual(Object.keys(record).sort(), [
        'agent', 'baseUrl', 'controlPort', 'fixture', 'idleMinutes', 'logFile', 'minigameSeeds', 'pid',
        'seed', 'servesExport', 'shotDir', 'startedAt', 'viewport',
    ])
    assert.equal(record.seed, 1101)
    assert.equal(record.fixture, 'fresh-start')
    assert.equal(record.viewport, 'mobile')
    assert.equal(record.idleMinutes, 30)
    assert.equal(record.shotDir, join(dir, 'pt1', 'shots'))
    assert.equal(record.logFile, join(dir, 'pt1.log'))
    assert.deepEqual(JSON.parse(JSON.stringify(record)), record)
})

test('records and default shots live under the sessions dir, never .playwright-mcp', () => {
    assert.equal(recordPath('pt1', '/s'), join('/s', 'pt1.json'))
    const shot = defaultShotPath('pt1', 3, '/s')
    assert.equal(shot, join('/s', 'pt1', 'shots', '3.png'))
    assert.ok(!shot.includes('.playwright-mcp'))
})

test('a relative shot path resolves against the caller, not the session', () => {
    assert.equal(callerPath('shots/a.png', '/work'), resolve('/work', 'shots/a.png'))
    assert.equal(callerPath('/abs/a.png', '/work'), '/abs/a.png')
})
