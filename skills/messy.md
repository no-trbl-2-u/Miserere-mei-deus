# Skill: messy

> **T's intake for a loose or many-themed dump (R11).** Takes a raw
> brain dump, clusters it into themes, checks what already exists for
> each, and refines it into a part plan plus `PHASE_CANDIDATES` rows
> marked `[owner]`. Never builds. Never commits the dump. Never fired
> by the loop: no `/march` step, cron, workflow or loop verb
> dispatches it. It runs when T types `/messy`, or when T, in
> conversation, dumps loose direction and the agent routes it here
> (AGENTS.md rule 8).

## 1. Invocation

```
/messy "<raw dump>"       # or paste the dump after the command
```

For one known task, use `/plot` instead.

## 2. The procedure

### Step 1 — Save the dump (never committed)

Write the raw text verbatim to `plan/messy/YYYY-MM-DD-<slug>.md`.
`plan/messy/` is gitignored; the dump is T's scratch, not a plan
artifact.

### Step 2 — Cluster

Split the dump into themes (one idea per theme; merge duplicates).
Name each in a few words.

### Step 3 — Check what exists, per theme

For each theme: grep the packages and `plan/` (part plans under
`plan/revamp/`, `plan/<topic>.md`, the build plan,
`PHASE_CANDIDATES`, AUDIT, CRITIQUE), and note which D-numbers it
touches and which content surfaces (D88: every surface builds only
from a brief T approved, D99). With **3 or more themes**, fan out one sub-agent per
theme (`Explore`, foreground) and synthesize their answers; with
fewer, do it inline.

### Step 4 — Refine

- Themes that belong to an existing area: extend its part plan
  (`plan/revamp/<area>.md` or `plan/<topic>.md`) with a dated
  section.
- A new area: create `plan/<topic>.md` with the themes, what exists,
  the open questions, and a proposed phase split.
- For each proposed phase, add one `plan/PHASE_CANDIDATES.md` row
  marked `[owner]`, naming the part-plan section and "promote with
  `/plot`". `/messy` writes candidates, never build-plan rows or
  briefs; T promotes them with `/plot` (or `/oversight`).
- Questions only T can answer go to the part plan's "Open questions"
  list; in an attended session, ask up to 4 with `AskUserQuestion`
  (recommendation first, `docs/asking-well.md`) and record the
  answers there.
- **Reconcile the deadline plan** (phase DL1c), in the same commit
  as the candidates. A dump adds no build-plan rows, so it owes no
  `## Items` or `## Unscheduled` line; the `/plot` that promotes a
  candidate gives its rows one (`skills/plot.md` Step 4). But a
  theme that **supersedes, re-scopes or completes** an open Item in
  `plan/deadlines.md` edits that Item itself: its name, date or rows
  are changed to the work that now finishes it (`needs plot` when
  that work is only a candidate), or a `T` Item T says is done is
  ticked `[x]`. Every Item is a T act (phase DL2b): loop work the
  Item needs goes in its `Waits on` cell, never into an Item's
  `Rows`. Add one `## Change log` line at the top of that
  section naming the edit and why. No lint sees an Item whose
  premise is gone while its rows still exist; this step is the only
  guard. Then run `node scripts/check-deadlines.mjs`; it must be
  clean.

### Step 5 — Commit

Plan-only, so it pushes `main` (D84). Stage the part plan(s),
`plan/PHASE_CANDIDATES.md` and, when Step 4 edited it,
`plan/deadlines.md` explicitly; never `plan/messy/`.

```bash
git add plan/<topic>.md plan/PHASE_CANDIDATES.md plan/deadlines.md
git commit -m "plan(<topic>): messy <slug> — <K> themes, <M> candidates"
git push origin main
```

### Step 6 — Done

A short list: each theme, where it landed, and the `/plot` line T
would run to promote it.

## 3. Hard rules

1. **Never builds, never writes a build-plan row or brief.**
2. **Never commits the dump** (`plan/messy/` is gitignored).
3. **Never fired by the loop** (`scripts/loop-pr.test.mjs` fails if
   another skill or a workflow dispatches it).
4. **No emojis, no attribution trailers** (AGENTS.md rule 2).
