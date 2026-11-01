# 135 — The sim follow-ups: a Merciful bot that grows, rows that expire, a nightly report T reads

> The Merciful bot kills while it is behind and spares once it is ahead, so it builds its lane and A12's lane check passes; `sim` and `harness` rows leave D1 after 14 days while T's stay forever; every night a committed `docs/reports/sim/latest.md` sets T beside each bot per card and gives each bot's clear rate, where its runs end, and its level and VITAE at the end; and a fight that also completes a quest logs the quest's XP as the quest's.

## Why

### Sources

- `/plot asap` from T, 2026-11-01, run unattended on T's word: the follow-up to SM1 (spec 113,
  `plan/113-sm1-sim-playtester-data.md`; SM1a-SM1h merged as #1238, #1239, #1251, #1253, #1259, #1270, #1272,
  #1275). SM1i (chunk 113.9, attended: T plays and reads the comparison) stays open and untouched. Four parts: the
  Merciful bot kills to grow and spares to play; 14-day retention of `sim` and `harness` rows; a nightly sim report T
  reads; the quest's share of a fight's XP logged as `quest`.
- T's answers in that session, recorded below as "Confirmed by T (2026-11-01)": change the bot, not the game (no card,
  enemy or tuning change); the Merciful kills while behind (under a target level for the node, or fewer than some
  number of Merciful-lane cards drafted) and befriends once ahead, every threshold read from data; A12 ignores the 8
  grey starter cards; A12 skips the Elementalist lane check until a character opens that lane; retention is 14 days
  for `source` in (`sim`, `harness`) across `fights`, `deck_events`, `puzzle_attempts`, `play_runs` and `run_events`,
  human rows never deleted; the trigger is a Cloudflare cron on the `miserere-api` Worker, not a GitHub Action, so it
  needs no GitHub secrets; the report is a measurement, never a gate, committed through the push path
  `measured-truth.yml` uses. T asked what the wanderer was and did not say whether to keep the "how hard is
  Chapter 1" numbers: that is call #1.
- Decisions: D57 and the doctrine "nothing grades the game from above" (`axiomancer-mechanics/CLAUDE.md`): no test
  asserts a sim number, and the report never fails CI on one. D88 and D99 (no card, enemy or tuning change). D106 and
  D114 (Chapter 1 is the Breakwater). D108 (a run opens as a character). D118 (every play-log row names its source;
  SM1). D84 (generated data commits to main, as `measured-truth` does, until D119's NX1e path replaces it). D93, D101,
  D119 (this plot lands by a `plot` PR T merges).
- Code read while shaping this (verified against `main` at `eb79ed1d9`, 2026-11-01):
  - `axiomancer-mechanics/src/Enemy/befriend.ts` (BUG1j, #1242): `isEnemyBefriendable` is true for every foe; a
    befriend pays shillings or a potion and never XP or a card draft. The Chosen's Suppliant's Ring opens the mercy
    signature on every foe.
  - `axiomancer-mechanics/src/Game/run-sim/run-policy.archetypes.ts`: `archetypePolicy(spec)` builds each bot from an
    `ArchetypeSpec` (`laneId`, `description`, `restBelow`); `fightPolicy: () => k.fight`, one fixed witness per run.
    `run-policy.fight.ts` `laneFightPolicy('merciful')` is `mercy-seeker` plus a mercy-line band, `signatureKinds:
    EVERY_SIGNATURE`, `mercyChoice: 'spare'`; the killers use `KILLER_SIGNATURES` (every kind but `mercy`) and
    `mercyChoice: 'exploit'`.
  - `run-policy.types.ts` `RunFightContext`: `enemyName`, `isBoss`, `isElite`, `fleeAllowed`, `fledHere`, `health`,
    `maxHealth`, `deck`. No player level, no foe level.
  - `axiomancer-mobile/sim/run-fight.ts` `fightContext(store, enemy, ...)` builds that context from the store's player
    and the staged `Enemy` (which carries `level`); `playToOutcome` asks `policy.fightPolicy(ctx)` once per fight.
  - `axiomancer-mechanics/src/World/MapEvents/handlers.ts:65`: a node stages its foe at `payload.level ??
    max(source.level, player.level)`, so the staged foe's level is at least the player's and exceeds it only where the
    node's own level (its pin, or the foe's registry level) does.
  - `axiomancer-mobile/sim/run-archetypes.test.ts` (A12 of spec 113): the Merciful's lane-lead check is `it.failing`;
    the grey office is not counted (`rivals`); a lane no roster character opens is `it.skip`.
  - `run-policy.wanderer.ts`: `fightPolicy: () => COMBAT_SIM_POLICIES.greedy`. `combat.sim-policies.ts` `greedy` has
    `signatureKinds: ALL_SIGNATURE_KINDS` and `mercyChoice: 'spare'`, so the wanderer spares every foe the Ring opens.
    `measured-truth` plays `greedy` from `combat.sim-policies.ts` directly and never the wanderer.
  - `backend/wrangler.toml`: no `[triggers]`; `backend/src/index.ts` exports `fetch` only. Migrations `0001`-`0007`:
    `received_at` (ISO text) on `fights`, `deck_events`, `puzzle_attempts`, `run_events`; `started_at` on
    `play_runs`; `run_id` on all five (0006, 0007); no index on `received_at`. `.github/workflows/backend-deploy.yml`
    applies migrations and runs `wrangler deploy` on a push to main touching `backend/**`, so a cron in
    `wrangler.toml` deploys with the Worker. `backend/vitest.config.ts` runs the tests in workerd against a local D1.
  - `backend/src/reports.ts`: `card-vs-bot` (per card, T beside each sim policy, defaulting to the newest build with
    both `human` and `sim` fights) and `run-summary` (per source and policy: runs, outcomes, avg and max level, avg
    VITAE at the end, nodes resolved, the furthest node). No report counts runs by the node they ended on.
  - `.github/workflows/sim-runs.yml`: four archetypes, 5 runs each, `--seed 1`, on `workflow_run` of `preview-build`,
    by hand, and nightly at `43 3 * * *` on main; the wanderer is not played. `contents: read`.
  - `.github/workflows/measured-truth.yml` and `scripts/measured-truth.mjs`: `docs/reports/measured/latest.md`
    (generated header, a `> measured at <sha>, <date>, ...` stamp) and an append-only `history.jsonl`; the commit step
    (`claude[bot]` identity, `GH_PAT`, the `nexus-loop` concurrency group, `git pull --rebase` and push retried four
    times). `docs/truth-sources.md` "Measured truth" gives each measurement its own bullet; `CLAUDE.md` names only
    `measured/latest.md` (the enemy and eval reports are in `truth-sources.md` alone).
  - `axiomancer-mobile/state/run-log.ts` `recordFightSettled` logs `recordProgress(store, before, 'fight')`: the whole
    XP delta as one `xp-gained` from `fight`. `axiomancer-mechanics/src/Game/store.ts` `CombatEndReport.xpGained` is
    the foe's XP only; quest reward XP is folded into `player.experience` by the same `endCombat`. Both call sites
    (`state/actions.ts` `endCombat`, `CombatEncounterPanel.tsx` `applyHazardOutcome`) pass the report.

### Outcome

The Merciful builds its lane by killing until it is ahead and then spares; D1 holds 14 days of bot and harness rows and
every row of T's; a dated, committed sim report outlives those rows; and the run log names the quest's XP as the
quest's.

**Proof of the outcome:** `npm run verify -w axiomancer-mobile` runs A12 with the Merciful's lane check passing; the
first nightly `sim-runs` after 135.4 commits `docs/reports/sim/latest.md` and a `history.jsonl` line to main; the
Worker's cron run the morning after 135.5 deploys leaves no `sim` or `harness` row older than 14 days and every `human`
row.

## Design

### Scope

- `axiomancer-mechanics/src/Game/run-sim/`: `RunFightContext` gains the player's level and the staged foe's level; the
  Merciful's spec gains its grow-until thresholds; `archetypePolicy`'s `fightPolicy` picks the killing or the sparing
  witness per fight; the wanderer's own non-sparing witness; seam tests. `combat.sim-policies.ts`,
  `combat.measured-truth.ts` and every card, enemy, relic, map and tuning table are read, never changed.
- `axiomancer-mobile/sim/`: `fightContext` fills the two levels; `run-archetypes.test.ts` turns the Merciful's check
  into a plain `it`. `axiomancer-mobile/state/run-log.ts`: the quest's share of a fight's XP.
- `backend/`: migration `0008_retention_indexes.sql`; `src/retention.ts` and a `scheduled` handler in `src/index.ts`;
  `[triggers]` in `wrangler.toml`; the `run-ends` report in `src/reports.ts`; tests.
- Root: `scripts/api.mjs` (the `run-ends` table), `scripts/sim-report.mjs` and `npm run sim:report`, their tests in the
  root `npm test`; `.github/workflows/sim-runs.yml` (the wanderer joins the batch; a `report` job).
- Docs and data: `docs/reports/sim/latest.md` and `history.jsonl` (generated), `docs/truth-sources.md`,
  `.github/workflows/README.md`, `axiomancer-mobile/docs/dev-tools.md`, `backend/` header comments, and the D-entry
  for retention in `plan/2026-09-25-refactor-strategy.decisions.md`.

### Consumers to update

- `@mechanics` barrel only if a new export is needed (the context fields ride the existing `RunFightContext`).
- `scripts/backend-deploy.test.mjs` if it pins `wrangler.toml`'s shape; `scripts/sim-run.test.mjs` if it pins the
  four-policy loop in `sim-runs.yml`.
- `backend/src/index.ts`'s route header comment (the cron and `run-ends`); the `REPORT_NAMES` lists in
  `backend/src/reports.ts` and `scripts/api.mjs`.

### Decisions made upfront — DO NOT ASK

- **Change the bot, not the game** (Confirmed by T (2026-11-01)). BUG1j's befriend stays as it is: no XP and no card
  draft for a befriend, the Ring's mercy signature on every foe. No card, enemy or tuning change anywhere in this spec.
- **The Merciful kills while behind and befriends once ahead** (Confirmed by T (2026-11-01)). Per fight, before it
  starts, the Merciful is *behind* when either holds, and plays as a killer then (its own ranking without the mercy
  band, the killers' signatures, `mercyChoice: 'exploit'`); otherwise it plays as today (mercy lines first, every
  signature, `spare`):
  - **under the node's level:** the player's level is under the staged foe's level. The node stages its foe at its
    own level (the pin, else the foe's registry level) or the player's, whichever is higher (`handlers.ts:65`), so
    this reads "the node is above me" straight off the enemy data, with no table of its own. Weighed and rejected: the
    Act 1 ledger walk's level (`walkAct1`), which assumes a full clear and would keep a story-route bot behind, and
    killing, almost everywhere.
  - **too few lane cards:** its deck holds fewer than `growUntil.laneCards` cards of its lane (`cardLaneId`, so grey
    is never counted). The number lives in the Merciful's `ArchetypeSpec`, set to **5** (a quarter of the lane's
    20-card test deck); it is the bot's behaviour, not game tuning, and the builder may retune it in its PR if A12
    needs it, naming the value. No card id anywhere (spec 113's no-card-id guard still runs).
  - The other three archetypes keep a fixed witness (they never spare); the spec field is optional and only the
    Merciful sets it.
- **A12's other rules stand** (Confirmed by T (2026-11-01)): the 8 grey starter cards are not counted; the Elementalist
  lane check stays skipped until a roster character opens that lane; the Merciful still ends at least one fight by
  befriending, now alongside its lane lead.
- **The wanderer stops sparing; the greedy witness does not change** (decided here). The wanderer is the baseline T
  reads in the report's Chapter 1 section, and a baseline that spares every foe stays at level 1 and dies in two or
  three fights, which measures nothing. Its fights become the greedy witness with the mercy signature off and
  `mercyChoice: 'exploit'`, a copy built in `run-policy.wanderer.ts`; the greedy witness itself in
  `combat.sim-policies.ts` is untouched, because `measured-truth` plays it (Follow-ups).
- **Retention: 14 days, bots and harness only** (Confirmed by T (2026-11-01)). A row with `source` `sim` or `harness`
  is deleted once older than 14 days, in `fights`, `deck_events`, `puzzle_attempts`, `play_runs` and `run_events`. A
  `human` row is never deleted, and `ballot_verdicts` is never read. Recorded as a D-entry by chunk 135.5 (the next
  free number at build time) under the proposed name `D?play-log-retention`.
- **A cron on the Worker** (Confirmed by T (2026-11-01)): `[triggers] crons = ["17 5 * * *"]` in `wrangler.toml` (daily,
  05:17 UTC, after the 03:43 sim batch has posted), a `scheduled` handler beside `fetch`; it deploys with the Worker
  through `backend-deploy.yml` and needs no GitHub secret. No HTTP route triggers it.
- **A run leaves whole.** A run's age is its `play_runs.started_at`. A `sim` or `harness` run older than 14 days is
  deleted with every `run_events`, `fights`, `deck_events` and `puzzle_attempts` row carrying its `run_id`, in one
  `db.batch` (a D1 transaction), its `play_runs` row last. Rows with no `run_id`, or one that names no `play_runs` row,
  go by their own `received_at`. The cutoff is computed in the Worker as an ISO string the same shape as the stored
  `received_at` and `started_at`, never SQL `datetime()` (whose space-separated form sorts wrong against a `T`).
- **Batches, and a cap per night.** At most 200 runs per batch, and at most 1000 run-less rows per table per batch;
  at most 25 batches per cron run. A night that hits the cap leaves the rest for the next (about 0.4 MB a run and 25 a
  night, so steady state is far under the cap). It logs one line of counts per run (`wrangler tail`).
- **Indexes for the sweep** (additive, `0008`): `(source, received_at)` on `fights`, `deck_events`,
  `puzzle_attempts` and `run_events`, `(source, started_at)` on `play_runs`. `0001`-`0007` are never edited.
- **Where runs end, on the server** (BE2's "raw events, stats on the server"): a new `run-ends` report counts closed
  runs per source, policy and `end_node_id`, so the report script computes no statistic of its own beyond a
  difference between two nights.
- **The report reads two builds.** The per-bot sections read the build the night's batch played (`run-summary` and
  `run-ends` at `--build <sha> --source sim`). The per-card section reads `card-vs-bot` at its own default, the newest
  build holding both T's and the bots' fights, since T plays preview APKs and the nightly batch plays `main`; the
  section names that build, and says so plainly when no build holds both yet.
- **The report's shape follows measured truth.** `docs/reports/sim/latest.md` opens with a generated-file comment and
  a stamp (`> measured at <sha>, <date>, <runs> runs per bot, seed 1; you beside the bots at <sha or none>`), then: you
  beside each bot per card; each bot's runs, clear rate (chapter clears over runs), where its runs ended (each end node
  with its count, most first), and its average level and VITAE at the end; **Since the last report** (each bot's clear
  rate, end level and end VITAE, last line against this one, with both builds); **How hard is Chapter 1**. Every run
  appends one line to `docs/reports/sim/history.jsonl` (date, commit, per-bot numbers, the card-vs-bot build), so the
  numbers outlive the 14-day rows. No thresholds file, no AUDIT row, no issue: T reads it.
- **"How hard is Chapter 1" stays, as plain numbers** `[T to confirm #1]`: each bot's clear rate and average end
  level, the wanderer included, as numbers for T to read, never a test. Since the wanderer is not played today,
  `sim-runs.yml` adds it to the batch (five bots, 25 runs a night, about 10 MB of rows, inside the 14-day window).
  Alternatives: drop the section (and the wanderer stays out of the batch); or keep it without the wanderer.
- **Never a gate** (D57). `sim:report` exits non-zero only on a crash, a refused or failed Worker read, or a missing
  URL or token; a number never fails anything, and the `report` job is never a required check.
- **The same push path as measured truth** (Confirmed by T (2026-11-01)). A `report` job in `sim-runs.yml`, `needs:
  sim`, runs after the scheduled batch and after a `workflow_dispatch` at `main` (never after a `workflow_run`
  batch); `contents: write` on that job only; `GH_PAT || github.token`; job-level `concurrency: nexus-loop`; the
  `claude[bot]` identity; `git add -- docs/reports/sim/`, nothing to commit exits 0; commit `sim: nightly report
  <date>`; `git pull --rebase` and push, retried four times. When NX1e moves `measured-truth` to D119's PR path, the
  sim report follows it (Follow-ups).
- **The documentation follows the house pattern.** `docs/truth-sources.md` "Measured truth" gets a bullet for
  `docs/reports/sim/latest.md` (beside the play-log sim-rows bullet, which gains the 14-day retention and points at
  the report for anything older); `.github/workflows/README.md` gets the report job and the cron. `CLAUDE.md` is
  unchanged: it names only `measured/latest.md`, and every other measurement (the enemy report, the eval report) lives
  in `truth-sources.md` alone.
- **The quest's XP is the quest's.** `recordFightSettled` logs `xp-gained` `from: 'fight'` for the report's
  `xpGained` (capped at the delta), and the rest of the delta, when positive, as a second `xp-gained` `from: 'quest'`.
  A befriend that completes a quest logs only the quest's. Level-ups are logged once, as today. No engine change.
- **Names.** Spec 135, aliases SM2a-SM2e; the report `run-ends`; the script `sim:report`; the folder
  `docs/reports/sim/`.

### Tests matrix

- Mechanics: the Merciful's `fightPolicy` over fixture contexts (behind by level, behind by lane cards, ahead: the
  witness's `mercyChoice` and `signatureKinds`); the other archetypes unchanged for any context; the wanderer's
  witness never spares and the greedy witness is unchanged; the no-card-id guard.
- Mobile: `fightContext` carries both levels; A12 (`run-archetypes.test.ts`) with the Merciful's check a plain `it`;
  `run-log.test.ts`: a kill that completes a quest logs a `fight` and a `quest` `xp-gained` summing to the delta, a
  plain kill logs one, a befriend completing a quest logs only `quest`.
- Backend (workerd, local D1): `0008` applies; the `scheduled` handler over fixtures of all three sources, old and
  young, a run with rows in every table, a run-less row and an orphan `run_id`; batches with a small injected batch
  size; a second run deletes nothing; `run-ends` over fixtures.
- Root: `api.mjs` parses and prints `run-ends`; `sim-report.mjs` over fixture report JSON (no network): the sections,
  the stamp, the history line, the difference from a previous line, a first night with no history, no shared build;
  a refused read exits non-zero and writes nothing.

### Verify gate

Per chunk, below. The root `npm test` (with `plan-check` and the deadlines lint) runs in every chunk.

### Commit body template

```
<what shipped, one paragraph>

Closes A<n>[, A<m>] of plan/135-sm2-sim-follow-ups.md.
Proof: <the chunk's proof and its result>.
```

### Follow-ups (out of scope)

- **The greedy witness stops sparing too**, if T wants it: `combat.sim-policies.ts` `greedy` is what `measured-truth`
  plays, so changing its mercy choice would move measured truth; it needs its own plot and a measured-truth run named
  in that PR.
- **The sim report on D119's PR path** once NX1e changes how `measured-truth` lands generated data.
- **Retention for `human` rows**, never, unless T asks; **puzzle-attempt** rows from `/devpuzzle` with no run id are
  covered by the run-less rule above.
- **The retention window as data T can change from the phone**: a constant in `backend/src/retention.ts` for now.

### Chunk notes

#### SM2a (chunk 135.1)

- Proof: `npm run verify -w axiomancer-mechanics` and `npm run verify -w axiomancer-mobile`; A12 passes with no
  `it.failing`; `npm run sim:run -- --policy merciful --runs 3 --seed 1` and `--policy wanderer` print runs that
  reach past the first fights, pasted in the PR (a reading, not a bar).
- Scope: `run-policy.types.ts` (`level`, `foeLevel` on `RunFightContext`), `run-policy.archetypes.ts` (`growUntil`,
  the per-fight witness), `run-policy.fight.ts` (a killing form of the Merciful's ranking), `run-policy.wanderer.ts`;
  `axiomancer-mobile/sim/run-fight.ts`, `sim/run-archetypes.test.ts`; seam tests.
- Verify gate: mechanics and mobile verify, root `npm test`.

#### SM2b (chunk 135.2)

- Proof: `npm run verify -w axiomancer-mobile`; the run-log test of a quest-completing kill shows two `xp-gained`
  events, `fight` then `quest`.
- Scope: `axiomancer-mobile/state/run-log.ts` `recordFightSettled` (its `report` type gains `xpGained`) and its tests.
- Verify gate: mobile verify, root `npm test`. Reaches T on the next preview APK.

#### SM2c (chunk 135.3)

- Proof: `npm run verify -w backend`; `run-ends` returns the expected rows over fixtures; `node --test
  scripts/api.test.mjs` covers its table.
- Scope: `backend/src/reports.ts` (`REPORT_NAMES`, the SQL, the type), `scripts/api.mjs`, their tests,
  `axiomancer-mobile/docs/dev-tools.md`'s report list.
- Verify gate: backend verify, root `npm test`.

#### SM2d (chunk 135.4)

- Proof: root `npm test` with `scripts/sim-report.test.mjs`; a dispatched `sim-runs` at `main` commits
  `docs/reports/sim/latest.md` and one `history.jsonl` line, linked in the PR (or, before merge, `npm run sim:report`
  against the live Worker with the output pasted).
- Scope: `scripts/sim-report.mjs`, `npm run sim:report`, its test in the root `npm test` list;
  `.github/workflows/sim-runs.yml` (the wanderer in the loop; the `report` job); `.github/workflows/README.md`;
  `docs/truth-sources.md`.
- Verify gate: root `npm test`; `actionlint` if the repo runs it.

#### SM2e (chunk 135.5)

- Proof: `npm run verify -w backend`; the scheduled-handler tests; after deploy, the Worker's first cron run's log
  line (`wrangler tail` or the dashboard) and a `GET /v1/play-runs?source=sim` showing no run older than 14 days,
  recorded in the PR or its follow-up comment.
- Scope: `backend/migrations/0008_retention_indexes.sql`, `backend/src/retention.ts`, `src/index.ts` (`scheduled`),
  `wrangler.toml` (`[triggers]`), tests; `scripts/backend-deploy.test.mjs` if it pins the toml; the D-entry; the
  retention line in `docs/truth-sources.md` and `axiomancer-mobile/docs/dev-tools.md`.
- Verify gate: backend verify, root `npm test`.

## Contracts

- **No save-data change**, no `GAME_STATE_VERSION` bump.
- **`RunFightContext`** gains `level: number` (the player's, before the fight) and `foeLevel: number` (the staged
  foe's); every policy reads them or ignores them. **`ArchetypeSpec`** gains optional `growUntil?: { laneCards: number
  }`.
- **D1, additive only:** `0008` adds five indexes and nothing else. **Routes:** `GET /v1/reports/run-ends[?build=][&source=]`
  under `/v1/`, rows `{ source, policyId, endNodeId, runs, runOver, chapterClear, avgLevel, avgVitaeEnd }`, closed runs
  only. **The cron** deletes only what the retention decision names.
- **`docs/reports/sim/history.jsonl`** is append-only, one JSON object per line: `{ date, commit, runsPerBot, seed,
  cardVsBotBuild, bots: { <policy>: { runs, chapterClear, runOver, avgLevel, avgVitaeEnd, ends: { <nodeId>: n } } } }`.

## Acceptance

- **A1** `RunFightContext` carries the player's `level` and the staged foe's `foeLevel`, filled by
  `axiomancer-mobile/sim/run-fight.ts` `fightContext` from the store's player and the staged `Enemy`.
- **A2** The Merciful plays a fight as a killer (its ranking without the mercy band, every signature but `mercy`,
  `mercyChoice: 'exploit'`) when its level is under the foe's or its deck holds fewer than its spec's
  `growUntil.laneCards` (5) cards of its lane, and as today (mercy lines first, every signature, `spare`) otherwise;
  seam tests cover behind by level, behind by cards and ahead; the other archetypes' witnesses do not change; no card
  id is added (the guard passes).
- **A3** `axiomancer-mobile/sim/run-archetypes.test.ts` has no `it.failing`: the Merciful's lane-lead check is a plain
  `it` and passes over the 10 seeds, its befriend-at-least-once check still passes, the grey office is still not
  counted, and the Elementalist's check is still skipped while no roster character opens its lane.
- **A4** The wanderer fights as the greedy witness with the mercy signature off and `mercyChoice: 'exploit'`, built in
  `run-policy.wanderer.ts`; `combat.sim-policies.ts` is unchanged, and `npm run measured:truth` gives the same cells
  as before at the same seed.
- **A5** When a fight completes a quest, the run log holds an `xp-gained` `from: 'fight'` for the foe's XP and an
  `xp-gained` `from: 'quest'` for the rest; a plain kill logs one `fight` event; a befriend that completes a quest
  logs only `quest`; tests cover all three.
- **A6** `run-ends` joins `REPORT_NAMES` (Worker and `scripts/api.mjs`): per source, sim policy and end node, the
  closed runs, run-overs, chapter clears, average level and average VITAE at the end, narrowed by `?build=` and
  `?source=`; `npm run api -- run-ends` prints it; Worker tests cover the default, a build, a source and an empty
  table.
- **A7** `npm run sim:report -- --build <sha>` reads `card-vs-bot`, `run-summary` and `run-ends` from the Worker
  (`PUZZLE_API_URL`, `PUZZLE_API_TOKEN`), writes `docs/reports/sim/latest.md` with the stamp and the sections the
  Design names, and appends one line to `docs/reports/sim/history.jsonl`; "Since the last report" compares with the
  previous line, and a first night says there is none.
- **A8** The report's "How hard is Chapter 1" section gives each bot's clear rate and average end level, the wanderer
  included, as plain numbers `[T to confirm #1]`.
- **A9** `sim:report` never fails on a number: it exits non-zero only on a crash, a refused or failed read, or a
  missing URL or token, and then writes nothing; `scripts/sim-report.test.mjs` runs in the root `npm test` over
  fixture JSON with no network.
- **A10** `sim-runs.yml` plays the wanderer beside the four archetypes, and a `report` job (`needs: sim`; after the
  schedule and a dispatch at `main` only) runs `sim:report` at the batch's sha and commits `docs/reports/sim/` to main
  through `measured-truth.yml`'s push path; `.github/workflows/README.md` and `docs/truth-sources.md` "Measured
  truth" name the report.
- **A11** Migration `0008_retention_indexes.sql` adds `(source, received_at)` indexes on `fights`, `deck_events`,
  `puzzle_attempts` and `run_events` and `(source, started_at)` on `play_runs`; `0001`-`0007` are unchanged.
- **A12** `wrangler.toml` carries `[triggers] crons = ["17 5 * * *"]` and the Worker exports `scheduled`: it deletes
  every `sim` and `harness` row older than 14 days in the five tables (a run with all its rows in one batch, its
  `play_runs` row last; run-less and orphan rows by `received_at`), in batches of at most 200 runs or 1000 rows and
  at most 25 batches a run, never a `human` row and never `ballot_verdicts`, and logs its counts; the retention
  D-entry is recorded.
- **A13** Worker tests run the `scheduled` handler on a local D1 over fixtures of all three sources: afterwards no
  old `sim` or `harness` row is left, every `human` row and every young row stays, no run is left part-deleted, a
  small injected batch size still empties the old rows across batches, and a second run deletes nothing.

## Open questions

1. Keep the "how hard is Chapter 1" numbers in the nightly sim report? Default: yes, as plain numbers for T to read,
   never a test, with the wanderer played nightly so it can be read beside the four bots `[T to confirm #1]`.

## Chunks

Measure: 13 open · 0 closed · next A14

- [ ] **135.1** The Merciful kills to grow, spares to play; the wanderer stops sparing · M · closes A1, A2, A3, A4 · needs — · alias: SM2a
- [ ] **135.2** A quest's XP is logged as the quest's · S · closes A5 · needs — · alias: SM2b
- [ ] **135.3** Where the runs end, as a report · S · closes A6 · needs — · alias: SM2c
- [ ] **135.4** The nightly sim report T reads · M · closes A7, A8, A9, A10 · needs 135.3 · alias: SM2d
- [ ] **135.5** Bot and harness rows leave D1 after 14 days · M · closes A11, A12, A13 · needs — · alias: SM2e
