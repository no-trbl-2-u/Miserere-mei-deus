# Phase MQ1 — Several quests at once, and quest nodes that hold the road

> Agent-facing brief, plotted by T (`/plot`, 2026-10-28, attended). T's task:
> "It's important that players have the ability to have multiple quests at a
> time. They're not always going to take a linear path. But certain quests will
> prevent the player from moving on that path any further until the quest is
> completed." In the same session T shared the Chapter 1 vision it serves (a red
> quest node: "A player is not able to move past one of these nodes unless that
> quest is completed"), recorded in `plan/revamp/breakwater-map.md` → "T's vision
> for Chapter 1". This plot builds the quest rules that vision needs and proves
> them on a fixture map; it does not rebuild the Breakwater (the map is still
> being designed, see Follow-ups).

## Sources

- The `/plot` request (T, 2026-10-28) and T's Chapter 1 vision of the same day:
  the quest chain start (black) → hazard opens the sea cave → elite → quest node
  (turn in, next quest) → elite → lighthouse quest node (arriving completes it,
  pays a key) → castle quest node (needs the key) → the boss → the quest node past
  the boss → the travel node. Several quests may be active at once; quest nodes
  hold the road past them until their quest is done.
- **D111** (one questline in Chapter 1, four steps on a `quest` node kind; the
  next quest node locked until the current step is met). This plot keeps D111's
  questline machinery and generalises it; it does not change the Breakwater's
  content, so D111 stands until the Breakwater rebuild plot amends it.
- **D88** (content from a T-approved brief; quest lines and giver copy are T's),
  **D93** (lands by `plot` PR), **D71** (quests give designated relics).
- Brief `plan/phases/phase_QL1_breakwater_questline.md` (QL1a-QL1d, QL1g
  shipped): the questline types, the step rules, the settle seam, the `/quest`
  screen, the locks.

## What exists

- **Several active quests: built in the log.** `QuestLog.active` is a list;
  `killObjectives`, `hazardObjectives`, `reachableObjectives` and
  `collectObjectives` (`axiomancer-mechanics/src/World/quest.engine.ts`) walk
  every active quest, so one kill already counts for each quest that wants it.
  The memoir tab (`axiomancer-mobile/state/presenters/memoir.engine.ts`
  `buildActiveRows`) lists every active quest with its objectives.
- **Several questlines: built in the registry, never exercised.**
  `registerQuestline` / `listQuestlines` (`World/questline.ts`) hold any number;
  `openReadyQuestRoutes` loops over every questline on the map; `QuestPayload`
  names its questline. Only `BREAKWATER_QUESTLINE` is registered, and no test runs
  two side by side.
- **Locks: built, entry-shaped.** A step's `opensOnReady` roads (seeded shut by
  `MapDefinition.initialBlockedRoutes`, each with a `reason`) open when the step
  becomes *ready*: the lock is on the road INTO the next quest node.
  `holdRoadsUntilSettled` keeps a node's roads off the frontier until the node is
  spent (a quest node until its step is accepted, the boss until it falls).
  `unblockMapRoute` opens one road.
- **Missing (new here):**
  - a gate on the road PAST a quest node, shut until that node's quest is
    *completed* (T's red node);
  - an authoring check that frontier roaming cannot walk around a gate;
  - a step given by something other than a quest node (T's chain starts at the
    start node);
  - a step completed by arriving at its node (the lighthouse);
  - a requirement to carry an item, used up at turn-in (the key at the castle);
  - an on-map list of active quests, and a shut road that names its quest.

## Outcome

The player can carry several quests at once (the main chain and side quests),
each counting progress on its own, and a quest node can hold the road past it
until its quest is done while every other road stays open. The engine walks a
fixture map shaped like T's Chapter 1 chain end to end, with a side quest
running alongside, and the exploration screen shows what is active and why a road
is shut.

Measure: `Game/e2e/quest-chain.engine.test.ts` walks the fixture chain (start →
hazard gate → elite → quest node → arrival quest paying a key → key turn-in →
boss → last quest node → travel) with a one-step side quest completed mid-walk,
and the exploration screen test shows two active quests and a gated road's reason
naming its quest.

## Acceptance

- **A1** Several quests at once. On one fixture map two questlines run side by
  side: the main chain and a one-step side quest (a side quest is a one-step
  questline; no second quest system). Accepting, progressing and turning in one
  never reads the other's state; one kill or hazard advances every active
  objective that wants it; each completion pays once through `settleQuestLog`.
  A library test pins all three.
- **A2** Quest gates. `QuestlineStep.gatesPast?: readonly RouteRef[]` names the
  roads leaving a quest node toward its far side. The fixture map seeds them shut
  (`initialBlockedRoutes`, the reason naming the quest), and the settle seam opens
  them when the step that node turns in is *completed* (not merely ready),
  alongside today's `opensOnReady`. Confirmed by T (2026-10-28): a gate is shut
  from the start ("A player is not able to move past one of these nodes unless
  that quest is completed"). `legalMovesFrom` never lists a gated road and
  `moveToNode` across one throws the blocked-route error. A test per completion
  path (`END_COMBAT`, the hazard host, `reach`, `collect`, `turnInQuestStep`,
  arrival) proves the gate opens on each.
- **A3** No way around a gate. `questGateProblems(def)` (read-only, beside
  `questline-supply.ts`) lists every node declared past a gate that the start can
  reach without crossing it under frontier roaming. The fixture passes; a copy
  with one bypass edge fails, naming the edge. Every registered questline's map
  runs it in the library test (the Breakwater passes vacuously: it declares no
  gates).
- **A4** A hazard can hold a path. A hazard node in `holdRoadsUntilSettled`
  opens its far roads only once crossed: a fled or lost crossing leaves them shut
  (T's sea cave). Built by QL1/DY1c; one test pins it on the fixture.
- **A5** A step given anywhere. A dialogue or cutscene effect
  `{ type: 'give-quest-step', questline, step }` starts that step as
  `acceptQuestStep` would (counts from 0, the step before it completed), without
  standing on a quest node. The fixture's start node gives step 1.
- **A6** Done on arrival. `settle: 'on-arrival'` completes and pays a step when
  the player enters its target node (its `reach` objective), and that node then
  offers the next step, as a turn-in node does. One test: the lighthouse.
- **A7** Carry an item. Objective type `carry` (`target`: an item id) is met
  while the item is in `player.inventory` and unmet when it leaves; turning in a
  step with a `carry` objective removes one of that item. A step's reward can be
  that item (the existing item-reward door). One test chains the arrival quest's
  key into the castle turn-in; another proves a turn-in without the key pays
  nothing and opens no gate.
- **A8** The chain end to end. `quest-chain.engine.test.ts` (the Measure) walks
  the fixture map from start to travel node through the engine's public verbs,
  checking at each gate that the far side is unreachable before and reachable
  after, with the side quest accepted early and turned in mid-walk.
- **A9** What is active, on the map. The exploration screen shows a compact
  quest tracker: each active quest's name and its next unmet objective with
  progress (`2/3 foes`), at most three rows then `+n more`; tapping opens the
  memoir's quest list. Empty log, no tracker. [T to confirm #4]
- **A10** A shut road says why. Tapping a node behind a gate shows its route
  reason on the node confirm panel (QL1c's panel), the quest named; the `/quest`
  screen renders an arrival-settled step's payout and a `carry` objective's line
  (`Bring: <item>`), and a quest node of a second questline. Screen tests per
  case.

## Scope

- Mechanics: `World/questline.ts` (`gatesPast`, `settle: 'on-arrival'`,
  `giveQuestStep`, gate opening in the settle seam), `World/quest.engine.ts`
  (`carry` objectives, the turn-in consumption), `World/types.ts`
  (`QuestObjectiveType` gains `carry`), a new `World/quest-gates.ts`
  (`questGateProblems`), the dialogue effect in `World/dialogue.runtime.ts`, a
  fixture map and two fixture questlines under `Game/fixtures/` (registered in
  tests only, never in the shipped registry), `docs/game-model.md`'s quest
  paragraph.
- Mobile: the tracker component and its presenter, the node confirm panel's
  reason line, the `/quest` screen's two new cases.
- Out: the Breakwater's graph, events and questline (unchanged); backtracking;
  abandoning a quest.

## Consumers to update

- `docs/game-model.md` (quests: several at once, gates, carry, arrival).
- `axiomancer-mechanics/src/index.ts` and `World/index.ts` exports.
- The CLI's quest readout (`CLI/game.cli.ts`) if it assumes one questline.
- `act1-walk.ts` only if a type change touches it (the Breakwater declares no
  gates).

## Save / schema contracts

- `QuestLog` keeps its shape. A saved quest may now carry a `carry` objective;
  older saves have none and read unchanged.
- `gatesPast`, `settle: 'on-arrival'` and the gate seeds are static definitions
  (not saved) except the seeded `MapState.blockedRoutes`, already in the save.
  The Breakwater seeds no gates, so no save changes for live play.

## Decisions made upfront — DO NOT ASK

- **Build the rules, prove them on a fixture; leave the Breakwater alone.**
  [T to confirm #1] T's node map is still being designed; the rebuild is its own
  plot once every node is locked.
- **A gate is shut from map start until its quest is completed.** Confirmed by
  T (2026-10-28), from the vision's red node.
- **A side quest is a one-step questline.** One quest system, the one QL1 built.
- **No abandoning a quest.** [T to confirm #3] A gate cannot be dodged by
  dropping its quest, and D111 already holds that the questline cannot be left
  unfinished.
- **The tracker sits on the exploration screen, the full list stays in the
  memoir.** [T to confirm #4]
- **A step's progress counts only from when it is given** (QL1's rule), however
  it is given.
- **The key is used up at turn-in.** A carried item meant to persist would be a
  relic, not a `carry` target.
- Copy in fixtures and new screens is plain placeholder marked `[content]`
  (D88); T writes real lines with the Breakwater rebuild.

## Tests matrix

| Suite | Proves |
|---|---|
| `World/questline.multi.test.ts` | A1 |
| `World/quest-gates.test.ts` | A2, A3, A4 |
| `World/questline.shapes.test.ts` | A5, A6, A7 |
| `Game/e2e/quest-chain.engine.test.ts` | A8 |
| mobile tracker presenter + screen tests | A9 |
| mobile node-panel and `/quest` screen tests | A10 |

## Verify gate

`npm run verify -w axiomancer-mechanics`; for MQ1c also
`npm run verify -w axiomancer-mobile`.

## Commit body template

```
<id>: <title>

Closes <A-ids>. <one line on what the player or the engine can now do>.
```

## DoD

Every acceptance ID closed by its phase with its tests green; `docs/game-model.md`
describes several quests, gates, `carry` and arrival; the shipped registry still
holds only the Breakwater's questline.

## Follow-ups (out of scope)

- **The Breakwater rebuilt to T's vision.** Once T's node map is locked (the
  map design session and the `/pitch` thread of 2026-10-28), a plot rebuilds
  the graph, the quest chain, the gates and the side quests, amends D111 (its
  four steps and its next-node lock) and re-scopes QL1e/QL1f (T's quest-line
  writing, Nov 10) to the new chain.
- **Backtracking.** T's new map rules let players backtrack; today's gauntlet
  traversal never re-enters a spent node. A quest turned in at a node already
  passed needs it. Not built here; the fixture avoids it.
- **Cutscene beats inside other nodes** (T: "eventually we'll sprinkle those in
  as PART of these other nodes").

## Phases

### MQ1a — Several quests and quest gates in the engine · M · closes A1, A2, A3, A4 · requires nothing
Measure: `questline.multi.test.ts` and `quest-gates.test.ts` pass;
`npm run verify -w axiomancer-mechanics`.
- Scope: `gatesPast` and its opening in the settle seam; `quest-gates.ts`; the
  fixture map with its gates and a hazard hold; two fixture questlines (chain
  steps reduced to turn-in and boss shapes, plus the side quest).
- Consumers: engine exports; `docs/game-model.md`.
- Save/schema: none beyond the static fields.
- Tests: A1-A4 suites.
- Verify gate: mechanics.

### MQ1b — Given anywhere, done on arrival, carry the key · M · closes A5, A6, A7, A8 · requires MQ1a
Measure: `Game/e2e/quest-chain.engine.test.ts` walks the full fixture chain;
`npm run verify -w axiomancer-mechanics`.
- Scope: the `give-quest-step` effect, `settle: 'on-arrival'`, `carry`
  objectives and their consumption; the fixture chain gains the start-node gift,
  the arrival step and the key turn-in.
- Consumers: `docs/game-model.md`; the CLI readout.
- Save/schema: `carry` in `QuestObjectiveType`.
- Tests: A5-A7 suite and the e2e.
- Verify gate: mechanics.

### MQ1c — The tracker and the shut road on screen · M · closes A9, A10 · requires MQ1a, MQ1b
Measure: the exploration screen test shows two active quests with progress and
a gated node's panel naming its quest; `npm run verify -w axiomancer-mobile`.
- Scope: the tracker component and presenter, the node panel's reason line, the
  `/quest` screen's arrival payout, `carry` line and second-questline node.
- Consumers: `axiomancer-mobile` exploration and quest routes.
- Save/schema: none.
- Tests: A9, A10 screen tests.
- Verify gate: mobile and mechanics.
