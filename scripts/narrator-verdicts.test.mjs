// scripts/narrator-verdicts.test.mjs — the ledger against the game (spec 177, A9/A10).
//
// The Narrator's approved lines live in `plan/ballots/narrator-chapter1.md`.
// This test reads that ledger and the sources, and fails when an approved line
// is missing, altered or left as a placeholder. Its first surface is the
// Breakwater's 22 scenes (177.9): `BW_NODE_SCENES` in `MapEvents/content.ts`.
// Each later surface (177.4 to 177.8) adds its own cases here.
//
//   node --test scripts/narrator-verdicts.test.mjs

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

const LEDGER = 'plan/ballots/narrator-chapter1.md'
const CONTENT = 'axiomancer-mechanics/src/World/MapEvents/content.ts'
const MAP = 'axiomancer-mechanics/src/World/Continents/Coastal-Village/breakwater-chapter.ts'

/** The four scenes that have a picture of their own, in tie-break order. */
const PICTURES = [
  ['bw-w1', 'windmill-headland'],
  ['bw-l2', 'clifftop-chapel'],
  ['bw-d5', 'old-watchtower'],
  ['bw-p3', 'high-pass'],
]

/** The ledger's scenes: id, node, and the panels with their list markers cut off. */
export function ledgerScenes() {
  const text = read(LEDGER).split('\n## Scenes\n')[1].split('\n## Quest chain')[0]
  return text
    .split(/\n### /)
    .slice(1)
    .map((block) => {
      const [head, ...rest] = block.split('\n')
      return {
        id: head.match(/^S-\d+/)[0],
        node: head.match(/`(bw-[a-z0-9]+)`/)[1],
        panels: rest.filter((l) => /^\d+\. /.test(l)).map((l) => l.replace(/^\d+\. /, '')),
      }
    })
}

/** Read one quoted TypeScript string literal at the start of `s`; returns [value, rest]. */
function stringLiteral(s) {
  const q = s[0]
  let out = ''
  let i = 1
  while (s[i] !== q) {
    if (s[i] === '\\') {
      out += s[i + 1]
      i += 2
    } else out += s[i++]
  }
  return [out, s.slice(i + 1)]
}

/** The entries of `BW_NODE_SCENES`: node, picture, panels, whether it has a description and an effect. */
export function gameScenes() {
  const src = read(CONTENT)
  const start = src.indexOf('export const BW_NODE_SCENES')
  const end = src.indexOf('\n];', start)
  assert.ok(start > 0 && end > start, 'BW_NODE_SCENES is in content.ts')
  const block = src.slice(start, end)
  return block
    .split(/\n {4}\{\n/)
    .slice(1)
    .map((entry) => {
      const node = entry.match(/nodeId: '([^']+)'/)[1]
      const scene = entry.match(/scene: '([^']+)'/)?.[1]
      let rest = entry.slice(entry.indexOf('lines: [') + 'lines: ['.length)
      const lines = []
      for (;;) {
        rest = rest.replace(/^\s+/, '')
        if (rest[0] === ']') break
        const [value, after] = stringLiteral(rest)
        lines.push(value)
        rest = after.replace(/^,/, '')
      }
      return {
        node,
        scene,
        lines,
        hasDescription: /\bdescription:/.test(entry),
        effect: entry.match(/effect: (\{.*\}),?\n/)?.[1],
      }
    })
}

/** The Breakwater's roads, both ways, plus the sea cave passage. */
export function breakwaterGraph() {
  const src = read(MAP)
  const adj = new Map()
  const link = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set())
    if (!adj.has(b)) adj.set(b, new Set())
    adj.get(a).add(b)
    adj.get(b).add(a)
  }
  for (const m of src.matchAll(/\{ id: '(bw-[a-z0-9]+)', location: \[[^\]]*\],\s*connectedNodes: \[([^\]]*)\] \}/g)) {
    link(m[1], m[1])
    for (const t of m[2].matchAll(/'(bw-[a-z0-9]+)'/g)) link(m[1], t[1])
  }
  link('bw-h6', 'bw-c0') // the passage: each names the other as its travel destination
  return adj
}

/** The picture for a node: the nearest of the four by roads, a tie to the first in order. */
export function nearestPicture(adj, node) {
  const dist = new Map([[node, 0]])
  const queue = [node]
  while (queue.length) {
    const n = queue.shift()
    for (const t of adj.get(n)) {
      if (!dist.has(t)) {
        dist.set(t, dist.get(n) + 1)
        queue.push(t)
      }
    }
  }
  let best = PICTURES[0]
  for (const p of PICTURES) if (dist.get(p[0]) < dist.get(best[0])) best = p
  return best[1]
}

test('the ledger holds 22 scenes, S-01 to S-22, each with panels', () => {
  const scenes = ledgerScenes()
  assert.deepEqual(scenes.map((s) => s.id), Array.from({ length: 22 }, (_, i) => `S-${String(i + 1).padStart(2, '0')}`))
  for (const s of scenes) assert.ok(s.panels.length >= 1 && s.panels.length <= 6, `${s.id} has 1 to 6 panels`)
})

test('every approved scene is in BW_NODE_SCENES on its node, panel for panel, character for character', () => {
  const game = gameScenes()
  assert.equal(game.length, 22, 'one entry per scene, no extra slot')
  for (const s of ledgerScenes()) {
    const entry = game.find((g) => g.node === s.node)
    assert.ok(entry, `${s.id} (${s.node}) has no entry in BW_NODE_SCENES`)
    assert.deepEqual(entry.lines, s.panels, `${s.id} (${s.node}) differs from the ledger`)
  }
})

test('no scene is a placeholder, a marker or carries a stale description', () => {
  for (const g of gameScenes()) {
    for (const line of g.lines) {
      assert.ok(!line.includes('[content]'), `${g.node} still has a [content] line`)
      assert.ok(!line.includes('[NPC Content Needed]'), `${g.node} still has an NPC marker`)
    }
    assert.equal(g.hasDescription, false, `${g.node} has a description the ledger does not carry`)
  }
})

test('only the windmill gives a quest step, and it gives step 1', () => {
  for (const g of gameScenes()) {
    if (g.node === 'bw-w1') {
      assert.match(g.effect ?? '', /giveQuestStep: \{ questline: BREAKWATER_CHAPTER_QUESTLINE_ID, step: 1 \}/)
    } else assert.equal(g.effect, undefined, `${g.node} has an effect`)
  }
})

test('each scene shows the picture of the nearest scene that has one', () => {
  const adj = breakwaterGraph()
  for (const g of gameScenes()) {
    assert.equal(g.scene, nearestPicture(adj, g.node), `${g.node} picture`)
  }
  for (const [node, picture] of PICTURES) {
    assert.equal(gameScenes().find((g) => g.node === node).scene, picture, `${node} keeps its own picture`)
  }
})
