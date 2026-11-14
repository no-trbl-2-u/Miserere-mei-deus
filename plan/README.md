# Miserere Mei, Deus roadmap

> What is still to build, one spec per initiative, each ending
> in chunks sized to one session. Read by every shipping skill
> (`/next`, `/ship-a-chunk`, `/plan-a-spec`, `/march`,
> `/iterate`, `/oversight`) to pick the next chunk. The plan only shrinks:
> a finished chunk leaves as one line in
> [`ARCHIVE.md`](ARCHIVE.md).

Miserere moved onto this shape at the nexus v2 cut-over (phase
NX1d, 2026-11-01; `plan/nexus.lock`). The v1 build plan's open rows
are the specs below, each chunk keeping its old row id as its
`alias:` (so `SM1d`, `B2` or `NX1e` still names it); every shipped
v1 row is an `ARCHIVE.md` line carrying its alias. The whole v1
build plan and its briefs are in git: `git show
fd21d04ab:plan/steps/01_build_plan.md`.

---

## Lanes

**Asap** (built before the table, in this order, once their
needs are done):

















- **163.3** · TK1c: preview builds refuse the owner token, and a release can carry its APK (T, `/plot asap`, 2026-11-09; needs 163.2)
- **177.18** · NV1r: the seven other Chapter 1 foes' approved descriptions in the game, and the Tide-Gate renamed The Half-Taken (T, `/plot`, 2026-11-13)
- **180.1** · CW1a: a log of the screens CI hangs on, written by a recorder script (T, `/plot`, 2026-11-12)








**Held** (waits on a person's word; never picked until the
line goes; each line is a lock that times out:
`- **<NN.k>** · <reason> · since: <date> · until: <date or
condition> · max_age: 14d`, an optional `· fallback: release`).
Every chunk only T can do is here: the attended ones and the
owner-led sessions (D88). An `until:` date is the deadline Item
that names the chunk (`plan/deadlines.md`); past it, or past
`max_age`, the loop asks T once (an issue), never releases it:

- **177.3** · attended: T reviews the Chapter 1 lines still to be drafted from the new story; the scenes and the quest lines are approved (NV1c) · since: 2026-11-11 · until: T's word · max_age: 30d

- **119.3** · attended: T does this one (BV1c) · since: 2026-11-01 · until: T's word · max_age: 30d
- **122.2** · attended: T does this one (R12) · since: 2026-11-01 · until: 2026-12-12 · max_age: 48d
- **123.1** · attended: T does this one (PF2) · since: 2026-11-01 · until: T's word · max_age: 30d
- **146.7** · owner-led: art is owner-only (D88) (AP1g) · since: 2026-11-04 · until: T's word · max_age: 30d
- **129.2** · attended: T does this one (IO1b) · since: 2026-11-01 · until: T's word · max_age: 30d
- **129.4** · attended: T does this one (IO1d) · since: 2026-11-01 · until: T's word · max_age: 30d
- **131.1** · attended: T does this one (SB1) · since: 2026-11-01 · until: T's word · max_age: 30d
- **133.9** · attended: T does this one (NX1i) · since: 2026-11-01 · until: T's word · max_age: 30d
- **134.2** · owner-led: T's session 2026-09-28 (B1) · since: 2026-11-01 · until: 2026-12-05 · max_age: 41d
- **134.3** · owner-led: T's session 2026-09-28 (B5) · since: 2026-11-01 · until: T's word · max_age: 30d
- **134.4** · owner-led: T's session 2026-09-28 (B6) · since: 2026-11-01 · until: T's word · max_age: 30d
- **134.5** · owner-led: T's session 2026-09-28 (B2) · since: 2026-11-03 · until: 2026-11-23 · max_age: 21d
- **134.6** · owner-led: T's session 2026-09-28 (B10) · since: 2026-11-01 · until: T's word · max_age: 30d
- **134.7** · owner-led: T's session 2026-09-28 (B7) · since: 2026-11-01 · until: T's word · max_age: 30d
- **134.8** · owner-led: T's session 2026-09-28 (B8) · since: 2026-11-01 · until: T's word · max_age: 30d
- **134.9** · owner-led: T's session 2026-09-28 (B9) · since: 2026-11-01 · until: T's word · max_age: 30d

- **166.2** · attended: T does this one (CK1b) · since: 2026-11-09 · until: T's word · max_age: 60d
- **166.3** · attended: T does this one (CK1c) · since: 2026-11-09 · until: T's word · max_age: 60d
- **166.4** · attended: T does this one (CK1d) · since: 2026-11-09 · until: 2026-12-23 · max_age: 60d
- **166.5** · attended: T does this one (CK1e) · since: 2026-11-09 · until: T's word · max_age: 60d
- **166.6** · attended: T does this one (CK1f) · since: 2026-11-09 · until: T's word · max_age: 60d

- **163.2** · attended: T does this one (TK1b) · since: 2026-11-09 · until: T's word · max_age: 30d

## Specs

| # | Initiative | Spec | Status | Progress |
|---|---|---|---|---|
| 180 | CI screen watch: a log of the screens CI hangs on, and the first cleanup | [180-cw1-ci-screen-watch.md](180-cw1-ci-screen-watch.md) | planned (**Asap**: 180.1) | 1 left |
| 177 | The Narrator's voice, and Chapter 1's unwritten lines in it | [177-nv1-narrator-voice.md](177-nv1-narrator-voice.md) | planned | 6 left |
| 169 | An open deadline Item that names a merged pull request fails the lint | [169-dl3-merged-pr-items.md](169-dl3-merged-pr-items.md) | planned | 1 left |
| 163 | The published APK carries a tester token that can only post | [163-tk1-tester-api-token.md](163-tk1-tester-api-token.md) | planned (**Asap**: 163.3) | 2 left |
| 166 | T's checks, in one place | [166-ck1-ts-checks.md](166-ck1-ts-checks.md) | planned | 5 left |
| 119 | Ballots on the phone, verdicts in D1 | [119-bv1-ballot-verdicts.md](119-bv1-ballot-verdicts.md) | planned | 1 left |
| 122 | New combat-playtest | [122-r12-new-combat-playtest.md](122-r12-new-combat-playtest.md) | planned | 1 left |
| 123 | Combat SVG rasterisation | [123-pf2-combat-svg-raster.md](123-pf2-combat-svg-raster.md) | planned | 1 left |
| 127 | Card upgrades carry the Act 1 power curve | [127-up1-card-upgrades.md](127-up1-card-upgrades.md) | planned | 1 left |
| 129 | iPhone beta builds | [129-io1-iphone-beta.md](129-io1-iphone-beta.md) | planned | 2 left |
| 131 | Set bonuses: T's design session | [131-sb1-set-bonuses.md](131-sb1-set-bonuses.md) | planned | 1 left |
| 133 | Miserere on nexus v2, and kept current with it | [133-nx1-nexus-v2.md](133-nx1-nexus-v2.md) | planned | 1 left |
| 134 | The owner-led rebuild sessions (B-track) | [134-owner-led-rebuild-sessions.md](134-owner-led-rebuild-sessions.md) | planned | 8 left |
| 146 | Arena plates: twelve engravings behind the foe, a default per region, a plate per node | [146-ap1-arena-plates.md](146-ap1-arena-plates.md) | planned | 1 left |

## How the loop reads this folder

1. **Pick.** An explicit argument wins (`/next 110.1`, or an
   alias). Otherwise the first ready chunk in the Asap lane, then
   in priority rows (a Status of `planned · priority N`,
   `priority 1` first), then in table order. Within a spec,
   the first chunk whose `needs` are done. A need is done when
   its line is gone from every spec. Held chunks are never
   picked. A chunk with a `pr:` sub-bullet is in flight: its
   open `loop:pr` PR is its claim.
2. **Spec.** Read the spec end to end: Design and Contracts
   are decided upfront, and Acceptance says what done means.
   The rules every build carries (truth sources, order of
   authority, D-numbers, save compatibility, the per-workspace
   verify) are AGENTS.md § Building a phase.
3. **Land.** Every change lands by PR (D119): code as a
   `loop:pr` PR that the review merges, and `plot`,
   `review:rules-change` and `nexus-sync` PRs that T merges.
   Plan changes ride in the PR as `plan/pending/` files, and the
   merge job settles them here once it merges (phase NX1e,
   `skills/next/land.md`'s local block). The loop stays off
   (`march` and `night` disabled) until NX1i.
4. **Bearings.** `bearings.md` holds stack pins, contracts,
   visual defaults, the sub-agent registry and standing
   decisions. Read once per session, with `docs/game-model.md`
   (the game as the code stands).
5. **Arrive.** New work enters only through T: `/plot` (one
   task, researched and chunked into a spec, opened as a `plot`
   PR T merges, D93) and `/messy` (a dump, filed as `[owner]`
   candidates in `CANDIDATES.md` T promotes). The loop never
   writes a spec (`Promote: owner`, ruling R3).

## Layout

```
plan/
├── README.md        # this roadmap: lanes + one row per spec
├── NNN-<slug>.md    # one spec per initiative (chunks, acceptance IDs)
├── ARCHIVE.md       # one line per finished chunk; append-only
├── nexus.lock       # the nexus kit version this plan follows
├── bearings.md      # standing context; its ## Loop knobs block is v2's
├── deadlines.md     # the deadline plan (Items name chunk aliases)
├── AUDIT.md · CRITIQUE.md · CANDIDATES.md   # the queues
├── NEEDS_T.md       # fixes only T can make (D94)
├── reflexes.md · lessons.md                 # the retro ladder
├── revamp/          # THE REVAMP part plans, kept as the record
└── messy/           # gitignored: /messy dumps, never committed
```

## Where design lands

No `design/` export layer is adopted in this project (see
`bearings.md`). Design lands through T: `/plot` (a spec here),
`/messy` (a part plan in `plan/<topic>.md` or
`plan/revamp/<area>.md`), and attended sessions; the owner-led
sessions (spec 134) write their own outputs in `plan/revamp/`, the
record THE REVAMP left. The design skills that used to write
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
(`skills/march.md`). The format, the ladder (seen 2× → automated
that tick; seen 3× across verbs → reflex), the caps and the drain
path are stated in the two files' own headers;
`scripts/check-lessons.mjs` lints them.

## Related skills

- `skills/next.md` — build the next ready chunk (claim, build,
  gate, close); `skills/ship-a-chunk.md` is its unattended form.
- `skills/plan-a-spec.md` — refine a spec without shipping code.
- `skills/iterate.md` — audit + ship one improvement.
- `skills/critique.md` — external-observer pass; writes to
  `CRITIQUE.md`.
- `skills/triage.md` — issue review; routes open issues into
  `AUDIT.md` or a spec.
- `skills/expand.md` — reads signals, proposes candidates to
  `CANDIDATES.md`.
- `skills/march.md` — outer dispatcher (used with `/loop`), with
  Miserere's own steps in `skills/march.lanes.md`.
- `skills/oversight.md` — user-in-the-loop adjustment. Promotes
  candidates.
- `skills/plot.md`, `skills/messy.md` — T's intake. Never fired by
  the loop (rule 8).
- `skills/pilot.md` — T's attended parallel orchestrator (ours,
  nexus's heads-down frame around our waves); `skills/heads-down.md`
  is the kit's, stock. Never fired by the loop.

## Queue change log

Every queue mutation T asks for through another brain (Hermes; `plan/bearings.md`)
adds a line here in the same commit. The v1 build plan's log, through
2026-10-31, is in git: `git show fd21d04ab:plan/steps/01_build_plan.md`.

- **2026-11-01** — actor: **T, in session** (`/plot asap`, run unattended on T's word, branch
  `loop/plot-SM2-sim-followups-v2`). Action: **added spec 135 and chunks 135.1-135.7 (SM2a-SM2g)**, all seven on the
  Asap lane in that order. Confirmed T's request: the follow-up to SM1, redirected by T in the same session ("I would
  much rather have sims where they play the actual game instead of testing the decks"): four player personas as the
  main bots, breaks filed as issues, a nightly report of run health, pacing, difficulty and coverage, the lane bots by
  hand only; kept from the first draft: 14-day retention of `sim` and `harness` rows by a cron on the Worker and a
  fight's quest XP logged as `quest`; the first draft's Merciful kill-to-grow chunk dropped. T's answers are recorded
  in the spec as "Confirmed by T (2026-11-01)". Reason (T): sims that play the game, not test the decks. Spec
  `plan/135-sm2-sim-follow-ups.md`.

- **2026-11-01** — actor: **T, in session** (`/heads-down`, phase NX1d, T's ruling of
  2026-10-31: "cut over now"). Action: **the v1 build plan carried to nexus v2**: every
  open row is a chunk of specs 110-134 with its old id as its `alias:`; every row only T
  does is a Held line; every shipped, skipped and pre-revamp partial row is an
  `ARCHIVE.md` line carrying its alias. Nothing reordered: the spec table follows the v1
  queue's order.
