// Every workflow step that runs `playwright install ... --with-deps` carries a step-level `timeout-minutes`,
// so an apt mirror that hangs fails the step fast instead of eating the whole job (AUDIT row on the
// `--with-deps` hang, closed 2026-11-22).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.github', 'workflows')

/** The step blocks of a workflow file: each `- ` list item under `steps:`, as its lines. */
export function stepBlocks(text) {
  const lines = text.split('\n')
  const blocks = []
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)- /.exec(lines[i])
    if (!m) continue
    const indent = m[1].length
    let j = i + 1
    while (j < lines.length && (lines[j].trim() === '' || /^\s*/.exec(lines[j])[0].length > indent)) j++
    blocks.push(lines.slice(i, j))
  }
  return blocks
}

/** Steps that install Playwright browsers with system deps but set no step timeout. */
export function untimedInstalls(text) {
  return stepBlocks(text)
    .filter((b) => b.some((l) => /playwright install/.test(l) && /--with-deps/.test(l)))
    .filter((b) => !b.some((l) => /^\s*timeout-minutes:\s*\d+/.test(l)))
    .map((b) => b[0].trim())
}

test('untimedInstalls flags a --with-deps step with no timeout and passes one with it', () => {
  const bad = 'jobs:\n  a:\n    steps:\n      - name: Install\n        run: npx playwright install --with-deps chromium\n'
  const good = 'jobs:\n  a:\n    steps:\n      - name: Install\n        timeout-minutes: 10\n        run: npx playwright install --with-deps chromium\n'
  assert.deepEqual(untimedInstalls(bad), ['- name: Install'])
  assert.deepEqual(untimedInstalls(good), [])
})

test('every live workflow step running playwright install --with-deps has timeout-minutes', () => {
  const misses = fs.readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f))
    .flatMap((f) => untimedInstalls(fs.readFileSync(path.join(DIR, f), 'utf8')).map((s) => `${f}: ${s}`))
  assert.deepEqual(misses, [])
})
