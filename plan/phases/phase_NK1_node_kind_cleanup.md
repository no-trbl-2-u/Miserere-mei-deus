# Phase NK1 — The overworld's node kinds, cut to eight

> Agent-facing brief, plotted by T (`/plot`, 2026-10-28, attended). T's task:
> cut the overworld's map-event kinds to the ones the game needs. Keep
> encounter, hazard, rest, loot cache, cutscene, quest, village, travel and
> labyrinth; remove gathering, interaction and narration; fold the Anvil
> (blacksmith) into the village, which offers three counters (a paid rest, a
> shop that sells cards and removes them for a fee, and the Anvil); rework
> travel into a "move to X?" choice with flavor text and art, which can lead
> to another node on the same map (a secret path) as well as to another map;
> keep the labyrinth built but out of reach. It lands before the Breakwater
> redraw (T's ~45-node road web, a later plot), so that map is drawn on the
> final kinds.

## Sources

- The `/plot` request (T, 2026-10-28), from an attended session. T's words on
  each kind: "gathering: remove", "blacksmith: make it a sub-option within
  village", "village: keep (ie: rest (pay), shop (pay for card removal or buy
  cards), blacksmith", "interaction: remove", "narration: remove", "travel:
  keep (but let's modify this so it's just an option to move to x with some
  nice flavor text and art. This way we can use it for inner-region travel for
  lines that don't connect. Leave it up to the player to learn and
  remember)", "labyrinth: keep ... keep everything about it, but keep it
  hidden". On the secret paths: "ask the user (move to x?). If they do, move
  the player to that new space. If they say no, keep them there. However,
  they'll always have the option to trigger these movement nodes back and
  forth." Later in the same session: "'shop' and 'anvil' don't exist.
  Together, they make up the 'village' event node."
- **D112** (this plot, recorded in the decisions file): the overworld's node kinds. **D111** (the `quest`
  kind, QL1), **D106** (each region is a chapter; the MVP is Chapter 1),
  **D88** (content and art from a T-approved brief; art is T's), **D93**
  (lands by `plot` PR).
- `plan/revamp/breakwater-map.md` (today's Breakwater nodes and kinds) and
  `plan/deadlines.md` (the per-kind event sittings this plot adds; the MVP on
  Nov 16; v0.3 on Dec 28).
- **Not this plot:** backtracking onto completed nodes (which nodes work again
  on a revisit, and how the player walks) is being plotted in a separate
  session T opened on 2026-10-28. NK1 neither depends on it nor builds it; see
  "Decisions" for where the two meet.

## What exists

Read from the tree on 2026-10-28 (paths under `axiomancer-mechanics/src` for
the engine, `axiomancer-mobile` for the app):

- **The kind union** is `MapEventKind` in `World/MapEvents/types.ts:24-37`
  (14 kinds; payloads `:64` interaction, `:71` gathering, `:101` village,
  `:138` narration, `:161` blacksmith, `:181` travel, `:196` labyrinth), with
  the `ResolvedEvent` union at `:253-283`. Dispatch:
  `World/MapEvents/handlers.ts:366-386`. Consume rules:
  `World/MapEvents/resolve-map-event.ts` (`gathering` ticks collect objectives
  at `:392`; `travel` returns before consume at `:413`; `labyrinth` and
  `quest` are never consumed at `:425`); mobile mirrors the no-consume list at
  `state/actions.ts:1469-1470`.
- **`none` is not a kind.** A node with no event pool reveals and consumes
  with no event (`resolve-map-event.ts:341`); `getNodePrimaryEventKind`
  returns `undefined` for it and mobile then draws it as an encounter
  (`state/presenters/exploration.engine.ts:306`).
- **Live content** (`World/MapEvents/content.ts`): gathering on bw-4, bw-11,
  cw-4, cw-8, cw-14, bc-7, ld-7; one Anvil per map (`ACT1_ANVIL_NODES`,
  `:148`): bw-16, cw-18, bc-12, ld-14; travel on bw-18, cw-20, bc-17, all
  inter-map doors; no live interaction, narration or village node. Fixtures:
  a narration ("dialogue") fixture at `Game/fixtures/fixture-content.ts:65`
  and a village fixture at `:70`; `components/DebugTriggerEncounter.tsx:84`
  stages a village.
- **The labyrinth** has no door on any overworld map (ld-15, the vault door,
  is a sealed cutscene; ld-18 is sealed too); it is reached only from `/dev`
  (`components/DebugWorldTravel.tsx:99,158`, `app/devart/rooms.tsx`). Its own
  pools (`World/Labyrinth/labyrinth.pools.ts`) use `gathering` and `narration`:
  the default pool at `:101`, `:114`; quest rooms, entries, gates and the
  Oubliette are narration overrides (`:132`, `:181`).
- **The village today** (`state/presenters/village.engine.ts:182-260`): named
  merchants, and BUY and SELL tabs when the event carries a `shop`; wares are
  consumables or relics at a flat `ShopWare.price` (`Items/shop.types.ts`).
  No rest, no card buying, no card removal.
- **Card removal** exists only at a rest node, as the `cut` offer
  (`World/RestChoice/restchoice.engine.ts:57-82`), priced `5 + 5 x removals`
  per run (`Cards/card.removal.pricing.ts:32`, counter
  `Character.cardRemovals`); the primitive is `removeCardFromCombatDeck`.
  **Rest** heals 25% of max VITAE, free (`restchoice.content.ts`).
- **Card buying** exists nowhere. The reward pool a card offer can draw from:
  `rewardPoolFor` (`Combat/combat.rewards.ts:72`) over `laneRewardPool`
  (`Cards/card.lanes.ts:102`).
- **The Anvil** (`World/Blacksmith/blacksmith.engine.ts:62`): hone 3, temper
  5, swap die gear 8, upgrade one card per visit 5 shillings; screen
  `app/blacksmith`; the payload's `budget: 12` is a placeholder (mobile uses
  the wallet).
- **Gathering materials** are consumed by nothing (no `collect` objective in
  `quest.library.ts`, no crafting); they are sell-for-1 inventory items.
- **Travel today** (`handlers.ts:293-324`): leaves the map (marks it complete,
  switches continent, unlocks and restores or creates the destination's
  `MapState`). Mobile: the generic `NodeConfirmPanel` before the walk ("PATH
  ONWARD", "LEAVE · NEXT MAP", scroll glyph), then an immediate crossing with
  a toast "You cross into {region}"; no prompt, no art.
- **Moving within a map** (`World/world.reducer.ts`): `moveToNode` (`:238`) is
  the only arrival verb and allows only frontier nodes; `teleportToNode`
  (`:542`) throws on overworld maps; `placeOnNode` (`:765`) is the dev and
  fixture verb (un-spends the node, owes nothing). Visited = completed,
  consumed or current (`visitedSet`, `:70`). A never-consumed node the player
  has left is unvisited again, so it rejoins the frontier and can be entered
  again.
- **Saves** (`Game/game.reducer.ts:137`, `GAME_STATE_VERSION = 39`; chain in
  `Game/game.migrate.ts`, last step `migrateV38ToV39` at `:1014`). Event
  payloads are not saved: `MapState` (`World/types.ts:290`) holds node ids and
  lists, and pools are re-registered from content on load. So re-authoring a
  node changes its kind in every old save; only a live session or a
  `pendingArrival` on a re-authored node needs care.
- **Every place that lists the kinds:** `World/act1-walk.ts:49-52`
  (`ACT1_WALK_EVENT_KINDS`) and `:248` (the travel chain orders the regions);
  `World/roster-health.ts:200-237`; `World/narrative-reachability.ts:60`;
  `Record<MapEventKind, NodeType>` at `exploration.engine.ts:279` and the
  `Record<NodeType, ...>` maps at `:215`, `:237`, `:257` and
  `components/exploration/ExplorationNode.tsx:61`;
  `Record<ResolvedEvent['kind'], string>` at
  `state/presenters/event-assets.ts:78`; the switches at `event-assets.ts:41`,
  `event.engine.ts:600`, `handlers.ts:371`; `state/dev/skip-event.ts:117`;
  the `content.engine.test.ts` parity guard; `roster-health.engine.test.ts`
  (`:109-188`).

## Outcome

The overworld has eight node kinds (encounter, hazard, rest, loot cache,
cutscene, quest, village, travel), plus the empty waypoint and the hidden
labyrinth door; every Act 1 map uses only those; a village offers a paid rest,
a card shop and the Anvil; and a travel node asks "move to X?" over its art
and flavor text and can lead to a node on the same map.

## Acceptance

- **A1** `MapEventKind` no longer contains `gathering`, `interaction` or
  `narration`; `npm run verify -w axiomancer-mechanics`
  type-checks with every exhaustive switch and `Record` in "What exists"
  updated, and nothing in either workspace names a removed kind except the
  save migration.
- **A2** The seven gathering nodes (bw-4, bw-11, cw-4, cw-8, cw-14, bc-7,
  ld-7) carry no event pool, and an engine test resolves each to nothing.
- **A3** A node with no event pool draws on the map as an empty waypoint (its
  own glyph and tag, not an encounter), pinned by a presenter test.
- **A4** The labyrinth's own pools use only kept kinds (their narration lines
  become `cutscene` lines, their gathering grants become `loot-cache` items),
  and the labyrinth's existing e2e journeys still pass.
- **A5** A guard test fails if any overworld map (every continent's maps)
  places a `labyrinth` door; `/dev` still enters the labyrinth.
- **A6** An old save loads and plays on: a fixture save whose `pendingArrival`
  sits on a former gathering node, and one with an open Anvil session, both
  load through `migrate`, and the node resolves to nothing or the session
  lands on the village, with no throw.
- **A7** `MapEventKind` no longer contains `blacksmith`, and the four Anvil
  nodes (bw-16, cw-18, bc-12, ld-14) are village nodes,
  and the village screen opens the existing Anvil (same prices and rules as
  today) as one of its counters; the standalone `/blacksmith` route is reached
  only from the village.
- **A8** A village's paid rest heals the player 25% of max VITAE for 6
  shillings, once per visit, and is refused (shown, not hidden) when the purse
  is short.
- **A9** A village's card shop offers three cards from the player's reward
  pool at 6 shillings each, the same three for that village for the whole run
  (seeded by the run and the node), and a bought card joins the combat deck.
- **A10** The village's card shop removes a chosen card for the price
  `card.removal.pricing.ts` already sets (`5 + 5 x removals`), and the rest
  node no longer offers `cut`.
- **A11** The village no longer sells or buys consumables or relics; the
  `shop` wares and the SELL tab are gone.
- **A12** The travel payload names its destination as either another map or a
  node on the same map, plus prompt text and an art slug; an engine test moves
  the player through a same-map travel pair and back again.
- **A13** Arriving through a travel node places the player on its destination
  (the paired travel node at the far end), which counts as visited, so its
  roads join the frontier; nothing on the far node fires on arrival; tapping
  the travel node the player stands on offers the passage again.
- **A14** A travel node may name `opensAfter` (a node id); until that node is
  spent, its prompt says the way is shut and offers no move.
- **A15** Mobile shows a travel node as one screen: its art, its flavor text
  and the question "Move to {destination}?", with yes (moves) and no (stays on
  the node); nothing on the map draws where a passage leads.
- **A16** The three inter-map doors (bw-18, cw-20, bc-17) use the new travel
  screen, and `act1-walk` still orders the four regions by them.

Measure: `npm test` at the root passes, and a run on the web build reaches the
Breakwater's village (bw-16), buys a card, removes a card, rests for
shillings, opens the Anvil, and takes the bw-18 door through the new travel
screen.

## Scope

- **axiomancer-mechanics:** `World/MapEvents/` (types, handlers, dispatcher,
  content), `World/Labyrinth/labyrinth.pools.ts`, `World/world.reducer.ts` (a
  gauntlet-legal arrival verb for a same-map travel), `World/RestChoice/`
  (`cut` leaves the rest), the village and Anvil engines, a card-shop engine
  (new, small: offer and buy), `World/act1-walk.ts`, `World/roster-health.ts`,
  `World/narrative-reachability.ts`, `Game/game.migrate.ts`,
  `Game/fixtures/`.
- **axiomancer-mobile:** `state/actions.ts`, `state/presenters/` (event,
  exploration, village, event-assets), `app/village`, `app/blacksmith` (reached
  from the village), a travel screen (new, or the event screen's travel
  variant), `components/exploration/ExplorationNode.tsx`,
  `state/dev/skip-event.ts`, `components/DebugTriggerEncounter.tsx`.
- **Not touched:** the labyrinth's rules, rooms and screens (only its pool
  kinds change); the quest kind (QL1); combat; the Breakwater's node layout
  (the redraw is its own plot).

## Consumers to update

Every enumeration under "What exists" (act1-walk, roster-health,
narrative-reachability, the presenter `Record`s and switches, skip-event, the
content parity guard); the `/dialogue` route loses its two map-event callers
(it stays if anything else routes there; see Follow-ups); the dev trigger for
the village; the event-assets art table (travel gains a per-node art slug).

## Save / schema contracts

- `GAME_STATE_VERSION` 39 → 40 in NK1a with `migrateV39ToV40`: clears a
  `pendingArrival` that sits on a node whose pool no longer exists and clears
  a dangling dialogue cursor from a removed `interaction`/`narration` event.
  Map lists need nothing (payloads are re-read from content).
- NK1b: an open Anvil session in a v40 save is kept; it resumes as the
  village's Anvil counter. No version bump unless the session shape changes;
  if it does, v41.
- NK1c: the village payload gains `rest` and `cardShop`; the card-shop offer
  is derived (seeded), not saved; bought and removed cards change the deck as
  rewards and rest `cut` do today. `Character.cardRemovals` keeps counting.
- NK1d: `TravelPayload` becomes `{ kind: 'travel'; destination: { map:
  MapName; continent: ContinentName } | { node: NodeId }; prompt: string;
  art?: string; opensAfter?: NodeId }`; the three doors are re-authored.
  Nothing saved changes (payloads are content).

## Decisions made upfront — DO NOT ASK

1. **The empty waypoint stays as "no pool", not a new kind** (A2, A3). That is
   how "none" works today; NK1 only gives it its own map look. T's "migrate to
   none" is met by re-authoring, since payloads are not saved.
2. **Gathering nodes become empty waypoints** until the Breakwater redraw and
   Chapters 2-4's plots re-author them [T to confirm #1]. Gathering material
   item definitions stay, so items already in a save still load and sell for
   1; nothing grants them any more.
3. **The labyrinth's narration lines become `cutscene` lines and its gathering
   grants become `loot-cache` items** [T to confirm #2]. The Sophist's
   nameplate on those lines is lost; the words are kept verbatim. This keeps
   "everything about it" working while the kinds go.
4. **"Hidden" means no door on any overworld map**, which is already true; A5
   turns it into a test. The `/dev` entry stays.
5. **Card removal moves from the rest node to the village** [T to confirm #3]:
   T listed removal under the village's shop; one place to remove cards keeps
   the price ladder meaningful.
6. **The village shop sells cards only** [T to confirm #4]: today's consumable
   and relic wares and the SELL tab go, since T named the shop as card buying
   and removal.
7. **Paid rest: 25% of max VITAE for 6 shillings, once per visit**
   [T to confirm #5]. The heal matches a rest node; the price sits between the
   Anvil's hone (3) and swap (8). Numbers are tuning, not law.
8. **Card shop: three cards from the player's own reward pool at 6 shillings
   each, fixed per village per run** [T to confirm #6]. The reward pool keeps
   lanes honest (D104, D107); fixing the offer stops a revisit from re-rolling
   it, which matters once backtracking lands.
9. **Arriving through a passage counts as visiting the far end**
   [T to confirm #7]: its roads join the frontier, which is what makes a
   secret path open a new part of the map. The far end is the paired travel
   node, so the player can take it straight back (A13).
10. **Nothing fires on arrival through a passage** (A13): the player stands on
    the far travel node with nothing owed (`pendingArrival` null), and taps it
    to go back, which reuses today's "tap the node you stand on" retry.
11. **A passage can be sealed until a node is spent** (`opensAfter`, A14), for
    T's "trigger after an elite node or something". It reuses "spent", not a
    new flag.
12. **Travel copy and art are T's (D88).** The builder writes `[content]`
    placeholder lines and uses the existing travel art slug until T picks art;
    the three doors keep today's words as their prompt.
13. **Where NK1 meets backtracking** (the other session's plot): NK1 does not
    change which completed nodes can be entered. A travel node is never
    consumed, so it is entered again under today's frontier rule; the village
    is consumed today like other nodes, and becoming re-enterable is the
    backtracking plot's to decide.
14. **Phase order:** NK1a is the contract (the union, the migration) and comes
    first; NK1b and NK1d both need only NK1a, so either can go next; NK1c
    needs the village from NK1b.

## Tests matrix

- Engine: `MapEvents/e2e` `narration-kind`, `gathering-grant` and
  `blacksmith-kind` deleted or rewritten to their replacements; `node-event-kind`,
  `map-events`, `content`, `description-passthrough` updated; new
  `village-counters`, `card-shop`, `travel-passage`, `labyrinth-hidden` suites;
  `game.migrate` gets a v39→v40 case; `loot-stacking`, `roster-health`,
  `act1-walk` updated.
- Mobile: `event-assets`, `event.engine`, `event.screen`, `exploration` presenter
  (waypoint glyph), `village-*`, `labyrinth-door`, `gathering-acknowledgement`
  (deleted), a new travel-screen test.

## Verify gate

`npm run verify -w axiomancer-mechanics`, `npm run verify -w
axiomancer-mobile`, root `npm test`; for NK1c and NK1d, `verify:visual` on the
village and travel screens.

## Commit body template

`<what the slice changed, in plain words>. Closes A<n>, ... Kinds left: <list>.`

## DoD

A1-A16 ticked.

## Follow-ups (out of scope)

- **Backtracking** (which nodes work again on a revisit, how the player walks):
  the other session's plot.
- **The Breakwater redraw** (T's road web, the secret paths as travel pairs):
  a later plot, after NK1.
- **Each kind's full treatment** (art, transitions, copy, animation): T's
  per-kind sittings in `plan/deadlines.md`, one kind at a time.
- **Deleting `/dialogue`** if nothing else routes to it after NK1a: a later
  `/iterate` once confirmed unused.

## Phases

### NK1a — Three kinds removed, the waypoint drawn, the labyrinth hidden · L · closes A1, A2, A3, A4, A5, A6 · requires nothing
Measure: `npm test` passes with `gathering`, `interaction` and `narration` gone
from `MapEventKind`; the migrate test loads a v39 save standing on bw-4.
- Scope: the union and payloads (the blacksmith stays until NK1b); content (gathering nodes to no pool; the labyrinth
  pools re-authored; the narration fixture becomes a cutscene fixture); every
  enumeration; the waypoint glyph; the labyrinth guard test; v40 migration.
- Tests: as the matrix, engine and mobile, minus village and travel.
- Verify: both workspaces' `verify`, root `npm test`.

### NK1b — The Anvil inside the village · M · closes A7 · requires NK1a
Measure: on the web build bw-16 opens a village whose Anvil counter hones a
die for 3 shillings; `blacksmith` is not in `MapEventKind`.
- Scope: `blacksmith` folded into `village` (the payload gains an `anvil`
  counter); the four Anvil nodes re-authored as villages; the village screen
  gains the Anvil counter and opens `app/blacksmith` from it; mobile's Anvil
  action wiring; an open Anvil session resumes in the village.
- Tests: `blacksmith-kind` rewritten as `village-counters` (Anvil part); the
  village presenter and screen tests.
- Verify: both workspaces, root `npm test`, `verify:visual` on the village.

### NK1c — Paid rest and the card shop · L · closes A8, A9, A10, A11 · requires NK1b
Measure: on the web build bw-16's village rests for 6 shillings, sells one of
three cards for 6, and removes a card for 5; the rest node offers no `cut`.
- Scope: the village's paid rest and card shop (offer, buy, remove); `cut`
  moved out of the rest node; the ware shop and SELL tab removed; copy
  placeholders `[content]` where T writes words.
- Tests: `village-counters` (rest and shop parts), `card-shop`, the rest
  choice tests, the village presenter and screen tests.
- Verify: both workspaces, root `npm test`, `verify:visual` on the village.

### NK1d — Travel: "Move to X?" · L · closes A12, A13, A14, A15, A16 · requires NK1a
Measure: an engine test walks a same-map travel pair there and back; on the
web build bw-18 shows the travel screen and crossing to the Charcoal Wood
still works.
- Scope: the new `TravelPayload`; a gauntlet-legal arrival verb for a same-map
  destination (sets the current node, marks it visited, owes nothing, syncs
  the frontier lists); `opensAfter`; the three doors re-authored; a fixture
  map with one passage pair for the tests; the mobile travel screen (art,
  flavor text, yes/no); `act1-walk`'s travel chain.
- Tests: `travel-passage`, the act1-walk test, the travel screen test, the
  event-assets art table.
- Verify: both workspaces, root `npm test`, `verify:visual` on the travel
  screen.
