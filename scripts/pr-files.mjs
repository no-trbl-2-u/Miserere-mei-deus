// scripts/pr-files.mjs — a PR's full changed-file list.
//
// `gh pr view --json files` stops at 100 files without failing, so a wide PR
// loses readers silently. This reads `repos/{repo}/pulls/{n}/files` page by
// page (additions and deletions kept) and fails loudly when the list
// disagrees with the PR's `changed_files`. GitHub's list API itself stops at
// 3000 files; past that no complete list exists, so that is a failure too.

import { execFileSync } from 'node:child_process'

export const PAGE_SIZE = 100
export const API_FILE_CAP = 3000

/** Read one REST endpoint through gh as JSON. */
export function ghApi(endpoint) {
  return JSON.parse(execFileSync('gh', ['api', endpoint], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
}

/**
 * @param {string|number} pr
 * @param {string} repo owner/name
 * @param {(endpoint: string) => any} [api] reads one endpoint as JSON (injected in tests)
 * @returns {{ path: string, additions: number, deletions: number }[]}
 */
export function prFiles(pr, repo, api = ghApi) {
  const expected = api(`repos/${repo}/pulls/${pr}`).changed_files
  if (!Number.isInteger(expected)) throw new Error(`PR #${pr}: no changed_files count; cannot check the file list`)
  if (expected > API_FILE_CAP) {
    throw new Error(`PR #${pr} changes ${expected} files; GitHub's file list stops at ${API_FILE_CAP}, so no complete list exists`)
  }
  const out = []
  for (let page = 1; out.length < expected && page <= API_FILE_CAP / PAGE_SIZE; page++) {
    const rows = api(`repos/${repo}/pulls/${pr}/files?per_page=${PAGE_SIZE}&page=${page}`)
    if (!Array.isArray(rows) || rows.length === 0) break
    for (const f of rows) out.push({ path: f.filename, additions: f.additions ?? 0, deletions: f.deletions ?? 0 })
  }
  if (out.length !== expected) {
    throw new Error(`PR #${pr}: read ${out.length} files but the PR reports ${expected}; refusing a partial list`)
  }
  return out
}
