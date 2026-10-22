// scripts/check-utf8.test.mjs — every tracked text file decodes as UTF-8.
// A Windows-1252 byte (an em dash saved as 0x97) once reached a source
// comment and sat on main unnoticed (lesson `ps51-utf8-roundtrip`); a
// strict decode catches it on the next root `npm test`.
//
//   node --test scripts/check-utf8.test.mjs

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TEXT_GLOBS = ['*.ts', '*.tsx', '*.js', '*.mjs', '*.cjs', '*.json', '*.md', '*.yml', '*.yaml']

function isUtf8(bytes) {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return true
  } catch {
    return false
  }
}

test('isUtf8: a UTF-8 em dash passes, a cp1252 one fails', () => {
  assert.equal(isUtf8(Buffer.from('a — b', 'utf-8')), true)
  assert.equal(isUtf8(Buffer.from([0x61, 0x20, 0x97, 0x20, 0x62])), false)
})

test('every tracked text file is valid UTF-8', () => {
  const files = execFileSync('git', ['ls-files', '-z', '--', ...TEXT_GLOBS], { cwd: ROOT })
    .toString()
    .split('\0')
    .filter(Boolean)
  assert.ok(files.length > 0, 'git ls-files found no text files')
  const bad = files.filter((f) => {
    const abs = path.join(ROOT, f)
    return fs.existsSync(abs) && !isUtf8(fs.readFileSync(abs))
  })
  assert.deepEqual(bad, [], `not UTF-8 (re-save as UTF-8): ${bad.join(', ')}`)
})
