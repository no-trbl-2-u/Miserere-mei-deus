# Phase QL1 — The Breakwater's questline

> Agent-facing brief, plotted by T (`/plot asap`, 2026-10-27, run unattended
> on T's word relayed from an attended session). T's task: one questline in
> Chapter 1 (the Breakwater), four steps on four new `quest` nodes, each step
> paying XP plus one extra, the last also paying the Elementalist's Belt. It
> supersedes LR1f's four-quest scope. Quest lines and the giver's copy are
> T's content (D88), written by T on Tue Nov 10; the builder writes plain
> placeholder lines marked `[content]` until then.

## Sources

- The `/plot` request (T, 2026-10-27): "asap — Chapter 1 (the Breakwater)
  questline", with T's eight decisions, recorded below as Confirmed by T.
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
  fought elite back unless its relic dropped (`retiredEliteNodes`); the supply
  rule below reads it.
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
  (nothing sets it yet). Objectives `kill` (by enemy display name), `collect`,
  `reach`, `talk`, `flag`. A quest starts counting only once it is active, so
  "counts from acceptance" (T's decision 4) is the log's existing behaviour.
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
  spent on resolution, not departure), so it is a legal move again. A quest
  node uses the same rule; no traversal change is needed.
- **Elite detection**: `isEliteEnemy` (`Combat/combat.rewards.ts`) reads
  `Enemy.difficulty === 'elite'`; ER1's elite nodes are found the same way.
- **Card rewards**: `rollCombatCardRewards` (the fight's three offers over
  the lane pool) and `addRewardCard`; mobile's spoils tiles (TQ1, TAKE CARD)
  and the cache's TAKE A CARD offer. Consumables: `consumableLibrary`
  (`minor-healing-potion`, `healing-potion`, `greater-healing-potion`).
- **Map plumbing**: mobile `NodeType` already has `'quest'` (scroll glyph,
  label `QUEST`, tag `LORE`), but it is worn today by `cutscene`, `narration`
  and `interaction` (`KIND_TO_NODE_TYPE`, `state/presenters/exploration.engine.ts`),
  so bw-1 (the windmill's cutscene) reads QUEST. Glyphs no map kind wears yet:
  `quill`, `bag`, `coin`, `shield`, `arcane`, `tombstone`.

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

- A `quest` map-event kind and its node; a step that offers, is accepted,
  counts, is turned in, and only then spends its node.
- Objectives counting any foe, elite foes, and hazards crossed.
- A step that pays several rewards (XP plus one extra, the last also a relic),
  and a quest reward that is a card pick.
- The supply rule (a step never asks for more than the map can still give).
- Abandoning the questline on leaving the Breakwater.
- The `/quest` screen, the node's own glyph, its progress on the map.
- Four new nodes on the Breakwater graph and their places on the plate.

## Outcome

The Breakwater carries one four-step questline on four `quest` nodes: the
player meets a giver, accepts a step, meets its requirement (counted from
acceptance), comes back to turn it in for XP and one extra, and the fourth
step also hands over the Elementalist's Belt through the item-reward screen.

## Acceptance

- **A1** `MapEventKind` gains `'quest'` with a `QuestPayload { kind: 'quest';
  questline: QuestlineId; step: number }` and a resolved
  `{ kind: 'quest'; questline; step; phase: 'locked' | 'offer' | 'active' |
  'ready'; quest: Quest; description?: string }`. Every exhaustive table over
  the kinds handles it (`ACT1_WALK_EVENT_KINDS` lists thirteen; mobile's
  `KIND_TO_NODE_TYPE`, `event-assets.ts`, `state/dev/skip-event.ts`). An engine
  test resolves a staged quest payload; `npm run typecheck -w axiomancer-mobile`
  passes.
- **A2** A questline is data: `World/questline.ts` defines `Questline { id;
  mapName; steps: QuestlineStep[] }` and `QuestlineStep { step; nodeId;
  quest: Quest; rewards: Reward[] }`. `Quest` gains optional `questline?` and
  `step?`, and `rewards?: Reward[]`, paid in order after `reward` by
  `payQuestReward` (a quest with only `reward` pays as today). `Reward` gains
  `{ kind: 'card-pick'; count: number }`: `payQuestReward` rolls
  `rollCombatCardRewards(player, rng, count)` and returns the offers on
  `PaidQuestReward.cardOffers` without adding a card. An engine test per
  reward kind, including a step paying XP, shillings and an item in one call.
- **A3** Kill objectives gain `foeClass?: 'any' | 'elite'` (with no `target`):
  `'any'` counts every won fight (victory or friendship) and `'elite'` only a
  foe `isEliteEnemy` accepts. A new objective type `hazard` counts each hazard
  node resolved, whatever its outcome. `settleKill` takes the enemy (name and
  difficulty), on both its callers (`endCombat`, the mobile hazard host). A
  quest's kill and hazard objectives count only on `Quest.mapName`. Tests: a
  `foeClass: 'any'` objective counts a normal, the elite and the boss; an
  `'elite'` one counts only the elite; a flee and a defeat count nothing; a win
  on another map counts nothing; a hazard resolved counts once.
- **A4** No save migration: every new field is optional and the four nodes are
  read from the static graph. A save made before QL1 loads, holds no questline
  quest, and each new node joins the frontier once its anchor is visited. A
  load test over a pre-QL1 fixture save.
- **A5** Resolving a quest node never consumes it until its step is turned in:
  the player can step off and move back (`legalMovesFrom` includes it);
  after turn-in `moveToNode` refuses it as spent. Engine test.
- **A6** Steps run in order. A node whose step's predecessor is not turned in
  resolves `phase: 'locked'`, changes nothing but the arrival, and stays
  unspent. Engine test: visit step 2's node first, then step 1's.
- **A7** `acceptQuestStep(state, questline, step)` starts the step's quest
  with every count at 0; a kill or hazard before acceptance never counts.
  Declining (leaving without accepting) changes nothing; the next visit
  offers again. Engine test: win a fight, accept, count is 0; win again,
  count is 1.
- **A8** The supply rule: at acceptance, each objective's `requiredCount`
  becomes `min(authored, supply)`, where supply is what the questline's map
  can still give: unspent hazard nodes for `hazard`; unspent encounter nodes
  (the elite and the watchtower included) for `foeClass: 'any'`; for
  `'elite'`, unspent elite nodes plus fought, unretired ones while an unspent
  rest remains (ER1). A step whose every objective clamps to 0 is `ready` at
  once. `[T to confirm #1]` Engine test per objective type, including both
  hazards spent before accepting a hazard step.
- **A9** `turnInQuestStep(state, questline, step)` on a `ready` step at its
  node pays the step's quest through the one reward door
  (`payCompletedQuests`, so XP, shillings and items land once), marks the step
  done, consumes the node, and the next step's node offers on its next visit.
  The fourth step's rewards include `relic-elementalist-belt`. Engine test
  over all four steps from a fresh game. `[T to confirm #2]`
- **A10** Leaving the Breakwater (resolving its `travel` node) with the
  questline unfinished marks the open step's quest `failed`; no later step
  offers and nothing more is paid. Engine test. `[T to confirm #3]`
- **A11** A library test over every authored questline: four steps on four
  distinct `quest` nodes of its map; each step's `rewards` holds exactly one
  `experience` and exactly one of `currency`, `card-pick` or a consumable
  item, and the last step also exactly one relic; every relic a questline pays
  has `relicSource: 'quest'` (none is elite-only).
- **A12** The `/quest` screen: a `<QuestGate>` routes a resolved `quest` event
  there (the interceptor pattern of rest, cache and the Anvil in
  `state/actions.ts`). It shows the giver's line, "Step n of 4", the
  requirement, the progress ("1 of 2 fights won"), and the rewards. `offer`:
  ACCEPT and LEAVE. `active`: LEAVE. `ready`: TURN IN. `locked`: one line and
  LEAVE. A screen test per phase, and a store test that ACCEPT and TURN IN
  dispatch the engine calls.
- **A13** The payout on turn-in: XP and shillings appear on the screen and in
  the purse; a consumable goes to the satchel; a `card-pick` opens the three
  offers on the spoils tiles (TAKE CARD or skip, as a fight's reward); the Belt
  arrives through `/item-reward` (TO THE SATCHEL / WEAR IT NOW), its eyebrow
  naming the questline. A store test per extra.
- **A14** The map: the `quest` kind maps to `NodeType 'quest'` (label QUEST,
  the scroll glyph); `cutscene`, `narration` and `interaction` move to a new
  `NodeType 'story'` (label STORY, tag LORE, the quill glyph), so bw-1 no
  longer reads QUEST. A presenter test pins both.
- **A15** The map shows a step's state: the selection panel's line for a quest
  node reads the step and its progress ("Step 2 of 4 · 1 of 2 fights won") and
  a `ready` node is marked READY; a `locked` node reads "Step n of 4". A
  presenter test. `[T to confirm #4]`
- **A16** The river bridge's confirm (the travel door, bw-18) adds one line
  while the questline is unfinished, naming that crossing abandons it. A
  presenter test with and without an open step. `[T to confirm #3]`
- **A17** The Breakwater's questline is authored: four steps on four new
  nodes `bw-19`..`bw-22`, each a spur joined to one existing node (step 1 to
  bw-1 the windmill, step 2 to bw-9 the customs house, step 3 to bw-13 the
  harbour town, step 4 to bw-15 the clifftop chapel), registered as `quest`
  pools in `MapEvents/content.ts`, with placeholder lines marked `[content]`
  and placeholder rewards (below). `[T to confirm #5]` `[T to confirm #6]`
- **A18** The mobile layout places the four nodes on the coast plate
  (`act1-landmarks.json` gains four marks beside their anchors;
  `breakwater.layout.ts`); `layout-engine-parity`, `act1-layouts` and
  `branching-legibility` pass.
- **A19** An engine e2e from a fresh game walks the questline on the live
  Breakwater: accept each step, meet it, turn it in, and the Belt is queued;
  carried unworn, `elementalist` is not in `unlockedLaneIds` (D107); worn, it
  is, and the next combat reward holds an Elementalist card.
- **A20** `npm run e2e:map-walk` and `npm run e2e:act1-walk` pass on the
  four-node map (the act1 plan derives its path, so only pinned counts and
  the audit table move); `docs/reports/act1-event-audit.md` lists the
  thirteenth kind.
- **A21** Browser evidence on the web build: a 375-wide screenshot of the
  `/quest` screen on an `offer`, and one of `/item-reward` handing over the
  Belt with its "Lane: Elementalist (while worn)" line, attached to the QL1d
  PR.
- **A22** Done when recorded (QL1e, attended): T's quest line is in this
  brief's "T's quest line" table: the questline's name, the giver's lines per
  step (offer, active, ready, turned in), the requirement and count per step,
  the XP per step, and which extra each step pays (shillings with an amount, a
  card pick, or a named consumable).
- **A23** T's quest line is in the game: every `[content]` placeholder of A17
  is replaced by T's table (A22), requirements, counts, XP and extras
  included; A11 and A19 still pass; no `[content]` marker is left in the
  questline's source.

Measure: `npm run verify -w axiomancer-mechanics` and `npm run verify -w
axiomancer-mobile` pass, the A19 engine e2e walks all four steps to the Belt
on the live Breakwater, and `npm run e2e:act1-walk` passes on the four-node map.

## Scope

- `axiomancer-mechanics`: `World/MapEvents/types.ts` (the kind, payload,
  resolved event), `World/MapEvents/handlers.ts` and `resolve-map-event.ts`
  (the quest branch: not consumed until turned in; the hazard objective
  advance), `World/types.ts` (`Quest.questline?`, `step?`, `rewards?`;
  `QuestObjective.foeClass?`; objective type `hazard`; `Reward`'s
  `card-pick`), `World/quest.engine.ts` (map-scoped, class-aware kills;
  `rewards` paid in order; `cardOffers`), a new `World/questline.ts` (the
  types, `acceptQuestStep`, `turnInQuestStep`, `questStepPhase`, the supply
  rule, abandon on leaving), `World/quest.library.ts` (the Breakwater
  questline), `Game/game.reducer.ts` (`endCombat` passes the enemy;
  the travel resolve abandons), `World/Continents/Coastal-Village/breakwater.ts`
  (four nodes), `World/MapEvents/content.ts` (four pools), `World/act1-walk.ts`
  (thirteen kinds), `src/index.ts` and `World/index.ts` exports;
  `docs/game-model.md`, `axiomancer-mechanics/docs/world.md` (the map wiring
  contract names the new kind).
- `axiomancer-mobile`: `state/presenters/exploration.engine.ts` (kind
  mapping, `story` type, quest node label and progress, the bridge line),
  `state/actions.ts` (the quest interceptor), a new `state/quest/` slice and
  `app/quest/index.tsx` with its gate, `state/presenters/quest.engine.ts`,
  `state/item-reward/relic-sources.ts` (the questline eyebrow), the spoils
  tiles reused for `card-pick`, `state/dev/skip-event.ts`,
  `state/presenters/event-assets.ts`, the hazard host's `settleKill` call,
  `assets/images/maps/act1-landmarks.json` and
  `state/exploration-maps/breakwater.layout.ts`, `scripts/act1-walk-e2e.mjs`
  and `scripts/map-walk-e2e.mjs` (re-pinned only where they pin counts).
- Root: `docs/feature-map/` regenerated for the new route
  (`node scripts/feature-map.mjs`), `docs/reports/act1-event-audit.md`.
- Plan: `plan/revamp/breakwater-map.md` gains the four nodes when QL1d ships.

## Consumers to update

The map canvas and node confirm panel, `/event` (never reached by a quest
node), `/item-reward`, the combat aftermath (unchanged: a fight's kill only
advances the log), the hazard host, the Memoir tab (lists the questline's
quests as the log holds them; unchanged), the dev skip-event menu, the
feature map, `e2e:act1-walk`, `e2e:map-walk`, AW1b's
`node-blurb-event.test.ts` (bw-1's label moves from QUEST to STORY; the four
new nodes get blurbs), `layout-engine-parity.test.ts`.

## Save / schema contracts

- `Quest.questline?`, `Quest.step?`, `Quest.rewards?`,
  `QuestObjective.foeClass?`: optional, additive; the quest log already rides
  the save. `QuestObjectiveType` gains `hazard` and `Reward` gains
  `card-pick`: no saved quest holds either before QL1. No migration (A4).
- The four nodes come from the static graph; the frontier is derived, so old
  saves read them on first load.
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
- **Four steps on four quest nodes, done in order, each node revisitable
  until its step is done (Confirmed by T, 2026-10-27).** Requirement types:
  kill any foes, kill elites, cross hazards.
- **A requirement counts only from acceptance (Confirmed by T, 2026-10-27).**
  The quest log already behaves so: only an active quest counts.
- **Each step pays XP plus exactly one extra: shillings, a card reward or a
  consumable (Confirmed by T, 2026-10-27).** Which extra per step is T's, set
  on Nov 10 (A22). Until then the builder's placeholders, all marked
  `[content]`: 40 XP per step (one normal Breakwater fight's worth at level
  2); step 1 10 shillings, step 2 a `minor-healing-potion`, step 3 a card pick
  of three, step 4 15 shillings.
- **The fourth step also pays the Elementalist's Belt (Confirmed by T,
  2026-10-27),** `relic-elementalist-belt`, `relicSource: 'quest'`.
- **Quest lines and the giver's copy are T's (Confirmed by T, 2026-10-27,
  D88),** written Tue Nov 10 (QL1e) and landed before the Nov 16 MVP (QL1f).
- **LR1f is superseded (Confirmed by T, 2026-10-27).** Its build-plan row is
  `[skipped]` and PR #987 is T's to close; nothing on its branch is merged.
- **A step is turned in at its node (default).** Meeting the requirement
  makes the step `ready`; the player walks back and taps TURN IN, and the
  payout happens on the quest screen. Read as T's decision 3: the node is
  revisitable until its step is done. `[T to confirm #2]`
- **The four nodes are new spurs, not re-kinded landmarks (default).** Each
  `bw-19`..`bw-22` is joined to one existing node, a ring further out per
  step: the windmill (bw-1, so step 1 is on offer from the first move), the
  customs house (bw-9), the harbour town (bw-13), the clifftop chapel
  (bw-15). The plate positions sit beside each anchor; T reviews them in the
  Nov 3 map review. No existing node changes kind or edge. `[T to confirm #5]`
- **The map shows a step's progress (default).** See A15. `[T to confirm #4]`
- **The four requirements (default):** step 1 cross 1 hazard (bw-3 in ring 1,
  bw-12 in ring 3), step 2 win 2 fights, step 3 defeat 1 elite (the North
  Pier's Green Jelly, or the same foe back after a rest), step 4 win 2 fights
  (the lighthouse and the watchtower both count). Placed so each step's supply
  mostly lies ahead of its node. T may change any count on Nov 10.
  `[T to confirm #6]`
- **The supply rule (default):** see A8. A step never asks for more than the
  map can still give, and a step it can give nothing for is ready at once.
  `[T to confirm #1]`
- **Leaving abandons (default).** The river bridge is a one-way door; crossing
  with the questline unfinished marks the open step failed, and the bridge's
  confirm says so first (A10, A16). `[T to confirm #3]`
- **A locked step's node says only "Step n of 4"** and stays unspent; it
  offers once its predecessor is turned in. Not T's call: T's decision 3 sets
  the order.
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
  then the step rules (QL1b), the screen against a staged questline (QL1c),
  the Breakwater's content and nodes (QL1d, the first thing the player sees
  on a real run), T's sitting (QL1e, attended, nothing built) and T's lines in
  (QL1f).
- **Slotted asap (T):** above the first open row, DF1d.

## T's quest line (QL1e, written by T on Tue Nov 10)

Empty until T's sitting. One row per step:

| Step | Node | Requirement and count | XP | Extra | Giver: offer | Giver: active | Giver: ready | Giver: turned in |
|---|---|---|---|---|---|---|---|---|
| 1 | bw-19 | | | | | | | |
| 2 | bw-20 | | | | | | | |
| 3 | bw-21 | | | | | | | |
| 4 | bw-22 | | | | (and the Belt) | | | |

Questline name: _(T's)_.

## Tests matrix

- Added (mechanics): `World/e2e/questline-contract.engine.test.ts` (A1-A4),
  `World/e2e/questline-steps.engine.test.ts` (A5-A10),
  `World/quest.library.test.ts` (A11), `World/e2e/breakwater-questline.engine.test.ts`
  (A19); cases in `World/e2e/kill-objectives.engine.test.ts` (A3).
- Added (mobile): `state/presenters/__tests__/quest.engine.test.ts`,
  `state/e2e/quest.screen.test.tsx` (A12), `state/e2e/quest-payout.engine.test.ts`
  (A13), exploration presenter cases (A14-A16).
- Rewritten: `node-blurb-event.test.ts` (bw-1 reads STORY; four new nodes),
  `act1-walk.test.ts` (thirteen kinds), any traversal audit pinning the
  Breakwater's node or route count.
- Unchanged and must pass: `World/e2e/quest-rewards.engine.test.ts` (a
  single-`reward` quest pays as today), `Combat/e2e/elite-reward.engine.test.ts`,
  `World/e2e/elite-respawn*.test.ts`.

## Verify gate

`npm run verify -w axiomancer-mechanics`; `npm run verify -w
axiomancer-mobile` (every phase touches `src/World/**`); `npm run e2e:map-walk`
and `npm run e2e:act1-walk` (QL1c, QL1d, QL1f); the A21 screenshots (QL1d);
the root `npm test`.

## Commit body template

```
Phase QL1<a|b|c|d|f> — <title>

Closes <ids> of plan/phases/phase_QL1_breakwater_questline.md.
<what changed>
Verify: <commands and results>
```

## DoD

A1-A23 ticked across QL1a-QL1f (A22 by QL1e, attended); the Measure met.

## Follow-ups (out of scope)

- Chapters 2-4's quest lines (the Ruby Signet, the Bleeding Signet, the
  Brooch, the Carapace Belt): T writes them (W3, Nov 25), then a `/plot` on
  this questline's shape.
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
  quest payload returns `offer` for step 1 and consumes nothing; the step
  rules are QL1b's); `World/questline.ts` types only; `Quest` and
  `QuestObjective` fields; `Reward`'s `card-pick` and `rewards` paid in order;
  map-scoped, class-aware `settleKill` on both callers; the `hazard`
  objective; `ACT1_WALK_EVENT_KINDS`. Mobile: the mechanical entries every
  exhaustive kind table needs (`KIND_TO_NODE_TYPE` maps `quest` to the
  existing `'quest'` type for now; skip-event; event-assets), no screen.
- Consumers: exports; mobile typecheck; the hazard host's `settleKill` call.
- Save / schema: the optional fields above; the pre-QL1 load test (A4).
- Tests: `questline-contract.engine.test.ts`, `kill-objectives` cases,
  `quest-rewards` unchanged, `act1-walk.test.ts`.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w
  axiomancer-mobile`; the root `npm test`.

### QL1b — The step rules: offer, accept, count, turn in, abandon · M · closes A5, A6, A7, A8, A9, A10 · requires QL1a
Measure: `npm run verify -w axiomancer-mechanics`; the step-rule tests
(A5-A10) walk a fixture questline on a fixture map through every phase.
- Scope: `World/questline.ts` (`questStepPhase`, `acceptQuestStep`,
  `turnInQuestStep`, the supply rule, abandon), the quest branch of
  `resolveMapEvent` (not consumed until turned in; consumed after), the
  travel resolve abandoning an unfinished questline of the departed map;
  `GameAction`s `ACCEPT_QUEST_STEP` and `TURN_IN_QUEST_STEP` in
  `Game/game.reducer.ts`; exports.
- Consumers: none on screen yet (QL1c).
- Save / schema: none new.
- Tests: `questline-steps.engine.test.ts`.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w
  axiomancer-mobile`; the root `npm test`.

### QL1c — The quest screen and the quest node on the map · M · closes A12, A13, A14, A15, A16 · requires QL1b
Measure: `npm run verify -w axiomancer-mobile`; the screen tests (A12) and
payout store tests (A13) pass on a staged questline (a state fixture stages a
quest payload, as fixtures stage NPCs today).
- Scope: `app/quest/index.tsx`, its gate, `state/quest/`,
  `state/presenters/quest.engine.ts`, the interceptor in `state/actions.ts`,
  the payout (purse, satchel, spoils tiles for `card-pick`, the item-reward
  queue with the questline eyebrow), `exploration.engine.ts` (the `story`
  type, the quest label and progress, READY, the bridge's line), the feature
  map regenerated. Copy is plain and marked `[content]`.
- Consumers: `/item-reward`, the spoils tiles, the node confirm panel, AW1b's
  blurb test (bw-1 now STORY), the dev skip-event menu.
- Save / schema: none.
- Tests: the quest presenter, screen and payout tests; exploration presenter
  cases.
- Verify gate: `npm run verify -w axiomancer-mobile`; `npm run e2e:map-walk`;
  `npm run e2e:act1-walk` (bw-1's label moves); the root `npm test`.

### QL1d — The Breakwater's questline: four nodes, four steps, the Belt · M · closes A11, A17, A18, A19, A20, A21 · requires QL1c
Measure: the A19 engine e2e walks all four steps to the Belt on the live
Breakwater, A11 passes, `npm run e2e:act1-walk` passes on the four-node map,
and the A21 screenshots are on the PR.
- Scope: `breakwater.ts` (bw-19..bw-22 and their edges), four `quest` pools in
  `MapEvents/content.ts`, the questline in `World/quest.library.ts` with
  placeholder lines and rewards marked `[content]`, `act1-landmarks.json` and
  `breakwater.layout.ts`, the walks' pinned counts,
  `docs/reports/act1-event-audit.md`, `docs/game-model.md`,
  `plan/revamp/breakwater-map.md` (the four nodes).
- Consumers: `layout-engine-parity`, `act1-layouts`, `branching-legibility`,
  `node-blurb-event` (four blurbs), the traversal audit, the measured report
  (unchanged: no fight node moves).
- Save / schema: none (A4 already covers the new nodes).
- Tests: `breakwater-questline.engine.test.ts`, `quest.library.test.ts`, the
  re-pinned layout and walk tests.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w
  axiomancer-mobile`; `npm run e2e:map-walk`; `npm run e2e:act1-walk`; the
  A21 screenshots; the root `npm test`.

### QL1e — T writes the Breakwater's quest line (attended) · S · closes A22 · requires QL1d
Measure: the "T's quest line" table above is filled in T's words and committed.
- T's Tue Nov 10 sitting (`plan/deadlines.md`). The agent drafts options in
  the game's voice per row and the placeholder rewards for T to keep or
  change; T picks and rewrites. Nothing built (D88).

### QL1f — T's quest line in the game · S · closes A23 · requires QL1e
Measure: `git grep -n "\[content\]" -- axiomancer-mechanics/src/World/quest.library.ts`
finds nothing for the questline; A11 and A19 pass with T's numbers.
- Scope: `World/quest.library.ts` (lines, counts, XP, extras), the quest
  screen's copy if T's table changes a label, `docs/game-model.md`'s numbers.
- Consumers: the A19 e2e and A11 re-read the library; no pin changes unless T
  moves a node.
- Save / schema: none.
- Tests: A11 and A19 unchanged and green.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w
  axiomancer-mobile`; `npm run e2e:act1-walk`; the root `npm test`.
