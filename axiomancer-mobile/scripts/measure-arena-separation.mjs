#!/usr/bin/env node
// axiomancer-mobile/scripts/measure-arena-separation.mjs — every foe on its
// region's three arena plates, measured (phase AP1f, spec 146, closes A6).
//
//   node scripts/measure-arena-separation.mjs            # write docs/reports/arena-separation.md
//   node scripts/measure-arena-separation.mjs --stdout   # print it, write nothing
//
// A MEASUREMENT, never a gate (D57): it rejects nothing and T's picks stand.
//
// What is composited is what combat draws: the arena plate (`cover`, bottom
// centre, in the scene band), then the resting cell's own backing tinted to the theme's
// `AXM.bg`, then the foe's resting animation cell, at the pane's own figure
// position and size (CombatCombatantPane + components/combat/frames). The tint
// is done here in sharp, with the hex read from theme/palette.ts, because the
// pane's tint filter is off on web only.

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { BACKING_TUNING, ENEMIES, backingDir, backingFile } from './bake-backings.mjs'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO = path.resolve(MOBILE, '..')
const PLATES = path.join(MOBILE, 'assets', 'images', 'combat')
const REPORT = path.join(REPO, 'docs', 'reports', 'arena-separation.md')

/** The viewport the report assumes (a 390x844 phone, the visual suite's class). */
const VIEW = { w: 390, h: 844 }
/** The pane's constants, copied from CombatCombatantPane.tsx. */
const SCENE_FRAC = 0.62 // sceneBand height
const WRAP_TOP = 148 - 14 // COMBAT_HUD_HEIGHT - 14, the pre-layout fallback `top`
const WRAP_BOTTOM_FRAC = 0.09 // enemyFigureWrap bottom: '9%'
const FIG = { w: 0.78, maxW: 380, h: 0.96 }
const FIG_BOSS = { w: 0.92, maxW: 460, h: 0.96 }
/** Alpha at or above which a pixel is "the foe" for area counts (the bake's own threshold). */
const SOLID = BACKING_TUNING.threshold

/**
 * Each Act 1 region's foes, read from the encounter data: the stagings of
 * `mapContent(def).enemies` for each Act 1 map (axiomancer-mechanics
 * World/chapter1-content.ts), repointed 2026-11-07 for Chapter 1's recast
 * (EN3b). A foe met in several regions has a row in each. The Breakwater
 * stages thirteen foes: the six wandering normals, the six elites and the
 * Saint Beneath. The ten foes cut from Chapter 1 stay in the library; three of
 * them (Float-Eye, Green Jelly, Death Beholder) are still staged by the later
 * Act 1 regions below, the other seven by no region.
 */
const REGIONS = [
  {
    id: 'breakwater', name: 'The Breakwater',
    plates: ['northern-sea', 'kuste-bei-mondschein', 'mondscheinnacht-ruegen'], default: 'northern-sea',
    foes: ['quay-crab', 'net-mender', 'coralback', 'brine-widow', 'saltwick-swarm', 'bilge-stalker',
      'cave-choir', 'tithe-collector', 'lamplighter', 'wrecker', 'wreckmaster', 'tide-gate', 'saint-beneath'],
  },
  {
    id: 'charcoal-wood', name: 'The Charcoal Wood',
    plates: ['sacred-grove', 'pheasantry', 'eldena'], default: 'sacred-grove',
    foes: ['float-eye', 'green-jelly', 'death-beholder'],
  },
  {
    id: 'beacon-crags', name: 'The Beacon Crags',
    plates: ['storm-mountains', 'rocky-mountains-storm', 'riesengebirge'], default: 'storm-mountains',
    foes: ['float-eye', 'green-jelly', 'death-beholder'],
  },
  {
    id: 'lantern-deep', name: 'The Lantern Deep',
    plates: ['toteninsel', 'pandemonium', 'great-day-of-wrath'], default: 'toteninsel',
    foes: ['float-eye', 'green-jelly', 'death-beholder'],
  },
]
const BOSSES = new Set(['death-beholder', 'saint-beneath'])

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b

/** AXM.bg of the default theme, read from the palette source rather than a capture. */
function themeBg() {
  const src = fs.readFileSync(path.join(MOBILE, 'theme', 'palette.ts'), 'utf-8')
  const id = /DEFAULT_THEME_ID: ThemeId = '([\w-]+)'/.exec(src)[1]
  const block = src.slice(src.indexOf(`'${id}': {`))
  const hex = /bg: '(#[0-9a-fA-F]{6})'/.exec(block)[1]
  return { id, hex, rgb: [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) }
}

/** The anchor kind, idle clip and resting cell of every key, parsed from frames.ts. */
function manifests() {
  const src = fs.readFileSync(path.join(ENEMIES, 'frames.ts'), 'utf-8')
  const sets = {}
  for (const m of src.matchAll(/const (\w+_FRAME_SET): EnemyFrameSet = \{([\s\S]*?)\n\};/g)) {
    const body = m[2]
    const kind = /kind: '([\w-]+)'/.exec(body)[1]
    const cols = Number(/columns: (\d+)/.exec(body)[1])
    const idle = /idle: \{ row: (\d+), frames: (\d+), fps: \d+, loop: true, rest: (\d+) \}/.exec(body)
    sets[m[1]] = { kind, cols, idleRow: Number(idle[1]), idleFrames: Number(idle[2]), rest: Number(idle[3]) }
  }
  const byKey = {}
  for (const m of src.matchAll(/^\s+'([\w-]+)': (\w+_FRAME_SET),/gm)) byKey[m[1]] = sets[m[2]]
  return byKey
}

const cellName = (key, n) => `${key}-${String(n).padStart(2, '0')}.webp`
/** The backing drawn under that cell: one per cell since 146.8. */
const backingPath = (key, n) => path.join(backingDir(key), backingFile(cellName(key, n)))

async function rgba(sharp, file, side) {
  const { data, info } = await sharp(fs.readFileSync(file)).ensureAlpha().resize(side, side, { fit: 'fill' })
    .raw().toBuffer({ resolveWithObject: true })
  return { data, ch: info.channels }
}

async function loadPlate(sharp, id, w, h) {
  const file = path.join(PLATES, `arena-${id}.webp`)
  const { data, info } = await sharp(fs.readFileSync(file)).removeAlpha()
    .resize(w, h, { fit: 'cover', position: 'bottom' }).raw().toBuffer({ resolveWithObject: true })
  return { data, ch: info.channels }
}

/** The figure's square on the screen: where combat draws a foe's cell. */
function figureSquare(key, kind) {
  const sceneH = Math.round(VIEW.h * SCENE_FRAC)
  const wrapH = sceneH - WRAP_TOP - Math.round(sceneH * WRAP_BOTTOM_FRAC)
  const spec = BOSSES.has(key) ? FIG_BOSS : FIG
  const boxW = Math.min(VIEW.w * spec.w, spec.maxW)
  const boxH = wrapH * spec.h
  const side = Math.floor(Math.min(boxW, boxH))
  const left = Math.round((VIEW.w - side) / 2)
  const boxTop = WRAP_TOP + wrapH - boxH
  const top = Math.round(kind === 'foot-line' ? boxTop + boxH - side : boxTop + (boxH - side) / 2)
  return { sceneH, side, left, top }
}

function separation(sq, sprite, matte, plate, bg) {
  let wSum = 0
  let sprite_Y = 0
  let behindWith = 0
  let behindWithout = 0
  for (let y = 0; y < sq.side; y++) {
    const py = sq.top + y
    if (py < 0 || py >= sq.sceneH) continue
    for (let x = 0; x < sq.side; x++) {
      const i = y * sq.side + x
      const a = sprite.data[i * sprite.ch + 3] / 255
      if (a === 0) continue
      const m = matte.data[i * matte.ch + 3] / 255
      const p = (py * VIEW.w + sq.left + x) * plate.ch
      const pr = plate.data[p], pg = plate.data[p + 1], pb = plate.data[p + 2]
      const yPlate = luma(pr, pg, pb)
      const yWith = luma(pr * (1 - m) + bg[0] * m, pg * (1 - m) + bg[1] * m, pb * (1 - m) + bg[2] * m)
      const s = i * sprite.ch
      wSum += a
      sprite_Y += a * luma(sprite.data[s], sprite.data[s + 1], sprite.data[s + 2])
      behindWith += a * yWith
      behindWithout += a * yPlate
    }
  }
  return { sprite: sprite_Y / wSum, with: sprite_Y / wSum - behindWith / wSum, without: sprite_Y / wSum - behindWithout / wSum, behind: behindWithout / wSum }
}

async function plateStats(sharp, id) {
  const sceneH = Math.round(VIEW.h * SCENE_FRAC)
  const p = await loadPlate(sharp, id, VIEW.w, sceneH)
  const n = VIEW.w * sceneH
  let sum = 0, sum2 = 0, dark = 0
  for (let i = 0; i < n; i++) {
    const y = luma(p.data[i * p.ch], p.data[i * p.ch + 1], p.data[i * p.ch + 2])
    sum += y; sum2 += y * y
    if (y < 16) dark++
  }
  const mean = sum / n
  // Detail: mean absolute luminance step to the right and the down neighbour.
  const Y = (i) => luma(p.data[i * p.ch], p.data[i * p.ch + 1], p.data[i * p.ch + 2])
  let edge = 0
  for (let y = 0; y < sceneH - 1; y++) {
    for (let x = 0; x < VIEW.w - 1; x++) {
      const i = y * VIEW.w + x
      edge += Math.abs(Y(i) - Y(i + 1)) + Math.abs(Y(i) - Y(i + VIEW.w))
    }
  }
  return { mean, sd: Math.sqrt(Math.max(0, sum2 / n - mean * mean)), dark: dark / n, edge: edge / n }
}

const f1 = (v) => v.toFixed(1)
const signed = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}`
const pct = (v) => `${Math.round(v * 100)}%`

async function main() {
  const { default: sharp } = await import('sharp')
  const bg = themeBg()
  const mans = manifests()
  const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim()
  const sceneH = Math.round(VIEW.h * SCENE_FRAC)

  const L = []
  L.push('# Arena separation: every foe on its region\'s three plates')
  L.push('')
  L.push(`Measured at commit \`${head}\` (the tree the plates, mattes and cells below are read from). Regenerate with \`node axiomancer-mobile/scripts/measure-arena-separation.mjs\`.`)
  L.push('')
  L.push('This is a measurement (D57), not a gate. It rejects nothing and carries no verdict on any plate or pick.')
  L.push('')
  L.push('## How it is measured')
  L.push('')
  L.push(`- Composite, bottom to top: the plate (\`cover\`, bottom centre, in the scene band: ${VIEW.w}x${sceneH} of a ${VIEW.w}x${VIEW.h} phone), the resting cell's own backing tinted to \`AXM.bg\` (${bg.hex}, the \`${bg.id}\` theme, read from \`theme/palette.ts\`), the foe's cell.`)
  L.push('- Figure position and size are the pane\'s own: wrap top 134, bottom 9% of the band, box 78% of the width (92% for the boss) by 96% of the wrap, the square cell \'contain\'ed at the bottom centre for a foot-line foe and the centre for a floating one. The pane\'s HUD-measured `top` and the idle breath, lunge, grounding shadow and top/floor scrims are not modelled.')
  L.push('- Cell used for the main figure: the resting cell of the idle clip, `<key>-00.webp` (idle row 0, `rest: 0`) for every foe.')
  L.push('- Separation = alpha-weighted mean luminance of the foe\'s cell minus the alpha-weighted mean luminance of what is behind it, over the cell\'s own pixels. Luminance is Rec. 709 on the stored sRGB values, 0 to 255. Positive: the foe is lighter than what is behind it.')
  L.push('- Each table cell reads `with backing (without backing)`. With backing, what is behind each pixel is the plate mixed toward `AXM.bg` by the matte\'s alpha; without, it is the bare plate.')
  L.push('- Under each region table: `plate Y` is the mean luminance of the bare plate behind the foe\'s pixels (the same for a given foe whichever backing).')
  L.push('')

  const plateIds = REGIONS.flatMap((r) => r.plates)
  const stats = {}
  for (const id of plateIds) stats[id] = await plateStats(sharp, `${REGIONS.find((r) => r.plates.includes(id)).id}-${id}`)

  L.push('## The twelve plates themselves')
  L.push('')
  L.push(`Over the scene band (${VIEW.w}x${sceneH}), no foe. \`dark\` is the share of pixels under luminance 16. \`detail\` is the mean absolute luminance step to the pixel right and the pixel below (higher is more texture).`)
  L.push('')
  L.push('| Region | Plate | mean Y | sd Y | dark | detail |')
  L.push('|---|---|---|---|---|---|')
  for (const r of REGIONS) {
    for (const id of r.plates) {
      const s = stats[id]
      L.push(`| ${r.name} | ${id}${id === r.default ? ' (default)' : ''} | ${f1(s.mean)} | ${f1(s.sd)} | ${pct(s.dark)} | ${f1(s.edge)} |`)
    }
  }
  L.push('')
  const ranked = plateIds.slice().sort((a, b) => stats[b].edge - stats[a].edge)
  const rg = stats.riesengebirge
  L.push('### Reading the separation tables')
  L.push('')
  L.push('- With a backing every pixel of the foe sits on its own matte, so the first number in a cell is the same on all three plates of a region. The plate shows only through the backing edge feather (about a pixel), which is not measured here. The plate-dependent number is the one in brackets (no backing) and the `plate Y behind` column.')
  L.push('')
  L.push('### arena-beacon-crags-riesengebirge')
  L.push('')
  L.push(`Mean Y ${f1(rg.mean)}, sd Y ${f1(rg.sd)}, dark share ${pct(rg.dark)}, detail ${f1(rg.edge)}. By detail it ranks ${ranked.indexOf('riesengebirge') + 1} of 12 (most to least: ${ranked.map((i) => `${i} ${f1(stats[i].edge)}`).join(', ')}).`)
  L.push('')

  const coverage = []
  for (const r of REGIONS) {
    L.push(`## ${r.name}`)
    L.push('')
    L.push(`| Foe | ${r.plates.map((p) => `${p}${p === r.default ? ' (default)' : ''}`).join(' | ')} | plate Y behind (${r.plates.join(' / ')}) |`)
    L.push(`|---|${r.plates.map(() => '---').join('|')}|---|`)
    const plates = {}
    for (const id of r.plates) plates[id] = await loadPlate(sharp, `${r.id}-${id}`, VIEW.w, sceneH)
    for (const key of r.foes) {
      const man = mans[key]
      const sq = figureSquare(key, man.kind)
      const sprite = await rgba(sharp, path.join(ENEMIES, 'anim', key, cellName(key, man.idleRow * man.cols + man.rest)), sq.side)
      const matte = await rgba(sharp, backingPath(key, man.idleRow * man.cols + man.rest), sq.side)
      const cells = []
      const behinds = []
      for (const id of r.plates) {
        const s = separation(sq, sprite, matte, plates[id], bg.rgb)
        cells.push(`${signed(s.with)} (${signed(s.without)})`)
        behinds.push(f1(s.behind))
      }
      L.push(`| ${key} | ${cells.join(' | ')} | ${behinds.join(' / ')} |`)
    }
    L.push('')
  }

  // Backing coverage at the rendered size.
  L.push('## Backing coverage at the rendered size')
  L.push('')
  L.push('The resting cell\'s own backing (one per cell since 146.8) against the cell it sits behind, drawn at the size combat draws it. `figure` is the resting cell\'s pixels at alpha 64 or more; `backing` is the backing\'s alpha summed; both as a share of the foe\'s square. `ratio` is backing over figure: a little over 1 is the keyed-away strokes and enclosed holes the backing fills, and its edge feather.')
  L.push('')
  L.push('| Foe | rendered square | figure | backing | ratio |')
  L.push('|---|---|---|---|---|')
  const rows = []
  for (const key of Object.keys(mans).sort()) {
    const man = mans[key]
    const sq = figureSquare(key, man.kind)
    const sprite = await rgba(sharp, path.join(ENEMIES, 'anim', key, cellName(key, man.idleRow * man.cols + man.rest)), sq.side)
    const matte = await rgba(sharp, backingPath(key, man.idleRow * man.cols + man.rest), sq.side)
    let solid = 0, ma = 0
    for (let i = 0; i < sq.side * sq.side; i++) {
      if (sprite.data[i * sprite.ch + 3] >= SOLID) solid++
      ma += matte.data[i * matte.ch + 3] / 255
    }
    rows.push({ key, sq, fig: solid / (sq.side * sq.side), mat: ma / (sq.side * sq.side) })
  }
  rows.sort((a, b) => b.mat / b.fig - a.mat / a.fig)
  for (const r of rows) {
    L.push(`| ${r.key} | ${r.sq.side}px | ${pct(r.fig)} | ${pct(r.mat)} | ${(r.mat / r.fig).toFixed(2)}x |`)
  }
  coverage.push(rows)
  L.push('')

  const text = `${L.join('\n')}\n`
  if (process.argv.includes('--stdout')) process.stdout.write(text)
  else {
    fs.mkdirSync(path.dirname(REPORT), { recursive: true })
    fs.writeFileSync(REPORT, text)
    console.log(`wrote ${path.relative(REPO, REPORT)} (${text.length} B)`)
  }

  // Optional sanity composite for eyes: --png <dir> writes one frame per foe over the default breakwater plate.
  const at = process.argv.indexOf('--png')
  if (at > 0) {
    const dir = process.argv[at + 1]
    fs.mkdirSync(dir, { recursive: true })
    const key = process.argv[at + 2] ?? 'wrecker'
    const plateId = process.argv[at + 3] ?? 'breakwater-northern-sea'
    const man = mans[key]
    const sq = figureSquare(key, man.kind)
    const plate = await loadPlate(sharp, plateId, VIEW.w, sceneH)
    const sprite = await rgba(sharp, path.join(ENEMIES, 'anim', key, cellName(key, man.idleRow * man.cols + man.rest)), sq.side)
    const matte = await rgba(sharp, backingPath(key, man.idleRow * man.cols + man.rest), sq.side)
    const out = Buffer.from(plate.data)
    for (let y = 0; y < sq.side; y++) {
      for (let x = 0; x < sq.side; x++) {
        const i = y * sq.side + x
        const o = ((sq.top + y) * VIEW.w + sq.left + x) * plate.ch
        const m = matte.data[i * matte.ch + 3] / 255
        const a = sprite.data[i * sprite.ch + 3] / 255
        for (let c = 0; c < 3; c++) {
          const back = out[o + c] * (1 - m) + bg.rgb[c] * m
          out[o + c] = Math.round(back * (1 - a) + sprite.data[i * sprite.ch + c] * a)
        }
      }
    }
    await sharp(out, { raw: { width: VIEW.w, height: sceneH, channels: plate.ch } }).png().toFile(path.join(dir, `${key}-${plateId}.png`))
  }
}

main().catch((err) => { console.error(String(err.stack ?? err)); process.exit(1) })
