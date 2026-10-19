# Phase RV1 — PR review pipeline: the always-reporting gate and the shadow reviewer

## Sources

- The `/plot` request from T, 2026-10-16: a PR review pipeline modelled on Anthropic's published practice (risk tiers, shadow mode first, low-risk auto-merge later). The design is `docs/reports/pr-review-research.md` (stamp 2026-10-16, `a712832a7`): Part 1 the escape data, Part 3 the staged design and the risk-tier table, Part 4 the thresholds, Part 5 the brief this phase carries. The report rides this plot's PR because it was never merged on its own.
- The measured gap it answers: `docs/reports/eval/latest.md` (EV1a–EV1d). Four real defects escaped 26 `loop:pr` merges in four days; the merge gate missed 3 of 26 (merged before checks, or over a "not a pass"); 9 of 26 PRs changed paths no `verify-*` workflow covers.
- D84–D87 (code lands by `loop:pr` PR, the cap of 3, **T merges by hand**, `pr-autofix` keeps PRs green), D93 (plots land by PR), D94 (T's moves go to `plan/NEEDS_T.md`, never lessons). D86 holds through RV1: nothing here merges, auto-merges, closes or force-pushes.
- `.github/workflows/_claude-skill.yml` (the shared runner: `prompt`, `model`, `effort`, `allowed_tools`, `pre_run`, `post_run`, `extra_claude_args` inputs), `pr-autofix.yml` (the gate-job-then-Claude-job shape and the per-PR concurrency group), `pr-resolve.yml` (the `workflow_dispatch` route for a Claude run on a PR), `scripts/loop-pr.test.mjs` (pins what no workflow may do), `scripts/eval/ledger-lib.mjs` (`parseWorkflowFilter`, `classifyPaths`, `classifyComment`), `scripts/eval/seeded-replay.mjs` and `seeded-lib.mjs` (the four planted defects D1–D4), `skills/march.md` §3 "Area and review labels".
- Candidate overlap, read and left in place: `plan/PHASE_CANDIDATES.md` "[score 6.0] The root `npm test` runs in no workflow" (RV1a's `verify-gate` runs the root suite on PRs whose diff touches an uncovered path, which drains the PR half of that row; the push-to-`main` half stays open) and "[score 4.5] PR labels follow from the diff" (adjacent: `scripts/pr-risk.mjs` derives `risk:*` only; `area:*` and `size:*` stay the tick's).

## Outcome

Every same-repo PR shows one `verify-gate` check that is green only when every triggered `verify-*` is green and any uncovered path passed the root `npm test`; a ruleset in evaluate mode records what it would have blocked; and every `loop:pr` or `plot` PR gets a shadow Claude review (inline findings, one verdict comment, a `risk:*` label) that the eval ledger scores and that blocks nothing; on `risk:medium` and `risk:high` the review is three Sonnet sub-agents with three different lenses, merged into the one verdict.

## Acceptance

- **A1** `pr-review.yml` runs on `pull_request` for same-repo PRs only and `scripts/loop-pr.test.mjs` pins that it never uses `pull_request_target`, never calls `gh pr merge` without `--auto`, and that the `--auto` call is unreachable unless the label is `risk:low` (and in RV1 the branch is not wired at all).
- **A2** `verify-gate` is green on a mechanics-only PR where `verify-mobile` never ran, red when any triggered `verify-*` is red, and runs root `npm test` itself when the diff touches an uncovered path (three fixture PRs or a unit test over the gate's decision function).
- **A2a** (T, in session, 2026-10-16) `verify-gate` applies the derived `risk:low|medium|high` label to every same-repo PR when it opens or its head changes, replacing a stale `risk:*` it set before and never lowering one the reviewer raised; `scripts/loop-pr.test.mjs` pins that `verify-gate` is the only workflow step that adds a `risk:*` label and that it runs on every same-repo PR, not only `loop:pr` and `plot`.
- **A3** `scripts/pr-risk.mjs <base>..<head>` prints one of `risk:low|medium|high`; unit tests cover every rule line in the Part 3 table; the 60 PRs in `docs/reports/pr-review-research.md` Part 1 are replayed and the distribution is written to the report.
- **A4** The ruleset exists on `main` in `evaluate` mode requiring `verify-gate` (T creates it; the PR ships the exact command and the README row).
- **A5** `skills/review.md` posts inline MED/HIGH findings and one `## Review verdict` comment with the `pr-review:verdict` HTML-comment marker, reads the derived `risk:*` label `verify-gate` applied (A2a), raises it only with a stated reason, and has no Edit/Write tool in `allowed_tools`.
- **A6** `node scripts/eval/escape-ledger.mjs` classifies the verdict comment as judge `pr-review` and the miss-rate table gains the row.
- **A7** `node scripts/eval/seeded-replay.mjs --judge review` records the reviewer's verdict on D1–D4 and the clean controls in `docs/reports/eval/seeded.json`; the Part 4 thresholds are evaluated in `latest.md`.
- **A8** `.github/workflows/README.md` gains the `pr-review.yml` row; the Stage 2 steps and the D95 text are in `plan/NEEDS_T.md` as one row for T, not as a lesson.
- **A9** (T, in session, 2026-10-16) On a PR whose derived tier is `risk:medium` or `risk:high`, `skills/review.md` runs three sub-agents on the latest Sonnet, each with a different lens and a different reading list (Rules, Tests, Blast radius, under Decisions); `risk:low` keeps the single reviewer. The three reports are merged into the one verdict comment, each finding tagged with its lens, duplicates collapsed; `scripts/loop-pr.test.mjs` pins that the three lens prompts are distinct and that the fan-out is gated on the tier.

Measure: after 20 shadow-reviewed `loop:pr` merges, the Part 4 shadow table, regenerated from the ledger (`node scripts/eval/escape-ledger.mjs && node scripts/eval/miss-rates.mjs`), with each row marked pass or fail against the thresholds set in `docs/reports/pr-review-research.md` Part 4.

## Scope

- New: `.github/workflows/pr-review.yml` (the one new workflow file: job `verify-gate` in RV1a, job `review` in RV1b), `scripts/pr-risk.mjs` + `scripts/pr-risk.test.mjs`, `scripts/pr-gate.mjs` + `scripts/pr-gate.test.mjs` (the gate's decision function, pure, over check-run and path-filter facts), `skills/review.md` (with its three lens prompts as `### Lens:` sections).
- Changed: `scripts/loop-pr.test.mjs` (A1 pins), `.github/workflows/README.md` (the row and T's two commands), `.github/workflows/_claude-skill.yml` (one optional `plugins` input, RV1b), `scripts/eval/ledger-lib.mjs` + `escape-ledger.test.mjs` (the `pr-review` judge), `scripts/eval/miss-rates-lib.mjs` (the row), `scripts/eval/seeded-replay.mjs` + `seeded-lib.mjs` (`--judge review`), `docs/reports/pr-review-research.md` (the A3 distribution), `docs/reports/eval/latest.md` + `seeded.json` (A7), `plan/NEEDS_T.md` (A8).
- Not touched: any `verify-*` workflow, `pr-autofix.yml`, `pr-resolve.yml`, `guard.mjs`, repository settings (rulesets, `allow_auto_merge`: T's commands, printed), game code, cards, keywords, art, saves.

## Consumers to update

- Root `package.json`: the two new test files join the root `npm test`.
- `skills/march.md` §3 "Landing a change": one line, "the shadow review posts after `verify-gate`; read the verdict, merge as before (D86)". No step changes.
- `docs/truth-sources.md`: no change; the eval report already is the measured truth for the loop's gates, and A6/A7 extend it.

## Save / schema contracts

None. No game data or save shape changes.

## Decisions made upfront — DO NOT ASK

- **The research report lands with this plot.** It is a source the brief cites and A3 writes into, and it existed only on an unpushed local branch, so the plot PR carries it (T confirmed by merging #594).
- **Trigger and token.** `pull_request` with `opened`, `synchronize`, `reopened`, `ready_for_review`, `labeled`; the `if` requires `github.event.pull_request.head.repo.full_name == github.repository`. Never `pull_request_target` (fork heads never see secrets; GitHub's public-repo block lands 2026-11-02). Report Part 2.
- **How `verify-gate` waits.** `scripts/pr-gate.mjs` lists the `verify-*` workflows the diff's paths trigger using `parseWorkflowFilter` / `classifyPaths` from `scripts/eval/ledger-lib.mjs`, polls `gh api repos/:repo/commits/<head>/check-runs` until each named workflow's run on that head has concluded (cap 45 minutes, then red with the reason), and exits non-zero on any failed conclusion. A diff with any uncovered path (one no `verify-*` filter matches, bookkeeping paths from `isBookkeeping` excepted) runs root `npm test` in the same job before reporting. The decision function (`decideGate(files, workflows, checkRuns)`) is pure and unit-tested per A2; no fixture PRs are opened.
- **Risk is derived, then only raised.** `scripts/pr-risk.mjs` implements the six rule lines of Part 3 exactly: `risk:low` when every path is under `plan/`, `docs/`, `telemetry/`, `devlog/entries/` or is `CLAUDE.md`/`AGENTS.md` and the PR carries no `review:needs-T`; `risk:high` on `review:rules-change`, any path under `.github/workflows/` or `.claude/`, `scripts/pr-resolve.mjs` or `scripts/loop-issue.mjs`, more than 20 changed lines under `skills/`, `size:L` or more than 1000 changed lines, a new dependency (a `package.json` `dependencies`/`devDependencies` key added), or `review:needs-T`; `risk:medium` otherwise. Labels are read from the PR when a number is given, from flags (`--labels`) when a range is. No size cap on `low` (the replay showed it drops `low` from 10 to 2). The reviewer in RV1b may raise with a stated reason and never lowers.
- **Who applies the label (T, 2026-10-16: every PR carries it from the moment it opens).** RV1a's `verify-gate` runs `scripts/pr-risk.mjs` on every same-repo PR, `loop:pr` or not (T's own PRs included), and applies the tier with `gh pr edit --add-label`, removing a different `risk:*` it had set on an earlier head. It is the only workflow writer of `risk:*` (A2a). The reviewer in RV1b reads the label and may raise it with a stated reason, writing the higher label and a line in the verdict; `verify-gate` on a later push keeps a raised label (it only ever moves the label up, or restores its own derived tier when a raise is absent). The `verify-gate` job and the `review` job therefore both need `pull-requests: write`; the `pull_request` token on a same-repo head has it. The label is the one steering input every reviewer reads first; `area:*` and `review:*` stay the tick's, as `skills/march.md` §3 defines them.
- **The ruleset is T's command, printed.** RV1a adds to `.github/workflows/README.md` the exact `gh api -X POST repos/{owner}/{repo}/rulesets` call: target `branch`, `main`, `enforcement: evaluate`, rule `required_status_checks` with `verify-gate` (integration id of GitHub Actions), bypass actor T (`RepositoryRole` admin, `always`). If the evaluate mode is refused on this plan, the README's fallback is the same ruleset `active` with T on the bypass list, which blocks nothing T does today (report Part 2). A4 ticks when T has run it; the RV1a PR body lists A4 as the one ID waiting on T and the row carries no `(attended)` mark because the loop's half ships unattended.
- **The reviewer is a repo skill wrapping the plugin.** `skills/review.md` reads its own text from `origin/main` first (like the action restores `.claude/` and `CLAUDE.md` from the base branch), then runs `/code-review:code-review high --comment --max-findings 8 <repo>/pull/<n>` and the label profile from Part 3 (`area:ui`/`area:mobile`: screenshots and the 375/1280 constants; `review:rules-change`: `docs/game-model.md` and the card spec, "printed must equal applied"; `area:ci`/`area:loop`: run the test beside each touched script, flag a script with no test in the diff; every PR: `SHILLINGS` units, duplicated accessibility labels, `[x]` lines naming no test). The job passes `plugins: code-review@claude-code-plugins` through one new optional `_claude-skill.yml` input (default empty, so every existing caller is unchanged), `model` the runner default, `effort: high`, `timeout_minutes: 20`, `allowed_tools: Read,Grep,Glob,Bash(git *),Bash(npm test*),Bash(gh pr *),mcp__github_inline_comment__create_inline_comment`. No Edit, no Write; `loop-pr.test.mjs` pins the grant.
- **The review job gates and cancels.** `needs: verify-gate`; `if` requires an open, non-draft, same-repo PR labelled `loop:pr` or `plot`; job concurrency `pr-review-<PR>` with `cancel-in-progress: true`. The job always exits zero in RV1 (a `not-pass` verdict is a comment, not a red check). The `workflow_dispatch` route with a `pr` input exists only so A7 can dispatch a review on a seeded draft PR; the `pull_request` route skips drafts as the action does.
- **The verdict comment.** Begins `## Review verdict`, carries `<!-- pr-review:verdict pass -->` or `<!-- pr-review:verdict not-pass -->` on its own line, then the findings table and the risk line ("derived `risk:medium`; raised to `risk:high`: <reason>" when raised). `classifyComment` returns `{ judge: 'pr-review', verdict }` from the marker (A6); the miss-rate table's `pr-review` row counts, per ledger PR, a verdict present before merge, `not-pass` merged anyway, and escapes with no MED+ finding.
- **A7 pushes seeded branches, as drafts, and deletes them.** EV1's "planted defects never leave the machine" is amended for this judge only: `seeded-replay.mjs --judge review` pushes each planted tree to `eval/seed-<id>` and the unplanted control to `eval/control-<id>`, opens each as a draft PR labelled `eval:seed` (never `loop:pr`, so the D85 cap and `pr-autofix` ignore them), dispatches `pr-review.yml` on it, waits for the verdict comment, records whether a MED+ finding names the planted line, then closes the PR and deletes the branch. `seeded.json` gains a `review` block per seed; `latest.md` evaluates the three Part 4 "before Stage 1" thresholds (≥ 3 of 4 flagged MED+, ≤ 1 MED+ and 0 HIGH per control, p90 run time ≤ 20 min). `[T to confirm]`
- **Three lenses on medium and high (A9).** The skill reads the tier from `scripts/pr-risk.mjs` first. On `risk:low` it runs the single `/code-review` pass. On `risk:medium` or `risk:high` it spawns three sub-agents through the `Task` tool (already in the CI grant) with `model: sonnet` (the latest Sonnet alias; no `.claude/agents/` file, which stays attended territory), each given only its own lens prompt and reading list so they cannot converge on the same checks:
  1. **Rules** — correctness of the logic the diff changes: every printed value against `docs/game-model.md` and `docs/card-spec.md` ("printed must equal applied"), state transitions, off-by-one and ordering in resolution code. Reads the diff, the rules docs and the changed modules only.
  2. **Tests** — adequacy, not correctness: run each new or changed test against the PR's parent commit in a detached worktree (the EV1b method) and flag any that passes there; list `[x]` acceptance lines that name no test; name the uncovered paths the diff touches. Reads the tests, the brief and the PR body only.
  3. **Blast radius** — what else the diff breaks: consumers of every changed export (`grep` across both packages), CI and loop tooling the diff touches with no test beside it, and for `area:ui`/`area:mobile` the PR's screenshots and the 375/1280 constants. Reads callers, workflows and screenshots; never re-reviews the changed lines for logic.
  The parent merges the three reports into the one verdict comment: findings tagged `[rules]`, `[tests]`, `[blast]`, duplicates collapsed by file and line, HIGH from any lens raises the tier with that lens's reason. `timeout_minutes` rises to 30 for the fan-out; a lens that times out is reported as "lens did not finish", never as a pass.
- **No responder for a red `verify-gate`.** `pr-autofix` fires on `verify-*` workflow runs only and is not extended here; a red `verify-gate` whose cause is the root `npm test` is fixed by the tick or T. Follow-up below.
- **Cost.** Shadow reviews run on the runner default model at `effort: high` for `risk:low`, and three Sonnet sub-agents on medium and high (most `loop:pr` PRs: 50 of the 60 replayed), about 8–10 PRs per day at today's cadence, subscription usage; `/oversight` prints the `pr-review` run count beside `pr-autofix`'s (one line in `skills/oversight.md`, RV1b).
- **Stage 2 is T's row, not a phase.** The required `review` check, `allow_auto_merge`, the `--auto` branch and the D95 amendment text (report Part 3, Stage 2) go into `plan/NEEDS_T.md` as one row (`pr-review-stage-2`, pointing at the report's Part 4 table as the trigger). Nothing in RV1 wires `gh pr merge`.

## Tests matrix

- `scripts/pr-risk.test.mjs`: one test per rule line of the Part 3 table (the six raises, the `low` path set, the 20-line `skills/` threshold, the no-size-cap rule), plus the recorded file lists of six of the 60 replayed PRs with their expected tier.
- `scripts/pr-gate.test.mjs`: `decideGate` on recorded facts: mechanics-only diff with `verify-mobile` absent (green), a red `verify-mechanics` (red), an uncovered `scripts/` path (runs root test), a bookkeeping-only diff (green, no suite), a pending run (wait).
- `scripts/loop-pr.test.mjs`: A1 (no `pull_request_target`, no `gh pr merge` at all in RV1, the `--auto` reachability test written now and passing vacuously), the review grant has no Edit/Write, `pr-review.yml` fires no `/plot` or `/messy`, the `review` job needs `verify-gate` and is gated to `loop:pr`/`plot`.
- `scripts/loop-pr.test.mjs` (RV1c): the three `### Lens:` sections exist and differ, the fan-out is behind the tier check, `timeout_minutes` 30.
- `scripts/eval/escape-ledger.test.mjs`: `classifyComment` on a `pass` and a `not-pass` verdict comment and on a comment with no marker.
- `scripts/eval/miss-rates.test.mjs`: the `pr-review` row's arithmetic from a fixture ledger, including "not measured" before any review ran.
- `scripts/eval/seeded-replay` pure parts (`seeded-lib.mjs`): the planted-line match on a recorded verdict body.

## Verify gate

Root `npm test` (the `node --test` suites and `check-lessons`). No workspace `verify` runs: nothing under `axiomancer-mechanics/` or `axiomancer-mobile/` changes. For RV1a, `gh pr checks --watch` on the PR itself shows the first live `verify-gate` run (the workflow fires on its own PR once the file is on the branch).

## Commit body template

```
ci: <slice> — <what T now sees on a PR>

<Which acceptance IDs this closes; the live run id of verify-gate or
review on this PR; the report path and stamp for A3 or A7.>
```

## DoD

A1–A9 ticked across RV1a, RV1b and RV1c (A4 by T running the printed command), `pr-review.yml` on `main`, and `docs/reports/eval/latest.md` carrying the `pr-review` row with its stamp.

## Follow-ups (out of scope)

- Stage 2: the required `review` check, `allow_auto_merge`, the `risk:low` `--auto` branch and D95. T's `plan/NEEDS_T.md` row, decided from the Part 4 table after 20 shadow reviews.
- A responder for a red `verify-gate` (extend `pr-autofix`'s `workflow_run` list, or have `verify-gate` comment the failing suite). Not needed while the ruleset only evaluates.
- The push-to-`main` half of the "[score 6.0] root `npm test` in CI" candidate, and `scripts/pr-labels.mjs` from the "[score 4.5] PR labels follow from the diff" candidate.
- A wide-window render for the UI layout class (`verify:visual` on PRs); the reviewer reads screenshots and constants only.
- Tuning the reviewer (`medium`, `--max-findings 5`) if the false-positive threshold fails; a lesson and a one-line skill edit, not a phase.

## Phases

### RV1a — The gate · M · closes A1, A2, A2a, A3, A4 · requires nothing
Measure: `verify-gate` reports green on RV1a's own PR (a `scripts/` and `.github/` diff, so the root `npm test` leg runs inside it) and the PR carries `risk:high` applied by the check; `node --test scripts/pr-risk.test.mjs scripts/pr-gate.test.mjs scripts/loop-pr.test.mjs` passes; `node scripts/pr-risk.mjs --replay` writes the 60-PR distribution into `docs/reports/pr-review-research.md` Part 3 (expected 10 low, 27 medium, 23 high).
- Scope: `.github/workflows/pr-review.yml` with the `verify-gate` job only; `scripts/pr-gate.mjs`, `scripts/pr-risk.mjs` and their tests; the A1 pins in `scripts/loop-pr.test.mjs`; the `pr-review.yml` row and T's ruleset command in `.github/workflows/README.md`; the A3 distribution in the report; the root `package.json` test list.
- Consumers: `skills/march.md` §3, one line. Save/schema: none.
- Tests: `pr-risk.test.mjs`, `pr-gate.test.mjs`, the `loop-pr.test.mjs` additions.
- Verify: root `npm test`; `gh pr checks --watch` until `verify-gate` reports on the PR.
- A4 is closed by T running the printed command; the PR body lists it unticked with the command.

### RV1b — The reviewer · M · closes A5, A6, A8 · requires RV1a
Measure: the `review` job posts a `## Review verdict` comment with the marker and a `risk:*` label on RV1b's own PR; `node scripts/eval/escape-ledger.mjs && node scripts/eval/miss-rates.mjs` regenerates the table with the `pr-review` row.
- Scope: `skills/review.md` (single reviewer on every tier in this slice); the `review` job and the `workflow_dispatch` route in `pr-review.yml`; the optional `plugins` input in `_claude-skill.yml`; the `pr-review` judge in `scripts/eval/ledger-lib.mjs` and `miss-rates-lib.mjs`; the `pr-review-stage-2` row in `plan/NEEDS_T.md`; the run-count line in `skills/oversight.md`; the README row's reviewer half.
- Consumers: `skills/oversight.md` (run count), `skills/march.md` §3 (reads the verdict). Save/schema: none.
- Tests: the `loop-pr.test.mjs` grant and gating pins, the `escape-ledger.test.mjs` and `miss-rates.test.mjs` additions.
- Verify: root `npm test`; the live `review` run on the PR.

### RV1c — Three lenses, then the seeded replay · L · closes A7, A9 · requires RV1b
Measure: RV1c's own PR (`.github/` and `skills/`, so `risk:high`) gets a verdict comment whose findings carry all three lens tags; `node scripts/eval/seeded-replay.mjs --judge review` writes the `review` block for D1–D4 and the controls into `docs/reports/eval/seeded.json` and the three Part 4 "before Stage 1" rows into `latest.md`, measuring the fan-out reviewer, not the single one.
- Scope: the tier check and the three `### Lens:` sections in `skills/review.md`; `timeout_minutes` 30 on the `review` job; `--judge review` in `scripts/eval/seeded-replay.mjs` and `seeded-lib.mjs`; the Part 4 rows in `latest.md`.
- Consumers: none beyond RV1b's. Save/schema: none.
- Tests: the `loop-pr.test.mjs` lens pins, the `seeded-lib` match test.
- Verify: root `npm test`; the live fan-out run on the PR; the four seeded draft PRs closed and their branches deleted before the tick ends (`gh pr list --label eval:seed` empty).
