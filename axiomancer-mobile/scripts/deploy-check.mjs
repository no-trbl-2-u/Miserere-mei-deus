#!/usr/bin/env node
// scripts/deploy-check.mjs
//
// "Checking last deployment" — the post-push gate.
//
// Status: STUB. There is no auto-deploy from `main` for this
// project. EAS Build is triggered manually via
// `npm run deploy:preview` / `npm run deploy:production`. Until
// the deploy gate is wired against the EAS Build API (queued as
// phase 11 — see `plan/steps/01_build_plan.md`), this script
// exits 0 with a notice so the shipping skills' Step 12 doesn't
// trip.
//
// Exit contract (preserved for when phase 11 lands):
//
//   exit 0  →  deploy ready
//   exit 1  →  deploy errored or failed
//   exit 2  →  timeout
//   exit 3  →  config / auth failure
//
// When wiring this up, replace the stub block below with the EAS
// Build API polling pattern (see nexus/playbooks/ci-providers.md
// for the cross-provider matrix; EAS uses
// `https://api.expo.dev/v2/projects/<id>/builds` keyed to
// `gitCommitHash`).

import { execSync } from 'node:child_process'
import dotenv from 'dotenv'

dotenv.config()

const PROVIDER = process.env.DEPLOY_PROVIDER ?? 'none'

const sha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
const subject = execSync('git log -1 --pretty=%s', { encoding: 'utf-8' }).trim()

console.log(`deploy-check: HEAD ${sha.slice(0, 7)} ("${subject}")`)

if (PROVIDER === 'none') {
  console.log(
    'deploy-check: STUB — no auto-deploy provider configured.\n' +
      "          This repo's deploy contract is EAS Build (manual),\n" +
      '          not push-to-deploy. The gate is queued for wiring in\n' +
      '          phase 11 (see plan/steps/01_build_plan.md). Until then\n' +
      '          this script exits 0 so the loop contract stays uniform.',
  )
  process.exit(0)
}

// --- EAS BUILD (phase 11 implementation) -------------------------
if (PROVIDER === 'eas') {
  const TOKEN = process.env.EXPO_TOKEN
  
  if (!TOKEN) {
    console.error(
      'deploy-check: EXPO_TOKEN required for the "eas" provider.\n' +
        '          Get a token at https://expo.dev/settings/access-tokens,\n' +
        '          then set DEPLOY_PROVIDER=eas in .env.\n' +
        '          See setup/02_eas.md for configuration details.',
    )
    process.exit(3)
  }

  try {
    // Verify authentication first
    execSync('npx eas whoami', { encoding: 'utf-8', stdio: 'pipe' })
  } catch (error) {
    console.error(
      `deploy-check: EAS authentication failed. Check EXPO_TOKEN.\n` +
        '          Error: ' + error.message,
    )
    process.exit(3)
  }

  try {
    // Poll for builds matching current commit
    const buildsJson = execSync(
      `npx eas build:list --git-commit-hash="${sha}" --platform=all --json`,
      { encoding: 'utf-8', stdio: 'pipe' }
    )
    
    const builds = JSON.parse(buildsJson)
    
    // Find most recent build for this commit
    const latestBuild = builds[0]
    if (!latestBuild) {
      console.log(`deploy-check: no builds found for commit ${sha.slice(0, 7)}`)
      process.exit(2) // timeout - no build triggered yet
    }
    
    // Map status to exit codes. EAS has returned both lowercase
    // (`finished`) and uppercase (`FINISHED`) over time; normalize.
    const status = String(latestBuild.status ?? '').toLowerCase()
    switch (status) {
      case 'finished':
        console.log(`deploy-check: ✓ build ${latestBuild.id} finished`)
        process.exit(0)
      case 'errored':
      case 'canceled':
      case 'cancelled':
        console.error(`deploy-check: ✗ build ${latestBuild.id} ${status}`)
        process.exit(1)
      case 'in-progress':
      case 'in_progress':
      case 'in-queue':
      case 'in_queue':
      case 'pending':
      case 'new':
        console.log(`deploy-check: ⏳ build ${latestBuild.id} ${status}`)
        process.exit(2)
      default:
        console.error(`deploy-check: unknown build status: ${latestBuild.status}`)
        process.exit(1)
    }
  } catch (error) {
    if (error.message.includes('JSON')) {
      console.error('deploy-check: failed to parse EAS CLI output')
      process.exit(1)
    }
    console.error(`deploy-check: EAS CLI error: ${error.message}`)
    process.exit(2) // treat CLI errors as timeout (retry)
  }
}

console.error(`deploy-check: unknown DEPLOY_PROVIDER "${PROVIDER}".`)
process.exit(3)
