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


- **157.2** · EN3b: Chapter 1's nodes repointed, the benched foes' nodes refilled, the wandering pool on the survivors (T's enemy recast, `/plot asap`, 2026-11-06)

- **135.3** · SM2c: the four personas (T, `/plot asap`, 2026-11-01)
- **135.4** · SM2d: breaks caught and filed; personas nightly, lane bots by hand (T, `/plot asap`, 2026-11-01)
- **135.6** · SM2f: the nightly sim report (T, `/plot asap`, 2026-11-01)
- **99.1** · automate footgun `card-voice-stale-rows` (seen 2×), spec 99's ladder chunk.
- **99.2** · automate footgun `face-text-parsers` (seen 2×), spec 99's ladder chunk.



- **152.4** · UK1d: the Spoils on vellum, inked to read (T's mixer picks, `/plot`, 2026-11-06)

- **153.4** · UX1d: no "A FOE RISES"; the dock trades its circles for room (T's mixer notes, `/plot`, 2026-11-06)

- **154.6** · UK2f: the quest shows no pay and no lone counter (T's mixer round 2, `/plot`, 2026-11-06)

- **155.4** · DR1d: keywords tapped and held in the card's own text (T's note on the Reader lab, `/plot`, 2026-11-06)
- **99.6** · automate footgun `font-width-estimates-stale` (seen 2×), spec 99's ladder chunk.
- **99.7** · automate footgun `recast-pinned-orphan-lens` (seen 2×), spec 99's ladder chunk.
- **99.8** · automate footgun `scratchpad-script-no-resolve` (seen 2×), spec 99's ladder chunk.
- **99.9** · automate footgun `stakes-card-vm-undrawn-lines` (seen 2×), spec 99's ladder chunk.
- **99.10** · automate footgun `windows-tar-tree-lint` (seen 7×), spec 99's ladder chunk.

- **160.1** · MG1a: the merge decision re-runs when the verify gate finishes (T's end gate, `/plot`, 2026-11-08)


- **159.6** · TU1f: LOAD GAME takes its tap; foe names clear the shield; relic names keep their words; Self shows the whole name (T, `/plot`, 2026-11-08)

- **161.1** · GO1a: a second death reaches Game Over, not the opening scene (T, `/plot`, 2026-11-08)

- **162.3** · MV1c: the Saint Beneath's own moves (T's ballot, `/plot`, 2026-11-08)
- **162.4** · MV1d: five recast foes get their own moves (T's ballot, `/plot`, 2026-11-08)

**Held** (waits on a person's word; never picked until the
line goes; each line is a lock that times out:
`- **<NN.k>** · <reason> · since: <date> · until: <date or
condition> · max_age: 14d`, an optional `· fallback: release`).
Every chunk only T can do is here: the attended ones and the
owner-led sessions (D88). An `until:` date is the deadline Item
that names the chunk (`plan/deadlines.md`); past it, or past
`max_age`, the loop asks T once (an issue), never releases it:

- **113.9** · attended: T does this one (SM1i) · since: 2026-11-01 · until: T's word · max_age: 30d
- **156.7** · waits on T's colour ballot verdict (TY1g; built by TY1f) · since: 2026-11-06 · until: T's word · max_age: 60d
- **115.5** · attended: T does this one (MF1e) · since: 2026-11-01 · until: T's word · max_age: 30d
- **116.4** · attended: T does this one (BW1d) · since: 2026-11-01 · until: 2026-11-10 · max_age: 16d
- **117.6** · attended: T does this one (DF1f) · since: 2026-11-01 · until: 2026-11-12 · max_age: 18d
- **118.4** · attended: T does this one (EL1d) · since: 2026-11-01 · until: T's word · max_age: 30d
- **119.3** · attended: T does this one (BV1c) · since: 2026-11-01 · until: T's word · max_age: 30d
- **122.2** · attended: T does this one (R12) · since: 2026-11-01 · until: 2026-12-12 · max_age: 48d
- **123.1** · attended: T does this one (PF2) · since: 2026-11-01 · until: T's word · max_age: 30d
- **146.7** · owner-led: art is owner-only (D88) (AP1g) · since: 2026-11-04 · until: T's word · max_age: 30d
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
- **134.5** · owner-led: T's session 2026-09-28 (B2) · since: 2026-11-03 · until: 2026-11-23 · max_age: 21d
- **134.6** · owner-led: T's session 2026-09-28 (B10) · since: 2026-11-01 · until: T's word · max_age: 30d
- **134.7** · owner-led: T's session 2026-09-28 (B7) · since: 2026-11-01 · until: T's word · max_age: 30d
- **134.8** · owner-led: T's session 2026-09-28 (B8) · since: 2026-11-01 · until: T's word · max_age: 30d
- **134.9** · owner-led: T's session 2026-09-28 (B9) · since: 2026-11-01 · until: T's word · max_age: 30d

## Specs

| # | Initiative | Spec | Status | Progress |
|---|---|---|---|---|
| 162 | Six foes get moves of their own | [162-mv1-enemy-movesets.md](162-mv1-enemy-movesets.md) | planned | 2 left |
| 161 | A second death reaches the Game Over screen | [161-go1-second-death-game-over.md](161-go1-second-death-game-over.md) | planned (**Asap**: 161.1) | 1 left |
| 160 | A passed review still merges when the verify gate finishes after it | [160-mg1-merge-after-late-gate.md](160-mg1-merge-after-late-gate.md) | planned (**Asap**: 160.1) | 1 left |
| 159 | Touch-ups from T's phone: the Spoils, the fight, card faces, the Wilds, the tab bar and Self | [159-tu1-phone-touch-ups.md](159-tu1-phone-touch-ups.md) | planned | 1 left |
| 158 | The combat board gets a CI visual route, so the fight's brass and layout have a pixel net | [158-vr1-combat-board-visual-route.md](158-vr1-combat-board-visual-route.md) | planned | 1 left |
| 157 | Chapter 1's enemy roster recast: six new faces onto six cut foes' nodes, four more benched, the wandering pool on the survivors | [157-en3-chapter1-enemy-recast.md](157-en3-chapter1-enemy-recast.md) | planned (**Asap**: each chunk) | 1 left |
| 156 | Type and colour by T's ballots, then a design audit of every screen against the AI-design tells | [156-ty1-type-and-design-audit.md](156-ty1-type-and-design-audit.md) | planned | 5 left |
| 155 | The Deck tab as a reader: one card open over its own painting, the rest in tabbed thumbnails, keywords pressed in the text | [155-dr1-deck-reader.md](155-dr1-deck-reader.md) | planned (**Asap**: each chunk) | 1 left |
| 154 | The UI kit, round 2: the node screens, new game and the endings, and T's notes on each | [154-uk2-ui-kit-round-2.md](154-uk2-ui-kit-round-2.md) | planned | 1 left |
| 111 | The map camera holds still: a smooth pinch, a memory across fights, a gentler recentre, the whole map reachable | [111-mc1-map-camera.md](111-mc1-map-camera.md) | planned | 1 left |
| 112 | Combat entry and exit: the music steps aside for the whole fight, and the ink really spreads | [112-cx1-combat-entry-exit.md](112-cx1-combat-entry-exit.md) | planned | 1 left |
| 113 | The sim playtester and its own data, kept apart from T's | [113-sm1-sim-playtester-data.md](113-sm1-sim-playtester-data.md) | planned | 1 left |
| 115 | The Merciful trial set (my mending is a weapon) | [115-mf1-merciful-trial-set.md](115-mf1-merciful-trial-set.md) | planned | 2 left |
| 116 | The Breakwater rebuilt to T's Chapter 1 vision, and kind icons on every node | [116-bw1-breakwater-rebuild.md](116-bw1-breakwater-rebuild.md) | planned | 2 left |
| 117 | The Defender trial set (the turtle with spikes) | [117-df1-defender-trial-set.md](117-df1-defender-trial-set.md) | planned | 1 left |
| 118 | The Elementalist trial set (the weather in play) | [118-el1-elementalist-trial-set.md](118-el1-elementalist-trial-set.md) | planned | 1 left |
| 119 | Ballots on the phone, verdicts in D1 | [119-bv1-ballot-verdicts.md](119-bv1-ballot-verdicts.md) | planned | 1 left |
| 121 | Title plate legibility: prove the plate, then replace it | [121-tp1-title-plate-legibility.md](121-tp1-title-plate-legibility.md) | planned | 1 left |
| 122 | New combat-playtest | [122-r12-new-combat-playtest.md](122-r12-new-combat-playtest.md) | planned | 1 left |
| 123 | Combat SVG rasterisation | [123-pf2-combat-svg-raster.md](123-pf2-combat-svg-raster.md) | planned | 2 left |
| 125 | Loop gates: the eval report's ranked fixes, built | [125-lg1-loop-gates.md](125-lg1-loop-gates.md) | planned | 2 left |
| 126 | The Obsidian vault: brainstorm and plot from the phone | [126-ov1-obsidian-vault.md](126-ov1-obsidian-vault.md) | planned | 1 left |
| 127 | Card upgrades carry the Act 1 power curve | [127-up1-card-upgrades.md](127-up1-card-upgrades.md) | planned | 1 left |
| 128 | Card and combat logging (the play log) | [128-be2-card-combat-logging.md](128-be2-card-combat-logging.md) | planned | 1 left |
| 129 | iPhone beta builds | [129-io1-iphone-beta.md](129-io1-iphone-beta.md) | planned | 2 left |
| 130 | The modular feature map: a note per feature, canvases you zoom into | [130-fm2-modular-feature-map.md](130-fm2-modular-feature-map.md) | planned | 1 left |
| 131 | Set bonuses: T's design session | [131-sb1-set-bonuses.md](131-sb1-set-bonuses.md) | planned | 1 left |
| 132 | A Settings tab: the gear, a music switch, a feedback form, and the dev menu moved in | [132-st1-settings-tab.md](132-st1-settings-tab.md) | planned | 1 left |
| 133 | Miserere on nexus v2, and kept current with it | [133-nx1-nexus-v2.md](133-nx1-nexus-v2.md) | planned | 1 left |
| 134 | The owner-led rebuild sessions (B-track) | [134-owner-led-rebuild-sessions.md](134-owner-led-rebuild-sessions.md) | planned | 8 left |
| 135 | Sims that play the game: player personas, breaks filed, a nightly report of run health, pacing and coverage | [135-sm2-sim-follow-ups.md](135-sm2-sim-follow-ups.md) | planned | 7 left |
| 137 | Card faces you read without opening: one wording grammar, as words or glyphs | [137-cf1-card-face-grammar.md](137-cf1-card-face-grammar.md) | planned | 1 left |
| 139 | Equipment follow-ups: the Blacksmith's dead +3 upgrade retired, and the gear card without its repeat | [139-eq4-equipment-follow-ups.md](139-eq4-equipment-follow-ups.md) | planned | 2 left |
| 146 | Arena plates: twelve engravings behind the foe, a default per region, a plate per node | [146-ap1-arena-plates.md](146-ap1-arena-plates.md) | planned | 1 left |
| 153 | The kit mixer's layout notes: fewer words, a calmer map, no burden, and a Deck to pick | [153-ux1-ui-kit-layout-notes.md](153-ux1-ui-kit-layout-notes.md) | planned | 1 left |
| 152 | The UI kit, place by place: Brass Gothic, Vellum & Ink or as it is, per T's picks | [152-uk1-ui-kit-looks.md](152-uk1-ui-kit-looks.md) | planned | 1 left |
| 99 | Guard the traps: an open footgun seen twice becomes a test, a hook or a lint | [99-guard-the-traps.md](99-guard-the-traps.md) | planned (**Asap**: each chunk) | 7 left |

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
