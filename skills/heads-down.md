# Skill: heads-down

> **T's orchestrated parallel shipping (2026-10-28).** T names some
> build-plan rows or a goal ("finish the Defender lane"); the session
> becomes an orchestrator. It maps which rows can ship in parallel
> now and which wait for a merge, shows T the waves with a model per
> worker, then launches one background worker per row, each in its
> own git worktree, running `/ship-a-phase` on its row (or driving an
> open PR to green). It carries every worker's callouts to the
> workers after it, starts the next wave only when its prerequisite
> PR has merged, and reports at the end. It never does the build work
> itself. **Attended only. Never fired by the loop:** no `/march`
> step, cron, workflow or loop verb dispatches it. It runs when T
> types `/heads-down`, or says "heads down" on some rows in an
> attended session.
>
> Codified from the DF1d/DF1e run of 2026-10-27/28 (wave 1: DF1d and
> the open PR #987; wave 2: DF1e once DF1d merged).

## 1. Invocation

```
/heads-down <id> <id> ...      # these build-plan rows (and their open PRs)
/heads-down "<goal>"           # every open row the goal names, e.g. "finish the Defender lane"
/heads-down peek <ids|goal>    # map the waves and print the plan; launch nothing
/heads-down resume             # pick the latest unended run back up from its ledger (§2 "Resume")
```

`peek` launches nothing, claims nothing and writes no ledger.

## 2. The procedure

### Step 1 — Map the graph

First fix the run's identity. The **session id** is the first eight
characters of this session's id (the suffix of its `telemetry/`
shard), and the **owner** is `heads-down:<session id>`. The owner goes
into every claim (Step 4) and every worker prompt, and the session id
names the ledger (Step 4). A `resume` run keeps the ledger's owner,
never its own new session's.

Read `plan/steps/01_build_plan.md` (Status block), then the open PRs:
`gh pr list --label loop:pr` (claims, D85) and `gh pr list --label
plot` (rows not yet on `main`). For each row in scope, note:

- its state: `[ ]` pickable, already claimed by an open `loop:pr` PR
  (drive that PR instead of building), `(attended)`, held on another
  row's outcome (grep `plan/phases/` for its id, `skills/march.md` §3
  "Pickable phase" rule 5), or briefless (it needs `/plot <N>` first);
- its `Requires`, and whether each is ticked `[x]` on `main`.

Build the dependency graph and cut it into **waves**: wave 1 is every
row (and open PR) that can move now with no unmerged prerequisite;
wave k+1 is what wave k's merges unlock. Two rows that edit the same
files are not parallel even with no `Requires` between them: put one
in the next wave. Count against the PR cap (5 open `loop:pr` PRs,
D85): a wave that would push past it waits.

Be honest when parallelism is low. "One row now, one after it
merges" is a real answer; say so instead of inventing fan-out.

### Step 2 — Pick the verb and the model per worker

- **Verb.** A row: `/ship-a-phase phase <id>` (`skills/ship-a-phase.md`
  §2). Never `/march`: it takes no row argument, and two concurrent
  marches pick the same first row, because a row is only claimed once
  its PR is open. An open PR: drive it to green with the `fix-ci
  --branch` posture (`skills/fix-ci.md` §3.5); the worker never
  merges it.
- **Model**, for efficiency, stated with its reason in the plan:
  - **Sonnet** (the default; `_claude-skill.yml` runs the loop on it)
    for S and M phases and for driving a PR to green;
  - **Opus** for briefs, plot calls, mechanism mapping and L phases
    that cross several workspaces;
  - **Haiku** for nothing that touches the repo's hard rules
    (commits, PRs, plan files); at most read-only lookups.

### Step 3 — The question gate: show T the plan and ask everything now

This is the one place T is asked before work starts. It runs after
the waves are mapped and before any launch. Print the waves as a
table (wave, row or PR, verb, model and why, what it waits on, files
it owns). Then propose **three improvements** to the strategy (a row
to split, a wave to reorder, a model to change, a held row to unhold
by a call).

Then collect **every question the rows in scope will need**, from:

- `[T to confirm #n]` markers still open in each row's brief;
- `## Your calls` items still open on any `plot` PR for those rows;
- `plan/NEEDS_T.md` rows that name them;
- ambiguities you find by reading each brief (Read the brief of
  every row in scope; a worker that would have had to guess is a
  question).

Ask them all, together with the plan and its three improvements, with
`AskUserQuestion` (`docs/asking-well.md`) in batches of **at most four
questions**, recommendation first and marked, each with its defer
path. Ask every batch before the first launch. When no question
turns up, say so in one line and go on. Record each answer against
the row it belongs to: it goes into that worker's prompt (Step 4,
item 5) as "T's answers", verbatim. A `plot` PR's calls go to a calls
worker as Step 7 describes. Tell T, in the same message, not to merge
or turn on auto-merge for any `plot` PR a worker is about to edit
(hard rule 6). `peek` stops here.

### Step 4 — Launch the wave

**Open the ledger and claim the wave first.** Both run before the
first worker starts and never under `peek`.

The ledger is `scripts/heads-down-ledger.mjs`, an untracked
`.heads-down/<session id>.json` in the **primary checkout** (the root
`.gitignore` ignores `.heads-down/`; a worktree's copy would be lost
with the worktree, and the scratchpad does not survive a restart). On
the first wave, start it with the scope and the waves, then beat it
with the gate's answers:

```bash
node scripts/heads-down-ledger.mjs start --session <id> --scope "<scope>" --waves '<json>'
node scripts/heads-down-ledger.mjs beat --session <id> --push 'gate.answers=<json>'
```

The ledger records the scope and the waves; each worker's `row`,
`agentId`, `worktree`, `branch`, `model`, `promptFile`, `status` and
`pr`; the claims; the gate's answers, the defaults and the parked
questions; and the callout digest's path (Step 5). **Beat it at every
step**: `beat --worker <row> --set status=running --set agentId=<id>
--set worktree=<path> --set branch=<branch> --set model=<model>
--prompt-file <file>` at launch (it copies the prompt to
`.heads-down/<id>/prompts/<row>.md`), `--set status=pr-open --set
pr=<n>` at a report, `--push 'gate.defaults=<json>'` and
`--push 'gate.parked=<json>'` as reports arrive, and `end` at wrap-up
(Step 8). `worktree` and `branch` come back in the `Agent` call's own
launch result (`isolation: "worktree"`), before the worker's first
turn, not from a worker report: beat them at launch, so a worker that
crashes before its first report still leaves `resume` (§2 "Resume") a
branch to check.

Claim the wave's **rows** (an open PR is already a claim, D85) in one
call, all or nothing:

```bash
node scripts/claims.mjs claim <row> <row> ... --owner heads-down:<id>
```

- **Exit 0** (`claimed <row> by ...`): launch the wave. Beat
  `--push claims=<row>` for each.
- **Exit 1** prints `held <row> by <holder> until <time>` for each
  refused row and writes nothing. Drop those rows from the wave, name
  each holder in the wave note and the final report (never a
  mid-run question), and claim the rest again.
- **Exit 3** is a tooling error: log its stderr and launch anyway.
  The worker's own claim and the PR and mirror checks are the
  fallback (best-effort, like the mirror).

Each worker runs `/ship-a-phase`, whose Step 2 claims its row again
under the same owner (a renewal), and whose Step 12.5 releases that
row alone once its PR opens: the PR is the claim from there.

Then launch: one background subagent per row or PR, each in its own
git worktree (isolation). The prompt is self-contained; the worker
sees nothing of this conversation. It carries:

1. the row id, the brief path and its `§`, and the verb with its
   argument;
2. the merged prerequisites (PR numbers and what they landed);
3. what NOT to touch: every sibling worker's PR, branch and owned
   files, named one by one;
4. the callouts so far that matter to this row (Step 5), pasted in;
5. **T's answers** from the Step 3 gate that concern this row,
   verbatim (or "none");
6. the house constraints that bite a worker (§5 notes);
7. **push once**: the branch is pushed when the verify gate is
   green, and not again while its review runs; a second push
   mid-review cancels the `judge` and red-gates the old SHA;
8. **UI shots, when the row changes what is on screen**: a before
   and after of every screen it touches, shown in the PR description
   and never committed (§4, hard rule 10);
9. **the park rule**: never ask T. When a call comes up, take the
   recommended default and log it under `DEFAULTS:`. Park any
   genuine new question under `PARKED:` and carry on building the
   default;
10. **the claim owner**: `CLAIM_OWNER=heads-down:<session id>`, to be
    set for every `claims.mjs` call the verb makes. `/ship-a-phase`
    Step 2's claim then reads as a renewal, and Step 12.5 releases
    only its own row;
11. the fixed final-report shape:

```
STATUS: pr-open | green | blocked
PR: <number or none>
CHECKS: <commands and results>
SHOTS: <screens attached, and how> | none: <not a UI change, or why not>
DEFAULTS:
- <call> | took: <option> | why: <reason>
PARKED:
- q: <whole question> | alts: <a; b> | default taken: <x> | why: <reason>
CALLOUTS:
- footgun: <what> | file: <path or n/a> | fix: <how to avoid> | matters to: <next phase id or all>
OPEN: <anything for T>
```

A parked `q` is a **whole question** that someone who knows the
project but not the row can answer: say in words what it decides.
Write `none` under a line with nothing to list. A report with
neither a `DEFAULTS:` nor a `PARKED:` line goes back to its worker,
like a report with no `SHOTS:` line. Keep every worker's `DEFAULTS:`
and `PARKED:` entries in the digest (Step 5), tagged by row, for the
end gate.

### Step 5 — The callout bus

Keep a running digest in the session's scratchpad: one block per
worker report, its callouts verbatim. Beat the digest's path into the
ledger once (`beat --set digest=<path>`), so a resumed session finds
it. Paste the callouts tagged for a
row into that row's worker prompt (Step 4, item 4) and every `all`
callout into every later prompt. The digest is the session's working
memory, not a lessons log: durable lessons reach `plan/lessons.md`
only through each worker's own skill retro (`skills/march.md` §3
"Retro"). Never write a second lessons file, and never copy the
digest into a skill.

### Step 6 — React, then the next wave

- **Renew at every worker report and every wave start**:
  `node scripts/claims.mjs renew --owner heads-down:<id>`, then beat
  the ledger (`--worker <row> --set status=<status> --set pr=<n>`).
  Claims last 24 h from their last renewal, and this is what keeps
  them alive on a long run.
- A worker's PR goes red: forward the failing check and log line to
  the owning worker (`SendMessage`); never patch it yourself.
- Mutation or review reports: forward to the owner as advisory.
- T's decision mid-run: relay it to the worker it concerns.
- A `loop:pr` PR merges itself on a green adversarial review (D95).
  Start wave k+1 only when its prerequisite PR has **merged on
  `main`** (`gh pr view <n> --json state,mergedAt`), never on a green
  check alone; re-read the build plan from `origin/main` first. Claim
  the next wave's rows as Step 4 says before launching it.

The orchestrator never builds, edits, commits to or merges a
worker's branch.

### Step 7 — New loop work mid-run

When T asks for new loop work during the run ("let's add…", "make a
phase for…"), route it through `/plot` (or `/messy` for a loose dump)
per AGENTS.md rule 8. Ask T's calls in the session with
`AskUserQuestion`, then hand the answers to a worker that applies
them to the `plot` PR as `skills/plot.md` §3 "Answering T's calls"
lays out. That worker fetches the PR's state before its first edit
(hard rule 6).

### Step 8 — The end gate and wrap up

Before the final report, ask T every parked question of the run
(each worker's `PARKED:` entries, de-duplicated) with
`AskUserQuestion` in batches of at most four, recommendation first,
each stating the default the worker took. No parked question: say so
and skip. Then route each answer that **contradicts** a default:

- the row's PR is still open: send it to that worker (`SendMessage`)
  as a follow-up commit to make after the review verdict. The
  push-once rule holds: no push while the review runs;
- the PR has merged: offer T a `/plot` (AGENTS.md rule 8) in one
  `AskUserQuestion`; never hand-make the fix.

An answer that agrees with the default needs no action.

Release the claims the session still holds without a PR, then end the
ledger:

```bash
node scripts/claims.mjs release <row> ... --owner heads-down:<id>
node scripts/heads-down-ledger.mjs end --session <id>
```

Name only rows whose worker has finished (a row whose PR opened was
released by its worker already). `release --all --owner
heads-down:<id>` is the same call when no worker is still running.
Never release a row whose worker is still running.

Then report to T in one block: each merged PR (number, row, one line),
each PR still open and what it waits on, every default taken and
every answer to a parked question, the open items for T (calls,
`plot` PRs to merge, attended rows), and the callout digest grouped
by the phase it matters to.

### Resume — `/heads-down resume`

A restart kills background workers with no report. Resume reads the
ledger instead of guessing from transcripts. It asks T nothing
(hard rule 11): the gate's answers, defaults and parked questions are
in the ledger.

1. `node scripts/heads-down-ledger.mjs latest` names the latest
   unended ledger (no output, exit 1: say there is nothing to resume
   and stop), and `show` prints it. The owner is that ledger's
   `heads-down:<session id>`, never this session's.
2. Renew its claims: `node scripts/claims.mjs renew --owner
   heads-down:<ledger id>`. A claim that expired meanwhile is gone:
   claim the row again (Step 4) and drop it if another owner holds it.
3. For each worker whose status is not final (not `pr-open`,
   `green`, `blocked` or `merged`), try `SendMessage` to its
   `agentId`; no answer means it died. Then read its state on origin:
   `git ls-remote --heads origin <branch>` and `gh pr list --head
   <branch> --state all --json number,state`:
   - **a live PR** (open): drive it with a fresh worker in the
     `fix-ci --branch` posture (`skills/fix-ci.md` §3.5), never by
     hand; a merged PR is done;
   - **a dead or empty worker** (no branch, a branch with no PR and
     no commits past `main`, or a branch with commits but no
     answer): relaunch it from its saved prompt,
     `.heads-down/<ledger id>/prompts/<row>.md`, with the same
     `CLAIM_OWNER`. A branch that has commits is checked out by the
     new worker, which continues it.
4. Beat the ledger for each decision, then continue from the first
   unfinished wave per Step 6: a wave starts only on a merged
   prerequisite. The callout digest is at the ledger's `digest` path;
   if that scratchpad is gone, rebuild the digest from each worker's
   PR body and the `CALLOUTS:` it left there.

## 3. Hard rules

1. **Never fired by the loop.** Only T fires it, attended.
2. **The orchestrator never builds.** Workers build; it maps,
   launches, relays and reports. It never merges a PR, never
   force-pushes, never pushes `main`.
3. **One worker per row, `/ship-a-phase phase <id>`, never `/march`.**
   Each in its own worktree.
4. **A wave starts on a merge, not on a green check.** And never past
   the PR cap (D85).
5. **Every worker is told which sibling PRs, branches and files to
   leave alone.**
6. **No `plot` PR merges under a calls worker.** T merged #1003 by
   hand mid-edit; #1001 had auto-merge on, and `pr-resolve`'s merge
   of main cleared its conflict, so auto-merge fired before the
   answers landed. Tell T not to merge or enable auto-merge on a
   `plot` PR while a calls worker runs; the worker fetches the PR
   state before editing. If it merged anyway, land the answers as a
   follow-up plot PR off `main` titled `plot: <N> — T's calls
   (<date>)` and comment a pointer on the merged PR.
7. **One `plot` PR merges at a time.** Two open at once conflict on
   `plan/steps/01_build_plan.md` and `plan/deadlines.md`;
   `pr-resolve` settles it after the next push to `main`. Wait for it
   before the next merge.
8. **Durable lessons go through the skills' own retro** into
   `plan/lessons.md`; the callout digest is never a second log.
9. **No emojis, no attribution trailers** (AGENTS.md rule 2).
10. **UI shots live in the PR description, never in the repo.** A
    worker whose row changes what is on screen puts a before and after
    of each touched screen in its PR body (§4). It never stages a
    shot: they are written outside the worktree, and the only PNGs a
    PR commits are the `baseline:approve` baselines it already owes.
    A report with no `SHOTS:` line, or a UI PR whose body has no
    shots and no reason, goes back to its worker.
11. **Questions only at the two gates.** T is asked at the Step 3
    gate (everything the rows need, before the first launch) and the
    Step 8 end gate (everything parked). Never mid-run: workers take
    the default and park, and the orchestrator relays T's own
    mid-run decisions but does not start questions of its own.
12. **A crash never releases claims.** Only a worker's PR opening
    (Step 12.5 of its verb) and the orchestrator's wrap-up release a
    claim; a dead session or worker leaves its claims to the 24 h TTL
    so the work is kept, and `resume` renews them.

## 4. UI before/after shots (tell every UI worker)

A row is a UI change when its diff touches `axiomancer-mobile/src/`,
`axiomancer-mobile/app/` or a screen's layout constants, or its PR
carries `area:ui` or `area:mobile`. The reviewer reads the shots from
the PR body (`skills/review.md`), so they must be there before the
review runs: attach them as soon as the PR opens. Editing the PR body
is not a push, so it keeps the push-once rule.

1. **Capture, outside the worktree.** Write every shot to
   `/tmp/pr-shots/<branch>/`, named `pr<N>-<screen>.before.png` and
   `pr<N>-<screen>.after.png`.
   - **Before** is `origin/main`. A screen with a committed baseline:
     `git show origin/main:axiomancer-mobile/screenshots/baseline/<screen>.png`
     into the before file. A screen without one: capture it on a
     detached `origin/main` worktree the same way as the after shot,
     or write "new screen" in its before cell.
   - **After** is the branch head: `npm run verify:visual` in
     `axiomancer-mobile/` leaves it in `screenshots/current/<screen>.png`
     (gitignored); copy it out. A state no route renders: the
     `playwright` MCP (`browser_take_screenshot`), saved to the same
     directory.
   - Only screens the diff touches, at most six pairs. Name any left
     out in the PR body.
2. **Host, outside the repo.** Use the first route that works:
   - **A browser signed in to GitHub** (the Chrome MCP in T's
     attended session): open the PR, edit the description, drop each
     file into the editor (a drag-and-drop, or `browser_file_upload`
     on its file input) and keep the
     `https://github.com/user-attachments/assets/...` URL GitHub writes
     in. These live in GitHub's attachment store, not in any branch.
     The cloud container's `playwright` MCP is signed in to nothing,
     so this route needs T's browser.
   - **The `pr-shots` prerelease** (the headless default): release
     assets are not git objects, and on this public repo they render
     for anyone who opens the PR. Create it once if
     `gh release view pr-shots` fails:
     `gh release create pr-shots --prerelease --latest=false --target main --title "PR screenshots (not a release)" --notes "Before/after shots for PR descriptions. Never a game release."`.
     Upload each file:
     `gh release upload pr-shots /tmp/pr-shots/<branch>/pr<N>-<screen>.after.png --clobber`.
     Its URL is
     `https://github.com/no-trbl-2-u/Miserere-mei-deus/releases/download/pr-shots/pr<N>-<screen>.after.png`.
   - Neither works: write `SHOTS: none: <why>` in the report and a
     "Screenshots not attached: <why>" line in the PR body. Never
     commit the shots to get round it, and never push them to any
     branch.
3. **Show them.** Add a `## Screenshots` section to the PR body with
   `gh api -X PATCH repos/no-trbl-2-u/Miserere-mei-deus/pulls/<N> -F body=@<file>`
   (`gh pr edit` needs GraphQL, refused here), one row per screen:

```
## Screenshots

| Screen | Before (`main`) | After (this PR) |
|---|---|---|
| village | <img src="<before url>" width="320"> | <img src="<after url>" width="320"> |
```

## 5. Environment notes (tell every worker)

- **Restarts kill workers silently.** A container restart ends
  background workers with no report (one died a minute in, its branch
  empty); a finished worker's result may arrive only as an output
  file. After a restart run `/heads-down resume` (§2 "Resume"): it
  reads the ledger, renews the claims, and relaunches the dead
  workers from their saved prompts. A stale worktree can still
  hold the branch name: push from a new local branch with `git push
  origin HEAD:<branch>`.
- **Telemetry.** Stop hooks write the session's `telemetry/` shard;
  commit it with a plain message whenever asked, and never edit rows.
- **GitHub.** `gh` GraphQL is refused (403) in the cloud container:
  use REST (`gh api`) or the `mcp__github__` tools.
  `create_pull_request` takes no labels; add them with an
  `issue_write` update after.
- **The worktree guard** refuses compound Bash that contains git,
  `$var` in option positions, `sed -i` on a variable path, and
  heredoc python that contains "git". One plain command per call;
  write scripts with Write and run them with `python3 -I`.
- **Fresh worktrees have no `node_modules`.** Run `npm install` at
  the root first, or the root `npm test` shows false failures; revert
  any `package-lock.json` churn before committing.
