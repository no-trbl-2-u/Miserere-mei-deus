# Phase DY1 — The first death comes back dying

> Agent-facing brief, plotted by T (`/plot`, 2026-10-28, run unattended on
> T's word relayed from an attended session). T's rule: a player whose VITAE
> reaches 0 in a fight does not lose the run the first time. They come back
> with 1 VITAE and a "dying" status, standing where they were before the
> fight or hazard, and that node stays open to retry. A second death while
> dying ends the run as a defeat does today. A rest removes dying. T needs it
> for the Nov 16 MVP: Chapter 1's boss is fought again after a loss in the
> QL1 questline (open PR #1001).

## Sources

- The `/plot` request (T, 2026-10-28), T's five rules, recorded below as
  Confirmed by T.
- **D106** (each region is a chapter; the Breakwater is Chapter 1, the Nov 16
  MVP), **D88** (content from a T-approved brief: the notice line is T's
  copy), **D57** (the measured report is a measurement, not a gate), **D93**
  (lands by `plot` PR), **D101** (T merges `plot` PRs).
- Phase R9a (`plan/steps/01_build_plan.md`): a fight leaves its arrival owed
  (`pendingArrival`) until it settles, so a reload mid-fight re-offers it.
  DY1 keeps that and adds that a lost fight never settles.
- Phase ER1 (`plan/phases/phase_ER1_elite_respawn.md`): a claimed rest is the
  trigger that brings fought elites back. DY1 uses the same trigger to clear
  dying.
- Open PR #1001 (`loop/plot-QL1-breakwater-questline`, brief
  `plan/phases/phase_QL1_breakwater_questline.md` on that branch, read at
  b784a80): QL1b scopes "a boss fight settles only on victory or friendship;
  defeat or flee leaves it unspent" (its A9) and T's rule that fleeing a
  fight does not complete its node. DY1 does not edit that PR and does not
  scope flee (see Decisions).

## What exists

Checked on `main` at the plot's base:

- **A defeat ends the run, but only in the app.** The engine's `END_COMBAT`
  (`axiomancer-mechanics/src/Game/game.reducer.ts`) settles the node on
  every outcome, defeat included (`settleArrival`), and does nothing else on
  a defeat. The run reset is mobile's: `app/combat-encounter/index.tsx`
  `onExit('defeat')` calls `actions.resetRun({ keepCharacter: true })` and
  `resetRunStats()`. `resetRun` (`state/actions.ts`) posts the play log's
  `run-end` deck event, dispatches the engine `RESET_RUN` (fresh `runId`,
  fresh world at `bw-1`, full VITAE, empty quests and flags; the character,
  codex and rng kept) and clears any Labyrinth session.
- **A hazard can kill.** `claimHazardRewardsAction`
  (`axiomancer-mobile/state/hazard/store-actions.ts`) treats a crossing whose
  net VITAE swing reaches `health <= 0` (`isDefeated`) as a death: spoils
  forfeit, `resetRun({ keepCharacter: true })`, a `hazard-death:<ts>`
  tombstone flag, session cleared, `died: true`. Pinned by
  `state/e2e/hazard-out-of-combat-death.engine.test.ts`. The engine's own
  node hazard (`resolveHazard`, `World/MapEvents/handlers.ts`) applies flat
  `damage` with `applyDamage` (floored at 0, no death); mobile restores the
  pre-event player before the minigame, so only the CLI and engine tests
  feel that damage, and today it can leave the player standing at 0 VITAE.
  The puzzle demos (`Game/hazard-puzzle.claim.ts`) floor at 1 and report
  `lethal`; they are dev-menu only.
- **The previous node is not recorded.** `MapState`
  (`World/types.ts`) holds `currentNode` and `pendingArrival`, no "came
  from". The engine arrival is `moveToNode` (`World/world.reducer.ts`);
  mobile has its own move (`moveToAction`, `state/actions.ts`) that writes
  the arrival with a private `writeArrivalNodeId`, completes every
  non-encounter node on the move and unlocks its neighbours into
  `availableNodes`, and gates taps on `availableNodes`. A node is spent by
  `completedNodes` or `consumedNodes`; the frontier
  (`frontierNodes`) is every unvisited node touching a visited one, so an
  unspent fight node beside the player's node is open to walk back into.
  `placeOnNode` already shows how to un-spend a node.
- **No dying status.** `effectsLibrary` statuses are combat statuses with
  round durations, read by the combat engine off `player.effects`, and
  `RESET_RUN` clears `effects`; nothing out of combat carries a status. The
  save writes `durableSlice` (`Game/store.ts`): `version, runId, player,
  world, quests, flags, rngState, codex` and an optional `labyrinth`.
  Optional sparse fields ride saves with no hop (`pendingArrival`,
  `retiredEliteNodes`, `eliteUpgradeTakenNodes`). `GAME_STATE_VERSION` is 39.
- **Rest** (`state/rest/store-actions.ts` `claimRestChoiceOutcomeAction`):
  one claim per visit (heal 25%, upgrade or cut), which also mends hazard
  scars and calls `respawnElites`, then saves.
- **The map's status card** (`components/StatusCard.tsx`, on
  `app/(tabs)/exploration/index.tsx`) shows name, level and VITAE from the
  store; `components/exploration/NodeToast.tsx` is the map's toast.
- **The Labyrinth** is parked and unreachable in Act 1
  (`docs/game-model.md`); its screen and presenter already survive a run
  reset (`state/e2e/labyrinth-defeat-reset.engine.test.ts`).
- **Consumers that read a defeat:** the CLI (`src/CLI/game.cli.ts`) settles
  a fight node after every CLI fight and its `--route` walker stops at the
  first defeat as `blocked` ("never claims survivorship past a combat
  defeat"); `scripts/map-walk-e2e.mjs` plays the bw-6 fight to its end and
  expects a defeat to land on `bw-1`; `scripts/act1-walk-e2e.mjs` fails on
  any defeat (unchanged: it never loses); `state/e2e/combat-route.screen.test.tsx`
  pins "defeat resets the run"; the play log posts a fight row with outcome
  `defeat` (`fightRecorder`) and a `run-end` deck event from `resetRun`. The
  measured report (`docs/reports/measured/latest.md`) runs single fights
  from full VITAE and never a run, so it is unaffected and does not measure
  a revived fight at 1 VITAE ("not measured").

New: the dying status and its save field, the previous node, the death
verb, the return to the map, the dying mark, rest clearing it, and the
hazard death routed the same way.

## Outcome

A first death in a fight or hazard puts the player back on the node they
stood on before it, at 1 VITAE and dying, with that node open to retry; a
death while dying ends the run as today; a rest clears dying.

## Acceptance

- **A1** The save contract. `GameState.dying?: true` (run-scoped: absent
  means not dying; written by `durableSlice`, so it rides every save) and
  `MapState.arrivedFrom?: NodeId | null` (the node the player stood on when
  they arrived at `currentNode`). `moveToNode` writes it; a new exported
  `arriveAtNode(map, nodeId)` writes `currentNode`, `pendingArrival` and
  `arrivedFrom` together and mobile's `writeArrivalNodeId` delegates to it;
  `placeOnNode`, `teleportToNode` and a `travel` crossing clear it. No
  `GAME_STATE_VERSION` bump and no hop: a v39 save from before DY1 loads with
  neither field and plays as before. Engine test: a save round-trips both
  fields; a pre-DY1 save loads not dying with no `arrivedFrom`.
- **A2** The revive. A pure `resolveDeath(state, cause: 'fight' | 'hazard')`
  returns `{ state, outcome: 'revived' | 'run-over' }`, and the store verb
  `playerDied(cause)` (a durable `PLAYER_DIED` action) dispatches it and
  returns the outcome. Not dying: `'revived'`. VITAE is exactly 1 (max VITAE
  unchanged), `dying` is set, the player stands on `arrivedFrom`, the death
  node is unspent (out of `completedNodes` and `consumedNodes`, in
  `availableNodes` and `discoveredNodes`), `pendingArrival` is null and
  `currentEncounter` is cleared. `runId`, level, XP, deck, inventory, worn
  relics, shillings, quests and flags are unchanged. Engine test: a revive
  leaves the death node on the frontier, a legal move from `arrivedFrom`,
  and its event fires again on arrival.
- **A3** The final death. Dying: `'run-over'`, the same state `RESET_RUN`
  with `keepCharacter: true` gives (fresh `runId` and world, full VITAE),
  and `dying` absent after it. Engine test: two deaths in one run end it;
  a death, a `clearDying`, then a death revives again.
- **A4** Where the player comes back when there is no previous node.
  `arrivedFrom` absent, equal to the death node, or not a node of the
  current map: the map's starting node; if the death node is the starting
  node, the player stays on it with its arrival owed (`pendingArrival` set),
  as a reload re-offers a fight today. Engine test for both.
- **A5** A lost fight never settles. `END_COMBAT` with `'defeat'` leaves the
  arrival owed, the node unspent and its way on shut; victory and
  friendship settle as today; `'flee'` is unchanged by DY1 (QL1's). Engine
  test on a normal fight and an `isBoss` fight: defeat, `resolveDeath`,
  walk back, win, and the node settles and opens its way on.
- **A6** The engine's other death sites. `clearDying(state)` is exported
  for the rest claim. A node hazard (`resolveHazard`) whose flat `damage`
  takes VITAE to 0 is a death: `resolveMapEvent` returns the state
  `resolveDeath(…, 'hazard')` gives, not a player standing at 0. The CLI
  runs `resolveDeath` after a lost CLI fight instead of `settleArrival`; its
  `--route` walker still stops at the first defeat and reports `blocked`
  (its evidence contract: no survivorship claim past a death).
  `docs/game-model.md` ("Ending" and a Death bullet under the world rules)
  says the rule.
- **A7** A lost fight in the app. `app/combat-encounter/index.tsx`'s
  `onExit('defeat')` calls `actions.playerDied('fight')`. `'revived'`: the
  combat flag clears and the player lands on the map on the previous node,
  1 VITAE, the fight node drawn open and tappable, the state saved.
  `'run-over'`: today's path, unchanged (`resetRun`, so the `run-end` deck
  event, the Labyrinth cleanup and `resetRunStats`). Screen test:
  `state/e2e/combat-route.screen.test.tsx` covers both.
- **A8** Dying is shown. The map's status card shows a DYING mark beside
  VITAE while `dying` is set and nothing when it is not (copy from a
  presenter, colour from a theme token); the return to the map shows a
  one-line notice (placeholder copy marked `[content]`). Presenter and
  component tests for both states.
- **A9** A rest clears dying. `claimRestChoiceOutcomeAction` clears `dying`
  on every claimed rest (heal, upgrade or cut), in the same `setState` as
  the claim, before its `save()`. A potion, a level-up, a travel door or
  arriving at a rest and leaving unclaimed does not. Store test.
- **A10** The Labyrinth keeps today's rule. A defeat while a Labyrinth
  session is live calls `resetRun` as today, never `playerDied`;
  `state/e2e/labyrinth-defeat-reset.engine.test.ts` passes unchanged.
- **A11** The map walk proves it. `scripts/map-walk-e2e.mjs`'s bw-6 fight,
  played to its end by ending phases: on a defeat the player lands on
  `bw-4` (the node walked from) with 1 VITAE and the DYING mark, and bw-6 is
  still open; on a win, `bw-6` as today. The play log still posts the fight
  row as `defeat`, and posts `run-end` only on a run over (store test).
- **A12** A lethal hazard in the app. `claimHazardRewardsAction` routes a
  lethal crossing through `playerDied('hazard')`. `'revived'`: the spoils
  are forfeit (as today), VITAE 1, dying, the player back on the previous
  node, the hazard node unspent and open to cross again, the tombstone flag
  stamped, the session cleared, the state saved, `died: true` and a new
  `outcome: 'revived' | 'run-over'` on the result. `'run-over'`: today's
  reset and tombstone. The dev SKIP EVENT hazard path reports the same.
- **A13** The hazard tests. `state/e2e/hazard-out-of-combat-death.engine.test.ts`
  is rewritten for a first lethal crossing (revived, node open) and a
  lethal crossing while dying (run over), and keeps the survivable case
  (floor at 1, no tombstone); `npm run e2e:hazard` passes.

Measure: `npm run e2e:map-walk` lands a bw-6 defeat on bw-4 at 1 VITAE with
the DYING mark and bw-6 open; the DY1a engine tests pass a death, a retry
win, and two deaths ending the run.

## Scope

- `axiomancer-mechanics`: `Game/types.ts` (`dying?`), `World/types.ts`
  (`arrivedFrom?`), `World/world.reducer.ts` (`moveToNode`, `arriveAtNode`,
  the placement verbs, the un-spend helper the revive shares with
  `placeOnNode`'s logic), a new `Game/death.ts` (`resolveDeath`,
  `clearDying`), `Game/game.reducer.ts` (`END_COMBAT` defeat, `PLAYER_DIED`),
  `Game/actions.types.ts`, `Game/store.ts` (`playerDied`, `durableSlice`,
  `DURABLE_ACTIONS`), `World/MapEvents/resolve-map-event.ts` (the hazard
  death, the header comment's "every outcome"), the travel handler (clears
  `arrivedFrom`), `src/CLI/game.cli.ts`, `src/index.ts` exports;
  `docs/game-model.md`.
- `axiomancer-mobile`: `state/actions.ts` (`writeArrivalNodeId` delegates,
  `playerDied` action creator, the `resetRun` comment), `app/combat-encounter/index.tsx`,
  `components/StatusCard.tsx` and a presenter for the mark, the map's notice
  (`NodeToast` or the exploration screen's toast path),
  `state/rest/store-actions.ts`, `state/hazard/store-actions.ts`,
  `state/dev/skip-event.ts`, `scripts/map-walk-e2e.mjs`.
- Not touched: the flee path (QL1's), the measured report, the backend and
  the play-log contract (no new outcome), the Labyrinth.

## Consumers to update

- Engine exports: `resolveDeath`, `clearDying`, `arriveAtNode`, the
  `PLAYER_DIED` action and `playerDied` verb.
- Mobile: the combat route, the hazard claim, the rest claim, the status
  card, the dev SKIP EVENT hazard result, `map-walk-e2e.mjs`.
- CLI: `game.cli.ts`'s fight settle and `--route` walker.
- Docs: `docs/game-model.md`; `axiomancer-mechanics/docs/world.md` if it
  states "a fight settles its node on every outcome".

## Save / schema contracts

Two optional fields, `GameState.dying` and `MapState.arrivedFrom`, absent
in every save written before DY1 and read as "not dying" and "no previous
node" (A4's fallback). No `GAME_STATE_VERSION` bump, no hop in
`Game/game.migrate.ts`, nothing removed from a save. `durableSlice` gains
`dying` the way it carries `labyrinth` (only when set).

## Decisions made upfront — DO NOT ASK

- **The rule (Confirmed by T, 2026-10-28).** (1) When VITAE reaches 0 in a
  fight, the first time the player does not lose the run: they come back
  with 1 VITAE and a "dying" status. (2) A death while dying is game over:
  the run ends as a defeat does today. (3) Resting removes dying. (4) After
  the first death the player is returned to the spot before they triggered
  the fight or hazard, and that node stays incomplete so it can be retried;
  T named hazards too, and a hazard can kill today (`claimHazardRewardsAction`),
  so DY1c covers it. (5) Fleeing a fight does not complete its node: that
  rule is QL1's (PR #1001), not DY1's.
- **The spot before the fight is the node the player stood on before
  arriving at the fight or hazard node** `[T to confirm #1]`. Recorded as
  `arrivedFrom` on the arrival. Alternative: the player stays on the fight
  or hazard node itself with its event reset, so the fight starts again on
  the next tap and there is no walk back (no new save field, but no chance
  to step away to a rest first).
- **Dying is shown as a DYING mark on the map's status card beside VITAE,
  and one line of notice on the return** `[T to confirm #2]`. The notice is
  placeholder copy marked `[content]` until T rewrites it (D88).
  Alternatives: the mark also on the combat board's VITAE bar; or a
  full-screen beat before the map ("You come back from the edge").
- **Dying does nothing else: the only effect is that the next death is
  final** `[T to confirm #3]`. Alternatives: healing is weaker while dying
  (rest or potions); or max VITAE is held low until the rest.
- **Any claimed rest clears dying: heal, upgrade or cut** `[T to confirm
  #4]`. The night is the trigger, as it is for elites (ER1). Alternative:
  only the heal choice clears it.
- **Inside the Labyrinth, death stays a run reset** `[T to confirm #5]`. The
  Labyrinth is parked and unreachable in Act 1, so nothing a player meets
  changes; A10 keeps today's path. Alternative: the same rule there too,
  built when the Labyrinth is unparked (B9).
- **Dying is a run flag on `GameState`, not an effect.** Effects are combat
  statuses with round durations that the combat engine reads off
  `player.effects` and `RESET_RUN` clears; dying lives across fights, maps
  and reloads and ends only by rest or run over. A run-scoped field is
  cleared by every reset for free and never enters a fight's snapshot.
- **VITAE on the return is exactly 1**, whatever max VITAE is (T: "1 VITAE
  (HP)"). Nothing else is lost: XP, cards, relics, shillings and quest
  progress stay. A hazard's spoils are forfeit on the killing crossing, as
  today.
- **A lost fight never settles its node (A5), boss or not.** QL1b (A9 of
  `phase_QL1_breakwater_questline.md`, PR #1001) makes a lost boss fight
  leave its node unspent; DY1a's rule is the general case. Whichever lands
  second keeps the other's tests: if QL1b ships first, DY1a widens its boss
  check to every fight; if DY1a ships first, QL1b's boss-defeat case already
  holds and QL1b adds only flee and the sealed roads. Neither phase requires
  the other.
- **Flee is not touched.** T's rule 5 is scoped in QL1. DY1 changes only
  the defeat path and leaves `fleeEncounterAction` and `END_COMBAT`'s
  `'flee'` branch as they are.
- **The revive does not re-lock the way past a hazard.** Mobile's move
  completes a hazard node and unlocks its neighbours before the crossing is
  played; the revive un-spends the hazard node but leaves those neighbours
  as the move left them, as an abandoned crossing does today. Retrying is
  possible, not forced (T: "so it can be retried"). Follow-up below.
- **The CLI keeps its evidence contract.** The `--route` walker never claims
  a survivorship walk past a death, so the first defeat still stops it as
  `blocked`; the CLI's state after the fight follows the new rule.
- **The play log needs no new outcome.** A first death's fight row is a
  `defeat`, as now; `run-end` posts only when the run ends, because only
  `resetRun` posts it. No backend or contract change.
- **The engine's flat node-hazard damage dies the same way (A6)** so the
  engine has one death rule; mobile never applies that damage, so play is
  unchanged by it.
- **Not a measured question.** The measured report runs single fights from
  full VITAE; a retry at 1 VITAE is "not measured" (D57), and DY1 adds no
  measurement.
- **Not slotted behind QL1.** DY1 requires nothing from PR #1001 and stands
  on `main` alone; QL1's boss re-fight needs DY1b to be live in the app for
  the MVP run.

## Tests matrix

- Added (mechanics): `Game/e2e/death-rule.engine.test.ts` (A1-A5: the save
  round-trip, revive, run over, fallback, a lost fight unsettled and won on
  retry, a boss fight the same), cases in the hazard handler tests (A6), a
  CLI test that a lost CLI fight leaves the node unspent and `--route`
  still reports `blocked`.
- Added (mobile): the status-card mark and its presenter (A8), a rest-claim
  case (A9), a play-log case (A11).
- Rewritten: `state/e2e/combat-route.screen.test.tsx` (A7),
  `state/e2e/hazard-out-of-combat-death.engine.test.ts` (A13),
  `scripts/map-walk-e2e.mjs` (A11), any engine test that pins "`END_COMBAT`
  settles on defeat" (`Game/e2e/combat-retrigger.engine.test.ts` and
  `World/MapEvents` tests found by grepping `settleArrival` with `defeat`).
- Unchanged and must pass: `state/e2e/labyrinth-defeat-reset.engine.test.ts`
  (A10), `Game/e2e/run-loop.engine.test.ts`, `scripts/act1-walk-e2e.mjs`
  (never loses), the R9a mid-fight reload tests.

## Verify gate

`npm run verify -w axiomancer-mechanics`; `npm run verify -w
axiomancer-mobile` (every phase touches `src/Game/**` or `src/World/**`,
the cross-package checklist); `npm run e2e:map-walk` (DY1b) and `npm run
e2e:hazard` (DY1c); the root `npm test`.

## Commit body template

```
Phase DY1<a|b|c> — <title>

Closes <ids> of plan/phases/phase_DY1_dying.md.
<what changed>
Verify: <commands and results>
```

## DoD

A1-A13 ticked across DY1a-DY1c; the Measure met.

## Follow-ups (out of scope)

- Re-locking the way past a hazard on a revive (mobile opens it on the
  move, before the crossing): a fix to mobile's move order, if T wants a
  hazard to be unavoidable after a death.
- The Labyrinth's death rule, when the Labyrinth is unparked (B9), if T
  answers call 5 "the same rule".
- T's line for the return notice (`[content]`), with the Nov 10 copy
  sitting or the event-node UX plot.
- The puzzle demos' `lethal` result (dev menu only) through `playerDied`,
  if they ever go live: the live-hazard routing plot (W2, needs plot)
  carries the check.
- A measured retry at 1 VITAE, if a balance question needs it.

## Phases

### DY1a — The death rule in the engine, and the save · M · closes A1, A2, A3, A4, A5, A6 · requires nothing
Measure: `npm run verify -w axiomancer-mechanics` and `npm run verify -w
axiomancer-mobile`; `Game/e2e/death-rule.engine.test.ts` passes a death, a
retry win and two deaths ending the run.
- Scope: the mechanics half of Scope, plus mobile's `writeArrivalNodeId`
  delegating to `arriveAtNode` (so saves start recording `arrivedFrom`) and
  the `playerDied` action creator in `state/actions.ts` (wired to nothing
  yet). The app's defeat still calls `resetRun`, so play is unchanged.
- Consumers: engine exports; the CLI; `docs/game-model.md`.
- Save / schema: `dying?`, `arrivedFrom?`; no bump, no hop (A1).
- Tests: `death-rule.engine.test.ts`, the hazard handler cases, the CLI
  case, and the rewritten settle-on-defeat pins.
- Verify gate: both workspace verifies; the root `npm test`.

### DY1b — A lost fight in the app: back on the map, dying · M · closes A7, A8, A9, A10, A11 · requires DY1a
Measure: `npm run e2e:map-walk`: the bw-6 defeat lands on bw-4 at 1 VITAE
with the DYING mark and bw-6 open.
- Scope: `app/combat-encounter/index.tsx`, `components/StatusCard.tsx` and
  its presenter, the return notice, `state/rest/store-actions.ts`,
  `scripts/map-walk-e2e.mjs`.
- Consumers: the combat route; the status card; the rest claim.
- Save / schema: none new.
- Tests: `combat-route.screen.test.tsx` rewritten; the mark, rest and
  play-log cases; `labyrinth-defeat-reset.engine.test.ts` unchanged.
- Verify gate: `npm run verify -w axiomancer-mobile`; `npm run
  e2e:map-walk`; the root `npm test`.

### DY1c — A lethal hazard in the app · S · closes A12, A13 · requires DY1b
Measure: `hazard-out-of-combat-death.engine.test.ts` passes a first lethal
crossing (revived, node open) and a lethal crossing while dying (run over);
`npm run e2e:hazard` passes.
- Scope: `state/hazard/store-actions.ts` (`claimHazardRewardsAction`, its
  result type), `state/dev/skip-event.ts`.
- Consumers: the hazard claim and the dev SKIP EVENT hazard result.
- Save / schema: none new.
- Tests: `hazard-out-of-combat-death.engine.test.ts` rewritten.
- Verify gate: `npm run verify -w axiomancer-mobile`; `npm run e2e:hazard`;
  the root `npm test`.
