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

- (none yet)

**Held** (waits on a person's word; never picked until the
line goes; each line is a lock that times out:
`- **<NN.k>** · <reason> · since: <date> · until: <date or
condition> · max_age: 14d`, an optional `· fallback: release`).
Every chunk only T can do is here: the attended ones and the
owner-led sessions (D88). An `until:` date is the deadline Item
that names the chunk (`plan/deadlines.md`); past it, or past
`max_age`, the loop asks T once (an issue), never releases it:

- **113.9** · attended: T does this one (SM1i) · since: 2026-11-01 · until: T's word · max_age: 30d
- **115.5** · attended: T does this one (MF1e) · since: 2026-11-01 · until: T's word · max_age: 30d
- **116.4** · attended: T does this one (BW1d) · since: 2026-11-01 · until: 2026-11-10 · max_age: 16d
- **117.6** · attended: T does this one (DF1f) · since: 2026-11-01 · until: 2026-11-12 · max_age: 18d
- **118.4** · attended: T does this one (EL1d) · since: 2026-11-01 · until: T's word · max_age: 30d
- **119.3** · attended: T does this one (BV1c) · since: 2026-11-01 · until: T's word · max_age: 30d
- **120.5** · attended: T does this one (HP4e) · since: 2026-11-01 · until: 2026-11-01 · max_age: 14d
- **121.2** · owner-led: art is owner-only (D88) (TP1b) · since: 2026-11-01 · until: 2026-11-07 · max_age: 14d
- **122.2** · attended: T does this one (R12) · since: 2026-11-01 · until: 2026-12-12 · max_age: 48d
- **123.1** · attended: T does this one (PF2) · since: 2026-11-01 · until: T's word · max_age: 30d
- **124.5** · attended: T does this one (HP2e) · since: 2026-11-01 · until: 2026-11-28 · max_age: 34d
- **125.8** · attended: T does this one (LG1h) · since: 2026-11-01 · until: 2026-12-23 · max_age: 59d
- **126.4** · attended: T does this one (OV1d) · since: 2026-11-01 · until: T's word · max_age: 30d
- **128.7** · attended: T does this one (BE2g) · since: 2026-11-01 · until: T's word · max_age: 30d
- **129.2** · attended: T does this one (IO1b) · since: 2026-11-01 · until: T's word · max_age: 30d
- **129.4** · attended: T does this one (IO1d) · since: 2026-11-01 · until: T's word · max_age: 30d
- **130.4** · attended: T does this one (FM2d) · since: 2026-11-01 · until: T's word · max_age: 30d
- **131.1** · attended: T does this one (SB1) · since: 2026-11-01 · until: T's word · max_age: 30d
- **133.9** · attended: T does this one (NX1i) · since: 2026-11-01 · until: T's word · max_age: 30d
- **134.2** · owner-led: T's session 2026-09-28 (B1) · since: 2026-11-01 · until: 2026-12-05 · max_age: 41d
- **134.3** · owner-led: T's session 2026-09-28 (B5) · since: 2026-11-01 · until: T's word · max_age: 30d
- **134.4** · owner-led: T's session 2026-09-28 (B6) · since: 2026-11-01 · until: T's word · max_age: 30d
- **134.5** · owner-led: T's session 2026-09-28 (B2) · since: 2026-11-01 · until: 2026-11-02 · max_age: 14d
- **134.6** · owner-led: T's session 2026-09-28 (B10) · since: 2026-11-01 · until: T's word · max_age: 30d
- **134.7** · owner-led: T's session 2026-09-28 (B7) · since: 2026-11-01 · until: T's word · max_age: 30d
- **134.8** · owner-led: T's session 2026-09-28 (B8) · since: 2026-11-01 · until: T's word · max_age: 30d
- **134.9** · owner-led: T's session 2026-09-28 (B9) · since: 2026-11-01 · until: T's word · max_age: 30d

## Specs

| # | Initiative | Spec | Status | Progress |
|---|---|---|---|---|
| 110 | A difficulty curve from bot plays, and the Breakwater's six hazards on it | [110-hp6-breakwater-puzzle-curve.md](110-hp6-breakwater-puzzle-curve.md) | planned | 3 left |
| 111 | The map camera holds still: a smooth pinch, a memory across fights, a gentler recentre, the whole map reachable | [111-mc1-map-camera.md](111-mc1-map-camera.md) | planned | 1 left |
| 112 | Combat entry and exit: the music steps aside for the whole fight, and the ink really spreads | [112-cx1-combat-entry-exit.md](112-cx1-combat-entry-exit.md) | planned | 1 left |
| 113 | The sim playtester and its own data, kept apart from T's | [113-sm1-sim-playtester-data.md](113-sm1-sim-playtester-data.md) | planned | 2 left |
| 114 | The Chosen's signature says why it will not fire, and the play log takes fights again | [114-sk1-signature-skills.md](114-sk1-signature-skills.md) | planned | 2 left |
| 115 | The Merciful trial set (my mending is a weapon) | [115-mf1-merciful-trial-set.md](115-mf1-merciful-trial-set.md) | planned | 1 left |
| 116 | The Breakwater rebuilt to T's Chapter 1 vision, and kind icons on every node | [116-bw1-breakwater-rebuild.md](116-bw1-breakwater-rebuild.md) | planned | 2 left |
| 117 | The Defender trial set (the turtle with spikes) | [117-df1-defender-trial-set.md](117-df1-defender-trial-set.md) | planned | 1 left |
| 118 | The Elementalist trial set (the weather in play) | [118-el1-elementalist-trial-set.md](118-el1-elementalist-trial-set.md) | planned | 1 left |
| 119 | Ballots on the phone, verdicts in D1 | [119-bv1-ballot-verdicts.md](119-bv1-ballot-verdicts.md) | planned | 1 left |
| 120 | A graded hazard-puzzle set, played and pattern-mined | [120-hp4-graded-puzzle-set.md](120-hp4-graded-puzzle-set.md) | planned | 3 left |
| 121 | Title plate legibility: prove the plate, then replace it | [121-tp1-title-plate-legibility.md](121-tp1-title-plate-legibility.md) | planned | 1 left |
| 122 | New combat-playtest | [122-r12-new-combat-playtest.md](122-r12-new-combat-playtest.md) | planned | 1 left |
| 123 | Combat SVG rasterisation | [123-pf2-combat-svg-raster.md](123-pf2-combat-svg-raster.md) | planned | 1 left |
| 124 | Hazard puzzle card audit and difficulty calibration | [124-hp2-puzzle-card-audit-difficulty.md](124-hp2-puzzle-card-audit-difficulty.md) | planned | 3 left |
| 125 | Loop gates: the eval report's ranked fixes, built | [125-lg1-loop-gates.md](125-lg1-loop-gates.md) | planned | 1 left |
| 126 | The Obsidian vault: brainstorm and plot from the phone | [126-ov1-obsidian-vault.md](126-ov1-obsidian-vault.md) | planned | 1 left |
| 127 | Card upgrades carry the Act 1 power curve | [127-up1-card-upgrades.md](127-up1-card-upgrades.md) | planned | 1 left |
| 128 | Card and combat logging (the play log) | [128-be2-card-combat-logging.md](128-be2-card-combat-logging.md) | planned | 1 left |
| 129 | iPhone beta builds | [129-io1-iphone-beta.md](129-io1-iphone-beta.md) | planned | 2 left |
| 130 | The modular feature map: a note per feature, canvases you zoom into | [130-fm2-modular-feature-map.md](130-fm2-modular-feature-map.md) | planned | 1 left |
| 131 | Set bonuses: T's design session | [131-sb1-set-bonuses.md](131-sb1-set-bonuses.md) | planned | 1 left |
| 132 | A Settings tab: the gear, a music switch, a feedback form, and the dev menu moved in | [132-st1-settings-tab.md](132-st1-settings-tab.md) | planned | 2 left |
| 133 | Miserere on nexus v2, and kept current with it | [133-nx1-nexus-v2.md](133-nx1-nexus-v2.md) | planned | 5 left |
| 134 | The owner-led rebuild sessions (B-track) | [134-owner-led-rebuild-sessions.md](134-owner-led-rebuild-sessions.md) | planned | 8 left |

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
   Until phase NX1e adapts v2's land step (`skills/next/land.md`)
   to that, the loop stays off (`march` and `night` disabled) and
   nobody runs `/next` unattended.
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
- `skills/heads-down.md` — T's attended parallel orchestrator,
  ours until phase NX1g makes it `/pilot`.

## Queue change log

Every queue mutation T asks for through another brain (Hermes; `plan/bearings.md`)
adds a line here in the same commit. The v1 build plan's log, through
2026-10-31, is in git: `git show fd21d04ab:plan/steps/01_build_plan.md`.

- **2026-11-01** — actor: **T, in session** (`/heads-down`, phase NX1d, T's ruling of
  2026-10-31: "cut over now"). Action: **the v1 build plan carried to nexus v2**: every
  open row is a chunk of specs 110-134 with its old id as its `alias:`; every row only T
  does is a Held line; every shipped, skipped and pre-revamp partial row is an
  `ARCHIVE.md` line carrying its alias. Nothing reordered: the spec table follows the v1
  queue's order.
