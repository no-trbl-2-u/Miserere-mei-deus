// scripts/smoke-routes-for.test.mjs
//
// Route selection from the diff (phase VE1d): every route is reachable by a
// rule, an unknown path selects all, a baseline PNG selects its route, and
// SMOKE_ONLY then SMOKE_ROUTES=all take precedence over the diff.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ALL, NO_RENDER, RULES, chooseRoutes, routesForPaths } from './lib/smoke-routes-for.mjs'
import { ROUTES, routesForRun } from './smoke-screens.mjs'

const names = ROUTES.map((r) => r.name)
const neverCalled = () => assert.fail('the diff was read')

test('every ROUTES name is produced by at least one rule', () => {
    const reached = new Set(RULES.flatMap((r) => (r.routes === ALL ? [] : r.routes)))
    assert.deepEqual(names.filter((n) => !reached.has(n)), [])
})

test('every rule names only real routes', () => {
    for (const rule of RULES.filter((r) => r.routes !== ALL)) {
        for (const n of rule.routes) assert.ok(names.includes(n), `${rule.test} names ${n}`)
    }
})

test('a screen change selects its own route', () => {
    assert.deepEqual(routesForPaths(['axiomancer-mobile/app/(tabs)/memoir/index.tsx'], names).routes, ['memoir'])
    assert.deepEqual(routesForPaths(['axiomancer-mobile/components/combat/encounter/CombatCombatantPane.tsx'], names).routes, ['combat-encounter'])
    assert.deepEqual(
        routesForPaths(['axiomancer-mobile/components/hazard/HazardBoard.tsx'], names).routes,
        ['combat-encounter', 'devpuzzle-board', 'devpuzzle-list', 'devpuzzle-outcome', 'hazard-board'],
    )
    assert.deepEqual(
        routesForPaths(['axiomancer-mobile/app/devpuzzle/index.tsx'], names).routes,
        ['devpuzzle-board', 'devpuzzle-list', 'devpuzzle-outcome', 'hazard-board'],
    )
})

test('the exploration tab selects the fixture shots that boot through it', () => {
    const { routes } = routesForPaths(['axiomancer-mobile/app/(tabs)/exploration/index.tsx'], names)
    for (const n of ['exploration', 'dialogue', 'village', 'cutscene', 'hazard-board']) assert.ok(routes.includes(n), n)
})

test('several paths select the union', () => {
    const { routes } = routesForPaths([
        'axiomancer-mobile/app/(tabs)/memoir/index.tsx',
        'axiomancer-mobile/app/labyrinth/index.tsx',
    ], names)
    assert.deepEqual(routes, ['labyrinth', 'memoir'])
})

test('app-wide code, the engine and the lockfile select all', () => {
    for (const path of [
        'axiomancer-mobile/app/_layout.tsx',
        'axiomancer-mobile/app/(tabs)/_layout.tsx',
        'axiomancer-mobile/components/StatBar.tsx',
        'axiomancer-mobile/components/CombatGate.tsx',
        'axiomancer-mobile/app/rest/index.tsx',
        'axiomancer-mobile/state/game-store.ts',
        'axiomancer-mobile/lib/platform/image.ts',
        'axiomancer-mobile/assets/images/title.webp',
        'axiomancer-mobile/scripts/smoke-screens.mjs',
        'axiomancer-mechanics/src/Cards/card.library.ts',
        'package-lock.json',
    ]) {
        assert.equal(routesForPaths([path], names).routes, ALL, path)
    }
})

test('an unknown path selects all, even beside a scoped one', () => {
    const picked = routesForPaths(['axiomancer-mobile/app/(tabs)/memoir/index.tsx', 'some/new/thing.ts'], names)
    assert.equal(picked.routes, ALL)
    assert.match(picked.reason, /some\/new\/thing\.ts matches no rule/)
})

test('a changed baseline PNG selects its route; an unknown one selects all', () => {
    assert.deepEqual(routesForPaths(['axiomancer-mobile/screenshots/baseline/village.png'], names).routes, ['village'])
    assert.equal(routesForPaths(['axiomancer-mobile/screenshots/baseline/gone.png'], names).routes, ALL)
})

test('tests, prose and plans render nothing, and a diff of only those selects all', () => {
    const quiet = [
        'axiomancer-mobile/app/(tabs)/memoir/__tests__/memoir.test.tsx',
        'axiomancer-mobile/components/inventory/SlotBanner.test.tsx',
        'plan/steps/01_build_plan.md',
        '.github/workflows/verify-mobile.yml',
        'scripts/ci-e2e-scope.mjs',
        'axiomancer-mobile/screenshots/current/memoir.png',
    ]
    for (const path of quiet) assert.ok(NO_RENDER.some((re) => re.test(path)), path)
    assert.deepEqual(routesForPaths([...quiet, 'axiomancer-mobile/app/(tabs)/memoir/index.tsx'], names).routes, ['memoir'])
    const none = routesForPaths(quiet, names)
    assert.equal(none.routes, ALL)
    assert.match(none.reason, /no rendered path changed/)
})

test('SMOKE_ONLY wins, then SMOKE_ROUTES=all, then the diff', () => {
    const only = routesForRun(ROUTES, { SMOKE_ONLY: 'memoir', SMOKE_ROUTES: 'all' }, neverCalled)
    assert.deepEqual(only.routes.map((r) => r.name), ['memoir'])

    const all = routesForRun(ROUTES, { SMOKE_ROUTES: 'all' }, neverCalled)
    assert.equal(all.routes.length, ROUTES.length)
    assert.match(all.log, /SMOKE_ROUTES=all/)

    const diff = routesForRun(ROUTES, {}, () => ['axiomancer-mobile/app/(tabs)/memoir/index.tsx'])
    assert.deepEqual(diff.routes.map((r) => r.name), ['memoir'])
    assert.match(diff.log, /^routes from diff: memoir /)

    const lock = routesForRun(ROUTES, {}, () => ['package-lock.json'])
    assert.equal(lock.routes.length, ROUTES.length)
})

test('no origin/main to diff against shoots all', () => {
    const { routes, log } = routesForRun(ROUTES, {}, () => null)
    assert.equal(routes.length, ROUTES.length)
    assert.match(log, /no origin\/main/)
})

test('a SMOKE_ROUTES value other than all throws before anything runs', () => {
    assert.throws(() => chooseRoutes(ROUTES, { routesEnv: 'memoir', changed: neverCalled }), /SMOKE_ROUTES/)
})
