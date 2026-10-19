# Phase CR1 — Live combat on its own route

> Agent-facing brief, plotted by T (`/plot`, 2026-10-15). Navigation
> only: no rule, card, keyword, art, copy, engine or save-shape change
> (D37, D88). Ship without asking; record judgment calls in the commit
> body.

## Sources

- T's request, 2026-10-15: "combat is no longer rendered as a modal over
  top of the exploration map but instead its own unique screen", on its
  own native-stack route presented like `hazard/index`.
- T's answers in the plotting session (AskUserQuestion, 2026-10-15):
  1. the live fight lives in the store, like hazard; no mid-fight save;
  2. `EncounterModalOverlay` is deleted;
  3. live combat takes the `/combat-encounter` route name, and the dev
     sandbox that held it is deleted "and any testing around what USED
     to be there. That's legacy code from pre v1";
  4. labyrinth fights use the same route; its dead boss-outcome wiring
     is filed, not fixed.
- This supersedes PF4's "Not a separate route" decision
  (`plan/phases/phase_PF4_no_map_under_combat.md`, Decisions). PF4 is
  shipped (#553); its `onModeChange` / `fightOnScreen` gate is removed
  here because the map is no longer under the fight at all.
- Code read for this brief (origin/main `4893340f`), paths under
  `axiomancer-mobile/`:
  - `components/event/EncounterModalOverlay.tsx`: modes `prelude`,
    `combat`, `aftermath`. The prelude renders one backdrop frame and
    auto-engages (`handleFight`, lines 115-119, 225-227). The `aftermath`
    mode needs `lastOutcome`, which only `exitCombatWith` sets, and no
    production code calls `exitCombatWith`; victory, defeat and mercy
    all end through the panel's own summary and `onExit`
    (`handleHazardExit`, 158-165: defeat → `resetRun({keepCharacter})` +
    `resetRunStats()`; then `exitCombat()` and `closeEncounterModal()`).
  - Hosts: `app/(tabs)/exploration/index.tsx` (`onEncounterFight`
    271-282, `onEncounterFlee` 288-290, resume-on-mount 197-208,
    `fightOnScreen` 216-217, the `StatusCard` skip 299) and
    `app/labyrinth/index.tsx` (mount 383-390, no resume). `app/event/index.tsx`
    does not host the overlay (header comment only).
  - `state/combat-mode.tsx`: `inEncounterModal`, `openEncounterModal`,
    `closeEncounterModal` exist for the overlay; `app/(tabs)/_layout.tsx`
    reads `inEncounterModal` to hide the tab bar (`tabBarHidden`) and
    lock four tabs. `components/HardwareBackHandler.tsx:24-27` locks
    Android back on `inCombat`.
  - `state/actions.ts:618-640` `beginHazardEncounter` stages
    `currentEncounter` via `startCombat`;
    `state/presenters/navigation.engine.ts:68-76` `selectResumableFight`
    reads it (enemy, `fleeAllowed` false for boss/unique).
  - `components/combat/encounter/CombatEncounterPanel.tsx`: engine state
    is panel-local `useState` (325), bootstrapped once from props
    (385-408); `persistOutcome` writes back through `endCombat` (179-227);
    it must mount full-bleed from the window origin (9-12).
  - Persistence: `currentEncounter` is not in the durable slice
    (`axiomancer-mechanics/src/Game/store.ts:290-300`). Since R9a a fight
    leaves `world.currentMap.pendingArrival` owed, so a reload replays the
    node's arrival and the fight starts again
    (`state/e2e/start-node-arrival.engine.test.tsx:197-233`).
  - Precedent: `components/HazardGate.tsx` (global, mounted in
    `app/_layout.tsx`) pushes `/hazard` when the store has a session; the
    hazard screen reads the store and backs out when the session ends.
- Decisions: **D37/D88** (no content touched), **D77** (perf measured and
  reported), **D84** (code by `loop:pr` PR), **D93** (this plot lands by
  PR), R9a (`pendingArrival` owed until the fight settles).

## Outcome

A live fight, from the map or the labyrinth, is its own full-screen
`/combat-encounter` route that the player cannot back or swipe out of;
the hosts no longer render combat, and every overlay-era workaround and
the pre-v1 dev sandbox are gone.

**Measure:** `npm run verify -w axiomancer-mobile`;
`node axiomancer-mobile/scripts/exploration-combat-roundtrip-e2e.mjs` and
`node axiomancer-mobile/scripts/combat-round-e2e.mjs` (live) pass; the new
`node axiomancer-mobile/scripts/labyrinth-combat-roundtrip-e2e.mjs`
passes; the A7 grep returns nothing; and the Sentry `combat.drag.*` p75
on a preview APK is reported for the 7 days before CR1a merged and after
CR1b (CR1c).

## Acceptance

- **A1** A global `CombatGate` (beside `HazardGate` in `app/_layout.tsx`)
  starts the fight when the event VM is a `combat-prelude` (the overlay's
  auto-engage, moved: `beginHazardEncounter`, `enterCombat`) and pushes
  `/combat-encounter` once per fight while `currentEncounter` is staged.
  Map fights reach the route this way; `exploration-combat-roundtrip-e2e.mjs`
  waits for a URL ending `/combat-encounter` and passes.
- **A2** `/combat-encounter` is the live fight: registered
  `fullScreenModal`, `gestureEnabled: false`; it reads the foe and
  `fleeAllowed` from `selectResumableFight` and renders
  `<CombatEncounterPanel persistOutcome>` full-bleed with today's
  `region`, flee and exit behaviour (defeat resets the run with the
  character kept; every exit calls `exitCombat`, then leaves the route).
  A screen test pins each exit: victory, defeat, mercy, withdraw.
- **A3** Android hardware back and the iOS swipe cannot leave a fight: a
  test fires the hardware-back handler while the route is mounted and the
  route stays; `gestureEnabled: false` is pinned by the route-options
  test.
- **A4** Opening `/combat-encounter` with no staged fight (cold web load,
  deep link) leaves the route at once: back if there is a stack, else
  replace to `/exploration`. A reload or web refresh mid-fight therefore
  lands on the map, whose owed `pendingArrival` replays the arrival, and
  the gate returns the player to `/combat-encounter` with the fight
  restarted. A test pins the empty-route redirect; the roundtrip e2e
  reloads mid-fight and asserts the URL ends `/combat-encounter` again.
- **A5** Labyrinth fights use the same gate and route; `app/labyrinth/index.tsx`
  no longer mounts combat. The new `scripts/labyrinth-combat-roundtrip-e2e.mjs`
  enters a labyrinth room fight, reaches `/combat-encounter`, withdraws or
  wins, and asserts the URL is back on `/labyrinth` with the room shown.
- **A6** The pre-v1 dev sandbox is deleted: the sandbox screen body of
  `app/combat-encounter/index.tsx` (mock foe, demo deck, `persistOutcome
  false`, `__AXM_COMBAT_DECK__`), `components/DebugCombatSandbox.tsx` and
  its test and its dev-menu entry, `state/e2e/combat-encounter.screen.test.tsx`,
  `scripts/combat-encounter-e2e.mjs`, and the default `MODE=sandbox` of
  `scripts/combat-round-e2e.mjs` (live becomes the only mode).
- **A7** The overlay era is deleted: `EncounterModalOverlay` and its test,
  `ChainBarFixed`, `ModalRivet`, `inEncounterModal` /
  `openEncounterModal` / `closeEncounterModal`, the tab-bar hiding and
  tab locking in `app/(tabs)/_layout.tsx`, `fightOnScreen`, `overlayMode`
  / `onModeChange`, and the exploration `StatusCard` skip.
  `git grep -nE "EncounterModalOverlay|inEncounterModal|openEncounterModal|closeEncounterModal|fightOnScreen|onModeChange|encounter-modal-|ChainBarFixed|ModalRivet" -- axiomancer-mobile scripts .github`
  returns nothing.
- **A8** Every tool that cold-entered the sandbox reaches a fight through
  the live path instead (`/dev` → `debug-trigger-encounter-encounter`,
  wait for `/combat-encounter`) and still runs: `perf-web.mjs`,
  `critique-drive.mjs`, `fresh-eyes-capture.mjs`, `smoke-screens.mjs`,
  `combat-drag-perf.mjs`, `audit-capture.mjs`, `map-walk-e2e.mjs`, `fixture-gallery.mjs`, `android-drag-perf.sh`
  (comment), `package.json` `e2e:combat` / `e2e:minigames`,
  `scripts/ci-e2e-scope.mjs`, and the `verify-mobile.yml` /
  `verify-mechanics.yml` combat steps. Seeded runs keep working because
  the live route passes `globalThis.__AXM_COMBAT_SEED__` to the panel's
  `seed` in dev builds only.
- **A9** No engine, rules, save-shape or copy change: `axiomancer-mechanics`
  is untouched, `durableSlice` is unchanged, and no player-facing string
  changes.
- **A10** The Sentry `combat.drag.*` p75 (each kind) on preview APKs is
  reported before and after in `docs/perf/combat-drag-baseline.md`, with
  the screen transaction combat frames now land in
  (`combat-encounter/index`).

## Save / schema contracts

None. `currentEncounter` stays transient; no migration.

## Carrier sweep

Not an R-phase. None.

## Decisions made upfront — DO NOT ASK

- **The fight lives in the store (T).** The route reads
  `currentEncounter` through `selectResumableFight`; the panel keeps its
  engine state locally, as today. No mid-fight checkpoint: a reload
  restarts the fight, which is today's behaviour since R9a.
- **One global gate, not host pushes.** `CombatGate` mirrors `HazardGate`
  (latch per fight, `setTimeout(0)`, retry on throw) and owns the
  auto-engage the overlay did, so neither host carries combat code and
  the two hosts cannot disagree. `fleeAllowed` comes from
  `selectResumableFight` (false for boss/unique), the same rule resume
  already uses.
- **The overlay is deleted, not moved (T).** Its prelude is one frame and
  its aftermath mode is unreachable in production. The aftermath panels
  themselves (`components/event/aftermath/*`) stay: `app/devaftermath`
  renders them. Only the overlay's use of them goes.
- **`/combat-encounter` is the live route (T).** The sandbox is pre-v1
  legacy. "Testing around what used to be there" means route-level and
  script-level sandbox tests (A6). The panel and board unit suites that
  build a fight from `state/mocks/combat.mock.ts` test live code and
  stay for now. T ruled 2026-10-19: replace them with tests that start from a
  real encounter (a fixture save), then delete the mock (Phase CT1).
- **`inCombat` stays.** `enterCombat` / `exitCombat` still drive the
  Android back lock and the run's `encountersFaced`; only the overlay's
  `inEncounterModal` family goes.
- **The tab bar needs no hiding.** A `fullScreenModal` route covers the
  tabs, as hazard does.
- **Leaving the route** is `router.back()` when it can go back, else
  `router.replace('/exploration')`, for both exit and the empty-route
  case.
- **The labyrinth's boss-outcome recording is not fixed here (T).** It
  reads `lastOutcome`, which live combat never sets; filed under
  Follow-ups.
- **CR1c is attended.** The Sentry numbers come from T's preview APK
  play and the Sentry account; the loop cannot produce them.

## Commit body template

```
feat(mobile): live combat on its own route — phase <id>

<what this slice moved or deleted>. Acceptance <ids>.
```

## DoD

A1 to A9 ticked, each by its phase below. A10 was dropped with CR1c (T, 2026-10-15): Sentry had no performance data from before the route to compare against.

## Follow-ups (out of scope)

- Labyrinth boss outcome: `app/labyrinth/index.tsx:102-115` records the
  boss result from `lastOutcome`, which live combat never sets, so boss
  wins are not recorded. Rewire it onto the route's exit outcome.
- Labyrinth mid-fight reload: the labyrinth has no resume path; a reload
  mid-fight returns to the map (A4), not the room.
- `/hazard` has no Android back lock (`HardwareBackHandler` locks only
  combat, rest and paced events); back can pop it while its session
  lives and `HazardGate`'s latch will not re-push.
- `state/combat-mode.tsx` `lastOutcome` / `aftermathData` /
  `exitCombatWith` become fully unused once the overlay goes; delete them
  with the labyrinth fix above.

## Phases

### CR1a — The route and the gate, map and labyrinth · L · closes A1, A2, A3, A4, A6, A8, A9 · requires nothing
Measure: `npm run verify -w axiomancer-mobile`; `exploration-combat-roundtrip-e2e.mjs` (with the mid-fight reload) and `combat-round-e2e.mjs` (live) pass; every A8 tool runs.
- **Scope:** `axiomancer-mobile` and root `scripts/`, `.github/workflows/`.
  New `components/CombatGate.tsx`, mounted in `app/_layout.tsx`.
  `app/combat-encounter/index.tsx` rewritten as the live route (A2, A4),
  route options `gestureEnabled: false`. Exploration and labyrinth stop
  mounting `EncounterModalOverlay` and drop `onEncounterFight` /
  `onEncounterFlee` / resume-on-mount / `activeEnemy` (the gate and route
  own them). The overlay file and the `inEncounterModal` family may stay
  as dead code until CR1b. Sandbox deletions (A6); tooling repointed
  (A8).
- **Consumers:** `lib/platform/router.ts` route table and linking (name
  unchanged); `state/presenters/navigation.engine.ts` comment that
  Continue never lands on the sandbox (Continue still must not land on
  the route without a fight: A4 covers it); `docs/E2E_INVENTORY.md`,
  `docs/playtest-guides/combat.md`, `docs/combat.md`, `docs/dev-tools.md`.
- **Tests:** new `components/__tests__/CombatGate.test.tsx` (engages on a
  prelude, pushes once per fight, re-arms after the fight ends); new live
  route screen test replacing `combat-encounter.screen.test.tsx` (each
  exit, empty-route redirect, hardware back held); `app-routes` test pins
  the route options; `mid-fight-resume`, `start-node-arrival`,
  `map-under-combat*`, `cross-screen-integration` rewritten onto the
  gate and route; the roundtrip e2e gains the reload step.
- **Verify gate:** `npm run verify -w axiomancer-mobile`; the two e2e
  scripts above; `node scripts/ci-e2e-scope.test.mjs`.

### CR1b — Delete the overlay era, labyrinth e2e · M · closes A5, A7 · requires CR1a
Measure: the A7 grep returns nothing; `labyrinth-combat-roundtrip-e2e.mjs` passes; `npm run verify -w axiomancer-mobile`.
- **Scope:** delete `EncounterModalOverlay`, its test, `ChainBarFixed`
  (+ test), `ModalRivet`; remove `inEncounterModal`,
  `openEncounterModal`, `closeEncounterModal` from `state/combat-mode.tsx`
  and `test-utils/withAllProviders.tsx`; remove tab hiding and tab
  locking from `app/(tabs)/_layout.tsx`; remove `fightOnScreen`,
  `overlayMode` and the `StatusCard` skip from exploration. New
  `scripts/labyrinth-combat-roundtrip-e2e.mjs` (A5), added to
  `docs/E2E_INVENTORY.md`.
- **Tests:** `combat-mode.engine.test.tsx` loses the modal cases; the
  tabs layout test asserts no tab locks during combat (the route covers
  them); comments in `event.engine.ts`, `aftermath.engine.ts`,
  `DebugTriggerEncounter.tsx`, `DebugEnemyPicker.tsx`,
  `state/dev/enemy-picker.ts`, `EventGate.tsx` updated.
- **Verify gate:** `npm run verify -w axiomancer-mobile`; the three
  roundtrip/round e2e scripts.

### CR1c — Sentry before and after (attended) · S · closes A10 · requires CR1b
Measure: `docs/perf/combat-drag-baseline.md` carries a before/after table of `combat.drag.*` p75 per kind and the screen transaction, from T's preview APK.
- **Scope:** docs only. T builds a preview APK after CR1b merges and
  plays at least 10 fights; the session reads Sentry (T's account) for
  the 7 days before CR1a merged and the window after, per drag kind.
- **Tests:** none.
- **Verify gate:** none (docs only).
