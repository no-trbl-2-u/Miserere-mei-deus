# Phase QL1 — The Breakwater's questline

> Agent-facing brief, plotted by T (`/plot asap`, 2026-10-27, run unattended
> on T's word relayed from an attended session; T's six calls answered the same
> day, 2026-10-27; the four items it left open answered 2026-10-28). T's task:
> one questline in Chapter 1 (the Breakwater), four
> quest nodes, four steps: the first three are turned in at the next quest node,
> the fourth is beating the chapter boss. Each step pays XP plus one extra, the
> last also the Elementalist's Belt. It supersedes LR1f's four-quest scope.
> Quest lines and the giver's copy are T's content (D88), written by T on
> Tue Nov 10; the builder writes plain placeholder lines marked `[content]`
> until then.

## Sources

- The `/plot` request (T, 2026-10-27): "asap — Chapter 1 (the Breakwater)
  questline", with T's eight decisions and, the same day, T's answers to the
  PR's six calls, recorded below as Confirmed by T.
- T's answers of 2026-10-28 to the four open items (roaming ahead, the elite's
  place, the bridge, a lost boss fight), recorded below as Confirmed by T, and
  T's death rule of the same day (see "Decisions"): plot DY1, merged, not this one.
- T's answers of 2026-10-28 to the notes the plot left (one spare in each
  pocket, old saves, the Nov 8 date, the death rule's plot), recorded below as
  Confirmed by T.
- **D111** (this plot, T 2026-10-27, amended 2026-10-28): one questline in
  Chapter 1, a ninth Breakwater node kind `quest`; supersedes LR1f.
- **D106** (each region is a chapter; the Breakwater is Chapter 1, the Nov 16
  MVP's scope), **D71** (quests give designated relics), **D104** / **D107**
  (a worn lane relic opens its lane in the reward pool), **D105** (three relic
  slots), **D88** (content from a T-approved brief; quest lines are T's),
  **D93** (lands by `plot` PR).
- Brief `plan/phases/phase_LR1_lane_relics.md`: LR1c built the quest-reward
  door (`payCompletedQuests`, every completion path) and the item-reward
  queue; LR1e built `relic-elementalist-belt` (`relicSource: 'quest'`). LR1f
  (A5, A14, A17, A18) is superseded by this brief (T, 2026-10-27).
- Brief `plan/phases/phase_ER1_elite_respawn.md`: a claimed rest brings a
  fought elite back unless its relic dropped (`retiredEliteNodes`); noted by
  the elite step below, not relied on.
- `plan/revamp/breakwater-map.md` (the eighteen nodes, kinds and links) and
  `plan/deadlines.md` (W2, the event-node UI/UX pitch on Wed Nov 4, T's
  `[content]` sitting on Tue Nov 10, the MVP on Nov 16).
- Open PR #987 (`loop/ship-LR1f-act1-quests`), which T said to drop: read for
  what it would have added (see "What exists"). It is not merged and nothing
  here depends on it.

## What exists

Built on `main`:

- **The quest log** (`World/quest.engine.ts`, `QuestLog` on `GameState`, in
  the save): `startQuest`, `progressQuest` (auto-completes when every
  objective fills), `completeQuest`, `discoverQuest`, `nextQuest` on `Quest`
  (a chain field nothing reads yet), `QuestStatus` including `'failed'`
  (nothing sets it; this brief does not either). Objectives `kill` (by enemy
  display name), `collect`, `reach`, `talk`, `flag`. A quest starts counting
  only once it is active, so "counts from acceptance" is the log's existing
  behaviour.
- **The quest-reward door** (LR1c): `payQuestReward` pays one `Reward`
  (`currency`, `experience`, an `Item` or `{ kind: 'item' }`); a `card` reward
  pays nothing. `payCompletedQuests` runs on every completion path:
  `endCombat` (`settleKill`, `Game/game.reducer.ts`), the hazard host,
  `reach` and `collect` in `resolveMapEvent`, the dialogue effects. Mobile's
  `withQuestRewards` (`state/actions.ts`) and the item-reward queue
  (`state/item-reward/`, `/item-reward`, TO THE SATCHEL / WEAR IT NOW) carry a
  granted relic to the screen.
- **The Belt**: `relic-elementalist-belt` in `Items/relic.library.ts`,
  `relicSource: 'quest'`, `laneId: 'elementalist'`, +5 Body, Thaw into
  Thunder.
- **Revisitable nodes**: `resolveMapEvent` leaves `travel` and `labyrinth`
  nodes unconsumed; on a gauntlet map an unconsumed node the player stepped
  off drops back onto the frontier (`world.reducer.ts` `visitedSet`: a node is
  spent on resolution, not departure). The frontier is global: every unvisited
  node joined by an unblocked edge to ANY visited node (the node under the
  player included) is a legal move.
- **Blocked routes**: `MapDefinition.initialBlockedRoutes` seeds
  `MapState.blockedRoutes` (in the save) at map creation; `unblockedAdjacency`
  drops a blocked edge from the frontier even for the node the player stands
  on; `unblockMapRoute` opens one. Today only the Labyrinth uses them.
- **Elite detection**: `isEliteEnemy` (`Combat/combat.rewards.ts`) reads
  `Enemy.difficulty === 'elite'`; a boss encounter is stamped
  `difficulty: 'boss'` by the encounter handler (`MapEvents/handlers.ts`).
- **Card rewards**: `rollCombatCardRewards` (the fight's three offers over
  the lane pool) and `addRewardCard`; mobile's spoils tiles (TQ1, TAKE CARD)
  and the cache's TAKE A CARD offer. Consumables: `consumableLibrary`
  (`minor-healing-potion`, `healing-potion`, `greater-healing-potion`).
- **Map plumbing**: mobile `NodeType` already has `'quest'` (scroll glyph,
  label `QUEST`, tag `LORE`), but it is worn today by `cutscene`, `narration`
  and `interaction` (`KIND_TO_NODE_TYPE`, `state/presenters/exploration.engine.ts`),
  so bw-1 (the windmill's cutscene) reads QUEST. Glyphs no map kind wears yet:
  `quill`, `bag`, `coin`, `shield`, `arcane`, `tombstone`.

**The watchtower and the bridge today (checked for T's call 5, and again for
T's answers of 2026-10-28).** bw-17 (the
watchtower, `isBoss`) is the only neighbour of bw-18 (the river bridge), and
bw-14, bw-15 and bw-16 are the only neighbours of bw-17, so the bridge lies
behind the watchtower by topology alone. The engine does not enforce a
victory: `visitedSet` counts the node under the player as visited, so standing
on bw-17 puts bw-18 on the frontier at once, and
`END_COMBAT` settles the node (`settleArrival`) on every outcome, defeat and
flee included. Mobile bars fleeing a boss (`fleeAllowed: !isBoss`), which is a
screen rule, not an engine one. So "the bridge cannot be reached without
beating the boss" is **not** true in the engine today, and QL1 makes it true
(A9, A15, A16).

**Flee and defeat today (T, 2026-10-28: a fled fight does not complete the
node).** Three places settle a node on a fight that was not won:
`END_COMBAT` (`Game/game.reducer.ts`, every outcome), mobile's
`fleeEncounterAction` (`state/actions.ts`, which calls its own
`settleArrivalAction` before `endCombat('flee')`), and nothing else. A fled
normal fight therefore spends its node and opens its roads. A lost fight ends
the run: `app/combat-encounter/index.tsx` `onExit` calls
`resetRun({ keepCharacter: true })` (full heal, a fresh world). The exploration
screen re-fires any arrival still owed (`pendingArrival`) on mount, so a fight
left unsettled but still owed would re-engage at once; the engine must
**answer** the arrival without settling the node (A9).

Only on PR #987's branch (not merged; reused here as ideas, rebuilt by QL1):

- `settleKill(..., mapName)`: kills counted only on the quest's own map
  (kill targets are display names, shared by every region's door fight).
  QL1a builds the same scoping on `Quest.mapName`.
- `WATCHTOWER_LAMP_QUEST` and three siblings in `World/quest.library.ts`, given
  by dialogue on existing nodes; `World/quest.library.test.ts`;
  `lane-relic-quests.engine.test.ts`; re-pinned `act1-walk-e2e.mjs`,
  `node-blurb-event.test.ts`, `story-catalog.test.ts`. None is reused as is:
  the giver is a `quest` node here, not a dialogue on an existing node.

New (no code has it):

- A `quest` map-event kind and its node; a step that is offered, accepted,
  counted, turned in at the next quest node (steps 1-3) or paid on the boss
  victory (step 4).
- Objectives counting any foe, elite foes, the boss, and hazards crossed.
- A step that pays several rewards (XP plus one extra, the last also a relic),
  and a quest reward that is a card pick.
- A questline that holds its steps until turn-in (a filled quest is not paid
  until its next node).
- Routing that holds the questline: a quest node and the watchtower add their
  roads to the frontier only once spent (a new `holdRoadsUntilSettled` list on
  the map), the next quest node is locked until the current step is met, a
  fight that is fled or lost leaves its node incomplete, and standing on an
  incomplete node lets the player try it again.
- The `/quest` screen and the node's own glyph (no progress on the map).
- Four new nodes on the Breakwater graph and their places on the plate.

## Outcome

The Breakwater carries one four-step questline on four `quest` nodes. Node 1
(the chapter start) offers step 1; node 2 turns in step 1 for XP and one extra
and offers step 2; node 3 turns in step 2 and offers step 3; node 4 turns in
step 3 and offers step 4, which is beating the watchtower boss; that victory
pays XP, one extra and the Elementalist's Belt (through the item-reward
screen). The map's routing makes the questline unskippable and unspendable:
each quest node is locked until the step before it is met; each step's foes
and hazards lie in a pocket reachable only through that step's own node (so
nothing a step counts can be used up before it is accepted); the boss cannot be
reached until step 4 is accepted, and the river bridge cannot be reached until
the boss is beaten (a fled or lost fight leaves a node incomplete, and an
incomplete watchtower opens no road).

## Acceptance

- **A1** `MapEventKind` gains `'quest'` with a `QuestPayload { kind: 'quest';
  questline: QuestlineId; node: number }` (node 1-4) and a resolved
  `{ kind: 'quest'; questline; node; stage: 'locked' | 'waiting' | 'turn-in' |
  'offer'; behind?: QuestStepView; ahead?: QuestStepView; description?: string
  }`, where `behind` is the step this node turns in (node 2-4) and `ahead` the
  step it offers (node 1-4), each a `Quest` with its progress and rewards.
  Every exhaustive table over the kinds handles it (`ACT1_WALK_EVENT_KINDS`
  lists thirteen; mobile's `KIND_TO_NODE_TYPE`, `event-assets.ts`,
  `state/dev/skip-event.ts`). An engine test resolves a staged quest payload;
  `npm run typecheck -w axiomancer-mobile` passes.
- **A2** A questline is data: `World/questline.ts` defines `Questline { id;
  mapName; steps: QuestlineStep[] }` and `QuestlineStep { step; nodeId (the
  node that offers it); quest: Quest; rewards: Reward[]; settle: 'turn-in' |
  'on-victory'; opensOnReady?: RouteRef[] }` (the roads into the next quest
  node, opened when this step's objectives all fill; A6).
  `Quest` gains optional `questline?`, `step?`, `rewards?: Reward[]` (paid in
  order after `reward` by `payQuestReward`; a quest with only `reward` pays as
  today) and `holdForTurnIn?: boolean`: such a quest whose objectives all
  fill stays active ("ready") and is neither completed nor paid by
  `progressQuest` or `payCompletedQuests` until `turnInQuestStep`. `Reward`
  gains `{ kind: 'card-pick'; count: number }`: `payQuestReward` rolls
  `rollCombatCardRewards(player, rng, count)` and returns the offers on
  `PaidQuestReward.cardOffers` without adding a card. An engine test per
  reward kind, including a step paying XP, shillings and an item in one call,
  and one for a held quest that fills and does not pay.
- **A3** Kill objectives gain `foeClass?: 'any' | 'elite' | 'boss'` (with no
  `target`): `'any'` counts every won fight (victory or friendship), `'elite'`
  only a foe `isEliteEnemy` accepts, `'boss'` only a foe whose difficulty is
  `'boss'`. A new objective type `hazard` counts each hazard node resolved,
  whatever its outcome. `settleKill` takes the enemy (name and difficulty), on
  both its callers (`endCombat`, the mobile hazard host). A quest's kill and
  hazard objectives count only on `Quest.mapName`. Tests: a `foeClass: 'any'`
  objective counts a normal, the elite and the boss; an `'elite'` one counts
  only the elite; a `'boss'` one only the boss; a flee and a defeat count
  nothing; a win on another map counts nothing; a hazard resolved counts once.
- **A4** No save migration: every new field is optional and the four nodes are
  read from the static graph. A save made before QL1 loads, holds no questline
  quest, and each new node joins the frontier once its anchor is visited. A
  pre-QL1 save keeps its own (empty) `blockedRoutes`, so its quest-node locks
  are not seeded. The graph and the hold rule are static, so a pre-QL1 save made
  before the player reached the watchtower reads the new map: it can reach
  `bw-22` (stage `locked`, a line only) and so strand there unless it plays the
  questline, and a pocket's node it already spent cannot be counted. T is the
  only player; recorded, not migrated: such a save is abandoned for a new run (Confirmed by T, 2026-10-28:
  start a new run, no migration).
  A load test over a pre-QL1 fixture save pins what it does read (no crash;
  `bw-22` shows `locked`).
- **A5** Resolving a quest node never consumes it until the step it offers is
  accepted: the player can step off and move back (`legalMovesFrom` includes
  it once its roads are open; A6); once that step is accepted (and, for nodes
  2-4, the previous step turned in) `moveToNode` refuses it as spent. Engine
  test.
- **A6** Order is enforced by a lock, then by stage (Confirmed by T,
  2026-10-28: "Lock the subsequent quest node until the quest is met."). Node
  k (k = 2-4) cannot be entered until step k-1 is **ready** (every objective
  filled): the map seeds a blocked route, with a one-line reason, on every
  road into nodes 2-4 (`initialBlockedRoutes`), and the step's
  `opensOnReady` opens them in the same call that fills its last objective,
  on every completion path (`endCombat`, the hazard host, `reach`, `collect`,
  the dialogue effects) through the one seam LR1c's reward door already is;
  a test per path fails if one skips it. `moveToNode` onto a locked node
  throws the blocked-route error and `legalMovesFrom` never lists it. The
  stages stay for fixtures and saves without the locks: at node k, `locked`
  while step k-1 is not accepted (a line only; nothing changes but the
  arrival); `waiting` while it is accepted and unmet (its progress and LEAVE);
  `turn-in` once it is met; `offer` once it is turned in (node 1 starts at
  `offer`). On a new game nodes 2-4 are met only at `turn-in` or `offer`.
  Engine tests: node 2's road refuses until the fight that fills step 1 and
  opens in that same `END_COMBAT`; each completion path opens it; on a save
  without the locks visit node 3 first, then 1, then 2, then 3 and pin the
  stages.
- **A7** `acceptQuestStep(state, questline, step)` starts the step's quest
  with every count at 0; a kill or hazard before acceptance never counts.
  Declining (leaving without accepting) changes nothing; the next visit
  offers again. Engine test: win a fight, accept, count is 0; win again,
  count is 1.
- **A8** `turnInQuestStep(state, questline, step)` on a `ready` step 1-3 at
  its next node (node step+1) completes the held quest and pays it through
  the one reward door (`payCompletedQuests`, so XP, shillings and items land
  once), then the node offers the next step in the same visit. Step 4
  (`settle: 'on-victory'`) is not turned in: the boss victory completes and
  pays it through the same door as the fight settles, and its rewards include
  `relic-elementalist-belt`. Engine test over all four steps from a fresh
  game.
- **A9** Incomplete nodes and the held roads (Confirmed by T, 2026-10-28: "the
  player, if they flee a fight, doesn't complete the node"; the bridge is
  guaranteed by routing, with no sealed road).
  (a) `END_COMBAT` settles the fight's node only on victory or friendship. A
  flee or a defeat **answers** the arrival (`pendingArrival` cleared, so the
  exploration screen does not re-fire the fight) and leaves the node unspent:
  not consumed, not completed, nothing unlocked or revealed from it. Rewards
  and kill counts stay as today (none).
  (b) `MapDefinition.holdRoadsUntilSettled?: NodeId[]`: a listed node adds its
  roads to the frontier only once it is spent; standing on it does not. The
  Breakwater lists bw-19..bw-22 and bw-17. The rule is **not map-wide**: it
  would empty the frontier in the gap between every `moveToNode` and its
  resolve (every walker and fixture that chains moves breaks) and would strand
  a player who flees the only node they can reach; the list is the smallest
  rule that holds the questline.
  (c) Retry: `moveToNode` onto the node the player already stands on re-owes
  that node's arrival when it is unspent and its arrival is answered (the
  idempotent no-op stays for a spent node and for an owed arrival), so a fled
  or lost node can be tried again even when it is the last move left.
  (d) A fled node revisited: it is unspent, so once the player steps off it is
  on the frontier again, and every arrival is a fresh prelude (nothing of the
  fled fight is kept). An unlisted node opens its roads while the player
  stands on it, as today, so fleeing a normal fight lets the player walk on
  past it, unspent and uncounted.
  Engine tests on a fixture map with a listed node: a flee and a defeat leave
  the node unspent with the arrival answered and no road opened; a listed
  unspent node's neighbours are not in `legalMovesFrom` while the player
  stands on it, and are after a victory or a friendship; retry re-owes once;
  an unlisted fled node behaves as (d); a map with no list has the frontier it
  has today (the existing `world.reducer` cases pass unchanged). The player's
  return after a first death is plot DY1's (see "Decisions"), not this ID. DY1a also
  makes every lost fight leave its node unspent; the two do not double-scope
  (QL1b keeps A9a as written, and whichever lands second keeps the other's tests).
- **A10** The `/quest` screen: a `<QuestGate>` routes a resolved `quest` event
  there (the interceptor pattern of rest, cache and the Anvil in
  `state/actions.ts`). It shows the giver's line, "Step n of 4", the
  requirement, the progress ("1 of 2 fights won"), and the rewards. Per
  stage: `offer` (ACCEPT and LEAVE); `turn-in` (the finished step with its
  rewards and TURN IN, then the next offer on the same screen); `waiting`
  (progress and LEAVE); `locked` (one line and LEAVE). A screen test per
  stage, and a store test that ACCEPT and TURN IN dispatch the engine calls.
- **A11** The payout: on turn-in, XP and shillings appear on the screen and
  in the purse; a consumable goes to the satchel; a `card-pick` opens the
  three offers on the spoils tiles (TAKE CARD or skip, as a fight's reward).
  Step 4 pays when the boss falls: its XP and extra with the fight's
  aftermath, the Belt through `/item-reward` (TO THE SATCHEL / WEAR IT NOW),
  its eyebrow naming the questline. A store test per extra, and one for the
  boss victory.
- **A12** The map: the `quest` kind maps to `NodeType 'quest'` (label QUEST,
  the scroll glyph); `cutscene`, `narration` and `interaction` move to a new
  `NodeType 'story'` (label STORY, tag LORE, the quill glyph), so bw-1 no
  longer reads QUEST. The map shows **no** step state: the marker and the
  selection panel carry no step number, count or READY (T, call 4). A
  presenter test pins both, and that a quest node's panel reads like any
  other node's.
- **A13** A library test over every authored questline: four steps on four
  distinct `quest` nodes of its map, steps 1-3 `settle: 'turn-in'` and step 4
  `settle: 'on-victory'` with a `boss` objective; each step's `rewards` holds
  exactly one `experience` and exactly one of `currency`, `card-pick` or a
  consumable item, and the last step also exactly one relic; every relic a
  questline pays has `relicSource: 'quest'` (none is elite-only).
- **A14** The supply authoring test (T, call 1: a short supply "should never
  happen"; there is no runtime fallback and no goal ever shrinks; T,
  2026-10-28: roaming ahead must not spend a step's supply). A library test
  over every authored questline, **strict downstream**: for step k, take the
  nodes reachable from the start under the map's rules (the static graph, the
  `holdRoadsUntilSettled` list and the seeded locks) with markers 1..k-1
  settled, the locks into nodes 2..k open and the locks into nodes k+1.. shut;
  settle marker k; the nodes that newly become reachable are step k's supply.
  The test fails when that supply holds fewer nodes of the needed kind than
  the objective's count (hazard nodes; encounter nodes, boss excluded, for
  `'any'`, the elite included; elite nodes; the boss node for `'boss'`). A
  supply node reachable while marker k is unsettled never counts, so a node
  that can be reached around the marker is not supply. Negative cases: a
  staged questline asking for two hazards of a pocket that holds one fails;
  a staged map with a second road around a marker fails. The test also holds
  each pocket to one spare beyond the goal (T, 2026-10-28): the goal plus one
  hazards (step 1) and plus one encounter nodes (step 2); step 3's pocket holds
  its elite and one further encounter, and the boss pocket has no spare; a
  staged pocket holding exactly the goal fails the spare check.
- **A15** The Breakwater's questline is authored (T, 2026-10-28: "We can move
  around all the nodes whenever we need to", and, the same day, one spare in
  each pocket): four quest nodes `bw-19`..`bw-22` and a re-pointed graph that
  puts each step's supply, plus one spare, in a pocket behind its own marker.
  Edges, undirected:
  - the markers: `bw-19` off the windmill `bw-1`; `bw-20` off the customs house
    `bw-9`; `bw-21` off the south pier `bw-7`; `bw-22` between the c4 landmarks
    and the watchtower (`bw-15` and `bw-16` join `bw-22` in place of `bw-17`,
    and `bw-22` joins `bw-17`);
  - the pockets, each node joined to its marker and to nothing else: behind
    `bw-19` Gallows Hill `bw-3` and the Sea Cave `bw-12` (two hazards: the goal's
    one and the spare); behind `bw-20` Crane Quay `bw-2`, the Walled Manor
    `bw-10` and the Lighthouse `bw-14` (three normal fights: the goal's two and
    the spare); behind `bw-21` the North Pier `bw-8` (the elite, still the Green
    Jelly) and the Sea Fort `bw-6` (a normal fight: the spare, since the map
    holds no second elite); behind `bw-22` the watchtower `bw-17`, and the bridge
    `bw-18` behind it (one boss, no spare);
  - the fan, re-pointed around the pockets: `bw-1` joins `bw-4`, `bw-5`;
    `bw-4` joins `bw-5`, `bw-7`, `bw-9`; `bw-5` joins `bw-7`; `bw-7` joins
    `bw-11`; `bw-9` joins `bw-13`; `bw-11` joins `bw-13` (the Sea Cave's two
    lateral roads become this one rib); `bw-13` joins `bw-15`, `bw-16`; `bw-15`
    joins `bw-16`. The open fan then holds the gathering, cache, rest and
    blacksmith nodes only: every fight and hazard sits in a pocket.
  No node changes kind, foe or level (the measured report is unaffected: the
  same fights exist); the abstract `location` of a moved node is re-set only
  where `layout-engine-parity` needs it. The map seeds four blocked roads,
  each with a one-line `reason` (the quest-node locks of A6: `bw-9`-`bw-20`,
  `bw-7`-`bw-21`, and `bw-15`-`bw-22`, `bw-16`-`bw-22`), opened by steps 1, 2
  and 3 (`opensOnReady`; step 3 opens both roads into `bw-22`). No road into the
  watchtower or to the bridge is sealed: `holdRoadsUntilSettled` lists
  `bw-19`..`bw-22` and `bw-17` (A9). The four are registered as `quest` pools in
  `MapEvents/content.ts` with placeholder lines marked `[content]` and the
  placeholder steps and rewards below.
- **A16** The routing test, the Breakwater's proof that the questline can be
  neither left unfinished nor spent early (T, calls 3 and 1). On the live map,
  by engine calls: (a) with the four markers settled in order every node is
  reachable, none is orphaned; (b) with no step accepted, a roam that enters and
  resolves every legal move until none is left never enters `bw-2`, `bw-3`,
  `bw-6`, `bw-8`, `bw-10`, `bw-12`, `bw-14`, `bw-17` or `bw-18`, and never enters `bw-20`, `bw-21` or
  `bw-22` (locked), so no step's supply is touched; (c) with step k accepted
  only pocket k opens (the pockets of A15), and nodes k+1.. stay locked until
  step k is ready; (d) the bridge: a defeat or a flee at `bw-17` leaves it
  unspent, `bw-18` is not in `legalMovesFrom` while the player stands on it,
  and a retry offers the fight again; a victory puts `bw-18` on the frontier;
  (e) step 4 can be accepted only with steps 1-3 turned in (A6), so the bridge
  needs all four.
- **A17** The mobile layout places the four nodes on the coast plate
  (`act1-landmarks.json` gains four marks, one beside each anchor: the
  windmill, the customs house, the south pier, and `bw-22` on the road
  between the chapel and the watchtower; `breakwater.layout.ts`; T reviews the
  spots at the Nov 3 map review); a blocked road draws closed with its reason
  (the node confirm panel shows the reason when a tap meets it); a node that
  holds its roads draws as any node; `layout-engine-parity`, `act1-layouts`
  and `branching-legibility` pass. If a re-pointed edge fails
  `branching-legibility`, the smallest fix is to move that node's abstract
  `location` (and the plate mark), never to add a road. The re-pointing changes the rib count; the test's pinned
  totals (11 on the Breakwater, 45 in all) are re-pinned to the new graph in QL1d.
- **A18** An engine e2e from a fresh game walks the questline on the live
  Breakwater: accept step 1, cross a hazard, turn it in at node 2 and accept
  step 2, win two fights, turn in at node 3, beat the elite, turn in at node
  4, accept step 4, beat the watchtower boss, and the Belt is queued with the
  bridge open; carried unworn, `elementalist` is not in `unlockedLaneIds`
  (D107); worn, it is, and the next combat reward holds an Elementalist card.
- **A19** Every test, fixture and script that walks to `bw-17` or `bw-18`, or
  to a node whose road moved (`bw-2`, `bw-3`, `bw-6`, `bw-8`, `bw-10`, `bw-12`, `bw-14`), still passes (a
  grep finds about thirty files: `state-fixture.registry.ts`, `act1-walk`,
  `door-gate`, `charcoal-wood`, `arrival-debt`, `breakwater.engine.test.ts`,
  `elite-respawn.engine.test.ts`, `game.cli.route-audit`, the mobile
  `travel-door`, `exploration`, `elite-respawn.ER1` and `fixture-e2e`): each
  settles the four quest nodes through one shared test helper (consume the
  markers, open the three locks, test-only) or, for the walks, by playing the
  questline. `auditMapTraversal` and the CLI route audit run with the
  questline played. `npm run e2e:map-walk` and `npm run e2e:act1-walk` pass on
  the four-node map (pinned counts and the audit table move);
  `docs/reports/act1-event-audit.md` lists the thirteenth kind.
- **A20** Browser evidence on the web build: a 375-wide screenshot of the
  `/quest` screen on a `turn-in` (the finished step above the next offer),
  and one of `/item-reward` handing over the Belt with its "Lane: Elementalist
  (while worn)" line, attached to the QL1d PR.
- **A21** Done when recorded (QL1e, attended): T's quest line is in this
  brief's "T's quest line" table: the questline's name, the giver's lines per
  node (offer, waiting, ready), the requirement and count of steps 1-3, the XP
  per step, and which extra each step pays (shillings with an amount, a card
  pick, or a named consumable).
- **A22** T's quest line is in the game: every `[content]` placeholder of A15
  is replaced by T's table (A21), requirements, counts, XP and extras
  included; A13, A14, A16 and A18 still pass (A14 fails loudly if T's counts
  outrun the map); no `[content]` marker is left in the questline's source.
- **A23** The boss can be fought again (Confirmed by T, 2026-10-28; relies on
  T's death rule, plot DY1: "If a player dies in a fight, they
  come back with 1 HP and a 'dying' status. If they die again, it's game over.
  Resting removes the status." and, after the first death, the player is back
  at the spot before the fight, the node incomplete and retryable). Done
  when, with DY1b merged (the death in the app), an e2e on the live Breakwater loses the
  watchtower fight once: the player is back before `bw-17`, `bw-17` is unspent,
  step 4 is still active, `bw-18` is not on the frontier; the player fights
  again in the same run and wins, and the Belt is queued with the bridge
  open. A second death is game over (the death rule's, asserted here, not
  built here). QL1 does not build the death rule (DY1 does).
- **A24** A fled fight in the app leaves its node incomplete (Confirmed by T,
  2026-10-28). Mobile's WITHDRAW flow (`fleeEncounterAction`) answers the
  arrival through the engine and no longer settles the node; returning to the
  exploration screen does not re-fire the fight; the node reads as unspent on
  the map, and the next arrival there offers its prelude afresh; tapping the
  node the player stands on retries it (A9). Store and screen tests; every
  test that expected a fled node to be spent (`exploration`, `store`,
  `re-trigger`, `elite-respawn.ER1`, `fixture-e2e`) is updated to the new rule.

Measure: `npm run verify -w axiomancer-mechanics` and `npm run verify -w
axiomancer-mobile` pass, the A18 engine e2e walks all four steps to the Belt
on the live Breakwater, the A16 routing test (no step's supply can be spent
early; the bridge needs the boss) and the A14 strict supply test pass, a fled
fight leaves its node incomplete in the engine and the app (A9, A24), and `npm
run e2e:act1-walk` passes on the four-node map. A23 (the boss fought again)
waits on plot DY1 (DY1b) and closes in QL1g.

## Scope

- `axiomancer-mechanics`: `World/MapEvents/types.ts` (the kind, payload,
  resolved event), `World/MapEvents/handlers.ts` and `resolve-map-event.ts`
  (the quest branch: not consumed until its step is accepted; the hazard
  objective advance; the retry of A9(c) in `world.reducer.ts` `moveToNode`),
  `World/types.ts` (`Quest.questline?`, `step?`, `rewards?`, `holdForTurnIn?`;
  `QuestObjective.foeClass?`; objective type `hazard`; `Reward`'s
  `card-pick`), `World/quest.engine.ts` (map-scoped, class-aware kills;
  `rewards` paid in order; held quests; `cardOffers`), a new
  `World/questline.ts` (the types, `acceptQuestStep`, `turnInQuestStep`,
  `questNodeStage`, `opensOnReady`), `World/quest.library.ts` (the
  Breakwater questline), `Game/game.reducer.ts` (`endCombat` passes the enemy;
  a flee or a defeat answers the arrival and does not settle the node),
  `World/world.reducer.ts` and `World/types.ts` (`holdRoadsUntilSettled` in
  `visitedSet`; the retry), `World/Continents/Coastal-Village/breakwater.ts`
  (four nodes, the re-pointed edges and pockets, four blocked roads, the hold
  list),
  `World/MapEvents/content.ts` (four pools), `World/act1-walk.ts` (thirteen
  kinds), `Game/fixtures/state-fixture.registry.ts` and the tests of A19, a
  shared helper that settles the four quest nodes, `src/index.ts` and
  `World/index.ts` exports; `docs/game-model.md`, `axiomancer-mechanics/docs/world.md`
  (the map wiring contract names the new kind, the hold-roads rule and the
  quest-node locks).
- `axiomancer-mobile`: `state/presenters/exploration.engine.ts` (kind
  mapping, `story` type, the quest label; no progress), `state/actions.ts`
  (the quest interceptor; `fleeEncounterAction` answers the arrival and no
  longer settles the node, A24), a new `state/quest/` slice and `app/quest/index.tsx`
  with its gate, `state/presenters/quest.engine.ts`,
  `state/item-reward/relic-sources.ts` (the questline eyebrow), the spoils
  tiles reused for `card-pick`, `state/dev/skip-event.ts`,
  `state/presenters/event-assets.ts`, the hazard host's `settleKill` call,
  a blocked road's reason on the node confirm panel,
  `assets/images/maps/act1-landmarks.json` and
  `state/exploration-maps/breakwater.layout.ts`, `scripts/act1-walk-e2e.mjs`,
  `scripts/map-walk-e2e.mjs` and `scripts/fixture-e2e.mjs` (re-pinned and
  playing the questline where they walk to the watchtower or to a pocket).
- Root: `docs/feature-map/` regenerated for the new route
  (`node scripts/feature-map.mjs`), `docs/reports/act1-event-audit.md`.
- Plan: `plan/revamp/breakwater-map.md` gains the four nodes, the pockets and
  the locks when QL1d ships (the plot already draws the planned map there).

## Consumers to update

The map canvas and node confirm panel, `/event` (never reached by a quest
node), `/item-reward`, the combat aftermath (a boss victory with step 4
active pays through it), the hazard host, the Memoir tab (lists the
questline's quests as the log holds them; unchanged), the dev skip-event
menu, the feature map, `e2e:act1-walk`, `e2e:map-walk`, AW1b's
`node-blurb-event.test.ts` (bw-1's label moves from QUEST to STORY; the four
new nodes get blurbs), `layout-engine-parity.test.ts`, and every walker of
A19, the fled-fight flow (the WITHDRAW path, the exploration screen's
arrival re-fire, ER1's elite tests) and plot DY1 (merged, `phase_DY1_dying.md`),
which owns what a first death does to the player.

## Save / schema contracts

- `Quest.questline?`, `Quest.step?`, `Quest.rewards?`, `Quest.holdForTurnIn?`,
  `QuestObjective.foeClass?`: optional, additive; the quest log already rides
  the save. `QuestObjectiveType` gains `hazard` and `Reward` gains
  `card-pick`: no saved quest holds either before QL1. No migration (A4).
- The four nodes come from the static graph; the frontier is derived, so old
  saves read them on first load. The quest-node locks are
  `MapState.blockedRoutes`, already in the save: new games are seeded with
  them, a save made before QL1 is not (A4). `holdRoadsUntilSettled` is on the
  static `MapDefinition` (not saved), and the retry and the unsettled flee
  add no field.
- A step's turned-in state is the quest log's `completed` list; the node's
  spent state is `consumedNodes`. No new save field.

## Decisions made upfront — DO NOT ASK

- **One questline in Chapter 1 (Confirmed by T, 2026-10-27).** The Ruby
  Signet, the Bleeding Signet, the Elementalist's Brooch and the Defender's
  Carapace Belt (DF1e) stay quest rewards for Chapters 2-4's quest lines; not
  built here (D111).
- **A ninth Breakwater node kind, `quest`, with its own icon and screen
  (Confirmed by T, 2026-10-27).** The engine's thirteenth `MapEventKind`; the
  Breakwater uses nine. It joins the Wed Nov 4 event-node UI/UX pitch, which
  now covers nine kinds (`plan/deadlines.md`).
- **Four quest nodes, four steps, done in order (Confirmed by T, 2026-10-27;
  restructured by T the same day, call 5).** "There's actually only 3 quests
  to turn in. The 4th quest is killing the chapter boss." Node 1 (the chapter
  start) offers step 1; node 2 turns in step 1 and offers step 2; node 3 turns
  in step 2 and offers step 3; node 4 turns in step 3 and offers step 4. Step
  4 is beating the Chapter 1 boss (the watchtower fight, bw-17); it completes
  and pays on that victory (XP, one extra, the Belt). Requirement types: kill
  any foes, kill elites, cross hazards, kill the boss.
- **A requirement counts only from acceptance (Confirmed by T, 2026-10-27).**
  The quest log already behaves so: only an active quest counts.
- **Each step pays XP plus exactly one extra: shillings, a card reward or a
  consumable (Confirmed by T, 2026-10-27).** Which extra per step is T's, set
  on Nov 10 (A21). Until then the builder's placeholders, all marked
  `[content]`: 40 XP per step (one normal Breakwater fight's worth at level
  2); step 1 10 shillings, step 2 a `minor-healing-potion`, step 3 a card pick
  of three, step 4 15 shillings.
- **The fourth step also pays the Elementalist's Belt (Confirmed by T,
  2026-10-27),** `relic-elementalist-belt`, `relicSource: 'quest'`.
- **Quest lines and the giver's copy are T's (Confirmed by T, 2026-10-27,
  D88),** written Tue Nov 10 (QL1e) and landed before the Nov 16 MVP (QL1f).
- **LR1f is superseded (Confirmed by T, 2026-10-27).** Its build-plan row is
  `[skipped]` and PR #987 is T's to close; nothing on its branch is merged.
- **No runtime fallback for a short supply (Confirmed by T, 2026-10-27,
  call 1).** T: "That should never happen." No goal shrinks and no step is
  ready at once. It is guaranteed by an authoring test (A14).
- **Roaming ahead cannot spend a step's supply (Confirmed by T, 2026-10-28).**
  T: "Lock the subsequent quest node until the quest is met." Each next quest
  node stays locked (cannot be entered, offers and turns in nothing) until the
  current step's requirement is met (A6). That alone does not stop a player
  using up a step's supply before accepting it, so it is combined with the
  next decision: every step's supply lies in a pocket that is reachable only
  through its own marker, and A14 tests that strictly. With both, a step's
  foes and hazards are unreachable until it is accepted, and the next marker
  is shut until they are done, so there is no stranding path left on the map.
  What the tests still read is the map, not the player: a player who dies on
  the way is plot DY1's (below), and a hazard whose live puzzle routing
  (W2) does not resolve the node is that plot's check.
- **Every node may move for this, and each pocket holds a spare (Confirmed by T,
  2026-10-28).** T: "We can move around all the nodes whenever we need to." The
  plot re-points the Breakwater (A15): the pockets hold the hazards Gallows Hill
  (bw-3) and the Sea Cave (bw-12) behind bw-19; three normal fights, Crane Quay
  (bw-2), the Walled Manor (bw-10) and the Lighthouse (bw-14), behind bw-20; the
  elite North Pier (bw-8) and the normal Sea Fort (bw-6) behind bw-21; the
  watchtower behind bw-22. The test is strict downstream (A14), not "not forced
  before".
  Confirmed by T (2026-10-28): add one spare to each step's pocket (one extra
  hazard behind marker 1, one extra fight behind marker 2, one extra
  elite-or-fight behind marker 3), re-pointing existing nodes with no new foe or
  kind, so a modest count change on Nov 10 needs no map edit. A14 therefore
  requires the goal plus one for hazards and fights. The map holds one elite, so
  marker 3's spare is a normal fight: it covers a raised count only if T retypes
  step 3 as "win fights"; two elites would need a second elite (a foe change) and
  fails A14 loudly with a message that names it. The cost of the re-pointing: the
  open fan holds no fight and no hazard (every one sits in a pocket), and the
  Lighthouse leaves the road to bw-22, which is now `bw-15` and `bw-16`.
  Kept (default; T did not ask to change it, 2026-10-28): the spots are the plot's
  picks by plate neighbours, and QL1d's fallback moves abstract locations; T
  reviews them at the Nov 3 map review.
- **A step is turned in at the next quest node (Confirmed by T, 2026-10-27,
  call 2).** T: steps are turned in at the NEXT quest node, not at their own
  marker. Meeting the requirement makes the step ready; the payout is on the
  next node's screen, which then offers the following step. Nothing is paid
  where the goal is met.
- **The questline cannot be left unfinished, by routing (Confirmed by T,
  2026-10-27, call 3; the mechanism Confirmed by T, 2026-10-28).** T: "Not
  possible", enforced by the map's layout, with a test (A16). T, 2026-10-28:
  "Sealed roads but ONLY if we can't figure it out through new map routing.
  Also, the player, if they flee a fight, doesn't complete the node." Routing
  alone does it, with two small engine rules and no sealed road to the
  watchtower or the bridge:
  (1) a fight that is fled or lost leaves its node incomplete (A9a), so
  bw-17 stays unspent until the boss is beaten;
  (2) a map may list nodes that open their roads only once spent
  (`holdRoadsUntilSettled`, A9b): bw-17 (so bw-18 is unreachable until the
  boss is beaten, even standing on bw-17) and the four quest nodes (so a
  pocket, and the watchtower behind bw-22, open only on acceptance). This
  needs no save field and cannot strand a player who has another move; a
  player standing on a held node with no other move uses the retry (A9c).
  *Why not map-wide:* the rule would empty the frontier in the gap between
  every `moveToNode` and its resolve, break every walker and fixture that
  chains moves, and strand a player who flees the only node open to them; the
  list is the smallest rule that holds the questline. *Why not sealed roads:*
  routing does it, so `initialBlockedRoutes` and `unblockMapRoute` are used
  only for T's own lock on the next quest node (A6): "locked until the quest
  is met" depends on a quest's state, which the frontier (map state alone)
  cannot read, so the lock rides the existing blocked-route machinery (already
  in the save, one reason line each, shown on the confirm panel). Every quest
  node and the boss lie before the river bridge; the bridge itself has no
  lock, warning or forfeit. A fled node when revisited is unspent and offers
  a fresh prelude (A9d).
- **A lost or fled boss fight can be fought again (Confirmed by T,
  2026-10-28); a first death is plot DY1's, not this plot's.** T: re-fight
  allowed; a lost or fled boss fight leaves bw-17 incomplete and step 4 open.
  Checked: defeat today ends the run (`resetRun({ keepCharacter: true })`),
  so no re-fight is possible in the app until DY1b. T's death rule of the same day:
  "If a player dies in a fight, they come back with 1 HP and a 'dying' status.
  If they die again, it's game over. Resting removes the status." After the
  first death the player returns to the spot before they triggered the fight
  (or hazard), and that node stays incomplete so it can be retried. It is
  plotted and merged separately as DY1 (`plan/phases/phase_DY1_dying.md`: DY1a
  the engine and save, DY1b a lost fight in the app, DY1c a lethal hazard).
  QL1 does not scope it, and the two do not double-scope the unspent node:
  DY1a makes every lost fight leave its node unspent, and QL1b keeps the
  flee-and-defeat-unspent rule in `END_COMBAT` as written (A9a); whichever lands
  second keeps the other's tests. The boss-retry acceptance (A23, QL1g) closes
  once DY1b has merged; QL1a-QL1f do not wait on it. QL1g's row requires DY1b
  and carries no `[blocked]` marker, as DY1's rows are on `main`.
- **The map shows no step progress (Confirmed by T, 2026-10-27, call 4).**
  The quest screen only: no step number, count or READY on the marker or its
  panel (A12).
- **The four markers and the goals (Confirmed by T, 2026-10-27, call 6, plot
  defaults; the spots moved 2026-10-28).** Four new quest markers beside the
  windmill (bw-19, node 1, the chapter start), the customs house (bw-20), the
  south pier (bw-21, moved from the harbour town so the elite's pier is its
  neighbour) and the clifftop chapel (bw-22, on the road to the watchtower);
  T checks the spots in the Nov 3 map review. Placeholder goals until Nov 10:
  step 1 cross 1 hazard (Gallows Hill, bw-3), step 2 win 2 fights (Crane Quay
  bw-2 and the Walled Manor bw-10), step 3 beat 1 elite (the North Pier's
  Green Jelly, bw-8), step 4 beat the watchtower boss (replaces the old "win 2
  fights, watchtower counts"). T may change any count on Nov 10; A14 holds
  the counts to the map and fails loudly past the pocket.
- **A locked node says only "Step n of 4"** and stays unspent; it offers once
  its predecessor is turned in. On a new game the road into it is blocked until
  the step before it is met (A6), so the line shows only on a save without the
  locks. Not T's call: the order follows from T's structure.
- **A won fight is victory or friendship** (the two outcomes `endCombat`
  already settles kills and, from QL1, nodes on); flee, mercy and defeat count
  nothing and leave the node incomplete. A hazard
  counts when its node resolves, whatever the outcome ("traverse").
- **Kills and hazards count only on the questline's map** (`Quest.mapName`),
  the scoping #987 found necessary because kill targets are display names
  shared across regions.
- **The card reward is a pick of three from the lane pool**
  (`rollCombatCardRewards`), the same offer a fight makes, on the same spoils
  tiles; skipping it is allowed as after a fight.
- **The quest node wears the scroll and QUEST; the story kinds move to the
  quill and STORY.** The scroll is already the code's quest mark; both are
  existing glyphs, not new art. T's icon pick (IT1b) may replace either.
- **XP from quests is not measured.** The measured report (D57) reads fights;
  the level curve (LV1) gains at most 160 placeholder XP across the
  questline.
- **Split (the tick test):** the contract first (QL1a, types and rewards),
  then the step rules, the locks and the incomplete-node rules (QL1b, an L
  tick), the screen against a staged questline and the fled-fight flow in the
  app (QL1c), the Breakwater's content, nodes, pockets, routing and the
  repaired walkers (QL1d, an L tick: the first thing the player sees on a real
  run), T's sitting (QL1e, attended, nothing built), T's lines in (QL1f) and
  the boss fought again (QL1g, which requires DY1b).
- **Slotted asap (T):** above the first open row, DF1d.
- **The Nov 8 date holds (Confirmed by T, 2026-10-28):** QL1a-QL1d keep the
  `plan/deadlines.md` Item dated 2026-11-08.

## T's quest line (QL1e, written by T on Tue Nov 10)

Empty until T's sitting. One row per node (a node turns in the step before
it and offers its own):

| Node | Offers step | Requirement and count | XP | Extra | Giver: offer | Giver: waiting | Giver: ready (turn in the step before) |
|---|---|---|---|---|---|---|---|
| bw-19 | 1 | | | | | | (none: the chapter start) |
| bw-20 | 2 | | | | | | |
| bw-21 | 3 | | | | | | |
| bw-22 | 4 (the boss; also the Belt) | beat the watchtower boss | | | | | |

Step 4's XP and extra are T's too; its requirement is fixed (the boss).
Questline name: _(T's)_.

## Tests matrix

- Added (mechanics): `World/e2e/questline-contract.engine.test.ts` (A1-A4),
  `World/e2e/questline-steps.engine.test.ts` (A5-A9, including the hold rule
  and the retry), `World/e2e/breakwater-boss-retry.engine.test.ts` (A23),
  `World/quest.library.test.ts` (A13, A14), `World/e2e/breakwater-questline.engine.test.ts`
  (A16, A18); cases in `World/e2e/kill-objectives.engine.test.ts` (A3).
- Added (mobile): `state/presenters/__tests__/quest.engine.test.ts`,
  `state/e2e/quest.screen.test.tsx` (A10), `state/e2e/quest-payout.engine.test.ts`
  (A11), exploration presenter cases (A12), `state/e2e/flee-incomplete.engine.test.tsx` (A24).
- Rewritten: `node-blurb-event.test.ts` (bw-1 reads STORY; four new nodes),
  `act1-walk.test.ts` (thirteen kinds), the walkers of A19, any traversal
  audit pinning the Breakwater's node or route count.
- Unchanged and must pass: `World/e2e/quest-rewards.engine.test.ts` (a
  single-`reward` quest pays as today), `Combat/e2e/elite-reward.engine.test.ts`,
  `World/e2e/elite-respawn*.test.ts`.

## Verify gate

`npm run verify -w axiomancer-mechanics`; `npm run verify -w
axiomancer-mobile` (every phase touches `src/World/**`); `npm run e2e:map-walk`
and `npm run e2e:act1-walk` (QL1c, QL1d, QL1f); the A20 screenshots (QL1d);
the root `npm test`.

## Commit body template

```
Phase QL1<a|b|c|d|f> — <title>

Closes <ids> of plan/phases/phase_QL1_breakwater_questline.md.
<what changed>
Verify: <commands and results>
```

## DoD

A1-A24 ticked across QL1a-QL1g (A21 by QL1e, attended; A23 by QL1g, after
DY1b); the Measure met.

## Follow-ups (out of scope)

- Chapters 2-4's quest lines (the Ruby Signet, the Bleeding Signet, the
  Brooch, the Carapace Belt): T writes them (W3, Nov 25), then a `/plot` on
  this questline's shape.
- The death rule (T, 2026-10-28; plot DY1, merged): what a first and a
  second death do. QL1g joins it to the boss fight; everything else about
  defeat (the aftermath, the dying status, resting) is DY1's.
- Pre-QL1 saves on the Breakwater can strand at `bw-22` (A4); a re-seed or a
  migration on load if an old save ever matters.
- The live hazard routing (W2, needs plot): when a hazard node opens the
  puzzle board, its resolve must still advance the `hazard` objective once;
  that plot carries the check.
- The quest node's UI/UX treatment beyond this brief's screen: the Nov 4 pitch
  and the Nov 6 event-node plot cover it with the other eight kinds.
- A quest giver as a person (an NPC portrait, a dialogue tree): the giver here
  is lines on the quest screen. A later chapter may want a dialogue.
- Quest XP in the measured report, if a level-curve question needs it.

## Phases

### QL1a — The quest kind and the step contract · M · closes A1, A2, A3, A4 · requires nothing
Measure: `npm run verify -w axiomancer-mechanics` and `npm run typecheck -w
axiomancer-mobile`; the contract tests (A1-A4) pass over a fixture questline.
- Scope: the `quest` kind, payload and resolved event (resolving a staged
  quest payload returns `offer` at node 1 and consumes nothing; the step
  rules are QL1b's); `World/questline.ts` types only; `Quest` and
  `QuestObjective` fields including `holdForTurnIn`; `Reward`'s `card-pick`
  and `rewards` paid in order; map-scoped, class-aware `settleKill` on both
  callers; the `hazard` objective; `ACT1_WALK_EVENT_KINDS`. Mobile: the
  mechanical entries every exhaustive kind table needs (`KIND_TO_NODE_TYPE`
  maps `quest` to the existing `'quest'` type for now; skip-event;
  event-assets), no screen.
- Consumers: exports; mobile typecheck; the hazard host's `settleKill` call.
- Save / schema: the optional fields above; the pre-QL1 load test (A4).
- Tests: `questline-contract.engine.test.ts`, `kill-objectives` cases,
  `quest-rewards` unchanged, `act1-walk.test.ts`.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w
  axiomancer-mobile`; the root `npm test`.

### QL1b — The step rules: locks, accept, turn in, incomplete nodes · L · closes A5, A6, A7, A8, A9 · requires QL1a
Measure: `npm run verify -w axiomancer-mechanics`; the step-rule tests
(A5-A9) walk a fixture questline on a fixture map with the quest-node locks and
a listed hold node through every stage, the boss victory, a flee and a lost
fight.
- Scope: `World/questline.ts` (`questNodeStage`, `acceptQuestStep`,
  `turnInQuestStep`, `opensOnReady` and its one seam on every completion path),
  the quest branch of `resolveMapEvent` (not consumed until its step is
  accepted), held quests in `progressQuest` and `payCompletedQuests`,
  `endCombat` answering the arrival and leaving the node unspent on a flee or a
  defeat (A9a), `MapDefinition.holdRoadsUntilSettled` in `visitedSet` (A9b) and
  the retry in `moveToNode` (A9c) in `World/world.reducer.ts`; `GameAction`s
  `ACCEPT_QUEST_STEP` and `TURN_IN_QUEST_STEP` in `Game/game.reducer.ts`;
  exports. An L because three engine rules change the shared frontier and
  settle path; the existing `world.reducer` and `game.reducer` cases must pass
  unchanged for a map with no list.
- Consumers: none on screen yet (QL1c); `settleArrival` callers, the CLI's
  move filter and `auditMapTraversal` read the frontier.
- Save / schema: none new.
- Tests: `questline-steps.engine.test.ts`.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w
  axiomancer-mobile`; the root `npm test`.

### QL1c — The quest screen, the quest node on the map and the fled-fight flow · M · closes A10, A11, A12, A24 · requires QL1b
Measure: `npm run verify -w axiomancer-mobile`; the screen tests (A10) and
payout store tests (A11) pass on a staged questline (a state fixture stages a
quest payload, as fixtures stage NPCs today), and a fled fight leaves its node
unspent in the app (A24).
- Scope: `app/quest/index.tsx`, its gate, `state/quest/`,
  `state/presenters/quest.engine.ts`, the interceptor in `state/actions.ts`,
  the payout (purse, satchel, spoils tiles for `card-pick`, the item-reward
  queue with the questline eyebrow, the boss-victory payout), `exploration.engine.ts`
  (the `story` type and the quest label; no progress), the feature map
  regenerated, and the WITHDRAW flow (`fleeEncounterAction`) answering the
  arrival through the engine without settling the node (A24). Copy is plain
  and marked `[content]`.
- Consumers: `/item-reward`, the spoils tiles, the node confirm panel, AW1b's
  blurb test (bw-1 now STORY), the dev skip-event menu, the exploration
  screen's arrival re-fire, ER1's elite tests, and the tests that expected a
  fled node spent. Defeat is untouched here (the run still resets until the
  plot DY1 (DY1b) lands); the aftermath has no flee.
- Save / schema: none.
- Tests: the quest presenter, screen and payout tests; exploration presenter
  cases; `flee-incomplete.engine.test.tsx`.
- Verify gate: `npm run verify -w axiomancer-mobile`; `npm run e2e:map-walk`;
  `npm run e2e:act1-walk` (bw-1's label moves); the root `npm test`.

### QL1d — The Breakwater's questline: four nodes, the pockets, the locks, the Belt · L · closes A13, A14, A15, A16, A17, A18, A19, A20 · requires QL1c
Measure: the A18 engine e2e walks all four steps to the Belt on the live
Breakwater, A13, A14 and A16 pass, `npm run e2e:act1-walk` passes on the
four-node map, and the A20 screenshots are on the PR.
- Scope: `breakwater.ts` (bw-19..bw-22, the re-pointed edges and pockets of
  A15, four blocked roads, `holdRoadsUntilSettled`), four `quest` pools in
  `MapEvents/content.ts`, the questline in `World/quest.library.ts` with
  placeholder lines and rewards marked `[content]`, `act1-landmarks.json` and
  `breakwater.layout.ts`, the shared quest-node test helper and the walkers of
  A19 repaired, the walks' pinned counts, `docs/reports/act1-event-audit.md`,
  `docs/game-model.md`, `plan/revamp/breakwater-map.md` (the four nodes, the
  pockets and the locks).
- Consumers: `layout-engine-parity`, `act1-layouts`, `branching-legibility`,
  `node-blurb-event` (four blurbs), the traversal audit and the CLI route
  audit, the state fixtures (the Sage fixture on bw-15; any fixture on bw-2,
  bw-3, bw-6, bw-8, bw-10, bw-12 or bw-14), ER1's elite tests (bw-8 now sits behind bw-21), the
  measured report (unchanged: the same fights exist, and none changes foe).
- Save / schema: none (A4 already covers the new nodes and old saves).
- Tests: `breakwater-questline.engine.test.ts`, `quest.library.test.ts`, the
  re-pinned layout and walk tests.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w
  axiomancer-mobile`; `npm run e2e:map-walk`; `npm run e2e:act1-walk`; the
  A20 screenshots; the root `npm test`.

### QL1e — T writes the Breakwater's quest line (attended) · S · closes A21 · requires QL1d
Measure: the "T's quest line" table above is filled in T's words and committed.
- T's Tue Nov 10 sitting (`plan/deadlines.md`). The agent drafts options in
  the game's voice per row and the placeholder rewards for T to keep or
  change; T picks and rewrites. Nothing built (D88).

### QL1f — T's quest line in the game · S · closes A22 · requires QL1e
Measure: `git grep -n "\[content\]" -- axiomancer-mechanics/src/World/quest.library.ts`
finds nothing for the questline; A13, A14, A16 and A18 pass with T's numbers.
- Scope: `World/quest.library.ts` (lines, counts, XP, extras), the quest
  screen's copy if T's table changes a label, `docs/game-model.md`'s numbers.
- Consumers: the A18 e2e and A13/A14 re-read the library; no pin changes
  unless T moves a node.
- Save / schema: none.
- Tests: A13, A14, A16 and A18 unchanged and green.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w
  axiomancer-mobile`; `npm run e2e:act1-walk`; the root `npm test`.

### QL1g — The boss fought again (joins plot DY1) · S · closes A23 · requires QL1d and DY1b
Measure: the A23 e2e passes on the live Breakwater: one lost watchtower fight,
the player back before `bw-17`, `bw-17` unspent, step 4 active, then a win and
the Belt.
- T's death rule is plot DY1 (`plan/phases/phase_DY1_dying.md`, merged; DY1a the
  engine and save, DY1b a lost fight in the app, DY1c a lethal hazard) and is not
  built here. This phase adds the one e2e that joins the two, and fixes whatever
  it finds at the seam (`END_COMBAT`'s defeat, the retry of A9c, DY1's return to
  the spot before the fight). DY1's rows are on `main`, so the row carries no
  `[blocked]` marker; it is pickable once QL1d and DY1b have merged, and
  QL1a-QL1f do not wait on it.
- Consumers: DY1's return-to-spot step (`resolveDeath`, `playerDied`), the boss prelude's
  WITHDRAW (`fleeAllowed: !isBoss` stays: a boss cannot be fled from the app).
- Save / schema: none.
- Tests: `breakwater-boss-retry.engine.test.ts`.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w
  axiomancer-mobile`; the root `npm test`.
