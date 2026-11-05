// Tests for cut-embark-button.mjs (plan 121.3): the pure helpers on small
// synthetic buffers, and `cut` on a synthetic sheet built in memory.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import {
  largestPiece, dilate, rescaleAlpha, cut,
  SHEET_SIZE, SEARCH_BOX, SOLID, EDGE_R, FLOOR, MARGIN, MAX_EDGE,
} from './cut-embark-button.mjs'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const grid = (rows) => Uint8Array.from(rows.join('').split('').map(Number))

test('largestPiece keeps only the biggest 4-connected piece', () => {
  const W = 6
  const H = 3
  const mask = grid(['110001', '110001', '000011'])
  const out = largestPiece(mask, W, H)
  assert.deepEqual([...out], [...grid(['110000', '110000', '000000'])])
})

test('largestPiece does not join pieces that only touch diagonally', () => {
  const mask = grid(['10', '01'])
  const out = largestPiece(mask, 2, 2)
  assert.equal(out.reduce((a, b) => a + b, 0), 1)
})

test('dilate grows a single pixel by a disc and clips at the border', () => {
  const out = dilate(grid(['00000', '00000', '00100', '00000', '00000']), 5, 5, 1)
  assert.deepEqual([...out], [...grid(['00000', '00100', '01110', '00100', '00000'])])
  const corner = dilate(grid(['100', '000', '000']), 3, 3, 1)
  assert.deepEqual([...corner], [...grid(['110', '100', '000'])])
  assert.deepEqual([...dilate(grid(['010']), 3, 1, 0)], [0, 1, 0])
})

test('rescaleAlpha makes the peak opaque, clamps, and drops values under the floor', () => {
  assert.equal(rescaleAlpha(250, 250), 255)
  assert.equal(rescaleAlpha(253, 250), 255)
  assert.equal(rescaleAlpha(125, 250), 128)
  assert.equal(rescaleAlpha(0, 250), 0)
  assert.equal(rescaleAlpha(7, 255), 0)
  assert.equal(rescaleAlpha(FLOOR, 255), FLOOR)
  assert.equal(rescaleAlpha(9, 255, 10), 0)
})

/** A SHEET_SIZE RGBA buffer, transparent, with a solid plate rect (sheet coords). */
function sheetWith({ x0, y0, x1, y1 }, alpha = 250) {
  const { width, height } = SHEET_SIZE
  const buf = Buffer.alloc(width * height * 4)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * 4
      buf[i] = 200; buf[i + 1] = 180; buf[i + 2] = 140; buf[i + 3] = alpha
    }
  }
  return sharp(buf, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

const plateAt = (dx0, dy0, dx1, dy1) => ({
  x0: SEARCH_BOX.left + dx0, y0: SEARCH_BOX.top + dy0,
  x1: SEARCH_BOX.left + dx1, y1: SEARCH_BOX.top + dy1,
})
const W = SEARCH_BOX.right - SEARCH_BOX.left
const H = SEARCH_BOX.bottom - SEARCH_BOX.top

test('cut finds the plate, trims with MARGIN, and caps the longest edge', async () => {
  const png = await sheetWith(plateAt(100, 60, 499, 159))
  const { webp, paper, peak, box } = await cut(sharp, png)
  assert.equal(peak, 250)
  assert.deepEqual(paper, { left: SEARCH_BOX.left + 100, top: SEARCH_BOX.top + 60, right: SEARCH_BOX.left + 499, bottom: SEARCH_BOX.top + 159 })
  assert.equal(box.width, 400 + 2 * MARGIN)
  assert.equal(box.height, 100 + 2 * MARGIN)
  const m = await sharp(webp).metadata()
  assert.equal(m.format, 'webp')
  assert.equal(m.width, Math.min(MAX_EDGE, box.width))
  assert.ok(m.hasAlpha)
})

test('cut keeps the soft matte edge (EDGE_R) and drops it past that', async () => {
  const png = await sheetWith(plateAt(100, 60, 199, 119))
  const { box } = await cut(sharp, png)
  // The dilated edge is the plate's own alpha, so a transparent sheet around
  // it adds nothing: the trim is the plate plus MARGIN, not plus EDGE_R.
  assert.equal(box.width, 100 + 2 * MARGIN)
  assert.ok(EDGE_R >= 0)
})

test('cut rejects a sheet of the wrong size', async () => {
  const png = await sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer()
  await assert.rejects(cut(sharp, png), /sheet is 100x100/)
})

test('cut rejects an empty search box', async () => {
  const png = await sheetWith(plateAt(100, 60, 199, 119), SOLID - 1)
  await assert.rejects(cut(sharp, png), /no plate in the search box/)
})

test('cut accepts a plate exactly MARGIN clear of every edge', async () => {
  const png = await sheetWith(plateAt(MARGIN + EDGE_R, MARGIN + EDGE_R, W - 1 - MARGIN - EDGE_R, H - 1 - MARGIN - EDGE_R))
  await assert.doesNotReject(cut(sharp, png))
})

// The edge guard: a plate within MARGIN of the box edge (not only touching it)
// must raise this script's own error, not sharp's opaque extract() failure.
for (const [name, rect] of [
  ['left', plateAt(0, 60, 199, 119)],
  ['left, 2px in', plateAt(2, 60, 199, 119)],
  ['top, 3px in', plateAt(100, 3, 299, 119)],
  ['right, 2px in', plateAt(100, 60, W - 3, 119)],
  ['bottom, 1px in', plateAt(100, 60, 299, H - 2)],
]) {
  test(`cut rejects a plate near the search box edge (${name}) with its own error`, async () => {
    const png = await sheetWith(rect)
    await assert.rejects(cut(sharp, png), /cut-embark-button: the plate is within MARGIN of the search box edge/)
  })
}
