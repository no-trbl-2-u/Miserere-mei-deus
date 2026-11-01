# Truth sources — full protocols

> Condensed table + when-to-reach-for-what lives in root `AGENTS.md`
> § "Truth sources". This file carries the complete protocols moved
> out of the always-loaded guide (2026-07-16). The complete
> external-system register (ownership, credentials, recovery) is
> [`external-architecture.md`](./external-architecture.md).

## Source-of-truth hierarchy — decision authority

The one copy of the Nexus hierarchy for the whole monorepo (merged here
2026-09-25, trim T5, from the per-package `docs/source-of-truth-hierarchy.md`
files and the `docs/adr/README.md` lists; every other place points here).
It governs state reconciliation for autonomous workers in every package:
when two layers contradict each other, stop and surface the drift rather
than execute stale information.

1. **T's latest explicit decision** — highest authority.
2. **CDRs / ADRs** (`~/Workspace/decisions/`, each package's `docs/adr/`) —
   durable decision records.
3. **Central SomberSoft ledger** (`~/Workspace/SOMBERSOFT_COMMAND_LEDGER.md`) —
   company-wide doctrine and operating law.
4. **Active roadmap and specs** (`plan/README.md`, `plan/<NN>-<slug>.md`;
   shipped work in `plan/ARCHIVE.md`; nexus v2 since the NX1d cut-over) —
   current execution queue. A spec's acceptance IDs (`A1…`) are its
   definition of done; each chunk closes the ones it names.
5. **Candidates** (`plan/CANDIDATES.md`) — promotable work, not
   marching authority until accepted.
6. **Critique/audit logs** (`plan/CRITIQUE.md`, `plan/AUDIT.md`) — findings
   queues and evidence of known rot.
7. **Historical reports** (`docs/reports/`, dated devlog entries; the
   pre-revamp archive under the `archive-pre-revamp` git tag, read only
   when T asks about history) — evidence, subordinate to current law.

**Hand-written reports go in a package's `docs/reports/`** (for example
`axiomancer-mobile/docs/reports/`). The root `docs/reports/` holds the
loop's own generated reports. Every `/march` tick runs
`scripts/report-sweep.mjs` (phase RS1), and it files one CRITIQUE row for
each package report that `plan/CRITIQUE.md` and `plan/AUDIT.md` do not
already cite, so `/iterate` reads the report and files its findings. The
reports that were already handled when the sweep began are listed in
`plan/report-sweep-baseline.json`.

**A loop PR's body ranks below its commits** (R11). It summarizes what a
`loop:pr` PR shipped, its decisions and its acceptance IDs, but the commits
on `main` (and their messages) are the record; where the body and the
merged diff disagree, the diff wins and the body is drift to surface.

If a lower layer contradicts a higher one, a worker must:

1. **Stop execution** — do not proceed with stale information.
2. **Surface the drift** — report the specific contradiction and the files
   involved.
3. **Request reconciliation** — surface to T and reconcile before resuming.

Examples:

- A phase row says a feature is pending, but an ADR or build-plan row says it
  shipped → stop and reconcile.
- A candidate proposes a rule that conflicts with a CDR/ADR → stop; the
  decision record wins until amended.
- A critique finding references shipped work as still open → surface it as
  drift and drain or annotate the row.
- A historical report contradicts the central ledger or an ADR → treat the
  report as stale evidence, not marching law.

Phase shipping drains or annotates matching critique/audit/candidate rows.
CDRs/ADRs are not optional commentary; they sit above the central ledger in
repo execution disputes.

## The game model — the first read for rules

[`game-model.md`](./game-model.md) states the game as the code stands, every
number with the constant it comes from. It is the first read for any rules
question and outranks every spec, braindump or report that describes the
game differently. It ranks below the code: where the two disagree, the code
is right and the page is a bug to fix in the same change. It sits below
the decision records in the hierarchy above because it describes, it does
not decide.

## The card spec — DRAFT (Phase CS1)

| Source | Status | What it answers | Ranks |
|---|---|---|---|
| [`card-spec.md`](./card-spec.md) | **DRAFT**: T is filling it in; no section is a rule until T marks it RATIFIED | every card rule, one section each: what is live (with pointers), what T ratified but nobody built, T's ballot answer | below the code and `game-model.md` while DRAFT; a RATIFIED section is T's decision (layer 1 above) |

Its §17 lists the test that enforces each rule; those tests read the code,
not the spec.

## Game knowledge base — external prior art

`no-trbl-2-u/game-knowledge-base` is the OKF corpus of board-game rules
and reception research (source-backed claims, per-claim confidence). It
deploys itself as a live MCP server, which is the only way this repo
reads it — there is no local snapshot of the corpus here. Any agent or
attended session may call it for prior art and cite
`kb:<game-slug>/<doc> (src-NNN)` instead of citing reception from memory
(the `DigitalCardGames/dawncaster` corpus carries 1,692 card records and
141 keywords). The design skills and agents that used to be its named
consumers were archived in R0 (2026-09-28, D58). The server is
read-only, so coverage misses are filed as GitHub issues on the KB repo:
`gh issue create --repo no-trbl-2-u/game-knowledge-base --label wishlist
--title "<game or topic>" --body "<why it would help>"`. The KB's daily
scout consumes that wishlist label.

One consumption surface, metadata-first:

- **MCP (only)**: `kb-query` resolves over HTTP against the Worker
  the KB repo deploys (`.mcp.json` → `kb-mcp.no-trbl-2-u.workers.dev`),
  exposing `kb_overview` / `kb_find_games` / `kb_search` /
  `kb_read_doc` / `kb_cards` / `kb_keyword`. No sync involved: the
  corpus is whatever that repo last shipped. Auth is
  `Bearer ${KB_MCP_TOKEN}` out of the process environment — Claude Code
  does not read `.env` — and the server is fail-closed, so a missing
  token means `401` on every call rather than a silent stale answer.
  There is no second surface: if the Worker is unreachable, prior-art
  grounding is unavailable for that run, and anything answered from
  model memory is labeled UNGROUNDED rather than passed off as corpus
  fact.

Attended sessions call the MCP tools directly. Cloud ticks grant the `kb_*`
tools too (`.github/workflows/_claude-skill.yml`, 2026-08-31), passing
`KB_MCP_TOKEN` through as step env — unattended runs cite receipts
instead of memory. A preflight step probes the endpoint and warns
without failing: a dead or rotated KB must not sink an unrelated tick.

## Live engine data (`axio-query`) — the repo's own facts

The engine's OWN generated truth (card/effect/keyword facts) is
queryable the same way the external KB corpus is, via the sibling
`axio-query` stdio server (`scripts/axio-mcp-server.mjs`, registered in
`.mcp.json`): `axio_cards` / `axio_effects` / `axio_keywords` /
`axio_overview`. It reads `devlog/data/{cards,enemies,effects}.json`
(regenerating via `npm run catalog:export` when stale) and
`axiomancer-mechanics/docs/keyword-atlas.md` — always exactly as
current as the working tree, never hand-written prose. Unlike
`kb-query`, this one is a true accelerator-never-dependency: it reads
files that live in this repo, so when the tools are absent you Grep/Read
the libraries directly (`src/Cards/cards.library.ts`,
`src/Effects/effects.library.ts`) and lose nothing but speed.

`axio-query` vs `kb-query`: ours is the repo's own card/effect/keyword
facts (never stale, and never a dependency — the source files are right
here); `kb-query` is the genre's external prior art (community sourced,
cite with `src-NNN` receipts) and has NO local fallback — the Worker is
the corpus's only route into this repo.

## Measured truth

Two kinds of truth answer game questions, and they go stale
differently:

- **Source-derived truth** (what a card does, what a keyword means)
  regenerates from the tree — `game-model.md`, the libraries,
  `axio-query`, and the catalog are as fresh as their last export, and
  the guard tests pin every player-facing surface to the payloads. The
  catalog page carries a stamp (`from engine source <commit>`) so a
  stale render is visible on sight.
- **Measured truth** (win rates, how close a fight gets) is only as
  fresh as the last sim run. The current one is
  **`docs/reports/measured/latest.md`** (phase R12a): the grey deck and
  the Blood Price and Elementalist test decks (plus Blood Price
  half-upgraded, UP1g) in every Act 1 ledger fight, with the player
  at the level a full clear brings there, at three stat spreads, played
  by the greedy witness. Each cell gives the win rate and the lowest
  VITAE reached (mean and p10). Two sampled families (phase EM1),
  `elementalist~20of30` (the lane's spread) and `mixed~20of60` (a
  mixed-pool median), are 16 seeded draws each, read as the median with
  the win-rate range; and every deck has a Self-burn figure, the VITAE
  per fight it lost to its own INFERNO beside what the foe took. Every run appends one line to
  `docs/reports/measured/history.jsonl`; `.github/workflows/measured-truth.yml`
  runs it on every merge to `main` that touches `axiomancer-mechanics/src/`,
  on Sundays, and by hand. Engine: `npm run measured-truth -w
  axiomancer-mechanics` (`measuredTruthCells`).
- **The play log's sim rows** (phases SM1a to SM1h) are measurements too,
  and sit beside `measured/latest.md`, not in place of it. The headless
  bots (`npm run sim:run`, source `sim`) post the same per-card counts and
  whole-run rows as T's preview-APK play (`human`), read apart by
  `npm run api` (`card-usage --source sim`, `card-vs-bot`, `run-summary`;
  `axiomancer-mobile/docs/dev-tools.md`). They are a measurement, not a
  baseline (D57): nothing fails on a number, and a claim citing them names
  the build commit and the source it read. Sim numbers from before BUG1j
  (`0afc538bf`) are not comparable with later ones, and `harness` rows (a
  web export, a dev server, a jest run, and every row stored before
  migration 0006) belong to neither T nor the bots.
- **Chapter 1's enemies** (turns to kill and VITAE lost for every Breakwater
  foe at its node's level, all six elites included, against the four kitted
  lane decks at player levels 8 and 10, and the share of fights reaching each
  HP phase) are in **`docs/reports/chapter1-enemies.md`** (phase EN1i), with
  its own commit stamp, seed and run count. A measurement for T's tuning
  session, not a gate. Re-record it with `npm run chapter1-enemies -w
  axiomancer-mechanics -- --commit=<sha> --write=../docs/reports/chapter1-enemies.md`.
- **The loop's own gates** (how often CI, `verify`, the antagonist, the
  merge gate and the builder's `[x]` let an escape through) are measured
  in **`docs/reports/eval/latest.md`** (phase EV1): the escape ledger,
  the parent replay, planted defects, mutation scores, the miss rate per
  judge and the ranked fixes, each section with its own commit stamp
  (the ranked fixes as of `a712832a`, 2026-10-16). It is regenerated by
  the `eval:*` scripts, by hand, never in CI. `/critique`'s row reads
  **`docs/reports/critique/passes.jsonl`** (phase LG1e): one append-only
  line per pass naming the commit range it played, the screens and
  viewports, and the findings it filed.
- **Title plate legibility** (can the wordmark and the psalm line be read
  against the title plate) is measured in
  **`docs/reports/title-plate-legibility.md`** (phase TP1a): four contrast
  ratios for the installed plate at one reference viewport, with the
  thresholds the gate holds a new plate to. `npm run art:test -w
  axiomancer-mobile` checks it on every run; `npm run art:legibility -w
  axiomancer-mobile -- --write` re-records it.

The old deck-matrix numbers were retired in revamp phase R1 (D57) and
are not this record; they describe a pre-revamp engine
(`archive-pre-revamp:plan/archive/baselines/deck-matrix-baseline.json`,
stamp `be808d2`). Never cite them.

Rules for citing a measurement:

1. **Name the commit.** Every claim citing it says what it measured
   ("as of `<commit>`, `<date>`", the stamp at the top of `latest.md`).
   A question the table does not cover gets "not measured" as its
   answer.
2. **A measurement, not a gate (D57).** Nothing fails on a number. A
   run-to-run move past `docs/reports/measured/thresholds.json` lands in
   the `/digest` DevLog entry and as a `[content]` row in
   `plan/AUDIT.md`. Whether it ever becomes a gated reference is R12's
   call, made with T.
3. **Measuring is not tuning (D88, D99).** A measurement is briefing:
   card and deck changes ship only from a brief T approved, and
   enemies or engine constants move only inside a phase T briefed. A
   `[content]` drift row waits for T; `/iterate` never fixes it.

**Performance is measured; balance is not.** The weekly performance audit
(`.github/workflows/perf-audit.yml`, D77) keeps the performance record in
`docs/reports/perf/history.jsonl` (one line per week: web bundle and load,
runtime smoothness on a scripted combat round, engine ms per combat) with
budgets in `docs/reports/perf/budgets.json`. It answers "is the game
getting slower or heavier", never a balance question; balance lives in
`docs/reports/measured/` (above).
