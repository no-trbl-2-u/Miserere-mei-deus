# Skill: oversight

> **The user-in-the-loop command.** Pause autonomy. Brief the
> user on current state. Ask targeted questions. Adjust the
> plan. Push the adjustments. Return.
>
> Every other skill is autonomous; this one is the exception.
> It exists because the user sometimes walks away from the loop,
> comes back, and needs to course-correct.

## 1. Purpose

When the user types `/oversight`, three things happen:

1. **Synthesis.** Read state files, recent commits, deploy
   state. Produce a tight briefing.
2. **Questionnaire.** Based on what surfaced, ask 1–4 targeted
   questions via `AskUserQuestion`. Computed from state, not
   pre-canned.
3. **Adjustment.** Apply answers as edits to plan files. One
   commit captures the whole adjustment set.

After this, user re-invokes `/march` (or `/loop /march`) to
resume.

## 2. Invocation

```
/oversight                  # full audit + general questionnaire
/oversight phase            # bias toward phase progress / scope
/oversight content          # bias toward /iterate findings + content
/oversight deploy           # bias toward GitHub Actions CI signal
                            # (npm run deploy:check, verify-* workflows)
/oversight reset            # bias toward scope reduction
```

Every mode requires a present user; under `/loop` it is a
misconfiguration (§9).

## 3. What `oversight` reads (audit phase)

In parallel where independent:

1. `git log --oneline -20` — recent shipping velocity.
2. `git status --short` — uncommitted changes.
3. `npm run deploy:check` — current deploy state.
4. `plan/steps/01_build_plan.md` "Status" block — pending
   phases.
5. `plan/AUDIT.md` — open `/iterate` findings.
6. `plan/CRITIQUE.md` — critique pending.
7. Last 3 phase briefs — current vs. recent commits.
8. `axiomancer-mechanics/specs/` — has a new design input
   landed since the last sibling commit? (Skip HISTORICAL specs
   and `axiomancer-mechanics/braindump/`, which is HISTORICAL.)
9. **The loop-call sweep (standing).** Grep `\[loop-call\]` and
   the legacy `\[needs-user-call\]` across `plan/` (AUDIT,
   CRITIQUE, PHASE_CANDIDATES). Since THE OPEN
   GATE (2026-08-28) the loop no longer parks decisions — it
   decides, ships, and files `[loop-call]` rows. This sweep is
   AFTER-THE-FACT REVIEW: present the calls the loop made since
   the last oversight so T can ratify or reverse them. A row is
   **open** (unreviewed) unless marked reviewed/resolved (`[x]`,
   "RESOLVED"/"RATIFIED", or moved to a resolved section). Any
   legacy `[needs-user-call]` still open is presented the same
   way — with the loop's recommended answer attached. Oversight
   reads legacy rows; it never writes new ones. The same sweep reads
   `plan/NEEDS_T.md` (T's own moves, D94): every row there is open
   until T deletes it.

10. **TEMPORARY — the R11 watch (T, 2026-10-11; remove this item and
    §5's "Standing question R11" on or after 2026-11-11).** R11 changed
    three things at once (intake by `/plot`/`/messy`, landing by PR, a
    retro on every verb), and T ruled nothing else changes until a month
    of ticks says which of them worked. Until then every oversight gathers
    these four counts, since the last oversight (its commit date), and
    reports them in the briefing as a four-line table:

    - **Ticks that picked nothing.** `npm run telemetry -- --since
      <date>`: march ticks whose `slash-prompt` was followed by a
      `tick-end` with no `ship-a-phase`, `iterate` or `critique` verb-read,
      plus any tick output or AUDIT row saying "no pickable row" / "at the
      PR cap". A majority means the problem is intake, not the loop.
    - **PRs stuck.** `gh pr list --label loop:pr --state all --search
      "created:>=<date>"` and the count with `loop:pr-stuck`, plus the
      number of `pr-autofix.yml` runs (`gh run list --workflow
      pr-autofix.yml`). Two attempts per PR is the ceiling by design.
    - **Shadow reviews.** The `pr-review.yml` `review` job's run count for
      the window beside `pr-autofix`'s (`gh run list --workflow
      pr-review.yml --json conclusion,createdAt`, counting runs whose
      `review` job ran), and how many verdicts were `not-pass`. It is
      the cost check on phase RV1b: one Claude run per reviewed head,
      three Sonnet lens sub-agents inside it on `risk:medium` and
      `risk:high` (RV1c).
    - **Intake used.** `git log --since=<date> --grep='^phases: plot'` and
      the count of `plan/messy/`-refined specs (commit subjects
      `plan(<topic>):`). Zero after two weeks means the habit didn't take.
    - **Retros that fired.** `git log --since=<date> --grep='^lessons: retro'`
      against the number of closing ticks; and how many `lessons.md`
      entries reached `seen 2×` and were automated the same tick
      (`guarded by` set) rather than only bumped.

    For a window that starts before R11 merged, report each count as
    "n/a (pre-R11)" rather than 0, so the first real number is not read
    against a false zero. The `pr-autofix` and `pr-resolve` run counts
    for the month are also the check on the cost assumption in
    `.github/workflows/README.md` (free runners; Claude usage only on a
    red check or a conflict).

## 4. The briefing (~25 lines max)

```
oversight — <ISO date>

loop-calls (standing — always first)
- <count> open across plan/: <file>: "<one-liner>" (each)
- (or "none open")

shipping
- last commit: <sha> "<subject>" (<relative time>)
- phases shipped since last oversight: <list with hashes>
- velocity: ~<N> commits/hour over last 24h

state
- pending phases: <count>; next is phase <N> (<topic>)
- open audit findings: <count>; top score <X>: "<one-liner>"
- pending critique findings: <count>; pass count <N>; last pass <when>
- working tree: <clean | N modified | N untracked>
- last deploy: <state> (<sha>) — <admin URL or "ready">

flags
- <unusual patterns: stuck phase, repeated fix commits,
  divergent local/CI state, specs newer than sibling
  commit, etc.>
```

Tight. Factual. The flags section drives the questionnaire.

## 5. The questionnaire

Generate 1–4 questions via `AskUserQuestion`, shaped per
`docs/asking-well.md` (the canonical question-writing doctrine —
defer paths named, answers filed as policy, never re-ask). Rules:

- **Standing question 0 (mandatory):** if the §3 sweep found any
  unreviewed `[loop-call]` (or legacy `[needs-user-call]`) rows or
  any open `plan/NEEDS_T.md` row (D94),
  the FIRST question presents them for review —
  on top of (not counted against) the 1–4 computed questions.
  Skipped only when the sweep is clean.
- **Computed from observed flags**, not pre-canned.
- **Each question targets a specific observable.**
- **Multiple choice with recommended option marked first.**
- **Last question is free-form** if there's room.

### Standing question 0 — loop-call review

> <N> unreviewed `[loop-call]` (or legacy `[needs-user-call]`)
> rows are open. Top: "<one-liner>" (<file>). Review now?
>
> - (recommended) Walk through them — show each item's context;
>   I ratify or reverse one by one.
> - Review top only — resolve the highest-impact item, defer
>   the rest.
> - Defer all — leave open; they resurface next oversight.
>
> Applying a decision = edit the item in place (mark `[x]` with
> the decision + date, or promote it to a candidate/phase per
> the answer), same as any other adjustment in Step 5.
>
> Open `plan/NEEDS_T.md` rows (D94) lead this question, before the
> loop-calls, highest `seen` first: "<slug>: <what T does> (seen
> N×)". They are T's to-dos, not calls to ratify: the options are
> "done, delete the row", "still to do" and "not needed, delete the
> row". Never promote one to a candidate or phase.

### Standing question R11 — TEMPORARY, remove on or after 2026-11-11

Asked after question 0 and not counted against the 1–4, whenever
§3 item 10 produced its table. It is one question, built from the
count that is furthest from healthy:

> R11 watch since <date>: <N> ticks picked nothing, <N> PRs stuck of
> <M>, <N> plots/messies, <N> retros of <M> ticks. The weakest signal is
> <which>. What now?
>
> - (recommended) Keep watching — change nothing until <2026-11-11>.
> - Fix the weakest signal now — <the one-line fix the number implies:
>   "run /plot on the two ideas in PHASE_CANDIDATES marked [owner]",
>   "raise the PR cap to 5", "pr-autofix is misfiring: file an AUDIT
>   row", "the retro step is being skipped: tighten the verb">.
> - End the watch early — remove §3 item 10 and this question now; the
>   five `[owner]` candidates in `plan/PHASE_CANDIDATES.md` become
>   eligible for `/plot`.
>
> Applying "end the watch" or passing the date = delete §3 item 10 and
> this section in the oversight commit, and note the final four counts
> in `plan/AUDIT.md` as a `[loop-call]`-style record so the window's
> result survives the deletion.

### Question templates

**Stuck phase**

> Phase <N> has been pending across <K> ticks; last <L> commits
> were "fix:" against it. What now?
>
> - (recommended) Refresh the brief — design or scope drifted.
> - Abandon — mark `[skipped]`, move on.
> - Continue — the brief is right, just hard.

**Audit overload**

> `plan/AUDIT.md` has <N> findings; top 3 are <category>. Bias?
>
> - (recommended) Yes — set focus to <category>.
> - No — keep balanced.
> - Prune — drop bottom <M> findings.

**Brief out of date**

> `axiomancer-mechanics/specs/<area>/` was updated <K> commits ago, after phase
> <N> shipped. Refresh phase <N>'s brief and ship a follow-up?
>
> - (recommended) Yes — `/plan-a-phase phase <N>` then add
>   follow-up phase.
> - No — note in `AUDIT.md`; let `/iterate` catch.
> - Defer.

**Deploy stuck red**

> Last <K> deploys failed with same error: "<msg>". What now?
>
> - (recommended) Investigate — open log; I'll diagnose, no
>   commit yet.
> - Roll back — revert to <last-green-sha>.
> - Continue — next ship-a-phase will reach the right code.

**Uncommitted changes**

> Working tree has <N> modified, <M> untracked from a tick
> that didn't finish (last verb: <X>).
>
> - (recommended) Inspect — show diff; I'll decide.
> - Roll forward — finish the tick.
> - Roll back — `git checkout` and `git clean`; restart cleanly.

**Phase candidates pending promotion**

> `plan/PHASE_CANDIDATES.md` has <N> pending candidates. Top
> score [<X.Y>]: "<one-line>". Promote any?
>
> - (recommended) Review one — show me the candidate's
>   rationale + signals; I'll decide.
> - Promote top — append as a new phase row in the build plan,
>   move the candidate to `## Promoted`.
> - Reject top — move to `## Rejected` with a one-line reason.
> - Defer — leave them; next expand pass re-evaluates.

**Free-form**

> Anything else to adjust before I hand back to `/march`?

## 6. The procedure

### Step 0 — Sync

```bash
git pull --ff-only
```

### Step 1 — Audit

Run §3.

### Step 2 — Brief

Print synthesis per §4. **No questions yet.**

### Step 3 — Build questionnaire

Compute 1–4 questions per §5, with standing question 0
prepended whenever the loop-call sweep found open items.
If zero warranted (project healthy, no flags, sweep clean), say
so and exit at Step 7 with no commit.

### Step 4 — Ask

Invoke `AskUserQuestion`.

### Step 5 — Apply

For each answer:

- **"Refresh brief"** → spawn `/plan-a-phase phase <N>` flow
  inline.
- **"Abandon phase"** → flip `[ ]` to `[skipped]` in
  `01_build_plan.md` with comment `(skipped via oversight
  <date> — <reason>)`.
- **"Bias toward category X"** → write at top of
  `plan/AUDIT.md`: `> Bias: <category> (set via oversight
  <date>)`. `/iterate` reads this and weights 1.5x.
- **"Prune findings"** → delete bottom-N rows from `AUDIT.md`.
- **"Roll back"** → DO NOT run destructive git ops without
  explicit confirmation. Print proposed plan as a follow-up
  question; only execute on explicit go.
- **"Investigate deploy"** → fetch latest deploy log; summarize;
  no patch yet.
- **"Promote candidate"** → move row from
  `plan/PHASE_CANDIDATES.md` `## Pending` to `## Promoted` (with
  promotion date + assigned phase number). Append a new phase
  row in `plan/steps/01_build_plan.md` Status block. Optionally
  invoke `/plan-a-phase phase <N>` flow inline to draft the
  brief.
- **"Reject candidate"** → move row from `## Pending` to
  `## Rejected` with one-line reason.
- **"Other" (free-form)** → interpret conservatively. If clear
  plan edit, apply. If ambiguous, apply nothing for it, quote it
  under "Not applied" in the commit body, and tell the user.

**Queue-mutation provenance** (adopted via /oversight 2026-07-30,
issue #129): if any applied answer changes
`plan/steps/01_build_plan.md`'s queue (abandon/promote a phase,
reorder, reprioritize, split/merge, block/unblock, or otherwise
materially change a phase row), add a row to that file's
`## Queue change log` section in the **same commit** — date,
actor (`T via Hermes` when the instruction came via Hermes,
otherwise the actual source), the action + affected phase
ID(s), confirmation this was T's request, T's stated reason (or
"reason not stated"), and the resulting commit/issue/brief.

### Step 6 — Commit + push

```bash
git add <modified files>
git commit -m "$(cat <<'EOF'
oversight: <one-line summary>

- <bullet per adjustment>

User answers:
- Q: <question> → <answer>
EOF
)"
git push origin main
```

If only adjustment was "everything looks good" with no edits,
**no empty commit**. Print "no adjustments — handing back to
the loop" and exit.

### Step 7 — Confirm deploy

```bash
npm run deploy:check
```

Skip if no commit was made.

### Step 8 — Done

```
oversight complete. <N> adjustments applied.
- ready to resume: /march (or /loop /march)
- next pending phase: <N> (<topic>)
```

## 7. Hard rules

1. **Never edit code.** Plan adjustments only.
2. **Don't run destructive git ops without explicit user
   confirmation.**
3. **Single commit captures the adjustment set.**
4. **Don't loop the questionnaire.** Ask once.
5. **No emojis. No `Co-Authored-By:`.**
6. **`AskUserQuestion` is allowed here and only here** among
   shipping skills.

## 8. When `oversight` is NOT the right tool

- **Mid-tick of `/ship-a-phase`** etc. Don't pre-empt.
- **For trivia.** Read state files directly.
- **As a way to ask permission mid-loop.** Decide instead.

## 9. Failure modes

1. **Invoked under `/loop`.** Misconfiguration. Stop.
2. **`git pull` divergence.**
3. **State files corrupted.**
4. **"Other" with text the skill can't interpret.** Apply
   nothing for it; tell the user it was not applied.

## 10. Quick reference

```bash
# Read (parallel where possible)
git log --oneline -20
git status --short
plan/steps/01_build_plan.md
plan/AUDIT.md
plan/CRITIQUE.md
plan/phases/                       # last 3 modified
axiomancer-mechanics/specs/        # for newer-than-sibling check
grep -rnE "\[(loop-call|needs-user-call)\]" plan/   # standing question 0 sweep

# Tools
AskUserQuestion                    # only place this is allowed

# Adjustment files
plan/steps/01_build_plan.md
plan/AUDIT.md
plan/phases/phase_<N>_<topic>.md   # via /plan-a-phase

# Commit
git commit -m "oversight: <one-line>"
git push origin main
npm run deploy:check
```
