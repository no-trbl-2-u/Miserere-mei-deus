// scripts/telemetry-view.test.mjs — tests for the telemetry shard reader.
//
// Part of the root `npm test` suite. Builds throwaway `telemetry/`
// directories and checks that scripts/telemetry-view.mjs merges every
// shard into one timestamp-sorted table, applies its filters, and rejects
// malformed arguments.
//
//   node --test scripts/telemetry-view.test.mjs

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import { collectRows, filterRows, parseArgs } from './telemetry-view.mjs'

/** A data row with the given timestamp and event name. */
const row = (when, event) => `| ${when} | ${event} | - | - | - | - |`

/** A shard file body: some prose, the table header, then the rows. */
const shard = (...rows) =>
  `# Telemetry shard\n\nprose line | with a pipe\n\n| when (UTC) | event | name | model | dur | detail |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n`

/** Write `files` ({name: body}) into a fresh temp dir and return its path. */
const dirWith = (files) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-view-'))
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), body)
  return dir
}

test('rows from every shard come back as one timestamp-sorted list', () => {
  const dir = dirWith({
    'legacy-to-2026-09-23.md': shard(row('2026-09-22T10:00:00Z', 'old')),
    '2026-09-23_session-b.md': shard(row('2026-09-23T12:00:00Z', 'b1'), row('2026-09-23T14:00:00Z', 'b2')),
    '2026-09-23_session-a.md': shard(row('2026-09-23T13:00:00Z', 'a1')),
  })
  const events = collectRows(dir).map((r) => r.split('|')[2].trim())
  assert.deepEqual(events, ['old', 'b1', 'a1', 'b2'], 'interleaved sessions sort by time, not by file')
})

test('only table data rows are read, never headers or prose', () => {
  const dir = dirWith({ 'x.md': shard(row('2026-09-23T12:00:00Z', 'only')) })
  assert.equal(collectRows(dir).length, 1)
})

test('non-markdown files in the directory are ignored', () => {
  const dir = dirWith({
    'a.md': shard(row('2026-09-23T12:00:00Z', 'kept')),
    'notes.txt': row('2026-09-23T12:00:00Z', 'ignored'),
  })
  assert.deepEqual(collectRows(dir).map((r) => r.split('|')[2].trim()), ['kept'])
})

test('rows sharing a timestamp keep their shard order', () => {
  const dir = dirWith({ 'a.md': shard(row('2026-09-23T12:00:00Z', 'start'), row('2026-09-23T12:00:00Z', 'end')) })
  assert.deepEqual(collectRows(dir).map((r) => r.split('|')[2].trim()), ['start', 'end'])
})

test('a missing directory yields no rows', () => {
  assert.deepEqual(collectRows(path.join(os.tmpdir(), 'no-such-telemetry-dir-xyz')), [])
})

test('--since keeps rows on or after the date; --tail keeps the newest N', () => {
  const rows = [
    row('2026-09-21T00:00:00Z', 'a'),
    row('2026-09-22T00:00:00Z', 'b'),
    row('2026-09-23T00:00:00Z', 'c'),
  ]
  assert.equal(filterRows(rows, { since: '2026-09-22' }).length, 2)
  assert.deepEqual(filterRows(rows, { tail: 1 }), [rows[2]])
  assert.deepEqual(filterRows(rows, { since: '2026-09-21', tail: 2 }), rows.slice(1))
})

test('arguments parse, and malformed ones are rejected', () => {
  assert.deepEqual(parseArgs(['--since', '2026-09-20', '--tail', '5']), { since: '2026-09-20', tail: 5 })
  assert.deepEqual(parseArgs([]), {})
  assert.throws(() => parseArgs(['--since', 'yesterday']))
  assert.throws(() => parseArgs(['--tail', '0']))
  assert.throws(() => parseArgs(['--bogus']))
})

test('--kind keeps one event kind and its -end rows, script rows included', () => {
  const dir = dirWith({
    'a.md': shard(
      row('2026-10-20T10:00:00Z', 'slash-prompt'),
      '| 2026-10-20T10:00:05Z | script | verify:visual | claude-opus-5 | - | SMOKE_RUNS=5 npm run verify:visual |',
      row('2026-10-20T10:00:06Z', 'skill'),
      '| 2026-10-20T10:01:10Z | script-end | verify:visual | claude-opus-5 | 1m05s | ok; matched 13 / differing 0 / missing 0 |',
      row('2026-10-20T10:02:00Z', 'tick-end'),
    ),
  })
  const kept = filterRows(collectRows(dir), { kind: 'script' })
  assert.deepEqual(kept.map((r) => r.split('|')[2].trim()), ['script', 'script-end'])
  assert.match(kept[1], /ok; matched 13 \/ differing 0 \/ missing 0/)
  assert.deepEqual(parseArgs(['--kind', 'script']), { kind: 'script' })
  assert.throws(() => parseArgs(['--kind', 'Script|x']))
})
