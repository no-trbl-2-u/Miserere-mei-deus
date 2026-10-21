# Lessons

> The domain-keyed corpus, counted (R11, 2026-10-12). Unlike
> `reflexes.md` (always read in full), this file is read **by
> offset**: a skill greps for its own `<!-- @domain:x -->` anchor and
> reads from there. Written by the **Retro** step that closes every
> shipping verb (`skills/march.md` §3 "Retro"); linted by
> `scripts/check-lessons.mjs` (root `npm test` and the post-write
> guard).
>
> **Format.** One bullet per lesson, one line, ≤500 bytes:
>
> `- **<slug>** · <trap> → <rule> · seen <N>× · last <YYYY-MM-DD> · open`
>
> or, once something enforces it, `· guarded by <hook, test or lint>`
> in place of `open`. Slugs are lowercase-kebab and unique across the
> file; skills cite them inline where they bite (`… (lesson
> \`shared-tree-sweep\`)`).
>
> **The ladder.** Seen once: logged. Seen **2×**: automated in the
> same tick (a guard check, a test, a lint) and marked `guarded by`,
> or a `PHASE_CANDIDATES` row names the automation. Seen **3× across
> verbs**: the retro may promote it to `reflexes.md` directly;
> `/oversight` reviews promotions after the fact. **At most 40 open
> lessons**: past that, graduate one (guard it) or merge two before
> adding another.
>
> **Only the loop's own moves are lessons (D94).** A trap whose fix
> is T's move (rotate or renew a token or secret, finish an OAuth,
> a console click, a tool on T's machine) is filed in
> `plan/NEEDS_T.md` instead: it never climbs this ladder and never
> becomes a `PHASE_CANDIDATES` automation row. The lint refuses a
> lesson whose rule says "T to …" and a slug in both files.
>
> **Merges.** Git merges this file and `NEEDS_T.md` by slug through
> `scripts/lessons-merge.mjs` (`.gitattributes`, registered at session
> start): two bumps of one slug become one row, and a merge that would
> break the byte or open cap is refused with conflict markers to resolve
> by hand.

<!-- @domain:deploy -->

## Deploy

- **shared-tree-sweep** · background march/night loops share one working tree; a live loop swept an uncommitted local edit into its own commit (PR #120) → pause the loop before local work, or ship from an isolated `git worktree add --detach <tmp> origin/main` and push by SHA · seen 1× · last 2026-07-18 · open
- **parallel-journey-lists** · `verify-mechanics.yml` and `verify-mobile.yml` carry parallel copies of the browser-journey steps, and CI runs each `e2e:*` script alone, never the `e2e:minigames` chain (PR #216) → edit both workflows together; wire a harness as its own step · seen 1× · last 2026-08-19 · open
- **fs-walk-test-timeout** · `trial-set-removal`'s repo walk (mechanics `src` plus all of `axiomancer-mobile`) passed alone in 1.2s but hit vitest's 5s default inside a full `verify` on a loaded Windows host, once in three runs (ship HP4a) → a red mechanics verify on a test the diff never touched: rerun that file alone before patching; if it times out twice, give the walk an explicit timeout · seen 1× · last 2026-10-20 · open
- **green-is-not-ran** · two green checks on PR #216 were hollow, and a 200 from a GitHub write did not mean the body changed → confirm a new CI step by grepping the job log for its own output; verify the effect, not the response · seen 1× · last 2026-08-19 · open
- **telemetry-add-add** · parallel PR branches each commit the same telemetry shard, so the second merge conflicts add/add (T5 PRs #376-#381) → union the rows sorted by timestamp; never auto-merge (D86) · seen 1× · last 2026-09-25 · guarded by scripts/pr-resolve.mjs union merge (scripts/loop-pr.test.mjs)
- **verify-gap-claims** · an explorer reported a CI gap open, citing an AUDIT row whose RESOLVED note sat below its excerpt (map-revamp M0) → read the whole row and the live code before filing work on a gap claim · seen 1× · last 2026-09-25 · open
- **workflow-level-concurrency** · ci-autofix's workflow-level group let skipped green runs displace the real queued red one: 2 ran, 32 cancelled (R0) → put concurrency on the job, after the `if`, in its own group, never `nexus-loop` · seen 1× · last 2026-09-28 · guarded by scripts/loop-pr.test.mjs
- **cross-branch-telemetry-push** · `_claude-skill.yml`'s stranded-rows step pulled `--rebase origin main` and pushed `HEAD:main`; on a PR branch that would push the PR's commits to main (R11 review) → push only to the branch HEAD is on (`loop/*` or the run's ref) · seen 1× · last 2026-10-12 · guarded by scripts/loop-pr.test.mjs
- **union-edit-doubles** · a union merge of an append-only file keeps both the old and edited form of a row both sides touched (hunt) → count lines three ways (base, ours, theirs) and keep each only as often as the merge implies · seen 1× · last 2026-10-12 · guarded by scripts/loop-pr.test.mjs (unionMerge)
- **union-anchor-split** · pr-resolve placed theirs' lines by a forward anchor walk, so generic shared lines (blank, "- viewport: n/a") jumped it ahead: rows moved Pending to Done split and each merge added ~85 blank lines (CRITIQUE.md, #542) → take line order from a real diff3 (`git merge-file --union`) and only trim counts after · seen 1× · last 2026-10-14 · guarded by scripts/loop-pr.test.mjs (unionMerge)
- **deploy-check-grace** · on a plan-only HEAD `npm run deploy:check` waits out its 120s ingest grace before exiting 0, so a foreground call under a 120s tool timeout was killed and read as a hang (critique 87, again 90-96; 94 waited on a live verify-mobile) → run it with a timeout above 150s, or read `gh run list --branch main` for the last code commit's `verify-*` runs; automation filed in `PHASE_CANDIDATES.md` · seen 8× · last 2026-10-19 · open

<!-- @domain:data -->

## Data

- **court-validates-laws** · an A/B court that swapped cards ratified a seat that broke the 5/5/5 colour law (Phase D8, 10ec4fe8) → validate the structural laws inside the harness before measuring · seen 1× · last 2026-07-18 · open
- **iff-rule-needs-sweep** · D91 says a FREE pill iff a FREE line, but BT2a pinned it with one card per kind and a test pinned `programFreeCell('DEAL 3.')` to null, so A Plain Blow and six Blood Price faces shipped with no pill (critique 85) → pin an "iff" rule with a sweep over every lane card, not single examples · seen 1× · last 2026-10-14 · guarded by the lane sweep in combat-card-vm.test.ts
- **mechanics-tests-no-at** · vitest green, but `type-check:tests` failed on `Array.prototype.at` (lib below es2022), `.quantity` off the `Item` union (B3c), an `as const` case table typed as `string[]` (HP2a) → index with `[length - 1]`, narrow unions, type case tables; run the full `npm run verify` before the first push · seen 2× · last 2026-10-19 · guarded by `npm run verify` (its `type-check:tests` leg)
- **hermetic-io-allowlist** · a new mechanics test that reads a committed report (`fs`) failed `hermeticity.audit.test.ts` (ship HP2a) → a test that must read disk goes on that file's `IO_ALLOWLIST` in the same commit; prefer a pure function the test can call · seen 1× · last 2026-10-19 · open

<!-- @domain:review -->

## Review

<!-- @domain:loop -->

## Loop

- **plan-only-push-race** · a plan-only `push HEAD:main` from a worktree branch was refused because a telemetry tick-end commit landed on main between the fetch and the push (plot R12a) → commit first, then `git fetch origin && git rebase origin/main && git push origin HEAD:main` as one act · seen 1× · last 2026-10-12 · open
- **loop-pr-label-missing** · `gh pr create` fails and opens nothing on a label the repo lacks: no `loop:pr` label (ship R12a, #505); `area:mechanics` guessed from the package name when the areas are the fixed six `cards combat mobile ui ci loop` and engine work is `area:combat` (plot HP4) → create the label first (`skills/march.md` §3) and take `area:*` from `gh label list`, never a workspace name; automation filed in `PHASE_CANDIDATES.md` · seen 2× · last 2026-10-19 · open
- **brief-dnum-in-comments** · a brief's D-number citations copied into code comments failed root `check-comments`, which the workspace-scoped gate skips (ship RH1) → D-numbers go in commit and PR bodies; code comments state the rule; run root `npm test` on any source change; BT2b's new test headers cited the ruling the same way (ship BT2b); B3a named its phase in a barrel banner the same way (ship B3a) · seen 3× · last 2026-10-16 · guarded by scripts/check-comments.mjs (root npm test)
- **brief-pointer-drift** · the CS1 brief named atlas budget bands R10c had deleted and a truth-sources table that never existed (ship CS1; ship DL1a, HP4a, DL1c named a `docs/dev-tools.md` that never existed) → before building, grep every file anchor a brief names; when one is gone, restate it from the ruling it cites and record the call under Decisions; automation filed in `PHASE_CANDIDATES.md` · seen 4× · last 2026-10-21 · open
- **mechanics-verify-misses-root-lints** · `npm run verify -w axiomancer-mechanics` passed, but root `npm test` failed `check-comments` on D-numbers in new code comments (ship CS1) → a phase that adds mechanics code runs root `npm test` before its first commit; code comments name no decision numbers · seen 1× · last 2026-10-13 · guarded by scripts/check-comments.mjs (root npm test)
- **gate-commit-count** · the expand gate's "20 commits after Last pass" read 37 by `git rev-list --count` an hour after pass 33, because merged PR branches carry their own commits, but 12 on main's first-parent line (march → iterate, 2026-10-14) → count gate distances with `git rev-list --count --first-parent <sha>..HEAD`; `skills/march.md` §3 now says so · seen 1× · last 2026-10-14 · open
- **plot-from-dirty-worktree** · `/plot` Step 5's rebase cannot run in a worktree holding uncommitted prototype code, and stashing it risks the shared stash stack (plot BT2) → commit the plan files from `git worktree add --detach <tmp> origin/main`, junction `node_modules` there before root `npm test`, push, remove the temp worktree · seen 1× · last 2026-10-13 · open
- **parallel-lane-scratchpad** · sibling march lanes share one session scratchpad; a sibling rewrote this lane's `g.sh` to point at its own worktree (ship BT2a) → each lane keeps temp files in its own `scratchpad/<lane>/` subfolder; a sibling also rewrote this lane's scratchpad-root `issue.md` (ship BT2b); automation filed in `PHASE_CANDIDATES.md` · seen 2× · last 2026-10-14 · open
- **worktree-no-env** · `loop-issue.mjs phase-open` could not run in an isolated agent worktree: it has no `.env`, and the isolation guard refuses `export GH_TOKEN=$(gh auth token)` (ship SF1); `deploy-check.mjs` stopped the same way (critique 86) → loop-issue borrows the keyring token (fillGhEnv); for deploy-check, run it via `node -e` setting `process.env.GH_TOKEN` from a file; its fix is in the keyring-fallback `PHASE_CANDIDATES` row · seen 2× · last 2026-10-14 · open
- **sed-flattens-crlf** · `sed -i` on a CRLF test file rewrote every line, so a 1-line edit showed as 620 changed lines (ship SF1) → edit CRLF files byte-wise or with the Edit tool, and read `git diff --stat` before staging; again Python `open(p,'w')` on Windows wrote two LF barrels back as CRLF (ship B3b, fixed by review on #584); automation filed in `PHASE_CANDIDATES.md` · seen 2× · last 2026-10-16 · open
- **checks-not-yet-registered** · `gh pr checks --watch` run straight after `gh pr create` exits 0 with "no checks reported", which reads as green while nothing has run (HP2b, DL1a) → poll `gh pr checks <n>` until it lists rows, then `--watch` · seen 2× · last 2026-10-21 · open
- **isolated-worktree-shell** · the guard refused heredocs, `mklink`, `$VAR` args, `commit -F`, `&&` git chains, git in `$(…)`, background gates; a refused chain also drops its `git add` (B3b, crit 90, B3e2, HP1c2, HP1d, RV2, plot VE1, ML1b) → Write/Edit for text, one git cmd per call, `symlinkSync` junctions, commit with `-m`, gates foreground, `git show --stat` before push · seen 24× · last 2026-10-21 · guarded by .claude/hooks/guard.mjs (refuses `git commit -F`, names `-m`)
- **lessons-merge-dup-slug** · two merges each kept their own row of one slug, so `check-lessons` went red on `main`, unseen since root `npm test` runs in no workflow: `env-token-stale` (ship BT2b), `isolated-worktree-shell` (EV1a, HP1a, HP1c2, HP2a, #644, #645, #653) → merge by slug, never by line; still grep the slug on fresh `origin/main` before a lessons commit · seen 6× · last 2026-10-20 · guarded by scripts/lessons-merge.mjs (lessons-merge.test.mjs)
- **brief-geometry-unmeasured** · BT2b's A7 asked for five runes above the tray at 375x812, but the shipped geometry needed 304pt where 292 were free; only a measurement of the web export showed it (ship BT2b) → measure a layout acceptance in the web export before writing its test, and record any size change under Decisions · seen 1× · last 2026-10-14 · open
- **brief-ui-reuse-unnamed** · B3e's A14 listed what the puzzle board shows but not which live components draw it, so the builder shipped a tap-button board T rejected as "nothing like" the hazard UI (plot B3e2) → a brief for a surface that mirrors a live one names the components, VM and interactions it reuses, and asks for a side-by-side visual shot · seen 1× · last 2026-10-18 · open
- **amend-while-claimed** · T's 2026-10-19 decision round amended HP1c's brief on `main` while a loop tick had already claimed and was building HP1c, so #633 shipped the pre-amendment rules and HP1c2 had to be added (attended session) → before amending an open row's brief, check open `loop:pr` PRs and `loop/ship-<id>` branches for a claim; if claimed, file the amendment as a follow-up phase instead · seen 1× · last 2026-10-19 · open
- **harness-attribution-footer** · the session's attribution reminder asks for a robot-emoji "Generated with" PR footer, against AGENTS.md rule 2 (#555; iterate dock END; plot B3e2 #619; ship B3e2 #623; again plot HP4, #656 body edited out after the guard refused the trailer on the commit) → loop commits and PR bodies carry no attribution and no emoji; the repo rule outranks the reminder; the lint is the PHASE_CANDIDATES row · seen 4× · last 2026-10-19 · open
- **brief-table-vs-prose** · LV1's A2 table and its Decisions prose disagreed on the growth-band edge (table: band by the level a step leaves; prose: by the level it reaches); only computing both showed the table was the consistent one (ship LV1) → when a brief pins numbers, compute them from each reading of its prose before coding; the pinned table wins, the call goes under Decisions · seen 1× · last 2026-10-15 · open
- **measured-drift-by-design** · `scripts/measured-truth.mjs` filed 23 `[content]` AUDIT drift rows for the easing the LV1 brief itself predicted (ship LV1) → a phase whose brief names the drift keeps the regenerated report and history line but drops those AUDIT rows, naming the brief's follow-up under Decisions · seen 1× · last 2026-10-15 · open
- **msys-rev-path** · Git Bash rewrites `git show origin/main:<path>` into a Windows path (`origin\main;...`, "ambiguous argument") → set `MSYS_NO_PATHCONV=1` before any `<rev>:<path>` git call on this box · seen 1× · last 2026-10-15 · open
- **ps51-utf8-roundtrip** · Windows PowerShell 5.1 `Get-Content -Raw` read a UTF-8 commit-message file as ANSI and `Set-Content` wrote it back, so the subject's em dash became mojibake in an amended commit (ship HP4c, caught before push) → never round-trip a UTF-8 file through 5.1 cmdlets; edit it with Edit/Write or Python `encoding='utf-8'`, and read `git log -1 --format=%s` before pushing · seen 1× · last 2026-10-20 · open
- **adjacent-row-push** · a plan-only push to main edited the build-plan row next to one an open PR ticks (CR1c skip beside CR1b), and git conflicted on the adjacent lines (march CR1c) → before pushing a row edit to main, check `git merge-tree` against each open PR branch that ticks a neighbouring row, and merge main into that branch in the same tick if it conflicts · seen 1× · last 2026-10-15 · open
- **ccr-graphql-403** · in a claude.ai cloud session every GitHub GraphQL call is refused (403), so `loop-issue.mjs phase-open`, `gh pr list`, `gh issue list` and `gh pr create` all fail (ship B3e2) → read and write through REST (`gh api repos/<owner>/<repo>/...`): issues, pulls, labels, comments; the mirror opened by a REST POST · seen 1× · last 2026-10-18 · open
- **plot-evidence-on-main** · a plot measured its evidence in the session worktree, whose branch was 72 files behind `origin/main`; re-measured on `main` the numbers changed (12 to 13 routes, 8 to 11 red) before they reached the brief (plot VE1) → before a brief quotes a number, switch the worktree to a branch cut from fresh `origin/main` and measure there · seen 1× · last 2026-10-19 · open
- **background-then-end-turn** · a CI run backgrounded work and ended its turn "waiting": EV1c's Stryker runs were killed, and the RV1b reviewer's three background sub-agents posted no verdict on PR #610 → open the PR before any long run, then block on it; never end a CI turn on a live background job or sub-agent · seen 2× · last 2026-10-17 · guarded by scripts/loop-pr.test.mjs (review run_in_background: false)
- **hook-classifier-live-witness** · the telemetry hook's new `script` classifier passed its synthetic payload tests, but its first live rows logged a heredoc that only mentioned `npm run verify:visual` as a run and read `ok` from a `; echo` that hid the script's exit 1 (ship VE1b) → after changing a hook classifier, run the real command once in the session, read the row it wrote, and add a test for each live miss · seen 1× · last 2026-10-20 · open
- **plot-skips-deadlines** · `/plot` Step 4 updates the build plan, the brief and the candidates, never `plan/deadlines.md`, so HP4a-HP4f were plotted with no deadline Item and the next chat opened on a demo T had already played (plot DL1; again plot ML1) → a plot edits the Items table in the same commit: a date or an `## Unscheduled` line per added row, and an edit to any Item it supersedes · seen 2× · last 2026-10-20 · guarded by scripts/check-deadlines.mjs (root npm test)
- **line-anchored-row-regex** · `deadlines-lib.mjs`'s `PHASE_ROW` matched a single line, so every wrapped build-plan row parsed as `Requires nothing` and open attended rows were announced ready for T (plot DL1) → join a row's continuation lines before parsing its clauses · seen 1× · last 2026-10-20 · open
- **needs-t-bump-overflow** · bumping a `plan/NEEDS_T.md` row's `seen`/workaround text pushed it to 516 bytes; a plan-only PR merged and root `npm test` went red on `main` (crit 98, IT1a) → after any NEEDS_T or lessons edit run `node scripts/check-lessons.mjs` before commit; trim the row, never the count · seen 1× · last 2026-10-20 · open

<!-- @domain:mobile -->

## Mobile

- **sentry-esm-in-jest** · `@sentry/react-native` ships ESM Jest cannot parse; no suite had loaded `lib/monitoring.ts` until the combat panel imported it, so every panel suite would fail on `export` (ship PF3) → stub a native SDK in `jest.setup.ts` before a component imports it; a suite wanting spies mocks it with `mock`-prefixed factory vars · seen 1× · last 2026-10-14 · guarded by axiomancer-mobile/jest.setup.ts (Sentry stub)
- **reanimated4-spring-defaults** · `withSpring` given only damping and stiffness inherits Reanimated 4's mass 4 and energyThreshold 6e-9, so the tray dice swung about 20s and the skip layer ate the first tap; only a live wait on the built app showed it (iterate drive-settle) → name mass and energyThreshold on every spring; prove a UI wait signal on the web export before trusting it · seen 1× · last 2026-10-14 · open
- **jest-mock-factory-scope** · a `jest.mock` factory written with JSX or `jest.requireActual<typeof import(...)>` failed babel's out-of-scope check (ship PF4) → build the stub with `require('react')` and `createElement` inside the factory, as `EquipmentDock.test.tsx` does · seen 1× · last 2026-10-14 · open
- **brief-e2e-script-paths** · the PF4 brief's verify gate named `node scripts/<x>-e2e.mjs` from the root, but the journeys live in `axiomancer-mobile/scripts/` (ship PF4) → run journeys as `npm run e2e:<name> -w axiomancer-mobile` (the package.json names) whatever path a brief gives · seen 1× · last 2026-10-14 · open
- **spy-on-preset-mock** · `jest.spyOn(AccessibilityInfo, 'announceForAccessibility')` returned react-native's preset `jest.fn`, so `restoreAllMocks` (which the hermeticity audit demands) neither restored nor cleared it, and calls leaked across tests (iterate sacfloor announce) → in a file that spies on a react-native preset mock, tear down with `jest.clearAllMocks(); jest.restoreAllMocks();` · seen 1× · last 2026-10-15 · open
- **e2e-export-windows** · journeys and `verify:visual` spawn `npx expo export` via `spawnSync` with no shell; on Windows (`npx.cmd`) it exits 3 (ship CR1a, ship B3e; plot VE1: `with-env.mjs` spawning `npx` hit `EINVAL` the same way) → export only through `scripts/lib/web-export.mjs` (`npx.cmd` + shell on Windows) · seen 3× · last 2026-10-19 · guarded by `axiomancer-mobile/scripts/web-export.test.mjs` (spawn spec) + `scripts/no-reuse-export-flags.test.mjs`
- **gate-router-identity** · a root gate whose effect lists `router` in its deps re-runs every render (`useRouter()` is a fresh object), so with no latch it re-pushes its route when another route moves the pathname: `EventGate` stacked its screen twice, `LabyrinthGate` buried a labyrinth fight (ship CR1b) → latch each gate push once per session, and test it with a fresh router object per render · seen 2× · last 2026-10-15 · open
- **visual-baseline-renderer** · on the Linux CI runner `verify:visual` diffs every route (1.4-39% px, root worst) against the committed baselines, so its exit code says nothing about the change (ship HP1b, ship HP3a) → run `SMOKE_ONLY=<shots the change moves> npm run verify:visual`, read those PNGs, copy only a moved one into `baseline/`, call the rest renderer drift · seen 2× · last 2026-10-19 · guarded by `SMOKE_ONLY` (smoke-screens `selectRoutes` + test)
- **labyrinth-roundtrip-flake** · `e2e:labyrinth-roundtrip` failed once in CI ("room 4 fountain: `labyrinth-poi-fountain` never appeared", stuck on `/combat-encounter`) on a PR that only added a dataset attribute; it passed 3/3 locally on the same export and green on rerun (ship VE1b, #663) → reproduce a red journey locally 3× before touching code; if it passes, rerun the failed job once and record it here · seen 1× · last 2026-10-20 · open
- **token-witness-oracle** · VE1b's A6 colour witness first changed `heal`, which no route renders at boot, so its 13 matched proved nothing about sensitivity; only a DOM computed-style probe of each route showed it (ship VE1b) → before a token-change witness, probe the 13 routes' computed colours and pick a token they render, so the expected routes are known before the run · seen 1× · last 2026-10-20 · open
- **platform-seam-is-expo-only** · a new non-expo seam (`lib/platform/clipboard.ts`, web Clipboard + core `Share`) failed `lib/platform/__tests__/boundary.test.ts`, which demands exactly one `expo-*` re-export per module there (ship HP2c) → `lib/platform/` is the expo-decouple seam only; a seam over react-native core or a bare-RN library lives in `lib/` · seen 1× · last 2026-10-19 · guarded by axiomancer-mobile/lib/platform/__tests__/boundary.test.ts
- **empty-is-not-absent** · a failed response read as a negative result, 3× in one session: an invalid `per_page` errored with an empty `result` and the drain logged DRAINED over 1,876 live deployments; a connector’s `{}` read as "unreachable"; a sign-in page read as "needs credentials" when a `resourcekey` was missing (plot IT1) → assert the call succeeded before believing it found nothing; listing but not fetching is no auth signature · seen 3× · last 2026-10-19 · open
- **shared-jest-cache-eperm** · two worktree lanes ran mobile jest at once on Windows; one suite failed to load on EPERM reading `%TEMP%/jest` transform cache, not on its code (ship HP4b) → a `Test suite failed to run` naming `jest-transform-cache` + EPERM is a cache race: re-run that suite alone, and quote both runs in the PR's Verify · seen 1× · last 2026-10-20 · open

## Adding a domain

Append a new `<!-- @domain:<name> -->` anchor + `##` heading
above this section. Keep domain names short and stable — skills
reference them by name (`grep '@domain:deploy'`), so a rename
is a breaking change to every skill that reads this file.
