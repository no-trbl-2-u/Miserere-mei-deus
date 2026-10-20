// scripts/web-export.test.mjs
//
// The shared web export's pure helpers: the stamp hash, the reuse decision
// and the spawn spec. No Expo is spawned.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
    computeStamp,
    computeStampHash,
    decideExport,
    exportSpawnSpec,
    parseLsFiles,
    parseStatus,
    readStamp,
    STAMP_FILE,
} from './lib/web-export.mjs'

const tracked = [
    { path: 'axiomancer-mobile/app/index.tsx', blob: 'aaa' },
    { path: 'axiomancer-mechanics/src/index.ts', blob: 'bbb' },
]

test('the stamp hash ignores input order and tracks every input', () => {
    const base = computeStampHash({ tracked, dirty: {}, expo: '54.0.0' })
    assert.equal(computeStampHash({ tracked: [...tracked].reverse(), dirty: {}, expo: '54.0.0' }), base)
    assert.notEqual(computeStampHash({ tracked: [tracked[0], { ...tracked[1], blob: 'ccc' }], dirty: {}, expo: '54.0.0' }), base)
    assert.notEqual(computeStampHash({ tracked, dirty: {}, expo: '54.0.1' }), base)
})

test('a dirty file replaces its blob id, a deleted one drops out, an untracked one joins', () => {
    const base = computeStampHash({ tracked, dirty: {}, expo: 'x' })
    const edited = computeStampHash({ tracked, dirty: { 'axiomancer-mobile/app/index.tsx': 'f00' }, expo: 'x' })
    const deleted = computeStampHash({ tracked, dirty: { 'axiomancer-mobile/app/index.tsx': null }, expo: 'x' })
    const added = computeStampHash({ tracked, dirty: { 'axiomancer-mobile/app/new.tsx': 'f00' }, expo: 'x' })
    assert.equal(new Set([base, edited, deleted, added]).size, 4)
})

test('git ls-files and status records parse', () => {
    assert.deepEqual(parseLsFiles('100644 abc 0\tapp/x.tsx\x00100644 def 0\tapp/a b.tsx\x00'), [
        { path: 'app/x.tsx', blob: 'abc' },
        { path: 'app/a b.tsx', blob: 'def' },
    ])
    assert.deepEqual(parseStatus(' M app/x.tsx\x00?? app/y.tsx\x00R  app/new.tsx\x00app/old.tsx\x00 D app/z.tsx\x00'), [
        'app/x.tsx', 'app/y.tsx', 'app/new.tsx', 'app/z.tsx',
    ])
})

test('stamp hit reuses; miss, missing dir and missing stamp export', () => {
    assert.deepEqual(decideExport({ hash: 'h', stamp: { hash: 'h' }, hasIndex: true }), { reuse: true, reason: 'stamp hit' })
    assert.equal(decideExport({ hash: 'h', stamp: { hash: 'old' }, hasIndex: true }).reason, 'stamp miss')
    assert.equal(decideExport({ hash: 'h', stamp: null, hasIndex: false }).reason, 'no export')
    assert.equal(decideExport({ hash: 'h', stamp: null, hasIndex: true }).reason, 'no stamp file')
    assert.equal(decideExport({ hash: null, stamp: { hash: null }, hasIndex: true }).reuse, false)
})

test('force and AXM_FORCE_EXPORT=1 always export', () => {
    const hit = { hash: 'h', stamp: { hash: 'h' }, hasIndex: true }
    assert.deepEqual(decideExport({ ...hit, force: true }), { reuse: false, reason: 'forced' })
    assert.deepEqual(decideExport({ ...hit, env: { AXM_FORCE_EXPORT: '1' } }), { reuse: false, reason: 'forced' })
    assert.equal(decideExport({ ...hit, env: { AXM_FORCE_EXPORT: '0' } }).reuse, true)
})

test('Windows spawns npx.cmd through a shell; elsewhere npx without one; always a preview build', () => {
    const win = exportSpawnSpec({ outDir: 'C:\\x\\.smoke-dist', platform: 'win32', cwd: 'C:\\x', env: {} })
    assert.equal(win.command, 'npx.cmd')
    assert.equal(win.options.shell, true)
    assert.deepEqual(win.args, ['expo', 'export', '--platform', 'web', '--output-dir', 'C:\\x\\.smoke-dist'])
    const linux = exportSpawnSpec({ outDir: '/x/.smoke-dist', platform: 'linux', cwd: '/x', env: {} })
    assert.equal(linux.command, 'npx')
    assert.equal(linux.options.shell, false)
    assert.equal(linux.options.env.BUILD_PROFILE, 'preview')
    assert.deepEqual(linux.options.stdio, ['ignore', 2, 2])
})

test('readStamp reads the stamp file and is null when absent or broken', () => {
    const dir = mkdtempSync(join(tmpdir(), 'axm-stamp-'))
    try {
        assert.equal(readStamp(dir), null)
        writeFileSync(join(dir, STAMP_FILE), '{not json')
        assert.equal(readStamp(dir), null)
        writeFileSync(join(dir, STAMP_FILE), JSON.stringify({ hash: 'h', at: 't', expo: 'e', node: 'n' }))
        assert.equal(readStamp(dir).hash, 'h')
    } finally {
        rmSync(dir, { recursive: true, force: true })
    }
})

test('the stamp of this checkout is stable across two reads', () => {
    const a = computeStamp()
    if (a === null) return
    assert.match(a.hash, /^[0-9a-f]{64}$/)
    assert.equal(computeStamp().hash, a.hash)
})
