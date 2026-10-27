# The Breakwater (Act 1, Chapter 1): node map (draft for T's review)

> A rough map of every Breakwater node, read from the current tree on 2026-10-26: the graph in
> `axiomancer-mechanics/src/World/Continents/Coastal-Village/breakwater.ts`, the events in
> `axiomancer-mechanics/src/World/MapEvents/content.ts`, and the labels in
> `axiomancer-mobile/state/exploration-maps/breakwater.layout.ts`. It describes what ships today, not a design.
> Each region is a chapter (D106, T 2026-10-26): Act 1 is the four regions, and the Breakwater is Chapter 1, the
> Nov 16 MVP's scope.

## The shape

Eighteen nodes in seven columns. The windmill (bw-1) is the start; the map fans out in rings and closes on one
chokepoint, the watchtower (bw-17), before the river bridge (bw-18), the door out.

```mermaid
graph LR
  bw1[bw-1 Windmill<br/>cutscene, start]
  bw2[bw-2 Crane Quay<br/>fight]
  bw3[bw-3 Gallows Hill<br/>hazard]
  bw4[bw-4 Foothill Pass<br/>gathering]
  bw5[bw-5 Smugglers' Cove<br/>loot cache]
  bw6[bw-6 Sea Fort<br/>fight]
  bw7[bw-7 South Pier<br/>loot cache]
  bw8[bw-8 North Pier<br/>elite fight]
  bw9[bw-9 Customs House<br/>rest, inn]
  bw10[bw-10 Walled Manor<br/>fight]
  bw11[bw-11 The Wreck<br/>gathering]
  bw12[bw-12 Sea Cave<br/>hazard]
  bw13[bw-13 Harbour Town<br/>rest, inn]
  bw14[bw-14 Lighthouse<br/>fight]
  bw15[bw-15 Clifftop Chapel<br/>loot cache]
  bw16[bw-16 Fishing Hamlet<br/>blacksmith, the Anvil]
  bw17[bw-17 Watchtower<br/>door fight, boss]
  bw18[bw-18 River Bridge<br/>travel, the door]
  bw1 --> bw2 & bw3 & bw4 & bw5
  bw2 --> bw7 & bw8 & bw9
  bw2 --- bw3
  bw3 --> bw9 & bw10
  bw3 --- bw4
  bw4 --> bw10
  bw4 --- bw5
  bw5 --> bw6 & bw7
  bw6 --> bw11
  bw6 --- bw7
  bw7 --> bw11 & bw12
  bw7 --- bw8
  bw8 --> bw12 & bw11
  bw8 --- bw9
  bw9 --> bw13 & bw12
  bw9 --- bw10
  bw10 --> bw13
  bw11 --> bw14
  bw11 --- bw12
  bw12 --> bw14 & bw15
  bw12 --- bw13
  bw13 --> bw15 & bw16
  bw14 --> bw17
  bw14 --- bw15
  bw15 --> bw17
  bw15 --- bw16
  bw16 --> bw17
  bw17 --> bw18
```

Arrows step to the next column; plain lines are the lateral ribs between neighbours in a ring (both ways).

## Every node

| Node | Col | Place | Kind | What happens today | Connects to |
|---|---|---|---|---|---|
| bw-1 | 0 | The Windmill | cutscene | Two arrival lines; a new game starts here | bw-2, bw-3, bw-4, bw-5 |
| bw-2 | 1 | The Crane Quay | encounter | Float-Eye, level 2 | bw-7, bw-8, bw-9, bw-3 |
| bw-3 | 1 | Gallows Hill | hazard | 2 damage (placeholder until hazard routing; a puzzle board in the plan) | bw-9, bw-10, bw-2, bw-4 |
| bw-4 | 1 | The Foothill Pass | gathering | 1 Driftwood | bw-10, bw-3, bw-5 |
| bw-5 | 1 | Smugglers' Cove | loot cache | 12 shillings | bw-6, bw-7, bw-4 |
| bw-6 | 2 | The Sea Fort | encounter | Float-Eye, level 2, with its own line | bw-11, bw-7 |
| bw-7 | 2 | The South Pier | loot cache | 6 shillings | bw-11, bw-12, bw-6, bw-8 |
| bw-8 | 2 | The North Pier | encounter (elite) | Green Jelly, level 3 | bw-12, bw-11, bw-7, bw-9 |
| bw-9 | 2 | The Customs House | rest (inn) | Paid rest | bw-13, bw-12, bw-8, bw-10 |
| bw-10 | 2 | The Walled Manor | encounter | Float-Eye, level 2 | bw-13, bw-9 |
| bw-11 | 3 | The Wreck | gathering | 1 Kelp Frond | bw-14, bw-12 |
| bw-12 | 3 | The Sea Cave | hazard | 2 damage (placeholder, as bw-3) | bw-14, bw-15, bw-11, bw-13 |
| bw-13 | 3 | The Harbour Town | rest (inn) | Paid rest | bw-15, bw-16, bw-12 |
| bw-14 | 4 | The Lighthouse | encounter | Float-Eye, level 2 | bw-17, bw-15 |
| bw-15 | 4 | The Clifftop Chapel | loot cache | 8 shillings | bw-17, bw-14, bw-16 |
| bw-16 | 4 | The Fishing Hamlet | blacksmith | The Anvil (one per region) | bw-17, bw-15 |
| bw-17 | 5 | The Watchtower | encounter (boss) | Death Beholder, level 1, the door fight every run crosses | bw-18 |
| bw-18 | 6 | The River Bridge | travel | Crosses to the Charcoal Wood | none (terminal) |

Kind spread: 6 encounters (4 normal, 1 elite, 1 boss), 2 hazards, 2 gathering, 3 loot caches, 2 rests, 1 blacksmith,
1 cutscene, 1 travel.

## Gaps

Every node has an event (the pool builder throws on a node without one), so no node is empty. The gaps are in what
the events hold:

- **Enemies:** three foes only, all R2 survivors: Float-Eye on every normal node, the Green Jelly as the elite, the
  Death Beholder at the door. B2 (the enemy revamp) is where the real roster comes from.
- **Boss tiers:** the watchtower holds the region's door fight, and it is Chapter 1's boss, B2's "region boss" tier
  (T, 2026-10-26; D106). Act 1's Act Boss sits at the end of the Lantern Deep, Chapter 4, not here (T, 2026-10-26).
- **Hazards:** bw-3 and bw-12 deal a flat 2 damage. They become puzzle boards when the live hazard routing is
  plotted (`plan/deadlines.md`, W2).
- **No people:** Act 1 stages no NPC, shop, village or narration node (`MapEvents/content.ts` header), so the
  `interaction`, `village` and `narration` kinds have no Breakwater node.
- **No quests:** none exist yet. QL1 (T, 2026-10-27, D111; LR1f skipped) adds one four-step questline on four new
  `quest` nodes, bw-19..bw-22, the Breakwater's ninth kind: spurs off bw-1, bw-9 and bw-13, and bw-22 on the road
  between the c4 landmarks and the watchtower (bw-14/15/16 join bw-22, bw-22 joins bw-17), with two sealed roads
  (bw-22 to bw-17, opened by accepting step 4; bw-17 to bw-18, opened by the boss victory). Steps 1-3 are turned in
  at the next quest node and step 4 is the boss (T, 2026-10-27). T checks the spots in the Nov 3 map review and
  writes the lines on Nov 10.
- **Gathering has no sink:** nothing spends Driftwood or Kelp Frond (`docs/reports/act1-event-audit.md`). AW1b puts
  the question to T.
- **Loot caches:** shillings and the cache's card offer; no item or relic comes from a Breakwater node besides
  fight rewards until LR1's quests and elite drops land.
- **The door:** bw-18 travels to the Charcoal Wood, Chapter 2.
