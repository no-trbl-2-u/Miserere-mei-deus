# The Narrator: Chapter 1, round 5, the ledger

> NV1c (chunk 177.3). T asked on 2026-11-14 for the map blurbs, the leftover
> spare and finish lines, and new phase lines for the Saint Beneath, each
> shown on the screen it appears on ("Please provide the screen they'd be on
> so I can see the text in context"; mocked screens, T's pick). T skipped the
> 19 arrival lines, because no screen shows them since the 2026-11-12 reveal
> ruling. Ballot: `narrator-chapter1-5.ballot.html`. Nothing here is in the
> game. A later plot lands the approved lines (NV1d for the map blurbs; the
> others need chunks of their own).

## What is on it

| Tab | Slots | Where it shows | Cap |
|---|---|---|---|
| Map blurbs | M-01 to M-33: the 33 `[content]` blurbs in `breakwater.layout.ts` | The node confirm panel (`NodeConfirmPanel.tsx`, vellum look W-02): kind, name, then the blurb cut at two lines | 18 words, and two lines at phone width |
| Spare and finish | S-01 to S-06: the `DRAFT (Claude)` `mercyLines` of Quay-Crab, Bilge-Stalker and Coralback | The spare line: the spared summary (`CombatSummaryModal.tsx`, the house look). The finish line: nowhere today, because a felled foe goes to `VictoryScreen`, which takes no mercy line | 45 |
| Saint Beneath phases | P-01 to P-03: new stage titles and lines at 75%, 50% and 25% | The fight's float and log line, `‡ TITLE ‡ line` (`combat-encounter.engine.ts`, `stage-entered`). Today a foe with HP phases never enters a stage (`combat.engine.ts`, "A foe with HP phases changes shape at its phase lines, not stages"), so these need a plot before they show | 45 |

Candidate a is at the stop of the nearest scene (story overview, ruling 12),
and b is one stop up. Where a is already stop 5 (M-05, M-14), b is one stop
down. Each slot's role line names the scene it leans on.

## Checks

- Every line is within its cap, with no sentence over 40 words. There is no
  quotation mark, exclamation mark, semicolon or dash (scripted).
- No map blurb clips: each was measured in the mock at the vellum panel's
  width (390pt phone, 30pt padding, the icon column) in Eagle Lake 12. The
  first draft of 38 blurbs ran to a third line and was cut to fit; the
  budget is about 74 characters.
- `node --test scripts/ballot-kit.test.mjs` passes. The page renders with
  no console errors and no horizontal scroll at 412px.
- The mocks follow each component's layout, type and colours. They are
  close, not exact.

## Not on this ballot, for T

The ten Breakwater blurbs that already have text were written before the
2026-11-12 story. Several clash with it:

| Node | Blurb today | Clash |
|---|---|---|
| `bw-l5` Lighthouse | The light still turns. Mind the stair. | The lighthouse is dark (S-14, S-22) |
| `bw-b1` River Bridge | A toll-house with no keeper. Across it, a wood full of smoke. | Tolliver Pease keeps the chain (S-19) |
| `bw-l2` Clifftop Chapel | An empty chapel over the sea. | The chapel was turned to face the keep, and the town prays there (S-12) |
| `bw-m5` Walled Manor | A bell rings in the yard. Nobody is at service. | A host who asks nothing (S-21) |
| `bw-t4` Harbour Town | Warm, loud, and paid for in advance. | The town at supper behind shutters, thin and polite (S-10) |
| `bw-c1` Sea Cave | The tide comes in faster than you leave. | No clash |
| `bw-h2` Crane Quay | Cargo cranes over black mud. Something under it moves. | No clash |
| `bw-h4` The Wreck | Kelp has taken her. Mind the hull. | The wreck is fresh, the town's own boat (S-05) |
| `bw-d1` Fishing Hamlet | Fish dry on the racks. Nobody is watching them. | No clash |
| `bw-w1` Windmill | Sails lashed down. The sea is loud below. | No clash |

## Verdicts

None yet.
