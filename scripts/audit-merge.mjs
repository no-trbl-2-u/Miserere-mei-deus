#!/usr/bin/env node
// scripts/audit-merge.mjs — row-aware three-way merge of plan/AUDIT.md.
// Zero dependencies.
//
//   node scripts/audit-merge.mjs <base> <ours> <theirs> [<path>]
//
// Git runs it as `merge.audit.driver` (registered by the SessionStart hook and
// by pr-resolve's `registerMergeDrivers`; `.gitattributes` names the path) with
// %O %A %B %P, and reads the result from <ours>. pr-resolve's `mergeMain` also
// calls `mergeAudit` for a conflicted AUDIT.md when no driver ran.
//
// A line merge (plain diff3, or `git merge-file --union`) of two branches that
// each moved a different row from `## Pending` to `## Done` can glue one row's
// last body line to the next row's header: check-plan-queues then fails with
// "header follows line N-1 with no blank line" (2026-11-22, PRs #1680, #1686,
// #1689, #1695). This merges rows instead of lines:
//   - a row is a `### ` header and its body up to the next `#`/`##`/`###`
//     line; its key is the header with the `[x]`/`[ ]` checkbox and a
//     trailing ` — CLOSED …` stripped, so a row keeps its key when closed;
//   - the result starts from theirs (main); each row ours changed against the
//     base (added, edited, closed or moved) is applied: replaced in place, or
//     moved to ours' section next to the row ours put it beside; a row ours
//     deleted and theirs left alone is removed;
//   - a row both sides changed takes ours, unless only theirs closed it
//     (a close is never undone by the branch);
//   - the text outside rows (preamble, section intros) is taken from the side
//     that changed it, or line-unioned when both did;
//   - rows are written with exactly one blank line between them.
// Pure apart from the CLI; deterministic.
//
// Exit codes: 0 merged.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SECTION = /^#{1,2} /
const ROW = /^### /

/**
 * A row's identity: its header without the checkbox and the close suffix.
 * @param {string} header the `### ` line
 * @returns {string}
 */
export function rowKey(header) {
  return header
    .replace(/^### (\[[ x]\] )?/, '')
    .replace(/ — CLOSED\b.*$/, '')
    .trim()
}

const trimBlank = (lines) => {
  let end = lines.length
  while (end > 0 && lines[end - 1].trim() === '') end -= 1
  return lines.slice(0, end)
}

/**
 * Split a queue file into sections (`#`/`##` headings) of intro text and rows.
 * @param {string} text
 * @returns {{ sections: { head: string | null, intro: string[], rows: { key: string, lines: string[] }[] }[], eol: boolean }}
 */
export function parseRows(text) {
  const eol = text.endsWith('\n')
  const lines = (eol ? text.slice(0, -1) : text).split('\n')
  const sections = [{ head: null, intro: [], rows: [] }]
  const seen = new Map()
  let row = null
  for (const line of lines) {
    const sec = sections[sections.length - 1]
    if (SECTION.test(line)) {
      sections.push({ head: line, intro: [], rows: [] })
      row = null
    } else if (ROW.test(line)) {
      const base = rowKey(line)
      const n = (seen.get(base) || 0) + 1
      seen.set(base, n)
      row = { key: n === 1 ? base : `${base}\u0000${n}`, lines: [line] }
      sec.rows.push(row)
    } else if (row) row.lines.push(line)
    else sec.intro.push(line)
  }
  for (const s of sections) {
    for (const r of s.rows) r.lines = trimBlank(r.lines)
    if (s.rows.length) s.intro = trimBlank(s.intro)
  }
  if (sections[0].head === null && sections[0].intro.length === 0 && sections[0].rows.length === 0) sections.shift()
  return { sections, eol }
}

/**
 * Write parsed sections back: one blank line before every row and before every
 * heading that follows content.
 * @param {ReturnType<typeof parseRows>} doc
 * @returns {string}
 */
export function renderRows({ sections, eol }) {
  const out = []
  for (const s of sections) {
    if (s.head !== null) {
      if (out.length && out[out.length - 1].trim() !== '') out.push('')
      out.push(s.head)
    }
    out.push(...s.intro)
    for (const r of s.rows) {
      if (out.length && out[out.length - 1].trim() !== '') out.push('')
      out.push(...r.lines)
    }
  }
  const text = out.join('\n')
  return eol ? `${text}\n` : text
}

/** key → { sec: section index, head, text } for every row. */
function rowIndex(doc) {
  const m = new Map()
  doc.sections.forEach((s, i) => {
    for (const r of s.rows) m.set(r.key, { head: s.head, text: r.lines.join('\n'), lines: r.lines })
  })
  return m
}

const isClosed = (lines, head) => /^### \[x\] /.test(lines[0]) || / — CLOSED\b/.test(lines[0]) || /^## Done\b/.test(head ?? '')

/** Line-union of two intros that both changed: theirs, then ours' new lines in place. */
function unionIntro(base, ours, theirs) {
  const b = new Set(base)
  const t = new Set(theirs)
  const out = [...theirs]
  let at = 0
  for (const line of ours) {
    const i = out.indexOf(line, at)
    if (i >= 0) {
      at = i + 1
      continue
    }
    if (b.has(line) || t.has(line)) continue // theirs removed or already has it
    out.splice(at, 0, line)
    at += 1
  }
  return out
}

/**
 * Row-aware three-way merge of a `### `-row queue file (plan/AUDIT.md).
 * @param {string} base  @param {string} ours  @param {string} theirs
 * @returns {string}
 */
export function mergeAudit(base, ours, theirs) {
  const B = parseRows(base)
  const O = parseRows(ours)
  const T = parseRows(theirs)
  const bRows = rowIndex(B)
  const tRows = rowIndex(T)
  const result = { eol: T.eol, sections: T.sections.map((s) => ({ ...s, intro: [...s.intro], rows: s.rows.map((r) => ({ ...r })) })) }
  const findSec = (head) => result.sections.find((s) => s.head === head)
  const locate = (key) => {
    for (const s of result.sections) {
      const i = s.rows.findIndex((r) => r.key === key)
      if (i >= 0) return { s, i }
    }
    return null
  }

  // Intros (text outside rows), keyed by section heading.
  const introOf = (doc, head) => doc.sections.find((s) => s.head === head)?.intro
  for (const o of O.sections) {
    const bi = introOf(B, o.head) ?? []
    const ti = introOf(T, o.head)
    if (o.intro.join('\n') === bi.join('\n')) continue
    if (ti === undefined) {
      if (introOf(B, o.head) !== undefined) continue // theirs dropped the section
      // A section only ours added: append it, rows come below.
      result.sections.push({ head: o.head, intro: [...o.intro], rows: [] })
      continue
    }
    const sec = findSec(o.head)
    sec.intro = ti.join('\n') === bi.join('\n') ? [...o.intro] : unionIntro(bi, o.intro, ti)
  }

  // Rows ours deleted that theirs left as they were.
  const oRows = rowIndex(O)
  for (const [key, b] of bRows) {
    if (oRows.has(key)) continue
    const t = tRows.get(key)
    if (!t || t.text !== b.text || t.head !== b.head) continue
    const at = locate(key)
    if (at) at.s.rows.splice(at.i, 1)
  }

  // Rows ours changed, in ours' order so each can anchor on the one before it.
  for (const o of O.sections) {
    o.rows.forEach((row, idx) => {
      const b = bRows.get(row.key)
      const text = row.lines.join('\n')
      if (b && b.text === text && b.head === o.head) return // ours left it alone
      const t = tRows.get(row.key)
      const theirsChanged = t && b && (t.text !== b.text || t.head !== b.head)
      if (theirsChanged && isClosed(t.lines, t.head) && !isClosed(row.lines, o.head)) return // keep theirs' close
      if (t && t.text === text && t.head === o.head) return // already the same
      const at = locate(row.key)
      if (at && at.s.head === o.head) {
        at.s.rows[at.i] = { key: row.key, lines: [...row.lines] }
        return
      }
      if (at) at.s.rows.splice(at.i, 1)
      let sec = findSec(o.head)
      if (!sec) {
        sec = { head: o.head, intro: [], rows: [] }
        result.sections.push(sec)
      }
      // Place it after the nearest row above it in ours that the result has in
      // this section; else before the nearest row below it; else at the top
      // (ours wrote it first) or the end.
      let pos = -1
      for (let k = idx - 1; k >= 0 && pos < 0; k -= 1) {
        const j = sec.rows.findIndex((r) => r.key === o.rows[k].key)
        if (j >= 0) pos = j + 1
      }
      for (let k = idx + 1; k < o.rows.length && pos < 0; k += 1) {
        const j = sec.rows.findIndex((r) => r.key === o.rows[k].key)
        if (j >= 0) pos = j
      }
      if (pos < 0) pos = idx === 0 ? 0 : sec.rows.length
      sec.rows.splice(pos, 0, { key: row.key, lines: [...row.lines] })
    })
  }
  return renderRows(result)
}

function main(argv) {
  const [basePath, oursPath, theirsPath] = argv
  if (!basePath || !oursPath || !theirsPath) {
    console.error('usage: audit-merge.mjs <base> <ours> <theirs> [<path>]')
    process.exit(2)
  }
  const read = (p) => fs.readFileSync(p, 'utf8')
  fs.writeFileSync(oursPath, mergeAudit(read(basePath), read(oursPath), read(theirsPath)))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main(process.argv.slice(2))
