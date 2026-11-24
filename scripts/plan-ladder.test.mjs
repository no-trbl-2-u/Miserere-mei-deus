// The ladder spec settle opens keeps plan-check's Measure rule: open + closed = next - 1.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ladderChunk, ladderSpec } from './plan/settle.mjs'

const MEASURE = /^Measure: (\d+) open · (\d+) closed · next A(\d+)$/m

function measure(text) {
  const [, open, closed, next] = MEASURE.exec(text).map(Number)
  return { open, closed, next }
}

for (const n of [1, 11]) {
  test(`a ladder opened at A${n} keeps open + closed = next - 1, before and after its first chunk`, () => {
    const opened = measure(ladderSpec(n))
    assert.equal(opened.open + opened.closed, opened.next - 1)
    const { text } = ladderChunk(ladderSpec(n), 'some-trap', 2, [])
    const added = measure(text)
    assert.equal(added.open, 1)
    assert.equal(added.open + added.closed, added.next - 1)
  })
}
