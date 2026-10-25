# Skill: plot

> **T's intake for one known task (R11, D93).** Turns a request from
> T into one spec brief, decides how many phases it takes, and opens
> a PR with the brief and one build-plan row per phase, slotted where
> T wants it. T reads the recommendation in the PR and merges it to
> approve. Never builds. Never fired by the loop: no `/march` step,
> cron, workflow or loop verb dispatches it. It runs when T types
> `/plot`, or when T, in conversation, asks for loop work and the
> agent routes it here (AGENTS.md rule 8).
>
> Modelled on the `hunt` repo's `.claude/commands/plot.md`: one spec,
> chunked so each chunk is one tick. `/plot` is to the build plan what
> `/jot` is to `plan/CRITIQUE.md`.

## 1. Invocation

```
/plot asap "<task>"       # slot at the top of the open rows
/plot anytime "<task>"    # slot after the last open row
/plot peek "<task>"       # orient + research + shape, print the spec and its
                          # phases, commit nothing, open no PR
/plot "<task>"            # no word: the skill picks asap or anytime and says why
/plot <N>                 # write the missing brief for existing row N
                          # (what a "needs a brief: /plot <N>" candidate asks for)
```

## 2. The procedure

### Step 1 — Orient

Read, in order: `plan/bearings.md` (standing decisions, "Decisions
standing for the autonomous loop"), `plan/reflexes.md`, the Status
block of `plan/steps/01_build_plan.md`, the heads of `plan/AUDIT.md`
and `plan/CRITIQUE.md` Pending, `plan/PHASE_CANDIDATES.md` for a row
that already covers the task, and the open `plot` PRs
(`gh pr list --label plot`) so two plots never take the same phase id.

### Step 2 — Research

- What already exists in code and plan for this task (grep the
  packages; read the nearest part plan in `plan/revamp/` or
  `plan/<topic>.md`). Mark each part of the task *already built*,
  *already planned* (row, brief or candidate) or *new*. Don't plan
  what is built; extend what is planned instead of duplicating it,
  and say so.
- Which D-numbers it touches
  (`plan/2026-09-25-refactor-strategy.decisions.md`).
- Which content surfaces it touches, and what D88 allows: cards,
  keywords, art, enemies, relics, maps, NPCs and events are all
  allowed because T is asking now (D99 lifted the card hold).
- **Map the mechanisms.** Read the code each acceptance statement
  will lean on. A primitive the code lacks is either put in a
  phase's scope or named under Follow-ups (`skills/plan-a-phase.md`
  §5 Step 4); never assumed.

### Step 3 — Shape the spec and decide the phases

Write **one** brief, `plan/phases/phase_<N>_<topic>.md`, in the
format of `skills/plan-a-phase.md` §4. `<N>` is the next free phase
id, checked against `01_build_plan.md` and the open `plot` PRs. It
always carries acceptance IDs `A1…` for the whole task and one
`Measure:` line for its Outcome.

Then decide how many phases it takes. The test is the tick: **each
phase must ship as one `/march` tick, one PR** (`skills/ship-a-phase.md`
§7 rule 12; bearings: "a tick that genuinely needs more should be
split, not have its cap raised silently"). Size each candidate
phase:

- **S** — under an hour of agent work, one workspace.
- **M** — one focused tick: one surface, a handful of suites.
- **L** — a full tick at the edge of the job budget.
- Anything bigger is split into **vertical slices**, each of which
  ships something runnable and testable on its own. Never a slice
  that leaves `main` broken or a promise of another spec half kept
  until a later slice lands.

Split also when the pieces differ in kind: a piece that needs T at
the wheel (an Android check, an owner-only decision) is its own
`(attended)` phase so the rest can still run unattended; a contract
(shared types, a save migration) that later pieces build on is its
own phase, first.

Then write it down:

- **One phase** (the usual small task): the brief is an ordinary
  §4 brief with a `Size: <S|M|L>` line under Outcome, and the row
  is `Phase <N>`. No `## Phases` section.
- **Several phases**: the brief adds a `## Phases` section
  (`skills/plan-a-phase.md` §4, "Phases"). Ids are `<N>a`, `<N>b`, …
  (`<N>1`, `<N>2`, … when `<N>` already ends in a letter, as
  `R10b2`). Rules:
  - every acceptance ID is closed by exactly one phase (`closes
    A1, A3`); a split statement is split into two IDs, never shared;
  - order is carried by `requires`, naming exact phase ids, never by
    prose; the first phase that delivers visible value comes as
    early as its contracts allow;
  - each phase carries its own Scope, Consumers, Save/schema, Tests
    and Verify gate; the shared sections (Sources, Outcome,
    Acceptance, Measure, Decisions, DoD, Follow-ups) stay at the
    top and bind every phase;
  - each phase has its own one-line `Measure:` naming what proves
    *its* slice.

Resolve every ambiguity under "Decisions made upfront — DO NOT ASK";
if a call is genuinely T's and the session is attended, ask it
(`AskUserQuestion`, at most 4 questions, recommendation first,
`docs/asking-well.md`). If T is not present to answer, record the
leading option as a decision and mark it `[T to confirm #n]`,
numbered 1, 2, … in the order they appear in the brief. The PR
body's `## Your calls` lists each one under the same number (Step
5); a call T answers later by comment is rewritten in place
(§3 "Answering T's calls"), and one still open when T merges is
the default, accepted (§4 "Merge means agreement").

### Step 4 — Slot

Add one row per phase to the Status block of
`plan/steps/01_build_plan.md`, together and in `requires` order:

- `asap` → directly above the first open (`[ ]`) row.
- `anytime` → after the last open (`[ ]` or `[blocked: …]`) row.
- no word → pick one and state the reason in the PR body
  (blocking a pending row or fixing a live defect → asap; otherwise
  anytime).

Row shape: `- [ ] Phase <id> — <title> (plotted by T, <date>): <one
line>. Brief \`plan/phases/phase_<N>_<topic>.md\`` then, for one of
several phases, ` § <id>`, then `. Requires <ids or nothing>.` Mark
a row `(attended)` only if T says so or Step 3 made it an attended
phase. Add one Queue change log entry (same commit) naming every
phase id the plot added. If a "needs a brief: `/plot <N>`" candidate
existed, move it to Rejected as "briefed".

**Reconcile the deadline plan** (phase DL1c), in the same commit as
the rows. `plan/deadlines.md` is edited by hand here; nothing
regenerates it from the build plan except the Status cells:

- **Every row the plot added** gets a home: name it in an `## Items`
  row whose due date sits inside its Window (a `needs plot` Item
  this plot answers has its `needs plot` replaced by the new ids), or
  a `- <id> — <reason>` line under `## Unscheduled` ("date not set"
  when the date is T's to pick and T is not here to pick it). Never
  guess a date for T.
- **Every Item the plot supersedes, re-scopes or completes** is
  edited itself, not only its Rows cell: its name, date or rows are
  changed to the work that now finishes it, or a `T` Item T has
  already done is ticked `[x]`. Read each open Item in the plot's
  window and ask whether its premise still holds once these rows
  exist. This is the one drift no lint sees: an Item whose rows
  still exist but whose premise is gone (the `W1 demo: T plays the
  three demos` Item of 2026-10-20) passes every check.
- **One `## Change log` line** at the top of that section names
  what was added, edited and ticked, and why.

Then re-derive the Status cells and run the lint (coverage, ids,
windows, Status); both must be clean before Step 5:

```bash
node scripts/deadlines.mjs --write && git checkout -- LIVE_DEADLINES.md
node scripts/check-deadlines.mjs
```

### Step 5 — Open the PR (D93)

A plot is plan-only, but it lands by PR so T can read the
recommendation before the loop can pick it: `/march` reads `main`,
so the rows are not pickable until T merges. Check out a fresh
branch before the first edit (Steps 3–4 write on it):

```bash
git fetch origin main
git switch -c "loop/plot-<N>-<slug>" origin/main
# Steps 3-4 edit here
git add plan/phases/phase_<N>_<topic>.md plan/steps/01_build_plan.md plan/PHASE_CANDIDATES.md plan/deadlines.md
git commit -m "phases: plot <N> — <title>" -m "<k> phase(s): <ids>. <asap|anytime> because <reason>."
git push -u origin "loop/plot-<N>-<slug>"
gh label create plot --repo "$GH_REPO" --color 5319E7 \
  --description "/plot recommendation; T merges to approve (D93)" 2>/dev/null || true
# one phase: size:S|M|L (its Size line); several phases: size:multi-phase
gh pr create --repo "$GH_REPO" --base main --head "loop/plot-<N>-<slug>" \
  --label plot --label "<size:S|size:M|size:L|size:multi-phase>" \
  --label review:plan-only --label "area:<area the phases will touch>" \
  --title "plot: <N> — <title>" --body-file "$body"
```

**Size label (T, 2026-10-14).** Every `plot` PR carries exactly one
size label so T can spot the estimate in the PR list: `size:S`,
`size:M` or `size:L` for a one-phase plot (the brief's `Size:` line),
`size:multi-phase` for a plot that splits (the per-phase sizes are in
the PR's phase table). Every `plot` PR also carries `review:plan-only`
(it never changes code) and at least one `area:*` label naming what
the phases will touch (`skills/march.md` §3 "Area and review labels"),
picked from the labels that exist (`gh label list --search area:`):
`gh pr create` fails on an unknown label.
The labels are created by `skills/march.md` → "Landing a change" if
missing.

From a worktree that holds uncommitted work you must not commit (a
prototype), cut the branch in a clean `git worktree add -b
loop/plot-<N>-<slug> <tmp> origin/main` instead (lesson
`plot-from-dirty-worktree`).

The PR carries the `plot` label, **never `loop:pr`**: it does not
count toward the PR cap (D85) and is not a claim. `pr-resolve` keeps
it mergeable like a `loop:pr` PR (D87).

**The body is written for T first, the builder second (T,
2026-10-25).** The brief speaks to the agent that builds the phase;
the PR body opens by saying what the player or T will see, because
T reads it to decide. `## What you'll see` comes first and holds no
file paths, phase or acceptance IDs, D-numbers or code names: a
before/after table in player or owner terms (what is on screen, what
T can do, what changes in a run), one row per visible change, then
one `Cost:` line giving the size in plain words and what it does not
change. Write it as you would explain the plot to T across a table;
if T would have to ask "what does that mean?", rewrite it. The
engineering sections follow under it.

`## Your calls` lists each `[T to confirm #n]` decision of the brief
under the same number, as a question T can answer in a word: the
default the brief assumes, then one or two alternatives in plain
words. "nothing" when the brief has none. Body:

```markdown
## What you'll see
| Today | After this ships |
|---|---|
| <what the player or T sees or does now, in plain words> | <what they see or do once every phase lands> |

Cost: <size in plain words, e.g. "one evening of agent work, one PR">. It does not change <what stays exactly as it is>.

## Your calls
1. <a question T can answer in a word>? Default: <what the brief assumes>. Or: <alternative>; or <alternative>.
2. ...
(or "nothing")

To answer, comment `@claude 1: yes, 2: <word>` (or in your own words);
the brief, the row and this body update on the branch. Merging with a
call unanswered accepts its default.

## The task
<1-3 lines, in T's terms>

## What exists
- <already built / already planned, with paths; or "nothing">

## Recommendation
<one phase, or k phases and why it splits: the tick test, the
attended piece, the contract first>

| Phase | Size | Closes | Requires | Attended |
|---|---|---|---|---|
| <id> — <title> | M | A1, A2 | nothing | no |

## Slot
<asap|anytime>: <where in the Status block, which rows come before
it, and why>

## After merge
The next `/march` tick can pick <first id> (or why it cannot:
attended, `Requires` unmet).
```

`## Your calls` sits second, right under `## What you'll see`, so T
reads what changes and what is asked before any engineering detail
(`scripts/loop-pr.test.mjs` pins the order).

To answer a call, T comments `@claude` on the PR (§3 "Answering T's
calls"). To change the recommendation otherwise, T comments on the
PR or asks in the session; the session edits the same branch (push,
never force). T closing the PR unmerged drops the plot; nothing else
needs undoing.

`peek` stops before Step 4 and prints the brief and the phase table
instead.

### Step 6 — Retro

Run `skills/march.md` §3 "Retro". A lessons commit rides the PR.

### Step 7 — Done

Two lines: the PR URL with its phase table, where the rows sit, and
"merge to approve; the next `/march` tick can then pick <id>" (or
why it cannot: attended, `Requires` unmet).

## 3. Answering T's calls

T answers the PR's `## Your calls` by commenting on the open `plot`
PR with `@claude`: numbered (`@claude 1: yes, 2: dock`) or in free
text ("@claude keep the default for the first, and put it in the
dock"). `.github/workflows/claude.yml` runs the Claude action on that
comment and, because the PR carries the `plot` label and T wrote it,
tells it to follow this section. The comment is T's word, so this is
T firing the skill, not the loop. The action runs on the PR's branch.

1. **Read.** The PR body's `## Your calls`, the brief it adds
   (`plan/phases/phase_<N>_<topic>.md`), its build-plan row(s) in
   `plan/steps/01_build_plan.md`, and any part-plan or
   `plan/deadlines.md` lines the plot touched (the PR's diff names
   them: `gh pr diff <n>`).
2. **Parse the answers.** Map each to a call number. `yes`, `ok`,
   `default` or `fine` keeps the default; a word or phrase that
   matches an alternative picks it; anything else is a new answer in
   T's words. Free text is matched to calls by what it talks about.
   A call the comment does not mention stays open. If an answer is
   genuinely ambiguous (it could mean two different builds), change
   nothing for that call and ask about it in the reply.
3. **Rewrite the plan to match**, on the PR's branch:
   - the brief's decision for each answered call, and every
     acceptance line, `Measure:`, Scope, Tests or phase block the
     answer changes (a new answer can add or drop an acceptance ID;
     keep every ID closed by exactly one phase);
   - each answered marker `[T to confirm #n]` becomes
     `Confirmed by T (<YYYY-MM-DD>): <answer in plain words>`; the
     numbers of open calls do not change;
   - the build-plan row's one line, size and `Requires` if the answer
     changes them, and any part-plan or `plan/deadlines.md` line the
     answer touches (a new date, a new row id, a premise gone).
4. **Regenerate the PR body** (`gh pr edit <n> --body-file`): each
   answered call reads `<n>. <question> Answered (<date>): <answer>`;
   open calls stay as they were; `## What you'll see`, the phase
   table and the size label are updated if the answer changes what
   ships or how big it is (`gh pr edit <n> --add-label` /
   `--remove-label`).
5. **Re-run the deadline lint** (Step 4's two commands); both must
   be clean.
6. **Commit and push** to the PR's branch, plainly worded
   (`phases: <N> — T's calls <numbers>`), never force; then **reply on
   the PR**: one line per call (kept, changed to, or still open and
   why), and the files the change touched.

On a merged or closed `plot` PR, change nothing: reply that the plot
is settled and that a new answer needs a new `/plot` (or `/plot <N>`
to rewrite a row's brief). A comment on a `plot` PR that answers no
call (a question, a different request) is handled as Step 5's "To
change the recommendation": edit the same branch, push, reply.

## 4. Merge means agreement

T merging a `plot` PR approves the whole recommendation, so a call
still unanswered at merge is its default, accepted. It does not hold
the row (`skills/march.md` §3 "Pickable phase"). The marker is not
left to go stale: when `/ship-a-phase` picks a row, it rewrites each
`[T to confirm #n]` left in the row's brief to
`Accepted at merge (default)` in its own PR
(`skills/ship-a-phase.md` Step 2). An unnumbered `[T to confirm …]`
in a brief plotted before 2026-10-25 reads the same way (default
accepted) and is left as written.

## 5. Hard rules

1. **Never builds.** No code, no tests, no workflow edits.
2. **Never fired by the loop.** A `skills/` file other than this
   one and `skills/messy.md` that dispatches `/plot` fails
   `scripts/loop-pr.test.mjs`.
3. **Acceptance IDs and `Measure:` are mandatory**, and with several
   phases every acceptance ID is closed by exactly one of them.
4. **Lands by a `plot` PR with one size label, never a push to
   `main`, never `loop:pr` (D93).** Never merges, closes or force-pushes its PR; T merges.
5. **No emojis, no attribution trailers** (AGENTS.md rule 2).
