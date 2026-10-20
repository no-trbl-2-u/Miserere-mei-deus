// scripts/smoke-screens-verdict.test.mjs — the visual gate's verdict helpers.
//
// Part of the root `npm test` suite. Imports the real helpers from
// axiomancer-mobile/scripts/smoke-screens.mjs (the mobile jest suite cannot
// load an .mjs, so it pins copies) and checks the SMOKE_RUNS determinism
// verdict: a route whose captures are not byte-identical makes the run exit 4,
// ahead of any diff or missing baseline.
//
//   node --test scripts/smoke-screens-verdict.test.mjs

import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  EXIT,
  nondeterministicRoutes,
  parseSmokeRuns,
  resultToExit,
} from '../axiomancer-mobile/scripts/smoke-screens.mjs'

const png = (...bytes) => Uint8Array.from(bytes)
const empty = { matched: [], differing: [], missing: [], consoleErrors: [] }

test('identical captures are deterministic; one differing byte names the route', () => {
  const shots = [
    { route: 'root', captures: [png(1, 2, 3), png(1, 2, 3), png(1, 2, 3)] },
    { route: 'memoir', captures: [png(1, 2, 3), png(1, 2, 3), png(1, 2, 4)] },
    { route: 'village', captures: [png(9), png(9, 9)] },
  ]
  assert.deepEqual(nondeterministicRoutes(shots), ['memoir', 'village'])
})

test('a single capture per route is never nondeterministic', () => {
  assert.deepEqual(nondeterministicRoutes([{ route: 'root', captures: [png(1)] }]), [])
})

test('a nondeterministic route exits 4, ahead of a diff or a missing baseline', () => {
  assert.equal(EXIT.NONDETERMINISTIC, 4)
  const result = { ...empty, differing: [{ route: 'x' }], missing: [{ route: 'y' }], nondeterministic: ['root'] }
  assert.equal(resultToExit(result), EXIT.NONDETERMINISTIC)
  assert.equal(resultToExit({ ...result, bootError: 'export failed' }), EXIT.BOOT_FAILURE)
  assert.equal(resultToExit({ ...result, nondeterministic: [] }), EXIT.MISSING_BASELINE)
  assert.equal(resultToExit(empty), EXIT.OK, 'a result with no nondeterministic field still reads')
})

test('SMOKE_RUNS parses a whole number from 1 to 20 and rejects anything else', () => {
  assert.equal(parseSmokeRuns(undefined), 1)
  assert.equal(parseSmokeRuns(''), 1)
  assert.equal(parseSmokeRuns('5'), 5)
  for (const bad of ['0', '-1', '2.5', 'five', '21']) assert.throws(() => parseSmokeRuns(bad), new RegExp(bad.replace('.', '\\.')))
})
