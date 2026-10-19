// axiomancer-mobile/scripts/title-plate-legibility.test.mjs — the title plate
// legibility gate (phase TP1a).
//
//   node --test axiomancer-mobile/scripts/title-plate-legibility.test.mjs
//
// The compositor, the four figures on fixture plates, the baseline-and-arm
// verdict, and the installed plate against its recorded baseline. The
// mirrored scrim stops and stack numbers are pinned to TitleScreen.tsx's
// source so a style change there fails here instead of silently moving the
// sampled region.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { DEFAULT_THEME_ID, paletteFor } from '../theme/palette.ts'
import { MENU_PLATE_OPACITY, TITLE_COPY, titleLayout } from '../state/presenters/title.engine.ts'
import {
  FOOT_STOPS,
  PLATE_FILE,
  REFERENCE_VIEWPORT,
  REPORT_FILE,
  ROOT,
  TITLE_STACK,
  checkPlateFile,
  compositePixel,
  hexToRgb,
  judgePlate,
  loadPlate,
  measurePlate,
  readReport,
  regionLuminance,
  sha256,
  sideStops,
  textRegions,
  writeBaseline,
} from './title-plate-legibility.mjs'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCREEN = fs.readFileSync(path.join(MOBILE, 'components', 'TitleScreen.tsx'), 'utf-8')
const REPORT = fs.readFileSync(path.join(ROOT, REPORT_FILE), 'utf-8')
const PALETTE = paletteFor(DEFAULT_THEME_ID)
const BG = hexToRgb(PALETTE.bg)
const THRESHOLDS = readReport(REPORT).thresholds

/** A uniform plate of one grey level, at the installed plate's size. */
function flatPlate(level, width = 1290, height = 1600) {
  return { data: Buffer.alloc(width * height * 3, level), width, height, channels: 3 }
}

const close = (a, b, eps = 1e-6) => a.every((v, i) => Math.abs(v - b[i]) < eps)

test('the foot scrim turns a white plate to the ground at its foot and leaves its top white', () => {
  const white = [1, 1, 1]
  const at = (v) => compositePixel(white, { u: 0.5, v, sideFeather: false, opacity: 1, bg: BG })
  assert.ok(close(at(0.99), BG), `foot reads ${at(0.99)}, not the ground ${BG}`)
  assert.ok(close(at(0.01), white), `top reads ${at(0.01)}, not white`)
  // Half-way down the feather it is neither.
  const mid = at(0.78)
  assert.ok(mid[0] < 1 && mid[0] > BG[0])
})

test('the sides scrim feathers only when the window leaves ground beside the plate', () => {
  const white = [1, 1, 1]
  const edge = (sideFeather) => compositePixel(white, { u: 0, v: 0.1, sideFeather, opacity: 1, bg: BG })
  assert.ok(close(edge(true), BG))
  assert.ok(close(edge(false), white))
})

test('the phase opacity fades the composited plate over the ground', () => {
  const white = [1, 1, 1]
  const dim = compositePixel(white, { u: 0.5, v: 0.1, sideFeather: false, opacity: MENU_PLATE_OPACITY, bg: BG })
  assert.ok(close(dim, BG.map((b) => b + (1 - b) * MENU_PLATE_OPACITY)))
})

test('the mirrored scrim stops match TitleScreen.tsx', () => {
  const foot = SCREEN.slice(SCREEN.indexOf('id="axmTitleFoot"'), SCREEN.indexOf('</LinearGradient>', SCREEN.indexOf('id="axmTitleFoot"')))
  const stops = [...foot.matchAll(/offset=\{([\d.]+)\} stopColor=\{AXM\.bg\} stopOpacity=\{([\d.]+)\}/g)]
    .map((m) => [Number(m[1]), Number(m[2])])
  assert.deepEqual(stops, FOOT_STOPS)

  const sides = SCREEN.slice(SCREEN.indexOf('id="axmTitleSides"'), SCREEN.indexOf('</LinearGradient>', SCREEN.indexOf('id="axmTitleSides"')))
  const offsets = [...sides.matchAll(/offset=\{([\d.]+)\}/g)].map((m) => Number(m[1]))
  assert.deepEqual(offsets, sideStops(true).map(([o]) => o))
  // The edge stops follow sideFeather; the inner two are clear.
  assert.equal((sides.match(/stopOpacity=\{sideFeather \? 1 : 0\}/g) ?? []).length, 2)
  assert.equal((sides.match(/stopOpacity=\{0\}/g) ?? []).length, 2)
  // Sides drawn first, then the foot: the order compositePixel applies them.
  assert.ok(SCREEN.indexOf('url(#axmTitleSides)') < SCREEN.indexOf('url(#axmTitleFoot)'))
})

test('the mirrored stack numbers match TitleScreen.tsx', () => {
  const style = (name) => {
    const start = SCREEN.indexOf(`\n  ${name}: {`)
    assert.ok(start > 0, `no ${name} style in TitleScreen.tsx`)
    return SCREEN.slice(start, SCREEN.indexOf('\n  },', start))
  }
  const has = (name, key, value) => assert.match(style(name), new RegExp(`\\b${key}: ${value},`), `${name}.${key} is not ${value}`)
  const s = TITLE_STACK
  has('content', 'paddingBottom', s.paddingBottom)
  has('content', 'paddingHorizontal', s.paddingHorizontal)
  has('content', 'gap', s.gap)
  has('psalm', 'maxWidth', s.psalmMaxWidth)
  has('psalmLine', 'fontSize', s.psalmFontSize)
  has('psalmLine', 'lineHeight', s.psalmLineHeight)
  has('footerText', 'fontSize', s.footerFontSize)
  has('footerText', 'lineHeight', s.footerLineHeight)
  has('footerText', 'maxWidth', s.footerMaxWidth)
  has('embarkButton', 'paddingVertical', s.embarkPaddingVertical)
  has('embarkButtonText', 'fontSize', s.embarkFontSize)
  has('embarkHint', 'fontSize', s.embarkHintFontSize)
  has('embarkHint', 'marginTop', s.embarkHintMarginTop)
  // Both measured texts are drawn in parchment.
  assert.match(style('wordmark'), /color: AXM\.parchment,/)
  assert.match(style('psalmLine'), /color: AXM\.parchment,/)
})

test('the wordmark region is the layout\'s own, so a layout change moves it', () => {
  const vp = REFERENCE_VIEWPORT
  const { wordmark } = textRegions(vp, TITLE_COPY)
  const layout = titleLayout(vp)
  assert.equal(wordmark.left + wordmark.width / 2, layout.wordmark.centerX)
  assert.equal(wordmark.top + wordmark.height / 2, layout.wordmark.centerY)
  assert.equal(wordmark.width, layout.wordmark.width)
  // A narrower window moves and shrinks it.
  const phone = textRegions({ width: 390, height: 844, topInset: 47 }, TITLE_COPY).wordmark
  assert.notEqual(phone.width, wordmark.width)
  assert.notEqual(phone.top, wordmark.top)
})

test('the psalm line sits above EMBARK and below the wordmark', () => {
  const { wordmark, psalm } = textRegions(REFERENCE_VIEWPORT, TITLE_COPY)
  assert.ok(psalm.top > wordmark.top + wordmark.height)
  assert.ok(psalm.top + psalm.height < REFERENCE_VIEWPORT.height - TITLE_STACK.paddingBottom)
  assert.ok(psalm.width <= TITLE_STACK.psalmMaxWidth)
})

test('a region off the plate reads as the ground', () => {
  const { layout } = textRegions(REFERENCE_VIEWPORT, TITLE_COPY)
  const off = { left: 0, top: 0, width: 40, height: 40 }
  const lum = regionLuminance(flatPlate(255), off, { layout, opacity: 1, bg: BG })
  const groundOnly = regionLuminance(flatPlate(0), off, { layout, opacity: 1, bg: BG })
  assert.equal(lum, groundOnly)
})

test('a pale plate fails and a dark plate passes', () => {
  const pale = measurePlate(flatPlate(225), { copy: TITLE_COPY })
  const dark = measurePlate(flatPlate(10), { copy: TITLE_COPY })
  assert.equal(Object.keys(pale).length, 4)
  assert.deepEqual(Object.keys(pale).sort(), ['psalm.menu', 'psalm.title', 'wordmark.menu', 'wordmark.title'])
  const verdict = (figures) => judgePlate({ figures, sha256: 'candidate', baseline: { sha256: 'shipped' }, thresholds: THRESHOLDS })
  const paleVerdict = verdict(pale)
  assert.equal(paleVerdict.ok, false)
  assert.ok(paleVerdict.failures.some((f) => f.startsWith('wordmark.title')))
  assert.equal(verdict(dark).ok, true, verdict(dark).failures.join('; '))
})

test('a plate equal to the baseline passes even below the threshold', () => {
  const figures = measurePlate(flatPlate(225), { copy: TITLE_COPY })
  const v = judgePlate({ figures, sha256: 'same', baseline: { sha256: 'same' }, thresholds: THRESHOLDS })
  assert.equal(v.ok, true)
  assert.equal(v.isBaseline, true)
  // The misses are still reported, only not failed.
  assert.ok(v.misses.length > 0)
})

test('a changed plate below the threshold fails, naming the figure, the threshold and the measurement', () => {
  const figures = { 'wordmark.title': 2.1, 'psalm.title': 9, 'wordmark.menu': 6, 'psalm.menu': 9 }
  const v = judgePlate({ figures, sha256: 'new', baseline: { sha256: 'old' }, thresholds: THRESHOLDS })
  assert.equal(v.ok, false)
  assert.deepEqual(v.failures, [`wordmark.title contrast 2.1:1 is below the ${THRESHOLDS.wordmark}:1 threshold`])
})

test('the report states both thresholds and a baseline for the installed plate', () => {
  const { thresholds, baseline } = readReport(REPORT)
  assert.equal(typeof thresholds.wordmark, 'number')
  assert.equal(typeof thresholds.psalm, 'number')
  assert.ok(baseline, 'no baseline recorded')
  assert.equal(baseline.plate, PLATE_FILE)
  assert.deepEqual(baseline.viewport, { ...REFERENCE_VIEWPORT })
  // The report links the plate's licence record.
  assert.match(REPORT, /assets\/images\/title\/provenance\.json/)
})

test('writeBaseline replaces only the generated block', () => {
  const text = 'intro\n<!-- legibility:baseline:begin -->\nold\n<!-- legibility:baseline:end -->\noutro\n'
  const out = writeBaseline(text, {
    plate: PLATE_FILE, sha256: 'abc', viewport: REFERENCE_VIEWPORT, theme: DEFAULT_THEME_ID,
    figures: { 'wordmark.title': 1, 'psalm.title': 2, 'wordmark.menu': 3, 'psalm.menu': 4 },
  })
  assert.ok(out.startsWith('intro\n') && out.endsWith('outro\n'))
  assert.ok(!out.includes('\nold\n'))
  assert.match(out, /"sha256": "abc"/)
})

test('the installed plate clears the gate and matches its recorded figures', async () => {
  const file = path.join(MOBILE, PLATE_FILE)
  const result = await checkPlateFile(file, REPORT, TITLE_COPY)
  assert.equal(result.ok, true, result.failures.join('; '))
  const { baseline } = readReport(REPORT)
  if (baseline.sha256 === sha256(fs.readFileSync(file))) {
    // Same plate, so the figures must be the recorded ones; a drift means the
    // layout or the scrims moved and the report is stale.
    for (const [key, value] of Object.entries(result.figures)) {
      assert.ok(Math.abs(value - baseline.figures[key]) <= 0.05,
        `${key} measures ${value}:1 but the report records ${baseline.figures[key]}:1; run npm run art:legibility -- --write`)
    }
  }
  // The decoded plate is the installed one, not a stand-in.
  const plate = await loadPlate(file)
  assert.equal(plate.width, 1290)
  assert.equal(plate.height, 1600)
})
