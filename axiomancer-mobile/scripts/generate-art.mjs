#!/usr/bin/env node
// axiomancer-mobile/scripts/generate-art.mjs — compile, generate, ingest (phase 73).
//
//   node scripts/generate-art.mjs --spec prompts/enemies/tallow-bailiff.json
//   node scripts/generate-art.mjs --spec <file> --dry-run
//   node scripts/generate-art.mjs --spec prompts/enemies/float-eye.sheet.json
//
// A spec with a `frames: { cols, rows }` block asks for one grid sheet instead
// of one figure (phase AN1d). It is refused, by name and before any request is
// built, unless the slug is an enemy already in the game; on success the grid
// is split into graded, alpha-keyed cells under `enemies/anim/<slug>/` with one
// provenance record for the set. See `art/sheet.mjs`.
//
// The one command that runs T's ruled route end to end: the prompt compiler
// renders the house style plus the subject spec, the adapter generates (or
// reports, unkeyed), and Phase 71's post-process contract turns the result into
// a graded WebP with a provenance record carrying backend, model, prompt, style
// version and date.
//
// With no `OPENAI_API_KEY` the adapter selects the inert backend and this exits
// 0 having written nothing, printing the request it would have sent. That is
// the ruling's own default, not a failure — and it is how the whole pipeline
// stays reviewable in a checkout that cannot spend.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generate, generationProvenance, selectionReason } from './art/adapter.mjs'
import { compileFile } from './art/prompt.mjs'
import { assertUsedEnemy, readUsedEnemyKeys, sheetProvenance, splitSheet } from './art/sheet.mjs'
import { RECIPE, gradePipeline, mergeProvenance } from './ingest-art.mjs'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const IMAGES = path.join(MOBILE, 'assets', 'images')

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') out.dryRun = true
    else if (argv[i].startsWith('--')) { out[argv[i].slice(2)] = argv[i + 1]; i++ }
  }
  return out
}

/**
 * Post-process a generated buffer through the SAME recipe as an acquisition —
 * the two paths must not diverge, or a generated asset and an acquired one stop
 * being comparable and the QA drift series measures the pipeline instead of the
 * art.
 */
export async function postProcess(sharp, buffer, { maxEdge = RECIPE.maxEdge, quality = RECIPE.quality } = {}) {
  const image = sharp(buffer)
  const meta = await image.metadata()
  let pipeline = image
  if (Math.max(meta.width ?? 0, meta.height ?? 0) > maxEdge) {
    pipeline = pipeline.resize({
      width: (meta.width ?? 0) >= (meta.height ?? 0) ? maxEdge : undefined,
      height: (meta.height ?? 0) > (meta.width ?? 0) ? maxEdge : undefined,
      withoutEnlargement: true,
    })
  }
  return pipeline.webp({ quality }).toBuffer()
}

/**
 * Split a generated sheet and lay out what it writes: the cells, the one
 * provenance record covering them, and the directory they go in. Writes
 * nothing itself, so the dry run and the test see exactly what a real run
 * would put on disk.
 */
export async function planSheet(sharp, { request, result, date }) {
  const cells = await splitSheet(sharp, result.image, request.frames, {
    recipe: RECIPE,
    grade: gradePipeline,
    slug: request.slug,
  })
  const base = generationProvenance({ request, result, date, covers: [] })
  const entry = sheetProvenance(base, { frames: request.frames, cells, recipe: RECIPE })
  const dir = path.join(IMAGES, request.category, 'anim', request.slug)
  return { dir, cells, entry }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (!opts.spec) {
    console.error('generate-art: --spec <subject-spec.json> is required.')
    process.exit(1)
  }

  const request = compileFile(fs, path.resolve(process.cwd(), opts.spec))
  // The refusal comes before anything is printed as a request or sent: a sheet
  // for an enemy that is not in the game is not a request this route makes.
  if (request.frames) assertUsedEnemy(request.slug, readUsedEnemyKeys(fs))
  console.log(`slug:    ${request.slug}  (${request.category})`)
  if (request.frames) {
    const { cols, rows } = request.frames
    console.log(`sheet:   ${cols}x${rows} grid, ${cols * rows} cells, requested at ${request.size}`)
  }
  console.log(`style:   ${request.styleVersion}   prompt: ${request.promptHash}`)
  console.log(`backend: ${selectionReason()}`)
  console.log(`\n--- compiled prompt ---\n${request.prompt}\n-----------------------\n`)

  const result = await generate(request, { size: request.size })

  if (result.inert || !result.image) {
    console.log('generate-art: inert run — nothing generated, nothing written.')
    console.log('Set OPENAI_API_KEY in .env to run the generate leg (see .env.example).')
    process.exit(0)
  }

  const { default: sharp } = await import('sharp')
  if (request.frames) {
    await writeSheet(sharp, { request, result, dryRun: opts.dryRun })
    return
  }
  const webp = await postProcess(sharp, result.image)
  const dest = path.join(IMAGES, request.category, `${request.slug}.webp`)
  const provPath = path.join(IMAGES, request.category, 'provenance.json')
  const date = new Date().toISOString().slice(0, 10)
  const entry = generationProvenance({ request, result, date, covers: [`${request.slug}.webp`] })

  if (opts.dryRun) {
    console.log(`would write ${path.relative(MOBILE, dest)} (${(webp.length / 1024).toFixed(0)}K)`)
    console.log(`would record: ${JSON.stringify(entry, null, 2)}`)
    process.exit(0)
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, webp)
  const existing = fs.existsSync(provPath) ? JSON.parse(fs.readFileSync(provPath, 'utf-8')) : null
  fs.writeFileSync(provPath, `${JSON.stringify(mergeProvenance(existing, entry), null, 2)}\n`)

  console.log(`wrote ${path.relative(MOBILE, dest)} (${(webp.length / 1024).toFixed(0)}K)`)
  console.log(`provenance: ${path.relative(MOBILE, provPath)}`)
  console.log('Remember the registry: add the require() literal to that directory\'s index.ts.')
}

async function writeSheet(sharp, { request, result, dryRun }) {
  const date = new Date().toISOString().slice(0, 10)
  const { dir, cells, entry } = await planSheet(sharp, { request, result, date })
  const rel = path.relative(MOBILE, dir)
  if (dryRun) {
    for (const c of cells) console.log(`would write ${rel}/${c.name} (${c.webp.length} B)`)
    console.log(`would record: ${JSON.stringify(entry, null, 2)}`)
    return
  }
  fs.mkdirSync(dir, { recursive: true })
  for (const c of cells) fs.writeFileSync(path.join(dir, c.name), c.webp)
  const provPath = path.join(dir, 'provenance.json')
  const existing = fs.existsSync(provPath) ? JSON.parse(fs.readFileSync(provPath, 'utf-8')) : null
  fs.writeFileSync(provPath, `${JSON.stringify(mergeProvenance(existing, entry), null, 2)}\n`)
  console.log(`wrote ${cells.length} cells to ${rel}/  (${entry.measured})`)
  console.log(`provenance: ${path.relative(MOBILE, provPath)}`)
  console.log('Remember the registry: an index.ts of require() literals beside the cells, and a manifest')
  console.log('entry in assets/images/enemies/frames.ts naming the clips per row (see the float-eye\'s).')
}

// pathToFileURL, not a `file://` prefix: on Windows `argv[1]` is `C:\...` and
// the naive compare never matches, so the CLI exited 0 having printed nothing
// (the same fix as `ingest-art.mjs`).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(String(err.message ?? err)); process.exit(1) })
}
