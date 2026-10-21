// scripts/feature-map-drive.test.mjs
//
// The reachability drive's pass/fail rule (phase FM1d) against fake maps and
// fake visit lists. No browser, no export.

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
            { id: 'route:(tabs)/deck', name: 'Deck', kind: 'route', group: 'tabs', source: 'x', reachable: reach(true) },
            { id: 'route:rest', name: 'Rest', kind: 'route', group: 'world', source: 'x', reachable: reach(true) },
            { id: 'route:orphan', name: 'Orphan', kind: 'route', group: 'world', source: 'x', reachable: reach(false) },
            { id: 'route:dev', name: 'Dev', kind: 'dev-route', group: 'dev', source: 'x', reachable: reach(true) },
            { id: 'route:devart/rooms', name: 'Rooms', kind: 'dev-route', group: 'dev', source: 'x', reachable: reach(false) },
        ],
        edges: [
            { kind: 'flow', from: 'route:index', to: 'route:(tabs)/deck', file: 'app/index.tsx' },
            { kind: 'flow', from: 'route:(tabs)/deck', to: 'route:rest', file: 'components/RestGate.tsx' },
            { kind: 'flow', from: 'route:(tabs)/deck', to: 'route:rest', file: 'components/Other.tsx' },
            { kind: 'flow', from: 'route:dev', to: 'route:rest', file: 'components/RestGate.tsx' },
            { kind: 'coupling', from: 'route:rest', to: 'area:Combat', file: 'app/rest/index.tsx' },
        ],
    }
}

const play = (...paths) => paths.map((path) => ({ path, via: 'play' }))
const seam = (...paths) => paths.map((path) => ({ path, via: 'seam' }))

test('route ids map to the URL the web build serves them at', () => {
    assert.equal(routePathForId('route:index'), '/')
    assert.equal(routePathForId('route:(tabs)/deck'), '/deck')
    assert.equal(routePathForId('route:devart/rooms'), '/devart/rooms')
    assert.equal(routePathForId('route:combat-encounter'), '/combat-encounter')
    assert.equal(normalisePath('/deck/'), '/deck')
    assert.equal(normalisePath('/'), '/')
    assert.equal(normalisePath('/rest/index'), '/rest')
})

test('a map without reachable evidence is refused, never computed', () => {
    const map = fixtureMap()
    delete map.features[2].reachable
    assert.throws(() => validateFeatureMap(map), (err) => err instanceof FeatureMapContractError && /reachable/.test(err.message) && /route:\(tabs\)\/deck/.test(err.message))
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
    assert.deepEqual(requiredRoutes(fixtureMap()), ['route:(tabs)/deck', 'route:index', 'route:rest'])
})

test('reaching every reachable route passes, whatever the via', () => {
    const j = judgeVisits(fixtureMap(), [...play('/', '/deck'), ...seam('/dev', '/rest')])
    assert.equal(j.ok, true)
    assert.deepEqual(j.missing, [])
    assert.deepEqual(j.seamOnly, ['route:rest'])
    assert.deepEqual(j.reached, ['route:(tabs)/deck', 'route:dev', 'route:index', 'route:rest'])
})

test('a reachable route not reached fails', () => {
    const j = judgeVisits(fixtureMap(), play('/', '/deck'))
    assert.equal(j.ok, false)
    assert.deepEqual(j.missing, ['route:rest'])
    assert.match(j.failures[0], /not reached: route:rest/)
})

test('a reached path the map lacks fails', () => {
    const j = judgeVisits(fixtureMap(), play('/', '/deck', '/rest', '/secret-room'))
    assert.equal(j.ok, false)
    assert.deepEqual(j.offMap, ['/secret-room'])
})

test('play reaching a route the map marks unreachable fails; a seam reaching it does not', () => {
    const byPlay = judgeVisits(fixtureMap(), play('/', '/deck', '/rest', '/orphan'))
    assert.equal(byPlay.ok, false)
    assert.deepEqual(byPlay.unexpected, ['route:orphan'])
    const bySeam = judgeVisits(fixtureMap(), [...play('/', '/deck', '/rest'), ...seam('/orphan')])
    assert.equal(bySeam.ok, true)
    assert.deepEqual(bySeam.seamOnly, ['route:orphan'])
})

test('dev routes are never required and never fail the drive', () => {
    const j = judgeVisits(fixtureMap(), play('/', '/deck', '/rest', '/devart/rooms'))
    assert.equal(j.ok, true)
})

test('edges: consecutive routes in one session cross; sessions do not chain', () => {
    const e = crossEdges(fixtureMap(), [['/', '/deck', '/deck', '/rest'], ['/dev']])
    assert.deepEqual(e.crossed.map((x) => `${x.from}>${x.to}`), ['route:(tabs)/deck>route:rest', 'route:index>route:(tabs)/deck'])
    assert.deepEqual(e.uncrossed.map((x) => `${x.from}>${x.to}`), ['route:dev>route:rest'])
    // Duplicate flow records collapse to one pair carrying both files.
    assert.deepEqual(e.crossed[0].files, ['components/RestGate.tsx', 'components/Other.tsx'])
    // Coupling edges are not flow edges.
    assert.equal(e.crossed.length + e.uncrossed.length, 3)
})

test('edges: a step with no flow edge is reported, an off-map path is skipped', () => {
    const e = crossEdges(fixtureMap(), [['/rest', '/nowhere', '/index']])
    assert.deepEqual(e.unmapped, [{ from: 'route:rest', to: 'route:index' }])
})

test('an uncrossed edge never fails the report; the report lists every edge', () => {
    const map = fixtureMap()
    const judgement = judgeVisits(map, play('/', '/deck', '/rest'))
    const edges = crossEdges(map, [['/', '/deck', '/rest']])
    const md = formatReport({ judgement, edges, legs: [{ name: 'walk', via: 'play', ok: true }] })
    assert.match(md, /\*\*PASS\*\*/)
    assert.match(md, /2 crossed, 1 uncrossed/)
    assert.match(md, /- route:dev -> route:rest/)
    const failed = formatReport({ judgement: judgeVisits(map, play('/')), edges, legs: [] })
    assert.match(failed, /\*\*FAIL\*\*/)
    assert.match(failed, /not reached: route:rest/)
})

test('a failed leg fails the report even when every route was reached', () => {
    const map = fixtureMap()
    const judgement = judgeVisits(map, play('/', '/deck', '/rest'))
    const md = formatReport({ judgement, edges: crossEdges(map, []), legs: [{ name: 'walk', via: 'play', ok: false, error: 'boom' }] })
    assert.match(md, /\*\*FAIL\*\*/)
    assert.match(md, /FAILED walk \(play\): boom/)
})
