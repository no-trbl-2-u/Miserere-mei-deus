// scripts/eval/stryker/mobile.config.mjs
//
// Stryker on the two combat presenters (phase EV1c, brief A5): the encounter
// engine and the card-face program lines. Run by `scripts/eval/mutation.mjs`
// with `axiomancer-mobile/` as the working directory; never part of
// `verify`. Only the tests jest relates to a mutated file run.
//
// The dry run is narrowed to those related tests too (phase HD1b, A4).
// `enableFindRelatedTests` only narrows the mutant runs: the initial run
// ran all ~2000 mobile tests under per-test coverage and passed the
// 5-minute dry-run limit ("Initial test run timed out"), so every PR's
// mobile mutation row read "failed". The related set is about 130 suites.

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import { mutatedFiles } from '../mutation-lib.mjs'

const MUTATE = [
  'state/presenters/combat-encounter.engine.ts',
  'state/presenters/card-program.engine.ts',
]

/**
 * The files the related-test search starts from. `mutation-pr.mjs` sets
 * EVAL_STRYKER_MUTATE (a JSON array of Stryker `mutate` entries, each maybe
 * `file:from-to`) to the PR's changed files, so the related tests are those
 * of the changed files and not of the two presenters above (else a PR that
 * mutates `app/...` ran no test: "No tests were executed").
 */
function mutatedFilesNow() {
  return mutatedFiles(MUTATE, process.env.EVAL_STRYKER_MUTATE)
}

/** Absolute, forward-slash paths of the test files jest relates to the mutated files. */
function relatedTests() {
  const jestBin = createRequire(import.meta.url).resolve('jest/bin/jest')
  const out = execFileSync(
    process.execPath,
    [jestBin, '--listTests', '--findRelatedTests', ...mutatedFilesNow().map((f) => resolve(f))],
    { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  )
  return out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/\\/g, '/'))
}

export default {
  testRunner: 'jest',
  plugins: ['@stryker-mutator/jest-runner'],
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.js',
    enableFindRelatedTests: true,
    config: { testMatch: relatedTests() },
  },
  mutate: MUTATE,
  coverageAnalysis: 'perTest',
  ignoreStatic: true,
  reporters: ['json', 'progress'],
  jsonReporter: { fileName: process.env.EVAL_STRYKER_JSON ?? 'reports/mutation/mutation.json' },
  concurrency: Number(process.env.EVAL_STRYKER_CONCURRENCY ?? 2),
  timeoutMS: 15000,
  tempDirName: '.stryker-tmp',
  cleanTempDir: 'always',
}
