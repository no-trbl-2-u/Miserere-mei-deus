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
- T's answer to call #4 on PR #931 (2026-10-26): "Once an elite drops it's
  relic, it can no longer spawn again from rest."
- T's answers to calls #1-#5 (2026-10-26, after PR #931 merged; amended by a
  follow-up plot PR): all elites of the act return; same enemy, same
  strength; the upgrade option can be taken only once, XP and cards come with
  every repeat win, and a relic drop is the whole reward; "Not all elites
  drop a unique relic; some drop the same relic. No telling the player the
  drop chance."; the rest spot stays used up.
- Decisions: **D30** as amended by **D59** and the current Act 1 content (one
  elite per region, the Green Jelly), **D71** (elites drop relics at a low
  chance), **D100** / **D104** / **D107** (the elite reward draws over the lane pool,
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
  `CW_/BC_/LD_CAMP_NODES`). Departed maps keep their runtime state in
  `WorldState.mapStates` (`World/types.ts`), restored when a door leads back. The node is consumed on arrival like any non-fight
  node; `app/rest/index.tsx` runs the rest-choice session
  (`World/RestChoice/restchoice.engine.ts`, `state/rest/store-actions.ts`).
  `claimRestChoiceOutcomeAction` (`state/rest/store-actions.ts:147`) applies
  the outcome, mends the hazard scar ("the night is the trigger, not the
  choice"), and saves once. `state/dev/skip-event.ts` also claims a rest.
- **Respawn (new).** No respawn, re-farm or elite-repeat rule exists in `plan/`
  or the code; the `world.reducer.ts` comments say a spent node "cannot be
  re-entered or re-farmed". ER1 amends that sentence for elites after a rest.

## Outcome

After the player claims a rest, every elite node already fought anywhere in
the act is live again: the same foe at the same level. A repeat win pays XP
and the card pick every time; the upgrade option is offered over an elite only
until the player has taken it once from that elite. A win that drops the
elite's relic pays only the relic (no XP, no cards, no upgrade) and retires
that elite: it never returns. The rest screen names each returning foe.

Size: M

## Acceptance

- **A1** `respawnElites(world)` (new, `axiomancer-mechanics/src/World/elite-respawn.ts`,
  exported from `World/index.ts` and the package index) returns `{ world,
  respawned: { map: MapName; node: NodeId }[] }`: on `world.currentMap` and on
  every preserved `world.mapStates` entry whose map belongs to
  `world.currentContinent` (the act), every node whose event pool's encounter
  names an `elite`-difficulty foe, which is in `consumedNodes` or
  `completedNodes`, and which is not in that map's `retiredEliteNodes` (A9) is
  removed from both, each touched map's frontier lists are re-synced as
  `markNodeConsumed` does, and nothing else in the world changes (current node,
  discovered nodes, hazard outcomes, blocked routes, maps of another act).
  Pure; a world with no settled elite returns the same world and `[]`.
- **A2** All of the act's beaten elites respawn after a rest. An engine e2e,
  `World/e2e/elite-respawn.engine.test.ts`, walks Act 1 fighting each region's
  elite (`bw-8`, `cw-12`, `bc-8`, `ld-8`; won, fled or spared) and claims a
  rest on the last region: `respawned` lists all four, on the current map and
  in the departed maps' preserved `mapStates`, and each is unspent there. On
  the current map `moveToNode` to the elite is legal, and walking onto it and
  resolving offers the same encounter payload (same `enemySlug`, same `level`,
  `isBoss` false); a departed map restored through its door shows its elite
  unspent. A variant with only two elites fought respawns exactly those two.
- **A3** No other node kind respawns: normal fights, door fights, loot caches,
  gathering, hazards, anvils and the rest nodes themselves stay spent (same
  e2e, a sweep over every non-elite node of each Act 1 map).
- **A4** Claiming a rest (`claimRestChoiceOutcomeAction`, and the dev
  `skip-event` rest path) runs `respawnElites` in the same `setState` as the
  outcome, before the one `save()`; `ClaimRestChoiceResult` gains
  `respawnedElites` (A1's `respawned` list). Arriving at a rest node and leaving before the
  claim respawns nothing. A mobile store test.
- **A5** The rest screen's outcome view shows one line per elite that will
  return (`rest-elite-respawn`), naming the foe and the place: "The Green Jelly
  is back at <the name the map screen gives that node>." With elites on
  several regions, one line each, current region first. The presenter derives
  it from the world state through `settledEliteNodes` (no new state); no line
  when none will return, and never a line for a retired elite (A9). A
  presenter test and a render test.
- **A6** XP and cards come with every repeat win. A respawned elite won again
  with no relic drop grants its XP (150 at level 3) as for any won elite and
  opens the elite reward with its card offer (`rollEliteReward`'s `cards`,
  unchanged). A mobile store e2e: fight, win, rest, claim, fight again, win;
  the XP total rises by the elite's XP both times and the elite reward screen
  shows cards both times. Confirmed by T (2026-10-26): XP and cards come with
  every repeat win.
- **A7** Each elite has its own relic drop list, and several elites may share
  a relic. An elite encounter payload gains `eliteRelicDrops?: string[]`
  (relic ids; authored per elite node, absent = LR1c's whole elite-only pool),
  and LR1c's `rollEliteRelicDrop` takes the fight's list: one roll at
  `ELITE_RELIC_DROP_CHANCE` (8%, the engine default, unchanged) per won elite
  fight, first or repeat, picking from that list. The same relic id may sit
  on several elites' lists; no uniqueness check across nodes. A relic the
  player already carries (worn or in the satchel) is skipped, so a shared
  relic won from one elite never drops again from another, and a list the
  player fully carries drops nothing. Accepted by T as the default (2026-10-26, "update the PRs, then merge them"). Or: duplicates can
  drop (a shared relic can drop again while carried). Which relics go on
  which list is content for T (LR1f); ER1 ships the field and fixture lists
  only. A seeded engine test over a respawned kill sequence with two fixture
  elites sharing one relic: each drop comes from the fight's own list, the
  rate per kill is the constant's, and a carried shared relic is never
  dropped by either elite. Confirmed by T (2026-10-26): not all elites drop a
  unique relic; some drop the same relic. Confirmed by T (2026-10-26, PR #931,
  call #4): a win that drops a relic retires that elite (A9).
- **A8** An old save loads and respawns correctly: a save fixture written
  before ER1 (no `retiredEliteNodes`, no `eliteUpgradeTakenNodes`), standing
  past a consumed elite with a rest node ahead, loads with no migration (the
  absent fields read as none retired and no upgrade taken) and the next
  claimed rest respawns the elite with its upgrade on offer. A mobile
  persistence test.
- **A9** An elite that drops its relic never returns. `MapState` gains
  `retiredEliteNodes?: NodeId[]` (absent = `[]`, like `pendingArrival`), and
  `retireEliteNode(world, nodeId)` (same file as A1, pure) adds the node on
  `world.currentMap`. When `rollEliteRelicDrop` drops a relic after a won
  elite fight (`state/combat/store-actions.ts`), the fight's node is retired
  in the same `setState` that queues the relic, so the one save after the
  fight carries both. A no-drop win, a flee or a spare retires nothing. The A5
  line never names a retired elite. An engine test (`respawnElites` skips a
  retired node on any map of the act; `retireEliteNode` touches nothing else)
  and a mobile store e2e: win with a forced drop, rest, claim, the elite stays
  spent and the rest screen shows no return line; a save round-trip keeps it
  retired (Confirmed by T, 2026-10-26).
- **A10** The upgrade option can be taken only once per elite. `MapState`
  gains `eliteUpgradeTakenNodes?: NodeId[]` (absent = `[]`), and
  `markEliteUpgradeTaken(world, nodeId)` (same file as A1, pure) adds the
  node on `world.currentMap`. `claimCombatUpgradeAction` on an elite reward
  marks the fight's node in the same `setState` that applies the upgrade.
  When the elite reward is opened for a won elite whose node is marked, its
  `upgrade` is `null` (cards only); taking the cards leaves the node unmarked,
  so the upgrade is offered again next time. A mobile store e2e: the first win
  over `bw-8` offers the upgrade; take it; rest, claim, win over `bw-8`
  again: no upgrade on offer, cards are; a first win over `cw-12` still
  offers its upgrade; and a first win where the player took the cards over
  `bw-8` is followed by a repeat that offers the upgrade. An engine test:
  `markEliteUpgradeTaken` touches nothing else and survives `respawnElites`.
  Confirmed by T (2026-10-26): the upgrade option can be taken only once;
  later wins over that same elite no longer offer it. Read as once per elite
  node (each region's elite has its own). Accepted by T as the default (2026-10-26, "update the PRs, then merge them"). Or: once per
  run, across all elites (a run-level flag instead of the per-node list).
- **A11** When a relic drops, it is the whole reward. After every won elite
  fight, first or repeat, the relic roll (A7) runs before the reward: on a
  drop the player receives the relic and nothing else, no XP, no elite
  reward screen (no cards, no upgrade), and the node is retired (A9) and not
  marked by A10. On no drop, XP and the elite reward follow as in A6 and A10.
  This reorders LR1c's "relic after the unchanged elite reward" for elite
  fights once ER1 lands. A mobile store e2e with a forced drop: the XP total
  is unchanged, the relic is queued, no elite reward screen opens; and with a
  forced miss the reward screen opens as usual. Confirmed by T (2026-10-26):
  when a relic drops, it is the whole reward: no XP, no cards, no upgrade on
  that win.
- **A12** The drop chance is never shown to the player: no percentage, odds
  or "chance" wording for the elite relic drop in any screen, tooltip, relic
  detail, reward copy, toast or player-visible log line; the constant stays
  engine-only. A mobile copy test sweeps every player-facing string source
  (the `*.copy.ts` presenters, the relic library's descriptions, the reward
  and rest screens' rendered text with a forced drop and a forced miss) and
  fails on `ELITE_RELIC_DROP_CHANCE`'s value as a percentage (`8%`), as a
  fraction (`0.08`), or on "drop chance" / "chance to drop". Confirmed by T
  (2026-10-26): no telling the player the drop chance.

Measure: `npm run verify -w axiomancer-mechanics` and `npm run verify -w
axiomancer-mobile` with `World/e2e/elite-respawn.engine.test.ts` (A1-A3, A7,
the engine halves of A9 and A10) and the mobile rest, combat, copy and
persistence tests (A4-A6, A8, A11, A12, the store halves of A9 and A10)
passing.

## Scope

- `axiomancer-mechanics`: new `src/World/elite-respawn.ts` (`respawnElites`
  over the current map and the act's `mapStates`, `retireEliteNode`,
  `markEliteUpgradeTaken`, `isEliteUpgradeTaken`, and `settledEliteNodes(world)`
  for the presenter's preview, which leaves retired nodes out);
  `World/types.ts` (`MapState.retiredEliteNodes?` and
  `MapState.eliteUpgradeTakenNodes?`, documented beside `pendingArrival`;
  the elite encounter payload's `eliteRelicDrops?`); `Combat/combat.rewards.ts`
  (`rollEliteRelicDrop` takes the fight's drop list, A7); fixture drop lists
  on the four Act 1 elite nodes in `World/MapEvents/content.ts` (absent until
  T authors them, so the whole pool applies); elite detection
  through `getNodeEventPool` plus `ENEMY_REGISTRY[slug].difficulty === 'elite'`
  (the same read as `act1-elites.engine.test.ts`); exports in `World/index.ts`
  and `src/index.ts`; the "cannot be re-entered or re-farmed" comments in
  `World/world.reducer.ts` (`isNodeSpent`, `moveToNode`) and the one-shot line
  in `resolve-map-event.ts` name the one exception. The relic test (A7) calls
  LR1c's `rollEliteRelicDrop`, which gains the drop-list argument and
  nothing else.
- `axiomancer-mobile`: `state/rest/store-actions.ts` (claim runs the respawn;
  result field), `state/combat/store-actions.ts` (the elite relic roll runs
  before XP and the reward with the fight's drop list and, on a drop,
  replaces them and retires the node, A9/A11; a taken elite upgrade marks the
  node, A10; a marked node's reward opens with `upgrade` null), a new copy
  test (A12), `state/dev/skip-event.ts` (same path), `state/presenters/rest.engine.ts`
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

- Two optional save fields, no migration. The respawn edits the existing
  `consumedNodes` / `completedNodes` arrays of `world.currentMap` and of the
  act's maps in `world.mapStates`; A9 adds `MapState.retiredEliteNodes?:
  NodeId[]` and A10 adds `MapState.eliteUpgradeTakenNodes?: NodeId[]`, both
  optional so a save written before ER1 loads as none retired and no upgrade
  taken (A7's `eliteRelicDrops` is authored content, not saved) (the `pendingArrival` precedent), with no hop in
  `Game/game.migrate.ts` and no save-version bump (EQ2a's v38 -> v39 hop is
  untouched). If the save validator rejects unknown map fields, it learns these
  two. A save taken after the claim carries the respawned node as unspent; a
  save taken between arriving at the rest node and claiming carries nothing
  new (the rest node is already consumed, as today); a save after a fight that
  dropped the elite's relic carries the node as retired, and a save after a
  taken elite upgrade carries the node as upgrade-taken.

## Decisions made upfront — DO NOT ASK

- **Scope: every elite already fought anywhere in the act.** A claimed rest
  respawns each settled elite node on the current map and on every departed
  map of the act (its preserved `mapStates` entry); in Act 1 that is up to
  four Green Jellies (`bw-8`, `cw-12`, `bc-8`, `ld-8`). An elite on a departed
  region waits there unspent; the player meets it only by walking back
  through a door. "Already fought" means its node is spent: won, fled or
  spared, since the save records no outcome per node and a fled elite would
  otherwise be gone for good. Confirmed by T (2026-10-26): all of them, every
  elite in the act that was fought, not only the current region's.
- **The same foe at its normal strength.** The node's authored payload
  resolves again: same slug, same pinned level, no scaling per respawn.
  Confirmed by T (2026-10-26): same enemy, same strength.
- **Rewards on a win, first or repeat** (A6, A10, A11). The relic roll runs
  first. A drop is the whole reward: the relic only, no XP, no cards, no
  upgrade, and the elite retires. Otherwise XP (150 at level 3) and the
  elite reward: the card offer on every win; the upgrade option only while
  the player has not yet taken it from this elite. Taking the cards does not
  use up the upgrade.
  Confirmed by T (2026-10-26): the upgrade option can be taken only once; XP
  and cards come with every repeat win; when a relic drops, it is the whole
  reward. The "only once" is read as once per elite node (each region's
  elite has its own), recorded in `eliteUpgradeTakenNodes`. Accepted by T as the default (2026-10-26, "update the PRs, then merge them").
  Or: once per run, across all elites. T's relic rule is applied to every
  elite win, first included, so a first-win drop also pays only the relic;
  this reorders LR1c's "relic after the unchanged elite reward" for elite
  fights once ER1 lands.
- **Each elite has its own relic drop list; lists may share relics** (A7).
  The 8% roll per won elite fight stays the engine default, and the chance is
  never shown to the player in any UI, tooltip or log line (A12).
  Confirmed by T (2026-10-26): "Not all elites drop a unique relic; some drop
  the same relic. No telling the player the drop chance." A relic the player
  already carries is skipped, including a shared one won from another elite.
  Accepted by T as the default (2026-10-26, "update the PRs, then merge them"). Or: duplicates can drop. Consequence, stated for T: the
  lane's third relic, elite-only by T's LR1 decision, can roll again at 8% a
  kill on a returning elite until it drops.
  Confirmed by T (2026-10-26, PR #931, call #4): once an elite drops its
  relic, it can no longer spawn again from rest. The retirement is per elite
  node (each region has its own), recorded in `retiredEliteNodes` (A9); a win
  with no drop, a flee or a spare leaves it free to return. So each region's
  elite yields at most one relic, and an elite that never drops keeps
  returning at each rest.
- **The rest node stays used up.** A rest node is still one-shot; only elites
  return. Confirmed by T (2026-10-26): the rest spot stays used up.
- **The farm, re-checked against "all elites in the act".** Each of Act 1's
  11 rest claims now respawns every fought, unretired elite, up to four, so
  the ceiling rises from 11 extra elite fights to 44 (11 rests x 4 elites):
  up to about 6,600 XP and 44 card picks, if the player rests after clearing
  and walks back to every region's elite each time. The walk-back is the
  practical brake: only the current region's elite is on hand, and a departed
  region's elite costs a trip through its door. Upgrades from the farm are
  capped at four (once per elite, A10), relics at four (one per elite, then
  retired, A9; fewer if their lists share relics and call #2 keeps the skip),
  and a relic win pays nothing else (A11). The Green Jelly is a 100% win for
  every measured deck, so the XP and card ceiling is close to free; the
  Follow-up measure covers it. Size stays M: the act-wide sweep, the
  upgrade record, the per-elite list and the copy test add tests and one
  argument, not a second tick.
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
| `axiomancer-mechanics/src/World/e2e/elite-respawn.engine.test.ts` (new) | A1 purity and the no-elite case; A2 all four Act 1 elites respawn after one rest, departed maps included, and a two-elite variant; A3 sweep; A7 seeded relic sequence with per-elite lists sharing a relic; A9 a retired node is skipped on any map of the act; A10 `markEliteUpgradeTaken` touches nothing else and survives a respawn |
| `axiomancer-mobile/state/e2e/elite-respawn.ER1.test.tsx` (new) | A4 claim respawns, arrival alone does not, one save; A6 XP and cards on a repeat win; A9 a forced drop retires the elite through rest, claim and a save round-trip; A10 the upgrade offered on the first win and absent on a repeat over the same elite once taken, still offered after cards and on another elite; A11 a forced drop grants only the relic (no XP, no reward screen) |
| `axiomancer-mobile` copy test (new) | A12 no player-facing string carries the drop chance |
| `axiomancer-mobile` rest presenter and screen tests (extended) | A5 the return lines, one per region, and none when nothing returns |
| `axiomancer-mobile` persistence test (extended) | A8 an old save respawns at its next claim |
| Unchanged and must pass | `act1-elites.engine.test.ts`, `fight-checkpoint.engine.test.ts`, `arrival-debt.engine.test.ts`, `map-traversal.engine.test.ts`, `elite-reward.engine.test.ts`, `hazard-scar-rest-recovery.engine.test.ts`, `rest-upgrade.UP1d.test.tsx` |

## Verify gate

`npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile`;
root `npm test` (feature-map `--check`).

## Commit body template

```
ER1: elites come back after a night's rest

respawnElites un-spends every settled elite node in the act when a rest is
claimed; the rest screen names each returning foe. Same foe, same level; XP
and cards on every win, the upgrade once per elite (eliteUpgradeTakenNodes).
Each elite rolls its own drop list first (shared relics allowed, a carried
relic skipped, the chance never shown); a drop is the whole reward and
retires that elite (retiredEliteNodes). Two optional save fields, no
migration. Closes A1-A12.
```

## DoD

A1-A12 ticked.

## Follow-ups (out of scope)

- **Measure the farm.** A measured-truth variant that rests after every elite
  (up to 44 extra Green Jelly fights in Act 1, walking back to each region)
  and reports the level and relic count
  it reaches, so T can see whether the repeat needs a cap. Not filed as a row.
- **A respawn cap or diminishing reward** if that measure says so (T's call).
- More elites (B2) respawn with no change; their relic pool grows with LR1f.
