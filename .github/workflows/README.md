# GitHub Actions — CI + the Claude automation layer

Two layers live here:

1. **CI and deterministic builds:** `verify-mechanics`, `verify-mobile`,
   `verify-drift`, `verify-prose`, `preview-build`, `build-devlog`,
   `check-lexicon`, `check-devlog-served`, `perf-audit`, and `pr-review`'s
   `verify-gate`, the one always-reporting check over the path-filtered `verify-*`. Each package has one owning verify
   workflow: mechanics owns root dependency changes and runs the affected
   mobile consumer gate; mobile runs only for its own paths. Mobile verification installs once, exports once, and reuses that
   inspected export for the affected Hazard / Encounter / Combat
   journeys. Shared or unknown runtime changes fail closed to all journeys;
   Sunday/manual mobile runs are the unconditional full-suite backstop.
   `npm run deploy:check` polls the verify workflows.
2. **Claude automation:** every zero-input skill/command in the repo,
   runnable from the Actions tab and (where it makes sense) on a schedule.
   All of them funnel through the reusable runner
   [`_claude-skill.yml`](./_claude-skill.yml), which owns checkout, `npm
   ci`, `.env` materialization, the nexus enforcement layer (guard hooks +
   deny walls), and the `anthropics/claude-code-action` invocation. The
   runner defaults to **Sonnet 5** (`claude-sonnet-5`); `march.yml`,
   `iterate.yml`, and `claude.yml` (which doesn't use the runner) are
   pinned to **Opus 5.5** (`claude-opus-5-5`); `pr-autofix.yml` and
   `pr-resolve.yml` run on **Haiku 5.5** (`claude-haiku-5-5`). The runner
   also takes `allowed_tools` (override the grant), `pre_run` and
   `post_run` (shell around the Claude step; `pr-resolve` uses them).

**The loop lands code by PR (Phase R11, D84-D87).** A loop tick that
changes anything outside `plan/`, `telemetry/`, `docs/reports/` or
`devlog/entries/` opens a
PR labelled `loop:pr` from a `loop/<verb>-<slug>` branch; T merges it by
hand (no auto-merge). `pr-autofix` keeps it green, `pr-resolve` keeps it
mergeable, and the `verify-*` workflows run on the PR and again on the
merge push.

**Cost of the PR flow.** The repo is public, so GitHub-hosted standard
runners cost no minutes: the doubled `verify-*` runs (PR + merge push),
`pr-resolve`'s scan on every push to `main`, and `pr-autofix`'s gate job
are free. The paid part is Claude usage: one Haiku run per red check on a
loop PR (at most two per PR), and one Haiku run per conflict outside the
append-only files. The march cadence is unchanged. `/oversight` prints
the month's `pr-autofix` and `pr-resolve` run counts so this assumption
gets checked.

## Secrets

| Secret | Status | Purpose |
|---|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | **required** (configured) | Auth for every Claude workflow. |
| `GH_PAT` | **recommended** | A PAT (classic: `repo` + `workflow` scopes; or fine-grained: contents/issues/PRs read-write + actions read). Without it workflows fall back to the default `GITHUB_TOKEN`, and **pushes/PRs made by the skills will not trigger the `verify-*` workflows** — the deploy gate then **fails closed** (`deploy-check.mjs` exits 1 when a code tick has zero verify runs), tuning PRs get no CI, and `ci-autofix` never fires for loop pushes. Diagnose with `pat-probe.yml`. |
| `NOTIFY_NTFY_TOPIC` / `NOTIFY_WEBHOOK_URL` | optional | Pager channels for `scripts/notify.mjs` (failure-mode stops, `[needs-user-call]`s). |

## The workflows

| Workflow | Skill | Trigger | Notes |
|---|---|---|---|
| `build-devlog.yml` | deterministic `npm run site:build` | manual | Rebuilds the catalog + DevLog, uploads `devlog/` as an artifact, and commits changed generated files to `main`; no Claude invocation. |
| `check-lexicon.yml` | deterministic retired-term lint | weekly + manual | Active package verify jobs run this lint in their existing runner; the tracked pre-commit hook protects docs-only commits, and this workflow is the remote backstop. |
| `perf-audit.yml` | deterministic `npm run perf:audit` | weekly (Sunday 07:07 UTC) + manual | The weekly performance audit (phase PF1): web bundle and load, runtime smoothness on a scripted combat round, engine ms per combat; three runs, median kept. Appends `docs/reports/perf/history.jsonl` and files a `[perf]` row in `plan/AUDIT.md` (plus its issue) for each budget breach or week-over-week drift. Report-only: only a measurer crash fails it. Manual runs accept `seed_budgets` (writes `budgets.json`; seed on CI only). Shares the `nexus-loop` group so its commit never races a tick. No Claude invocation. |
| `deadlines.yml` | deterministic `node scripts/deadlines.mjs --write` | daily 11:13 UTC + every push to `main` touching `plan/deadlines.md`, the build plan or the script + manual | Regenerates `LIVE_DEADLINES.md`: the items in `plan/deadlines.md` due in the next two weeks that need T (no build-plan rows yet, a T task, or an attended or owner-led row ready for T). Commits to `main` only when the file changed. Shares the `nexus-loop` group. No Claude invocation. |
| `close-trailers.yml` | deterministic `loop-issue.mjs close-trailers` | every push to `main` (+ PRs touching the script) | **The auto-close authority** (Phase 48). Sweeps *every* commit in the pushed range, parses the closing keywords out of the commit prose, and closes each referenced issue via the API, idempotently. GitHub's native `Closes #N` parser is inert in this repo, and the agent-driven `close-comment` step is gated behind a green `deploy:check` — so it is skipped whenever a loop turn ends while CI is still amber (this is what leaked #174 for 11 hours). Runs `scripts/loop-issue.test.mjs` as a gating witness first, so a parser regression turns `main` red instead of silently leaking issues. No Claude invocation. |
| `deploy-comment.yml` | deterministic `loop-issue.mjs deploy-comment` | `workflow_run: completed` on `verify-mechanics`/`verify-mobile` | **The deploy-URL-comment authority** (Phase 91) — the same floor `close-trailers.yml` is for the close, applied to the comment. The agent-driven `close-comment`/`phase-close` step posts the deploy comment only if the SAME tick's own `deploy:check` goes green before the tick's container dies; a tick that ends while CI is still amber skips it forever, with nothing in a later tick to resume it. This workflow instead fires on the gated verify-* workflows' own completion, re-checks green via `scripts/deploy-check.mjs` (checked out at that exact commit, short timeout), and posts the comment only once truly green — idempotent (SHA-scoped marker) and self-healing (a sibling workflow still pending re-fires this on its own completion). Never closes anything; `close-trailers.yml` already owns that. No Claude invocation. |
| `march.yml` | `/march` | 2-hour cron + manual | The autonomous-beast tick: triage → critique → PR cap → ship-a-phase → expand → iterate. Builds only briefed, unattended, unclaimed rows; content per surface (D88). Manual runs accept `focus_phase`; when set, the run dispatches `/ship-a-phase phase <focus_phase>` instead of normal `/march`. Code lands as a `loop:pr` PR; plan-only commits push `main`. |
| `night.yml` | `/digest` | every other day 08:47 UTC + manual | Morning briefing to `devlog/entries/DIGEST_<date>.md` + nightly breadth checks. |
| `consolidate.yml` | `/consolidate` | monthly (2nd, 07:23 UTC) + manual | Memory curator: compacts `plan/` durable memory (bearings, CRITIQUE archive, lessons/reflexes hygiene). Curation only — meaning never changes. Pushes to `main`. |
| `triage.yml` | `/triage` | manual only (per-issue `issues:` trigger removed 2026-08) | Manual pass on a specific issue; march's triage gate is the standing sweep. |
| `ci-autofix.yml` | `/fix-ci` | `verify-*` failure on `main` + manual | Red-main first responder. Pushes the fix to `main`. Its own job-level `ci-autofix` concurrency group (R0): skipped runs never queue, so they cannot displace a real one. |
| `pr-autofix.yml` | `/fix-ci <run> --branch <head>` (Haiku) | `verify-*` failure on a PR branch + manual | Keeps `loop:pr` PRs green (D87). A plain gate job first checks the PR is open, same-repo, labelled `loop:pr` and not `loop:pr-stuck`, and counts its attempt comments; the third red run labels it `loop:pr-stuck` instead of running. The fix job has a job-level `pr-autofix-<PR>` group. Never touches `main`, never force-pushes. |
| `pr-resolve.yml` | `scripts/pr-resolve.mjs`, then `/fix-ci --resolve` (Haiku, Read + Edit only) | every push to `main` + manual | Keeps `loop:pr` PRs mergeable (D87). Merges `main` into each conflicting same-repo `loop:pr` PR; conflicts only in telemetry shards or the plan queues settle by a union of rows (three-way counted, so an edited row is not doubled); anything else goes to a Haiku run between a scripted prepare and a finish that refuses a leftover marker. The scan starts that Haiku run as a `workflow_dispatch` of this file per conflicted PR (`branch`, `pr` inputs), because `claude-code-action` rejects a `push` event. Job-level `pr-resolve` group for the scan, `pr-resolve-<branch>` per resolve. Push, never force. |
| `pr-review.yml` | deterministic `scripts/pr-risk.mjs` + `scripts/pr-gate.mjs` (job `verify-gate`); `skills/review.md` (job `review`) | every same-repo PR into `main`: `opened`, `synchronize`, `reopened`, `ready_for_review`, `labeled`; `review` also by manual dispatch with a `pr` input | **The always-reporting gate** (phase RV1a). The `verify-*` workflows are path-filtered, so none can be a required check; `verify-gate` always reports. It labels the PR with the derived `risk:low\|medium\|high` (the only workflow writer of `risk:*`; a reviewer's raise, marked `<!-- pr-review:raised risk:<tier> -->` in a PR comment, is kept), runs the root `npm test` when the diff touches a path no `verify-*` covers, then waits (cap 45 min) for every `verify-*` the diff triggers on the head and is green only when all are. `pull_request`, never `pull_request_target`; labels with the workflow token, so a label starts no run. Job-level `pr-review-gate-<PR>` group, cancel in progress. Required by T's ruleset below (evaluate mode). **The shadow reviewer** (phase RV1b): after a green `verify-gate`, `review-wanted` (`scripts/pr-review.mjs`, plain runner) passes an open, non-draft PR labelled `loop:pr` or `plot` whose head has no verdict yet and whose diff against the base no verdict names (phase RV2: the verdict's head marker carries a `git patch-id --stable` digest of `gh pr diff`, so a merge of `main` or a rebase that leaves the diff unchanged is not reviewed again, while a conflict resolution is; no digest falls back to the SHA rule); then one Claude run of `skills/review.md` (`effort: high`, 30 min) posts inline MED/HIGH findings and one `## Review verdict` comment (`<!-- pr-review:verdict pass\|not-pass -->`, scored by the escape ledger as judge `pr-review`) and may raise `risk:*` with a reason. On `risk:medium` and `risk:high` that run fans out to three Sonnet sub-agents, one per lens (Rules, Tests, Blast radius; phase RV1c), each finding tagged with its lens in the one verdict; the Tests lens replays the PR's tests on its merge base with `node scripts/pr-review.mjs parent-tests`. `node scripts/eval/seeded-replay.mjs --judge review` scores it on the planted defects D1-D4 through throwaway `eval:seed` draft PRs it dispatches on and then closes. It runs `main`'s copy of its skill and `.claude/`, has no Edit, Write, push, commit, merge, close or `gh api` (allow list plus a deny list), and blocks nothing: a not-pass is a comment. Job-level `pr-review-<PR>` group, cancel in progress. Stage 2 (a required `review`, `risk:low` auto-merge) is T's `plan/NEEDS_T.md` row `pr-review-stage-2`. |
| `iterate.yml`, `critique.yml`, `expand.yml`, `ship-a-phase.yml`, `plan-a-phase.yml` | same-named | manual only | Direct dispatch = force one run. March dispatches these on its own, except `plan-a-phase`: since R11 only T runs it (by hand or this button), and the loop never writes a brief. `iterate.yml` pins Opus 5.5. |
| `claude.yml` | — | `@claude` mention in issues/PRs | Interactive responder. |

Skills that need a human in the loop (`/oversight`, `/jot`, `/plot`,
`/messy`) deliberately have no workflow; `scripts/loop-pr.test.mjs` fails
if a workflow ever fires `/plot` or `/messy`.

## The `verify-gate` ruleset (T runs this once)

The loop cannot change repository settings, so T creates the ruleset that
requires `verify-gate` on `main` (phase RV1a, A4). It starts in **evaluate**
mode: nothing is blocked, and Settings -> Rules -> Insights records what it
would have blocked. T is on the bypass list (`RepositoryRole` 5 is admin;
`integration_id` 15368 is GitHub Actions, so only the workflow's own check
satisfies it).

```bash
gh api -X POST repos/no-trbl-2-u/Miserere-mei-deus/rulesets --input - <<'EOF'
{
  "name": "main requires verify-gate",
  "target": "branch",
  "enforcement": "evaluate",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [{ "context": "verify-gate", "integration_id": 15368 }]
      }
    }
  ],
  "bypass_actors": [{ "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }]
}
EOF
```

If GitHub refuses `"enforcement": "evaluate"` on this plan, run the same call
with `"enforcement": "active"`: T stays on the bypass list, so it blocks
nothing T does today, while every other actor (the loop's token included)
needs a green `verify-gate`. Check it with
`gh api repos/no-trbl-2-u/Miserere-mei-deus/rulesets`. Flipping evaluate to
active later is `gh api -X PUT repos/no-trbl-2-u/Miserere-mei-deus/rulesets/<id> -f enforcement=active`.

## Operating notes

- **Concurrency:** the loop verbs share the `nexus-loop` concurrency
  group, so ticks queue instead of colliding (GitHub keeps at most one run
  pending per group — a queued tick can be superseded, which is fine for a
  loop). `ci-autofix`, `pr-autofix` and `pr-resolve` are the exceptions:
  they fire on events, so each uses its own job-level group (`pr-autofix`
  one per PR) and only a run that passed its `if` ever queues.
- **Stranded telemetry rows** are pushed to the branch the run ended on
  (`main` or the tick's `loop/*` PR branch), never across branches. Tuning/playtest loops run on
  their own branches and get per-workflow groups.
- **Cadence:** scheduled runs consume Claude subscription usage. To
  throttle, edit or delete the `cron:` block in the relevant workflow —
  everything stays manually dispatchable.
- **Activation:** schedules, `workflow_run`, and the dispatch button only
  work once these files are on the default branch (i.e. after this PR
  merges).
- **Enforcement:** `.claude/settings.json` is committed and always
  active (guard hooks, deny walls for force-push / `--no-verify` /
  destructive resets); each run self-tests the guard before Claude
  starts so a broken guard fails the job rather than running unguarded.
