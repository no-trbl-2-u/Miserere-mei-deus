# Phase BE2 — Card and combat logging (the play log)

## Sources

- `/plot` from T, 2026-10-22 (attended): "Plot the new backend schema plan for the card logging." The plan is
  section 6 of `braindump/2026-10-21-backend-schema-plan.md`, written from T's request in the same session:
  "Give me a list of all the data we could collect that would help us while tuning, removing, and creating
  cards. For now it'll default to on since I'm the only player. But have an option in the dev menu to turn it
  off."
- Phase BE1 (`plan/phases/phase_BE1_solve_time_backend.md`): the `miserere-api` Worker, the D1 database
  `miserere`, the bearer token, the `/v1/` versioning rule, numbered migrations never edited, a failed post is
  dropped with no outbox, and its Follow-up "Playtester telemetry, which needs anonymous device IDs and a privacy
  note before the APK leaves T's hands". This phase is that telemetry for T alone, and keeps the follow-up's
  condition as a hard stop (Decisions, DoD).
- D84-D87 and D95 (code lands by PR and merges on a green adversarial review; a plan merges by T's hand), D93
  (`/plot` lands by a `plot` PR), D99 (cards are ordinary content; this phase reads cards and never edits one),
  D57 and the doctrine line "nothing grades the game from above" (`axiomancer-mechanics/CLAUDE.md`): every number
  here is a measurement for T to read, never a test bar.
- Code read while shaping this:
  - `axiomancer-mechanics/src/Combat/combat.encounter.types.ts:365` `CombatEvent`: the typed event stream
    (`card-played` with `useBottom` and `dieId`, `effect-landed`, `effect-fizzled`, `damage-dealt`,
    `player-healed`, `vitae-sacrificed`, `card-exiled`, `curse-added`, `global-entered/left`, `hand-drawn`,
    `dice-rolled`, `turn-dice-rolled`, `die-spent`, `die-banked`, `threat-fired`, `phase-resolved`,
    `mercy-opened`, `combat-ended`, and more). It lives in the combat state as `log: CombatEvent[]`
    (line 562). Events carry no timestamp and no player VITAE.
  - `axiomancer-mobile/state/actions.ts`: the `startCombat` bridge (line ~632) scales every live foe by
    `ENCOUNTER_ENEMY_HP_MULTIPLIER` (= `LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER`, 2, in
    `axiomancer-mechanics/src/Combat/live-encounter.ts:10`); the `endCombat` bridge (line 648) is the one place
    every fight ends. `wrapActionsWithLogging()` in `state/logging.ts` already instruments these actions.
  - `axiomancer-mobile/state/combat/store-actions.ts`: reward offers (`rollCombatCardRewards`, line 42) and the
    claim (`addRewardCard`, line 58). `state/cache/store-actions.ts` (lines 70, 114): the cache's card reward.
    `state/rest/store-actions.ts:144`: `removeCardFromCombatDeck`. Card upgrades have no mobile call site yet
    (UP1b onward builds them).
  - `axiomancer-mobile/components/combat/encounter/CombatEncounterPanel.tsx`: staging is component state
    (`stagedUids`, `unstageUid`, line 517) and the card detail popup is `setDetailCard` (lines 328, 629, 918).
  - `axiomancer-mobile/state/settings.ts`: player settings, documented as preferences "a NEW PLAYER can change
    from SETTINGS"; a dev switch does not belong there. `components/dev/DevToolsSections.tsx` holds every Debug
    affordance.
  - `axiomancer-mobile/app.config.ts`: `buildCommit()` already feeds the Sentry release; `lib/buildProfile.ts`
    reads `extra`. `lib/puzzleAttempts.ts`: BE1c's poster and its three-part gate.
  - `backend/`: `src/index.ts` routes one path; `src/contract.ts` re-exports the mechanics contract by path so
    the Worker does not bundle the engine.

## Outcome

Every fight T plays on a preview build, and every card T is offered, picks, skips or removes, is stored in D1
with the build it was played on, and one command prints per-card usage and the pool's gaps. A dev-menu switch,
on by default, stops all of it.

## Acceptance

- **A1** A play-log contract module in `axiomancer-mechanics` (pure types and validators, no I/O) defines
  `FightPost`, `DeckEventPost` and their row and list shapes, the routes `/v1/fights` and `/v1/deck-events`,
  and `COMBAT_EVENT_KINDS`, the list of every `CombatEvent['kind']`. A type-level test fails when a kind is
  added to `CombatEvent` and missing from the list. The module is exported through the barrel, and
  `backend/src/contract.ts` re-exports it by path as it does the attempt contract.
- **A2** Migration `backend/migrations/0002_play_log.sql` creates `fights` and `deck_events` (Save / schema
  contracts below). `0001` is unchanged.
- **A3** The Worker serves `POST` and `GET` on `/v1/fights` and `/v1/deck-events`: 401 without the token, 400
  naming each problem on a body the validator rejects (an unknown event kind included), 413 over the size cap,
  201 with `{ id, receivedAt }` on success. `GET` returns rows newest first, with `?enemy=` on fights and
  `?card=` on deck events. Worker tests cover each case in the Workers runtime against a local D1.
- **A4** A dev-settings store in `axiomancer-mobile/state/dev/` persists `playLogging` (default `true`) under
  its own AsyncStorage key, separate from player settings. The dev menu shows one row, "Card & combat
  logging", that reads and flips it; the value survives an app restart.
- **A5** The app knows its build commit (`extra.buildCommit`, read by a `getBuildCommit()` beside
  `getBuildProfile()`) and mints one session id per launch. `canSendPlayLog()` is true only when
  `isDevToolsEnabled()`, the BE1 API URL and token are set, and `playLogging` is on. With any of the three
  false, no play-log request is made and nothing is buffered. The BE1 puzzle poster's gate is unchanged.
- **A6** A fight recorder starts at the `startCombat` bridge and stamps every new combat log entry with
  milliseconds since the fight began and the player's VITAE at that moment. At the `endCombat` bridge it posts
  one `FightPost` exactly once: the outcome, the enemy id, the player level, the enemy HP multiplier, VITAE at
  start, end and lowest, the turn count, the deck at the start (an upgraded card keeps its `+` id), the stamped
  events, the build commit, the session id and `appBuild`. A failed post warns in dev and is dropped (BE1).
- **A7** The recorder also records three screen events in the same stream, stamped the same way: a card
  staged, a card unstaged before it was played, and the card detail popup opened (with the card id).
- **A8** Deck changes post one `DeckEventPost` each: a combat reward (the cards offered and the one picked, or
  a skip), a cache card reward, a removal at the rest site (the card and the deck size), and the run's end (the
  deck when `resetRun` is called). Each carries the build commit and session id, and passes the A5 gate.
- **A9** `npm run api -- <report>` (root, `scripts/api.mjs`) calls `GET /v1/reports/<name>` and prints a table,
  or JSON with `--json`. The Worker serves exactly two named reports whose SQL is fixed in
  `backend/src/reports.ts`, never taken from the client: `card-usage` (per card: fights in deck, drawn,
  played, held to end of turn, FREE vs paid, fizzled, offered, picked, skipped, removed; `--card <id>` for one)
  and `card-gaps` (per enemy: threats that overwhelmed a phase, dice left unspent at turn end by colour, and
  the threat or DoT tick that ended each lost fight). Both take `--build <sha>` to narrow to one build.
- **A10** `axiomancer-mobile/docs/dev-tools.md` documents the switch, the routes, the fields sent and
  `npm run api`; `AGENTS.md`'s `backend/` line names the play log. Both state that the switch defaults to on
  only while T is the only player.
- **A11** (attended) On a preview APK built from a commit carrying BE2a-BE2f, T fights once and takes or skips
  one card reward; `npm run api -- card-usage --build <that sha>` lists every card in that deck with its draw
  and play counts and the reward with its alternatives. T flips the switch off, fights again, and the fight
  count for that build does not change.

**Measure:** A11.

## Scope

- `axiomancer-mechanics`: the contract module beside the combat types, its barrel export and its tests.
- `backend/`: migration `0002_play_log.sql`, two route handlers and their table modules, `reports.ts`, the
  router, the body caps, tests.
- `axiomancer-mobile`: the dev-settings store and its dev-menu row; `extra.buildCommit` and the session id; the
  play-log gate and poster in `lib/`; the fight recorder wired at the two combat bridges in `state/actions.ts`;
  three screen-event calls in `CombatEncounterPanel.tsx`; the deck-event calls at the reward, cache, rest and
  run-reset call sites.
- Root: `scripts/api.mjs`, its test, the `api` npm script.
- No card, keyword, enemy or tuning change. No change to `puzzle_attempts`, its route or `puzzle:times`.

## Consumers to update

- `@mechanics` barrel (the contract module).
- `backend/src/contract.ts` (re-export by path).
- `axiomancer-mobile/docs/dev-tools.md`, `AGENTS.md` package layout line for `backend/`.
- The root `npm test` list in `package.json` (the `api` script's test).

## Save / schema contracts

- **No save-data change.** The dev switch lives in its own AsyncStorage key, never in a `GameState` or the
  player settings.
- D1 `fights`: `id` integer primary key, `received_at` (ISO, set by the Worker), `solver`, `session_id`,
  `build_commit` (nullable: a local dev session may not know it), `app_build`, `enemy_id`, `player_level`,
  `enemy_hp_multiplier` (real), `outcome`, `turns`, `vitae_start`, `vitae_end`, `vitae_low`, `deck_json`,
  `events_json`. Indexed on `build_commit` and `enemy_id`.
- D1 `deck_events`: `id`, `received_at`, `solver`, `session_id`, `build_commit`, `app_build`, `kind`
  (`reward` | `cache-reward` | `remove` | `run-end`; `upgrade` is reserved, see Follow-ups), `card_id`
  (picked or removed; null for a skip or a run end), `offered_json` (the alternatives shown, or null),
  `deck_json` (the deck after the change), `where_json` (node id and screen). Indexed on `card_id` and
  `build_commit`.
- Each event in `events_json` is the engine's `CombatEvent` unchanged, plus `ms` and `vitae`; a screen event is
  `{ kind: 'ui-staged' | 'ui-unstaged' | 'ui-detail-opened', cardId, ms, vitae }`. The validator accepts a kind
  only if it is in `COMBAT_EVENT_KINDS` or one of the three `ui-` kinds.
- All under `/v1/`; every field is new, so nothing already installed breaks. A breaking change takes `/v2/`.

## Decisions made upfront — DO NOT ASK

- **Default on, dev builds only** (T, 2026-10-22: "default to on since I'm the only player"). Production builds
  send nothing whatever the switch says.
- **The switch is a dev setting, not a player setting.** `state/settings.ts` documents itself as what a new
  player changes from SETTINGS; a telemetry switch in a dev build is not that.
- **Identity:** the solver name the dev tools already use, plus a per-launch session id. No device id, no
  account (BE1). **Before a preview APK is handed to anyone but T, the default flips to off and BE1's
  playtester follow-up (device ids, a privacy note) is plotted first.** This is in the DoD so it cannot drift.
- **One switch for the play log; puzzle timing keeps its own BE1 gate**, because HP4e depends on those posts.
  [T to confirm]
- **Raw events, stats on the server.** The phone sends what happened, never a computed rate; a new question is
  a new report, not a new APK.
- **The enemy HP multiplier is recorded per fight.** Live foes have double HP today, so a fight's length and
  damage only compare to the measured report once divided out.
- **Decision time is derived, not recorded.** The `ms` on `hand-drawn` and `card-played` gives it; no extra
  screen event.
- **Caps:** a fight body at most 1 MiB and 5000 events (D1 stores a row up to 2 MB); a deck event at most
  64 KiB. Over the cap is a 413 and the fight is dropped, not truncated.
- **Reports are a fixed whitelist on the Worker.** Ad hoc SQL stays with `wrangler d1 execute --remote` or the
  Cloudflare MCP, as BE1 decided.
- **Failed posts drop** (BE1). If dropped fights visibly thin the counts, the outbox follow-up comes back.
- **No pass or fail on any number.** `card-usage` and `card-gaps` print; nothing in `npm test` asserts a play
  rate. A printed-versus-applied mismatch stays a bug for the existing sims to catch, not this log.

## Tests matrix

- Mechanics: the contract validators (accepted fight, accepted deck event, missing field, wrong type, unknown
  event kind, over the event count); the `COMBAT_EVENT_KINDS` exhaustiveness test.
- Backend (Workers pool, local D1): A3's cases for both routes, `?enemy=` and `?card=` filters, both reports
  over fixture rows (one fight with a played card, a held card, a fizzle; one reward with a skip).
- Mobile: the dev-settings store (default on, persisted, bad bytes give the default); the gate (each of the
  three conditions false gives no call); the recorder over a scripted fight (stamps increase, VITAE low is the
  minimum, one post per fight, the deck is the start deck); the screen events; each deck-event call site with
  a mocked fetch.
- Root: `scripts/api.mjs` argument parsing and table formatting over fixture JSON.

## Verify gate

Per phase, below. The root `npm test` runs in every phase.

## Commit body template

```
<what shipped, one paragraph>

Closes A<n>[, A<m>] of plan/phases/phase_BE2_card_combat_logging.md.
Measure: <the phase's Measure line and its result>.
```

## DoD

A1-A11 ticked, each by the phase that closes it. `docs/dev-tools.md` states the flip-before-testers rule.

## Follow-ups (out of scope)

- **Upgrade events.** `upgrade` is reserved in `deck_events.kind`; the call goes in when UP1b's upgrade and
  replace-card actions exist on mobile. That phase adds one call; no migration.
- **The bot beside T** (`card-vs-bot`): the sims post the same per-card counts at the same commit. It needs the
  `runs` and `measurements` tables from sections 2-4 of the pitch, which are not plotted.
- **Build provenance on puzzle attempts and the rest of the pitch** (runs, measured truth as a series, loop
  ticks, alerts): sections 2-4 of `braindump/2026-10-21-backend-schema-plan.md`, a later `/plot`.
- **Playtester telemetry** (BE1 Follow-up): device ids and a privacy note, before the APK leaves T's hands.
- **An offline outbox**, if dropped fights thin the counts.

## Phases

### BE2a — The play-log contract and the Worker routes · M · closes A1, A2, A3 · requires nothing
Measure: `npm run verify -w backend` and `npm run verify -w axiomancer-mechanics`; the A3 cases pass against a
local D1.
- Scope: the mechanics contract module and barrel; `backend/migrations/0002_play_log.sql`; the two routes,
  their table modules and the router; the caps.
- Consumers: `@mechanics` barrel; `backend/src/contract.ts`.
- Tests: the mechanics validator and exhaustiveness tests; the Worker route tests.
- Verify gate: mechanics verify, backend verify, root `npm test`. The deploy workflow applies `0002` on merge.

### BE2b — The switch and the stamps · S · closes A4, A5 · requires nothing
Measure: `npm run verify -w axiomancer-mobile`; the dev menu shows the row on a dev session and the gate tests
pass.
- Scope: `state/dev/` dev-settings store; its row in `components/dev/DevToolsSections.tsx`;
  `extra.buildCommit` in `app.config.ts` and `getBuildCommit()` in `lib/buildProfile.ts`; the session id; the
  gate in `lib/`.
- Consumers: none outside mobile.
- Tests: the store, the gate.
- Verify gate: mobile verify, root `npm test`.

### BE2c — Each fight posts at its end · M · closes A6 · requires BE2a, BE2b
Measure: `npm run verify -w axiomancer-mobile`; the recorder test drives a scripted fight and asserts one post
with stamped events and the start deck.
- Scope: the recorder and the fight poster in `lib/`; the two calls at the `startCombat` and `endCombat`
  bridges in `state/actions.ts`.
- Tests: the recorder over a scripted fight; a failed fetch only warns; the gate off makes no call.
- Verify gate: mobile verify, root `npm test`.

### BE2d — Screen events · S · closes A7 · requires BE2c
Measure: `npm run verify -w axiomancer-mobile`; a panel test stages, unstages and opens the detail popup, and the
recorder holds the three `ui-` events in order.
- Scope: three recorder calls in `components/combat/encounter/CombatEncounterPanel.tsx` beside `setStagedUids`,
  `unstageUid` and `setDetailCard`.
- Tests: the panel test above.
- Verify gate: mobile verify (the visual suite unchanged: no pixel moves), root `npm test`.

### BE2e — Deck changes post · M · closes A8 · requires BE2a, BE2b
Measure: `npm run verify -w axiomancer-mobile`; each of the four call sites posts one deck event under a mocked
fetch.
- Scope: the deck-event poster in `lib/`; calls in `state/combat/store-actions.ts` (offer and claim or skip),
  `state/cache/store-actions.ts`, `state/rest/store-actions.ts`, and the `resetRun` bridge in
  `state/actions.ts`.
- Tests: one per call site.
- Verify gate: mobile verify, root `npm test`.

### BE2f — The reports and `npm run api` · M · closes A9, A10 · requires BE2a
Measure: `npm run verify -w backend`; both reports return the expected rows over fixtures; `npm run api --
card-usage --json` parses a fixture body.
- Scope: `backend/src/reports.ts` and its route; `scripts/api.mjs` and its test; the `api` script; the docs.
- Consumers: `axiomancer-mobile/docs/dev-tools.md`, `AGENTS.md`.
- Tests: the report SQL over fixture rows (D1 JSON functions over `events_json`); the script's parsing and
  table.
- Verify gate: backend verify, root `npm test`, prose verify for the docs.

### BE2g — T's check on a preview APK (attended) · S · closes A11 · requires BE2c, BE2d, BE2e, BE2f
Measure: A11, its output pasted into the PR.
- Scope: a preview build from `main` (`preview-build.yml`); T's fight, reward and switch-off fight; the
  `npm run api` output recorded in the phase's PR.
- Tests: none new.
- Verify gate: none beyond the root `npm test`.
