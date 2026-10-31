// scripts/build-atlas.test.mjs: the atlas page on a fixture atlas.json (no
// engine run). Phase AT1b, acceptance A4-A6.
//
//   node --test scripts/build-atlas.test.mjs

import assert from 'node:assert/strict'
import test from 'node:test'

import { renderAtlas, laneList, keywordTotals } from './build-atlas.mjs'

const xp = Array.from({ length: 5 }, (_, i) => ({ level: i + 1, experienceToNext: 70 + i * 7, total: i * 70 }))

const FIXTURE = {
  cards: [
    { id: 'fx-strike', name: 'Fixture Strike', laneId: 'fx-grey', color: 'any', type: 'attack', rank: 1, keywords: ['DEAL'], trigger: null },
    { id: 'fx-ward', name: 'Fixture Ward', laneId: 'fx-grey', color: 'mind', type: 'skill', rank: 1, keywords: ['GUARD'], trigger: null },
    { id: 'fx-burn', name: 'Fixture Burner', laneId: 'fx-fire', color: 'heart', type: 'global', rank: 2, keywords: ['DEAL', 'INFERNO'], trigger: 'turn' },
    { id: 'fx-curse', name: 'Fixture Curse', laneId: null, color: 'any', type: 'curse', rank: 1, keywords: ['CURSE'], trigger: null },
  ],
  lanes: [
    { id: 'fx-grey', name: 'Fixture grey', cardIds: ['fx-strike', 'fx-ward'] },
    { id: 'fx-fire', name: 'Fixture fire', cardIds: ['fx-burn'] },
  ],
  relics: [
    { id: 'rl-one', name: 'Fixture Ring', laneId: 'fx-fire', relicSource: 'elite', statLines: ['body +5'], signatureId: 'sg-one' },
    { id: 'rl-two', name: 'Fixture Brooch', laneId: null, relicSource: 'quest', statLines: [], signatureId: 'sg-two' },
  ],
  signatures: [
    { id: 'sg-one', name: 'Fixture Flare', cost: 4, description: 'Burn it all.' },
    { id: 'sg-two', name: 'Fixture Mercy', cost: 3, description: 'Spare the foe.' },
  ],
  enemies: [{ id: 'en-one', name: 'Fixture Wisp', level: 2, difficulty: 'normal', vitae: 30, liveVitae: 60 }],
  regions: [
    { continent: 'fx-coast', map: 'fx-harbour', nodeCount: 12, nodesByKind: { encounter: 8, rest: 4 }, act1: true },
    { continent: 'fx-coast', map: 'fx-forest', nodeCount: 9, nodesByKind: { encounter: 9 }, act1: true },
    { continent: 'fx-deep', map: 'fx-maze', nodeCount: 5, nodesByKind: { hazard: 5 }, act1: false },
  ],
  questlines: [
    { id: 'fx-quest', name: 'Fixture Quest', map: 'fx-harbour', steps: [{ step: 1, objectives: ['Find the net.'], rewards: ['40 XP'] }, { step: 2, objectives: ['Bring it home.'], rewards: ['item Fixture Brooch'] }] },
  ],
  xp,
  formulas: {
    PLAYER_VITAE_BASE: 40,
    RESOURCE_MULTIPLIERS: { VITAE_PER_BODY: 11, VITAE_PER_MIND: 5, VITAE_PER_HEART: 4 },
    LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER: 2,
    scalingBase: 10,
    scaling: Array.from({ length: 6 }, (_, s) => ({ stat: s, oneShot: s * 2 + 1, repeating: s + 5 })),
  },
  meta: { commit: 'abc1234', generatedAt: '2026-01-02' },
}

const page = renderAtlas(FIXTURE)

test('every generated plate is present', () => {
  for (const id of ['cards', 'relics', 'stats', 'world']) {
    assert.match(page, new RegExp(`<section class="plate" id="${id}"`), id)
  }
})

test('every hand-drawn plate is present, each with a last-checked line', () => {
  for (const id of ['context', 'containers', 'engine', 'domain', 'combat', 'dice', 'loop']) {
    assert.match(page, new RegExp(`<section class="plate" id="${id}"`), id)
  }
  const sections = page.split('<section class="plate"').slice(1)
  const hand = sections.filter((s) => /^ id="(context|containers|engine|domain|combat|dice|loop)"/.test(s))
  assert.equal(hand.length, 7)
  for (const s of hand) assert.match(s, /hand-drawn, last checked \d{4}-\d{2}-\d{2}/)
})

test('every fixture card, relic, signature, foe and region appears', () => {
  for (const c of FIXTURE.cards) assert.ok(page.includes(c.name) && page.includes(c.id), c.id)
  for (const r of FIXTURE.relics) assert.ok(page.includes(r.name), r.name)
  for (const s of FIXTURE.signatures) assert.ok(page.includes(s.name), s.name)
  for (const e of FIXTURE.enemies) assert.ok(page.includes(e.name), e.name)
  for (const r of FIXTURE.regions) assert.ok(page.includes(r.map), r.map)
  assert.ok(page.includes('Fixture Quest'))
})

test('the page is built from the data: counts, formulas and meta', () => {
  assert.match(page, /4 cards in 2 lanes/)
  assert.ok(page.includes('max VITAE = 40 + 11·body + 5·mind + 4·heart'))
  assert.ok(page.includes('abc1234'))
  assert.match(page, /id="atlas-data"/)
  // a card with no lane gets the "No lane" lane
  assert.deepEqual(laneList(FIXTURE).map((l) => l.id), ['fx-grey', 'fx-fire', ''])
  assert.deepEqual(keywordTotals(FIXTURE)[0], ['DEAL', 2])
})

test('changing the data changes the page with no edit to the source', () => {
  const fewer = { ...FIXTURE, cards: FIXTURE.cards.slice(1), relics: FIXTURE.relics.slice(1) }
  const out = renderAtlas(fewer)
  assert.ok(!out.includes('Fixture Strike') && !out.includes('Fixture Ring'))
  assert.match(out, /3 cards in 2 lanes/)
})

test('the page is self-contained but for the fonts stylesheet', () => {
  const urls = [...page.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1])
  assert.ok(urls.every((u) => u.includes('fonts.googleapis.com')), urls.join(', '))
  assert.ok(!/<script[^>]+src=/.test(page))
})

test('inlined JSON cannot close its script tag', () => {
  const evil = { ...FIXTURE, cards: [{ ...FIXTURE.cards[0], name: '</script><b>x' }] }
  const out = renderAtlas(evil)
  const data = out.split('<script type="application/json" id="atlas-data">')[1].split('</script>')[0]
  assert.equal(JSON.parse(data).cards[0].name, '</script><b>x')
})

test('an empty atlas still renders', () => {
  const empty = { ...FIXTURE, cards: [], lanes: [], relics: [], signatures: [], enemies: [], regions: [], questlines: [], xp: [] }
  assert.match(renderAtlas(empty), /<section class="plate" id="world"/)
})
