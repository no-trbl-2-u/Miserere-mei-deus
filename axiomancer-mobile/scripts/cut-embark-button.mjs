#!/usr/bin/env node
// axiomancer-mobile/scripts/cut-embark-button.mjs — cuts T's parchment
// "Embark" scroll out of T's sheet of button plates (plan 121.3), so the
// shipped button is rebuilt from its source rather than a hand-made file.
//
//   node scripts/cut-embark-button.mjs --sheet <path to embark-sheet.png>
//
// The sheet is T's own art: 1536x1024 RGBA, eight plates in four styles, each
// blank on the left and lettered "Embark" on the right. It looks like plates
// on a brown vignette, but the vignette is colour under ZERO alpha: the sheet
// carries its own matte (plates at alpha 250-253, a soft ramp on their
// edges). So the cut uses that matte instead of keying the brown, which
// follows the torn edge exactly and leaves no brown halo. A colour key on the
// brown was tried first; it kept a lobe of the backdrop's glow above the
// paper and pocked the burnt edge.
//
// The master lives in the repo-root art department
// (masters/title/embark-sheet.png, with its provenance record); this script
// never names that tree as a path, so pass the file in.
//
// The cut:
// 1. In SEARCH_BOX (the second row's lettered plate, with clear space all
//    round), keep the largest connected piece with alpha >= SOLID: the
//    scroll, not a stray pixel of a neighbour.
// 2. Grow that piece by EDGE_R px and take the sheet's own alpha inside it,
//    rescaled so the plate's peak alpha is fully opaque; alpha under FLOOR is
//    dropped (the matte's faintest ring carries off-colour noise).
// 3. Trim to the paper with MARGIN px of clear space, resize to the
//    package's 640px longest-edge cap, WebP with full-quality alpha.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(MOBILE, 'assets', 'images', 'title', 'embark-scroll.webp')
const require = createRequire(path.join(MOBILE, 'package.json'))

/** The sheet the record names. */
export const SHEET_SIZE = { width: 1536, height: 1024 }
/** Where the second row's lettered scroll sits, with clear space all round. */
export const SEARCH_BOX = { left: 780, top: 300, right: 1530, bottom: 540 }
/** Alpha at or above which a pixel is solid plate. */
export const SOLID = 128
/** How far past the solid plate the matte's soft edge is kept, in px. */
export const EDGE_R = 3
/** Alpha (0..255, after rescaling) below which a pixel is dropped. */
export const FLOOR = 8
/** Clear pixels kept round the paper after the trim. */
export const MARGIN = 4
/** The package's longest-edge cap (docs/asset-conventions.md). */
export const MAX_EDGE = 640

/** Keep only the largest 4-connected piece of 1s. Pure. */
export function largestPiece(mask, W, H) {
  const label = new Int32Array(W * H)
  let best = 0
  let bestSize = 0
  let next = 0
  for (let s = 0; s < W * H; s++) {
    if (!mask[s] || label[s]) continue
    next++
    let size = 0
    const stack = [s]
    label[s] = next
    while (stack.length) {
      const i = stack.pop()
      size++
      const x = i % W
      const y = (i - x) / W
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j >= 0 && mask[j] && !label[j]) { label[j] = next; stack.push(j) }
      }
    }
    if (size > bestSize) { bestSize = size; best = next }
  }
  return Uint8Array.from(label, (l) => (l === best ? 1 : 0))
}

/** Grow a mask by a disc of radius r. Pure. */
export function dilate(mask, W, H, r) {
  const out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!mask[y * W + x]) continue
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx
          const yy = y + dy
          if (dx * dx + dy * dy <= r * r && xx >= 0 && yy >= 0 && xx < W && yy < H) out[yy * W + xx] = 1
        }
      }
    }
  }
  return out
}

/** Rescale a matte value so `peak` becomes opaque; under `floor` is 0. Pure. */
export function rescaleAlpha(a, peak, floor = FLOOR) {
  const v = Math.min(255, Math.round((a * 255) / peak))
  return v < floor ? 0 : v
}

export async function cut(sharp, sheetPath) {
  const { data, info } = await sharp(sheetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  if (info.width !== SHEET_SIZE.width || info.height !== SHEET_SIZE.height) {
    throw new Error(`cut-embark-button: sheet is ${info.width}x${info.height}, the record names ${SHEET_SIZE.width}x${SHEET_SIZE.height}`)
  }
  const { left, top, right, bottom } = SEARCH_BOX
  const W = right - left
  const H = bottom - top
  const src = (x, y) => ((top + y) * info.width + left + x) * 4

  const solid = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) solid[y * W + x] = data[src(x, y) + 3] >= SOLID ? 1 : 0
  const piece = largestPiece(solid, W, H)
  const keep = dilate(piece, W, H, EDGE_R)
  let peak = 0
  for (let i = 0; i < W * H; i++) if (piece[i]) peak = Math.max(peak, data[src(i % W, Math.floor(i / W)) + 3])
  if (peak < SOLID) throw new Error('cut-embark-button: no plate in the search box')

  const rgba = Buffer.alloc(W * H * 4)
  let minX = W; let minY = H; let maxX = -1; let maxY = -1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const s = src(x, y)
      const a = keep[i] ? rescaleAlpha(data[s + 3], peak) : 0
      if (!a) continue
      rgba[i * 4] = data[s]
      rgba[i * 4 + 1] = data[s + 1]
      rgba[i * 4 + 2] = data[s + 2]
      rgba[i * 4 + 3] = a
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
  }
  if (minX === 0 || minY === 0 || maxX === W - 1 || maxY === H - 1) {
    throw new Error('cut-embark-button: the plate touches the search box edge; the box is wrong')
  }

  const box = {
    left: minX - MARGIN,
    top: minY - MARGIN,
    width: maxX - minX + 1 + 2 * MARGIN,
    height: maxY - minY + 1 + 2 * MARGIN,
  }
  const webp = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .extract(box)
    .resize({ width: Math.min(MAX_EDGE, box.width), kernel: 'lanczos3' })
    .webp({ quality: 86, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toBuffer()
  const paper = { left: left + minX, top: top + minY, right: left + maxX, bottom: top + maxY }
  return { webp, paper, peak, box: { ...box, left: left + box.left, top: top + box.top } }
}

async function main() {
  const args = process.argv.slice(2)
  const i = args.indexOf('--sheet')
  if (i < 0 || !args[i + 1]) {
    console.error('cut-embark-button: --sheet <path> is required (see the header).')
    process.exit(1)
  }
  const sharp = require('sharp')
  const { webp, paper, peak, box } = await cut(sharp, args[i + 1])
  fs.writeFileSync(OUT, webp)
  const m = await sharp(webp).metadata()
  console.log(`paper at x ${paper.left}-${paper.right}, y ${paper.top}-${paper.bottom} of the sheet (matte peak ${peak}); `
    + `cut ${box.width}x${box.height} at (${box.left},${box.top}); wrote embark-scroll.webp ${m.width}x${m.height}, ${webp.length} B`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(String(err.message ?? err)); process.exit(1) })
}
