#!/usr/bin/env node
// scripts/devlog-art-licence.test.mjs — the publication gate for art.
//
// The public site republishes the game's pictures to strangers. The art
// licence question is closed (T, 2026-10-29, D115). These cases pin what is
// left of the gate: a file with no recognised licence on record still does not
// leave the repository.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { IMAGE_ROOT, classify, covers, recordFor, readProvenance, verdictFor } from './devlog-art-licence.mjs'

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
    assert.match(verdict.why, /no licence on record/)
})

test('the three open forms publish as the open tier: the D115 ruling, the torio grant, the owner-generated record', () => {
    const forms = [
        'open source (T, 2026-10-29, D115)',
        'torio Javardry free material: free for any use including commercial, modification and redistribution; no attribution required',
        "Owner-generated for this project (OpenAI's terms assign output rights to the user)",
    ]
    for (const licence of forms) {
        const verdict = classify({ license: licence })
        assert.equal(verdict.publish, true, `${licence} should publish`)
        assert.equal(verdict.tier, 'open')
    }
})

test('the gate still refuses what it does not recognise', () => {
    for (const licence of ['', 'UNRESOLVED', 'All rights reserved', 'open source', 'open source (somebody, 2026-01-01)',
        'torio Javardry free material, attribution required', 'Owner-generated elsewhere']) {
        const verdict = classify({ license: licence })
        assert.equal(verdict.publish, false, `${JSON.stringify(licence)} must not publish`)
        assert.equal(verdict.tier, 'excluded')
    }
    assert.equal(classify({ license: 'CC BY 3.0' }).publish, false, 'an attribution licence with no artist still refuses')
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

test('the shipped tree publishes the card art and the boss: the licence question is closed (D115)', () => {
    // These two directories are the ones the public catalog reads. If either
    // verdict flips, the catalog's plates change with it.
    assert.equal(verdictFor('cards', 'freeze.webp').publish, true, 'card art publishes under D115')
    const records = readProvenance('enemies')
    assert.ok(records.length > 1, 'the enemies directory should carry per-file records')
    const boss = verdictFor('enemies', 'death-beholder.webp', records)
    assert.equal(boss.publish, true, "torio's free-material grant publishes")
    assert.equal(boss.tier, 'open')
    assert.ok(boss.attribution.length > 0, 'the artist stays on record')
    assert.equal(verdictFor('maps', readdirSync(join(IMAGE_ROOT, 'maps')).find((f) => /\.webp$/.test(f))).publish, true)
})

test('no provenance record in the tree reads UNRESOLVED', () => {
    for (const dir of ['cards', 'combat', 'enemies', 'maps', 'portraits', 'splatter', 'treasure']) {
        for (const record of readProvenance(dir)) assert.notEqual(String(record.license).trim().toUpperCase().split(/\s/)[0], 'UNRESOLVED', dir)
    }
})
