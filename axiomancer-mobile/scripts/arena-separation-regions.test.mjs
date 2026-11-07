// axiomancer-mobile/scripts/arena-separation-regions.test.mjs — the arena-separation
// measurement names Chapter 1's roster by hand (EN3b, 2026-11-07), so pin that list
// to literals: repointing the roster without repointing the script fails here.
//
//   node --test axiomancer-mobile/scripts/arena-separation-regions.test.mjs
//
// The script runs its measurement on import, so this reads its source text.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SRC = fs.readFileSync(path.join(HERE, 'measure-arena-separation.mjs'), 'utf-8')

/** The foe keys of the region whose `id` is `regionId`, in the order the script lists them. */
function foesOf(regionId) {
  const at = SRC.indexOf(`id: '${regionId}'`)
  assert.ok(at >= 0, `region ${regionId} not found`)
  const m = /foes: \[([^\]]*)\]/.exec(SRC.slice(at))
  assert.ok(m, `no foes list for ${regionId}`)
  return [...m[1].matchAll(/'([\w-]+)'/g)].map((x) => x[1])
}

test('the Breakwater lists the recast Chapter 1 roster: six normals, six elites, the Saint Beneath', () => {
  assert.deepEqual(foesOf('breakwater'), [
    'quay-crab', 'net-mender', 'coralback', 'brine-widow', 'saltwick-swarm', 'bilge-stalker',
    'cave-choir', 'tithe-collector', 'lamplighter', 'wrecker', 'wreckmaster', 'tide-gate', 'saint-beneath',
  ])
})

test('the later Act 1 regions still stage the Float-Eye, the Green Jelly and the Death Beholder', () => {
  for (const id of ['charcoal-wood', 'beacon-crags', 'lantern-deep']) {
    assert.deepEqual(foesOf(id), ['float-eye', 'green-jelly', 'death-beholder'])
  }
})

test('both bosses take the boss figure spec', () => {
  assert.match(SRC, /const BOSSES = new Set\(\['death-beholder', 'saint-beneath'\]\)/)
})
