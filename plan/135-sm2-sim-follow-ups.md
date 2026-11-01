# 135 — Sims that play the game: player personas, breaks filed, a nightly report of run health, pacing and coverage

> Four player personas (`cautious`, `reckless`, `explorer`, `rusher`) play whole Chapter 1 runs every night; every new thing that breaks (a stuck step, a crash, a quest that cannot be finished, a node that never resolves) becomes one GitHub issue `/triage` routes as a bug; a committed `docs/reports/sim/latest.md` leads with run health, then pacing and difficulty, then which content the runs reached and which they never did; `sim` and `harness` rows leave D1 after 14 days while T's stay; and the run log names a quest's XP as the quest's.

## Why

### Sources

- `/plot asap` from T, 2026-11-01, run unattended on T's word: the follow-up to SM1 (spec 113,
  `plan/113-sm1-sim-playtester-data.md`; SM1a-SM1h merged as #1238, #1239, #1251, #1253, #1259, #1270, #1272,
  #1275). SM1i (chunk 113.9, attended: T plays and reads the comparison) stays open and untouched.
- T's redirect of the same plot, 2026-11-01, in session: "I would much rather have sims where they play the actual
  game instead of testing the decks." T's answers, recorded below as "Confirmed by T (2026-11-01)":
  1. The sims are about playing the game, in four parts, all four chosen: (a) does the run work: play whole runs like
     a player and report what breaks; (b) pacing and difficulty: where runs die, how long each region takes, the
     level and VITAE curve, how often a player rests or flees, and whether Chapter 1 is too easy or too hard (so the
     "how hard is Chapter 1" numbers stay: the first draft's call #1, answered yes); (c) player-like choices: four
     persona policies, `cautious`, `reckless`, `explorer` and `rusher`, replace lane strategy as the main bots, each
     a `RunPolicy` in `axiomancer-mechanics/src/Game/run-sim/` reading everything from data, starting at character
     select as the live roster allows, fighting with a sensible witness; (d) coverage: which nodes, quests, enemies,
     hazards and items the runs reach and use, and what they never do.
  2. The deck-focused parts stay as built and are de-prioritized: the lane bots, A12 of spec 113 and `card-vs-bot`.
     The Merciful kill-to-grow chunk of the first draft is dropped; its `it.failing` stays as it is (Follow-ups). The
     nightly report leads with run health, pacing and coverage; cards come last or not at all.
  3. Breaks get filed for the loop: the nightly job opens one GitHub issue per new break, deduped by a stable key
     (persona, node, kind of break), carrying the seed, the persona and a state summary, labelled so `/triage` routes
     it as a bug. Never a failing check on a number; a crash or stuck step may still exit non-zero, as SM1g does.
  4. The lane bots run only by hand (`workflow_dispatch`); nightly and preview builds run the personas.
  - Kept from the first draft, confirmed in the same session: 14-day retention of `sim` and `harness` rows (never
    `human`) in `fights`, `deck_events`, `puzzle_attempts`, `play_runs` and `run_events`, by a Cloudflare cron on the
    `miserere-api` Worker (no GitHub secrets); the quest's share of a fight's XP logged as `quest`; the `run-ends`
    report; the nightly report in `docs/reports/sim/latest.md` with a dated history, a measurement, committed through
    the push path `measured-truth.yml` uses.
- Decisions: D57 and the doctrine "nothing grades the game from above" (`axiomancer-mechanics/CLAUDE.md`): no test
  asserts a sim number, and nothing fails CI on one. D88 and D99 (no card, enemy or tuning change). D106 and D114
  (Chapter 1 is the Breakwater). D108 (a run opens as a character). D118 (every play-log row names its source). D84
  (generated data commits to main as `measured-truth` does, until D119's NX1e path replaces it). D93, D101, D119 (this
  plot lands by a `plot` PR T merges).
- Code read while shaping this (verified against `main` at `eb79ed1d9`, 2026-11-01):
  - `axiomancer-mechanics/src/Game/run-sim/run-policy.types.ts`: one seam per choice (`chooseCharacter`, `chooseRoad`,
    `takeTravel`, `pickReward`, `chooseRest`, `chooseCacheOffer`, `visitVillage`, `hazardPolicy`, `pickHazardCard`,
    `fightPolicy`, `flee`, `raiseStat`, `takeItem`). `RunRoadOption` carries `nodeId`, `via`, `nodeKind`,
    `unfinished`, `distanceToUnfinished`: nothing says a road leads to an elite, to the story's next step, or how far
    the chapter exit is. `RunTravelContext` says whether a trip leaves the map, not whether work is left behind.
  - `run-roads.ts` `runRoadOptions`: the roads, by the open road rule (`legalMovesFrom`), with a node unfinished while
    unspent or while a quest has business there. `World/types.ts` `holdRoadsUntilSettled`: the nodes (elites, gates)
    that hold the road on. `World/breakwater-chapter.questline.ts`: the chapter's main questline, as data.
  - `run-policy.wanderer.ts` fights `COMBAT_SIM_POLICIES.greedy`, whose `signatureKinds` include `mercy` and whose
    `mercyChoice` is `spare`. Since BUG1j (#1242, `Enemy/befriend.ts`) every foe can be befriended and a befriend pays
    no XP and no card, and the Chosen's Suppliant's Ring opens mercy on every foe: a bot that spares stays at level 1
    and dies in two or three fights. `measured-truth` plays `greedy` from `combat.sim-policies.ts` directly, never the
    wanderer.
  - `axiomancer-mobile/sim/run-driver.ts` `playRun` throws `RunStuckError` (`run-stuck.ts`: map, node, step, screen)
    on a step with no legal move or past the step cap, and `run-fight.ts` throws `FightStuckError`; `sim-runs.ts`
    runs a batch and `sim-run.entry.ts` exits non-zero on any of them. `RunResult` carries the outcome, end and
    furthest node, level, VITAE, fights by result, nodes resolved, steps and the end deck.
  - `axiomancer-mechanics/src/Combat/combat.play-run-contract.ts` `RunEventPayloads`: `node-entered` (map, node,
    kind), `node-resolved` (node, kind, choice: `accept` or `turn-in` for a quest, no quest id), `hazard-ended` (id,
    cleared, VITAE before and after), `xp-gained`, `level-up`, `item-gained` (id, slot, from). No VITAE or level at a
    node, no quest id. `fights` carries `enemy_id` and the outcome.
  - `axiomancer-mobile/state/run-log.ts` `recordFightSettled` logs the whole XP delta as one `xp-gained` from `fight`;
    `Game/store.ts` `CombatEndReport.xpGained` is the foe's XP only, and the same `endCombat` folds quest reward XP
    into `player.experience`.
  - `backend/`: `wrangler.toml` has no `[triggers]`; `src/index.ts` exports `fetch` only; migrations `0001`-`0007`
    carry `received_at` (ISO text) on four tables and `started_at` on `play_runs`, `run_id` on all five, no index on
    `received_at`. `backend-deploy.yml` applies migrations and deploys on a push to main touching `backend/**` or the
    contract files. `src/reports.ts`: `card-usage`, `card-gaps`, `signature-usage`, `card-vs-bot`, `run-summary`;
    none counts runs by end node, arrival depth or content reached.
  - `.github/workflows/sim-runs.yml`: the four lane bots, 5 runs each, `--seed 1`, on `workflow_run` of
    `preview-build`, by hand and nightly at `43 3 * * *`; `contents: read`; fails on any driver failure.
    `measured-truth.yml`: `docs/reports/measured/latest.md` and `history.jsonl`, committed by `claude[bot]` with
    `GH_PAT`, the `nexus-loop` concurrency group and a four-try `pull --rebase` and push.
  - `skills/triage.md`: `/triage` reads open issues that carry no `triage:*` label and no `loop:opened`, classifies
    them and routes a `bug` to `plan/AUDIT.md`.
  - `docs/truth-sources.md` "Measured truth" gives each measurement its own bullet; `CLAUDE.md` names only
    `measured/latest.md`.

### Outcome

The bots play Chapter 1 the way four kinds of player would; what breaks reaches the loop as issues; T reads each
morning whether runs work, how hard and how long Chapter 1 is, and what content no run reaches; D1 holds 14 days of bot
and harness rows and every row of T's.

**Proof of the outcome:** the first nightly `sim-runs` after 135.6 lands plays the four personas, commits
`docs/reports/sim/latest.md` and a `history.jsonl` line to main, and files an issue for each new break it found (or
says none); the Worker's cron the morning after 135.7 deploys leaves no `sim` or `harness` row older than 14 days and
every `human` row.

## Design

### Scope

- `axiomancer-mechanics`: the run-event contract (a `quest-step` kind; `level` and `vitae` on `node-resolved`); the
  road and travel contexts (elite, story, exit distance, work left behind); a Chapter 1 content reading
  (`chapter1Content()` and its CLI); the player witness; the four personas and their behaviour test. Read, never
  changed: `combat.sim-policies.ts`, `combat.measured-truth.ts`, the lane bots and every card, enemy, relic, map and
  tuning table.
- `axiomancer-mobile`: `state/run-log.ts` and the quest store actions (the new event and fields, the quest's XP);
  `sim/` (the driver fills the new contexts; the batch records breaks instead of stopping; the end-of-run checks; a
  breaks file).
- `backend/`: the `run-ends`, `run-pacing` and `coverage` reports; migration `0008_retention_indexes.sql`,
  `src/retention.ts`, a `scheduled` handler, `[triggers]` in `wrangler.toml`; tests.
- Root: `scripts/api.mjs` (three tables), `scripts/sim-breaks.mjs` and `scripts/sim-report.mjs` with their npm scripts
  and tests in the root `npm test`; `.github/workflows/sim-runs.yml` (triggers, the filing step, the report job).
- Docs and data: `docs/reports/sim/latest.md` and `history.jsonl` (generated), `docs/truth-sources.md`,
  `.github/workflows/README.md`, `axiomancer-mobile/docs/dev-tools.md`, the retention D-entry in
  `plan/2026-09-25-refactor-strategy.decisions.md`.

### Consumers to update

- `@mechanics` barrel: `chapter1Content`, the persona policies, the player witness.
- `run-policy.registry.ts` `RUN_POLICY_IDS` (spec 113's registry test lists them: it gains the personas).
- `backend/src/contract.ts` (re-exports the run-event contract by path; the new kind needs no backend code beyond
  that). `REPORT_NAMES` in `backend/src/reports.ts` and `scripts/api.mjs`.
- `scripts/sim-run.test.mjs` and `scripts/backend-deploy.test.mjs` where they pin `sim-runs.yml` or `wrangler.toml`.

### Decisions made upfront — DO NOT ASK

- **Play the game, not the decks** (Confirmed by T (2026-11-01)). The four personas are the main bots. The lane bots,
  A12 of spec 113 and `card-vs-bot` stay exactly as built; the Merciful's `it.failing` stays.
- **The four personas** (Confirmed by T (2026-11-01)), each a `RunPolicy` in `run-sim/`, every rule read from data
  (node kinds, the elite and story flags, distances, VITAE, the questline), never a card or node id:
  - `cautious`: rests under 60% VITAE at a rest or village; walks away from an elite under 60% (once, then takes it,
    as the lane bots do, since an elite holds its road on); withdraws from any fight it may leave under 40%; among
    roads equally near work, prefers a rest, village, cache, cutscene or quest over a fight or hazard, and never walks
    to an elite while another unfinished node is reachable; crosses hazards `conservative`.
  - `reckless`: walks to an elite or a hazard first when one is reachable; never withdraws; at a rest takes the
    upgrade unless under 50% VITAE; never pays for a village bed above 50%; crosses hazards `greedy`.
  - `explorer`: walks to the nearest unfinished node; takes no trip that leaves the map while any unfinished node is
    reachable (it talks to every NPC by visiting every quest, village and cutscene node); finishes side quests (any
    quest with business is unfinished work); rests under 50%.
  - `rusher`: takes the road that is nearest the story's next step (a node the chapter's main questline needs now, a
    road-holding gate, or the boss), else nearest the chapter exit; skips every node that is neither; takes the exit
    trip as soon as it can; rests only under 30%.
  - All four: open as the first playable character of the live roster (today the Chosen); take the first card offered
    (the pool is already the character's lanes, D108) and the elite upgrade when it improves a card; wear every item
    they can; raise the character's highest stat; fight with the player witness.
- **The player witness** (from the first draft's wanderer idea; confirmed as fitting by T): the greedy witness with
  the mercy signature off and `mercyChoice: 'exploit'`, built in `run-sim/` (`PLAYER_WITNESS`). It kills every foe, so
  a persona earns XP and drafts. The wanderer fights with it too. `COMBAT_SIM_POLICIES.greedy` is untouched, because
  `measured-truth` plays it (Follow-ups).
- **What a road says** (new context, filled by the driver from data): `RunRoadOption` gains `elite` (the node's pool
  stages an elite foe), `story` (the node is a target of the chapter's main questline's current step, or holds roads
  on, or is the boss) and `distanceToExit` (roads to the chapter's exit trip by the open road rule, null when none);
  `RunTravelContext` gains `unfinishedReachable` (the count of unfinished nodes still reachable). The main questline
  and the gates come from the map's data (`holdRoadsUntilSettled`, the chapter questline), never a node id in code.
- **Chapter 1's content, as data** (`chapter1Content()`, `npm run chapter1-content -w axiomancer-mechanics -- --json`):
  the Breakwater's nodes (id, kind, gate or not, story or side), its quests and their steps, the enemies its pools
  stage, its hazards, and the items its pools, caches, villages and quests can pay. It is the universe the coverage
  section reads "never reached" against, and the gate order that cuts the chapter into regions.
- **Regions and time.** A region is the stretch of the chapter between one road-holding gate and the next, in story
  order, from `chapter1Content()` (the map has no region field, and node-id prefixes are not data). The sim has no
  clock, so time is nodes resolved (and run steps) between entering a region and leaving it.
- **The run log carries what pacing and coverage read** (contract first, additive): `node-resolved` gains optional
  `level` and `vitae` (the player after the node), and a new kind `quest-step` (`questId`, `stepId`, `action`:
  `accept`, `turn-in` or `complete`) is logged by the quest store actions. The Worker validates against the contract
  and redeploys when the contract file changes (`backend-deploy.yml` paths). An older APK posts neither and still
  lands. The app and the driver post the same events, since the driver runs the app's store actions.
- **The quest's XP is the quest's** (Confirmed by T (2026-11-01)): `recordFightSettled` logs `xp-gained` `from:
  'fight'` for the report's `xpGained` (capped at the delta) and the rest, when positive, as `from: 'quest'`; a
  befriend that completes a quest logs only the quest's. It touches the same file as the run-log contract work, so it
  rides that chunk.
- **Coverage is counted on the server** (BE2: raw events, stats on the server). A `coverage` report counts, per source
  and policy at a build, the nodes entered and resolved, the quest steps taken, the enemies fought (from `fights`) by
  outcome, the hazards crossed and cleared, and the items gained. Picked over counting from the driver's JSON in the
  report job because it reads T's own runs the same way (`--source human`), needs no artifact passed between jobs,
  and keeps the report script free of statistics. The report joins those counts with `chapter1Content()` to list
  what was never reached.
- **Pacing is counted on the server.** `run-ends` (kept: per source, policy and end node, closed runs, run-overs,
  chapter clears, average level and VITAE at the end) and a new `run-pacing` (per source, policy and node: the runs
  that entered it, the average nodes resolved before first entering it, the average level and VITAE on resolving it,
  and the rests and withdrawals taken there).
- **What a break is** (Confirmed by T (2026-11-01), detected in the driver, which holds the live state): `crash` (an
  exception out of a step), `stuck` (no legal move, or past the step cap), `fight-stuck` (a fight that does not end),
  `quest-unfinishable` (at a run's end an accepted quest whose next target no road reaches, by the open road rule),
  and `node-unresolved` (a node entered with an event that the run left before resolving, the start node and empty
  waypoints aside). `playRun` still throws on the first three (spec 113's A9); the batch catches them per run,
  records the break and goes on with the next seed; the last two are checked at each run's end.
- **The break key** (Confirmed by T (2026-11-01): persona plus node plus kind): `<persona>:<map>/<node>:<kind>`, for
  example `rusher:breakwater/bw-t3:stuck`. A run's breaks go to a JSON-lines file beside the run lines
  (`sim:run --breaks <file>`): the key, the kind, the persona, the character, the seed, the build sha, the message,
  and a state summary (map, node, step, screen, level, VITAE and max VITAE, deck size, active quests and their next
  step, the last ten run events).
- **Filing** (`scripts/sim-breaks.mjs`, a step of the nightly job, `issues: write`): one issue per key, titled
  `sim break: <kind> at <map>/<node> (<persona>)`, labelled `bug` and `sim-break` (created if missing), never a
  `triage:*` or `loop:opened` label, so `/triage` picks it up and routes it as a bug. The body carries the key in a
  hidden `<!-- sim-break-key: ... -->` marker, the seed, the persona, the build, the state summary and the command
  that replays it (`npm run sim:run -- --policy <persona> --runs 1 --seed <seed>`). A key with an open issue files
  nothing; a key whose issue was closed as completed is reopened with a comment naming the new seed and build (the
  fix did not hold); a key closed as not planned stays closed. At most 10 new issues a night; the rest are listed in
  the report. The step runs `if: always()` after the batch, so a crash still gets filed.
- **Never a gate** (D57; Confirmed by T (2026-11-01)). The batch step still exits non-zero after a `crash`, `stuck` or
  `fight-stuck` (as SM1g does), after filing; `quest-unfinishable` and `node-unresolved` are filed and never fail a
  step; no number fails anything; the job is never a required check.
- **Triggers** (Confirmed by T (2026-11-01): lane bots by hand only). `sim-runs.yml` plays the four personas on the
  schedule and after a successful `preview-build`; `workflow_dispatch` takes a `bots` input, `personas` (default),
  `lanes` (the four lane bots) or `all` (personas, lane bots and the wanderer). Only the scheduled run (and a dispatch
  at `main`) files breaks and writes the report; a preview-build run plays and posts only, so T's APK still has the
  bots' rows at its build.
- **The wanderer is not played nightly** (decided here). The explorer already walks to the nearest unfinished node,
  which is what the wanderer does, so a nightly wanderer adds runs and rows and tells T nothing new; it stays in the
  driver and in the `all` dispatch.
- **Volume** (revisited): 4 personas x 5 runs, about 0.4 MB a run, is about 8 MB a night, the same as today, plus
  about 8 MB per preview build; with 14-day retention D1 holds about 110-150 MB of bot rows at steady state. A
  dispatch can raise the run count by hand.
- **The report's shape** (Confirmed by T (2026-11-01): run health, pacing and coverage first). `docs/reports/sim/latest.md`
  opens with a generated-file comment and a stamp (`> measured at <sha>, <date>, <runs> runs per persona, seed 1`),
  then, in order:
  1. **Run health**: runs per persona that reached an end, broke, or are still open; each break of the night with
     its kind, node, seed and issue link (new, already open, or reopened).
  2. **Pacing**: per persona, where runs ended (`run-ends`, most first), each region's nodes resolved and the level
     and VITAE on leaving it (`run-pacing` grouped by `chapter1Content()`'s regions), and rests and withdrawals per
     run.
  3. **How hard is Chapter 1** (Confirmed by T (2026-11-01): keep it, as plain numbers): each persona's clear rate
     (chapter clears over runs), average end level and average end VITAE, never a test or a bar.
  4. **Coverage**: per kind (nodes, quests, enemies, hazards, items), how many of Chapter 1's the night's runs
     reached, then each one no persona reached tonight, and each one no persona has reached in any of the nights the
     history holds.
  5. **Since the last report**: per persona, clear rate, end level, end VITAE and the count of breaks, last line
     against this one, with both builds.
  Cards are left out: `card-vs-bot` stays on demand in `npm run api` (decided here; T said "last or not at all",
  and the lane bots no longer run nightly). Every night appends one line to `docs/reports/sim/history.jsonl`
  (Contracts), so the numbers outlive the 14-day rows. No thresholds file and no AUDIT row: breaks go to issues.
- **The same push path as measured truth** (Confirmed by T (2026-11-01)). The report job (`needs: sim`, `if: always()`
  so a night with breaks still reports) has `contents: write` on that job only, `GH_PAT || github.token`, job-level
  `concurrency: nexus-loop`, the `claude[bot]` identity; `git add -- docs/reports/sim/`, nothing to commit exits 0;
  commit `sim: nightly report <date>`; four tries of `pull --rebase` and push. When NX1e moves `measured-truth` to
  D119's PR path, this follows it (Follow-ups).
- **Retention** (Confirmed by T (2026-11-01)): a `sim` or `harness` row older than 14 days is deleted from the five
  tables; a `human` row never; `ballot_verdicts` is never read. `[triggers] crons = ["17 5 * * *"]` (after the 03:43
  batch), a `scheduled` handler beside `fetch`, deployed by `backend-deploy.yml`, no GitHub secret, no HTTP route. A
  run's age is its `play_runs.started_at`; an old run goes whole in one `db.batch` with every `run_events`, `fights`,
  `deck_events` and `puzzle_attempts` row of its `run_id`, its `play_runs` row last; run-less and orphan rows go by
  `received_at`. The cutoff is an ISO string the shape of the stored timestamps, never SQL `datetime()`. At most 200
  runs or 1000 rows per batch and 25 batches per cron run; the rest waits for the next night; one log line of counts.
  `0008` adds `(source, received_at)` on four tables and `(source, started_at)` on `play_runs`. Chunk 135.7 records
  the rule as a D-entry (proposed name `D3`).
- **Documentation follows the house pattern.** `docs/truth-sources.md` "Measured truth" gets a bullet for the sim
  report and the 14-day window; `.github/workflows/README.md` the triggers, the filing step and the report job;
  `CLAUDE.md` is unchanged (it names only `measured/latest.md`; the other measurements live in `truth-sources.md`).
- **Names.** Spec 135, aliases SM2a-SM2g; policies `cautious`, `reckless`, `explorer`, `rusher`; `PLAYER_WITNESS`;
  reports `run-ends`, `run-pacing`, `coverage`; scripts `sim:breaks`, `sim:report`; labels `bug`, `sim-break`; the
  folder `docs/reports/sim/`.

### Tests matrix

- Mechanics: the run-event validator for `quest-step` and the new `node-resolved` fields (present, absent, wrong
  type) and the kind-exhaustiveness test; `runRoadOptions` sets `elite`, `story` and `distanceToExit` on fixture maps;
  `chapter1Content()` lists every Breakwater node, quest, foe, hazard and item source exactly once and its gates in
  story order; each persona's seams over fixture contexts; `PLAYER_WITNESS` never spares and `greedy` is unchanged;
  the no-id guard over the persona files.
- Mobile: `run-log.test.ts` (a quest-completing kill logs `fight` then `quest` XP; a plain kill one; a befriend
  completing a quest only `quest`; each quest action logs a `quest-step`; `node-resolved` carries level and VITAE);
  a persona behaviour test over 10 seeds each (the explorer never leaves with reachable work; the rusher resolves no
  node that is neither story nor on its way and resolves fewer nodes than the explorer on each seed; the reckless
  never withdraws and never rests above half; the cautious never walks to an elite while other work is reachable),
  asserting no clear rate, level or VITAE; the batch records a break from a fixture stuck run and goes on; the two
  end-of-run checks over fixture runs; the breaks file's lines.
- Backend (workerd, local D1): `run-ends`, `run-pacing` and `coverage` over fixtures of all three sources; `0008`;
  the `scheduled` handler (old and young rows of all sources, a run with rows in every table, run-less and orphan
  rows, a small injected batch size, a second run deleting nothing).
- Root: `api.mjs` parses and prints the three reports; `sim-breaks.mjs` with a stubbed `gh` (new key files; open key
  files nothing; completed key reopens; not-planned key stays; the cap of 10); `sim-report.mjs` over fixture JSON
  (the five sections in order, the stamp, the history line, a first night, a night with no breaks, never-reached
  across history; a refused read exits non-zero and writes nothing).

### Verify gate

Per chunk, below. The root `npm test` (with `plan-check` and the deadlines lint) runs in every chunk.

### Commit body template

```
<what shipped, one paragraph>

Closes A<n>[, A<m>] of plan/135-sm2-sim-follow-ups.md.
Proof: <the chunk's proof and its result>.
```

### Follow-ups (out of scope)

- **The Merciful lane bot kills to grow** (the first draft's chunk, dropped by T, 2026-11-01): its lane-lead check in
  `axiomancer-mobile/sim/run-archetypes.test.ts` stays `it.failing` until a later plot, or until the game lets a
  sparing run build.
- **The greedy witness stops sparing**: it is what `measured-truth` plays, so changing it moves measured truth and
  needs its own plot.
- **Cards in the nightly report**, if T wants them back: a `card-vs-bot` section at the newest build holding T's and
  the bots' rows.
- **The sim report and the filing on D119's PR path** once NX1e changes how generated data lands.
- **Chapters 2-4 for the personas**, once they are playable end to end; **an LLM-driven player** (spec 113's
  Follow-up).
- **The retention window as data** T can change: a constant in `backend/src/retention.ts` for now.

### Chunk notes

#### SM2a (chunk 135.1)

- Proof: `npm run verify -w axiomancer-mechanics` and `npm run verify -w axiomancer-mobile`; the run-log tests show a
  quest-completing kill's two `xp-gained` events, each quest action's `quest-step`, and `node-resolved` with level and
  VITAE.
- Scope: `combat.play-run-contract.ts` (the kind, the fields, the validator); `state/run-log.ts` (`recordFightSettled`,
  `recordNodeResolved`, a `recordQuestStep`); `state/quest/store-actions.ts` call sites; tests;
  `axiomancer-mobile/docs/dev-tools.md`'s event list.
- Verify gate: mechanics, backend and mobile verify (the Worker re-exports the contract), root `npm test`. Reaches T on
  the next preview APK.

#### SM2b (chunk 135.2)

- Proof: `npm run verify -w axiomancer-mechanics`; `npm run chapter1-content -w axiomancer-mechanics -- --json` prints
  the content and the regions, pasted in the PR.
- Scope: `run-roads.ts` and `run-policy.types.ts` (the new fields), `axiomancer-mobile/sim/run-driver.ts` where it
  builds the travel context, `World/` or `Game/` for `chapter1Content()` and its CLI, `PLAYER_WITNESS`,
  `run-policy.wanderer.ts`; tests.
- Verify gate: mechanics and mobile verify, root `npm test`; `npm run measured:truth` gives the same cells at the same
  seed (the greedy witness untouched).

#### SM2c (chunk 135.3)

- Proof: `npm run verify -w axiomancer-mobile` with the persona behaviour test; `npm run sim:run -- --policy <each
  persona> --runs 3 --seed 1` printed in the PR (a reading, not a bar).
- Scope: `run-sim/run-policy.personas.ts` (the four), the registry, the barrel, the seams test in mechanics, the
  behaviour test in `axiomancer-mobile/sim/`.
- Verify gate: mechanics and mobile verify, root `npm test`.

#### SM2d (chunk 135.4)

- Proof: root `npm test` with `scripts/sim-breaks.test.mjs`; `npm run verify -w axiomancer-mobile`; a dispatched
  `sim-runs` at `main` with `bots: personas` plays the four, posts, and files (or reports none), linked in the PR.
- Scope: `axiomancer-mobile/sim/` (the batch catches per run; the two end-of-run checks; `--breaks <file>`);
  `scripts/sim-breaks.mjs` and `npm run sim:breaks`; `.github/workflows/sim-runs.yml` (the `bots` input, the persona
  defaults, the filing step with `issues: write`); `.github/workflows/README.md`.
- Verify gate: mobile verify, root `npm test`; `actionlint` if the repo runs it.

#### SM2e (chunk 135.5)

- Proof: `npm run verify -w backend`; the three reports return the expected rows over fixtures; `node --test
  scripts/api.test.mjs` covers their tables.
- Scope: `backend/src/reports.ts` (`REPORT_NAMES`, the SQL, the types), `scripts/api.mjs`, tests,
  `axiomancer-mobile/docs/dev-tools.md`'s report list.
- Verify gate: backend verify, root `npm test`.

#### SM2f (chunk 135.6)

- Proof: root `npm test` with `scripts/sim-report.test.mjs`; a dispatched `sim-runs` at `main` commits
  `docs/reports/sim/latest.md` and one `history.jsonl` line, linked in the PR.
- Scope: `scripts/sim-report.mjs` and `npm run sim:report` (it runs `chapter1-content` for the universe and the
  regions); the report job in `sim-runs.yml`; `.github/workflows/README.md`; `docs/truth-sources.md`.
- Verify gate: root `npm test`.

#### SM2g (chunk 135.7)

- Proof: `npm run verify -w backend` with the scheduled-handler tests; after deploy, the first cron run's log line and
  a `GET /v1/play-runs?source=sim` with no run older than 14 days, recorded in the PR or a follow-up comment.
- Scope: `backend/migrations/0008_retention_indexes.sql`, `backend/src/retention.ts`, `src/index.ts` (`scheduled`),
  `wrangler.toml` (`[triggers]`), tests; `scripts/backend-deploy.test.mjs` if it pins the toml; the D-entry; the
  retention line in `docs/truth-sources.md` and `axiomancer-mobile/docs/dev-tools.md`.
- Verify gate: backend verify, root `npm test`.

## Contracts

- **No save-data change**, no `GAME_STATE_VERSION` bump.
- **Run events, additive:** `node-resolved` gains optional `level: number` and `vitae: number`; new kind `quest-step`
  `{ questId: string; stepId: string | null; action: 'accept' | 'turn-in' | 'complete' }` in `RUN_EVENT_KINDS`.
- **Run policy contexts:** `RunRoadOption` gains `elite: boolean`, `story: boolean`, `distanceToExit: number | null`;
  `RunTravelContext` gains `unfinishedReachable: number`. Every existing policy ignores or reads them.
- **D1, additive only:** `0008` adds five indexes and nothing else. **Reports** under `/v1/reports/`, each taking
  `?build=` and `?source=`: `run-ends` rows `{ source, policyId, endNodeId, runs, runOver, chapterClear, avgLevel,
  avgVitaeEnd }`; `run-pacing` rows `{ source, policyId, nodeId, runs, avgResolvedBefore, avgLevel, avgVitae, rests,
  withdrawals }`; `coverage` rows `{ source, policyId, kind: 'node'|'quest-step'|'enemy'|'hazard'|'item', id, runs,
  count, cleared }`.
- **The breaks file:** one JSON object per line, `{ key, kind, persona, characterId, seed, buildCommit, message,
  state }`.
- **`docs/reports/sim/history.jsonl`**, append-only: `{ date, commit, runsPerPersona, seed, personas: { <id>: { runs,
  chapterClear, runOver, open, avgLevel, avgVitaeEnd, breaks } }, reached: { node: [...], quest: [...], enemy: [...],
  hazard: [...], item: [...] } }`.

## Acceptance

- **A1** The run-event contract defines `quest-step` (`questId`, `stepId`, `action`) and optional `level` and `vitae`
  on `node-resolved`; the validator accepts an event without the new fields and rejects a wrong type; the
  exhaustiveness test covers the new kind.
- **A2** The app logs a `quest-step` at every quest accept, turn-in and completion, and `node-resolved` carries the
  player's level and VITAE after the node; each call site has a test under a mocked fetch.
- **A3** When a fight completes a quest, the run log holds an `xp-gained` `from: 'fight'` for the foe's XP and one
  `from: 'quest'` for the rest; a plain kill logs one `fight` event; a befriend that completes a quest logs only
  `quest`.
- **A4** `RunRoadOption` carries `elite`, `story` and `distanceToExit`, and `RunTravelContext` carries
  `unfinishedReachable`, all read from the map, the pools and the chapter questline; tests over fixture maps cover
  each.
- **A5** `chapter1Content()` and `npm run chapter1-content -w axiomancer-mechanics -- --json` list the Breakwater's
  nodes (kind, gate, story or side), quests and steps, staged enemies, hazards and payable items, and its regions in
  story order, each exactly once.
- **A6** `PLAYER_WITNESS` is the greedy witness with the mercy signature off and `mercyChoice: 'exploit'`; the
  wanderer fights with it; `combat.sim-policies.ts` is unchanged and `npm run measured:truth` gives the same cells at
  the same seed.
- **A7** The `cautious`, `reckless`, `explorer` and `rusher` policies ship in `run-sim/` and `RUN_POLICY_IDS`, each
  opening as the first playable roster character and fighting with `PLAYER_WITNESS`, every rule as the Design states
  and read from data (the no-id guard covers them); seam tests cover each persona's rests, roads, withdrawals, trips
  and hazard pick.
- **A8** A behaviour test plays each persona over 10 seeds through the driver and checks it did what its name says
  (the Tests matrix's four checks), asserting no clear rate, level or VITAE.
- **A9** The sim batch records a `crash`, `stuck` or `fight-stuck` run as a break and goes on with the next seed, and
  checks `quest-unfinishable` and `node-unresolved` at each run's end; `sim:run --breaks <file>` writes one line per
  break with the key `<persona>:<map>/<node>:<kind>` and the state summary; it still exits non-zero after a crash,
  stuck or fight-stuck run, and never for the other two.
- **A10** `npm run sim:breaks -- --file <breaks>` files one issue per new key (title, `bug` and `sim-break` labels,
  the hidden key, the seed, persona, build, state summary and replay command), files nothing for an open key, reopens
  a key closed as completed with a comment, leaves a key closed as not planned, and files at most 10 a night; tests
  stub `gh`.
- **A11** `sim-runs.yml` plays the four personas on the schedule and after a successful `preview-build`, takes a `bots`
  input (`personas`, `lanes`, `all`) on `workflow_dispatch`, runs the lane bots only by hand, and runs the filing
  step (`if: always()`, `issues: write`) after the scheduled batch and a dispatch at `main` only; no step fails on a
  number; `.github/workflows/README.md` says so.
- **A12** `run-ends`, `run-pacing` and `coverage` join `REPORT_NAMES` (Worker and `scripts/api.mjs`) with the
  Contracts' rows, narrowed by `?build=` and `?source=`; `npm run api` prints each; Worker tests cover a build, a
  source and an empty table.
- **A13** `npm run sim:report -- --build <sha>` reads the three reports and `run-summary` from the Worker and
  `chapter1Content()`, writes `docs/reports/sim/latest.md` with the stamp and the five sections in the Design's order
  (run health, pacing, how hard is Chapter 1, coverage, since the last report; no cards), and appends one
  `history.jsonl` line; it exits non-zero only on a crash, a refused or failed read, or a missing URL or token, and
  then writes nothing.
- **A14** The report job in `sim-runs.yml` (`needs: sim`, `if: always()`, after the schedule and a dispatch at `main`)
  runs `sim:report` at the batch's sha and commits `docs/reports/sim/` through `measured-truth.yml`'s push path;
  `docs/truth-sources.md` "Measured truth" names the report.

## Open questions

(None. T answered every call on 2026-11-01; the first draft's call #1 is confirmed above.)

## Chunks

Measure: 14 open · 3 closed · next A18

- [ ] **135.1** The run log carries pacing and coverage, and a quest's XP is the quest's · M · closes A1, A2, A3 · needs — · alias: SM2a
- [ ] **135.2** What a player sees on the road, Chapter 1 as data, and a witness that kills · M · closes A4, A5, A6 · needs — · alias: SM2b
- [ ] **135.3** The four personas · M · closes A7, A8 · needs 135.2 · alias: SM2c
- [ ] **135.4** Breaks caught and filed; personas nightly, lane bots by hand · M · closes A9, A10, A11 · needs 135.3 · alias: SM2d
- [ ] **135.5** Pacing and coverage on the server · M · closes A12 · needs 135.1 · alias: SM2e
- [ ] **135.6** The nightly sim report T reads · M · closes A13, A14 · needs 135.4, 135.5 · alias: SM2f
