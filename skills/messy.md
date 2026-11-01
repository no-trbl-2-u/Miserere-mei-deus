# Skill: messy

> **Dump it messy; it comes back as plan.** The raw text is
> saved first, verbatim and untracked, so nothing gets lost.
> Then it is clustered into themes, each theme refined (one
> background agent per theme for a big dump), and integrated
> into `plan/` through a pending file, landed per owner mode.
> The GUI calls this "explode".

## 1. Purpose

Thoughts arrive as fragments: a bullet list typed on a phone,
half sentences, three ideas in one line. `/messy` takes the
dump as it is, keeps the person's intent and improves the
wording, and turns it into specs (`idea` or `planned` rows)
that `/plot` or `/next` can take from there. It never builds.

## 2. Invocation

```
/messy <anything: bullets, fragments, typos welcome>
/messy <dump> ... the important one is <x>        # weight a theme
/messy <dump> plan only                           # rows marked plan only: never built until said
```

## 3. Procedure

### Step 1 — Capture raw first

Write the dump verbatim (whitespace normalized only) to
`plan/messy/<YYYY-MM-DD>-<slug>.md` in the primary checkout: a
heading, the raw text in a fenced block, any emphasis given
("the important one is…"), and an empty `## Refined into`.
**`plan/messy/` is gitignored and never committed**: raw dumps
stay on this machine. Nothing in git quotes the dump verbatim
or links into `plan/messy/`.

### Step 2 — Cluster

Group the fragments into themes. For each, check what exists:
the specs, `plan/pending/`, and the code (grep, don't guess).
Mark each *new*, *extends spec NN*, or *already built*
(partial or done; say where). Extend before you add: a theme
an open spec owns extends it, even a one-chunk fix.

### Step 3 — Refine

Cut one worktree from `origin/<DEFAULT_BRANCH>` (owner:
detached; contributor: branch `plot/messy-<slug>`), never the
primary checkout. Give each *new* theme its spec number now
(above every spec on origin, in `ARCHIVE.md` and in open PRs),
reserved with `node scripts/claims.mjs claim <NN>`.

- **Small dump (1-2 themes):** refine them yourself.
- **Big dump (3+ themes):** one background agent per theme
  (Agent tool; foreground under a cloud tick), each writing
  **exactly one file** on a disjoint path in the worktree: a new
  theme its `plan/<NN>-<slug>.md`, an extending theme its
  proposed `## Add` parts as `plan/messy/<date>-<slug>.<NN>.md`
  in the primary checkout (for the lead to fold in). Each reads `plan/README.md`, the related specs and the
  raw dump first, weights what was called important, and never
  commits.
- A spec is written in the spec format (`skills/plan-a-spec.md`
  §4): why, Design (contracts only where they pin something),
  Acceptance with A-IDs, Open questions, and `## Chunks` with
  `Not chunked yet.` (the first `/next` that picks it chunks
  it). Keep the intent, improve the wording. No personal data.

### Step 4 — Integrate through a pending file

Read what came back and check it against the code for false
claims; fix overlaps between themes. Then everything shared
goes in one `plan/pending/messy-<slug>.md` (`date:` front
matter first): `## Edit plan/README.md` for each new row
(status `idea` or `planned`, `plan only` where asked),
`## Add plan/NN-*.md` for an extending theme's new work
(placeholder ids, numbered at settle; `## Edit` only to rewrite
existing text, never a spec's last chunk, Measure line or
`N left`), `## Decisions` for `(proposed)` ones. New spec files are written directly.
Fill `## Refined into` in the raw file (spec numbers, not
text).

### Step 5 — Gate and land

The gate (`pnpm verify`, or what `agents.md` names),
foreground. Commit `plan: messy <topic> -> <NN, MM>`. Owner:
rebase, `node scripts/plan/settle.mjs --no-commit`, gate,
commit with settle's message, `git push origin
HEAD:<DEFAULT_BRANCH>`. Contributor: push `plot/messy-<slug>`,
open one pull request. Release the number reservations once
main (or the PR) holds the specs; close the worktree with
`node scripts/worktree.mjs close <path>`.

### Step 6 — Report

Per theme, one line in this shape: the GUI parses each into a
card with its `/plot` line as the action.

```
- **<theme>** · <spec NN | extends NN | built at <path>> · `/plot asap "…"`
```

Then the top 3 decisions recommended, and the open questions
only the owner can answer.

## 4. Hard rules

1. Raw first, before any refining; the raw file never reaches
   git, and nothing in git quotes it.
2. One agent, one file, disjoint paths; agents never commit.
3. Shared plan files change only through the pending file.
4. `/messy` plans; it never builds.

## 5. Failure modes

- **An agent fails or returns nothing:** refine that theme
  yourself; the raw file still holds it.
- **A theme contradicts a principle or standing decision:**
  write it as an Open question in its spec, never as a
  decision.
- **`plan/messy/` is not gitignored:** add it to `.gitignore`
  in this run's commit before anything else.

## 6. Quick reference

```bash
plan/messy/<date>-<slug>.md            # raw, untracked (gitignored)
plan/pending/messy-<slug>.md           # rows + spec edits, settled by the owner
node scripts/claims.mjs claim <NN>     # reserve a new spec number
node scripts/plan/order.mjs --mark <ids>
```

## 7. Miserere: kept on top of the kit

Carried at the nexus v2 cut-over (phase NX1d; `docs/nexus-deviations.md`
row "messy", ruling R6, D88, DL1c, rule 8). Where this section and the
kit's steps above disagree, this section wins for Miserere.

- **The output is `[owner]` candidates, never specs** (ruling R6). Step
  3 refines each theme into its part plan (`plan/revamp/<area>.md` or
  `plan/<topic>.md`, a dated section, or a new file with the themes,
  what exists, the open questions and a proposed split), and Step 4
  writes, for each proposed piece, one `plan/CANDIDATES.md` row marked
  `[owner]`, naming the part-plan section and "promote with `/plot`".
  It writes no `idea` or `planned` spec and no roadmap row; T promotes
  a candidate with `/plot` (or `/oversight`). The loop never writes a
  spec (`Promote: owner`).
- **Questions only T can answer** go to the part plan's "Open
  questions" list; with T present, ask up to 4 with `AskUserQuestion`
  (recommendation first, `docs/asking-well.md`) and record the answers
  there.
- **Reconcile the deadline plan** (phase DL1c), in the same commit as
  the candidates. A dump adds no chunks, so it owes no `## Items` or
  `## Unscheduled` line; the `/plot` that promotes a candidate gives its
  chunks one (`skills/plot.md` §7). But a theme that
  **supersedes, re-scopes or completes** an open Item in `plan/deadlines.md` edits
  that Item itself (its name, date or rows; `needs plot` when the work
  is only a candidate), or a `T` Item T says is done is ticked `[x]`.
  Every Item is a T act (phase DL2b): loop work the Item needs goes in
  its `Waits on` cell, never into an Item's `Rows`. No lint sees an
  Item whose premise is gone while its rows still exist; this step is
  the only guard. Add one `## Change log` line at the top of that
  section naming the edit and why, then run
  `node scripts/check-deadlines.mjs`; it must be clean.
- **It lands by PR** (D119): the part plan(s), `plan/CANDIDATES.md` and,
  when edited, `plan/deadlines.md`, staged explicitly (never
  `plan/messy/`), on `loop/messy-<slug>` as a PR labelled `plot` that T
  merges. A dump adds no roadmap row or chunk, so the PR edits those
  files directly (a part plan is a new file, `CANDIDATES.md` merges by
  union and `plan/deadlines.md` by its driver); any edit of
  `plan/README.md` or a spec goes through Step 4's pending file, which
  the merge job settles on main after T merges (phase NX1e):

  ```bash
  git add plan/<topic>.md plan/CANDIDATES.md plan/deadlines.md
  git commit -m "plan(<topic>): messy <slug> — <K> themes, <M> candidates"
  git push -u origin "loop/messy-<slug>"
  ```
- **Never fired by the loop** (AGENTS.md rule 8; `scripts/loop-pr.test.mjs`
  fails if another skill or a workflow dispatches it). Never builds.
  Never commits the dump. No emojis, no attribution trailers.
