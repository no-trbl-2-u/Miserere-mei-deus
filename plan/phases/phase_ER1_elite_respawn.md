# Phase ER1 — Elites come back after a night's rest

> Agent-facing brief, plotted by T (`/plot`, 2026-10-26, run unattended on
> T's word in session). T's task, verbatim: "elite enemies respawn after a
> rest node is triggered." Engine rule plus one line on the rest screen; no
> card, keyword, enemy, relic or event copy changes (D88).

## Sources

- The `/plot` request above (T, 2026-10-26).
- Part plan: `plan/revamp/checkpoint.md` R9a item 2 ("a node is consumed when
  its encounter settles": victory, flee, defeat, mercy). ER1 keeps that rule
  and adds the one way back: a rest un-consumes settled elite nodes.
- Brief `plan/phases/phase_LR1_lane_relics.md`: LR1c's elite relic drop (A8,
  `rollEliteRelicDrop`, `ELITE_RELIC_DROP_CHANCE` 8%, "never a relic the player
  carries") and the decision "a lane's third relic comes only from an elite
  (T, 2026-10-25)". A respawned elite makes that drop repeatable; this brief
  says how (Decisions, call #4).
- Decisions: **D30** as amended by **D59** and the current Act 1 content (one
  elite per region, the Green Jelly), **D71** (elites drop relics at a low
  chance), **D100** / **D104** (the elite reward draws over the lane pool,
  unchanged here), **D88** (content allowed because T is asking), **D93**
  (lands by `plot` PR). The frontier rule (W-01 as amended by D1,
  `plan/bearings.md` "Traversal") is unchanged: a respawned node simply
  rejoins the frontier.
- Balance context: `docs/reports/measured/latest.md` (measured at 768dc7bf2):
  every Green Jelly cell (bw-8, cw-12, bc-8, ld-8) is a 100% win for every
  measured deck at the level a full clear brings. A respawned elite is
  therefore close to a free repeat. This is a **farm vector**, bounded only by
  the rest nodes (see Decisions).

## What exists

- **Node consumption (built).** `MapState.consumedNodes` and `completedNodes`
  (`axiomancer-mechanics/src/World/types.ts:207-248`) are the spent set;
  `isNodeSpent` and the frontier (`World/world.reducer.ts:55-95`, `moveToNode`
  at `:175-215`) derive everything from them, and nothing else is persisted.
  `resolveMapEvent` consumes a non-fight node on arrival
  (`World/MapEvents/resolve-map-event.ts`); an encounter is consumed by
  `settleArrival` (`:246`), which `END_COMBAT` runs for every outcome
  (`Game/game.reducer.ts:324-334`). So a won, fled or spared elite node is
  consumed alike; the save records no outcome per node.
- **Un-consuming (built, dev only).** `placeOnNode` (`World/world.reducer.ts`
  ~`:690-720`) already strips a node from `completedNodes` / `consumedNodes`
  for the `/dev` jump. ER1's verb is the same edit, done by the rule, for
  elite nodes only, and it does not move the player.
- **Elites (built).** One elite foe, the Green Jelly (`Enemy/enemy.library.ts:92`,
  `difficulty: 'elite'`), on one node per Act 1 region: `bw-8`, `cw-12`, `bc-8`,
  `ld-8` (`World/MapEvents/content.ts:209,341,470,589`), all level 3 (150 XP,
  `DEFAULT_XP_BY_DIFFICULTY.elite` 50). `World/e2e/act1-elites.engine.test.ts`
  reads them through `getNodeEventPool`. `isEliteEnemy` and `rollEliteReward`
  (`Combat/combat.rewards.ts:115,187`) pay the elite reward; mobile calls them
  in `state/combat/store-actions.ts:54`.
- **Elite relic drop (planned, not built).** LR1c (open row, requires nothing).
- **Rest (built).** Act 1 has 11 rest nodes: Breakwater 2 inns, Charcoal Wood,
  Beacon Crags and Lantern Deep 3 camps each (`content.ts` `BW_REST_NODES`,
  `CW_/BC_/LD_CAMP_NODES`). The node is consumed on arrival like any non-fight
  node; `app/rest/index.tsx` runs the rest-choice session
  (`World/RestChoice/restchoice.engine.ts`, `state/rest/store-actions.ts`).
  `claimRestChoiceOutcomeAction` (`state/rest/store-actions.ts:147`) applies
  the outcome, mends the hazard scar ("the night is the trigger, not the
  choice"), and saves once. `state/dev/skip-event.ts` also claims a rest.
- **Respawn (new).** No respawn, re-farm or elite-repeat rule exists in `plan/`
  or the code; the `world.reducer.ts` comments say a spent node "cannot be
  re-entered or re-farmed". ER1 amends that sentence for elites after a rest.

## Outcome

After the player claims a rest, every elite node already fought on the map
they are on is live again: the same foe at the same level, paying the normal
elite reward and the LR1c relic roll, and the rest screen says it has
returned.

Size: M

## Acceptance

- **A1** `respawnElites(world)` (new, `axiomancer-mechanics/src/World/elite-respawn.ts`,
  exported from `World/index.ts` and the package index) returns `{ world,
  respawned: NodeId[] }`: every node on `world.currentMap` whose event pool's
  encounter names an `elite`-difficulty foe and which is in `consumedNodes` or
  `completedNodes` is removed from both, the frontier lists are re-synced as
  `markNodeConsumed` does, and nothing else in the world changes (current node,
  discovered nodes, hazard outcomes, blocked routes, other maps). Pure; a map
  with no settled elite returns the same world and `[]`.
- **A2** On each Act 1 map, after the elite is fought (won, fled or spared) and
  the player stands on a claimed rest node, `respawnElites` respawns exactly the
  elite node and `moveToNode` to it is legal; walking onto it and resolving
  offers the same encounter payload (same `enemySlug`, same `level`, `isBoss`
  false). An engine e2e, `World/e2e/elite-respawn.engine.test.ts`, per map.
- **A3** No other node kind respawns: normal fights, door fights, loot caches,
  gathering, hazards, anvils and the rest nodes themselves stay spent (same
  e2e, a sweep over every non-elite node of each Act 1 map).
- **A4** Claiming a rest (`claimRestChoiceOutcomeAction`, and the dev
  `skip-event` rest path) runs `respawnElites` in the same `setState` as the
  outcome, before the one `save()`; `ClaimRestChoiceResult` gains
  `respawnedElites: NodeId[]`. Arriving at a rest node and leaving before the
  claim respawns nothing. A mobile store test.
- **A5** The rest screen's outcome view shows one line per elite that will
  return (`rest-elite-respawn`), naming the foe and the place: "The Green Jelly
  is back at <the name the map screen gives that node>." The presenter derives
  it from the world state through `respawnElites` (no new state); no line when
  none will return. A presenter test and a render test.
- **A6** A respawned elite won again pays the full elite reward:
  `rollEliteReward` is offered (cards or upgrade, unchanged) and XP is granted
  as for any won elite. A mobile store e2e: fight, win, rest, claim, fight
  again, win, the elite reward screen appears twice.
- **A7** The relic roll on a respawned elite is LR1c's, unchanged: one roll at
  `ELITE_RELIC_DROP_CHANCE` per won elite fight, from the elite-only relics the
  player does not carry (worn or in the satchel); once the player carries every
  elite-only relic nothing drops. A seeded engine test over a respawned kill
  sequence: no carried relic is ever dropped and the rate per kill is the
  constant's. `[T to confirm #4]`
- **A8** An old save loads and respawns correctly: a save fixture written
  before ER1, standing past a consumed elite with a rest node ahead, loads
  unchanged (no migration, no new field) and the next claimed rest respawns
  the elite. A mobile persistence test.

Measure: `npm run verify -w axiomancer-mechanics` and `npm run verify -w
axiomancer-mobile` with `World/e2e/elite-respawn.engine.test.ts` (A1-A3, A7)
and the mobile rest and persistence tests (A4-A6, A8) passing.

## Scope

- `axiomancer-mechanics`: new `src/World/elite-respawn.ts` (`respawnElites`,
  and `settledEliteNodes(map)` for the presenter's preview), elite detection
  through `getNodeEventPool` plus `ENEMY_REGISTRY[slug].difficulty === 'elite'`
  (the same read as `act1-elites.engine.test.ts`); exports in `World/index.ts`
  and `src/index.ts`; the "cannot be re-entered or re-farmed" comments in
  `World/world.reducer.ts` (`isNodeSpent`, `moveToNode`) and the one-shot line
  in `resolve-map-event.ts` name the one exception. The relic test (A7) calls
  LR1c's `rollEliteRelicDrop` and changes nothing in it.
- `axiomancer-mobile`: `state/rest/store-actions.ts` (claim runs the respawn;
  result field), `state/dev/skip-event.ts` (same path), `state/presenters/rest.engine.ts`
  and `rest.copy.ts` (the return line), `app/rest/index.tsx` (renders it).
- Nothing is parked or deleted.

## Consumers to update

- Engine exports (`World/index.ts`, `src/index.ts`) and any export-surface
  snapshot test.
- `ClaimRestChoiceResult` readers (`state/actions.ts` `claimRestOutcome`, the
  rest screen, `skip-event.ts`, their tests).
- `World/act1-walk.ts` / its test and the mechanics CLI (`CLI/game.cli.ts`): if
  either claims a rest or asserts every node ends spent, it is updated to the
  rule (grep `consumedNodes`, `isNodeSpent`).
- `docs/feature-map/features.json` regenerates only if a navigation edge
  changes (none should).
- The measured-truth ledger (`scripts/measured-truth.mjs`) plays each fight
  once at full-clear level and is not changed; the farm is named under
  Follow-ups instead.

## Save / schema contracts

- None. The respawn edits the existing `consumedNodes` / `completedNodes`
  arrays of `world.currentMap`; no new field, no migration in
  `Game/game.migrate.ts`. A save taken after the claim carries the respawned
  node as unspent; a save taken between arriving at the rest node and claiming
  carries nothing new (the rest node is already consumed, as today).

## Decisions made upfront — DO NOT ASK

- **Scope: every elite already fought on the region map the player is on.**
  Act 1 has one per region, so this is that region's Green Jelly; elites on a
  map already left through its door stay as they are. "Already fought" means
  its node is spent: won, fled or spared, since the save records no outcome per
  node and a fled elite would otherwise be gone for good. `[T to confirm #1]`
- **The same foe at its normal strength.** The node's authored payload
  resolves again: same slug, same pinned level, no scaling per respawn.
  `[T to confirm #2]`
- **The full elite reward again.** XP (150 at level 3) and the cards-or-upgrade
  pick (`rollEliteReward`, unchanged) on every win, respawned or not.
  `[T to confirm #3]`
- **The relic roll stays per kill and never re-drops a carried relic.** LR1c's
  pool already excludes relics the player carries, so ER1 adds no rule, only
  the test that proves it holds across repeats (A7). Consequence, stated for
  T: the lane's third relic, elite-only by T's LR1 decision, becomes farmable
  at 8% a kill; the cap is that only the two elite-only relics can ever drop.
  `[T to confirm #4]`
- **The rest node stays used up.** A rest node is still one-shot; only elites
  return. This bounds the farm: at most one extra elite fight per rest node on
  the map, 11 across Act 1 (about 1,650 XP, 11 elite picks and 11 relic rolls,
  0.88 relics expected, if the player rests after every elite).
  `[T to confirm #5]`
- **The trigger is the claim, not the arrival** (the night is the trigger, as
  the scar mend in `claimRestChoiceOutcomeAction` already reads). Walking onto a
  rest and reloading before the claim respawns nothing; the claim's one
  `save()` carries the respawn.
- **Elite detection reads the pool, not a node flag.** No content field is
  added; a future elite placed by B2 respawns with no change here.
- **Labyrinth maps are untouched in effect**: they place no elite encounter, so
  `respawnElites` returns `[]` there; no special case.
- **No farm cap beyond the rest nodes.** Measured truth stays a one-clear
  ledger; whether to measure a farmed run is a Follow-up, not this phase.

## Tests matrix

| Suite | Subject |
|---|---|
| `axiomancer-mechanics/src/World/e2e/elite-respawn.engine.test.ts` (new) | A1 purity and the no-elite case; A2 per Act 1 map; A3 sweep; A7 seeded relic sequence over LR1c's roll |
| `axiomancer-mobile/state/e2e/elite-respawn.ER1.test.tsx` (new) | A4 claim respawns, arrival alone does not, one save; A6 the elite reward twice |
| `axiomancer-mobile` rest presenter and screen tests (extended) | A5 the return line, and none when nothing returns |
| `axiomancer-mobile` persistence test (extended) | A8 an old save respawns at its next claim |
| Unchanged and must pass | `act1-elites.engine.test.ts`, `fight-checkpoint.engine.test.ts`, `arrival-debt.engine.test.ts`, `map-traversal.engine.test.ts`, `elite-reward.engine.test.ts`, `hazard-scar-rest-recovery.engine.test.ts`, `rest-upgrade.UP1d.test.tsx` |

## Verify gate

`npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile`;
root `npm test` (feature-map `--check`).

## Commit body template

```
ER1: elites come back after a night's rest

respawnElites un-spends every settled elite node on the current map when a
rest is claimed; the rest screen names the returning foe. Same foe, same
level, full elite reward; LR1c's relic roll unchanged (never a carried relic).
No save change. Closes A1-A8.
```

## DoD

A1-A8 ticked.

## Follow-ups (out of scope)

- **Measure the farm.** A measured-truth variant that rests after every elite
  (11 extra Green Jelly fights in Act 1) and reports the level and relic count
  it reaches, so T can see whether the repeat needs a cap. Not filed as a row.
- **A respawn cap or diminishing reward** if that measure says so (T's call).
- More elites (B2) respawn with no change; their relic pool grows with LR1f.
