#!/usr/bin/env node
// scripts/nexus-sync-body.mjs — the body of the weekly nexus sync PR (phase NX1h, A12, A14).
// Zero dependencies.
//
// `.github/workflows/nexus-sync.yml` runs `npx @usenexus/cli upgrade --pr --no-assist --json`,
// which opens (or updates) one PR whose body is the CLI's own report. This script rewrites that
// body so T can say what nexus is giving us without opening a file:
//
//   0. the /heads-down line first, and loud, when nexus changed /heads-down (A12; R5's rule:
//      T and a session walk the diff and bring /pilot up to date), naming the /pilot parts
//      that track the changed sections (skills/pilot.md §6, "Where each part comes from");
//   1. a banner: only T merges this PR, the version and kit ref we are on and the one this
//      brings, and the count of files by outcome;
//   2. What nexus is giving us: one line per upstream commit that touches the kit, grouped by
//      the loop part it touches, each saying whether it reaches Miserere;
//   3. a Mermaid diagram: old ref -> new ref -> the three-way merge -> Miserere, one node per
//      changed file coloured by outcome (taken green, merged amber, conflict red, kept ours grey);
//   4. the file table, with the docs/nexus-deviations.md row each file touches;
//   5. before/after tables for each changed file whose behaviour moves;
//   6. What we are not getting: each conflict (and file kept as ours), why, and what T can do.
//   The /heads-down line closes the body when nexus did not change it.
//
//   node scripts/nexus-sync-body.mjs --report <cli report.json> [--kit <nexus clone>] [--repo <dir>] [--out <file>]
//
// `--kit` is a full clone of the nexus repo: the commits between the two refs and the files at
// each come from its history. Without it the body still renders from the report alone (the
// commit lines and before/after rows say they could not be read). `renderBody` is pure; the
// tests run it on fixtures (scripts/fixtures/nexus-sync/).

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** The label the merge job holds for T (scripts/pr-policy.mjs SYNC_LABEL reads the same word). */
export const LABEL = 'nexus-sync'

/** GitHub refuses a PR body past 65536 characters. */
export const BODY_MAX = 60000

/** The four outcomes a changed file can have here, with the diagram colour each draws in. */
export const OUTCOMES = Object.freeze({
  taken: { word: 'taken as nexus wrote it', short: 'taken', fill: '#2da44e', stroke: '#1a7f37', color: '#ffffff' },
  merged: { word: 'merged with ours', short: 'merged', fill: '#d4a72c', stroke: '#9a6700', color: '#1f2328' },
  conflict: { word: 'conflict, kept as ours', short: 'conflict', fill: '#cf222e', stroke: '#a40e26', color: '#ffffff' },
  kept: { word: 'kept as ours', short: 'kept ours', fill: '#6e7781', stroke: '#424a53', color: '#ffffff' },
})

/** The upstream files that are nexus's /heads-down (A12). A change to any of them is called out first. */
export const HEADS_DOWN_KIT = Object.freeze(['templates/skills/heads-down.md', 'templates/scripts/ledger.mjs', 'templates/claude/commands/heads-down.md'])
/** The same files at their repo paths. */
export const HEADS_DOWN_REPO = Object.freeze(['skills/heads-down.md', 'scripts/ledger.mjs', '.claude/commands/heads-down.md'])

/** The callout's first words (A12). Fixtures pin it. */
export const HEADS_DOWN_CHANGED = 'nexus changed /heads-down: walk the diff with T and bring /pilot up to date'
export const HEADS_DOWN_SAME = 'nexus did not change /heads-down in this sync: /pilot needs nothing from it.'

/**
 * The outcome of one CLI report row ({ path, status, note }), or null for a row that is not a
 * changed file (a custom skill or lanes file the sync never touches).
 *
 * @param {{ path: string, status: string, note?: string }} row
 * @returns {'taken' | 'merged' | 'conflict' | 'kept' | null}
 * @example outcomeOf({ path: 'scripts/cloud/chain.mjs', status: 'replaced' }) // 'taken'
 */
export function outcomeOf(row) {
  const s = String(row?.status ?? '')
  if (/^(replaced|new|added|ref moved)$/.test(s)) return 'taken'
  if (/^(merged|assisted|knobs written)$/.test(s)) return 'merged'
  if (/^conflict|^held back|not applied/.test(s)) return 'conflict'
  if (s === 'kept-custom') return /the kit added its own/.test(row.note ?? '') ? 'kept' : null
  return null
}

/** A kit path (`templates/...`) at its repo path. */
export function repoPathOf(kitPath) {
  const p = String(kitPath)
  if (!p.startsWith('templates/')) return null
  const rest = p.slice('templates/'.length)
  if (rest.startsWith('claude/')) return `.${rest}`
  return rest
}

/** The loop part a commit touches, from its kit files and its subject (A14 item 2). */
export const PARTS = Object.freeze(['picking work', 'landing', 'review', 'planning', 'workflows', 'the rest of the kit'])

export function partOf({ subject = '', files = [] }) {
  const kit = files.map(repoPathOf).filter(Boolean)
  const rules = [
    ['workflows', /^\.github\/|^scripts\/cloud\//, /\b(cron|cadence|tick|cloud|workflow|quota|runner)\b/i],
    ['landing', /^skills\/next\/land|^scripts\/pr\/|^scripts\/owner\.mjs/, /\b(land|landing|push|pull request|PR)\b/],
    ['review', /^skills\/(critique|review|moderate)/, /\b(review|critique|judge)\b/i],
    ['picking work', /^skills\/(march|next|heads-down|ship-|tidy|triage)|^\.claude\/commands\/(march|next|heads-down)|^scripts\/plan\/|^scripts\/claims|^scripts\/ledger/, /\b(pick|march|claim|ready|dispatch)\b/i],
    ['planning', /^skills\/(plot|plan-a-spec|messy|expand)|^scripts\/plan-check|^plan\//, /\b(spec|plot|chunk(ed|s)?|roadmap)\b/i],
  ]
  // The files decide first; the subject only when no file does.
  for (const [part, files] of rules) if (kit.some((f) => files.test(f))) return part
  for (const [part, , words] of rules) if (words.test(subject)) return part
  return 'the rest of the kit'
}

/** A commit subject in plain words: the `type:` prefix dropped, ` -- ` read as a colon. */
export function plainSubject(subject) {
  const s = String(subject).replace(/^[a-z]+(\([^)]*\))?!?:\s*/i, '').replace(/\s+--\s+/g, ': ').trim()
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

/**
 * The sections of a skill file that differ between two versions, as the labels `skills/pilot.md`
 * §6 uses: `§N` (the text under `## N.` before its first step), `§N Step M`, `hard rule K`.
 */
export function changedSections(before, after) {
  const split = (text) => {
    const out = new Map()
    let sec = null
    let step = null
    let rules = false
    for (const line of String(text ?? '').replace(/\r\n/g, '\n').split('\n')) {
      const h2 = /^##\s+(\d+)\.\s*(.*)$/.exec(line)
      const h3 = /^###\s+Step\s+(\d+)/.exec(line)
      if (h2) { sec = h2[1]; step = null; rules = /hard rules/i.test(h2[2]); continue }
      if (h3 && sec) { step = h3[1]; continue }
      if (/^#\s/.test(line)) { sec = '0'; step = null; continue }
      const rule = rules && /^(\d+)\.\s/.exec(line)
      let key = sec == null ? '§0' : step ? `§${sec} Step ${step}` : `§${sec}`
      if (rules && rule) key = `hard rule ${rule[1]}`
      else if (rules && sec && !step) {
        const last = [...out.keys()].filter((k) => k.startsWith('hard rule ')).pop()
        if (last && line.trim()) key = last
      }
      out.set(key, `${out.get(key) ?? ''}${line}\n`)
    }
    return out
  }
  const a = split(before)
  const b = split(after)
  const keys = [...new Set([...a.keys(), ...b.keys()])]
  return keys.filter((k) => (a.get(k) ?? '').trim() !== (b.get(k) ?? '').trim())
}

/**
 * The provenance rows of `skills/pilot.md` §6 ("Where each part comes from"): { part, from,
 * tracks } per row, or null when the file or the table is not there (before NX1g lands).
 */
export function pilotRows(text) {
  if (!text) return null
  const at = String(text).replace(/\r\n/g, '\n').split(/\n(?=## )/).find((s) => /^## [^\n]*where each part comes from/i.test(s))
  if (!at) return null
  const rows = []
  for (const line of at.split('\n')) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim())
    if (cells.length < 3 || /^-+$/.test(cells[0]) || /^part of/i.test(cells[0])) continue
    rows.push({ part: cells[0], from: cells[1], tracks: cells[2] })
  }
  return rows.length ? rows : null
}

/** Whether a §6 "tracks" cell names one of the changed section labels. */
export function tracksAny(cell, labels) {
  const c = String(cell)
  return labels.some((l) => {
    const m = /^§(\d+)$/.exec(l)
    if (m) return new RegExp(`§${m[1]}(?![\\d.]|\\s+Step)`).test(c)
    const esc = l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`${esc}(?![\\d.])`).test(c)
  })
}

/**
 * The docs/nexus-deviations.md row a repo file touches: the Carried table's row whose "Lives now"
 * cell names it, else the first row anywhere whose first cell names it (by path or file name).
 */
export function mapRowFor(file, mapText) {
  if (!mapText || !file) return null
  const base = path.posix.basename(file)
  const lines = String(mapText).replace(/\r\n/g, '\n').split('\n')
  let section = ''
  const rows = []
  for (const line of lines) {
    const h = /^##\s+(.*)$/.exec(line)
    if (h) { section = h[1].trim(); continue }
    if (!line.startsWith('|') || /^\|\s*-/.test(line)) continue
    const cells = line.split('|').slice(1, -1).map((c) => c.trim())
    if (cells.length < 2 || /^(map row|skill|file|area|#|family)$/i.test(cells[0])) continue
    rows.push({ section, cells })
  }
  const names = (cell) => {
    const ticks = [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1])
    return ticks.some((t) => t === file || t === base || t.endsWith(`/${base}`) || file.endsWith(t))
  }
  const carried = rows.find((r) => r.section === 'Carried' && r.cells[2] && names(r.cells[2]))
  if (carried) return { section: 'Carried', row: carried.cells[0], verdict: carried.cells[1] ?? '' }
  const skill = /^skills\/([^/]+)\.md$/.exec(file)?.[1]
  const first = rows.find((r) => r.section !== 'Carried' && (names(r.cells[0]) || (skill && r.cells[0] === skill)))
  if (first) return { section: first.section, row: first.cells[0], verdict: first.cells.at(-1) ?? '' }
  return null
}

const short = (sha) => String(sha ?? '').slice(0, 7)
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
const mm = (s) => String(s).replace(/"/g, "'").replace(/[<>]/g, '')

/** The changed-file rows of a report: { path, status, note, outcome }, sorted by outcome then path. */
export function changedFiles(report) {
  const order = ['conflict', 'kept', 'merged', 'taken']
  return (report?.files ?? [])
    .map((f) => ({ ...f, outcome: outcomeOf(f) }))
    .filter((f) => f.outcome)
    .sort((a, b) => order.indexOf(a.outcome) - order.indexOf(b.outcome) || (a.path < b.path ? -1 : 1))
}

/** What nexus changed in a file, in plain words: the subjects of the commits that touched it. */
function whatChanged(file, commits, row) {
  const hits = commits.filter((c) => c.files.some((k) => repoPathOf(k) === file))
  if (hits.length) return hits.map((c) => plainSubject(c.subject)).join('; ')
  if (file === 'plan/nexus.lock') return 'the kit ref this repo follows moves to the new one'
  if (row.status === 'knobs written') return `new loop knobs at their conservative values (${row.note ?? ''}): behaviour does not change until T turns them up`
  if (row.status === 'new') return 'a kit file new since our ref'
  return row.note ?? '(no commit between the refs names it)'
}

/** Whether a changed file is one whose behaviour a reader feels: not a test, the lock or a doc. */
const behavioural = (f) => !/(^|\/)__tests__\/|\.test\.|^plan\/nexus\.lock$|^docs\/|README\.md$/.test(f)

/** The description line of a skill's frontmatter, or the first quote line under its title. */
function gist(text, file) {
  if (!text) return null
  const t = String(text).replace(/\r\n/g, '\n')
  if (/\.ya?ml$/.test(file)) {
    const cron = [...t.matchAll(/^\s*-\s*cron:\s*['"]([^'"]+)['"]/gm)].map((m) => m[1])
    const mins = /timeout-minutes:\s*(\d+)/.exec(t)?.[1]
    const bits = [cron.length ? `runs on cron ${cron.join(', ')}` : null, mins ? `${mins}-minute cap` : null].filter(Boolean)
    return bits.length ? bits.join(', ') : null
  }
  if (!/\.md$/.test(file)) return null
  const d = /^description:\s*(.+)$/m.exec(t)
  if (d) return d[1].replace(/^['"]|['"]$/g, '').trim()
  const q = /^>\s*\*\*(.+?)\*\*/m.exec(t)
  if (q) return q[1].trim()
  return null
}

/**
 * The whole PR body. Pure: every input is passed in.
 *
 * @param {{ report: object, commits?: { sha: string, subject: string, files: string[] }[] | null,
 *   texts?: Record<string, { before: string | null, after: string | null }>, fromVersion?: string,
 *   deviations?: string | null, pilot?: string | null, run?: string | null }} input
 * @returns {string} the markdown body.
 */
export function renderBody({ report, commits = null, texts = {}, fromVersion = null, deviations = null, pilot = null, run = null }) {
  const s = report?.sync
  const out = []
  if (!s || report.message) {
    const why = report?.message ? `${report.message}: ${report.why ?? ''}` : (report?.error ?? 'the CLI reported no sync')
    return [`**Nothing to sync.** ${why.trim()}`, '', HEADS_DOWN_SAME, ''].join('\n')
  }
  const from = { version: fromVersion ?? s.from.version ?? short(s.from.sha), sha: s.from.sha ?? s.from.ref }
  const to = { version: s.to.version, sha: s.to.ref }
  const files = changedFiles(report)
  const counts = Object.fromEntries(Object.keys(OUTCOMES).map((k) => [k, files.filter((f) => f.outcome === k).length]))
  const known = Array.isArray(commits)
  const kitCommits = known ? commits.filter((c) => c.files.some((f) => f.startsWith('templates/'))) : []

  // 0. /heads-down, first and loud when it changed (A12).
  const hdCommits = kitCommits.filter((c) => c.files.some((f) => HEADS_DOWN_KIT.includes(f)))
  const hdFiles = files.filter((f) => HEADS_DOWN_REPO.includes(f.path))
  const hdChanged = hdCommits.length > 0 || hdFiles.length > 0
  const hdLines = []
  if (hdChanged) {
    const t = texts['templates/skills/heads-down.md']
    const labels = t ? changedSections(t.before, t.after) : []
    const rows = pilotRows(pilot)
    hdLines.push(`> [!WARNING]`, `> **${HEADS_DOWN_CHANGED}.**`)
    const which = hdCommits.length ? [...new Set(hdCommits.flatMap((c) => c.files.filter((f) => HEADS_DOWN_KIT.includes(f))))] : hdFiles.map((f) => f.path)
    hdLines.push(`> Changed upstream: ${which.map((f) => `\`${f}\``).join(', ')}${labels.length ? `; the sections ${labels.join(', ')} of \`skills/heads-down.md\`` : ''}.`)
    for (const c of hdCommits) hdLines.push(`> - ${plainSubject(c.subject)} (\`${short(c.sha)}\`)`)
    if (!rows) hdLines.push('> `skills/pilot.md` has no "Where each part comes from" table yet (§6): read the diff against all of `/pilot`.')
    else {
      const nexusRows = rows.filter((r) => /^nexus\b/i.test(r.from))
      const hit = labels.length ? nexusRows.filter((r) => tracksAny(r.tracks, labels)) : []
      const list = hit.length ? hit : nexusRows
      hdLines.push(`> The \`/pilot\` parts to bring up to date (\`skills/pilot.md\` §6, ${hit.length ? 'the rows that track a changed section' : 'every row marked nexus: no section could be matched'}):`)
      for (const r of list) hdLines.push(`> - ${r.part} (tracks ${r.tracks})`)
    }
    out.push(...hdLines, '')
  }

  // 1. The banner.
  out.push('> [!CAUTION]')
  out.push('> **Only T merges this PR.** The merge job holds every `nexus-sync` PR, and no loop verb, `/pilot` worker, `pr-autofix` or `pr-resolve` run merges one.')
  out.push('>')
  out.push(`> **nexus ${from.version} @ \`${short(from.sha)}\` → ${to.version} @ \`${short(to.sha)}\`**`)
  out.push('>')
  out.push(`> ${counts.taken} taken · ${counts.merged} merged · ${counts.conflict} conflict${counts.conflict === 1 ? '' : 's'} kept as ours · ${counts.kept} kept ours${run ? ` · [the run](${run})` : ''}`)
  out.push('')

  // 2. What nexus is giving us.
  out.push('## What nexus is giving us', '')
  if (!known) out.push('(The nexus history between the two refs could not be read on this run: the file table below is the whole of it.)', '')
  else if (!kitCommits.length) out.push('Nothing that reaches this repo: no nexus commit between the two refs touches the kit\'s files.', '')
  else {
    const byFile = new Map(files.map((f) => [f.path, f]))
    for (const part of PARTS) {
      const mine = kitCommits.filter((c) => partOf(c) === part)
      if (!mine.length) continue
      out.push(`**${part[0].toUpperCase()}${part.slice(1)}**`, '')
      for (const c of mine) {
        const here = c.files.map(repoPathOf).filter(Boolean).map((p) => byFile.get(p)).filter(Boolean)
        const lands = here.filter((f) => f.outcome === 'taken' || f.outcome === 'merged')
        const stops = here.filter((f) => f.outcome === 'conflict' || f.outcome === 'kept')
        const reach = !here.length ? 'not in our copy of the kit: nothing changes here'
          : stops.length && !lands.length ? `does not reach us: ${stops.map((f) => `\`${f.path}\``).join(', ')} kept as ours`
          : stops.length ? `reaches us in part: ${lands.map((f) => `\`${f.path}\``).join(', ')} take it, ${stops.map((f) => `\`${f.path}\``).join(', ')} kept as ours`
          : `reaches us through ${lands.map((f) => `\`${f.path}\``).join(', ')}`
        out.push(`- ${plainSubject(c.subject)}. *${reach}.* (\`${short(c.sha)}\`)`)
      }
      out.push('')
    }
    const other = commits.length - kitCommits.length
    if (other) out.push(`${other} more nexus commit${other === 1 ? '' : 's'} between the refs change${other === 1 ? 's' : ''} only nexus itself (its CLI, docs or site), not the kit this repo carries.`, '')
  }

  // 3. The diagram.
  out.push('## The merge, in one picture', '')
  out.push('```mermaid', 'flowchart LR')
  out.push(`  old["nexus ${mm(from.version)}<br/>${short(from.sha)}"] --> new["nexus ${mm(to.version)}<br/>${short(to.sha)}"]`)
  out.push('  new --> merge{{"three-way merge<br/>(the kit then, the kit now, ours)"}}')
  out.push('  mis[("Miserere")]')
  if (!files.length) out.push('  merge --> mis')
  files.forEach((f, i) => {
    const o = OUTCOMES[f.outcome]
    out.push(`  merge --> f${i}["${mm(f.path)}<br/>${o.short}"]:::${f.outcome}`)
    out.push(f.outcome === 'taken' || f.outcome === 'merged' ? `  f${i} --> mis` : `  f${i} -. ours stays .-> mis`)
  })
  for (const [k, o] of Object.entries(OUTCOMES)) out.push(`  classDef ${k} fill:${o.fill},stroke:${o.stroke},color:${o.color}`)
  out.push('```', '')
  out.push('Green: taken as nexus wrote it. Amber: merged with ours. Red: a conflict, kept as ours. Grey: kept as ours.', '')

  // 4. The file table.
  out.push('## Every file this sync touches', '')
  if (!files.length) out.push('No kit file changes here.', '')
  else {
    out.push('| File | What nexus changed | What happens here | Deviations map row |', '|---|---|---|---|')
    for (const f of files) {
      const row = mapRowFor(f.path, deviations)
      out.push(`| \`${esc(f.path)}\` | ${esc(whatChanged(f.path, kitCommits, f))} | ${OUTCOMES[f.outcome].word}${f.note && f.outcome !== 'taken' ? ` (${esc(f.note)})` : ''} | ${row ? `${esc(row.row)} (${row.section}${row.verdict ? `, ${esc(row.verdict)}` : ''})` : 'none'} |`)
    }
    out.push('')
  }
  const untouched = (report.files ?? []).filter((f) => f.status === 'kept-custom' && !outcomeOf(f)).length
  const c = s.counts ?? {}
  out.push(`Not changed: ${untouched} of our own skills and lanes files the sync never touches, and ${(c.same ?? 0) + (c.kept ?? 0)} kit files already the same or untouched by nexus.${c.available ? ` ${c.available} kit files nexus ships that this repo has never taken stay out (the CLI report lists them).` : ''}`, '')

  // 5. Before and after.
  out.push('## Before and after', '')
  const moving = files.filter((f) => (f.outcome === 'taken' || f.outcome === 'merged') && behavioural(f.path) && f.status !== 'knobs written')
  if (!moving.length) out.push('No skill, workflow or loop script changes behaviour in this sync.', '')
  for (const f of moving) {
    const kitPath = Object.keys(texts).find((k) => repoPathOf(k) === f.path)
    const t = kitPath ? texts[kitPath] : null
    const was = gist(t?.before, f.path)
    const now = gist(t?.after, f.path)
    const subjects = kitCommits.filter((c2) => c2.files.some((k) => repoPathOf(k) === f.path)).map((c2) => plainSubject(c2.subject))
    out.push(`**\`${f.path}\`** (${OUTCOMES[f.outcome].short})`, '')
    out.push('| | The loop today | After this merges |', '|---|---|---|')
    out.push(`| What it is | ${esc(was ?? `nexus ${from.version}'s version${f.outcome === 'merged' ? ', with our changes' : ''}`)} | ${esc(now && now !== was ? now : `nexus ${to.version}'s version${f.outcome === 'merged' ? ', with our changes kept' : ''}`)} |`)
    if (subjects.length) for (const sub of subjects) out.push(`| What moves | not yet | ${esc(sub)} |`)
    else out.push(`| What moves | | ${f.status === 'new' ? 'a file this repo did not have' : '(no commit subject names the change)'} |`)
    out.push('')
  }

  // 6. What we are not getting.
  out.push('## What we are not getting', '')
  const stuck = files.filter((f) => f.outcome === 'conflict' || f.outcome === 'kept')
  if (!stuck.length) out.push('Everything nexus changed in a file we carry arrives: no conflict, nothing kept back.', '')
  else {
    out.push('| File | Why it stays ours | What T can do |', '|---|---|---|')
    for (const f of stuck) {
      const row = mapRowFor(f.path, deviations)
      const why = row ? `map row "${row.row}" (${row.section}${row.verdict ? `: ${row.verdict}` : ''})` : 'no map row: ours differs from the kit here and no deviation names it'
      const what = f.outcome === 'conflict'
        ? 'Take nexus\'s version (resolve the conflict on this branch, or re-run the sync with the assisted merge), or keep ours and say so in `docs/nexus-deviations.md` § Carried.'
        : 'Compare the two by hand: take nexus\'s, or keep ours and add it to `docs/nexus-deviations.md` § Carried.'
      out.push(`| \`${esc(f.path)}\` | ${esc(f.note ? `${f.note}; ` : '')}${esc(why)} | ${what} |`)
    }
    out.push('')
  }
  if (report.warnings?.length) {
    out.push('<details><summary>The CLI\'s warnings (' + report.warnings.length + ')</summary>', '')
    for (const w of report.warnings) out.push(`- ${w}`)
    out.push('', '</details>', '')
  }

  const red = (report.gate ?? []).filter((g) => !g.ok)
  if (red.length) {
    out.push(`**The CLI's gate was red** (${red.map((g) => g.name).join(', ')})${report.pr && !report.pr.ok ? `: ${report.pr.why ?? report.pr.error ?? 'no PR opened'}` : ''}.`, '')
    out.push('<details><summary>The red gate rows</summary>', '', '```')
    for (const g of red) out.push(`${g.name}:`, ...String(g.out ?? '').split('\n').slice(-12).map((l) => `  ${l}`))
    out.push('```', '', '</details>', '')
  }

  if (!hdChanged) out.push(`**/heads-down:** ${HEADS_DOWN_SAME}`, '')
  out.push('Written by `scripts/nexus-sync-body.mjs` from the CLI\'s report (`npx @usenexus/cli upgrade --pr --no-assist`); `docs/nexus-deviations.md` "How a sync reads this map" says how.')
  let body = `${out.join('\n')}\n`
  if (body.length > BODY_MAX) body = `${body.slice(0, BODY_MAX - 120)}\n\n(the body is cut here at GitHub's limit: the run's summary has all of it)\n`
  return body
}

/** git in the kit clone: stdout, or null. */
function git(dir, args) {
  const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true })
  return r.status === 0 ? r.stdout : null
}

/** The commits between two refs in a nexus clone, oldest first: { sha, subject, files }, or null. */
export function readCommits(kit, from, to) {
  const raw = git(kit, ['log', '--reverse', '--format=%x1e%H%x1f%s', '--name-only', `${from}..${to}`])
  if (raw == null) return null
  return raw.split('\x1e').filter((b) => b.trim()).map((b) => {
    const [head, ...rest] = b.split('\n')
    const [sha, subject] = head.split('\x1f')
    return { sha, subject, files: rest.map((l) => l.trim()).filter(Boolean) }
  })
}

/** The texts at both refs of every kit file the commits touch (for the before/after rows and /heads-down). */
export function readTexts(kit, from, to, commits) {
  const texts = {}
  const paths = new Set([...(commits ?? []).flatMap((c) => c.files.filter((f) => f.startsWith('templates/'))), HEADS_DOWN_KIT[0]])
  for (const p of paths) texts[p] = { before: git(kit, ['show', `${from}:${p}`]), after: git(kit, ['show', `${to}:${p}`]) }
  return texts
}

const readIf = (file) => { try { return fs.readFileSync(file, 'utf8') } catch { return null } }

async function main() {
  const argv = process.argv.slice(2)
  const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null }
  const reportFile = arg('--report')
  if (!reportFile) {
    console.error('usage: nexus-sync-body.mjs --report <cli report.json> [--kit <nexus clone>] [--repo <dir>] [--out <file>] [--run <url>]')
    process.exit(2)
  }
  const raw = readIf(reportFile)
  let report
  try { report = JSON.parse(raw ?? '') } catch { report = { error: `the CLI wrote no JSON report (${reportFile})` } }
  const repo = arg('--repo') ?? ROOT
  const kit = arg('--kit')
  const s = report.sync
  let commits = null
  let texts = {}
  if (kit && s?.from && s?.to && !report.message) {
    const from = s.from.sha ?? s.from.ref
    commits = readCommits(kit, from, s.to.ref)
    if (commits) texts = readTexts(kit, from, s.to.ref, commits)
  }
  const lock = readIf(path.join(repo, 'plan/nexus.lock'))
  const fromVersion = lock ? (/^version:\s*(\S+)/m.exec(lock)?.[1] ?? null) : null
  const body = renderBody({
    report, commits, texts, fromVersion,
    deviations: readIf(path.join(repo, 'docs/nexus-deviations.md')),
    pilot: readIf(path.join(repo, 'skills/pilot.md')),
    run: arg('--run'),
  })
  const out = arg('--out')
  if (out) fs.writeFileSync(out, body)
  else process.stdout.write(body)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
