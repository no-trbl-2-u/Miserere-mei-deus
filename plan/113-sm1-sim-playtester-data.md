# 113 — The sim playtester and its own data, kept apart from T's

> Every row in D1 says who played it: T's preview APK posts `human`, every local harness posts `harness`, and a bot that knows the game (one per lane archetype) plays whole Breakwater runs headlessly through the game's own code and posts `sim` rows at the same commit as T's APK; T's reports show only T unless asked, and one report sets T beside the bots.

Carried from the v1 brief `phase_SM1_sim_playtester_data.md` at the nexus v2 cut-over (phase NX1d, 2026-11-01). The brief's own words follow under these headings, its shipped phases left out; the whole v1 brief is `git show fd21d04ab:plan/phases/phase_SM1_sim_playtester_data.md`. Each chunk keeps its v1 row id as its `alias:`, so deadlines, D-entries and PRs that name the old id still resolve.

## Why

### Sources

- `/plot asap` from T, 2026-10-31, run unattended on T's word: "let's /plot the work needed in order to: 1) Have the
  sim collect it's own data 2) Build a specialized sim playtester (with behaviors who knows the game) 3) Differentiate
  between my playtesting data and the simulator".
- T's answers in the same session, recorded below as "Confirmed by T (2026-10-31)": one D1 database for all of it,
  every row tagged `human`, `harness` or `sim`; reports read `human` unless told otherwise; the playtester's brain is
  engine-side heuristic bots per lane archetype that walk the map, pick rewards and play fights, free to run in CI;
  an LLM player is a Follow-up; local harness runs keep posting, tagged `harness`; every row slotted asap, with the
  app-side tagging on the preview APK before the Nov 9 mid-MVP check.
- Phase BE1 (`plan/phases/phase_BE1_solve_time_backend.md`) and Phase BE2
  (`plan/phases/phase_BE2_card_combat_logging.md`): the `miserere-api` Worker, the D1 database `miserere`, the bearer
  token, `/v1/` additive only, numbered migrations never edited, failed posts dropped. BE2's Follow-up "The bot beside
  T (`card-vs-bot`)" is closed by this plot.
- `braindump/2026-10-21-backend-schema-plan.md` §2-4 (unplotted): its `source` stamp and its `card-vs-bot` reader are
  taken here; its `runs` and `measurements` tables (process runs: loop ticks, measured-truth cells) are not, and stay
  its own later plot (Follow-ups). This brief names its game-run table `play_runs` so that name stays free.
- D57 and the doctrine line "nothing grades the game from above" (`axiomancer-mechanics/CLAUDE.md`): every number the
  sim posts is a measurement for T to read, never a test bar; `measured-truth` is untouched. D84-D87, D93, D95, D101
  (loop PRs merge on green review; this plan merges by T's hand). D88 and D99 (no card, enemy or tuning change here).
  D106 and D114 (Chapter 1 is the Breakwater, the MVP's run). D108 (a run opens as a character; the reward pool is its
  starting lanes plus the worn relics' lanes). D118 (recorded by this plot: every play-log row names its source).
- Code read while shaping this (verified against `main` at `8f876ec1b`):
  - `axiomancer-mechanics/src/Combat/combat.play-log-contract.ts`: `PlayLogSource` is `solver`, `sessionId`,
    `buildCommit`, `appBuild`; `FightPost`, `DeckEventPost`, `DECK_EVENT_KINDS` (`reward`, `cache-reward`, `remove`,
    `run-end`; `upgrade` reserved), `COMBAT_EVENT_KINDS`, `PLAY_LOG_UI_EVENT_KINDS`. No source, no run id.
  - `backend/migrations/0001`-`0005`: `puzzle_attempts`, `fights`, `deck_events`, `ballot_verdicts`, the LR1g
    signature columns. The next file is `0006`. `backend/src/reports.ts`: `REPORT_NAMES` is `card-usage`, `card-gaps`,
    `signature-usage`, each filtered only by `?build=`. `scripts/api.mjs` reads them.
  - `axiomancer-mobile/lib/playLog.ts`: the gate (`isDevToolsEnabled()`, the API URL and token, the dev switch) and
    `playLogSource()` (solver `''`, a per-launch session id, `getBuildCommit()`, `puzzleAppBuild()`).
    `lib/fightRecorder.ts` and `lib/deckEvents.ts` take injected config, fetch and source (`FightRecorderDeps`,
    `DeckEventPosterDeps`). `lib/buildProfile.ts`: `getBuildCommit()` is null in a static web export (`extra` is
    not resolvable there), so every harness row so far has `build_commit` NULL and every preview-APK row has a sha.
  - `axiomancer-mechanics/src/Game/types.ts:89` `GameState.runId` and `src/Game/run-loop.ts` `generateRunId`: a run
    id already exists, persists in the save across launches, and is fresh on every `resetRun`. No save change is
    needed to stamp it.
  - The harness leak: `axiomancer-mobile/scripts/lib/web-export.mjs` `exportSpawnSpec` passes the caller's whole env
    plus `BUILD_PROFILE=preview` to `expo export`, and Expo inlines `EXPO_PUBLIC_*` from the gitignored
    `axiomancer-mobile/.env`, which holds the puzzle API URL and token. So a local e2e, `critique:drive`,
    `playtest:session` or `playtester` run posts fights into live D1 exactly as T's phone does. CI exports have no keys.
  - `axiomancer-mobile/eas.json` has no `env` on the preview profile; `.github/workflows/preview-build.yml` merges the
    API URL and token into the profile's `env` at build time (jq, never committed) and is `workflow_dispatch` only.
    The app has no `expo-updates`, so every app-side change reaches T only on a new preview APK.
  - The headless run: `axiomancer-mobile/state/store.ts` `createAppStore` and `state/actions.ts` `createAppActions`
    run the whole app state layer in Node with a memory adapter (`test-utils/memoryAdapter`); the `state/e2e/*.flow.*`
    suites already drive caches, rests, hazards, quests and run end through them. The live fight runs in the combat
    panel's own state, on the engine's encounter functions; `combat.encounter.sim.ts` exports `playSimPhase` and
    `runOneEncounter`, and `combat.sim-policies.ts` exports `CombatSimPolicy` (eight witnesses: `greedy`, `blind`,
    `dot-weaver`, `control-lock`, `aggro-brute`, `turtle`, `chaos`, `mercy-seeker`). `World/Hazard/hazard.sim.ts` has
    three hazard policies (`greedy`, `conservative`, `opportunist`). `World/act1-walk.ts` `planAct1Walk()` derives a
    route from the graphs but plays nothing. `Combat/combat.rewards.ts` rolls rewards; `Cards/card.lanes.ts`
    `CARD_LANES` and `getCardLane` give each card's lane. Nothing today walks a map, picks rewards, carries VITAE and
    reaches a run end.
  - `npm run measured:truth` (`scripts/measured-truth.mjs`, `.github/workflows/measured-truth.yml`): fights only, the
    greedy witness, foe HP x1 against the live x2 (`LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER`), no D1. It stays as it is.
  - `/v1/puzzle-attempts` is the dev puzzle route only; in-run hazards post nothing today. The game has no currency:
    the run's economy is XP, levels, items and relics.

### Outcome

Every row in D1 says who played it: T's preview APK posts `human`, every local harness posts `harness`, and a bot that
knows the game (one per lane archetype) plays whole Breakwater runs headlessly through the game's own code and posts
`sim` rows at the same commit as T's APK; T's reports show only T unless asked, and one report sets T beside the bots.

## Design

### Scope

- `axiomancer-mechanics`: the play-log contract (sources, run ids, run events, `play_runs` shapes); the `RunPolicy`
  contract, the `wanderer` baseline and the four archetype policies; their tests. No card, enemy, relic, map or tuning
  change; `combat.sim-policies.ts`, `hazard.sim.ts` and `combat.measured-truth.ts` are read, never changed.
- `backend/`: migrations `0006` and `0007`; the `source` and `run_id` columns in `fights.ts`, `deck-events.ts`,
  `attempts.ts`; the `play-runs` and `run-events` routes and table modules; the source filter and two new reports in
  `reports.ts`; tests.
- `axiomancer-mobile`: `lib/playLog.ts` (source, run id), the puzzle-attempt poster, `eas.json` (the preview
  profile's `env`), a run-log poster in `lib/` and its call sites in `state/`; the headless driver and its runner
  (`sim/`, run by a dedicated jest config so it uses the app's module mapping and mocks); tests.
- Root: `scripts/api.mjs` (`--source`, two report tables), `scripts/sim-run.mjs` and the `sim:run` npm script, their
  tests; `.github/workflows/sim-runs.yml`.
- Docs: `axiomancer-mobile/docs/dev-tools.md`, `AGENTS.md`, `docs/truth-sources.md`, `.github/workflows/README.md`.

### Consumers to update

- `@mechanics` barrel (the contract additions, `RunPolicy` and the policies).
- `backend/src/contract.ts` (re-export by path, as today).
- The root `npm test` list in `package.json` (`sim-run` and `api` script tests).
- `.github/workflows/README.md` (the new workflow and the secrets it reads).
- The `playtester` agent and `skills/critique.md` need no edit: they post through a web export, which A4 tags
  `harness`.

### Decisions made upfront — DO NOT ASK

- **One database, three sources** (Confirmed by T (2026-10-31)). The sim's rows go into the same `miserere` D1 through
  the same Worker, tagged `sim`; local harness runs keep posting, tagged `harness`; reports default to `human` and take
  `--source`, so `card-usage` can set T beside the bot at the same build. Recorded as D118.
- **The bot's brain is engine-side heuristics** (Confirmed by T (2026-10-31)): lane archetype policies in
  `axiomancer-mechanics` that path the map, pick rewards and play fights, free to run at scale in CI. An LLM-driven
  player is a Follow-up, not a phase.
- **The old rows** (Confirmed by T (2026-10-31)): every `fights` and `deck_events` row already in D1, whatever its
  `build_commit`, is relabelled `harness` by `0006`, to start clean; from here only a build carrying the human stamp
  posts `human`. Puzzle attempts carry no build commit and all stay `human`.
- **Who counts as T** (Confirmed by T (2026-10-31): "Only APK is human"): only a build that carries `EXPO_PUBLIC_PLAY_LOG_SOURCE=human`, which only the
  committed preview profile in `eas.json` sets. Every other build posts `harness`, so a forgotten harness can never
  land in T's numbers. A dev server T opens by hand posts `harness` too.
- **The bot plays the game T plays** (Confirmed by T (2026-10-31): "App's own code"): the driver walks the app's own store actions headlessly
  (`createAppStore` and `createAppActions`, the layer the `state/e2e` flow suites already drive), so every node
  resolves through the code T's taps reach and the posts go through the same recorder and posters. The policies stay
  in mechanics; the driver lives in `axiomancer-mobile/sim/`, run under a dedicated jest config. Rejected for now: a
  second copy of the run's glue in mechanics, faster but free to drift from the app.
- **How an archetype starts** (Confirmed by T (2026-10-31): "Characters only right now. I want to test ACTUAL
  playthrough a player will experience right now because as it stands, it's ROUGH."): through character select, as a
  character from the live roster, exactly as a player does: the character whose starting lanes include its lane when
  one exists, else one whose starting relic opens it, else the closest-fitting playable character (most of the lane's
  stat) (D108). Never the `/dev` test-deck presets or lane relics. The `wanderer` starts as a new game does. A lane no
  character opens gets no lane-led end deck from the bot; A12's lane check applies where the run starts in-lane.
- **When the bot runs, and how much** [T to confirm #5]: at the commit of every successful preview build, so every APK
  T plays has the bots' numbers at the same build, and by hand; four archetypes, 5 runs each. Preview builds are by
  hand and rare, which keeps D1 writes small; the batch cap is 25 MB.
- **Chapter 1 only.** A sim run ends at `run-over` or when the Breakwater boss is beaten and its exit reached (D106,
  D114: the MVP is Chapter 1). Later chapters are a Follow-up.
- **The game's run id is the run id.** `GameState.runId` is stamped on every row; nothing new is minted. The session id
  stays per launch (BE2), so one run can span several sessions.
- **A source is a stamp, not a gate.** The BE2 gate (dev tools, URL and token, the dev switch) is unchanged; `source`
  only labels what passes it. Production and beta builds still send nothing.
- **The bot knows the game from data.** Policies read lanes (`getCardLane`), keywords, effects, verb classes and enemy
  intents; a card id in a policy file is a defect (A11). This keeps the bots current as cards are added under D99.
- **Measured truth stays a measurement and stays separate** (D57). `measured-truth` keeps its own fights, its greedy
  witness and its x1 HP; the run sim is a second, different measurement. Neither gates anything; no test asserts a
  sim number (A12 tests the bot's behaviour, not the game).
- **Raw events, stats on the server** (BE2): the driver and the app post what happened; every rate is computed by a
  whitelisted report.
- **`play_runs`, not `runs`.** The braindump's `runs` table means a process run (a loop tick, a measured-truth run)
  and stays its own plot; a game run gets its own table so neither blocks the other.
- **Names.** Phase id SM1; the sources `human`, `harness`, `sim`; policy ids `wanderer`, `blood-price`, `defender`,
  `merciful`, `elementalist`.

### Tests matrix

- Mechanics: the source and run-id validator cases (each source, an unknown source, absent fields); the run-event
  validator (each kind, an unknown kind, an over-long batch) and its exhaustiveness test; `RunPolicy` seams for
  `wanderer` and each archetype over fixture states (the reward it picks, the rest it takes, the road it takes at low
  and high VITAE, its fight ranking on a fixture hand); the no-card-id guard; A12's behaviour test.
- Backend (Workers pool, local D1): `0006` over fixture rows (default `human`, the NULL-sha relabel); the `?source=`
  filter on every list route and report; `play-runs` open, re-open, close, double close; `run-events` batches;
  `card-vs-bot` and `run-summary` over fixture rows of all three sources.
- Mobile: `playLogSource()` with and without the env value; `runId` on each poster; each run-log call site under a
  mocked fetch; the driver over one seeded run per policy (reaches an end, same seed gives the same run, a stuck step
  throws); `--post` under a mocked fetch posts every row with `source: 'sim'` and one run id per run.
- Root: `scripts/api.mjs` `--source` parsing and the two new tables; `scripts/sim-run.mjs` argument parsing and its
  line format over fixture JSON.

### Verify gate

Per phase, below. The root `npm test` runs in every phase.

### Commit body template

```
<what shipped, one paragraph>

Closes A<n>[, A<m>] of plan/phases/phase_SM1_sim_playtester_data.md.
Measure: <the phase's Measure line and its result>.
```

### Follow-ups (out of scope)

- **An LLM-driven playtester** (Confirmed by T (2026-10-31) as a Follow-up): a model that plays through the same
  driver seams, for the questions a heuristic cannot ask (is this confusing, is this fun).
- **Chapters 2-4** for the sim, once they are playable end to end.
- **The braindump's `runs` and `measurements` tables** (loop ticks, measured truth as a series, the candidate audit
  online): `braindump/2026-10-21-backend-schema-plan.md` §2-4, a later `/plot`.
- **Puzzle-board hazards in the sim**, when live hazard routing lands (the Nov 3 plot): the hazard seam then plays
  the puzzle with `hazard-puzzle.solver.ts`.
- **Retention** for `sim` and `harness` rows, if D1 size grows; the `sim-runs` PR records the database size after its
  first batch.
- **Playtester telemetry** (BE1 Follow-up): device ids and a privacy note before an APK leaves T's hands; still a hard
  stop from BE2.

### Chunk notes (the brief's phase blocks)

#### SM1d (chunk 113.4)

Measure: `npm run verify -w axiomancer-mobile`; a flow test walks a run start, two nodes, a fight, a rest upgrade and a
run end under a mocked fetch and sees the open, the events in `seq` order, the `upgrade` deck event and the close.
- Scope: a run-log poster in `lib/` (open, batch, close, the BE2 gate); call sites in `state/actions.ts` (new game and
  character CONFIRM, `moveToNode`, `endCombat`, `resetRun`, `playerDied`), `state/rest`, `state/cache`,
  `state/hazard`, `state/quest`, `state/blacksmith` and the level-up action.
- Tests: one per call site; the gate shut makes no call; a failed post only warns.
- Verify gate: mobile verify, root `npm test`.

#### SM1g (chunk 113.7)

Measure: `npm run verify -w axiomancer-mobile`; a dispatched `sim-runs` at `main` posts 20 runs and
`npm run api -- run-summary --source sim` (or the Worker's `GET /v1/play-runs?source=sim`) lists them at that sha.
- Scope: `--post` in the driver (the app's posters with an injected `sim` source and the policy as solver); the batch
  cap and byte count; `.github/workflows/sim-runs.yml` and its README row.
- Tests: `--post` under a mocked fetch; no env posts nothing; the cap stops a batch.
- Verify gate: mobile verify, root `npm test`; the workflow's first dispatch recorded in the PR with the D1 size.

#### SM1i (chunk 113.9)

Measure: A17, its output pasted into the PR.
- Scope: a preview build from `main` (`preview-build.yml`), which starts `sim-runs` at the same sha; T's run; the
  four commands' output and T's one line recorded in the phase's PR.
- Tests: none new.
- Verify gate: none beyond the root `npm test`.

## Contracts

- **No save-data change.** `GameState.runId` already exists and persists; no `GAME_STATE_VERSION` bump.
- **D1, additive only, all under `/v1/`.** `0006`: `source` (NOT NULL DEFAULT `'human'`) and `run_id` (nullable) on
  `fights`, `deck_events`, `puzzle_attempts`; indexes `fights_source`, `fights_run_id`, `deck_events_source`,
  `deck_events_run_id`; the one-time relabel of NULL-`build_commit` rows to `harness`. `0007`: `play_runs` (indexed on
  `source`, `build_commit`) and `run_events` (indexed on `run_id`, `kind`). An older APK posts the old shape and lands
  as `human` with a null run id. A breaking change would take `/v2/`; nothing here needs one.
- **Caps:** a run-events batch at most 200 events and 256 KiB; a `play_runs` body at most 64 KiB; fights keep BE2's
  1 MiB and 5000 events. One sim batch posts at most 25 MB (A13).

## Acceptance

- **A13** `npm run sim:run -- --post` sends each run through the app's own posters with `source: 'sim'`: `solver` is
  the policy id, `sessionId` is the batch (`GITHUB_RUN_ID`, or a local id), `buildCommit` is the checked-out sha,
  `runId` is the run's `GameState.runId`, and the `play_runs` row carries `policy_id`. It reads `PUZZLE_API_URL` and
  `PUZZLE_API_TOKEN` from the environment and, without them, prints what it would post and posts nothing. It prints
  the rows and bytes posted, and stops before posting past 25 MB in one batch.
- **A14** A workflow, `.github/workflows/sim-runs.yml`, runs the sim with `--post` at the commit of every successful
  `preview-build` (`workflow_run`, at its `head_sha`) and by hand (`workflow_dispatch` with a ref and a run count):
  four archetypes, 5 runs each by default [T to confirm #5]. It reads the existing repo secrets for the Worker URL and
  token. It fails only when the driver crashes or a post is refused, never on a number, and is never a required check.
  `measured-truth.yml` and `npm run measured:truth` are unchanged.
- **A17** (attended) After a preview APK built from a commit carrying SM1a-SM1h, T plays at least one run (a fight and
  a reward) and `sim-runs` has run at that commit. `npm run api -- card-usage --build <sha>` counts only T's fights;
  `--source sim` shows the bots'; `card-vs-bot --build <sha>` sets T's column beside the four policies';
  `run-summary` lists T's run and the bots'; `--source harness` holds no row of T's. T's one-line read goes in the
  PR.

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 3 open · 14 closed · next A18

- [ ] **113.7** The bot posts its own data · M · closes A13, A14 · needs — · alias: SM1g
- [ ] **113.9** T's read of the comparison (attended) · S · closes A17 · needs 113.7 · alias: SM1i
