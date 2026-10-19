# Phase VE1 — Visual e2e: signal per minute, not speed

## Sources

- The `/plot` request from T, 2026-10-19 (attended): make the visual e2e and playthrough suite efficient, measured as signal per minute. T's calls in session: no local restamp (CI renders the baselines in VE1a's first run); CI stays **report-only** and the differing routes' new captures are **committed to the PR** so T approves or requests changes from the PR's image diff; the run record is telemetry rows plus the CI step summary; incremental route selection is its own phase (VE1d).
- Measured on `origin/main` `01b69c66b`, 2026-10-19, Windows, Playwright 1.61.1 Chromium, this plot's session: `expo export --platform web` 46s; `smoke-screens` capture+diff with the export reused 23.4-25.2s over 3 runs (13 routes), of which 13 x `waitForTimeout(600)` = 7.8s is sleep; all 13 captures byte-identical across the 3 runs (md5), verdict identical each time; **11 of 13 routes red** against the committed baselines, 0 missing, 0 console errors. The 8 routes whose baselines date 2026-08-28 to 2026-09-08 (root 39.1%, village 11.3%, inventory 8.1%, dialogue 6.4%, character 3.2%, exploration 2.8%, memoir 1.8%, cutscene 1.7%) show real, intended, never-approved change (the Axiomancer to Miserere mei deus title, new hero art, fixture content). The 3 routes approved 2026-10-15/16 (devpuzzle-board 4.5%, hazard-board 2.9%, devpuzzle-outcome 1.5%) show only glyph-edge noise: a **renderer difference**, which alone exceeds the 0.5% threshold. 266 commits touched `app/` and `components/` since the oldest baseline; the gate has been red by default for over 50 days, so every run ends in a hand review (`axiomancer-mobile/AGENTS.md` "verify:visual exit 1 ... is a judgment, not a product failure").
- CI (`.github/workflows/verify-mobile.yml`, mirrored in `verify-mechanics.yml`; lesson `parallel-journey-lists`): on `run_integration` it exports once (`smoke:bundler`, 34s on the last green run), installs Chromium (25s) and runs the nine `e2e:*` journeys with `*_REUSE_EXPORT=1` (326s of integration steps on run 39258053473). **`verify:visual` runs in no workflow**: `preview-build.yml`'s step was skipped in its last 12 runs and nothing else names it. The telemetry hook (`.claude/hooks/telemetry.mjs`) logs skills, subagents, slash commands and verb reads, never npm scripts, so no record of the suite's cost or approval latency exists.
- Code: `axiomancer-mobile/scripts/smoke-screens.mjs` (ROUTES, `selectRoutes`/`SMOKE_ONLY`, `settleDiceRoll`, the 600ms wait, the per-route loop, the console-error print), the nine export copies (`smoke-screens`, `hazard-e2e`, `encounter-routing-e2e`, `exploration-combat-roundtrip-e2e`, `labyrinth-combat-roundtrip-e2e`, `map-walk-e2e`, `fixture-e2e`, `combat-round-e2e`, `theme-switch-e2e`) plus `critique-drive.mjs` (`.critique-dist`, already with the Windows `npx.cmd` + `shell` spawn) and `perf-web.mjs` (`.perf-dist`), `smoke-bundler.mjs` (CI's one export), `scripts/ci-e2e-scope.mjs` (`screenshots/` is non-runtime), `screenshots/baseline/README.md` (the mixed-renderer note: fixture rows from "container Chromium 1194", the rest from host builds), `app/_layout.tsx` (`SplashScreen.hideAsync`), `axiomancer-mechanics/src/Game/fixtures/state-fixture.registry.ts` (11 fixtures), `pr-autofix.yml` (a workflow that pushes to a `loop:pr` head with `GH_PAT || github.token`), PF1's `[perf]` AUDIT-row filing.
- Decisions: D77 (a weekly measurement never fails a check: the same posture for the visual step on `main`), D84-D87 (code by `loop:pr` PR, T merges by hand, `pr-autofix`/`pr-resolve` push to PR heads), D88 and D37 (no card, keyword or art is touched; baselines are evidence, not art), D93 (this plot lands by PR), D94 (nothing here is T's move).
- Candidates read and resolved: "Mobile scripts spawn `npx` through a shell on Windows (lesson `e2e-export-windows`, seen 2x)" is absorbed by VE1a (moved to Rejected as briefed); "[score 5.0] The web build logs console errors on every run, and the smoke gate only prints them" stays open and is named under Follow-ups (the fail-gate on console errors is product work, not this suite's); "Promote the continent-playtest rig into a committed script" is unrelated and untouched.

## Outcome

`verify:visual` is a binary witness again: baselines rendered by one renderer of record (CI's Linux Playwright Chromium), one shared web export that is reused automatically when its inputs have not changed, a deterministic ready signal instead of a sleep, a determinism check that fails loudly, a report-only CI step on every integration run that commits each visual change's new captures to the PR for T to approve from the image diff, and a run record in telemetry and the CI step summary.

## Acceptance

- **A1** `axiomancer-mobile/scripts/lib/web-export.mjs` exports `ensureWebExport({ outDir, force, timeoutMs })`: it computes the input stamp (Decisions), reuses `<outDir>` when `<outDir>/.axm-export-stamp` matches, otherwise runs `expo export --platform web --output-dir <outDir>` (through `npx.cmd` with `shell: true` on Windows) and writes the stamp; `AXM_FORCE_EXPORT=1` always exports. A unit test covers stamp hit, stamp miss, missing dir, force, and the Windows spawn options without spawning Expo.
- **A2** Every script that exported before (`smoke-screens`, the eight `*-e2e.mjs` drivers, `critique-drive`, `perf-web`, `smoke-bundler`) calls `ensureWebExport` on the one directory `.smoke-dist`; `.critique-dist` and `.perf-dist` are gone from the scripts and `.gitignore`; a root test greps `axiomancer-mobile/scripts/` for `REUSE_EXPORT` and `spawnSync('npx'` and fails on any hit.
- **A3** `verify-mobile.yml` and `verify-mechanics.yml` drop every `*_REUSE_EXPORT` env line; CI still exports once (`smoke:bundler` writes the stamp, the journeys hit it); the last green run's integration step times are quoted in the PR body before and after.
- **A4** `smoke-screens.mjs` and `critique-drive.mjs` wait on a ready signal (`document.documentElement.dataset.axmReady === '1'` set by `app/_layout.tsx` on web after fonts and the first committed layout, plus `document.fonts.status === 'loaded'`, plus two animation frames) in place of `waitForTimeout(600)`; fixture pages and the live-fight context are closed after their shot; capture time for 13 routes on the export reused is under 18s on the same machine that measured 23.4s (quoted in the PR body).
- **A5** `SMOKE_RUNS=<n>` captures each route n times in one run and exits `4` naming any route whose captures differ byte for byte; the root test covers the verdict function; the PR body quotes a local `SMOKE_RUNS=5` run with 0 nondeterministic routes.
- **A6** Two witnesses in the VE1b PR body, run by hand and quoted: a one-token AXM colour change (reverted) is flagged by exactly the routes that render that token and no others; a comment-only change runs green and the log shows the stamp hit with no flag set.
- **A7** `verify-mobile.yml` and `verify-mechanics.yml` run `verify:visual` on every `run_integration` run as a **report-only** step (`continue-on-error`, never red on a diff): the step writes a route table (ratio, verdict) and the phase timings (export or stamp hit, capture, compare) to `$GITHUB_STEP_SUMMARY`, uploads `screenshots/current` and `screenshots/diff` as the artifact `visual-smoke-<sha>`, and on a same-repo PR with any differing or missing route commits the new captures over `screenshots/baseline/` to the PR head as one `visual: re-stamp <routes> (CI render)` commit and posts or updates one PR comment (marker `<!-- visual-smoke -->`) listing the routes with their ratios and the artifact link. `scripts/loop-pr.test.mjs` pins that the step pushes only `axiomancer-mobile/screenshots/baseline/**`, only to same-repo PR heads, and never to `main`.
- **A8** The two workflows cache `.smoke-dist` with `actions/cache` keyed on the A1 stamp hash and the Playwright browsers keyed on the installed Playwright version; a warm run (both hits) shows the visual step under 30s and a cold run under 90s in the step timings.
- **A9** `screenshots/baseline/README.md` names CI's Linux Playwright Chromium (the version `package-lock.json` pins) as the renderer of record, says that a Windows or macOS run is advisory and that glyph-edge noise of a few percent on an unchanged screen is the renderer and not the UI, and documents the PR flow (CI re-stamps, T approves by merging or requests changes). The VE1a `loop:pr` PR's first integration run re-stamps all 13 routes from CI; T's merge of that PR is the approval; `verify:visual` on `main` after the merge reports 13 matched in the step summary.
- **A10** `.claude/hooks/telemetry.mjs` logs a `script` row (and its `script-end` row with duration and outcome) for a Bash call that runs `npm run verify:visual`, `npm run e2e:<name>`, `npm run critique:drive`, `npm run smoke:bundler` or `npm run baseline:approve`, with the `matched / differing / missing` counts in `detail` when the output carries them; `telemetry.test.mjs` covers the match and the counts; `scripts/telemetry-view.mjs` prints the new kinds; the hook's header comment gains the row kind.
- **A11** `verify:visual` with no `SMOKE_ONLY` and no `SMOKE_ROUTES=all` shoots only the routes `scripts/lib/smoke-routes-for.mjs` maps from the paths changed since the merge-base with `origin/main` (plus dirty files); a path no rule names selects every route; a changed `screenshots/baseline/<route>.png` selects that route; CI always passes `SMOKE_ROUTES=all`. A unit test proves every `ROUTES` name is produced by at least one rule and that an unknown path selects all.

Measure: after ten integration runs with the visual step on `main`, the step summaries show 0 nondeterministic routes, a median warm visual step under 30s and every cold one under 90s, and `npm run telemetry --since <VE1c merge date>` lists `script` rows for `verify:visual` with durations; `verify:visual` on `main` exits 0.

## Scope

- Workspace `axiomancer-mobile`: new `scripts/lib/web-export.mjs` (+ test under `scripts/__tests__/`), `scripts/lib/page-ready.mjs`, `scripts/lib/smoke-routes-for.mjs` (+ test); changed `scripts/smoke-screens.mjs` (export call, ready wait, page/context closing, `SMOKE_RUNS`, route selection, step-summary and JSON summary output), the eight `*-e2e.mjs` drivers (export call only), `scripts/critique-drive.mjs` (export call, dir, ready wait), `scripts/perf-web.mjs` (export call, dir), `scripts/smoke-bundler.mjs` (export through the helper, keeps its `classifyExportResult` checks), `app/_layout.tsx` (the web-only ready attribute, two lines next to `SplashScreen.hideAsync`), `screenshots/baseline/README.md`, `screenshots/baseline/*.png` (re-stamped by CI in VE1a), `.gitignore` (two lines removed).
- Root: `.github/workflows/verify-mobile.yml` and `verify-mechanics.yml` (env lines removed; the visual step; the two caches), `.claude/hooks/telemetry.mjs` + `telemetry.test.mjs`, `scripts/telemetry-view.mjs` (+ test), `scripts/loop-pr.test.mjs` (A7 pins), `scripts/ci-e2e-scope.mjs` (one line: a change under `axiomancer-mobile/screenshots/baseline/` selects `run_integration`, so a restamp commit gets its confirming run; `screenshots/current` and `diff` stay non-runtime), `package.json` (the new tests join root `npm test`).
- Not touched: cards, keywords, art, saves, game rules; the `e2e:*` drivers' own click paths and waits; `preview-build.yml` (its opt-in step stays, now cheap); `march.yml`, `critique.yml`, `night.yml`; the 0.5% threshold and the 390x844 viewport.

## Consumers to update

- `axiomancer-mobile/AGENTS.md` UI evidence doctrine: the "exit 1 is a judgment" line gains "on the renderer of record; a Windows run is advisory (README)". `axiomancer-mobile/README.md` and `docs/dev-tools.md` where they name `*_REUSE_EXPORT`.
- `skills/critique.md` §3.5 and `.claude/commands/critique.md`: `critique:drive` reuses `.smoke-dist` by stamp; the `CRITIQUE_DRIVE_REUSE_EXPORT` mention goes.
- `skills/march.md` §3 "Landing a change": one line, "a `visual: re-stamp` commit from CI on the PR means the PR changed pixels; read the image diff before merging".
- `.github/workflows/README.md`: the visual step row and the cache keys.

## Save / schema contracts

None. No game data, save shape or engine type changes. The telemetry row schema gains two event kinds (`script`, `script-end`); existing rows and the viewer's sort are unchanged.

## Decisions made upfront — DO NOT ASK

- **Renderer of record is CI (T, 2026-10-19).** Baselines are what Linux Playwright Chromium at the `package-lock.json` version renders on `ubuntu-latest`. No baseline is approved from a Windows or macOS capture after VE1a merges; `baseline:approve` stays for the container case and prints a warning on `win32`/`darwin`. The 11 red routes on `main` today are therefore re-stamped by CI in VE1a's PR, not by hand (T declined the Windows restamp when shown that fresh baselines already differ by 1.5-4.5% here).
- **Report-only, with the evidence in the PR (T, 2026-10-19).** The visual step never turns a check red on a diff. The new captures are committed to the PR head so GitHub's image diff (two-up, swipe, onion skin) is the review surface; T approves by merging and requests changes in the PR. The push uses `secrets.GH_PAT || github.token` as `pr-autofix.yml` does; a commit by `github.token` triggers no workflow, and `ci-e2e-scope` runs integration for a `screenshots/baseline/` change only so the restamped head gets one confirming run, whose own diff is empty, so no second commit follows: no loop. Fork PRs get the summary and artifact only. A missing baseline (new route) is committed the same way.
- **On `main` the step reports and files nothing.** A diff on `main` can only come from a direct push that skipped integration or from a merge whose PR had no integration run; both are rare, both show in the step summary of the next `main` run. Filing a `[visual]` AUDIT row for that case is a Follow-up, not this phase.
- **The stamp.** `ensureWebExport` hashes, in sorted order, the blob ids `git ls-files -s` reports for `axiomancer-mobile/{app,components,state,lib,hooks,assets,app.json,package.json,babel.config.js,metro.config.js,tsconfig.json}`, `axiomancer-mechanics/{src,content}` and `package-lock.json`, replacing the id of any modified or untracked file in those paths with the sha256 of its current contents, plus the Expo SDK version from `node_modules/expo/package.json`. Outside a git checkout it always exports. The stamp file is JSON (`hash`, `at`, `expo`, `node`) and lives inside the export dir so a deleted dir is a miss.
- **One directory, `.smoke-dist`.** `critique-drive` and `perf-web` use it too; their old dirs are removed from `.gitignore`. Phase 94's artifact scoping for `critique:drive` concerned what the drive uploads, not where the export lives, and is unaffected.
- **The legacy flags go.** `SMOKE_REUSE_EXPORT` and the eight `*_E2E_REUSE_EXPORT` / `CRITIQUE_DRIVE_REUSE_EXPORT` / `PERF_REUSE_EXPORT` variables are removed, not kept as aliases: the stamp makes reuse the default and a flag that forces reuse past a stale export is the bug this phase removes. `AXM_FORCE_EXPORT=1` is the one override. The lesson `e2e-export-windows` is marked `guarded by` the A1 test when VE1a ships.
- **The ready signal is web-only and app-owned.** `app/_layout.tsx` sets `document.documentElement.dataset.axmReady = '1'` inside the existing effect that hides the splash screen, after `Font.isLoaded` resolves, behind `Platform.OS === 'web'`; native builds get no attribute. The scripts' `waitForReady(page)` is `waitForFunction` on the attribute and `document.fonts.status`, then two `requestAnimationFrame` ticks; the hazard routes keep `settleDiceRoll` after it. The `e2e:*` drivers are not rewritten in VE1b (their waits are route-specific and they are not the red gate); the helper is exported for them to adopt later.
- **Determinism before parallelism.** No parallel capture is built in VE1: with the export reused and the sleep gone a 13-route run is under 18s, and the determinism check (A5) is what makes any later parallelism safe. Parallel capture is a Follow-up gated on ten green `SMOKE_RUNS=2` CI runs.
- **Sensitivity and specificity are witnessed, not committed (A6).** A committed test would need a second export per run (46s) to plant a token change; the PR body quotes the two hand runs instead, with the token, the routes flagged and the exit codes. The stamp-hit half has a unit test (A1).
- **Telemetry rows come from the hook, not from the scripts.** The scripts know nothing about telemetry; the hook's Bash classifier (the same place `verb-read` matches `cat skills/<verb>.md`) matches the npm script names and parses the summary line from `tool_response`. A CI integration run is not a Claude session and writes no row; its record is the step summary. `script-end` outcome is `ok` on exit 0, `diff` on 1, `missing` on 2, `error: <code>` otherwise.
- **Route selection (A11) extends `selectRoutes`.** The rules live beside `ROUTES` so a new route must name its paths; `app/(tabs)/<tab>/**` maps to its tab's route, `app/<screen>/**` to that screen's routes, `app/devpuzzle/**` and `components/hazard/**` to `hazard-board` and both `devpuzzle-*`, `app/_layout.tsx`, `components/**` outside a route's folder, `state/**`, `lib/**`, `hooks/**`, `assets/**`, every mechanics path, `package-lock.json` and the smoke script itself to all. Fail closed like `ci-e2e-scope`. The merge-base is `git merge-base HEAD origin/main`; with no `origin/main` (a detached CI checkout) select all.
- **Sizes.** VE1a M (eleven scripts, two workflows, a test, no behaviour change in CI), VE1b M (app attribute, two scripts, hook and viewer, the witnesses), VE1c M (two workflow steps, two caches, README, the pins; its first run re-stamps), VE1d S.
- **Why asap.** The gate is red on `main` today (11 of 13) and every `loop:pr` PR that moves pixels ships them unseen; four open plots and the HP/LG queues all touch mobile screens. VE1a and VE1b block nothing and can run in parallel ticks.

## Tests matrix

- `axiomancer-mobile/scripts/__tests__/web-export.test.ts` (new): stamp hit, miss, missing dir, `force`, `AXM_FORCE_EXPORT`, Windows spawn options; pure functions, no Expo spawned.
- `axiomancer-mobile/scripts/__tests__/smoke-screens.test.ts` (extended): the `SMOKE_RUNS` verdict (`exit 4` naming routes), the step-summary table renderer, the JSON summary line.
- `axiomancer-mobile/scripts/__tests__/smoke-routes-for.test.ts` (new): every route reachable, unknown path selects all, baseline PNG path selects its route, `SMOKE_ROUTES=all` and `SMOKE_ONLY` precedence.
- Root `scripts/no-reuse-export-flags.test.mjs` (new, A2): greps `axiomancer-mobile/scripts/` and the two workflows.
- Root `scripts/loop-pr.test.mjs` (extended, A7): the push scope and target pins.
- `.claude/hooks/telemetry.test.mjs` (extended, A10): the five script matches, a non-match (`npm run verify`), the counts in `detail`, the `-end` pairing.
- `scripts/telemetry-view.test.mjs` (extended, A10): the new kinds render.
- `scripts/ci-e2e-scope.test.mjs` (extended): `screenshots/baseline/x.png` selects `run_integration` and nothing else; `screenshots/current/x.png` stays non-runtime.

## Verify gate

- `npm run verify --workspace axiomancer-mobile` and root `npm test` on every phase (lesson `mechanics-verify-misses-root-lints`); `node .claude/hooks/telemetry.test.mjs` in VE1b.
- VE1a: `AXM_FORCE_EXPORT=1 npm run verify:visual` then `npm run verify:visual` again, the second log showing the stamp hit; `npm run e2e:fixture` on the reused export.
- VE1b: `SMOKE_RUNS=5 npm run verify:visual` exits 0 or 1, never 4; the two A6 witnesses.
- VE1c: the PR's own integration run shows the visual step, the summary table, the artifact and (on VE1a's PR) the re-stamp commit; a second push to the PR shows the cache hits.
- VE1d: `npm run verify:visual` after touching only `app/(tabs)/memoir/index.tsx` shoots one route.

## Commit body template

```
<type>(mobile|ci): <title> — phase VE1<x>

Closes A<ids>. <what is true now in one line>.
Measured: <the numbers the PR body quotes>.
Brief plan/phases/phase_VE1_visual_e2e_signal.md § VE1<x>.
```

## DoD

A1-A11 all ticked across VE1a-VE1d; `verify:visual` exits 0 on `main`; the Measure line's ten-run table is in the VE1d PR body or the first `/digest` after it.

## Follow-ups (out of scope)

- Console errors as a fail-gate (candidate "[score 5.0] The web build logs console errors..."): product fixes first, then the exit code; untouched here.
- A `[visual]` AUDIT row when a `main` run differs (the PF1 `[perf]` mechanism).
- Parallel capture across pages, gated on ten green `SMOKE_RUNS=2` CI runs.
- The `e2e:*` drivers adopting `waitForReady` and booting from registry fixtures instead of click paths (eight drivers, 54 clicks, 0 fixture refs today; 11 fixtures exist).
- Desktop (1280) baselines beside the 390x844 set, once the one-column candidate ships.
- A 0.5% threshold per route instead of global, if the first ten CI runs show a route that needs it.

## Phases

### VE1a — One export, stamped, everywhere · M · closes A1, A2, A3, A9 · requires nothing
Measure: `npm run verify:visual` twice in a row; the second run's log says `reusing .smoke-dist (stamp <hash>)` and no `*_REUSE_EXPORT` string remains under `axiomancer-mobile/scripts/` or `.github/workflows/`; the PR's integration run re-stamps the 13 baselines from CI and the step after it reports 13 matched.
- Scope: `scripts/lib/web-export.mjs` + test; the eleven callers; `.gitignore`; the two workflows' env lines; `screenshots/baseline/README.md` (A9 text) and the CI-rendered PNGs. The CI re-stamp in this phase is done by the builder from the run's `visual-smoke` artifact if VE1c's step is not yet merged: download, copy over `baseline/`, commit `visual: re-stamp 13 routes (CI render, run <id>)` to the PR.
- Consumers: `AGENTS.md` doctrine line, mobile `README.md`, `docs/dev-tools.md`, `skills/critique.md`, `.claude/commands/critique.md`.
- Tests: `web-export.test.ts`, `no-reuse-export-flags.test.mjs`.
- Verify gate: mobile `verify`, root `npm test`, the double run, `e2e:fixture` on the reused export.

### VE1b — Ready signal, determinism check, run record · M · closes A4, A5, A6, A10 · requires nothing
Measure: `SMOKE_RUNS=5 npm run verify:visual` on the export reused finishes under 90s with 0 nondeterministic routes, and `npm run telemetry --tail 5` shows the `script` / `script-end` pair for it with its counts.
- Scope: `app/_layout.tsx` (web-only attribute), `scripts/lib/page-ready.mjs`, `smoke-screens.mjs` (ready wait, closing, `SMOKE_RUNS`, exit 4), `critique-drive.mjs` (ready wait), `.claude/hooks/telemetry.mjs` + header comment, `scripts/telemetry-view.mjs`.
- Consumers: none beyond the hook's own header; `CLAUDE.md`'s telemetry paragraph gains the `script` kind in one clause.
- Tests: `smoke-screens.test.ts` (verdict), `telemetry.test.mjs`, `telemetry-view.test.mjs`.
- Verify gate: mobile `verify`, root `npm test`, `node .claude/hooks/telemetry.test.mjs`, the five-run capture, the two A6 witnesses quoted.

### VE1c — The report-only CI step with the evidence in the PR · M · closes A7, A8 · requires VE1a, VE1b
Measure: on this phase's own PR the integration run shows the visual step's summary table, the `visual-smoke-<sha>` artifact and, after a deliberate one-token change pushed and reverted in the PR, one `visual: re-stamp` commit and one `<!-- visual-smoke -->` comment; the second push shows both caches hit and the step under 30s.
- Scope: the two `verify-*` workflows (step, caches, `SMOKE_ROUTES=all`, `SMOKE_RUNS=2`), `scripts/loop-pr.test.mjs`, `scripts/ci-e2e-scope.mjs` + test, `.github/workflows/README.md`, `skills/march.md` §3 one line.
- Consumers: `skills/march.md`.
- Tests: `loop-pr.test.mjs`, `ci-e2e-scope.test.mjs`.
- Verify gate: root `npm test`; the PR's own runs as the Measure says.

### VE1d — Routes from the diff · S · closes A11 · requires VE1b
Measure: with only `app/(tabs)/memoir/index.tsx` modified, `npm run verify:visual` logs `routes from diff: memoir` and shoots one route; with `package-lock.json` modified it shoots 13; CI logs `SMOKE_ROUTES=all`.
- Scope: `scripts/lib/smoke-routes-for.mjs` + test, `smoke-screens.mjs` (selection order: `SMOKE_ONLY`, then `SMOKE_ROUTES=all`, then the diff), the README's "how to run" lines.
- Consumers: `docs/dev-tools.md`.
- Tests: `smoke-routes-for.test.ts`.
- Verify gate: mobile `verify`, root `npm test`, the three Measure runs quoted.
