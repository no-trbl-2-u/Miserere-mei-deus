# The backend, designed backwards from four questions (BE2 pitch)

> Attended, 2026-10-21. T: "We just hooked up a backend for Miserere. I want to get the most out of it."
> Answer shape ruled by T's rewritten prompt: not ten ideas; four questions, a schema derived from them,
> the SQL that answers them, then /plot-ready stubs. Nothing here is code that landed; it is the brief for a
> `/plot`. The demo at the end ran on a local SQLite copy of the schema, never on the live `miserere` D1.
>
> **Plotted 2026-10-22:** only section 6 (card and combat logging) was plotted, as phase **BE2** (BE2a-BE2g,
> `plan/phases/phase_BE2_card_combat_logging.md`). The stub ids BE2a-BE2g in section 4 below are pitch labels,
> not build-plan ids; a later plot of that schema takes the next free id.

## Sources read

- `backend/migrations/0001_puzzle_attempts.sql`, `backend/src/{index,attempts,contract,env}.ts`
- `axiomancer-mechanics/src/World/Hazard/puzzle/hazard-puzzle.attempt-contract.ts` (the shared validator)
- `axiomancer-mobile/state/presenters/hazard-puzzle-log.engine.ts` (HP2c: `startedAt`, `clockSeconds`,
  `end.reachedPercent` exist in the log and are NOT in the contract today)
- `axiomancer-mobile/lib/puzzleAttempts.ts` (`appBuild` = `"<version> <profile>"`, no commit);
  `axiomancer-mobile/app.config.ts` already computes `buildCommit()` for the Sentry release
- `telemetry/2026-10-21_480f528d-….md` (run 39687310412: `/march` then `ship-a-phase`, opus, 17m18s, ok)
- `docs/reports/measured/latest.md` (stamp `7a6ef2b`, 300 runs, seed 1), `scripts/measured-compare.mjs`
- `plan/phases/phase_BE1_solve_time_backend.md`, `phase_HP4_graded_puzzle_set.md` (HP4e-g),
  `phase_HP2_*.md` (HP2d-f, the Spearman bar), `plan/deadlines.md`, `LIVE_DEADLINES.md`
- `.github/workflows/{backend-deploy,preview-build,_claude-skill}.yml` (the repo secret
  `PUZZLE_API_TOKEN` already exists for CI; `_claude-skill.yml` already commits with `GITHUB_RUN_ID`)

## 1. The four questions (next quarter, each tied to an open item)

| # | Question | Open item that needs it |
|---|---|---|
| Q1 | **Is candidate X too hard, and does its authored difficulty (ways, surplus, first-play losses) predict T's time?** | HP4e (due 2026-11-02), HP4f patterns, HP4g clocks, HP2e's Spearman 0.7 bar (`phase_HP4` Follow-ups: "nothing to fit while every solve is under ten seconds") |
| Q2 | **Did build B change solve behaviour for the same layout?** A UI change (drop-zone fix #762, AN1 animations) can move `end_ms` without the puzzle changing. | LG1h Android smoke (2026-12-23); the W1 demo is played on whichever preview APK is newest |
| Q3 | **Did PR N move a measured number, and at which commit?** `measured/latest.md` is one snapshot; the diff lives only in the git history of a generated file. | R12 combat playtest (2026-12-11), UP1h "upgrades proven on the boss", W4 demo. D57 says it is a measurement, not a gate, which is exactly what a time series is for |
| Q4 | **What did the overnight loop actually do per run, did it return, and on which commit?** Telemetry shards strand `tick-end` rows (CLAUDE.md), and a run's rows are only visible after the next tick commits them. | LG1a-g loop gates, RS1 report sweep (2026-11-16), the R11 watch review (2026-11-11) |

Not a question yet, and left out: playtester telemetry (BE1 Follow-ups: needs device IDs and a privacy note first).

## 2. The schema, backwards from Q1-Q4

**Three tables, not six.** `puzzle_attempts` grows provenance columns; every other number the repo produces lands
in one long-format `measurements` table stamped by a `runs` row. A new report never needs a new table.

**What every row must carry, and why**

| Stamp | On | Why |
|---|---|---|
| `build_commit` (git sha the artefact was built or run from) | attempts, runs | Q2, Q3, Q4. In the monorepo one sha pins app, mechanics and content, so there is no separate mechanics version. |
| `layout_hash` (hash of the candidate's layout JSON, computed in mechanics) | attempts, measurements.`subject_hash` | Q1. A re-authored `cand-easy-01` is a different puzzle; times must not pool across versions. The id alone cannot say this. |
| `session_id` (app-launch uuid on the phone; GitHub run id in CI) | attempts, runs | attempts per sitting for Q1; the run itself for Q4 |
| `source` (`phone`, `agent`, `ci`, `local`) | attempts, runs | the HP2 playtester agent pools with T's solves; it must be separable |
| `seed`, `n` | measurements | Q3: 300 runs at seed 1 is not comparable to 50 runs at seed 7 |

**Migrations** (every change a new file; `0001` untouched)

`0002_attempt_provenance.sql`
```sql
ALTER TABLE puzzle_attempts ADD COLUMN source TEXT NOT NULL DEFAULT 'phone';
ALTER TABLE puzzle_attempts ADD COLUMN build_commit TEXT;
ALTER TABLE puzzle_attempts ADD COLUMN layout_hash TEXT;
ALTER TABLE puzzle_attempts ADD COLUMN session_id TEXT;
ALTER TABLE puzzle_attempts ADD COLUMN started_at TEXT;
ALTER TABLE puzzle_attempts ADD COLUMN clock_seconds INTEGER;
ALTER TABLE puzzle_attempts ADD COLUMN reached_percent INTEGER;
CREATE INDEX puzzle_attempts_build_commit ON puzzle_attempts (build_commit);
CREATE INDEX puzzle_attempts_layout_hash ON puzzle_attempts (layout_hash);
```

`0003_runs.sql`
```sql
CREATE TABLE runs (
    id INTEGER PRIMARY KEY,
    received_at TEXT NOT NULL,
    source TEXT NOT NULL,            -- 'ci' | 'local' | 'agent'
    kind TEXT NOT NULL,              -- 'tick' | 'measured' | 'playtest' | 'preview-build' | 'audit'
    run_id TEXT NOT NULL,            -- GITHUB_RUN_ID, or a local uuid
    commit_sha TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    outcome TEXT,                    -- 'ok' | 'error: ...' | NULL while open (Q4: never returned)
    model TEXT,
    detail_json TEXT NOT NULL DEFAULT '{}',
    UNIQUE (kind, run_id)
);
CREATE INDEX runs_commit_sha ON runs (commit_sha);
```

`0004_measurements.sql`
```sql
CREATE TABLE measurements (
    id INTEGER PRIMARY KEY,
    run_ref INTEGER NOT NULL REFERENCES runs(id),
    subject TEXT NOT NULL,           -- 'bw-17/the-doorwarden' | 'cand-easy-01' | 'perf:cold-start'
    variant TEXT,                    -- 'grey even' | 'risk' | NULL
    metric TEXT NOT NULL,            -- 'win_rate' | 'p10_vitae' | 'ways' | 'best_surplus' | ...
    value REAL NOT NULL,
    n INTEGER,
    seed INTEGER,
    subject_hash TEXT                -- layout_hash for puzzle subjects
);
CREATE INDEX measurements_subject_metric ON measurements (subject, metric);
CREATE INDEX measurements_run_ref ON measurements (run_ref);
```

**Does `/v1/` survive? Yes.** Every new attempt column is nullable or defaulted; the validator keeps the new
fields optional; an installed BE1 APK posts the old shape and gets NULLs (the demo below inserts one). `GET`
gains fields, which is additive. `runs` and `measurements` are new routes under `/v1/`. No `/v2/`.

**`contract.ts` diff (the mechanics module both sides import)**
```ts
export const PUZZLE_ATTEMPT_SOURCES = ['phone', 'agent'] as const;
export interface PuzzleAttemptPost {
    // ... the existing nine fields, unchanged ...
    /** BE2a. All optional so a BE1 APK keeps posting. */
    source?: (typeof PUZZLE_ATTEMPT_SOURCES)[number];
    buildCommit?: string | null;     // app.config.ts buildCommit(), via extra.buildCommit
    layoutHash?: string;             // hazardPuzzleLayoutHash(layout), pure, in mechanics
    sessionId?: string;              // uuid minted once per app launch
    startedAt?: string;              // the move log's clock start
    clockSeconds?: number;           // the move log's clock
    reachedPercent?: number;         // the move log's end.reachedPercent
}
export const RUNS_PATH = '/v1/runs';
export const MEASUREMENTS_PATH = '/v1/measurements';
export interface RunPost {
    source: 'ci' | 'local' | 'agent'; kind: string; runId: string; commitSha: string;
    startedAt?: string; finishedAt?: string; outcome?: string; model?: string; detail?: Record<string, unknown>;
}
export interface MeasurementPost {
    runRef: number; subject: string; variant?: string | null; metric: string;
    value: number; n?: number; seed?: number; subjectHash?: string;
}
export interface MeasurementBatchPost { measurements: MeasurementPost[] }   // one POST per report, at most 2000 rows
```
Validators follow the existing hand-rolled style (`checkText`, `checkOneOf`, `isWholeMs`); no Zod, no new
runtime dependency (BE1 decision).

**Writers**

| Writer | What | How |
|---|---|---|
| phone (preview APK) | attempts, now stamped | `lib/puzzleAttempts.ts` reads `extra.buildCommit`; `usePostEndedPuzzleAttempts` passes `layoutHash` and the session uuid |
| HP2 playtester agent | attempts with `source='agent'` | the same POST; separable in every query |
| `_claude-skill.yml` tick-close step | one `runs` row per tick (`kind='tick'`) | `node scripts/api-post-run.mjs` after `telemetry.mjs tick-close`, using the repo secret `PUZZLE_API_TOKEN` already in CI; open the row at start, close at end, so a dead tick stays `outcome NULL` |
| `measured-truth.yml` | a `measured` run plus every cell of `latest.md` as measurements | `scripts/measured-truth.mjs --post` |
| authoring agent / HP4c audit | an `audit` run plus ways, surplus, first-play-loss per candidate keyed by `subject_hash` | `npm run puzzle:audit -- --post` |

## 3. The read side for agents

One root script replaces `puzzle:times`: **`npm run api -- <report> [--param value] [--json]`**
(`scripts/api-query.mjs`). It calls `GET /v1/reports/<name>` on the Worker, where `backend/src/reports.ts`
holds the whitelisted SQL below as named prepared statements. One token, no `wrangler login`, the same env file
(`~/.config/miserere/puzzle-api.env`). `puzzle:times` becomes `api solve-times` and the old script is deleted
in the same PR. Ad hoc SQL stays available through `wrangler d1 execute miserere --remote --command "..."` or the
Cloudflare MCP `d1_database_query`; the reports are the paved road.

`api candidate-difficulty --solver T` (Q1)
```sql
SELECT pa.layout_id, pa.layout_hash, pa.intended_band,
       COUNT(*) AS attempts, SUM(pa.cleared) AS solves,
       ROUND(AVG(CASE WHEN pa.cleared THEN pa.end_ms END)/1000.0,1) AS mean_solve_s,
       (SELECT value FROM measurements WHERE subject_hash=pa.layout_hash AND metric='ways' ORDER BY id DESC LIMIT 1) AS ways,
       (SELECT value FROM measurements WHERE subject_hash=pa.layout_hash AND metric='best_surplus' ORDER BY id DESC LIMIT 1) AS surplus
FROM puzzle_attempts pa WHERE pa.solver = ?1 AND pa.source = 'phone'
GROUP BY pa.layout_id, pa.layout_hash ORDER BY pa.intended_band, pa.layout_id;
```
HP2e's Spearman is then computed in the script over this result, per `layout_hash`, never per id.

`api build-regression --layout-hash <h>` (Q2)
```sql
SELECT COALESCE(pa.build_commit,'(pre-BE2 APK)') AS build_commit, pa.app_build,
       COUNT(*) AS attempts, ROUND(AVG(pa.end_ms)/1000.0,1) AS mean_s, SUM(pa.end_kind='expiry') AS expiries
FROM puzzle_attempts pa WHERE pa.layout_hash = ?1
GROUP BY pa.build_commit, pa.app_build ORDER BY MIN(pa.received_at);
```

`api measured-series --subject bw-17/the-doorwarden --metric win_rate` (Q3)
```sql
SELECT r.commit_sha, r.received_at, ms.subject, ms.variant, ms.metric, ms.value, ms.n, ms.seed
FROM measurements ms JOIN runs r ON r.id = ms.run_ref
WHERE r.kind='measured' AND ms.subject = ?1 AND ms.metric = ?2
ORDER BY r.received_at;
```

`api ticks --since 2026-10-21` (Q4)
```sql
SELECT r.run_id, r.commit_sha, r.model, r.outcome,
       ROUND((julianday(r.finished_at)-julianday(r.started_at))*86400) AS dur_s,
       json_extract(r.detail_json,'$.prompt') AS prompt
FROM runs r WHERE r.kind='tick' AND r.received_at >= ?1 ORDER BY r.started_at DESC;
```

## 4. Follow-on phases, as /plot stubs, ranked by questions unlocked

| Rank | Stub | Migration | Writer | Unlocks |
|---|---|---|---|---|
| 1 | **BE2a, stamped attempts.** Contract optional fields; `hazardPuzzleLayoutHash`; `extra.buildCommit`; a session uuid; the poster passes them. Measure: a solve on a new APK shows `build_commit` and `layout_hash` in `GET`; a BE1-shape body still gets 201. Falsifier: the existing poster test body returns 400. | 0002 | phone, agent | Q1, Q2 |
| 2 | **BE2b, runs from the loop.** `/v1/runs` open and close; `_claude-skill.yml` posts at start and at tick-close. Measure: `api ticks` lists today's runs with the same run id, model and duration as the telemetry shard. Falsifier: a tick killed by the runner shows `outcome='ok'`. | 0003 | ci | Q4 |
| 3 | **BE2c, measured truth as a series.** `measured-truth.mjs --post` writes a `measured` run and one row per cell. Measure: `api measured-series` for bw-17 win_rate returns the `7a6ef2b` value and the next merge's. Falsifier: two runs at one commit with different seeds collapse into one row. | 0004 | ci | Q3 |
| 4 | **BE2d, the candidate audit online.** `puzzle:audit --post` writes ways, surplus and first-play-loss per candidate keyed by `subject_hash`. Measure: `api candidate-difficulty` shows features beside T's times for every played candidate. Falsifier: re-authoring a candidate leaves its old features attached to the new hash. | none (uses 0004) | agent | Q1 |
| 5 | **BE2e, `npm run api` and the Worker reports.** Replaces `puzzle:times`; `reports.ts` whitelists the four statements; `docs/dev-tools.md` updated. Measure: all four reports return on the live Worker with the token only. Falsifier: any report accepts raw SQL from the client. | none | reader | all four |
| 6 | **BE2f, alerts not dashboards.** A daily Cron Trigger: a `tick` with NULL outcome older than two hours, or a measured cell that moved more than ten points since the last run, is appended to `plan/NEEDS_T.md` by a small Action. Measure: a forced NULL run is reported the next morning. Falsifier: it reports on every run. | none | ci | Q3, Q4 |
| 7 | **BE2g, local harness runs.** `combat-playtest` and `puzzle:calibrate` post `source='local'` runs and measurements when the env file exists. Measure: R12's attended playtest is queryable the same way as CI's. Falsifier: a run posts without a commit sha. | none | local | Q3 |
| - | Not plotted: playtester telemetry (needs device IDs and a privacy note first, BE1 Follow-ups); remote config over the same Worker (T's pitch t3, its own question); a dev/prod split (only once a second writer is live, BE1 decision). | | | |

Constraints honoured: D37/D88 (no card, keyword or art work; the candidate layouts are read, never edited),
D95 (each stub lands by PR on green review), every schema change a new migration, three tables total.

## 5. Verification, independent of either of us

Ran 2026-10-21 on a local SQLite 3.53 with `0001` copied from the repo and `0002`-`0004` as above (D1 is
SQLite, so the SQL is the same; the Workers-pool test in BE2a is the real gate). Inserted: one BE1-shape
attempt with no provenance (must still insert), the real tick for run **39687310412** from the telemetry shard
(commit `52869685a`, `/march` then `ship-a-phase`, `claude-opus-5-5`, started 22:34:26Z, ended 22:51:44Z, ok),
the measured-truth stamp (`7a6ef2b`, seed 1, n 300, bw-17 grey-even 0.21), an audit run with cand-easy-01's
HP4c numbers (9 ways, surplus 3), and one stamped phone solve on cand-easy-01 at `52869685a`.

The single JOIN:
```sql
SELECT pa.id AS attempt, pa.solver, pa.layout_id, pa.end_ms, pa.build_commit,
       r.kind AS run_kind, r.run_id, r.outcome, r.model,
       MAX(CASE WHEN ms.metric='ways' THEN ms.value END) AS ways,
       MAX(CASE WHEN ms.metric='best_surplus' THEN ms.value END) AS surplus
FROM puzzle_attempts pa
JOIN runs r ON r.commit_sha = pa.build_commit AND r.kind = 'tick'
JOIN measurements ms ON ms.subject_hash = pa.layout_hash
GROUP BY pa.id, r.id;
```
Output:
```
attempt solver layout_id     end_ms build_commit run_kind run_id       outcome model            ways surplus
2       T      cand-easy-01  7400   52869685a    tick     39687310412  ok      claude-opus-5-5  9    3
```
The telemetry shard's row for the same run, `telemetry/2026-10-21_480f528d-6fff-43c5-9863-200124d7bdfd.md` line 18:
```
| 2026-10-21T22:51:44Z | tick-end | - | claude-opus-5-5 | 17m18s | ok |
```
`dur_s` from the `runs` row is 1038 s, which is 17m18s; model and outcome agree. The BE1-shape attempt (id 1)
inserted with NULL provenance and is excluded from the JOIN. That is the intended behaviour: unstamped rows
cannot be attributed and must not pool with stamped ones.

What the demo did not prove: that the phone can supply `buildCommit` on EAS (it can: `app.config.ts` already
derives it for Sentry, so it is one more `extra` key), and that D1's `ALTER TABLE ... ADD COLUMN` with a
`NOT NULL DEFAULT` applies through `wrangler d1 migrations apply` (SQLite allows it; BE2a's test proves it).

## 6. BE2h, card and combat logging (added 2026-10-22, T)

T: "Give me a list of all the data we could collect that would help us while tuning, removing, and creating
cards. For now it'll default to on since I'm the only player. But have an option in the dev menu to turn it off."

**Rule: log raw events, derive stats on the server.** The phone sends what happened, never a computed rate. A
new question is a new report in `reports.ts`, not a new APK.

**Sources already in the code.** `CombatEvent` (`axiomancer-mechanics/src/Combat/combat.encounter.types.ts`)
already carries `card-played` (with `useBottom` and `dieId`), `effect-landed`, `effect-fizzled`, `damage-dealt`,
`player-healed`, `vitae-sacrificed`, `card-exiled`, `curse-added`, `global-entered/left`, `hand-drawn`,
`dice-rolled`, `die-spent`, `die-banked`, `threat-fired`, `phase-resolved`, `mercy-opened` and `combat-ended`.
Deck changes go through `rollCombatCardRewards` / `addRewardCard` (`Combat/combat.rewards.ts`),
`removeCardFromCombatDeck` (`Cards/card.removal.ts`) and `upgradeCard` (`Cards/card-upgrades.ts`).

### What to collect

**A. Per card, inside a fight** (derived from the event stream)

| Data | Source | Helps |
|---|---|---|
| Drawn, played, and held to end of turn (dead-in-hand rate) | `hand-drawn`, `card-played`, turn boundaries | remove: a card you draw and never play |
| Face used: FREE line or paid line | `card-played.useBottom` | tune: FREE always chosen means the paid line costs too much |
| Die colour and pips spent on it | `card-played.dieId` joined to `die-spent` | tune and create: which colours a card really wants |
| Printed number vs applied number | `damage-dealt`, `player-healed`, `vitae-sacrificed` | tune; also a bug detector (doctrine allows these) |
| Effect landed vs fizzled, with the fizzle message | `effect-landed`, `effect-fizzled` | tune and remove: a card that often does nothing |
| Turn and threat phase it was played in | `card-played` position in stream | tune: opener vs finisher |
| Cards played the same turn, in order | stream order | create: combos you already reach for |
| Phase cleared or overwhelmed after it was played | `phase-resolved` | tune: does the card answer the threat it's meant for |
| Exiles, curses added, global turns active | `card-exiled`, `curse-added`, `global-*` | tune cost cards (Toll, Debt, Overdrive) |
| Staged then unstaged before playing | new UI event | remove or rewrite: a card that confuses |
| Time from hand shown to play | new UI event, ms | rewrite: a card you have to reread |
| Card or keyword popup opened | new UI event | rewrite: copy that doesn't explain itself |

**B. Per fight**

| Data | Helps |
|---|---|
| Deck list at fight start, upgrades marked | every per-card rate needs its denominator |
| Enemy, player level, VITAE at start, end and lowest | tune against the measured table |
| Outcome: defeated, died, mercy, fled; turn count | win contribution per card |
| Cause of death: the last threat or DoT tick | create: threats no card answers |
| Dice rolled but unspent at end of each turn, by colour | create: a colour with no good sink |
| Threats overwhelmed, grouped by threat kind | create: the hole in the card pool |

**C. Deck building, outside fights**

| Data | Helps |
|---|---|
| Reward offers: the cards shown, the one picked, or skipped | remove: a card never picked; tune: one always picked |
| Removals: which card, deck size, where (rest, blacksmith, event) | remove: the first card you cut is the strongest cut signal |
| Upgrades: which card, and what else was upgradeable | tune: which upgrades feel worth it |
| Deck viewer opened, card inspected | low priority; readability |
| Run end: the deck at death or clear, the node reached | remove and tune at run scale |

**D. The bot beside you.** BE2c's sims post the same per-card counts (play rate, face used, fizzle rate) for
the greedy witness into `measurements` at the same commit. A card the bot plays and you never do is a
readability or feel problem, not a numbers problem.

Doctrine guard: none of these becomes a pass or fail bar ("nothing grades the game from above"). Fizzle and
printed-vs-applied mismatches may become bug detectors; play rates never become tests.

### The switch

- **Dev menu:** one row in `components/dev/DevToolsSections.tsx`, "Card & combat logging", ON by default.
- **Stored** in `state/settings.ts` (`settingsStore`, AsyncStorage), key `devCombatLogging`, default `true`.
- **Gates, all three:** `isDevToolsEnabled()`, the API URL and token set (BE1 A3), and the switch on. A
  production build sends nothing whatever the switch says. Off means no network call and no local buffer.
- **The switch also covers BE2a puzzle posts?** No. Puzzle timing stays on its own BE1 gate, since HP4e depends
  on it. Ruled here as the default; T can merge them.
- **Before the APK leaves T's hands** the default flips to off and BE1's playtester follow-up (device IDs, a
  privacy note) applies. Written into the phase's DoD so it cannot be forgotten.

### Schema

`0005_fights.sql`
```sql
CREATE TABLE fights (
    id INTEGER PRIMARY KEY,
    received_at TEXT NOT NULL,
    solver TEXT NOT NULL,
    session_id TEXT,
    build_commit TEXT,
    run_seed TEXT,
    node_id TEXT,
    enemy_id TEXT NOT NULL,
    player_level INTEGER,
    outcome TEXT NOT NULL,            -- CombatOutcome
    turns INTEGER NOT NULL,
    vitae_start INTEGER, vitae_end INTEGER, vitae_low INTEGER,
    deck_json TEXT NOT NULL,          -- card ids at fight start, '+' marks an upgrade
    events_json TEXT NOT NULL,        -- the CombatEvent stream plus the UI events, each with ms
    app_build TEXT NOT NULL
);
CREATE INDEX fights_build_commit ON fights (build_commit);
CREATE INDEX fights_enemy_id ON fights (enemy_id);

CREATE TABLE deck_events (
    id INTEGER PRIMARY KEY,
    received_at TEXT NOT NULL,
    session_id TEXT,
    build_commit TEXT,
    kind TEXT NOT NULL,               -- 'reward' | 'remove' | 'upgrade' | 'run-end'
    card_id TEXT,                     -- picked, removed or upgraded; NULL for a skip
    offered_json TEXT,                -- the alternatives shown
    deck_size INTEGER,
    where_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX deck_events_card_id ON deck_events (card_id);
```
Routes `/v1/fights` and `/v1/deck-events`; one POST per fight at `combat-ended`, one per deck change. Body cap
raised for fights (a long fight's stream); the validator checks event kinds against the `CombatEvent` union.
Failed posts drop, per BE1. If dropped fights visibly thin the counts, the outbox follow-up comes back.

### Reports (added to `npm run api`)

- `api card-usage [--card <id>]`: per card, drawn, played, dead-in-hand rate, FREE vs paid, fizzle rate,
  mean delivered vs printed, pick rate, removal count.
- `api card-gaps`: threats most often overwhelmed and dice colours most often unspent, per enemy.
- `api card-vs-bot`: your play rate beside the witness's, per card, at one commit.

### Stub

**BE2h, card and combat logging.** Requires BE2a (stamps) and BE2e (`npm run api`). Migration 0005. Writer: the
phone. Measure: after one fight and one reward pick on a preview APK, `api card-usage` shows every card in that
deck with its draw and play counts, and the pick appears with its alternatives; flipping the dev switch off and
fighting again adds no row. Falsifier: a production build, or the switch off, produces any request to the
Worker. Content rule: reads cards, never edits one (D37, D88, D99).
