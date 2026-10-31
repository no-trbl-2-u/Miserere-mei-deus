// scripts/atlas-drift.test.mjs: the drift finder on fixture atlas and docs
// (phase AT1c, acceptance A8-A10). The check is advisory; this pins the
// finder's behaviour, not the real docs.
//
//   node --test scripts/atlas-drift.test.mjs

import assert from 'node:assert/strict'
import test from 'node:test'

import { findDrift, statedCount, formatFindings } from './atlas-drift.mjs'
import { renderAtlas } from './build-atlas.mjs'

const NUMS = ['One', 'Two', 'Three', 'Four', 'Five']
const relics = NUMS.map((n) => ({ id: `rl-${n}`, name: `Relic ${n}`, laneId: null, relicSource: 'quest', statLines: [], signatureId: `sg-${n}` }))
const signatures = NUMS.map((n) => ({ id: `sg-${n}`, name: `Sig ${n}`, cost: 3, description: '' }))
const ATLAS = {
  cards: [{ id: 'c1', name: 'C1', laneId: null, color: 'any', type: 'attack', rank: 1, keywords: ['DEAL', 'GUARD'], trigger: null }],
  lanes: [], relics, signatures, enemies: [], regions: [], questlines: [], xp: [],
  formulas: { PLAYER_VITAE_BASE: 40, RESOURCE_MULTIPLIERS: { VITAE_PER_BODY: 1, VITAE_PER_MIND: 1, VITAE_PER_HEART: 1 }, LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER: 2, scalingBase: 10, scaling: [] },
  meta: { commit: 'abc1234', generatedAt: '2026-01-02' },
}
const names = [...relics, ...signatures].map((x) => x.name).join(', ')
const GOOD = `Five relics: ${names}. Keywords DEAL and GUARD.`

test('statedCount reads words and digits', () => {
  assert.deepEqual(statedCount('**Ten relics** here', 'relics'), { n: 10, text: 'Ten relics' })
  assert.equal(statedCount('7 relics', 'relics').n, 7)
  assert.equal(statedCount('no count', 'relics'), null)
})

test('a doc saying Four relics against five relics yields one finding', () => {
  const f = findDrift(ATLAS, { gameModel: GOOD.replace('Five relics', 'Four relics') })
  assert.equal(f.length, 1)
  assert.equal(f[0].file, 'docs/game-model.md')
  assert.match(f[0].claim, /Four relics/)
  assert.match(f[0].engine, /5 relics/)
})

test('a matching doc yields none', () => {
  assert.deepEqual(findDrift(ATLAS, { gameModel: GOOD, spec: 'Five signatures.', meta: { commit: 'abc1234' } }), [])
})

test('missing names, keywords, spec count and commit are each found', () => {
  const f = findDrift(ATLAS, { gameModel: 'Five relics. Relic One. DEAL.', spec: 'Four signatures', meta: { commit: 'zzz' } })
  assert.ok(f.some((x) => /relic Relic Two/.test(x.claim)))
  assert.ok(f.some((x) => /signature Sig Five/.test(x.claim)))
  assert.ok(f.some((x) => /keyword GUARD/.test(x.claim)))
  assert.ok(f.some((x) => x.file === 'spec.md'))
  assert.ok(f.some((x) => x.file === 'devlog/data/meta.json'))
})

test('the page shows the finding on its drift plate', () => {
  const page = renderAtlas(ATLAS, { gameModel: GOOD.replace('Five relics', 'Four relics') })
  const plate = page.split('id="drift"')[1].split('</section>')[0]
  assert.match(plate, /Four relics/)
  assert.match(plate, /5 relics/)
  const clean = renderAtlas(ATLAS, { gameModel: GOOD })
  assert.match(clean.split('id="drift"')[1].split('</section>')[0], /no drift found at abc1234/)
  assert.equal(formatFindings([], ATLAS), 'no drift found at abc1234')
})
