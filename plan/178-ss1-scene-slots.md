# 178 — A scene before any node, and no more cutscene nodes

> Story is placed on any map node as a scene that plays before that node's own event (choose a fight, see the scene, continue, see the fight reveal, fight), and the Breakwater's three cutscene nodes become a fight and two loot caches.

## Why

### Sources

- **T, 2026-11-12 (`/plot`):** "plot the work for removing cutscene and story nodes, replacing them with other enemy/loot/hazard nodes. Then, every node has the potential to trigger a cutscene or story node prior to their normal screen start. ie. Player chooses battle / Player sees cutscene / player continues / Player sees original battle screen UX / Player enters combat / Player sees combat / etc".
- **T, 2026-11-12, earlier the same day (the scene-slot pitch):** a "scene slot" any map node can carry, played before the node's own event, so story can be placed anywhere instead of on dedicated story nodes. T agreed to A ("scene before"), with B ("scene after") to share the mechanism later; C (scenes fired by game state anywhere) was deferred. This spec builds A only.
- **Rules this rests on:** D88 (content and enemy placement are T's: the kinds and foes below are defaults for T to confirm), D93 and D101 (a `plot` PR T merges), D185 (loot cache pictures come only from the cache picture table), spec 172 (archived: the cutscene screen, a narrator over a vellum panel, CU1a to CU1c), spec 177 (the Narrator; its 177.9 writes the Act 1 story's scenes and is reconciled here).

### What exists today

- **Cutscene nodes.** A `cutscene` is one of the map event kinds (`World/MapEvents/types.ts`, `CutscenePayload`: `lines`, `scene`, `effect`). `resolveCutscene` (`MapEvents/handlers.ts`) plays it and applies its effect. Mobile routes it to `/cutscene` (`state/presenters/event.engine.ts`) and draws it as the STORY token (`exploration.engine.ts`, `KIND_TO_NODE_TYPE`). "Story node" and "cutscene node" are the same thing.
- **The Breakwater** (`Continents/Coastal-Village/breakwater-chapter.ts`, 44 nodes; kinds in `BREAKWATER_CHAPTER_KINDS`, `MapEvents/content.ts`) has three cutscene nodes: `bw-l2` Clifftop chapel (a dead end off `bw-l1`, a level 6 fight), `bw-d5` Old watchtower (a dead end past the `bw-d4` hazard, in the level 6 hamlet) and `bw-p3` High pass (a dead end past the `bw-p1` hazard, off the level 2 south road). Each plays one `[content]` line over its picture (`BW_CUTSCENE_SCENES`). Its start node `bw-w1` (Windmill) is a cutscene too (`windmillArrival`) and gives quest step 1 through `effect.giveQuestStep`.
- **The other Act 1 maps** each open on an arrival cutscene on their start node: `cw-1` (the Charcoal Wood), `bc-1` (the Beacon Crags), `ld-1` (the Lantern Deep). The Lantern Deep's two sealed doors, `ld-15` (the vault door) and `ld-18` (the deep stair), are one-line cutscenes standing in for doors. The parked Labyrinth plays the Sophist's lines as cutscenes (`Labyrinth/labyrinth.pools.ts`). Chapters 2 to 4's maps are to be redesigned (the deadline act "Design Chapters 2-4's maps").
- **Spent nodes.** A node resolves once: `resolveMapEvent` answers `pendingArrival`, rolls the pool, resolves, and marks the node consumed (`resolve-map-event.ts`). Mobile's `resolveCurrentMapEventAction` (`state/actions.ts`) marks every kind but encounter, travel, labyrinth and quest consumed, then routes by kind.
- **The cutscene screen** (`app/cutscene/index.tsx`, CU1b) taps through the beats; the last tap and SKIP call `dismissEvent()` and return to the map. Pictures and the one narrator are in `assets/images/cutscenes` (five TEMP pictures, CU1c).
- **Plate marks** are per place (`breakwater.layout.ts`, `assets/images/maps/act1-landmarks.json`), not per kind: a chapel stays a chapel when its node becomes a fight. The kind token a node shows comes from its engine kind.
- **Fight placement.** `BW_ENCOUNTER_FOES` binds one foe and level per fight node. Five named normals hold fourteen fight nodes at a repeat ceiling of three: the Quay-Crab, Coralback, Net-Mender and Bilge-Stalker each hold three, the Brine-Widow two. **Loot caches** are `COAST_LOOT_CACHES` (three) indexed by `LOOT_NODES`.

### The small version first

Built from what exists, the slot is the cutscene payload and screen already shipped, played from a new place: a per-node table beside the pools, read before the node's own event. No new screen, no new payload, no new picture table. The only new state is the list of scenes a run has seen.

## Design

### The scene slot (the contract, 178.1)

- **`NodeScene`** (`MapEvents/types.ts`): `{ before: CutscenePayload }`. One optional field per moment, so B ("after") is a later `after` field and nothing else changes.
- **Where it lives.** A per-map table, registered like the pools: `registerNodeScene(continent, map, nodeId, scene)` and `getNodeScene(continent, map, nodeId)` in `resolve-map-event.ts` (or a sibling module it imports). A node with no pool (an empty waypoint) can carry a scene.
- **The resolution order: the scene, then the node.** `resolveMapEvent` on a node whose `before` scene is unseen returns `{ kind: 'cutscene', lines, scene, slot: 'before' }` (the resolved cutscene gains an optional `slot`), applies the scene's `effect` (a quest step given), and adds the node to the map's `seenScenes`. That call does nothing else: the node is not consumed or completed, its `pendingArrival` stays owed and its adjacents stay as they were. The next `resolveMapEvent` on the node resolves its own event exactly as a node with no scene does (a fight, a hazard, a cache, a quest, a village, a travel door, or `none` for an empty waypoint).
- **Once a run (T, 2026-11-12).** A scene plays the first time the player arrives at its node and never again in that run: `MapState.seenScenes?: NodeId[]`, kept beside `consumedNodes`. A fight the player withdraws from leaves its scene seen, so the return goes straight to the fight reveal. A new run plays every scene again.
- **Save compatibility.** `seenScenes` is optional and absent reads as empty: an old save loads and plays each scene once. Nothing is removed from a save, so no migration (AGENTS.md "Save compatibility"); a test loads a save without the field.
- **Not on a labyrinth.** A labyrinth map reads no scene table; its rooms keep their own rule.
- **Every caller.** The reducer's resolve action (`game.reducer.ts`), `CLI/game.cli.ts` and `CLI/labyrinth.cli.ts` resolve again after a `slot: 'before'` event, so a scripted walk reaches the node's own event. Any sim driver that calls the reducer gets this for free; one that calls `resolveMapEvent` directly does the same.
- **The `cutscene` kind stays** in the engine: the sealed doors and the parked Labyrinth still use it. No Breakwater node uses it as its own kind after 178.3, and a test says so.

### The phone (178.2)

- **The flow:** the player taps a node and confirms (the confirm panel shows the node's own kind, unchanged), the cutscene screen plays the scene, its last tap or SKIP continues to the node's own screen (the fight reveal for a fight, then combat; the hazard, rest, loot cache, quest, village or travel screen), and a node with no event of its own returns to the map.
- `resolveCurrentMapEventAction` does not mark the node consumed for a `slot: 'before'` cutscene and routes it to `/cutscene` as today. The event slice keeps the `sourceNodeType`. On a before-scene, the cutscene screen's end (last tap or SKIP) calls a new action (`continueToNode`) that clears the slice and calls `resolveCurrentMapEvent(sourceNodeType)` again; on any other cutscene it calls `dismissEvent()` as today.
- **No mark on the map (T, 2026-11-12)** says a node carries a scene: the scene is met, not chosen.
- The cutscene screen itself (picture, narrator, vellum panel, beats) is unchanged.

### The Breakwater (178.3)

- **[T to confirm #1] The three cutscene nodes' kinds.** `bw-l2` Clifftop chapel becomes a **fight**: the Brine-Widow at level 6 (the cliffs' level, `bw-l1`'s; the Brine-Widow is the only named normal under its repeat ceiling of three, so it reaches three). `bw-d5` Old watchtower and `bw-p3` High pass become **loot caches**: each is a dead end past a hazard, so it pays. Two new `COAST_LOOT_CACHES` entries carry a `[content]` description and the shared placeholder actions, 12 shillings at the watchtower (level 6 country, as the strongbox) and 6 at the high pass (level 2 country, as the cracked jar); their pictures come from the cache picture table's default (D185). No hazard: a new hazard needs a puzzle route (HP6) and T's pick of puzzle.
- **[T to confirm #2] The windmill keeps its scene.** `bw-w1` stays the start node; `windmillArrival` moves into its slot and still gives quest step 1 through `effect.giveQuestStep`. Its own event is then none (an empty waypoint), and the map still draws it as the start.
- **[T to confirm #4] The three scenes carry over.** Each converted node keeps its scene in its slot, with today's `[content]` line and its picture (`clifftop-chapel`, `old-watchtower`, `high-pass`): the chapel plays its scene, then the fight reveal; the watchtower and the high pass play theirs, then the cache. `BW_CUTSCENE_SCENES` becomes the Breakwater's slot table (`BW_NODE_SCENES`, with the windmill's). Spec 177's 177.9 writes the Act 1 story into these slots and may move a scene to any other node.
- `'cutscene'` leaves `BreakwaterChapterKind`. The plate marks stay; the three nodes' kind tokens change from STORY to the fight and treasure tokens by the engine's kind.

### The other Act 1 maps (178.4)

- **[T to confirm #5]** The three arrival scenes (`cw-1`, `bc-1`, `ld-1`) move into their start nodes' slots, as the windmill's; each start node's own event is then none. The sealed doors `ld-15` and `ld-18` stay sealed cutscenes: they stand in for doors, not story, and their nodes are redrawn when Chapters 2 to 4's maps are designed (that act's node lists carry no cutscene kind). The Labyrinth is parked and untouched.

### Decisions made upfront (do not ask)

- No story is written here. Every scene keeps the lines it has today; the Act 1 story's scenes are spec 177's (177.9), after T's story (D88).
- No new screen and no new picture: the slot reuses the cutscene payload, CU1b's screen and CU1c's pictures.
- The quest chain, its gates and its rewards do not change; `bw-l2`, `bw-d5` and `bw-p3` are dead ends that gate nothing.
- The new fight and caches are placeholders in T's tables (`BW_ENCOUNTER_FOES`, `COAST_LOOT_CACHES`) that T's enemy re-tune and loot pass overwrite.

### Out of scope

- B, a scene after a node's event (see Follow-ups).
- C, scenes fired by game state anywhere.
- New story lines, new pictures, the sealed doors and the Labyrinth.

### Follow-ups (out of scope)

- **Scene after (B).** `NodeScene.after`: a scene played after a node's event settles (after a won fight, a taken cache), on the same table and the same once-a-run record. T agreed to it sharing the mechanism (2026-11-12); plot it when the story asks for one.
- **Scenes fired by game state (C).** A scene that plays on a condition (a quest step done, a level reached) wherever the player stands. Deferred by T (2026-11-12).

## Contracts

- `NodeScene { before: CutscenePayload }`; `registerNodeScene(continent, map, nodeId, scene)`, `getNodeScene(continent, map, nodeId)`.
- `ResolvedEvent` `cutscene` gains `slot?: 'before'`.
- `MapState.seenScenes?: NodeId[]` (absent = none seen).

## Acceptance

- **A6** No Breakwater node's own kind is `cutscene`: `bw-l2` is a fight (Brine-Widow, level 6), `bw-d5` and `bw-p3` are loot caches; the map shows their fight and treasure tokens; the plate marks are unchanged; the chapter's foe and cache tables have a row for each.
- **A7** The windmill plays its opening scene from its slot and gives quest step 1; `World/e2e/breakwater-chapter.engine.test.ts` walks `bw-w1` to `bw-b2` green.
- **A8** `bw-l2`, `bw-d5` and `bw-p3` play their scene (today's line and picture) before their own event.
- **A9** `cw-1`, `bc-1` and `ld-1` play their arrival scene from their start node's slot; their map e2e tests pass; `ld-15` and `ld-18` are unchanged.

## Open questions

1. **[T to confirm #1]** Which kind does each cutscene node become? Default: `bw-l2` a fight (Brine-Widow, level 6), `bw-d5` and `bw-p3` loot caches (12 and 6 shillings). Or: all three fights; or a hazard on one (needs a puzzle pick).
2. **[T to confirm #2]** Does the windmill keep a scene? Default: yes, the opening scene moves into its slot and still gives quest 1. Or: the windmill becomes a fight after its scene.
3. Settled (T, 2026-11-12): a node's scene plays once a run, on first arrival.
4. **[T to confirm #4]** Do the removed nodes' scenes and pictures carry over? Default: yes, each converted node plays its old scene before its own event. Or: their slots start empty until the Act 1 story places scenes.
5. **[T to confirm #5]** Do the other Act 1 maps change now? Default: their three arrival scenes move into start-node slots; the sealed doors wait for the Chapters 2-4 map design. Or: leave those maps until that design.
6. Settled (T, 2026-11-12): the map does not mark a node that carries a scene.

## Chunks

Measure: 4 open · 5 closed · next A10

- [ ] **178.3** The Breakwater: no cutscene nodes, and its scenes in slots · M · closes A6, A7, A8 · needs — · alias: SS1c
  - `axiomancer-mechanics/src/World/MapEvents/content.ts`: `BREAKWATER_CHAPTER_KINDS` (`bw-l2` fight, `bw-d5` and `bw-p3` loot; `'cutscene'` out of `BreakwaterChapterKind`), `BW_ENCOUNTER_FOES` (`bw-l2`), `COAST_LOOT_CACHES` and `LOOT_NODES` (two caches), `BW_NODE_SCENES` (the windmill and the three converted nodes) registered beside the pools; `bw-w1`'s own pool goes.
  - Tests that name the old kinds: `chapter1-content.test.ts`, `World/e2e/breakwater.engine.test.ts`, `breakwater-chapter.engine.test.ts` (the windmill: scene, then nothing), `cutscene-scene.CU1a.engine.test.ts`, the mobile `start-node-arrival` and `cutscene-view.CU1a` tests, and `scripts/fixtures/sim-runs.json` where a seeded run changes. A test fails if any Breakwater node's own kind is `cutscene`.
  - Measure: the chapter e2e walks `bw-w1` to `bw-b2` green; `npm run verify` (both workspaces) and root `npm test` pass; a phone-width screenshot of the map with the three new tokens, and of the chapel's scene then its fight reveal, is in the PR.
- [ ] **178.4** The other Act 1 maps open on a slot scene · S · closes A9 · needs — · alias: SS1d
  - `axiomancer-mechanics/src/World/MapEvents/content.ts`: `cwArrival`, `bcArrival` and `ldArrival` move into their start nodes' slots; the start nodes' pools go. `ld-15` and `ld-18` are untouched.
  - `World/e2e/charcoal-wood.engine.test.ts`, `beacon-crags.engine.test.ts`, `lantern-deep.engine.test.ts`: the arrival is a slot scene, then nothing; `docs/game-model.md`'s kind list says the scene slot.
  - Measure: the three map e2e tests pass; `npm run verify` (both workspaces) and root `npm test` pass.
