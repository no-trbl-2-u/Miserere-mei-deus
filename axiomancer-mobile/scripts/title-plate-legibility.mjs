#!/usr/bin/env node
// axiomancer-mobile/scripts/title-plate-legibility.mjs — is the title plate
// dark enough behind the wordmark and the psalm line to read them?
//
//   node scripts/title-plate-legibility.mjs                 # check the installed plate
//   node scripts/title-plate-legibility.mjs --plate <file>  # check a candidate plate
//   node scripts/title-plate-legibility.mjs --write         # record the installed plate as the baseline
//
// What it measures is what the player sees, not the file: the plate is
// sampled where the text sits (from `titleLayout` and `titleWordmarkFrames`,
// imported), passed through the `axmTitleSides` then `axmTitleFoot` scrims,
// then faded to the phase's opacity over the ground colour. The mean
// luminance of that region is compared with the text colour as a contrast
// ratio, at the `title` phase (plate at full) and the `menu` phase (plate at
// MENU_PLATE_OPACITY): four figures in all.
//
// Baseline-and-arm. The thresholds and the baseline live in
// `docs/reports/title-plate-legibility.md`, not here. A plate whose bytes
// match the baseline passes whatever its figures, so the plate already
// shipped never turns `main` red; a plate that differs must clear every
// threshold.

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEFAULT_THEME_ID, paletteFor } from '../theme/palette.ts'
import {
  MENU_PLATE_OPACITY,
  WORDMARK_EM_WIDTH,
  titleLayout,
  titleWordmarkFrames,
} from '../state/presenters/title.engine.ts'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const ROOT = path.resolve(MOBILE, '..')
export const PLATE_FILE = 'assets/images/title/shore-at-dawn.webp'
export const REPORT_FILE = 'docs/reports/title-plate-legibility.md'

/**
 * The one viewport the figures are taken at. `titleLayout` is
 * width-dependent, so the figures only compare between runs at a fixed
 * size. A wide window is chosen because it is the size at which the psalm
 * line sits over the plate's foot; on a phone the plate ends above it.
 */
export const REFERENCE_VIEWPORT = Object.freeze({ name: 'desktop 1280x800', width: 1280, height: 800, topInset: 0 })

/** The phases measured, and the plate's opacity in each. */
export const PHASES = Object.freeze({ title: 1, menu: MENU_PLATE_OPACITY })

/**
 * The `axmTitleFoot` and `axmTitleSides` gradient stops in
 * `components/TitleScreen.tsx`, as [offset, opacity of the ground colour].
 * The component's JSX cannot be imported into node, so these are mirrored and
 * `title-plate-legibility.test.mjs` pins them to the component's source.
 */
export const FOOT_STOPS = Object.freeze([[0.55, 0], [0.72, 0.35], [0.84, 0.78], [0.93, 1], [1, 1]])
export function sideStops(sideFeather) {
  const edge = sideFeather ? 1 : 0
  return [[0, edge], [0.12, 0], [0.88, 0], [1, edge]]
}

/**
 * The style numbers that place the psalm line, mirrored from
 * `components/TitleScreen.tsx` (pinned by the test). The line is laid out by
 * flex from the window's foot, so its box is not in `title.engine.ts`: it is
 * rebuilt here from the stack beneath it (footer, EMBARK, the gaps).
 */
export const TITLE_STACK = Object.freeze({
  paddingBottom: 48,
  paddingHorizontal: 28,
  gap: 22,
  psalmMaxWidth: 340,
  psalmFontSize: 17,
  psalmLineHeight: 25,
  footerFontSize: 12,
  footerLineHeight: 17,
  footerMaxWidth: 320,
  embarkPaddingVertical: 16,
  embarkFontSize: 20,
  embarkHintFontSize: 11,
  embarkHintMarginTop: 4,
})

/**
 * Estimates the stack cannot import: IM Fell English's mean advance per
 * character in ems (used to wrap the psalm and footer), and the line height a
 * Text with no `lineHeight` takes, as a multiple of its font size.
 */
const SERIF_EM_PER_CHAR = 0.42
const DEFAULT_LINE_HEIGHT = 1.2

function wrappedLines(text, fontSize, maxWidth) {
  return Math.max(1, Math.ceil((text.length * SERIF_EM_PER_CHAR * fontSize) / maxWidth))
}

/**
 * The two text regions in window points: the wordmark's rest frame and the
 * psalm line's box. Pure.
 */
export function textRegions(viewport, copy) {
  const layout = titleLayout(viewport)
  const rest = titleWordmarkFrames(layout).rest
  const wordmarkWidth = layout.wordmark.width * rest.scale
  const fontSize = layout.wordmark.width / WORDMARK_EM_WIDTH
  const lineHeight = Math.round(fontSize * 1.3) * rest.scale
  const wordmark = {
    left: layout.wordmark.centerX - wordmarkWidth / 2,
    top: layout.wordmark.centerY + rest.translateY - lineHeight / 2,
    width: wordmarkWidth,
    height: lineHeight,
  }

  const s = TITLE_STACK
  const blockWidth = Math.min(s.psalmMaxWidth, viewport.width - 2 * s.paddingHorizontal)
  const footerWidth = Math.min(s.footerMaxWidth, viewport.width - 2 * s.paddingHorizontal)
  const footerHeight = wrappedLines(copy.footer, s.footerFontSize, footerWidth) * s.footerLineHeight
  const embarkHeight = 2 + 2 * s.embarkPaddingVertical + s.embarkFontSize * DEFAULT_LINE_HEIGHT
    + s.embarkHintMarginTop + s.embarkHintFontSize * DEFAULT_LINE_HEIGHT
  const psalmLines = wrappedLines(copy.psalm, s.psalmFontSize, blockWidth)
  const psalmHeight = psalmLines * s.psalmLineHeight
  const psalmSourceHeight = 6 + 9 * DEFAULT_LINE_HEIGHT
  const psalmBottom = viewport.height - s.paddingBottom - footerHeight - s.gap - embarkHeight - s.gap - psalmSourceHeight
  const psalmWidth = Math.min(blockWidth, copy.psalm.length * SERIF_EM_PER_CHAR * s.psalmFontSize / psalmLines)
  const psalm = {
    left: viewport.width / 2 - psalmWidth / 2,
    top: psalmBottom - psalmHeight,
    width: psalmWidth,
    height: psalmHeight,
  }
  return { layout, wordmark, psalm }
}

/** `#rrggbb` to [r, g, b] in 0..1. */
export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
}

/** WCAG relative luminance of an sRGB colour in 0..1. */
export function luminance([r, g, b]) {
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG contrast ratio between two luminances. */
export function contrastRatio(a, b) {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** A gradient's opacity at `t` in 0..1, linear between stops, flat outside them. */
export function stopOpacity(stops, t) {
  if (t <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    const [o1, a1] = stops[i]
    if (t <= o1) {
      const [o0, a0] = stops[i - 1]
      return o1 === o0 ? a1 : a0 + ((a1 - a0) * (t - o0)) / (o1 - o0)
    }
  }
  return stops[stops.length - 1][1]
}

const mix = (under, over, alpha) => under.map((u, i) => u + (over[i] - u) * alpha)

/**
 * One plate pixel as the player sees it: the sides scrim, then the foot
 * scrim (the component's draw order), then the plate's opacity over the
 * ground. `u`, `v` are the point's position across and down the plate box.
 */
export function compositePixel(rgb, { u, v, sideFeather, opacity, bg }) {
  let c = mix(rgb, bg, stopOpacity(sideStops(sideFeather), u))
  c = mix(c, bg, stopOpacity(FOOT_STOPS, v))
  return mix(bg, c, opacity)
}

/**
 * The mean luminance of a window region as composited. `plate` is raw pixels
 * `{ data, width, height, channels }`; the image is fitted to the plate box
 * as `contentFit="cover"` does. Points outside the plate box read as ground.
 */
export function regionLuminance(plate, region, { layout, opacity, bg, step = 1 }) {
  const box = layout.plate
  const sideFeather = box.left > 0
  const scale = Math.max(box.width / plate.width, box.height / plate.height)
  const offX = (box.width - plate.width * scale) / 2
  const offY = (box.height - plate.height * scale) / 2
  const bgLum = luminance(bg)
  let sum = 0
  let n = 0
  for (let y = region.top + step / 2; y < region.top + region.height; y += step) {
    for (let x = region.left + step / 2; x < region.left + region.width; x += step) {
      n++
      const u = (x - box.left) / box.width
      const v = (y - box.top) / box.height
      if (u < 0 || u >= 1 || v < 0 || v >= 1) {
        sum += bgLum
        continue
      }
      const px = Math.min(plate.width - 1, Math.max(0, Math.floor((x - box.left - offX) / scale)))
      const py = Math.min(plate.height - 1, Math.max(0, Math.floor((y - box.top - offY) / scale)))
      const i = (py * plate.width + px) * plate.channels
      const rgb = plate.channels >= 3
        ? [plate.data[i] / 255, plate.data[i + 1] / 255, plate.data[i + 2] / 255]
        : [plate.data[i] / 255, plate.data[i] / 255, plate.data[i] / 255]
      sum += luminance(compositePixel(rgb, { u, v, sideFeather, opacity, bg }))
    }
  }
  return n ? sum / n : bgLum
}

const round2 = (x) => Math.round(x * 100) / 100

/**
 * The four figures for a plate: wordmark and psalm line, at each phase, as
 * contrast ratios against the text colour (both are `parchment`).
 */
export function measurePlate(plate, { viewport = REFERENCE_VIEWPORT, palette = paletteFor(DEFAULT_THEME_ID), copy } = {}) {
  const { layout, wordmark, psalm } = textRegions(viewport, copy)
  const bg = hexToRgb(palette.bg)
  const textLum = luminance(hexToRgb(palette.parchment))
  const figures = {}
  for (const [phase, opacity] of Object.entries(PHASES)) {
    for (const [name, region] of [['wordmark', wordmark], ['psalm', psalm]]) {
      figures[`${name}.${phase}`] = round2(contrastRatio(textLum, regionLuminance(plate, region, { layout, opacity, bg })))
    }
  }
  return figures
}

/**
 * The gate. A plate equal to the baseline passes; any other plate fails for
 * each figure under its text's threshold, and the message names it.
 */
export function judgePlate({ figures, sha256, baseline, thresholds }) {
  const isBaseline = Boolean(baseline && baseline.sha256 === sha256)
  const misses = []
  for (const [key, value] of Object.entries(figures)) {
    const threshold = thresholds[key.split('.')[0]]
    if (value < threshold) misses.push({ key, value, threshold })
  }
  const failures = isBaseline
    ? []
    : misses.map((m) => `${m.key} contrast ${m.value}:1 is below the ${m.threshold}:1 threshold`)
  return { ok: failures.length === 0, isBaseline, misses, failures }
}

const THRESHOLDS_RE = /```json legibility-thresholds\n([\s\S]*?)\n```/
const BASELINE_RE = /<!-- legibility:baseline:begin -->[\s\S]*?<!-- legibility:baseline:end -->/
const BASELINE_JSON_RE = /```json legibility-baseline\n([\s\S]*?)\n```/

/** The thresholds and the baseline, read from the report. */
export function readReport(text) {
  const t = THRESHOLDS_RE.exec(text)
  if (!t) throw new Error(`${REPORT_FILE} has no \`json legibility-thresholds\` block`)
  const b = BASELINE_JSON_RE.exec(text)
  return { thresholds: JSON.parse(t[1]), baseline: b ? JSON.parse(b[1]) : null }
}

/** The report with its generated baseline block replaced. */
export function writeBaseline(text, baseline) {
  if (!BASELINE_RE.test(text)) throw new Error(`${REPORT_FILE} has no legibility:baseline markers`)
  const f = baseline.figures
  const block = [
    '<!-- legibility:baseline:begin -->',
    `Plate \`${baseline.plate}\` at ${baseline.viewport.name} (${baseline.viewport.width}x${baseline.viewport.height}), theme \`${baseline.theme}\`:`,
    '',
    '| Text | `title` phase (plate at 1) | `menu` phase (plate at ' + MENU_PLATE_OPACITY + ') |',
    '| --- | --- | --- |',
    `| Wordmark | ${f['wordmark.title']}:1 | ${f['wordmark.menu']}:1 |`,
    `| Psalm line | ${f['psalm.title']}:1 | ${f['psalm.menu']}:1 |`,
    '',
    '```json legibility-baseline',
    JSON.stringify(baseline, null, 2),
    '```',
    '<!-- legibility:baseline:end -->',
  ].join('\n')
  return text.replace(BASELINE_RE, block)
}

export function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex')
}

/** Decodes a plate file to raw RGB with sharp. */
export async function loadPlate(file) {
  const { default: sharp } = await import('sharp')
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height, channels: info.channels }
}

/** Measures and judges a plate file against the report. */
export async function checkPlateFile(file, reportText, copy) {
  const bytes = fs.readFileSync(file)
  const figures = measurePlate(await loadPlate(file), { copy })
  const { thresholds, baseline } = readReport(reportText)
  return { figures, sha256: sha256(bytes), baseline, thresholds, ...judgePlate({ figures, sha256: sha256(bytes), baseline, thresholds }) }
}

async function main(argv) {
  const { TITLE_COPY } = await import('../state/presenters/title.engine.ts')
  const plateArg = argv.includes('--plate') ? argv[argv.indexOf('--plate') + 1] : null
  const file = plateArg ? path.resolve(plateArg) : path.join(MOBILE, PLATE_FILE)
  const reportPath = path.join(ROOT, REPORT_FILE)
  const reportText = fs.readFileSync(reportPath, 'utf-8')
  const result = await checkPlateFile(file, reportText, TITLE_COPY)

  for (const [key, value] of Object.entries(result.figures)) {
    const threshold = result.thresholds[key.split('.')[0]]
    console.log(`${key.padEnd(15)} ${String(value).padStart(6)}:1  (threshold ${threshold}:1)${value < threshold ? '  MISS' : ''}`)
  }

  if (argv.includes('--write')) {
    if (plateArg) throw new Error('--write records the installed plate only')
    const baseline = {
      plate: PLATE_FILE,
      sha256: result.sha256,
      viewport: REFERENCE_VIEWPORT,
      theme: DEFAULT_THEME_ID,
      figures: result.figures,
    }
    fs.writeFileSync(reportPath, writeBaseline(reportText, baseline))
    console.log(`baseline written to ${REPORT_FILE}`)
    return 0
  }

  if (result.isBaseline) console.log('plate matches the recorded baseline: not gated')
  for (const f of result.failures) console.error(`FAIL ${f}`)
  console.log(result.ok ? 'legible' : 'not legible')
  return result.ok ? 0 : 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (err) => {
    console.error(err.message)
    process.exit(1)
  })
}
