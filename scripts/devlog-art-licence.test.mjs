#!/usr/bin/env node
// scripts/devlog-art-licence.test.mjs — the publication gate for art.
//
// The public site republishes the game's pictures to strangers. These cases
// pin the one rule T's "publish everything" ruling does not reach: a file
// whose licence the tree cannot prove does not leave the repository.

import test from 'node:test'
import assert from 'node:assert/strict'
import { classify, covers, recordFor, readProvenance, verdictFor } from './devlog-art-licence.mjs'

test('public-domain and CC0 files publish, with no attribution obligation', () => {
    for (const licence of ['Public domain', 'public domain (author died 1883)', 'CC0', 'PD-old', 'No restrictions']) {
        const verdict = classify({ license: licence })
        assert.equal(verdict.publish, true, `${licence} should publish`)
        assert.equal(verdict.tier, 'public-domain')
    }
})

test('an attribution licence publishes only when the artist is on record', () => {
    const named = classify({ license: 'CC BY 3.0', artist: 'lorc' })
    assert.equal(named.publish, true)
    assert.equal(named.tier, 'attribution')
    assert.equal(named.attribution, 'lorc')

    const anonymous = classify({ license: 'CC BY 3.0' })
    assert.equal(anonymous.publish, false)
    assert.match(anonymous.why, /names no artist/)
})

test('UNRESOLVED is a refusal, not a shrug', () => {
    const verdict = classify({ license: 'UNRESOLVED' })
    assert.equal(verdict.publish, false)
    assert.match(verdict.why, /cannot show a right to redistribute/)
})

test('a file with no record at all is withheld', () => {
    assert.equal(classify(null).publish, false)
    assert.equal(verdictFor('cards', 'not-a-real-file.webp', []).publish, false)
})

test('a later record wins over the directory wildcard it supersedes', () => {
    const records = [
        { license: 'UNRESOLVED', covers: 'every .webp in this directory not named by a later entry' },
        { license: 'CC BY 3.0', artist: 'lorc', covers: 'seam-tick.webp (lorc/tick.svg),prop-wight.webp (lorc/ghost.svg)' },
    ]
    assert.equal(recordFor(records, 'seam-tick.webp').license, 'CC BY 3.0')
    assert.equal(recordFor(records, 'anything-else.webp').license, 'UNRESOLVED')
    assert.equal(covers(records[1], 'prop-wight.webp'), true)
    assert.equal(covers(records[1], 'prop.webp'), false)
})

test('the shipped tree still says what the About page claims: card art is withheld, and so is the boss', () => {
    // These two directories are the ones the public catalog reads. If either
    // verdict flips, the About page's wording and the catalog's plates must
    // change with it — which is exactly why this is asserted rather than
    // described in a comment.
    assert.equal(verdictFor('cards', 'freeze.webp').publish, false, 'card art must not publish while its licence is UNRESOLVED')
    const records = readProvenance('enemies')
    assert.ok(records.length > 1, 'the enemies directory should carry per-file records')
    // Phase AN4a retired the one CC BY silhouette. The boss is now torio's
    // free material, whose terms name no licence this gate recognises, so it
    // is withheld until T rules those terms into PUBLIC_DOMAIN.
    const boss = verdictFor('enemies', 'death-beholder.webp', records)
    assert.equal(boss.publish, false)
    assert.match(boss.why, /neither public domain\/CC0 nor an attribution licence/)
    assert.ok(boss.attribution.length > 0, 'the artist stays on record either way')
})
