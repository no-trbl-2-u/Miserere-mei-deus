// The quota gate trusts a cached reading only until its window resets.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decide } from './cloud/quota.mjs'

const now = new Date('2026-11-24T12:00:00Z')
const base = { pause: null, kind: 'scheduled', max: 0.9, now }

test('an over-cap reading inside its window skips a scheduled run', () => {
  const cache = { utilization: 0.93, status: 'allowed_warning', resetsAt: '2026-11-28T22:00:00Z' }
  assert.equal(decide({ ...base, cache }).skip, true)
})

for (const status of ['allowed_warning', 'allowed', 'rejected']) {
  test(`an over-cap ${status} reading past its reset no longer skips`, () => {
    const cache = { utilization: 0.93, status, resetsAt: '2026-11-14T22:00:00Z' }
    assert.equal(decide({ ...base, cache }).skip, false)
  })
}

test('a reading with no reset time is still trusted', () => {
  const cache = { utilization: 0.93, status: 'allowed_warning', resetsAt: null }
  assert.equal(decide({ ...base, cache }).skip, true)
})
