// scripts/measured-compare.test.mjs — the pure measured-truth compare and renderers (R12a A5).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  auditRowPrefix, compare, familyCellText, fileDrifts, historyLine, renderAuditRow, renderDigestSection,
  renderLatest, rewardLaneRows, selfBurnRows,
} from './measured-compare.mjs'
import { lintFile } from './check-plan-queues.mjs'

function cell(over = {}) {
  return {
    fight: 'bw-17/death-beholder', isBoss: true, playerLevel: 2, enemyLevel: 1, spread: 'even', deck: 'grey',
    winRate: 0.5, meanRounds: 6, lowestVitaeFractionMean: 0.3, lowestVitaeFractionP10: 0.1, playerHpTakenMean: 40,
    ...over,
  }
}

function line(cells, over = {}) {
  return {
    date: '2026-10-13', commit: 'bbbbbbb', runs: 300, seed: 1, cells,
    decks: { grey: { deckCards: ['grey-strike'], deadCardRate: 0 } }, ...over,
  }
}

const previous = line([cell()], { date: '2026-10-06', commit: 'aaaaaaa' })

test('compare: the first line never drifts', () => {
  assert.deepEqual(compare({ current: line([cell({ winRate: 0 })]), previous: null }), [])
})

test('compare: moves under every threshold are not drifts', () => {
  const current = line([cell({ winRate: 0.59, lowestVitaeFractionP10: 0.24, meanRounds: 7.9 })])
  assert.deepEqual(compare({ current, previous }), [])
})

test('compare: a move of exactly a threshold, either way, is a drift', () => {
  const current = line([cell({ winRate: 0.4, lowestVitaeFractionP10: 0.25, meanRounds: 8 })])
  const drifts = compare({ current, previous })
  assert.deepEqual(drifts.map((d) => d.metric), ['winRate', 'lowestVitaeFractionP10', 'meanRounds'])
  const win = drifts[0]
  assert.equal(win.previous, 0.5)
  assert.equal(win.current, 0.4)
  assert.equal(win.commit, 'bbbbbbb')
  assert.equal(win.previousCommit, 'aaaaaaa')
  assert.equal(win.spread, 'even')
})

test('compare: thresholds are read from the argument', () => {
  const current = line([cell({ winRate: 0.55 })])
  assert.equal(compare({ current, previous, thresholds: { winRatePoints: 5 } }).length, 1)
})

test('compare: a cell with no counterpart is skipped', () => {
  const current = line([cell({ spread: 'body', winRate: 0 })])
  assert.deepEqual(compare({ current, previous }), [])
})

const drift = compare({ current: line([cell({ winRate: 0.2 })]), previous })[0]

test('renderAuditRow: a [content] row naming fight, deck, metric, both values and both commits', () => {
  const row = renderAuditRow(drift, '2026-10-13')
  assert.match(row, /^### \[ \] \[content\] measured drift: bw-17\/death-beholder grey winRate 50% -> 20% \(even, 2026-10-13\)\n/)
  assert.match(row, /- category: content\n/)
  assert.match(row, /from 50% at aaaaaaa to 20% at bbbbbbb/)
  assert.match(row, /D88, D99/)
  assert.ok(row.endsWith('\n'))
})

test('fileDrifts: a new row goes under ## Pending', () => {
  const { text, added } = fileDrifts('# Audit\n\n## Pending\n\n### [ ] [bug] old\n- category: bug\n', [drift], '2026-10-13')
  assert.equal(added.length, 1)
  const lines = text.split('\n')
  assert.equal(lines[lines.indexOf('## Pending') + 2], added[0].title)
  assert.ok(text.indexOf(added[0].title) < text.indexOf('### [ ] [bug] old'))
})

test('fileDrifts: an open row for the same (fight, deck, metric) gets evidence, not a twin', () => {
  const first = fileDrifts('## Pending\n', [drift], '2026-10-13').text
  const again = { ...drift, spread: 'body', current: 0.1, commit: 'ccccccc' }
  const { text, added, evidenced } = fileDrifts(first, [again], '2026-10-20')
  assert.equal(added.length, 0)
  assert.equal(evidenced.length, 1)
  assert.equal(text.split(auditRowPrefix(drift)).length - 1, 1)
  assert.match(text, /- evidence 2026-10-20: body 50% -> 10% at ccccccc/)
})

test('fileDrifts: two spreads of one key in one run file one row', () => {
  const body = { ...drift, spread: 'body' }
  const { text, added } = fileDrifts('## Pending\n', [drift, body], '2026-10-13')
  assert.equal(added.length, 1)
  assert.match(text, /- evidence 2026-10-13: body/)
})

test('fileDrifts: new rows keep single blank lines', () => {
  const base = '# Audit\n\n## Pending\n\n### [ ] [bug] old\n- category: bug\n'
  const other = { ...drift, deck: 'blood-price' }
  for (const drifts of [[drift], [drift, other]]) {
    const { text, added } = fileDrifts(base, drifts, '2026-10-13')
    assert.equal(added.length, drifts.length)
    assert.ok(!text.includes('\n\n\n'), `${drifts.length} drift(s): no triple newline`)
    assert.ok(text.includes('\n\n### [ ] [bug] old'), 'one blank line before the old first row')
    assert.ok(text.startsWith('# Audit\n\n## Pending\n\n### '), 'one blank line under the heading')
  }
})

test('fileDrifts: never leaves two blank lines in a row, and keeps CRLF', () => {
  const other = { ...drift, deck: 'blood-price' }
  const doubled = (t) => /\n[ \t]*\r?\n[ \t]*\r?\n/.test(t)
  const base = '# Audit\n\n## Pending\n\n### [ ] [bug] old\n- category: bug\n'
  const one = fileDrifts(base, [drift], '2026-10-13').text
  assert.ok(!doubled(one), 'filing into a file that already has a blank under Pending')
  const two = fileDrifts(one, [other], '2026-10-14').text
  assert.ok(!doubled(two), 'one entry after another')
  assert.ok(!doubled(fileDrifts('## Pending\n\n\n### [ ] [bug] old\n', [drift], '2026-10-13').text))
  const crlf = fileDrifts(base.replace(/\n/g, '\r\n'), [drift], '2026-10-13').text
  assert.ok(!/[^\r]\n/.test(crlf), 'every line break stays CRLF')
  assert.ok(!doubled(crlf))
  assert.deepEqual(lintFile(two, 'audit').findings, [])
})

test('fileDrifts: no Pending heading is an error only when there is a row to add', () => {
  assert.throws(() => fileDrifts('# Audit\n', [drift], '2026-10-13'), /Pending/)
  assert.equal(fileDrifts('# Audit\n', [], '2026-10-13').text, '# Audit\n')
})

test('historyLine: stamps the report and slims each cell', () => {
  const report = { runs: 300, seed: 1, cells: [{ ...cell(), map: 'breakwater', nodeId: 'bw-17', enemySlug: 'death-beholder', runs: 300, seed: 1 }], decks: {} }
  const h = historyLine(report, { date: '2026-10-13', commit: 'bbbbbbb' })
  assert.deepEqual(Object.keys(h), ['date', 'commit', 'runs', 'seed', 'cells', 'decks'])
  assert.equal(h.cells[0].map, undefined)
  assert.equal(h.cells[0].winRate, 0.5)
})

test('renderLatest: stamped header, generated note and a row per fight', () => {
  const md = renderLatest(line([cell(), cell({ fight: 'bw-2/float-eye', isBoss: false, winRate: 1 })]))
  assert.match(md, /measured at bbbbbbb, 2026-10-13, 300 runs, seed 1/)
  assert.match(md, /do not edit/)
  assert.match(md, /\| bw-17\/death-beholder \(door\) \| L2 v L1 \| 50% \/ 0\.10 \|/)
  assert.match(md, /\| bw-2\/float-eye \| L2 v L1 \| 100% \/ 0\.10 \|/)
  assert.doesNotMatch(md, /baseline/i)
})

test('renderDigestSection: no run, a stale run, a first run, no drift and drifts', () => {
  assert.match(renderDigestSection(null, null, []), /No measured-truth run yet/)
  const stale = renderDigestSection(previous, null, [], { sinceDate: '2026-10-10' })
  assert.match(stale, /No run since the last entry/)
  assert.doesNotMatch(stale, /\|/)
  const current = line([cell({ winRate: 0.2 })])
  assert.match(renderDigestSection(current, null, []), /First run/)
  assert.match(renderDigestSection(line([cell()]), previous, []), /No drift past the thresholds/)
  const withDrift = renderDigestSection(current, previous, [drift], { sinceDate: '2026-10-10' })
  assert.match(withDrift, /1 drift\(s\)/)
  assert.match(withDrift, /bw-17\/death-beholder, grey even: winRate 50% -> 20%/)
  assert.match(withDrift, /compared with aaaaaaa/)
})

const family = {
  family: true, laneIds: ['elementalist'], poolSize: 30, drawSize: 20,
  draws: [['a'], ['b'], ['c']], deadCardRate: 0.05,
}

function famLine() {
  return line([
    cell({ selfBurnMean: 0 }),
    cell({ deck: 'elementalist', selfBurnMean: 2.5, playerHpTakenMean: 6 }),
    cell({
      deck: 'elementalist~20of30', winRate: 0.9, lowestVitaeFractionP10: 0.4, selfBurnMean: 1,
      winRateMin: 0.75, winRateMax: 1, lowestVitaeFractionP10Min: 0.2, lowestVitaeFractionP10Max: 0.6,
    }),
  ], {
    decks: {
      grey: { deckCards: ['grey-strike'], deadCardRate: 0 },
      elementalist: { deckCards: Array(20).fill('x'), deadCardRate: 0 },
      'elementalist~20of30': family,
    },
  })
}

test('historyLine: keeps selfBurnMean and the family range fields, and adds none a cell lacks', () => {
  const report = famLine()
  const h = historyLine(report, { date: '2026-10-25', commit: 'ccccccc' })
  assert.equal(h.cells[0].selfBurnMean, 0)
  assert.equal(h.cells[2].winRateMin, 0.75)
  assert.equal(h.cells[2].lowestVitaeFractionP10Max, 0.6)
  assert.equal('winRateMin' in h.cells[0], false)
  const old = historyLine({ runs: 300, seed: 1, cells: [cell()], decks: {} }, { date: '2026-10-13', commit: 'b' })
  assert.equal('selfBurnMean' in old.cells[0], false)
  assert.equal(h.decks['elementalist~20of30'].draws.length, 3)
})

test('familyCellText: median win / median p10 and the win-rate range', () => {
  assert.equal(familyCellText(famLine().cells[2]), '90% / 0.40 (75%-100%)')
  assert.equal(familyCellText(undefined), '-')
})

test('renderLatest: plain decks in the fight table, families in Sampled decks, a Self-burn section', () => {
  const md = renderLatest(famLine())
  const [fightTable, rest] = md.split('## Sampled decks')
  assert.match(fightTable, /\| fight \| level \| grey even \| elementalist even \|/)
  assert.doesNotMatch(fightTable, /~20of30/)
  assert.match(rest, /\| fight \| level \| elementalist~20of30 even \|/)
  assert.match(rest, /\| 90% \/ 0\.40 \(75%-100%\) \|/)
  assert.match(md, /## Self-burn/)
  assert.match(md, /\| elementalist \| 6\.0 \| 2\.5 \| 6\.0 \| 2\.5 \|/)
  assert.match(md, /\| grey \| 40\.0 \| 0\.0 \|/)
  assert.match(md, /- \*\*elementalist~20of30\*\*: 3 draws of 20 distinct cards from a 30-card pool \(elementalist\); mean dead-card rate 5%/)
  assert.doesNotMatch(md, /\["a"\]/)
})

test('selfBurnRows: an old line with no selfBurnMean renders no section; a missing field reads -', () => {
  assert.deepEqual(selfBurnRows(line([cell()])), [])
  assert.doesNotMatch(renderLatest(line([cell()])), /Self-burn|Sampled decks/)
  const mixed = selfBurnRows(line([cell({ selfBurnMean: 1 }), cell({ deck: 'old' })]))
  assert.ok(mixed.includes('| old | 40.0 | - | 40.0 | - |'))
})

test('compare: no drift for a deck the previous line lacks, a family cell drifts like a deck', () => {
  const current = famLine()
  assert.deepEqual(compare({ current, previous }), [])
  const before = famLine()
  const moved = famLine()
  moved.cells[2] = { ...moved.cells[2], winRate: 0.5 }
  const drifts = compare({ current: moved, previous: before })
  assert.deepEqual(drifts.map((d) => [d.deck, d.metric]), [['elementalist~20of30', 'winRate']])
})

test('renderDigestSection: still renders the doors with families in the line', () => {
  const out = renderDigestSection(famLine(), null, [])
  assert.match(out, /Doors/)
  assert.doesNotMatch(out, /~20of30/)
})

const state = (worn, lanes, shares) => ({ worn, lanes, offered: 360, shares })

const baselineRow = {
  character: null, name: 'No character',
  start: state([], [], { grey: 1 }),
  late: state(['relic-a', 'relic-b', 'relic-c'], ['blood-price', 'elementalist'], { 'blood-price': 0.6, elementalist: 0.4 }),
}

test('historyLine: carries rewardLanes when the report has them, and none otherwise', () => {
  const rewardLanes = { rolls: 400, seed: 1, rows: [baselineRow] }
  const withRows = historyLine({ runs: 300, seed: 1, cells: [cell()], decks: {}, rewardLanes }, { date: 'd', commit: 'c' })
  assert.deepEqual(withRows.rewardLanes, rewardLanes)
  const without = historyLine({ runs: 300, seed: 1, cells: [cell()], decks: {} }, { date: 'd', commit: 'c' })
  assert.equal('rewardLanes' in without, false)
})

test('rewardLaneRows: an old line with no rewardLanes renders no section', () => {
  assert.deepEqual(rewardLaneRows(line([cell()])), [])
  assert.equal(renderLatest(line([cell()])).includes('Reward lanes by character'), false)
})

test('rewardLaneRows: an empty roster holds the baseline row only, with the empty-roster note', () => {
  const text = rewardLaneRows(line([cell()], { rewardLanes: { rolls: 400, seed: 1, rows: [baselineRow] } })).join('\n')
  assert.match(text, /^## Reward lanes by character/)
  assert.match(text, /No roster character yet: the no-character baseline row only\./)
  assert.match(text, /\| no character \| start \| none \| grey fallback \| grey 100% \|/)
  assert.match(text, /\| no character \| late \| relic-a, relic-b, relic-c \| blood-price, elementalist \| blood-price 60%, elementalist 40% \|/)
  assert.equal(text.split('\n').filter((l) => l.startsWith('| ') && !l.includes('---')).length, 3)
})

test('rewardLaneRows: a character row gets start and late lines and drops the empty-roster note', () => {
  const hero = {
    character: 'hero', name: 'Hero',
    start: state(['relic-a'], ['a', 'b'], { a: 0.5, b: 0.5 }),
    late: state(['relic-a', 'relic-b', 'relic-c'], ['a', 'b', 'c'], { a: 0.4, b: 0.3, c: 0.3 }),
  }
  const text = rewardLaneRows(line([cell()], { rewardLanes: { rolls: 400, seed: 1, rows: [hero, baselineRow] } })).join('\n')
  assert.equal(text.includes('No roster character yet'), false)
  assert.match(text, /\| Hero \| start \| relic-a \| a, b \| a 50%, b 50% \|/)
  assert.match(text, /\| Hero \| late \| relic-a, relic-b, relic-c \| a, b, c \| a 40%, b 30%, c 30% \|/)
})

test('renderLatest: the section sits before Decks; compare ignores it', () => {
  const rewardLanes = { rolls: 400, seed: 1, rows: [baselineRow] }
  const current = line([cell({ winRate: 0.5 })], { rewardLanes })
  const text = renderLatest(current)
  assert.ok(text.indexOf('## Reward lanes by character') < text.indexOf('## Decks'))
  assert.deepEqual(compare({ current, previous: line([cell()], { rewardLanes: { ...rewardLanes, rolls: 1 } }) }), [])
})
