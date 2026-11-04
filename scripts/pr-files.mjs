// scripts/pr-files.mjs — a PR's full changed-file list.
//
// `gh pr view --json files` stops at 100 files without failing, so a wide PR
// loses readers silently. This reads `repos/{repo}/pulls/{n}/files` page by
// page (additions and deletions kept) and fails loudly when the list
// disagrees with the PR's `changed_files`. GitHub's list API itself stops at
// 3000 files; past that no complete list exists, so that is a failure too.
//
// `prSnapshot` also pins the head: files are read between two reads of the
// PR, and a push in between (the head moved) retries, then fails, so a file
// list is never paired with a head it does not belong to.

import { execFileSync } from 'node:child_process'

export const PAGE_SIZE = 100
export const API_FILE_CAP = 3000
export const SNAPSHOT_TRIES = 3

/** Read one REST endpoint through gh as JSON. */
export function ghApi(endpoint) {
  return JSON.parse(execFileSync('gh', ['api', endpoint], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
}

function readPages(pr, repo, api, expected) {
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

/**
 * The files, labels and head of one PR, read consistently: head, files, head
 * again; a moved head retries (bounded) and then fails loudly. A list that
 * disagrees with its count may be the push itself, so it only fails once the
 * head has held still across the read.
 * @param {string|number} pr
 * @param {string} repo owner/name
 * @param {(endpoint: string) => any} [api] reads one endpoint as JSON (injected in tests)
 * @returns {{ files: { path: string, additions: number, deletions: number }[], labels: string[], head: string }}
 */
export function prSnapshot(pr, repo, api = ghApi) {
  for (let attempt = 1; attempt <= SNAPSHOT_TRIES; attempt++) {
    const before = api(`repos/${repo}/pulls/${pr}`)
    let files
    let failure
    try {
      files = readPages(pr, repo, api, before.changed_files)
    } catch (err) {
      failure = err
    }
    const after = api(`repos/${repo}/pulls/${pr}`)
    if (before.head.sha !== after.head.sha) continue
    if (failure) throw failure
    return { files, labels: (before.labels ?? []).map((l) => l.name), head: before.head.sha }
  }
  throw new Error(`PR #${pr}: the head moved on each of ${SNAPSHOT_TRIES} reads; refusing to pair files with a stale head`)
}

/** Just the files of a PR (head-checked). */
export function prFiles(pr, repo, api = ghApi) {
  return prSnapshot(pr, repo, api).files
}
