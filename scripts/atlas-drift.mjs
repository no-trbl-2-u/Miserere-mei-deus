#!/usr/bin/env node
// Where the docs disagree with the engine, read from atlas.json. Advisory:
// findings are listed on the atlas's drift plate and printed here; nothing
// fails a build or a test on a finding.
//
//   node scripts/atlas-drift.mjs [atlas.json]
//
// findDrift(atlas, docs) is pure: docs = { gameModel, spec, meta } are the
// text of docs/game-model.md and spec.md and the parsed devlog/data/meta.json
// (each optional). A finding is { severity, file, claim, engine }.

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The first "<number> <noun>" in text: { n, text } or null. */
export function statedCount(text, noun) {
  const re = new RegExp(`\\b(${WORDS.join('|')}|\\d+)\\s+${noun}\\b`, 'i')
  const m = re.exec(text ?? '')
  if (!m) return null
  const w = m[1].toLowerCase()
  const n = /^\d+$/.test(w) ? Number(w) : WORDS.indexOf(w)
  return { n, text: m[0] }
}

const plain = (s) => s.replace(/[‘’]/g, "'")
const squash = (s) => plain(s).replace(/\s+/g, ' ')
const hasWord = (text, word) => new RegExp(`(^|[^A-Za-z0-9_])${escapeRe(plain(word))}($|[^A-Za-z0-9_])`).test(squash(text))

/** Each non-indented line starts a new paragraph; its indented continuation
 * lines (the doc's soft-wrap) join it. */
const paragraphs = (text) => plain(text).split(/\n(?=\S)/)

/** A name is found if it appears in full, or — for a possessive compound
 * name ("Elementalist's Signet") — if the group's possessive and the rest
 * both appear in the same paragraph: the doc states the group once and
 * refers to its members by the bare noun after that (e.g. "the
 * Elementalist's three: the Signet, the Brooch and the Belt"). */
const hasName = (text, name) => {
  if (hasWord(text, name)) return true
  const m = /^(.+?)'s (.+)$/.exec(name)
  if (!m) return false
  const [, group, rest] = m
  return paragraphs(text).some((p) => hasWord(p, `${group}'s`) && hasWord(p, rest))
}

export function findDrift(atlas, docs = {}) {
  const out = []
  const add = (severity, file, claim, engine) => out.push({ severity, file, claim, engine })
  const gm = docs.gameModel
  const spec = docs.spec

  if (typeof gm === 'string') {
    const f = 'docs/game-model.md'
    const rc = statedCount(gm, 'relics')
    if (rc && rc.n !== atlas.relics.length) add('hi', f, `states "${rc.text}"`, `${atlas.relics.length} relics in relicLibrary`)
    for (const r of atlas.relics) if (!hasName(gm, r.name)) add('md', f, `does not name the relic ${r.name}`, `relic ${r.id}`)
    for (const s of atlas.signatures) if (!hasName(gm, s.name)) add('md', f, `does not name the signature ${s.name}`, `signature ${s.id}`)
    const kws = [...new Set(atlas.cards.flatMap((c) => c.keywords))].sort()
    for (const k of kws) if (!hasWord(gm, k)) add('lo', f, `does not mention the keyword ${k}`, `printed on ${atlas.cards.filter((c) => c.keywords.includes(k)).length} card(s)`)
  }

  if (typeof spec === 'string') {
    const sc = statedCount(spec, 'signatures')
    if (sc && sc.n !== atlas.signatures.length) add('hi', 'spec.md', `states "${sc.text}"`, `${atlas.signatures.length} signatures in SIGNATURE_SKILLS`)
  }

  if (docs.meta && docs.meta.commit && atlas.meta && docs.meta.commit !== atlas.meta.commit) {
    add('md', 'devlog/data/meta.json', `catalog built at ${docs.meta.commit}`, `atlas.json built at ${atlas.meta.commit}`)
  }
  return out
}

/** Read the real docs from the repo root. */
export function readDocs(root = ROOT) {
  const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : undefined)
  const metaText = read(join(root, 'devlog', 'data', 'meta.json'))
  return { gameModel: read(join(root, 'docs', 'game-model.md')), spec: read(join(root, 'spec.md')), meta: metaText ? JSON.parse(metaText) : undefined }
}

export function formatFindings(findings, atlas) {
  if (!findings.length) return `no drift found at ${atlas.meta?.commit ?? 'unknown'}`
  return findings.map((f) => `[${f.severity}] ${f.file}: ${f.claim} (engine: ${f.engine})`).join('\n')
}

function isDirectRun() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
}

if (isDirectRun()) {
  const src = process.argv[2] ?? join(ROOT, 'devlog', 'data', 'atlas.json')
  if (!existsSync(src)) {
    console.error(`atlas-drift: ${src} is missing. Run \`npm run catalog:export\` first.`)
    process.exit(1)
  }
  const atlas = JSON.parse(readFileSync(src, 'utf8'))
  console.log(formatFindings(findDrift(atlas, readDocs()), atlas))
}
