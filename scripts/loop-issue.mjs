#!/usr/bin/env node
// scripts/loop-issue.mjs
//
// "Loop issue mirror" — opens / closes GitHub issues that mirror
// the autonomous loop's work. Two flavors:
//
//   1) /iterate findings (one issue per finding — "open" + "close-comment")
//      close-comment posts the deploy comment AND closes the issue via
//      the API, idempotently. The load-bearing close is flavor 3 below,
//      which reads the shipping commit's `Closes #N` trailer.
//
//   2) Phases (one issue per phase, find-or-create-or-reopen — "phase-open"
//      + "phase-close"). Idempotent across ticks: if an issue with the
//      phase title already exists open, reuse it; if closed, reopen and
//      log a "phase work resumed" comment; if none, create.
//
//   3) The closing-trailer sweep ("close-trailers") — the load-bearing
//      auto-close for BOTH flavors since Phase 48. Runs on every push to
//      `main` from .github/workflows/close-trailers.yml, scans every
//      commit in the pushed range, and closes what the commit prose says
//      it closes. Neither GitHub's native parser (inert here) nor an
//      agent reaching Step 7 of skills/iterate.md (skipped whenever a
//      loop turn ends before CI goes green) can be relied on. See the
//      "closing-trailer sweep (Phase 48)" block below for the evidence.
//
//   4) The deploy-comment sweep ("deploy-comment") — the load-bearing
//      deploy-URL comment since Phase 91. `close-trailers` fixed the
//      close, but the deploy-URL comment (`close-comment` / `phase-close`,
//      below) is still only posted by the SAME agent tick that authored
//      the commit, gated behind that tick's own `deploy:check` finishing
//      green before its container dies — exactly the failure shape
//      Phase 48 fixed for the close. `deploy-comment` runs once, for one
//      commit, only once CI has actually concluded green for it (driven by
//      .github/workflows/deploy-comment.yml on the gated verify-*
//      workflows' own `completed` event, not on any agent tick's
//      lifetime), and posts the comment `close-comment`/`phase-close`
//      would have posted. Idempotent (comment embeds the commit SHA) and
//      self-healing (a fire while a sibling verify-* run is still pending
//      no-ops; that sibling's own completion fires this again).
//
// Subcommands:
//
//   open --severity <high|med|low>
//        --category <bug|enhancement|content|data|docs|seo|a11y|perf>
//        --source <user|reader|audit|external>
//        --title "<title>"
//        --body-file <path>
//
//     Creates a new issue. Echoes the issue number on stdout (just
//     the number; clean for shell capture). Exits 0 on success, 1
//     on failure (caller falls back to "no issue, just ship" — the
//     mirror is best-effort).
//
//   close-comment --number <N>
//                 --commit <sha>
//                 --deploy-url <url>
//
//     Posts a follow-up comment confirming the deploy AND actively
//     closes the issue via the API (state=closed, state_reason=
//     completed). The `Closes #N` commit trailer proved unreliable —
//     13 confirmed instances (2026-07-13 through 2026-08-03, see
//     plan/AUDIT.md finding "[2.4] Phase-mirror issue close is
//     unreliable") of a present, correctly-numbered trailer on a
//     green, direct-to-main commit silently failing to auto-close.
//     Mirrors the fix already applied to phase mirrors below
//     (cmdPhaseClose). Idempotent; failures are warnings, not
//     blockers — the fix has already shipped.
//
//   phase-open --phase <id>
//              --title "<title>"
//              --body-file <path>
//
//     Find-or-create-or-reopen the phase mirror. Idempotent:
//       * existing open issue with matching title prefix → reuse,
//       * latest closed issue with matching title prefix → reopen,
//                                                          comment,
//       * none → create.
//     Echoes the issue number on stdout. Best-effort on failure
//     (exit 1, caller continues).
//
//   phase-close --phase <id>
//               --commit <sha>
//               --deploy-url <url>
//
//     Posts a "phase shipped" comment AND actively closes the mirror via
//     the API (state=closed, state_reason=completed). GitHub's native
//     `Closes #N` parser is inert here (nine mirrors leaked before the
//     2026-07-14 triage); the load-bearing close is the `close-trailers`
//     sweep, which reads the commit's trailer on every push to `main`.
//     Idempotent (an already-closed mirror is a no-op). Best-effort.
//
//   deploy-comment --sha <sha>
//                  --deploy-url <url>
//
//     For the ONE commit at <sha>: finds every issue its message closes
//     (same trailer parser as close-trailers) and posts the deploy-URL
//     comment on each, unless a comment naming this exact SHA is already
//     there. Never closes anything — close-trailers already owns that,
//     independently. Meant to be invoked by
//     .github/workflows/deploy-comment.yml, AFTER re-confirming (via
//     scripts/deploy-check.mjs, checked out at <sha>) that every gated
//     verify-* workflow for that commit has actually concluded success —
//     this command itself does not re-check the deploy gate, it trusts the
//     caller already did.
//
// Required env (from .env or shell):
//   GH_TOKEN    repo-scoped PAT
//   GH_REPO     owner/repo, e.g. no-trbl-2-u/Miserere-mei-deus
//
// Reads .env using a simple loader; matches the shape used by
// scripts/deploy-check.mjs and skills/triage.md.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// --- load .env if present (Node has no built-in .env loader) ---
if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

const VALID_SEVERITY = new Set(['high', 'med', 'low'])
const VALID_SOURCE = new Set(['user', 'reader', 'audit', 'external'])
const VALID_CATEGORY = new Set([
  'bug',
  'enhancement',
  'content',
  'data',
  'docs',
  'seo',
  'a11y',
  'perf',
])

// Label palette (color hexes — GitHub takes hex without `#`).
// Created idempotently on first encounter via `gh label create`.
const LABEL_PALETTE = {
  'loop:opened': { color: '5319e7', description: 'Opened by the autonomous loop' },
  'loop:phase': { color: '0e8a16', description: 'Phase mirror — opens at phase start, closes on ship' },
  'severity:high': { color: 'b60205', description: 'High severity finding' },
  'severity:med': { color: 'fbca04', description: 'Medium severity finding' },
  'severity:low': { color: 'c5def5', description: 'Low severity finding' },
  'source:user': { color: '0e8a16', description: 'Originated from /jot' },
  'source:reader': { color: '1d76db', description: 'Originated from /critique reader' },
  'source:audit': { color: '5319e7', description: 'Originated from /iterate audit' },
  'source:external': { color: 'd93f0b', description: 'Routed in by /triage from a user-filed issue' },
  bug: { color: 'd73a4a', description: '' },
  enhancement: { color: 'a2eeef', description: '' },
  content: { color: '0075ca', description: '' },
  data: { color: '7057ff', description: '' },
  docs: { color: '0052cc', description: '' },
  seo: { color: 'bfdadc', description: '' },
  a11y: { color: '5319e7', description: '' },
  perf: { color: 'e99695', description: '' },
}

// --- argv parsing -----------------------------------------------------

function parseArgs(argv) {
  const flags = {}
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true'
      flags[key] = val
      i += val === 'true' ? 1 : 2
    } else {
      i += 1
    }
  }
  return flags
}

// --- gh wrappers (extracted so tests can mock them) -------------------

function ghCall(args, opts = {}) {
  const r = spawnSync('gh', args, { encoding: 'utf-8', ...opts })
  return { status: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
}

function ensureLabel(name, repo) {
  const palette = LABEL_PALETTE[name] ?? { color: 'cccccc', description: '' }
  const r = spawnSync(
    'gh',
    [
      'label',
      'create',
      name,
      '--repo',
      repo,
      '--color',
      palette.color,
      '--description',
      palette.description ?? '',
    ],
    { encoding: 'utf-8' },
  )
  if (r.status === 0) return { created: true }
  // gh exits non-zero when the label already exists; that's the dominant
  // case after the first run. Swallow only that specific error.
  const out = (r.stderr ?? '') + (r.stdout ?? '')
  if (/already exists/i.test(out)) return { created: false }
  return { created: false, error: out.trim() || `gh label create exited ${r.status}` }
}

function parseIssueNumber(stdout) {
  // gh issue create prints the URL as its last line, e.g.
  //   https://github.com/owner/repo/issues/42
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/\/issues\/(\d+)\s*$/)
    if (m) return Number(m[1])
  }
  return null
}

// Build the phase title prefix used to find-or-create the phase mirror.
// Using prefix-match keeps `/triage` from rewriting titles and breaking
// the lookup; rename the issue body, not the title prefix.
export function phaseTitlePrefix(phaseId) {
  return `Phase ${phaseId} — `
}

function isPhaseMatch(title, phaseId) {
  // Require `Phase <id> — ` *as a prefix*, anchored, so `Phase 16` does
  // not collide with `Phase 16a`.
  return title.startsWith(phaseTitlePrefix(phaseId))
}

// Search GitHub for any issue (open or closed) whose title prefix
// matches the phase id. Returns { number, state } | null.
//
// We deliberately do NOT use `--search "<prefix>" in:title` here:
// GitHub's text-search index is eventually-consistent, so a phase
// issue created seconds ago may not surface in a follow-up search
// for several minutes. The `--label loop:phase` filter goes through
// the issues REST API, which is read-your-writes consistent — every
// issue tagged with that label appears immediately. We pull all
// loop:phase issues (both states) and prefix-match the title
// client-side, which makes find-or-reuse robust across rapid
// successive ticks.
function findPhaseIssue(phaseId, repo) {
  const r = ghCall([
    'issue',
    'list',
    '--repo',
    repo,
    '--state',
    'all',
    '--label',
    'loop:phase',
    '--json',
    'number,title,state',
    '--limit',
    '200',
  ])
  if (r.status !== 0) {
    return { error: r.stderr.trim() || `gh issue list exited ${r.status}` }
  }
  let arr
  try {
    arr = JSON.parse(r.stdout || '[]')
  } catch (e) {
    return { error: `gh issue list returned non-JSON: ${e.message}` }
  }
  const matches = arr.filter((row) => isPhaseMatch(row.title ?? '', phaseId))
  if (matches.length === 0) return null
  // Prefer an OPEN match; fall back to the most-recent CLOSED. gh
  // returns issues newest-first, so matches[0] is already the most
  // recent for the all-closed case.
  const open = matches.find((row) => String(row.state).toUpperCase() === 'OPEN')
  if (open) return { number: open.number, state: 'OPEN' }
  return { number: matches[0].number, state: 'CLOSED' }
}

// Close an issue via the API (state=closed, state_reason=completed). This is
// the LOAD-BEARING close for both phase mirrors and /iterate finding mirrors:
// the `Closes #N` commit trailer is unreliable (see callers for the specific
// evidence each has accumulated) and cannot be trusted alone. Idempotent — an
// already-closed issue is treated as success (gh prints "already closed" and
// exits non-zero on some versions; swallow only that case, mirroring
// `ensureLabel`).
function closeIssue(number, repo) {
  const r = ghCall(['issue', 'close', String(number), '--repo', repo, '--reason', 'completed'])
  if (r.status === 0) return { closed: true }
  const out = `${r.stderr ?? ''}${r.stdout ?? ''}`
  if (/already closed|is closed/i.test(out)) return { closed: false }
  return { closed: false, error: out.trim() || `gh issue close exited ${r.status}` }
}

// --- closing-trailer sweep (Phase 48) ---------------------------------
//
// ROOT CAUSE, 2026-08-08. The 2026-08-03 fix (`0441c554`, issue #166) was
// correct but incomplete, and the "resolved" claim rested on no witness.
// What the #174-vs-#175 comparison actually proves:
//
//   * #175 closed at 19:44:48Z, 7m47s after `1004894` landed on `main`.
//     Its only comment is `buildCloseCommentBody()` verbatim — so the
//     closer was OUR `close-comment` API call, not GitHub's parser. The
//     native parser had a full 7 minutes on the default branch and did
//     nothing.
//   * #174 has NO loop comment at all. `close-comment` was never invoked
//     for it. The march run that shipped `615ff26b` (31184116798) ended
//     with `result: "Waiting on CI — will resume once the verify-mobile
//     run for commit 615ff26b finishes."` — the agent's turn ended while
//     CI was still amber, and nothing resumes: the container dies and the
//     next tick re-audits from scratch. #174 sat open 11 hours until a
//     human closed it by hand during /oversight.
//
// So the bullet prefix is not the cause, the push shape is not the cause,
// and batched-push tip-only scanning is not the cause (both commits were
// the tip of their own single-commit push, seconds apart from a follow-up
// plan-only push). The cause is that the ONLY working close path was a
// best-effort prose step in `skills/iterate.md` Step 7, gated behind
// `npm run deploy:check` going green — and an agent turn that ends before
// CI concludes skips it silently, forever. The `Closes #N` trailer that
// the docs then called a "belt-and-suspenders backup" has never been observed
// closing anything in this repo; WHY GitHub's parser stays inert here
// could not be determined, which is exactly why nothing may depend on it.
//
// The fix: make this script the single explicit authority. `close-trailers`
// scans EVERY commit in a pushed range (not just the tip), parses the
// closing keywords out of prose (fences, quoted bodies and inline code
// spans excluded), and closes each referenced issue via the API,
// idempotently. `.github/workflows/close-trailers.yml` runs it on every
// push to `main`, so the close no longer depends on an agent surviving
// long enough to reach Step 7.

// GitHub's documented closing keywords, in every accepted inflection.
const CLOSE_KEYWORD_SRC = 'close[sd]?|fix(?:e[sd])?|resolve[sd]?'

// `Closes #12` · `- Fixes #12` · `Resolved: GH-12` · `Closes owner/repo#12`.
const CLOSE_REF_SRC =
  String.raw`\b(?:${CLOSE_KEYWORD_SRC})\b\s*:?\s+` +
  String.raw`(?:(?<owner>[A-Za-z0-9_.-]+)\/(?<repo>[A-Za-z0-9_.-]+))?(?:#|GH-)(?<number>\d+)\b`

// Drop everything that is quoted or code from a commit message, so a
// trailer that only *appears* in a message (a doc example, a quoted prior
// comment, `Closes #N` inside a fenced block) never closes a live issue.
// Fenced blocks (``` and ~~~), quote lines (`>`), and inline code spans.
export function stripNonProse(message) {
  const kept = []
  let fence = null
  for (const line of String(message ?? '').split(/\r?\n/)) {
    const open = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (open) {
      const marker = open[1][0]
      if (fence === null) fence = marker
      else if (fence === marker) fence = null
      continue
    }
    if (fence !== null) continue
    if (/^\s*>/.test(line)) continue
    kept.push(line.replace(/`[^`\n]*`/g, ' '))
  }
  return kept.join('\n')
}

// Parse the issue numbers a single commit message closes, in order, deduped.
// A qualified `owner/repo#N` reference only counts when it names `repo`.
export function parseCloseTrailers(message, { repo } = {}) {
  const [wantOwner = '', wantRepo = ''] = String(repo ?? '').split('/')
  const re = new RegExp(CLOSE_REF_SRC, 'gi')
  const seen = new Set()
  const out = []
  for (const m of stripNonProse(message).matchAll(re)) {
    const g = m.groups ?? {}
    if (g.owner) {
      if (!wantOwner) continue
      if (g.owner.toLowerCase() !== wantOwner.toLowerCase()) continue
      if (g.repo.toLowerCase() !== wantRepo.toLowerCase()) continue
    }
    const n = Number(g.number)
    if (!Number.isInteger(n) || n <= 0 || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

// Fold a pushed RANGE of commits into one close list. Every commit is
// scanned, not just the tip — the batched-push suspect from the phase
// brief is closed off by construction. First commit to reference an issue
// owns the attribution.
export function collectCloseTargets(commits, { repo } = {}) {
  const seen = new Map()
  for (const c of commits ?? []) {
    for (const number of parseCloseTrailers(c?.message, { repo })) {
      if (seen.has(number)) continue
      seen.set(number, { number, sha: c?.sha ?? null, subject: subjectOf(c?.message) })
    }
  }
  return [...seen.values()]
}

function subjectOf(message) {
  return String(message ?? '').split(/\r?\n/)[0]?.trim() ?? ''
}

// Parse `git log --format=%H%x1e%B%x1f` output into { sha, message } records.
export function parseGitLogRecords(stdout) {
  return String(stdout ?? '')
    .split('\x1f')
    .map((rec) => rec.replace(/^[\r\n]+/, ''))
    .filter((rec) => rec.trim().length > 0)
    .map((rec) => {
      const i = rec.indexOf('\x1e')
      if (i === -1) return null
      return { sha: rec.slice(0, i).trim(), message: rec.slice(i + 1).replace(/[\r\n]+$/, '') }
    })
    .filter(Boolean)
}

const ZERO_SHA = /^0{7,40}$/

// Resolve a push range into commits. A missing/zero base (branch creation,
// force-push, unavailable history) degrades to the head commit alone rather
// than failing the sweep.
export function resolveRangeArgs({ range, sha }) {
  if (range && range.includes('..')) {
    const [base, head] = range.split('..')
    if (base && !ZERO_SHA.test(base) && head) return ['log', '--format=%H%x1e%B%x1f', `${base}..${head}`]
    if (head) return ['log', '-1', '--format=%H%x1e%B%x1f', head]
  }
  const target = sha || range || 'HEAD'
  return ['log', '-1', '--format=%H%x1e%B%x1f', target]
}

function readCommits(args) {
  const r = spawnSync('git', args, { encoding: 'utf-8' })
  if ((r.status ?? 1) !== 0) return { error: (r.stderr ?? '').trim() || `git ${args[0]} exited ${r.status}` }
  return { commits: parseGitLogRecords(r.stdout ?? '') }
}

export function buildTrailerCloseCommentBody({ number, sha, subject }) {
  return [
    `Closed by \`${String(sha ?? '').slice(0, 8)}\`${subject ? ` ("${subject}")` : ''}, whose commit message closes #${number}.`,
    '',
    "_Closed by `scripts/loop-issue.mjs close-trailers` — the repo's own closing-trailer sweep, which runs on every push to `main`. GitHub's native `Closes #N` parser is inert here; this sweep is the authority._",
  ].join('\n')
}

// The gh-backed IO the sweep drives. Split out so tests can inject a fake
// and stay hermetic — no network, no gh, no TTY.
export function defaultSweepIo(repo) {
  return {
    getIssueState(number) {
      const r = ghCall(['issue', 'view', String(number), '--repo', repo, '--json', 'state'])
      if (r.status !== 0) {
        const out = `${r.stderr ?? ''}${r.stdout ?? ''}`
        // A number that is a PR, or simply does not exist, is not an error:
        // commit prose references those all the time.
        if (/could not resolve|not found|no issue found/i.test(out)) return { state: 'MISSING' }
        return { error: out.trim() || `gh issue view exited ${r.status}` }
      }
      try {
        return { state: String(JSON.parse(r.stdout || '{}').state ?? '').toUpperCase() }
      } catch (e) {
        return { error: `gh issue view returned non-JSON: ${e.message}` }
      }
    },
    closeIssue: (number) => closeIssue(number, repo),
    comment(number, body) {
      const r = ghCall(['issue', 'comment', String(number), '--repo', repo, '--body', body])
      if (r.status === 0) return { ok: true }
      return { error: (`${r.stderr ?? ''}${r.stdout ?? ''}`).trim() || `gh issue comment exited ${r.status}` }
    },
  }
}

// Idempotent close sweep. Pure over `io` — an already-closed issue is a
// no-op, not an error; a missing issue is a no-op; only a real API failure
// lands in `errors` (and only `errors` makes the CLI exit non-zero).
export function sweepCloseTrailers({ commits, repo, io, dryRun = false }) {
  const targets = collectCloseTargets(commits, { repo })
  const closed = []
  const noop = []
  const errors = []
  const warnings = []
  for (const t of targets) {
    // Dry-run is fully offline on purpose: it reports what a real sweep
    // would touch without making a single API call.
    if (dryRun) {
      noop.push({ ...t, reason: 'dry-run' })
      continue
    }
    const state = io.getIssueState(t.number) ?? {}
    if (state.error) {
      errors.push({ ...t, error: state.error })
      continue
    }
    if (state.state === 'CLOSED') {
      noop.push({ ...t, reason: 'already-closed' })
      continue
    }
    if (state.state === 'MISSING') {
      noop.push({ ...t, reason: 'not-found' })
      continue
    }
    const res = io.closeIssue(t.number) ?? {}
    if (res.error) {
      errors.push({ ...t, error: res.error })
      continue
    }
    closed.push(t)
    if (io.comment) {
      const c = io.comment(t.number, buildTrailerCloseCommentBody(t)) ?? {}
      // The comment is a courtesy; the close is the point.
      if (c.error) warnings.push({ ...t, error: c.error, phase: 'comment' })
    }
  }
  return { targets, closed, noop, errors, warnings }
}

// --- deploy-comment sweep (Phase 91) -----------------------------------
//
// close-trailers (above) closes issues on the push itself. It does NOT
// post the deploy-URL comment — that comment can only be honest once CI
// has actually concluded for the commit, which is minutes AFTER the push,
// well past the point close-trailers already ran. The only thing that
// used to post it was the authoring agent tick's own `close-comment` /
// `phase-close` call, gated behind that SAME tick's `deploy:check` going
// green before the tick's container dies (skills/iterate.md Step 7,
// skills/ship-a-phase.md Step 12.5) — the exact failure shape Phase 48
// fixed for the close. `deploy-comment` (wired to
// .github/workflows/deploy-comment.yml, triggered by the gated verify-*
// workflows' own `completed` event) posts it instead, once, independent
// of any agent tick's lifetime.

export function buildDeployCommentBody({ sha, deployUrl }) {
  return [
    `Shipped in \`${sha}\`, and CI is now green.`,
    '',
    `Live at ${deployUrl} after deploy ready (~3–5 min).`,
    '',
    '_Posted by `scripts/loop-issue.mjs deploy-comment`, which runs once the ' +
      "gated verify-* workflows conclude for this commit — independent of " +
      'whether the agent tick that authored it was still running (Phase 91). ' +
      'The issue itself was already closed by `close-trailers` on push._',
  ].join('\n')
}

// The gh-backed IO the deploy-comment sweep drives. Mirrors `defaultSweepIo`'s
// split-for-testing shape.
export function defaultDeploySweepIo(repo) {
  return {
    hasDeployComment(number, sha) {
      const r = ghCall(['issue', 'view', String(number), '--repo', repo, '--json', 'comments'])
      if (r.status !== 0) {
        const out = `${r.stderr ?? ''}${r.stdout ?? ''}`
        if (/could not resolve|not found|no issue found/i.test(out)) return { found: false, missing: true }
        return { error: out.trim() || `gh issue view exited ${r.status}` }
      }
      try {
        const data = JSON.parse(r.stdout || '{}')
        const marker = `Shipped in \`${sha}\``
        const found = (data.comments ?? []).some((c) => String(c.body ?? '').includes(marker))
        return { found }
      } catch (e) {
        return { error: `gh issue view returned non-JSON: ${e.message}` }
      }
    },
    comment(number, body) {
      const r = ghCall(['issue', 'comment', String(number), '--repo', repo, '--body', body])
      if (r.status === 0) return { ok: true }
      return { error: (`${r.stderr ?? ''}${r.stdout ?? ''}`).trim() || `gh issue comment exited ${r.status}` }
    },
  }
}

// Idempotent deploy-comment sweep over the ONE commit at `sha`. Pure over
// `io` — a comment already bearing this SHA's marker is a no-op, not an
// error; only a real API failure lands in `errors`.
export function sweepDeployComments({ commits, repo, io, deployUrl, dryRun = false }) {
  const targets = collectCloseTargets(commits, { repo })
  const commented = []
  const noop = []
  const errors = []
  for (const t of targets) {
    if (dryRun) {
      noop.push({ ...t, reason: 'dry-run' })
      continue
    }
    const has = io.hasDeployComment(t.number, t.sha) ?? {}
    if (has.error) {
      errors.push({ ...t, error: has.error })
      continue
    }
    if (has.missing) {
      noop.push({ ...t, reason: 'not-found' })
      continue
    }
    if (has.found) {
      noop.push({ ...t, reason: 'already-commented' })
      continue
    }
    const res = io.comment(t.number, buildDeployCommentBody({ sha: t.sha, deployUrl })) ?? {}
    if (res.error) {
      errors.push({ ...t, error: res.error })
      continue
    }
    commented.push(t)
  }
  return { targets, commented, noop, errors }
}

// --- subcommands ------------------------------------------------------

function cmdCloseTrailers(flags) {
  const repo = process.env.GH_REPO
  const dryRun = flags['dry-run'] === 'true' || flags['dry-run'] === true

  if (!repo) {
    process.stderr.write('loop-issue: GH_REPO missing (set in .env)\n')
    process.exit(1)
  }
  if (!dryRun && !process.env.GH_TOKEN) {
    process.stderr.write('loop-issue: GH_TOKEN missing from env (.env not loaded?)\n')
    process.exit(1)
  }

  const read = readCommits(resolveRangeArgs({ range: flags.range, sha: flags.sha }))
  if (read.error) {
    process.stderr.write(`loop-issue: could not read the commit range: ${read.error}\n`)
    process.exit(1)
  }

  const result = sweepCloseTrailers({
    commits: read.commits,
    repo,
    io: defaultSweepIo(repo),
    dryRun,
  })

  process.stdout.write(
    `loop-issue: scanned ${read.commits.length} commit(s), ${result.targets.length} closing reference(s)\n`,
  )
  for (const t of result.closed) process.stdout.write(`  closed #${t.number} (${String(t.sha).slice(0, 8)})\n`)
  for (const t of result.noop) process.stdout.write(`  skipped #${t.number} (${t.reason})\n`)
  for (const w of result.warnings) process.stderr.write(`  warn #${w.number}: ${w.phase} failed: ${w.error}\n`)
  for (const e of result.errors) process.stderr.write(`  ERROR #${e.number}: ${e.error}\n`)

  // A close that failed is the exact bug this phase exists to stop hiding.
  if (result.errors.length > 0) process.exit(1)
}

function cmdDeployComment(flags) {
  const repo = process.env.GH_REPO
  const sha = flags.sha
  const deployUrl = flags['deploy-url']
  const dryRun = flags['dry-run'] === 'true' || flags['dry-run'] === true

  if (!repo) {
    process.stderr.write('loop-issue: GH_REPO missing (set in .env)\n')
    process.exit(1)
  }
  if (!sha || !deployUrl) {
    process.stderr.write('loop-issue: --sha and --deploy-url are required\n')
    process.exit(1)
  }
  if (!dryRun && !process.env.GH_TOKEN) {
    process.stderr.write('loop-issue: GH_TOKEN missing from env (.env not loaded?)\n')
    process.exit(1)
  }

  const read = readCommits(['log', '-1', '--format=%H%x1e%B%x1f', sha])
  if (read.error) {
    process.stderr.write(`loop-issue: could not read commit ${sha}: ${read.error}\n`)
    process.exit(1)
  }

  const result = sweepDeployComments({
    commits: read.commits,
    repo,
    io: defaultDeploySweepIo(repo),
    deployUrl,
    dryRun,
  })

  process.stdout.write(
    `loop-issue: commit ${sha}, ${result.targets.length} closing reference(s)\n`,
  )
  for (const t of result.commented) process.stdout.write(`  commented #${t.number}\n`)
  for (const t of result.noop) process.stdout.write(`  skipped #${t.number} (${t.reason})\n`)
  for (const e of result.errors) process.stderr.write(`  ERROR #${e.number}: ${e.error}\n`)

  if (result.errors.length > 0) process.exit(1)
}

function cmdOpen(flags) {
  const { severity, category, source, title } = flags
  const bodyFile = flags['body-file']
  const repo = process.env.GH_REPO

  if (!process.env.GH_TOKEN) {
    process.stderr.write('loop-issue: GH_TOKEN missing from env (.env not loaded?)\n')
    process.exit(1)
  }
  if (!repo) {
    process.stderr.write('loop-issue: GH_REPO missing (set in .env)\n')
    process.exit(1)
  }
  if (!VALID_SEVERITY.has(severity)) {
    process.stderr.write(`loop-issue: --severity must be one of ${[...VALID_SEVERITY].join('|')}\n`)
    process.exit(1)
  }
  if (!VALID_CATEGORY.has(category)) {
    process.stderr.write(`loop-issue: --category must be one of ${[...VALID_CATEGORY].join('|')}\n`)
    process.exit(1)
  }
  if (!VALID_SOURCE.has(source)) {
    process.stderr.write(`loop-issue: --source must be one of ${[...VALID_SOURCE].join('|')}\n`)
    process.exit(1)
  }
  if (!title || !bodyFile) {
    process.stderr.write('loop-issue: --title and --body-file are required\n')
    process.exit(1)
  }
  if (!fs.existsSync(bodyFile)) {
    process.stderr.write(`loop-issue: body file not found: ${bodyFile}\n`)
    process.exit(1)
  }

  const labels = [
    'loop:opened',
    `severity:${severity}`,
    `source:${source}`,
    category,
  ]

  // Ensure all labels exist (idempotent).
  for (const name of labels) {
    const r = ensureLabel(name, repo)
    if (r.error) {
      process.stderr.write(`loop-issue: label ensure failed for ${name}: ${r.error}\n`)
      process.exit(1)
    }
  }

  // Create the issue.
  const r = ghCall([
    'issue',
    'create',
    '--repo',
    repo,
    '--title',
    title,
    '--body-file',
    path.resolve(bodyFile),
    '--label',
    labels.join(','),
  ])
  if (r.status !== 0) {
    process.stderr.write(`loop-issue: gh issue create failed (${r.status})\n${r.stderr}\n`)
    process.exit(1)
  }
  const number = parseIssueNumber(r.stdout)
  if (!number) {
    process.stderr.write(`loop-issue: could not parse issue number from gh stdout:\n${r.stdout}\n`)
    process.exit(1)
  }
  process.stdout.write(`${number}\n`)
}

function cmdCloseComment(flags) {
  const number = flags.number
  const commit = flags.commit
  const deployUrl = flags['deploy-url']
  const repo = process.env.GH_REPO

  if (!process.env.GH_TOKEN || !repo) {
    process.stderr.write('loop-issue: GH_TOKEN/GH_REPO missing — skipping comment\n')
    return // best-effort: do not exit non-zero
  }
  if (!number || !commit || !deployUrl) {
    process.stderr.write('loop-issue: --number, --commit, --deploy-url required\n')
    return
  }

  const body = buildCloseCommentBody({ commit, deployUrl })
  const r = ghCall(['issue', 'comment', String(number), '--repo', repo, '--body', body])
  if (r.status !== 0) {
    process.stderr.write(`loop-issue: comment failed for #${number} (status ${r.status})\n${r.stderr}\n`)
    // fall through — still attempt the close below; the comment is a
    // courtesy, the close is the point.
  }

  // Actively close via the API rather than trusting the `Closes #N` commit
  // trailer — see the close-comment doc comment above for the evidence.
  const close = closeIssue(number, repo)
  if (close.error) {
    process.stderr.write(`loop-issue: close failed for #${number}: ${close.error}\n`)
    // best-effort: do not exit non-zero
  }
}

export function buildCloseCommentBody({ commit, deployUrl }) {
  return [
    `Shipped in ${commit}.`,
    '',
    `Live at ${deployUrl} after deploy ready (~3–5 min).`,
    '',
    '_Closed by the autonomous loop via the GitHub API (reliable regardless of push route); the `close-trailers` sweep also closes it from the commit\'s `Closes #N` trailer._',
  ].join('\n')
}

function cmdPhaseOpen(flags) {
  const phaseId = flags.phase
  const title = flags.title
  const bodyFile = flags['body-file']
  const repo = process.env.GH_REPO

  if (!process.env.GH_TOKEN) {
    process.stderr.write('loop-issue: GH_TOKEN missing from env (.env not loaded?)\n')
    process.exit(1)
  }
  if (!repo) {
    process.stderr.write('loop-issue: GH_REPO missing (set in .env)\n')
    process.exit(1)
  }
  if (!phaseId) {
    process.stderr.write('loop-issue: --phase is required\n')
    process.exit(1)
  }
  if (!title || !bodyFile) {
    process.stderr.write('loop-issue: --title and --body-file are required\n')
    process.exit(1)
  }
  if (!fs.existsSync(bodyFile)) {
    process.stderr.write(`loop-issue: body file not found: ${bodyFile}\n`)
    process.exit(1)
  }
  if (!isPhaseMatch(title, phaseId)) {
    process.stderr.write(
      `loop-issue: --title must start with "${phaseTitlePrefix(phaseId)}" so reuse-by-prefix works\n`,
    )
    process.exit(1)
  }

  // Make sure the phase + provenance labels exist.
  for (const name of ['loop:phase', 'loop:opened']) {
    const r = ensureLabel(name, repo)
    if (r.error) {
      process.stderr.write(`loop-issue: label ensure failed for ${name}: ${r.error}\n`)
      process.exit(1)
    }
  }

  const found = findPhaseIssue(phaseId, repo)
  if (found && found.error) {
    process.stderr.write(`loop-issue: phase lookup failed: ${found.error}\n`)
    process.exit(1)
  }

  if (found && found.state === 'OPEN') {
    // Reuse — no new issue, no comment churn. Caller already has the
    // brief on the row; the issue body matches.
    process.stdout.write(`${found.number}\n`)
    return
  }

  if (found && found.state === 'CLOSED') {
    // Re-open + log a resume comment.
    const reopen = ghCall(['issue', 'reopen', String(found.number), '--repo', repo])
    if (reopen.status !== 0) {
      process.stderr.write(
        `loop-issue: phase reopen failed for #${found.number} (status ${reopen.status})\n${reopen.stderr}\n`,
      )
      process.exit(1)
    }
    const comment = ghCall([
      'issue',
      'comment',
      String(found.number),
      '--repo',
      repo,
      '--body',
      buildPhaseResumeCommentBody({ phaseId }),
    ])
    if (comment.status !== 0) {
      // Non-fatal: the reopen succeeded, the comment is polish.
      process.stderr.write(
        `loop-issue: phase resume comment failed for #${found.number} (status ${comment.status})\n${comment.stderr}\n`,
      )
    }
    process.stdout.write(`${found.number}\n`)
    return
  }

  // Create from scratch.
  const r = ghCall([
    'issue',
    'create',
    '--repo',
    repo,
    '--title',
    title,
    '--body-file',
    path.resolve(bodyFile),
    '--label',
    'loop:phase,loop:opened',
  ])
  if (r.status !== 0) {
    process.stderr.write(`loop-issue: gh issue create (phase) failed (${r.status})\n${r.stderr}\n`)
    process.exit(1)
  }
  const number = parseIssueNumber(r.stdout)
  if (!number) {
    process.stderr.write(`loop-issue: could not parse issue number from gh stdout:\n${r.stdout}\n`)
    process.exit(1)
  }
  process.stdout.write(`${number}\n`)
}

function cmdPhaseClose(flags) {
  const phaseId = flags.phase
  const commit = flags.commit
  const deployUrl = flags['deploy-url']
  const number = flags.number // optional override
  const repo = process.env.GH_REPO

  if (!process.env.GH_TOKEN || !repo) {
    process.stderr.write('loop-issue: GH_TOKEN/GH_REPO missing — skipping phase close\n')
    return // best-effort
  }
  if (!commit || !deployUrl) {
    process.stderr.write('loop-issue: --commit and --deploy-url required\n')
    return
  }
  if (!number && !phaseId) {
    process.stderr.write('loop-issue: pass --number or --phase\n')
    return
  }

  let target = number ? Number(number) : null
  let knownState = null
  if (!target) {
    const found = findPhaseIssue(phaseId, repo)
    if (found && found.error) {
      process.stderr.write(`loop-issue: phase lookup failed: ${found.error}\n`)
      return
    }
    if (!found) {
      process.stderr.write(`loop-issue: no phase issue found for ${phaseId} — nothing to close\n`)
      return
    }
    target = found.number
    knownState = found.state
  }

  const body = buildPhaseShippedCommentBody({ phaseId, commit, deployUrl })
  const r = ghCall(['issue', 'comment', String(target), '--repo', repo, '--body', body])
  if (r.status !== 0) {
    // Non-fatal: the comment is a courtesy; the close below is load-bearing.
    process.stderr.write(
      `loop-issue: phase comment failed for #${target} (status ${r.status})\n${r.stderr}\n`,
    )
  }

  // Phase 35 — actively close the mirror via the API rather than trusting the
  // `Closes #N` commit trailer (inert on cross-session branch merge routes; see
  // the header). Skip the API call when we already know it's closed (idempotent
  // + saves a round-trip); otherwise close with state_reason=completed.
  if (knownState === 'CLOSED') return
  const close = closeIssue(target, repo)
  if (close.error) {
    process.stderr.write(`loop-issue: phase close failed for #${target}: ${close.error}\n`)
  }
}

export function buildPhaseResumeCommentBody({ phaseId }) {
  return [
    `Phase ${phaseId} work resumed at ${new Date().toISOString()}.`,
    '',
    '_Reopened by the autonomous loop. The original issue stayed closed too long for the next ship; this run reuses the same number to keep the public timeline consistent._',
  ].join('\n')
}

export function buildPhaseShippedCommentBody({ phaseId, commit, deployUrl }) {
  return [
    `Phase ${phaseId} shipped in ${commit}.`,
    '',
    `Live at ${deployUrl} after deploy ready.`,
    '',
    '_Closed by the autonomous loop after a green deploy (via the GitHub API — reliable regardless of push route); the `close-trailers` sweep also closes it from the commit\'s `Closes #N` trailer._',
  ].join('\n')
}

// --- entry point ------------------------------------------------------

function main(argv) {
  const [sub, ...rest] = argv
  const flags = parseArgs(rest)
  switch (sub) {
    case 'open':
      return cmdOpen(flags)
    case 'close-comment':
      return cmdCloseComment(flags)
    case 'phase-open':
      return cmdPhaseOpen(flags)
    case 'phase-close':
      return cmdPhaseClose(flags)
    case 'close-trailers':
      return cmdCloseTrailers(flags)
    case 'deploy-comment':
      return cmdDeployComment(flags)
    case '--help':
    case '-h':
    case 'help':
    case undefined:
      printHelp()
      return
    default:
      process.stderr.write(`loop-issue: unknown subcommand "${sub}"\n`)
      printHelp()
      process.exit(1)
  }
}

function printHelp() {
  process.stdout.write(`loop-issue.mjs — autonomous-loop issue mirror

Usage:
  node scripts/loop-issue.mjs open --severity <high|med|low> \\
      --category <bug|enhancement|content|data|docs|seo|a11y|perf> \\
      --source <user|reader|audit|external> \\
      --title "<title>" --body-file <path>
      → echoes the new issue number to stdout

  node scripts/loop-issue.mjs close-comment --number <N> \\
      --commit <sha> --deploy-url <url>
      → posts a follow-up comment AND closes the issue via the API
      (reliable regardless of push route; the Closes #N trailer is a backup)

  node scripts/loop-issue.mjs phase-open --phase <id> \\
      --title "Phase <id> — <topic>" --body-file <path>
      → find-or-create-or-reopen; echoes the issue number

  node scripts/loop-issue.mjs phase-close --phase <id> \\
      --commit <sha> --deploy-url <url>
      → posts a "phase shipped" comment AND closes the mirror via the API
      (reliable on every push route; the Closes #N trailer is a backup).
      (alternatively pass --number <N> to skip the lookup)

  node scripts/loop-issue.mjs close-trailers \\
      --range <base-sha>..<head-sha>   (or --sha <sha> for one commit)
      [--dry-run]
      → scans EVERY commit in the range, parses the closing keywords out
      of the commit prose (code fences, quotes and inline code excluded),
      and closes each referenced issue via the API, idempotently. This is
      the load-bearing auto-close: GitHub's native parser is inert in this
      repo and the agent-driven close-comment step is skipped whenever a
      loop turn ends before CI goes green (Phase 48). Wired to every push
      to main by .github/workflows/close-trailers.yml. Exits 1 if a close
      actually failed.

  node scripts/loop-issue.mjs deploy-comment --sha <sha> \\
      --deploy-url <url> [--dry-run]
      → for the one commit at <sha>, posts the deploy-URL comment on every
      issue its message closes, unless already posted for this exact SHA.
      Never closes anything (close-trailers owns that). Wired to
      .github/workflows/deploy-comment.yml, which runs it only after
      re-confirming CI is actually green for <sha> — this is the load-
      bearing deploy comment: the agent-driven close-comment/phase-close
      step is skipped whenever a loop turn ends before CI goes green
      (Phase 91, same class of defect close-trailers fixed for the close).
      Exits 1 if a comment post actually failed.

Env (from .env or shell):
  GH_TOKEN, GH_REPO
`)
}

// Export internals for tests. ESM-safe.
export const __test = {
  parseArgs,
  parseIssueNumber,
  buildCloseCommentBody,
  buildPhaseResumeCommentBody,
  buildPhaseShippedCommentBody,
  phaseTitlePrefix,
  isPhaseMatch,
  stripNonProse,
  parseCloseTrailers,
  collectCloseTargets,
  parseGitLogRecords,
  resolveRangeArgs,
  sweepCloseTrailers,
  buildTrailerCloseCommentBody,
  buildDeployCommentBody,
  defaultDeploySweepIo,
  sweepDeployComments,
  LABEL_PALETTE,
  VALID_SEVERITY,
  VALID_CATEGORY,
  VALID_SOURCE,
}

/**
 * Fill the GitHub env a run needs. With no GH_TOKEN (a worktree has no
 * .env) the run borrows `gh`'s keyring login; GH_REPO defaults to this repo.
 * Mutates and returns `env`; `run` is injectable for tests.
 */
export function fillGhEnv(env, run = () => spawnSync('gh', ['auth', 'token'], { encoding: 'utf-8' })) {
  if (!env.GH_TOKEN) {
    const r = run()
    const token = r && r.status === 0 ? String(r.stdout ?? '').trim() : ''
    if (token) env.GH_TOKEN = token
  }
  if (!env.GH_REPO) env.GH_REPO = 'no-trbl-2-u/Miserere-mei-deus'
  return env
}

// Run main only when invoked as a script, not when imported by tests.
const isMain = (() => {
  try {
    return import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
      import.meta.url.endsWith(path.basename(process.argv[1] ?? ''))
  } catch {
    return false
  }
})()
if (isMain) {
  fillGhEnv(process.env)
  main(process.argv.slice(2))
}
