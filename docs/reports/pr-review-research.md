# PR review pipeline: research pass

> Stamp: 2026-10-16, commit `a712832a7` on `main`. A research report, not a
> phase; it configures nothing. The design in Part 3 lands by `/plot` (the
> brief is Part 5). Measured facts come from `gh`, git and the loop's own
> eval ledger (`docs/reports/eval/latest.md`); the outside references in
> Part 2 are primary pages, read on the date above.

**The short version.** Sixty merged PRs, zero reviews, no branch
protection, no rulesets. The loop's own escape ledger already measures
the gap: four real defects escaped 26 `loop:pr` merges in four days, CI
caught none of them, and the one pre-merge reviewer that did catch one
(the antagonist on #529) was overruled by a session-local auto-merge
script. The biggest hole is therefore the **merge gate**, not reviewer
blindness. The pipeline below is three stages: a free mechanical gate
(ruleset, evaluate mode first), a shadow Claude reviewer that labels
risk and never blocks, and a required check plus `risk:low` auto-merge
that only turns on when the shadow numbers in Part 4 pass. Auto-merge
of any kind amends D86 and is T's call; the report names the decision
and does not make it.

## Part 1: our own escape data

### The review gap, measured

| Count | Value |
|---|---|
| Merged PRs examined (`gh pr list --state merged --limit 60`) | 60 |
| With any review | 0 |
| With a review decision | 0 |
| `loop:pr` PRs among them | 33 |
| Branch protection on `main` | none (`branches/main/protection` → 404) |
| Repository rulesets | none (`rulesets` → `[]`) |
| `allow_auto_merge` | false |

Lead time, `loop:pr` PRs (open → merge):

| p25 | median | p75 | max |
|---|---|---|---|
| 0.7h | 3.2h | 4.6h | 23.6h |

Diff size, `loop:pr` PRs:

| | median | p75 | p90 | max |
|---|---|---|---|---|
| lines changed | 350 | 1157 | 2257 | 4587 |
| files | 9 | | | 46 |

T merges fast and alone. A reviewer that takes longer than an hour or
posts more than a handful of findings per PR will be routed around, as
the antagonist was.

### What escaped, by cause

The ledger's "follow-up within 7 days touching a shared file" column
names candidates, not causes (`combat-encounter.engine.ts` is in half
the PRs). Classified by the fix's own subject and the planted-defect
replay, the real post-merge defects in the window 2026-10-12..15 are:

| Class | Count | Cases | Could a diff reader catch it? |
|---|---|---|---|
| UI layout or callout wrong at a viewport or state no test renders | 5 | D2 #523 (no VITAE ring callout), D3 #529 (FREE pill clipped), #535 VITAE column on wide windows, #555 END dock edge, #557 HUD line at 11px | Partly. The antagonist caught D3 from the PR's own screenshot and the geometry constants. The wide-window ones need a render, not a read. |
| Presenter or rules logic | 2 | D1 #534 (`riderPairs` ignored damage riders), #562 (scar never mends outside an inn) | Yes, with the rules doc beside the diff (`review:rules-change` is the hook). |
| Loop tooling with no CI path coverage | 2 | D4 #543 (`pr-resolve` union merge split rows), #526 (merged on Cloudflare Pages only) | Yes: "this diff touches `scripts/` and no `verify-*` triggers" is mechanical. |
| Unit or prose label | 2 | #531, #541 (prices read SHILLINGS) | Yes, cheaply. |
| Test harness flake | 1 | #537 (critique drive settles before title) | No. |
| Accessibility | 1 (+3 LOW rows) | #559 (announce the floor line), antagonist LOW rows on #520/#523/#529 | Yes for duplicate labels; no for what a screen reader actually says. |

### What each judge missed (from `docs/reports/eval/latest.md`, EV1c A7)

| Judge | Miss rate | Note |
|---|---|---|
| CI path filters | 4 of 4 planted defects | 9 of 26 PRs changed code no `verify-*` covers (`scripts/`, `.github/`, `skills/`, `docs/`). |
| `verify`, tests as they stood | 4 of 4 | Each fix's own tests catch its defect, 4 of 4. The tests arrive with the fix, never before. |
| The antagonist (2026-10-14 session) | 4 of 5 | Reviewed 6 of 26 PRs; posted 1 "not a pass" (#529, correct). |
| The merge gate | 3 of 26 | #509, #541 merged before checks finished; #529 merged over the "not a pass" because a script matched "Antagonist pass" inside "not a pass". |
| Builder's own `[x]` | 3 of 65 | 49 of 65 ticks name no test. |

**The precedent that matters for auto-merge.** The repo has already run a
risk-free auto-merge once: the 2026-10-14 parallel session's merge script
(session-local, not in the tree) merged on a comment match. It merged
#529 on a failing review and #509 before CI finished. Any auto-merge in
this design keys off GitHub's own check-run and ruleset state, never a
comment body, and sits behind a ruleset so a script cannot merge around
it.

### Top defect classes the pipeline must target

1. Uncovered-path changes (`scripts/`, `.github/`, `skills/`) that no
   `verify-*` runs: mechanical, free, and the ledger counts it.
2. UI layout at the PR's own screenshots and the known breakpoints
   (375, 1280): the reviewer reads the shot and the constants; a wide
   window render is a `verify:visual` follow-up, not this pipeline.
3. Rules and presenter logic under `review:rules-change`: the reviewer
   gets the rules doc and the printed card in its context.
4. Units and labels: a one-line check in the reviewer's prompt.

## Part 2: primary-source reference

All pages read 2026-10-16. Quotes are under fifteen words.

### What Anthropic publishes about its own review (and what it does not)

- **No risk label, no auto-merge of low-risk PRs is published.** The
  SDLC post (Jason Clinton, 2026-07-21) says the codebase is tiered by
  risk, new AI reviewers run in "shadow mode", agents "aren't merging
  code to production unchecked", and critical code keeps "strict human
  approval processes". Approvals are logged and "a risk-weighted sample
  is reviewed by humans". Its two numbers: PRs with substantive review
  comments rose 16%→54%, and about a third of the bugs behind past
  incidents would have been caught.
  https://claude.com/blog/how-anthropic-secures-its-ai-native-software-development-lifecycle
- The 19% auto-approve figure sometimes attributed to Anthropic is
  Intercom's. The "risk label → auto-merge" shape the brief asked about
  is a community pattern (Part 2 §3), not an Anthropic mechanism.
- Staff talk (transcript, 2026-07-21): Claude opens ~65% of product
  PRs; important areas have code owners who must approve; one bot
  reviews everything; incident PRs become an eval set. No labels or
  tiers named. https://simonwillison.net/2026/Jul/21/cat-and-thariq/
- **Managed Code Review** (Team/Enterprise): parallel agents, a
  verification pass that filters false positives, Quick/Standard/Deep
  levels, severities Important/Nit/Pre-existing. "A review never
  approves or blocks", the check run never fails; gating is DIY by
  parsing a `bughunter-severity` line from the check run.
  https://code.claude.com/docs/en/code-review,
  https://code.claude.com/docs/en/code-review-pull-requests
- **Local `/code-review`**: `--comment` posts inline PR comments,
  `--fix`, `--max-findings <n>` (default 32), effort levels from `low`
  ("the findings it's most confident in") up to `max`; level is
  remembered; a project skill named `code-review` replaces the bundled
  one. https://code.claude.com/docs/en/code-review-local
- **Ultra** (`/code-review ultra`): a cloud fleet, every finding
  reproduced, 15–25 minutes, $5–25 in credits per run after three free,
  CI entry `claude ultrareview`. For scale this repo does not need per
  PR. https://code.claude.com/docs/en/ultrareview
- **GitHub Actions integration** (`anthropics/claude-code-action@v1`):
  the canonical review workflow is `on: pull_request` with
  `plugins: "code-review@claude-code-plugins"` and
  `prompt: "/code-review:code-review --comment <repo>/pull/<n>"`, and
  `claude_args: '--allowedTools "mcp__github_inline_comment__create_inline_comment"'`
  (the action starts the inline-comment MCP server only when that tool
  is named). It skips drafts, forks and PRs Claude already commented
  on. `allowed_tools`, `model`, `max_turns` inputs are deprecated in
  favour of `claude_args`. https://code.claude.com/docs/en/github-actions,
  https://github.com/anthropics/claude-code-action/blob/main/docs/usage.md
- Security: only write-access users trigger it; `pull_request_target`
  and `workflow_run` run "with the base repository's secrets"; the
  action restores `.claude/`, `CLAUDE.md` and `.mcp.json` from the base
  branch so a PR cannot rewrite the reviewer's instructions.
  https://github.com/anthropics/claude-code-action/blob/main/docs/security.md

### GitHub mechanics

- **Rulesets**: Active or Disabled, plus **Evaluate** mode that records
  what "would have passed or failed" in Rule Insights without blocking.
  Rules include required status checks (with "select an app as the
  expected source"), required reviews, code-owner reviews. Bypass list:
  roles, teams, apps, Dependabot; "For pull requests only" vs always.
  Repository rulesets on private repos need Team or Enterprise; this
  repo is public. Whether Evaluate needs a paid plan is not stated on
  the pages read; the fallback is an Active ruleset with T on the bypass
  list, which blocks nothing T does today.
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets,
  .../managing-rulesets-for-a-repository, .../available-rules-for-rulesets
- **Auto-merge** merges "after all required reviews and status checks
  pass"; the repo setting must be on first; `gh pr merge --auto` enables
  it per PR; `--admin` bypasses requirements (never used here).
  https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request,
  https://cli.github.com/manual/gh_pr_merge
- **CODEOWNERS**: base-branch file, last match wins, owners need write
  access, any one owner's approval suffices. With one owner it adds
  nothing here. https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- **`pull_request` vs `pull_request_target`**: fork PRs get a read-only
  token and no secrets under `pull_request`; same-repo branches do get
  them. `pull_request_target` runs on the base branch with secrets and
  GitHub is rolling out a default policy blocking it in public repos
  (enforcement scheduled 2026-11-02). Design uses `pull_request`,
  same-repo only. https://docs.github.com/en/actions/reference/events-that-trigger-workflows,
  https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target

### Published practice on risk-tiered review and auto-merge

- **Google** bounds risk by size, not label: 100 lines "usually a
  reasonable size", 1000 "usually too large"; a directory owner must
  approve; median reviewer count is 1, median latency under 4 hours
  (Sadowski et al., ICSE-SEIP 2018, 9M changes). No escape rate
  published. https://google.github.io/eng-practices/review/developer/small-cls.html,
  https://sback.it/publications/icse2018seip.pdf
- **Chromium**: every CL reviewed by a directory owner; the "Rubber
  Stamper" bot votes `Bot-Commit +1` only for "verifiably safe changes"
  (translations, clean reverts, clean cherry-picks) and never grants
  owner approval. This is the closest published analogue to a
  `risk:low` tier: a mechanically verifiable class, not a judgement.
  https://chromium.googlesource.com/chromium/src/+/main/docs/code_reviews.md
- **Kubernetes/prow**: risk by path via OWNERS files; `/lgtm` from any
  collaborator (retracted on new push), `/approve` from an owner; Tide
  merges on `labels: [lgtm, approved]` minus `do-not-merge/*` once checks
  pass. Labels gate merge, but a bot sets them from human votes.
  https://docs.prow.k8s.io/docs/components/core/tide/
- **Dependabot / Renovate**: the GitHub-native "low risk auto-merges"
  pattern. Dependabot's official workflow: `if: github.actor ==
  'dependabot[bot]'`, `update-type == 'version-update:semver-patch'`,
  then `gh pr merge --auto --merge` with required status checks doing
  the real gating. Renovate: never automerge until checks pass; lowest
  risk is lock-file maintenance and devDependencies.
  https://docs.github.com/en/code-security/dependabot/working-with-dependabot/automating-dependabot-with-github-actions,
  https://docs.renovatebot.com/key-concepts/automerge/
- **Evidence gap**: none of these sources publishes an escape rate or
  a false-positive rate for its gate. Part 4 is where this repo gets
  its own.

## Part 3: the design, staged

### Where each step is automated (the alignment table)

| Step | Who or what does it | Stage |
|---|---|---|
| Open the PR, label `loop:pr` + `size:*` + `area:*` + `review:*` | the tick (`skills/march.md` §3); a label-derivation script is already a `CANDIDATES` row (score 4.5) | today |
| `verify-*` on the PR head | GitHub Actions, path-filtered | today |
| Keep it green / mergeable | `pr-autofix` (Haiku, 2 runs), `pr-resolve` | today |
| **Always-reporting gate check** (`verify-gate`): green when every triggered `verify-*` is green, and when the diff touches uncovered paths it runs the root `npm test` itself | one new job in a new `pr-review.yml` | Stage 0 |
| **Required checks on `main`** | a GitHub ruleset, `evaluate` mode first, then `active` | Stage 0 |
| **Claude review** of the diff: findings as inline comments, one verdict comment with a marker, a `risk:*` label | `pr-review.yml` → `_claude-skill.yml` → `/review` (a repo skill wrapping `/code-review`) | Stage 1, shadow |
| Score the reviewer against escapes | `scripts/eval/escape-ledger.mjs` (extend `classifyComment` with the `pr-review` judge) | Stage 1 |
| Decide to merge | **T, by hand** (D86) for everything | Stage 0–1 |
| Auto-merge `risk:low` once its ruleset checks pass | `gh pr merge --auto` set by `pr-review.yml` only on `risk:low`; GitHub performs the merge when checks are green | Stage 2, after Part 4 passes and D86 is amended |
| Merge `risk:medium` and `risk:high` | T, by hand, with the review verdict in the PR | Stage 2 |

The loop never merges (D86) still holds in Stages 0 and 1. Stage 2 is the
only place it changes, and even there the merge is GitHub's auto-merge
under a ruleset, not a loop verb.

### Risk tiers: derived first, judged second

The label is computed from the diff by a script (deterministic, tested),
and the Claude reviewer may **raise** it with a reason but never lower
it. Low is deliberately narrow; the point is that T stops being pinged
for PRs T merges in ten minutes anyway.

| Tier | Rule (any line raises to that tier) | Replayed over the last 60 merged PRs |
|---|---|---|
| `risk:low` | every path under `plan/`, `docs/`, `telemetry/`, `devlog/entries/`, or is `CLAUDE.md`/`AGENTS.md`; same-repo; no `review:needs-T`; every triggered check green. No size cap: a `plot` PR is 150–400 lines of plan and is the class this tier exists for. | 10: #567 #566 #560 #550 #502 #498 #483 #430 #429 #428 (the `plot` PRs and plan commits). They merged in 0.0–0.5h today, so the saving is T's attention, not wall-clock. |
| `risk:medium` | everything else: code under `axiomancer-mobile/` or `axiomancer-mechanics/` without `review:rules-change`, `scripts/` with its test in the diff | 27: the CRITIQUE-pass fixes, a11y, perf, the small phases (#553, #581) |
| `risk:high` | any of: `review:rules-change`; a path under `.github/workflows/` or `.claude/`; `scripts/pr-resolve.mjs` or `scripts/loop-issue.mjs`; more than 20 changed lines under `skills/`; `size:L` or > 1000 lines; a new dependency; `review:needs-T`; the reviewer raised it with a reason | 23: the phase PRs (#569 #573 #579 #529 #521 #509 #505), the CI PRs (#526 #543 #501), rules (#571 #562), doctrine (#546 #547 #503) |

The replay script is six rules over `gh pr view --json files`; A3 in the
brief turns it into `scripts/pr-risk.mjs` with tests. Two things the
replay showed: a size cap on plan-only PRs drops `low` from 10 to 2, so
there is none; and a `skills/` rule with no line threshold sends every
PR that ticks its own build-plan line to `high` (#535 touched
`skills/march.md` by one line), so the threshold is 20 lines.

Rationale for `.github`, `.claude` and substantive `skills/` edits being
high regardless of size: a 6-line workflow change (#526) merged on
Cloudflare Pages alone and no gate noticed, and a skill edit changes
what the loop does unattended. Rules changes are high because T reads
them with a design eye, which no reviewer replaces. Chromium's Rubber
Stamper is the published precedent for the `low` tier: a mechanically
verifiable class, never a judgement.

<!-- pr-risk:replay:start -->

#### Replay by `scripts/pr-risk.mjs` (phase RV1a, A3)

The last 60 PRs merged before 2026-10-16T12:21:07Z, tiered by the script, not by hand. Stamp: commit `388eca05d` (2026-10-16). Regenerate with `node scripts/pr-risk.mjs --replay --write`; labels are read as they stand today.

| Tier | PRs | Which |
|---|---|---|
| `risk:low` | 10 | #567 #566 #560 #550 #502 #498 #483 #430 #429 #428 |
| `risk:medium` | 27 | #581 #577 #575 #563 #559 #557 #555 #553 #549 #545 #541 #539 #537 #535 #534 #531 #528 #520 #517 #516 #514 #512 #510 #497 #484 #447 #412 |
| `risk:high` | 23 | #579 #576 #573 #571 #569 #565 #562 #551 #547 #546 #543 #529 #526 #523 #521 #509 #507 #505 #503 #501 #500 #499 #486 |

<!-- pr-risk:replay:end -->

### Stage 0: the mechanical gate (free, no Claude)

New file `.github/workflows/pr-review.yml`, job `verify-gate`:

- Trigger: `pull_request` (`opened`, `synchronize`, `reopened`,
  `ready_for_review`, `labeled`), same-repo only. `pull_request`, never
  `pull_request_target`, so a fork head never sees secrets.
- Steps: list the `verify-*` workflows the diff's paths trigger (reuse
  `parseWorkflowFilter` / `classifyPaths` from
  `scripts/eval/ledger-lib.mjs`); wait for those check runs on the head
  SHA; if any path is uncovered, run the root `npm test` in this job;
  emit one check, `verify-gate`, that is green only when all of that is.
  This is why a required check can coexist with path filters: a required
  `verify-mobile` that never runs on a mechanics-only PR would block the
  merge forever, while `verify-gate` always reports.
- Ruleset on `main`: require `verify-gate`; require a linear-or-merge
  history as today; bypass list: T only. Create it in **evaluate** mode
  for the first 20 PRs so the Insights page shows what it would have
  blocked, then flip to active.

Cost: GitHub-hosted minutes, free on this public repo. Closes ledger
misses S1 (merge before checks), S4 (uncovered paths) and the merge-gate
row outright.

### Stage 1: the shadow reviewer (Claude, comments only)

Second job in the same file, `review`, `needs: verify-gate` (never
spends Claude on a red PR), gated to `loop:pr` or `plot` labels, same
repo, not draft. It calls `_claude-skill.yml` with:

- `prompt: '/review <PR number>'`, a new repo skill `skills/review.md`.
  The documented action pattern is
  `plugins: "code-review@claude-code-plugins"` with
  `prompt: "/code-review:code-review --comment <repo>/pull/<n>"` and the
  inline-comment MCP tool named in `claude_args` (Part 2). The repo
  skill wraps exactly that call (`high --comment --max-findings 8`) and
  adds the label profile below, so the reviewer's doctrine lives in the
  tree with the other verbs and `_claude-skill.yml` gains one
  `plugins` input instead of a second runner.
- `model: claude-sonnet-5` (the runner default), `effort: high`,
  `timeout_minutes: 20`, `allowed_tools:
  Read,Grep,Glob,Bash(git *),Bash(npm test*),Bash(gh pr *),mcp__github_inline_comment__create_inline_comment`.
  No Edit, no Write: a reviewer that can push is `pr-autofix`'s job.
  The action restores `.claude/`, `CLAUDE.md` and `.mcp.json` from the
  base branch, so a PR cannot rewrite its own reviewer's instructions;
  `skills/review.md` should be read from `main` the same way (the skill
  checks out its own file from `origin/main` first).
- Profile by label, read in this order:
  - `area:ui` or `area:mobile`: open the PR's `screenshots/` and check
    every constant the diff touches against the 375 and 1280
    breakpoints (the D3 lesson: the pill overhang was readable from
    `HAND_FAN_BOARD_EDGE` and the tilt).
  - `review:rules-change`: read `docs/game-model.md` and the card spec
    for every printed value the diff changes; "printed must equal
    applied" (AUDIT rule).
  - `area:ci` or `area:loop`: run the test file beside each touched
    script; flag any script with no test in the diff.
  - every PR: units (`SHILLINGS`), duplicated accessibility labels,
    `[x]` acceptance lines that name no test (the EV1b 49-of-65 gap).
- Output: inline comments for MED and HIGH findings; one summary
  comment beginning `## Review verdict` with a hidden marker
  `pr-review:verdict pass` or `pr-review:verdict not-pass` inside an HTML comment; and the computed
  `risk:*` label, raised with a stated reason when a HIGH finding is in
  scope. Never a label the tick already set, never a merge, never a
  close.
- Concurrency: job-level `pr-review-<PR>`, `cancel-in-progress: true`
  (a new push supersedes the review of the old head).

Cost per PR, from the sizes above: a median 350-line diff with the
profile reads is a 5–8 minute Sonnet run; p90 (2257 lines) is 15–20.
Volume today is 33 `loop:pr` PRs per 4 days, so 8–10 reviews a day at
the current cadence, under the D85 cap of 3 open. Subscription usage,
not dollars; `/oversight` prints the run count next to `pr-autofix`'s.

What T sees before merging: the `verify-gate` check, a `risk:*` label
in the PR list beside `size:*` and `area:*`, and a verdict comment whose
findings are inline. Nothing changes about how T merges.

### Stage 2: the required check and `risk:low` auto-merge

Turned on only when Part 4's thresholds pass, and only by T:

1. Ruleset: add `review` (the Claude job) to the required checks for
   PRs labelled `loop:pr` or `plot`. A `not-pass` verdict makes the job
   exit non-zero, so the check is red and the merge button is grey. T
   stays on the bypass list.
2. Auto-merge: the repo setting `allow_auto_merge` is turned on; the
   `review` job runs `gh pr merge --auto --merge` **only** when the
   label is `risk:low` and the verdict is `pass`. GitHub merges when
   the ruleset is satisfied; the loop never calls a plain `merge`.
   `scripts/loop-pr.test.mjs` pins that the `--auto` call is reachable
   only from the `risk:low` branch of the workflow.
3. D86 amendment (a decision for T, drafted as D95): "T merges
   `risk:medium` and `risk:high` by hand. A `risk:low` PR that passes
   the ruleset's required checks and the review verdict merges by
   GitHub auto-merge. The loop still never merges, closes or
   force-pushes a PR itself."

What is dropped from Anthropic's published approach on purpose:
CODEOWNERS routing (one owner), a risk-weighted human sample of
approvals (one human), the parallel-agent verification pass that
filters false positives (Managed Code Review does this on Anthropic's
infrastructure; here the planted-defect replay is the substitute), and
ultra-style review on every PR. What is kept, and is what Anthropic
actually publishes: the codebase tiered by risk before anyone reads
the diff; every new AI reviewer in shadow mode first; agents never
merging unchecked; critical paths behind human approval; incident
PRs (here the EV1c planted defects) kept as the reviewer's eval set.
The `risk:low` auto-merge itself is the Dependabot/Rubber-Stamper
pattern, not an Anthropic one, and the report says so because the
brief attributed it to Anthropic.

## Part 4: validation, with evidence that is not the reviewer's own

Thresholds are set here, before the first run, so the Stage 2 decision
is read off a table and not argued later.

### Before Stage 1 is enabled: planted-defect replay

The EV1c brief listed "re-run the antagonist on planted defects" as a
follow-up. This is that follow-up with the new reviewer as the judge.
`scripts/eval/seeded-replay.mjs` already plants D1–D4 in a detached
worktree; a `--judge review` mode opens each planted tree as a draft PR
on a throwaway branch, runs `/review`, and records whether a MED+
finding names the planted line. Then the branch is deleted.

| Measure | Pass |
|---|---|
| Planted defects flagged MED+ (D1–D4) | ≥ 3 of 4 (D2 and D3 are the UI class; D1 logic; D4 tooling) |
| Findings per clean control PR (the unplanted fix) | ≤ 1 MED+, 0 HIGH |
| Run time, p90 of the four | ≤ 20 min |

### During Stage 1 (shadow, next 20 `loop:pr` PRs)

Regenerate the ledger with the `pr-review` judge added to
`classifyComment`. Baseline is the EV1a window: 4 real defects in 26
PRs (15%), merge-gate misses 3 of 26.

| Measure | Source | Pass |
|---|---|---|
| Escape rate: real post-merge defects per PR | ledger follow-ups, classified by cause as in Part 1 | ≤ 2 in 20 (10%) |
| Of those escapes, how many the reviewer had flagged pre-merge (T merged anyway) | verdict marker vs follow-up | report only; a high number means the gate, not the reviewer, is the fix |
| Merge-gate misses (merged before `verify-gate` green) | ledger | 0 of 20 once the ruleset is active |
| T's open→merge lead time, median | `gh pr list` as above | ≤ 6.4h (2× today's 3.2h) |
| `risk:low` PRs that would have auto-merged and later needed a fix | ledger ∩ label | 0 |
| Reviewer runs that failed or timed out | Actions | ≤ 2 of 20 |
| False-positive rate: MED+ findings T marks resolved-without-change | PR comment reactions or a `wontfix` reply | ≤ 30% |

If the escape rate does not fall and the "flagged pre-merge" count is
high, the conclusion is Stage 0 was the fix and Stage 1 is informational;
keep the reviewer in shadow and do not add it to the ruleset. If the
false-positive rate is over threshold, drop effort to `medium` and
`--max-findings 5` before judging again.

### Stage 2 decision

All of: the planted replay passed, the shadow table passed, and T has
accepted D95. Then and only then: ruleset active with `review`
required; `allow_auto_merge` on; the `--auto` branch enabled.

## Part 5: `/plot`-ready brief for Stage 0 + Stage 1

**Task.** A PR review pipeline in two stages: an always-reporting
`verify-gate` check behind a ruleset in evaluate mode, and a shadow
Claude reviewer that labels risk and never blocks.

**Phases** (one tick each):

- **RV1a, the gate.** `pr-review.yml` with the `verify-gate` job;
  `scripts/pr-risk.mjs` deriving `risk:*` from the diff (tests per
  tier); the ruleset created in evaluate mode by a documented `gh api`
  call in the workflows README (T runs it, the loop cannot change repo
  settings).
- **RV1b, the reviewer.** `skills/review.md`; the `review` job;
  `classifyComment` learns the `pr-review` judge; `scripts/eval/seeded-replay.mjs --judge review`.

**Acceptance.**

- A1 `pr-review.yml` runs on `pull_request` for same-repo PRs only and
  `scripts/loop-pr.test.mjs` pins that it never uses
  `pull_request_target`, never calls `gh pr merge` without `--auto`,
  and that the `--auto` call is unreachable unless the label is
  `risk:low` (and in RV1 the branch is not wired at all).
- A2 `verify-gate` is green on a mechanics-only PR where `verify-mobile`
  never ran, red when any triggered `verify-*` is red, and runs root
  `npm test` itself when the diff touches an uncovered path (three
  fixture PRs or a unit test over the gate's decision function).
- A3 `scripts/pr-risk.mjs <base>..<head>` prints one of
  `risk:low|medium|high`; unit tests cover every rule line in the Part 3
  table; the 60 PRs in `docs/reports/pr-review-research.md` Part 1 are
  replayed and the distribution is written to the report.
- A4 The ruleset exists on `main` in `evaluate` mode requiring
  `verify-gate` (T creates it; the PR ships the exact command and the
  README row).
- A5 `skills/review.md` posts inline MED/HIGH findings and one
  `## Review verdict` comment with the `pr-review:verdict` HTML-comment
  marker, applies the derived `risk:*` label, raises it only with a
  stated reason, and has no Edit/Write tool in `allowed_tools`.
- A6 `node scripts/eval/escape-ledger.mjs` classifies the verdict
  comment as judge `pr-review` and the miss-rate table gains the row.
- A7 `node scripts/eval/seeded-replay.mjs --judge review` records the
  reviewer's verdict on D1–D4 and the clean controls in
  `docs/reports/eval/seeded.json`; the Part 4 thresholds are evaluated
  in `latest.md`.
- A8 `.github/workflows/README.md` gains the `pr-review.yml` row; the
  Stage 2 steps and the D95 text are in `plan/NEEDS_T.md` as one row
  for T, not as a lesson.

**Measure.** After 20 shadow-reviewed `loop:pr` merges: the Part 4
shadow table, regenerated from the ledger, with each row marked pass or
fail against the thresholds set in this report.

**Constraints.** D86 holds through RV1 (no auto-merge wiring, T merges
by hand). The pipeline never fires a loop verb. One new workflow file.
No repo setting is changed by the loop; ruleset and `allow_auto_merge`
are T's commands, printed in the README.
