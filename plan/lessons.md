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

<!-- @domain:deploy -->

## Deploy

- **shared-tree-sweep** · background march/night loops share one working tree; a live loop swept an uncommitted local edit into its own commit (PR #120) → pause the loop before local work, or ship from an isolated `git worktree add --detach <tmp> origin/main` and push by SHA · seen 1× · last 2026-07-18 · open
- **parallel-journey-lists** · `verify-mechanics.yml` and `verify-mobile.yml` carry parallel copies of the browser-journey steps, and CI runs each `e2e:*` script alone, never the `e2e:minigames` chain (PR #216) → edit both workflows together; wire a harness as its own step · seen 1× · last 2026-08-19 · open
- **green-is-not-ran** · two green checks on PR #216 were hollow, and a 200 from a GitHub write did not mean the body changed → confirm a new CI step by grepping the job log for its own output; verify the effect, not the response · seen 1× · last 2026-08-19 · open
- **telemetry-add-add** · parallel PR branches each commit the same telemetry shard, so the second merge conflicts add/add (T5 PRs #376-#381) → union the rows sorted by timestamp; never auto-merge (D86) · seen 1× · last 2026-09-25 · guarded by scripts/pr-resolve.mjs union merge (scripts/loop-pr.test.mjs)
- **verify-gap-claims** · an explorer reported a CI gap open, citing an AUDIT row whose RESOLVED note sat below its excerpt (map-revamp M0) → read the whole row and the live code before filing work on a gap claim · seen 1× · last 2026-09-25 · open
- **workflow-level-concurrency** · ci-autofix's workflow-level group let skipped green runs displace the real queued red one: 2 ran, 32 cancelled (R0) → put concurrency on the job, after the `if`, in its own group, never `nexus-loop` · seen 1× · last 2026-09-28 · guarded by scripts/loop-pr.test.mjs
- **cross-branch-telemetry-push** · `_claude-skill.yml`'s stranded-rows step pulled `--rebase origin main` and pushed `HEAD:main`; on a PR branch that would push the PR's commits to main (R11 review) → push only to the branch HEAD is on (`loop/*` or the run's ref) · seen 1× · last 2026-10-12 · guarded by scripts/loop-pr.test.mjs
- **union-edit-doubles** · a union merge of an append-only file keeps both the old and edited form of a row both sides touched (hunt) → count lines three ways (base, ours, theirs) and keep each only as often as the merge implies · seen 1× · last 2026-10-12 · guarded by scripts/loop-pr.test.mjs (unionMerge)
- **union-anchor-split** · pr-resolve placed theirs' lines by a forward anchor walk, so generic shared lines (blank, "- viewport: n/a") jumped it ahead: rows moved Pending to Done split and each merge added ~85 blank lines (CRITIQUE.md, #542) → take line order from a real diff3 (`git merge-file --union`) and only trim counts after · seen 1× · last 2026-10-14 · guarded by scripts/loop-pr.test.mjs (unionMerge)
- **deploy-check-grace** · on a plan-only HEAD `npm run deploy:check` waits out its 120s ingest grace before exiting 0, so a foreground call under a 120s tool timeout was killed and read as a hang (critique 87, again critique 90, 91, 92, 93 and 94; in 94 HEAD was a code merge whose verify-mobile was still running) → run it with a timeout above 150s, or read `gh run list --branch main` for the last code commit's `verify-*` runs; automation filed in `PHASE_CANDIDATES.md` · seen 6× · last 2026-10-18 · open

<!-- @domain:data -->

## Data

- **court-validates-laws** · an A/B court that swapped cards ratified a seat that broke the 5/5/5 colour law (Phase D8, 10ec4fe8) → validate the structural laws inside the harness before measuring · seen 1× · last 2026-07-18 · open
- **iff-rule-needs-sweep** · D91 says a FREE pill iff a FREE line, but BT2a pinned it with one card per kind and a test pinned `programFreeCell('DEAL 3.')` to null, so A Plain Blow and six Blood Price faces shipped with no pill (critique 85) → pin an "iff" rule with a sweep over every lane card, not single examples · seen 1× · last 2026-10-14 · guarded by the lane sweep in combat-card-vm.test.ts
- **mechanics-tests-no-at** · vitest ran a new suite green, but `type-check:tests` failed on `Array.prototype.at` (its lib is below es2022) and on `.quantity` read off the `Item` union (ship B3c) → in mechanics tests index with `[length - 1]` and narrow `Item` with `'quantity' in i`; run the full `npm run verify`, not just vitest, before the first push · seen 1× · last 2026-10-16 · open

<!-- @domain:review -->

## Review

<!-- @domain:loop -->

## Loop

- **plan-only-push-race** · a plan-only `push HEAD:main` from a worktree branch was refused because a telemetry tick-end commit landed on main between the fetch and the push (plot R12a) → commit first, then `git fetch origin && git rebase origin/main && git push origin HEAD:main` as one act · seen 1× · last 2026-10-12 · open
- **loop-pr-label-missing** · the first `loop:pr` PR after R11 failed at `gh pr create`: the repo had no `loop:pr` label, and the PR cap and claims read that label (ship R12a, #505) → ensure the label exists before `gh pr create`; `skills/march.md` §3 "Landing a change" now runs `gh label create … || true` first · seen 1× · last 2026-10-13 · open
- **brief-dnum-in-comments** · a brief's D-number citations copied into code comments failed root `check-comments`, which the workspace-scoped gate skips (ship RH1) → D-numbers go in commit and PR bodies; code comments state the rule; run root `npm test` on any source change; BT2b's new test headers cited the ruling the same way (ship BT2b); B3a named its phase in a barrel banner the same way (ship B3a) · seen 3× · last 2026-10-16 · guarded by scripts/check-comments.mjs (root npm test)
- **brief-pointer-drift** · the CS1 brief named atlas budget bands R10c had deleted and a truth-sources table that never existed (ship CS1) → before building, grep every file anchor a brief names; when one is gone, restate it from the ruling it cites and record the call under Decisions · seen 1× · last 2026-10-13 · open
- **mechanics-verify-misses-root-lints** · `npm run verify -w axiomancer-mechanics` passed, but root `npm test` failed `check-comments` on D-numbers in new code comments (ship CS1) → a phase that adds mechanics code runs root `npm test` before its first commit; code comments name no decision numbers · seen 1× · last 2026-10-13 · guarded by scripts/check-comments.mjs (root npm test)
- **gate-commit-count** · the expand gate's "20 commits after Last pass" read 37 by `git rev-list --count` an hour after pass 33, because merged PR branches carry their own commits, but 12 on main's first-parent line (march → iterate, 2026-10-14) → count gate distances with `git rev-list --count --first-parent <sha>..HEAD`; `skills/march.md` §3 now says so · seen 1× · last 2026-10-14 · open
- **plot-from-dirty-worktree** · `/plot` Step 5's rebase cannot run in a worktree holding uncommitted prototype code, and stashing it risks the shared stash stack (plot BT2) → commit the plan files from `git worktree add --detach <tmp> origin/main`, junction `node_modules` there before root `npm test`, push, remove the temp worktree · seen 1× · last 2026-10-13 · open
- **parallel-lane-scratchpad** · sibling march lanes share one session scratchpad; a sibling rewrote this lane's `g.sh` to point at its own worktree (ship BT2a) → each lane keeps temp files in its own `scratchpad/<lane>/` subfolder; a sibling also rewrote this lane's scratchpad-root `issue.md` (ship BT2b); automation filed in `PHASE_CANDIDATES.md` · seen 2× · last 2026-10-14 · open
- **worktree-no-env** · `loop-issue.mjs phase-open` could not run in an isolated agent worktree: it has no `.env`, and the isolation guard refuses `export GH_TOKEN=$(gh auth token)` (ship SF1); `deploy-check.mjs` stopped the same way (critique 86) → loop-issue borrows the keyring token (fillGhEnv); for deploy-check, run it via `node -e` setting `process.env.GH_TOKEN` from a file; its fix is in the keyring-fallback `PHASE_CANDIDATES` row · seen 2× · last 2026-10-14 · open
- **sed-flattens-crlf** · `sed -i` on a CRLF test file rewrote every line, so a 1-line edit showed as 620 changed lines (ship SF1) → edit CRLF files byte-wise or with the Edit tool, and read `git diff --stat` before staging; again Python `open(p,'w')` on Windows wrote two LF barrels back as CRLF (ship B3b, fixed by review on #584); automation filed in `PHASE_CANDIDATES.md` · seen 2× · last 2026-10-16 · open
- **lessons-merge-dup-slug** · GS1 and BT2a each added `env-token-stale`; the merge kept both rows, so `check-lessons` went red on `main`, unseen because root `npm test` runs in no workflow (ship BT2b); again `isolated-worktree-shell` from #549 and #562 (ship EV1a) → before a lessons commit, grep the slug on fresh `origin/main` and bump the existing row; automation is the candidate "root `npm test` runs in no workflow" · seen 2× · last 2026-10-15 · open
- **isolated-worktree-shell** · the guard refused heredocs, `mklink`, `$VAR` args, the commit file flag (even quoted), `&&` git chains, git in `$(…)`, background gates (BT2b, PF3, EV1a, LV1, RV1a, iter.); a refused chain also drops its `git add` (ship EV1b+d B3b, critique 90) → Write/Edit tool for text, one git cmd per call, `symlinkSync` junctions, commit with `-m`, gates foreground · seen 14× · last 2026-10-18 · guarded by .claude/hooks/guard.mjs (refuses `git commit -F`, names `-m`)
- **isolated-worktree-shell** · the guard refused heredocs, `mklink`, `$VAR` args, the commit file flag (even quoted), `&&` git chains, git in `$(…)`, background gates; a refused chain also drops its `git add` (B3b, critique 90, B3e2) → Write/Edit tool for text, one git cmd per call, `symlinkSync` junctions, commit with `-m`, gates foreground, `git show --stat` before push · seen 14× · last 2026-10-18 · guarded by .claude/hooks/guard.mjs (refuses `git commit -F`, names `-m`)
- **brief-geometry-unmeasured** · BT2b's A7 asked for five runes above the tray at 375x812, but the shipped geometry needed 304pt where 292 were free; only a measurement of the web export showed it (ship BT2b) → measure a layout acceptance in the web export before writing its test, and record any size change under Decisions · seen 1× · last 2026-10-14 · open
- **brief-ui-reuse-unnamed** · B3e's A14 listed what the puzzle board shows but not which live components draw it, so the builder shipped a tap-button board T rejected as "nothing like" the hazard UI (plot B3e2) → a brief for a surface that mirrors a live one names the components, VM and interactions it reuses, and asks for a side-by-side visual shot · seen 1× · last 2026-10-18 · open
- **harness-attribution-footer** · the session's attribution reminder asked for a robot-emoji "Generated with" PR footer, and PR #555 opened with it against AGENTS.md rule 2 (iterate dock END; plot B3e2, PR #619; ship B3e2, PR #623, edited out) → loop commits and PR bodies carry no attribution line and no emoji; the repo rule outranks the reminder; edit the body if one slips through; the lint is PHASE_CANDIDATES "PR-body attribution lint" · seen 3× · last 2026-10-18 · open
- **brief-table-vs-prose** · LV1's A2 table and its Decisions prose disagreed on the growth-band edge (table: band by the level a step leaves; prose: by the level it reaches); only computing both showed the table was the consistent one (ship LV1) → when a brief pins numbers, compute them from each reading of its prose before coding; the pinned table wins, the call goes under Decisions · seen 1× · last 2026-10-15 · open
- **measured-drift-by-design** · `scripts/measured-truth.mjs` filed 23 `[content]` AUDIT drift rows for the easing the LV1 brief itself predicted (ship LV1) → a phase whose brief names the drift keeps the regenerated report and history line but drops those AUDIT rows, naming the brief's follow-up under Decisions · seen 1× · last 2026-10-15 · open
- **msys-rev-path** · Git Bash rewrites `git show origin/main:<path>` into a Windows path (`origin\main;...`, "ambiguous argument") → set `MSYS_NO_PATHCONV=1` before any `<rev>:<path>` git call on this box · seen 1× · last 2026-10-15 · open
- **adjacent-row-push** · a plan-only push to main edited the build-plan row next to one an open PR ticks (CR1c skip beside CR1b), and git conflicted on the adjacent lines (march CR1c) → before pushing a row edit to main, check `git merge-tree` against each open PR branch that ticks a neighbouring row, and merge main into that branch in the same tick if it conflicts · seen 1× · last 2026-10-15 · open
- **ccr-graphql-403** · in a claude.ai cloud session every GitHub GraphQL call is refused (403), so `loop-issue.mjs phase-open`, `gh pr list`, `gh issue list` and `gh pr create` all fail (ship B3e2) → read and write through REST (`gh api repos/<owner>/<repo>/...`): issues, pulls, labels, comments; the mirror opened by a REST POST · seen 1× · last 2026-10-18 · open
- **background-then-end-turn** · a CI run backgrounded work and ended its turn "waiting": EV1c's Stryker runs were killed, and the RV1b reviewer's three background sub-agents posted no verdict on PR #610 → open the PR before any long run, then block on it; never end a CI turn on a live background job or sub-agent · seen 2× · last 2026-10-17 · guarded by scripts/loop-pr.test.mjs (review run_in_background: false)

<!-- @domain:mobile -->

## Mobile

- **sentry-esm-in-jest** · `@sentry/react-native` ships ESM Jest cannot parse; no suite had loaded `lib/monitoring.ts` until the combat panel imported it, so every panel suite would fail on `export` (ship PF3) → stub a native SDK in `jest.setup.ts` before a component imports it; a suite wanting spies mocks it with `mock`-prefixed factory vars · seen 1× · last 2026-10-14 · guarded by axiomancer-mobile/jest.setup.ts (Sentry stub)
- **reanimated4-spring-defaults** · `withSpring` given only damping and stiffness inherits Reanimated 4's mass 4 and energyThreshold 6e-9, so the tray dice swung about 20s and the skip layer ate the first tap; only a live wait on the built app showed it (iterate drive-settle) → name mass and energyThreshold on every spring; prove a UI wait signal on the web export before trusting it · seen 1× · last 2026-10-14 · open
- **jest-mock-factory-scope** · a `jest.mock` factory written with JSX or `jest.requireActual<typeof import(...)>` failed babel's out-of-scope check (ship PF4) → build the stub with `require('react')` and `createElement` inside the factory, as `EquipmentDock.test.tsx` does · seen 1× · last 2026-10-14 · open
- **brief-e2e-script-paths** · the PF4 brief's verify gate named `node scripts/<x>-e2e.mjs` from the root, but the journeys live in `axiomancer-mobile/scripts/` (ship PF4) → run journeys as `npm run e2e:<name> -w axiomancer-mobile` (the package.json names) whatever path a brief gives · seen 1× · last 2026-10-14 · open
- **spy-on-preset-mock** · `jest.spyOn(AccessibilityInfo, 'announceForAccessibility')` returned react-native's preset `jest.fn`, so `restoreAllMocks` (which the hermeticity audit demands) neither restored nor cleared it, and calls leaked across tests (iterate sacfloor announce) → in a file that spies on a react-native preset mock, tear down with `jest.clearAllMocks(); jest.restoreAllMocks();` · seen 1× · last 2026-10-15 · open
- **e2e-export-windows** · journeys and `verify:visual` spawn `npx expo export` via `spawnSync` with no shell; on Windows (`npx.cmd`) it exits 3 (ship CR1a, ship B3e) → run `npx expo export --platform web --output-dir .smoke-dist` by hand, then the script with `*_REUSE_EXPORT=1`; automation filed in `PHASE_CANDIDATES.md` · seen 2× · last 2026-10-16 · open
- **gate-router-identity** · a root gate whose effect lists `router` in its deps re-runs every render (`useRouter()` is a fresh object), so with no latch it re-pushes its route when another route moves the pathname: `EventGate` stacked its screen twice, `LabyrinthGate` buried a labyrinth fight (ship CR1b) → latch each gate push once per session, and test it with a fresh router object per render · seen 2× · last 2026-10-15 · open

## Adding a domain

Append a new `<!-- @domain:<name> -->` anchor + `##` heading
above this section. Keep domain names short and stable — skills
reference them by name (`grep '@domain:deploy'`), so a rename
is a breaking change to every skill that reads this file.
