# Phase QL1 — The Breakwater's questline

> Agent-facing brief, plotted by T (`/plot asap`, 2026-10-27, run unattended
> on T's word relayed from an attended session; T's six calls answered the same
> day, 2026-10-27). T's task: one questline in Chapter 1 (the Breakwater), four
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
- **D111** (this plot, T 2026-10-27): one questline in Chapter 1, a ninth
  Breakwater node kind `quest`; supersedes LR1f.
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

**The watchtower and the bridge today (checked for T's call 5).** bw-17 (the
watchtower, `isBoss`) is the only neighbour of bw-18 (the river bridge), and
bw-14, bw-15 and bw-16 are the only neighbours of bw-17, so the bridge lies
behind the watchtower by topology alone. The engine does not enforce a
victory: standing on bw-17 puts bw-18 on the frontier at once, and
`END_COMBAT` settles the node (`settleArrival`) on every outcome, defeat and
flee included. Mobile bars fleeing a boss (`fleeAllowed: !isBoss`), which is a
screen rule, not an engine one. So "the bridge cannot be reached without
beating the boss" is **not** true in the engine today, and QL1 makes it true
(A9, A15, A16).

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
- Sealed roads: the watchtower road opens on acceptance of step 4 and the
  bridge road on its completion; a boss fight that is lost does not spend its
  node.
- The `/quest` screen and the node's own glyph (no progress on the map).
- Four new nodes on the Breakwater graph and their places on the plate.

## Outcome

The Breakwater carries one four-step questline on four `quest` nodes. Node 1
(the chapter start) offers step 1; node 2 turns in step 1 for XP and one extra
and offers step 2; node 3 turns in step 2 and offers step 3; node 4 turns in
step 3 and offers step 4, which is beating the watchtower boss; that victory
pays XP, one extra and the Elementalist's Belt (through the item-reward
screen). The map's routing makes the questline unskippable: the river bridge
cannot be reached until the boss is beaten, and the boss cannot be reached
until step 4 is accepted.

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
  'on-victory'; opensOnAccept?: RouteRef[]; opensOnComplete?: RouteRef[] }`.
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
  pre-QL1 save keeps its own (empty) `blockedRoutes`, so its watchtower and
  bridge roads stay open as they were (T is the only player; recorded, not
  migrated). A load test over a pre-QL1 fixture save.
- **A5** Resolving a quest node never consumes it until the step it offers is
  accepted: the player can step off and move back (`legalMovesFrom` includes
  it); once that step is accepted (and, for nodes 2-4, the previous step
  turned in) `moveToNode` refuses it as spent. Engine test.
- **A6** Order is enforced by stage. At node k (k = 2-4): `locked` while step
  k-1 is not accepted (a line only; nothing changes but the arrival);
  `waiting` while step k-1 is accepted and unmet (its progress and LEAVE);
  `turn-in` once it is met; `offer` once it is turned in (node 1 starts at
  `offer`). Engine test: visit node 3 first, then 1, then 2, then 3.
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
- **A9** The roads. `QuestlineStep.opensOnAccept` and `opensOnComplete` open
  blocked routes (`unblockMapRoute`): accepting step 4 opens the road into
  the watchtower and completing it (the boss victory) opens the road to the
  bridge. A boss fight (`payload.isBoss`) is settled by victory or friendship
  only: defeat or flee leaves its arrival owed and its node unspent, so it
  can be fought again and the bridge road stays shut. Engine tests on a
  fixture map with two sealed roads: nothing opens early; defeat then victory
  opens the second road.
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
  happen"; there is no runtime fallback and no goal ever shrinks). A library
  test over every authored questline fails when a step's objective count
  exceeds what is not forced before its node: for each step, the number of
  nodes of the needed kind (hazard nodes; encounter nodes, boss excluded, for
  `'any'`; elite nodes; the boss node for `'boss'`) that do not lie on every
  route from the start to the step's quest node (so a dominator of that node,
  and the node itself, do not count), on the graph with its sealed roads
  removed. A negative case: a staged questline asking for three hazards on
  the Breakwater's two fails the test.
- **A15** The Breakwater's questline is authored: four new quest nodes
  `bw-19`..`bw-22`. `bw-19`, `bw-20` and `bw-21` are spurs joined to one
  existing node each (the windmill bw-1, the customs house bw-9, the harbour
  town bw-13); `bw-22` stands on the road to the watchtower beside the
  clifftop chapel bw-15: bw-14, bw-15 and bw-16 join `bw-22` in place of
  `bw-17`, and `bw-22` joins `bw-17`. The map seeds two sealed roads
  (`initialBlockedRoutes`): `bw-22`-`bw-17` and `bw-17`-`bw-18`, each with a
  `reason`. The four are registered as `quest` pools in `MapEvents/content.ts`
  with placeholder lines marked `[content]` and the placeholder steps and
  rewards below. No other node changes kind, foe or position in the engine
  graph.
- **A16** The routing test, the Breakwater's proof that the questline cannot
  be left unfinished (T, call 3). Over the live map: (a) every quest node is
  reachable from the start with `bw-17` and `bw-18` removed; (b) with no
  questline progress, `bw-17` and `bw-18` are not reachable from the start
  and `legalMovesFrom` never lists them; (c) after accepting step 4 the
  watchtower is reachable and the bridge is not, even standing on `bw-17`;
  defeat at `bw-17` leaves both true; (d) the bridge becomes reachable only
  when the boss is beaten; (e) step 4 can be accepted only with steps 1-3
  turned in (A6), so the bridge needs all four.
- **A17** The mobile layout places the four nodes on the coast plate
  (`act1-landmarks.json` gains four marks: three beside their anchors and
  `bw-22` on the road between the chapel and the watchtower;
  `breakwater.layout.ts`); a sealed road draws closed with its reason
  (the node confirm panel shows the reason when a tap meets it);
  `layout-engine-parity`, `act1-layouts` and `branching-legibility` pass.
- **A18** An engine e2e from a fresh game walks the questline on the live
  Breakwater: accept step 1, cross a hazard, turn it in at node 2 and accept
  step 2, win two fights, turn in at node 3, beat the elite, turn in at node
  4, accept step 4, beat the watchtower boss, and the Belt is queued with the
  bridge open; carried unworn, `elementalist` is not in `unlockedLaneIds`
  (D107); worn, it is, and the next combat reward holds an Elementalist card.
- **A19** Every test, fixture and script that walks to `bw-17` or `bw-18` (a
  grep of `bw-17|bw-18` finds about twenty files: `state-fixture.registry.ts`,
  `act1-walk`, `door-gate`, `charcoal-wood`, `arrival-debt`, the mobile
  `travel-door`, `exploration` and `fixture-e2e`) still passes: each opens
  the two roads through one shared test helper or, for the walks, by playing
  the questline. `npm run e2e:map-walk` and `npm run e2e:act1-walk` pass on
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

Measure: `npm run verify -w axiomancer-mechanics` and `npm run verify -w
axiomancer-mobile` pass, the A18 engine e2e walks all four steps to the Belt
on the live Breakwater, the A16 routing test and the A14 supply test pass,
and `npm run e2e:act1-walk` passes on the four-node map.

## Scope

- `axiomancer-mechanics`: `World/MapEvents/types.ts` (the kind, payload,
  resolved event), `World/MapEvents/handlers.ts` and `resolve-map-event.ts`
  (the quest branch: not consumed until its step is accepted; the hazard
  objective advance; a boss node settles only on victory or friendship),
  `World/types.ts` (`Quest.questline?`, `step?`, `rewards?`, `holdForTurnIn?`;
  `QuestObjective.foeClass?`; objective type `hazard`; `Reward`'s
  `card-pick`), `World/quest.engine.ts` (map-scoped, class-aware kills;
  `rewards` paid in order; held quests; `cardOffers`), a new
  `World/questline.ts` (the types, `acceptQuestStep`, `turnInQuestStep`,
  `questNodeStage`, the road opening), `World/quest.library.ts` (the
  Breakwater questline), `Game/game.reducer.ts` (`endCombat` passes the enemy
  and does not settle a lost boss fight), `World/Continents/Coastal-Village/breakwater.ts`
  (four nodes, the re-pointed edges, two sealed roads),
  `World/MapEvents/content.ts` (four pools), `World/act1-walk.ts` (thirteen
  kinds), `Game/fixtures/state-fixture.registry.ts` and the tests of A19, a
  shared helper that opens the two roads, `src/index.ts` and `World/index.ts`
  exports; `docs/game-model.md`, `axiomancer-mechanics/docs/world.md` (the map
  wiring contract names the new kind and the sealed-road rule).
- `axiomancer-mobile`: `state/presenters/exploration.engine.ts` (kind
  mapping, `story` type, the quest label; no progress), `state/actions.ts`
  (the quest interceptor), a new `state/quest/` slice and `app/quest/index.tsx`
  with its gate, `state/presenters/quest.engine.ts`,
  `state/item-reward/relic-sources.ts` (the questline eyebrow), the spoils
  tiles reused for `card-pick`, `state/dev/skip-event.ts`,
  `state/presenters/event-assets.ts`, the hazard host's `settleKill` call,
  the sealed road's reason on the node confirm panel,
  `assets/images/maps/act1-landmarks.json` and
  `state/exploration-maps/breakwater.layout.ts`, `scripts/act1-walk-e2e.mjs`,
  `scripts/map-walk-e2e.mjs` and `scripts/fixture-e2e.mjs` (re-pinned and
  opened where they walk to the watchtower).
- Root: `docs/feature-map/` regenerated for the new route
  (`node scripts/feature-map.mjs`), `docs/reports/act1-event-audit.md`.
- Plan: `plan/revamp/breakwater-map.md` gains the four nodes when QL1d ships.

## Consumers to update

The map canvas and node confirm panel, `/event` (never reached by a quest
node), `/item-reward`, the combat aftermath (a boss victory with step 4
active pays through it), the hazard host, the Memoir tab (lists the
questline's quests as the log holds them; unchanged), the dev skip-event
menu, the feature map, `e2e:act1-walk`, `e2e:map-walk`, AW1b's
`node-blurb-event.test.ts` (bw-1's label moves from QUEST to STORY; the four
new nodes get blurbs), `layout-engine-parity.test.ts`, and every walker of
A19.

## Save / schema contracts

- `Quest.questline?`, `Quest.step?`, `Quest.rewards?`, `Quest.holdForTurnIn?`,
  `QuestObjective.foeClass?`: optional, additive; the quest log already rides
  the save. `QuestObjectiveType` gains `hazard` and `Reward` gains
  `card-pick`: no saved quest holds either before QL1. No migration (A4).
- The four nodes come from the static graph; the frontier is derived, so old
  saves read them on first load. The sealed roads are `MapState.blockedRoutes`,
  already in the save: new games are seeded with them, a save made before QL1
  is not (A4).
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
  ready at once. It is guaranteed by an authoring test (A14). Limit, recorded:
  the test reads the map, not the player; a player who roams ahead and spends
  a step's supply before accepting it (fights won, the elite killed, hazards
  crossed) can still strand that step. The placeholder counts leave slack, and
  a fought elite returns after a claimed rest unless its relic dropped (ER1),
  but this is not a proof. T's call to widen the guarantee is the OPEN
  question on the PR.
- **A step is turned in at the next quest node (Confirmed by T, 2026-10-27,
  call 2).** T: steps are turned in at the NEXT quest node, not at their own
  marker. Meeting the requirement makes the step ready; the payout is on the
  next node's screen, which then offers the following step. Nothing is paid
  where the goal is met.
- **The questline cannot be left unfinished, by routing (Confirmed by T,
  2026-10-27, call 3).** T: "Not possible", enforced by the map's layout,
  with a test (A16). Every quest node and the boss lie before the river
  bridge; the bridge itself has no lock, warning or forfeit. Routing alone
  does not make that true in the engine (see "The watchtower and the bridge
  today"), so the map seeds two sealed roads, one into the watchtower
  (opened by accepting step 4, so the boss can only be fought once the kill
  counts) and one from the watchtower to the bridge (opened by the boss
  victory). They are existing machinery (`initialBlockedRoutes`,
  `unblockMapRoute`), not a lock on the bridge node. A lost boss fight leaves
  the watchtower unspent so it can be fought again. `bw-22` is inserted on
  the road to the watchtower so there is one road to seal; this re-points the
  edges of bw-14, bw-15 and bw-16 (no kind, foe or position changes; the
  measured report is unaffected).
- **The map shows no step progress (Confirmed by T, 2026-10-27, call 4).**
  The quest screen only: no step number, count or READY on the marker or its
  panel (A12).
- **The four markers and the goals (Confirmed by T, 2026-10-27, call 6, plot
  defaults).** Four new quest markers beside the windmill (bw-19, node 1, the
  chapter start), the customs house (bw-20), the harbour town (bw-21) and the
  clifftop chapel (bw-22, on the road to the watchtower), one ring further out
  per step; T checks the spots in the Nov 3 map review. Placeholder goals
  until Nov 10: step 1 cross 1 hazard (bw-3 in ring 1, bw-12 in ring 3), step
  2 win 2 fights, step 3 beat 1 elite (the North Pier's Green Jelly, bw-8),
  step 4 beat the watchtower boss (replaces the old "win 2 fights, watchtower
  counts"). T may change any count on Nov 10; A14 holds the counts to the map.
- **A locked node says only "Step n of 4"** and stays unspent; it offers once
  its predecessor is turned in. Not T's call: the order follows from T's
  structure.
- **A won fight is victory or friendship** (the two outcomes `endCombat`
  already settles kills on); flee, mercy and defeat count nothing. A hazard
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
  then the step rules and sealed roads (QL1b), the screen against a staged
  questline (QL1c), the Breakwater's content, nodes, routing and the repaired
  walkers (QL1d, an L tick: the first thing the player sees on a real run),
  T's sitting (QL1e, attended, nothing built) and T's lines in (QL1f).
- **Slotted asap (T):** above the first open row, DF1d.

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
  `World/e2e/questline-steps.engine.test.ts` (A5-A9),
  `World/quest.library.test.ts` (A13, A14), `World/e2e/breakwater-questline.engine.test.ts`
  (A16, A18); cases in `World/e2e/kill-objectives.engine.test.ts` (A3).
- Added (mobile): `state/presenters/__tests__/quest.engine.test.ts`,
  `state/e2e/quest.screen.test.tsx` (A10), `state/e2e/quest-payout.engine.test.ts`
  (A11), exploration presenter cases (A12).
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

A1-A22 ticked across QL1a-QL1f (A21 by QL1e, attended); the Measure met.

## Follow-ups (out of scope)

- Chapters 2-4's quest lines (the Ruby Signet, the Bleeding Signet, the
  Brooch, the Carapace Belt): T writes them (W3, Nov 25), then a `/plot` on
  this questline's shape.
- The roam-ahead gap in the supply guarantee (see "No runtime fallback"):
  gating each step's supply behind its quest node by sealed roads, if T wants
  a proof against a player who spends supply early.
- Pre-QL1 saves on the Breakwater keep open roads (A4); a re-seed on load if
  an old save ever matters.
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

### QL1b — The step rules: stages, accept, turn in, the sealed roads · M · closes A5, A6, A7, A8, A9 · requires QL1a
Measure: `npm run verify -w axiomancer-mechanics`; the step-rule tests
(A5-A9) walk a fixture questline on a fixture map with two sealed roads
through every stage, the boss victory and a lost boss fight.
- Scope: `World/questline.ts` (`questNodeStage`, `acceptQuestStep`,
  `turnInQuestStep`, the road opening), the quest branch of
  `resolveMapEvent` (not consumed until its step is accepted), held quests in
  `progressQuest` and `payCompletedQuests`, `endCombat` leaving a lost boss
  fight unspent and opening roads on completion; `GameAction`s
  `ACCEPT_QUEST_STEP` and `TURN_IN_QUEST_STEP` in `Game/game.reducer.ts`;
  exports.
- Consumers: none on screen yet (QL1c).
- Save / schema: none new.
- Tests: `questline-steps.engine.test.ts`.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w
  axiomancer-mobile`; the root `npm test`.

### QL1c — The quest screen and the quest node on the map · M · closes A10, A11, A12 · requires QL1b
Measure: `npm run verify -w axiomancer-mobile`; the screen tests (A10) and
payout store tests (A11) pass on a staged questline (a state fixture stages a
quest payload, as fixtures stage NPCs today).
- Scope: `app/quest/index.tsx`, its gate, `state/quest/`,
  `state/presenters/quest.engine.ts`, the interceptor in `state/actions.ts`,
  the payout (purse, satchel, spoils tiles for `card-pick`, the item-reward
  queue with the questline eyebrow, the boss-victory payout), `exploration.engine.ts`
  (the `story` type and the quest label; no progress), the feature map
  regenerated. Copy is plain and marked `[content]`.
- Consumers: `/item-reward`, the spoils tiles, the node confirm panel, AW1b's
  blurb test (bw-1 now STORY), the dev skip-event menu.
- Save / schema: none.
- Tests: the quest presenter, screen and payout tests; exploration presenter
  cases.
- Verify gate: `npm run verify -w axiomancer-mobile`; `npm run e2e:map-walk`;
  `npm run e2e:act1-walk` (bw-1's label moves); the root `npm test`.

### QL1d — The Breakwater's questline: four nodes, the sealed roads, the Belt · L · closes A13, A14, A15, A16, A17, A18, A19, A20 · requires QL1c
Measure: the A18 engine e2e walks all four steps to the Belt on the live
Breakwater, A13, A14 and A16 pass, `npm run e2e:act1-walk` passes on the
four-node map, and the A20 screenshots are on the PR.
- Scope: `breakwater.ts` (bw-19..bw-22, the re-pointed edges of bw-14/15/16,
  two sealed roads), four `quest` pools in `MapEvents/content.ts`, the
  questline in `World/quest.library.ts` with placeholder lines and rewards
  marked `[content]`, `act1-landmarks.json` and `breakwater.layout.ts`, the
  shared road-opening test helper and the walkers of A19 repaired, the walks'
  pinned counts, `docs/reports/act1-event-audit.md`, `docs/game-model.md`,
  `plan/revamp/breakwater-map.md` (the four nodes and the roads).
- Consumers: `layout-engine-parity`, `act1-layouts`, `branching-legibility`,
  `node-blurb-event` (four blurbs), the traversal audit, the state fixtures
  (the Sage fixture on bw-15), the measured report (unchanged: no fight node
  moves).
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
