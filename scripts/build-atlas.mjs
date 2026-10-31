#!/usr/bin/env node
// Build the Miserere Atlas page: devlog/atlas.html, one self-contained page
// (inline CSS and JS, atlas.json inlined at build; the only network request is
// the Google Fonts stylesheet).
//
//   node scripts/build-atlas.mjs [atlas.json] [out.html]
//   npm run atlas:build
//
// The cards, relics, stats and world plates are generated from
// devlog/data/atlas.json (written by `npm run catalog:export`). The context,
// containers, engine, domain, combat, dice and loop plates are hand-drawn
// (scripts/atlas/hand-*.html and hand.js) and carry a "last checked" line.
// Zero dependencies, like build-catalog.mjs.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { escapeHtml as esc } from './devlog-shell.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const ASSETS = join(HERE, 'atlas')

/** The date the hand-drawn plates were last compared with the code. */
export const HAND_CHECKED = '2026-10-29'

const TYPE_ICON = { attack: '\u2694', skill: '\u26E8', spell: '\u2736', global: '\u27F3', curse: '\u2620' }
const TRIGGER_NAME = { turn: 'start of your turn', sac: 'when you SACRIFICE n', curse: 'when you play a Curse' }
const LANE_VARS = ['--muted', '--blood', '--lapis', '--heal', '--murex']

const asset = (name) => readFileSync(join(ASSETS, name), 'utf8')

/** Lanes as the page lists them: the engine's lanes, then "No lane" if a card sits in none. */
export function laneList(atlas) {
  const lanes = atlas.lanes.map((l) => ({ id: l.id, name: l.name }))
  if (atlas.cards.some((c) => !c.laneId)) lanes.push({ id: '', name: 'No lane' })
  return lanes
}

/** Keywords used by any card, most-printed first. */
export function keywordTotals(atlas) {
  const totals = new Map()
  for (const c of atlas.cards) for (const k of c.keywords) totals.set(k, (totals.get(k) ?? 0) + 1)
  return [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

const TYPE_ORDER = ['attack', 'skill', 'spell', 'global', 'curse']
const COLOR_ORDER = ['body', 'mind', 'heart', 'any']
const orderBy = (preferred, values) => {
  const set = [...new Set(values)]
  return [...preferred.filter((p) => set.includes(p)), ...set.filter((v) => !preferred.includes(v)).sort()]
}

const table = (head, rows, cls = '') =>
  `<div class="tablewrap${cls}"><table>${head ? `<tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>` : ''}${rows.join('')}</table></div>`

function handPlates(html) {
  return html.replaceAll('</section>', `  <p class="note hand">hand-drawn, last checked ${HAND_CHECKED}</p>\n</section>`)
}

function cardsPlate(atlas) {
  const lanes = laneList(atlas)
  const kws = keywordTotals(atlas)
  const types = orderBy(TYPE_ORDER, atlas.cards.map((c) => c.type))
  const colors = orderBy(COLOR_ORDER, atlas.cards.map((c) => c.color))
  const inLane = (lid) => atlas.cards.filter((c) => (c.laneId ?? '') === lid)
  const icon = (t) => TYPE_ICON[t] ?? '\u00B7'
  const dot = (n) => n || '\u00B7'

  const laneStats = table(
    ['lane', ...types.map((t) => `${icon(t)} ${t}`), ...colors],
    lanes.map((l) => {
      const cs = inLane(l.id)
      return `<tr><td>${esc(l.name)}</td>${types.map((t) => `<td class="n">${dot(cs.filter((c) => c.type === t).length)}</td>`).join('')}${colors.map((k) => `<td class="n">${dot(cs.filter((c) => c.color === k).length)}</td>`).join('')}</tr>`
    }),
  )

  const triggers = orderBy(['turn', 'sac', 'curse'], atlas.cards.map((c) => c.trigger).filter(Boolean))
  const laneName = (c) => lanes.find((l) => l.id === (c.laneId ?? ''))?.name ?? ''
  const globals = table(
    ['Global trigger', 'cards that listen'],
    triggers.length
      ? triggers.map((t) => {
          const cs = atlas.cards.filter((c) => c.trigger === t)
          return `<tr><td class="mono">${esc(TRIGGER_NAME[t] ?? t)}</td><td>${cs.map((c) => `${esc(c.name)} <span class="note">(${esc(laneName(c))})</span>`).join(', ')}</td></tr>`
        })
      : ['<tr><td colspan="2"><span class="note">no Global has a trigger</span></td></tr>'],
  )

  const maxN = Math.max(1, ...kws.flatMap(([k]) => lanes.map((l) => inLane(l.id).filter((c) => c.keywords.includes(k)).length)))
  const heat = table(
    ['keyword', ...lanes.map((l) => esc(l.name)), 'total'],
    kws.map(([k, total]) => {
      const cells = lanes
        .map((l, li) => {
          const n = inLane(l.id).filter((c) => c.keywords.includes(k)).length
          const a = n ? 0.12 + (0.75 * n) / maxN : 0
          return `<td class="h" data-kw="${esc(k)}" data-lane="${esc(l.id)}" style="background:color-mix(in srgb, var(${LANE_VARS[li % LANE_VARS.length]}) ${Math.round(a * 100)}%, transparent)">${dot(n)}</td>`
        })
        .join('')
      return `<tr><th class="kw mono" data-kw="${esc(k)}">${esc(k)}</th>${cells}<td class="n">${total}</td></tr>`
    }),
    ' heat',
  ).replace(' heat"', ' heat" id="heat-wrap"').replace('<table>', '<table id="heat">')

  const ledger = atlas.cards
    .map((c) => {
      const lines = [
        c.keywords.length ? `<div class="ln"><b>KEYS</b><span>${c.keywords.map(esc).join(' \u00B7 ')}</span></div>` : '',
        c.trigger ? `<div class="ln"><b>${TYPE_ICON.global} ON</b><span>${esc(TRIGGER_NAME[c.trigger] ?? c.trigger)}</span></div>` : '',
      ].join('')
      return (
        `<article class="card" data-lane="${esc(c.laneId ?? '')}" data-type="${esc(c.type)}" data-kw="${esc(c.keywords.join(' '))}">` +
        `<span class="pip c-${esc(c.color)}"></span><div class="top"><span class="nm">${esc(c.name)}</span>` +
        `<span class="meta">${icon(c.type)} ${esc(c.type)} \u00B7 ${esc(c.color)}${c.rank > 1 ? ` \u00B7 rank ${c.rank}` : ''}</span></div>` +
        `${lines}<div class="meta">${esc(c.id)}${c.laneId ? '' : ' \u00B7 in no lane'}</div></article>`
      )
    })
    .join('\n')

  return `<section class="plate" id="cards" data-toc="Cards">
  <div class="plate-head"><div class="eyebrow"><b>Content</b> \u00B7 ${atlas.cards.length} cards in ${atlas.lanes.length} lanes</div><h2>Card relationships</h2>
  <p>${atlas.lanes.map((l) => esc(l.name)).join(', ')}. Edge weight in the graph is how many cards in a lane print that keyword. Click a keyword (graph or heat map) to filter the ledger below; click a lane to light its edges. Read from the engine's card library and lanes at build time.</p></div>
  <div class="frame"><svg id="d-kw"></svg></div>
  <div class="grid2">
    ${laneStats}
    ${globals}
  </div>
  <h3>Keyword heat map</h3>
  ${heat}
  <h3>Card lifecycle by type</h3>
  <div class="frame"><svg id="d-life"></svg></div>
  <div class="inspector" id="i-life"></div>
  <p class="note hand">lifecycle diagram hand-drawn, last checked ${HAND_CHECKED}</p>
  <h3>The ledger</h3>
  <div class="toolbar filters" id="filters"></div>
  <div class="count" id="count"></div>
  <div class="cards" id="cardgrid">
${ledger}
  </div>
</section>`
}

function relicsPlate(atlas) {
  const sigs = new Map(atlas.signatures.map((s) => [s.id, s]))
  const laneName = new Map(atlas.lanes.map((l) => [l.id, l.name]))
  const rows = atlas.relics.map((r) => {
    const s = sigs.get(r.signatureId)
    return `<tr><td>${esc(r.name)}</td><td class="mono">${esc(r.statLines.join(' \u00B7 ') || '\u2014')}</td><td>${esc(s ? s.name : r.signatureId ?? '')}</td><td class="n">${s ? `\u25C6${s.cost}` : ''}</td><td>${esc(r.laneId ? laneName.get(r.laneId) ?? r.laneId : 'no lane')}</td><td>${esc(r.relicSource ?? '')}</td></tr>`
  })
  return `<section class="plate" id="relics" data-toc="Relics">
  <div class="plate-head"><div class="eyebrow"><b>Content</b> \u00B7 Relic \u2192 signature \u2192 lane</div><h2>Relics open lanes and grant signatures</h2>
  <p>${atlas.relics.length} relics and ${atlas.signatures.length} signatures. A worn relic adds its stat lines to each fight, grants one signature, and opens its lane to the reward pool. A run starts with none; the slot count is <code>SLOT_CAPACITY.relic</code>.</p></div>
  <div class="frame"><svg id="d-relic"></svg></div>
  <div class="inspector" id="i-relic"></div>
  ${table(['relic', 'stat lines', 'signature', 'cost', 'lane', 'source'], rows)}
  <h3>How a reward offer is drawn</h3>
  <div class="frame"><svg id="d-reward"></svg></div>
  <div class="inspector" id="i-reward"></div>
  <p class="note hand">reward diagram hand-drawn, last checked ${HAND_CHECKED}</p>
</section>`
}

function statsPlate(atlas) {
  const F = atlas.formulas
  const RM = F.RESOURCE_MULTIPLIERS
  const startVitae = F.PLAYER_VITAE_BASE + (RM.VITAE_PER_BODY + RM.VITAE_PER_MIND + RM.VITAE_PER_HEART) * 5
  const maxStat = F.scaling.length ? F.scaling[F.scaling.length - 1].stat : 20
  const first = atlas.xp[0]
  const last = atlas.xp[atlas.xp.length - 1]
  const xpRows = atlas.xp.map((r) => `<tr><td class="n">${r.level}</td><td class="n">${r.experienceToNext.toLocaleString('en-US')}</td><td class="n">${r.total.toLocaleString('en-US')}</td></tr>`)
  const scaleRows = F.scaling.map((r) => `<tr><td class="n">${r.stat}</td><td class="n">${r.oneShot}</td><td class="n">${r.repeating}</td></tr>`)
  const slider = (id, label, out) =>
    `<label for="${id}">${label}<input type="range" id="${id}" min="1" max="${maxStat}" value="5"><output id="${out}">5</output></label>`
  return `<section class="plate" id="stats" data-toc="Stats">
  <div class="plate-head"><div class="eyebrow"><b>Mechanics</b> \u00B7 Stats, VITAE, levels</div><h2>One bar, three stats, scaled effects</h2>
  <p>VITAE is the only health track. Each effect scales by its family's stat: body for damage to the foe, mind for anything on you, heart for anything on the foe. Foes' VITAE is multiplied by ${F.LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER} in live encounters.</p></div>
  <div class="grid2">
    <div class="calc">
      <div class="eyebrow">Your stats</div>
      ${slider('sb', 'Body', 'ob')}
      ${slider('sm', 'Mind', 'om')}
      ${slider('sh', 'Heart', 'oh')}
      <div><span class="big" id="vitae">${startVitae}</span> <span class="note">max VITAE = ${F.PLAYER_VITAE_BASE} + ${RM.VITAE_PER_BODY}\u00B7body + ${RM.VITAE_PER_MIND}\u00B7mind + ${RM.VITAE_PER_HEART}\u00B7heart</span></div>
    </div>
    <div class="calc">
      <div class="eyebrow">Scaling (<span class="mono">scaleAmount</span>, base ${F.scalingBase})</div>
      <div class="tablewrap"><table id="s3"></table></div>
      <p class="note">One-shot and repeating amounts for a base of ${F.scalingBase}, read from <code>scaleAmount</code> at build time. Durations never scale.</p>
    </div>
  </div>
  <details><summary class="note">Scaling table, base ${F.scalingBase}, stats 0 to ${maxStat}</summary>${table(['stat', 'one-shot', 'repeating'], scaleRows)}</details>
  <h3>Experience (<span class="mono">experienceToNext</span>)</h3>
  <div class="frame narrow"><svg id="d-xp"></svg></div>
  <p class="note">${first && last ? `Level ${first.level} to ${first.level + 1} costs ${first.experienceToNext.toLocaleString('en-US')} XP; reaching level ${last.level} totals ${last.total.toLocaleString('en-US')} XP.` : 'No XP table.'}</p>
  <details><summary class="note">XP table, levels ${first ? first.level : 1} to ${last ? last.level : 1}</summary>${table(['level', 'to next', 'total'], xpRows)}</details>
</section>`
}

function worldPlate(atlas) {
  const regionRows = atlas.regions.map((r) => {
    const kinds = Object.entries(r.nodesByKind).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${esc(k)} ${n}`).join(', ')
    return `<tr><td>${esc(r.map)}</td><td>${esc(r.continent)}</td><td class="n">${r.nodeCount}</td><td>${r.act1 ? 'Act 1' : 'not in Act 1'}</td><td>${kinds}</td></tr>`
  })
  const nAct1 = atlas.regions.filter((r) => r.act1).length
  const quests = atlas.questlines.length
    ? atlas.questlines
        .map((q, i) => {
          const rows = q.steps.map((s) => `<tr><td class="n">${s.step}</td><td>${s.objectives.map(esc).join('; ')}</td><td>${s.rewards.map(esc).join(', ')}</td></tr>`)
          return `  <h3>${esc(q.name ?? q.id)} <span class="note">(${esc(q.map)})</span></h3>
  <div class="frame"><svg id="d-quest-${i}"></svg></div>
  <div class="inspector" id="i-quest-${i}"></div>
  ${table(['step', 'objectives', 'rewards'], rows)}`
        })
        .join('\n')
    : '  <p class="note">No questline is authored.</p>'
  return `<section class="plate" id="world" data-toc="World">
  <div class="plate-head"><div class="eyebrow"><b>Mechanics</b> \u00B7 Act 1 route</div><h2>${atlas.regions.length} maps, ${nAct1} in Act 1</h2>
  <p>The maps the game registers, in registry order; the Act 1 walk crosses the solid ones. Node counts and kinds are from <code>MAP_REGISTRY</code> and each map's event pools. Maps outside the Act 1 walk are dashed.</p></div>
  <div class="frame"><svg id="d-world"></svg></div>
  <div class="inspector" id="i-world"></div>
  ${table(['map', 'continent', 'nodes', 'route', 'node kinds'], regionRows)}
${quests}
</section>`
}

function foesPlate(atlas) {
  const rows = atlas.enemies.map((e) => `<tr><td>${esc(e.name)}</td><td class="n">${e.level}</td><td>${esc(e.difficulty ?? '')}</td><td class="n">${e.vitae}</td><td class="n">${e.liveVitae}</td></tr>`)
  return `<section class="plate" id="foes" data-toc="Foes">
  <div class="plate-head"><div class="eyebrow"><b>Content</b> \u00B7 ${atlas.enemies.length} foes</div><h2>The foe roster</h2>
  <p>Authored VITAE, and the live VITAE a fight starts with (<code>LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER</code> = ${atlas.formulas.LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER}). No win rates here: balance numbers live in <code>docs/reports/measured/latest.md</code>.</p></div>
  ${table(['foe', 'level', 'difficulty', 'VITAE', 'live VITAE'], rows)}
</section>`
}

/** Render the whole page for one atlas.json object. */
export function renderAtlas(atlas) {
  const { meta } = atlas
  const data = JSON.stringify(atlas).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029')
  const js = [asset('engine.js'), asset('hand.js'), asset('generated.js')].join('\n')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Miserere Atlas</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=Alegreya+Sans:ital,wght@0,400;0,500;0,700;1,400&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
${asset('atlas.css')}
.note.hand{font-family:var(--mono);font-size:.7rem}
details>summary{cursor:pointer;margin-block:6px}
.card[hidden]{display:none}
</style>
</head>
<body>
<div class="wrap">
<header class="masthead">
  <div class="eyebrow"><a href="./index.html">\u2190 DevLog hub</a> \u00B7 Architecture atlas \u00B7 Miserere Mei, Deus</div>
  <h1>Miserere Atlas</h1>
  <p class="lede">The game as the code stands: the systems around it, the containers in the monorepo, the engine's components, the domain model, the combat machine and the dice economy (hand-drawn), then ${atlas.cards.length} cards, ${atlas.relics.length} relics, ${atlas.regions.length} maps and the stats tables read from the engine at build time, and the loop that builds it. Click any box to read what it is and where it lives.</p>
  <div class="stamp"><span>engine read at <b>${esc(meta.commit)}</b> (${esc(meta.generatedAt)})</span><span>rules source: <b>docs/game-model.md</b> + code</span></div>
</header>
<nav class="toc" aria-label="Sections"><div class="in" id="toc"></div></nav>

${handPlates(asset('hand-a.html'))}

${cardsPlate(atlas)}

${relicsPlate(atlas)}

${statsPlate(atlas)}

${worldPlate(atlas)}

${foesPlate(atlas)}

${handPlates(asset('hand-b.html'))}

<!-- The drift plate goes here (phase AT1c). -->

<footer>Engine data read at ${esc(meta.commit)} on ${esc(meta.generatedAt)} by <code>npm run catalog:export</code>; the cards, relics, foes, maps and XP table were read from the engine's own libraries. The hand-drawn plates are cited to their files and dated. A diagram is a reading of the code, not a replacement for it.</footer>
</div>
<script type="application/json" id="atlas-data">${data}</script>
<script>
(function(){
${js}
})();
</script>
</body>
</html>
`
}

function isDirectRun() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
}

if (isDirectRun()) {
  const src = process.argv[2] ?? join(ROOT, 'devlog', 'data', 'atlas.json')
  const out = process.argv[3] ?? join(ROOT, 'devlog', 'atlas.html')
  if (!existsSync(src)) {
    console.error(`atlas: ${src} is missing. Run \`npm run catalog:export\` first.`)
    process.exit(1)
  }
  const atlas = JSON.parse(readFileSync(src, 'utf8'))
  writeFileSync(out, renderAtlas(atlas))
  console.log(`atlas: built ${out} (${atlas.cards.length} cards, ${atlas.relics.length} relics, ${atlas.regions.length} maps)`)
}
