// scripts/axio-mcp-server.test.mjs — hermetic stdio smoke test for the
// axio-query MCP server. Zero dependencies (node:test + node:assert).
//
//   node --test scripts/axio-mcp-server.test.mjs
//
// Drives the real server as a child process over the real JSON-RPC stdio
// transport — initialize -> tools/list -> one tools/call per tool — the
// same shape as the KB server's spawn-per-session contract. Not part of
// `npm run verify` (the server lives outside every workspace); see the
// axio_query phase brief's "Verify gate" section for when to run it.

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const SERVER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'axio-mcp-server.mjs')
const CARDS_JSON = path.join(path.dirname(SERVER), '..', 'devlog', 'data', 'cards.json')

/** Spawn the server, send `requests` in order, resolve with their replies (matched by id). */
function drive(requests) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [SERVER], { stdio: ['pipe', 'pipe', 'pipe'] })
    const byId = new Map()
    const rl = createInterface({ input: proc.stdout })
    let stderr = ''
    rl.on('line', (line) => {
      if (!line.trim()) return
      const msg = JSON.parse(line)
      if (msg.id !== undefined) byId.set(msg.id, msg)
    })
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0 && stderr) return reject(new Error(`axio-mcp-server exited ${code}: ${stderr}`))
      resolve(byId)
    })
    for (const r of requests) proc.stdin.write(JSON.stringify(r) + '\n')
    proc.stdin.end()
  })
}

test('initialize replies with server info', async () => {
  const replies = await drive([{ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } }])
  const result = replies.get(1)?.result
  assert.equal(result?.serverInfo?.name, 'axio-query')
  assert.ok(result?.capabilities?.tools)
})

test('tools/list exposes all four axio_* tools', async () => {
  const replies = await drive([{ jsonrpc: '2.0', id: 1, method: 'tools/list' }])
  const names = (replies.get(1)?.result?.tools ?? []).map((t) => t.name).sort()
  assert.deepEqual(names, ['axio_cards', 'axio_effects', 'axio_keywords', 'axio_overview'])
})

test('axio_overview returns non-empty counts', async () => {
  const replies = await drive([
    { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'axio_overview', arguments: {} } },
  ])
  const text = replies.get(1)?.result?.content?.[0]?.text ?? ''
  // A bare \d+ still passes on a 0-count response (an empty/broken export) —
  // require a real nonzero lower bound so a corpus wipe fails this test.
  assert.match(text, /# Library — [1-9]\d* cards, [1-9]\d* enemies, [1-9]\d* effects/)
  // Phase 68: the denominator is gone — the registry is growable (THE PIPELINE
  // LIBERATION), so a hardcoded "/30" published a cap the project retired and
  // made a new keyword read as an overflow instead of a row.
  assert.match(text, /# Keyword registry — [1-9]\d* rows/)
  assert.doesNotMatch(text, /\/30 rows/)
})

test('axio_overview publishes live doctrine, not the retired STRIKE IS DEAD ban', async () => {
  const replies = await drive([
    { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'axio_overview', arguments: {} } },
  ])
  const text = replies.get(1)?.result?.content?.[0]?.text ?? ''
  assert.doesNotMatch(text, /STRIKE IS DEAD/)
  // The live doctrine, not one pinned sentence: the card constraints, the
  // absence of a governing objective function, and DEAL as a first-class verb.
  // Reword the library header freely; this still holds.
  assert.match(text, /# Doctrine — /)
  assert.match(text, /THE CONSTRAINTS:/)
  assert.match(text, /no rank band/)
  assert.match(text, /Direct damage is a first-class verb/)
})

test('axio_cards finds a known card by keyword substring', async () => {
  const replies = await drive([
    { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'axio_cards', arguments: { query: 'blow', limit: 3 } } },
  ])
  const text = replies.get(1)?.result?.content?.[0]?.text ?? ''
  assert.ok(text.length > 0)
  assert.doesNotMatch(text, /^No cards match/)
})

test('axio_effects finds bleed by name', async () => {
  const replies = await drive([
    { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'axio_effects', arguments: { query: 'bleed' } } },
  ])
  const text = replies.get(1)?.result?.content?.[0]?.text ?? ''
  assert.match(text, /Bleed \[debuff/)
})

test('axio_keywords returns the full registry when term is omitted', async () => {
  const replies = await drive([
    { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'axio_keywords', arguments: {} } },
  ])
  const text = replies.get(1)?.result?.content?.[0]?.text ?? ''
  // The registry is growable (THE PIPELINE LIBERATION, 2026-08-22) — assert
  // a healthy roster, not a pinned count. The floor follows the revamp's
  // carrier sweeps (R2b, R4, R5), which left 13 atlas rows.
  assert.ok(text.split('\n').filter(Boolean).length >= 11)
})

test('a mid-session export deletion is re-detected on the next call, not just the process-first one', async () => {
  // Regression witness for the Phase 57 incident (2026-08-24): a checkout
  // mutation deleted the tracked devlog/data/*.json snapshots out from under
  // an already-running server, which kept serving "0 cards" because
  // freshness was only ever checked once per process lifetime.
  const proc = spawn('node', [SERVER], { stdio: ['pipe', 'pipe', 'pipe'] })
  const pending = new Map()
  const rl = createInterface({ input: proc.stdout })
  rl.on('line', (line) => {
    if (!line.trim()) return
    const msg = JSON.parse(line)
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  })
  const call = (id, method, params) => new Promise((resolve) => {
    pending.set(id, resolve)
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
  })

  try {
    await call(1, 'initialize', { protocolVersion: '2024-11-05' })
    const first = await call(2, 'tools/call', { name: 'axio_overview', arguments: {} })
    assert.match(first.result.content[0].text, /# Library — [1-9]\d* cards/)

    fs.rmSync(CARDS_JSON)
    assert.ok(!fs.existsSync(CARDS_JSON))

    const second = await call(3, 'tools/call', { name: 'axio_overview', arguments: {} })
    // Must re-detect the missing snapshot and regenerate — never silently
    // keep serving stale in-memory state as if the corpus were untouched.
    assert.match(second.result.content[0].text, /# Library — [1-9]\d* cards/)
    assert.ok(fs.existsSync(CARDS_JSON))
  }
  finally {
    proc.stdin.end()
    proc.kill()
  }
})

test('unknown tool name errors', async () => {
  const replies = await drive([
    { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'axio_nonexistent', arguments: {} } },
  ])
  assert.equal(replies.get(1)?.error?.code, -32602)
})
