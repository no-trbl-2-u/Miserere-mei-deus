// scripts/feature-map-drive.test.mjs
//
// The reachability drive's pass/fail rule (phase FM1d) against fake maps and
// fake visit lists. No browser, no export. The fixture routes are invented
// so this file never counts as evidence for a real route on the feature map.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
    FeatureMapContractError,
    crossEdges,
    formatReport,
    judgeVisits,
    loadFeatureMap,
    normalisePath,
    requiredRoutes,
    routePathForId,
    validateFeatureMap,
} from './lib/feature-map-drive.mjs'

const reach = (value) => ({ value, source: 'test' })

/** A small map in the FM1a/FM1b shape. */
function fixtureMap() {
    return {
        version: 1,
        features: [
            { id: 'area:Combat', name: 'A fight', kind: 'engine-area', group: 'engine', source: 'x' },
            { id: 'route:index', name: 'Title', kind: 'route', group: 'world', source: 'x', reachable: reach(true) },
            { id: 'route:(tabs)/ledger', name: 'Ledger', kind: 'route', group: 'tabs', source: 'x', reachable: reach(true) },
            { id: 'route:well', name: 'Well', kind: 'route', group: 'world', source: 'x', reachable: reach(true) },
            { id: 'route:orphan', name: 'Orphan', kind: 'route', group: 'world', source: 'x', reachable: reach(false) },
            { id: 'route:workshop', name: 'Workshop', kind: 'dev-route', group: 'dev', source: 'x', reachable: reach(true) },
            { id: 'route:attic/rooms', name: 'Rooms', kind: 'dev-route', group: 'dev', source: 'x', reachable: reach(false) },
        ],
        edges: [
            { kind: 'flow', from: 'route:index', to: 'route:(tabs)/ledger', file: 'app/title.tsx' },
            { kind: 'flow', from: 'route:(tabs)/ledger', to: 'route:well', file: 'components/WellGate.tsx' },
            { kind: 'flow', from: 'route:(tabs)/ledger', to: 'route:well', file: 'components/Other.tsx' },
            { kind: 'flow', from: 'route:workshop', to: 'route:well', file: 'components/WellGate.tsx' },
            { kind: 'coupling', from: 'route:well', to: 'area:Combat', file: 'app/well/screen.tsx' },
        ],
    }
}

const play = (...paths) => paths.map((path) => ({ path, via: 'play' }))
const seam = (...paths) => paths.map((path) => ({ path, via: 'seam' }))

test('route ids map to the URL the web build serves them at', () => {
    assert.equal(routePathForId('route:index'), '/')
    assert.equal(routePathForId('route:(tabs)/ledger'), '/ledger')
    assert.equal(routePathForId('route:attic/rooms'), '/attic/rooms')
    assert.equal(routePathForId('route:long-name'), '/long-name')
    assert.equal(normalisePath('/ledger/'), '/ledger')
    assert.equal(normalisePath('/'), '/')
    assert.equal(normalisePath('/well/index'), '/well')
})

test('a map without reachable evidence is refused, never computed', () => {
    const map = fixtureMap()
    delete map.features[2].reachable
    assert.throws(() => validateFeatureMap(map), (err) => err instanceof FeatureMapContractError && /reachable/.test(err.message) && /route:\(tabs\)\/ledger/.test(err.message))
    assert.throws(() => validateFeatureMap({ version: 2, features: [], edges: [] }), FeatureMapContractError)
    assert.throws(() => validateFeatureMap({ version: 1, edges: [] }), FeatureMapContractError)
})

test('engine areas and dev routes need no reachable field to pass the contract', () => {
    const map = fixtureMap()
    delete map.features[0].reachable
    delete map.features[5].reachable
    assert.doesNotThrow(() => validateFeatureMap(map))
})

test('loadFeatureMap reads a file and names a missing one', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fm1d-'))
    try {
        const path = join(dir, 'features.json')
        writeFileSync(path, JSON.stringify(fixtureMap()))
        assert.equal(loadFeatureMap(path).features.length, 7)
        assert.throws(() => loadFeatureMap(join(dir, 'nope.json')), FeatureMapContractError)
        writeFileSync(path, '{not json')
        assert.throws(() => loadFeatureMap(path), FeatureMapContractError)
    } finally {
        rmSync(dir, { recursive: true, force: true })
    }
})

test('the required set is every non-dev route marked reachable', () => {
    assert.deepEqual(requiredRoutes(fixtureMap()), ['route:(tabs)/ledger', 'route:index', 'route:well'])
})

test('reaching every reachable route passes, whatever the via', () => {
    const j = judgeVisits(fixtureMap(), [...play('/', '/ledger'), ...seam('/workshop', '/well')])
    assert.equal(j.ok, true)
    assert.deepEqual(j.missing, [])
    assert.deepEqual(j.seamOnly, ['route:well'])
    assert.deepEqual(j.reached, ['route:(tabs)/ledger', 'route:index', 'route:well', 'route:workshop'])
})

test('a reachable route not reached fails', () => {
    const j = judgeVisits(fixtureMap(), play('/', '/ledger'))
    assert.equal(j.ok, false)
    assert.deepEqual(j.missing, ['route:well'])
    assert.match(j.failures[0], /not reached: route:well/)
})

test('a reached path the map lacks fails', () => {
    const j = judgeVisits(fixtureMap(), play('/', '/ledger', '/well', '/secret-room'))
    assert.equal(j.ok, false)
    assert.deepEqual(j.offMap, ['/secret-room'])
})

test('play reaching a route the map marks unreachable fails; a seam reaching it does not', () => {
    const byPlay = judgeVisits(fixtureMap(), play('/', '/ledger', '/well', '/orphan'))
    assert.equal(byPlay.ok, false)
    assert.deepEqual(byPlay.unexpected, ['route:orphan'])
    const bySeam = judgeVisits(fixtureMap(), [...play('/', '/ledger', '/well'), ...seam('/orphan')])
    assert.equal(bySeam.ok, true)
    assert.deepEqual(bySeam.seamOnly, ['route:orphan'])
})

test('dev routes are never required and never fail the drive', () => {
    const j = judgeVisits(fixtureMap(), play('/', '/ledger', '/well', '/attic/rooms'))
    assert.equal(j.ok, true)
})

test('edges: consecutive routes in one session cross; sessions do not chain', () => {
    const e = crossEdges(fixtureMap(), [['/', '/ledger', '/ledger', '/well'], ['/workshop']])
    assert.deepEqual(e.crossed.map((x) => `${x.from}>${x.to}`), ['route:(tabs)/ledger>route:well', 'route:index>route:(tabs)/ledger'])
    assert.deepEqual(e.uncrossed.map((x) => `${x.from}>${x.to}`), ['route:workshop>route:well'])
    // Duplicate flow records collapse to one pair carrying both files.
    assert.deepEqual(e.crossed[0].files, ['components/WellGate.tsx', 'components/Other.tsx'])
    // Coupling edges are not flow edges.
    assert.equal(e.crossed.length + e.uncrossed.length, 3)
})

test('edges: a step with no flow edge is reported, an off-map path is skipped', () => {
    const e = crossEdges(fixtureMap(), [['/well', '/nowhere', '/index']])
    assert.deepEqual(e.unmapped, [{ from: 'route:well', to: 'route:index' }])
})

test('an uncrossed edge never fails the report; the report lists every edge', () => {
    const map = fixtureMap()
    const judgement = judgeVisits(map, play('/', '/ledger', '/well'))
    const edges = crossEdges(map, [['/', '/ledger', '/well']])
    const md = formatReport({ judgement, edges, legs: [{ name: 'walk', via: 'play', ok: true }] })
    assert.match(md, /\*\*PASS\*\*/)
    assert.match(md, /2 crossed, 1 uncrossed/)
    assert.match(md, /- route:workshop -> route:well/)
    const failed = formatReport({ judgement: judgeVisits(map, play('/')), edges, legs: [] })
    assert.match(failed, /\*\*FAIL\*\*/)
    assert.match(failed, /not reached: route:well/)
})

test('a failed leg fails the report even when every route was reached', () => {
    const map = fixtureMap()
    const judgement = judgeVisits(map, play('/', '/ledger', '/well'))
    const md = formatReport({ judgement, edges: crossEdges(map, []), legs: [{ name: 'walk', via: 'play', ok: false, error: 'boom' }] })
    assert.match(md, /\*\*FAIL\*\*/)
    assert.match(md, /FAILED walk \(play\): boom/)
})
