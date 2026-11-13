# The Narrator: Chapter 1's enemy descriptions, the ledger

> NV1c (chunk 177.3), the enemy-description surface. Drafted 2026-11-12 with
> `/narrate` at T's word: the stop of the scene nearest each foe's node (story
> overview, ruling 12), and a second draft one stop up. The portrait is canon
> for how a foe looks (ruling 13, plot PR #1649). Ballots:
> `narrator-enemies.ballot.html` (round 1, closed) and
> `narrator-enemies-2.ballot.html` (round 2, closed). This ledger is separate from
> `narrator-chapter1.md` (T, 2026-11-12: #1649 edits S-17 there). Nothing here
> is in the game: 177.8 (NV1h) lands the approved lines.

## Slots

| Slot | Foe | Where | a | b |
|---|---|---|---|---|
| E-01 | The Saint Beneath | `bw-k2`, S-17 (stop 1) | stop 1, the ledger's E-01 | stop 3 |
| E-02 | Saltwick Swarm | `bw-c1`, between S-07 (1) and S-08 (5) | stop 1 | stop 2 |
| E-03 | The Wreckmaster | `bw-w5`, S-15 (stop 1) | stop 1 | stop 2 |
| E-04 | Quay-Crab | `bw-w2` S-02 (stop 2), `bw-m1`, `bw-h2` | stop 2 | stop 3 |
| E-05 | Bilge-Stalker | `bw-t2` S-09 (stop 1), `bw-l1`, `bw-d3` | stop 1 | stop 2 |
| E-06 | Coralback | `bw-t6` S-11 (stop 1), `bw-w3`, `bw-t1` | stop 1 | stop 2 |
| J-01 | The Saint Beneath, journal | `bw-k2` | the ledger's E-01 journal | none |

The text of every draft is the `CARDS` array in the ballot page.

## Round 2 (2026-11-13)

Redrawn on T's two notes (see Verdicts): no reading off the portrait, and
more of the story and the region. Candidate a is still at the rotation stop
and b one stop up; E-01b is now stop 2, which fixes round 1's legend
mismatch (E-01b was two stops up). J-01 is carried over unchanged.

| Slot | Foe | a | b | Story it leans on |
|---|---|---|---|---|
| E-01 | The Saint Beneath | stop 1 | stop 2 | rulings 3 and 9: the bought lamp, kept safe |
| E-02 | Saltwick Swarm | stop 1 | stop 2 | S-07: the cove's glow that is nobody's light |
| E-03 | The Wreckmaster | stop 1 | stop 2 | S-15: the tide-line offerings; the sea gives back the drowned, changed |
| E-04 | Quay-Crab | stop 2 | stop 3 | S-02: the gallows; S-06: no swimmer pulled out before the cargo |
| E-05 | Bilge-Stalker | stop 1 | stop 2 | S-09 and S-10: the chained bridge, the shuttered town, the year of poor wrecks |
| E-06 | Coralback | stop 1 | stop 2 | S-11: every upper-town window faces the keep |
| J-01 | The Saint Beneath, journal | round 1's | none | E-01 |

## Approved (T, 2026-11-13)

These are the lines 177.8 (NV1h) puts in `enemy.library.ts`, word for word,
with T's two edits applied (E-01b, E-06b).

- **E-01 The Saint Beneath** (stop 2): He bought the harbour's lamp and sat down beside it to keep it safe. Thirty years have done to him what the sea does to anything left in it. The town still prays to him. They no longer remember his name, and neither does he.
- **E-02 Saltwick Swarm** (stop 2): The cold glow in the cove weed, risen off the water. Fishermen once set their pots by it on nights the harbour showed no lamp. The cove took the pots and the men in a winter of storms.
- **E-03 The Wreckmaster** (stop 1): The sea gives back what it takes, and not as it took it. He came ashore on the keep causeway with his orders still in him. He stands among the offerings on the tide line as though they were left for him.
- **E-04 Quay-Crab** (stop 2): It works the mud under the gallows and the mud under the quays, and it is not particular. What came down from the last rope came down to it. Nothing on this coast lets go of a thing once it has hold.
- **E-05 Bilge-Stalker** (stop 2): It came up out of the hulls the town drags ashore. This has been a year of poor wrecks, and the town is thin and polite about it. This thing is neither. It hunts the roads to the chained bridge.
- **E-06 Coralback** (stop 2): It climbs the harbour steps toward the upper town, where every window faces the keep. Its crown is the colour of fire, but warms nothing. The hard winters take the old ones at those windows, still looking at the keep.
- **J-01 The Saint Beneath, journal**: the E-01 journal in `narrator-chapter1.md`, as written there.

## Checks

Every description is 45 words or fewer and every sentence 40 or fewer. There is
no quotation mark, exclamation mark, semicolon or dash. No sentence, name or
place comes from McCarthy or Elden Ring. The three mercy-line pairs marked
`DRAFT (Claude)` (Quay-Crab, Bilge-Stalker, Coralback) and the Death
Beholder's phase line are not on this ballot: 177.8 names only the six
descriptions.

## Verdicts

- **2026-11-13, T, attended, round 1 (`narrator-enemies-2026-11-12`):** no
  slot kept; all redrawn. T: "Don't be so literal in describing them. The
  user can see." and "Incorporate the story or region more for each".
- **2026-11-13, T, attended, round 2 (`narrator-enemies-2-2026-11-13`):**
  complete, and marked complete in session. The paste, verbatim:

  ```
  BALLOT: narrator-enemies-2-2026-11-13 (NV1c enemy descriptions)
  kept 7 of 13
  -- Descriptions --
  E-01: KEEP E-01b | cut: E-01a | note: They no longer remember his name*
  E-02: KEEP E-02b | cut: E-02a
  E-03: KEEP E-03a | cut: E-03b
  E-04: KEEP E-04a | cut: E-04b
  E-05: KEEP E-05b | cut: E-05a
  E-06: KEEP E-06b | cut: E-06a | note: Its crown is the colour of fire, but* warms nothing.
  -- Journal --
  J-01: KEEP J-01a | cut: -
  ```

  The `*` marks T's changed words: E-01b's "It no longer remembers his name"
  becomes "They no longer remember his name", and E-06b's "and warms nothing"
  becomes "but warms nothing". Both are applied under Approved.
