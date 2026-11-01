# Skill: pilot

> **T's parallel orchestrator (phase NX1g, ruling R5).** nexus's
> `/heads-down` frame wrapped around Miserere's parallel waves. T
> names some chunks, a spec or a goal; the session reads the plan
> from origin, cuts the chunks into waves from their `needs`, asks
> every question up front, claims the wave, and launches one
> background worker per chunk, each in its own git worktree running
> `/next <id>`. It carries every worker's callouts to the workers
> after it, starts the next wave only once its prerequisite PR has
> merged, keeps a ledger at every step so a crash resumes, asks the
> parked questions at the end and reports. It never builds.
> **Attended only. Never fired by the loop:** no `/march` step,
> cron, workflow or loop verb dispatches it. It runs when T types
> `/pilot`, or says "pilot" (or "heads down") on some chunks in an
> attended session.
>
> nexus's own `/heads-down` (`skills/heads-down.md`) stays as the kit
> ships it, beside this: it loops `/next` serially in one session.
> `/pilot` is ours, so the weekly sync never merges into it (§6).

## 1. Invocation

```
/pilot <id|alias|NN> ...    # these chunks (133.7, NX1g) or specs (133), and their open PRs
/pilot "<goal>"             # every open chunk the goal names, e.g. "finish the Defender lane"
/pilot                      # every ready chunk, in pick order
/pilot peek [<scope>]       # print the waves; launch nothing
/pilot resume               # pick the latest unended run back up from its ledger (§2 "Resume")
```

`peek` launches nothing, claims nothing and writes no ledger: it is
`node scripts/pilot-waves.mjs <scope>` printed as it is, and the
Step 2 plan around it.

## 2. The procedure

### Step 1 — Who, what and the waves

1. **Identity.** `node scripts/claims.mjs whoami` names this
   session's claims id (the first eight characters of its session
   id). The run's **owner** is `pilot:<claims id>`: it goes into the
   ledger, every claim and every worker prompt. A `resume` run keeps
   the ledger's owner, never its own new session's.
2. **The plan from origin.** `git fetch origin`, then read the plan
   at `origin/main` (`git show origin/main:plan/README.md`, the
   specs likewise), never the primary checkout's copy, which may be
   behind. Then the open PRs: `gh pr list --label loop:pr` (a chunk
   with an open PR is driven, not built) and `gh pr list --label
   plot` (chunks not yet on `main`).
3. **The waves.** `node scripts/pilot-waves.mjs <scope>` (no scope:
   every pickable chunk) prints them from the chunks' `needs` in
   /next's pick order: wave 1 is every chunk whose needs are all
   done; wave k+1 is what wave k's merges unlock. It sets apart, with
   why, every chunk that is held, claimed by someone else, or waiting
   on a need outside the run. Then adjust by hand:
   - two chunks that edit the same files are not parallel even with
     no `needs` between them: move one to the next wave;
   - an open `loop:pr` PR for a chunk joins wave 1 as a drive-to-green
     worker;
   - a spec with no chunks yet needs T's `/plot`; it is set apart.
   Be honest when parallelism is low. "One chunk now, one after it
   merges" is a real answer; say so instead of inventing fan-out.

### Step 2 — The verb and the model per worker

- **Verb.** A chunk: `/next <id>` (`skills/next.md`), built,
  gated, closed with its `plan/pending/` file and landed as a
  `loop:pr` PR (`skills/next/land.md`, `scripts/loop-land.mjs`) on
  `loop/next-<id>`. Never `/march` or `/next top`: they take no
  chunk, and two of them pick the same first chunk. An open PR:
  drive it to green with the `fix-ci --branch` posture
  (`skills/fix-ci.md` §3.5); the worker never merges it.
- **Model**, for efficiency, stated with its reason in the plan
  (`pilot-waves.mjs` proposes the first two by size):
  - **Sonnet** (the loop's default) for S and M chunks and for
    driving a PR to green;
  - **Opus** for L chunks, plot calls, mechanism mapping and
    chunks that cross several workspaces;
  - **Haiku** for nothing that touches the repo's hard rules
    (commits, PRs, plan files); at most read-only lookups.

### Step 3 — The question gate: show T the plan and ask everything now

This is the one place T is asked before work starts, after the waves
are mapped and before any write. Print the waves as a table (wave,
chunk or PR, verb, model and why, what it waits on, files it owns)
and `node scripts/plan/progress.mjs <specs> --ref origin/main` as it
is. Propose **three improvements** to the strategy (a chunk to split,
a wave to reorder, a model to change, a held chunk to unhold by a
call).

Then collect **every question the chunks will need**, from:

- the specs' `## Open questions` that touch these chunks, and any
  `[T to confirm #n]` marker still open in them;
- `## Your calls` items still open on any `plot` PR for them;
- `plan/NEEDS_T.md` rows that name them, and the `/oversight`
  queue's open items;
- ambiguities you find by reading each chunk's notes (read the spec
  of every chunk in scope; a worker that would have had to guess is a
  question).

Ask them all, with the plan and its three improvements, with
`AskUserQuestion` (`docs/asking-well.md`) in batches of **at most four
questions**, recommendation first and marked, each with its defer
path. Ask every batch before the first launch. When no question
turns up, say so in one line and go on. Record each answer against
the chunk it belongs to: it goes into that worker's prompt (Step 4,
item 5) as "T's answers", verbatim; an answer that settles a spec
question also goes into the chunk's pending file as an `## Edit`. A
`plot` PR's calls go to a calls worker as Step 7 describes. Tell T,
in the same message, not to merge or turn on auto-merge for any
`plot` PR a worker is about to edit (hard rule 6). `peek` stops here.

### Step 4 — Open the ledger, claim the wave, launch it

**The ledger first.** It is the kit's `scripts/ledger.mjs`: an
untracked `.nexus/sessions/<session id>.json` in the **primary
checkout** (the root `.gitignore` ignores `.nexus/`; a worktree's
copy would be lost with it, and the scratchpad does not survive a
restart). Open it on the first wave with the scope and the waves,
then beat it with the gate's answers:

```bash
node scripts/ledger.mjs beat --step gate --set kind=pilot --set owner=pilot:<id> --set loop="/pilot resume" --set scope="<scope>" --set waves='<json>'
node scripts/ledger.mjs beat --add 'gate.answers=<json>'
```

**Beat it at every step**: at launch `--set workers.<chunk>.status=running
--set workers.<chunk>.agentId=<id> --set workers.<chunk>.worktree=<path>
--set workers.<chunk>.branch=<branch> --set workers.<chunk>.model=<model>
--set-file workers.<chunk>.prompt=<file>` (the prompt is stored in the
ledger, so `resume` can relaunch it); at a report `--set
workers.<chunk>.status=pr-open --set workers.<chunk>.pr=<n>`; `--add
defaults=<…>` and `--add parked=<{q, alts: [], why, default}>` as
reports arrive; `--add done=<chunk>` once its PR merges; `end` at
wrap-up (Step 8). `worktree` and `branch` come back in the `Agent`
call's own launch result (`isolation: "worktree"`), before the
worker's first turn: beat them at launch, so a worker that crashes
before its first report still leaves `resume` a branch to check.

**Claim the wave** (an open PR is already a claim) in one call:

```bash
node scripts/claims.mjs claim <chunk> <chunk> ... --package
```

`--package` makes the wave one all-or-nothing claim: a contributor
(no `.owner`) claims one chunk per call otherwise. The claims are this session's (`s:<claims id>`, nexus v2). A refusal
names who holds what: drop those chunks from the wave, name each
holder in the wave note and the final report (never a mid-run
question), and claim the rest again. A tooling error: log its stderr
and launch anyway; the worker's own claim and the PR are the
fallback. Beat `--add claimed=<chunk>` for each. A run that began
as `heads-down:<id>` keeps that owner to its end: `claims.mjs` reads
an owner `heads-down:<id>` or `pilot:<id>` (`--owner`, or
`CLAIM_OWNER`) as the session `s:<id>`, so the same claims answer to
either (`scripts/claims-local.mjs`, NX1f).

Each worker runs `/next <id>`, whose Step 2 claims its chunk again
as this session (a renewal), and whose land step records the PR on
the claim (`claims.mjs pr <id> <n>`): the PR is the claim from there.

**Then launch**: one background subagent per chunk or PR, each in
its own git worktree. The prompt is self-contained; the worker sees
nothing of this conversation. It carries:

1. the chunk id and alias, its spec path and chunk notes, and the
   verb with its argument (`/next <id>`, branch `loop/next-<id>`);
2. the merged prerequisites (PR numbers and what they landed);
3. what NOT to touch: every sibling worker's PR, branch and owned
   files, named one by one;
4. the callouts so far that matter to this chunk (Step 5), pasted in;
5. **T's answers** from the Step 3 gate that concern this chunk,
   verbatim (or "none");
6. the house constraints that bite a worker (§5 notes);
7. **push once**: the branch is pushed when the verify gate is
   green, and not again while its review runs; a second push
   mid-review cancels the `judge` and red-gates the old SHA;
8. **UI shots, when the chunk changes what is on screen**: a before
   and after of every screen it touches, shown in the PR description
   and never committed (§4, hard rule 10);
9. **the park rule**: never ask T. When a call comes up, take the
   recommended default and log it under `DEFAULTS:`. Park any
   genuine new question under `PARKED:` and carry on building the
   default;
10. **the claim session**: `NEXUS_SESSION=<claims id>` for every
    `claims.mjs` call, so
    `/next`'s claim reads as a renewal and its release touches only
    its own chunk;
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
project but not the chunk can answer: say in words what it decides.
Write `none` under a line with nothing to list. A report with
neither a `DEFAULTS:` nor a `PARKED:` line goes back to its worker,
like a report with no `SHOTS:` line.

### Step 5 — The callout bus

Keep a running digest in the session's scratchpad: one block per
worker report, its callouts verbatim, and every `DEFAULTS:` and
`PARKED:` entry tagged by chunk for the end gate. Beat its path
once (`--set digest=<path>`), so a resumed session finds it. Paste
the callouts tagged for a chunk into that chunk's worker prompt
(Step 4, item 4) and every `all` callout into every later prompt.
The digest is the session's working memory, not a lessons log:
durable lessons reach `plan/lessons.md` only through each worker's
own retro (`skills/march.md` §3 "Retro"). Never write a second
lessons file, and never copy the digest into a skill.

### Step 6 — React, then the next wave

- **Renew at every worker report and every wave start**:
  `node scripts/claims.mjs renew`, then beat the ledger. Claims last
  24 h from their last renewal; this keeps them alive on a long run.
- A worker's PR goes red: forward the failing check and log line to
  the owning worker (`SendMessage`); never patch it yourself.
- Mutation or review reports: forward to the owner as advisory.
- T's decision mid-run: relay it to the worker it concerns.
- A `loop:pr` PR merges itself on a green adversarial review (D95).
  Start wave k+1 only when its prerequisite PR has **merged on
  `main`** (`gh pr view <n> --json state,mergedAt`), never on a green
  check alone; re-run `node scripts/pilot-waves.mjs <scope>` on the
  fresh `origin/main` first, and print `progress.mjs` as it is.
  Claim the next wave as Step 4 says before launching it.

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
(the ledger's `parked` and the digest, de-duplicated) with
`AskUserQuestion` in batches of at most four, recommendation first,
each stating the default the worker took. No parked question: say so
and skip. Then route each answer that **contradicts** a default:

- the chunk's PR is still open: send it to that worker
  (`SendMessage`) as a follow-up commit to make after the review
  verdict. The push-once rule holds: no push while the review runs;
- the PR has merged: offer T a `/plot` (AGENTS.md rule 8) in one
  `AskUserQuestion`; never hand-make the fix.

An answer that agrees with the default needs no action.

Release the claims the session still holds without a PR, then end the
ledger:

```bash
node scripts/claims.mjs release <chunk> ...
node scripts/ledger.mjs end
```

Name only chunks whose worker has finished. Never release a chunk
whose worker is still running. An ended ledger is never resumed.

Then report to T in one block: each merged PR (number, chunk, one
line), each PR still open and what it waits on, every default taken
and every answer to a parked question, the open items for T (calls,
`plot` PRs to merge, attended chunks), `progress.mjs` as it is, and
the callout digest grouped by the chunk it matters to.

### Resume — `/pilot resume`

A restart kills background workers with no report. Resume reads the
ledger instead of guessing from transcripts. It asks T nothing
(hard rule 11): the gate's answers, defaults and parked questions are
in the ledger.

1. `node scripts/ledger.mjs list` names the sessions; the run is the
   newest `kind: pilot` one that is `fallen` or `parked` (none: say
   there is nothing to resume and stop). `node scripts/ledger.mjs
   take <star | id>` makes this session its runner and prints it;
   from then on this session's beats write that ledger. The owner is
   the ledger's `owner`, never this session's. `/reboot-resume` on a
   pilot ledger re-runs its `loop`, which is `/pilot resume`: the
   same path.
2. Renew its claims (`node scripts/claims.mjs renew`; the taker
   carries the session's claims, nexus v2). A claim that expired
   meanwhile is gone: claim the chunk again (Step 4) and drop it if
   another session holds it.
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
     answer): relaunch it from its saved prompt (the ledger's
     `workers.<chunk>.prompt`) under the same claim session. A branch
     that has commits is checked out by the new worker, which
     continues it.
4. Beat the ledger for each decision, then continue from the first
   unfinished wave per Step 6: a wave starts only on a merged
   prerequisite. The callout digest is at the ledger's `digest` path;
   if that scratchpad is gone, rebuild it from each worker's PR body
   and the `CALLOUTS:` it left there.

A run that began before NX1g on the retired `.heads-down/` ledger is
picked up through `scripts/heads-down-ledger.mjs`, a shim that moves
it into `.nexus/sessions/` on its first call and forwards `beat`,
`show`, `latest` and `end`.

## 3. Hard rules

1. **Never fired by the loop.** Only T fires it, attended.
2. **The orchestrator never builds.** Workers build; it maps,
   launches, relays and reports. It never merges a PR, never
   force-pushes, never pushes `main`.
3. **One worker per chunk, `/next <id>`, never `/march`.** Each in
   its own worktree.
4. **A wave starts on a merge, not on a green check.** And never past
   the PR cap (D85) unless T rules otherwise for the run.
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
   `plan/README.md` and `plan/deadlines.md`; `pr-resolve` settles it
   after the next push to `main`. Wait for it before the next merge.
8. **Durable lessons go through the workers' own retro** into
   `plan/lessons.md`; the callout digest is never a second log.
9. **No emojis, no attribution trailers** (AGENTS.md rule 2).
10. **UI shots live in the PR description, never in the repo.** A
    worker whose chunk changes what is on screen puts a before and
    after of each touched screen in its PR body (§4). It never stages
    a shot: they are written outside the worktree, and the only PNGs
    a PR commits are the `baseline:approve` baselines it already owes.
    A report with no `SHOTS:` line, or a UI PR whose body has no
    shots and no reason, goes back to its worker.
11. **Questions only at the two gates.** T is asked at the Step 3
    gate (everything the chunks need, before the first launch) and the
    Step 8 end gate (everything parked). Never mid-run: workers take
    the default and park, and the orchestrator relays T's own
    mid-run decisions but does not start questions of its own.
12. **A crash never releases claims.** Only a worker's PR (the claim
    from then on) and the orchestrator's wrap-up release a claim; a
    dead session or worker leaves its claims to the 24 h TTL so the
    work is kept, and `resume` renews them.
13. **Every step beats the ledger.** The plan is read from origin,
    never the primary checkout.

## 4. UI before/after shots (tell every UI worker)

A chunk is a UI change when its diff touches `axiomancer-mobile/src/`,
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
     file into the editor and keep the
     `https://github.com/user-attachments/assets/...` URL GitHub writes
     in. These live in GitHub's attachment store, not in any branch.
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
   `gh api -X PATCH repos/no-trbl-2-u/Miserere-mei-deus/pulls/<N> -F body=@<file>`,
   one row per screen:

```
## Screenshots

| Screen | Before (`main`) | After (this PR) |
|---|---|---|
| village | <img src="<before url>" width="320"> | <img src="<after url>" width="320"> |
```

## 5. Environment notes (tell every worker)

- **Restarts kill workers silently.** A container restart ends
  background workers with no report; a finished worker's result may
  arrive only as an output file. After a restart run `/pilot resume`
  (§2 "Resume"). A stale worktree can still hold the branch name:
  push from a new local branch with `git push origin HEAD:<branch>`.
- **Telemetry.** Stop hooks write the session's `telemetry/` shard;
  commit it with a plain message whenever asked, and never edit rows.
- **GitHub.** `gh` GraphQL may be refused (403) in the cloud
  container: use REST (`gh api`) or the `mcp__github__` tools.
- **The worktree guard** refuses compound Bash that contains git,
  `$var` in option positions, `sed -i` on a variable path, and
  heredoc python that contains "git". One plain command per call;
  write scripts with Write and run them with node.
- **Fresh worktrees have no `node_modules`.** Run `npm install` at
  the root first, or the root `npm test` shows false failures; revert
  any `package-lock.json` churn before committing.

## 6. Where each part comes from (read at every nexus sync)

T's standing rule (R5, `docs/nexus-deviations.md`): when a weekly
nexus sync changes nexus's `skills/heads-down.md`, the sync PR says
so first (A12), and T and a session walk the diff and bring the
`nexus` rows below up to date here. The `ours` rows change only by
T's word. The kit ref these rows were last matched to:
`51b70f4` (`plan/nexus.lock`, nexus CLI 0.6.5).

| Part of `/pilot` | From | nexus `/heads-down` section it tracks |
|---|---|---|
| The plan read from origin, never the primary checkout | nexus | §3 Step 1.2, hard rule 2 |
| Drop held, claimed and pending-closed chunks, and name them | nexus | §3 Step 1.3 |
| The question gate before any write: every question in batches | nexus | §3 Step 2, hard rule 1 |
| Claims taken for the list before work starts, refusals dropped and named | nexus | §3 Step 3 |
| `progress.mjs` printed at the gate, at each wave and at the end | nexus | §3 Step 4, "Print progress" |
| The ledger (`scripts/ledger.mjs`), beaten at every step; `kind`, `loop`, `defaults`, `parked`, `done` | nexus | §3 Step 4, hard rule 5 |
| Resume from the ledger (`ledger.mjs take`, `/reboot-resume`) | nexus | §1, `skills/reboot-resume.md` |
| The end gate: parked questions asked, contradicting answers fixed, claims released, ledger ended | nexus | §3 Step 5, hard rule 4 |
| Every build is a full `/next` under all its rules | nexus | §3 Step 4, hard rule 3 |
| Waves cut from the chunks' `needs` (`scripts/pilot-waves.mjs`), `peek` | ours | none (nexus loops serially) |
| One background worker per chunk, each in its own worktree | ours | none |
| A model per worker, by size and kind | ours | none |
| The next wave only once its prerequisite PR merges on `main` | ours | none |
| The callout bus and the digest between waves | ours | none |
| The worker prompt (items 1-11) and the fixed final-report shape | ours | none |
| The park rule's `DEFAULTS:` / `PARKED:` lines per worker | ours (nexus parks in `/oversight`) | §3 Step 4 prompt, "park" |
| Push once during review; one `plot` PR merging at a time; calls workers | ours | none |
| PR screenshots (§4) and the environment notes (§5) | ours | none |
| Attended only, never fired by the loop | ours | none |
