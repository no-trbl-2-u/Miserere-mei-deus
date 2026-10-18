// scripts/eval/seeded-review.mjs
//
// `node scripts/eval/seeded-replay.mjs --judge review` (phase RV1c, brief
// A7): the shadow reviewer meets each planted defect. For every seed this
// pushes two throwaway branches and opens each as a draft PR labelled
// `eval:seed` (never `loop:pr`, so the PR cap and `pr-autofix` ignore it):
//
//   eval/seed-<id>     a commit on the fix whose source is reverted to the
//                      fix's parent: the PR's diff plants the bug
//   eval/control-<id>  the fix's tree as a new commit on its parent: the
//                      PR's diff is the fix itself, the clean control
//
// It dispatches `pr-review.yml` on each (main's reviewer), waits for the
// verdict comment carrying the PR head's marker, scores it with
// `flagsPlanted`, then closes every PR and deletes every branch, even when
// a step failed. Writes the `review` block of each seed in
// `docs/reports/eval/seeded.json` and the seeded-review section of
// `latest.md`. `--dry-run` builds the commits and prints the plan without
// pushing anything. The pure parts live in `seeded-lib.mjs`.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { REVIEW_VERDICT } from './ledger-lib.mjs'
import { spliceMarked } from './mutation-lib.mjs'
import { REVIEW_SECTION_END, REVIEW_SECTION_START, SEEDS, flagsPlanted, hunkRanges, plantedPaths, renderReviewSection, reviewBranches } from './seeded-lib.mjs'
import { ROOT, checkout, closeWorktree, git, openWorktree } from './worktree.mjs'

const OUT_DIR = join(ROOT, 'docs/reports/eval')
const WAIT_MS = 35 * 60 * 1000
const POLL_MS = 30 * 1000
const IDENTITY = ['-c', 'user.name=eval-seeded-replay', '-c', 'user.email=eval@users.noreply.github.com']

function readEnv(key) {
  if (process.env[key]) return process.env[key]
  const env = join(ROOT, '.env')
  if (!existsSync(env)) return undefined
  const line = readFileSync(env, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${key}=`))
  return line ? line.slice(key.length + 1).trim() : undefined
}

const gh = (args) => execFileSync('gh', [...args, '--repo', REPO], { cwd: ROOT, encoding: 'utf8' }).trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let REPO = 'no-trbl-2-u/Miserere-mei-deus'

/** Builds a seed's two commits in the worktree; nothing is pushed. */
function buildCommits(dir, seed) {
  const fix = git(['rev-parse', `${seed.fix}^{commit}`])
  const parent = git(['rev-parse', `${fix}^`])
  const planted = plantedPaths(git(['diff', '--name-only', parent, fix]).split('\n').filter(Boolean))
  checkout(dir, fix)
  git(['checkout', parent, '--', ...planted], dir)
  git([...IDENTITY, 'commit', '--quiet', '-m', `eval: plant ${seed.id} (do not merge)`], dir)
  const seedSha = git(['rev-parse', 'HEAD'], dir)
  const controlSha = git([...IDENTITY, 'commit-tree', `${fix}^{tree}`, '-p', parent, '-m', `eval: control ${seed.id}, the fix of #${seed.pr} (do not merge)`])
  const hunks = hunkRanges(git(['diff', '-U0', fix, seedSha]))
  return { fix, parent, planted, seedSha, controlSha, hunks }
}

function deleteBranch(branch) {
  try {
    git(['push', '--quiet', 'origin', '--delete', branch])
  } catch {
    // absent: nothing to delete
  }
}

function openDraft(branch, sha, title, body) {
  deleteBranch(branch)
  git(['push', '--quiet', 'origin', `${sha}:refs/heads/${branch}`])
  const url = gh(['pr', 'create', '--draft', '--base', 'main', '--head', branch, '--label', 'eval:seed', '--title', title, '--body', body])
  return Number(url.split('/').pop())
}

/** Waits for the verdict on `sha`; resolves `{ posted, seconds, body }`. */
async function awaitVerdict(pr, sha, t0) {
  const marker = `<!-- pr-review:head ${sha} -->`
  while (Date.now() - t0 < WAIT_MS) {
    await sleep(POLL_MS)
    let comments = []
    try {
      comments = JSON.parse(gh(['pr', 'view', String(pr), '--json', 'comments'])).comments
    } catch {
      continue
    }
    const verdict = comments.find((c) => REVIEW_VERDICT.test(c.body ?? '') && c.body.includes(marker))
    if (verdict) return { posted: true, seconds: Math.round((Date.parse(verdict.createdAt) - t0) / 1000), body: verdict.body }
  }
  return { posted: false, why: `no verdict within ${WAIT_MS / 60000} min` }
}

function score(pr, got, hunks) {
  if (!got.posted) return { pr, posted: false, why: got.why }
  const s = flagsPlanted(got.body, hunks)
  return { pr, posted: true, seconds: got.seconds, verdict: REVIEW_VERDICT.exec(got.body)[1], ...s }
}

export async function judgeReview({ dryRun = false } = {}) {
  const token = readEnv('GH_TOKEN')
  if (token) process.env.GH_TOKEN = token
  REPO = readEnv('GH_REPO') || REPO
  const head = git(['rev-parse', 'HEAD'])
  const stamp = { commit: head.slice(0, 8), date: git(['show', '-s', '--format=%cI', head]) }

  const dir = openWorktree('eval-seeded-review-')
  const built = []
  try {
    for (const seed of SEEDS) built.push({ seed, ...buildCommits(dir, seed) })
  } finally {
    closeWorktree(dir)
  }
  for (const b of built) {
    const br = reviewBranches(b.seed.id)
    console.log(`${b.seed.id}: ${br.seed} @ ${b.seedSha.slice(0, 8)} (plants ${b.planted.join(', ')}); ${br.control} @ ${b.controlSha.slice(0, 8)}`)
  }
  if (dryRun) return

  try {
    gh(['label', 'create', 'eval:seed', '--color', 'C5DEF5', '--description', 'Seeded-replay draft PR (RV1c); closed and deleted by the run'])
  } catch {
    // exists
  }
  const opened = []
  const results = {}
  try {
    for (const b of built) {
      const br = reviewBranches(b.seed.id)
      const note = `Seeded replay (phase RV1c, \`scripts/eval/seeded-review.mjs\`). Throwaway draft; the run closes it and deletes the branch. Never merge.`
      const seedPr = openDraft(br.seed, b.seedSha, `eval: seeded ${b.seed.id}, ${b.seed.bug.slice(0, 60)} (do not merge)`, note)
      opened.push({ pr: seedPr, branch: br.seed })
      const controlPr = openDraft(br.control, b.controlSha, `eval: control ${b.seed.id}, the fix of #${b.seed.pr} (do not merge)`, note)
      opened.push({ pr: controlPr, branch: br.control })
      b.prs = { seed: seedPr, control: controlPr }
    }
    // All eight reviews run at once: each PR has its own concurrency group.
    const waits = []
    for (const b of built) {
      for (const [kind, pr, sha] of [['seed', b.prs.seed, b.seedSha], ['control', b.prs.control, b.controlSha]]) {
        const t0 = Date.now()
        gh(['workflow', 'run', 'pr-review.yml', '--ref', 'main', '-f', `pr=${pr}`])
        waits.push(awaitVerdict(pr, sha, t0).then((got) => {
          ;(results[b.seed.id] ??= {})[kind] = score(pr, got, kind === 'seed' ? b.hunks : {})
          console.log(`${b.seed.id} ${kind} #${pr}: ${got.posted ? `verdict in ${got.seconds}s` : got.why}`)
        }))
      }
    }
    await Promise.all(waits)
  } finally {
    for (const o of opened) {
      try {
        gh(['pr', 'close', String(o.pr), '--delete-branch'])
      } catch (e) {
        console.warn(`seeded-review: could not close #${o.pr}: ${e.message.split('\n')[0]}`)
      }
    }
    for (const b of built) for (const branch of Object.values(reviewBranches(b.seed.id))) deleteBranch(branch)
  }

  const file = join(OUT_DIR, 'seeded.json')
  const seeded = JSON.parse(readFileSync(file, 'utf8'))
  for (const s of seeded.seeds) if (results[s.id]) s.review = { stamp, ...results[s.id] }
  writeFileSync(file, `${JSON.stringify(seeded, null, 2)}\n`)
  const section = renderReviewSection({ stamp, seeds: seeded.seeds })
  const latest = join(OUT_DIR, 'latest.md')
  writeFileSync(latest, spliceMarked(readFileSync(latest, 'utf8'), section, REVIEW_SECTION_START, REVIEW_SECTION_END))
  console.log('seeded review -> docs/reports/eval/seeded.json, docs/reports/eval/latest.md')
}
