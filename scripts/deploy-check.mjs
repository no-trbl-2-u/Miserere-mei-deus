#!/usr/bin/env node
// scripts/deploy-check.mjs
//
// "Checking last deployment" — the post-push gate.
//
// Polls your hosting provider for the deploy matching HEAD's
// commit SHA and exits when the deploy reaches a terminal state.
//
//   exit 0  →  deploy ready
//   exit 1  →  deploy errored or failed
//   exit 2  →  timeout
//   exit 3  →  config / auth failure
//
// Pick your provider with DEPLOY_PROVIDER (default: github-actions).
// Configure auth in .env.
//
// See .github/workflows/README.md for the CI-green gate details.

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import { resolveGithubToken } from './deploy-check-token.mjs'

// --- load .env if present (Node has no built-in .env loader) ---
if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

const PROVIDER = process.env.DEPLOY_PROVIDER ?? 'github-actions'  // Axiomancer: CI-green gate
// Verification now consolidates package checks and browser evidence into one
// sequential runner. Preserve an override for local probes, but give the owned
// CI job enough time to finish without the deploy gate declaring a false stall.
const TIMEOUT_MS = Number(process.env.DEPLOY_TIMEOUT_MS ?? 45 * 60 * 1000)
const POLL_MS = 8 * 1000
// Grace window: if no gated workflow has appeared for HEAD by now, the
// commit's paths triggered no verify-* workflow (e.g. a plan/ or docs-only
// tick) — nothing to check, exit 0. See the github-actions block below.
const INGEST_GRACE_MS = Number(process.env.CI_INGEST_GRACE_MS ?? 120 * 1000)

const sha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
const subject = execSync('git log -1 --pretty=%s', { encoding: 'utf-8' }).trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Most providers create one deploy per push, keyed to the head commit.
// If you pushed multiple commits at once, the deploy resolves to the
// last of them — others ride along but aren't directly addressable.
// We log HEAD's subject so the message reflects what shipped.
console.log(`Checking deploy for HEAD ${sha.slice(0, 7)} ("${subject}") on ${PROVIDER}...`)

// =====================================================================
// PROVIDER: NETLIFY
// =====================================================================
if (PROVIDER === 'netlify') {
  const TOKEN = process.env.NETLIFY_AUTH_TOKEN
  const SITE_NAME = process.env.NETLIFY_SITE_NAME ?? 'axiomancer'
  if (!TOKEN) configFail('NETLIFY_AUTH_TOKEN', 'https://app.netlify.com/user/applications')

  const auth = { Authorization: `Bearer ${TOKEN}` }
  const sitesRes = await fetch(
    `https://api.netlify.com/api/v1/sites?name=${encodeURIComponent(SITE_NAME)}`,
    { headers: auth },
  )
  if (!sitesRes.ok) apiFail('Netlify sites', sitesRes)
  const sites = await sitesRes.json()
  const site = sites.find((s) => s.name === SITE_NAME) ?? sites[0]
  if (!site) {
    console.error(`No Netlify site for "${SITE_NAME}". Override with NETLIFY_SITE_NAME.`)
    process.exit(3)
  }

  await pollLoop(async () => {
    const res = await fetch(
      `https://api.netlify.com/api/v1/sites/${site.id}/deploys?per_page=10`,
      { headers: auth },
    )
    if (!res.ok) return null
    const deploys = await res.json()
    const match = deploys.find((d) => d.commit_ref === sha)
    if (!match) return { state: 'pending' }
    if (match.state === 'ready') {
      // Find the previous successful deploy so pollLoop can show the
      // commit range that landed in this deploy. Skipped silently if
      // unavailable (first deploy ever, shallow clone, etc).
      const previousReady = deploys.find(
        (d) => d.state === 'ready' && d.commit_ref && d.commit_ref !== sha,
      )
      return {
        state: 'ready',
        url: match.deploy_ssl_url ?? match.ssl_url,
        previousReadySha: previousReady?.commit_ref,
      }
    }
    if (match.state === 'error' || match.state === 'failed') {
      return {
        state: 'error',
        message: match.error_message,
        title: match.title,
        admin: match.admin_url,
        summary: match.summary?.messages ?? [],
      }
    }
    return { state: match.state, id: match.id.slice(0, 8) }
  })
}

// =====================================================================
// PROVIDER: VERCEL
// =====================================================================
else if (PROVIDER === 'vercel') {
  const TOKEN = process.env.VERCEL_TOKEN
  const PROJECT = process.env.VERCEL_PROJECT_ID
  const TEAM = process.env.VERCEL_TEAM_ID
  if (!TOKEN) configFail('VERCEL_TOKEN', 'https://vercel.com/account/tokens')
  if (!PROJECT) configFail('VERCEL_PROJECT_ID', 'project settings')

  const auth = { Authorization: `Bearer ${TOKEN}` }
  const teamParam = TEAM ? `&teamId=${TEAM}` : ''

  await pollLoop(async () => {
    const url = `https://api.vercel.com/v6/deployments?projectId=${PROJECT}${teamParam}&limit=20`
    const res = await fetch(url, { headers: auth })
    if (!res.ok) return null
    const data = await res.json()
    const match = data.deployments?.find((d) => d.meta?.githubCommitSha === sha)
    if (!match) return { state: 'pending' }
    if (match.readyState === 'READY') return { state: 'ready', url: `https://${match.url}` }
    if (match.readyState === 'ERROR' || match.readyState === 'CANCELED') {
      return {
        state: 'error',
        message: match.errorMessage,
        admin: `https://vercel.com/${match.ownerId}/${match.name}/${match.id}`,
      }
    }
    return { state: match.readyState.toLowerCase(), id: match.id.slice(0, 8) }
  })
}

// =====================================================================
// PROVIDER: GITHUB ACTIONS (Axiomancer CI-green gate)
//
// This is a monorepo with PATH-FILTERED verify workflows. A given push
// triggers only the verify-* workflow(s) whose path filter its changed
// files match (see .github/workflows/verify-*.yml). "Deploy ready" here
// means: every verify-* workflow that DID trigger for HEAD's SHA has
// concluded success. A commit whose paths trigger NO gated workflow
// (e.g. a plan/ or docs-only loop tick) has nothing to check -> exit 0
// after the ingest grace window. EAS release builds (preview-build.yml)
// are workflow_dispatch and deliberately NOT part of this gate.
// =====================================================================
else if (PROVIDER === 'github-actions') {
  const TOKEN = resolveGithubToken()
  const REPO = process.env.GH_REPO ?? 'no-trbl-2-u/Miserere-mei-deus'
  const WORKFLOWS = (
    process.env.DEPLOY_WORKFLOWS ??
    'verify-mechanics.yml,verify-mobile.yml'
  )
    .split(',')
    .map((w) => w.trim())
    .filter(Boolean)
  if (!TOKEN) configFail('GH_TOKEN', 'https://github.com/settings/tokens')

  const auth = {
    Authorization: `Bearer ${TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
    Accept: 'application/vnd.github+json',
  }
  const isGated = (r) => WORKFLOWS.some((w) => r.path?.endsWith(`/${w}`))

  const start = Date.now()
  let lastSig = null
  while (Date.now() - start < TIMEOUT_MS) {
    const elapsed = Math.round((Date.now() - start) / 1000)
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/runs?head_sha=${sha}&per_page=50`,
      { headers: auth },
    )
    if (res.status === 401 || res.status === 403) apiFail('GitHub Actions', res)
    if (!res.ok) {
      console.error(`API error ${res.status} (retrying in ${POLL_MS / 1000}s)`)
      await sleep(POLL_MS)
      continue
    }
    const runs = ((await res.json()).workflow_runs ?? []).filter(isGated)

    if (runs.length === 0) {
      if (Date.now() - start < INGEST_GRACE_MS) {
        if (lastSig !== 'ingest') {
          console.log(`No gated workflow for ${sha.slice(0, 7)} yet (grace window)...`)
          lastSig = 'ingest'
        }
        await sleep(POLL_MS)
        continue
      }
      // Fail closed: "zero runs" is only a pass for a genuinely
      // docs/plan-only tick. It is ALSO what a missing/expired GH_PAT
      // looks like — pushes made with the default GITHUB_TOKEN never
      // trigger verify-* (see .github/workflows/README.md), which used
      // to make this gate pass vacuously. If HEAD's diff touches any
      // gated path, zero runs means the gate is broken, not green.
      const gatedPaths = (
        process.env.DEPLOY_GATED_PATHS ??
        'axiomancer-mechanics/,axiomancer-mobile/,package-lock.json'
      )
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
      let changed = []
      try {
        changed = execSync('git diff --name-only HEAD~1..HEAD', { encoding: 'utf-8' })
          .trim()
          .split('\n')
          .filter(Boolean)
      } catch {
        // HEAD~1 unavailable (first commit / shallow clone) — cannot
        // prove the tick was docs-only, so stay closed.
        changed = ['<unknown: HEAD~1 unavailable>']
      }
      const gatedTouch = changed.filter(
        (f) => f.startsWith('<unknown') || gatedPaths.some((p) => f === p || f.startsWith(p)),
      )
      if (gatedTouch.length > 0) {
        console.error(`DEPLOY GATE FAILED (fail-closed).`)
        console.error(
          `  HEAD ${sha.slice(0, 7)} touches gated paths but NO verify-* workflow ran for it:`,
        )
        for (const f of gatedTouch.slice(0, 10)) console.error(`    ${f}`)
        console.error(``)
        console.error(`  Most likely cause: the push was made with the default GITHUB_TOKEN`)
        console.error(`  (missing/expired GH_PAT secret), which never triggers workflows.`)
        console.error(`  Diagnose with .github/workflows/pat-probe.yml.`)
        console.error(`  Do not push past this gate.`)
        process.exit(1)
      }
      console.log(
        `No verify-* workflow triggered for HEAD's paths (docs/plan-only tick). Nothing to check.`,
      )
      process.exit(0)
    }

    const failed = runs.find((r) => r.status === 'completed' && r.conclusion !== 'success')
    if (failed) {
      // A `cancelled` run isn't necessarily a real failure: GitHub's
      // concurrency group (`cancel-in-progress`) cancels an older
      // commit's in-flight verify-* run when a newer commit lands on
      // the same ref, even though the older commit's own checks never
      // actually failed. Only fail-closed on a genuine cancellation —
      // one where this SHA is still the branch tip, so nothing
      // superseded it.
      if (failed.conclusion === 'cancelled') {
        let remoteTip = null
        try {
          remoteTip = execSync('git ls-remote origin refs/heads/main', { encoding: 'utf-8' })
            .split('\t')[0]
            .trim()
        } catch {
          // No network / no origin remote — fall through to fail-closed below.
        }
        if (remoteTip && remoteTip !== sha) {
          console.error(`DEPLOY GATE: run cancelled — superseded by a newer commit on origin/main.`)
          console.error(`  Checked SHA ${sha.slice(0, 7)}, current tip ${remoteTip.slice(0, 7)}.`)
          console.error(`  Not a real failure — re-run deploy:check against the newer HEAD.`)
          process.exit(2)
        }
      }
      console.error(`DEPLOY FAILED (CI red).`)
      console.error(`  Workflow: ${failed.name} concluded ${failed.conclusion}`)
      console.error(`  Run: ${failed.html_url}`)
      console.error(``)
      console.error(`Read the run log, patch the root cause, push again.`)
      console.error(`Do not push past this gate.`)
      process.exit(1)
    }

    const pending = runs.filter((r) => r.status !== 'completed')
    if (pending.length === 0) {
      console.log(`CI green: ${runs.length} verify workflow(s) succeeded for ${sha.slice(0, 7)}.`)
      for (const r of runs) console.log(`  ${r.name}: success -> ${r.html_url}`)
      process.exit(0)
    }

    const sig = `${runs.length}/${pending.length}`
    if (sig !== lastSig) {
      console.log(
        `Waiting on CI: ${runs.length} run(s), ${pending.length} still in progress (${elapsed}s)`,
      )
      lastSig = sig
    }
    await sleep(POLL_MS)
  }
  console.error(`CI still running after ${TIMEOUT_MS / 1000}s. Loop will re-check next tick.`)
  process.exit(2)
}

// =====================================================================
// PROVIDER: HEALTH CHECK (self-hosted, fallback)
// =====================================================================
else if (PROVIDER === 'health-check') {
  const URL = process.env.HEALTH_CHECK_URL
  const EXPECT = process.env.HEALTH_CHECK_EXPECT // string sentinel; optional
  const BUFFER_S = Number(process.env.DEPLOY_WAIT_BUFFER_S ?? 120)
  if (!URL) configFail('HEALTH_CHECK_URL', 'configure your live endpoint')

  console.log(`Waiting ${BUFFER_S}s for deploy to settle...`)
  await sleep(BUFFER_S * 1000)
  console.log(`Probing ${URL}...`)
  const res = await fetch(URL)
  if (res.status !== 200) {
    console.error(`Health check failed: HTTP ${res.status}`)
    process.exit(1)
  }
  if (EXPECT) {
    const text = await res.text()
    if (!text.includes(EXPECT)) {
      console.error(`Health check failed: expected sentinel "${EXPECT}" not found in response.`)
      process.exit(1)
    }
  }
  console.log(`Deploy ready (health check passed). URL: ${URL}`)
  process.exit(0)
}

// =====================================================================
// PROVIDER: NONE (project not yet deployable)
// =====================================================================
else if (PROVIDER === 'none') {
  console.log('No deploy gate configured (DEPLOY_PROVIDER=none). Skipping.')
  process.exit(0)
}

else {
  console.error(`Unknown DEPLOY_PROVIDER: "${PROVIDER}".`)
  console.error(`Supported: netlify | vercel | github-actions | health-check | none`)
  console.error(`See nexus/playbooks/ci-providers.md for full details.`)
  process.exit(3)
}

// =====================================================================
// HELPERS
// =====================================================================

async function pollLoop(probe) {
  const start = Date.now()
  let lastState = null
  let waitedForIngest = false
  while (Date.now() - start < TIMEOUT_MS) {
    const elapsed = Math.round((Date.now() - start) / 1000)
    const result = await probe()
    if (result === null) {
      console.error(`API error (retrying in ${POLL_MS / 1000}s)`)
      await sleep(POLL_MS)
      continue
    }
    if (result.state === 'pending') {
      if (!waitedForIngest) {
        console.log(`Provider hasn't ingested commit ${sha.slice(0, 7)} yet (waiting...)`)
        waitedForIngest = true
      }
      await sleep(POLL_MS)
      continue
    }
    if (result.state !== lastState) {
      const id = result.id ? ` ${result.id}` : ''
      console.log(`Deploy${id}: state=${result.state} (${elapsed}s elapsed)`)
      lastState = result.state
    }
    if (result.state === 'ready') {
      console.log(`Deploy ready.`)
      // Show the commit range this deploy contains, if the probe
      // surfaced a previous-ready SHA. Useful when a push bundled
      // multiple commits — the operator sees what actually landed
      // in production, not just HEAD.
      if (result.previousReadySha) {
        try {
          const range = execSync(
            `git log ${result.previousReadySha}..${sha} --oneline --no-merges`,
            { encoding: 'utf-8' },
          ).trim()
          if (range) {
            const lines = range.split('\n')
            console.log(`  Includes ${lines.length} commit${lines.length === 1 ? '' : 's'}:`)
            for (const line of lines) console.log(`    ${line}`)
          }
        } catch {
          // Previous-deploy SHA may not be in local history (shallow
          // clone, squash-merged, etc.) — skip range silently.
        }
      }
      if (result.url) console.log(`  URL: ${result.url}`)
      process.exit(0)
    }
    if (result.state === 'error') {
      console.error(`DEPLOY FAILED.`)
      if (result.title) console.error(`  Title: ${result.title}`)
      if (result.message) console.error(`  Error: ${result.message}`)
      if (result.summary?.length) {
        console.error(`  Summary:`)
        for (const msg of result.summary.slice(0, 5)) {
          console.error(`    - ${msg.title ?? msg}${msg.description ? `: ${msg.description}` : ''}`)
        }
      }
      if (result.admin) console.error(`  Admin URL: ${result.admin}`)
      console.error(``)
      console.error(`Read the log, patch the root cause, push again.`)
      console.error(`Do not push past this gate.`)
      process.exit(1)
    }
    await sleep(POLL_MS)
  }
  console.error(`Deploy still pending after ${TIMEOUT_MS / 1000}s.`)
  process.exit(2)
}

function configFail(varName, helpUrl) {
  console.error(`${varName} is not set.`)
  console.error(`  • Get a token at ${helpUrl}`)
  console.error(`  • Add to .env as: ${varName}=...`)
  console.error(`  • .env is gitignored; never commit it.`)
  process.exit(3)
}

function apiFail(label, res) {
  console.error(`${label} API error: ${res.status} ${res.statusText}`)
  if (res.status === 401) console.error('  Token rejected.')
  process.exit(3)
}
