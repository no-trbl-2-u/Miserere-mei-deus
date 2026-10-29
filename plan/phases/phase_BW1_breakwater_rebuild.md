# Phase BW1 — The Breakwater rebuilt to T's Chapter 1 vision, and kind icons on every node

## Sources

- The `/plot` request (T, 2026-10-28, attended): "plan and plot how to go from where we are now to the result we
  just spoke of", and "make each node kind stand out so the player knows more about the node more quickly ...
  different color, thematic SVGs ... some way to hide the intersecting lines between the map and the icon".
- The pitch `braindump/2026-10-28-breakwater-chapter-1-map.md`: the node list (44 nodes, 42 roads and one travel pair, kinds, plate
  positions), T's rulings, the open-PR alignment check, the Handoff block this brief carries over.
- T's vision, `plan/revamp/breakwater-vision.md` (T: "I REALLY need you to take this down as an important note").
  It outranks QL1d's routing in `plan/revamp/breakwater-map.md` where they differ.
- The node board, https://claude.ai/artifact/1jCcmhZbyaWXyE2SZgFRmz (T's private artifact; v3 is the list below).
- Rules this builds on, open as plot PRs when this was plotted: NK1 (#1049, D112: the kinds, the Anvil in the
  village, same-map travel), WR1 (#1050, D113: walk the roads, revisit), MQ1 (#1051: several quests, quest gates,
  give anywhere, done on arrival, carry an item).
- D25 (every plate landmark gets a node), D37 and D88 (art and content are T's; T picks the icons and writes the
  lines), D106 (each region is a chapter; the Breakwater is Chapter 1), D111 (Chapter 1's questline; amended by
  D114 below), D114 (recorded by this plot).

## Outcome

The live Breakwater is T's 44-node map on the coast plate, its quest chain runs from the windmill to the bridge
through every gate T described, and the nodes a player can reach next, and every quest node, show their kind as a coloured icon token.

Measure: `World/e2e/breakwater-chapter.engine.test.ts` walks the live Breakwater from `bw-w1` to `bw-b2` through the
engine's public verbs, asserting each gate shut before and open after and a relic paid per quest; the mobile map test asserts
which nodes show a kind token (A8); root `npm test` passes.

## Acceptance

- **A1** The new graph. A Breakwater `MapDefinition` with exactly the 44 nodes and 42 roads of the node list below,
  plus the one travel pair `bw-h6` / `bw-c0`;
  node ids are the board codes in lower case (`bw-w1` .. `bw-p3`); each node's event pool is its listed kind
  (placeholders per "Decisions"); the start node is `bw-w1`.
- **A2** The chain on MQ1's rules (one questline, four steps): `bw-w1`'s arrival cutscene gives step 1 (find the
  fishermen); `bw-c2` turns in step 1 and offers step 2; step 2 completes on arrival at `bw-l5`, pays the key and
  offers step 3; step 3 (a `carry` objective on the key) is turned in at `bw-k1`, consuming the key, and offers
  step 4 (defeat `bw-k2`); step 4 is turned in at `bw-b1`. Every step pays XP and one relic, a fixed relic per
  step that T names in BW1d (placeholders from the relic library until BW1e). Confirmed by T (2026-10-28): "every
  completed quest will offer a new relic".
- **A3** The gates hold. `bw-h4` (hazard) and `bw-c1`, `bw-l4`, `bw-w5` (elites) are on `holdRoadsUntilSettled`:
  their far roads stay shut until crossed or beaten, and a fled or lost attempt leaves them shut. `bw-k1 -> bw-k2`
  and `bw-b1 -> bw-b2` are quest gates (`gatesPast`) that open only when their step completes.
  `questGateProblems` finds no bypass on the map.
- **A4** The sea cave. `bw-h6` (the sea cave mouth) and `bw-c0` (the cave face) are a same-map travel pair, each
  taking the player to the other (NK1d's travel screen both ways); the cove (`bw-c0`, `bw-c1`, `bw-c2`) is reached
  only through it. Confirmed by T (2026-10-28): "H6 should travel to C0 (Since C1 wouldn't be able to travel back
  since it's an elite node not a travel node)"; W4 does not move.
- **A5** Early arrival refused. A quest node entered while its step is `locked` opens nothing and shows that node's
  own refusal line (`lockedLine` on the quest payload, `[content]` until BW1e).
- **A6** It goes live. The registered Breakwater is the new map; QL1's four-step questline and its nodes
  `bw-19`..`bw-22` are gone; every Breakwater node sits on its own mark in `act1-landmarks.json` (44 coast marks, D25)
  through `breakwater.layout.ts`; the Act 1 walk (`World/act1-walk.ts`) crosses the new map to the Charcoal Wood.
- **A7** Old saves. Every save made before BW1b is deleted: on load it is offered only for deletion (as CH1f does for
  saves made before characters), and NEW GAME starts on `bw-w1`. Confirmed by T (2026-10-28): "delete all the
  original saves".
- **A8** Kind at a glance. A node shows its kind as an icon token (an opaque disc in its kind's colour, the kind's
  glyph inside, covering the roads beneath it; no blur or halo behind it) when it is available or the current node,
  when it is one road from an available node, and always when it is a quest node; every other node shows only its
  state mark. The four states stay separable without colour (size, fill, ring), as `NodeMark` pins today.
  Confirmed by T (2026-10-28): "only the currently available ones, the connecting ones to the available ones, and
  the Quest ones"; "there's no need for the little blur behind it".
- **A9** The new marks. An elite node (`isEliteNode`) shows the elite icon, a travel node the door, the map's start
  node the start icon; the three new silhouettes are added to `game-icon-paths.ts` with their game-icons.net
  attribution, and `ACTION_ICON_BY_TYPE` no longer borrows the scroll for a door.
- **A10** T's lines (attended). The brief's "T's Chapter 1 lines" table is filled by T: each quest node's giver and
  turn-in lines, each quest's name, the four refusal lines, step XP and rewards.
- **A11** T's lines in the game. Every `[content]` line of the chain, the refusal lines and the gate reasons is
  replaced by T's table; the library test and the chapter e2e still pass.
- **A12** No relic is elite-only. A quest may pay any lane relic, including the three `relicSource: 'elite'` relics;
  the elite drop pool is unchanged; the library and contract tests that forbade a quest paying an elite relic
  (LR1's A18) now pin the new rule. Confirmed by T (2026-10-28): T amends "one relic per trio will only drop from an
  elite" so quests can pay more relics.

## Scope

- Mechanics: `World/Continents/Coastal-Village/breakwater.ts` (rewritten), `World/MapEvents/content.ts` (the 44
  pools), `World/quest.library.ts` (the chain replaces QL1's steps), `World/questline.ts` (`lockedLine` on the quest
  payload only if MQ1 did not add one), `Game/game.migrate.ts` (one step), fixtures naming `bw-` ids, the tests.
- Mobile: `state/exploration-maps/breakwater.layout.ts`, `assets/images/maps/act1-landmarks.json` (coast marks),
  `components/exploration/ExplorationNode.tsx`, `components/NodeMark.tsx`, `components/exploration/MapCanvas.tsx`
  (no halo under a token), `state/presenters/exploration.engine.ts` (`NodeType`, icons, colours),
  `components/icons/game-icon-paths.ts` and its licence file.
- Docs: `plan/revamp/breakwater-map.md` (rewritten to the new map, pointing at the vision), `docs/game-model.md`'s
  map paragraph if it names the old shape.

## Consumers to update

The fixture registry and `state-fixture.registry.ts` (saves pinned on `bw-` nodes), `elite-respawn.ts` and
`encounter.ts` (they name Breakwater nodes), the 80-odd test files naming `bw-1`..`bw-22`, the devlog/catalog
exporters that list map nodes, `/dev`'s world travel list, the tooltip text for map-node kinds.

## Save / schema contracts

Node ids change and T ruled every old save deleted, so BW1b bumps the save version past NK1's and WR1's steps and
the loader offers any save below it only for deletion (no migration of world state). One e2e: an old save loads
to the delete offer, and NEW GAME after it starts on `bw-w1`.

## Decisions made upfront — DO NOT ASK

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

## Calls for T (all answered)

1. Confirmed by T (2026-10-28): the three uncertain roads are roads; the sea cave's other end is a new node `bw-c0` at the cave face, and
   `bw-w4` stays where it is.
2. Confirmed by T (2026-10-28): every yellow node keeps its board kind.
3. Confirmed by T (2026-10-28): every old save is deleted (A7).
4. Confirmed by T (2026-10-28): the icon set and the token treatment stand; in-game colours come from the game's palette (Decision 10).
5. Confirmed by T (2026-10-28): kind icons show only on available nodes, the nodes next to them, and quest nodes (A8).
6. Confirmed by T (2026-10-28): QL1's quests are all dropped (QL1e and QL1f skipped); every completed quest pays a relic T names, and no
   relic is elite-only (A2, A12).

## Tests matrix

- New: `World/e2e/breakwater-chapter.engine.test.ts` (the Measure: the whole chain, each gate before and after,
  a fled elite, a turn-in without the key, an early arrival at `bw-l5`, the cove trip both ways).
- New: a library test pinning the node list (44 ids, 42 roads, the travel pair, kinds) against the brief's table.
- Rewritten: the relic library and questline contract tests that forbade a quest paying an elite relic (A12).
- Rewritten: every engine and mobile test naming `bw-1`..`bw-22` (by id or by count), the questline library and
  e2e tests (QL1's steps become the chain), `act1-walk`, the narrative-reachability and roster-health sweeps.
- New: a migration e2e per branch of the save step.
- Mobile: the layout test (every node on its own mark), `ExplorationNode` per kind and state, `NodeMark` order
  test kept, the icon registry test (three new keys with sources).

## Verify gate

`npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`, root `npm test`; `verify:visual`
for BW1b and BW1c (the map screen changes).

## Commit body template

```
<id>: <title>

- What: <the slice>.
- Closes: <acceptance ids>.
- Brief: plan/phases/phase_BW1_breakwater_rebuild.md § <id>.
```

## DoD

A1 to A12 ticked, each by its phase's PR.

## Follow-ups (out of scope)

- Chapter 1's real foes (enemy sessions 1-2, B2) and the hazard routing's puzzles on the six hazard nodes.
- Side quests on the Breakwater (MQ1 supports them; none is authored here).
- Cutscenes folded into other nodes (T: "another time").
- The event-node screens per kind (NK1's per-kind sittings).

## The node list

The pitch's table is the source (`braindump/2026-10-28-breakwater-chapter-1-map.md`, "The node list"): code, place,
kind, plate position, roads. Kinds by count: start 1, village 2, quest 4, chapter boss 1, elite 3, hazard 6,
fight 15, rest 3, loot cache 3, cutscene 3, travel 3 (44). A call answered on the PR that changes a kind or a road
edits that table in this branch.

## T's Chapter 1 lines (filled by T in BW1d)

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

## Phases

### BW1a — The new Breakwater, built and walked · L · closes A1, A2, A3, A4, A5, A12 · requires MQ1b, NK1d
Measure: the chapter e2e walks the new map (registered in tests only) from `bw-w1` to `bw-b2`, gates shut before and
open after; the library test pins the node list.
- Scope: the new `MapDefinition` and its 44 pools as data beside the live map; the chain questline (registered in
  tests only); `lockedLine` on the quest payload if MQ1 left none; `questGateProblems` run on the new map; the
  elite-only rule lifted (`Items/relic.library.ts` header, the tests that pinned it).
- Consumers: none live; nothing on screen changes.
- Save/schema: none (the quest payload's optional field is authored content, never saved).
- Tests: the chapter e2e and the node-list library test.
- Verify gate: `npm run verify -w axiomancer-mechanics`, root `npm test`.

### BW1b — The new Breakwater goes live · L · closes A6, A7 · requires BW1a, NK1b
Measure: a new game on the web build starts on `bw-w1` with 44 nodes on the coast plate; the Act 1 walk and the
old-save e2e pass.
- Scope: the swap (the new map registered as the Breakwater, the old graph and QL1's questline deleted), the coast
  marks and the layout, the save-version bump and the delete offer, every test and fixture naming old ids, `plan/revamp/breakwater-map.md`
  rewritten.
- Consumers: everything in "Consumers to update".
- Save/schema: the migration step above.
- Tests: rewritten suites, migration e2e, mobile layout test.
- Verify gate: both workspaces, root `npm test`, `verify:visual` (the map screen).

### BW1c — Every node wears its kind · L · closes A8, A9 · requires NK1a
Measure: the mobile map test shows each kind's token where A8 says and only there; `verify:visual` of the
Breakwater map shows the tokens.
- Scope: the three new silhouettes (extracted from the game-icons.net repository with attribution), `NodeType`
  gains `elite` and `start`, kind colours as palette tokens, `ExplorationNode` draws the icon token on available,
  current, next-to-available and quest nodes (A8), no halo under a token; tooltip text per new type.
- Consumers: the node confirm panel's tag, the tooltip, `/dev`'s map preview.
- Save/schema: none.
- Tests: `ExplorationNode` per kind and state, the icon registry, `NodeMark`'s order test kept.
- Verify gate: `npm run verify -w axiomancer-mobile`, root `npm test`, `verify:visual`.

### BW1d — T writes Chapter 1's lines · S · closes A10 · requires BW1b · attended
Measure: the brief's "T's Chapter 1 lines" table is filled by T.
- Scope: T's Nov 10 sitting; Claude drafts options in the game's voice, T picks and rewrites; nothing built.

### BW1e — T's lines in the game · M · closes A11 · requires BW1d
Measure: no `[content]` string is left in the Breakwater's chain, refusal lines or gate reasons; the chapter e2e
and the questline library test pass.
- Scope: `quest.library.ts`, `content.ts`, `breakwater.ts` reasons, the step rewards.
- Tests: the library test asserts no `[content]` in the chain.
- Verify gate: `npm run verify -w axiomancer-mechanics`, root `npm test`.
