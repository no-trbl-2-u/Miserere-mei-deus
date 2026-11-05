#!/usr/bin/env node
// axiomancer-mobile/scripts/build-title-assets.mjs — the splash wordmark and the
// launcher icons, rebuilt from their sources so neither is a hand-made file.
//
//   node scripts/build-title-assets.mjs --source <path to the Commons original>
//   node scripts/build-title-assets.mjs --wordmark-only
//
// Two outputs, two sources:
//
// 1. The splash wordmark (`assets/images/splash-icon.png`): "Miserere Mei, Deus"
//    set in the game's own Pirata One (`assets/fonts/`), parchment on a
//    transparent field. The native splash draws it centred over the splash
//    background, and the title screen opens on the same wordmark at the same
//    size and place before lifting it into the plate's sky, so the launch reads
//    as one shot. `SPLASH_WORDMARK_WIDTH` in `state/presenters/title.engine.ts`
//    must equal app.json's `imageWidth`; a test pins the two together.
//
// 2. The launcher icons (`icon.png`, `favicon.png` and the three Android
//    adaptive layers): a square crop of the title plate around its three
//    figures, in a duotone from the game's ground to its parchment. The crop is
//    taken from the full-resolution Commons original, because a graded WebP is
//    dimmed for text and too small to upscale cleanly. The plate is Doré's
//    Purgatorio, Canto I (`shore-at-dawn`), the title plate until plan 121.2
//    moved the title screen to the Inferno lion; its record, with the plate
//    box, is `assets/images/icon.provenance.json` → `source_plate`, so the
//    icon is reproducible from the record and this file alone.
//
// The source is the Commons original named in that provenance record. The
// script never downloads it: fetch it once by hand from the record's `source`
// page and pass its path, so a rebuild cannot silently change art.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const IMAGES = path.join(MOBILE, 'assets', 'images')
const require = createRequire(path.join(MOBILE, 'package.json'))

/** The game's ground and parchment (`theme/palette.ts`, the default palette). */
export const GROUND = [0x0b, 0x0a, 0x09]
export const PARCHMENT = [0xec, 0xe0, 0xc8]

export const WORDMARK_TEXT = 'Miserere Mei, Deus'

/**
 * The icon square inside the plate, as fractions of the plate box: the three
 * figures (Dante, Virgil and Cato) with a margin of shore and sea. Square in
 * pixels for the 2954x3663 plate the record names (0.52 of its width is 0.419
 * of its height).
 */
export const ICON_SQUARE = { cx: 0.66, cy: 0.58, side: 0.52 }

/** Android's adaptive-icon layer size at xxxhdpi, in pixels. */
const ADAPTIVE = 432

/**
 * Map a grey level onto the ground→parchment ramp. Pure.
 *
 * @param lum   - 0..255 luminance.
 * @param gamma - >1 keeps the shadows deep; the engraving's mid-tones would
 *   otherwise wash to a flat beige at icon size.
 * @returns [r, g, b].
 */
export function duotone(lum, gamma = 1.25) {
  const t = Math.pow(Math.max(0, Math.min(255, lum)) / 255, gamma)
  return GROUND.map((g, i) => Math.round(g + (PARCHMENT[i] - g) * t))
}

/**
 * The icon crop box in source pixels, from the plate's recorded crop. Pure.
 *
 * @param crop - the provenance `crop` record ({ left, top, width, height }).
 * @param sq   - the icon square as plate fractions.
 * @returns { left, top, width, height } with width === height.
 */
export function iconBox(crop, sq = ICON_SQUARE) {
  const side = Math.round(sq.side * crop.width)
  const left = Math.round(crop.left + sq.cx * crop.width - side / 2)
  const top = Math.round(crop.top + sq.cy * crop.height - side / 2)
  return { left, top, width: side, height: side }
}

async function renderWordmark(sharp, widthPx) {
  // Render large, trim to ink, then fit to the target width.
  const big = await sharp({
    text: {
      text: `<span foreground="#${PARCHMENT.map((c) => c.toString(16).padStart(2, '0')).join('')}">${WORDMARK_TEXT}</span>`,
      font: 'Pirata One 300',
      fontfile: path.join(MOBILE, 'assets', 'fonts', 'PirataOne_400Regular.ttf'),
      rgba: true,
      dpi: 72,
    },
  }).png().toBuffer()
  return sharp(big).trim({ threshold: 1 }).resize({ width: widthPx }).png().toBuffer()
}

async function duotoneSquare(sharp, raw, box, size) {
  const { data, info } = await sharp(raw)
    .extract(box)
    .greyscale()
    .resize(size, size)
    .linear(1.12, -(128 * 1.12) + 128)
    .raw()
    .toBuffer({ resolveWithObject: true })
  const rgb = Buffer.alloc(info.width * info.height * 3)
  for (let i = 0; i < info.width * info.height; i++) {
    const [r, g, b] = duotone(data[i])
    rgb[i * 3] = r
    rgb[i * 3 + 1] = g
    rgb[i * 3 + 2] = b
  }
  return { rgb, grey: data, width: info.width, height: info.height }
}

async function main() {
  const args = process.argv.slice(2)
  const wordmarkOnly = args.includes('--wordmark-only')
  const sourceArg = args[args.indexOf('--source') + 1]
  const sharp = require('sharp')

  const splash = await renderWordmark(sharp, 1200)
  fs.writeFileSync(path.join(IMAGES, 'splash-icon.png'), splash)
  const sm = await sharp(splash).metadata()
  console.log(`wrote splash-icon.png ${sm.width}x${sm.height}`)
  if (wordmarkOnly) return

  if (!args.includes('--source') || !sourceArg) {
    console.error('build-title-assets: --source <path> is required for the icons (see the header).')
    process.exit(1)
  }
  const record = JSON.parse(fs.readFileSync(path.join(IMAGES, 'icon.provenance.json'), 'utf-8'))
  const plate = record.source_plate
  if (!plate?.crop) throw new Error('build-title-assets: the icon source plate has no recorded crop')
  const raw = fs.readFileSync(sourceArg)
  const meta = await sharp(raw).metadata()
  if (meta.width !== plate.crop.sourceWidth || meta.height !== plate.crop.sourceHeight) {
    throw new Error(
      `build-title-assets: source is ${meta.width}x${meta.height}, the record names `
      + `${plate.crop.sourceWidth}x${plate.crop.sourceHeight}; this is not the recorded original`,
    )
  }
  const box = iconBox(plate.crop)

  const icon = await duotoneSquare(sharp, raw, box, 1024)
  // A quantised palette PNG: the duotone has one hue, so the palette loses
  // nothing visible, and the engraving's fine hatching would otherwise put the
  // icon over the store check's 800KB. (sharp quantises only when `quality`
  // is set; `colours` alone is ignored.)
  const iconPng = await sharp(icon.rgb, { raw: { width: 1024, height: 1024, channels: 3 } })
    .png({ palette: true, quality: 80, compressionLevel: 9, effort: 10 }).toBuffer()
  fs.writeFileSync(path.join(IMAGES, 'icon.png'), iconPng)
  await sharp(iconPng).resize(192, 192).png().toFile(path.join(IMAGES, 'favicon.png'))

  const res = path.join(IMAGES, 'android', 'res', 'mipmap-xxxhdpi')
  // Background: the full-bleed art. Foreground: empty, so the launcher's mask
  // cuts the art itself rather than a framed inset of it.
  await sharp(iconPng).resize(ADAPTIVE, ADAPTIVE).ensureAlpha().png()
    .toFile(path.join(res, 'ic_launcher_background.png'))
  await sharp({ create: { width: ADAPTIVE, height: ADAPTIVE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .png().toFile(path.join(res, 'ic_launcher_foreground.png'))

  // Monochrome (Android 13 themed icons): the darkest masses only, the three
  // robed figures and the rock they stand on, as an alpha matte the launcher
  // tints. Kept inside the 66% safe circle.
  const mono = await duotoneSquare(sharp, raw, box, ADAPTIVE)
  const rgba = Buffer.alloc(ADAPTIVE * ADAPTIVE * 4)
  const r0 = ADAPTIVE * 0.33
  for (let y = 0; y < ADAPTIVE; y++) {
    for (let x = 0; x < ADAPTIVE; x++) {
      const i = y * ADAPTIVE + x
      const inside = Math.hypot(x - ADAPTIVE / 2, y - ADAPTIVE / 2) <= r0
      const a = inside ? Math.max(0, Math.min(255, Math.round((110 - mono.grey[i]) * 4))) : 0
      rgba[i * 4 + 3] = a
    }
  }
  await sharp(rgba, { raw: { width: ADAPTIVE, height: ADAPTIVE, channels: 4 } }).png()
    .toFile(path.join(res, 'ic_launcher_monochrome.png'))
  console.log(`wrote icon.png, favicon.png and the Android layers from ${box.width}px at (${box.left},${box.top})`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(String(err.message ?? err)); process.exit(1) })
}
