// scripts/no-reuse-export-flags.test.mjs
//
// The shared web export (`axiomancer-mobile/scripts/lib/web-export.mjs`) is
// reused by its stamp, so no script or verify workflow may bring back a
// `*_REUSE_EXPORT` flag (a flag that forces reuse past a stale export) or a
// bare `spawnSync('npx'` export that skips the helper's Windows spawn.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SCRIPTS = join(ROOT, 'axiomancer-mobile', 'scripts')
const WORKFLOWS = ['verify-mobile.yml', 'verify-mechanics.yml'].map((f) => join(ROOT, '.github', 'workflows', f))
const SELF = fileURLToPath(import.meta.url)

function walk(dir) {
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) return name === 'node_modules' ? [] : walk(p)
        return /\.(mjs|js|ts|sh)$/.test(name) ? [p] : []
    })
}

export function offendingLines(text) {
    return text.split('\n').flatMap((line, i) =>
        /_REUSE_EXPORT\b/.test(line) || /spawnSync\(\s*['"]npx/.test(line) ? [`${i + 1}: ${line.trim()}`] : [])
}

test('the matcher catches both shapes and passes the helper call', () => {
    assert.equal(offendingLines("if (process.env.SMOKE_REUSE_EXPORT === '1') {").length, 1)
    assert.equal(offendingLines("const r = spawnSync( 'npx', ['expo'])").length, 1)
    assert.equal(offendingLines('await ensureWebExport({ outDir: EXPORT_DIR, log })').length, 0)
})

test('no mobile script or verify workflow carries a reuse flag or a bare npx export', () => {
    const hits = [...walk(SCRIPTS), ...WORKFLOWS]
        .filter((p) => p !== SELF)
        .flatMap((p) => offendingLines(readFileSync(p, 'utf8')).map((l) => `${relative(ROOT, p)}:${l}`))
    assert.deepEqual(hits, [])
})
