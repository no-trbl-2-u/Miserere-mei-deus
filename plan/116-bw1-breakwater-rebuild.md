# 116 — The Breakwater rebuilt to T's Chapter 1 vision, and kind icons on every node

> The live Breakwater is T's 44-node map on the coast plate, its quest chain runs from the windmill to the bridge through every gate T described, and the nodes a player can reach next, and every quest node, show their kind as a coloured icon token.

Carried from the v1 brief `phase_BW1_breakwater_rebuild.md` at the nexus v2 cut-over (phase NX1d, 2026-11-01). The brief's own words follow under these headings, its shipped phases left out; the whole v1 brief is `git show fd21d04ab:plan/phases/phase_BW1_breakwater_rebuild.md`. Each chunk keeps its v1 row id as its `alias:`, so deadlines, D-entries and PRs that name the old id still resolve.

## Why

### Sources

- The `/plot` request (T, 2026-10-28, attended): "plan and plot how to go from where we are now to the result we
  just spoke of", and "make each node kind stand out so the player knows more about the node more quickly ...
  different color, thematic SVGs ... some way to hide the intersecting lines between the map and the icon".
- The pitch (`braindump/2026-10-28-breakwater-chapter-1-map.md`) and T's vision (`plan/revamp/breakwater-vision.md`):
  both deleted on 2026-11-12 with the story wipe (T). The node list they held is the table below; the gate rules
  they held are this spec's Design. Both are recoverable at commit `f2e4482`.
- The node board, https://claude.ai/artifact/1jCcmhZbyaWXyE2SZgFRmz (T's private artifact; v3 is the list below).
- Rules this builds on, open as plot PRs when this was plotted: NK1 (#1049, D112: the kinds, the Anvil in the
  village, same-map travel), WR1 (#1050, D113: walk the roads, revisit), MQ1 (#1051: several quests, quest gates,
  give anywhere, done on arrival, carry an item).
- D25 (every plate landmark gets a node), D37 and D88 (art and content are T's; T picks the icons and writes the
  lines), D106 (each region is a chapter; the Breakwater is Chapter 1), D111 (Chapter 1's questline; amended by
  D114 below), D114 (recorded by this plot).

### Outcome

The live Breakwater is T's 44-node map on the coast plate, its quest chain runs from the windmill to the bridge
through every gate T described, and the nodes a player can reach next, and every quest node, show their kind as a coloured icon token.

Measure: `World/e2e/breakwater-chapter.engine.test.ts` walks the live Breakwater from `bw-w1` to `bw-b2` through the
engine's public verbs, asserting each gate shut before and open after and a relic paid per quest; the mobile map test asserts
which nodes show a kind token (A8); root `npm test` passes.

## Design

### Scope

- Mechanics: `World/Continents/Coastal-Village/breakwater.ts` (rewritten), `World/MapEvents/content.ts` (the 44
  pools), `World/quest.library.ts` (the chain replaces QL1's steps), `World/questline.ts` (`lockedLine` on the quest
  payload only if MQ1 did not add one), `Game/game.migrate.ts` (one step), fixtures naming `bw-` ids, the tests.
- Mobile: `state/exploration-maps/breakwater.layout.ts`, `assets/images/maps/act1-landmarks.json` (coast marks),
  `components/exploration/ExplorationNode.tsx`, `components/NodeMark.tsx`, `components/exploration/MapCanvas.tsx`
  (no halo under a token), `state/presenters/exploration.engine.ts` (`NodeType`, icons, colours),
  `components/icons/game-icon-paths.ts` and its licence file.
- Docs: `plan/revamp/breakwater-map.md` (rewritten to the new map, pointing at the vision), `docs/game-model.md`'s
  map paragraph if it names the old shape.

### Consumers to update

The fixture registry and `state-fixture.registry.ts` (saves pinned on `bw-` nodes), `elite-respawn.ts` and
`encounter.ts` (they name Breakwater nodes), the 80-odd test files naming `bw-1`..`bw-22`, the devlog/catalog
exporters that list map nodes, `/dev`'s world travel list, the tooltip text for map-node kinds.

### Decisions made upfront — DO NOT ASK

1. **Node ids are the board codes** (`bw-w1`, `bw-h4`, ...), so T, the board and the code use one name per node.
2. **One quest system.** The chain is one questline on MQ1's machinery (give anywhere, on arrival, `carry`,
   `gatesPast`); no second system, no side quests in this plot.
3. **The chain's steps** are as A2; the key is an item (MQ1b's item-reward door), granted by step 2 with its relic,
   consumed by step 3's turn-in. A turn-in at `bw-k1` without the key pays nothing and opens nothing (MQ1 A7).
4. **What holds a road.** The quest hazard and the three elites hold their far roads (`holdRoadsUntilSettled`);
   the keep and the bridge are quest gates. The boss `bw-k2` is a dead end and holds nothing.
5. **Placeholders until T's sessions.** Fights use today's Act 1 placeholder foes (Float-Eye normal, the Green
   Jelly at each elite, the Death Beholder at `bw-k2` as the chapter boss, level as today's watchtower); hazards
   use today's placeholder hazard event until the live hazard routing lands; rests, loot caches and cutscenes use
   the shared pool builders; every new line is `[content]`. Enemy sessions 1-2 and B2 replace the foes.
6. **Villages** `bw-t4` and `bw-m5` are NK1's village (paid rest, card shop, the Anvil); the map has no blacksmith
   node. `bw-b2` travels to the Charcoal Wood, as `bw-18` did.
7. **Built beside, then swapped.** BW1a builds and proves the new map registered in tests only; BW1b makes it the
   live Breakwater in one stroke. `main` never carries a half-switched map.
8. **The plate.** The 22 old coast marks are replaced by 44 marks at the node list's positions (fractions of the
   2400px plate, read from T's sketch); D25 holds: every coast mark carries a node.
9. **Icons are T's pick** (D37, D88): the set and treatment of call #4; the loop extracts the three new silhouettes
   from the game-icons.net repository (CC BY 3.0) with attribution and applies them.
10. **Kind colours come from the game's palette, not the sketch's** (T, 2026-10-28: "no reason to make them the
    same colors as what I mentioned in the example"; the board's colours were only the sketch's legend). Each kind
    gets a distinct palette token in `theme/`, light and dark; a kind with no fitting token gets one. Quest stays
    the most prominent.
11. **No clearing.** The token is an opaque disc, so it covers the roads itself; no blur, pool or widened halo is
    drawn behind a token (T, 2026-10-28). A node without an icon keeps today's mark and halo.
12. **D114** (recorded in the decisions file by this plot): Chapter 1 is T's 44-node Breakwater with the chain above;
    it supersedes D111's four-step questline and pocket routing; node ids are the board codes; every quest pays a
    relic and no relic is elite-only.

13. **Backtracking and revived elites.** The map is walked under WR1 (D113) where it has shipped: completed nodes
    are revisitable, quest nodes act on every entry. An elite a claimed rest revives (ER1) holds its far road
    again until beaten; the three rests (`bw-w4`, `bw-h5`, `bw-l3`) sit on the near side of the elites they serve,
    so a revival never strands the player behind a shut road. The chapter e2e pins one revival.

### Calls for T (all answered)

1. Confirmed by T (2026-10-28): the three uncertain roads are roads; the sea cave's other end is a new node `bw-c0` at the cave face, and
   `bw-w4` stays where it is.
2. Confirmed by T (2026-10-28): every yellow node keeps its board kind.
3. Confirmed by T (2026-10-28): every old save is deleted (A7).
4. Confirmed by T (2026-10-28): the icon set and the token treatment stand; in-game colours come from the game's palette (Decision 10).
5. Confirmed by T (2026-10-28): kind icons show only on available nodes, the nodes next to them, and quest nodes (A8).
6. Confirmed by T (2026-10-28): QL1's quests are all dropped (QL1e and QL1f skipped); every completed quest pays a relic T names, and no
   relic is elite-only (A2, A12).

### Tests matrix

- New: `World/e2e/breakwater-chapter.engine.test.ts` (the Measure: the whole chain, each gate before and after,
  a fled elite, a turn-in without the key, an early arrival at `bw-l5`, the cove trip both ways).
- New: a library test pinning the node list (44 ids, 42 roads, the travel pair, kinds) against the brief's table.
- Rewritten: the relic library and questline contract tests that forbade a quest paying an elite relic (A12).
- Rewritten: every engine and mobile test naming `bw-1`..`bw-22` (by id or by count), the questline library and
  e2e tests (QL1's steps become the chain), `act1-walk`, the narrative-reachability and roster-health sweeps.
- New: a migration e2e per branch of the save step.
- Mobile: the layout test (every node on its own mark), `ExplorationNode` per kind and state, `NodeMark` order
  test kept, the icon registry test (three new keys with sources).

### Verify gate

`npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`, root `npm test`; `verify:visual`
for BW1b and BW1c (the map screen changes).

### Commit body template

```
<id>: <title>

- What: <the slice>.
- Closes: <acceptance ids>.
- Brief: plan/phases/phase_BW1_breakwater_rebuild.md § <id>.
```

### Follow-ups (out of scope)

- Chapter 1's real foes (enemy sessions 1-2, B2) and the hazard routing's puzzles on the six hazard nodes.
- Side quests on the Breakwater (MQ1 supports them; none is authored here).
- Cutscenes folded into other nodes (T: "another time").
- The event-node screens per kind (NK1's per-kind sittings).

### The node list

The table below is the source (board v4, moved here from the deleted pitch on 2026-11-12): code, place,
kind, plate position, roads. Kinds by count: start 1, village 2, quest 4, chapter boss 1, elite 3, hazard 6,
fight 15, rest 3, loot cache 3, cutscene 3, travel 3 (44). A call answered on the PR that changes a kind or a road
edits that table in this branch.

| Code | Place | Kind | Whose call | Plate x, y | Roads to |
|---|---|---|---|---|---|
| W1 | Windmill | start | T | 0.497, 0.657 | W2 |
| W2 | Gallows crossroads | fight | T (confirmed v3) | 0.586, 0.680 | W1, W3, W4, M1 |
| W3 | Field road | fight | T (confirmed v3) | 0.633, 0.592 | W2, H1 |
| W4 | West cliff road | rest | T (confirmed v3) | 0.305, 0.665 | W2, W5 |
| W5 | Keep causeway | elite fight | T (confirmed v3) | 0.338, 0.607 | W4, K1 |
| K1 | Keep gate (needs the key) | quest | T | 0.205, 0.559 | W5, K2 |
| K2 | Sea keep | chapter boss | T | 0.160, 0.499 | K1 |
| H1 | Quay end | fight | T (confirmed v3) | 0.639, 0.499 | W3, H2, T1 |
| H2 | Crane quay | fight | T (confirmed v3) | 0.516, 0.500 | H1, H3 |
| H3 | Harbour light pier | fight | T (confirmed v3) | 0.291, 0.439 | H2, H4 |
| H4 | The wreck (quest hazard) | hazard | T | 0.121, 0.356 | H3, H5 |
| H5 | Moored ship | rest | T (confirmed v3) | 0.400, 0.386 | H4, H6, H7 |
| H6 | Sea cave mouth (to the cove) | travel | T | 0.459, 0.303 | H5, C0 (travel) |
| H7 | Long pier | fight | T (confirmed v3) | 0.533, 0.383 | H5, H8 |
| H8 | Pier end | loot cache | T (confirmed v3) | 0.605, 0.415 | H7 |
| C0 | Cave face (back to the sea cave) | travel | T | 0.332, 0.752 | H6 (travel), C1 |
| C1 | Sea cave | elite fight | T | 0.301, 0.797 | C0, C2 |
| C2 | Fishermen’s camp | quest | T | 0.369, 0.819 | C1 |
| T1 | Harbour steps | fight | T (confirmed v3) | 0.705, 0.471 | H1, T2 |
| T2 | Bridge approach | fight | T (confirmed v3) | 0.762, 0.443 | T1, B1, T3 |
| T3 | Town gate | fight | T (confirmed v3) | 0.707, 0.414 | T2, T4, T5 |
| T4 | Harbour town | village | T | 0.608, 0.328 | T3 |
| T5 | Back lanes | hazard | T (confirmed v3) | 0.749, 0.340 | T3, T6 |
| T6 | Upper town | fight | T (confirmed v3) | 0.664, 0.295 | T5, L1 |
| B1 | River bridge | quest | T | 0.819, 0.421 | T2, B2 |
| B2 | Far bank (to Chapter 2) | travel | T | 0.963, 0.423 | B1 |
| L1 | Cliff crossroads | fight | T (confirmed v3) | 0.579, 0.225 | T6, L2, L3, D1 |
| L2 | Clifftop chapel | cutscene | T (confirmed v3) | 0.551, 0.179 | L1 |
| L3 | Cliff road | rest | T (confirmed v3) | 0.450, 0.197 | L1, L4 |
| L4 | Lighthouse path | elite fight | T | 0.353, 0.147 | L3, L5 |
| L5 | Lighthouse (gives the key) | quest | T | 0.262, 0.108 | L4 |
| D1 | Fishing hamlet | fight | T (confirmed v3) | 0.767, 0.229 | L1, D2, D3 |
| D2 | Boat sheds | loot cache | T (confirmed v3) | 0.682, 0.241 | D1 |
| D3 | Hamlet rise | fight | T (confirmed v3) | 0.867, 0.191 | D1, D4 |
| D4 | Tower switchbacks | hazard | T (confirmed v3) | 0.827, 0.129 | D3, D5 |
| D5 | Old watchtower | cutscene | T (confirmed v3) | 0.841, 0.068 | D4 |
| M1 | South fork | fight | T (confirmed v3) | 0.649, 0.790 | W2, M2, P1 |
| M2 | River meadow | hazard | T (confirmed v3) | 0.854, 0.739 | M1, M3, M4 |
| M3 | Riverbank | loot cache | T (confirmed v3) | 0.858, 0.803 | M2 |
| M4 | Manor road | hazard | T (confirmed v3) | 0.777, 0.645 | M2, M5 |
| M5 | Walled manor | village | T | 0.740, 0.571 | M4 |
| P1 | Foothills | hazard | T (confirmed v3) | 0.561, 0.894 | M1, P2 |
| P2 | Mountain path | fight | T (confirmed v3) | 0.450, 0.924 | P1, P3 |
| P3 | High pass | cutscene | T (confirmed v3) | 0.277, 0.994 | P2 |

Positions are fractions of the 2400px coast plate (`act1-coast.webp`), read from T's sketch. Board:
https://claude.ai/artifact/1jCcmhZbyaWXyE2SZgFRmz (private to T).

### T's Chapter 1 lines (filled by T in BW1d)

| Node | Line | T's text |
|---|---|---|
| bw-w1 | Arrival; gives quest 1 (its name and ask) | |
| bw-c2 | Turn-in of quest 1; gives quest 2 (name, ask) | |
| bw-l5 | Arrival completes quest 2, pays the key; gives quest 3 (name, ask) | |
| bw-k1 | Turn-in with the key; gives quest 4 (name, ask) | |
| bw-b1 | Turn-in of quest 4; the chapter's farewell | |
| bw-c2, bw-l5, bw-k1, bw-b1 | Refusal line when reached too early (one each) | |
| gates | The reason a shut road gives (`bw-h4`, `bw-c1`, `bw-l4`, `bw-w5`, `bw-k1`, `bw-b1`) | |
| steps 1-4 | XP and the relic each step pays (one relic per quest) | |

### Chunk notes (the brief's phase blocks)

#### BW1d (chunk 116.4)

Measure: the brief's "T's Chapter 1 lines" table is filled by T.
- Scope: T's Nov 10 sitting; Claude drafts options in the game's voice, T picks and rewrites; nothing built.

#### BW1e (chunk 116.5)

Measure: no `[content]` string is left in the Breakwater's chain, refusal lines or gate reasons; the chapter e2e
and the questline library test pass.
- Scope: `quest.library.ts`, `content.ts`, `breakwater.ts` reasons, the step rewards.
- Tests: the library test asserts no `[content]` in the chain.
- Verify gate: `npm run verify -w axiomancer-mechanics`, root `npm test`.

### The Narrator's drafts for the chain (spec 177, 2026-11-11)

**Withdrawn 2026-11-12 (T: the story is rewritten from scratch); the drafts are redrawn from the new Act 1 story.** `plan/ballots/narrator-chapter1.md` held drafted options for BW1d: its Quest nodes (Q), Quest chain (C) and Names (N-01 to N-10) sections cover each quest node's description and refusal line, the four steps' names, asks and objectives, the key, and the two gate reasons. They are options for T, not T's text. Lines T approves there run past MB-1's 20 words, so BW1e lands after spec 177's lint chunk (alias NV1b), which gives Narrator fields their own caps. Giver and turn-in lines someone speaks are not drafted there; they belong to the People voice.

## Contracts

Node ids change and T ruled every old save deleted, so BW1b bumps the save version past NK1's and WR1's steps and
the loader offers any save below it only for deletion (no migration of world state). One e2e: an old save loads
to the delete offer, and NEW GAME after it starts on `bw-w1`.

## Acceptance

- **A10** T's lines (attended). The brief's "T's Chapter 1 lines" table is filled by T: each quest node's giver and
  turn-in lines, each quest's name, the four refusal lines, step XP and rewards.
- **A11** T's lines in the game. Every `[content]` line of the chain, the refusal lines and the gate reasons is
  replaced by T's table; the library test and the chapter e2e still pass.

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 2 open · 10 closed · next A13

- [ ] **116.4** T writes Chapter 1's lines (attended) · S · closes A10 · needs — · alias: BW1d
- [ ] **116.5** T's lines in the game · M · closes A11 · needs 116.4 · alias: BW1e
