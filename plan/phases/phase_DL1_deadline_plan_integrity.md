# Phase DL1 — The deadline plan cannot silently drift from the build plan

## Sources

- T's session, 2026-10-20. T asked "what's next", the session-start reminder
  led with a stale item, and T named the defect in T's words: *"The deadline
  items don't update with the work that's been done. I've already tested the 3
  puzzles and we've already created a new spec to create 10 of each puzzle.
  Isn't that correct?"* It was correct.
- `plan/deadlines.md` (the whole plan, T, 2026-10-19), its `## Items` table and
  its change log.
- `scripts/deadlines.mjs` (the CLI), `scripts/deadlines-lib.mjs` (the pure
  half: `parseItems`, `parsePhaseRows`, `itemNeed`, `dueNeeds`, `liveMarkdown`),
  `scripts/deadlines.test.mjs`, `.github/workflows/deadlines.yml`,
  `.claude/hooks/` session-start reminder, `LIVE_DEADLINES.md`.
- `plan/steps/01_build_plan.md` Status block and its Queue change log. Its rows
  wrap: most rows added since 2026-10-18 run to several indented lines, which is
  what A12 is about.
- `skills/plot.md` §4 "Slot" (what a plot updates today), `skills/messy.md`.
- Adjacent and deliberately not merged into: Phase LG1a (`plan/phases/phase_LG1_loop_gates.md`
  § LG1a), the plan-queue lint over AUDIT, CRITIQUE, PHASE_CANDIDATES and the
  Status block.
- D93 (`/plot` lands by a `plot` PR T merges), D84–D87, D94, D95.

## Outcome

The deadline plan and the build plan cannot disagree without the root `npm test`
saying so: every open build-plan row is either dated in `plan/deadlines.md` or
listed there as deliberately undated with a reason, no Item names a row that does
not exist, each Item's date sits inside its window, and the Items table's Status
column is recomputed from the build plan rather than hand-maintained. The one
drift no check can see is written down as such, and `/plot` carries the procedure
step that covers it.

## The defect this phase exists to fix

On 2026-10-19 T played all six routes of the three demo puzzles, solved every
one in under ten seconds, and that finding produced Phases HP4a–HP4f — thirty
graded candidates, ten per band, played by hand to mine authoring patterns. The
build plan recorded all of it. `plan/deadlines.md` recorded none of it:

- the Item `2026-10-29 | Timed demo solves and the clocks | B3f` stayed open,
  though T's half was done and the verdict was "change X", not "clocks set";
- the Item `2026-11-02 | W1 demo: T plays the three demos | T` stayed open,
  though that playthrough had already happened and the real W1 demo had become
  HP4e, T playing the thirty;
- **HP4a–HP4f had no Item row at all**, so the actual W1 critical path was
  invisible to the reminder.

The next chat therefore opened with a stale deadline as its first line.

`deadlines-lib.mjs` cannot catch any of that as written. `itemNeed` asks only
three questions of an Item: is it `needs plot`, is it a `T` task not yet ticked,
or does one of its named rows wait on T with its `requires` shipped. A phase
family with no Item is not an Item, so nothing examines it; an Item whose
*premise* was superseded still names live rows and looks healthy. Both failure
modes are silence, and silence is indistinguishable from "nothing needs T".

A third failure mode turned up while this brief was being written, by running
`node scripts/deadlines.mjs --write` on the reconciled table: the reminder
announced `W1 demo: T plays the thirty candidates — needs you (HP4e ready for
you)` although HP4c and HP4d, which HP4e requires, are both open. `PHASE_ROW` is
line-anchored and the HP4e row wraps over four indented lines, so `rest` held
only the first line, no `Requires` clause was found, `parseRequires` returned
`[]` and every prerequisite counted as met. Cut Phase B3f's row was a single
line, which is why the reminder read correctly until the day it was replaced.
A12 fixes it; it is the same disease as the rest of this phase — a parser that
stays quiet when it does not understand what it read.

Three of the four are mechanically checkable, and this phase checks them. The
third — a superseded premise — is not, and this phase says so in writing and
puts the only real guard (a procedure step in `/plot`) in place instead of
pretending a lint covers it.

## Size

See `## Phases`: three phases, `size:multi-phase`.

## Acceptance

- **A1** `scripts/check-deadlines.mjs` runs in the root `npm test` (so
  `verify-gate` fails on a violation) and reads `plan/deadlines.md` and the
  Status block of `plan/steps/01_build_plan.md` **through
  `scripts/deadlines-lib.mjs`'s existing `parseItems` and `parsePhaseRows`**.
  Neither file's format is parsed a second time anywhere in the script. Every
  failure names the file, the row and what to change.
- **A2** **Coverage.** Every open phase row in the Status block — status `[ ]`,
  `[-]`, or `[blocked: …]` — is either named by exactly one `## Items` row, or
  listed under a new `## Unscheduled` section of `plan/deadlines.md` with a
  one-line reason. The lint fails naming each open row that is neither, and
  fails on a row listed under `## Unscheduled` with no reason text. Shipped
  (`[x]`) and `[skipped]` rows are never required to be covered.
- **A3** An Items row naming a phase id that has no build-plan row fails, and
  the same phase id appearing in two Items rows fails. Both messages name the
  id and the Item(s).
- **A4** Each Items row's due date falls inside the date range its `Window`
  cell names in the `## Windows` table, and an Items row whose window has no
  row in that table fails. The window ranges are read from the Windows table,
  not copied into the script.
- **A5** `plan/deadlines.md` gains the `## Unscheduled` section, populated so
  the real files pass A2: every currently open row that no Item names is
  either given an Item with a date or listed there with its reason. The
  section's header states that a row listed in it is work the loop may still
  pick on its ordinary turn — undated is not deprioritised.
- **A6** `node scripts/deadlines.mjs --write` recomputes the Status cell of
  every **phase** Item from the build plan (`[x]` when every phase id it names
  is shipped or skipped, `[ ]` otherwise) and rewrites `plan/deadlines.md` in
  place alongside `LIVE_DEADLINES.md`. A `T` Item's Status cell is never read,
  written or moved; nothing else in `plan/deadlines.md` changes byte-for-byte.
- **A7** The lint fails when a checked-in phase Item's Status cell disagrees
  with A6's recomputation, naming the Item, the cell and the computed value.
- **A8** `.github/workflows/deadlines.yml` commits `plan/deadlines.md` together
  with `LIVE_DEADLINES.md` when `--write` changed either, in one commit, and its
  `paths:` trigger covers `scripts/check-deadlines.mjs`. Its existing
  pull-rebase-retry loop and the `nexus-loop` concurrency group are unchanged.
- **A9** `skills/plot.md` §4 "Slot" and `skills/messy.md` carry a **reconcile
  step**, in the same commit as the queue mutation: a plot that adds rows gives
  each one an Items row with a date or an `## Unscheduled` line; a plot that
  supersedes, re-scopes or completes an existing Item edits *that* Item — not
  only `needs plot` → ids — and records the edit in `plan/deadlines.md`'s change
  log. `scripts/loop-pr.test.mjs`-style coverage is not required; a fixture test
  asserting both skill files contain the step is.
- **A10** `plan/deadlines.md`'s Items prose states that a phase Item's Status is
  derived by `--write` and must not be hand-edited, while a `T` Item's Status is
  hand-ticked and derivable by nothing. `CLAUDE.md`'s deadline paragraph points
  at the lint by name. `docs/dev-tools.md` names the new script.
- **A11** The limit is written down, in `scripts/check-deadlines.mjs`'s header
  and in `plan/deadlines.md`'s Items prose: an Item whose **premise** is
  superseded while the rows it names still exist is invisible to every check
  here — the `2026-11-02 | W1 demo: T plays the three demos | T` case — and A9's
  procedure step is the only guard. No rule in this phase claims otherwise.

- **A12** (found while plotting DL1, 2026-10-20) `parsePhaseRows` reads a **wrapped** build-plan row: its
  `PHASE_ROW` regex is line-anchored, so a row whose text continues on indented following lines yields a `rest`
  with no `Requires` clause, `parseRequires` returns `[]`, and `itemNeed` reports every open wrapped attended row
  as "ready for you" the moment it exists. The parser joins a row's continuation lines before matching
  `Requires`, and a test pins the live HP4e row — wrapped, `Requires HP4c, HP4d` — as **not** ready while HP4c and
  HP4d are open, and ready once both are shipped. Every id-bearing rule in A2 and A3 is checked against a wrapped
  row too.

Measure: the root `npm test` passes on the real `plan/deadlines.md` and
`plan/steps/01_build_plan.md`, fails each of A2's, A3's, A4's and A7's fixtures,
and `node scripts/deadlines.mjs --write` leaves both generated files unchanged on
a clean tree.

## Scope

`scripts/check-deadlines.mjs` (new) and its test; `scripts/deadlines.mjs` and
`scripts/deadlines-lib.mjs` (the Status recomputation and the `## Unscheduled`
and `## Windows` parsers); `scripts/deadlines.test.mjs`; the root `package.json`
`test` list; `.github/workflows/deadlines.yml`; `plan/deadlines.md` (the new
section and the prose); `skills/plot.md`, `skills/messy.md`; `CLAUDE.md`'s
deadline paragraph; `docs/dev-tools.md`. No engine or app code, no game data, no
`.claude/**` edit.

## Consumers to update

`docs/dev-tools.md` for the new script; `CLAUDE.md` for the lint's name;
`skills/plot.md` and `skills/messy.md` for the reconcile step. The session-start
hook is untouched: it calls `deadlines.mjs --remind`, whose output this phase does
not change.

## Save / schema contracts

None. No save field, no migration, no engine surface. `plan/deadlines.md`'s
table format gains no column; only the Status cell's provenance changes.

## Decisions made upfront — DO NOT ASK

- **Coverage is every open row, with an explicit opt-out** (A2, A5). T's call,
  2026-10-20, chosen over "only rows a plot added" and "no coverage rule".
  Reason: `asap` and `anytime` are not recorded in a row, so "a new asap family"
  is not machine-detectable; the only checkable version of "nothing is invisible"
  is that every open row is either dated or deliberately undated. The cost is one
  line per undated row, paid once in A5.
- **`--write` rewrites the Status column, and the workflow commits it** (A6,
  A8). T's call, 2026-10-20, chosen over lint-only and over dropping the column.
  Reason: a phase Item's Status is already derived — `itemNeed` ignores `done`
  for phase items entirely — so the cell is decoration that can only ever lie.
  Recomputing it costs nothing per tick and makes the table honest at a glance,
  which is the thing that failed on 2026-10-20. A bot writing into T's plan file
  is limited to those cells and guarded by A7.
- **A separate script, not folded into LG1a's `check-plan-queues.mjs`.** LG1a is
  one `S` tick already spanning four queue files with their own row shapes, and
  its rules are about row *shape* (headers, bodies, repeats, blank runs). These
  rules are about *agreement between two files*, and they need
  `deadlines-lib.mjs`'s parsers, which the plan-queue lint does not use. Both run
  in the root `npm test`, so T gets one failure surface either way. LG1a's brief
  is not amended (it is unclaimed as of 2026-10-20, but lesson
  `amend-while-claimed` argues for leaving an unrelated unclaimed brief alone).
- **The lint never fails on a `needs plot` Item, an overdue Item, or an open `T`
  task.** Those are the reminder's job, every chat. A lint that reddens CI the
  morning a date passes would be turned off within a week, and `plan/deadlines.md`
  already says dates are drafts T can move.
- **`[blocked: …]` rows are covered too** (A2). A blocked row is open work that
  will need a date; IT1b and the owner-led B-rows are exactly the kind of thing
  that goes quiet for a month. They may sit under `## Unscheduled` with "blocked:
  owner-led" as the reason, which is a one-line cost and keeps them visible.
- **Windows are read, not hardcoded** (A4). T moves dates and the change log
  records it; a script holding its own copy of the five window ranges would be
  the next drift.
- **No new workflow.** `deadlines.yml` already triggers on `plan/deadlines.md`,
  the build plan and both deadline scripts, runs daily, and has the retry loop
  and the `nexus-loop` concurrency group. Adding the new script to its `paths:`
  is the whole change.
- **This phase does not date anything for T.** A5 populates `## Unscheduled` with
  reasons and gives Items only where the date is already decided (the Items
  reconciliation T and the agent did in the DL1 plot commit). Where a date is
  genuinely T's to pick, the row goes under `## Unscheduled` with "date not set"
  rather than a guessed date.

## Tests matrix

- `scripts/check-deadlines.test.mjs` (new) — A2: an uncovered open row, a row
  covered twice, a row under `## Unscheduled` with and without a reason, a
  shipped row with no Item (passes), a `[blocked: …]` row (covered). A3: an
  unknown id, a duplicated id. A4: a date before its window, after its window,
  inside it, and an unknown window name. A7: a phase Item whose Status disagrees.
  Plus a pass over the real two files.
- `scripts/deadlines.test.mjs` — extended: A6's recomputation on a fixture table
  (phase Items flip, `T` rows byte-identical), and idempotence (`--write` twice
  is a no-op); A12's wrapped-row `Requires` pins, including the live HP4e row.
  The existing single-line-row cases stay green unchanged.
- No engine or mobile suite is touched.

## Verify gate

The root `npm test` for all three phases. No workspace verify is needed: nothing
under `axiomancer-mechanics/` or `axiomancer-mobile/` changes.

## Commit body template

```
<type>: <what changed> — phase DL1<x>

<why, in one or two lines>

Acceptance: A<n> <how it was proved>
```

## DoD

A1–A12, all ticked, each naming the test, command or file that proves it.

## Follow-ups (out of scope)

- **The bot and T editing `plan/deadlines.md` at the same time.** A8 relies on
  `deadlines.yml`'s existing pull-rebase-retry loop. If T hits a conflict in
  practice, the answer is to narrow the bot's write to a generated block inside
  the file rather than the Items table itself; not built speculatively.
- **Deriving a `T` Item's Status.** Nothing in the repo records that T did a
  thing, so a `T` row stays hand-ticked (A10, A11). A session that watches T
  finish a `T` task could tick it; that is a procedure habit, not a phase.
- **The window prose.** Each `### W<n>` section lists its rows in prose as well
  as in the Items table, so the two can disagree. A4 checks dates, not prose. If
  the prose drifts, lint it in a follow-up rather than widening A2.
- **An Item for the deadline plan's own windows** (the five `W<n>` demos) is
  already in the table as `T` rows; no change.

## Phases

### DL1a — The lint and the wrapped-row parser · M · closes A1, A2, A3, A4, A5, A11, A12 · requires nothing
Measure: the root `npm test` passes on the real `plan/deadlines.md` and build
plan, and fails each of A2's, A3's and A4's fixtures.
- Scope: `scripts/check-deadlines.mjs` and its test; the `## Unscheduled` and
  `## Windows` parsers and the A12 wrapped-row fix in
  `scripts/deadlines-lib.mjs`; the root `package.json` `test` list;
  `plan/deadlines.md`'s new `## Unscheduled` section and the A11 paragraph.
- Consumers: `docs/dev-tools.md`.
- Tests: `scripts/check-deadlines.test.mjs` per the matrix, plus the real-files
  pass and A12's wrapped-row pins in `scripts/deadlines.test.mjs`.
- Verify gate: the root `npm test`.
- Note: A5 is the bulk of the work and is bookkeeping, not code — every open row
  the Items table does not name gets a line. Do it by reading the two files, not
  by generating the section from the build plan: a generated opt-out list opts
  everything out.

### DL1b — The derived Status column · M · closes A6, A7, A8 · requires DL1a
Measure: `node scripts/deadlines.mjs --write` flips a phase Item's Status on a
fixture and leaves `T` rows byte-identical; running it twice changes nothing; the
lint fails a hand-edited phase Status.
- Scope: `scripts/deadlines.mjs`, `scripts/deadlines-lib.mjs`,
  `scripts/deadlines.test.mjs`, `scripts/check-deadlines.mjs` (the A7 rule),
  `.github/workflows/deadlines.yml`.
- Consumers: none beyond the workflow.
- Tests: `scripts/deadlines.test.mjs` extended per the matrix.
- Verify gate: the root `npm test`.
- Note: the rewrite is a cell-level edit of matched Items rows, never a
  regeneration of the table. A row the Items regex does not match is left exactly
  as it is and reported, not dropped.

### DL1c — The reconcile step in `/plot` and `/messy` · S · closes A9, A10 · requires DL1a
Measure: both skill files carry the reconcile step, a fixture test asserts it,
and `CLAUDE.md` and `docs/dev-tools.md` name the lint.
- Scope: `skills/plot.md` §4, `skills/messy.md`, `CLAUDE.md`'s deadline
  paragraph, `docs/dev-tools.md`, and the fixture test.
- Consumers: none.
- Tests: the A9 fixture test (both files contain the step).
- Verify gate: the root `npm test`.
- Note: `skills/` is not `.claude/**`, so this phase is not attended. It edits
  the loop's own procedure, so its PR body quotes the added step verbatim for T
  to read.
