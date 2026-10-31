# Phase SM1 — The sim playtester and its own data, kept apart from T's

## Sources

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

## Outcome

Every row in D1 says who played it: T's preview APK posts `human`, every local harness posts `harness`, and a bot that
knows the game (one per lane archetype) plays whole Breakwater runs headlessly through the game's own code and posts
`sim` rows at the same commit as T's APK; T's reports show only T unless asked, and one report sets T beside the bots.

## Acceptance

- **A1** The play-log contract defines `PLAY_LOG_SOURCES = ['human', 'harness', 'sim']`. `FightPost`, `DeckEventPost`
  and `PuzzleAttemptPost` gain an optional `source` (one of the three) and an optional `runId` (string or null). The
  validators reject any other source and accept a body without either field (an older APK). Both are exported through
  the barrel and re-exported by `backend/src/contract.ts`.
- **A2** Migration `backend/migrations/0006_play_log_source.sql` adds `source TEXT NOT NULL DEFAULT 'human'` and a
  nullable `run_id` to `fights`, `deck_events` and `puzzle_attempts`, indexes `source` and `run_id` on the first two,
  and relabels every existing `fights` and `deck_events` row whose `build_commit` is NULL as `harness` [T to confirm
  #1]. `0001`-`0005` are unchanged. A body without `source` is stored as `human`.
- **A3** Every list route takes `?source=` and every report in `REPORT_NAMES` takes `?source=human|harness|sim|all`,
  defaulting to `human`; each report's body names the source it read. `npm run api -- <report> --source <s>` passes
  it, and the table's header line prints it. Worker tests cover the default, each source, `all`, and a 400 on an
  unknown source.
- **A4** The app's `playLogSource()` stamps `source: 'human'` only when the build carries
  `EXPO_PUBLIC_PLAY_LOG_SOURCE=human`, and `harness` otherwise; the app never sends `sim`. The committed `eas.json`
  preview profile carries `EXPO_PUBLIC_PLAY_LOG_SOURCE: "human"` in its `env` (the `preview-build.yml` jq merge keeps
  it). A static web export, a dev server and a jest run therefore post `harness` [T to confirm #2]. The puzzle-attempt
  poster carries the same source.
- **A5** Every fight, deck event and puzzle attempt the app posts carries `runId`: the store's `GameState.runId`, or
  null when no run is in progress (a `/devpuzzle` attempt from the title screen). A fight and the deck event after it
  share the id; a run continued after an app restart keeps it; a `resetRun` changes it.
- **A6** Migration `0007_play_runs.sql` creates `play_runs` (one row per run: `run_id` unique, `source`, `solver`,
  `session_id`, `build_commit`, `app_build`, `character_id`, `policy_id` (null for `human` and `harness`),
  `start_deck_json`, `started_at`, then, once closed, `ended_at`, `outcome` (`run-over` | `chapter-clear` |
  `reset`), `end_node_id`, `level`, `vitae_end`, `nodes_resolved`, `end_deck_json`). `POST /v1/play-runs` opens a run
  and is idempotent on `run_id` (a second open is 200 with the existing id); `POST /v1/play-runs/<runId>/end` closes
  it once (a second close is 409). Worker tests cover open, re-open, close, double close, 401, 400 and 413.
- **A7** Migration `0007` also creates `run_events` (`id`, `received_at`, `run_id`, `source`, `seq`, `kind`,
  `payload_json`), and `POST /v1/run-events` takes a batch of at most 200. The contract defines
  `RUN_EVENT_KINDS`: `node-entered` (map, node id, node kind), `node-resolved` (node kind and the choice taken: the
  rest option, the cache offer, the quest step, flee or fight), `hazard-ended` (hazard id, cleared or not, VITAE
  before and after), `xp-gained` (amount and from what), `level-up` (new level and the stat point spent), and
  `item-gained` (item id, slot, from what). The validator rejects an unknown kind, and a type-level test fails when a
  payload type is added without its kind. `upgrade` becomes a live `deck_events` kind (card id before and after, the
  deck after); no migration, as BE2 reserved it.
- **A8** The app posts the whole run through the same gate: a `play_runs` open when a run starts (character select's
  CONFIRM, a new game) and a close at its end (the run-over state, the Breakwater boss beaten, a `resetRun`); one
  `node-entered` and one `node-resolved` per node, `hazard-ended`, `xp-gained`, `level-up` and `item-gained` at the
  store actions that do each, and an `upgrade` deck event at the rest and blacksmith upgrade actions. Events are
  batched per node, posted in order with a per-run `seq`, and dropped on failure (BE1). Each call site has a test
  under a mocked fetch; the gate shut makes no call.
- **A9** A headless run driver plays one Chapter 1 run from a new game to its end (`run-over`, or the Breakwater boss
  beaten and its exit reached) through the app's own store actions (`createAppStore`, `createAppActions`)
  (Confirmed by T (2026-10-31)), starting as a new game does: character select's CONFIRM as a roster character. Every
  node kind the Breakwater carries resolves through the action its screen calls; a fight plays on
  the engine's encounter functions with the run's real deck, relics, level and the live foe HP multiplier, and is
  ended through the `endCombat` bridge; VITAE, XP, items and the deck carry from node to node. A step with no legal
  move throws, naming the node and the state (a bug detector, not a grade). The same seed and policy give the same
  run.
- **A10** `npm run sim:run -- --policy <id> --runs <n> --seed <s> [--json]` (root) prints one line per run: the
  policy, the seed, the outcome, the furthest node, level, VITAE at the end, fights won, lost and spared, and the end
  deck's count per lane. It posts nothing. The run policy contract (`RunPolicy`, in `axiomancer-mechanics`) has one
  seam per decision: which road to take, which reward to pick or skip, which rest option, which cache offer, how to
  play a hazard (a `hazard.sim.ts` policy), how to play a fight (a `CombatSimPolicy`), which stat to raise at a level
  up, and when to flee. A `wanderer` baseline (first legal choice on the map, `greedy` in fights) ships with the
  driver.
- **A11** Four archetype policies that know the game ship in `axiomancer-mechanics`: `blood-price`, `defender`,
  `merciful` and `elementalist`. Each starts its run as its lane (Decisions: "How an archetype starts") [T to
  confirm #4]; picks rewards of its own lane first, then cards whose keywords its lane uses, and skips the rest; removes off-lane cards
  at a rest when it can; rests when VITAE is under its threshold and takes an elite only above it; raises its lane's
  stat; and plays fights with a lane-aware ranking (Blood Price spends VITAE when a signature pays it back; the
  Defender guards against ATTACK and DANGER intents; the Merciful drives to befriend and spares; the Elementalist
  chains its elements and refuses a self-burn that would end it). Every rule reads lanes, keywords, intents and
  effects from the card and enemy data, never a card id, so a new card in a lane is picked up with no edit.
- **A12** A policy test runs each archetype over 10 seeds and checks the bot did what its name says: its end deck
  holds more cards of its lane than of any other lane, and the Merciful ends at least one fight by befriending. It
  asserts no win rate, no VITAE and no count of fights won (doctrine: a test of the bot, not of the game).
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
- **A15** Two new reports join `REPORT_NAMES`: `card-vs-bot` (per card, at one build: T's fights in deck, drawn,
  played, offered, picked and skipped beside the same counts for each sim policy, each as a rate per fight or per
  offer; `--build` defaults to the newest build that has both `human` and `sim` rows, and the header names it) and
  `run-summary` (per source, and per policy for `sim`: runs, outcomes, the furthest node reached, level and VITAE at
  the end, nodes resolved). Both read the whitelisted SQL in `backend/src/reports.ts`; `npm run api` prints both.
- **A16** `axiomancer-mobile/docs/dev-tools.md` documents the three sources, what makes a build `human`, the run id,
  the run events and `npm run sim:run`; `AGENTS.md`'s `backend/` line names `play_runs` and `run_events`;
  `docs/truth-sources.md` "Measured truth" says the sim rows are measurements beside `measured/latest.md`, not a
  baseline (D57).
- **A17** (attended) After a preview APK built from a commit carrying SM1a-SM1h, T plays at least one run (a fight and
  a reward) and `sim-runs` has run at that commit. `npm run api -- card-usage --build <sha>` counts only T's fights;
  `--source sim` shows the bots'; `card-vs-bot --build <sha>` sets T's column beside the four policies';
  `run-summary` lists T's run and the bots'; `--source harness` holds no row of T's. T's one-line read goes in the
  PR.

**Measure:** A17.

## Scope

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

## Consumers to update

- `@mechanics` barrel (the contract additions, `RunPolicy` and the policies).
- `backend/src/contract.ts` (re-export by path, as today).
- The root `npm test` list in `package.json` (`sim-run` and `api` script tests).
- `.github/workflows/README.md` (the new workflow and the secrets it reads).
- The `playtester` agent and `skills/critique.md` need no edit: they post through a web export, which A4 tags
  `harness`.

## Save / schema contracts

- **No save-data change.** `GameState.runId` already exists and persists; no `GAME_STATE_VERSION` bump.
- **D1, additive only, all under `/v1/`.** `0006`: `source` (NOT NULL DEFAULT `'human'`) and `run_id` (nullable) on
  `fights`, `deck_events`, `puzzle_attempts`; indexes `fights_source`, `fights_run_id`, `deck_events_source`,
  `deck_events_run_id`; the one-time relabel of NULL-`build_commit` rows to `harness`. `0007`: `play_runs` (indexed on
  `source`, `build_commit`) and `run_events` (indexed on `run_id`, `kind`). An older APK posts the old shape and lands
  as `human` with a null run id. A breaking change would take `/v2/`; nothing here needs one.
- **Caps:** a run-events batch at most 200 events and 256 KiB; a `play_runs` body at most 64 KiB; fights keep BE2's
  1 MiB and 5000 events. One sim batch posts at most 25 MB (A13).

## Decisions made upfront — DO NOT ASK

- **One database, three sources** (Confirmed by T (2026-10-31)). The sim's rows go into the same `miserere` D1 through
  the same Worker, tagged `sim`; local harness runs keep posting, tagged `harness`; reports default to `human` and take
  `--source`, so `card-usage` can set T beside the bot at the same build. Recorded as D118.
- **The bot's brain is engine-side heuristics** (Confirmed by T (2026-10-31)): lane archetype policies in
  `axiomancer-mechanics` that path the map, pick rewards and play fights, free to run at scale in CI. An LLM-driven
  player is a Follow-up, not a phase.
- **The old rows** [T to confirm #1]: rows already in D1 whose `build_commit` is NULL came from web exports (a static
  export cannot read `extra`), so `0006` relabels them `harness`; rows with a sha came from a preview APK and stay
  `human`. Puzzle attempts carry no build commit and all stay `human`.
- **Who counts as T** [T to confirm #2]: only a build that carries `EXPO_PUBLIC_PLAY_LOG_SOURCE=human`, which only the
  committed preview profile in `eas.json` sets. Every other build posts `harness`, so a forgotten harness can never
  land in T's numbers. A dev server T opens by hand posts `harness` too.
- **The bot plays the game T plays** (Confirmed by T (2026-10-31): "App's own code"): the driver walks the app's own store actions headlessly
  (`createAppStore` and `createAppActions`, the layer the `state/e2e` flow suites already drive), so every node
  resolves through the code T's taps reach and the posts go through the same recorder and posters. The policies stay
  in mechanics; the driver lives in `axiomancer-mobile/sim/`, run under a dedicated jest config. Rejected for now: a
  second copy of the run's glue in mechanics, faster but free to drift from the app.
- **How an archetype starts** [T to confirm #4]: as the character whose starting lanes include its lane once the roster
  holds one (D108); until then, from its lane's `/dev` test-deck preset and lane relic, the setup T uses for the
  DF1f, MF1e and EL1d checks. The `wanderer` starts as a new game does.
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

## Tests matrix

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

## Verify gate

Per phase, below. The root `npm test` runs in every phase.

## Commit body template

```
<what shipped, one paragraph>

Closes A<n>[, A<m>] of plan/phases/phase_SM1_sim_playtester_data.md.
Measure: <the phase's Measure line and its result>.
```

## DoD

A1-A17 ticked, each by the phase that closes it. `measured-truth` unchanged. No test asserts a number the sim posts.

## Follow-ups (out of scope)

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

## Phases

### SM1a — Every row says who played it · M · closes A1, A2, A3 · requires nothing
Measure: `npm run verify -w backend` and `npm run verify -w axiomancer-mechanics`; a report with no `?source=` reads
only `human` fixture rows.
- Scope: the contract's `PLAY_LOG_SOURCES`, optional `source` and `runId` on the three post shapes and their
  validators; `0006_play_log_source.sql`; the columns in `fights.ts`, `deck-events.ts`, `attempts.ts`; `?source=` on
  the list routes and the three reports; `scripts/api.mjs --source`.
- Consumers: `@mechanics` barrel; `backend/src/contract.ts`.
- Save/schema: `0006` as above. No save change.
- Tests: the validator cases; `0006` over fixture rows; the filter on each route and report; the script flag.
- Verify gate: mechanics verify, backend verify, root `npm test`. The deploy workflow applies `0006` on merge.

### SM1b — The app tags what it sends · S · closes A4, A5 · requires SM1a
Measure: `npm run verify -w axiomancer-mobile`; the poster tests show `harness` without the env value, `human` with
it, and the store's run id on a fight, a deck event and a puzzle attempt.
- Scope: `lib/playLog.ts` (`source` from `EXPO_PUBLIC_PLAY_LOG_SOURCE`, `runId` from the store), the puzzle-attempt
  poster, the three posters' run id; `eas.json` preview `env`; the `preview-build.yml` jq merge checked to keep it (a
  workflow edit only if it would drop it).
- Tests: `playLogSource()` both ways; run id on each poster; a reset changes it.
- Verify gate: mobile verify, root `npm test`. The next preview APK carries this (before T's Nov 9 check).

### SM1c — The whole run, in the contract and the Worker · M · closes A6, A7 · requires SM1a
Measure: `npm run verify -w backend` and `npm run verify -w axiomancer-mechanics`; a fixture run opens, logs six kinds
of event and closes against a local D1.
- Scope: the contract's `play_runs` shapes, `RUN_EVENT_KINDS` and payloads, `upgrade` made live in
  `DECK_EVENT_KINDS`; `0007_play_runs.sql`; the `play-runs` and `run-events` routes and table modules; the caps.
- Tests: the validators and the exhaustiveness test; A6's and A7's route cases.
- Verify gate: mechanics verify, backend verify, root `npm test`. The deploy workflow applies `0007` on merge.

### SM1d — The app posts the whole run · M · closes A8 · requires SM1b, SM1c
Measure: `npm run verify -w axiomancer-mobile`; a flow test walks a run start, two nodes, a fight, a rest upgrade and a
run end under a mocked fetch and sees the open, the events in `seq` order, the `upgrade` deck event and the close.
- Scope: a run-log poster in `lib/` (open, batch, close, the BE2 gate); call sites in `state/actions.ts` (new game and
  character CONFIRM, `moveToNode`, `endCombat`, `resetRun`, `playerDied`), `state/rest`, `state/cache`,
  `state/hazard`, `state/quest`, `state/blacksmith` and the level-up action.
- Tests: one per call site; the gate shut makes no call; a failed post only warns.
- Verify gate: mobile verify, root `npm test`.

### SM1e — The headless run driver · L · closes A9, A10 · requires nothing
Measure: `npm run sim:run -- --policy wanderer --runs 3 --seed 1` prints three run lines that each reach `run-over` or
`chapter-clear`, and prints the same three lines when run again.
- Scope: `RunPolicy` and `wanderer` in `axiomancer-mechanics`; `axiomancer-mobile/sim/` (the driver over
  `createAppStore` and `createAppActions` with a memory adapter, a fight loop on the encounter functions that calls
  the `endCombat` bridge, one resolver per Breakwater node kind calling its screen's action) and its jest config;
  `scripts/sim-run.mjs` and the root `sim:run` script.
- Consumers: `@mechanics` barrel; the root `npm test` list.
- Tests: one seeded run per node kind on a fixture map; the determinism test; a stuck step throws with the node.
- Verify gate: mechanics verify, mobile verify, root `npm test`.

### SM1f — Bots that know the game · M · closes A11, A12 · requires SM1e
Measure: `npm run verify -w axiomancer-mechanics`; `npm run sim:run -- --policy <each archetype> --runs 3` prints end
decks led by that archetype's lane.
- Scope: the four archetype `RunPolicy`s and their fight rankings (each a `CombatSimPolicy`) in
  `axiomancer-mechanics`; the start rule (character or lane preset) in the driver.
- Tests: each policy's seams over fixture states; the no-card-id guard; A12's behaviour test.
- Verify gate: mechanics verify, mobile verify, root `npm test`.

### SM1g — The bot posts its own data · M · closes A13, A14 · requires SM1d, SM1f
Measure: `npm run verify -w axiomancer-mobile`; a dispatched `sim-runs` at `main` posts 20 runs and
`npm run api -- run-summary --source sim` (or the Worker's `GET /v1/play-runs?source=sim`) lists them at that sha.
- Scope: `--post` in the driver (the app's posters with an injected `sim` source and the policy as solver); the batch
  cap and byte count; `.github/workflows/sim-runs.yml` and its README row.
- Tests: `--post` under a mocked fetch; no env posts nothing; the cap stops a batch.
- Verify gate: mobile verify, root `npm test`; the workflow's first dispatch recorded in the PR with the D1 size.

### SM1h — T beside the bots · S · closes A15, A16 · requires SM1a, SM1c
Measure: `npm run verify -w backend`; `card-vs-bot` and `run-summary` return the expected rows over fixtures of all
three sources, and `npm run api -- card-vs-bot --json` parses a fixture body.
- Scope: the two reports in `backend/src/reports.ts`; their tables in `scripts/api.mjs`; the docs in A16.
- Tests: the report SQL over fixture rows; the script's tables.
- Verify gate: backend verify, root `npm test`, prose verify for the docs.

### SM1i — T's read of the comparison (attended) · S · closes A17 · requires SM1g, SM1h
Measure: A17, its output pasted into the PR.
- Scope: a preview build from `main` (`preview-build.yml`), which starts `sim-runs` at the same sha; T's run; the
  four commands' output and T's one line recorded in the phase's PR.
- Tests: none new.
- Verify gate: none beyond the root `npm test`.
