# Act 1 event audit: all thirteen kinds (2026-10-25; re-run 2026-10-28 for QL1d)

> Phase AW1a (`plan/README.md`), run on branch `loop/ship-AW1a-act1-walk` off `main` at
> `b90dbf500`. The walk is `npm run e2e:act1-walk -w axiomancer-mobile` (static web export, headless Chromium,
> 390x844); its route is `npm run act1-walk -w axiomancer-mechanics` (`planAct1Walk`, read off the map graph and
> the registered pools, never hand-listed). Carrier counts are read from the same pools.
> A walk is evidence, not a tune (D57). Map and copy findings go to T (D88); this report changes no content.
>
> **Re-run for phase QL1d (2026-10-28).** The Breakwater gained its questline: four `quest` nodes (bw-19..bw-22,
> the engine's thirteenth kind) and pockets that hold every fight and hazard behind their step's quest node. The
> plan now plays the questline first, in step order (accept, then the nodes each step counts), so the Breakwater
> path below is the questline's. The walk resolves a quest node through `/quest` (TURN IN, ACCEPT, LEAVE), and
> drinks the satchel's healing potions before a fight or a hazard when VITAE is under half: the questline puts
> five fights before the door, and the skip seam's fights bleed, so a walk that never drank reached cw-3 at 1 VITAE
> and died on its arrival damage (the death rule's, not a defect).

## Result

The walk boots a new game at bw-1, crosses all four doors (bw-17, cw-17, bc-15, ld-16, each a Death Beholder
won through the dev skip seam after its reveal mounted), crosses the three travel events (bw-18, cw-20, bc-17)
onto the next region's arrival scene, and ends on ld-18's sealed stair. It met every kind the Act 1 pools carry,
saw no defeat, no page error and no console error, and finished in **13 s of walking, 14 to 22 s in total with a cached export**
(budget six minutes). Code defects met: **none**.

| Region | Path the engine chose (node:kind) |
|---|---|
| breakwater | bw-1 cutscene > bw-19 quest > bw-3 hazard > bw-4 gathering > bw-9 rest > bw-20 quest > bw-2 encounter > bw-10 encounter > bw-7 loot-cache > bw-21 quest > bw-8 encounter (the elite) > bw-13 rest > bw-15 loot-cache > bw-22 quest > bw-16 blacksmith > **bw-17 door** > bw-18 travel |
| charcoal-wood | cw-1 cutscene > cw-2 loot-cache > cw-3 hazard > cw-4 gathering > cw-9 rest > cw-7 encounter > cw-11 rest > cw-18 blacksmith > **cw-17 door** > cw-20 travel |
| beacon-crags | bc-1 cutscene > bc-3 hazard > bc-4 rest > bc-5 loot-cache > bc-7 gathering > bc-9 hazard > bc-12 blacksmith > **bc-15 door** > bc-17 travel |
| lantern-deep | ld-1 cutscene > ld-2 rest > ld-4 hazard > ld-6 loot-cache > ld-7 gathering > ld-10 rest > ld-14 blacksmith > **ld-16 door** > ld-18 cutscene |

Some steps are on the path only because they are the shortest way to a kind (bw-13 on the way to the Anvil,
bc-9 on the way to bc-12); the frontier rule means every node stepped on is resolved.

## The thirteen kinds

"Screen" means the walk resolved the node through its own screen by test id, as a player does; "skip" means
`globalThis.__AXM_SKIP_EVENT__` resolved it after the walk asserted the screen had mounted.

| Kind | Act 1 carriers (from the pools) | How the walk resolved it | Result | Defects |
|---|---|---|---|---|
| encounter | 26: bw-2, bw-6, bw-8, bw-10, bw-14, bw-17, cw-5, cw-7, cw-10, cw-12, cw-16, cw-17, cw-19, bc-2, bc-8, bc-10, bc-11, bc-13, bc-15, ld-3, ld-5, ld-8, ld-11, ld-12, ld-13, ld-16 | skip x8 (bw-2, bw-10, bw-8, bw-17, cw-7, cw-17, bc-15, ld-16), each after `combat-reveal` mounted | live: every skip a `victory` through the real `endCombat` | none |
| interaction | 0: no Act 1 carrier ("Act 1 stages no NPC", `MapEvents/content.ts`) | not walked | witnessed hermetically: `axiomancer-mechanics/src/World/MapEvents/e2e/map-events.engine.test.ts` ("resolves an interaction event by NPC name"); mobile `state/e2e/dialogue-nameplate.S4-world-C11.test.ts` | none |
| gathering | 7: bw-4, bw-11, cw-4, cw-8, cw-14, bc-7, ld-7 | screen x4 (bw-4, cw-4, bc-7, ld-7): `/event`, `event-choice-acknowledge` | live: a material grant with an acknowledged receipt. Finding: nothing in mechanics or mobile spends a material (no sink); the question goes to T as AW1b's `[content]` row (A10) | none (code) |
| rest | 11: bw-9, bw-13, cw-9, cw-11, cw-15, bc-4, bc-6, bc-14, ld-2, ld-10, ld-17 | screen x7: `/rest`, `rest-choice-offer-rest`, `rest-claim` | live | none |
| village | 0: no Act 1 carrier ("Act 1 stages no ... shop") | not walked | witnessed hermetically: `map-events.engine.test.ts` ("resolves a village event with merchants"); the `Game/fixtures/fixture-content.ts` village fixture | none |
| cutscene | 6: bw-1, cw-1, bc-1, ld-1 (arrivals), ld-15 (the sealed vault door), ld-18 (the deep stair) | screen x5: the four arrivals and ld-18, `cutscene-advance` | live. ld-15 is not on the path: the kind is met at every arrival, and the vault door is sealed scenery while the Labyrinth is parked | none |
| hazard | 7: bw-3, bw-12, cw-3, bc-3, bc-9, ld-4, ld-9 | skip x5 (bw-3, cw-3, bc-3, bc-9, ld-4), each after `hazard-route-select` mounted on `/hazard` | live: each skip a `complete:2/3` median crossing; the board screen popped back to the map | none |
| loot-cache | 9: bw-5, bw-7, bw-15, cw-2, cw-6, cw-13, bc-5, bc-16, ld-6 | screen x4 (bw-5, cw-2, bc-5, ld-6): `/cache`, the card offer, "Move on" | live | none |
| narration | 0: no Act 1 carrier ("Act 1 stages no ... narration") | not walked | witnessed hermetically: `axiomancer-mechanics/src/World/MapEvents/e2e/narration-kind.engine.test.ts`; mobile `dialogue-nameplate.S4-world-C11.test.ts` (speakerless narration) | none |
| blacksmith | 4: bw-16, cw-18, bc-12, ld-14 (one Anvil per region) | screen x4: `/blacksmith`, `blacksmith-begin`, `blacksmith-leave`, `blacksmith-claim` | live | none |
| travel | 3: bw-18, cw-20, bc-17 | screen x3: the crossing lands on the next region's arrival scene and the player stands on its start node | live | none |
| quest | 4: bw-19, bw-20, bw-21, bw-22 (the Breakwater questline's four nodes, QL1d) | screen x4: `/quest`, `quest-turn-in-button` (nodes 2-4), `quest-accept-button`, `quest-leave-button`; node 4's turn-in pays a card pick, skipped on the spoils tiles | live: each step accepted, steps 1-3 turned in at the next node, step 4 paid on the watchtower victory | none |
| labyrinth | 0: no Act 1 carrier (the Labyrinth is parked) | not walked | pinned absent by `axiomancer-mechanics/src/World/e2e/lantern-deep.engine.test.ts` ("none opens the Labyrinth"); the Aporia itself by `World/Labyrinth/e2e/labyrinth.engine.test.ts` and `npm run e2e:labyrinth-roundtrip -w axiomancer-mobile` | none |

Totals (the QL1d re-run): 45 nodes resolved, 32 by screen and 13 by skip (8 fights, 5 hazards). The 27 include the bw-1 arrival on
new game and the three arrival scenes after each crossing, counted as cutscenes.

## Routed findings (A7)

- **Code defects:** none met; nothing fixed and no CRITIQUE row filed.
- **Map and copy defects:** none met by the walk itself. The node-blurb drift the 2026-10-24 swarm found (R13:
  the Sea Cave opening THE CREEPING ROT, the Clifftop Chapel opening a purse) is AW1b's: its blurb test pins
  each mismatch against a `[content]` row for T.
- **`gathering` has no sink:** recorded above; AW1b files the `[content]` row that puts the question to T.

## What this does not cover

- Fights and hazard boards are skipped, not played: the walk proves routing, resolution and crossings, not that
  a deck can win the four door fights. A player-shaped walk is the W5 "Playtester walk of all four regions" Item.
- One path per region, not every node: 37 of the act's 73 nodes are stepped on. A node of an already-met kind
  off the path (ld-15, most encounters) is resolved by the same screen code but not by this run.
