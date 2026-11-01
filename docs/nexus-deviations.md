# Where Miserere's loop deviates from nexus, and why

Miserere adopted nexus on 2026-07-03 (`d300fdcba`, from nexus `90d4a3f`) and
never synced again. Nexus has since shipped v1.0.0 (2026-10-20) and v2.0.0
(specs and chunks; CLI `@usenexus/cli` 0.6.5). This map lists every place our
loop differs from the kit, why (commit, date, D-id), whether v2 now does it,
and what to do at the upgrade. It is the input to the upgrade plot and, after
the cut-over, the record a nexus sync reads so our kept deviations survive.

Verdicts: **TAKE** = drop ours, take nexus v2. **KEEP** = ours is load-bearing
for this project. **MERGE** = take v2, carry a named piece on top (usually as
a lane in `skills/march.lanes.md` / `skills/iterate.lanes.md`, which a sync
never overwrites).

Mapped 2026-10-31 from a `nexus upgrade` dry run against origin `435b939` plus
a read of every loop skill, workflow, script, AGENTS.md rule and plan file.

---

## The short version

- **Most of the planning machinery: TAKE.** v2's specs and chunks, Asap and
  Held lanes, `needs`, claims, the pick-order scripts, footguns ladder, state
  diet and decisions log are the same ideas we grew by hand, done better.
  Half our briefs (49 of 121) are already chunk-shaped.
- **The PR pipeline: KEEP.** `loop:pr` PRs, the adversarial review fan-out,
  the merge job, pr-autofix, pr-resolve and its merge drivers, acceptance
  proofs plus the judge, size/area/review labels, the PR cap. v2 has nothing
  like it (its PR mode is unproven, nexus spec 39).
- **The game rules: KEEP.** Content only from T's briefs (D88/D99), `/plot`
  and `/messy` are T's alone (rule 8), deadlines, NEEDS_T (D94), the DevLog
  digest, lane-creator, vault, VITAE/title canon, kb-query / axio-query.
- **The one real seam: landing.** Ours is a hybrid neither v2 mode matches:
  code by PR with auto-merge on review, plan files pushed straight to main
  (D84), plot PRs merged by T (D93, D101). v2's `/next` land step has to be
  adapted to it.

## What a plain upgrade would break

The dry run is green, but run as-is it would:

1. **Drop the whole open queue.** Its row parser takes `Phase <digits><one
   letter>` only; every open row has a family id (`CD1a`, `SM1i`, `R12`) and
   178 shipped rows start with `(#PR)`. 0 of 40 open rows convert; the loop
   would idle into `/iterate`. Briefs are also looked up by row id, not
   family (`phase_SM1_*.md`), and `[-]` partial rows are archived as shipped.
2. **Switch landing to owner mode** (push everything to main), from three old
   `Cloud-Run` commits. Plot PRs, T's only review point, would vanish.
3. **Overwrite customized skills wholesale.** Kit-named skills and commands
   are replaced, not merged. Only march and iterate have their custom
   sections moved to lanes; plot, messy, digest, heads-down, oversight,
   critique, expand and triage lose ours silently, and ship-a-phase and
   plan-a-phase are deleted with every rule they carry.
4. **Leave `march.yml` alone**, because its Claude step lives in
   `_claude-skill.yml`. (Harmless: `/march` runs whatever the skill says.)
5. **Turn on v2 defaults that break our rules** if their knobs move off the
   conservative values: `/plot asap` from the Support SLA (rule 8), `Promote:
   aged` writing specs (the loop never writes a brief), refill generators
   (D88).

---

## Skills

| Skill | Ours does | Why | v2 | Verdict |
|---|---|---|---|---|
| march | Landing split by path: code as `loop:pr` on `loop/<verb>-<slug>`, plan/telemetry/reports/devlog straight to main | D84 (R11, 2026-10-12) | partial | MERGE (custom land step) |
| march | PR cap: at 5 open `loop:pr` only triage + critique run | D85, raised 3 to 5 `ed0f2f913` | none | KEEP (pre lane) |
| march | Every tick lists PRs 7d+ old, `loop:pr-stuck`, NEEDS_T rows; never closes a PR | D86, D87, D94 | none | KEEP |
| march | One `size:*`, `area:*`, `review:*` label per PR; fixed PR body | T 2026-10-14 (`e21b47c0c`, `56c0072cb`) | none | KEEP |
| march | Acceptance proofs: each ticked line names a test or `(no test: reason)`; the judge re-runs them | LG1c/f, FM2b, BV3 | partial | KEEP |
| march | CI watch via `gh pr checks --required --watch`, 3 tries then pr-autofix | R11 | none | KEEP |
| march | Gate distances count `main`'s first-parent history only | `2b0c75bae`, lesson `gate-commit-count` | none | MERGE |
| march | Report sweep files unfiled `docs/reports/*.md` into CRITIQUE | RS1 | none | KEEP (pre lane) |
| march | Pick rules, gate rules, claims, worktree discipline | various | v2-better | TAKE |
| march | The loop never writes a brief; a briefless row is filed "needs `/plot <N>`" | R11 | conflicts | KEEP (`Promote: owner`) |
| ship-a-phase | Builds one row from its brief | adoption | replaced by `/next` | TAKE the shape |
| ship-a-phase | Deadlines rewrite on close (`deadlines.mjs --write`) | DL1b | none | KEEP (into close) |
| ship-a-phase | axio-query for engine facts, kb-query for prior art, UNGROUNDED label | `0549fab82`, `60b82f575` | none | KEEP: moved to `AGENTS.md` § Building a phase ("Truth sources first"), NX1c |
| ship-a-phase | Playtests through the `playtester` agent, up to 4 | PH1b | none | KEEP: moved to `AGENTS.md` § Building a phase ("Playtests"), NX1c |
| ship-a-phase | Monorepo verify per workspace; `check-comments` bans D-numbers in code | RH1 | partial | MERGE: the composition moved to `AGENTS.md` § Building a phase ("Verify per workspace"), NX1c |
| ship-a-phase | Save migration with a test for anything removed from a save | revamp §5 rule 4 | none | KEEP: moved to `AGENTS.md` § Building a phase ("Save compatibility"), NX1c |
| ship-a-phase | Hard rule 9: title, VITAE the one bar, banned terms | D47, D63 | none | KEEP: moved to `identity/principles.md` P1 to P3, NX1c |
| ship-a-phase | `[T to confirm #n]` accepted at merge | `0d5d9e4e4` | none | KEEP: moved to `AGENTS.md` § Building a phase ("Calls left open"), NX1c |
| plan-a-phase | Refresh a brief, attended only | R11, D93 | v2 spec format better | TAKE |
| plan-a-phase | Cite the D-numbers; `docs/truth-sources.md` order of authority; HISTORICAL specs are background | trim T5, D88 | none | KEEP: moved to `AGENTS.md` § Building a phase ("Order of authority", "Cite the D-numbers"), NX1c |
| plot | Lands as a `plot` PR T merges; `What you'll see` / `Your calls` body; `@claude 1: yes` answering via claude.yml; merge = agreement | D93, D101, `0d5d9e4e4` | none | KEEP |
| plot | Every new row gets a home in `plan/deadlines.md` | DL1c, DL2b | none | KEEP (most at risk) |
| plot | Never fired by the loop (tested) | rule 8 | v2 can fire it | KEEP |
| plot | Splitting, `and do`, pending files, spec claims | v2 | v2-better | TAKE |
| messy | Output is `[owner]` candidates T promotes, plus deadlines reconcile | R11, D88, DL1c | v2 writes `idea` specs | KEEP |
| messy | Worktree, one agent per theme, pending file | v2 | v2-better | TAKE |
| heads-down | Parallel waves, one worker per row in its own worktree, model per worker, callout bus, push-once during review, one plot PR merging at a time, PR screenshots | `8a6a07e41` (2026-10-28) | none (v2's same name loops `/next` serially) | KEEP, renamed |
| heads-down | Claims, ledger, resume | HW1 (copied from v2) | v2-better | TAKE |
| oversight | `[loop-call]` ratify sweep; NEEDS_T leads Q0; asking-well | OPEN GATE (2026-08-28), D94 | partial | MERGE |
| oversight | R11 watch counts | `a68039899` | none | drop after 2026-11-11 |
| oversight | `audit` mode removed | `ba658cba9`, reason unknown | v2-better | TAKE |
| iterate | Content gaps filed, never fixed | D88, D99 | none (v2 builds content) | KEEP (lane) |
| iterate | Defect found in-tick fixed in its own commit | D90 | none | MERGE |
| iterate | Game audit categories, roster health, kb/axio | `f347ac0aa`, RH1 | none | KEEP (lanes, already seeded) |
| critique | Plays expo-web as a first-time player; fixture boot; `critique:drive`; playtester agents; `passes.jsonl` | Phase 34, PH1b, LG1e | partial | KEEP |
| digest | The DevLog: dated public entries, `**Why:**` cards, evidence plates, `devlog/PUBLISH` gate, measured truth | `cb788468e`, `03df2daa6`, `d70198cbe`, D115 | none | KEEP (most at risk) |
| expand | Signals from mechanics specs and kb; content as `[content]` | D88, D89 | none | KEEP |
| triage / expand / critique | Decide unclear calls as `[loop-call]`, never park | OPEN GATE | v2 parks `[needs-user-call]` | ruling R4 |
| jot | Trimmed copy | adoption | equivalent | TAKE |
| consolidate | Monthly memory compaction, lexicon sweep, bearings never shortened in locked parts | phase 25 | partial | KEEP |
| fix-ci | Red main first responder; `--branch` for red PRs (Haiku x2); `--resolve` | D87 | none | KEEP |
| review, review-fix | Adversarial reviewer fan-out, runs from main's copy, verdict drives merge; one fix pass | RV1-RV3, D95, D101 | none | KEEP |
| commands/* | Thick copies of skill logic, already stale (march.md still says cap 3, T merges) | various | v2 thin | TAKE |
| commands/lane-creator, vault | Real attended flows | D102, OV1b | none | KEEP |

## Workflows, scripts, hooks

Our whole Claude workflow layer is our own: on 2026-07-04 (`d5dd4dcaa`) we
replaced the kit's `march.yml` with a shared runner, `_claude-skill.yml`,
that every workflow calls. **`march` and `night` are disabled on GitHub since
the R11 pause (`ddf6edf22`, 2026-10-12)**; ticks today come from attended
sessions and `/heads-down`.

| File | Ours does | Why | v2 | Verdict |
|---|---|---|---|---|
| `_claude-skill.yml` | The one runner: PAT checkout, guard self-test, kb probe, grants, pre/post run, telemetry commit | `d5dd4dcaa`, phase 72, R11 | none | KEEP (+ v2's `BASH_MAX_TIMEOUT_MS`) |
| `march.yml` | Calls the runner with `/march`, every 2h, Opus, 75 min | `d5dd4dcaa`, `b11caaf24` | v2-better scheduling | MERGE (v2 quota/cadence/idle steps in front) |
| `night.yml` | `/digest` odd days into the DevLog | `b53dac5d3` | partial | MERGE (own concurrency group) |
| one-verb wrappers | iterate, critique, expand, ship-a-phase, plan-a-phase, triage, consolidate | adoption | equivalent (`verb` input) | MERGE (rename to v2 verbs) |
| `pr-review.yml` + `pr-*.mjs` | verify-gate, reviewer, merge job (`PR_AUTO_MERGE` kill switch), fixer, mutation | RV1-RV4, D95, D101, LG1 | none | KEEP |
| `pr-autofix`, `ci-autofix`, `pr-resolve` | Red PR / red main / conflicts, with our three merge drivers | D87, MD1 | partial | KEEP |
| `close-trailers.yml` | Closes issues from `Closes #N` (GitHub's parser is inert here) | phase 48 | none | KEEP |
| `claude.yml` | `@claude` responder; plot call answers | `0d5d9e4e4` | none | KEEP |
| `deadlines.yml` + scripts | `LIVE_DEADLINES.md`, the deadlines lint | T 2026-10-19, DL1 | none | KEEP |
| `heartbeat.yml` | (v2 only) watchdog for wedged runs | | v2 | TAKE |
| `claims.mjs` | Orphan `claims` branch, our own entry format | HW1b | v2-better | TAKE, migrate (same branch name, different format) |
| `heads-down-ledger.mjs` | `.heads-down/` ledger | HW1c | v2 `ledger.mjs` | TAKE |
| `loop-issue.mjs` | Kit file, doubled: close-trailers and deploy-comment sweeps | phases 35, 48, 91 | partial | MERGE |
| `deploy-check.mjs` | Kit file tuned for path-filtered verify runs | `3375fe986` | partial | MERGE |
| merge drivers | lessons/NEEDS_T, build plan, deadlines | ML1, MD1 | v2 pending files | KEEP deadlines + lessons; build-plan driver dies with the build plan |
| `check-lessons`, `check-plan-queues`, `report-sweep`, `check-harness-grants`, `eval/*`, `loop-pr.test.mjs` | Lints and reviewer scoring | R11, LG1, RS1, EV1 | none / partial | KEEP (`loop-pr.test` updated with any rename) |
| `.claude/hooks/guard.mjs` | Kit file + pre-write baselines guard, post-write lints, session-start | `b59647f2d`, R11 | partial | MERGE (v2 base, our three hooks on top) |
| `.claude/settings.json` | Allows `.env` reads (runner's `gh` auth relies on it) | `289323a46` | v2 denies `.env` reads | ruling R9 |
| `notify.mjs` | Unchanged | | equal | TAKE |

**Security note.** `pr-resolve.yml` runs Haiku with `allowed_tools: 'Read,Edit'`
*and* `--dangerously-skip-permissions`. Bypass mode likely ignores the allow
list, so the "no shell" promise probably does not hold (untested). v2's
resolver uses `--permission-mode acceptEdits` without bypass. Fix at the
upgrade either way.

## Doctrine and plan shape

| Area | Ours | Why | v2 | Verdict |
|---|---|---|---|---|
| AGENTS rule 1 | Hybrid landing (above) | D84, D93 | partial | ruling R1 |
| AGENTS rule 5 | CI-green is the deploy gate | D87 | partial | KEEP |
| AGENTS rule 6 | Asking only in named skills; THE OPEN GATE | 2026-08-28 | equivalent in spirit | TAKE + ruling R4 |
| AGENTS rule 7 | File the residue before a tick ends | `10377ae7a` | partial | KEEP |
| AGENTS rule 8 | T's direction only via `/plot` / `/messy` | R11 | partial | KEEP |
| AGENTS rule 9 | `Potential Assets/` is a store | D96 | none | KEEP |
| kit rule 8 | "Blocked is loud" is missing (only in reflexes) | | v2 has it | TAKE |
| AGENTS "Nexus" section | Stale: says T merges, lists v1 verbs, cites D58 | drift | | TAKE |
| CLAUDE.md | Carries rules (routing, deadline reminder, telemetry) | accreted | v2: pointer only | MERGE (move to AGENTS; reminder must survive) |
| bearings | Loop law as D-citing paragraphs; stale R11 / revamp text | D84-D101 | v2 `identity/decisions/` | MERGE |
| bearings knobs | march 2h, timeouts, digest odd days, `/expand` bold | as cited | v2 knob slots | KEEP values |
| lessons / reflexes | Slug ladder, 2x automate, 3x reflex | R11, D94 | v2 footguns, better | TAKE (keep D94 split) |
| NEEDS_T | Fixes only T can make | D94 | none | KEEP |
| deadlines | W1-W5, every Item a T act | T 2026-10-19/28 | none | KEEP: the old-id alias map is the chunk line's `alias:` (shipped: the ARCHIVE line's `(alias: …)`), read by `deadlines.mjs` and `check-deadlines.mjs` since NX1c |
| AUDIT / CRITIQUE | 178 KB / 320 KB; stale "revamp support" bias | accreted | v2 state diet (256 KB cap) | TAKE, compact |
| PHASE_CANDIDATES | `[owner]` rows | R11 | `CANDIDATES.md` | TAKE (renamed by the upgrader) |
| `[blocked: owner-led]` | 9 locks with no timeout | D46/D64 | Held lines with `max_age` | TAKE |
| `(attended)` rows | 17 open rows T does himself | march §3 | no native type | ruling R2 |
| asap | LIFO (newest asap first) | `skills/plot.md` | Asap lane, FIFO | TAKE (order flips; written in today's order) |
| Decisions log | One file, D1-D118, gaps and collisions | accreted | `identity/decisions/2026.md` | TAKE (candidate held to 11-11) |
| Part plans | `loop-gates`, dated prompt/decision files, `revamp/`, `labyrinth/`, `ideas/`, `card-ledger/` (a deployed Pages dir) | /messy, D46, D102 | partial | MERGE (`card-ledger/` stays put) |

## The open queue the conversion must carry

40 open rows in 21 families, 17 of them attended; 9 owner-led blocked rows;
10 `[-]` partial rows from July-August.

| Family | Open | Attended |
|---|---|---|
| SM1 | SM1a-i (9) | SM1i |
| MC1, CD1, CX1, ST1 | MC1a-c, CD1a-b, CX1a-b, ST1a-b | none |
| HP4, HP2 | HP4e-g, HP2d-f | HP4e, HP2e |
| BW1, IO1 | BW1d-e, IO1b, IO1d | BW1d, IO1b, IO1d |
| MF1, DF1, EL1, BV1 | MF1e, DF1f, EL1d, BV1c | all four |
| R12, PF2, LG1, OV1, BE2, FM2, SB1 | one each | all |
| UP1 | UP1h (needs blocked B2) | none |
| Owner-led | B1, B2, B5-B10, TP1b | all T's |
| Partial `[-]` | 90, 52b, 47c-e, V2, V3, V6, V7, W5 | none |

Each family becomes one spec; each row a chunk `NN.k` with its old id kept as
an alias, so deadlines, D-entries and briefs still resolve. `Requires`
becomes `needs`; brief `Measure:` prose is renamed (v2 reserves `Measure:`
for the A-ID count).

---

## Rulings (T, 2026-10-31)

Ruled in session; recorded as D119 and planned as Phase NX1
(`plan/phases/phase_NX1_nexus_v2.md`).

| # | Ruling | T ruled |
|---|---|---|
| R1 | Landing | **Every change by PR**, reviewed and auto-merged, except `plot` and `review:rules-change` PRs, which T merges ("let the reviewers do their thing, then merge it"). Plan changes ride in the PR as v2 pending files. New: today rules-change PRs auto-merge (D101); NX1a holds them. |
| R2 | The open queue | **Drain it, then cut over on Nov 11.** No new old-style rows past the plots the deadline plan asks for before then; what is left is carried by hand as v2 chunks (old ids as aliases), T-only rows as Held lines. |
| R3 | May the loop chunk a spec? | No: the loop never writes a brief; `Promote: owner`. |
| R4 | THE OPEN GATE | Keep ours (`[loop-call]`). |
| R5 | heads-down | **Merge into `/pilot`**: nexus's frame, our parallel waves, workers on `/next`. Nexus's `/heads-down` stays stock; every sync that changes it is called out so T and a session bring `/pilot` up to date. |
| R6 | messy output | Keep `[owner]` candidates. |
| R7 | The 10 pre-revamp `[-]` rows | Archive as dropped; live carry-overs become AUDIT rows. |
| R8 | Issue closing | Keep `Closes #N` + close-trailers. |
| R9 | `.env` reads | Keep ours. |
| R10 | Cleanups | Unblock TP1b, clear AUDIT's stale revamp bias, retire the Hermes change log if Hermes is gone, fix the pr-resolve bypass (NX1a). |
| R11 | march and night back on | After the cut-over, on the merged YAML; T turns them on (NX1i). |
| R12 | `/pitch` | Pull the global skill into the repo (NX1b). |
| R13 | Staying current | A weekly sync PR (NX1h), held for T. |

---

## Carried

Where each KEEP and MERGE row above lives since the cut-over (phase NX1d,
2026-11-01, `npx @usenexus/cli@0.6.5 upgrade --write`, kit ref `51b70f4`,
`plan/nexus.lock`). A sync reads this table: a file named here as ours is
one a three-way merge should keep. "Deferred" names the NX1 phase that
finishes the row.

| Map row | Verdict | Lives now | State |
|---|---|---|---|
| march: landing split by path | MERGE | `skills/march.lanes.md` notes "Landing a change"; `plan/bearings.md` `Landing: pr` | carried as notes; v2's land step adapted in NX1e |
| march: PR cap (D85) | KEEP | `skills/march.lanes.md` lane `pr-cap` (pre, end-tick) | carried |
| march: 7d+ / stuck PRs / NEEDS_T every tick | KEEP | `skills/march.lanes.md` lane `pr-watch` (pre, continue) | carried |
| march: size, area, review labels; PR body | KEEP | `skills/march.lanes.md` notes "Landing a change" (labels, Body template) | carried |
| march: acceptance proofs and the judge | KEEP | the same notes; `scripts/pr-acceptance.mjs`, `scripts/pr-judge.mjs` unchanged | carried |
| march: CI watch, 3 tries then pr-autofix | KEEP | `skills/march.lanes.md` notes "Shipping a chunk", Step 12 | carried |
| march: gate distances on first-parent history | MERGE | `skills/march.lanes.md` notes "Gate distances (first-parent)" | carried as notes |
| march: report sweep (RS1) | KEEP | `skills/march.lanes.md` lane `report-sweep` (pre, continue) | carried; now runs before triage, not after |
| march: the loop never writes a brief | KEEP | `plan/bearings.md` `Promote: owner` | carried |
| ship-a-phase: deadlines rewrite on close (DL1b) | KEEP | `skills/march.lanes.md` notes "Shipping a chunk", Step 11 | carried until NX1e folds it into the close |
| ship-a-phase / plan-a-phase rules (truth sources, canon, playtests, verify, save, calls left open, D-numbers) | KEEP / MERGE | `AGENTS.md` § Building a phase; `identity/principles.md` P1-P3 (NX1c) | carried; both skills retired |
| plot: `plot` PR T merges, the body, `@claude` answers, merge = agreement | KEEP | `skills/plot.md` §7.1, 7.3-7.5 (kit text above it) | carried |
| plot: every new chunk gets a deadlines home | KEEP | `skills/plot.md` §7.2 (aliases, Held lines, the reconcile) | carried |
| plot: never fired by the loop | KEEP | `skills/plot.md` §7.6; `scripts/loop-pr.test.mjs` | carried |
| messy: `[owner]` candidates, deadlines reconcile | KEEP | `skills/messy.md` §7 | carried |
| heads-down: parallel waves | KEEP, renamed | `skills/heads-down.md`, `.claude/commands/heads-down.md` (ours, unchanged) | kept; becomes `/pilot` in NX1g, nexus's `/heads-down` restored then |
| oversight: `[loop-call]` ratify, NEEDS_T Q0, asking-well | MERGE | `skills/oversight.md` (ours, refs updated) | kept ours whole; v2's lock asks and audit mode not folded in yet (first sync) |
| iterate: content gaps filed; in-tick defect commit; game audit categories | KEEP / MERGE | `skills/iterate.lanes.md` (19 lanes the upgrader moved, verbatim) | carried |
| critique, digest, expand, triage (and R4's `[loop-call]`) | KEEP | `skills/critique.md`, `skills/digest.md`, `skills/expand.md`, `skills/triage.md` (ours, refs updated) | kept |
| consolidate, fix-ci, review, review-fix, lane-creator, vault | KEEP | their own files (the upgrader kept them; vault's command body moved to `skills/vault.md`) | kept |
| `_claude-skill.yml` | KEEP | ours, plus v2's after-the-model steps behind `loop_gates` (quota read, pause, idle record, no-op reason), `NEXUS_SESSION`, `NEXUS_NO_HOOK_CHECK`, `BASH_MAX_TIMEOUT_MS`; tokens moved from the job env to the steps (workflow-lint) | done in NX1f |
| `march.yml`, `night.yml`, one-verb wrappers | MERGE | a `gate` job runs v2's cadence, dispatch ceiling, quota and idle steps (night: quota) before the runner; night in its own `night` group; the manual input is `chunk` (`/next <chunk>`); `ship-a-phase.yml` and `plan-a-phase.yml` renamed `ship-a-chunk.yml` and `plan-a-spec.yml`; still disabled (NEEDS_T `enable-march-night`, NX1i) | done in NX1f |
| `heartbeat.yml` | TAKE | the kit's template as it ships | done in NX1f |
| `pr-review.yml` + `pr-*.mjs`, pr-autofix, ci-autofix, pr-resolve | KEEP | unchanged, but `pr-resolve` no longer registers the build-plan driver | kept |
| close-trailers, claude.yml, deadlines.yml | KEEP | unchanged but claude.yml's route points at plot §7.4, deadlines.yml's paths at the specs | kept |
| `loop-issue.mjs` | MERGE | ours (the kit's replacement reverted) | kept ours; merge at the first sync |
| `deploy-check.mjs`, `guard.mjs` | MERGE | ours (the kit's copy list does not carry them) | kept |
| `claims.mjs` | TAKE, migrate | the kit's text plus eight marked `Miserere` lines calling `scripts/claims-local.mjs` (ours: `--owner` / `CLAIM_OWNER`, row aliases claimed as their chunks, v1 entries read as v2, `release --all`, aliased ARCHIVE lines read by the audit); `.claude/hooks/guard.mjs` pre-bash writes the kit's `.nexus/hooks/<session>` marker that `whoami` and `claim` require; `scripts/claims-migrate.mjs` rewrites the branch once | done in NX1f; the live branch migrates on its first v2 write after the merge |
| merge drivers | KEEP deadlines + lessons | `.gitattributes`, `.claude/settings.json`, `pr-resolve.mjs` `MERGE_DRIVERS` | build-plan driver retired; its module stays as `deadlines-merge.mjs`'s core |
| lints and `loop-pr.test.mjs` | KEEP | pins repointed to the lanes, plot §7, `next.md`, `plan-a-spec.md` | carried |
| `.claude/settings.json` `.env` reads (R9) | KEEP | unchanged | kept |
| AGENTS rules 1, 5, 7, 8, 9; THE OPEN GATE | KEEP | `AGENTS.md` (rule 1 loses the build-plan driver; rule 7 files chunks through `/plot`) | kept |
| CLAUDE.md | MERGE | refs updated in place | move to AGENTS left for a later chunk |
| bearings: D-citing loop law; knob values | MERGE / KEEP | `plan/bearings.md` (unchanged values, `## Loop knobs` added) | `identity/decisions/` not adopted yet |
| deadlines, NEEDS_T, DevLog, part plans, `card-ledger/` | KEEP | unchanged; aliases resolve through `deadlines-lib.mjs` (NX1c) | kept |
| `[blocked: owner-led]`, `(attended)` rows (R2) | TAKE | Held lines in `plan/README.md` with `since`/`until`/`max_age` | carried |
| the ten `[-]` rows (R7) | archive as dropped | `plan/ARCHIVE.md` dropped lines; one `plan/AUDIT.md` row for the carry-overs | carried |
