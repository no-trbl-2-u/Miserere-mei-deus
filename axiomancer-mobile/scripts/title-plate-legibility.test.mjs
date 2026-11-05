// axiomancer-mobile/scripts/title-plate-legibility.test.mjs — the title plate
// legibility gate (phase TP1a).
//
//   node --test axiomancer-mobile/scripts/title-plate-legibility.test.mjs
//
// The compositor, the two figures on fixture plates, the baseline-and-arm
// verdict, and the installed plate against its recorded baseline. The
// mirrored stack numbers, and the absence of any overlay, are pinned to TitleScreen.tsx's
// source so a style change there fails here instead of silently moving the
// sampled region.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { DEFAULT_THEME_ID, paletteFor } from '../theme/palette.ts'
import { TITLE_COPY, titleLayout } from '../state/presenters/title.engine.ts'
import {
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

test('the plate fades in over the ground and nothing else changes it', () => {
  const white = [1, 1, 1]
  assert.ok(close(compositePixel(white, { opacity: 1, bg: BG }), white))
  const half = compositePixel(white, { opacity: 0.5, bg: BG })
  assert.ok(close(half, BG.map((b) => b + (1 - b) * 0.5)))
})

test('TitleScreen.tsx draws nothing over the plate: no scrim, no menu dim (T, 2026-11-04: "no overlays")', () => {
  assert.ok(!/axmTitleFoot|axmTitleSides|react-native-svg|MENU_PLATE_OPACITY/.test(SCREEN))
  const plate = SCREEN.slice(SCREEN.indexOf('testID="title-plate"'), SCREEN.indexOf('</Animated.View>', SCREEN.indexOf('testID="title-plate"')))
  assert.equal((plate.match(/<Image/g) ?? []).length, 1)
  assert.ok(!/<(Svg|View|LinearGradient)/.test(plate))
  // The plate's opacity is its fade-in alone: it is not tied to the menu phase.
  const style = SCREEN.slice(SCREEN.indexOf('const plateStyle'), SCREEN.indexOf('const ctaStyle'))
  assert.ok(!/toMenu/.test(style))
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
  has('embark', 'maxWidth', s.embarkMaxWidth)
  const registry = fs.readFileSync(path.join(MOBILE, 'assets', 'images', 'title', 'index.ts'), 'utf-8')
  assert.match(registry, /EMBARK_SCROLL_ASPECT = 640 \/ 176;/)
  assert.equal(s.embarkAspect, 640 / 176)
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
  assert.deepEqual(Object.keys(pale).sort(), ['psalm.title', 'wordmark.title'])
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
  const figures = { 'wordmark.title': 2.1, 'psalm.title': 9 }
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
    figures: { 'wordmark.title': 1, 'psalm.title': 2 },
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
    // layout moved and the report is stale.
    for (const [key, value] of Object.entries(result.figures)) {
      assert.ok(Math.abs(value - baseline.figures[key]) <= 0.05,
        `${key} measures ${value}:1 but the report records ${baseline.figures[key]}:1; run npm run art:legibility -- --write`)
    }
  }
  // The decoded plate is the installed one, not a stand-in.
  const plate = await loadPlate(file)
  assert.equal(plate.width, 1308)
  assert.equal(plate.height, 1600)
})
