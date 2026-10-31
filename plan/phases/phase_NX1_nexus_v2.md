# Phase NX1 — Miserere on nexus v2, and kept current with it

## Sources

- T, in session, 2026-10-31: *"Miserere uses a custom version of the old version of nexus. Nexus is
  constantly updated with newer and better features. I would like to update Miserere with the latest of
  what's in nexus AND determine a means for it to remain up to date with the latest nexus."* And: *"the
  loop is MUCH smarter in Nexus. My version, I don't even know where I deviate and why."* And: *"I don't
  actually want to touch nexus"*: every change in this plot lands in Miserere; the nexus repo is only
  read, and the kit arrives through its published CLI, `npx @usenexus/cli`.
- `docs/nexus-deviations.md` (this plot): every place our loop differs from nexus v2 (skills, workflows,
  scripts, AGENTS.md, plan shape), why (commit, date, D-id), whether v2 now does it, and a verdict (TAKE,
  KEEP, MERGE). It is the checklist the cut-over carries and the record each later sync reads.
- The nexus upgrade dry run of 2026-10-31 (CLI 0.6.5, origin `435b939`): gate green, but it converts 0 of
  the 40 open rows (its row pattern is `Phase <digits><one letter>`; every open row has a family id, and
  178 shipped rows start `(#PR)`), reads the landing as owner mode from three old `Cloud-Run` commits,
  replaces kit-named skills wholesale (plot, messy, digest, heads-down, oversight, critique, expand,
  triage lose ours) and deletes ship-a-phase and plan-a-phase with every rule they carry. The earlier dry
  run recorded in `plan/phases/phase_HW1_heads_down_gates_and_claims.md` (2026-10-30) found the same.
- nexus `playbooks/upgrade.md`: on a v2 repo the same command syncs to the kit the CLI carries, a
  three-way merge per kit file against the kit at the lock's `ref:`; a lanes file and a skill the kit
  never shipped are never touched; `--no-assist` leaves a conflicting file as ours and lists it; `--pr`
  opens or updates one pull request.
- T's rulings on the map, 2026-10-31 (in session):
  - Landing: *"I still want everything to be opened up as a PR, let the reviewers do their thing, then
    merge it. (Except for "/plot" PRs like plans, and "rules-change" PRs)."*
  - The open queue: *"I'll stop creating rows, we finish up the loop, then we can just adopt the new loop
    logic and rules for all future rows"*; the cut-over on Nov 11, when the R11 watch ends.
  - The orchestrator: *"Merge as "/pilot" but every time we pull in the latest from nexus, if
    "/heads-down" sees any changes, call it out to me, we'll walk through them and get "/pilot" up to date
    as well."*
  - `/pitch`: *"if you don't see pitch, it's because it's a global skill. It might be a good idea to pull
    that into Miserere though."*
  - The map's other rulings (R3, R4, R6-R11): the recommendations, as written.
- `skills/heads-down.md` (ours, 448 lines: parallel waves) and nexus `skills/heads-down.md` (150 lines:
  questions up front, then `/next` serially, claims, ledger, reboot resume).
- `.github/workflows/march.yml` and `night.yml` are disabled on GitHub since the R11 pause (`ddf6edf22`,
  2026-10-12); every Claude workflow calls `_claude-skill.yml`.
- D84, D85, D86, D87, D93, D95, D101 (landing, cap, merge, autofix, plot PRs); D88, D99 (content only from
  T's briefs); D94 (NEEDS_T); AGENTS.md rule 8 (`/plot` and `/messy` are T's); THE OPEN GATE (2026-08-28).

## Outcome

Miserere runs the nexus v2 loop (specs and chunks, `/next`, its pick order, claims, ledger and state
diet) with everything that is ours and load-bearing kept on top of it: every change by PR, reviewed and
auto-merged, except `plot`, `review:rules-change` and nexus-sync PRs, which T merges; the game's content
and canon rules; deadlines, NEEDS_T, the DevLog. `/pilot` is T's parallel orchestrator. Once a week a
workflow opens one sync PR when nexus has moved, which only T merges; its body shows in plain words and a
diagram what nexus is giving us, and it says so first when nexus's `/heads-down` changed.

Measure: on the first v2 tick after the cut-over, `/march` picks a carried chunk, lands it as a `loop:pr`
PR that the review merges, and the first nexus-sync PR opens (or reports nothing to sync) on schedule.

## Acceptance

- **A1** A PR carrying `review:rules-change` is never merged by the merge job; it waits for T like a `plot`
  PR. The merge job's test pins it, and AGENTS.md "Pull requests" and D119 say so.
- **A2** `pr-resolve.yml`'s conflict run no longer passes `--dangerously-skip-permissions`; it runs with
  `--allowedTools Read Edit --permission-mode acceptEdits`, and `scripts/loop-pr.test.mjs` fails if a
  workflow pairs an allow list with a permission bypass.
- **A3** `/pitch` lives in the repo (`.claude/skills/pitch/`, every file of the global skill), its repo
  config picks the `game-design` lens and the pitch folder, AGENTS.md rule 6 lists it among the skills
  that may ask, and `scripts/loop-pr.test.mjs` fails if a loop skill or workflow fires it.
- **A4** The rules that live only in `skills/ship-a-phase.md` and would be deleted with it (hard rule 9's
  title and VITAE canon and banned terms, the truth-source MCP rules and the UNGROUNDED label, playtests
  through the `playtester` agent, the per-workspace verify composition, `[T to confirm #n]` accepted at
  merge) are moved to AGENTS.md or `identity/`, and the skill points at them.
- **A5** `scripts/deadlines.mjs` and `scripts/check-deadlines.mjs` resolve a row id from either the build
  plan or a v2 spec's chunk alias (`alias: SM1a` on the chunk line), with tests for both, before the
  cut-over needs it.
- **A6** `plan/nexus.lock` pins nexus v2 at the kit ref the CLI carried on the day, written by `nexus
  upgrade --write` from a fresh fetch of origin; the upgrade report is the cut-over PR's body; its gate
  and `npm test` are green.
- **A7** Every KEEP and MERGE row of `docs/nexus-deviations.md` is carried, each ticked in the cut-over
  PR: custom skill sections into the kit skills' lanes (`skills/march.lanes.md`,
  `skills/iterate.lanes.md`) or kept files; the kept skills and commands untouched; v2's knobs at the
  conservative values plus `Promote: owner` and `Support: triage-only`. The map gains a `## Carried`
  section naming where each kept deviation now lives.
- **A8** The queue left at the cut-over is carried: each open row becomes a chunk of a v2 spec with its old
  id as `alias:`; a row only T does (attended or owner-led) is a Held line with `until:` its deadline Item's
  date, or `until: T's word` when it has none; the ten pre-revamp `[-]` rows are archived as dropped, any
  live carry-over filed as an AUDIT row; `check-deadlines` is green on the new plan.
- **A9** v2's land step (`skills/next/land.md`) lands code as a `loop:pr` PR on `loop/next-<chunk>` with
  the size, area and review labels; plan changes ride in the PR as `plan/pending/` files, never a push to
  main; the merge job settles a merged PR's pending files on main; the PR cap, `pr-autofix` and
  `pr-resolve` see these PRs as they see today's.
- **A10** `march.yml` and `night.yml` run v2's quota, cadence and idle steps ahead of the
  `_claude-skill.yml` call; the one-verb wrappers take v2's verb names; `heartbeat.yml` is added; the
  `claims` branch is migrated to v2's `claims.mjs` format; `loop-pr.test.mjs` follows every rename.
- **A11** `/pilot` exists (`skills/pilot.md`, `.claude/commands/pilot.md`): nexus's heads-down frame
  (plan read from origin, the two question gates, claims, the ledger and `/reboot-resume`, the end gate,
  `progress.mjs`) around our wave scheduler (the dependency map, one background worker per chunk in its
  own worktree running `/next`, the next wave once its prerequisite PR merges, a model per worker, the
  callout bus, push-once during review, one plot PR merging at a time, PR screenshots). `/pilot peek`
  launches nothing. Our `skills/heads-down.md` is retired; nexus's stays as the kit ships it.
- **A12** `.github/workflows/nexus-sync.yml` runs `npx @usenexus/cli upgrade --pr --no-assist` on a weekly
  schedule and by hand: one PR, updated in place, labelled `nexus-sync`, which only T merges: the merge
  job never merges it, and no loop verb, `/pilot` worker, `pr-autofix` or `pr-resolve` run merges it
  (`scripts/loop-pr.test.mjs` pins each). With nothing to sync it opens nothing. When nexus's
  `skills/heads-down.md` changed since the lock's ref, the body's first line is: "nexus changed
  /heads-down: walk the diff with T and bring /pilot up to date".
- **A13** T turns `march` and `night` back on and watches the first v2 tick; T's line on it goes in the
  run's report. (Attended.)
- **A14** The sync PR's body (written by `scripts/nexus-sync-body.mjs`) says plainly, and in pictures,
  what we are getting from nexus, in this order:
  1. a banner: "Only T merges this PR", the nexus version and kit ref we are on and the one this brings
     (`0.6.5 @ abc1234 → 0.7.0 @ def5678`), and the count of files by outcome;
  2. **What nexus is giving us**: one plain-words line per upstream change (from nexus's commit
     subjects and changelog between the two refs), grouped by the loop part it touches (picking work,
     landing, review, planning, workflows), each saying what changes for Miserere, not what changed in
     the file;
  3. a Mermaid flow diagram (GitHub draws it in the PR): nexus old ref → new ref → the three-way merge →
     Miserere, with one node per changed file coloured by outcome: taken as nexus wrote it (green), merged
     with our lanes (amber), conflict kept as ours (red);
  4. a file table: file, what nexus changed in plain words, what happens here (taken, merged, kept as
     ours), and the `docs/nexus-deviations.md` row it touches, if any;
  5. a before/after table for each changed skill or workflow whose behaviour moves (today the loop does
     X; after merge it does Y);
  6. **What we are not getting**: each conflict kept as ours, why (its map row), and what T can do about
     it (take nexus's version, or keep ours and say so in the map).
  Fixtures pin every section, the diagram's colour per outcome, and that a sync with no behaviour change
  says so in one line instead of an empty table.

## Decisions made upfront — DO NOT ASK

- **Nexus is never edited.** The kit comes in through `npx @usenexus/cli`; nothing in this plot opens a
  PR or pushes to the nexus repo. A gap in the upgrader is patched on our upgrade branch.
- **The open queue drains first** (T). No new old-style rows are plotted after the plots the deadline plan
  already asks for before Nov 11; what is left on Nov 11 is carried by hand (A8), not by the upgrader's
  converter.
- **The cut-over is attended** (NX1d): T sits with the upgrade report and the carried deviations. From
  NX1d's merge until NX1i, `march` and `night` stay disabled and nobody runs `/next`, `/heads-down` or
  `/pilot`, so the slices between them never meet a half-built landing.
- **Every change lands by PR** (T, D119): no direct pushes to main, plan-only included; D84's path split
  ends. `plot`, `review:rules-change` and `nexus-sync` PRs wait for T; the review merges the rest (D95).
- **Kept as ours**, per the map: the PR pipeline and its workflows, `_claude-skill.yml`, the content gate
  (D88, D99), rule 8, THE OPEN GATE's `[loop-call]`, `[owner]` candidates from `/messy`, `Closes #N` with
  `close-trailers.yml`, `.env` reads in `.claude/settings.json`, deadlines, NEEDS_T, the DevLog digest,
  lane-creator, vault, review and review-fix, fix-ci, consolidate.
- **The loop never writes a brief**: `Promote: owner`; an unchunked spec is filed for T's `/plot`, never
  chunked by a tick.
- **`/pilot`, not `heads-down`**, so the weekly sync never merges into it; nexus's `/heads-down` is kept
  stock beside it, and a change to it upstream is called out for T (A12).
- **The cut-over takes the newest CLI on the day** and records its version and kit ref in the lock and the
  PR. Accepted at merge (default).
- **Sync schedule**: Mondays 14:00 UTC, plus `workflow_dispatch`. Accepted at merge (default).
- **Sync PR label**: a new `nexus-sync` label the merge job holds for T. Confirmed by T (2026-10-31): yes,
  a sync PR only T can merge, and its description must make very clear what we get from nexus, with
  diagrams and visual explanations (A14).
- **`/pitch`**: the repo copy is Miserere's from now on; the global copy is left as it is.
  Accepted at merge (default).
- **Turning workflows on is T's** (AGENTS.md "Repository settings are T's alone"): NX1f writes the
  `gh workflow enable` lines as a NEEDS_T row; T runs them in NX1i.

## Save / schema contracts

None. No game save, engine type or Worker route changes.

## Phases

### Phase NX1a — Rules-change PRs wait for T; the resolver loses its bypass

Closes A1, A2. Requires nothing. Size: S.

Scope: `scripts/pr-merge.mjs` (hold `review:rules-change` as it holds `plot`) and its test,
`.github/workflows/pr-review.yml` if the hold lives there, `.github/workflows/pr-resolve.yml` (the
permission flags), `scripts/loop-pr.test.mjs` (the bypass rule), AGENTS.md "Pull requests".

Consumers: the merge job, the resolver run, T's PR list.

Tests: the merge decision for a `review:rules-change` PR with a passing verdict is "hold for T"; a
workflow fixture that pairs `allowed_tools` with `--dangerously-skip-permissions` fails the policy test.

Verify gate: root `npm test`.

Measure: the merge-job and policy tests pass and `pr-resolve.yml` carries no permission bypass.

### Phase NX1b — /pitch lives in the repo

Closes A3. Requires nothing. Size: S.

Scope: `.claude/skills/pitch/` (SKILL.md, config.md, references.md, replays.md, lenses/), the repo
config the skill reads (its §6), AGENTS.md rule 6, `scripts/loop-pr.test.mjs`.

Consumers: T's attended sessions, cloud sessions (which never see the global copy).

Tests: the never-fired-by-the-loop rule covers `/pitch`.

Verify gate: root `npm test`.

Measure: `/pitch` resolves from a fresh clone and the policy test passes.

### Phase NX1c — Ready for the cut-over: the canon out of ship-a-phase, deadlines read aliases

Closes A4, A5. Requires nothing. Size: M.

Scope: AGENTS.md and a new `identity/` file for the rules A4 names, `skills/ship-a-phase.md` pointing at
them, `scripts/deadlines.mjs`, `scripts/deadlines-lib*`, `scripts/check-deadlines.mjs` and their tests
(a chunk line `- [ ] **NN.k** … alias: SM1a`), `docs/nexus-deviations.md` (the rows this closes).

Consumers: every tick today (no behaviour change), the cut-over.

Tests: deadlines resolve an id from the build plan and from a spec fixture's alias; an alias named twice
fails the lint.

Verify gate: root `npm test`.

Measure: the deadlines suites pass on both fixtures and today's plan.

### Phase NX1d — The cut-over (attended)

Closes A6, A7, A8. Requires NX1a, NX1c. Size: L. T at the wheel, on or after 2026-11-11.

Scope: `npx @usenexus/cli upgrade --write` in a fresh clone of origin, then on its branch every row of
`docs/nexus-deviations.md` carried (A7) and the open queue carried by hand (A8); `plan/nexus.lock`;
the build-plan merge driver retired with the build plan. The PR body is the upgrade report plus the A7
checklist; it carries `review:rules-change`, so T merges it.

Consumers: every skill and tick after it.

Tests: the upgrade gate (plan-check, its test, workflow-lint), root `npm test`, `check-deadlines`.

Verify gate: root `npm test` and the upgrade report's gate, green.

Measure: the PR's checklist has every map row ticked and `node scripts/plan/order.mjs` names a carried
chunk first.

### Phase NX1e — v2's landing, our PRs

Closes A9. Requires NX1d. Size: L.

Scope: `skills/next/land.md` (our branch, labels, pending files), `scripts/pr-merge.mjs` (settle a
merged PR's `plan/pending/` files on main), `pr-autofix.yml`, `pr-resolve.yml` and the cap rule (the
`loop/next-` branches), `scripts/loop-pr.test.mjs`.

Consumers: `/next`, `/pilot`, the merge job.

Tests: a scratch-repo run of land: the PR has the branch and labels; a merged PR's pending file is
settled on main; the cap counts the PR.

Verify gate: root `npm test`.

Measure: the scratch-repo land and settle tests pass.

### Phase NX1f — The workflows on v2's steps; claims migrated

Closes A10. Requires NX1d. Size: M.

Scope: `march.yml`, `night.yml` (v2 quota, cadence and idle steps; night's own concurrency group), the
one-verb wrappers renamed, `heartbeat.yml`, `scripts/claims.mjs` replaced by v2's with the `claims`
branch migrated, `scripts/loop-pr.test.mjs`, a NEEDS_T row with the `gh workflow enable` lines.

Consumers: the cloud loop, `/pilot`'s claims.

Tests: workflow-lint; the claims migration on a fixture branch; the policy test on the renamed workflows.

Verify gate: root `npm test` and `node scripts/workflow-lint.mjs`.

Measure: workflow-lint is clean on every loop workflow and `claims.mjs list` reads the migrated branch.

### Phase NX1g — /pilot

Closes A11. Requires NX1e. Size: L.

Scope: `skills/pilot.md`, `.claude/commands/pilot.md`, `skills/heads-down.md` and its command restored to
the kit's, `scripts/heads-down-ledger.mjs` retired for `scripts/ledger.mjs`, AGENTS.md rule 6.

Consumers: T's attended runs.

Tests: `/pilot peek` on a plan fixture prints the waves and launches nothing; the never-fired-by-the-loop
rule covers `/pilot`.

Verify gate: root `npm test`.

Measure: a `/pilot peek` on today's plan prints waves that match the chunks' `needs`.

### Phase NX1h — The weekly nexus sync

Closes A12, A14. Requires NX1d. Size: M.

Scope: `.github/workflows/nexus-sync.yml`, a body script (`scripts/nexus-sync-body.mjs`: the banner, what
nexus is giving us, the Mermaid diagram, the file table, the before/after tables, what we are not getting,
the `/heads-down` line), the `nexus-sync` label, `scripts/pr-merge.mjs` (hold it),
`scripts/loop-pr.test.mjs` (nothing else merges it), `docs/nexus-deviations.md` ("How a sync reads this
map").

Consumers: T, weekly.

Tests: the body script on fixtures (no change, a conflict, a `heads-down.md` change, a merged lanes
file), each pinning the six sections of A14 and the diagram's colour per outcome; the merge decision holds
a `nexus-sync` PR, and no loop workflow or skill merges one.

Verify gate: root `npm test` and workflow-lint.

Measure: a hand-dispatched run opens the PR or reports nothing to sync, and T can say from its body
alone, without opening a file, what nexus is giving us.

### Phase NX1i — The loop back on (attended)

Closes A13. Requires NX1e, NX1f. Size: S. T enables `march` and `night` (NX1f's NEEDS_T row) and watches
the first tick from pick to merge.

Measure: the first tick's PR merges through the review and T's line is in the report.

## DoD

Every acceptance ID closed; `docs/nexus-deviations.md` names where each kept deviation lives; the first
nexus-sync PR has run.

## Follow-ups (not in this phase)

- The held loop-doctrine candidates (R11 watch, Nov 11) may be answered by v2 (the decisions log with a
  lifecycle is v2's `identity/decisions/`); T's Nov 11 review reads them against the cut-over.
- `CRITIQUE.md` (320 KB) and `AUDIT.md` over v2's state-diet caps: compacted by `/consolidate` after the
  cut-over.
- Offering our proven pieces upstream (acceptance proofs and the judge, first-parent gate counts, the PR
  pipeline) is nexus work, out of scope: T is not touching nexus.
