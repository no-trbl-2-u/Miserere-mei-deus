# plan

The build plan for Axiomancer. Read by every shipping skill
(`/ship-a-chunk`, `/iterate`, `/march`, `/plan-a-spec`,
`/critique`, `/triage`, `/oversight`) to keep the autonomous
loop coherent.

## Lanes

**Asap** (built before the table, in this order, once their
needs are done):

- (none yet)

**Held** (waits on a person's word; never picked until the
line goes; each line is a lock that times out:
`- **<NN.k>** · <reason> · since: <date> · until: <date or
condition> · max_age: 14d`, an optional `· fallback: release`):

- (none yet)

## Specs

| # | Initiative | Spec | Status | Progress |
|---|---|---|---|---|

## Layout

```
plan/
├── README.md                            # this file
├── bearings.md                          # standing context: stack, contracts, defaults, sub-agents, posture
├── AUDIT.md                             # latest /iterate audit (rewritten on each pass)
├── CRITIQUE.md                          # external-observer findings (append-only via /critique)
├── CANDIDATES.md                  # candidates from /expand and /messy; promoted by /oversight or /plot
├── reflexes.md                          # ≤50-line always-read core (lessons seen 3× across verbs)
├── lessons.md                           # counted retro ladder, read by offset (check-lessons lint)
├── messy/                               # gitignored: /messy dumps, never committed
├── steps/
│   └── plan/README.md                 # at-a-glance status block + per-phase scope
├── phases/
│   ├── phase_canonical_sibling.md       # canonical sibling template (feature-surface)
│   ├── phase_V_visual_redesign_masterplan.md
│   └── phase_<N>_<topic>.md             # open/partial briefs + the last few shipped
│                                        # (written by /plot or attended /plan-a-spec; never by the loop)
```

## How the loop reads this folder

1. **Status check** — read the "Status (at-a-glance)" block at
   the top of `plan/README.md`. The next phase is the first
   `[ ]` row that is unattended, has its `Requires` ticked, has a
   brief, and is not claimed by an open `loop:pr` PR
   (`skills/march.md` §3).
2. **Brief** — load `phases/phase_<N>_<topic>.md` and its acceptance
   IDs. If absent, the row is not pickable: the tick files "needs a
   brief: `/plot <N>`" to `CANDIDATES.md` and moves on. T
   writes briefs (`/plot`, attended `/plan-a-spec`).
3. **Landing** — code lands as a `loop:pr` PR that T merges; the PR's
   last commit ticks the row, so the merge ticks it. Plan-only
   commits (`plan/`, `telemetry/`, `docs/reports/`, `devlog/entries/`)
   push `main` (D84).
4. **Bearings** — `bearings.md` holds stack pins, contracts,
   visual defaults, sub-agent registry, standing decisions.
   Read once per session, with `docs/game-model.md` (the game as
   the code stands).

## Where design lands

No `design/` export layer is adopted in this project (see
`bearings.md`). Design lands through T: `/plot` (a brief in
`phases/`), `/messy` (a part plan in `plan/<topic>.md` or
`plan/revamp/<area>.md`), and attended sessions; the rebuild-track
sessions (B1–B10) write their own outputs in `plan/revamp/`, the record
THE REVAMP left. No numbered spec is current (specs 33 and 34
were retired in R10b). The design skills that used to write
`axiomancer-mechanics/specs/` and `braindump/` were archived in R0
(2026-09-28). There is no `plan/archive/` (D66, R10b2): rotated history is
deleted and git keeps it; the pre-revamp archive is read with
`git show archive-pre-revamp:plan/archive/<path>`, only when T asks.

## How the audit works

`/iterate` writes findings to `plan/AUDIT.md` with this format:

```markdown
# Site audit — <ISO date>

## Top 5 findings (scored)

### [8.1] <one-line description>
- category: <contract | divergence | debt | gap | content | docs | tests | a11y | perf | external-critique>
- impact: <0-10>
- ease: <0-10>
- next: <action — invocation, sub-agent, or follow-up>
```

Entries are flipped `[ ]` → `[x]` (with commit hash) as
addressed.

A line `> Bias: <category> (set via oversight <date>)` at the
top of `AUDIT.md` weights that category 1.5x in `/iterate`'s
scoring. Set / cleared via `/oversight reset`.

## Reflexes and lessons (adopt-by-need)

`reflexes.md` + `lessons.md` are a two-tier lessons layer, written
by the Retro step that closes every shipping verb
(`skills/march.md` §3). The format, the ladder (seen 2× → automated
that tick; seen 3× across verbs → reflex), the caps and the drain
path are stated in the two files' own headers;
`scripts/check-lessons.mjs` lints them.

## Manually ticking phases

If a phase ships outside the loop (rare), update
`plan/README.md` by hand: flip `[ ]` → `[x]`, append
the commit hash, add a line to "Phase log". The loop relies on
these markers.

## Related skills

- `skills/ship-a-chunk.md` — ship one phase end-to-end.
- `skills/plan-a-spec.md` — refine a phase brief without
  shipping code.
- `skills/iterate.md` — audit + ship one improvement; closes
  GitHub issues when their fix lands.
- `skills/critique.md` — external-observer pass; writes to
  `CRITIQUE.md`.
- `skills/triage.md` — issue review; routes open issues into
  `AUDIT.md` / the build plan.
- `skills/expand.md` — plan-expansion pass; reads signals,
  proposes phase candidates to `CANDIDATES.md`.
  Posture-controlled (bold default; strict opt-out).
- `skills/march.md` — outer dispatcher (used with `/loop`).
- `skills/oversight.md` — user-in-the-loop adjustment. Promotes
  phase candidates.
- `skills/plot.md`, `skills/messy.md` — T's intake (one task → one
  spec brief split into one-tick phases, a row each, opened as a `plot`
  PR, D93; a dump → part plan + candidates). Never fired by the loop.
