#!/usr/bin/env node
// scripts/loop-land.mjs — open a loop PR the way Miserere lands work (phase NX1e).
// Zero dependencies.
//
// v2's land step (`skills/next/land.md` §4) opens a pull request from `next/<id>`. Miserere
// lands every change by PR (`skills/march.lanes.md` notes "Landing a change"): the branch is
// `loop/<verb>-<slug>` (`loop/next-<chunk id>` for /next), the PR carries `loop:pr`, one
// `size:*`, at least one `area:*` and any `review:*` that applies, and at most 5 `loop:pr` PRs
// are open at once. That is what `pr-autofix`, `pr-resolve` (both match `loop/*`), the cap and
// the merge job read. This script is that step, so no run spells it by hand:
//
//   node scripts/loop-land.mjs open --verb next --slug 133.5 --size L --area loop [--area ci] \
//     [--review rules-change] --title "<type>: <what now works> (NX1e)" --body-file <f> \
//     [--chunk 133.5] [--over-cap]
//   node scripts/loop-land.mjs cap         # the open loop:pr PRs; exit 3 at the cap
//
// `open` refuses (exit 64) unless HEAD is on the branch the verb and slug name; pushes to an
// open PR for that branch instead of opening a second; stops at the cap (exit 3, "waiting on
// T") unless `--over-cap` (T's word only); pushes (never forced), opens the PR, then hands the
// claim to the PR (`claims.mjs pr <chunk> <n>`, v2's verb; an older claims module without it
// releases the claim instead, since an open PR is the claim).
// A `plot` PR is not opened here (`skills/plot.md` §7.1): it is not a `loop:pr` PR.

import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** The PR cap: open `loop:pr` PRs at once. */
export const CAP = 5
export const SIZES = Object.freeze(['S', 'M', 'L'])
export const AREAS = Object.freeze(['combat', 'cards', 'ui', 'mobile', 'ci', 'loop'])
export const REVIEWS = Object.freeze(['rules-change', 'plan-only', 'needs-T'])
/** Labels the merge job never merges on: T does (`scripts/pr-policy.mjs`). */
export const T_MERGES = Object.freeze(['review:rules-change', 'review:needs-T', 'plot', 'nexus-sync'])

/** `loop/<verb>-<slug>`, the branch every loop PR comes from. */
export function branchFor(verb, slug) {
  if (!/^[a-z][a-z-]*$/.test(verb ?? '')) throw new Error(`land: verb "${verb}" is not a loop verb`)
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug ?? '') || slug.includes('..')) throw new Error(`land: slug "${slug}" is not a branch slug`)
  return `loop/${verb}-${slug}`
}

/** The PR's labels: `loop:pr`, one size, one area or more, any review labels. */
export function labelsFor({ size, areas = [], reviews = [] }) {
  if (!SIZES.includes(size)) throw new Error(`land: size "${size}" is not one of ${SIZES.join(', ')}`)
  if (!areas.length) throw new Error('land: at least one --area')
  for (const a of areas) if (!AREAS.includes(a)) throw new Error(`land: area "${a}" is not one of ${AREAS.join(', ')}`)
  for (const r of reviews) if (!REVIEWS.includes(r)) throw new Error(`land: review "${r}" is not one of ${REVIEWS.join(', ')}`)
  return ['loop:pr', `size:${size}`, ...[...new Set(areas)].map((a) => `area:${a}`), ...[...new Set(reviews)].map((r) => `review:${r}`)]
}

/**
 * The cap as `gh pr list --state open --json number,labels,headRefName` reads: every open PR
 * labelled `loop:pr` counts, whatever its branch (`loop/next-*` as `loop/ship-*`).
 */
export function capState(prs, cap = CAP) {
  const counted = (prs ?? []).filter((p) => (p.labels ?? []).some((l) => (l.name ?? l) === 'loop:pr'))
  return { count: counted.length, atCap: counted.length >= cap, numbers: counted.map((p) => p.number) }
}

/** Whether T merges this PR rather than the merge job. */
export const waitsForT = (labels) => labels.some((l) => T_MERGES.includes(l))

const PR_URL = /\/pull\/(\d+)/

/**
 * Open (or push to) the PR for HEAD's branch.
 * @param {{ verb: string, slug: string, size: string, areas: string[], reviews?: string[], title: string, bodyFile: string, chunk?: string, owner?: string, overCap?: boolean, base?: string }} o
 * @param {{ git: (args: string[]) => string, gh: (args: string[]) => string, claims?: (args: string[]) => void, log?: (s: string) => void }} io
 * @returns {{ state: 'opened' | 'pushed' | 'capped', branch: string, labels: string[], number?: number, numbers?: number[] }}
 */
export function land(o, { git, gh, claims = () => {}, log = () => {} }) {
  const branch = branchFor(o.verb, o.slug)
  const labels = labelsFor({ size: o.size, areas: o.areas, reviews: o.reviews ?? [] })
  if (!o.title || !o.bodyFile) throw new Error('land: --title and --body-file are required')
  const head = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim()
  if (head !== branch) throw new Error(`land: HEAD is on ${head}; the PR comes from ${branch} (cut it from origin/${o.base ?? 'main'} before the first edit)`)
  const open = JSON.parse(gh(['pr', 'list', '--head', branch, '--state', 'open', '--json', 'number']) || '[]')
  if (open.length) {
    git(['push', 'origin', branch])
    log(`land: pushed to #${open[0].number} (${branch}); one PR per branch`)
    return { state: 'pushed', branch, labels, number: open[0].number }
  }
  const cap = capState(JSON.parse(gh(['pr', 'list', '--state', 'open', '--label', 'loop:pr', '--json', 'number,labels,headRefName', '--limit', '100']) || '[]'))
  if (cap.atCap && !o.overCap) {
    log(`land: waiting on T: PRs ${cap.numbers.map((n) => `#${n}`).join(', ')} (${cap.count} open, the cap is ${CAP})`)
    return { state: 'capped', branch, labels, numbers: cap.numbers }
  }
  git(['push', '-u', 'origin', branch])
  const url = gh(['pr', 'create', '--base', o.base ?? 'main', '--head', branch, ...labels.flatMap((l) => ['--label', l]), '--title', o.title, '--body-file', o.bodyFile])
  const number = Number(PR_URL.exec(url)?.[1])
  if (!number) throw new Error(`land: gh pr create printed no PR URL: ${url.trim().slice(0, 200)}`)
  log(`land: opened #${number} from ${branch} [${labels.join(', ')}]${waitsForT(labels) ? '; T merges it' : '; the review merges it'}`)
  if (o.chunk) {
    try {
      claims(['pr', o.chunk, String(number)])
    } catch {
      try {
        claims(['release', o.chunk, ...(o.owner ? ['--owner', o.owner] : [])])
      } catch {
        log(`land: the claim on ${o.chunk} was not handed over; it lapses at its TTL`)
      }
    }
  }
  return { state: 'opened', branch, labels, number }
}

function parseArgs(argv) {
  const o = { areas: [], reviews: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const v = () => argv[++i]
    if (a === '--verb') o.verb = v()
    else if (a === '--slug') o.slug = v()
    else if (a === '--size') o.size = v()
    else if (a === '--area') o.areas.push(v())
    else if (a === '--review') o.reviews.push(v())
    else if (a === '--title') o.title = v()
    else if (a === '--body-file') o.bodyFile = v()
    else if (a === '--chunk') o.chunk = v()
    else if (a === '--base') o.base = v()
    else if (a === '--over-cap') o.overCap = true
    else throw new Error(`land: unknown argument ${a}`)
  }
  return o
}

function cli() {
  const [mode, ...rest] = process.argv.slice(2)
  const run = (cmd) => (args) => execFileSync(cmd, args, { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
  const gh = run('gh')
  if (mode === 'cap') {
    const cap = capState(JSON.parse(gh(['pr', 'list', '--state', 'open', '--label', 'loop:pr', '--json', 'number,labels,headRefName', '--limit', '100']) || '[]'))
    console.log(`${cap.count} open loop:pr PR(s)${cap.numbers.length ? `: ${cap.numbers.map((n) => `#${n}`).join(', ')}` : ''}; the cap is ${CAP}${cap.atCap ? ' (reached)' : ''}`)
    process.exitCode = cap.atCap ? 3 : 0
    return
  }
  if (mode !== 'open') {
    console.error('usage: loop-land.mjs open --verb <v> --slug <s> --size S|M|L --area <a> [--area <a>] [--review <r>] --title <t> --body-file <f> [--chunk <id>] [--over-cap] | cap')
    process.exitCode = 64
    return
  }
  try {
    const claims = (args) => execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'claims.mjs'), ...args], { stdio: 'inherit' })
    const r = land({ ...parseArgs(rest), owner: process.env.CLAIM_OWNER }, { git: run('git'), gh, claims, log: console.log })
    process.exitCode = r.state === 'capped' ? 3 : 0
  } catch (err) {
    console.error(String(err?.message ?? err))
    process.exitCode = 64
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli()
