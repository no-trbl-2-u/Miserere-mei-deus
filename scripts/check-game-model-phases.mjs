#!/usr/bin/env node
// scripts/check-game-model-phases.mjs — fails when docs/game-model.md says a
// rule holds "until phase <alias>" and plan/ARCHIVE.md lists that alias as
// shipped: the line is out of date. Pure functions; the CLI reads the files.
//
//   node scripts/check-game-model-phases.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Every alias the archive lists as shipped: `(alias: DY1c)`. */
export function shippedAliases(archive) {
  return new Set([...archive.matchAll(/\(alias:\s*([A-Za-z0-9]+)\)/g)].map((m) => m[1]))
}

/** Every "until phase <alias>" in the doc, with the line the claim starts on. */
export function untilPhaseClaims(doc) {
  return [...doc.matchAll(/until\s+phase\s+([A-Za-z0-9]+)/gi)].map((m) => ({
    alias: m[1],
    line: doc.slice(0, m.index).split('\n').length,
  }))
}

/** The claims whose phase the archive lists as shipped. */
export function stalePhaseClaims(doc, archive) {
  const shipped = shippedAliases(archive)
  return untilPhaseClaims(doc).filter((c) => shipped.has(c.alias))
}

const here = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === here) {
  const root = path.resolve(path.dirname(here), '..')
  const doc = fs.readFileSync(path.join(root, 'docs/game-model.md'), 'utf8')
  const archive = fs.readFileSync(path.join(root, 'plan/ARCHIVE.md'), 'utf8')
  const stale = stalePhaseClaims(doc, archive)
  for (const c of stale) console.error(`docs/game-model.md:${c.line}: "until phase ${c.alias}" shipped (see plan/ARCHIVE.md); update the line.`)
  if (stale.length) process.exit(1)
  console.log('game-model phases: ok')
}
