#!/usr/bin/env node
// axiomancer-mobile/scripts/ingest-art.mjs — the art ingest recipe, runnable
// (phase 71).
//
//   node scripts/ingest-art.mjs --in <file-or-dir> --category labyrinth/doors
//   node scripts/ingest-art.mjs --in tmp-images/doors --category labyrinth/doors --dry-run
//
// Encodes the recipe that produced the Doré plate (`assets/images/maps/
// provenance.json`) so it stops being a thing one person did once with Pillow:
//
//   grade (grayscale + brightness/contrast toward the void)
//     -> resize so the longest edge is <= 640px, never upscaling
//     -> WebP at the recorded quality
//     -> a provenance entry in the same run
//
// The provenance write is part of the recipe, not a follow-up step, because
// `docs/asset-conventions.md` §4 is "No provenance entry, no asset" — a script
// that emitted an image and left the record to a human would just reproduce
// the gap this phase exists to close.
//
// Flags:
//   --in <path>          file or directory to ingest (required)
//   --category <path>    destination under assets/images/ (required)
//   --source <url>       where the art came from (recorded verbatim)
//   --license <text>     license, or UNRESOLVED with --license-note
//   --license-note <t>   why the license is unresolved
//   --artist <name>      creator, when known
//   --quality <n>        WebP quality (default 44, the recorded Doré value)
//   --max-edge <n>       longest edge in px (default 640, the conventions cap)
//   --no-grade           skip the grayscale/brightness/contrast grade
//   --dry-run            report what would change, write nothing

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = path.resolve(MOBILE, '..')
const IMAGES = path.join(MOBILE, 'assets', 'images')

/** The recorded Doré grade — `maps/provenance.json` is the source of these. */
export const RECIPE = {
  maxEdge: 640,
  quality: 44,
  grayscale: true,
  brightness: 0.62,
  contrast: 1.08,
}

const RASTER = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff'])

export function parseArgs(argv) {
  const out = { quality: RECIPE.quality, maxEdge: RECIPE.maxEdge, grade: true }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--no-grade') out.grade = false
    else if (a.startsWith('--')) {
      const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      const value = argv[i + 1]
      if (value == null || value.startsWith('--')) throw new Error(`ingest-art: ${a} needs a value`)
      out[key] = key === 'quality' || key === 'maxEdge' ? Number(value) : value
      i++
    }
  }
  return out
}

/** Every raster file to ingest from a file-or-directory input. */
export function inputsFrom(inPath) {
  const abs = path.resolve(ROOT, inPath)
  if (!fs.existsSync(abs)) throw new Error(`ingest-art: --in not found: ${inPath}`)
  if (fs.statSync(abs).isFile()) return [abs]
  return fs.readdirSync(abs)
    .filter((f) => RASTER.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(abs, f))
    .sort()
}

/** `assets/images/<category>/<kebab-name>.webp` — the conventions §2 shape. */
export function destinationFor(inputAbs, category) {
  const base = path.basename(inputAbs, path.extname(inputAbs))
  const kebab = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return path.join(IMAGES, category, `${kebab}.webp`)
}

/**
 * The provenance entry this run adds. `license: 'UNRESOLVED'` is a legitimate,
 * REPORTED state — see `asset-provenance.test.mjs`. It is not a way to skip the
 * record; it is how the record says the question is open, so the debt is
 * counted on every run instead of vanishing.
 */
export function provenanceEntry(opts, covers) {
  const entry = {
    generated_by: opts.source ? 'acquisition' : 'owner-supplied',
    date: opts.date ?? new Date().toISOString().slice(0, 10),
    tool: `scripts/ingest-art.mjs (sharp) — ${opts.grade ? 'graded' : 'ungraded'}`,
    post_process: opts.grade
      ? `grayscale, brightness ${RECIPE.brightness} / contrast ${RECIPE.contrast} toward the void, `
        + `longest edge <= ${opts.maxEdge}px, WebP q${opts.quality}`
      : `longest edge <= ${opts.maxEdge}px, WebP q${opts.quality}`,
    license: opts.license ?? 'UNRESOLVED',
    covers,
  }
  if (opts.source) entry.source = opts.source
  if (opts.artist) entry.artist = opts.artist
  if (entry.license === 'UNRESOLVED') {
    entry.license_note = opts.licenseNote
      ?? 'License not on record. Do not treat as cleared; see docs/asset-conventions.md.'
  }
  return entry
}

/** Merge an entry into a directory `provenance.json`, keeping it an array. */
export function mergeProvenance(existing, entry) {
  const list = Array.isArray(existing) ? [...existing] : existing ? [existing] : []
  const at = list.findIndex((e) => JSON.stringify(e.covers) === JSON.stringify(entry.covers))
  if (at >= 0) list[at] = entry
  else list.push(entry)
  return list
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (!opts.in || !opts.category) {
    console.error('ingest-art: --in <path> and --category <dir> are required.')
    process.exit(1)
  }

  const { default: sharp } = await import('sharp')
  const inputs = inputsFrom(opts.in)
  if (inputs.length === 0) {
    console.error(`ingest-art: no raster files under ${opts.in}`)
    process.exit(1)
  }

  const outDir = path.join(IMAGES, opts.category)
  if (!opts.dryRun) fs.mkdirSync(outDir, { recursive: true })

  const written = []
  let before = 0
  let after = 0
  for (const input of inputs) {
    const dest = destinationFor(input, opts.category)
    const sourceBytes = fs.statSync(input).size
    before += sourceBytes

    let pipeline = sharp(input)
    const meta = await pipeline.metadata()
    const longest = Math.max(meta.width ?? 0, meta.height ?? 0)
    if (longest > opts.maxEdge) {
      // `withoutEnlargement` guards the case where a later caller lowers
      // --max-edge below an asset's size and then raises it again.
      pipeline = pipeline.resize({
        width: meta.width >= meta.height ? opts.maxEdge : undefined,
        height: meta.height > meta.width ? opts.maxEdge : undefined,
        withoutEnlargement: true,
      })
    }
    if (opts.grade) {
      pipeline = pipeline
        .grayscale()
        .modulate({ brightness: RECIPE.brightness })
        .linear(RECIPE.contrast, -(128 * RECIPE.contrast) + 128)
    }
    const buffer = await pipeline.webp({ quality: opts.quality }).toBuffer()
    after += buffer.length
    written.push(path.relative(MOBILE, dest))
    const delta = `${(sourceBytes / 1024).toFixed(0)}K -> ${(buffer.length / 1024).toFixed(0)}K`
    console.log(`${opts.dryRun ? 'would write' : 'wrote'} ${path.relative(MOBILE, dest)}  (${delta})`)
    if (!opts.dryRun) fs.writeFileSync(dest, buffer)
  }

  // Provenance is written in the SAME run — §4 of the conventions.
  const provPath = path.join(outDir, 'provenance.json')
  const covers = written.map((w) => path.basename(w)).sort()
  const entry = provenanceEntry(opts, covers)
  if (!opts.dryRun) {
    const existing = fs.existsSync(provPath) ? JSON.parse(fs.readFileSync(provPath, 'utf-8')) : null
    fs.writeFileSync(provPath, `${JSON.stringify(mergeProvenance(existing, entry), null, 2)}\n`)
  }
  console.log(
    `\ningest-art: ${written.length} asset(s), `
      + `${(before / 1024).toFixed(0)}K -> ${(after / 1024).toFixed(0)}K `
      + `(${Math.round((1 - after / before) * 100)}% smaller)`,
  )
  console.log(`provenance: ${opts.dryRun ? 'would update' : 'updated'} ${path.relative(MOBILE, provPath)}`)
  if (entry.license === 'UNRESOLVED') {
    console.log('NOTE: license recorded as UNRESOLVED — the asset test will report it every run.')
  }
  console.log('Remember the registry: add the require() literals to that directory\'s index.ts.')
}

// pathToFileURL, not a `file://` prefix: on Windows `argv[1]` is `C:\...`
// and the naive compare never matches, so the ingest silently did nothing
// when AN1e first ran it. Every other script in this directory already
// uses this form (`acquire-art.mjs`, `critique-drive.mjs`).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(String(err.message ?? err)); process.exit(1) })
}
