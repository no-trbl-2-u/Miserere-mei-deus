# World

> **Status:** frontier roaming (D1, 2026-09-21) and the map revamp (M3a–M4,
> 2026-09-26/27) are live. A new game starts on the Breakwater, walks the
> four Act 1 maps (Breakwater, Charcoal Wood, Beacon Crags, Lantern Deep).
> fishing-village was purged in THE REVAMP R3b. Every map lives in the continent-keyed
> registry, and node events are rolled from weighted pools
> (`src/World/MapEvents/content.ts`). The branching dialogue and the
> per-objective quest engine are unchanged from Spec 08.

## State Shape

The world layer splits the **static** map template from **runtime** progress.

```ts
// Frozen template — lives in the map registry. Authoring file.
interface MapDefinition {
  name; continent; description;
  startingNode: MapNode;
  nodes: readonly MapNode[];
  npcs?; enemies?; uniqueEvents?;
  quests?: readonly Quest[];
}

// Runtime per-save state — sits under WorldState.currentMap.
interface MapState {
  name; continent;
  currentNode: NodeId;           // Spec 08 Q1: per-map position.
  completedNodes; availableNodes; lockedNodes;
  uniqueEvents: UniqueEvent[];   // mutable runtime copy
}
```

`WorldState` aggregates the navigation context:

```ts
interface WorldState {
  world: Continent[];           // catalogue
  currentContinent: Continent;
  currentMap: MapState;         // runtime state — lookup template via getMapDefinition()
  mapStates?: Partial<Record<MapName, MapState>>; // maps left behind through a door
}
```

### Removed aliases (historical)

`WorldMap` and `Map` were `@deprecated` type aliases for `MapState`.
The internal-only `Map` alias was dropped at iterate `63bfbbe`; the
public-barrel `WorldMap` alias was authorized for removal by oversight
on 2026-05-15 and dropped at the iterate pass that authored this
update — see `plan/AUDIT.md` Done. Migrate to `MapState` (runtime
progress) and `MapDefinition` (static template lookup via
`getMapDefinition`).

`GameState` is the root for the whole save, and carries the quest log and
world flags so dialogue / quest progression can persist:

```ts
interface GameState {
  version; player; world; combat;
  quests: QuestLog;             // per-objective tracking
  flags: string[];              // dialogue + quest flag gates
}
```

## Map Registry

`src/World/map.registry.ts`:

- `MAP_REGISTRY` — `Record<ContinentName, Partial<Record<MapName, MapDefinition>>>`.
  Three continents are registered:

  | Continent | Maps |
  |---|---|
  | `coastal-continent` | `breakwater`, `charcoal-wood`, `northern-forest` |
  | `northern-continent` | `beacon-crags`, `lantern-deep`, `caverns`, `northern-city`, `connecting-river`, `town-across-river`, `the-capital` |
  | `labyrinth-continent` | `aporia-colonnade`, `aporia-archive`, `aporia-proof` (THE APORIA, W-01) |

- `getMapDefinition(continent, mapName)` — returns the static template. Throws
  `MapNotFoundError` for unknown pairs.
- `createMapState(def)` — builds the initial runtime `MapState`: the player
  stands on the starting node, its neighbours enter `availableNodes`, every
  other node enters `lockedNodes`, and fog-of-war is seeded with the start.
  A labyrinth map's `initialBlockedRoutes` arrive pre-blocked.

`createStartingWorld(startMap = STARTING_MAP)` (`src/World/index.ts`) builds
a new save's `WorldState`. `STARTING_MAP` is `'breakwater'` (D27). The
catalogue carries the two campaign continents: the start map is available
and every other campaign map starts locked until a door unlocks it. The
labyrinth continent is left out of the catalogue on purpose. The Aporia is
entered only through its door (see "Campaign maps") or the dev tools.

Adding a map takes all of these, and a map without a door is not shipped
content:

1. a `MapName` in `map.library.ts` and an authoring file under
   `src/World/Continents/<Name>/`, shaped as "Map shape" below says;
2. its entry in `MAP_REGISTRY` and a `nodeIdToMapName()` prefix;
3. its event pools in `MapEvents/content.ts`;
4. a mobile layout registered in `axiomancer-mobile/state/exploration-maps/index.ts`;
5. a `travel` node on some other map that leads into it;
6. a backdrop plate with its `provenance.json`.

A new continent takes all of that, plus its key in the registry and in
`createStartingWorld()`'s world catalogue, and a travel route that reaches it.
A new map-event *kind* takes `MapEvents/types.ts`, a handler, a mobile
presenter, and a `GAME_STATE_VERSION` hop with a pinned migration test (a new
kind or persisted field always rides a migration).

## Movement (D1 — frontier roaming)

`moveToNode(state, nodeId): WorldState` (`src/World/world.reducer.ts`).
D1 (2026-09-21) replaced Spec 08's linear, no-back-travel rule.

- **Spent nodes.** A node is spent once it is resolved (`completedNodes` ∪
  `consumedNodes`). A spent node stays drawn but is never a destination
  again, so nothing can be re-farmed. Walking through a node does not spend
  it: only resolving its event does.
- **The frontier.** `frontierNodes(map)` is every unspent node joined by an
  unblocked edge to *any* visited node (the spent set plus the node the
  player stands on), not only to the current node. The player can double
  back and clear a lane they skipped. Edges are authored one way but walked
  both ways.
- **Validation.** The destination must be a real node, must not be spent,
  and must be on the frontier. Blocked routes (hazard outcomes, secret doors)
  are cut out of the adjacency first. A node reachable only across a blocked
  edge is illegal, and the error names the blockage. A node still reachable
  another way stays legal.
- **The boss.** Nothing forces the climax until `isFrontierExhausted(map)`.
  That falls out of the rule and is not special-cased.
- **Arrival.** `moveToNode` is the arrival verb. It records
  `pendingArrival`, which `resolveMapEvent` clears. `placeOnNode` and
  `teleportToNode` stand the player on a node without owing an arrival.
- **Fights settle on a win.** An encounter leaves its arrival owed until
  `END_COMBAT`. A victory or a friendship settles the node (`settleArrival`:
  consumed, its roads open). A flee or a defeat only answers the arrival
  (`answerUnsettledArrival`): the node stays unspent, counts nothing, and is
  a fresh fight on the next arrival.
- **Held roads.** `MapDefinition.holdRoadsUntilSettled` lists nodes that add
  their roads to the frontier only once spent (`isHoldingRoads`): standing
  on one opens nothing. It is a list, never map-wide (the rule would empty
  the frontier between every move and its resolve). The Breakwater lists
  its four quest nodes (bw-19..bw-22) and its watchtower (bw-17).
- **Pockets.** On a map that holds a questline every fight and hazard sits
  in a pocket: nodes joined only to their step's quest node, dead ends by
  design. The generic gauntlet audit lets a pocket end outside the last
  column; the questline's own routing test
  (`World/e2e/breakwater-questline.engine.test.ts`) walks the real frontier
  with the questline played. `questline-supply.ts` reads a step's supply
  strictly downstream of its marker (the authoring test,
  `World/quest.library.test.ts`).
- **The retry.** `moveToNode` onto the node the player stands on re-owes its
  arrival when the node is unspent and its arrival was answered (a fled or
  lost fight, an unaccepted quest node), so a held node with no other move
  left can be tried again. A spent node, an owed arrival, the map's starting
  node and labyrinth rooms stay an idempotent no-op.
- **Quest-node locks.** A questline's next quest node sits behind blocked
  roads (`initialBlockedRoutes`, one reason each); a step's `opensOnReady`
  unblocks them in the call that fills its last objective, through the one
  settle seam (`settleQuestLog`, see "Quest Engine"). The Breakwater seeds
  four: bw-9 to bw-20, bw-7 to bw-21, and bw-15 and bw-16 to bw-22.
  Test-only, `settleQuestNodes(map)` (`Game/fixtures/quest-nodes.ts`) spends
  a map's quest nodes and opens their locks so a walker that is not about
  the questline can cross the map; a state fixture opts in with
  `world.questNodesSettled`.
- **Legacy lists.** `completeCurrentNode` keeps `availableNodes` and
  `lockedNodes` in sync with the frontier. The CLI's move filter and
  mobile's tap gate still read them, but `legalMovesFrom(map)` is the
  authority.
- **Labyrinth maps** (`traversal: 'labyrinth'`) keep their own rule: free
  travel along the current room's doors, back into solved rooms included
  (W-01).

`IllegalMoveError` is thrown for any invalid move. Hazard ticking on each
move belongs to the `Game/` orchestrator, not this reducer.

## Map shape

A map has two halves: the engine graph and the mobile layout. They share
node ids and nothing else.

**The engine graph** (`MapDefinition.nodes`) is columns and lanes. A node's
`location` is `[column, lane]`. Three rules hold on every gauntlet map
(the layer law, pinned in `src/World/e2e/map-traversal.engine.test.ts`):

- every edge runs one column forward, or sideways (a lateral rib, D1)
  between two lanes that are neighbours in that column;
- every non-terminal column with more than one node is chained sideways
  end to end;
- the terminal nodes share the last column and have no edges.

The same file pins that no route strands on a non-terminal node and that
every node can be reached from the start. The forward skeleton is what
governs progression. The columns need not be a line: the Act 1 maps use
rings that spread out from the entry (the Breakwater's c1 is the four
landmarks around the windmill).

**The mobile layout** (`axiomancer-mobile/state/exploration-maps/<map>.layout.ts`)
places each node at a free `x`/`y` on the map's `MapSheet`. Position does
not follow the column order (D16): a map must not read as a climb, and it
spreads up, down, left and right from the entry. The `MapSheet`
(`exploration-maps/types.ts`) is per map:

| Field | Meaning |
|---|---|
| `width`, `height` | The node coordinate space (the SVG viewBox), in sheet units. |
| `scale` | Device px per sheet unit at 1x zoom. The canvas is `width * scale` by `height * scale` and must be larger than the viewport on both axes (D16). |
| `backdrop` | The plate drawn under the chart, stretched to the whole sheet. It pans and zooms with the nodes. |
| `plateOpacity` | About 0.2 for an atmosphere plate, about 0.85 when the plate is the map (D15). |
| `chartTexture` | The procedural hatch and contour hills. Off when the plate is the map. |
| `nodeHalo?` | A dark halo under each node mark, for a dense plate (the Lantern Deep). |

The Act 1 maps share `ACT1_SHEET_SIZE` (`breakwater.layout.ts`): 1000×1000
units at scale 2.4, the plates' native 2400px. Each Act 1 layout puts one
node on every landmark of its plate (D25), reading the positions as plate
fractions from `assets/images/maps/act1-landmarks.json`. The seven maps
built before the revamp use `legacySheet(plate)` (`sheet.ts`): the old
360×400 viewBox at scale 2.6, plate at 0.2, chart texture on. The
layout-engine parity test holds both halves to the same node ids.

## Node Event Dispatcher

The current dispatcher is `resolveMapEvent(state, rng?)` from
`src/World/MapEvents/resolve-map-event.ts`, shipped in Spec 23 and
populated with content in Phase 24. It returns `{ state, event }`
where `event` is a discriminated union over the thirteen `MapEventKind`
values ('quest' joined the original eight in Phase 137, was retired
in Phase 61 and came back in QL1a as the questline's giver node; 'narration' joined in 2026-06, 'blacksmith' and 'travel'
later in 2026-08, 'labyrinth' in M4, 2026-09-27):

| Event kind     | Result shape                                                              |
|----------------|---------------------------------------------------------------------------|
| `encounter`    | `{ kind: 'encounter', encounter, isBoss }` — caller invokes `startCombat`. |
| `interaction`  | `{ kind: 'interaction', npcName, dialogue? }` — branching tree.           |
| `gathering`    | `{ kind: 'gathering', items }` — items added to inventory.                |
| `rest`         | `{ kind: 'rest', healed, shelter }` — `shelter` is `'camp' \| 'inn'` (Phase 52b), authored on `RestPayload` and defaulting to `'camp'`. It rides along so hosts that replace the passive heal keep the inn/camp signal; every rest, inn or camp, mends hazard-scarred max-VITAE. The per-node `healFraction` knob is retired; the passive heal runs at `REST_PASSIVE_HEAL_FRACTION` (carried forward pending Phase 52c). |
| `village`      | `{ kind: 'village', villageName, merchants, shop? }` — settlement scene.  |
| `cutscene`     | `{ kind: 'cutscene', lines }` — narration only.                           |
| `hazard`       | `{ kind: 'hazard', effects, damage }` — applies effects + damage.         |
| `loot-cache`   | `{ kind: 'loot-cache', items, currency }` — fixed grant.                  |
| `quest`        | `{ kind: 'quest', questline, node, stage, behind?, ahead? }` — a questline step's giver (`QuestPayload`, node 1-4); never consumed until its step is accepted (`acceptQuestStep`). Contract and step rules in `src/World/questline.ts` (see "Questlines"). |
| `narration`    | `{ kind: 'narration', dialogue }` — inline monologue; the `DialogueTree` is authored directly on the node (no map NPC lookup). Barrel: `NarrationPayload`. |
| `none`         | Consumed node (one-shot) or no pool registered.                            |

Note (Phase 137): the engine handlers above remain the CLI map loop's
behaviour. The mobile host intercepts `hazard` results and launches the
dedicated minigame instead (`World/Hazard`); `rest` results launch the
rest-choice screen (`World/RestChoice`, Phase 52c-d), which retired the
former rest minigame in Phase 52e; `loot-cache` results launch the
loot-cache-choice screen (`World/LootCacheChoice`, Phase 63), which
retired the former Pick Pool dice-pool minigame. (`quest` used to route to
`World/QuestBoard` "The Boy's Almanac"; that kind and the minigame it
launched were retired in Phase 61. `gathering` used to route to
`World/Gathering` "The Gleaning"; the minigame was retired in Phase 76
— the kind and its authored nodes stay, granting items inline with no
screen detour.)

Standalone CLI play loops (Phase 160b / 160c): the pure hazard engine is
also driveable directly from the Node host as a game-CLI subcommand —
`npm run hazard`.
The rest-choice and loot-cache-choice nodes (Phase 52c-d, Phase 63) have no
standalone CLI driver — each is a one-shot player choice, not a
dealt/replayable session. The hazard driver shares the `src/CLI/io.ts` layer
(`--script` JSON / `--stdin` / `--json-events` / `--state-log`) and an
`--auto` policy that reuses `hazard.sim.ts`'s bot, so a person, a
replay file, or an agent all drive it through one surface. It additionally
injects a custom draw bag: `--deck <id,id,…>` appends
acquired cards to the starter bag, while `--bag-file <path>` (a JSON array
of card ids) replaces the whole bag for deterministic A/B runs; both
validate ids against `HAZARD_DECK`.

Hazard events now have accepted v0 minigame doctrine in
[`docs/hazard-minigame.md`](./hazard-minigame.md): top/bottom route choice,
4 persistent mana dice, 5-card action hands, persistent enchantments,
`O - X` scoring, and the first 30 action / 15 hazard card content set. The
current `ResolvedEvent.kind === 'hazard'` payload remains the shipped simple
effects/damage surface until that doctrine is implemented.

The dispatcher reveals adjacent nodes on consumption (fog-of-war) and
marks the active node consumed so subsequent visits no-op.

### Legacy `processNode` (removed in Phase 25)

The pre-Spec-23 dispatcher and its 9-kind taxonomy
(`MapEvent` / `MapEventType` / the `nodeEvents` field on
`MapDefinition`) were removed in Phase 25 (commit reference in
`plan/AUDIT.md` Done block). All node events now flow through
`resolveMapEvent` + the per-node pool overrides registered in
`src/World/MapEvents/content.ts`. The folded `npc` / `shop` kinds
map to `interaction` / `village` in the new taxonomy.

Quest auto-progression: `reachableObjectives(log, nodeId)` is
available for any future dispatcher that wants to auto-advance
`reach`-type objectives on arrival; `resolveMapEvent` does not call
it today (it's a noted follow-up — track in `plan/AUDIT.md`).

## Quest Engine (Spec 08 Q7B — per-objective)

`src/World/quest.engine.ts`:

| Function | Purpose |
|----------|---------|
| `emptyQuestLog()` | `{ available: [], active: [], completed: [] }` seed. |
| `discoverQuest(log, quest)` | Adds to `available` if not present. |
| `startQuest(log, quest)` | Moves quest from `available` into `active`. Idempotent. |
| `progressQuest(log, name, objectiveId, amount?)` | Advances one objective; auto-completes the quest when every objective is filled, unless the quest is `holdForTurnIn` (it then stays active, "ready", unpaid until turned in). |
| `completeQuest(log, name)` | Explicit completion. |
| `isQuestComplete(quest)` | True when every objective is at `requiredCount`. |
| `reachableObjectives(log, nodeId)` | Active `reach`-objectives that fire on this node. |
| `killObjectives(log, enemy, mapName)` | Active `kill`-objectives on `mapName` that count this foe: by display `target`, or with no target by `foeClass` (`'any'`, `'elite'` via `isEliteEnemy`, `'boss'` by difficulty). |
| `advanceHazardObjectives(log, mapName)` | Counts one resolved hazard node toward active `hazard`-objectives on `mapName`. |
| `payQuestReward(player, quest, rng?)` | Pays `reward` then `rewards` in order; a `card-pick` reward rolls offers onto `PaidQuestReward.cardOffers` without adding a card. |

Objective types: `'kill' | 'collect' | 'reach' | 'talk' | 'flag' | 'hazard'`.
Kill and hazard objectives count only on the quest's own `mapName`.

The store's `endCombat` auto-advances `kill` objectives — defeating an
enemy whose `name` matches an active objective's `target` ticks the counter
and grants the reward when the quest fills.

### Questlines (`src/World/questline.ts`)

A questline is data (`Questline { id, mapName, steps }`), registered with
`registerQuestline` and looked up by the `quest` node's payload. The authored
lines live in `src/World/quest.library.ts`, which registers them on load (the
World barrel imports it beside the map-event pools); an unregistered line
reads node 1 as `offer` and every later node as `locked`.

| Function | Purpose |
|----------|---------|
| `questNodeStage(log, questline, node)` | Node 1 reads `offer`; node k reads step k-1: `locked` (not accepted), `waiting` (accepted, unmet), `turn-in` (met), `offer` (turned in). |
| `acceptQuestStep(state, questline, step)` | At the step's own node, with the step before turned in: starts the step's quest with every count at 0 (nothing before acceptance counts) and spends the node, which opens its held roads. |
| `turnInQuestStep(state, questline, step, rng?)` | At the NEXT quest node, a ready `settle: 'turn-in'` step: completes it and pays it once; the node then offers the next step. Returns `{ state, paid }` (`paid` carries items and card offers). |
| `settleQuestLog(state, quests, rng?)` | THE settle seam: pays what completed (`payCompletedQuests`) and opens the `opensOnReady` roads of a step that became ready. `END_COMBAT`, the hazard, reach and collect branches of `resolveMapEvent`, the dialogue effects and the turn-in all go through it. |

The last step (`settle: 'on-victory'`) is never turned in: its quest is not
held, so the boss kill completes and pays it through the same seam.
`GameAction`s `ACCEPT_QUEST_STEP` and `TURN_IN_QUEST_STEP` dispatch the two
verbs.

## Dialogue (Spec 08 Q9 — branching tree)

NPCs carry a `DialogueTree`:

```ts
interface DialogueTree {
  rootId: string;
  nodes: Record<string, DialogueNode>;
}
```

Each `DialogueNode` has `text` and optional `choices`. A `DialogueChoice`
can:

- Lead to another node (`nextNodeId`), or end the conversation (`undefined`).
- Be hidden until a gate passes (`requires.quest`, `requires.flag`,
  `requires.questCompleted`).
- Fire a side effect when picked (`effect.startQuest`, `progressQuest`,
  `completeQuest`, `teachCard`, `setFlag`, `grantCurrency`).

`applyDialogueChoice(gameState, tree, choice) → { gameState, nextNode, effects }`
applies the side effect, advances the cursor, and returns the next node
(or `null` if the conversation ends).

`NPCs/dialogue.ts` carries the read-only helpers (`getDialogueNode`,
`visibleChoices`, `isLeafNode`) for UI traversal.

The legacy flat `DialogueMap` is still supported on the `NPC` interface.

## Currency (Spec 08 Q8)

`Character.currency: number` exists; shop reducers are deferred to a later
spec. Rewards (`{ kind: 'currency', amount }`) increment this directly.

## Campaign maps

The maps join through `travel` nodes. A travel node asks "Move to X?":
resolving it offers the trip and moves no one, and `takeTravel` is the yes
(phase NK1d, `MapEvents/travel.ts`). Its payload names a destination that is
another map or a node of the same map (a passage, whose far end is the paired
travel node leading back; arriving through it counts as visiting the far node
and fires nothing), a `prompt`, an optional `art` slug and an optional
`opensAfter` node that must be spent before the way opens. Each inter-map door
is the terminal node of its map, so the way on opens once the map is walked:

```
breakwater (bw-18) → charcoal-wood (cw-20) → beacon-crags (bc-17)
  → lantern-deep (ld-18, the deep stair — sealed since R3a)
  [parked: northern-forest (nf-10)]
  → caverns (nc-26) → northern-city (ncy-26) → connecting-river (cr-13)
  → town-across-river (tar-7) → the-capital
```

**Act 1** is the first four maps, one per quadrant of T's plates (coast,
forest, mountains, underworld). Each is about 20 nodes, one per landmark.
They follow the rules T set for every Act 1 map (D30, D31):

- one `elite` fight on the last fight column and no boss; every other fight
  is `normal` or `simple` tier;
- the map opens on a short arrival cutscene, the new-game start (`bw-1`)
  included;
- no new NPCs. Events borrow an existing map's pools and roster (D29).

**The Labyrinth door (D24).** `ld-15`, the Lantern Deep's sealed vault door,
is a `labyrinth` event. Arriving there enters the Aporia at the act the
player last left, with no gate. `enterLabyrinthAction` snapshots the
overworld, `LabyrinthProgress.returnWorld` makes the snapshot durable so a
save taken inside resumes there, and leaving puts the player back on
`ld-15`. The node is never consumed, so the door can be used again.

**Fishing-village** was the starting map before the revamp, came after Act 1
from M3e, and was purged in R3b (D53) with its NPCs, quests, event pools and
the village goodwill system; save v29 scrubs it from old saves. Its
node-by-node history (Phases 23–65) is in git. Read
live event content from `MapEvents/content.ts`.

## MapEvents (Spec 23)

Phase 23 introduced the **MapEvents** node-event surface. Phase 25
removed the bespoke `processNode` predecessor; MapEvents is now the
only node-event dispatcher.

- **Taxonomy.** Twelve kinds: `encounter`, `interaction`, `gathering`,
  `rest`, `village`, `cutscene`, `hazard`, `loot-cache`, `narration`,
  `blacksmith`, `travel`, `labyrinth`. The old
  `npc`/`shop` kinds are folded into `interaction` and `village`.
- **Pool authoring.** Events are not authored per node; they're rolled
  from a **weighted pool** at the moment a node is entered. Pools live
  in `MapEventPool` records registered via `registerMapEventPool` and
  attached to a map via `setDefaultMapEventPool` (region default) or
  `setNodeEventPoolOverride` (per-node override).
- **Discovery (fog-of-war).** `MapState.discoveredNodes` is seeded with
  the map's starting node; `resolveMapEvent` calls `revealAdjacent`
  after consuming a node, so the next ring of nodes only becomes
  visible once the player has cleared the current one.
- **Unlocked traversal.** After Phase 31 (`711b49e`), `resolveMapEvent`
  also calls `unlockAdjacent` — the reducer that moves
  `connectedNodes` from `MapState.lockedNodes` into
  `MapState.availableNodes`. Discovery shifts the fog; unlocking is
  what lets the CLI's Map tab actually offer the next ring as
  navigable targets. The two pass-through reducers are composed at
  every `resolveMapEvent` exit path
  (`src/World/MapEvents/resolve-map-event.ts`).
- **One-shot consumption.** `MapState.consumedNodes` records every
  node whose MapEvent has resolved. Re-entering a consumed node
  returns `{ kind: 'none' }` — the player can still walk through, but
  the event won't re-fire.
- **RNG plumbing.** `resolveMapEvent(state, rng?)` accepts a seeded
  RNG (defaults to `getRng().random()`). Tests inject deterministic
  RNGs via `mockSequentialRng` / `mockFixedRng`.
- **Migration.** Spec 23 shipped `resolveMapEvent` alongside the
  existing `processNode`. Phase 24 (commit `4b12e27`) migrated the
  `fishing-village` (purged in R3b) + `northern-forest` content into per-node pool
  overrides — see `src/World/MapEvents/content.ts` for the 20-node
  authoring map. Phase 25 removed the legacy `processNode` surface,
  the `MapEvent` / `MapEventType` types, and the `nodeEvents` /
  `availableEvents` fields on `MapDefinition`.
- **Source of truth (Phase 161).** `content.ts` is the engine's single
  authored source for map-event content; it registers through one
  idempotent `registerMapEventContent()` (self-invoked on import).
  Node overrides are **last-write-wins**, so two blocks authoring the
  same `continent:map:node` silently diverge (fishing-village's legacy
  block was once clobbered that way; Phase 161 removed it, and R3b purged
  the map). `northern-forest` is unshadowed and stays registered (parked);
  it carries the `village`/`cutscene`/`interaction` kinds no Act 1 map
  authors, so the all-`MapEventKind`
  invariant still holds. A no-shadow guard
  (`getShadowedNodeOverrideKeys()` +
  `src/World/MapEvents/e2e/content-parity.engine.test.ts`) fails the
  build if any node is ever authored twice again. The separate mobile
  host registering its own per-node overrides is a cross-repo concern
  tracked in mobile's NEEDS_ATTENTION — out of scope for the engine.

- **Node-event-kind read API.** Three pure helpers expose which
  `MapEventKind`s a given node can fire **without** resolving (or
  consuming) an event — useful for client previews and tuning evidence:
  - `getNodeEventPool(continent, mapName, nodeId)` — the resolved
    `MapEventPool` for that node (node override first, else the region
    default), or `undefined` if none is registered.
  - `getNodeEventKinds(continent, mapName, nodeId)` — the distinct
    `MapEventKind[]` the node's pool can roll.
  - `getNodePrimaryEventKind(continent, mapName, nodeId)` — the
    highest-weight kind, or `undefined` for an empty/unregistered pool.

See `archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/23-map-events.md` (archived) for the spec and
`src/World/MapEvents/e2e/map-events.engine.test.ts` for the hermetic
walkthrough covering all eight kinds.

## Minigame Balance Simulation history (Phase 160)

Four Phase 137 minigames once carried deterministic policy-bot sims feeding
their own tuning skill: `rest.sim.ts` (`rest-tuning`, retired Phase 52e —
the rest node is now a one-shot, deterministic player choice,
`World/RestChoice`, not a balance-simulated minigame), `quest-board.sim.ts`
(`quest-board-tuning`, retired Phase 61), `gathering.sim.ts`
(`gathering-tuning`, retired Phase 76 — the `gathering` node now grants its
items inline with no minigame behind it), and `lootcache.sim.ts`
(`loot-cache-tuning`, retired Phase 63 — the `loot-cache` node is now a
one-shot, deterministic player choice, `World/LootCacheChoice`, same shape
as rest). Only the hazard minigame still carries a live balance sim
(`hazard.sim.ts`); its `/hazard-tuning` command was retired in trim T5
(2026-09-25, D10).

## See Also

- `archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/08-world-content-and-hazards.md`
- `archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/23-map-events.md`
- [`docs/npcs.md`](./npcs.md) — branching dialogue UI conventions.
