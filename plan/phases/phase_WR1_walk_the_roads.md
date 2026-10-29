# Phase WR1 — Walk the roads: completed nodes can be revisited

> Agent-facing brief, plotted by T (`/plot`, 2026-10-28, attended). T's task:
> "completed nodes ... players should be able to revisit them. Right now,
> combat, hazard, rest, it'll do nothing if you revisit the node. Your character
> is just placed there. This will allow for backtracking." T's two answers in
> the same session: the player **walks the roads** (moves only to nodes joined
> to where they stand, completed or new; frontier jumping ends), and on a
> revisit **village, travel and quest act again**, everything else does
> nothing, and an elite revived by a rest (ER1) fights again.

## Sources

- The `/plot` request and T's two answers (T, 2026-10-28), recorded as D113.
- **D113** (this plot): gauntlet maps move along roads; completed nodes are
  walkable. Amends the frontier rule documented on `MapDefinition.traversal`
  (`axiomancer-mechanics/src/World/types.ts`, the gauntlet paragraph).
- **D111** (the questline's routing: locks, pockets, held roads), **D106**
  (the Breakwater is Chapter 1), **D88**, **D93**.
- Brief `plan/phases/phase_ER1_elite_respawn.md` (a claimed rest un-spends
  fought elites; `retiredEliteNodes`).
- Brief `plan/phases/phase_QL1_breakwater_questline.md` (held roads on the
  four markers and the watchtower, `opensOnReady` locks).
- Open plot PR #1049, `plan/phases/phase_NK1_node_kind_cleanup.md`: travel
  becomes "Move to X?" with same-map destinations (NK1d) and its decision 9
  says a passage's far end joins the frontier. Under D113 there is no frontier:
  the far end is simply where the player stands, and they walk on from there.
  WR1 does not depend on NK1; whichever lands second keeps the other's tests
  green (see Decisions 9).

## What exists

- **Gauntlet movement is the frontier.** `frontierNodes`
  (`World/world.reducer.ts` ~L140) returns every unvisited node joined by an
  unblocked edge to any visited node; `legalMovesFrom` (~L586) returns it for
  gauntlets, the current room's doors for the labyrinth. `moveToNode` throws on
  a spent node (~L283). `syncFrontierLists` keeps `availableNodes` /
  `lockedNodes` in step and is called from `resolve-map-event.ts` (~L288,
  ~L430), `elite-respawn.ts` (~L133) and `completeCurrentNode`.
  `isFrontierExhausted` and `isStranded` describe the frontier.
- **The labyrinth already allows re-entry**: current node's directed
  `connectedNodes` minus blocked routes, solved rooms included; a consumed
  node resolves to `none`.
- **Resolution** (`resolveMapEvent`, `resolve-map-event.ts` ~L300): returns
  `none` only for `consumedNodes`. A node in `completedNodes` but not
  `consumedNodes` would re-roll its pool. Travel, labyrinth and quest are never
  consumed (they would fire again, which D113 wants).
- **Mobile moves on its own path.** `moveToAction` (`axiomancer-mobile/state/
  actions.ts` ~L1087) gates on `map.availableNodes`, completes non-encounter,
  non-quest nodes on the move, unlocks neighbours, then `arriveAtNode`. The map
  presenter (`state/presenters/exploration.engine.ts` ~L624, `classifyNode`
  ~L341) marks reachable = `legalMovesFrom`; the exploration screen moves only
  on `kind === 'available'` (`app/(tabs)/exploration/index.tsx` ~L129); the
  camera focus keys on `available` + `current` (`MapCanvas.tsx` `focusKeyOf`).
- **Held roads and locks gate routing** (`holdRoadsUntilSettled`,
  `isHoldingRoads`, `initialBlockedRoutes`, `opensOnReady`): the watchtower
  opens the bridge only once the boss falls, each marker opens its pocket only
  once its step is accepted. These keep working under road-walking; only the
  frontier's "boss forced when nothing else is left" wording goes.
- **Audits.** `act1-walk.ts` follows the frontier; `auditMapTraversal` walks
  `forwardEdges` single-life and counts strands; `questline-supply.ts` reads
  the held list.
- **ER1**: `respawnElites` removes settled, unretired elites from
  completed/consumed and re-syncs; they become unspent nodes again.
- **Saves** hold `availableNodes`, `lockedNodes`, `completedNodes`,
  `consumedNodes`, `pendingArrival`; `GAME_STATE_VERSION` 39
  (`Game/game.migrate.ts`).

## Outcome

On every gauntlet map the player moves only along roads from the node they
stand on, onto new or completed nodes alike; a completed node does nothing
when re-entered except a village, a travel node, a quest node or a revived
elite.

## Acceptance

- **A1** On a gauntlet map `legalMovesFrom` returns exactly the current node's
  neighbours over unblocked edges, read both ways (`unblockedAdjacency`),
  visited or not, minus roads a held node still holds; `moveToNode` throws on a
  node that is not one of them. The labyrinth's rule is unchanged.
- **A2** `availableNodes` and `lockedNodes`, as the engine keeps them, follow
  A1 after every move, resolve, rest respawn and load; the frontier functions
  (`frontierNodes`, `isFrontierExhausted`) are deleted or reduced to
  labyrinth-free helpers with no gauntlet caller, and the `traversal` doc
  states D113.
- **A3** Held roads and blocked routes still gate: on the Breakwater no road
  out of a quest marker opens before its step is accepted, and the bridge
  (bw-18) is not a legal move until the watchtower fight (bw-17) is won.
- **A4** A reachability audit replaces the frontier and strand assumptions:
  for every gauntlet map, walking unblocked roads from the start with each lock
  opened in questline order reaches every node; `act1-walk.ts` walks roads;
  `auditMapTraversal` no longer counts strands on gauntlet maps.
- **A5** A save from before D113 loads (migration v39 → v40, or the version
  current when this ships) with `availableNodes` / `lockedNodes` recomputed by
  A1 from where the player stands, and plays on.
- **A6** Moving onto a completed fight, hazard, rest, loot cache or cutscene
  node resolves nothing: no pool roll, no payout, no screen, `pendingArrival`
  null; the player just stands there. A completed-but-not-consumed node is
  treated as spent.
- **A7** Moving onto a village opens it again; a travel node offers its trip
  again; a quest node resolves as QL1 defines for its current step (turn-in,
  offer, or nothing).
- **A8** An elite revived by a claimed rest (ER1) fights again when walked
  onto; a retired elite (`retiredEliteNodes`) stays spent.
- **A9** Mobile: the map marks every legal move tappable, with completed
  neighbours in their own "walk back" look distinct from a new node; tapping
  one moves the player with no event screen; non-neighbours draw unreachable;
  `moveToAction` gates on the engine's legal moves; the camera's focus set is
  the current node plus its legal moves.
- **A10** An engine e2e and a mobile flow test walk the Breakwater from the
  windmill into a dead-end pocket and back through completed nodes to the
  windmill, then on to an unvisited branch.

Measure: `npm test` at the root passes, including A10's walk; on the web
build T can walk back across completed nodes to the windmill.

## Scope

- `axiomancer-mechanics`: `World/world.reducer.ts` (legal moves, sync lists,
  move validation, frontier helpers), `World/MapEvents/resolve-map-event.ts`
  (spent check), `World/elite-respawn.ts` (re-sync), `World/types.ts` (doc),
  `World/act1-walk.ts`, `World/questline-supply.ts`,
  `World/narrative-reachability.ts`, `Game/fixtures/quest-nodes.ts`, CLI
  `game.cli.ts` (move list), `Game/game.migrate.ts`.
- `axiomancer-mobile`: `state/actions.ts` (`moveToAction`),
  `state/presenters/exploration.engine.ts` (classification, a walk-back state),
  `app/(tabs)/exploration/index.tsx` (tap), `components/exploration/
  ExplorationNode.tsx` and `MapCanvas.tsx` (look, focus), copy for the
  walk-back state.

## Consumers to update

Engine exports (`World/index.ts`, `src/index.ts`) lose or rename the frontier
helpers; the CLI move list; mobile presenters and the map screen; dev tools
that list legal moves (`DebugWorldTravel`, skip-event) if they read the
frontier.

## Save / schema contracts

No new fields. `availableNodes` / `lockedNodes` change meaning (neighbours,
not frontier) and are recomputed by a migration step at load (A5).

## Decisions made upfront — DO NOT ASK

1. **Roads are undirected** for movement (authored edges are one-way lists;
   `unblockedAdjacency` already reads them both ways). D113.
2. **Frontier jumping ends on gauntlet maps.** Nothing replaces "boss forced
   when the frontier runs out": the Breakwater forces the boss by routing (the
   bridge behind the watchtower's held roads), which A3 pins.
3. **A held node holds its roads both ways while unspent**: standing on a quest
   marker before accepting, the player may walk back the road they came by but
   not on into the pocket. (Today's rule only holds the onward roads; walking
   back was never possible, so this is the natural extension.)
4. **Spent means completed or consumed** (A6), except village, travel and
   quest, which act on every entry (A7), and an ER1-revived elite, which ER1
   already makes unspent (A8).
5. **A rest node is used once** (A6): a revisit heals nothing and does not
   respawn elites again; ER1's respawn stays tied to claiming a rest.
6. **A fight the player fled or lost is not completed** (QL1, D111): walking
   back onto it fights again. Unchanged.
7. **The walk-back tap moves at once** with no confirm panel
   [T to confirm #1]: it fires nothing, so there is nothing to confirm; a new
   node keeps today's confirm panel.
8. **The labyrinth is untouched.**
9. **NK1 order-independence**: if NK1d lands first, a same-map passage's
   arrival sets `currentNode` and the A1 rule takes over from there; if WR1
   lands first, NK1d's builder reads "joins the frontier" as "stands there".
   The second to land updates the other's wording, not its behaviour.

## Tests matrix

- Engine: `World/e2e/map-traversal*` rewritten to roads; new
  `walk-the-roads.test.ts` (A1, A3, A6, A7, A8); reachability audit test over
  every gauntlet map (A4); migration test (A5); `questline-steps`,
  `quest-node-roads`, `breakwater-boss-retry`, ER1 tests updated where they
  assumed the frontier; Breakwater walk e2e (A10).
- Mobile: presenter tests for the walk-back state and unreachable nodes (A9);
  `moveToAction` gating; a flow test for A10; `boss-retry.QL1g`,
  `elite-respawn.ER1`, `exploration-map-legibility` updated.

## Verify gate

`npm run verify -w axiomancer-mechanics`, `npm test -w axiomancer-mobile`, root
`npm test`; `verify:visual` on the exploration route for WR1b.

## Commit body template

`world: walk the roads (WR1<x>, D113)` — what moved, which A-IDs closed.

## DoD

A1-A10 ticked.

## Follow-ups (out of scope)

- The Breakwater redraw (~45 nodes, curved roads; not yet plotted) is drawn for
  road-walking.
- Whether long walks back want a fast-travel affordance: let play decide.
- The event-kind sittings (deadlines) give the walk-back look its treatment.

## Phases

### WR1a — Move along roads (engine and map) · L · closes A1, A2, A3, A4, A5 · requires nothing
Measure: the engine and mobile suites pass with legal moves = the current
node's open neighbours; on the web build a non-adjacent node is not tappable.
- Scope: engine legality, sync lists, frontier helpers, audits, migration;
  mobile `moveToAction` gating on engine legal moves and the presenter marking
  only neighbours available (completed neighbours still drawn spent and not yet
  tappable).
- Tests: A1-A5 rows of the matrix.
- Verify: engine verify, mobile tests, root `npm test`.

### WR1b — Revisit completed nodes · L · closes A6, A7, A8, A9, A10 · requires WR1a
Measure: A10's Breakwater walk passes in the engine and mobile flow tests;
on the web build T walks back to the windmill across completed nodes.
- Scope: completed neighbours become legal moves; the spent check; village,
  travel and quest re-entry; ER1 revived elite; mobile walk-back look, tap
  without an event screen, camera focus.
- Tests: A6-A10 rows of the matrix.
- Verify: engine verify, mobile tests, root `npm test`, `verify:visual` on
  exploration.
