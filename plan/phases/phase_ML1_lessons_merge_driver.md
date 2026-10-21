# Phase ML1 — Merging `plan/lessons.md` stops duplicating slugs

## Sources

- The `/plot` request from T, 2026-10-20 (attended), after six sightings in two days. The duplicate
  landed on PRs #644, #645 and **three separate times** on #653; on #653 the desktop app's Auto-fix
  resolved the conflict by keeping both rows each time, and each time it had to be undone by hand.
- `plan/lessons.md`'s own header: one bullet per lesson, `- **<slug>** · <trap> → <rule> · seen <N>× ·
  last <YYYY-MM-DD> · <open|guarded by …>`, slugs unique across the file, ≤500 bytes per bullet, at most
  40 open.
- `scripts/check-lessons.mjs` — the lint, in the root `npm test`. It **exports** `MAX_BYTES` (500),
  `MAX_OPEN` (40), `MAX_REFLEX_LINES` (50) and keeps the row shape in one regex (`LESSON`, line 34) with
  a second for `plan/NEEDS_T.md` (`NEEDS_T`, line 35). Both reject a duplicate slug.
- The lesson `lessons-merge-dup-slug` (now `seen 5×`) is the standing record of this trap. Its rule —
  "before a lessons commit, grep the slug on fresh `origin/main` and bump the existing row" — is a
  discipline that **nothing enforces at merge time**, which is exactly why a machine kept breaking it.
- `.claude/settings.json:220` — session startup already runs
  `git config core.hooksPath .githooks`. This is the proven registration path for repo-local git config,
  and its limitation is in Decisions.
- `AGENTS.md` standing rule 1 and CLAUDE.md — the **telemetry precedent**: one shard per session "so the
  log never conflicts on merge", after a single shared `TELEMETRY.md` conflicted on nearly every merge
  until 2026-09-23. The brief answers below why lessons are not sharded the same way.

## Outcome

Two branches that each bump the same lesson lose nothing and produce one row. A merge of `lessons.md`
either yields a file the lint accepts or stops and asks for a human — it never again silently emits two
rows with one slug.

Measure: a fixture merge where both sides bump the same slug produces exactly one row carrying the
higher count and the later date, and `check-lessons` passes on it.

## Acceptance

- **A1** A merge driver for `plan/lessons.md` and `plan/NEEDS_T.md`, registered through `.gitattributes`
  plus the same session-startup path that already sets `core.hooksPath`. It unions the two sides **by
  slug**, not by line.
- **A2** For a slug on both sides it emits exactly one row: the higher `seen` count, the later `last`
  date, and `guarded by …` winning over `open` (a guard once true stays true).
- **A3** The citation list in the trap text is **unioned**, in first-seen order, because each side
  normally adds a different phase id and dropping one loses a real sighting. The union is computed, not
  guessed: the ids are read from the trap text's parenthesised list.
- **A4** When a merged row would exceed `MAX_BYTES`, or the file would exceed `MAX_OPEN`, the driver
  **fails the merge** and leaves ordinary conflict markers for a human. It never truncates a row, drops
  a citation or silently breaks a cap. A refusal is the correct outcome there: a human choosing what to
  shorten beats a machine guessing.
- **A5** The driver imports `MAX_BYTES`, `MAX_OPEN` and the row regexes **from
  `scripts/check-lessons.mjs`** rather than restating them, so the lint and the driver cannot drift into
  disagreeing about what a valid row is.
- **A6** A row on one side only survives untouched, and a row neither side changed is untouched —
  including its position, so the file does not reorder itself on every merge.
- **A7 (the registration gap, proven closed)** `git config merge.<name>.driver` is local config a fresh
  clone does not have, and a driver that is not registered does nothing while looking installed. A test
  asserts the registration exists for the path **from the repo's own setup path**, not from a machine
  where someone ran `git config` by hand: it checks `.gitattributes` names the driver for both files,
  and that the startup command that registers it is present in the committed settings.
- **A8** Fixture coverage, all as `node --test` cases over synthetic file pairs rather than live merges:
  both sides bump one slug; each side adds a different slug; one side only; a union that breaches the
  byte cap (refuses); a result that breaches `MAX_OPEN` (refuses); a malformed row on one side (refuses
  rather than passing it through). `check-lessons` runs on every non-refusing output and passes.

Measure: `node --test` over the fixture matrix green, and root `npm test` green.

## Scope

- `.gitattributes` (new) and whatever `scripts/` file implements the driver, plus its `node --test` file.
- `.claude/settings.json` — the startup registration, beside the existing `core.hooksPath` line.
- `scripts/check-lessons.mjs` — export anything the driver needs that is not exported yet. No change to
  what it considers valid.
- `plan/lessons.md` — only if the brief's own retro adds a row. The driver does not rewrite the file.
- Not in ML1a: `plan/steps/01_build_plan.md` (see ML1b), `plan/reflexes.md` (a 50-line cap and a
  different shape; it is small, hand-curated and rarely two-sided).

## Consumers to update

- `AGENTS.md` standing rule 1 or the nearest merge-discipline note: that `lessons.md` has a driver, and
  what it refuses.
- `plan/lessons.md`'s header, which documents the format, to name the driver as the enforcement.
- The `lessons-merge-dup-slug` lesson itself: once this ships it becomes `guarded by` rather than `open`.

## Save / schema contracts

None. No runtime code and no persisted state.

## Decisions made upfront — DO NOT ASK

- **A driver, not shards — and here is why the telemetry precedent does not transfer.** Telemetry rows
  are append-only and never edited, so one shard per session removes the conflict completely. Lesson
  rows are **edited**: a sighting bumps `seen`, a guard flips `open` to `guarded by`. Sharding would
  scatter one logical record across files and make "has this slug been seen before?" a cross-file
  question, which is the very check the Retro step needs cheaply. The 40-open cap is also a whole-file
  invariant that shards cannot express. So the shared file is right and the merge is what needs fixing.
- **Refuse rather than resolve when a cap would break** (A4). The alternative is a driver that quietly
  trims a lesson to fit, which loses the thing the file exists to keep.
- **Union the citations** (A3) rather than preferring one side. Both sightings are real; a count that
  says 19 while the text names only five phases is a lie that costs nothing to avoid.
- **Import the lint's constants** (A5). A driver with its own copy of `500` is one edit away from
  emitting rows the lint rejects.
- **The registration is honest about its limit.** The session-startup path covers Claude sessions, which
  is where these merges happen; a plain `git merge` in T's own terminal before any session has run that
  day would not have the driver, and a CI runner would not either. A7 proves what IS wired, and the
  brief does not pretend that is everything. If a stronger guarantee is wanted later, the candidate is a
  `pre-commit` check that refuses a duplicate slug outright — the guard already runs there.
- **`NEEDS_T.md` comes along** because it is the same parser, the same cap and the same duplicate rule;
  excluding it would be arbitrary.
- **Slot: asap.** It is actively costing merges — six sightings in two days, three on one PR — and it
  blocks no open row.

## Tests matrix

- `node --test` on the driver: the A8 matrix (same-slug bump, disjoint additions, one-sided row, byte-cap
  refusal, open-cap refusal, malformed-row refusal), each asserting the exact emitted row.
- A registration test (A7) reading `.gitattributes` and the committed startup settings.
- Root `npm test` unchanged otherwise.

## Verify gate

Root `npm test`.

## Commit body template

```
lessons: a merge driver, so two bumps of one slug stay one row

Git's three-way merge kept both copies of a bumped lesson with no
conflict markers, so nothing prompted a human to look and check-lessons
went red on whatever branch received it — six times in two days, three
of them on one PR. The driver unions by slug: higher count, later date,
unioned citations, guarded beating open. Where a union would breach the
byte or open cap it refuses and leaves conflict markers, because a human
choosing what to shorten beats a machine guessing. Its constants are
imported from check-lessons.mjs so the two cannot drift.
```

## DoD

A1–A8 ticked.

## Phases

### ML1a — The driver for `lessons.md` and `NEEDS_T.md` (Size: M)

Closes A1–A8. Requires nothing. Attended: no.

The whole of the above. This is the phase that stops the bleeding, because `lessons.md` is the file that
goes red.

Measure: the A8 fixture matrix green; `check-lessons` passes on every non-refusing output; root
`npm test` green.

### ML1b — The build plan's rows and queue log (Size: M)

Closes nothing in A1–A8; it extends the same idea to a file with different semantics. Requires ML1a.
Attended: no.

`plan/steps/01_build_plan.md` collides for a related but **not identical** reason: every `/plot asap`
appends directly above the first open row, so concurrent plots target one line, and the Queue change log
is append-only at the end. On 2026-10-19/20 one plot PR took four rounds of this (IT1 against RV2, VE1,
HP4 and a deadlines refresh).

It is a separate phase because the merge rule is different in kind: build-plan rows are an **ordered**
list whose order carries priority, not a keyed set, so "union by key" does not define the result —
whether a newly landed plot's rows go above or below the incoming branch's is a judgment the driver
would have to encode. And unlike `lessons.md`, a duplicated or reordered row does not redden any lint,
so this is cost, not breakage. The Queue change log half is the easy part: append-only, union both.

Measure: a fixture where two sides each insert rows above the same first-open row yields both sides'
rows with each side's internal order preserved, and the Queue change log carries both entries.

## Follow-ups (not in this phase)

- **A `pre-commit` refusal for duplicate slugs**, as a belt to the driver's braces, covering the paths
  the session-startup registration cannot reach.
- **`plan/reflexes.md`** has a line cap rather than a byte cap and is hand-curated; if it ever starts
  conflicting, the driver generalises, but it is not a problem today.
- **Whether `/plot` should stop targeting one line.** If concurrent plots appended at distinct anchors
  the build-plan collisions would largely vanish, which may be a better fix than ML1b's driver. Worth
  comparing before building ML1b.
